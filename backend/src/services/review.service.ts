import { pool, checkDbConnection } from '../config/db';
import { readLocalDb, writeLocalDb } from '../db/localStore';
import { CreateReviewInput } from '../schemas/review.schema';
import { getOrderByCodeAndPhone } from './order.service';
import { findProductByIdOrSlug } from './product.service';

export interface ReviewRecord {
  id: string;
  productId: string;
  productSlug: string;
  orderId?: string;
  orderCode: string;
  customerName: string;
  phone: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// Initial sample reviews for rich UX
const defaultReviews: ReviewRecord[] = [
  {
    id: 'rev-init-1',
    productId: 'p1000000-0000-0000-0000-000000000001',
    productSlug: 'macbook-air-m3-13-16gb-512gb',
    orderCode: '#BK-0812',
    customerName: 'Hoàng Minh Quân',
    phone: '0981122334',
    rating: 5,
    comment: 'Máy siêu mỏng nhẹ, pin trâu dùng lướt web cả ngày chỉ hết 40%. Bàn phím gõ rất nảy và màn hình cực nét. Đóng gói rất kỹ càng!',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'rev-init-2',
    productId: 'p1000000-0000-0000-0000-000000000001',
    productSlug: 'macbook-air-m3-13-16gb-512gb',
    orderCode: '#BK-0855',
    customerName: 'Trần Thu Hà',
    phone: '0972334455',
    rating: 5,
    comment: 'Màu Starlight sang chảnh, chip M3 mở project code chạy mượt mà không nóng máy. Giao hàng hỏa tốc trong 2 giờ rất uy tín.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'rev-init-3',
    productId: 'p1000000-0000-0000-0000-000000000008',
    productSlug: 'iphone-16-pro-max-256gb',
    orderCode: '#BK-0790',
    customerName: 'Vũ Quốc Bảo',
    phone: '0933445566',
    rating: 5,
    comment: 'Viền titan tự nhiên cầm rất nhẹ tay, nút Camera Control chụp ảnh nhanh rất tiện. Màn hình 120Hz mượt mà và camera zoom 5x sắc nét.',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'rev-init-4',
    productId: 'p1000000-0000-0000-0000-000000000011',
    productSlug: 'sony-wh-1000xm5-black',
    orderCode: '#BK-0677',
    customerName: 'Đặng Mai Phương',
    phone: '0966778899',
    rating: 5,
    comment: 'Khả năng chống ồn tuyệt đối, đeo đi cà phê hoặc máy bay không nghe thấy tiếng ồn xung quanh. Đệm tai êm ái đeo nhiều giờ không đau.',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'rev-init-5',
    productId: 'p1000000-0000-0000-0000-000000000013',
    productSlug: 'logitech-mx-master-3s',
    orderCode: '#BK-0544',
    customerName: 'Lê Tuấn Hưng',
    phone: '0944556677',
    rating: 5,
    comment: 'Chuột công thái học số 1 cho dân văn phòng và coder, cuộn vô cực MagSpeed cực mượt và click cực kỳ êm không gây tiếng ồn.',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
];

const persistedReviews = readLocalDb().reviews;
export const inMemoryReviews: ReviewRecord[] =
  Array.isArray(persistedReviews) && persistedReviews.length > 0
    ? persistedReviews
    : [...defaultReviews];

export const createReview = async (input: CreateReviewInput) => {
  const normalizedCode = input.orderCode.trim().startsWith('#')
    ? input.orderCode.trim()
    : `#${input.orderCode.trim()}`;
  const phone = input.phone.trim();

  // 1. Verify order exists and phone matches
  const order = await getOrderByCodeAndPhone(normalizedCode, phone);
  if (!order) {
    const error: any = new Error(
      `Không tìm thấy đơn hàng "${normalizedCode}" hoặc số điện thoại "${phone}" không khớp với người đặt.`
    );
    error.status = 404;
    throw error;
  }

  // 2. Verify order status is 'delivered'
  if (order.status !== 'delivered') {
    const statusTextMap: Record<string, string> = {
      pending: 'Chờ duyệt',
      confirmed: 'Đã xác nhận',
      shipping: 'Đang vận chuyển',
      cancelled: 'Đã bị hủy',
    };
    const currentStatusText = statusTextMap[order.status] || order.status;
    const error: any = new Error(
      `Đơn hàng "${normalizedCode}" đang ở trạng thái "${currentStatusText}". Theo chính sách bảo mật của BK-Store, chỉ những đơn hàng đã giao thành công (delivered) mới có thể thực hiện đánh giá sản phẩm.`
    );
    error.status = 400;
    throw error;
  }

  // 3. Resolve product ID and Slug
  const isDbConnected = await checkDbConnection();
  let product = findProductByIdOrSlug(input.productId);
  if (!product && isDbConnected) {
    const pRes = await pool.query(
      'SELECT id, slug, name FROM products WHERE id::text = $1 OR LOWER(slug) = LOWER($1) OR LOWER(name) = LOWER($1) LIMIT 1',
      [input.productId]
    );
    if (pRes.rows.length > 0) {
      product = pRes.rows[0];
    }
  }
  const targetSlug = product ? product.slug : input.productId;
  const targetId = product ? String(product.id) : input.productId;

  // 4. Verify product belongs to this order
  const orderItems = order.items || [];
  const hasProductInOrder = orderItems.some((it: any) => {
    return (
      (Boolean(it.productSlug) && (it.productSlug === targetSlug || it.productSlug === input.productId)) ||
      (Boolean(it.productId) && (String(it.productId) === String(targetId) || String(it.productId) === input.productId)) ||
      (Boolean(it.productName) && product?.name && it.productName.toLowerCase() === product.name.toLowerCase()) ||
      (Boolean(it.productName) && it.productName.toLowerCase() === input.productId.toLowerCase())
    );
  });

  if (!hasProductInOrder) {
    const error: any = new Error(
      `Sản phẩm "${product?.name || input.productId}" không nằm trong danh sách mua của đơn hàng "${normalizedCode}".`
    );
    error.status = 400;
    throw error;
  }

  // 5. Check if review already exists for this order & product
  if (!isDbConnected) {
    const existing = inMemoryReviews.find(
      (r) =>
        r.orderCode.toLowerCase() === normalizedCode.toLowerCase() &&
        ((Boolean(r.productSlug) && Boolean(targetSlug) && r.productSlug === targetSlug) ||
          (Boolean(r.productId) && Boolean(targetId) && String(r.productId) === String(targetId)))
    );
    if (existing) {
      const error: any = new Error(
        `Bạn đã gửi đánh giá cho sản phẩm này trong đơn hàng "${normalizedCode}" rồi.`
      );
      error.status = 400;
      throw error;
    }

    const newReview: ReviewRecord = {
      id: `rev-${Date.now()}`,
      productId: targetId,
      productSlug: targetSlug,
      orderId: order.id,
      orderCode: normalizedCode,
      customerName: order.customerName,
      phone: order.phone,
      rating: input.rating,
      comment: input.comment.trim(),
      createdAt: new Date().toISOString(),
    };

    inMemoryReviews.unshift(newReview);
    writeLocalDb({ reviews: inMemoryReviews });
    return newReview;
  }

  // Database mode
  const checkRes = await pool.query(
    'SELECT id FROM reviews WHERE LOWER(order_code) = LOWER($1) AND (product_slug = $2 OR product_id::text = $3)',
    [normalizedCode, targetSlug, targetId]
  );
  if (checkRes.rows.length > 0) {
    const error: any = new Error(
      `Bạn đã gửi đánh giá cho sản phẩm này trong đơn hàng "${normalizedCode}" rồi.`
    );
    error.status = 400;
    throw error;
  }

  const insertQuery = `
    INSERT INTO reviews (product_id, product_slug, order_id, order_code, customer_name, phone, rating, comment)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING 
      id, product_id as "productId", product_slug as "productSlug",
      order_id as "orderId", order_code as "orderCode",
      customer_name as "customerName", phone, rating, comment,
      created_at as "createdAt"
  `;

  const insertRes = await pool.query(insertQuery, [
    targetId,
    targetSlug,
    order.id,
    normalizedCode,
    order.customerName,
    order.phone,
    input.rating,
    input.comment.trim(),
  ]);

  return insertRes.rows[0];
};

export const getReviewsByProduct = async (productIdOrSlug: string) => {
  const isDbConnected = await checkDbConnection();

  let reviews: ReviewRecord[] = [];

  if (!isDbConnected) {
    reviews = inMemoryReviews.filter(
      (r) =>
        r.productSlug.toLowerCase() === productIdOrSlug.toLowerCase() ||
        r.productId === productIdOrSlug
    );
  } else {
    const query = `
      SELECT 
        id, product_id as "productId", product_slug as "productSlug",
        order_id as "orderId", order_code as "orderCode",
        customer_name as "customerName", phone, rating, comment,
        created_at as "createdAt"
      FROM reviews
      WHERE LOWER(product_slug) = LOWER($1) OR product_id::text = $1
      ORDER BY created_at DESC
    `;
    const res = await pool.query(query, [productIdOrSlug]);
    reviews = res.rows;
  }

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
      : 5.0;

  const ratingBreakdown: Record<number, number> = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  for (const r of reviews) {
    if (ratingBreakdown[r.rating] !== undefined) {
      ratingBreakdown[r.rating]++;
    }
  }

  // Mask phone number for public privacy, e.g. 0912***678
  const safeReviews = reviews.map((r) => {
    const p = r.phone || '';
    const maskedPhone =
      p.length >= 7 ? `${p.slice(0, 4)}***${p.slice(-3)}` : '09******';
    return {
      ...r,
      phone: maskedPhone,
    };
  });

  return {
    reviews: safeReviews,
    totalReviews,
    averageRating,
    ratingBreakdown,
  };
};

export const getReviewsByOrder = async (orderCode: string, phone: string) => {
  const normalizedCode = orderCode.trim().startsWith('#')
    ? orderCode.trim()
    : `#${orderCode.trim()}`;
  const cleanPhone = phone.trim();

  // Validate order existence and phone
  const order = await getOrderByCodeAndPhone(normalizedCode, cleanPhone);
  if (!order) {
    const error: any = new Error(
      `Không tìm thấy đơn hàng "${normalizedCode}" hoặc số điện thoại không khớp.`
    );
    error.status = 404;
    throw error;
  }

  const isDbConnected = await checkDbConnection();

  if (!isDbConnected) {
    const orderReviews = inMemoryReviews.filter(
      (r) => r.orderCode.toLowerCase() === normalizedCode.toLowerCase()
    );
    return orderReviews;
  }

  const query = `
    SELECT 
      id, product_id as "productId", product_slug as "productSlug",
      order_id as "orderId", order_code as "orderCode",
      customer_name as "customerName", rating, comment,
      created_at as "createdAt"
    FROM reviews
    WHERE LOWER(order_code) = LOWER($1)
    ORDER BY created_at DESC
  `;
  const res = await pool.query(query, [normalizedCode]);
  return res.rows;
};
