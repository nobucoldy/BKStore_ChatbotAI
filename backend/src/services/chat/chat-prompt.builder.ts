import { ChatHistoryItem } from './chat.types';

export const SYSTEM_INSTRUCTION = `Bạn là BK-Bot – Chuyên viên tư vấn công nghệ & Chăm sóc khách hàng cao cấp tại Hệ thống BK-Store (Laptop, Smartphone, Phụ kiện chính hãng).

VAI TRÒ & PHONG CÁCH:
- Tên gọi: BK-Bot (xưng "em", gọi khách là "anh/chị" hoặc "quý khách").
- Phong cách: Lịch thiệp, ân cần, am hiểu phần cứng công nghệ (CPU, GPU, RAM, màn hình OLED, tản nhiệt, pin).
- Ngôn ngữ: Tiếng Việt tự nhiên, ngắt dòng thoáng, dùng bullet points rõ ràng. Nếu cuộc trò chuyện đang tiếp diễn, trả lời trực diện và tự nhiên, không lặp lại câu chào rập khuôn.
- Trung thực: CHỈ lấy giá và thông số từ DỮ LIỆU THỰC TẾ (LIVE DATA) hoặc NGỮ CẢNH TRI THỨC (RAG). Không tự bịa đặt giá hoặc thông tin.

QUY TẮC TƯ VẤN & ĐỒNG BỘ THẺ SẢN PHẨM:
1. ĐỒNG BỘ 100% VỚI THẺ SẢN PHẨM:
   - Nếu có N thẻ sản phẩm (Product Cards) hiển thị bên dưới, bạn PHẢI điểm qua đúng N mẫu máy đó trong văn bản (Tên máy + Giá niêm yết + 3-4 thông số đặc trưng CPU/RAM/GPU/Màn hình + 1-2 ưu điểm thực tế).
   - Tuyệt đối không nhắc tên hay gợi ý các mẫu máy ngoài danh sách thẻ.
2. TỒN KHO & SỐ LƯỢNG CHI NHÁNH:
   - Nếu khách KHÔNG hỏi trực tiếp về số lượng kho hay chi nhánh: Chỉ xác nhận máy đang sẵn hàng chính hãng và hướng dẫn xem thẻ bên dưới. Không đưa bảng số lượng chi nhánh ra tin nhắn văn bản.
   - Chỉ liệt kê số lượng cụ thể khi khách hỏi trực tiếp: "còn bao nhiêu máy?", "kho còn hàng không?", "chi nhánh nào còn?".
3. TRUNG THỰC DANH MỤC: BK-Store chỉ bán các dòng máy có trong dữ liệu. Nếu khách hỏi sản phẩm BK-Store không kinh doanh, lịch sự thông báo và gợi ý dòng máy tương đương đang sẵn có.

QUY TẮC ĐƠN HÀNG & BẢO MẬT:
1. Tra cứu đơn hàng tự động cho tài khoản đã đăng nhập (currentUser). Không yêu cầu khách nhắn mã đơn hoặc SĐT vào khung chat (hướng dẫn khách đăng nhập hoặc dùng tính năng Tra cứu vận đơn trên Header).
2. Khi khách hỏi đơn chưa duyệt/xác nhận: Dựa vào unconfirmedCount trả lời súc tích 1 câu thông báo (vì thẻ bên dưới đã hiển thị chi tiết các đơn này).

QUY ĐỊNH ĐỊNH DẠNG:
- Trả lời trực tiếp bằng lời thoại tư vấn. Tuyệt đối không in ra metadata nội bộ, nhãn [Tài liệu: ...], hoặc dòng checklist tự kiểm tra.`;

export class ChatPromptBuilder {
  public SYSTEM_INSTRUCTION = SYSTEM_INSTRUCTION;

  /**
   * Ràng buộc đồng bộ thẻ sản phẩm súc tích (Card-First Synchronization)
   */
  public buildCardSyncConstraint(cardPayload?: any): string {
    if (
      cardPayload &&
      cardPayload.type === 'products' &&
      Array.isArray(cardPayload.data) &&
      cardPayload.data.length > 0
    ) {
      const items = cardPayload.data
        .map(
          (p: any, idx: number) =>
            `${idx + 1}. ${p.name} | Giá: ${p.formattedPrice || p.price} | Cấu hình: ${p.specsSummary || 'Chính hãng 100%'}`
        )
        .join('\n');

      return (
        `[THẺ SẢN PHẨM ĐANG HIỂN THỊ - ĐỒNG BỘ 100%]\n` +
        `Giao diện bên dưới đang hiển thị đúng ${cardPayload.data.length} thẻ sản phẩm sau:\n` +
        `${items}\n` +
        `(Yêu cầu: Điểm qua đúng ${cardPayload.data.length} mẫu máy trên, đồng bộ tên và giá bán, không gợi ý máy ngoài danh sách này).\n\n`
      );
    }
    return '';
  }

  /**
   * Tạo văn bản lịch sử hội thoại gần nhất (tối đa 6 lượt trao đổi gần nhất)
   */
  public buildConversationHistoryText(history?: ChatHistoryItem[]): string {
    if (!history || history.length === 0) return '';
    const recentHistory = history.slice(-6);
    return recentHistory
      .map((h) => `${h.role === 'user' ? 'Khách' : 'BK-Bot'}: ${h.content}`)
      .join('\n');
  }

