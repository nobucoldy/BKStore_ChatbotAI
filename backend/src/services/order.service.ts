import { pool, checkDbConnection } from '../config/db';
import { sampleOrders as fallbackOrders } from '../db/seedData';
import { readLocalDb, writeLocalDb } from '../db/localStore';
import { CreateOrderInput } from '../schemas/order.schema';
import { findProductByIdOrSlug, deductStockInMemory } from './product.service';
import {
  resolveBranchInMemory,
  getBranchStockForProductInMemory,
  deductBranchStockForOrderInMemory,
} from './inventory.service';

// Persistent local store for orders when running without PostgreSQL
const persistedOrders = readLocalDb().orders;
export const inMemoryOrders: any[] =
  Array.isArray(persistedOrders) && persistedOrders.length > 0
    ? persistedOrders
    : [...fallbackOrders];

const generateOrderCode = (): string => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `#BK-${randomNum}`;
};

export const createOrder = async (input: CreateOrderInput) => {
  const orderCode = generateOrderCode();
  const isDbConnected = await checkDbConnection();

  if (!isDbConnected) {
    // In-memory / Local DB fallback
    let totalAmount = 0;
    const itemsWithDetails: any[] = [];
    const requestedBranch = input.branchId ? resolveBranchInMemory(input.branchId) : null;

    if (input.branchId && !requestedBranch) {
      throw new Error(`Chi nhánh xuất kho "${input.branchId}" không tồn tại.`);
    }

    // Step 1: Validate stock for all items first
    for (const item of input.items) {
      const prod = findProductByIdOrSlug(item.productId);
      if (!prod) {
        throw new Error(`Sản phẩm với ID/Slug "${item.productId}" không tồn tại.`);
      }
      const availableStock = prod.stockQuantity !== undefined ? prod.stockQuantity : (prod.stock !== undefined ? prod.stock : 10);
      if (item.quantity > availableStock) {
        throw new Error(
          `Sản phẩm "${prod.name}" chỉ còn ${availableStock} máy trong kho, không đủ số lượng bạn đặt (${item.quantity} máy).`
        );
      }

      if (requestedBranch) {
        const branchStock = getBranchStockForProductInMemory(prod.id, requestedBranch.id);
        if (item.quantity > branchStock) {
          throw new Error(
            `Kho "${requestedBranch.name}" chỉ còn ${branchStock} máy "${prod.name}", không đủ số lượng bạn đặt (${item.quantity} máy). Vui lòng chọn chi nhánh khác!`
          );
        }
      }

      const itemTotal = prod.price * item.quantity;
      totalAmount += itemTotal;
      itemsWithDetails.push({
        productId: prod.id,
        productSlug: prod.slug,
        productName: prod.name,
        quantity: item.quantity,
        unitPrice: prod.price,
        price: prod.price,
      });
    }

    // Step 2: Deduct in-memory product total stock + branch warehouse stock
    let fulfilledBranch = requestedBranch
      ? { branchId: requestedBranch.id, branchName: requestedBranch.name, city: requestedBranch.city }
      : null;

    for (const item of itemsWithDetails) {
      deductStockInMemory(item.productId, item.quantity);
      const deductedBranch = deductBranchStockForOrderInMemory(
        item.productId,
        item.quantity,
        requestedBranch?.id
      );
      if (!fulfilledBranch) {
        fulfilledBranch = deductedBranch;
      }
    }

    const branchLabel = fulfilledBranch?.branchName || 'Kho trung tâm BK-Store';

    const newOrder = {
      id: `order-${Date.now()}`,
      orderCode,
      customerName: input.customerName,
      phone: input.phone,
      address: input.address,
      note: input.note || '',
      branchId: fulfilledBranch?.branchId,
      branchName: branchLabel,
      totalAmount,
      paymentMethod: input.paymentMethod,
      status: 'pending',
      trackingInfo: `Đơn hàng mới tạo — Xuất kho từ chi nhánh ${branchLabel}, đang chờ quản trị viên duyệt kho.`,
      createdAt: new Date().toISOString(),
      items: itemsWithDetails,
    };

    inMemoryOrders.unshift(newOrder);
    writeLocalDb({ orders: inMemoryOrders });
    return newOrder;
  }

  // Database transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let calculatedTotal = 0;
    const itemsToInsert: { productId: string; productSlug: string; productName: string; quantity: number; unitPrice: number; price: number }[] = [];
    let selectedBranchName = 'Kho trung tâm BK-Store';
    let resolvedBranchId: string | null = null;

    if (input.branchId) {
      const bRes = await client.query(
        'SELECT id, name FROM branches WHERE id::text = $1 OR LOWER(city) LIKE LOWER($2) OR LOWER(name) LIKE LOWER($2) LIMIT 1',
        [input.branchId, `%${input.branchId}%`]
      );
      if (bRes.rows.length > 0) {
        resolvedBranchId = bRes.rows[0].id;
        selectedBranchName = bRes.rows[0].name;
      }
    }

    for (const item of input.items) {
      // Find product by id or slug with row lock
      const pRes = await client.query(
        'SELECT id, slug, name, price, stock_quantity FROM products WHERE id::text = $1 OR slug = $1 FOR UPDATE',
        [item.productId]
      );
      if (pRes.rows.length === 0) {
        throw new Error(`Sản phẩm với ID/Slug "${item.productId}" không tồn tại.`);
      }

      const product = pRes.rows[0];
      const availableStock = parseInt(product.stock_quantity ?? 0, 10);
      if (item.quantity > availableStock) {
        throw new Error(
          `Sản phẩm "${product.name}" chỉ còn ${availableStock} máy trong kho, không đủ số lượng bạn đặt (${item.quantity} máy).`
        );
      }

      if (resolvedBranchId) {
        const invRes = await client.query(
          'SELECT quantity FROM inventories WHERE product_id = $1 AND branch_id = $2 FOR UPDATE',
          [product.id, resolvedBranchId]
        );
        const branchQty = parseInt(invRes.rows[0]?.quantity ?? 0, 10);
        if (item.quantity > branchQty) {
          throw new Error(
            `Kho "${selectedBranchName}" chỉ còn ${branchQty} máy "${product.name}", không đủ số lượng bạn đặt (${item.quantity} máy). Vui lòng chọn chi nhánh khác!`
          );
        }
      }

      const unitPrice = parseFloat(product.price);
      calculatedTotal += unitPrice * item.quantity;

      itemsToInsert.push({
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        price: unitPrice,
      });
    }

    // Deduct stock for all items
    for (const item of itemsToInsert) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.productId]
      );
      if (resolvedBranchId) {
        await client.query(
          'UPDATE inventories SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 AND branch_id = $3',
          [item.quantity, item.productId, resolvedBranchId]
        );
      }
    }

    const trackingText = `Đơn hàng mới tạo — Xuất kho từ chi nhánh ${selectedBranchName}, đang chờ quản trị viên duyệt kho.`;

    const orderRes = await client.query(
      `INSERT INTO orders (
        order_code, customer_name, phone, address, note,
        total_amount, payment_method, status, tracking_info
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
      RETURNING *`,
      [
        orderCode,
        input.customerName,
        input.phone,
        input.address,
        input.note || null,
        calculatedTotal,
        input.paymentMethod,
        trackingText,
      ]
    );

    const createdOrder = orderRes.rows[0];

    for (const item of itemsToInsert) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [createdOrder.id, item.productId, item.productName, item.quantity, item.unitPrice]
      );
    }

    await client.query('COMMIT');

    return {
      ...createdOrder,
      branchId: resolvedBranchId,
      branchName: selectedBranchName,
      items: itemsToInsert,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export interface OrderFilterOptions {
  status?: string;
  page?: number;
  limit?: number;
}

const normalizeOrderItemsInMemory = (items: any[]) => {
  return (items || []).map((it: any) => {
    const matchedProd = findProductByIdOrSlug(
      it.productId || it.productSlug || it.productName || ''
    );
    const unitPrice = Number(it.unitPrice ?? it.price ?? matchedProd?.price ?? 0);
    return {
      ...it,
      productId: it.productId || matchedProd?.id || it.productSlug,
      productSlug: it.productSlug || matchedProd?.slug || it.productId,
      productName: it.productName || matchedProd?.name || it.productSlug || 'Thiết bị công nghệ',
      quantity: Number(it.quantity || 1),
      unitPrice,
      price: unitPrice,
    };
  });
};

export const getAllOrders = async (options: OrderFilterOptions = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
  const offset = (page - 1) * limit;

  const isDbConnected = await checkDbConnection();
  if (!isDbConnected) {
    let filtered = inMemoryOrders.map((o, idx) => ({
      ...o,
      id: o.id || `ord-${o.orderCode.replace(/^#/, '') || idx}`,
      createdAt: o.createdAt || new Date(Date.now() - 3600000 * (idx + 1) * 6).toISOString(),
      totalAmount: Number(o.totalAmount || 0),
      items: normalizeOrderItemsInMemory(o.items),
    }));

    if (options.status && options.status !== 'all') {
      filtered = filtered.filter((o) => o.status.toLowerCase() === options.status?.toLowerCase());
    }
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);
    return {
      orders: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }


  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (options.status && options.status !== 'all') {
    conditions.push(`o.status = $${paramIdx++}`);
    params.push(options.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(o.id)::int as total FROM orders o ${whereClause}`;
  const countRes = await pool.query(countQuery, params);
  const total = countRes.rows[0].total;

  const dataQuery = `
    SELECT 
      o.id, o.order_code as "orderCode", o.customer_name as "customerName",
      o.phone, o.address, o.note, o.total_amount as "totalAmount",
      o.payment_method as "paymentMethod", o.status, o.tracking_info as "trackingInfo",
      o.created_at as "createdAt",
      COALESCE(
        json_agg(
          json_build_object(
            'productId', COALESCE(oi.product_id, p.id),
            'productSlug', p.slug,
            'productName', oi.product_name,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'price', oi.unit_price
          )
        ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
      ) as items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON (p.id = oi.product_id OR LOWER(p.name) = LOWER(oi.product_name))
    ${whereClause}
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  params.push(limit, offset);

  const dataRes = await pool.query(dataQuery, params);
  return {
    orders: dataRes.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getOrderByCodeAndPhone = async (orderCode: string, phone: string) => {
  // Normalize order code (ensure leading # if missing)
  const normalizedCode = orderCode.startsWith('#') ? orderCode : `#${orderCode}`;
  const isDbConnected = await checkDbConnection();

  if (!isDbConnected) {
    const order = inMemoryOrders.find(
      (o) =>
        o.orderCode.toLowerCase() === normalizedCode.toLowerCase() &&
        o.phone.trim() === phone.trim()
    );
    if (!order) return null;
    return {
      ...order,
      items: normalizeOrderItemsInMemory(order.items),
    };
  }

  const query = `
    SELECT 
      o.id, o.order_code as "orderCode", o.customer_name as "customerName",
      o.phone, o.address, o.note, o.total_amount as "totalAmount",
      o.payment_method as "paymentMethod", o.status, o.tracking_info as "trackingInfo",
      o.created_at as "createdAt",
      COALESCE(
        json_agg(
          json_build_object(
            'productId', COALESCE(oi.product_id, p.id),
            'productSlug', p.slug,
            'productName', oi.product_name,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'price', oi.unit_price
          )
        ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
      ) as items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON (p.id = oi.product_id OR LOWER(p.name) = LOWER(oi.product_name))
    WHERE LOWER(o.order_code) = LOWER($1) AND o.phone = $2
    GROUP BY o.id
  `;

  const res = await pool.query(query, [normalizedCode, phone.trim()]);
  return res.rows[0] || null;
};

export const getOrderByCode = async (orderCode: string) => {
  const normalizedCode = orderCode.startsWith('#') ? orderCode : `#${orderCode}`;
  const isDbConnected = await checkDbConnection();

  if (!isDbConnected) {
    const order = inMemoryOrders.find(
      (o) => o.orderCode.toLowerCase() === normalizedCode.toLowerCase()
    );
    if (!order) return null;
    return {
      ...order,
      items: normalizeOrderItemsInMemory(order.items),
    };
  }

  const query = `
    SELECT 
      o.id, o.order_code as "orderCode", o.customer_name as "customerName",
      o.phone, o.address, o.note, o.total_amount as "totalAmount",
      o.payment_method as "paymentMethod", o.status, o.tracking_info as "trackingInfo",
      o.created_at as "createdAt",
      COALESCE(
        json_agg(
          json_build_object(
            'productId', COALESCE(oi.product_id, p.id),
            'productSlug', p.slug,
            'productName', oi.product_name,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'price', oi.unit_price
          )
        ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
      ) as items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON (p.id = oi.product_id OR LOWER(p.name) = LOWER(oi.product_name))
    WHERE LOWER(o.order_code) = LOWER($1)
    GROUP BY o.id
  `;

  const res = await pool.query(query, [normalizedCode]);
  return res.rows[0] || null;
};

export const getOrdersByPhone = async (phone: string) => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 7) return [];

  const isDbConnected = await checkDbConnection();
  if (!isDbConnected) {
    return inMemoryOrders
      .filter((o) => {
        const p = (o.phone || '').replace(/[^0-9]/g, '');
        return p.includes(cleanPhone) || cleanPhone.includes(p);
      })
      .map((o) => ({
        ...o,
        items: normalizeOrderItemsInMemory(o.items),
      }));
  }

  const query = `
    SELECT 
      o.id, o.order_code as "orderCode", o.customer_name as "customerName",
      o.phone, o.address, o.note, o.total_amount as "totalAmount",
      o.payment_method as "paymentMethod", o.status, o.tracking_info as "trackingInfo",
      o.created_at as "createdAt",
      COALESCE(
        json_agg(
          json_build_object(
            'productId', COALESCE(oi.product_id, p.id),
            'productSlug', p.slug,
            'productName', oi.product_name,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'price', oi.unit_price
          )
        ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
      ) as items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON (p.id = oi.product_id OR LOWER(p.name) = LOWER(oi.product_name))
    WHERE o.phone LIKE $1
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  const res = await pool.query(query, [`%${cleanPhone}%`]);
  return res.rows;
};

export const updateOrderStatus = async (
  orderCode: string,
  status: string,
  trackingInfo?: string
) => {
  const normalizedCode = orderCode.startsWith('#') ? orderCode : `#${orderCode}`;
  const isDbConnected = await checkDbConnection();

  if (!isDbConnected) {
    const order = inMemoryOrders.find(
      (o) => o.orderCode.toLowerCase() === normalizedCode.toLowerCase()
    );
    if (!order) return null;
    order.status = status;
    if (trackingInfo) order.trackingInfo = trackingInfo;
    writeLocalDb({ orders: inMemoryOrders });
    return order;
  }

  const query = `
    UPDATE orders
    SET 
      status = $1,
      tracking_info = COALESCE($2, tracking_info),
      updated_at = CURRENT_TIMESTAMP
    WHERE LOWER(order_code) = LOWER($3)
    RETURNING *
  `;

  const res = await pool.query(query, [status, trackingInfo || null, normalizedCode]);
  return res.rows[0] || null;
};
