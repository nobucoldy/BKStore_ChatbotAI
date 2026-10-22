import {
  ApiResponse,
  Branch,
  BranchInventory,
  Brand,
  Category,
  CreateOrderPayload,
  CreateReviewPayload,
  Order,
  OrderStatus,
  Product,
  ProductReviewsData,
  Review,
  BranchStockDetail,
  ProductInventoryItem,
  InventoryOverviewData,
  UpdateInventoryPayload,
  TransferStockPayload,
  User,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const AUTH_TOKEN_KEY = 'bkstore_auth_token_v1';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Fallback seed brands
export const FALLBACK_BRANDS: Brand[] = [
  {
    id: 'br1',
    name: 'Apple',
    slug: 'apple',
    logo: '/brands/apple.svg',
    description:
      'Thương hiệu công nghệ hàng đầu thế giới từ Mỹ. Nổi bật với hệ sinh thái MacBook, iPhone, iPad sang trọng, chip Apple Silicon hiệu năng mạnh mẽ, thời lượng pin bền bỉ và bảo hành chính hãng VN/A.',
  },
  {
    id: 'br2',
    name: 'Dell',
    slug: 'dell',
    logo: '/brands/dell.svg',
    description:
      'Thương hiệu máy tính danh tiếng từ Hoa Kỳ, nổi bật với độ bền chuẩn quân đội, bàn phím gõ êm và màn hình viền siêu mỏng InfinityEdge trên dòng Dell XPS doanh nhân, Dell Inspiron và máy trạm Precision.',
  },
  {
    id: 'br3',
    name: 'ASUS',
    slug: 'asus',
    logo: '/brands/asus.svg',
    description:
      'Thương hiệu công nghệ tiên phong từ Đài Loan, dẫn đầu với laptop gaming ASUS ROG Zephyrus tản nhiệt kim loại lỏng và laptop văn phòng cao cấp Zenbook màn hình Lumina OLED rực rỡ chuẩn điện ảnh.',
  },
  {
    id: 'br4',
    name: 'Samsung',
    slug: 'samsung',
    logo: '/brands/samsung.svg',
    description:
      'Tập đoàn công nghệ hàng đầu Hàn Quốc, dẫn đầu toàn cầu về màn hình Dynamic AMOLED 2X, thiết kế gập đột phá Galaxy Z Fold/Flip, camera 200MP và kỷ nguyên trí tuệ nhân tạo Galaxy AI.',
  },
  {
    id: 'br5',
    name: 'Sony',
    slug: 'sony',
    logo: '/brands/sony.svg',
    description:
      'Biểu tượng âm thanh và hình ảnh Nhật Bản đỉnh cao. Dẫn đầu với tai nghe chống ồn chủ động ANC chuẩn phòng thu WH-1000XM5, âm thanh Hi-Res Audio không dây LDAC và màng loa sợi carbon cao cấp.',
  },
  {
    id: 'br6',
    name: 'Keychron',
    slug: 'keychron',
    logo: '/brands/keychron.svg',
    description:
      'Thương hiệu bàn phím cơ Custom cao cấp hàng đầu thế giới. Tối ưu hoàn hảo chuyển đổi giữa Mac và Windows, kết nối không dây đa thiết bị, mạch hotswap linh hoạt và tùy biến firmware QMK/VIA.',
  },
  {
    id: 'br7',
    name: 'Anker',
    slug: 'anker',
    logo: '/brands/anker.svg',
    description:
      'Thương hiệu phụ kiện sạc số 1 thế giới từ Mỹ. Tiên phong công nghệ bán dẫn GaNPrime siêu nhỏ gọn công suất cao 65W-140W, sạc thông minh PowerIQ và cáp bọc dù siêu bền uốn gập hơn 20.000 lần.',
  },
];

// Fallback seed categories
export const FALLBACK_CATEGORIES: Category[] = [
  {
    id: 'c1',
    name: 'Laptop & Máy tính xách tay',
    slug: 'laptop',
    description: 'Laptop văn phòng, đồ họa, gaming chính hãng',
  },
  {
    id: 'c2',
    name: 'Điện thoại thông minh',
    slug: 'smartphone',
    description: 'Smartphone cao cấp chính hãng Apple, Samsung',
  },
  {
    id: 'c3',
    name: 'Phụ kiện & Ngoại vi',
    slug: 'accessory',
    description: 'Tai nghe, chuột, bàn phím cơ và củ sạc GaN',
  },
];

// Fallback seed branches
export const FALLBACK_BRANCHES: Branch[] = [
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

// Fallback seed products
export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'p1000000-0000-0000-0000-000000000001',
    name: 'Apple MacBook Air 13 M3 (16GB RAM, 512GB SSD)',
    slug: 'macbook-air-m3-13-16gb-512gb',
    categorySlug: 'laptop',
    categoryName: 'Laptop & Máy tính xách tay',
    brand: 'Apple',
    price: 31990000,
    originalPrice: 34990000,
    stock: 12,
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
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 5 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 4 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 3 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000002',
    name: 'Apple MacBook Pro 14 M3 Pro (18GB RAM, 512GB SSD)',
    slug: 'macbook-pro-14-m3-pro-18gb-512gb',
    categorySlug: 'laptop',
    categoryName: 'Laptop & Máy tính xách tay',
    brand: 'Apple',
    price: 49990000,
    originalPrice: 53990000,
    stock: 8,
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
      screen: '14.2 inch Liquid Retina XDR (3024 x 1964), 120Hz ProMotion',
      battery: 'Pin 70Wh, sạc nhanh 96W MagSafe 3',
      weight: '1.61 kg',
      os: 'macOS Sonoma',
    },
    description: 'Quái thú đồ họa và lập trình với màn hình Liquid Retina XDR 120Hz siêu nét, tản nhiệt quạt chủ động và chip M3 Pro cân mượt các project nặng.',
    warrantyMonths: 12,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 3 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 3 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 2 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000003',
    name: 'ASUS ROG Zephyrus G14 OLED (Ryzen 9 8945HS, RTX 4060 8GB, 16GB)',
    slug: 'asus-rog-zephyrus-g14-2024',
    categorySlug: 'laptop',
    categoryName: 'Laptop & Máy tính xách tay',
    brand: 'ASUS',
    price: 46990000,
    originalPrice: 49990000,
    stock: 10,
    thumbnail: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80'],
    specs: {
      cpu: 'AMD Ryzen 9 8945HS (8 nhân 16 luồng, NPU 16 TOPS)',
      gpu: 'NVIDIA GeForce RTX 4060 8GB GDDR6 (TGP 90W)',
      ram: '16GB LPDDR5X 6400MHz',
      storage: '1TB PCIe 4.0 NVMe M.2 SSD',
      screen: '14 inch 3K OLED (2880 x 1800) 120Hz, 0.2ms, 100% DCI-P3',
      battery: 'Pin 73Wh, sạc nhanh Type-C PD 100W',
      weight: '1.5 kg',
      os: 'Windows 11 Home bản quyền',
    },
    description: 'Laptop gaming cao cấp siêu mỏng nhẹ chỉ 1.5kg, trang bị màn hình OLED 3K 120Hz tuyệt mỹ cùng GPU RTX 4060 mạnh mẽ.',
    warrantyMonths: 24,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 4 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 4 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 2 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000004',
    name: 'Dell XPS 13 9340 (Intel Core Ultra 7 155H, 16GB RAM, 512GB SSD)',
    slug: 'dell-xps-13-9340-intel-core-ultra-7',
    categorySlug: 'laptop',
    categoryName: 'Laptop & Máy tính xách tay',
    brand: 'Dell',
    price: 42490000,
    originalPrice: 45990000,
    stock: 14,
    thumbnail: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&q=80'],
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
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 5 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 5 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 4 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000005',
    name: 'Lenovo Legion Pro 5 16IRX9 (Core i7 14650HX, RTX 4060 8GB, 16GB, 1TB)',
    slug: 'lenovo-legion-pro-5-16irx9',
    categorySlug: 'laptop',
    categoryName: 'Laptop & Máy tính xách tay',
    brand: 'Lenovo',
    price: 38990000,
    originalPrice: 41990000,
    stock: 9,
    thumbnail: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80'],
    specs: {
      cpu: 'Intel Core i7-14650HX (16 nhân 24 luồng, max 5.2GHz)',
      gpu: 'NVIDIA GeForce RTX 4060 8GB GDDR6 (TGP tối đa 140W)',
      ram: '16GB DDR5 5600MHz',
      storage: '1TB SSD M.2 2280 PCIe 4.0 NVMe',
      screen: '16 inch WQXGA (2560x1600) IPS 240Hz, 500 nits, 100% sRGB',
      battery: 'Pin 80Wh, củ sạc 300W',
      weight: '2.5 kg',
      os: 'Windows 11 Home',
    },
    description: 'Cỗ máy cày game và render 3D chuyên nghiệp với tản nhiệt Legion ColdFront 5.0 và màn hình 240Hz sắc nét.',
    warrantyMonths: 24,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 3 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 4 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 2 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000006',
    name: 'Acer Predator Helios Neo 16 (Core i5 14500HX, RTX 4050 6GB, 16GB)',
    slug: 'acer-predator-helios-neo-16',
    categorySlug: 'laptop',
    categoryName: 'Laptop & Máy tính xách tay',
    brand: 'Acer',
    price: 28990000,
    originalPrice: 31990000,
    stock: 15,
    thumbnail: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800&q=80'],
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
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 6 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 6 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 3 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000007',
    name: 'Apple iPhone 16 Pro Max 256GB (Titan Sa Mạc)',
    slug: 'iphone-16-pro-max-256gb',
    categorySlug: 'smartphone',
    categoryName: 'Điện thoại thông minh',
    brand: 'Apple',
    price: 34490000,
    originalPrice: 36990000,
    stock: 20,
    thumbnail: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80',
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80',
    ],
    specs: {
      chipset: 'Apple A18 Pro 3nm thế hệ 2, 6-core GPU, Camera Control',
      ram: '8GB RAM',
      storage: '256GB NVMe',
      screen: '6.9 inch Super Retina XDR OLED, 120Hz ProMotion',
      camera: 'Chính 48MP + Tele 5x 12MP + Siêu rộng 48MP',
      battery: 'Thời lượng video đến 33 giờ, sạc MagSafe 25W',
      weight: '227 g',
      os: 'iOS 18 hỗ trợ Apple Intelligence',
    },
    description: 'Flagship đỉnh cao nhất của Apple với khung viền Titan Cấp 5, màn hình lớn nhất từ trước đến nay 6.9 inch và nút Camera Control chuyên nghiệp.',
    warrantyMonths: 12,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 8 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 8 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 4 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000008',
    name: 'Apple iPhone 15 128GB (Hồng Pastel)',
    slug: 'iphone-15-128gb',
    categorySlug: 'smartphone',
    categoryName: 'Điện thoại thông minh',
    brand: 'Apple',
    price: 18990000,
    originalPrice: 21990000,
    stock: 25,
    thumbnail: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80'],
    specs: {
      chipset: 'Apple A16 Bionic (4nm)',
      ram: '6GB RAM',
      storage: '128GB',
      screen: '6.1 inch Super Retina XDR OLED, Dynamic Island',
      camera: 'Chính 48MP + Siêu rộng 12MP',
      battery: 'Xem video đến 20 giờ, USB-C',
      weight: '171 g',
      os: 'iOS 17',
    },
    description: 'Chiếc iPhone tiêu chuẩn xuất sắc với cổng sạc USB-C tiện lợi, thiết kế mặt lưng kính pha màu mịn màng và cụm Dynamic Island thông minh.',
    warrantyMonths: 12,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 10 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 10 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 5 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000009',
    name: 'Samsung Galaxy S24 Ultra 256GB (Xám Titan - Galaxy AI)',
    slug: 'samsung-galaxy-s24-ultra-256gb',
    categorySlug: 'smartphone',
    categoryName: 'Điện thoại thông minh',
    brand: 'Samsung',
    price: 26990000,
    originalPrice: 31990000,
    stock: 18,
    thumbnail: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80'],
    specs: {
      chipset: 'Qualcomm Snapdragon 8 Gen 3 for Galaxy (4nm)',
      ram: '12GB LPDDR5X',
      storage: '256GB UFS 4.0',
      screen: '6.8 inch Dynamic AMOLED 2X, QHD+, 1-120Hz',
      camera: '200MP Chính + 50MP Zoom 5x + 10MP Zoom 3x + 12MP Ultra-wide',
      battery: '5000 mAh, sạc nhanh 45W',
      weight: '232 g',
      os: 'Android 14 với One UI 6.1 (Galaxy AI)',
    },
    description: 'Siêu phẩm công nghệ Android toàn diện nhất trang bị bút S-Pen, hệ thống camera zoom 100x và trí tuệ nhân tạo Galaxy AI phục vụ công việc và dịch thuật.',
    warrantyMonths: 12,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 7 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 7 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 4 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000010',
    name: 'Xiaomi 14 Ultra 512GB (Ống kính nhiếp ảnh Leica)',
    slug: 'xiaomi-14-ultra-512gb',
    categorySlug: 'smartphone',
    categoryName: 'Điện thoại thông minh',
    brand: 'Xiaomi',
    price: 27990000,
    originalPrice: 32990000,
    stock: 11,
    thumbnail: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80'],
    specs: {
      chipset: 'Qualcomm Snapdragon 8 Gen 3 (4nm)',
      ram: '16GB LPDDR5X',
      storage: '512GB UFS 4.0',
      screen: '6.73 inch LTPO AMOLED, WQHD+, 120Hz, 3000 nits Peak',
      camera: '4 camera Leica 50MP, cảm biến chính 1 inch',
      battery: '5000 mAh, sạc siêu tốc 90W HyperCharge',
      weight: '219.8 g',
      os: 'Xiaomi HyperOS (Android 14)',
    },
    description: 'Chiếc máy ảnh chuyên nghiệp thu nhỏ vào thân hình smartphone với cụm camera tròn Leica 1 inch khẩu độ cơ học biến thiên.',
    warrantyMonths: 18,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 4 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 4 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 3 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000011',
    name: 'Tai nghe chụp tai chống ồn Sony WH-1000XM5 (Đen)',
    slug: 'sony-wh-1000xm5-black',
    categorySlug: 'accessory',
    categoryName: 'Phụ kiện & Ngoại vi',
    brand: 'Sony',
    price: 6790000,
    originalPrice: 8490000,
    stock: 22,
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'],
    specs: {
      driver: '30mm carbon fiber nhẹ và cứng cáp',
      connection: 'Bluetooth 5.2, LDAC Hi-Res, jack 3.5mm',
      batteryLife: '30 giờ (bật ANC), sạc 3 phút dùng 3 giờ',
      weight: '250 g',
      features: 'Chip V1 + QN1, 8 micro khử ồn môi trường',
    },
    description: 'Vua chống ồn tai nghe chụp tai với thiết kế êm ái cả ngày, chất âm Hi-Res chi tiết và khả năng đàm thoại trong trẻo.',
    warrantyMonths: 12,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 9 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 9 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 4 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000012',
    name: 'Tai nghe không dây Apple AirPods Pro 2 (Hộp sạc MagSafe USB-C)',
    slug: 'apple-airpods-pro-2-usb-c',
    categorySlug: 'accessory',
    categoryName: 'Phụ kiện & Ngoại vi',
    brand: 'Apple',
    price: 5190000,
    originalPrice: 6190000,
    stock: 30,
    thumbnail: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80'],
    specs: {
      chipset: 'Apple H2 chip, U1/U2 chip',
      connection: 'Bluetooth 5.3, USB-C',
      batteryLife: '6 giờ liên tục (30 giờ kèm hộp sạc)',
      features: 'Chống ồn chủ động ANC gấp đôi, Âm thanh thích ứng',
    },
    description: 'Mẫu tai nghe true-wireless hoàn hảo cho người dùng iPhone/Mac với khả năng chuyển đổi thiết bị tức thì và chế độ xuyên âm tự nhiên nhất.',
    warrantyMonths: 12,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 12 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 12 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 6 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000013',
    name: 'Chuột không dây công thái học Logitech MX Master 3S (Xám Graphite)',
    slug: 'logitech-mx-master-3s',
    categorySlug: 'accessory',
    categoryName: 'Phụ kiện & Ngoại vi',
    brand: 'Logitech',
    price: 2090000,
    originalPrice: 2490000,
    stock: 28,
    thumbnail: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80'],
    specs: {
      sensor: 'Darkfield 8000 DPI (hoạt động trên kính)',
      clicks: 'Quiet Clicks giảm 90% tiếng ồn',
      scroll: 'MagSpeed điện từ 1000 dòng/giây',
      connection: 'Bluetooth Low Energy & Logi Bolt USB',
    },
    description: 'Chuột máy tính công thái học tốt nhất thế giới cho dân lập trình viên và thiết kế đồ họa, cuộn vô cực và kết nối cùng lúc 3 thiết bị.',
    warrantyMonths: 12,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 12 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 11 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 5 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000014',
    name: 'Bàn phím cơ không dây Logitech MX Mechanical Mini (Tactile Quiet)',
    slug: 'logitech-mx-mechanical-mini',
    categorySlug: 'accessory',
    categoryName: 'Phụ kiện & Ngoại vi',
    brand: 'Logitech',
    price: 2790000,
    originalPrice: 3290000,
    stock: 16,
    thumbnail: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'],
    specs: {
      layout: 'Mini 75% gọn gàng',
      switch: 'Low-profile Mechanical Tactile Quiet',
      backlight: 'Đèn nền thông minh tự phát sáng khi tay đến gần',
      connection: 'Bluetooth & Logi Bolt',
    },
    description: 'Bàn phím cơ low-profile êm ái, gõ phím tốc độ cao không gây tiếng ồn nơi công sở, thiết kế kim loại sang trọng.',
    warrantyMonths: 12,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 6 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 6 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 4 },
    ],
  },
  {
    id: 'p1000000-0000-0000-0000-000000000015',
    name: 'Củ sạc nhanh Anker Prime 67W GaN (3 cổng 2C1A)',
    slug: 'anker-prime-67w-gan-charger',
    categorySlug: 'accessory',
    categoryName: 'Phụ kiện & Ngoại vi',
    brand: 'Anker',
    price: 990000,
    originalPrice: 1390000,
    stock: 40,
    thumbnail: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&q=80'],
    specs: {
      power: 'Tổng công suất 67W Max (2 USB-C + 1 USB-A)',
      technology: 'GaNPrime & ActiveShield 2.0',
      size: 'Nhỏ hơn 51% so với củ sạc MacBook 67W gốc',
    },
    description: 'Củ sạc GaN 67W siêu nhỏ gọn bỏ túi áo, cung cấp năng lượng an toàn cho toàn bộ hệ sinh thái laptop, điện thoại và tai nghe.',
    warrantyMonths: 18,
    inventories: [
      { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 15 },
      { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 15 },
      { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 10 },
    ],
  },
];

