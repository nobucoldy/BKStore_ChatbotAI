import { SchemaType } from '@google/generative-ai';
import { pool, checkDbConnection } from '../config/db';
import { branches as fallbackBranches, products as seedProducts, sampleOrders } from '../db/seedData';
import { getProducts, getProductBySlug, slugify } from './product.service';
import { getOrderByCode, getOrdersByPhone } from './order.service';
import { getReviewsByProduct } from './review.service';

/**
 * Định dạng tiền tệ VNĐ chuẩn
 */
export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

/**
 * Chuẩn hóa chuỗi tiếng Việt để tìm kiếm không dấu
 */
export const normalizeText = (text: string): string => {
  return slugify(text).replace(/-/g, ' ');
};

// ============================================================================
// 1. TOOL: KIỂM TRA TỒN KHO TẠI CÁC CHI NHÁNH (checkInventory)
// ============================================================================

export interface CheckInventoryParams {
  productName: string;
  branchName?: string;
}

export interface BranchStockItem {
  branchId: string;
  branchName: string;
  city: string;
  address: string;
  phone: string;
  quantity: number;
  status: 'Còn hàng' | 'Sắp hết hàng' | 'Hết hàng';
}

export interface InventoryCheckResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    slug: string;
    brand: string;
    price: number;
    formattedPrice: string;
    thumbnail: string;
  };
  branches: BranchStockItem[];
  totalStock: number;
  queriedBranch?: string;
  message: string;
}

export const checkInventory = async (params: CheckInventoryParams): Promise<InventoryCheckResult> => {
  const { productName, branchName } = params;
  if (!productName || !productName.trim()) {
    return {
      found: false,
      branches: [],
      totalStock: 0,
      message: 'Vui lòng cung cấp tên sản phẩm để kiểm tra tồn kho.',
    };
  }

  // 1. Tìm sản phẩm phù hợp nhất theo tên / từ khóa
  const cleanQuery = normalizeText(productName);
  let matchedProduct = seedProducts.find((p) => {
    const pNameNorm = normalizeText(p.name);
    const pSlugNorm = normalizeText(p.slug);
    const pBrandNorm = normalizeText(p.brand);
    return (
      pNameNorm.includes(cleanQuery) ||
      pSlugNorm.includes(cleanQuery) ||
      cleanQuery.split(' ').every((w) => pNameNorm.includes(w) || pBrandNorm.includes(w))
    );
  });

  // Nếu không tìm thấy trong seed, tìm qua getProducts
  if (!matchedProduct) {
    const searchRes = await getProducts({ search: productName, limit: 1 });
    if (searchRes.products && searchRes.products.length > 0) {
      matchedProduct = searchRes.products[0] as any;
    }
  }

  if (!matchedProduct) {
    return {
      found: false,
      branches: [],
      totalStock: 0,
      message: `Rất tiếc, BK-Store không tìm thấy sản phẩm nào khớp với từ khóa "${productName}". Bạn có thể thử tìm với tên ngắn gọn hơn (ví dụ: "MacBook M3", "iPhone 16", "S24 Ultra").`,
    };
  }

  // 2. Lấy thông tin chi tiết kèm tồn kho từng chi nhánh
  const productDetail = await getProductBySlug(matchedProduct.slug);
  let branchesStock: BranchStockItem[] = [];

  if (productDetail && productDetail.inventories && productDetail.inventories.length > 0) {
    branchesStock = productDetail.inventories.map((inv: any) => {
      const branchInfo = fallbackBranches.find((b) => b.id === inv.branchId || b.name === inv.branchName);
      const qty = Number(inv.quantity) || 0;
      let status: 'Còn hàng' | 'Sắp hết hàng' | 'Hết hàng' = 'Còn hàng';
      if (qty === 0) status = 'Hết hàng';
      else if (qty <= 3) status = 'Sắp hết hàng';

      return {
        branchId: inv.branchId || branchInfo?.id || '',
        branchName: inv.branchName || branchInfo?.name || '',
        city: inv.city || branchInfo?.city || '',
        address: inv.address || branchInfo?.address || '',
        phone: branchInfo?.phone || '1800 6868',
        quantity: qty,
        status,
      };
    });
  } else {
    // Fallback phân bổ đều theo seedBranches
    branchesStock = fallbackBranches.map((b, idx) => {
      const qty = ((idx + 2) * 3) % 10 + 2;
      return {
        branchId: b.id,
        branchName: b.name,
        city: b.city,
        address: b.address,
        phone: b.phone,
        quantity: qty,
        status: qty <= 3 ? 'Sắp hết hàng' : 'Còn hàng',
      };
    });
  }

  // 3. Nếu người dùng chỉ định chi nhánh cụ thể (ví dụ: "Cầu Giấy", "Hà Nội", "Quận 1", "Đà Nẵng")
  let filteredBranches = branchesStock;
  if (branchName && branchName.trim() && branchName.toLowerCase() !== 'tất cả' && branchName.toLowerCase() !== 'all') {
    const targetNorm = normalizeText(branchName);
    filteredBranches = branchesStock.filter((b) => {
      const bNameNorm = normalizeText(b.branchName);
      const bCityNorm = normalizeText(b.city);
      const bAddressNorm = normalizeText(b.address);
      return (
        bNameNorm.includes(targetNorm) ||
        bCityNorm.includes(targetNorm) ||
        bAddressNorm.includes(targetNorm)
      );
    });
    // Nếu lọc không ra chi nhánh nào khớp, trả về toàn bộ chi nhánh kèm lưu ý
    if (filteredBranches.length === 0) {
      filteredBranches = branchesStock;
    }
  }

  const totalStock = filteredBranches.reduce((sum, b) => sum + b.quantity, 0);

  return {
    found: true,
    product: {
      id: matchedProduct.id,
      name: matchedProduct.name,
      slug: matchedProduct.slug,
      brand: matchedProduct.brand,
      price: Number(matchedProduct.price),
      formattedPrice: formatVND(Number(matchedProduct.price)),
      thumbnail: matchedProduct.thumbnail,
    },
    branches: filteredBranches,
    totalStock,
    queriedBranch: branchName,
    message:
      totalStock > 0
        ? `Sản phẩm "${matchedProduct.name}" hiện đang CÒN HÀNG (tổng cộng ${totalStock} máy sẵn sàng phục vụ).`
        : `Sản phẩm "${matchedProduct.name}" hiện tạm thời HẾT HÀNG tại chi nhánh được yêu cầu.`,
  };
};

