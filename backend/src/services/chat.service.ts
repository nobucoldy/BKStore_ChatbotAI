import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { ragService, SearchResult } from './rag.service';
import { products as seedProducts } from '../db/seedData';
import { geminiKeyManager } from '../config/gemini-keys';
import {
  checkInventory,
  trackOrder,
  filterProducts,
  getProductDetails,
  getProductReviewsTool,
  checkReviewEligibilityTool,
  executeAiTool,
  formatVND,
  normalizeText,
  InventoryCheckResult,
  OrderTrackResult,
  ProductFilterResult,
  ProductDetailResult,
  ProductReviewsResult,
} from './ai-tools.service';
import { getOrdersByUserId, getOrdersByPhone } from './order.service';
import NodeCache from 'node-cache';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Bộ nhớ đệm lưu câu trả lời cho các câu hỏi phổ biến (TTL 5 phút)
const chatResponseCache = new NodeCache({ stdTTL: 300, checkperiod: 60, maxKeys: 1000 });

// Hàng đợi điều tiết Concurrency cho Gemini API (Tối đa 8 requests đồng thời, bảo vệ khỏi 429)
class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  release(): void {
    this.running--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const geminiLimiter = new ConcurrencyLimiter(8);

// Danh sách các model ưu tiên thử nghiệm (fallback nếu gặp 503/429 tạm thời)
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

const unavailableModels = new Set<string>();

export interface ChatHistoryItem {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export interface ChatRequestOptions {
  message: string;
  history?: ChatHistoryItem[];
  stream?: boolean;
  currentUser?: {
    id: string;
    email: string;
    name: string;
    role: 'customer' | 'admin';
    phone?: string;
  };
}

export interface ChatPerformanceMetrics {
  totalResponseTimeMs: number;
  intentDetectionMs: number;
  toolExecutionMs: number;
  ragRetrievalMs: number;
  llmGenerationMs: number;
  detectedIntent: string;
  topRagScore: number;
  ragChunksEvaluated: number;
}

export interface ChatResponseData {
  reply: string;
  citations: string[];
  cards?: {
    type: 'products' | 'order' | 'inventory' | 'reviews';
    data: any;
  };
  suggestions?: string[];
  clarification?: {
    domain: 'product_recommendation' | 'order_tracking' | 'inventory_check' | 'product_reviews';
    missingSlots: string[];
  };
  toolUsed?: string;
  model: string;
  metrics?: ChatPerformanceMetrics;
}

const SYSTEM_INSTRUCTION = `Bạn là BK-Bot – Chuyên viên tư vấn công nghệ & Chăm sóc khách hàng cao cấp tại BK-Store (Hệ thống bán lẻ Laptop, Smartphone, Phụ kiện công nghệ chính hãng hàng đầu).

VAI TRÒ & PHONG CÁCH:
- Tên gọi: BK-Bot (hoặc xưng "em", gọi khách hàng là "anh/chị" hoặc "quý khách").
- Phong cách: Nhiệt tình, thân thiện, lịch thiệp, am hiểu sâu sắc phần cứng công nghệ (chip CPU, GPU, RAM, màn hình OLED/Retina, pin, tản nhiệt), trung thực tuyệt đối.
- Luôn sử dụng tiếng Việt tự nhiên, ngắt dòng rõ ràng, sử dụng bullet points để khách dễ theo dõi.
- Khi nhắc đến giá sản phẩm, luôn ghi rõ đơn vị tiền tệ VNĐ (ví dụ: 31.990.000₫).

NGUYÊN TẮC BẮT BUỘC:
1. DỮ LIỆU ĐƯỢC CUNG CẤP: Dựa trên NGỮ CẢNH TRI THỨC (Chính sách, Cẩm nang) và DỮ LIỆU THỰC TẾ (Tồn kho, Đơn hàng, Danh mục) được hệ thống chuyển đến bên dưới. Tuyệt đối không tự bịa đặt thông tin không có trong tài liệu.
2. NGUYÊN TẮC TƯ VẤN CẤU HÌNH & SẢN PHẨM (TUYỆT ĐỐI KHÔNG XẢ BẢNG THÔNG SỐ CHI TIẾT RA MÀN HÌNH):
- Giao diện khung chat đã có sẵn các THẺ SẢN PHẨM TƯƠNG TÁC (Product Cards) hiển thị trực quan ảnh máy, giá bán ưu đãi, link xem chi tiết và tóm tắt cấu hình ngay phía dưới câu trả lời của bạn.
- TUYỆT ĐỐI KHÔNG liệt kê bảng thông số kỹ thuật chi tiết (như danh sách dài dòng CPU, GPU, RAM, SSD, độ phân giải màn hình, dung lượng pin, cổng kết nối, chuẩn Wi-Fi/Bluetooth...) vào trong nội dung tin nhắn văn bản, vì sẽ làm câu trả lời quá dài, choán hết màn hình và che khuất thẻ card sản phẩm.
- Cách trình bày tư vấn chuẩn:
  + Đưa ra nhận xét ngắn gọn 1-2 câu giải thích tiêu chí chọn cấu hình phù hợp với nhu cầu/ngân sách của khách (ví dụ: sinh viên kinh tế cần mỏng nhẹ pin trâu; AI/Data Science cần 32GB RAM + GPU CUDA; gaming cần tản nhiệt tốt & tần số quét cao).
  + Khi gợi ý các dòng máy (tối đa 2–3 mẫu máy): BẮT BUỘC chỉ nêu Tên máy + Mức giá + 1 đến 2 ưu điểm đắt giá nhất của các sản phẩm nằm trong danh sách THẺ SẢN PHẨM (Product Cards) hiển thị bên dưới, TUYỆT ĐỐI không nhắc tên các mẫu máy ngoài danh sách thẻ (Ví dụ: "ASUS Vivobook 14 (22.490.000₫): Thiết kế thanh lịch, Core 7 đa nhiệm mượt mà, pin bền bỉ cho sinh viên" hoặc "Lenovo ThinkBook 16 (26.590.000₫): Màn hình 16 inch lớn, chip i5-H xử lý đồ họa & dữ liệu cực tốt").
  + Ở cuối tin nhắn, hướng dẫn ngắn gọn: "Anh/chị có thể xem ảnh thực tế và cấu hình chi tiết tại thẻ sản phẩm ngay bên dưới nhé ạ!" và hỏi bước tiếp theo (muốn kiểm tra tồn kho chi nhánh nào hay cần tư vấn thêm).
3. ĐƠN HÀNG & TÌNH TRẠNG DUYỆT ĐƠN:
- Khi khách hàng hỏi về số lượng hoặc danh sách đơn hàng chưa được xác nhận, chưa được duyệt đơn:
  + Dựa vào "unconfirmedCount" trong DỮ LIỆU THỜI GIAN THỰC (LIVE DATA) để trả lời chính xác số lượng đơn hàng đang chờ duyệt.
  + Nếu unconfirmedCount > 0: Chỉ trả lời một câu thông báo ngắn gọn súc tích:
    "Dạ em chào anh/chị [Tên]! Em đã kiểm tra trên hệ thống thì trong tổng số [M] đơn hàng của mình tại BK-Store, hiện có [N] đơn hàng chưa được xác nhận / duyệt đơn (đang chờ quản trị viên duyệt kho):"
    Do giao diện thẻ phía dưới câu trả lời đã hiển thị đầy đủ danh sách các đơn hàng này, TUYỆT ĐỐI KHÔNG liệt kê lặp lại toàn bộ danh sách các đơn hàng trong nội dung tin nhắn.
  + Nếu unconfirmedCount = 0: Trả lời rõ ràng rằng tài khoản của khách hiện KHÔNG CÓ đơn hàng nào chưa được xác nhận / duyệt đơn (0 đơn chờ duyệt), và tóm tắt nhanh số lượng đơn đã xác nhận / đang giao / đã giao thành công nếu có.
- Khi khách hỏi tra cứu lịch sử đơn hàng nói chung: Báo rõ tổng số đơn hàng, số đơn ở từng trạng thái và thông tin chi tiết đơn hàng gần nhất.
4. TỒN KHO: Nói rõ chi nhánh nào còn bao nhiêu máy, địa chỉ showroom để khách ghé trải nghiệm.
5. GỢI Ý HÀNH ĐỘNG: Ở cuối câu trả lời, hãy gợi ý nhẹ nhàng bước tiếp theo (ví dụ: đặt giữ máy, ghé chi nhánh xem thực tế, hoặc liên hệ hotline 1800 6868 miễn phí).
6. TRÌNH BÀY TỰ NHIÊN: Khi trích xuất tài liệu từ RAG, luôn diễn giải thành văn phong tư vấn ân cần, tự nhiên, dễ hiểu.
7. TUYỆT ĐỐI KHÔNG XUẤT RA DỮ LIỆU NỘI BỘ HAY CHECKLIST:
- CHỈ xuất ra đúng nội dung câu trả lời tư vấn gửi đến khách hàng.
- Tuyệt đối KHÔNG in ra các nhãn kỹ thuật nội bộ như "[Tài liệu: ...]", "[Mục: ...]", "Độ khớp: ...%", hoặc các đoạn code/tag debug thô.
- Tuyệt đối KHÔNG in ra bất kỳ dòng suy nghĩ, checklist, tự kiểm tra, self-reflection (như "technical metadata printed", "Checked", "Suggest next step at end: Checked", "Verified",...).
8. NGUYÊN TẮC HỎI LẠI KHI THIẾU THÔNG TIN (CLARIFICATION & SLOT-FILLING):
- Khi khách hàng hỏi tư vấn mua sản phẩm nhưng chưa nêu rõ ngân sách hoặc nhu cầu cụ thể (ví dụ: "tư vấn laptop cho tôi", "tôi muốn mua laptop", "gợi ý máy tính"): ĐỪNG liệt kê ngẫu nhiên sản phẩm. Hãy lịch sự, ân cần hỏi lại khách hàng về mức ngân sách dự kiến và mục đích sử dụng chính (văn phòng, sinh viên, lập trình, gaming).
- Khi khách hỏi tra cứu đơn hàng nhưng thiếu mã đơn hoặc số điện thoại: Hãy yêu cầu khách cung cấp thông tin còn thiếu để tra cứu bảo mật.
- Khi khách hỏi tồn kho nhưng chưa nêu tên máy: Hãy hỏi lại khách đang quan tâm đến dòng máy cụ thể nào.
- Luôn đặt câu hỏi ngắn gọn, lịch thiệp, có gạch đầu dòng rõ ràng và gợi ý các lựa chọn mẫu để khách hàng dễ dàng phản hồi.`;

/**
 * Làm sạch câu trả lời của AI: Loại bỏ triệt để các nhãn kỹ thuật, nhãn debug,
 * và các checklist tự kiểm tra (CoT/self-reflection leakage) bị rò rỉ.
 */
export function sanitizeChatReply(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Xóa các khối checklist / metadata dạng đoạn văn
  cleaned = cleaned.replace(
    /(?:^|\n)[\/\*_\s]*(?:technical\s*metadata|metadata\s*printed|self-check|checklist|internal\s*JSON\s*tags)[\s\S]*?(?=\n\n[A-ZÀ-Ỹ0-9]|$)/gi,
    ''
  );

  // 2. Xóa các dòng đơn lẻ hoặc checklist bullet points
  cleaned = cleaned.replace(/^.*(?:technical\s*metadata|suggest\s*next\s*step\s*at\s*end|checked\s*\(no|\(no\s*\[tài liệu|internal\s*JSON\s*tags).*$/gim, '');

  // 3. Xóa các nhãn kỹ thuật nội bộ còn sót
  cleaned = cleaned.replace(/\[Tài liệu:.*?\]/gi, '');
  cleaned = cleaned.replace(/\[Mục:.*?\]/gi, '');
  cleaned = cleaned.replace(/Độ khớp:\s*\d+(?:\.\d+)?%/gi, '');

  // 4. Lọc từng dòng
  const lines = cleaned.split('\n');
  const filteredLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^(?:\/|\*|\-)?\s*(?:technical\s*metadata|suggest\s*next\s*step|checked\b)/i.test(trimmed) ||
      /\bchecked\s*\(/i.test(trimmed) ||
      /internal\s*(?:JSON|tags)/i.test(trimmed)
    ) {
      continue;
    }
    filteredLines.push(line);
  }

  cleaned = filteredLines.join('\n');

  // 5. Chuẩn hóa khoảng trắng & dòng trống
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

class ChatService {
  /**
   * Nhận diện sản phẩm cụ thể từ câu hỏi hoặc ngữ cảnh
   */
  private matchProductFromText(rawText: string) {
    if (!rawText || !rawText.trim()) return null;
    const norm = normalizeText(rawText);

    // 1. Khớp trực tiếp theo slug hoặc tên đầy đủ đã chuẩn hóa
    const exactMatch = seedProducts.find((p) => {
      const pNameNorm = normalizeText(p.name);
      const pSlugClean = normalizeText(p.slug).replace(/-/g, ' ');
      return norm.includes(pNameNorm) || norm.includes(pSlugClean);
    });
    if (exactMatch) return exactMatch;

    // 2. Chấm điểm từ khóa đặc trưng của từng dòng máy
    let bestProduct: (typeof seedProducts)[0] | null = null;
    let bestScore = 0;

    const stopWords = new Set([
      'apple', 'asus', 'dell', 'lenovo', 'acer', 'samsung', 'xiaomi', 'sony', 'logitech', 'keychron', 'anker',
      'laptop', 'may', 'tinh', 'dien', 'thoai', 'tai', 'nghe', 'chuot', 'ban', 'phim', 'cu', 'sac', 'nhanh',
      'chong', 'on', 'khong', 'day', 'co', 'ram', 'ssd', 'gb', 'tb', '16gb', '32gb', '512gb', '256gb', '1tb',
      '18gb', '12gb', 'inch', 'chinh', 'hang', 'vn', 'den', 'trang', 'xam', 'titan', 'tu', 'nhien', 'pin', 'du', 'phong',
      'vien', 'nhom', 'thep', 'size', 'sm', 'series', 'bac', 'mau', 'sac', 'van', 'sinh', 'hoc', 'tap',
      'cho', 'nguoi', 'dung', 'gia', 're', 'tot', 'dep', 'cao', 'cap', 'tien', 'trieu', 'mua', 'xem', 'nao',
      'dong', 'chiec', 'cai', 'loai', 'watch', 'pro', 'max', 'plus', 'ultra',
    ]);

    for (const p of seedProducts) {
      const pNameNorm = normalizeText(p.name);
      const pSlugWords = normalizeText(p.slug).split(' ').filter((w) => w.length >= 2);
      const pBrandNorm = normalizeText(p.brand);

      let score = 0;
      const modelWords = pSlugWords.filter((w) => !stopWords.has(w) && w.length >= 3);
      const matchedModelWords = modelWords.filter((w) => {
        const regex = new RegExp(`\\b${w}\\b`, 'i');
        return regex.test(norm);
      });

      score += matchedModelWords.length * 3;

      if (matchedModelWords.length > 0 && norm.includes(pBrandNorm)) {
        score += 2;
      }

      // Các cụm từ nhận diện nhanh dòng máy thực tế tại BK-Store
      if ((norm.includes('vivobook') || norm.includes('x1404')) && pNameNorm.includes('vivobook')) score += 6;
      if ((norm.includes('thinkbook') || norm.includes('21us008fvn')) && pNameNorm.includes('thinkbook')) score += 6;
      if ((norm.includes('tuf gaming') || norm.includes('fa506')) && pNameNorm.includes('tuf gaming')) score += 6;
      if ((norm.includes('loq') || norm.includes('83dv01alvn')) && pNameNorm.includes('loq')) score += 6;
      if ((norm.includes('thinkpad e14') || norm.includes('e14 gen 7')) && pNameNorm.includes('thinkpad e14')) score += 6;
      if ((norm.includes('thinkpad t14s') || norm.includes('t14s gen 6')) && pNameNorm.includes('thinkpad t14s')) score += 6;
      if ((norm.includes('apple watch') || norm.includes('dong ho apple')) && pNameNorm.includes('apple watch')) score += 6;
      if ((norm.includes('watch ultra') || norm.includes('ultra 4')) && pNameNorm.includes('watch ultra')) score += 6;

      // Các dòng máy khác
      if (norm.includes('macbook air') && pNameNorm.includes('macbook air')) score += 6;
      if (norm.includes('macbook pro') && pNameNorm.includes('macbook pro')) score += 6;
      if ((norm.includes('iphone 16') || norm.includes('ip16') || norm.includes('16 pro')) && pNameNorm.includes('iphone 16')) score += 6;
      if ((norm.includes('s24') || norm.includes('galaxy s24')) && pNameNorm.includes('s24')) score += 6;
      if ((norm.includes('xiaomi 14') || norm.includes('mi 14') || norm.includes('14 ultra')) && pNameNorm.includes('xiaomi 14')) score += 6;
      if ((norm.includes('xps') || norm.includes('9440')) && pNameNorm.includes('xps')) score += 6;
      if ((norm.includes('zephyrus') || norm.includes('g14') || norm.includes('rog')) && pNameNorm.includes('zephyrus')) score += 6;
      if ((norm.includes('thinkpad') || norm.includes('x1 carbon')) && pNameNorm.includes('thinkpad')) score += 6;
      if ((norm.includes('zenbook') || norm.includes('ux3405')) && pNameNorm.includes('zenbook')) score += 6;
      if ((norm.includes('predator') || norm.includes('helios')) && pNameNorm.includes('predator')) score += 6;
      if ((norm.includes('xm5') || norm.includes('1000xm5')) && pNameNorm.includes('1000xm5')) score += 6;
      if ((norm.includes('airpods') || norm.includes('airpod')) && pNameNorm.includes('airpods')) score += 6;
      if ((norm.includes('mx master') || norm.includes('master 3s')) && pNameNorm.includes('mx master')) score += 6;
      if ((norm.includes('keychron') || norm.includes('q1 pro') || norm.includes('mx mechanical')) && (pNameNorm.includes('keychron') || pNameNorm.includes('mechanical'))) score += 6;
      if ((norm.includes('anker') || norm.includes('ganprime') || norm.includes('735') || norm.includes('67w') || norm.includes('65w')) && pNameNorm.includes('anker')) score += 6;

      if (score > bestScore) {
        bestScore = score;
        bestProduct = p;
      }
    }

    return bestScore >= 5 ? bestProduct : null;
  }

  /**
   * Tìm sản phẩm trong câu hỏi hiện tại hoặc ngược về lịch sử hội thoại gần nhất (xử lý đại từ "máy này", "sản phẩm này")
   */
  private findProductInContext(message: string, history: ChatHistoryItem[] = []) {
    const direct = this.matchProductFromText(message);
    if (direct) return direct;

    for (let i = history.length - 1; i >= 0; i--) {
      const found = this.matchProductFromText(history[i].content);
      if (found) return found;
    }
    return null;
  }

  /**
   * Tìm mã đơn hàng hoặc SĐT trong lịch sử hội thoại gần nhất (xử lý khi khách hỏi tiếp "đơn này lấy từ kho nào?")
   */
  private findOrderInContext(history: ChatHistoryItem[] = []): { orderCode?: string; phone?: string } {
    let foundOrderCode: string | undefined;
    let foundPhone: string | undefined;

    for (let i = history.length - 1; i >= 0; i--) {
      const content = history[i].content || '';
      if (!foundOrderCode) {
        const codeMatch = content.match(/#?BK[-_ ]?\d{3,6}/i);
        if (codeMatch) {
          const digits = codeMatch[0].replace(/[^0-9]/g, '');
          if (digits) foundOrderCode = `#BK-${digits}`;
        }
      }
      if (!foundPhone) {
        const pMatch = content.match(/(?:\+?84|0)(?:\d{9}|\d{8})\b/);
        if (pMatch) foundPhone = pMatch[0];
      }
      if (foundOrderCode && foundPhone) break;
    }

    return { orderCode: foundOrderCode, phone: foundPhone };
  }

  /**
   * Trích xuất và tích lũy các slots tư vấn qua các lượt hội thoại (Multi-turn Slot Filling)
   */
  private extractAccumulatedSlots(
    message: string,
    history: ChatHistoryItem[] = []
  ): {
    category?: 'laptop' | 'smartphone' | 'accessory';
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    useCase?: string;
  } {
    const userMessages: string[] = [];
    if (history && history.length > 0) {
      for (const h of history.slice(-8)) {
        if (h.role === 'user' && h.content) {
          userMessages.push(h.content);
        }
      }
    }
    userMessages.push(message);

    let category: 'laptop' | 'smartphone' | 'accessory' | undefined;
    let brand: string | undefined;
    let minPrice: number | undefined;
    let maxPrice: number | undefined;
    let useCase: string | undefined;

    const candidateBrands = [
      'Apple', 'Asus', 'Dell', 'Lenovo', 'Acer', 'Samsung',
      'Xiaomi', 'Sony', 'Logitech', 'Keychron', 'Anker',
    ];

    for (const msg of userMessages) {
      const norm = normalizeText(msg);

      // 1. Category
      if (norm.includes('laptop') || norm.includes('may tinh') || norm.includes('macbook')) {
        category = 'laptop';
      } else if (norm.includes('dien thoai') || norm.includes('smartphone') || norm.includes('iphone') || norm.includes('galaxy')) {
        category = 'smartphone';
      } else if (norm.includes('tai nghe') || norm.includes('chuot') || norm.includes('ban phim') || norm.includes('phu kien')) {
        category = 'accessory';
      }

      // 2. Brand
      for (const b of candidateBrands) {
        if (norm.includes(b.toLowerCase())) {
          brand = b;
          break;
        }
      }

      // 3. Use Case
      if (
        norm.includes('lap trinh') ||
        norm.includes('code') ||
        norm.includes('cntt') ||
        norm.includes('it') ||
        norm.includes('ky su phan mem') ||
        norm.includes('ai') ||
        norm.includes('data')
      ) {
        useCase = 'lap_trinh';
        if (!category) category = 'laptop';
      } else if (
        norm.includes('gaming') ||
        norm.includes('choi game') ||
        norm.includes('do hoa') ||
        norm.includes('thiet ke') ||
        norm.includes('render') ||
        norm.includes('kien truc') ||
        norm.includes('dung phim') ||
        norm.includes('edit video')
      ) {
        useCase = 'gaming_dohoa';
        if (!category) category = 'laptop';
      } else if (
        norm.includes('sinh vien') ||
        norm.includes('hoc sinh') ||
        norm.includes('hoc tap') ||
        norm.includes('di hoc') ||
        norm.includes('kinh te') ||
        norm.includes('ngoai ngu')
      ) {
        useCase = 'sinh_vien';
        if (!category) category = 'laptop';
      } else if (
        norm.includes('van phong') ||
        norm.includes('ke toan') ||
        norm.includes('doanh nhan') ||
        norm.includes('mong nhe') ||
        norm.includes('pin trau')
      ) {
        useCase = 'van_phong';
        if (!category) category = 'laptop';
      }

      // 4. Budget / Price Range
      const rangeMatch = norm.match(/(\d+)\s*(?:den|to|-)\s*(\d+)\s*(?:trieu|tr)/i);
      const aboveMatch = norm.match(/(?:tren|tu)\s*(\d+)\s*(?:trieu|tr)/i);
      const underMatch = norm.match(/(?:duoi)\s*(\d+)\s*(?:trieu|tr)/i);
      const aroundMatch = norm.match(/(?:tam|khoang|tam gia|khoang gia)?\s*(\d+)\s*(?:trieu|tr)/i);

      if (rangeMatch) {
        minPrice = parseInt(rangeMatch[1], 10) * 1000000;
        maxPrice = parseInt(rangeMatch[2], 10) * 1000000;
      } else if (aboveMatch) {
        minPrice = parseInt(aboveMatch[1], 10) * 1000000;
        maxPrice = undefined;
      } else if (underMatch) {
        maxPrice = parseInt(underMatch[1], 10) * 1000000;
        minPrice = undefined;
      } else if (aroundMatch) {
        const val = parseInt(aroundMatch[1], 10) * 1000000;
        minPrice = Math.max(0, val - 5000000);
        maxPrice = val + 5000000;
      }
    }

    return { category, brand, minPrice, maxPrice, useCase };
  }

  public getOrderStatusLabel(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return 'Chờ xác nhận (Chờ duyệt đơn)';
      case 'confirmed':
        return 'Đã xác nhận đơn';
      case 'shipping':
        return 'Đang vận chuyển';
      case 'delivered':
        return 'Giao hàng thành công';
      case 'cancelled':
        return 'Đã hủy đơn';
      default:
        return 'Chờ xác nhận';
    }
  }

  /**
   * Bộ nhận diện câu chào hỏi, hỏi danh tính bot và phép lịch sự (Smalltalk & Greeting Interceptor)
   * Giúp phản hồi ngay lập tức (0ms), bảo toàn 100% Quota cho Gemini API
   */
  public detectSmalltalk(text: string, norm: string): 'greeting' | 'about_bot' | 'courtesy' | null {
    const cleanNorm = norm.trim();

    // 1. Nhóm hỏi về danh tính, chức năng của Bot (About Bot)
    const isAboutBot =
      cleanNorm === 'ban la ai' ||
      cleanNorm.includes('ban la ai') ||
      cleanNorm === 'ban ten gi' ||
      cleanNorm.includes('ban ten gi') ||
      cleanNorm.includes('em la ai') ||
      cleanNorm.includes('em ten gi') ||
      cleanNorm.includes('may la ai') ||
      cleanNorm.includes('may ten gi') ||
      cleanNorm.includes('ai day') ||
      cleanNorm.includes('ai the') ||
      cleanNorm.includes('ai day nhi') ||
      cleanNorm.includes('ten gi the') ||
      cleanNorm.includes('ten ban la gi') ||
      cleanNorm.includes('ten cua ban la gi') ||
      cleanNorm.includes('ten cua em la gi') ||
      cleanNorm.includes('gioi thieu ve ban') ||
      cleanNorm.includes('gioi thieu ban than') ||
      cleanNorm.includes('gioi thieu ve minh') ||
      cleanNorm.includes('gioi thieu em di') ||
      cleanNorm.includes('gioi thieu ve bot') ||
      cleanNorm.includes('lam duoc gi') ||
      cleanNorm.includes('lam duoc nhung gi') ||
      cleanNorm.includes('co the lam duoc gi') ||
      cleanNorm.includes('co the lam gi') ||
      cleanNorm.includes('co the lam nhung gi') ||
      cleanNorm.includes('giup duoc gi') ||
      cleanNorm.includes('ho tro duoc gi') ||
      cleanNorm.includes('co the giup gi') ||
      cleanNorm.includes('ban lam duoc gi') ||
      cleanNorm.includes('bot lam duoc gi') ||
      cleanNorm.includes('em lam duoc gi') ||
      cleanNorm.includes('ban giup duoc gi') ||
      cleanNorm.includes('ban co the lam gi') ||
      cleanNorm.includes('bot co the lam gi') ||
      cleanNorm.includes('em co the lam gi') ||
      cleanNorm.includes('chuc nang cua ban') ||
      cleanNorm.includes('chuc nang cua bot') ||
      cleanNorm.includes('chuc nang cua em') ||
      cleanNorm.includes('tinh nang cua bot') ||
      cleanNorm.includes('ban la robot hay') ||
      cleanNorm.includes('ban la nguoi hay') ||
      cleanNorm.includes('ban la con gi') ||
      cleanNorm.includes('tro ly ao la gi') ||
      cleanNorm.includes('bk bot la gi') ||
      cleanNorm.includes('bkbot la gi') ||
      cleanNorm.includes('bk bot la ai') ||
      cleanNorm.includes('bkbot la ai') ||
      cleanNorm === 'who are you' ||
      cleanNorm.includes('who are you') ||
      cleanNorm.includes('what is your name') ||
      cleanNorm.includes('what can you do') ||
      cleanNorm.includes('tell me about yourself');

    if (isAboutBot) {
      return 'about_bot';
    }

    // 2. Nhóm Lịch sự: Cảm ơn & Tạm biệt (Courtesy)
    const COURTESY_EXACT = new Set([
      'cam on',
      'cam on nhe',
      'cam on ban',
      'cam on bot',
      'cam on shop',
      'cam on em',
      'cam on nhieu',
      'thanks',
      'thank you',
      'thank bot',
      'thanks bot',
      'thank shop',
      'thanks shop',
      'ok cam on',
      'oke cam on',
      'da cam on',
      'tam biet',
      'tam biet bot',
      'tam biet shop',
      'bye',
      'bye bot',
      'bye shop',
      'goodbye',
      'hen gap lai',
      'chuc mot ngay tot lanh',
      'chuc buoi toi vui ve',
      'chuc ngay moi vui ve',
    ]);

    const isCourtesy =
      COURTESY_EXACT.has(cleanNorm) ||
      cleanNorm.startsWith('cam on') ||
      cleanNorm.startsWith('thank') ||
      cleanNorm.startsWith('tam biet') ||
      cleanNorm.startsWith('bye ') ||
      cleanNorm === 'bye';

    if (isCourtesy) {
      return 'courtesy';
    }

    // 3. Nhóm Chào hỏi (Greeting)
    const GREETING_EXACT = new Set([
      'hi',
      'hello',
      'helo',
      'hey',
      'alo',
      'alo shop',
      'alo bot',
      'alô',
      'hola',
      'hallo',
      'chao',
      'xin chao',
      'chao ban',
      'chao bot',
      'chao em',
      'chao shop',
      'chao ad',
      'chao admin',
      'chao anh',
      'chao chi',
      'chao ca nha',
      'chao shop nhe',
      'chao shop nha',
      'hello bot',
      'hi bot',
      'helo bot',
      'hey bot',
      'good morning',
      'good afternoon',
      'good evening',
      'chao buoi sang',
      'chao buoi chieu',
      'chao buoi toi',
      'co ai o day khong',
      'co ai truc khong',
      'co ai khong',
      'shop con mo cua khong',
      'shop oi',
      'bot oi',
    ]);

    if (GREETING_EXACT.has(cleanNorm)) {
      return 'greeting';
    }

    // Câu bắt đầu bằng từ chào hỏi và không chứa câu hỏi nghiệp vụ
    const isGreetingPrefix =
      cleanNorm.startsWith('hi ') ||
      cleanNorm.startsWith('hello ') ||
      cleanNorm.startsWith('hey ') ||
      cleanNorm.startsWith('alo ') ||
      cleanNorm.startsWith('xin chao ') ||
      cleanNorm.startsWith('chao ');

    if (isGreetingPrefix) {
      const words = cleanNorm.split(/\s+/);
      const hasTaskIndicator =
        cleanNorm.includes('trieu') ||
        cleanNorm.includes('laptop') ||
        cleanNorm.includes('smartphone') ||
        cleanNorm.includes('dien thoai') ||
        cleanNorm.includes('may tinh') ||
        cleanNorm.includes('don hang') ||
        cleanNorm.includes('ton kho') ||
        cleanNorm.includes('gia') ||
        cleanNorm.includes('mua');

      if (words.length <= 5 && !hasTaskIndicator) {
        return 'greeting';
      }
    }

    return null;
  }

  /**
   * Phân tích ý định người dùng để tiền xử lý công cụ (Deterministic Intent Parser)
   */
  private detectIntent(
    message: string,
    history: ChatHistoryItem[] = [],
    currentUser?: { id: string; name: string; email: string; phone?: string; role: string }
  ): {
    intent:
      | 'track_order'
      | 'check_inventory'
      | 'filter_products'
      | 'product_details'
      | 'warranty_all_products'
      | 'check_review_eligibility'
      | 'product_reviews'
      | 'clarify_product_need'
      | 'clarify_order_tracking'
      | 'clarify_inventory_product'
      | 'clarify_review_product'
      | 'greeting'
      | 'about_bot'
      | 'courtesy'
      | 'general';
    extracted: any;
  } {
    const text = message.trim();
    const norm = normalizeText(text);

    // 0. Kiểm tra từ khóa Đánh giá / Review
    const isReviewKeyword =
      norm.includes('danh gia') ||
      norm.includes('review') ||
      norm.includes('nhan xet') ||
      norm.includes('sao') ||
      norm.includes('feedback') ||
      norm.includes('cham diem');

    // 1. Kiểm tra ý định Tra cứu đơn hàng (#BK-xxxx hoặc SĐT hoặc từ khóa đơn hàng / kho của đơn hàng)
    const isOrderWarehouseQuestion =
      (norm.includes('don') || norm.includes('kien hang')) &&
      (norm.includes('kho') || norm.includes('chi nhanh') || norm.includes('xuat tu') || norm.includes('lay tu'));

    // Kiểm tra câu hỏi về đơn hàng chưa xác nhận / chưa duyệt
    const isAskingUnconfirmedOrders =
      (norm.includes('chua duoc xac nhan') ||
       norm.includes('chua xac nhan') ||
       norm.includes('chua duyet') ||
       norm.includes('chua duoc duyet') ||
       norm.includes('cho xac nhan') ||
       norm.includes('cho duyet') ||
       norm.includes('chua xu ly') ||
       norm.includes('cho xu ly')) &&
      (norm.includes('don') || norm.includes('kien hang') || norm.includes('hang'));

    const isAskingMyOrders =
      isAskingUnconfirmedOrders ||
      norm.includes('don hang cua toi') ||
      norm.includes('don cua toi') ||
      norm.includes('don cua minh') ||
      norm.includes('don cua em') ||
      norm.includes('don gan nhat') ||
      norm.includes('lich su don') ||
      norm.includes('da mua nhung may gi') ||
      norm.includes('da mua may nao') ||
      norm.includes('cac don da dat') ||
      (norm.includes('don') && (norm.includes('cua toi') || norm.includes('cua minh') || norm.includes('cua em') || norm.includes('toi co') || norm.includes('minh co') || norm.includes('bao nhieu don') || norm.includes('may don') || norm.includes('danh sach don')));

    const isOrderKeyword =
      isAskingMyOrders ||
      norm.includes('don hang') ||
      norm.includes('don nay') ||
      norm.includes('ma don') ||
      norm.includes('tra cuu') ||
      norm.includes('van don') ||
      norm.includes('kiem tra don') ||
      norm.includes('giao den dau') ||
      norm.includes('tinh trang don') ||
      norm.includes('trang thai don') ||
      norm.includes('shipper') ||
      norm.includes('da giao chua') ||
      norm.includes('ma van don') ||
      isOrderWarehouseQuestion;

    const contextOrder = this.findOrderInContext(history);
    const lastAssistantMsg = [...history].reverse().find((h) => h.role === 'assistant');
    const lastBotContent = lastAssistantMsg ? normalizeText(lastAssistantMsg.content || '') : '';

    // Tìm mã đơn hàng (#BK-xxxx, BK-xxxx, BKxxxx, hoặc 4 chữ số khi có từ khóa đơn hàng/đánh giá/ngữ cảnh)
    const orderCodeMatch =
      text.match(/#?BK[-_ ]?\d{3,6}/i) ||
      (isOrderKeyword || isReviewKeyword || contextOrder.phone || lastBotContent.includes('ma don')
        ? text.match(/\b\d{4}\b/)
        : null);

    // Tìm số điện thoại (10 chữ số bắt đầu bằng 0 hoặc +84)
    const phoneMatch = text.match(/(?:\+?84|0)(?:\d{9}|\d{8})\b/);

    const isOrderContextFollowUp = Boolean(
      (contextOrder.orderCode && phoneMatch) ||
      (contextOrder.phone && orderCodeMatch) ||
      (lastBotContent.includes('so dien thoai') && phoneMatch)
    );

    // 0.1. Nếu có từ khóa đánh giá kết hợp mã đơn hàng hoặc SĐT -> Kiểm tra điều kiện đánh giá đơn
    if (isReviewKeyword && (orderCodeMatch || (norm.includes('don') && phoneMatch))) {
      const code = orderCodeMatch ? orderCodeMatch[0].replace(/[^0-9]/g, '') : undefined;
      return {
        intent: 'check_review_eligibility',
        extracted: {
          orderCode: code ? `#BK-${code}` : undefined,
          phone: phoneMatch ? phoneMatch[0] : (currentUser?.phone || undefined),
        },
      };
    }

    // 0.2. Nếu có từ khóa đánh giá / review hoặc nối tiếp câu hỏi hỏi lại về review
    const wasAskingReview = Boolean(
      lastBotContent &&
      (lastBotContent.includes('danh gia') ||
        lastBotContent.includes('review') ||
        lastBotContent.includes('dong san pham nao'))
    );

    const directMatchedReviewProd = this.matchProductFromText(text);

    if (isReviewKeyword || (wasAskingReview && directMatchedReviewProd)) {
      const directMatchedProd = directMatchedReviewProd;
      const hasPronounRef =
        norm.includes('may nay') ||
        norm.includes('san pham nay') ||
        norm.includes('chiec nay') ||
        norm.includes('con nay') ||
        norm.includes('mau nay');

      // Nếu khách hỏi đánh giá của một sản phẩm cụ thể hoặc "máy này" (khi không hỏi cách thức/quy trình)
      const isHowToReviewPolicy =
        norm.includes('lam sao') ||
        norm.includes('cach') ||
        norm.includes('quy trinh') ||
        norm.includes('cac buoc') ||
        norm.includes('buoc nao') ||
        norm.includes('huong dan') ||
        norm.includes('chinh sach') ||
        norm.includes('dieu kien') ||
        norm.includes('ai duoc') ||
        norm.includes('nut danh gia') ||
        norm.includes('khong danh gia duoc') ||
        norm.includes('chua danh gia duoc') ||
        norm.includes('o dau') ||
        norm.includes('cho nao') ||
        norm.includes('muc nao') ||
        norm.includes('muon danh gia') ||
        norm.includes('viet danh gia') ||
        norm.includes('gui danh gia');

      if (isHowToReviewPolicy) {
        return { intent: 'general', extracted: null };
      }

      const matched = directMatchedProd || (hasPronounRef ? this.findProductInContext(text, history) : null);
      if (matched) {
        return {
          intent: 'product_reviews',
          extracted: {
            productName: matched.name,
          },
        };
      }

      // Khi người dùng hỏi đánh giá/review nói chung mà chưa rõ sản phẩm nào
      if (!isHowToReviewPolicy && (norm.includes('xem') || norm.includes('sao') || norm.includes('the nao') || norm.includes('tot khong') || norm.includes('ai review') || norm.includes('review') || wasAskingReview)) {
        return {
          intent: 'clarify_review_product',
          extracted: {
            missingSlots: ['productName'],
          },
        };
      }

      return { intent: 'general', extracted: null };
    }

    if (
      isAskingMyOrders ||
      orderCodeMatch ||
      (isOrderKeyword && phoneMatch) ||
      isOrderContextFollowUp ||
      isOrderWarehouseQuestion ||
      norm.includes('don nay') ||
      (isOrderKeyword && !isReviewKeyword)
    ) {
      const code = orderCodeMatch ? orderCodeMatch[0].replace(/[^0-9]/g, '') : undefined;
      const finalCode = code ? `#BK-${code}` : contextOrder.orderCode;
      const finalPhone = phoneMatch ? phoneMatch[0] : (currentUser?.phone || contextOrder.phone);

      if (currentUser) {
        return {
          intent: 'track_order',
          extracted: {
            orderCode: finalCode,
            phone: finalPhone,
            isAskingMyOrders,
            isAskingUnconfirmedOrders,
            userId: currentUser.id,
            userName: currentUser.name,
          },
        };
      }

      // Khách vãng lai / chưa đăng nhập
      if (!finalCode && finalPhone) {
        if (isAskingMyOrders || isAskingUnconfirmedOrders) {
          return {
            intent: 'track_order',
            extracted: {
              phone: finalPhone,
              isAskingMyOrders: true,
              isAskingUnconfirmedOrders,
            },
          };
        }
        return {
          intent: 'clarify_order_tracking',
          extracted: {
            phone: finalPhone,
            missingSlots: ['orderCode'],
          },
        };
      }

      if (!finalCode && !finalPhone) {
        return {
          intent: 'clarify_order_tracking',
          extracted: {
            missingSlots: ['authOrPhone'],
            isAskingUnconfirmedOrders,
          },
        };
      }

      if (finalCode && !finalPhone) {
        return {
          intent: 'clarify_order_tracking',
          extracted: {
            orderCode: finalCode,
            missingSlots: ['phone'],
          },
        };
      }

      return {
        intent: 'track_order',
        extracted: {
          orderCode: finalCode,
          phone: finalPhone,
          isAskingUnconfirmedOrders,
        },
      };
    }

    // 1.5. Kiểm tra ý định hỏi về BẢO HÀNH / ĐỔI TRẢ (của từng máy, máy cụ thể, hoặc "máy này")
    const isWarrantyKeyword =
      norm.includes('bao hanh') ||
      norm.includes('1 doi 1') ||
      norm.includes('doi moi') ||
      norm.includes('doi tra');

    if (isWarrantyKeyword) {
      const isAskingAllMachines =
        norm.includes('tung may') ||
        norm.includes('cac may') ||
        norm.includes('moi may') ||
        norm.includes('tat ca cac may') ||
        norm.includes('tung san pham') ||
        norm.includes('cac san pham') ||
        norm.includes('tung dong may');

      if (isAskingAllMachines) {
        return {
          intent: 'warranty_all_products',
          extracted: null,
        };
      }

      // Kiểm tra xem người dùng có nhắc tên sản phẩm hoặc hỏi "máy này" (lấy từ lịch sử / trang hiện tại) không
      const matchedProd = this.findProductInContext(text, history);
      const hasDirectProd = Boolean(this.matchProductFromText(text));
      const hasPronoun =
        norm.includes('may nay') ||
        norm.includes('san pham nay') ||
        norm.includes('chiec nay') ||
        norm.includes('con nay') ||
        norm.includes('mau nay') ||
        norm.includes('em nay') ||
        norm.includes('cua may');

      if (matchedProd && (hasDirectProd || hasPronoun)) {
        return {
          intent: 'product_details',
          extracted: {
            productIdentifier: matchedProd.slug,
            isWarrantyQuestion: true,
          },
        };
      }

      // Nếu khách hỏi "chính sách bảo hành của máy này thế nào" hoặc "bảo hành thế nào" mà chưa có sản phẩm nào trong ngữ cảnh
      return {
        intent: 'warranty_all_products',
        extracted: null,
      };
    }

    // 2. Kiểm tra ý định Tra cứu tồn kho chi nhánh
    const wasAskingInventory = Boolean(
      lastBotContent &&
      (lastBotContent.includes('ton kho') ||
        lastBotContent.includes('tinh trang con hang') ||
        lastBotContent.includes('chi nhanh') ||
        lastBotContent.includes('mau san pham cu the nao'))
    );

    const isInventoryKeyword =
      norm.includes('con hang') ||
      norm.includes('het hang') ||
      norm.includes('ton kho') ||
      norm.includes('o chi nhanh') ||
      norm.includes('con may') ||
      norm.includes('co san') ||
      norm.includes('mua tai');

    if (isInventoryKeyword || (wasAskingInventory && Boolean(this.matchProductFromText(text)))) {
      let branchName = '';
      if (norm.includes('cau giay') || norm.includes('ha noi')) branchName = 'Cầu Giấy';
      else if (norm.includes('quan 1') || norm.includes('ho chi minh') || norm.includes('tphcm') || norm.includes('hcm')) branchName = 'Quận 1';
      else if (norm.includes('hai chau') || norm.includes('da nang')) branchName = 'Hải Châu';

      const contextProd = this.findProductInContext(text, history);

      if (!contextProd) {
        return {
          intent: 'clarify_inventory_product',
          extracted: {
            branchName: branchName || undefined,
            missingSlots: ['productName'],
          },
        };
      }

      return {
        intent: 'check_inventory',
        extracted: {
          productName: contextProd.name,
          branchName: branchName || undefined,
        },
      };
    }

    // 3. Kiểm tra xem người dùng có đang hỏi trực tiếp về 1 sản phẩm cụ thể không
    // LƯU Ý: Nếu câu hỏi là nhu cầu tư vấn mua/gợi ý theo đối tượng/tầm tiền (ví dụ: "tư vấn laptop sinh viên", "máy tính cho sinh viên", "laptop văn phòng"),
    // thì ưu tiên đưa vào bộ lọc filter_products thay vì ép sang chi tiết một sản phẩm riêng lẻ!
    const isGeneralConsultNeed =
      norm.includes('tu van laptop') ||
      norm.includes('tu van may') ||
      norm.includes('tu van dien thoai') ||
      norm.includes('laptop sinh vien') ||
      norm.includes('cho sinh vien') ||
      norm.includes('dan van phong') ||
      norm.includes('hoc sinh') ||
      norm.includes('goi y') ||
      norm.includes('nen mua') ||
      (norm.includes('laptop') && (norm.includes('sinh vien') || norm.includes('van phong') || norm.includes('gaming') || norm.includes('lap trinh')));

    const directMatchedProduct = isGeneralConsultNeed ? null : this.matchProductFromText(text);
    const isConsultProductKeyword =
      !isGeneralConsultNeed &&
      (norm.includes('thong so') ||
        norm.includes('cau hinh') ||
        norm.includes('ram') ||
        norm.includes('chip') ||
        norm.includes('cpu') ||
        norm.includes('man hinh') ||
        norm.includes('gia bao nhieu') ||
        norm.includes('tu van cho toi ve san pham') ||
        norm.includes('ve san pham') ||
        norm.includes('may nay') ||
        norm.includes('san pham nay') ||
        norm.includes('chiec nay'));

    if (directMatchedProduct || isConsultProductKeyword) {
      const targetProd = directMatchedProduct || this.findProductInContext(text, history);
      if (targetProd) {
        return {
          intent: 'product_details',
          extracted: {
            productIdentifier: targetProd.slug,
            isWarrantyQuestion: false,
          },
        };
      }
      // Nếu không xác định được sản phẩm nào trong câu hỏi lẫn lịch sử, chuyển về general (RAG) thay vì báo lỗi không tìm thấy sản phẩm
      if (!norm.includes('trieu') && !norm.includes('duoi') && !norm.includes('tam gia')) {
        return { intent: 'general', extracted: null };
      }
    }

    // 3.5. Kiểm tra các câu chào hỏi, hỏi danh tính bot hoặc phép lịch sự (Smalltalk / Greeting / Identity)
    const smalltalkIntent = this.detectSmalltalk(text, norm);
    if (smalltalkIntent) {
      return {
        intent: smalltalkIntent,
        extracted: null,
      };
    }

    // 4. Kiểm tra ý định Tìm & Lọc theo tầm tiền / danh mục / đối tượng & nhu cầu sử dụng (Sinh viên, Văn phòng, Lập trình, Gaming, Đồ họa)
    const isPolicyOnlyQuestion =
      norm.includes('tra gop') ||
      norm.includes('thu tuc') ||
      norm.includes('ho so') ||
      norm.includes('van chuyen') ||
      norm.includes('giao hang') ||
      norm.includes('phi ship') ||
      norm.includes('thanh toan') ||
      norm.includes('hoa don') ||
      norm.includes('dia chi') ||
      norm.includes('showroom') ||
      norm.includes('cua hang') ||
      norm.includes('hotline') ||
      norm.includes('lien he');

    let useCase: string | undefined;
    if (!isPolicyOnlyQuestion) {
      const words = norm.split(/\s+/);
      const isAiKeyword =
        norm.includes('tri tue nhan tao') ||
        norm.includes('machine learning') ||
        norm.includes('deep learning') ||
        norm.includes('lam ai') ||
        norm.includes('hoc ai') ||
        norm.includes('chay ai') ||
        norm.includes('mo hinh ai');
      const isItKeyword =
        words.includes('it') ||
        norm.includes('dan it') ||
        norm.includes('nganh it') ||
        norm.includes('chuyen nganh it');

      if (
        norm.includes('lap trinh') ||
        norm.includes('code') ||
        norm.includes('cntt') ||
        norm.includes('ky su phan mem') ||
        isItKeyword ||
        isAiKeyword ||
        norm.includes('khoa hoc du lieu') ||
        norm.includes('data science') ||
        norm.includes('du lieu lon')
      ) {
        useCase = 'lap_trinh';
      } else if (
        norm.includes('gaming') ||
        norm.includes('choi game') ||
        norm.includes('do hoa') ||
        norm.includes('thiet ke') ||
        norm.includes('render') ||
        norm.includes('kien truc') ||
        norm.includes('dung phim') ||
        norm.includes('edit video')
      ) {
        useCase = 'gaming_dohoa';
      } else if (
        norm.includes('sinh vien') ||
        norm.includes('hoc sinh') ||
        norm.includes('hoc tap') ||
        norm.includes('di hoc') ||
        norm.includes('kinh te') ||
        norm.includes('ngoai ngu')
      ) {
        useCase = 'sinh_vien';
      } else if (
        norm.includes('van phong') ||
        norm.includes('ke toan') ||
        norm.includes('doanh nhan') ||
        norm.includes('mong nhe')
      ) {
        useCase = 'van_phong';
      }
    }

    const isFilterKeyword =
      !isPolicyOnlyQuestion &&
      (Boolean(useCase) ||
        norm.includes('trieu') ||
        norm.includes('ngan sach') ||
        norm.includes('tai chinh') ||
        norm.includes('tam gia') ||
        norm.includes('khoang gia') ||
        norm.includes('duoi') ||
        norm.includes('tu van mua') ||
        norm.includes('tu van may') ||
        norm.includes('tu van chon') ||
        norm.includes('goi y may') ||
        norm.includes('chon may') ||
        norm.includes('nen mua') ||
        norm.includes('gioi thieu') ||
        norm.includes('laptop') ||
        norm.includes('smartphone') ||
        norm.includes('dien thoai') ||
        norm.includes('phu kien'));

    if (isFilterKeyword) {
      const accumulated = this.extractAccumulatedSlots(text, history);
      let category = accumulated.category || '';
      if (!category) {
        if (norm.includes('laptop') || norm.includes('may tinh') || norm.includes('macbook') || accumulated.useCase) category = 'laptop';
        else if (norm.includes('dien thoai') || norm.includes('smartphone') || norm.includes('iphone')) category = 'smartphone';
        else if (norm.includes('tai nghe') || norm.includes('chuot') || norm.includes('ban phim') || norm.includes('phu kien')) category = 'accessory';
        else category = 'laptop';
      }

      const brand = accumulated.brand;
      const minPrice = accumulated.minPrice;
      const maxPrice = accumulated.maxPrice;
      const useCase = accumulated.useCase;

      const hasBudget = minPrice !== undefined || maxPrice !== undefined;
      const hasUseCase = useCase !== undefined;
      const hasBrand = brand !== undefined;

      // TH1: Thiếu cả ngân sách LẪN nhu cầu sử dụng LẪN hãng cụ thể
      // Ví dụ: "tư vấn laptop cho tôi", "tôi muốn mua laptop", "gợi ý máy tính", "nên mua máy nào"
      if (!hasBudget && !hasUseCase && !hasBrand) {
        return {
          intent: 'clarify_product_need',
          extracted: {
            category,
            missingSlots: ['budget', 'useCase'],
          },
        };
      }

      // TH2: Đã có nhu cầu sử dụng, nhưng chưa có khoảng ngân sách
      // Ví dụ: "tư vấn laptop học lập trình", "laptop cho sinh viên CNTT", "máy chơi game tốt"
      if (hasUseCase && !hasBudget) {
        return {
          intent: 'filter_products',
          extracted: {
            category,
            brand,
            minPrice: undefined,
            maxPrice: undefined,
            useCase,
            missingSlots: ['budget'],
          },
        };
      }

      // TH3: Đã có khoảng ngân sách, nhưng chưa rõ nhu cầu sử dụng
      // Ví dụ: "tư vấn laptop tầm 25 triệu", "có máy nào tầm 20 đến 30 triệu không"
      if (hasBudget && !hasUseCase) {
        return {
          intent: 'filter_products',
          extracted: {
            category,
            brand,
            minPrice,
            maxPrice,
            useCase: undefined,
            missingSlots: ['useCase'],
          },
        };
      }

      // TH4: Đã đủ cả ngân sách và nhu cầu (hoặc có thương hiệu cụ thể)
      return {
        intent: 'filter_products',
        extracted: {
          category,
          brand,
          minPrice,
          maxPrice,
          useCase,
          missingSlots: [],
        },
      };
    }

    return { intent: 'general', extracted: null };
  }

  /**
   * Tổng hợp danh sách thời hạn bảo hành của toàn bộ sản phẩm tại BK-Store
   */
  private getAllProductsWarrantyCatalog() {
    return seedProducts.map((p) => ({
      name: p.name,
      brand: p.brand,
      category: p.categorySlug,
      warrantyMonths: p.warrantyMonths || 12,
      policy: `Bảo hành chính hãng ${p.warrantyMonths || 12} tháng, 1 đổi 1 trong 30 ngày đầu nếu lỗi phần cứng nhà sản xuất`,
    }));
  }

  /**
   * Gọi mô hình Gemini với cơ chế luân chuyển model (Model Fallback),
   * điều tiết hàng đợi (Rate Limiting) và Tự động xoay vòng API Key (Key Pool Failover)
   */
  private async generateWithFallback(
    prompt: string,
    systemInstructionText?: string
  ): Promise<{ text: string; modelName: string }> {
    if (geminiKeyManager.getKeyCount() === 0) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trong file .env');
    }

    // Đợi hàng đợi phân luồng nếu có quá nhiều request đồng thời
    await geminiLimiter.acquire();

    try {
      return await geminiKeyManager.executeWithRotation(async (activeGenAI, keyInfo) => {
        let lastError: any = null;

        for (const modelName of CANDIDATE_MODELS) {
          if (unavailableModels.has(modelName)) continue;
          try {
            const modelParams: any = {
              model: modelName,
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
              },
            };
            if (systemInstructionText) {
              modelParams.systemInstruction = systemInstructionText;
            }

            const model = activeGenAI.getGenerativeModel(modelParams);
            const res = await model.generateContent(prompt);
            const text = res.response.text();
            if (text && text.trim().length > 0) {
              return { text: text.trim(), modelName };
            }
          } catch (err: any) {
            lastError = err;
            const errMsg = String(err?.message || '');
            if (err?.status === 404 || errMsg.includes('404 Not Found')) {
              unavailableModels.add(modelName);
            }

            // Nếu là lỗi Quota / Rate limit (429), ném lỗi ra ngoài để executeWithRotation đổi Key!
            const isQuotaError =
              err?.status === 429 ||
              errMsg.includes('429') ||
              errMsg.includes('Quota exceeded') ||
              errMsg.includes('RESOURCE_EXHAUSTED');

            if (isQuotaError) {
              throw err;
            }

            console.warn(`⚠️ [ChatService] Model ${modelName} gặp sự cố (${err.status || err.message}), thử model tiếp theo...`);
          }
        }

        throw lastError || new Error('Không thể kết nối với mô hình Gemini AI lúc này.');
      });
    } finally {
      geminiLimiter.release();
    }
  }

  /**
   * Xử lý câu hỏi của khách hàng, tích hợp RAG + AI Tools + Gemini + Đo lường hiệu năng (Telemetry)
   */
  public async handleMessage(options: ChatRequestOptions): Promise<ChatResponseData> {
    const startTotal = performance.now();
    const { message, history = [] } = options;

    // 0. Kiểm tra Response Cache cho câu hỏi phổ biến (khi không đăng nhập và câu hỏi độc lập)
    const isCacheCandidate = !options.currentUser && (!history || history.length === 0);
    const cacheKey = isCacheCandidate ? `chat_resp:${normalizeText(message)}` : '';
    if (cacheKey) {
      const cached = chatResponseCache.get<ChatResponseData>(cacheKey);
      if (cached) {
        return {
          ...cached,
          model: `${cached.model} (cache)`,
          metrics: cached.metrics ? { ...cached.metrics, totalResponseTimeMs: 2 } : undefined,
        };
      }
    }

    const citations: string[] = [];
    let toolResultData: any = null;
    let cardPayload: any = undefined;
    let toolUsed: string | undefined = undefined;
    let suggestions: string[] | undefined = undefined;
    let clarification:
      | {
          domain: 'product_recommendation' | 'order_tracking' | 'inventory_check' | 'product_reviews';
          missingSlots: string[];
        }
      | undefined = undefined;

    // 1. Phân tích ý định & kích hoạt AI Tool (truyền kèm history để hiểu "máy này")
    const startIntent = performance.now();
    const detected = this.detectIntent(message, history, options.currentUser);
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
          `4. 🛡️ **Giải đáp chính sách chính hãng (RAG):** Cung cấp chính xác chính sách bảo hành 1 đổi 1 trong 30 ngày, trả góp 0% và quy trình đổi trả.\n\n` +
          `Anh/chị đang quan tâm đến dòng máy nào hoặc cần em hỗ trợ thông tin gì ạ?`;
        smalltalkSuggestions = [
          'Tư vấn laptop theo tầm giá',
          'Kiểm tra tồn kho MacBook M3',
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
      // Preview 2 trending products in this category
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
    } else if (detected.intent === 'clarify_order_tracking') {
      toolUsed = 'clarifyOrderTracking';
      const missing = detected.extracted?.missingSlots || ['orderCode', 'phone'];
      clarification = {
        domain: 'order_tracking',
        missingSlots: missing,
      };
      toolResultData = {
        orderCode: detected.extracted?.orderCode,
        phone: detected.extracted?.phone,
        missingSlots: missing,
      };
      if (missing.includes('orderCode') && missing.includes('phone')) {
        suggestions = ['Đăng nhập tài khoản', 'Tra cứu mã #BK-1024', 'Hotline 1800 6868'];
      } else if (missing.includes('phone')) {
        suggestions = ['0912345678', 'Gọi tổng đài hỗ trợ'];
      } else {
        suggestions = ['Mã đơn #BK-1024', 'Mã đơn #BK-2048', 'Đăng nhập tài khoản'];
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
        'MacBook Air M3',
        'Dell XPS 14',
        'ASUS ROG Zephyrus',
        'iPhone 16 Pro Max',
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
        'Đánh giá MacBook Air M3',
        'Đánh giá Dell XPS 14',
        'Đánh giá iPhone 16 Pro Max',
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
      toolResultData = inv;
      if (inv.found && inv.product) {
        cardPayload = {
          type: 'inventory',
          data: inv,
        };
      }
      suggestions = ['Xem thông số chi tiết', 'Chính sách 1 đổi 1 30 ngày', 'Tư vấn trả góp 0%'];
    } else if (detected.intent === 'track_order') {
      toolUsed = 'trackOrder';
      const isAskingUserSummary =
        detected.extracted?.isAskingMyOrders ||
        detected.extracted?.isAskingUnconfirmedOrders ||
        (!detected.extracted?.orderCode && !detected.extracted?.phone);

      let userOrders: any[] = [];
      if (options.currentUser && isAskingUserSummary) {
        userOrders = await getOrdersByUserId(options.currentUser.id, options.currentUser.phone);
      } else if (!options.currentUser && detected.extracted?.phone && isAskingUserSummary) {
        userOrders = await getOrdersByPhone(detected.extracted.phone);
      }

      if (isAskingUserSummary && (options.currentUser || (detected.extracted?.phone && userOrders.length > 0))) {
        if (userOrders.length > 0) {
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
          const custName = options.currentUser?.name || userOrders[0]?.customerName || 'Quý khách';

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
              statusLabel: this.getOrderStatusLabel(primaryOrder.status),
              trackingInfo: primaryOrder.trackingInfo,
              branchName: primaryOrder.branchName || 'BK-Store Cầu Giấy (Hà Nội)',
              deliveryAddress: primaryOrder.address,
            },
            orderCode: primaryOrder.orderCode,
            totalAmount: primaryOrder.totalAmount,
            formattedTotal: formatVND(Number(primaryOrder.totalAmount)),
            status: primaryOrder.status,
            statusLabel: this.getOrderStatusLabel(primaryOrder.status),
            trackingInfo: primaryOrder.trackingInfo,
            branchName: primaryOrder.branchName || 'BK-Store Cầu Giấy (Hà Nội)',
            deliveryAddress: primaryOrder.address,
            message: `Tìm thấy ${userOrders.length} đơn hàng của khách hàng ${custName}.`,
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
            customerName: options.currentUser?.name || 'Quý khách',
            message: `Dạ em kiểm tra trên hệ thống thì tài khoản của anh/chị ${options.currentUser?.name || 'mình'} hiện chưa có đơn hàng nào tại BK-Store. Anh/chị cần em hỗ trợ tư vấn dòng máy nào không ạ?`,
          };
        }
      } else if (!options.currentUser && !detected.extracted?.orderCode && !detected.extracted?.phone) {
        toolResultData = {
          found: false,
          isAskingUnconfirmedOrders: Boolean(detected.extracted?.isAskingUnconfirmedOrders),
          message: detected.extracted?.isAskingUnconfirmedOrders
            ? 'Dạ để kiểm tra xem tài khoản của mình có bao nhiêu đơn hàng chưa được xác nhận / duyệt đơn, anh/chị vui lòng bấm nút "Đăng nhập" ở góc trên màn hình để hệ thống tự động kiểm tra, hoặc cung cấp Số điện thoại đã đặt hàng để em tra cứu bảo mật ngay nhé ạ!'
            : 'Dạ để tra cứu đơn hàng cá nhân, anh/chị có thể đăng nhập tài khoản bằng nút "Đăng nhập" ở góc trên màn hình để xem toàn bộ lịch sử đơn. Hoặc cung cấp giúp em Mã đơn hàng (#BK-xxxx) và Số điện thoại đã dùng khi đặt hàng để em tra cứu bảo mật ngay cho mình nhé ạ!',
        };
      } else {
        const ord = await trackOrder(detected.extracted);
        toolResultData = ord;
        if (ord.found) {
          cardPayload = {
            type: 'order',
            data: ord,
          };
        }
      }
      suggestions = detected.extracted?.isAskingUnconfirmedOrders
        ? ['Đơn hàng của tôi', 'Chính sách bảo hành', 'Hotline 1800 6868']
        : ['Xem chi tiết sản phẩm', 'Chính sách bảo hành', 'Hotline 1800 6868'];
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
            data: filt.products.slice(0, 2),
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
            data: filt.products.slice(0, 2),
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
        warrantyCatalog: this.getAllProductsWarrantyCatalog(),
      };
      suggestions = ['Bảo hành MacBook', 'Bảo hành Dell XPS', 'Chính sách 1 đổi 1 30 ngày'];
    }
    const toolExecutionMs = toolUsed ? Math.max(1, Math.round((performance.now() - startTool) * 100) / 100) : 0;

    // 2. Tra cứu RAG ngữ cảnh tri thức (Chính sách, Cẩm nang tư vấn)
    const startRag = performance.now();
    let ragContextText = '';
    let matchedRagChunks: SearchResult[] = [];
    let topRagScore = 0;
    try {
      let searchQuery = message;
      if (history && history.length > 0 && message.trim().split(/\s+/).length <= 6) {
        const lastUserMsg = [...history].reverse().find((h) => h.role === 'user');
        if (lastUserMsg && lastUserMsg.content) {
          searchQuery = `${lastUserMsg.content} ${message}`;
        }
      }

      const ragResults = await ragService.search(searchQuery, 3);
      if (ragResults.length > 0) {
        topRagScore = Math.round(ragResults[0].score * 1000) / 1000;
      }
      matchedRagChunks = ragResults.filter((r) => r.score >= 0.2);

      if (matchedRagChunks.length > 0) {
        const contextParts: string[] = [];
        for (const res of matchedRagChunks) {
          const docTitle = res.chunk.documentTitle || res.chunk.category;
          const secTitle = res.chunk.sectionTitle ? ` - ${res.chunk.sectionTitle}` : '';
          citations.push(`${docTitle}${secTitle}`);
          const cleanChunkText = res.chunk.content
            .replace(/\[Tài liệu:.*?\]/g, '')
            .replace(/\[Mục:.*?\]/g, '')
            .trim();
          contextParts.push(`Tài liệu tham khảo (${docTitle}${secTitle}):\n${cleanChunkText}`);
        }
        ragContextText = contextParts.join('\n\n');
      }
    } catch (ragErr: any) {
      console.warn('⚠️ [ChatService] Tra cứu RAG gặp lỗi nhẹ:', ragErr.message);
    }
    const ragRetrievalMs = Math.max(1, Math.round((performance.now() - startRag) * 100) / 100);

    // 3. Xây dựng Prompt tổng hợp gửi cho Gemini
    let conversationHistoryText = '';
    if (history && history.length > 0) {
      const recentHistory = history.slice(-4);
      conversationHistoryText = recentHistory
        .map((h) => `${h.role === 'user' ? 'Khách hàng' : 'BK-Bot'}: ${h.content}`)
        .join('\n');
    }

    // Ràng buộc đồng bộ thẻ sản phẩm (Card-First Synchronization)
    let cardSyncConstraint = '';
    if (
      cardPayload &&
      cardPayload.type === 'products' &&
      Array.isArray(cardPayload.data) &&
      cardPayload.data.length > 0
    ) {
      const cardItemsText = cardPayload.data
        .map(
          (p: any, idx: number) =>
            `${idx + 1}. ${p.name} (Giá bán niêm yết: ${p.formattedPrice}) - Điểm nổi bật: ${p.specsSummary || 'Cấu hình mạnh mẽ, chính hãng 100%'}`
        )
        .join('\n');

      cardSyncConstraint =
        `=== RÀNG BUỘC ĐỒNG BỘ THẺ SẢN PHẨM (CARD SYNCHRONIZATION - BẮT BUỘC) ===\n` +
        `Giao diện tương tác bên dưới câu trả lời của bạn ĐANG VÀ SẼ HIỂN THỊ CHÍNH XÁC ${cardPayload.data.length} THẺ SẢN PHẨM SAU:\n` +
        `${cardItemsText}\n\n` +
        `QUY TẮC BẮT BUỘC ĐỂ TRÁNH MÂU THUẪN DỮ LIỆU:\n` +
        `1. Trong nội dung câu trả lời, bạn CHỈ ĐƯỢC PHÉP tư vấn, nhận xét và nêu tên đúng các sản phẩm có trong danh sách ${cardPayload.data.length} thẻ trên.\n` +
        `2. TUYỆT ĐỐI KHÔNG tự ý gợi ý, nêu tên hay đề xuất bất kỳ dòng máy nào khác không nằm trong danh sách thẻ trên (kể cả những mẫu máy xuất hiện trong tài liệu cẩm nang tham khảo).\n` +
        `3. Tên sản phẩm và mức giá bạn nhắc tới trong câu trả lời văn bản phải trùng khớp 100% với danh sách thẻ ở trên.\n\n`;
    }

    const userPromptWithData = `${cardSyncConstraint}${ragContextText ? `=== NGỮ CẢNH TRI THỨC CHUẨN XÁC TỪ BK-STORE (RAG) ===\n${ragContextText}\n\n` : ''}${toolResultData ? `=== DỮ LIỆU THỜI GIAN THỰC TỪ HỆ THỐNG / DATABASE (LIVE DATA) ===\nCông cụ: ${toolUsed}\nKết quả: ${JSON.stringify(toolResultData, null, 2)}\n\n` : ''}${conversationHistoryText ? `=== LỊCH SỬ HỘI THOẠI GẦN ĐÂY ===\n${conversationHistoryText}\n\n` : ''}Khách hàng vừa hỏi: "${message}"

LƯU Ý QUAN TRỌNG VỀ ĐỘ DÀI & ĐỊNH DẠNG:
- Giao diện thẻ tương tác (Product Cards) ngay phía dưới tin nhắn đã hiển thị đầy đủ hình ảnh, giá bán, link xem chi tiết và tóm tắt cấu hình của các máy.
- TUYỆT ĐỐI KHÔNG liệt kê lại toàn bộ bảng thông số kỹ thuật chi tiết (như danh sách dài CPU, GPU, RAM, SSD, màn hình, pin, cổng kết nối...) trong tin nhắn văn bản vì sẽ làm câu trả lời quá dài.
- Chỉ tư vấn ngắn gọn, súc tích (tối đa 2-3 máy, mỗi máy 1-2 dòng nêu điểm nổi bật nhất phù hợp với nhu cầu khách), và hướng dẫn khách xem chi tiết tại thẻ sản phẩm bên dưới.
- ĐỒNG BỘ 100%: Chỉ tư vấn và nhắc tên các sản phẩm nằm trong danh sách thẻ tương tác (Product Cards) được cung cấp ở trên, tuyệt đối không nhắc máy ngoài danh sách thẻ.

Hãy đưa ra câu trả lời trực tiếp cho khách hàng (chỉ xuất lời thoại tư vấn, tuyệt đối không in bất kỳ dòng checklist hoặc siêu dữ liệu tự kiểm tra nào):`;

    const startLlm = performance.now();
    let replyText = '';
    let usedModel = 'gemini-3.8-flash';

    try {
      const genResult = await this.generateWithFallback(userPromptWithData, SYSTEM_INSTRUCTION);
      replyText = genResult.text;
      usedModel = genResult.modelName;
    } catch (aiErr: any) {
      console.error('❌ [ChatService] Lỗi khi gọi Gemini, sử dụng Smart Fallback:', aiErr.message);

      // Smart Fallback nếu Gemini API tạm gián đoạn (503/Quota)
      if (toolResultData) {
        if (toolUsed === 'clarifyProductNeed') {
          const catName = toolResultData.category === 'smartphone' ? 'điện thoại' : toolResultData.category === 'accessory' ? 'phụ kiện' : 'laptop';
          replyText = `Dạ chào anh/chị! Để em có thể chọn lọc và tư vấn mẫu **${catName}** chuẩn xác và phù hợp nhất cho mình, anh/chị chia sẻ thêm giúp em 2 thông tin nhỏ này nhé ạ:\n\n` +
            `1. **Mức ngân sách dự kiến:** Anh/chị đang muốn đầu tư trong khoảng bao nhiêu triệu (ví dụ: *Dưới 15 triệu*, *15 - 25 triệu*, *25 - 40 triệu*, hoặc *Trên 40 triệu*)?\n` +
            `2. **Nhu cầu sử dụng chính:** Anh/chị mua máy để phục vụ tác vụ gì là chủ yếu (ví dụ: *Học tập - Văn phòng*, *Lập trình / Kỹ thuật IT*, *Đồ họa - Gaming*, hay *Mỏng nhẹ di chuyển nhiều*)?\n\n` +
            `Anh/chị có thể bấm nhanh vào các nút gợi ý bên dưới hoặc nhắn trực tiếp cho em nhé! Em có gửi trước 2 mẫu máy nổi bật bên dưới để anh/chị tham khảo trước ạ.`;
        } else if (toolUsed === 'clarifyOrderTracking') {
          const missing = toolResultData.missingSlots || [];
          if (toolResultData.isAskingUnconfirmedOrders || missing.includes('authOrPhone')) {
            replyText = `Dạ chào anh/chị! Để em có thể kiểm tra xem tài khoản của mình hiện có bao nhiêu đơn hàng chưa được xác nhận / duyệt đơn tại BK-Store, anh/chị vui lòng:\n\n` +
              `• **Đăng nhập tài khoản:** Bấm nút **"Đăng nhập"** ở góc trên màn hình để hệ thống tự động kiểm tra và hiển thị toàn bộ lịch sử đơn hàng của mình.\n` +
              `• **Hoặc cung cấp Số điện thoại:** Nhắn số điện thoại đã dùng khi đặt hàng tại BK-Store để em tra cứu bảo mật ngay cho mình nhé ạ!`;
          } else if (missing.includes('orderCode') && missing.includes('phone')) {
            replyText = `Dạ chào anh/chị! Để tra cứu tiến trình đơn hàng và kho xuất hàng tại BK-Store, anh/chị có thể:\n\n` +
              `• **Đăng nhập tài khoản:** Bấm nút **"Đăng nhập"** ở góc trên màn hình để hệ thống tự động tải toàn bộ lịch sử đơn hàng của mình.\n` +
              `• **Tra cứu nhanh:** Cung cấp giúp em **Mã đơn hàng** (dạng *#BK-xxxx*) và **Số điện thoại** đã dùng khi đặt hàng để em tra cứu bảo mật ngay cho mình nhé ạ!`;
          } else if (missing.includes('phone')) {
            replyText = `Dạ em đã nhận được mã đơn hàng **${toolResultData.orderCode}** của anh/chị. Để đảm bảo tính bảo mật thông tin đơn hàng cá nhân, anh/chị vui lòng cung cấp thêm **Số điện thoại** đã dùng khi đặt hàng để em kiểm tra tiến trình giao hàng ngay nhé ạ!`;
          } else {
            replyText = `Dạ em đã ghi nhận số điện thoại **${toolResultData.phone}**. Anh/chị vui lòng cung cấp thêm **Mã đơn hàng** (ví dụ: *#BK-1024* trong tin nhắn xác nhận hoặc email) để em tra cứu lộ trình xuất kho và vận chuyển cho mình nhé ạ!`;
          }
        } else if (toolUsed === 'clarifyInventoryProduct') {
          const branchText = toolResultData.branchName ? ` tại chi nhánh **${toolResultData.branchName}**` : '';
          replyText = `Dạ chào anh/chị! Hệ thống kho của BK-Store hiện luôn cập nhật số lượng tồn thời gian thực tại cả 3 Showroom (Hà Nội, TP.HCM, Đà Nẵng).\n\n` +
            `Anh/chị đang quan tâm và muốn kiểm tra tình trạng còn hàng${branchText} của **mẫu sản phẩm cụ thể nào** ạ? (Ví dụ: *MacBook Air M3*, *Dell XPS 14*, *ASUS ROG Zephyrus*, hoặc *iPhone 16 Pro Max*).\n\n` +
            `Anh/chị có thể bấm chọn gợi ý bên dưới để em kiểm tra ngay lập tức nhé!`;
        } else if (toolUsed === 'clarifyReviewProduct') {
          replyText = `Dạ chào anh/chị! BK-Store có hệ thống đánh giá 100% từ khách hàng thực tế đã nhận máy thành công.\n\n` +
            `Anh/chị muốn xem nhận xét & đánh giá trải nghiệm thực tế của **dòng sản phẩm nào** ạ? (Ví dụ: *MacBook Air M3*, *Dell XPS 14*, *iPhone 16 Pro Max*).\n\n` +
            `Anh/chị có thể chọn một trong các gợi ý bên dưới để xem số sao và nhận xét chi tiết nhé!`;
        } else if (toolUsed === 'getWarrantyCatalog') {
          replyText = `Dạ chào anh/chị! Tại BK-Store, tất cả sản phẩm bán ra đều là **hàng chính hãng 100% nguyên seal hộp** với thời hạn và chế độ bảo hành cụ thể cho từng máy như sau ạ:\n\n`;
          replyText += `**1. Thời hạn bảo hành chính hãng theo từng dòng máy:**\n`;
          replyText += `• **Nhóm bảo hành 24 tháng:**\n  - Dell XPS 14 9440, Lenovo ThinkPad X1 Carbon Gen 12\n  - ASUS ROG Zephyrus G14 OLED, ASUS Zenbook 14 OLED UX3405MA\n  - Acer Predator Helios Neo 16\n`;
          replyText += `• **Nhóm bảo hành 18 tháng:**\n  - Điện thoại Xiaomi 14 Ultra 5G (16GB/512GB)\n  - Củ sạc nhanh Anker 735 GaNPrime 65W / 67W\n`;
          replyText += `• **Nhóm bảo hành 12 tháng:**\n  - Apple MacBook Air 13 M3, Apple MacBook Pro 14 M3 Pro\n  - Apple iPhone 16 Pro Max, Samsung Galaxy S24 Ultra 5G\n  - Tai nghe Sony WH-1000XM5, Apple AirPods Pro 2, Chuột Logitech MX Master 3S, Bàn phím cơ Keychron Q1 Pro\n\n`;
          replyText += `**2. Đặc quyền bảo hành Vàng tại BK-Store:**\n`;
          replyText += `• **1 ĐỔI 1 trong 30 ngày đầu tiên:** Đổi ngay 01 máy mới 100% nguyên seal nếu phát sinh lỗi kỹ thuật phần cứng từ nhà sản xuất (mainboard, nguồn, màn hình, camera, loa, bàn phím).\n`;
          replyText += `• **Bảo hành Màn hình & Pin:** Bảo hành màn hình từ 03 điểm chết hoặc sọc/nhấp nháy; thay pin mới chính hãng miễn phí nếu dung lượng pin tối đa (Battery Health) dưới 80% trong 12 tháng đầu.\n`;
          replyText += `• **Hỗ trợ máy dùng tạm:** Cho mượn miễn phí 01 thiết bị tương đương trong suốt thời gian chờ hãng bảo hành (3–7 ngày làm việc) tại cả 3 Showroom (Hà Nội, TP.HCM, Đà Nẵng).\n\n`;
          replyText += `Anh/chị đang quan tâm cụ thể đến mẫu máy nào để em tư vấn chi tiết hơn ạ?`;
        } else if (toolUsed === 'getProductDetails' && toolResultData.product) {
          const p = toolResultData.product;
          if (toolResultData.isWarrantyQuestion) {
            replyText = `Dạ chào anh/chị! Về chính sách bảo hành dành cho **${p.name}** (${p.brand}) tại BK-Store, em xin thông tin chi tiết đến anh/chị như sau ạ:\n\n`;
            replyText += `• **Thời hạn bảo hành chính hãng:** **${p.warrantyMonths} tháng** (Hàng chính hãng 100% nguyên seal hộp).\n`;
            replyText += `• **Đặc quyền 1 ĐỔI 1 trong 30 ngày đầu:** Nếu máy phát sinh lỗi kỹ thuật phần cứng từ nhà sản xuất (mainboard, nguồn, màn hình sọc/chớp nháy, camera, loa, bàn phím), BK-Store đổi ngay **01 máy mới 100% nguyên seal** (hoặc hoàn tiền 100% nếu tạm hết hàng).\n`;
            replyText += `• **Quy định bảo hành Màn hình & Pin:**\n  - *Màn hình:* Bảo hành miễn phí khi có từ 03 điểm chết trở lên, điểm sáng > 1mm hoặc lỗi sọc màn hình, cảm ứng.\n  - *Pin:* Thay pin mới chính hãng miễn phí nếu dung lượng pin tối đa (Battery Health) giảm xuống dưới 80% trong 12 tháng đầu.\n`;
            replyText += `• **Đặc quyền hỗ trợ tại 3 Showroom (Hà Nội, TP.HCM, Đà Nẵng):** Đổi mới tại quầy trong 15–30 phút (trong 30 ngày đầu), và **hỗ trợ cho mượn miễn phí 01 thiết bị tương đương** dùng tạm nếu cần gửi thẩm định hãng (3–7 ngày).\n\n`;
            replyText += `Hiện **${p.name}** đang có giá ưu đãi **${p.formattedPrice}**. Anh/chị có muốn em kiểm tra tồn kho tại chi nhánh gần mình nhất không ạ?`;
          } else {
            replyText = `Dạ chào anh/chị! Về mẫu máy **${p.name}** (${p.brand}), đây là dòng sản phẩm chính hãng 100% tại BK-Store với mức giá ưu đãi **${p.formattedPrice}**.\n\n`;
            const highlightSpecs = [
              p.specs?.cpu ? `CPU ${p.specs.cpu}` : '',
              p.specs?.ram ? `RAM ${p.specs.ram}` : '',
              p.specs?.gpu ? `GPU ${p.specs.gpu}` : '',
              p.specs?.display ? `Màn hình ${p.specs.display}` : '',
            ].filter(Boolean).slice(0, 2).join(' • ');
            if (highlightSpecs) {
              replyText += `• **Điểm nổi bật:** ${highlightSpecs}\n`;
            }
            replyText += `• **Chính sách bảo hành:** Bảo hành chính hãng **${p.warrantyMonths} tháng**, đặc quyền **1 đổi 1 trong 30 ngày** nếu có lỗi phần cứng từ nhà sản xuất.\n\n`;
            replyText += `Anh/chị có thể xem đầy đủ ảnh thực tế và thông số chi tiết tại thẻ sản phẩm ngay bên dưới nhé ạ. Anh/chị có muốn em kiểm tra tồn kho tại showroom gần mình nhất không ạ?`;
          }
        } else if (toolUsed === 'getProductReviews') {
          if (toolResultData.found && toolResultData.product) {
            const p = toolResultData.product;
            replyText = `Dạ chào anh/chị! Dưới đây là thông tin đánh giá thực tế từ khách hàng đã mua **${p.name}** tại BK-Store:\n\n`;
            replyText += `• **Điểm trung bình:** ⭐ **${toolResultData.averageRating}/5 sao** (${toolResultData.totalReviews} lượt đánh giá thực tế)\n`;
            if (toolResultData.reviews && toolResultData.reviews.length > 0) {
              replyText += `• **Nhận xét tiêu biểu từ khách hàng:**\n`;
              replyText += toolResultData.reviews
                .map((r: any) => `  - ⭐ ${r.rating}/5 — **${r.customerName}**: "${r.comment}"`)
                .join('\n') + '\n';
            }
            replyText += `\n${toolResultData.howToReview}\n\nAnh/chị có muốn em tư vấn chi tiết hơn về cấu hình máy này không ạ?`;
          } else if (matchedRagChunks && matchedRagChunks.length > 0) {
            const topChunk = matchedRagChunks[0].chunk;
            const cleanContent = topChunk.content
              .replace(/\[Tài liệu:.*?\]/g, '')
              .replace(/\[Mục:.*?\]/g, '')
              .replace(/^#+\s+/gm, '')
              .trim();
            const paragraphs = cleanContent
              .split('\n\n')
              .filter((p) => p.trim().length > 0)
              .slice(0, 3)
              .join('\n\n');
            replyText = `Dạ em chào anh/chị! Về hướng dẫn và quy trình đánh giá sản phẩm tại BK-Store, em xin phép thông tin chi tiết đến anh/chị như sau:\n\n${paragraphs}\n\nAnh/chị có thể bấm nút "⭐ Đánh giá" trên thanh menu Header để gửi nhận xét bất kỳ lúc nào nhé!`;
          } else {
            replyText = `Dạ chào anh/chị! ${toolResultData.message}\n\n${toolResultData.howToReview || ''}`;
          }
        } else if (toolUsed === 'checkReviewEligibility') {
          replyText = `Dạ chào anh/chị! ${toolResultData.message}`;
        } else if (toolUsed === 'checkInventory') {
          replyText = `Dạ chào anh/chị! BK-Bot đã kiểm tra nhanh hệ thống kho:\n\n${toolResultData.message}\n\n`;
          if (toolResultData.branches && toolResultData.branches.length > 0) {
            replyText += toolResultData.branches
              .map((b: any) => `• **${b.branchName}** (${b.address}): **${b.status}** (${b.quantity} máy)`)
              .join('\n');
          }
          replyText += `\n\nAnh/chị có muốn em giữ máy trước tại chi nhánh gần mình không ạ?`;
        } else if (toolUsed === 'trackOrder') {
          if (toolResultData.found) {
            if (toolResultData.isUserOrderSummary) {
              const name = toolResultData.customerName || 'anh/chị';
              if (toolResultData.isAskingUnconfirmedOrders) {
                if (toolResultData.unconfirmedCount === 0) {
                  replyText = `Dạ em chào anh/chị **${name}**! Em đã kiểm tra hệ thống thì trong tổng số **${toolResultData.userOrdersCount} đơn hàng** của mình tại BK-Store, hiện tại **không có đơn hàng nào chưa được xác nhận / duyệt đơn** (0 đơn chờ duyệt).\n\n` +
                    `Tất cả các đơn hàng của anh/chị đều đã được duyệt và đang trong các tiến trình tiếp theo:\n` +
                    (toolResultData.confirmedCount > 0 ? `• **Đã xác nhận (đã duyệt):** ${toolResultData.confirmedCount} đơn\n` : '') +
                    (toolResultData.shippingCount > 0 ? `• **Đang vận chuyển:** ${toolResultData.shippingCount} đơn\n` : '') +
                    (toolResultData.deliveredCount > 0 ? `• **Giao hàng thành công:** ${toolResultData.deliveredCount} đơn\n` : '') +
                    (toolResultData.cancelledCount > 0 ? `• **Đã hủy:** ${toolResultData.cancelledCount} đơn\n` : '') +
                    `\nAnh/chị có thể xem thẻ chi tiết đơn hàng bên dưới hoặc mở mục **"Đơn hàng của tôi"** trên thanh menu Header để xem chi tiết nhé ạ!`;
                } else {
                  replyText = `Dạ em chào anh/chị **${name}**! Em đã kiểm tra trên hệ thống thì trong tổng số **${toolResultData.userOrdersCount} đơn hàng** của mình tại BK-Store, hiện có **${toolResultData.unconfirmedCount} đơn hàng chưa được xác nhận / duyệt đơn** (đang chờ quản trị viên duyệt kho):`;
                }
              } else {
                replyText = `Dạ em chào anh/chị **${name}**! Em đã tra cứu thấy tài khoản của mình hiện có tổng cộng **${toolResultData.userOrdersCount} đơn hàng** tại BK-Store:\n` +
                  (toolResultData.unconfirmedCount > 0 ? `• **Chờ xác nhận (chưa duyệt):** **${toolResultData.unconfirmedCount}** đơn\n` : '') +
                  (toolResultData.confirmedCount > 0 ? `• **Đã xác nhận:** ${toolResultData.confirmedCount} đơn\n` : '') +
                  (toolResultData.shippingCount > 0 ? `• **Đang vận chuyển:** ${toolResultData.shippingCount} đơn\n` : '') +
                  (toolResultData.deliveredCount > 0 ? `• **Giao hàng thành công:** ${toolResultData.deliveredCount} đơn\n` : '') +
                  `\nĐơn hàng gần nhất là **${toolResultData.orderCode}**:\n` +
                  `• **Mã đơn:** ${toolResultData.orderCode}\n` +
                  `• **Trạng thái:** ${toolResultData.statusLabel}\n` +
                  `• **Kho xuất hàng:** **${toolResultData.branchName}**\n` +
                  `• **Tổng thanh toán:** ${toolResultData.formattedTotal}\n` +
                  `• **Lộ trình:** ${toolResultData.trackingInfo || 'Đang chuẩn bị giao hàng'}\n\n` +
                  `Anh/chị có thể xem thẻ chi tiết đơn hàng ngay bên dưới hoặc mở mục **"Đơn hàng của tôi"** trên menu để xem toàn bộ danh sách nhé ạ!`;
              }
            } else {
              replyText = `Dạ chào anh/chị! BK-Bot xin gửi thông tin chi tiết đơn hàng:\n\n• **Mã đơn:** ${toolResultData.orderCode}\n• **Khách hàng:** ${toolResultData.customerName || 'Quý khách'}\n• **Kho xuất hàng:** **${toolResultData.branchName || 'BK-Store Cầu Giấy (Hà Nội)'}**\n• **Địa chỉ nhận:** ${toolResultData.deliveryAddress || 'Giao hàng tận nơi'}\n• **Trạng thái:** ${toolResultData.statusLabel}\n• **Tiến trình:** ${toolResultData.trackingInfo}\n• **Tổng thanh toán:** ${toolResultData.formattedTotal}\n\nĐơn hàng đang được BK-Store xử lý đúng tiến độ ạ!`;
            }
          } else {
            replyText = `Dạ chào anh/chị! ${toolResultData.message}`;
          }
        } else if (toolUsed === 'filterProducts') {
          const missingSlots = detected.extracted?.missingSlots || [];
          const previewProducts =
            cardPayload && Array.isArray(cardPayload.data) && cardPayload.data.length > 0
              ? cardPayload.data
              : (toolResultData.products || []).slice(0, 2);

          const previewListText =
            previewProducts.length > 0
              ? `Em có gửi trước ${previewProducts.length} mẫu máy tiêu biểu phù hợp nhất tại BK-Store ngay bên dưới:\n` +
                previewProducts
                  .map((p: any) => `• **${p.name}** (Giá: **${p.formattedPrice}**): ${p.specsSummary || 'Hàng chính hãng, bảo hành 1 đổi 1'}`)
                  .join('\n') +
                `\n\n`
              : '';

          if (missingSlots.includes('budget')) {
            const introAdvice = toolResultData.advice
              ? `${toolResultData.advice}\n\n`
              : `Dạ chào anh/chị! Dòng máy này tại BK-Store có khá nhiều phân khúc giá khác nhau.\n\n`;
            replyText =
              `Dạ chào anh/chị! ${introAdvice}` +
              previewListText +
              `Để em chọn lọc chính xác hơn nữa theo mức ngân sách của mình, **anh/chị dự định đầu tư khoảng bao nhiêu triệu** ạ? (Ví dụ: *Dưới 20 triệu*, *20 - 30 triệu*, hoặc *Trên 30 triệu*).\n\n` +
              `Anh/chị có thể bấm chọn gợi ý bên dưới hoặc xem ảnh thực tế và cấu hình chi tiết tại thẻ sản phẩm nhé ạ!`;
          } else if (missingSlots.includes('useCase')) {
            replyText =
              `Dạ chào anh/chị! Trong tầm ngân sách này tại BK-Store có khá nhiều sự lựa chọn chất lượng.\n\n` +
              previewListText +
              `Để em chọn lọc chuẩn xác nhất, **nhu cầu sử dụng chính của anh/chị là gì** ạ?\n` +
              `• **Học tập / Văn phòng:** Cần pin trâu, máy mỏng nhẹ mang đi lại thường xuyên.\n` +
              `• **Lập trình / Kỹ thuật (IT):** Cần CPU mạnh, RAM từ 16GB–32GB, bàn phím gõ êm.\n` +
              `• **Gaming / Đồ họa 3D:** Cần card đồ họa rời NVIDIA RTX, tản nhiệt tốt, màn hình tần số quét cao.\n\n` +
              `Anh/chị có thể bấm chọn gợi ý bên dưới hoặc nhắn trực tiếp cho em nhé!`;
          } else {
            const introAdvice = toolResultData.advice
              ? `${toolResultData.advice}\n\n`
              : `Dạ chào anh/chị! Dựa trên nhu cầu và tầm ngân sách của mình, em gợi ý các mẫu máy tối ưu nhất đang sẵn hàng tại BK-Store:\n\n`;
            replyText = `Dạ chào anh/chị! ${introAdvice}`;
            const targetProducts =
              cardPayload && Array.isArray(cardPayload.data) && cardPayload.data.length > 0
                ? cardPayload.data
                : (toolResultData.products || []).slice(0, 3);
            replyText += targetProducts
              .map((p: any) => `• **${p.name}** (Giá: **${p.formattedPrice}**): ${p.specsSummary || 'Hiệu năng mạnh mẽ, thiết kế cao cấp.'}`)
              .join('\n');
            replyText += `\n\nAnh/chị có thể xem ảnh thực tế và cấu hình chi tiết tại các thẻ sản phẩm bên dưới. Anh/chị cần em kiểm tra máy sẵn tại chi nhánh nào ạ?`;
          }
        } else if (matchedRagChunks && matchedRagChunks.length > 0) {
          const topChunk = matchedRagChunks[0].chunk;
          const cleanContent = topChunk.content
            .replace(/\[Tài liệu:.*?\]/g, '')
            .replace(/\[Mục:.*?\]/g, '')
            .replace(/^#+\s+/gm, '')
            .trim();
          const paragraphs = cleanContent
            .split('\n\n')
            .filter((p) => p.trim().length > 0)
            .slice(0, 3)
            .join('\n\n');
          const prefix =
            topChunk.category === 'buying_guide'
              ? 'Dạ em chào anh/chị! Dựa trên nhu cầu của mình, BK-Bot xin gợi ý tiêu chuẩn chọn máy và các dòng máy phù hợp tại BK-Store như sau:'
              : 'Dạ em chào anh/chị! Về chính sách chính thức của BK-Store, em xin phép thông tin chi tiết đến anh/chị như sau:';
          replyText = `${prefix}\n\n${paragraphs}\n\nAnh/chị hoàn toàn yên tâm khi mua sắm tại BK-Store ạ! Nếu cần hỗ trợ thêm thông tin chi tiết, anh/chị có thể liên hệ ngay tổng đài miễn phí **1800 6868** nhé!`;
        } else {
          replyText = `Dạ, ${toolResultData.message || 'BK-Store luôn sẵn sàng phục vụ anh/chị!'}`;
        }
      } else {
        const normMsg = normalizeText(message);
        const smalltalkFallback = this.detectSmalltalk(message, normMsg);

        if (smalltalkFallback === 'about_bot') {
          replyText = `Dạ em chào anh/chị! Em là **BK-Bot** – Trợ lý ảo AI thông minh tại Hệ thống bán lẻ công nghệ **BK-Store** 🤖✨\n\n` +
            `Em có thể hỗ trợ anh/chị:\n` +
            `• Tư vấn cấu hình laptop, điện thoại, phụ kiện theo ngân sách & nhu cầu (học tập, IT, đồ họa, gaming).\n` +
            `• Tra cứu số lượng tồn kho thời gian thực tại cả 3 Showroom (Hà Nội, TP.HCM, Đà Nẵng).\n` +
            `• Tra cứu nhanh trạng thái đơn hàng (#BK-xxxx) và tiến trình vận đơn.\n` +
            `• Hướng dẫn chính sách bảo hành 1 đổi 1 trong 30 ngày và trả góp 0%.\n\n` +
            `Anh/chị đang quan tâm đến dòng máy nào hay cần em hỗ trợ thông tin gì ạ?`;
          suggestions = ['Tư vấn laptop theo tầm giá', 'Kiểm tra tồn kho Showroom', 'Tra cứu đơn hàng', 'Chính sách bảo hành'];
        } else if (smalltalkFallback === 'greeting') {
          replyText = `Dạ em chào anh/chị! Chào mừng anh/chị đến với **BK-Store**.\n\nEm là **BK-Bot**, trợ lý AI của cửa hàng. Em có thể hỗ trợ anh/chị tư vấn chọn máy theo ngân sách, kiểm tra tồn kho tại các chi nhánh hoặc tra cứu tiến trình đơn hàng. Anh/chị đang quan tâm đến sản phẩm nào ạ?`;
          suggestions = ['Tư vấn laptop sinh viên', 'Laptop Gaming / Đồ họa', 'Kiểm tra tồn kho chi nhánh', 'Chính sách bảo hành 1 đổi 1'];
        } else if (smalltalkFallback === 'courtesy') {
          replyText = `Dạ không có gì ạ! BK-Bot rất vui được hỗ trợ anh/chị tại BK-Store. Nếu có bất kỳ câu hỏi nào cần giải đáp thêm, anh/chị cứ nhắn em nhé! Chúc anh/chị một ngày thật vui vẻ ạ! 😊`;
          suggestions = ['Xem laptop bán chạy', 'Chính sách trả góp 0%', 'Hotline 1800 6868'];
        } else if (
          normMsg.includes('dia chi') ||
          normMsg.includes('showroom') ||
          normMsg.includes('cua hang') ||
          normMsg.includes('chi nhanh o dau') ||
          normMsg.includes('hotline') ||
          normMsg.includes('gio mo cua') ||
          normMsg.includes('lien he')
        ) {
          replyText = `Dạ em chào anh/chị! Hệ thống **BK-Store** hiện có 3 Showroom chính hãng và tổng đài phục vụ trên toàn quốc:\n\n` +
            `📍 **Showroom Hà Nội:** 123 Cầu Giấy, Q. Cầu Giấy, Hà Nội\n` +
            `📍 **Showroom TP.HCM:** 456 Nguyễn Thị Minh Khai, P. Bến Nghé, Quận 1, TP.HCM\n` +
            `📍 **Showroom Đà Nẵng:** 789 Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng\n\n` +
            `⏰ **Giờ mở cửa:** 08:30 - 21:30 (tất cả các ngày trong tuần, kể cả ngày lễ)\n` +
            `📞 **Hotline tư vấn & CSKH:** **1800 6868** (Miễn cước cuộc gọi)\n` +
            `🌐 **Website:** https://bkstore.vn\n\n` +
            `Anh/chị có thể ghé trực tiếp showroom để trải nghiệm máy hoặc đặt hàng online giao nhanh 2h nhé ạ!`;
          suggestions = ['Kiểm tra tồn kho chi nhánh', 'Chính sách bảo hành 1 đổi 1', 'Xem sản phẩm hot'];
        } else if (matchedRagChunks && matchedRagChunks.length > 0 && topRagScore >= 0.40) {
          const topChunk = matchedRagChunks[0].chunk;
          const cleanContent = topChunk.content
            .replace(/\[Tài liệu:.*?\]/g, '')
            .replace(/\[Mục:.*?\]/g, '')
            .replace(/^#+\s+/gm, '')
            .trim();

          const paragraphs = cleanContent
            .split('\n\n')
            .filter((p) => p.trim().length > 0)
            .slice(0, 3)
            .join('\n\n');

          const prefix =
            topChunk.category === 'buying_guide'
              ? 'Dạ em chào anh/chị! Dựa trên nhu cầu của mình, BK-Bot xin gợi ý tiêu chuẩn chọn máy và các dòng máy phù hợp tại BK-Store như sau:'
              : 'Dạ em chào anh/chị! Về chính sách chính thức của BK-Store, em xin phép thông tin chi tiết đến anh/chị như sau:';

          replyText = `${prefix}\n\n${paragraphs}\n\nAnh/chị hoàn toàn yên tâm khi mua sắm tại BK-Store ạ! Nếu cần hỗ trợ thêm thông tin chi tiết, anh/chị có thể liên hệ ngay tổng đài miễn phí **1800 6868** nhé!`;
          suggestions = ['Chính sách đổi trả 30 ngày', 'Chính sách bảo hành', 'Hotline 1800 6868'];
        } else {
          replyText = `Dạ em chào anh/chị! Hiện tại hệ thống kết nối AI chuyên sâu của BK-Bot đang có lượt truy cập cao trong giờ cao điểm hoặc tạm gián đoạn hạn mức Quota.\n\n` +
            `Tuy nhiên, hệ thống cơ sở dữ liệu của BK-Store vẫn hoạt động bình thường! Em có thể hỗ trợ anh/chị ngay lập tức:\n` +
            `• **Tư vấn cấu hình:** Nhập mức ngân sách hoặc nhu cầu (ví dụ: *laptop học tập dưới 20 triệu*, *laptop gaming*).\n` +
            `• **Kiểm tra kho hàng:** Gõ tên máy và chi nhánh (Hà Nội, TP.HCM, Đà Nẵng).\n` +
            `• **Theo dõi đơn hàng:** Gửi Mã đơn (*#BK-xxxx*) và Số điện thoại đặt hàng.\n\n` +
            `Anh/chị cũng có thể bấm chọn nhanh các mục gợi ý bên dưới hoặc liên hệ hotline miễn phí **1800 6868** để được tư vấn viên hỗ trợ ngay ạ!`;
          suggestions = ['Tư vấn laptop sinh viên', 'Laptop Gaming / Đồ họa', 'Kiểm tra tồn kho chi nhánh', 'Hotline 1800 6868'];
        }

        if (!cardPayload) {
          const fallbackProds = seedProducts.filter((p) => p.categorySlug === 'laptop').slice(0, 2);
          if (fallbackProds.length > 0) {
            cardPayload = {
              type: 'products',
              data: fallbackProds.map((p) => ({
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
        }
      }
      usedModel = 'smart-offline-fallback';
    }
    const llmGenerationMs = Math.max(1, Math.round((performance.now() - startLlm) * 100) / 100);

    let cleanedReply = sanitizeChatReply(replyText);

    // Khi khách hàng hỏi về đơn hàng chưa xác nhận/duyệt đơn và có đơn chờ duyệt:
    // Vì thẻ hiển thị phía dưới đã có đầy đủ danh sách các đơn hàng này,
    // câu trả lời dạng văn bản chỉ cần câu thông báo súc tích theo đúng yêu cầu người dùng
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
      toolUsed,
      model: usedModel,
      metrics,
    };

    // Lưu vào Response Cache nếu là câu hỏi chung (không chứa dữ liệu cá nhân hay đơn hàng cụ thể)
    if (cacheKey && !toolResultData?.isAskingUnconfirmedOrders && !toolResultData?.userOrders) {
      chatResponseCache.set(cacheKey, finalResponse);
    }

    return finalResponse;
  }

  /**
   * SSE Streaming Response dành cho chữ chạy thời gian thực (Typewriter Effect)
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
      // Giãn cách một chút để tạo cảm giác tự nhiên
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    sendEvent('done', {
      fullReply: result.reply,
      cards: result.cards,
      citations: result.citations,
      suggestions: result.suggestions,
      clarification: result.clarification,
      model: result.model,
      metrics: result.metrics,
    });
  }
}

export const chatService = new ChatService();