// Normalize product properties
export function normalizeProduct(raw: Record<string, unknown>): Product {
  const specs = typeof raw.specs === 'object' && raw.specs !== null ? (raw.specs as Record<string, string>) : {};
  const thumbnail = (raw.thumbnail as string) || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80';
  const images = Array.isArray(raw.images) && raw.images.length > 0 ? (raw.images as string[]) : [thumbnail];
  const inventories = Array.isArray(raw.inventories) ? (raw.inventories as BranchInventory[]) : [
    { branchId: 'b1', branchName: 'Hà Nội', city: 'Hà Nội', quantity: 5 },
    { branchId: 'b2', branchName: 'TP.HCM', city: 'TP.HCM', quantity: 4 },
    { branchId: 'b3', branchName: 'Đà Nẵng', city: 'Đà Nẵng', quantity: 3 },
  ];

  return {
    id: String(raw.id),
    name: String(raw.name),
    slug: String(raw.slug),
    categorySlug: (raw.categorySlug as string) || (raw.category_slug as string) || '',
    categoryName: (raw.categoryName as string) || (raw.category_name as string) || '',
    brand: (raw.brand as string) || '',
    price: Number(raw.price) || 0,
    originalPrice: raw.originalPrice ? Number(raw.originalPrice) : (raw.original_price ? Number(raw.original_price) : undefined),
    stock: raw.stock !== undefined ? Number(raw.stock) : (raw.stock_quantity !== undefined ? Number(raw.stock_quantity) : 10),
    thumbnail,
    images,
    specs,
    description: (raw.description as string) || '',
    warrantyMonths: Number(raw.warrantyMonths || raw.warranty_months) || 12,
    inventories,
  };
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/categories`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data;
    }
  } catch (error) {
    console.warn('[API] fetchCategories fallback to local seed:', error);
  }
  return FALLBACK_CATEGORIES;
}

export async function fetchBrands(): Promise<Brand[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/brands`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data;
    }
  } catch (error) {
    console.warn('[API] fetchBrands fallback to local seed:', error);
  }
  return FALLBACK_BRANDS;
}