  /**
   * Tóm tắt dữ liệu thời gian thực từ Tool một cách súc tích
   */
  public formatToolDataSummary(toolUsed?: string, data?: any): string {
    if (!data) return '';

    if (toolUsed === 'filterProducts' && Array.isArray(data.products)) {
      const prods = data.products
        .map(
          (p: any, idx: number) =>
            `• Máy ${idx + 1}: ${p.name} | Giá: ${p.formattedPrice || p.price} | Cấu hình: ${p.specsSummary || 'Chính hãng'}`
        )
        .join('\n');
      return `[Tìm kiếm sản phẩm]: Tìm thấy ${data.totalMatches || data.products.length} sản phẩm phù hợp.\n${prods}${data.advice ? `\nLời khuyên: ${data.advice}` : ''}`;
    }

    if (toolUsed === 'checkInventory' && data.product) {
      if (data.isExplicitStockInquiry === false) {
        const specs = Object.entries(data.product.specs || {})
          .slice(0, 4)
          .map(([k, v]) => `• ${k.toUpperCase()}: ${v}`)
          .join('\n');
        return `[Sản phẩm]: ${data.product.name} (Giá niêm yết: ${data.product.formattedPrice})\nTrạng thái: Sẵn hàng chính hãng tại hệ thống BK-Store.\nCấu hình đặc trưng:\n${specs}\n(Lưu ý: Khách không hỏi số lượng chi nhánh, không đưa bảng số lượng chi nhánh ra tin nhắn).`;
      }
      const branches = (data.branches || [])
        .map((b: any) => `- Chi nhánh ${b.branchName} (${b.city}): ${b.status} (${b.quantity} máy)`)
        .join('\n');
      return `[Tồn kho sản phẩm]: ${data.product.name} (Giá: ${data.product.formattedPrice})\nTổng tồn kho toàn hệ thống: ${data.totalStock} máy.\nChi tiết các chi nhánh:\n${branches}`;
    }

    if ((toolUsed === 'trackOrder' || toolUsed === 'getMyOrders') && data.found) {
      return `[Thông tin đơn hàng]: Mã đơn: ${data.orderCode}\nKhách hàng: ${data.customerName}\nTrạng thái: ${data.statusLabel || data.status}\nKho xuất: ${data.branchName || 'BK-Store'}\nTổng tiền: ${data.formattedTotal || data.totalAmount}\nTiến trình: ${data.trackingInfo || ''}`;
    }

    if (toolUsed === 'getProductDetails' && data.product) {
      const p = data.product;
      const specs = Object.entries(p.specs || {})
        .slice(0, 5)
        .map(([k, v]) => `• ${k.toUpperCase()}: ${v}`)
        .join('\n');

      if (data.isUseCaseInquiry && (p.useCaseProfile || data.useCaseProfile)) {
        const prof = p.useCaseProfile || data.useCaseProfile;
        const sw = (prof.suitableSoftware || []).map((s: string) => `  + ${s}`).join('\n');

        return (
          `[Chi tiết sản phẩm & Đối tượng sử dụng]: ${p.name} (${p.brand})\n` +
          `Giá niêm yết: ${p.formattedPrice || p.price} | Bảo hành chính hãng: ${p.warrantyMonths || 12} tháng\n` +
          `Cấu hình đặc trưng:\n${specs}\n` +
          `• Đối tượng phù hợp: ${prof.targetAudience}\n` +
          `• Nhu cầu chính: ${prof.primaryUseCase}\n` +
          `• Ứng dụng đáp ứng tốt:\n${sw}\n` +
          `(Lưu ý: Trả lời ngắn gọn, đúng trọng tâm đối tượng và nhu cầu sử dụng).`
        );
      }

      return `[Chi tiết sản phẩm]: ${p.name} (${p.brand})\nGiá niêm yết: ${p.formattedPrice || p.price}\nBảo hành chính hãng: ${p.warrantyMonths || 12} tháng\nCấu hình đặc trưng:\n${specs}\n(Liệt kê ngắn gọn 3-4 thông số đặc trưng CPU, RAM, GPU, Màn hình dạng gạch đầu dòng).`;
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Xây dựng Prompt tổng hợp gửi cho Gemini (Đã tinh giản, giảm 50% token thừa)
   */
  public buildUserPrompt(params: {
    message: string;
    cardPayload?: any;
    ragContextText?: string;
    toolResultData?: any;
    toolUsed?: string;
    history?: ChatHistoryItem[];
  }): string {
    const { message, cardPayload, ragContextText, toolResultData, toolUsed, history } = params;
    const cardSyncConstraint = this.buildCardSyncConstraint(cardPayload);
    const conversationHistoryText = this.buildConversationHistoryText(history);
    const toolSummaryText = this.formatToolDataSummary(toolUsed, toolResultData);

    const parts: string[] = [];

    if (cardSyncConstraint) {
      parts.push(cardSyncConstraint);
    }
    if (ragContextText) {
      parts.push(`=== NGỮ CẢNH TRI THỨC BK-STORE (RAG) ===\n${ragContextText}\n`);
    }
    if (toolSummaryText) {
      parts.push(`=== DỮ LIỆU THỜI GIAN THỰC (LIVE DATA) ===\nCông cụ: ${toolUsed}\n${toolSummaryText}\n`);
    }
    if (conversationHistoryText) {
      parts.push(`=== LỊCH SỬ HỘI THOẠI GẦN ĐÂY ===\n${conversationHistoryText}\n`);
    }

    parts.push(`Khách hàng vừa hỏi: "${message}"`);
    parts.push(
      `Hãy đưa ra câu trả lời tư vấn trực tiếp cho khách hàng (ngắn gọn, chính xác, có gạch đầu dòng cấu hình nếu giới thiệu máy):`
    );

    return parts.join('\n');
  }
}

export const chatPromptBuilder = new ChatPromptBuilder();
