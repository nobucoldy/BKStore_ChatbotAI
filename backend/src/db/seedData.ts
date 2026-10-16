export interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface SeedBrand {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface SeedBranch {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
}

export interface SeedProduct {
  id: string;
  categorySlug: string;
  name: string;
  slug: string;
  brand: string;
  price: number;
  originalPrice: number;
  thumbnail: string;
  images: string[];
  specs: Record<string, string>;
  description: string;
  warrantyMonths: number;
}

export const categories: SeedCategory[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Laptop & Máy tính xách tay',
    slug: 'laptop',
    description: 'Laptop văn phòng, đồ họa, gaming chính hãng cấu hình cao từ Apple, Asus, Dell, Lenovo, Acer.',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Điện thoại thông minh',
    slug: 'smartphone',
    description: 'Smartphone cao cấp chính hãng Apple iPhone, Samsung Galaxy, Xiaomi đỉnh cao công nghệ.',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Phụ kiện & Thiết bị ngoại vi',
    slug: 'accessory',
    description: 'Tai nghe chống ồn, chuột công thái học, bàn phím cơ và củ sạc GaN siêu nhanh.',
  },
];

export const brands: SeedBrand[] = [
  {
    id: 'br000000-0000-0000-0000-000000000001',
    name: 'Apple',
    slug: 'apple',
    description:
      'Thương hiệu công nghệ hàng đầu thế giới từ Mỹ. Nổi bật với hệ sinh thái MacBook, iPhone, iPad sang trọng, chip Apple Silicon hiệu năng mạnh mẽ, thời lượng pin bền bỉ và bảo hành chính hãng VN/A.',
  },
  {
    id: 'br000000-0000-0000-0000-000000000002',
    name: 'Dell',
    slug: 'dell',
    description:
      'Thương hiệu máy tính danh tiếng từ Hoa Kỳ, nổi bật với độ bền chuẩn quân đội, bàn phím gõ êm và màn hình viền siêu mỏng InfinityEdge trên dòng Dell XPS doanh nhân, Dell Inspiron và máy trạm Precision.',
  },
  {
    id: 'br000000-0000-0000-0000-000000000003',
    name: 'ASUS',
    slug: 'asus',
    description:
      'Thương hiệu công nghệ tiên phong từ Đài Loan, dẫn đầu với laptop gaming ASUS ROG Zephyrus tản nhiệt kim loại lỏng và laptop văn phòng cao cấp Zenbook màn hình Lumina OLED rực rỡ chuẩn điện ảnh.',
  },
  {
    id: 'br000000-0000-0000-0000-000000000004',
    name: 'Samsung',
    slug: 'samsung',
    description:
      'Tập đoàn công nghệ hàng đầu Hàn Quốc, dẫn đầu toàn cầu về màn hình Dynamic AMOLED 2X, thiết kế gập đột phá Galaxy Z Fold/Flip, camera 200MP và kỷ nguyên trí tuệ nhân tạo Galaxy AI.',
  },
  {
    id: 'br000000-0000-0000-0000-000000000005',
    name: 'Sony',
    slug: 'sony',
    description:
      'Biểu tượng âm thanh và hình ảnh Nhật Bản đỉnh cao. Dẫn đầu với tai nghe chống ồn chủ động ANC chuẩn phòng thu WH-1000XM5, âm thanh Hi-Res Audio không dây LDAC và màng loa sợi carbon cao cấp.',
  },
  {
    id: 'br000000-0000-0000-0000-000000000006',
    name: 'Keychron',
    slug: 'keychron',
    description:
      'Thương hiệu bàn phím cơ Custom cao cấp hàng đầu thế giới. Tối ưu hoàn hảo chuyển đổi giữa Mac và Windows, kết nối không dây đa thiết bị, mạch hotswap linh hoạt và tùy biến firmware QMK/VIA.',
  },
  {
    id: 'br000000-0000-0000-0000-000000000007',
    name: 'Anker',
    slug: 'anker',
    description:
      'Thương hiệu phụ kiện sạc số 1 thế giới từ Mỹ. Tiên phong công nghệ bán dẫn GaNPrime siêu nhỏ gọn công suất cao 65W-140W, sạc thông minh PowerIQ và cáp bọc dù siêu bền uốn gập hơn 20.000 lần.',
  },
];