export async function fetchBrandBySlug(slug: string): Promise<Brand | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/brands/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (error) {
    console.warn('[API] fetchBrandBySlug fallback:', error);
  }
  const found = FALLBACK_BRANDS.find((b) => b.slug.toLowerCase() === slug.toLowerCase());
  return found || null;
}

export async function fetchBranches(): Promise<Branch[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/branches`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data;
    }
  } catch (error) {
    console.warn('[API] fetchBranches fallback to local seed:', error);
  }
  return FALLBACK_BRANCHES;
}

export interface FetchProductsParams {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<{
  products: Product[];
  total: number;
  totalPages: number;
}> {
  try {
    const url = new URL(`${API_BASE_URL}/products`);
    if (params.category && params.category !== 'all') url.searchParams.set('category', params.category);
    if (params.brand && params.brand !== 'all') url.searchParams.set('brand', params.brand);
    if (params.minPrice !== undefined) url.searchParams.set('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) url.searchParams.set('maxPrice', params.maxPrice.toString());
    if (params.search) url.searchParams.set('search', params.search);
    if (params.sort) url.searchParams.set('sort', params.sort);
    if (params.page) url.searchParams.set('page', params.page.toString());
    if (params.limit) url.searchParams.set('limit', params.limit.toString());

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return {
        products: json.data.map(normalizeProduct),
        total: json.pagination?.total || json.data.length,
        totalPages: json.pagination?.totalPages || 1,
      };
    }
  } catch (error) {
    console.warn('[API] fetchProducts fallback to local seed filter:', error);
  }

  // Fallback client-side filter
  let list = [...FALLBACK_PRODUCTS];
  if (params.category && params.category !== 'all') {
    list = list.filter((p) => p.categorySlug?.toLowerCase() === params.category?.toLowerCase());
  }
  if (params.brand && params.brand !== 'all') {
    list = list.filter((p) => p.brand.toLowerCase() === params.brand?.toLowerCase());
  }
  if (params.minPrice !== undefined) {
    list = list.filter((p) => p.price >= (params.minPrice || 0));
  }
  if (params.maxPrice !== undefined) {
    list = list.filter((p) => p.price <= (params.maxPrice || Infinity));
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  if (params.sort === 'price_asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (params.sort === 'price_desc') {
    list.sort((a, b) => b.price - a.price);
  }

  return {
    products: list,
    total: list.length,
    totalPages: 1,
  };
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${slug}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return normalizeProduct(json.data);
      }
    }
  } catch (error) {
    console.warn('[API] fetchProductBySlug fallback:', error);
  }

  const found = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
  return found || null;
}

export async function createProductApi(payload: Partial<Product>): Promise<ApiResponse<Product>> {
  try {
    const res = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        slug: payload.slug,
        categorySlug: payload.categorySlug,
        brand: payload.brand,
        price: Number(payload.price),
        originalPrice: payload.originalPrice ? Number(payload.originalPrice) : undefined,
        stockQuantity: Number(payload.stock ?? 10),
        thumbnail: payload.thumbnail,
        images: payload.images && payload.images.length > 0 ? payload.images : [payload.thumbnail],
        specs: payload.specs || {},
        description: payload.description,
        warrantyMonths: Number(payload.warrantyMonths ?? 12),
      }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      json.data = normalizeProduct(json.data);
    }
    return json;
  } catch (error: unknown) {
    console.warn('[API] createProductApi fallback mock:', error);
    const mockProduct: Product = {
      id: `p-${Date.now()}`,
      name: payload.name || 'Sản phẩm mới',
      slug: payload.slug || `san-pham-${Date.now()}`,
      categorySlug: payload.categorySlug || 'laptop',
      categoryName: payload.categoryName || (payload.categorySlug === 'laptop' ? 'Laptop & Máy tính xách tay' : payload.categorySlug === 'smartphone' ? 'Điện thoại thông minh' : 'Phụ kiện & Ngoại vi'),
      brand: payload.brand || 'BK-Store',
      price: Number(payload.price || 0),
      originalPrice: Number(payload.originalPrice || payload.price || 0),
      stock: Number(payload.stock ?? 10),
      thumbnail: payload.thumbnail || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
      images: payload.images || [payload.thumbnail || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'],
      specs: payload.specs || {},
      description: payload.description || '',
      warrantyMonths: Number(payload.warrantyMonths ?? 12),
    };
    FALLBACK_PRODUCTS.unshift(mockProduct);
    return {
      success: true,
      data: mockProduct,
      message: 'Tạo sản phẩm thành công (Chế độ mô phỏng offline)!',
    };
  }
}

export async function updateProductApi(id: string, payload: Partial<Product>): Promise<ApiResponse<Product>> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        slug: payload.slug,
        categorySlug: payload.categorySlug,
        brand: payload.brand,
        price: payload.price !== undefined ? Number(payload.price) : undefined,
        originalPrice: payload.originalPrice !== undefined ? Number(payload.originalPrice) : undefined,
        stockQuantity: payload.stock !== undefined ? Number(payload.stock) : undefined,
        thumbnail: payload.thumbnail,
        images: payload.images,
        specs: payload.specs,
        description: payload.description,
        warrantyMonths: payload.warrantyMonths !== undefined ? Number(payload.warrantyMonths) : undefined,
      }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      json.data = normalizeProduct(json.data);
    }
    return json;
  } catch (error: unknown) {
    console.warn('[API] updateProductApi fallback mock:', error);
    const idx = FALLBACK_PRODUCTS.findIndex((p) => p.id === id || p.slug === id);
    if (idx !== -1) {
      FALLBACK_PRODUCTS[idx] = {
        ...FALLBACK_PRODUCTS[idx],
        ...payload,
        price: payload.price !== undefined ? Number(payload.price) : FALLBACK_PRODUCTS[idx].price,
        originalPrice: payload.originalPrice !== undefined ? Number(payload.originalPrice) : FALLBACK_PRODUCTS[idx].originalPrice,
        stock: payload.stock !== undefined ? Number(payload.stock) : FALLBACK_PRODUCTS[idx].stock,
      };
      return {
        success: true,
        data: FALLBACK_PRODUCTS[idx],
        message: 'Cập nhật sản phẩm thành công (Chế độ mô phỏng offline)!',
      };
    }
    return {
      success: false,
      error: 'Không tìm thấy sản phẩm để cập nhật.',
    };
  }
}

export async function deleteProductApi(id: string): Promise<ApiResponse<void>> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return json;
  } catch (error: unknown) {
    console.warn('[API] deleteProductApi fallback mock:', error);
    const idx = FALLBACK_PRODUCTS.findIndex((p) => p.id === id || p.slug === id);
    if (idx !== -1) {
      FALLBACK_PRODUCTS.splice(idx, 1);
      return {
        success: true,
        message: 'Đã xóa sản phẩm thành công (Chế độ mô phỏng offline)!',
      };
    }
    return {
      success: false,
      error: 'Không tìm thấy sản phẩm để xóa.',
    };
  }
}

const LOCAL_STORAGE_ORDERS_KEY = 'bkstore_orders_v1';

function getStoredFallbackOrders(): Order[] {
  if (typeof window === 'undefined') return FALLBACK_ORDERS;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[API] Failed to read orders from localStorage:', err);
  }
  return FALLBACK_ORDERS;
}

function saveStoredFallbackOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch (err) {
    console.warn('[API] Failed to write orders to localStorage:', err);
  }
}

export async function createOrderApi(payload: CreateOrderPayload): Promise<ApiResponse<Order>> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json;
  } catch (error: unknown) {
    console.warn('[API] createOrder fallback mock:', error);
    // Offline / Mock fallback order persisted to localStorage
    const randomCode = `#BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const mappedItems = (payload.items || []).map((it) => {
      const prod = FALLBACK_PRODUCTS.find(
        (p) => p.id === it.productId || p.slug === it.productId
      );
      const unitPrice = prod ? prod.price : 0;
      return {
        productId: prod?.id || it.productId,
        productSlug: prod?.slug || it.productId,
        productName: prod?.name || it.productId,
        quantity: it.quantity,
        unitPrice,
        price: unitPrice,
      };
    });
    const calculatedTotal = mappedItems.reduce(
      (sum, it) => sum + (it.unitPrice || 0) * it.quantity,
      0
    );

    const branchMap: Record<string, string> = {
      'b1000000-0000-0000-0000-000000000001': 'BK-Store Cầu Giấy (Hà Nội)',
      'b1000000-0000-0000-0000-000000000002': 'BK-Store Quận 1 (TP. Hồ Chí Minh)',
      'b1000000-0000-0000-0000-000000000003': 'BK-Store Hải Châu (Đà Nẵng)',
      b1: 'BK-Store Cầu Giấy (Hà Nội)',
      b2: 'BK-Store Quận 1 (TP. Hồ Chí Minh)',
      b3: 'BK-Store Hải Châu (Đà Nẵng)',
    };
    const branchLabel = (payload.branchId && branchMap[payload.branchId]) || 'BK-Store Cầu Giấy (Hà Nội)';

    const mockOrder: Order = {
      id: `ord-${Date.now()}`,
      orderCode: randomCode,
      customerName: payload.customerName,
      phone: payload.phone,
      address: payload.address,
      note: payload.note,
      branchId: payload.branchId,
      branchName: branchLabel,
      totalAmount: calculatedTotal || 35990000,
      paymentMethod: payload.paymentMethod,
      status: 'pending',
      trackingInfo: `Đơn hàng mới tạo — Xuất kho từ chi nhánh ${branchLabel}, đang chờ quản trị viên duyệt kho.`,
      createdAt: new Date().toISOString(),
      items: mappedItems,
    };

    const currentOrders = getStoredFallbackOrders();
    const updatedOrders = [mockOrder, ...currentOrders];
    FALLBACK_ORDERS.splice(0, FALLBACK_ORDERS.length, ...updatedOrders);
    saveStoredFallbackOrders(updatedOrders);

    return {
      success: true,
      message: 'Đặt hàng thành công! (Đã lưu vào bộ nhớ cục bộ)',
      data: mockOrder,
    };
  }
}