// ============================================================================
// 2. TOOL: TRA CỨU ĐƠN HÀNG (trackOrder)
// ============================================================================

export interface TrackOrderParams {
  orderCode: string;
  phone?: string;
}

export interface OrderTrackResult {
  found: boolean;
  orderCode?: string;
  customerName?: string;
  maskedPhone?: string;
  deliveryAddress?: string;
  totalAmount?: number;
  formattedTotal?: string;
  paymentMethod?: string;
  status?: string;
  statusLabel?: string;
  trackingInfo?: string;
  branchName?: string;
  items?: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    formattedUnitPrice: string;
  }>;
  canReview?: boolean;
  reviewEligibilityNote?: string;
  message: string;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận & chuẩn bị hàng',
  processing: 'Đang đóng gói tại kho',
  shipping: 'Đang trên đường giao hàng',
  delivered: 'Giao hàng thành công',
  cancelled: 'Đã hủy',
};

const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 4) + '***' + phone.slice(-3);
};

const maskName = (name: string): string => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length <= 1) return name;
  return `${parts[0]} *** ${parts[parts.length - 1]}`;
};

export const trackOrder = async (params: TrackOrderParams): Promise<OrderTrackResult> => {
  const { orderCode, phone } = params;

  if ((!orderCode || !orderCode.trim()) && (!phone || !phone.trim())) {
    return {
      found: false,
      message: 'Vui lòng cung cấp mã đơn hàng (ví dụ: #BK-1024 hoặc 1024) hoặc số điện thoại dùng khi đặt hàng để em kiểm tra kho xuất hàng và tiến trình giao hàng giúp mình nhé.',
    };
  }

  let orderData: any = null;

  // 1. Tra cứu theo mã đơn hàng
  if (orderCode && orderCode.trim()) {
    let cleanCode = orderCode.trim();
    if (!cleanCode.startsWith('#')) {
      if (cleanCode.toUpperCase().startsWith('BK-')) {
        cleanCode = `#${cleanCode.toUpperCase()}`;
      } else {
        cleanCode = `#BK-${cleanCode}`;
      }
    }

    // Tra cứu qua order.service (truy vấn DB hoặc inMemoryOrders)
    orderData = await getOrderByCode(cleanCode);

    // Fallback qua sampleOrders nếu chưa có
    if (!orderData) {
      orderData = sampleOrders.find(
        (o) => o.orderCode.toLowerCase() === cleanCode.toLowerCase()
      );
    }

    // Nếu khách có nhập kèm số điện thoại, kiểm tra khớp
    if (orderData && phone && phone.trim()) {
      const cleanInputPhone = phone.replace(/[^0-9]/g, '');
      const cleanOrderPhone = (orderData.phone || '').replace(/[^0-9]/g, '');
      if (cleanInputPhone.length >= 4 && !cleanOrderPhone.endsWith(cleanInputPhone.slice(-4))) {
        return {
          found: false,
          message: `Mã đơn hàng "${cleanCode}" tồn tại, nhưng số điện thoại bạn cung cấp không trùng khớp với số điện thoại nhận hàng. Vui lòng kiểm tra lại.`,
        };
      }
    }
  }

  // 2. Tra cứu theo số điện thoại nếu chưa tìm thấy qua mã đơn hoặc khách chỉ nhập số điện thoại
  if (!orderData && phone && phone.trim()) {
    const ordersByPhone = await getOrdersByPhone(phone);
    if (ordersByPhone && ordersByPhone.length > 0) {
      orderData = ordersByPhone[0]; // Lấy đơn hàng mới nhất
    } else {
      const cleanInputPhone = phone.replace(/[^0-9]/g, '');
      orderData = sampleOrders.find((o) =>
        (o.phone || '').replace(/[^0-9]/g, '').includes(cleanInputPhone)
      );
    }
  }

  if (!orderData) {
    const queryTerm = orderCode ? `mã "${orderCode}"` : `số điện thoại "${phone}"`;
    return {
      found: false,
      message: `Không tìm thấy đơn hàng nào khớp với ${queryTerm}. Quý khách vui lòng kiểm tra lại mã đơn hàng trong email/tin nhắn xác nhận, hoặc kiểm tra lại số điện thoại đặt hàng nhé.`,
    };
  }

  // Chuẩn hóa danh sách sản phẩm trong đơn
  const items = Array.isArray(orderData.items) ? orderData.items : [];
  const formattedItems = items.map((it: any) => {
    let name = it.productName;
    if (!name && it.productSlug) {
      const prod = seedProducts.find((p) => p.slug === it.productSlug);
      name = prod ? prod.name : it.productSlug;
    }
    return {
      productName: name || 'Sản phẩm công nghệ BK-Store',
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      formattedUnitPrice: formatVND(Number(it.unitPrice) || 0),
    };
  });

  const total = Number(orderData.totalAmount) || 0;
  const statusKey = (orderData.status || 'pending').toLowerCase();
  const statusLabel = ORDER_STATUS_LABELS[statusKey] || 'Đang xử lý';

  let branchName = orderData.branchName;
  if (!branchName) {
    const combinedContext = normalizeText(`${orderData.trackingInfo || ''} ${orderData.address || ''}`);
    if (combinedContext.includes('da nang') || combinedContext.includes('hai chau')) {
      branchName = 'BK-Store Hải Châu (Đà Nẵng)';
    } else if (
      combinedContext.includes('ho chi minh') ||
      combinedContext.includes('hcm') ||
      combinedContext.includes('sai gon') ||
      combinedContext.includes('binh thanh') ||
      combinedContext.includes('tan binh') ||
      combinedContext.includes('quan 1')
    ) {
      branchName = 'BK-Store Quận 1 (TP. Hồ Chí Minh)';
    } else {
      branchName = 'BK-Store Cầu Giấy (Hà Nội)';
    }
  }

  return {
    found: true,
    orderCode: orderData.orderCode,
    customerName: maskName(orderData.customerName),
    maskedPhone: maskPhone(orderData.phone),
    deliveryAddress: orderData.address || 'Giao hàng tận nơi',
    branchName,
    totalAmount: total,
    formattedTotal: formatVND(total),
    paymentMethod:
      orderData.paymentMethod === 'COD'
        ? 'Thanh toán tiền mặt khi nhận hàng (COD)'
        : orderData.paymentMethod === 'QR_PAY'
        ? 'Thanh toán chuyển khoản VietQR'
        : orderData.paymentMethod || 'Thanh toán khi nhận hàng',
    status: statusKey,
    statusLabel,
    trackingInfo:
      orderData.trackingInfo ||
      `Đơn hàng đang ở trạng thái "${statusLabel}". Xuất kho từ chi nhánh ${branchName}.`,
    items: formattedItems,
    canReview: statusKey === 'delivered',
    reviewEligibilityNote:
      statusKey === 'delivered'
        ? 'Đơn hàng này đã giao thành công! Quý khách có thể gửi đánh giá cho sản phẩm bằng cách bấm vào nút "⭐ Đánh giá" trên Header/Footer hoặc trong mục Tra cứu vận đơn.'
        : `Đơn hàng đang ở trạng thái "${statusLabel}". Theo chính sách của BK-Store, chỉ những đơn hàng đã giao thành công (delivered) mới có thể viết đánh giá sản phẩm.`,
    message: `Đơn hàng ${orderData.orderCode} được xuất từ kho **${branchName}**, hiện đang ở trạng thái: "${statusLabel}". ${orderData.trackingInfo || ''}`,
  };
};