export const branches: SeedBranch[] = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    name: 'BK-Store Cầu Giấy (Hà Nội)',
    city: 'Hà Nội',
    address: '268 Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, Hà Nội',
    phone: '024.3838.9999',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    name: 'BK-Store Quận 1 (TP. Hồ Chí Minh)',
    city: 'TP. Hồ Chí Minh',
    address: '123 Lê Lợi, P. Bến Thành, Quận 1, TP. Hồ Chí Minh',
    phone: '028.3939.8888',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000003',
    name: 'BK-Store Hải Châu (Đà Nẵng)',
    city: 'Đà Nẵng',
    address: '45 Nguyễn Văn Linh, P. Nam Dương, Q. Hải Châu, Đà Nẵng',
    phone: '0236.3636.777',
  },
];

export const products: SeedProduct[] = [
  // --- LAPTOPS ---
  {
    id: 'p1000000-0000-0000-0000-000000000001',
    categorySlug: 'laptop',
    name: 'Apple MacBook Air 13 M3 (16GB RAM, 512GB SSD)',
    slug: 'macbook-air-m3-13-16gb-512gb',
    brand: 'Apple',
    price: 31990000,
    originalPrice: 34990000,
    thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80',
    ],
    specs: {
      cpu: 'Apple M3 8-core CPU',
      gpu: '10-core GPU, 16-core Neural Engine',
      ram: '16GB Unified Memory',
      storage: '512GB SSD Siêu tốc',
      screen: '13.6 inch Liquid Retina (2560 x 1664), 500 nits, True Tone',
      battery: 'Pin 52.6Wh, thời lượng lên đến 18 giờ',
      weight: '1.24 kg',
      os: 'macOS Sonoma',
    },
    description: 'MacBook Air M3 mỏng nhẹ đỉnh cao với hiệu năng vượt trội, thời lượng pin cả ngày, phù hợp cho học tập, văn phòng và thiết kế đồ họa 2D chuyên sâu.',
    warrantyMonths: 12,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000002',
    categorySlug: 'laptop',
    name: 'Apple MacBook Pro 14 M3 Pro (18GB RAM, 512GB SSD)',
    slug: 'macbook-pro-14-m3-pro-18gb-512gb',
    brand: 'Apple',
    price: 49990000,
    originalPrice: 53990000,
    thumbnail: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=80',
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&q=80',
    ],
    specs: {
      cpu: 'Apple M3 Pro 11-core CPU',
      gpu: '14-core GPU, Ray Tracing phần cứng',
      ram: '18GB Unified Memory',
      storage: '512GB SSD NVMe',
      screen: '14.2 inch Liquid Retina XDR (3024 x 1964), 120Hz ProMotion, 1600 nits Peak',
      battery: 'Pin 70Wh, sạc nhanh 96W MagSafe 3',
      weight: '1.61 kg',
      os: 'macOS Sonoma',
    },
    description: 'Quái thú đồ họa và lập trình với màn hình Liquid Retina XDR 120Hz siêu nét, tản nhiệt quạt chủ động và chip M3 Pro cân mượt các project nặng.',
    warrantyMonths: 12,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000003',
    categorySlug: 'laptop',
    name: 'ASUS ROG Zephyrus G14 OLED (Ryzen 9 8945HS, RTX 4060 8GB, 16GB)',
    slug: 'asus-rog-zephyrus-g14-2024',
    brand: 'ASUS',
    price: 46990000,
    originalPrice: 49990000,
    thumbnail: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
    ],
    specs: {
      cpu: 'AMD Ryzen 9 8945HS (8 nhân 16 luồng, up to 5.2GHz, NPU 16 TOPS)',
      gpu: 'NVIDIA GeForce RTX 4060 8GB GDDR6 (TGP 90W)',
      ram: '16GB LPDDR5X 6400MHz',
      storage: '1TB PCIe 4.0 NVMe M.2 SSD',
      screen: '14 inch 3K OLED (2880 x 1800) 120Hz, 0.2ms, 100% DCI-P3, G-Sync',
      battery: 'Pin 73Wh, sạc nhanh Type-C PD 100W',
      weight: '1.5 kg',
      os: 'Windows 11 Home bản quyền',
    },
    description: 'Laptop gaming cao cấp siêu mỏng nhẹ chỉ 1.5kg, trang bị màn hình OLED 3K 120Hz tuyệt mỹ cùng GPU RTX 4060 mạnh mẽ.',
    warrantyMonths: 24,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000004',
    categorySlug: 'laptop',
    name: 'Dell XPS 13 9340 (Intel Core Ultra 7 155H, 16GB RAM, 512GB SSD)',
    slug: 'dell-xps-13-9340-intel-core-ultra-7',
    brand: 'Dell',
    price: 42490000,
    originalPrice: 45990000,
    thumbnail: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&q=80',
    ],
    specs: {
      cpu: 'Intel Core Ultra 7 155H (16 nhân 22 luồng, Intel AI Boost NPU)',
      gpu: 'Intel Arc Graphics',
      ram: '16GB LPDDR5x 7467MHz Dual Channel',
      storage: '512GB PCIe 4.0 NVMe SSD',
      screen: '13.4 inch FHD+ (1920 x 1200) InfinityEdge, 120Hz, 500 nits',
      battery: 'Pin 55Wh, sạc Type-C 60W',
      weight: '1.19 kg',
      os: 'Windows 11 Pro',
    },
    description: 'Tuyệt phẩm doanh nhân với thiết kế nhôm nguyên khối CNC sang trọng, hàng phím cảm ứng vô hình và vi xử lý Intel Core Ultra tích hợp AI.',
    warrantyMonths: 12,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000005',
    categorySlug: 'laptop',
    name: 'Lenovo Legion Pro 5 16IRX9 (Core i7 14650HX, RTX 4060 8GB, 16GB, 1TB)',
    slug: 'lenovo-legion-pro-5-16irx9',
    brand: 'Lenovo',
    price: 38990000,
    originalPrice: 41990000,
    thumbnail: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80',
    ],
    specs: {
      cpu: 'Intel Core i7-14650HX (16 nhân 24 luồng, max 5.2GHz)',
      gpu: 'NVIDIA GeForce RTX 4060 8GB GDDR6 (TGP tối đa 140W)',
      ram: '16GB DDR5 5600MHz (nâng cấp tối đa 64GB)',
      storage: '1TB SSD M.2 2280 PCIe 4.0 NVMe',
      screen: '16 inch WQXGA (2560x1600) IPS 240Hz, 500 nits, 100% sRGB, G-SYNC',
      battery: 'Pin 80Wh, củ sạc 300W',
      weight: '2.5 kg',
      os: 'Windows 11 Home',
    },
    description: 'Cỗ máy cày game và render 3D chuyên nghiệp với tản nhiệt Legion ColdFront 5.0 và màn hình 240Hz sắc nét.',
    warrantyMonths: 24,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000006',
    categorySlug: 'laptop',
    name: 'Acer Predator Helios Neo 16 (Core i5 14500HX, RTX 4050 6GB, 16GB)',
    slug: 'acer-predator-helios-neo-16',
    brand: 'Acer',
    price: 28990000,
    originalPrice: 31990000,
    thumbnail: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800&q=80',
    ],
    specs: {
      cpu: 'Intel Core i5-14500HX (14 nhân 20 luồng)',
      gpu: 'NVIDIA GeForce RTX 4050 6GB (140W MGP)',
      ram: '16GB DDR5 5600MHz',
      storage: '512GB PCIe NVMe SSD',
      screen: '16 inch WQXGA (2560 x 1600) IPS 165Hz, 100% sRGB',
      battery: 'Pin 90Wh, sạc 330W',
      weight: '2.6 kg',
      os: 'Windows 11 Home',
    },
    description: 'Mẫu laptop gaming phân khúc tầm trung quốc dân với bàn phím LED RGB 4 vùng và tản nhiệt quạt kim loại AeroBlade 3D thế hệ 5.',
    warrantyMonths: 12,
  },

  // --- SMARTPHONES ---
  {
    id: 'p1000000-0000-0000-0000-000000000007',
    categorySlug: 'smartphone',
    name: 'Apple iPhone 16 Pro Max 256GB (Titan Sa Mạc)',
    slug: 'iphone-16-pro-max-256gb',
    brand: 'Apple',
    price: 34490000,
    originalPrice: 36990000,
    thumbnail: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80',
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80',
    ],
    specs: {
      chipset: 'Apple A18 Pro 3nm thế hệ 2, 6-core GPU, Camera Control nút chụp',
      ram: '8GB RAM',
      storage: '256GB NVMe',
      screen: '6.9 inch Super Retina XDR OLED, 120Hz ProMotion, Dynamic Island',
      camera: 'Chính 48MP Fusion + Tele 5x 12MP + Siêu rộng 48MP',
      battery: 'Thời lượng xem video lên đến 33 giờ, sạc nhanh MagSafe 25W',
      weight: '227 g',
      os: 'iOS 18 hỗ trợ Apple Intelligence',
    },
    description: 'Flagship đỉnh cao nhất của Apple với khung viền Titan Cấp 5, màn hình lớn nhất từ trước đến nay 6.9 inch và nút Camera Control chuyên nghiệp.',
    warrantyMonths: 12,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000008',
    categorySlug: 'smartphone',
    name: 'Apple iPhone 15 128GB (Hồng Pastel)',
    slug: 'iphone-15-128gb',
    brand: 'Apple',
    price: 18990000,
    originalPrice: 21990000,
    thumbnail: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
    ],
    specs: {
      chipset: 'Apple A16 Bionic (4nm)',
      ram: '6GB RAM',
      storage: '128GB',
      screen: '6.1 inch Super Retina XDR OLED, Dynamic Island, độ sáng đỉnh 2000 nits',
      camera: 'Chính 48MP + Siêu rộng 12MP, chụp ảnh chân dung thế hệ mới',
      battery: 'Xem video đến 20 giờ, cổng sạc USB-C',
      weight: '171 g',
      os: 'iOS 17',
    },
    description: 'Chiếc iPhone tiêu chuẩn xuất sắc với cổng sạc USB-C tiện lợi, thiết kế mặt lưng kính pha màu mịn màng và cụm Dynamic Island thông minh.',
    warrantyMonths: 12,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000009',
    categorySlug: 'smartphone',
    name: 'Samsung Galaxy S24 Ultra 256GB (Xám Titan - Galaxy AI)',
    slug: 'samsung-galaxy-s24-ultra-256gb',
    brand: 'Samsung',
    price: 26990000,
    originalPrice: 31990000,
    thumbnail: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80',
    ],
    specs: {
      chipset: 'Qualcomm Snapdragon 8 Gen 3 for Galaxy (4nm)',
      ram: '12GB LPDDR5X',
      storage: '256GB UFS 4.0',
      screen: '6.8 inch Dynamic AMOLED 2X, QHD+, 1-120Hz, kính chống lóa Corning Gorilla Armor',
      camera: '200MP Chính + 50MP Zoom quang 5x + 10MP Zoom quang 3x + 12MP Ultra-wide',
      battery: '5000 mAh, sạc nhanh có dây 45W, sạc không dây 15W',
      weight: '232 g',
      features: 'Tích hợp bút S-Pen, bộ tính năng thông minh toàn diện Galaxy AI',
      os: 'Android 14 với One UI 6.1 (cam kết cập nhật 7 năm)',
    },
    description: 'Siêu phẩm công nghệ Android toàn diện nhất trang bị bút S-Pen, hệ thống camera zoom 100x và trí tuệ nhân tạo Galaxy AI phục vụ công việc và dịch thuật.',
    warrantyMonths: 12,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000010',
    categorySlug: 'smartphone',
    name: 'Xiaomi 14 Ultra 512GB (Ống kính nhiếp ảnh Leica)',
    slug: 'xiaomi-14-ultra-512gb',
    brand: 'Xiaomi',
    price: 27990000,
    originalPrice: 32990000,
    thumbnail: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80',
    ],
    specs: {
      chipset: 'Qualcomm Snapdragon 8 Gen 3 (4nm)',
      ram: '16GB LPDDR5X',
      storage: '512GB UFS 4.0',
      screen: '6.73 inch LTPO AMOLED, WQHD+ (3200 x 1440), 120Hz, 3000 nits Peak',
      camera: 'Hệ thống 4 camera Leica 50MP, cảm biến chính Sony LYT-900 1-inch khẩu độ biến thiên f/1.63 - f/4.0',
      battery: '5000 mAh, sạc siêu tốc 90W HyperCharge, sạc không dây 80W',
      weight: '219.8 g',
      os: 'Xiaomi HyperOS trên nền Android 14',
    },
    description: 'Chiếc máy ảnh chuyên nghiệp thu nhỏ vào thân hình smartphone với cụm camera tròn Leica 1 inch khẩu độ cơ học biến thiên.',
    warrantyMonths: 18,
  },

  // --- ACCESSORIES ---
  {
    id: 'p1000000-0000-0000-0000-000000000011',
    categorySlug: 'accessory',
    name: 'Tai nghe chụp tai chống ồn Sony WH-1000XM5 (Đen)',
    slug: 'sony-wh-1000xm5-black',
    brand: 'Sony',
    price: 6790000,
    originalPrice: 8490000,
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    ],
    specs: {
      driver: '30mm carbon fiber nhẹ và cứng cáp',
      connection: 'Bluetooth 5.2, hỗ trợ âm thanh Hi-Res LDAC, jack 3.5mm',
      batteryLife: '30 giờ (khi bật chống ồn ANC), 40 giờ (tắt ANC), sạc 3 phút dùng 3 giờ',
      weight: '250 g',
      features: 'Chip xử lý V1 + QN1, 8 micro khử ồn môi trường, Speak-to-Chat',
    },
    description: 'Vua chống ồn tai nghe chụp tai với thiết kế êm ái cả ngày, chất âm Hi-Res chi tiết và khả năng đàm thoại trong trẻo.',
    warrantyMonths: 12,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000012',
    categorySlug: 'accessory',
    name: 'Tai nghe không dây Apple AirPods Pro 2 (Hộp sạc MagSafe USB-C)',
    slug: 'apple-airpods-pro-2-usb-c',
    brand: 'Apple',
    price: 5190000,
    originalPrice: 6190000,
    thumbnail: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80',
    ],
    specs: {
      chipset: 'Apple H2 headphone chip, chip U1/U2 định vị trong hộp sạc',
      connection: 'Bluetooth 5.3, cổng USB-C',
      batteryLife: '6 giờ nghe liên tục (30 giờ kèm hộp sạc)',
      features: 'Chống ồn chủ động ANC gấp đôi, Âm thanh thích ứng (Adaptive Audio), Âm thanh không gian cá nhân hóa',
      waterproof: 'Chuẩn kháng bụi & nước IP54 cho cả tai nghe và hộp sạc',
    },
    description: 'Mẫu tai nghe true-wireless hoàn hảo cho người dùng iPhone/Mac với khả năng chuyển đổi thiết bị tức thì và chế độ xuyên âm tự nhiên nhất.',
    warrantyMonths: 12,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000013',
    categorySlug: 'accessory',
    name: 'Chuột không dây công thái học Logitech MX Master 3S (Xám Graphite)',
    slug: 'logitech-mx-master-3s',
    brand: 'Logitech',
    price: 2090000,
    originalPrice: 2490000,
    thumbnail: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80',
    ],
    specs: {
      sensor: 'Darkfield công nghệ 8000 DPI (hoạt động mượt mà trên mặt kính)',
      clicks: 'Quiet Clicks giảm 90% tiếng ồn click chuột',
      scroll: 'Cuộn siêu tốc MagSpeed điện từ cuộn 1000 dòng/giây',
      connection: 'Bluetooth Low Energy hoặc đầu thu Logi Bolt USB',
      battery: 'Pin sạc 500mAh, sử dụng đến 70 ngày một lần sạc',
    },
    description: 'Chuột máy tính công thái học tốt nhất thế giới cho dân lập trình viên và thiết kế đồ họa, cuộn vô cực và kết nối cùng lúc 3 thiết bị.',
    warrantyMonths: 12,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000014',
    categorySlug: 'accessory',
    name: 'Bàn phím cơ không dây Logitech MX Mechanical Mini (Tactile Quiet)',
    slug: 'logitech-mx-mechanical-mini',
    brand: 'Logitech',
    price: 2790000,
    originalPrice: 3290000,
    thumbnail: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    ],
    specs: {
      layout: 'Mini 75% gọn gàng tiết kiệm diện tích bàn làm việc',
      switch: 'Low-profile Mechanical Tactile Quiet êm ái, đầm tay',
      backlight: 'Đèn nền thông minh tự phát sáng khi tay đến gần',
      connection: 'Bluetooth & Logi Bolt, tương thích đồng thời macOS và Windows',
      battery: '15 ngày có đèn nền hoặc đến 10 tháng khi tắt đèn nền',
    },
    description: 'Bàn phím cơ low-profile êm ái, gõ phím tốc độ cao không gây tiếng ồn nơi công sở, thiết kế kim loại sang trọng.',
    warrantyMonths: 12,
  },
  {
    id: 'p1000000-0000-0000-0000-000000000015',
    categorySlug: 'accessory',
    name: 'Củ sạc nhanh Anker Prime 67W GaN (3 cổng 2C1A)',
    slug: 'anker-prime-67w-gan-charger',
    brand: 'Anker',
    price: 990000,
    originalPrice: 1390000,
    thumbnail: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&q=80',
    ],
    specs: {
      power: 'Tổng công suất 67W Max (sạc được MacBook Pro 14 inch, iPhone, iPad cùng lúc)',
      ports: '2 cổng USB-C + 1 cổng USB-A',
      technology: 'GaNPrime thế hệ mới nhất, kiểm soát nhiệt độ ActiveShield 2.0',
      size: 'Nhỏ hơn 51% so với củ sạc MacBook 67W gốc của Apple',
    },
    description: 'Củ sạc GaN 67W siêu nhỏ gọn bỏ túi áo, cung cấp năng lượng an toàn cho toàn bộ hệ sinh thái laptop, điện thoại và tai nghe.',
    warrantyMonths: 18,
  },
];