export async function trackOrderApi(orderCode: string, phone: string): Promise<ApiResponse<Order>> {
  try {
    const cleanCode = orderCode.trim().replace(/^#/, '');
    const cleanPhone = phone.trim();
    const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(cleanCode)}?phone=${encodeURIComponent(cleanPhone)}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return json;
  } catch {
    const cleanCode = orderCode.trim().replace(/^#/, '').toLowerCase();
    const cleanPhone = phone.trim();
    const stored = getStoredFallbackOrders();
    const found = stored.find(
      (o) =>
        o.orderCode.replace(/^#/, '').toLowerCase() === cleanCode &&
        o.phone.trim() === cleanPhone
    );
    if (found) {
      return {
        success: true,
        data: found,
      };
    }
    return {
      success: false,
      error: 'Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại đã nhập.',
    };
  }
}

// Fallback seed orders for Admin
export const FALLBACK_ORDERS: Order[] = [
  {
    id: 'ord-1024',
    orderCode: '#BK-1024',
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
        price: 31990000,
        unitPrice: 31990000,
        quantity: 1,
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
        price: 34490000,
        unitPrice: 34490000,
        quantity: 1,
      },
      {
        productId: 'p1000000-0000-0000-0000-000000000015',
        productSlug: 'anker-prime-67w-gan-charger',
        productName: 'Củ sạc nhanh Anker 735 GaNPrime 65W (3 Cổng)',
        price: 990000,
        unitPrice: 990000,
        quantity: 1,
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
        price: 2090000,
        unitPrice: 2090000,
        quantity: 1,
      },
    ],
  },
];