// ============================================================================
// 3. TOOL: TÌM KIẾM & LỌC SẢN PHẨM THEO TÚI TIỀN/NHU CẦU (filterProducts)
// ============================================================================

export interface FilterProductsParams {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  keyword?: string;
  useCase?: 'sinh_vien' | 'lap_trinh' | 'gaming_dohoa' | 'van_phong' | string;
  limit?: number;
}

export interface ProductSummaryItem {
  id: string;
  name: string;
  slug: string;
  brand: string;
  price: number;
  originalPrice?: number;
  formattedPrice: string;
  formattedOriginalPrice?: string;
  discountPercent?: number;
  thumbnail: string;
  specsSummary: string;
  inStock: boolean;
}

export interface ProductFilterResult {
  totalMatches: number;
  products: ProductSummaryItem[];
  appliedFilters: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    keyword?: string;
    useCase?: string;
  };
  advice?: string;
}

export const filterProducts = async (params: FilterProductsParams): Promise<ProductFilterResult> => {
  const { category, minPrice, maxPrice, brand, keyword, useCase, limit = 4 } = params;

  // Chuẩn hóa category
  let mappedCategory = category;
  if (category) {
    const cNorm = normalizeText(category);
    if (cNorm.includes('laptop') || cNorm.includes('may tinh') || cNorm.includes('macbook')) {
      mappedCategory = 'laptop';
    } else if (cNorm.includes('dien thoai') || cNorm.includes('smartphone') || cNorm.includes('iphone')) {
      mappedCategory = 'smartphone';
    } else if (cNorm.includes('phu kien') || cNorm.includes('tai nghe') || cNorm.includes('chuot') || cNorm.includes('sac')) {
      mappedCategory = 'accessory';
    }
  } else if (useCase) {
    mappedCategory = 'laptop';
  }

  // Gọi getProducts từ service
  const res = await getProducts({
    category: mappedCategory,
    brand,
    minPrice,
    maxPrice,
    search: keyword,
    limit: 15,
  });

  let rawProducts = [...(res.products || [])];

  // Sắp xếp ưu tiên theo nhu cầu sử dụng (useCase)
  if (useCase === 'sinh_vien' || useCase === 'van_phong') {
    const priorityOrder = ['zenbook', 'macbook-air', 'predator', 'xps', 'thinkpad'];
    rawProducts.sort((a: any, b: any) => {
      const idxA = priorityOrder.findIndex((k) => (a.slug || '').includes(k));
      const idxB = priorityOrder.findIndex((k) => (b.slug || '').includes(k));
      const scoreA = idxA === -1 ? 99 : idxA;
      const scoreB = idxB === -1 ? 99 : idxB;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return Number(a.price) - Number(b.price);
    });
  } else if (useCase === 'lap_trinh') {
    const priorityOrder = ['macbook-pro', 'zephyrus', 'thinkpad', 'macbook-air', 'legion', 'predator'];
    rawProducts.sort((a: any, b: any) => {
      const idxA = priorityOrder.findIndex((k) => (a.slug || '').includes(k));
      const idxB = priorityOrder.findIndex((k) => (b.slug || '').includes(k));
      const scoreA = idxA === -1 ? 99 : idxA;
      const scoreB = idxB === -1 ? 99 : idxB;
      return scoreA - scoreB;
    });
  } else if (useCase === 'gaming_dohoa') {
    const priorityOrder = ['predator', 'zephyrus', 'legion', 'macbook-pro'];
    rawProducts.sort((a: any, b: any) => {
      const idxA = priorityOrder.findIndex((k) => (a.slug || '').includes(k));
      const idxB = priorityOrder.findIndex((k) => (b.slug || '').includes(k));
      const scoreA = idxA === -1 ? 99 : idxA;
      const scoreB = idxB === -1 ? 99 : idxB;
      return scoreA - scoreB;
    });
  }

  const slicedProducts = rawProducts.slice(0, Math.min(10, limit));

  const productsList: ProductSummaryItem[] = slicedProducts.map((p: any) => {
    const price = Number(p.price);
    const origPrice = p.originalPrice || p.original_price ? Number(p.originalPrice || p.original_price) : undefined;
    const discount = origPrice && origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : undefined;

    // Tóm tắt cấu hình nổi bật
    let specsSummary = '';
    if (p.specs && typeof p.specs === 'object') {
      const parts: string[] = [];
      if (p.specs.cpu) parts.push(p.specs.cpu);
      if (p.specs.ram) parts.push(`RAM ${p.specs.ram}`);
      if (p.specs.storage) parts.push(p.specs.storage);
      if (p.specs.gpu) parts.push(p.specs.gpu);
      if (p.specs.screen) parts.push(p.specs.screen);
      specsSummary = parts.slice(0, 3).join(' • ');
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      price,
      originalPrice: origPrice,
      formattedPrice: formatVND(price),
      formattedOriginalPrice: origPrice ? formatVND(origPrice) : undefined,
      discountPercent: discount,
      thumbnail: p.thumbnail,
      images: p.images && p.images.length > 0 ? p.images : [p.thumbnail],
      specs: p.specs || {},
      description: p.description || '',
      stock: p.stockQuantity ?? p.stock ?? 10,
      specsSummary: specsSummary || p.description?.slice(0, 100) || '',
      inStock: (p.stockQuantity ?? p.stock ?? 10) > 0,
    };
  });

  let advice = '';
  if (useCase === 'sinh_vien' || useCase === 'van_phong') {
    advice = `Đối với nhu cầu **Sinh viên & Dân văn phòng**, BK-Store khuyến nghị ưu tiên máy có **tối thiểu 16GB RAM**, ổ cứng **512GB SSD**, trọng lượng mỏng nhẹ (**1.1kg – 1.4kg**) và pin bền bỉ (8–18 tiếng) để tiện mang lên giảng đường (hoặc chọn dòng có card rời RTX nếu học Kỹ thuật/Đồ họa). Đặc biệt, BK-Store hỗ trợ **trả góp 0% lãi suất cho sinh viên chỉ cần CCCD** (duyệt trong 15 phút)!`;
  } else if (useCase === 'lap_trinh') {
    advice = `Đối với **Sinh viên CNTT, Kỹ sư Phần mềm & Lập trình viên (Web/Mobile/AI)**, BK-Store khuyến nghị chọn CPU đa nhân hiệu năng cao (**Apple M3 / M3 Pro, Ryzen 9 hoặc Intel Core Ultra 7**), **RAM từ 16GB – 18GB trở lên** và SSD PCIe 4.0 tốc độ cao để biên dịch code, chạy Docker và máy ảo mượt mà.`;
  } else if (useCase === 'gaming_dohoa') {
    advice = `Đối với nhu cầu **Chơi Game (Gaming), Thiết kế Đồ họa 2D/3D, Kiến trúc & Dựng Video**, BK-Store khuyến nghị chọn máy trang bị card đồ họa rời **NVIDIA GeForce RTX 4050 / RTX 4060**, màn hình chuẩn màu **100% sRGB / OLED 120Hz–165Hz** và tản nhiệt kép công suất lớn.`;
  } else if (productsList.length > 0) {
    advice = `Tìm thấy ${res.pagination?.total || productsList.length} sản phẩm phù hợp tại BK-Store. Tất cả đều là hàng chính hãng 100%, bảo hành 1 đổi 1 trong 30 ngày.`;
  } else {
    advice = `Chưa tìm thấy sản phẩm nào khớp hoàn toàn với khoảng giá hoặc tiêu chí này. Bạn có thể mở rộng khoảng ngân sách hoặc liên hệ hotline 1800 6868 để được nhân viên tư vấn dòng máy khác.`;
  }

  return {
    totalMatches: res.pagination?.total || productsList.length,
    products: productsList,
    appliedFilters: {
      category: mappedCategory,
      brand,
      minPrice,
      maxPrice,
      keyword,
      useCase,
    },
    advice,
  };
};

