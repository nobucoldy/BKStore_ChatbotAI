import dotenv from 'dotenv';
import { ragService, SearchResult } from './rag.service';
import { products as seedProducts } from '../db/seedData';
import {
  checkInventory,
  filterProducts,
  getProductDetails,
  getProductReviewsTool,
  checkReviewEligibilityTool,
  formatVND,
  normalizeText,
} from './ai-tools.service';
import { getOrdersByUserId, getOrdersByPhone, getOrderByCode } from './order.service';

import {
  ChatHistoryItem,
  ChatRequestOptions,
  ChatPerformanceMetrics,
  ChatResponseData,
  DetectedIntentResult,
} from './chat/chat.types';
import { sanitizeChatReply } from './chat/chat-sanitizer';
import { chatResponseCache } from './chat/chat-limiter';
import { chatIntentService } from './chat/chat-intent.service';
import { chatPromptBuilder } from './chat/chat-prompt.builder';
import { chatLlmService } from './chat/chat-llm.service';
import { chatFallbackService } from './chat/chat-fallback.service';
import { semanticRouterService } from './chat/semantic-router.service';
import { dialogueStateService } from './chat/dialogue-state.service';
import { VietnameseNormalizer } from './chat/vietnamese-normalizer';
import { chatSessionService } from './chat/chat-session.service';

dotenv.config();

interface ToolExecutionOutcome {
  toolUsed?: string;
  toolResultData?: any;
  cardPayload?: any;
  suggestions?: string[];
  clarification?: {
    domain: 'product_recommendation' | 'order_tracking' | 'inventory_check' | 'product_reviews';
    missingSlots: string[];
  };
  earlyResponse?: ChatResponseData;
}