export async function fetchAllOrders(status?: string, page = 1, limit = 20): Promise<{
  orders: Order[];
  total: number;
  totalPages: number;
}> {
  try {
    const url = new URL(`${API_BASE_URL}/orders`);
    if (status && status !== 'all') url.searchParams.set('status', status);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('limit', limit.toString());

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return {
          orders: json.data,
          total: json.pagination?.total || json.data.length,
          totalPages: json.pagination?.totalPages || 1,
        };
      }
    }
  } catch (error) {
    console.warn('[API] fetchAllOrders fallback to local seed:', error);
  }

  let list = [...getStoredFallbackOrders()];
  if (status && status !== 'all') {
    list = list.filter((o) => o.status.toLowerCase() === status.toLowerCase());
  }

  return {
    orders: list,
    total: list.length,
    totalPages: 1,
  };
}

export async function updateOrderStatusApi(
  orderCode: string,
  status: string,
  trackingInfo?: string
): Promise<ApiResponse<Order>> {
  try {
    const cleanCode = orderCode.trim().replace(/^#/, '');
    const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(cleanCode)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, trackingInfo }),
    });
    const json = await res.json();
    return json;
  } catch {
    // Persistent localStorage fallback
    const stored = getStoredFallbackOrders();
    const found = stored.find(
      (o) => o.orderCode.replace(/^#/, '').toLowerCase() === orderCode.replace(/^#/, '').toLowerCase()
    );
    if (found) {
      found.status = status as OrderStatus;
      if (trackingInfo) found.trackingInfo = trackingInfo;
      FALLBACK_ORDERS.splice(0, FALLBACK_ORDERS.length, ...stored);
      saveStoredFallbackOrders(stored);
      return { success: true, data: found, message: 'Cập nhật thành công (Đã lưu cục bộ)!' };
    }
    return { success: false, error: 'Không thể kết nối máy chủ để cập nhật.' };
  }
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  chunksCount: number;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  category: string;
  sectionTitle?: string;
  chunkIndex: number;
  content: string;
  embedding?: number[];
}

