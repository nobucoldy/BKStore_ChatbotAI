import { products as seedProducts } from '../../db/seedData';
import { normalizeText } from '../ai-tools.service';
import { ChatHistoryItem, DetectedIntentResult, SlotAccumulationResult } from './chat.types';

export class ChatIntentService {
  /**
   * Nhận diện sản phẩm cụ thể từ câu hỏi hoặc ngữ cảnh
   */
  public matchProductFromText(rawText: string) {
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
  public findProductInContext(message: string, history: ChatHistoryItem[] = []) {
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
  public findOrderInContext(history: ChatHistoryItem[] = []): { orderCode?: string; phone?: string } {
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
  public extractAccumulatedSlots(
    message: string,
    history: ChatHistoryItem[] = []
  ): SlotAccumulationResult {
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
      const rawLower = msg.toLowerCase();
      const rangeMatch =
        rawLower.match(/(\d+)\s*(?:tr|trieu|triệu)?\s*(?:đến|tới|den|toi|to|-|–|—)\s*(\d+)\s*(?:triệu|trieu|tr)/i) ||
        norm.match(/(\d+)\s*(?:tr|trieu)?\s*(?:den|toi|to)\s*(\d+)\s*(?:trieu|tr)/i) ||
        norm.match(/(?:tu\s+)?(\d+)\s*(?:tr|trieu)?\s+(\d+)\s*(?:trieu|tr)/i);

      const aboveMatch = rawLower.match(/(?:trên|tren|từ|tu)\s*(\d+)\s*(?:triệu|trieu|tr)/i);
      const underMatch = rawLower.match(/(?:dưới|duoi|tối đa|toi da)\s*(\d+)\s*(?:triệu|trieu|tr)/i);
      const aroundMatch =
        rawLower.match(/(?:tầm|khoảng|quanh|tầm giá|khoảng giá)\s*(\d+)\s*(?:triệu|trieu|tr)/i) ||
        norm.match(/(?:tam|khoang|quanh|tam gia|khoang gia)\s*(\d+)\s*(?:trieu|tr)/i) ||
        norm.match(/(\d+)\s*(?:trieu|tr)/i);

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
  public detectIntent(
    message: string,
    history: ChatHistoryItem[] = [],
    currentUser?: { id: string; name: string; email: string; phone?: string; role: string }
  ): DetectedIntentResult {
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
    // Chặn nhận nhầm số 4 chữ số khi câu hỏi đang nói về giá tiền (trieu, nghin), năm (2024, 2025), card màn hình (4050, 3050)
    const hasPriceOrSpecContext =
      norm.includes('trieu') ||
      norm.includes('nghin') ||
      norm.includes('gia') ||
      norm.includes('rtx') ||
      norm.includes('ram') ||
      norm.includes('inch') ||
      norm.includes('tam') ||
      norm.includes('khoang');

    const orderCodeMatch =
      text.match(/#?BK[-_ ]?\d{3,6}/i) ||
      (!hasPriceOrSpecContext && (isOrderKeyword || isReviewKeyword || contextOrder.phone || lastBotContent.includes('ma don'))
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
      const rawCode = orderCodeMatch ? orderCodeMatch[0].trim() : contextOrder.orderCode;
      let cleanOrderCode: string | undefined = undefined;
      if (rawCode) {
        const digits = rawCode.replace(/[^0-9]/g, '');
        if (digits) {
          cleanOrderCode = `#BK-${digits}`;
        }
      }

      if (currentUser) {
        return {
          intent: 'track_order',
          extracted: {
            orderCode: cleanOrderCode,
            isAskingMyOrders: !cleanOrderCode,
            isAskingUnconfirmedOrders,
            userId: currentUser.id,
            userName: currentUser.name,
            phone: currentUser.phone,
          },
        };
      }

      // Khách vãng lai / chưa đăng nhập:
      // Yêu cầu đăng nhập để tra cứu chi tiết mã đơn hoặc xem danh sách đơn hàng
      return {
        intent: 'track_order',
        extracted: {
          needsAuth: true,
          orderCode: cleanOrderCode,
          hasDirectCodeOrPhone: Boolean(cleanOrderCode || phoneMatch),
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
            isUseCaseInquiry: false,
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
    const hasBudgetIndicator = Boolean(
      norm.includes('trieu') ||
      norm.includes('duoi') ||
      norm.includes('tren') ||
      norm.includes('tam gia') ||
      norm.includes('khoang gia') ||
      norm.match(/\b\d+\s*(?:tr|trieu)\b/)
    );

    const isUseCaseInquiry = Boolean(
      norm.includes('phu hop voi nhu cau') ||
      norm.includes('phu hop nhu cau') ||
      norm.includes('phu hop voi ai') ||
      norm.includes('hop voi ai') ||
      norm.includes('hop voi nhu cau') ||
      norm.includes('dung cho nhu cau') ||
      norm.includes('dung de lam gi') ||
      norm.includes('dung duoc gi') ||
      norm.includes('hop voi nganh') ||
      norm.includes('ai nen dung') ||
      norm.includes('ai nen mua') ||
      norm.includes('nhu cau nao') ||
      norm.includes('muc dich nao') ||
      norm.includes('co nen mua de') ||
      norm.includes('co phu hop') ||
      norm.includes('phu hop khong') ||
      norm.includes('phu hop ko') ||
      norm.includes('co lam duoc') ||
      norm.includes('co code duoc') ||
      norm.includes('co choi duoc') ||
      norm.includes('chay duoc khong') ||
      norm.includes('chay duoc ko')
    );

    const isGeneralConsultNeed =
      hasBudgetIndicator ||
      (!isUseCaseInquiry &&
        (norm.includes('tu van laptop') ||
          norm.includes('tu van may') ||
          norm.includes('tu van dien thoai') ||
          norm.includes('laptop sinh vien') ||
          norm.includes('cho sinh vien') ||
          norm.includes('dan van phong') ||
          norm.includes('hoc sinh') ||
          norm.includes('goi y') ||
          norm.includes('nen mua')));

    const directMatchedProduct = isGeneralConsultNeed ? null : this.matchProductFromText(text);

    const isConsultProductKeyword =
      !isGeneralConsultNeed &&
      (isUseCaseInquiry ||
        norm.includes('thong so') ||
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
            isUseCaseInquiry,
          },
        };
      }
      if (!norm.includes('trieu') && !norm.includes('duoi') && !norm.includes('tam gia')) {
        return { intent: 'general', extracted: null };
      }
    }

    // 3.5. Kiểm tra các câu chào hỏi, hỏi danh tính bot hoặc phép lịch sự
    const smalltalkIntent = this.detectSmalltalk(text, norm);
    if (smalltalkIntent) {
      return {
        intent: smalltalkIntent,
        extracted: null,
      };
    }

    // 4. Kiểm tra ý định Tìm & Lọc theo tầm tiền / danh mục / đối tượng & nhu cầu sử dụng
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
  public getAllProductsWarrantyCatalog() {
    return seedProducts.map((p) => ({
      name: p.name,
      brand: p.brand,
      category: p.categorySlug,
      warrantyMonths: p.warrantyMonths || 12,
      policy: `Bảo hành chính hãng ${p.warrantyMonths || 12} tháng, 1 đổi 1 trong 30 ngày đầu nếu lỗi phần cứng nhà sản xuất`,
    }));
  }
}

export const chatIntentService = new ChatIntentService();