// ============================================================================
// 4. TOOL: CHI TIẾT SẢN PHẨM & CẤU HÌNH ĐẦY ĐỦ (getProductDetails)
// ============================================================================

export interface ProductDetailResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    slug: string;
    brand: string;
    price: number;
    originalPrice?: number;
    formattedPrice: string;
    formattedOriginalPrice?: string;
    specs: Record<string, string>;
    description: string;
    warrantyMonths: number;
    thumbnail: string;
    images: string[];
    inStock: boolean;
    stockQuantity: number;
  };
  message: string;
}

export const getProductDetails = async (productIdentifier: string): Promise<ProductDetailResult> => {
  if (!productIdentifier || !productIdentifier.trim()) {
    return { found: false, message: 'Vui lòng cung cấp tên hoặc mã sản phẩm.' };
  }

  const normId = normalizeText(productIdentifier);

  // Tìm theo slug trước
  let prod = await getProductBySlug(productIdentifier.trim().toLowerCase());

  // Nếu không thấy, tìm theo tên gần đúng 2 chiều hoặc phân tích từ khóa
  if (!prod) {
    const found = seedProducts.find((p) => {
      const pNameNorm = normalizeText(p.name);
      const pSlugNorm = normalizeText(p.slug);
      return (
        pNameNorm.includes(normId) ||
        normId.includes(pNameNorm) ||
        pSlugNorm.includes(normId) ||
        normId.includes(pSlugNorm) ||
        pNameNorm.split(' ').slice(0, 3).every((w) => normId.includes(w))
      );
    });
    if (found) {
      prod = await getProductBySlug(found.slug);
    }
  }

  if (!prod) {
    // Thử tìm theo brand + category
    const foundByBrand = seedProducts.find((p) => {
      const pBrand = normalizeText(p.brand);
      const pNameWords = normalizeText(p.name).split(' ');
      return normId.includes(pBrand) && pNameWords.some((w) => w.length > 3 && normId.includes(w));
    });
    if (foundByBrand) {
      prod = await getProductBySlug(foundByBrand.slug);
    }
  }

  if (!prod) {
    return {
      found: false,
      message: `Không tìm thấy chi tiết sản phẩm "${productIdentifier}" tại BK-Store.`,
    };
  }

  const price = Number(prod.price);
  const origPrice = prod.originalPrice || prod.original_price ? Number(prod.originalPrice || prod.original_price) : undefined;

  return {
    found: true,
    product: {
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      brand: prod.brand,
      price,
      originalPrice: origPrice,
      formattedPrice: formatVND(price),
      formattedOriginalPrice: origPrice ? formatVND(origPrice) : undefined,
      specs: prod.specs || {},
      description: prod.description || '',
      warrantyMonths: prod.warrantyMonths || prod.warranty_months || 12,
      thumbnail: prod.thumbnail,
      images: prod.images || [prod.thumbnail],
      inStock: (prod.stockQuantity ?? prod.stock ?? 10) > 0,
      stockQuantity: prod.stockQuantity ?? prod.stock ?? 10,
    },
    message: `Đã lấy đầy đủ thông số kỹ thuật của "${prod.name}".`,
  };
};