export interface KnowledgeMetrics {
  documentsCount: number;
  chunksCount: number;
  vectorizedCount: number;
  embedModel: string;
  embeddingDimensions: number;
}

export const FALLBACK_KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    id: 'k1',
    title: 'Chính sách bảo hành tiêu chuẩn và 1 đổi 1 trong 30 ngày',
    category: 'warranty',
    summary: 'Quy định điều kiện đổi mới trong 30 ngày và bảo hành chính hãng 12-24 tháng.',
    content: 'Tất cả sản phẩm bán ra tại BK-Store đều là hàng chính hãng 100% nguyên seal. Khách hàng được đổi mới 1-1 trong 30 ngày đầu tiên nếu máy phát sinh lỗi phần cứng từ nhà sản xuất. Sau 30 ngày, máy được bảo hành miễn phí theo chính sách của hãng tại các trung tâm bảo hành ủy quyền của Apple, Dell, Asus, Samsung, Sony.',
    chunksCount: 4,
    updatedAt: '2026-09-20',
  },
  {
    id: 'k2',
    title: 'Quy trình và phương thức giao hàng toàn quốc',
    category: 'shipping',
    summary: 'Miễn phí giao hàng toàn quốc cho đơn từ 1.000.000₫, giao hỏa tốc 2h nội thành.',
    content: 'BK-Store áp dụng chính sách miễn phí vận chuyển toàn quốc cho tất cả đơn hàng có giá trị từ 1.000.000₫ trở lên. Với các đơn hàng nội thành Hà Nội, TP.HCM và Đà Nẵng, khách hàng có thể chọn hình thức giao hỏa tốc nhận máy trong vòng 2 giờ. Khách hàng được đồng kiểm tra ngoại quan máy trước khi thanh toán COD.',
    chunksCount: 3,
    updatedAt: '2026-09-21',
  },
  {
    id: 'k3',
    title: 'Hướng dẫn thanh toán chuyển khoản tự động qua VietQR',
    category: 'payment',
    summary: 'Cú pháp chuyển khoản chuẩn, ngân hàng thụ hưởng và xác nhận tự động.',
    content: 'Hệ thống hỗ trợ thanh toán qua mã VietQR liên kết 40+ ngân hàng Việt Nam. Khách hàng chỉ cần quét mã QR trên màn hình đặt hàng, hệ thống tự động điền đúng số tiền và nội dung chuyển khoản là Mã đơn hàng (ví dụ #BK-1024). Sau khi chuyển khoản, đơn hàng sẽ được tự động kích hoạt xác nhận trong vòng 1-3 phút.',
    chunksCount: 3,
    updatedAt: '2026-09-21',
  },
  {
    id: 'k4',
    title: 'Tư vấn lựa chọn cấu hình Laptop cho Kỹ sư phần mềm & AI',
    category: 'hardware_guide',
    summary: 'Tiêu chuẩn RAM tối thiểu 32GB, chip M3 Max/Intel Core Ultra và card rời RTX.',
    content: 'Đối với lập trình viên AI & Data Science: Ưu tiên máy có tối thiểu 32GB RAM để chạy các mô hình Local LLM (Ollama, vLLM). Chip Apple M3 Max hoặc laptop Windows trang bị card rời NVIDIA GeForce RTX 4060 trở lên giúp tăng tốc độ huấn luyện mô hình và tính toán ma trận GPU.',
    chunksCount: 5,
    updatedAt: '2026-09-22',
  },
  {
    id: 'k5',
    title: 'Chính sách và hướng dẫn đánh giá sản phẩm thực tế (Verified Reviews)',
    category: 'review_policy',
    summary: 'Chỉ khách hàng đã nhận hàng thành công mới được đánh giá, nhập Mã đơn + SĐT để xác thực.',
    content: 'Chính sách Verified Purchase: Chỉ những đơn hàng đã giao thành công (delivered) mới có quyền viết đánh giá 1-5 sao. Khách hàng nhập Mã đơn và Số điện thoại tại nút Đánh giá trên menu hoặc trong mục Tra cứu vận đơn. Mỗi sản phẩm trong đơn được đánh giá 1 lần và gắn huy hiệu uy tín Đã mua hàng tại BK-Store.',
    chunksCount: 4,
    updatedAt: '2026-10-10',
  },
];

export async function fetchKnowledgeDocuments(): Promise<KnowledgeDoc[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/knowledge`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data;
    }
  } catch (error) {
    console.warn('[API] fetchKnowledgeDocuments fallback to local seed:', error);
  }
  return FALLBACK_KNOWLEDGE_DOCS;
}

export async function fetchKnowledgeMetrics(): Promise<KnowledgeMetrics | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/knowledge/metrics`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
  } catch (error) {
    console.warn('[API] fetchKnowledgeMetrics error:', error);
  }
  return null;
}