export const sampleOrders = [
  {
    id: 'ord-1024',
    orderCode: '#BK-1024',
    userId: 'u-customer-001',
    customerName: 'Nguyễn Văn An',
    phone: '0912345678',
    address: 'Số 18 Hoàng Quốc Việt, Phường Nghĩa Đô, Cầu Giấy, Hà Nội',
    note: 'Giao giờ hành chính, gọi trước khi đến',
    totalAmount: 31990000,
    paymentMethod: 'COD',
    status: 'delivered',
    trackingInfo: 'Đơn hàng đã được giao thành công vào lúc 14:30 ngày 15/09/2026. Người nhận: Nguyễn Văn An.',
    createdAt: '2026-09-15T14:30:00.000Z',
    items: [
      {
        productId: 'p1000000-0000-0000-0000-000000000001',
        productSlug: 'macbook-air-m3-13-16gb-512gb',
        productName: 'Apple MacBook Air 13 M3 (16GB RAM / 512GB SSD)',
        quantity: 1,
        unitPrice: 31990000,
        price: 31990000,
      },
    ],
  },
  {
    id: 'ord-2048',
    orderCode: '#BK-2048',
    customerName: 'Trần Thị Mai',
    phone: '0987654321',
    address: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
    note: 'Chuyển khoản QR trước',
    totalAmount: 35480000,
    paymentMethod: 'QR_PAY',
    status: 'shipping',
    trackingInfo: 'Kiện hàng đã rời kho trung chuyển Tân Bình lúc 08:15 sáng nay và đang trên đường giao hàng bởi shipper.',
    createdAt: '2026-10-09T08:15:00.000Z',
    items: [
      {
        productId: 'p1000000-0000-0000-0000-000000000008',
        productSlug: 'iphone-16-pro-max-256gb',
        productName: 'Apple iPhone 16 Pro Max 256GB Titan Tự Nhiên',
        quantity: 1,
        unitPrice: 34490000,
        price: 34490000,
      },
      {
        productId: 'p1000000-0000-0000-0000-000000000015',
        productSlug: 'anker-prime-67w-gan-charger',
        productName: 'Củ sạc nhanh Anker 735 GaNPrime 65W (3 Cổng)',
        quantity: 1,
        unitPrice: 990000,
        price: 990000,
      },
    ],
  },
  {
    id: 'ord-3072',
    orderCode: '#BK-3072',
    customerName: 'Lê Hoàng Long',
    phone: '0905123987',
    address: 'Khu Công Nghệ Phần Mềm, Đường 2/9, Hải Châu, Đà Nẵng',
    note: 'Thanh toán tiền mặt khi nhận hàng',
    totalAmount: 2090000,
    paymentMethod: 'COD',
    status: 'pending',
    trackingInfo: 'Đơn hàng đã được tiếp nhận trên hệ thống lúc 10:00 sáng. Quản trị viên đang kiểm tra tồn kho tại chi nhánh Đà Nẵng để đóng gói.',
    createdAt: '2026-10-10T10:00:00.000Z',
    items: [
      {
        productId: 'p1000000-0000-0000-0000-000000000013',
        productSlug: 'logitech-mx-master-3s',
        productName: 'Chuột Không Dây Logitech MX Master 3S',
        quantity: 1,
        unitPrice: 2090000,
        price: 2090000,
      },
    ],
  },
];