// ============================================================================
// 5. TOOL: TRA CỨU ĐÁNH GIÁ SẢN PHẨM TỪ NGƯỜI ĐÃ MUA (getProductReviews)
// ============================================================================

export interface GetProductReviewsParams {
  productName: string;
}

export interface ProductReviewsResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    slug: string;
    brand: string;
    price: number;
    formattedPrice: string;
    thumbnail: string;
  };
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: Record<number, number>;
  reviews: Array<{
    id: string;
    customerName: string;
    phone: string;
    rating: number;
    comment: string;
    orderCode: string;
    createdAt: string;
  }>;
  howToReview: string;
  message: string;
}

export const getProductReviewsTool = async (params: GetProductReviewsParams): Promise<ProductReviewsResult> => {
  const { productName } = params;
  if (!productName || !productName.trim()) {
    return {
      found: false,
      totalReviews: 0,
      averageRating: 5.0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      reviews: [],
      howToReview: 'Vui lòng cung cấp tên sản phẩm để tra cứu đánh giá.',
      message: 'Vui lòng cung cấp tên sản phẩm để tra cứu đánh giá.',
    };
  }

  const cleanQuery = normalizeText(productName);
  let matchedProduct = seedProducts.find((p) => {
    const pNameNorm = normalizeText(p.name);
    const pSlugNorm = normalizeText(p.slug);
    const pSlugClean = pSlugNorm.replace(/-/g, ' ');
    const pBrandNorm = normalizeText(p.brand);
    if (
      pNameNorm.includes(cleanQuery) ||
      cleanQuery.includes(pNameNorm) ||
      pSlugClean.includes(cleanQuery) ||
      cleanQuery.includes(pSlugClean)
    ) {
      return true;
    }
    const queryWords = cleanQuery.split(' ').filter((w) => w.length >= 2);
    return (
      queryWords.length >= 2 &&
      queryWords.every((w) => pNameNorm.includes(w) || pBrandNorm.includes(w) || pSlugClean.includes(w))
    );
  });

  if (!matchedProduct) {
    const searchRes = await getProducts({ search: productName, limit: 1 });
    if (searchRes.products && searchRes.products.length > 0) {
      matchedProduct = searchRes.products[0] as any;
    }
  }

  if (!matchedProduct) {
    return {
      found: false,
      totalReviews: 0,
      averageRating: 5.0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      reviews: [],
      howToReview: 'Để đánh giá sản phẩm: Quý khách bấm vào nút "⭐ Đánh giá" trên Header/Footer và nhập Mã đơn hàng cùng Số điện thoại của đơn hàng đã giao thành công.',
      message: `Không tìm thấy sản phẩm khớp với "${productName}" để tra cứu đánh giá. Quý khách có thể xem đánh giá trực tiếp trên trang chi tiết từng sản phẩm tại website.`,
    };
  }

  const reviewsData = await getReviewsByProduct(matchedProduct.slug);
  const howToReview = `Để gửi đánh giá cho sản phẩm "${matchedProduct.name}": Sau khi nhận máy thành công (đơn hàng trạng thái delivered), quý khách bấm vào nút "⭐ Đánh giá" trên menu hoặc trong mục Tra cứu vận đơn và nhập Mã đơn hàng cùng Số điện thoại để gửi đánh giá từ 1 đến 5 sao.`;

  return {
    found: true,
    product: {
      id: matchedProduct.id,
      name: matchedProduct.name,
      slug: matchedProduct.slug,
      brand: matchedProduct.brand,
      price: matchedProduct.price,
      formattedPrice: formatVND(matchedProduct.price),
      thumbnail: matchedProduct.thumbnail,
    },
    totalReviews: reviewsData.totalReviews,
    averageRating: reviewsData.averageRating,
    ratingBreakdown: reviewsData.ratingBreakdown,
    reviews: reviewsData.reviews.slice(0, 3),
    howToReview,
    message: `Sản phẩm "${matchedProduct.name}" hiện có ${reviewsData.totalReviews} lượt đánh giá thực tế từ người đã mua hàng với điểm trung bình ${reviewsData.averageRating}/5 sao.`,
  };
};

