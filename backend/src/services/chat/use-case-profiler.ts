export interface UseCaseProfile {
  targetAudience: string;
  primaryUseCase: string;
  suitableSoftware: string[];
  hardwareHighlights: string[];
  limitations: string[];
  recommendationNote: string;
}

/**
 * Hồ sơ năng lực chi tiết cho từng dòng sản phẩm tại BK-Store
 * Được biên soạn chuẩn hóa theo cẩm nang tư vấn kỹ thuật (05_cam_nang_tu_van_cau_hinh.md)
 */
const PRODUCT_PROFILES: Record<string, UseCaseProfile> = {
  // 1. Lenovo ThinkPad E14 Gen 7
  'lenovo-thinkpad-e14-gen-7-21t90025vn': {
    targetAudience: 'Kỹ sư Phần mềm, Lập trình viên (Backend, Frontend, Mobile dev, DevOps), Sinh viên khối ngành Công nghệ thông tin (CNTT / Khoa học máy tính) và Dân văn phòng chuyên sâu / Quản lý dự án.',
    primaryUseCase: 'Lập trình phần mềm, biên dịch code, chạy máy ảo đa nhiệm & làm việc cơ động cao.',
    suitableSoftware: [
      'Visual Studio Code, IntelliJ IDEA, Eclipse, PyCharm',
      'Docker Desktop, WSL2, Android Studio (giả lập máy ảo mượt mà)',
      'Git, Postman, DBeaver, bộ công cụ Microsoft Office 365 đa luồng',
      'Học trực tuyến, họp Zoom/Teams, mở 30-40 tabs trình duyệt nghiên cứu cùng lúc'
    ],
    hardwareHighlights: [
      'CPU Intel Core 7 240H (10 nhân 16 luồng, xung nhịp Turbo tới 5.2GHz, 24MB Cache): Xử lý biên dịch source code cực nhanh và ổn định dưới tải nặng liên tục.',
      'RAM 16GB DDR5 bus 5600MHz tốc độ cao (2 khe cắm tháo rời, nâng cấp tối đa 64GB): Thoải mái chạy nhiều container Docker và tab trình duyệt không lo tràn bộ nhớ.',
      'Bàn phím ThinkPad hành trình sâu kèm núm TrackPoint huyền thoại: Trải nghiệm gõ êm ái, chống mỏi ngón tay tối đa khi code liên tục nhiều giờ.',
      'Độ bền đạt chuẩn quân đội Mỹ MIL-STD-810H và trọng lượng siêu gọn 1.34kg: Thuận tiện bỏ balo mang lên giảng đường, văn phòng hay công tác xa.'
    ],
    limitations: [
      'Sử dụng card đồ họa tích hợp Intel Graphics: KHÔNG PHÙ HỢP cho nhu cầu chơi game 3D đồ họa nặng (AAA) hoặc render mô hình 3D phức tạp, dựng kỹ xảo VFX After Effects chuyên sâu.',
      'Màn hình 60Hz tiêu chuẩn: Tối ưu cho hiển thị văn bản và code, không dành cho game thủ cần tần số quét cao (144Hz+).'
    ],
    recommendationNote: 'Đây là cỗ máy chân ái chuẩn mực cho dân lập trình và kỹ sư công nghệ cần độ bền bỉ tuyệt đối, bàn phím gõ code sướng nhất phân khúc cùng CPU đa nhân mạnh mẽ.'
  },

  // 2. Lenovo ThinkPad T14s Gen 6
  'lenovo-thinkpad-t14s-gen-6-21qx00ljvn': {
    targetAudience: 'Lãnh đạo, Doanh nhân cấp cao, Kỹ sư Trí tuệ nhân tạo (AI Engineer), Nhà khoa học dữ liệu (Data Scientist) và Chuyên gia công nghệ.',
    primaryUseCase: 'Xử lý tác vụ AI cục bộ (Copilot+ PC), phân tích dữ liệu lớn, bảo mật doanh nghiệp cao cấp & di chuyển toàn cầu.',
    suitableSoftware: [
      'Mô hình AI & LLM cục bộ (tận dụng NPU Intel AI Boost 40 TOPS)',
      'Python, R, Jupyter Notebook, TensorFlow/PyTorch mô hình nhỏ/vừa',
      'Docker, Kubernetes, hệ thống quản trị ERP / SAP',
      'Bảo mật cấp doanh nghiệp với Windows 11 Pro bản quyền'
    ],
    hardwareHighlights: [
      'Chip Intel Core Ultra 5 228V thế hệ Lunar Lake tích hợp NPU 40 TOPS: Tối ưu hóa xử lý AI trực tiếp trên máy mát mẻ, tiết kiệm điện năng vượt bậc.',
      '32GB RAM LPDDR5X bus 8533MHz siêu tốc: Đa nhiệm ở đẳng cấp cao nhất, mở song song hàng chục tiến trình nặng mà không hề suy giảm hiệu năng.',
      'Ổ cứng 1TB SSD PCIe Gen 5 tốc độ đọc ghi đỉnh cao: Khởi động máy và trích xuất dữ liệu dung lượng lớn trong chớp mắt.',
      'Khung vỏ Carbon Fiber Hybrid siêu nhẹ chỉ 1.28kg, màn hình 400 nits chống chói cao cấp.'
    ],
    limitations: [
      'RAM tích hợp dạng Onboard (Memory-on-Package) không thể tháo rời nâng cấp (tuy nhiên 32GB đã đáp ứng dư dả nhu cầu 4-5 năm tới).',
      'Mức giá thuộc phân khúc flagship doanh nhân cao cấp (~50 triệu đồng).'
    ],
    recommendationNote: 'Lựa chọn hoàn hảo nhất cho chuyên gia cần cỗ máy doanh nhân cao cấp chuẩn AI PC, dung lượng RAM 32GB khủng và độ mỏng nhẹ cơ động tối đa.'
  },

  // 3. Lenovo LOQ 15IRX9
  'lenovo-loq-15irx9-83dv01alvn': {
    targetAudience: 'Game thủ (Gamers), Nhà thiết kế đồ họa 2D/3D (Graphic Designers), Dựng phim & Video Creator (4K), Sinh viên ngành Kiến trúc / Kỹ thuật Cơ khí / Đồ họa đa phương tiện.',
    primaryUseCase: 'Chiến game AAA max setting, Render 3D kiến trúc, Dựng video 4K & Đồ họa kỹ thuật chuyên nghiệp.',
    suitableSoftware: [
      'Adobe Photoshop, Illustrator, Premiere Pro, After Effects, Lightroom',
      'AutoCAD, Revit, SolidWorks, SketchUp, 3ds Max, Blender',
      'Tựa game nặng AAA: Black Myth: Wukong, Cyberpunk 2077, GTA V, Elden Ring, Valorant, CS2 max FPS'
    ],
    hardwareHighlights: [
      'CPU Intel Core i7-13650HX cực mạnh (14 nhân 20 luồng, max 4.9GHz, 24MB Cache): Ép xung tản nhiệt mạnh mẽ chuyên trị render đồ họa nặng.',
      'Card đồ họa rời NVIDIA GeForce RTX 4050 6GB GDDR6 (TGP 105W, nhân CUDA, Ray Tracing, 194 AI TOPS): Xử lý dựng hình và hiệu ứng 3D siêu mượt.',
      'Màn hình 15.6 inch IPS 144Hz chuẩn màu 100% sRGB: Tái tạo màu sắc chuẩn xác tuyệt đối, đáp ứng hoàn hảo tiêu chuẩn in ấn và đồ họa.',
      'Hệ thống tản nhiệt buồng kín quạt kép công suất lớn giúp máy duy trì hiệu năng đỉnh cao không bị quá nhiệt.'
    ],
    limitations: [
      'Trọng lượng máy 2.38kg kèm củ sạc lớn 170W: Khá đầm tay khi bỏ balo di chuyển hàng ngày.',
      'Thời lượng pin khi gánh card đồ họa rời sẽ ngắn (khuyến nghị luôn cắm sạc khi làm việc nặng hoặc chơi game).'
    ],
    recommendationNote: 'Cỗ máy đồ họa và gaming tối ưu nhất phân khúc cận cao cấp, cân trọn vẹn cả nhu cầu học tập kiến trúc đồ họa lẫn chiến game giải trí đỉnh cao.'
  },

  // 4. ASUS TUF Gaming A15
  'asus-tuf-gaming-a15-fa506ncg-hn396w': {
    targetAudience: 'Sinh viên khối ngành Kỹ thuật / Đồ họa / Kiến trúc, Game thủ eSports, Người làm sáng tạo nội dung số (Content Creator) với ngân sách vừa phải.',
    primaryUseCase: 'Chiến game eSports mượt mà, Học đồ họa 2D/3D kỹ thuật, Dựng video ngắn và học tập đa nhiệm.',
    suitableSoftware: [
      'AutoCAD 2D/3D, SketchUp, Lumion cơ bản, Photoshop, CapCut PC, Premiere',
      'Game eSports & Online: Liên Minh Huyền Thoại, CS2, Valorant, FC Online, Naraka, Genshin Impact'
    ],
    hardwareHighlights: [
      'Card đồ họa rời NVIDIA GeForce RTX 3050 4GB GDDR6: Hỗ trợ công nghệ Ray Tracing và nhân đồ họa rời tăng tốc render hình ảnh.',
      'CPU AMD Ryzen 7 155 (6 nhân 12 luồng, Turbo 4.7GHz) hiệu năng bền bỉ và kiểm soát nhiệt lượng mát mẻ.',
      'Màn hình 15.6 inch IPS tần số quét 144Hz chống xé hình mượt mà.',
      'Độ bền đạt chuẩn quân đội MIL-STD-810H, khung máy hầm hố chịu va đập tốt.'
    ],
    limitations: [
      'RAM mặc định theo máy là 8GB: Khi chạy các dự án đồ họa nặng hoặc đa nhiệm nhiều phần mềm, BK-Store khuyến nghị nên nâng cấp thêm 1 thanh RAM 8GB (lên 16GB) để phát huy 100% sức mạnh.',
      'Trọng lượng 2.30kg thiết kế gaming hầm hố, không hướng tới tiêu chí mỏng nhẹ.'
    ],
    recommendationNote: 'Lựa chọn laptop gaming trang bị card rời RTX có mức giá dễ tiếp cận nhất cho sinh viên cần một cỗ máy khỏe để vừa học vừa giải trí.'
  },

  // 5. ASUS Vivobook 14
  'asus-vivobook-14-x1404va-eb355w': {
    targetAudience: 'Sinh viên khối ngành Kinh tế, Ngoại ngữ, Luật, Sư phạm, Xã hội, Học sinh và Nhân viên văn phòng, Marketing tổng hợp, Kế toán.',
    primaryUseCase: 'Học tập trên giảng đường, Làm việc văn phòng, Soạn thảo văn bản, Họp trực tuyến & Giải trí đa phương tiện mỏng nhẹ.',
    suitableSoftware: [
      'Bộ công cụ văn phòng Microsoft Office (Word, Excel, PowerPoint)',
      'Canva, Photoshop 2D cơ bản, CapCut chỉnh sửa video ngắn',
      'Google Meet, Zoom, Microsoft Teams, phần mềm học tiếng Anh',
      'Duyệt web tra cứu tài liệu, xem phim Full HD sắc nét'
    ],
    hardwareHighlights: [
      'Thiết kế thời trang màu Bạc Cool Silver siêu mỏng nhẹ chỉ 1.40kg: Vô cùng cơ động, mang đi học cả ngày không thấy nặng vai.',
      'CPU Intel Core 7 150U (10 nhân 12 luồng, Turbo tới 5.4GHz) kết hợp sẵn 16GB RAM: Tốc độ phản hồi cực nhanh, mở hàng chục tab không giật lag.',
      'Màn hình 14.0 inch Full HD có chứng nhận bảo vệ mắt TÜV Rheinland giúp chống lóa và bảo vệ thị lực khi học tập liên tục.',
      'Bản lề mở gập 180 độ linh hoạt cùng cảm biến vân tay 1 chạm tiện lợi.'
    ],
    limitations: [
      'Sử dụng card tích hợp Intel Graphics và chip dòng U tiết kiệm điện: KHÔNG PHÙ HỢP cho nhu cầu chơi game 3D nặng hoặc render 3D kiến trúc chuyên sâu.',
      'Không trang bị cổng mạng LAN dây (kết nối qua Wi-Fi tốc độ cao).'
    ],
    recommendationNote: 'Chiếc laptop mỏng nhẹ thời trang lý tưởng cho sinh viên kinh tế và dân văn phòng cần sự thanh lịch, pin bền và hiệu năng Core 7 mượt mà.'
  },

  // 6. Lenovo ThinkBook 16 G9
  'lenovo-thinkbook-16-g9-irl-21us008fvn': {
    targetAudience: 'Dân văn phòng, Kế toán - Kiểm toán, Quản lý tài chính, Giáo viên, Giảng viên, Sinh viên khối ngành Kinh doanh / Quản trị cần không gian hiển thị rộng lớn.',
    primaryUseCase: 'Xử lý số liệu Excel lớn, Đa nhiệm song song 2-3 cửa sổ làm việc trên màn hình lớn 16 inch & Họp trực tuyến chuyên nghiệp.',
    suitableSoftware: [
      'Excel bảng tính dữ liệu hàng chục nghìn dòng, PowerBI, SPSS',
      'Phần mềm kế toán doanh nghiệp MISA, Bravo, FAST, SAP',
      'Soạn thảo tài liệu, giáo án, thuyết trình đa màn hình',
      'Học tập và lập trình cơ bản (HTML/CSS, Python cơ bản)'
    ],
    hardwareHighlights: [
      'Màn hình rộng 16.0 inch tỷ lệ vàng 16:10 WUXGA (1920x1200): Không gian hiển thị dọc thêm 11% so với màn 16:9 truyền thống, đọc tài liệu và bảng tính cực kỳ đã mắt.',
      'Bàn phím Full-size có cụm phím số (Numpad) riêng biệt: Nhập số liệu kế toán và tài chính nhanh chóng, chính xác.',
      'CPU Intel Core i5-13420H dòng H hiệu năng cao và 16GB RAM DDR5 (nâng cấp tối đa 64GB): Vận hành trơn tru các file dữ liệu nặng.',
      'Vỏ nhôm xám Arctic Grey sang trọng, đạt chuẩn độ bền quân đội MIL-STD-810H.'
    ],
    limitations: [
      'Kích thước máy 16 inch và trọng lượng 1.70kg: Sẽ lớn hơn các dòng 14 inch nhỏ gọn.',
      'Sử dụng card đồ họa Intel UHD Graphics tích hợp: Không tối ưu cho chơi game 3D hay render kỹ xảo phim ảnh nặng.'
    ],
    recommendationNote: 'Mẫu laptop văn phòng màn hình lớn 16 inch tốt nhất phân khúc, trợ thủ đắc lực cho dân kế toán và phân tích số liệu.'
  },

  // 7. iPhone 18 Pro Max
  'iphone-18-pro-max-512gb-chinh-hang': {
    targetAudience: 'Doanh nhân, Nhà sáng tạo nội dung video / TikTok / Vlog chuyên nghiệp, Người yêu thích công nghệ đầu bảng của Apple.',
    primaryUseCase: 'Nhiếp ảnh & Quay phim điện ảnh 4K ProRes, Xử lý tác vụ di động tối cao, Bảo mật và Giữ giá lâu dài.',
    suitableSoftware: [
      'Quay video 4K 120fps Dolby Vision, ProRes Log, Spatial Video',
      'Ứng dụng chỉnh sửa ảnh/video chuyên nghiệp LumaFusion, Lightroom Mobile',
      'Tác vụ quản lý doanh nghiệp, giao dịch ngân hàng bảo mật Face ID',
      'Chiến mọi tựa game mobile nặng nhất thế giới ở mức max setting'
    ],
    hardwareHighlights: [
      'Chip Apple A20 Pro tiến trình 2nm siêu mạnh mẽ kèm buồng hơi tản nhiệt kim loại.',
      'Camera Fusion 48MP với khẩu độ biến thiên linh hoạt và zoom quang 8x đỉnh cao.',
      'Khung viền titan cao cấp, pin bền bỉ xem video liên tục tới 43 giờ.'
    ],
    limitations: [
      'Không thay thế hoàn toàn cho máy tính xách tay khi cần gõ văn bản phức tạp hoặc lập trình chuyên sâu.'
    ],
    recommendationNote: 'Đỉnh cao smartphone flagship với camera chuyên nghiệp và hiệu năng giữ giá bền bỉ hàng đầu.'
  }
};