export async function fetchDocumentChunks(docId: string): Promise<KnowledgeChunk[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/knowledge/${docId}/chunks`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (error) {
    console.warn('[API] fetchDocumentChunks error:', error);
  }
  return [];
}

export async function searchKnowledgeDocs(query: string, limit = 3): Promise<{
  score: number;
  chunkId: string;
  documentTitle: string;
  sectionTitle?: string;
  content: string;
}[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/knowledge/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (error) {
    console.warn('[API] searchKnowledgeDocs error:', error);
  }
  return [];
}

export interface ChatApiPayload {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  stream?: boolean;
}

export interface ChatApiResponseData {
  reply: string;
  citations: string[];
  cards?: {
    type: 'products' | 'order' | 'inventory' | 'reviews';
    data: any;
  };
  suggestions?: string[];
  toolUsed?: string;
  model: string;
  metrics?: {
    totalResponseTimeMs: number;
    intentDetectionMs: number;
    toolExecutionMs: number;
    ragRetrievalMs: number;
    llmGenerationMs: number;
    detectedIntent: string;
    topRagScore: number;
    ragChunksEvaluated: number;
  };
}

export async function sendChatMessage(payload: ChatApiPayload): Promise<ChatApiResponseData> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Lỗi kết nối máy chủ (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

// Fallback reviews for offline resilience
export const FALLBACK_PRODUCT_REVIEWS: Record<string, Review[]> = {
  'macbook-air-m3-13-16gb-512gb': [
    {
      id: 'rev-fb-1',
      productId: 'p1000000-0000-0000-0000-000000000001',
      productSlug: 'macbook-air-m3-13-16gb-512gb',
      orderCode: '#BK-0812',
      customerName: 'Hoàng Minh Quân',
      rating: 5,
      comment: 'Máy siêu mỏng nhẹ, pin trâu dùng lướt web cả ngày chỉ hết 40%. Bàn phím gõ rất nảy và màn hình cực nét. Đóng gói rất kỹ càng!',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'rev-fb-2',
      productId: 'p1000000-0000-0000-0000-000000000001',
      productSlug: 'macbook-air-m3-13-16gb-512gb',
      orderCode: '#BK-0855',
      customerName: 'Trần Thu Hà',
      rating: 5,
      comment: 'Màu Starlight sang chảnh, chip M3 mở project code chạy mượt mà không nóng máy. Giao hàng hỏa tốc trong 2 giờ rất uy tín.',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ],
};

export async function fetchProductReviews(slug: string): Promise<ProductReviewsData> {
  try {
    const res = await fetch(`${API_BASE_URL}/reviews/product/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
  } catch (error) {
    console.warn('[API] fetchProductReviews fallback:', error);
  }

  const fallbackList = FALLBACK_PRODUCT_REVIEWS[slug] || [];
  const totalReviews = fallbackList.length;
  const averageRating =
    totalReviews > 0
      ? Number((fallbackList.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
      : 5.0;

  return {
    reviews: fallbackList,
    totalReviews,
    averageRating,
    ratingBreakdown: { 5: totalReviews, 4: 0, 3: 0, 2: 0, 1: 0 },
  };
}

export async function fetchOrderReviews(orderCode: string, phone: string): Promise<Review[]> {
  try {
    const cleanCode = orderCode.trim().replace(/^#/, '');
    const cleanPhone = phone.trim();
    const res = await fetch(
      `${API_BASE_URL}/reviews/order/${encodeURIComponent(cleanCode)}?phone=${encodeURIComponent(cleanPhone)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (error) {
    console.warn('[API] fetchOrderReviews error:', error);
  }
  return [];
}

export async function submitProductReview(
  payload: CreateReviewPayload
): Promise<ApiResponse<Review>> {
  try {
    const res = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Lỗi kết nối khi gửi đánh giá.',
    };
  }
}

// ============================================================================
// INVENTORY & WAREHOUSE MANAGEMENT API
// ============================================================================

const localInventoryStockMap = new Map<string, number>();

function getLocalStock(productId: string, branchId: string): number {
  const key = `${productId}:${branchId}`;
  if (!localInventoryStockMap.has(key)) {
    const pIdx = FALLBACK_PRODUCTS.findIndex((p) => p.id === productId);
    const bIdx = FALLBACK_BRANCHES.findIndex((b) => b.id === branchId);
    const initial = pIdx >= 0 && bIdx >= 0 ? ((pIdx * 3 + bIdx * 7) % 8) + 2 : 5;
    localInventoryStockMap.set(key, initial);
  }
  return localInventoryStockMap.get(key) || 0;
}

export async function fetchInventoryOverview(filters?: {
  branchId?: string;
  search?: string;
  status?: string;
  category?: string;
}): Promise<InventoryOverviewData> {
  const queryParams = new URLSearchParams();
  if (filters?.branchId && filters.branchId !== 'all') queryParams.set('branchId', filters.branchId);
  if (filters?.search) queryParams.set('search', filters.search);
  if (filters?.status && filters.status !== 'all') queryParams.set('status', filters.status);
  if (filters?.category && filters.category !== 'all') queryParams.set('category', filters.category);

  try {
    const res = await fetch(`${API_BASE_URL}/inventory?${queryParams.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
  } catch (err) {
    console.warn('[API] fetchInventoryOverview fallback:', err);
  }

  // Fallback in-memory calculation
  let items: ProductInventoryItem[] = FALLBACK_PRODUCTS.map((p) => {
    const branchesStock: BranchStockDetail[] = FALLBACK_BRANCHES.map((b) => {
      const qty = getLocalStock(p.id, b.id);
      let status: 'Còn hàng' | 'Sắp hết hàng' | 'Hết hàng' = 'Còn hàng';
      if (qty === 0) status = 'Hết hàng';
      else if (qty <= 3) status = 'Sắp hết hàng';

      return {
        branchId: b.id,
        branchName: b.name,
        city: b.city,
        address: b.address,
        phone: b.phone,
        quantity: qty,
        status,
      };
    });

    const totalStock = branchesStock.reduce((acc, curr) => acc + curr.quantity, 0);
    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (totalStock === 0) stockStatus = 'out_of_stock';
    else if (totalStock <= 5 || branchesStock.some((b) => b.quantity <= 2)) stockStatus = 'low_stock';

    return {
      productId: p.id,
      productName: p.name,
      productSlug: p.slug,
      brand: p.brand,
      thumbnail: p.thumbnail,
      categoryName: p.categoryName || p.categorySlug || 'Công nghệ',
      categorySlug: p.categorySlug || 'laptop',
      price: p.price,
      totalStock,
      stockStatus,
      branchesStock,
    };
  });

  if (filters?.category && filters.category !== 'all') {
    items = items.filter((item) => item.categorySlug === filters.category);
  }
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    items = items.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.productSlug.toLowerCase().includes(q)
    );
  }
  if (filters?.status && filters.status !== 'all') {
    items = items.filter((item) => item.stockStatus === filters.status);
  }
  if (filters?.branchId && filters.branchId !== 'all') {
    items = items.map((item) => ({
      ...item,
      branchesStock: item.branchesStock.filter((b) => b.branchId === filters.branchId),
    }));
  }

  const allItemsStock = FALLBACK_PRODUCTS.map((p) => {
    const total = FALLBACK_BRANCHES.reduce((sum, b) => sum + getLocalStock(p.id, b.id), 0);
    return total;
  });

  const totalStockUnits = allItemsStock.reduce((sum, val) => sum + val, 0);
  const totalProducts = FALLBACK_PRODUCTS.length;
  const lowStockCount = allItemsStock.filter((t) => t > 0 && t <= 5).length;
  const outOfStockCount = allItemsStock.filter((t) => t === 0).length;

  const branchSummaries = FALLBACK_BRANCHES.map((b) => {
    let bUnits = 0;
    let bLow = 0;
    let bOut = 0;

    FALLBACK_PRODUCTS.forEach((p) => {
      const q = getLocalStock(p.id, b.id);
      bUnits += q;
      if (q === 0) bOut++;
      else if (q <= 3) bLow++;
    });

    return {
      branchId: b.id,
      branchName: b.name,
      city: b.city,
      totalUnits: bUnits,
      lowStockCount: bLow,
      outOfStockCount: bOut,
    };
  });

  return {
    summary: {
      totalStockUnits,
      totalProducts,
      lowStockCount,
      outOfStockCount,
      branchSummaries,
    },
    branches: FALLBACK_BRANCHES,
    items,
  };
}

export async function updateInventoryStock(
  payload: UpdateInventoryPayload
): Promise<ApiResponse<any>> {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success) return json;
    throw new Error(json.error || 'Lỗi cập nhật tồn kho');
  } catch (err: any) {
    console.warn('[API] updateInventoryStock fallback:', err);
    localInventoryStockMap.set(`${payload.productId}:${payload.branchId}`, payload.quantity);
    return {
      success: true,
      message: 'Cập nhật số lượng tồn kho thành công (Offline Mode).',
      data: payload,
    };
  }
}