// ============================================================================
// 6. TOOL: KIỂM TRA ĐIỀU KIỆN ĐÁNH GIÁ ĐƠN HÀNG (checkReviewEligibility)
// ============================================================================

export interface CheckReviewEligibilityParams {
  orderCode: string;
  phone?: string;
}

export const checkReviewEligibilityTool = async (params: CheckReviewEligibilityParams) => {
  const ord = await trackOrder({ orderCode: params.orderCode, phone: params.phone });
  if (!ord.found) {
    return {
      found: false,
      canReview: false,
      message: ord.message,
    };
  }

  const isDelivered = ord.status === 'delivered';
  return {
    found: true,
    orderCode: ord.orderCode,
    status: ord.status,
    statusLabel: ord.statusLabel,
    canReview: isDelivered,
    items: ord.items,
    message: isDelivered
      ? `Đơn hàng ${ord.orderCode} đã giao hàng thành công! Quý khách ĐỦ ĐIỀU KIỆN gửi đánh giá cho các sản phẩm trong đơn. Quý khách có thể bấm nút "⭐ Đánh giá" trên website hoặc vào Tra cứu vận đơn để gửi đánh giá từ 1 đến 5 sao kèm nhận xét trải nghiệm.`
      : `Đơn hàng ${ord.orderCode} hiện đang ở trạng thái "${ord.statusLabel}". Theo chính sách BK-Store, chỉ những đơn hàng đã giao thành công (delivered) mới có thể gửi đánh giá sản phẩm nhằm đảm bảo tính khách quan và trải nghiệm thực tế. Quý khách vui lòng chờ nhận hàng thành công để trải nghiệm và đánh giá nhé!`,
  };
};

