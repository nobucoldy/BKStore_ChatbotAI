import { products as seedProducts } from '../../db/seedData';
import { normalizeText } from '../ai-tools.service';
import { SearchResult } from '../rag.service';
import { chatIntentService } from './chat-intent.service';
import { DetectedIntentResult } from './chat.types';

export interface SmartFallbackParams {
  toolUsed?: string;
  toolResultData?: any;
  detected: DetectedIntentResult;
  matchedRagChunks?: SearchResult[];
  topRagScore?: number;
  message: string;
  cardPayload?: any;
  currentSuggestions?: string[];
}

export interface SmartFallbackResult {
  replyText: string;
  suggestions?: string[];
  cardPayload?: any;
}

export class ChatFallbackService {
  /**
   * Tạo câu trả lời thông minh khi Gemini API tạm gián đoạn (503/Quota/Network)
   */
  public generateOfflineFallback(params: SmartFallbackParams): SmartFallbackResult {
    const {
      toolUsed,
      toolResultData,
      detected,
      matchedRagChunks = [],
      topRagScore = 0,
      message,
      cardPayload: initialCardPayload,
      currentSuggestions,
    } = params;

    let replyText = '';
    let suggestions = currentSuggestions;
    let cardPayload = initialCardPayload;

    if (toolResultData) {
      if (toolUsed === 'clarifyProductNeed') {
        const catName =
          toolResultData.category === 'smartphone'
            ? 'điện thoại'
            : toolResultData.category === 'accessory'
              ? 'phụ kiện'
              : 'laptop';
        replyText =
          `Dạ chào anh/chị! Để em có thể chọn lọc và tư vấn mẫu **${catName}** chuẩn xác và phù hợp nhất cho mình, anh/chị chia sẻ thêm giúp em 2 thông tin nhỏ này nhé ạ:\n\n` +
          `1. **Mức ngân sách dự kiến:** Anh/chị đang muốn đầu tư trong khoảng bao nhiêu triệu (ví dụ: *Dưới 15 triệu*, *15 - 25 triệu*, *25 - 40 triệu*, hoặc *Trên 40 triệu*)?\n` +
          `2. **Nhu cầu sử dụng chính:** Anh/chị mua máy để phục vụ tác vụ gì là chủ yếu (ví dụ: *Học tập - Văn phòng*, *Lập trình / Kỹ thuật IT*, *Đồ họa - Gaming*, hay *Mỏng nhẹ di chuyển nhiều*)?\n\n` +
          `Anh/chị có thể bấm nhanh vào các nút gợi ý bên dưới hoặc nhắn trực tiếp cho em nhé! Em có gửi trước 2 mẫu máy nổi bật bên dưới để anh/chị tham khảo trước ạ.`;
      } else if (toolUsed === 'clarifyInventoryProduct') {
        const branchText = toolResultData.branchName ? ` tại chi nhánh **${toolResultData.branchName}**` : '';
        replyText =
          `Dạ chào anh/chị! Hệ thống kho của BK-Store hiện luôn cập nhật số lượng tồn thời gian thực tại cả 3 Showroom (Hà Nội, TP.HCM, Đà Nẵng).\n\n` +
          `Anh/chị đang quan tâm và muốn kiểm tra tình trạng còn hàng${branchText} của **mẫu sản phẩm cụ thể nào** ạ? (Ví dụ: *MacBook Air M3*, *Dell XPS 14*, *ASUS ROG Zephyrus*, hoặc *iPhone 16 Pro Max*).\n\n` +
          `Anh/chị có thể bấm chọn gợi ý bên dưới để em kiểm tra ngay lập tức nhé!`;
      } else if (toolUsed === 'clarifyReviewProduct') {
        replyText =
          `Dạ chào anh/chị! BK-Store có hệ thống đánh giá 100% từ khách hàng thực tế đã nhận máy thành công.\n\n` +
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
        } else if (toolResultData.isUseCaseInquiry && (p.useCaseProfile || toolResultData.useCaseProfile)) {
          const prof = p.useCaseProfile || toolResultData.useCaseProfile;
          replyText = `Dạ chào anh/chị! Về mẫu máy **${p.name}** (${p.brand}) với mức giá ưu đãi **${p.formattedPrice}**, em xin gửi thông tin ngắn gọn về cấu hình và đối tượng phù hợp nhất như sau ạ:\n\n`;
          replyText += `**1. Cấu hình đặc trưng:**\n`;
          if (p.specs?.cpu) replyText += `• **CPU:** ${p.specs.cpu}\n`;
          if (p.specs?.ram) replyText += `• **RAM:** ${p.specs.ram}\n`;
          if (p.specs?.gpu) replyText += `• **Đồ họa:** ${p.specs.gpu}\n`;
          if (p.specs?.screen || p.specs?.display || p.specs?.storage) {
            replyText += `• **Màn hình & Lưu trữ:** ${p.specs.screen || p.specs.display || ''}${p.specs.storage ? ` | SSD ${p.specs.storage}` : ''}\n`;
          }

          replyText += `\n**2. 🎯 Đối tượng & Nhu cầu phù hợp nhất:**\n`;
          replyText += `• **Đối tượng:** ${prof.targetAudience}\n`;
          replyText += `• **Mục đích chính:** ${prof.primaryUseCase}\n`;
          replyText += `• **Phần mềm & tác vụ đáp ứng tốt:** ${prof.suitableSoftware.join(', ')}\n\n`;
          replyText += `Anh/chị có thể xem ảnh thực tế và đặt mua trực tiếp tại thẻ sản phẩm ngay bên dưới nhé ạ!`;
        } else {
          replyText = `Dạ chào anh/chị! Về mẫu máy **${p.name}** (${p.brand}), đây là dòng sản phẩm chính hãng 100% tại BK-Store với mức giá ưu đãi **${p.formattedPrice}**.\n\n`;
          replyText += `• **Cấu hình đặc trưng nổi bật:**\n`;
          if (p.specs?.cpu) replyText += `  - **CPU:** ${p.specs.cpu}\n`;
          if (p.specs?.ram) replyText += `  - **RAM:** ${p.specs.ram}\n`;
          if (p.specs?.gpu) replyText += `  - **Đồ họa:** ${p.specs.gpu}\n`;
          if (p.specs?.display || p.specs?.storage) replyText += `  - **Màn hình & Lưu trữ:** ${p.specs.display || ''}${p.specs.storage ? ` | SSD ${p.specs.storage}` : ''}\n`;
          replyText += `\n• **Chính sách bảo hành:** Bảo hành chính hãng **${p.warrantyMonths || 12} tháng**, đặc quyền **1 đổi 1 trong 30 ngày** nếu có lỗi phần cứng từ nhà sản xuất.\n\n`;
          replyText += `Anh/chị có thể xem ảnh thực tế và đặt mua trực tiếp tại thẻ sản phẩm ngay bên dưới nhé ạ!`;
        }
      } else if (toolUsed === 'getProductReviews') {
        if (toolResultData.found && toolResultData.product) {
          const p = toolResultData.product;
          replyText = `Dạ chào anh/chị! Dưới đây là thông tin đánh giá thực tế từ khách hàng đã mua **${p.name}** tại BK-Store:\n\n`;
          replyText += `• **Điểm trung bình:** ⭐ **${toolResultData.averageRating}/5 sao** (${toolResultData.totalReviews} lượt đánh giá thực tế)\n`;
          if (toolResultData.reviews && toolResultData.reviews.length > 0) {
            replyText += `• **Nhận xét tiêu biểu từ khách hàng:**\n`;
            replyText +=
              toolResultData.reviews
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
        if (toolResultData.isExplicitStockInquiry) {
          replyText = `Dạ chào anh/chị! BK-Bot đã kiểm tra nhanh hệ thống kho:\n\n${toolResultData.message}\n\n`;
          if (toolResultData.branches && toolResultData.branches.length > 0) {
            replyText += toolResultData.branches
              .map((b: any) => `• **${b.branchName}** (${b.address}): **${b.status}** (${b.quantity} máy)`)
              .join('\n');
          }
          replyText += `\n\nAnh/chị có muốn em giữ máy trước tại chi nhánh gần mình không ạ?`;
        } else {
          const p = toolResultData.product;
          replyText = `Dạ chào anh/chị! Về mẫu máy **${p?.name || ''}**, sản phẩm hiện đang **sẵn hàng chính hãng** tại hệ thống BK-Store với mức giá ưu đãi **${p?.formattedPrice || ''}**.\n\n`;
          replyText += `• **Cấu hình đặc trưng nổi bật:**\n`;
          if (p?.specs?.cpu) replyText += `  - **CPU:** ${p.specs.cpu}\n`;
          if (p?.specs?.ram) replyText += `  - **RAM:** ${p.specs.ram}\n`;
          if (p?.specs?.gpu) replyText += `  - **Đồ họa:** ${p.specs.gpu}\n`;
          if (p?.specs?.display || p?.specs?.storage) replyText += `  - **Màn hình & Lưu trữ:** ${p.specs.display || ''}${p.specs.storage ? ` | SSD ${p.specs.storage}` : ''}\n`;
          replyText += `\nAnh/chị có thể xem ảnh thực tế, thông số chi tiết và đặt mua ngay tại thẻ sản phẩm bên dưới nhé ạ!`;
        }
      } else if (toolUsed === 'trackOrder' || toolUsed === 'getMyOrders') {
        if (toolResultData.found) {
          if (toolResultData.isUserOrderSummary) {
            const name = toolResultData.customerName || 'anh/chị';
            if (toolResultData.isAskingUnconfirmedOrders) {
              if (toolResultData.unconfirmedCount === 0) {
                replyText =
                  `Dạ em chào anh/chị **${name}**! Em đã kiểm tra hệ thống thì trong tổng số **${toolResultData.userOrdersCount} đơn hàng** của mình tại BK-Store, hiện tại **không có đơn hàng nào chưa được xác nhận / duyệt đơn** (0 đơn chờ duyệt).\n\n` +
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
              replyText =
                `Dạ em chào anh/chị **${name}**! Em đã tra cứu thấy tài khoản của mình hiện có tổng cộng **${toolResultData.userOrdersCount} đơn hàng** tại BK-Store:\n` +
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
            replyText = `Dạ chào anh/chị! ${toolResultData.message || 'BK-Bot đã kiểm tra xong thông tin đơn hàng cho mình ạ!'}`;
          }
        } else {
          replyText = `Dạ chào anh/chị! ${toolResultData.message || 'Anh/chị vui lòng đăng nhập tài khoản để xem các đơn hàng của mình hoặc sử dụng tính năng "Tra cứu vận đơn" trên thanh Header website nhé ạ!'}`;
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
      const smalltalkFallback = chatIntentService.detectSmalltalk(message, normMsg);

      if (smalltalkFallback === 'about_bot') {
        replyText =
          `Dạ em chào anh/chị! Em là **BK-Bot** – Trợ lý ảo AI thông minh tại Hệ thống bán lẻ công nghệ **BK-Store** 🤖✨\n\n` +
          `Em có thể hỗ trợ anh/chị:\n` +
          `• Tư vấn cấu hình laptop, điện thoại, phụ kiện theo ngân sách & nhu cầu (học tập, IT, đồ họa, gaming).\n` +
          `• Tra cứu số lượng tồn kho thời gian thực tại cả 3 Showroom (Hà Nội, TP.HCM, Đà Nẵng).\n` +
          `• Xem nhanh trạng thái các đơn hàng đã đặt và tình trạng duyệt đơn của tài khoản.\n` +
          `• Hướng dẫn chính sách bảo hành 1 đổi 1 trong 30 ngày và trả góp 0%.\n\n` +
          `Anh/chị đang quan tâm đến dòng máy nào hay cần em hỗ trợ thông tin gì ạ?`;
        suggestions = ['Tư vấn laptop theo tầm giá', 'Kiểm tra tồn kho Showroom', 'Đơn hàng của tôi', 'Chính sách bảo hành'];
      } else if (smalltalkFallback === 'greeting') {
        replyText = `Dạ em chào anh/chị! Chào mừng anh/chị đến với **BK-Store**.\n\nEm là **BK-Bot**, trợ lý AI của cửa hàng. Em có thể hỗ trợ anh/chị tư vấn chọn máy theo ngân sách, kiểm tra tồn kho tại các chi nhánh hoặc theo dõi tiến trình đơn hàng của tài khoản. Anh/chị đang quan tâm đến sản phẩm nào ạ?`;
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
        replyText =
          `Dạ em chào anh/chị! Hệ thống **BK-Store** hiện có 3 Showroom chính hãng và tổng đài phục vụ trên toàn quốc:\n\n` +
          `📍 **Showroom Hà Nội:** 123 Cầu Giấy, Q. Cầu Giấy, Hà Nội\n` +
          `📍 **Showroom TP.HCM:** 456 Nguyễn Thị Minh Khai, P. Bến Nghé, Quận 1, TP.HCM\n` +
          `📍 **Showroom Đà Nẵng:** 789 Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng\n\n` +
          `⏰ **Giờ mở cửa:** 08:30 - 21:30 (tất cả các ngày trong tuần, kể cả ngày lễ)\n` +
          `📞 **Hotline tư vấn & CSKH:** **1800 6868** (Miễn cước cuộc gọi)\n` +
          `🌐 **Website:** https://bkstore.vn\n\n` +
          `Anh/chị có thể ghé trực tiếp showroom để trải nghiệm máy hoặc đặt hàng online giao nhanh 2h nhé ạ!`;
        suggestions = ['Kiểm tra tồn kho chi nhánh', 'Chính sách bảo hành 1 đổi 1', 'Xem sản phẩm hot'];
      } else if (matchedRagChunks && matchedRagChunks.length > 0 && topRagScore >= 0.4) {
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
        replyText =
          `Dạ em chào anh/chị! Hiện tại hệ thống kết nối AI chuyên sâu của BK-Bot đang có lượt truy cập cao trong giờ cao điểm hoặc tạm gián đoạn hạn mức Quota.\n\n` +
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

    return { replyText, suggestions, cardPayload };
  }
}

export const chatFallbackService = new ChatFallbackService();