export const sampleKnowledgePolicies = [
  {
    title: 'Chính sách bảo hành thiết bị công nghệ BK-Store',
    category: 'chinh_sach_bao_hanh',
    content: `CHÍNH SÁCH BẢO HÀNH CHÍNH HÃNG BK-STORE:
1. Thời hạn bảo hành tiêu chuẩn:
- Toàn bộ sản phẩm Laptop (Apple MacBook, ASUS, Dell, Lenovo, Acer) và Điện thoại thông minh (iPhone, Samsung, Xiaomi) được bảo hành chính hãng từ 12 đến 24 tháng theo đúng tiêu chuẩn nhà sản xuất.
- Phụ kiện cao cấp (Sony, Logitech, Apple, Anker) bảo hành chính hãng từ 12 đến 18 tháng.
2. Chính sách bảo hành 1 ĐỔI 1:
- Trong vòng 30 ngày đầu tiên kể từ ngày mua hàng (hoặc ngày nhận máy thành công), nếu sản phẩm phát sinh lỗi phần cứng từ nhà sản xuất (lỗi mainboard, màn hình sọc, không lên nguồn, camera hỏng), BK-Store áp dụng chính sách 1 ĐỔI 1 ngay lập tức bằng máy mới 100% nguyên seal hộp.
3. Quy định cụ thể về màn hình và pin:
- Đối với màn hình Laptop và Điện thoại: Áp dụng bảo hành khi có từ 3 điểm chết (dead pixel) trở lên, hoặc có điểm sáng lớn hơn 1mm, hoặc có hiện tượng sọc màn hình, chớp nháy.
- Đối với Pin: Được bảo hành thay pin mới miễn phí nếu dung lượng pin (Battery Health) chai giảm xuống dưới 80% trong vòng 12 tháng đầu sử dụng.
4. Trường hợp từ chối bảo hành miễn phí:
- Máy bị rơi vỡ, va đập biến dạng, có dấu hiệu vào nước hoặc hóa chất ăn mòn.
- Máy đã bị tự ý can thiệp phần cứng hoặc sửa chữa tại các cơ sở không được ủy quyền.`,
  },
  {
    title: 'Chính sách đổi trả và hoàn tiền BK-Store',
    category: 'chinh_sach_doi_tra',
    content: `CHÍNH SÁCH ĐỔI TRẢ VÀ HOÀN TIỀN TẠI BK-STORE:
1. Đổi trả do lỗi kỹ thuật của sản phẩm:
- Trong 30 ngày đầu tiên: Đổi sản phẩm mới miễn phí 100%. Nếu sản phẩm cùng loại hết hàng trong kho, khách hàng được hoàn tiền 100% hoặc đổi sang dòng sản phẩm khác bù/trừ chênh lệch giá.
2. Đổi trả theo nhu cầu khách hàng (Không có lỗi kỹ thuật):
- Trong vòng 14 ngày kể từ ngày mua: Khách hàng có thể yêu cầu đổi sang mẫu mã khác hoặc trả hàng hoàn tiền.
- Điều kiện: Sản phẩm phải còn nguyên seal niêm phong của nhà sản xuất, hộp không rách nát, đầy đủ phụ kiện và hóa đơn mua hàng.
- Phí thu hồi (nếu trả hàng hoàn tiền do đổi ý): 10% giá trị đơn hàng trên hóa đơn để bù chi phí vận hành và khấu hao niêm phong.
3. Thời gian hoàn tiền:
- Hoàn tiền mặt ngay tại chi nhánh cửa hàng hoặc chuyển khoản ngân hàng trong vòng 24 đến 48 giờ làm việc.`,
  },
  {
    title: 'Chính sách vận chuyển và giao hàng BK-Store',
    category: 'van_chuyen',
    content: `CHÍNH SÁCH VẬN CHUYỂN & GIAO HÀNG TẬN NƠI:
1. Cước phí vận chuyển:
- MIỄN PHÍ VẬN CHUYỂN TOÀN QUỐC (Free Shipping) cho tất cả các đơn hàng có tổng giá trị từ 1.000.000 VNĐ trở lên.
- Đơn hàng dưới 1.000.000 VNĐ áp dụng mức phí vận chuyển đồng giá: 30.000 VNĐ trên phạm vi toàn quốc.
2. Thời gian giao hàng dự kiến:
- Giao hàng hỏa tốc trong 2 giờ: Áp dụng cho các quận nội thành thuộc Hà Nội, TP. Hồ Chí Minh và Đà Nẵng (khi đặt hàng từ 08:30 đến 18:00 hàng ngày).
- Giao hàng tiêu chuẩn liên tỉnh: Từ 2 đến 3 ngày làm việc đối với các tỉnh thành khác.
3. Kiểm tra hàng trước khi thanh toán (Đồng kiểm):
- Khách hàng được quyền mở hộp kiểm tra ngoại quan sản phẩm (đúng màu, đúng dòng máy, không móp méo rơi vỡ) trước khi thanh toán tiền cho nhân viên giao hàng (COD).`,
  },
  {
    title: 'Thông tin hệ sinh thái các thương hiệu công nghệ chính hãng tại BK-Store',
    category: 'thuong_hieu_chinh_hang',
    content: `THÔNG TIN THƯƠNG HIỆU CÔNG NGHỆ CHÍNH HÃNG PHÂN PHỐI TẠI BK-STORE:
1. Apple (Hoa Kỳ): MacBook Air M2/M3, MacBook Pro M3 Pro/Max, iPhone 16 Pro Max, iPad Pro, AirPods.
2. Dell (Hoa Kỳ): Dell XPS 13/14/16, Dell Inspiron, Dell Precision.
3. ASUS (Đài Loan): ASUS Zenbook Lumina OLED, ROG Zephyrus G14/G16 OLED & TUF Gaming.
4. Samsung (Hàn Quốc): Galaxy S24 Ultra, Galaxy Z Fold6, Galaxy AI.
5. Sony (Nhật Bản): WH-1000XM5, WF-1000XM5, Hi-Res Audio LDAC.
6. Keychron (Hồng Kông): Keychron Q1 Pro/Q3 Max nhôm CNC, K2 Pro, QMK/VIA.
7. Anker (Hoa Kỳ): Củ sạc nhanh GaNPrime 65W/100W, ActiveShield 2.0.`,
  },
  {
    title: 'Chính sách và hướng dẫn đánh giá sản phẩm thực tế (Verified Reviews) BK-Store',
    category: 'danh_gia_san_pham',
    content: `CHÍNH SÁCH VÀ HƯỚNG DẪN ĐÁNH GIÁ SẢN PHẨM BK-STORE:
1. Nguyên tắc xác thực người mua (Verified Purchase):
- Chỉ những khách hàng đã mua sản phẩm và đơn hàng ở trạng thái "Giao hàng thành công" (delivered) mới có quyền viết đánh giá.
- Các đơn hàng đang chờ duyệt (pending), đã duyệt (confirmed), đang vận chuyển (shipping) hoặc đã hủy (cancelled) sẽ KHÔNG THỂ gửi đánh giá. Khách hàng cần nhận máy và trải nghiệm thực tế trước khi gửi nhận xét.
2. Thông tin xác thực bắt buộc:
- Khách hàng nhập Mã đơn hàng (ví dụ: #BK-1024) và Số điện thoại đặt hàng để hệ thống tự động kiểm tra tính hợp lệ.
3. Ba hình thức gửi đánh giá trên website:
- Cách 1: Bấm nút "⭐ Đánh giá" trên thanh Header hoặc Footer của website.
- Cách 2: Vào mục "Tra cứu vận đơn" (nhập mã đơn + SĐT), bên cạnh mỗi sản phẩm đã giao thành công sẽ có nút "⭐ Đánh giá".
- Cách 3: Tại trang chi tiết sản phẩm (/products/[slug]), kéo xuống mục "Đánh giá từ khách hàng đã mua sản phẩm" và bấm nút "Viết đánh giá sản phẩm".
4. Tiêu chuẩn đánh giá và chống trùng lặp:
- Chấm điểm số sao từ 1 đến 5 sao (★) kèm nhận xét chân thực về chất lượng máy, pin, màn hình, hiệu năng, đóng gói.
- Chống trùng lặp: Mỗi sản phẩm trong một đơn hàng chỉ được gửi đánh giá tối đa 01 lần. Đánh giá được gắn huy hiệu uy tín "✓ Đã mua hàng tại BK-Store".`,
  },
];