export async function transferInventoryStock(
  payload: TransferStockPayload
): Promise<ApiResponse<any>> {
  try {
    const res = await fetch(`${API_BASE_URL}/inventory/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success) return json;
    throw new Error(json.error || 'Lỗi chuyển kho');
  } catch (err: any) {
    console.warn('[API] transferInventoryStock fallback:', err);
    const fromKey = `${payload.productId}:${payload.fromBranchId}`;
    const toKey = `${payload.productId}:${payload.toBranchId}`;
    const currentFrom = getLocalStock(payload.productId, payload.fromBranchId);
    if (currentFrom < payload.quantity) {
      return {
        success: false,
        error: `Kho xuất chỉ còn ${currentFrom} sản phẩm, không đủ ${payload.quantity} để chuyển.`,
      };
    }
    const currentTo = getLocalStock(payload.productId, payload.toBranchId);
    localInventoryStockMap.set(fromKey, currentFrom - payload.quantity);
    localInventoryStockMap.set(toKey, currentTo + payload.quantity);
    return {
      success: true,
      message: `Chuyển kho thành công: đã điều chuyển ${payload.quantity} thiết bị.`,
      data: payload,
    };
  }
}

// ============================================================================
// AUTHENTICATION & USER PROFILE API
// ============================================================================

export async function loginApi(payload: LoginPayload): Promise<ApiResponse<AuthResponse>> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success && json.data?.token) {
      setAuthToken(json.data.token);
    }
    return json;
  } catch {
    // Offline / Mock fallback
    const normalized = payload.email.toLowerCase().trim();
    if (normalized === 'khachhang@bkstore.vn' && payload.password === '123456') {
      const mockCustomer: User = {
        id: 'u-customer-001',
        name: 'Nguyễn Văn An',
        email: 'khachhang@bkstore.vn',
        phone: '0912345678',
        address: 'Số 18 Hoàng Quốc Việt, Phường Nghĩa Đô, Cầu Giấy, Hà Nội',
        role: 'customer',
        createdAt: '2026-09-01T08:00:00.000Z',
      };
      setAuthToken('mock-jwt-customer-token');
      return {
        success: true,
        data: { user: mockCustomer, token: 'mock-jwt-customer-token' },
        message: 'Đăng nhập thành công (Chế độ mô phỏng offline)!',
      };
    }
    if (normalized === 'admin@bkstore.vn' && payload.password === 'admin123') {
      const mockAdmin: User = {
        id: 'u-admin-001',
        name: 'Quản Trị Viên BK-Store',
        email: 'admin@bkstore.vn',
        phone: '0988889999',
        address: '268 Cầu Giấy, Hà Nội',
        role: 'admin',
        createdAt: '2026-09-01T08:00:00.000Z',
      };
      setAuthToken('mock-jwt-admin-token');
      return {
        success: true,
        data: { user: mockAdmin, token: 'mock-jwt-admin-token' },
        message: 'Đăng nhập thành công (Quản trị viên offline)!',
      };
    }
    return {
      success: false,
      error: 'Email hoặc mật khẩu không chính xác.',
    };
  }
}

export async function registerApi(payload: RegisterPayload): Promise<ApiResponse<AuthResponse>> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success && json.data?.token) {
      setAuthToken(json.data.token);
    }
    return json;
  } catch {
    // Offline / Mock fallback
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      address: payload.address?.trim() || '',
      role: 'customer',
      createdAt: new Date().toISOString(),
    };
    const mockToken = `mock-jwt-${newUser.id}`;
    setAuthToken(mockToken);
    return {
      success: true,
      data: { user: newUser, token: mockToken },
      message: 'Đăng ký thành công (Chế độ offline)!',
    };
  }
}

export async function fetchMeApi(): Promise<ApiResponse<User>> {
  const token = getAuthToken();
  if (!token) return { success: false, error: 'Chưa đăng nhập' };

  if (token === 'mock-jwt-admin-token') {
    return {
      success: true,
      data: {
        id: 'u-admin-001',
        name: 'Quản Trị Viên BK-Store',
        email: 'admin@bkstore.vn',
        phone: '0988889999',
        address: '268 Cầu Giấy, Hà Nội',
        role: 'admin',
        createdAt: '2026-09-01T08:00:00.000Z',
      },
    };
  }

  if (token === 'mock-jwt-customer-token' || token.startsWith('mock-jwt-')) {
    return {
      success: true,
      data: {
        id: 'u-customer-001',
        name: 'Nguyễn Văn An',
        email: 'khachhang@bkstore.vn',
        phone: '0912345678',
        address: 'Số 18 Hoàng Quốc Việt, Phường Nghĩa Đô, Cầu Giấy, Hà Nội',
        role: 'customer',
        createdAt: '2026-09-01T08:00:00.000Z',
      },
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return json;
  } catch {
    return { success: false, error: 'Lỗi kết nối máy chủ.' };
  }
}

export async function updateProfileApi(payload: Partial<User>): Promise<ApiResponse<User>> {
  try {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Lỗi kết nối khi cập nhật thông tin.',
    };
  }
}

export async function fetchMyOrdersApi(): Promise<ApiResponse<Order[]>> {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Chưa đăng nhập');

    const res = await fetch(`${API_BASE_URL}/orders/my-orders`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json;
    }
    throw new Error(json.error || 'Lỗi khi tải lịch sử đơn hàng');
  } catch (err) {
    console.warn('[API] fetchMyOrdersApi fallback:', err);
    // Offline fallback: load from stored orders
    const stored = getStoredFallbackOrders();
    return {
      success: true,
      data: stored,
    };
  }
}