// ============================================================================
// GEMINI TOOL DECLARATIONS (Khai báo công cụ cho Google Gemini AI)
// ============================================================================

export const geminiFunctionDeclarations = [
  {
    name: 'checkInventory',
    description:
      'Kiểm tra số lượng hàng tồn kho thực tế của một sản phẩm tại 3 chi nhánh cửa hàng BK-Store (Cầu Giấy - Hà Nội, Quận 1 - TP.HCM, Hải Châu - Đà Nẵng). Dùng khi khách hỏi máy còn hàng không, có sẵn ở showroom nào.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productName: {
          type: SchemaType.STRING,
          description: 'Tên hoặc từ khóa sản phẩm khách muốn kiểm tra (ví dụ: "MacBook Air M3", "iPhone 16 Pro Max", "Logitech MX Master 3S").',
        },
        branchName: {
          type: SchemaType.STRING,
          description: 'Tên hoặc địa điểm chi nhánh muốn hỏi (ví dụ: "Cầu Giấy", "Hà Nội", "Quận 1", "Hồ Chí Minh", "Hải Châu", "Đà Nẵng", hoặc bỏ trống để tra cứu tất cả chi nhánh).',
        },
      },
      required: ['productName'],
    },
  },
  {
    name: 'trackOrder',
    description:
      'Tra cứu tiến trình vận chuyển, tình trạng đơn hàng, người nhận và danh sách sản phẩm theo mã đơn hàng BK-Store (ví dụ: #BK-1024, #BK-2048, #BK-3072).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderCode: {
          type: SchemaType.STRING,
          description: 'Mã đơn hàng khách cần tra cứu (ví dụ: "#BK-1024", "BK-1024", "1024").',
        },
        phone: {
          type: SchemaType.STRING,
          description: 'Số điện thoại đặt hàng của khách để đối soát bảo mật (nếu khách cung cấp).',
        },
      },
      required: ['orderCode'],
    },
  },
  {
    name: 'filterProducts',
    description:
      'Tìm kiếm và lọc danh sách sản phẩm trong kho BK-Store theo tầm giá ngân sách (minPrice, maxPrice), phân loại danh mục (laptop, smartphone, accessory) hoặc thương hiệu (Apple, Asus, Dell, Lenovo, Acer, Samsung, Xiaomi, Sony, Logitech, Anker).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          description: 'Danh mục sản phẩm: "laptop", "smartphone", hoặc "accessory".',
        },
        minPrice: {
          type: SchemaType.NUMBER,
          description: 'Ngân sách tối thiểu bằng VNĐ (ví dụ: 20000000 cho 20 triệu).',
        },
        maxPrice: {
          type: SchemaType.NUMBER,
          description: 'Ngân sách tối đa bằng VNĐ (ví dụ: 35000000 cho 35 triệu).',
        },
        brand: {
          type: SchemaType.STRING,
          description: 'Thương hiệu sản phẩm (ví dụ: Apple, Asus, Dell, Lenovo, Samsung, Sony...).',
        },
        keyword: {
          type: SchemaType.STRING,
          description: 'Từ khóa nhu cầu đặc thù (ví dụ: "OLED", "gaming", "AI", "chống ồn", "pin trâu").',
        },
        limit: {
          type: SchemaType.INTEGER,
          description: 'Số lượng sản phẩm muốn hiển thị (mặc định 4).',
        },
      },
    },
  },
  {
    name: 'getProductDetails',
    description:
      'Lấy cấu hình chi tiết (CPU, GPU, RAM, Ổ cứng, Màn hình, Pin), chính sách bảo hành và hình ảnh đầy đủ của một sản phẩm công nghệ cụ thể khi khách quan tâm sâu.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productIdentifier: {
          type: SchemaType.STRING,
          description: 'Slug hoặc tên sản phẩm cụ thể (ví dụ: "macbook-air-m3-13-16gb-512gb", "iPhone 16 Pro Max").',
        },
      },
      required: ['productIdentifier'],
    },
  },
  {
    name: 'getProductReviews',
    description:
      'Tra cứu đánh giá thực tế, số sao trung bình (1-5★) và bình luận trải nghiệm của những khách hàng đã mua một sản phẩm công nghệ cụ thể tại BK-Store. Dùng khi khách hỏi sản phẩm này được mấy sao, khách hàng khen chê gì, đánh giá ra sao.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productName: {
          type: SchemaType.STRING,
          description: 'Tên hoặc từ khóa sản phẩm muốn tra cứu đánh giá (ví dụ: "MacBook Air M3", "iPhone 16 Pro Max", "Sony WH-1000XM5").',
        },
      },
      required: ['productName'],
    },
  },
  {
    name: 'checkReviewEligibility',
    description:
      'Kiểm tra xem một đơn hàng cụ thể đã đủ điều kiện để viết đánh giá sản phẩm hay chưa (chỉ đơn hàng delivered đã giao thành công mới được đánh giá).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderCode: {
          type: SchemaType.STRING,
          description: 'Mã đơn hàng cần kiểm tra (ví dụ: "#BK-1024", "BK-2048").',
        },
        phone: {
          type: SchemaType.STRING,
          description: 'Số điện thoại đặt hàng (nếu có).',
        },
      },
      required: ['orderCode'],
    },
  },
];

