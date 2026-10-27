import { VietnameseNormalizer } from './services/chat/vietnamese-normalizer';
import { dialogueStateService } from './services/chat/dialogue-state.service';
import { semanticRouterService } from './services/chat/semantic-router.service';
import { chatService } from './services/chat.service';
import { pool } from './config/db';

async function runNewUpgradesVerificationSuite() {
  console.log('========================================================================');
  console.log('🎯 BK-BOT NEW UPGRADES VERIFICATION & BENCHMARK TEST SUITE');
  console.log('========================================================================');

  let passedCount = 0;
  let totalCount = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
      throw new Error(`Assertion failed for: ${testName}`);
    }
  };

  // --------------------------------------------------------------------------
  // PHẦN A: BỘ CHUẨN HÓA TIẾNG VIỆT THƯƠNG MẠI ĐIỆN TỬ (VietnameseNormalizer)
  // --------------------------------------------------------------------------
  console.log('\n--- PHẦN A: KIỂM THỬ CHUẨN HÓA NGÔN NGỮ TIẾNG VIỆT & TỪ LÓNG (5 CASES) ---');

  // Case A1: Slang tên máy & dòng máy
  const a1 = VietnameseNormalizer.normalize('tư vấn con lap tuf');
  assert(a1.includes('laptop') && a1.includes('tuf gaming'), 'Case A1: Slang dòng máy (lap tuf -> laptop asus tuf gaming)');

  // Case A2: Tiền tệ "củ", "củ rưỡi", "tr"
  const a2_1 = VietnameseNormalizer.normalize('ngân sách 20 củ');
  const a2_2 = VietnameseNormalizer.normalize('tầm 15 củ rưỡi đến 25 củ');
  assert(a2_1.includes('20 triệu'), 'Case A2.1: Tiền tệ "20 củ" -> "20 triệu"');
  assert(a2_2.includes('15.5 triệu đến 25 triệu'), 'Case A2.2: Dải tiền lẻ "15 củ rưỡi đến 25 củ" -> "15.5 triệu đến 25 triệu"');

  // Case A3: Phân biệt từ "củ sạc" với đơn vị tiền "củ"
  const a3 = VietnameseNormalizer.normalize('củ sạc anker 65w giá bao nhiêu');
  assert(a3.includes('củ sạc') && !a3.includes('triệu sạc'), 'Case A3: Phân biệt chuẩn từ "củ sạc" không bị biến thành "triệu sạc"');

  // Case A4: Lỗi gõ dính phím Telex / Unikey
  const a4 = VietnameseNormalizer.normalize('mays tinhs vivobookf laptopw');
  assert(a4.includes('máy tính vivobook laptop'), 'Case A4: Sửa lỗi gõ dính phím Telex (mays tinhs vivobookf laptopw)');

  // Case A5: Tiếng địa phương / đại từ phương ngữ
  const a5 = VietnameseNormalizer.normalize('con nì máy lày có bền không');
  assert(a5.includes('máy này máy này có bền không'), 'Case A5: Chuẩn hóa phương ngữ (con nì, máy lày -> máy này)');

  // --------------------------------------------------------------------------
  // PHẦN B: THEO DÕI TRẠNG THÁI & KHỬ THAM CHIẾU ĐẠI TỪ (DST Coreference)
  // --------------------------------------------------------------------------
  console.log('\n--- PHẦN B: KIỂM THỬ KHỬ THAM CHIẾU ĐẠI TỪ & THỨ TỰ TRONG NGỮ CẢNH (4 CASES) ---');

  const historyWith2Products = [
    { role: 'user' as const, content: 'Tư vấn giúp mình laptop 15 đến 25 triệu' },
    {
      role: 'assistant' as const,
      content:
        'Em gợi ý 2 mẫu máy rất phù hợp:\n1. Laptop ASUS Vivobook 14 X1404VA-EB355W (Giá 14.990.000₫) mỏng nhẹ thời trang.\n2. Laptop Lenovo ThinkPad E14 Gen 7 21T90025VN (Giá 21.990.000₫) siêu bền bỉ chuẩn quân đội.',
    },
  ];

  // Case B1: Tham chiếu thứ tự - Máy 1
  const b1 = dialogueStateService.resolveCoreferences('máy 1 ở Cầu Giấy còn hàng không?', historyWith2Products);
  assert(Boolean(b1.activeProduct?.name.includes('Vivobook 14')), 'Case B1: Tham chiếu "máy 1" -> ASUS Vivobook 14');

  // Case B2: Tham chiếu thứ tự - Máy thứ 2
  const b2 = dialogueStateService.resolveCoreferences('máy thứ 2 pin trâu không shop?', historyWith2Products);
  assert(Boolean(b2.activeProduct?.name.includes('ThinkPad E14')), 'Case B2: Tham chiếu "máy thứ 2" -> Lenovo ThinkPad E14');

  // Case B3: Tham chiếu so sánh giá rẻ hơn
  const b3 = dialogueStateService.resolveCoreferences('con rẻ hơn có bảo hành 2 năm không?', historyWith2Products);
  assert(Boolean(b3.activeProduct?.name.includes('Vivobook 14')), 'Case B3: So sánh "con rẻ hơn" -> ASUS Vivobook 14 (14.990.000đ)');

  // Case B4: Tham chiếu so sánh giá cao hơn / xịn hơn
  const b4 = dialogueStateService.resolveCoreferences('máy đắt hơn màn hình mấy inch?', historyWith2Products);
  assert(Boolean(b4.activeProduct?.name.includes('ThinkPad E14')), 'Case B4: So sánh "máy đắt hơn" -> Lenovo ThinkPad E14 (21.990.000đ)');

  // --------------------------------------------------------------------------
  // PHẦN C: ĐA Ý ĐỊNH & TÁCH CÂU HỎI GHÉP (Multi-Intent Compound Queries)
  // --------------------------------------------------------------------------
  console.log('\n--- PHẦN C: KIỂM THỬ ĐA Ý ĐỊNH & TÁCH CÂU HỎI GHÉP (3 CASES) ---');

  // Case C1: Tồn kho Showroom + Chính sách Trả góp 0%
  const qC1 = 'ASUS Vivobook 14 ở Cầu Giấy còn hàng không, với lại có được trả góp 0% không?';
  const resC1 = await chatService.handleMessage({ message: qC1 });
  const replyC1Lower = resC1.reply.toLowerCase();
  assert(resC1.toolUsed === 'checkInventory', 'Case C1.1: Multi-Intent kích hoạt đúng Tool chính checkInventory');
  assert(resC1.citations.length > 0, 'Case C1.2: Multi-Intent trích xuất được tài liệu RAG chính sách');
  assert(
    replyC1Lower.includes('cầu giấy') && (replyC1Lower.includes('trả góp') || replyC1Lower.includes('0%')),
    'Case C1.3: Trả lời trọn vẹn cả 2 vế (Kho Cầu Giấy + Trả góp 0%) trong 1 câu trả lời'
  );

  // Case C2: Tồn kho Showroom + Chính sách Bảo hành 1 đổi 1 30 ngày
  const qC2 = 'ThinkPad E14 ở Hà Nội còn không, thế còn bảo hành 1 đổi 1 thì thế nào?';
  const resC2 = await chatService.handleMessage({ message: qC2 });
  const replyC2Lower = resC2.reply.toLowerCase();
  console.log('Case C2 toolUsed:', resC2.toolUsed, 'Citations:', resC2.citations);
  assert(
    resC2.toolUsed === 'checkInventory' || resC2.toolUsed === 'getProductDetails',
    'Case C2.1: Multi-Intent kích hoạt tool nghiệp vụ phù hợp (checkInventory hoặc getProductDetails)'
  );
  assert(
    (replyC2Lower.includes('hà nội') || replyC2Lower.includes('cầu giấy')) &&
      (replyC2Lower.includes('30 ngày') || replyC2Lower.includes('1 đổi 1') || replyC2Lower.includes('bảo hành')),
    'Case C2.2: Trả lời trọn vẹn cả vế kho Hà Nội và chính sách bảo hành 1 đổi 1 trong 30 ngày'
  );

  // Case C3: Slang phức hợp: "lap tuf 20 củ" + hỏi giao hàng 2 giờ
  const qC3 = 'Tư vấn con lap tuf tầm 20 củ với lại ở nội thành HN có ship siêu tốc 2h không?';
  const resC3 = await chatService.handleMessage({ message: qC3 });
  const replyC3Lower = resC3.reply.toLowerCase();
  assert(resC3.toolUsed === 'filterProducts', 'Case C3.1: Slang kết hợp Multi-Intent kích hoạt filterProducts');
  assert(
    (replyC3Lower.includes('2 giờ') || replyC3Lower.includes('2h') || replyC3Lower.includes('giao') || replyC3Lower.includes('vận chuyển')),
    'Case C3.2: Trả lời cả tư vấn máy gaming lẫn chính sách giao hàng 2 giờ nội thành'
  );

  // --------------------------------------------------------------------------
  // PHẦN D: TƯ VẤN CHỦ ĐỘNG DẪN DẮT 4 BƯỚC (Mixed-Initiative Consultation)
  // --------------------------------------------------------------------------
  console.log('\n--- PHẦN D: KIỂM THỬ VĂN PHONG TƯ VẤN CHỦ ĐỘNG 4 BƯỚC (2 CASES) ---');

  const qD1 = 'Mình học IT và lập trình AI, tư vấn giúp mình laptop 30-40 triệu';
  const resD1 = await chatService.handleMessage({ message: qD1 });
  const replyD1 = resD1.reply;
  assert(
    replyD1.includes('RAM') || replyD1.includes('GPU') || replyD1.includes('RTX') || replyD1.includes('AI'),
    'Case D1.1: Phân tích sâu phần cứng (RAM / GPU CUDA) cho tác vụ lập trình AI'
  );
  assert(
    replyD1.includes('?') || replyD1.includes('anh/chị') || replyD1.includes('nhu cầu'),
    'Case D1.2: Có câu hỏi mở định hướng ở cuối (Bước 4: Proactive Follow-up)'
  );

  // --------------------------------------------------------------------------
  // PHẦN E: KIỂM THỬ CARD SẢN PHẨM VS BẢNG SỐ LƯỢNG KHO & LIỆT KÊ CẤU HÌNH ĐẶC TRƯNG
  // --------------------------------------------------------------------------
  console.log('\n--- PHẦN E: KIỂM THỬ CARD SẢN PHẨM & LIỆT KÊ CẤU HÌNH ĐẶC TRƯNG (2 CASES) ---');

  // Case E1: Tư vấn cấu hình máy (Không hỏi số lượng kho) -> Bắt buộc Card Products + Liệt kê specs, KHÔNG dump bảng kho
  const qE1 = 'Tư vấn cho mình cấu hình laptop ThinkPad E14 Gen 7';
  const resE1 = await chatService.handleMessage({ message: qE1 });
  const replyE1Lower = resE1.reply.toLowerCase();
  const hasBranchDump = replyE1Lower.includes('chi nhánh cầu giấy (') || replyE1Lower.includes('chi nhánh quận 1 (') || replyE1Lower.includes('chi nhánh hải châu (');

  assert(resE1.cards?.type === 'products', 'Case E1.1: Khách không hỏi số lượng kho -> Hiển thị Thẻ Card Sản Phẩm (products)');
  assert(!hasBranchDump, 'Case E1.2: Khách không hỏi số lượng kho -> TUYỆT ĐỐI KHÔNG đưa bảng số lượng chi nhánh ra tin nhắn');
  assert(
    replyE1Lower.includes('cpu') || replyE1Lower.includes('ram') || replyE1Lower.includes('ssd') || replyE1Lower.includes('core 7'),
    'Case E1.3: Liệt kê ngắn gọn các cấu hình đặc trưng của máy (CPU, RAM, SSD, Màn hình)'
  );

  // Case E2: Khách hỏi trực diện số lượng kho tại chi nhánh -> Hiển thị Card Inventory + Báo số lượng
  const qE2 = 'Laptop ASUS Vivobook 14 ở Cầu Giấy còn hàng không shop?';
  const resE2 = await chatService.handleMessage({ message: qE2 });
  assert(resE2.cards?.type === 'inventory', 'Case E2.1: Khách hỏi trực diện số lượng kho -> Hiển thị Card Tồn kho (inventory)');
  assert(
    resE2.reply.toLowerCase().includes('cầu giấy') && (resE2.reply.includes('máy') || resE2.reply.toLowerCase().includes('còn hàng')),
    'Case E2.2: Báo rõ tình trạng và số lượng hàng sẵn có tại chi nhánh'
  );

  // --------------------------------------------------------------------------
  // PHẦN F: KIỂM THỬ TƯ VẤN ĐỐI TƯỢNG PHÙ HỢP (NGẮN GỌN, ĐÚNG TRỌNG TÂM)
  // --------------------------------------------------------------------------
  console.log('\n--- PHẦN F: KIỂM THỬ TƯ VẤN ĐỐI TƯỢNG PHÙ HỢP (3 CASES NGẮN GỌN ĐÚNG TRỌNG TÂM) ---');

  // Case F1: ThinkPad E14 Gen 7 -> Trả lời ngắn gọn đối tượng (Lập trình, CNTT, Kỹ sư), KHÔNG lý do dông dài, KHÔNG tác vụ không phù hợp
  const qF1 = 'Tư vấn cho tôi về sản phẩm Laptop Lenovo ThinkPad E14 Gen 7, cấu hình này phù hợp với nhu cầu nào?';
  const resF1 = await chatService.handleMessage({ message: qF1 });
  const f1Lower = resF1.reply.toLowerCase();

  console.log('--- PHẢN HỒI THỰC TẾ CASE F1 (ThinkPad E14 Gen 7 - Ngắn gọn đúng trọng tâm) ---');
  console.log(resF1.reply);

  assert(resF1.cards?.type === 'products', 'Case F1.1: Giữ nguyên Card Sản Phẩm tương tác (products)');
  assert(!f1Lower.includes('chi nhánh cầu giấy (') && !f1Lower.includes('chi nhánh quận 1 ('), 'Case F1.2: Tuyệt đối KHÔNG tuồn bảng số lượng chi nhánh ra tin nhắn');
  assert(
    f1Lower.includes('lập trình') || f1Lower.includes('kỹ sư') || f1Lower.includes('cntt') || f1Lower.includes('code') || f1Lower.includes('phần mềm'),
    'Case F1.3: Nêu rõ đối tượng phù hợp (Lập trình, Kỹ sư phần mềm, CNTT)'
  );
  assert(
    !f1Lower.includes('lý do phần cứng tương thích') && !f1Lower.includes('lý do phần cứng'),
    'Case F1.4: KHÔNG cần giải thích mục lý do phần cứng tương thích'
  );
  assert(
    !f1Lower.includes('tác vụ không phù hợp') && !f1Lower.includes('tác vụ quá tải'),
    'Case F1.5: KHÔNG cần trình bày mục tác vụ không phù hợp / quá tải'
  );

  // Case F2: Lenovo LOQ 15IRX9 -> Phù hợp game thủ, đồ họa 3D, kiến trúc (Ngắn gọn đúng trọng tâm)
  const qF2 = 'Laptop Gaming Lenovo LOQ 15IRX9 cấu hình này phù hợp với ai và dùng cho nhu cầu gì?';
  const resF2 = await chatService.handleMessage({ message: qF2 });
  const f2Lower = resF2.reply.toLowerCase();

  assert(resF2.cards?.type === 'products', 'Case F2.1: Hiển thị Thẻ Card Sản phẩm Lenovo LOQ');
  assert(
    f2Lower.includes('game') || f2Lower.includes('đồ họa') || f2Lower.includes('3d') || f2Lower.includes('render') || f2Lower.includes('kiến trúc') || f2Lower.includes('dựng phim'),
    'Case F2.2: Nêu rõ phù hợp game thủ, đồ họa 3D, kiến trúc, render'
  );
  assert(
    !f2Lower.includes('lý do phần cứng tương thích') && !f2Lower.includes('tác vụ không phù hợp'),
    'Case F2.3: Trả lời ngắn gọn đúng trọng tâm đối tượng, không rườm rà mục lý do hay không phù hợp'
  );

  // Case F3: ASUS Vivobook 14 -> Sinh viên kinh tế, văn phòng, mỏng nhẹ
  const qF3 = 'ASUS Vivobook 14 cấu hình này phù hợp với nhu cầu nào?';
  const resF3 = await chatService.handleMessage({ message: qF3 });
  const f3Lower = resF3.reply.toLowerCase();

  assert(
    f3Lower.includes('sinh viên') || f3Lower.includes('văn phòng') || f3Lower.includes('kinh tế') || f3Lower.includes('học tập'),
    'Case F3.1: Nêu rõ phù hợp sinh viên, văn phòng, học tập'
  );
  assert(
    !f3Lower.includes('lý do phần cứng tương thích') && !f3Lower.includes('tác vụ không phù hợp'),
    'Case F3.2: Ngắn gọn đúng trọng tâm đối tượng sử dụng'
  );

  console.log('\n========================================================================');
  console.log(`🎉 HOÀN THÀNH TOÀN BỘ ${passedCount}/${totalCount} BÀI KIỂM THỬ NÂNG CẤP MỚI (PASS 100%)!`);
  console.log('========================================================================');

  await pool.end();
  process.exit(0);
}

runNewUpgradesVerificationSuite().catch(async (err) => {
  console.error('❌ Verification Suite Failed:', err);
  await pool.end();
  process.exit(1);
});