export class UseCaseProfiler {
  /**
   * Lấy hồ sơ năng lực theo slug của sản phẩm
   */
  public static getProfileBySlug(slug: string): UseCaseProfile | null {
    if (!slug) return null;
    const clean = slug.trim().toLowerCase();
    return PRODUCT_PROFILES[clean] || null;
  }

  /**
   * Suy luận hồ sơ năng lực động dựa vào thông số kỹ thuật (Heuristic fallback)
   */
  public static inferProfileFromProduct(product: any): UseCaseProfile {
    if (!product) {
      return {
        targetAudience: 'Người dùng phổ thông và học tập văn phòng.',
        primaryUseCase: 'Học tập, làm việc văn phòng và giải trí cơ bản.',
        suitableSoftware: ['Microsoft Office', 'Trình duyệt web', 'Họp trực tuyến'],
        hardwareHighlights: ['Cấu hình phần cứng chính hãng tại BK-Store'],
        limitations: ['Tác vụ đồ họa nặng hoặc render 3D chuyên sâu'],
        recommendationNote: 'Sản phẩm chính hãng với bảo hành 1 đổi 1 trong 30 ngày tại BK-Store.'
      };
    }

    // Kiểm tra xem đã có profile định sẵn theo slug chưa
    const predefined = this.getProfileBySlug(product.slug);
    if (predefined) return predefined;

    const specs = product.specs || {};
    const cpuStr = (specs.cpu || '').toLowerCase();
    const gpuStr = (specs.gpu || '').toLowerCase();
    const ramStr = (specs.ram || '').toLowerCase();
    const isGamingOrGpu = gpuStr.includes('rtx') || gpuStr.includes('gtx') || gpuStr.includes('radeon rx') || (product.name || '').toLowerCase().includes('gaming');
    const isThinkPadOrDev = (product.name || '').toLowerCase().includes('thinkpad') || (product.name || '').toLowerCase().includes('ultra');

    if (isGamingOrGpu) {
      return {
        targetAudience: 'Game thủ, Sinh viên Kỹ thuật / Đồ họa 2D/3D, Người sáng tạo nội dung video.',
        primaryUseCase: 'Chiến game 3D, Thiết kế đồ họa và Render kỹ thuật.',
        suitableSoftware: ['AutoCAD, Photoshop, Premiere, Blender', 'Các tựa game AAA / eSports'],
        hardwareHighlights: [
          `Card đồ họa rời: ${specs.gpu || 'GPU rời hiệu năng cao'} tối ưu dựng hình và xử lý 3D.`,
          `Vi xử lý mạnh mẽ: ${specs.cpu || 'CPU đa nhân'} chịu tải nặng tốt.`,
          `Màn hình tần số quét cao: ${specs.screen || 'IPS mượt mà'}.`
        ],
        limitations: [
          'Trọng lượng lớn hơn các dòng mỏng nhẹ văn phòng.',
          'Thời lượng pin tiêu thụ nhanh khi chạy đồ họa rời (khuyến nghị cắm sạc khi dùng).'
        ],
        recommendationNote: 'Lựa chọn tối ưu cho người cần hiệu năng đồ họa và sức mạnh tính toán vượt trội.'
      };
    }

    if (isThinkPadOrDev) {
      return {
        targetAudience: 'Kỹ sư Phần mềm, Lập trình viên, Sinh viên CNTT và Quản lý doanh nghiệp.',
        primaryUseCase: 'Lập trình, Biên dịch code, Chạy máy ảo Docker & Đa nhiệm cao độ.',
        suitableSoftware: ['VS Code, IntelliJ, Docker, Git, WSL2', 'Hệ thống quản trị và đa luồng văn phòng'],
        hardwareHighlights: [
          `CPU hiệu năng cao: ${specs.cpu || 'Intel đa nhân'} biên dịch code nhanh chóng.`,
          `Bộ nhớ RAM dồi dào: ${specs.ram || 'DDR5'} chạy nhiều tab và container mượt mà.`,
          'Bàn phím chất lượng cao và độ bền chuẩn quân đội cho trải nghiệm làm việc dài giờ.'
        ],
        limitations: [
          'Sử dụng đồ họa tích hợp: Không tối ưu cho chơi game 3D nặng hay render 3D kiến trúc phức tạp.'
        ],
        recommendationNote: 'Dòng máy chuẩn mực cho dân công nghệ và kỹ sư cần sự bền bỉ, ổn định lâu dài.'
      };
    }

    // Mặc định cho dòng Văn phòng / Sinh viên mỏng nhẹ
    return {
      targetAudience: 'Sinh viên, Nhân viên văn phòng, Giáo viên, Người làm kinh doanh cần máy cơ động.',
      primaryUseCase: 'Học tập, Công việc văn phòng, Soạn thảo tài liệu & Giải trí di động.',
      suitableSoftware: ['Word, Excel, PowerPoint, Canva, Zoom, Google Meet', 'Duyệt web tra cứu tài liệu và xem phim'],
      hardwareHighlights: [
        `Thiết kế mỏng nhẹ dễ mang theo: ${specs.weight || 'Gọn nhẹ cơ động'}.`,
        `Cấu hình mượt mà cho văn phòng: ${specs.cpu || 'CPU thế hệ mới'} kèm ${specs.ram || 'RAM tốc độ cao'}.`,
        `Màn hình sắc nét: ${specs.screen || 'Chống chói bảo vệ mắt'}.`
      ],
      limitations: [
        'Không phù hợp cho các tác vụ đồ họa 3D nặng hoặc chơi game AAA.'
      ],
      recommendationNote: 'Chiếc máy mỏng nhẹ thanh lịch, đáp ứng trọn vẹn nhu cầu học tập và công việc hàng ngày.'
    };
  }
}