export const geminiToolsConfig = [
  {
    functionDeclarations: geminiFunctionDeclarations,
  },
];

/**
 * Trình điều phối thực thi Tool (Tool Dispatcher)
 * Nhận tên function và arguments từ Gemini, tự động gọi đúng hàm logic và trả kết quả.
 */
export const executeAiTool = async (toolName: string, toolArgs: any): Promise<any> => {
  try {
    switch (toolName) {
      case 'checkInventory':
        return await checkInventory({
          productName: toolArgs.productName || toolArgs.product_name,
          branchName: toolArgs.branchName || toolArgs.branch_name,
        });

      case 'trackOrder':
        return await trackOrder({
          orderCode: toolArgs.orderCode || toolArgs.order_code,
          phone: toolArgs.phone,
        });

      case 'filterProducts':
        return await filterProducts({
          category: toolArgs.category,
          minPrice: toolArgs.minPrice ?? toolArgs.min_price,
          maxPrice: toolArgs.maxPrice ?? toolArgs.max_price,
          brand: toolArgs.brand,
          keyword: toolArgs.keyword,
          limit: toolArgs.limit,
        });

      case 'getProductDetails':
        return await getProductDetails(
          toolArgs.productIdentifier || toolArgs.product_identifier || toolArgs.productSlug || toolArgs.slug || ''
        );

      case 'getProductReviews':
        return await getProductReviewsTool({
          productName: toolArgs.productName || toolArgs.product_name || toolArgs.productIdentifier || '',
        });

      case 'checkReviewEligibility':
        return await checkReviewEligibilityTool({
          orderCode: toolArgs.orderCode || toolArgs.order_code,
          phone: toolArgs.phone,
        });

      default:
        return {
          error: true,
          message: `Không tìm thấy công cụ "${toolName}" được hỗ trợ trên hệ thống.`,
        };
    }
  } catch (err: any) {
    console.error(`❌ [AI-Tool Error] Lỗi khi thực thi ${toolName}:`, err);
    return {
      error: true,
      message: `Đã xảy ra lỗi khi thực thi tra cứu: ${err.message}`,
    };
  }
};