class ChatService {
  /**
   * Xử lý câu hỏi của khách hàng, tích hợp RAG + AI Tools + Gemini + Đo lường hiệu năng (Telemetry)
   * Đã tối ưu Song song hóa (Parallel Fetching) & Session Server-side
   */
  public async handleMessage(options: ChatRequestOptions): Promise<ChatResponseData> {
    const startTotal = performance.now();
    const { message: rawMessage, history = [], sessionId } = options;

    // 0. Phân tích NLU đa tầng & Phân giải Ngữ cảnh (VietnameseNormalizer + DST Coreference + Multi-Intent)
    const {
      normalizedText: processedMessage,
      dialogueState,
      compoundResult,
    } = semanticRouterService.analyzeQuery(rawMessage, history);
    const message = processedMessage || rawMessage;

    // 0.1. Kiểm tra Response Cache cho câu hỏi phổ biến (khi không đăng nhập và câu hỏi độc lập)
    const isCacheCandidate = !options.currentUser && (!history || history.length === 0);
    const cacheKey = isCacheCandidate ? `chat_resp:${normalizeText(message)}` : '';
    if (cacheKey) {
      const cached = chatResponseCache.get<ChatResponseData>(cacheKey);
      if (cached) {
        return {
          ...cached,
          sessionId: sessionId || cached.sessionId,
          model: `${cached.model} (cache)`,
          metrics: cached.metrics ? { ...cached.metrics, totalResponseTimeMs: 2 } : undefined,
        };
      }
    }

    // 1. Phân tích ý định người dùng (Deterministic Intent Parser)
    const startIntent = performance.now();
    const detected = chatIntentService.detectIntent(message, history, options.currentUser);
    const intentDetectionMs = Math.max(1, Math.round((performance.now() - startIntent) * 100) / 100);

    // 1.0. Xử lý phản hồi tức thì cho Chào hỏi, Danh tính Bot & Lịch sự (Local Greeting Interceptor - Tiết kiệm 100% Quota, 0ms Latency)
    if (detected.intent === 'greeting' || detected.intent === 'about_bot' || detected.intent === 'courtesy') {
      const customerName = options.currentUser?.name ? ` **${options.currentUser.name}**` : '';
      let reply = '';
      let smalltalkSuggestions: string[] = [];
      const toolUsed = detected.intent;
      let cardPayload: any = undefined;

      // Chuẩn bị 2 sản phẩm tiêu biểu để đính kèm thẻ giao diện trực quan
      const highlightProds = seedProducts.filter((p) => p.categorySlug === 'laptop').slice(0, 2);
      if (highlightProds.length > 0) {
        cardPayload = {
          type: 'products' as const,
          data: highlightProds.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            brand: p.brand,
            price: Number(p.price),
            formattedPrice: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(p.price)),
            thumbnail: p.thumbnail,
            specsSummary: Object.entries(p.specs || {}).slice(0, 3).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' • '),
            inStock: true,
          })),
        };
      }

      const normMsg = normalizeText(message);

      if (detected.intent === 'about_bot') {
        reply = `Dạ em chào anh/chị${customerName}! Em là **BK-Bot** – Trợ lý ảo AI thông minh được phát triển riêng cho Hệ thống bán lẻ công nghệ **BK-Store** 🤖✨\n\n` +
          `Em được trang bị các kỹ năng chuyên biệt để hỗ trợ anh/chị mua sắm thuận tiện nhất:\n\n` +
          `1. 💻 **Tư vấn cấu hình chuyên sâu:** Lựa chọn Laptop, Điện thoại, Phụ kiện phù hợp chuẩn xác theo ngân sách và nhu cầu (Học tập - Văn phòng, Lập trình/IT, Đồ họa 3D, Gaming).\n` +
          `2. 📦 **Kiểm tra tồn kho thời gian thực:** Tra cứu máy sẵn hàng tại cả 3 Showroom (Hà Nội, TP.HCM, Đà Nẵng).\n` +
          `3. 🚚 **Theo dõi đơn hàng tự động:** Tra cứu nhanh trạng thái đơn hàng, kho xuất và lộ trình vận chuyển qua Mã đơn (#BK-xxxx) và Số điện thoại.\n` +
          `4. 🛡️ **Giải đáp chính sách chính hãng:** Cung cấp chính xác chính sách bảo hành 1 đổi 1 trong 30 ngày, trả góp 0% và quy trình đổi trả.\n\n` +
          `Anh/chị đang quan tâm đến dòng máy nào hoặc cần em hỗ trợ thông tin gì ạ?`;
        smalltalkSuggestions = [
          'Tư vấn laptop theo tầm giá',
          'Kiểm tra tồn kho ASUS Vivobook',
          'Tra cứu đơn hàng của tôi',
          'Chính sách 1 đổi 1 trong 30 ngày',
        ];
      } else if (detected.intent === 'courtesy') {
        const isGoodbye = normMsg.includes('tam biet') || normMsg.includes('bye') || normMsg.includes('goodbye') || normMsg.includes('hen gap lai');
        if (isGoodbye) {
          reply = `Dạ BK-Bot xin chào tạm biệt anh/chị${customerName}! Cảm ơn anh/chị đã quan tâm và ghé thăm **BK-Store**. Khi nào cần tư vấn máy hoặc kiểm tra ưu đãi, anh/chị cứ nhắn lại cho em nhé. Chúc anh/chị một ngày thật tuyệt vời ạ! 👋✨`;
          smalltalkSuggestions = ['Xem laptop bán chạy', 'Chính sách trả góp 0%', 'Hotline 1800 6868'];
        } else {
          reply = `Dạ không có gì ạ! Rất hân hạnh được hỗ trợ anh/chị${customerName} tại **BK-Store**. Nếu cần thêm thông tin về bất kỳ dòng máy, giá bán ưu đãi hay kiểm tra đơn hàng, anh/chị cứ nhắn em bất kỳ lúc nào nhé! Chúc anh/chị một ngày mua sắm vui vẻ ạ! 😊`;
          smalltalkSuggestions = ['Xem laptop bán chạy', 'Khuyến mãi hôm nay', 'Chính sách bảo hành'];
        }
      } else {
        // greeting
        const greetingTemplates = [
          `Dạ em chào anh/chị${customerName}! Chào mừng anh/chị đến với **BK-Store** – Hệ thống thiết bị công nghệ chính hãng hàng đầu.\n\nEm là **BK-Bot**, trợ lý AI luôn sẵn sàng hỗ trợ anh/chị 24/7. Hôm nay anh/chị đang quan tâm đến dòng máy nào hay cần em hỗ trợ tra cứu thông tin gì ạ?`,
          `Dạ BK-Bot xin chào anh/chị${customerName}! Rất vui được đón tiếp anh/chị tại **BK-Store**.\n\nHiện hệ thống đang có nhiều ưu đãi lớn cho các dòng Laptop sinh viên, IT - Lập trình và Gaming cao cấp. Em có thể tư vấn mẫu máy nào giúp anh/chị hôm nay ạ?`,
          `Dạ chào anh/chị${customerName}! Em là **BK-Bot** – Trợ lý tư vấn AI của BK-Store.\n\nEm có thể hỗ trợ anh/chị chọn máy theo ngân sách, kiểm tra tồn kho tại 3 Showroom (Hà Nội, TP.HCM, Đà Nẵng) hoặc tra cứu tiến trình đơn hàng. Anh/chị cần em hỗ trợ ngay vấn đề nào ạ?`,
        ];
        reply = greetingTemplates[Math.floor(Math.random() * greetingTemplates.length)];
        smalltalkSuggestions = [
          'Tư vấn laptop sinh viên',
          'Laptop Gaming / Đồ họa',
          'Kiểm tra tồn kho chi nhánh',
          'Chính sách bảo hành 1 đổi 1',
        ];
      }

      const totalResponseTimeMs = Math.max(1, Math.round(performance.now() - startTotal));
      const finalResponse: ChatResponseData = {
        reply,
        citations: [],
        cards: cardPayload,
        suggestions: smalltalkSuggestions,
        sessionId,
        toolUsed,
        model: 'local-rule-engine',
        metrics: {
          totalResponseTimeMs,
          intentDetectionMs,
          toolExecutionMs: 0,
          ragRetrievalMs: 0,
          llmGenerationMs: 0,
          detectedIntent: detected.intent,
          topRagScore: 0,
          ragChunksEvaluated: 0,
        },
      };

      if (cacheKey) {
        chatResponseCache.set(cacheKey, finalResponse);
      }

      return finalResponse;
    }

    // 2. KHỞI CHẠY SONG SONG: TOOL EXECUTION & RAG RETRIEVAL (Parallel Fetching)
    // Cả Tool và RAG đều khởi chạy đồng thời, giảm 50% thời gian thu thập ngữ cảnh
    const allowRag = detected.intent !== 'track_order' || (compoundResult.isCompound && Boolean(compoundResult.secondaryQuery));
    let searchQuery = message;
    if (allowRag) {
      if (compoundResult.isCompound && compoundResult.secondaryQuery) {
        searchQuery = compoundResult.secondaryQuery;
      } else if (detected.intent === 'product_details' && detected.extracted?.isUseCaseInquiry) {
        searchQuery = `Cẩm nang tư vấn cấu hình ${detected.extracted.productIdentifier} đối tượng nhu cầu sử dụng phần mềm`;
      } else if (history && history.length > 0 && message.trim().split(/\s+/).length <= 6) {
        const lastUserMsg = [...history].reverse().find((h) => h.role === 'user');
        if (lastUserMsg && lastUserMsg.content) {
          searchQuery = `${lastUserMsg.content} ${message}`;
        }
      }
    }

    const toolPromise = (async (): Promise<ToolExecutionOutcome & { toolExecutionMs: number }> => {
      const s = performance.now();
      const outcome = await this.executeToolIntent(
        detected,
        message,
        history,
        options.currentUser,
        startTotal,
        intentDetectionMs
      );
      const toolExecutionMs = outcome.toolUsed
        ? Math.max(1, Math.round((performance.now() - s) * 100) / 100)
        : 0;
      return { ...outcome, toolExecutionMs };
    })();

    const ragPromise = (async (): Promise<{
      matchedChunks: SearchResult[];
      citations: string[];
      ragContextText: string;
      topScore: number;
      ragRetrievalMs: number;
    }> => {
      const s = performance.now();
      if (!allowRag) {
        return { matchedChunks: [], citations: [], ragContextText: '', topScore: 0, ragRetrievalMs: 0 };
      }
      try {
        const ragResults = await ragService.search(searchQuery, 3);
        const ragRetrievalMs = Math.max(1, Math.round((performance.now() - s) * 100) / 100);
        const topScore = ragResults.length > 0 ? Math.round(ragResults[0].score * 1000) / 1000 : 0;
        const matched = ragResults.filter((r) => r.score >= 0.35);

        const localCitations: string[] = [];
        const contextParts: string[] = [];
        for (const res of matched) {
          const docTitle = res.chunk.documentTitle || res.chunk.category;
          const secTitle = res.chunk.sectionTitle ? ` - ${res.chunk.sectionTitle}` : '';
          localCitations.push(`${docTitle}${secTitle}`);
          const cleanChunkText = res.chunk.content
            .replace(/\[Tài liệu:.*?\]/g, '')
            .replace(/\[Mục:.*?\]/g, '')
            .trim();
          contextParts.push(`Tài liệu tham khảo (${docTitle}${secTitle}):\n${cleanChunkText}`);
        }

        return {
          matchedChunks: matched,
          citations: localCitations,
          ragContextText: contextParts.join('\n\n'),
          topScore,
          ragRetrievalMs,
        };
      } catch (err: any) {
        console.warn('⚠️ [ChatService] Tra cứu RAG gặp lỗi nhẹ:', err.message);
        return { matchedChunks: [], citations: [], ragContextText: '', topScore: 0, ragRetrievalMs: 0 };
      }
    })();

    // Đồng thời chờ kết quả của cả hai tác vụ
    const [toolOutcome, ragOutcome] = await Promise.all([toolPromise, ragPromise]);

    // Nếu Tool có phản hồi nhanh (Early Response: Đơn hàng bảo mật, tra cứu thành công hoặc yêu cầu đăng nhập)
    if (toolOutcome.earlyResponse) {
      if (sessionId) {
        toolOutcome.earlyResponse.sessionId = sessionId;
      }
      return toolOutcome.earlyResponse;
    }

    const {
      toolUsed,
      toolResultData,
      cardPayload,
      suggestions: toolSuggestions,
      clarification,
      toolExecutionMs,
    } = toolOutcome;

    const {
      citations,
      ragContextText,
      matchedChunks: matchedRagChunks,
      topScore: topRagScore,
      ragRetrievalMs,
    } = ragOutcome;

    let suggestions = toolSuggestions;

    // 3. Xây dựng Prompt tổng hợp gửi cho Gemini (Đã tinh giản, giảm 50% token thừa)
    const userPromptWithData = chatPromptBuilder.buildUserPrompt({
      message,
      cardPayload,
      ragContextText,
      toolResultData,
      toolUsed,
      history,
    });

    const startLlm = performance.now();
    let replyText = '';
    let usedModel = 'gemini-3.5-flash-lite';

    try {
      const genResult = await chatLlmService.generateWithFallback(
        userPromptWithData,
        chatPromptBuilder.SYSTEM_INSTRUCTION
      );
      replyText = genResult.text;
      usedModel = genResult.modelName;
    } catch (aiErr: any) {
      console.error('❌ [ChatService] Lỗi khi gọi Gemini, sử dụng Smart Fallback:', aiErr.message);

      // Smart Fallback nếu Gemini API tạm gián đoạn (503/Quota)
      const fallbackResult = chatFallbackService.generateOfflineFallback({
        toolUsed,
        toolResultData,
        detected,
        matchedRagChunks,
        topRagScore,
        message,
        cardPayload,
        currentSuggestions: suggestions,
      });

      replyText = fallbackResult.replyText;
      suggestions = fallbackResult.suggestions;
      usedModel = 'smart-offline-fallback';
    }
    const llmGenerationMs = Math.max(1, Math.round((performance.now() - startLlm) * 100) / 100);

    let cleanedReply = sanitizeChatReply(replyText);

    // Khi khách hàng hỏi về đơn hàng chưa xác nhận/duyệt đơn và có đơn chờ duyệt
    if (toolResultData?.isAskingUnconfirmedOrders && toolResultData.unconfirmedCount > 0) {
      const name = toolResultData.customerName || 'anh/chị';
      cleanedReply = `Dạ em chào anh/chị **${name}**! Em đã kiểm tra trên hệ thống thì trong tổng số **${toolResultData.userOrdersCount} đơn hàng** của mình tại BK-Store, hiện có **${toolResultData.unconfirmedCount} đơn hàng chưa được xác nhận / duyệt đơn** (đang chờ quản trị viên duyệt kho):`;
    }

    const totalResponseTimeMs = Math.max(1, Math.round((performance.now() - startTotal) * 100) / 100);

    const metrics: ChatPerformanceMetrics = {
      totalResponseTimeMs,
      intentDetectionMs,
      toolExecutionMs,
      ragRetrievalMs,
      llmGenerationMs,
      detectedIntent: detected.intent,
      topRagScore,
      ragChunksEvaluated: ragService.getMetrics().chunksCount,
    };

    const finalResponse: ChatResponseData = {
      reply: cleanedReply,
      citations: Array.from(new Set(citations)),
      cards: cardPayload,
      suggestions,
      clarification,
      sessionId,
      toolUsed,
      model: usedModel,
      metrics,
    };

    // Lưu vào Response Cache nếu là câu hỏi chung
    if (cacheKey && !toolResultData?.isAskingUnconfirmedOrders && !toolResultData?.userOrders) {
      chatResponseCache.set(cacheKey, finalResponse);
    }

    return finalResponse;
  }

  /**
   * Bộ điều phối thực thi AI Tool theo ý định (Tách rời để phục vụ song song hóa)
   */
  private async executeToolIntent(
    detected: DetectedIntentResult,
    message: string,
    history: ChatHistoryItem[],
    currentUser?: ChatRequestOptions['currentUser'],
    startTotal = performance.now(),
    intentDetectionMs = 1
  ): Promise<ToolExecutionOutcome> {
    let toolUsed: string | undefined = undefined;
    let toolResultData: any = null;
    let cardPayload: any = undefined;
    let suggestions: string[] | undefined = undefined;
    let clarification: any = undefined;

    const startTool = performance.now();

    if (detected.intent === 'clarify_product_need') {
      toolUsed = 'clarifyProductNeed';
      const cat = detected.extracted?.category || 'laptop';
      clarification = {
        domain: 'product_recommendation',
        missingSlots: ['budget', 'useCase'],
      };
      suggestions = [
        'Dưới 15 triệu',
        '15 - 25 triệu',
        '25 - 40 triệu',
        'Học tập & Văn phòng',
        'Lập trình / IT',
        'Đồ họa - Gaming',
      ];
      toolResultData = {
        category: cat,
        missingSlots: ['budget', 'useCase'],
        suggestedBudgets: ['Dưới 15 triệu', '15 - 25 triệu', '25 - 40 triệu', 'Trên 40 triệu'],
        suggestedUseCases: ['Học tập & Văn phòng', 'Lập trình & Kỹ thuật IT', 'Đồ họa & Gaming', 'Mỏng nhẹ cao cấp'],
      };
      const topProds = seedProducts.filter((p) => p.categorySlug === cat).slice(0, 2);
      if (topProds.length > 0) {
        cardPayload = {
          type: 'products',
          data: topProds.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            brand: p.brand,
            price: Number(p.price),
            formattedPrice: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(p.price)),
            thumbnail: p.thumbnail,
            specsSummary: Object.entries(p.specs || {}).slice(0, 3).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' • '),
            inStock: true,
          })),
        };
      }
    } else if (detected.intent === 'clarify_inventory_product') {
      toolUsed = 'clarifyInventoryProduct';
      clarification = {
        domain: 'inventory_check',
        missingSlots: ['productName'],
      };
      toolResultData = {
        branchName: detected.extracted?.branchName,
        missingSlots: ['productName'],
      };
      suggestions = [
        'ASUS Vivobook 14',
        'Lenovo ThinkPad E14',
        'iPhone 18 Pro Max',
        'iPad Air 13 inch M4',
      ];
    } else if (detected.intent === 'clarify_review_product') {
      toolUsed = 'clarifyReviewProduct';
      clarification = {
        domain: 'product_reviews',
        missingSlots: ['productName'],
      };
      toolResultData = {
        missingSlots: ['productName'],
      };
      suggestions = [
        'Đánh giá ASUS Vivobook 14',
        'Đánh giá ThinkPad E14',
        'Đánh giá iPhone 18 Pro Max',
      ];
    } else if (detected.intent === 'check_review_eligibility') {
      toolUsed = 'checkReviewEligibility';
      const elig = await checkReviewEligibilityTool(detected.extracted);
      toolResultData = elig;
      if (elig.found) {
        cardPayload = {
          type: 'order',
          data: elig,
        };
      }
      suggestions = ['Xem đánh giá sản phẩm', 'Chính sách bảo hành', 'Hotline 1800 6868'];
    } else if (detected.intent === 'product_reviews') {
      toolUsed = 'getProductReviews';
      const rev = await getProductReviewsTool(detected.extracted);
      toolResultData = rev;
      if (rev.found && rev.product) {
        cardPayload = {
          type: 'reviews',
          data: rev,
        };
      }
      suggestions = ['Xem cấu hình chi tiết', 'Kiểm tra tồn kho', 'Chính sách bảo hành'];
    } else if (detected.intent === 'check_inventory') {
      toolUsed = 'checkInventory';
      const inv = await checkInventory(detected.extracted);

      const normMsg = normalizeText(message);
      const isExplicitStockInquiry =
        normMsg.includes('con bao nhieu') ||
        normMsg.includes('may chiec') ||
        normMsg.includes('so luong') ||
        normMsg.includes('con hang khong') ||
        normMsg.includes('con hang ko') ||
        normMsg.includes('con hang') ||
        normMsg.includes('het hang') ||
        normMsg.includes('con may khong') ||
        normMsg.includes('kho con') ||
        normMsg.includes('ton kho') ||
        normMsg.includes('chi nhanh nao con') ||
        normMsg.includes('o showroom nao');

      toolResultData = {
        ...inv,
        isExplicitStockInquiry,
      };

      if (inv.found && inv.product) {
        if (isExplicitStockInquiry) {
          cardPayload = {
            type: 'inventory',
            data: inv,
          };
        } else {
          cardPayload = {
            type: 'products',
            data: [inv.product],
          };
        }
      }
      suggestions = ['Xem thông số chi tiết', 'Chính sách 1 đổi 1 30 ngày', 'Tư vấn trả góp 0%'];
    } else if (detected.intent === 'track_order') {
      toolUsed = 'getMyOrders';
      const targetOrderCode = detected.extracted?.orderCode;

      if (currentUser) {
        const custName = currentUser.name || 'Quý khách';

        // Tra cứu mã đơn cụ thể
        if (targetOrderCode) {
          const userOrders = await getOrdersByUserId(currentUser.id, currentUser.phone);
          const matchedOrder = (userOrders || []).find(
            (o: any) => (o.orderCode || '').toLowerCase() === targetOrderCode.toLowerCase()
          );

          if (matchedOrder) {
            const statusLabel = chatIntentService.getOrderStatusLabel(matchedOrder.status);
            const formattedTotal = formatVND(Number(matchedOrder.totalAmount));
            const itemsSummary = (matchedOrder.items || [])
              .map((it: any) => `${it.productName || it.productSlug || 'Thiết bị'} (x${it.quantity || 1})`)
              .join(', ') || 'Thiết bị công nghệ';

            toolResultData = {
              found: true,
              isSingleOrderLookup: true,
              orderCode: matchedOrder.orderCode,
              customerName: matchedOrder.customerName || custName,
              totalAmount: matchedOrder.totalAmount,
              formattedTotal,
              status: matchedOrder.status,
              statusLabel,
              trackingInfo: matchedOrder.trackingInfo || 'Đang chuẩn bị hàng tại kho',
              branchName: matchedOrder.branchName || 'BK-Store Cầu Giấy (Hà Nội)',
              deliveryAddress: matchedOrder.address || 'Giao hàng tận nơi',
              paymentMethod: matchedOrder.paymentMethod === 'COD' ? 'Thanh toán tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản VietQR',
              items: matchedOrder.items,
              itemsSummary,
              createdAt: matchedOrder.createdAt,
              message: `Đã tìm thấy thông tin đơn hàng ${matchedOrder.orderCode}.`,
            };

            cardPayload = {
              type: 'order',
              data: toolResultData,
            };

            const nameParts = custName.trim().split(/\s+/);
            const shortName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : custName;
            const normStatus = (matchedOrder.status || '').toLowerCase();

            let statusContextNote = '';
            if (normStatus === 'delivered' || normStatus === 'giao hàng thành công') {
              statusContextNote = `Đơn hàng **${matchedOrder.orderCode}** của mình đã được **giao hàng thành công** rồi nhé ạ! 🎉\n\nAnh/chị có thể xem lại chi tiết sản phẩm và thanh toán tại thẻ bên dưới. Nếu đã trải nghiệm thiết bị ưng ý, mình đừng quên gửi đánh giá sản phẩm để nhận ưu đãi từ BK-Store nhé!`;
            } else if (normStatus === 'shipping' || normStatus === 'đang vận chuyển') {
              statusContextNote = `Đơn hàng **${matchedOrder.orderCode}** của mình hiện **đang trên đường giao đến địa chỉ nhận** rồi ạ! 🚚\n\nKiện hàng đang được shipper điều phối giao nhanh từ **${matchedOrder.branchName || 'BK-Store'}**. Anh/chị chú ý điện thoại để nhận máy và thực hiện quyền đồng kiểm nhé ạ!`;
            } else if (normStatus === 'confirmed' || normStatus === 'đã xác nhận' || normStatus === 'processing') {
              statusContextNote = `Đơn hàng **${matchedOrder.orderCode}** của mình đã được xác nhận và đang đóng gói tại **${matchedOrder.branchName || 'kho BK-Store'}** ạ! 📦\n\nNhân viên kho đang kiểm tra thiết bị cẩn thận để bàn giao cho shipper sớm nhất cho mình.`;
            } else if (normStatus === 'cancelled' || normStatus === 'đã hủy') {
              statusContextNote = `Đơn hàng **${matchedOrder.orderCode}** của mình hiện ở trạng thái **Đã hủy** ạ. Anh/chị có thể xem lại chi tiết tại thẻ bên dưới hoặc liên hệ tổng đài **1800 6868** nếu cần hỗ trợ thêm nhé ạ!`;
            } else {
              statusContextNote = `Đơn hàng **${matchedOrder.orderCode}** của mình hiện đang ở trạng thái **Chờ xác nhận & chuẩn bị xuất kho** ạ! ⏳\n\nQuản trị viên BK-Store sẽ duyệt đơn và điều phối đóng gói sớm nhất cho mình nhé ạ.`;
            }

            const singleOrderReply =
              `Dạ em chào anh/chị **${shortName}**! ${statusContextNote}\n\n` +
              `Toàn bộ thông tin chi tiết về sản phẩm, tổng thanh toán và tiến trình vận đơn đã được hiển thị trực quan tại thẻ đơn hàng ngay bên dưới nhé ạ!`;

            return {
              earlyResponse: {
                reply: singleOrderReply,
                citations: [],
                cards: cardPayload,
                suggestions: ['Đơn hàng của tôi', 'Kiểm tra tồn kho Showroom', 'Hotline 1800 6868'],
                clarification: undefined,
                toolUsed: 'getMyOrders',
                model: 'order-lookup-service',
                metrics: {
                  totalResponseTimeMs: Math.max(1, Math.round((performance.now() - startTotal) * 100) / 100),
                  intentDetectionMs,
                  toolExecutionMs: Math.max(1, Math.round((performance.now() - startTool) * 100) / 100),
                  ragRetrievalMs: 0,
                  llmGenerationMs: 0,
                  detectedIntent: detected.intent,
                  topRagScore: 0,
                  ragChunksEvaluated: 0,
                },
              },
            };
          } else {
            // Không có mã đơn này trong tài khoản
            const systemOrder = await getOrderByCode(targetOrderCode);
            let notFoundMsg = '';
            if (systemOrder) {
              notFoundMsg = `Dạ em chào anh/chị **${custName}**! Đơn hàng mang mã **${targetOrderCode}** tồn tại trên hệ thống nhưng không thuộc về tài khoản này của anh/chị. Quý khách vui lòng kiểm tra lại tài khoản hoặc liên hệ hotline **1800 6868** để được hỗ trợ nhé ạ!`;
            } else {
              notFoundMsg = `Dạ em chào anh/chị **${custName}**! Em đã kiểm tra trên toàn bộ hệ thống nhưng **không tìm thấy đơn hàng nào có mã "${targetOrderCode}"**. Anh/chị vui lòng kiểm tra lại mã đơn hàng trong tin nhắn SMS hoặc email đặt hàng giúp em nhé ạ!`;
            }

            return {
              earlyResponse: {
                reply: notFoundMsg,
                citations: [],
                cards: undefined,
                suggestions: ['Đơn hàng của tôi', 'Kiểm tra tồn kho Showroom', 'Hotline 1800 6868'],
                clarification: undefined,
                toolUsed: 'getMyOrders',
                model: 'order-lookup-service',
                metrics: {
                  totalResponseTimeMs: Math.max(1, Math.round((performance.now() - startTotal) * 100) / 100),
                  intentDetectionMs,
                  toolExecutionMs: Math.max(1, Math.round((performance.now() - startTool) * 100) / 100),
                  ragRetrievalMs: 0,
                  llmGenerationMs: 0,
                  detectedIntent: detected.intent,
                  topRagScore: 0,
                  ragChunksEvaluated: 0,
                },
              },
            };
          }
        }

        // Người dùng hỏi tổng quan danh sách đơn hàng
        const userOrders = await getOrdersByUserId(currentUser.id, currentUser.phone);

        if (userOrders && userOrders.length > 0) {
          const pendingOrders = userOrders.filter(
            (o) => (o.status || '').toLowerCase() === 'pending' || (o.status || '').toLowerCase() === 'chờ xác nhận'
          );
          const confirmedOrders = userOrders.filter(
            (o) => (o.status || '').toLowerCase() === 'confirmed' || (o.status || '').toLowerCase() === 'đã xác nhận'
          );
          const shippingOrders = userOrders.filter(
            (o) => (o.status || '').toLowerCase() === 'shipping' || (o.status || '').toLowerCase() === 'đang vận chuyển'
          );
          const deliveredOrders = userOrders.filter(
            (o) => (o.status || '').toLowerCase() === 'delivered' || (o.status || '').toLowerCase() === 'giao hàng thành công'
          );
          const cancelledOrders = userOrders.filter(
            (o) => (o.status || '').toLowerCase() === 'cancelled' || (o.status || '').toLowerCase() === 'đã hủy'
          );

          const primaryOrder = pendingOrders.length > 0 ? pendingOrders[0] : userOrders[0];

          toolResultData = {
            found: true,
            isUserOrderSummary: true,
            isAskingUnconfirmedOrders: Boolean(detected.extracted?.isAskingUnconfirmedOrders),
            customerName: custName,
            userOrdersCount: userOrders.length,
            unconfirmedCount: pendingOrders.length,
            confirmedCount: confirmedOrders.length,
            shippingCount: shippingOrders.length,
            deliveredCount: deliveredOrders.length,
            cancelledCount: cancelledOrders.length,
            pendingOrders: pendingOrders.map((o) => ({
              orderCode: o.orderCode,
              customerName: o.customerName || custName,
              totalAmount: o.totalAmount,
              formattedTotal: formatVND(Number(o.totalAmount)),
              status: o.status,
              statusLabel: 'Chờ xác nhận (Chờ duyệt đơn)',
              createdAt: o.createdAt,
              trackingInfo: o.trackingInfo,
              branchName: o.branchName || 'BK-Store Cầu Giấy (Hà Nội)',
              deliveryAddress: o.address,
              paymentMethod: o.paymentMethod === 'COD' ? 'Thanh toán tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản VietQR',
              itemsSummary: (o.items || [])
                .map((it: any) => `${it.productName || it.productSlug || 'Thiết bị'} (x${it.quantity || 1})`)
                .join(', ') || 'Thiết bị công nghệ',
            })),
            latestOrder: {
              orderCode: primaryOrder.orderCode,
              customerName: primaryOrder.customerName || custName,
              totalAmount: primaryOrder.totalAmount,
              formattedTotal: formatVND(Number(primaryOrder.totalAmount)),
              status: primaryOrder.status,
              statusLabel: chatIntentService.getOrderStatusLabel(primaryOrder.status),
              trackingInfo: primaryOrder.trackingInfo,
              branchName: primaryOrder.branchName || 'BK-Store Cầu Giấy (Hà Nội)',
              deliveryAddress: primaryOrder.address,
            },
            orderCode: primaryOrder.orderCode,
            totalAmount: primaryOrder.totalAmount,
            formattedTotal: formatVND(Number(primaryOrder.totalAmount)),
            status: primaryOrder.status,
            statusLabel: chatIntentService.getOrderStatusLabel(primaryOrder.status),
            trackingInfo: primaryOrder.trackingInfo,
            branchName: primaryOrder.branchName || 'BK-Store Cầu Giấy (Hà Nội)',
            deliveryAddress: primaryOrder.address,
            message: `Tìm thấy ${userOrders.length} đơn hàng của tài khoản ${custName}.`,
          };
          cardPayload = {
            type: 'order',
            data: toolResultData,
          };
        } else {
          toolResultData = {
            found: false,
            isUserOrderSummary: true,
            isAskingUnconfirmedOrders: Boolean(detected.extracted?.isAskingUnconfirmedOrders),
            customerName: custName,
            message: `Dạ em kiểm tra trên hệ thống thì tài khoản của anh/chị ${custName} hiện chưa có đơn hàng nào tại BK-Store. Anh/chị cần em hỗ trợ tư vấn dòng máy nào không ạ?`,
          };
        }
        suggestions = ['Đơn hàng của tôi', 'Kiểm tra tồn kho Showroom', 'Hotline 1800 6868'];
      } else {
        // NGƯỜI DÙNG CHƯA ĐĂNG NHẬP
        if (targetOrderCode) {
          const askLoginMsg = `Dạ để kiểm tra thông tin chi tiết của đơn hàng **${targetOrderCode}**, anh/chị vui lòng bấm nút **"Đăng nhập"** ở góc trên màn hình giúp em nhé! Sau khi đăng nhập, hệ thống sẽ xác thực và hiển thị ngay tiến trình đơn hàng này cho mình ạ!`;
          return {
            earlyResponse: {
              reply: askLoginMsg,
              citations: [],
              cards: undefined,
              suggestions: ['Đăng nhập tài khoản', 'Tra cứu vận đơn trên Header', 'Hotline 1800 6868'],
              clarification: undefined,
              toolUsed: 'getMyOrders',
              model: 'auth-required-guard',
              metrics: {
                totalResponseTimeMs: Math.max(1, Math.round((performance.now() - startTotal) * 100) / 100),
                intentDetectionMs,
                toolExecutionMs: Math.max(1, Math.round((performance.now() - startTool) * 100) / 100),
                ragRetrievalMs: 0,
                llmGenerationMs: 0,
                detectedIntent: detected.intent,
                topRagScore: 0,
                ragChunksEvaluated: 0,
              },
            },
          };
        }

        const hasDirectCodeOrPhone = Boolean(detected.extracted?.hasDirectCodeOrPhone);
        if (hasDirectCodeOrPhone) {
          const directSecurityMsg =
            'Dạ vì lý do bảo mật thông tin đơn hàng cá nhân, BK-Bot không hỗ trợ tra cứu trực tiếp bằng cách nhập số điện thoại trong tin nhắn chat. Nếu anh/chị đã mua hàng, vui lòng bấm nút "Đăng nhập" ở góc trên màn hình để hệ thống tự động nhận diện và hiển thị toàn bộ đơn hàng của mình, hoặc sử dụng tính năng "Tra cứu vận đơn" trên thanh Header website nhé ạ!';
          return {
            earlyResponse: {
              reply: directSecurityMsg,
              citations: [],
              cards: undefined,
              suggestions: ['Đăng nhập tài khoản', 'Tra cứu vận đơn trên Header', 'Hotline 1800 6868'],
              clarification: undefined,
              toolUsed: 'getMyOrders',
              model: 'security-guard-policy',
              metrics: {
                totalResponseTimeMs: Math.max(1, Math.round((performance.now() - startTotal) * 100) / 100),
                intentDetectionMs,
                toolExecutionMs: Math.max(1, Math.round((performance.now() - startTool) * 100) / 100),
                ragRetrievalMs: 0,
                llmGenerationMs: 0,
                detectedIntent: detected.intent,
                topRagScore: 0,
                ragChunksEvaluated: 0,
              },
            },
          };
        }

        toolResultData = {
          found: false,
          needsAuth: true,
          hasDirectCodeOrPhone: false,
          isAskingUnconfirmedOrders: Boolean(detected.extracted?.isAskingUnconfirmedOrders),
          message: detected.extracted?.isAskingUnconfirmedOrders
            ? 'Dạ để kiểm tra xem tài khoản của mình có bao nhiêu đơn hàng chưa được xác nhận / duyệt đơn, anh/chị vui lòng bấm nút "Đăng nhập" ở góc trên màn hình để hệ thống tự động kiểm tra và cập nhật ngay cho mình nhé ạ!'
            : 'Dạ để tra cứu và theo dõi tiến trình các đơn hàng của mình tại BK-Store, anh/chị vui lòng bấm nút "Đăng nhập" ở góc trên màn hình nhé! Sau khi đăng nhập, BK-Bot sẽ tự động cập nhật ngay danh sách và trạng thái đơn hàng của mình ạ!',
        };
        suggestions = ['Đăng nhập tài khoản', 'Tra cứu vận đơn trên Header', 'Hotline 1800 6868'];
      }
    } else if (detected.intent === 'filter_products') {
      toolUsed = 'filterProducts';
      const missingSlots = detected.extracted?.missingSlots || [];
      const filt = await filterProducts(detected.extracted);
      toolResultData = filt;

      if (missingSlots.includes('budget')) {
        clarification = {
          domain: 'product_recommendation',
          missingSlots: ['budget'],
        };
        suggestions = ['Dưới 20 triệu', '20 - 30 triệu', '30 - 45 triệu', 'Trên 45 triệu'];
        if (filt.products && filt.products.length > 0) {
          cardPayload = {
            type: 'products',
            data: filt.products.slice(0, 4),
          };
        }
      } else if (missingSlots.includes('useCase')) {
        clarification = {
          domain: 'product_recommendation',
          missingSlots: ['useCase'],
        };
        suggestions = [
          'Lập trình / Code / IT',
          'Đồ họa & Gaming',
          'Học tập - Văn phòng',
          'Mỏng nhẹ di chuyển',
        ];
        if (filt.products && filt.products.length > 0) {
          cardPayload = {
            type: 'products',
            data: filt.products.slice(0, 4),
          };
        }
      } else {
        suggestions = ['Kiểm tra tồn kho', 'Chính sách bảo hành', 'Chính sách trả góp 0%'];
        if (filt.products && filt.products.length > 0) {
          cardPayload = {
            type: 'products',
            data: filt.products.slice(0, 4),
          };
        }
      }
    } else if (detected.intent === 'product_details') {
      toolUsed = 'getProductDetails';
      const det = await getProductDetails(detected.extracted.productIdentifier);
      toolResultData = {
        ...det,
        isWarrantyQuestion: Boolean(detected.extracted?.isWarrantyQuestion),
        isUseCaseInquiry: Boolean(detected.extracted?.isUseCaseInquiry),
      };
      if (det.found && det.product) {
        cardPayload = {
          type: 'products',
          data: [det.product],
        };
      }
      suggestions = ['Kiểm tra tồn kho chi nhánh', 'Xem đánh giá thực tế', 'Chính sách bảo hành'];
    } else if (detected.intent === 'warranty_all_products') {
      toolUsed = 'getWarrantyCatalog';
      toolResultData = {
        found: true,
        warrantyCatalog: chatIntentService.getAllProductsWarrantyCatalog(),
      };
      suggestions = ['Bảo hành laptop ASUS', 'Bảo hành laptop Lenovo', 'Chính sách 1 đổi 1 30 ngày'];
    }

    return {
      toolUsed,
      toolResultData,
      cardPayload,
      suggestions,
      clarification,
    };
  }

  /**
   * SSE Streaming Response dành cho chữ chạy thời gian thực
   */
  public async streamChat(
    options: ChatRequestOptions,
    sendEvent: (event: string, data: any) => void
  ): Promise<void> {
    sendEvent('status', {
      text: 'BK-Bot đang kiểm tra cơ sở dữ liệu & tri thức...',
    });

    const result = await this.handleMessage(options);

    // Nếu có công cụ được kích hoạt
    if (result.toolUsed) {
      sendEvent('tool_call', {
        tool: result.toolUsed,
        cards: result.cards,
      });
    }

    // Nếu có trích dẫn tài liệu
    if (result.citations && result.citations.length > 0) {
      sendEvent('citations', {
        citations: result.citations,
      });
    }

    // Mô phỏng stream chữ mượt mà
    const words = result.reply.split(' ');
    let currentText = '';

    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      currentText += chunk;
      sendEvent('chunk', {
        delta: chunk,
        accumulated: currentText,
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    sendEvent('done', {
      fullReply: result.reply,
      cards: result.cards,
      citations: result.citations,
      suggestions: result.suggestions,
      clarification: result.clarification,
      sessionId: result.sessionId,
      model: result.model,
      metrics: result.metrics,
    });
  }
}

export const chatService = new ChatService();

// Re-export để đảm bảo tương thích ngược 100% cho mọi module đang gọi
export { sanitizeChatReply };
export * from './chat/chat.types';
