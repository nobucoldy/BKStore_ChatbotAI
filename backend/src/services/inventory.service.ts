import { pool, checkDbConnection } from '../config/db';
import { readLocalDb, writeLocalDb } from '../db/localStore';
import {
  products as fallbackProducts,
  branches as fallbackBranches,
  categories as fallbackCategories,
} from '../db/seedData';
import { normalizeText } from './ai-tools.service';

export interface BranchStockDetail {
  branchId: string;
  branchName: string;
  city: string;
  address: string;
  phone: string;
  quantity: number;
  status: 'Còn hàng' | 'Sắp hết hàng' | 'Hết hàng';
  updatedAt?: string;
}

export interface ProductInventoryItem {
  productId: string;
  productName: string;
  productSlug: string;
  brand: string;
  thumbnail: string;
  categoryName: string;
  categorySlug: string;
  price: number;
  totalStock: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  branchesStock: BranchStockDetail[];
}

export interface BranchSummary {
  branchId: string;
  branchName: string;
  city: string;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryOverviewSummary {
  totalStockUnits: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  branchSummaries: BranchSummary[];
}

export interface InventoryFilters {
  branchId?: string;
  search?: string;
  status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  category?: string;
}

// In-memory state for fallback mode
const inMemoryInventoryMap = new Map<string, { quantity: number; updatedAt: string }>();

function saveInventoryToLocalDb(): void {
  const serialized: Record<string, number> = {};
  inMemoryInventoryMap.forEach((val, key) => {
    serialized[key] = val.quantity;
  });
  writeLocalDb({ inventory: serialized });
}

function initInMemoryInventory(): void {
  if (inMemoryInventoryMap.size === 0) {
    const persistedInv = readLocalDb().inventory || {};
    fallbackProducts.forEach((p, pIdx) => {
      fallbackBranches.forEach((b, bIdx) => {
        const key = `${p.id}:${b.id}`;
        const defaultQty = ((pIdx * 3 + bIdx * 7) % 8) + 2;
        const qty = persistedInv[key] !== undefined ? Number(persistedInv[key]) : defaultQty;
        inMemoryInventoryMap.set(key, {
          quantity: qty,
          updatedAt: new Date().toISOString(),
        });
      });
    });
  }
}

initInMemoryInventory();

export function resolveBranchInMemory(branchIdOrCode?: string) {
  if (!branchIdOrCode) return null;
  const norm = normalizeText(branchIdOrCode);
  return (
    fallbackBranches.find(
      (b) =>
        b.id === branchIdOrCode ||
        normalizeText(b.name).includes(norm) ||
        normalizeText(b.city).includes(norm) ||
        (norm === 'b1' && b.id.endsWith('001')) ||
        (norm === 'b2' && b.id.endsWith('002')) ||
        (norm === 'b3' && b.id.endsWith('003'))
    ) || null
  );
}

export function getProductBranchInventoriesInMemory(productId: string) {
  initInMemoryInventory();
  return fallbackBranches.map((b, bIdx) => {
    const key = `${productId}:${b.id}`;
    const rec = inMemoryInventoryMap.get(key);
    const qty = rec ? rec.quantity : ((bIdx + 2) * 3) % 8 + 2;
    return {
      branchId: b.id,
      branchName: b.name,
      city: b.city,
      address: b.address,
      phone: b.phone,
      quantity: qty,
    };
  });
}

export function getBranchStockForProductInMemory(productId: string, branchIdOrCode: string): number {
  initInMemoryInventory();
  const branch = resolveBranchInMemory(branchIdOrCode);
  if (!branch) return 0;
  const key = `${productId}:${branch.id}`;
  return inMemoryInventoryMap.get(key)?.quantity ?? 0;
}

export function deductBranchStockForOrderInMemory(
  productId: string,
  quantity: number,
  preferredBranchId?: string
): { branchId: string; branchName: string; city: string } {
  initInMemoryInventory();
  const now = new Date().toISOString();

  if (preferredBranchId) {
    const branch = resolveBranchInMemory(preferredBranchId);
    if (branch) {
      const key = `${productId}:${branch.id}`;
      const currentQty = inMemoryInventoryMap.get(key)?.quantity ?? 0;
      inMemoryInventoryMap.set(key, {
        quantity: Math.max(0, currentQty - quantity),
        updatedAt: now,
      });
      saveInventoryToLocalDb();
      return { branchId: branch.id, branchName: branch.name, city: branch.city };
    }
  }

  // Fallback when branchId is not provided: pick branch with highest stock and deduct across branches if needed
  const sortedBranches = [...fallbackBranches].sort((a, b) => {
    const qtyA = inMemoryInventoryMap.get(`${productId}:${a.id}`)?.quantity ?? 0;
    const qtyB = inMemoryInventoryMap.get(`${productId}:${b.id}`)?.quantity ?? 0;
    return qtyB - qtyA;
  });

  let remainingToDeduct = quantity;
  const primaryBranch = sortedBranches[0] || fallbackBranches[0];

  for (const b of sortedBranches) {
    if (remainingToDeduct <= 0) break;
    const key = `${productId}:${b.id}`;
    const currentQty = inMemoryInventoryMap.get(key)?.quantity ?? 0;
    if (currentQty > 0) {
      const deductHere = Math.min(currentQty, remainingToDeduct);
      inMemoryInventoryMap.set(key, {
        quantity: currentQty - deductHere,
        updatedAt: now,
      });
      remainingToDeduct -= deductHere;
    }
  }

  saveInventoryToLocalDb();
  return {
    branchId: primaryBranch.id,
    branchName: primaryBranch.name,
    city: primaryBranch.city,
  };
}

export const getInventoryOverview = async (filters: InventoryFilters = {}) => {
  const isDbConnected = await checkDbConnection();

  if (!isDbConnected) {
    initInMemoryInventory();

    let items: ProductInventoryItem[] = fallbackProducts.map((p) => {
      const cat = fallbackCategories.find((c) => c.slug === p.categorySlug);
      const branchesStock: BranchStockDetail[] = fallbackBranches.map((b) => {
        const key = `${p.id}:${b.id}`;
        const record = inMemoryInventoryMap.get(key) || { quantity: 0, updatedAt: new Date().toISOString() };
        const qty = record.quantity;
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
          updatedAt: record.updatedAt,
        };
      });

      const totalStock = branchesStock.reduce((acc, curr) => acc + curr.quantity, 0);
      let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      if (totalStock === 0) stockStatus = 'out_of_stock';
      else if (totalStock <= 5 || branchesStock.some((bs) => bs.quantity <= 2)) stockStatus = 'low_stock';

      return {
        productId: p.id,
        productName: p.name,
        productSlug: p.slug,
        brand: p.brand,
        thumbnail: p.thumbnail,
        categoryName: cat?.name || p.categorySlug,
        categorySlug: p.categorySlug,
        price: p.price,
        totalStock,
        stockStatus,
        branchesStock,
      };
    });

    // Apply Filters
    if (filters.category && filters.category !== 'all') {
      items = items.filter((item) => item.categorySlug === filters.category);
    }

    if (filters.search && filters.search.trim()) {
      const q = normalizeText(filters.search);
      items = items.filter((item) => {
        const nameNorm = normalizeText(item.productName);
        const brandNorm = normalizeText(item.brand);
        const slugNorm = normalizeText(item.productSlug);
        return nameNorm.includes(q) || brandNorm.includes(q) || slugNorm.includes(q);
      });
    }

    if (filters.status && filters.status !== 'all') {
      items = items.filter((item) => item.stockStatus === filters.status);
    }

    if (filters.branchId && filters.branchId !== 'all') {
      items = items.map((item) => ({
        ...item,
        branchesStock: item.branchesStock.filter((b) => b.branchId === filters.branchId),
      }));
    }

    // Calculate Global KPI Summaries
    const allProducts = fallbackProducts.map((p) => {
      const bStocks = fallbackBranches.map((b) => {
        const record = inMemoryInventoryMap.get(`${p.id}:${b.id}`) || { quantity: 0 };
        return { branchId: b.id, quantity: record.quantity };
      });
      const total = bStocks.reduce((sum, b) => sum + b.quantity, 0);
      return { total, bStocks };
    });

    const totalStockUnits = allProducts.reduce((sum, p) => sum + p.total, 0);
    const totalProducts = fallbackProducts.length;
    const lowStockCount = allProducts.filter((p) => p.total > 0 && p.total <= 5).length;
    const outOfStockCount = allProducts.filter((p) => p.total === 0).length;

    const branchSummaries: BranchSummary[] = fallbackBranches.map((b) => {
      let bUnits = 0;
      let bLow = 0;
      let bOut = 0;

      fallbackProducts.forEach((p) => {
        const rec = inMemoryInventoryMap.get(`${p.id}:${b.id}`) || { quantity: 0 };
        bUnits += rec.quantity;
        if (rec.quantity === 0) bOut++;
        else if (rec.quantity <= 3) bLow++;
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
      branches: fallbackBranches,
      items,
    };
  }

  // Database PostgreSQL Mode
  const branchesRes = await pool.query(`SELECT id, name, city, address, phone FROM branches ORDER BY city ASC`);
  const branches = branchesRes.rows;

  const query = `
    SELECT 
      p.id as product_id, p.name as product_name, p.slug as product_slug,
      p.brand, p.thumbnail, p.price,
      c.name as category_name, c.slug as category_slug,
      COALESCE(SUM(inv.quantity), 0) as total_stock,
      COALESCE(
        json_agg(
          json_build_object(
            'branchId', b.id,
            'branchName', b.name,
            'city', b.city,
            'address', b.address,
            'phone', b.phone,
            'quantity', COALESCE(inv.quantity, 0),
            'updatedAt', inv.updated_at
          ) ORDER BY b.city ASC
        ) FILTER (WHERE b.id IS NOT NULL), '[]'::json
      ) as branches_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventories inv ON inv.product_id = p.id
    LEFT JOIN branches b ON inv.branch_id = b.id
    GROUP BY p.id, c.name, c.slug
    ORDER BY p.name ASC
  `;

  const res = await pool.query(query);
  let items: ProductInventoryItem[] = res.rows.map((row: any) => {
    const totalStock = Number(row.total_stock) || 0;
    const branchesStock: BranchStockDetail[] = (row.branches_stock || []).map((bs: any) => {
      const qty = Number(bs.quantity) || 0;
      let status: 'Còn hàng' | 'Sắp hết hàng' | 'Hết hàng' = 'Còn hàng';
      if (qty === 0) status = 'Hết hàng';
      else if (qty <= 3) status = 'Sắp hết hàng';

      return {
        branchId: bs.branchId,
        branchName: bs.branchName,
        city: bs.city,
        address: bs.address,
        phone: bs.phone,
        quantity: qty,
        status,
        updatedAt: bs.updatedAt,
      };
    });

    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (totalStock === 0) stockStatus = 'out_of_stock';
    else if (totalStock <= 5 || branchesStock.some((b) => b.quantity <= 2)) stockStatus = 'low_stock';

    return {
      productId: row.product_id,
      productName: row.product_name,
      productSlug: row.product_slug,
      brand: row.brand,
      thumbnail: row.thumbnail,
      categoryName: row.category_name || row.category_slug,
      categorySlug: row.category_slug,
      price: Number(row.price),
      totalStock,
      stockStatus,
      branchesStock,
    };
  });

  if (filters.category && filters.category !== 'all') {
    items = items.filter((item) => item.categorySlug === filters.category);
  }

  if (filters.search && filters.search.trim()) {
    const q = normalizeText(filters.search);
    items = items.filter((item) => {
      const nameNorm = normalizeText(item.productName);
      const brandNorm = normalizeText(item.brand);
      const slugNorm = normalizeText(item.productSlug);
      return nameNorm.includes(q) || brandNorm.includes(q) || slugNorm.includes(q);
    });
  }

  if (filters.status && filters.status !== 'all') {
    items = items.filter((item) => item.stockStatus === filters.status);
  }

  const totalStockUnits = items.reduce((sum, item) => sum + item.totalStock, 0);
  const totalProducts = items.length;
  const lowStockCount = items.filter((item) => item.totalStock > 0 && item.totalStock <= 5).length;
  const outOfStockCount = items.filter((item) => item.totalStock === 0).length;

  const branchSummaries: BranchSummary[] = branches.map((b: any) => {
    let bUnits = 0;
    let bLow = 0;
    let bOut = 0;

    items.forEach((item) => {
      const stockItem = item.branchesStock.find((bs) => bs.branchId === b.id);
      const qty = stockItem?.quantity || 0;
      bUnits += qty;
      if (qty === 0) bOut++;
      else if (qty <= 3) bLow++;
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
    branches,
    items,
  };
};

export const updateProductBranchStock = async (
  productId: string,
  branchId: string,
  quantity: number
) => {
  if (quantity < 0) {
    throw new Error('Số lượng tồn kho không được âm.');
  }

  const isDbConnected = await checkDbConnection();

  if (!isDbConnected) {
    initInMemoryInventory();
    const prod = fallbackProducts.find((p) => p.id === productId || p.slug === productId);
    const branch = fallbackBranches.find((b) => b.id === branchId || b.name.includes(branchId));

    if (!prod) throw new Error(`Không tìm thấy sản phẩm với ID: ${productId}`);
    if (!branch) throw new Error(`Không tìm thấy chi nhánh với ID: ${branchId}`);

    inMemoryInventoryMap.set(`${prod.id}:${branch.id}`, {
      quantity,
      updatedAt: new Date().toISOString(),
    });

    // Update product stock total
    let totalStock = 0;
    fallbackBranches.forEach((b) => {
      const rec = inMemoryInventoryMap.get(`${prod.id}:${b.id}`);
      if (rec) totalStock += rec.quantity;
    });

    (prod as any).stockQuantity = totalStock;
    (prod as any).stock = totalStock;
    saveInventoryToLocalDb();

    return {
      productId: prod.id,
      productName: prod.name,
      branchId: branch.id,
      branchName: branch.name,
      quantity,
      totalStock,
      updatedAt: new Date().toISOString(),
    };
  }

  // Database PostgreSQL Mode
  await pool.query(
    `INSERT INTO inventories (product_id, branch_id, quantity, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (product_id, branch_id)
     DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP`,
    [productId, branchId, quantity]
  );

  const totalRes = await pool.query(
    `SELECT COALESCE(SUM(quantity), 0) as total FROM inventories WHERE product_id = $1`,
    [productId]
  );
  const totalStock = Number(totalRes.rows[0].total) || 0;

  await pool.query(`UPDATE products SET stock_quantity = $1 WHERE id = $2`, [totalStock, productId]);

  return {
    productId,
    branchId,
    quantity,
    totalStock,
    updatedAt: new Date().toISOString(),
  };
};

export const transferStock = async (
  productId: string,
  fromBranchId: string,
  toBranchId: string,
  quantity: number,
  note?: string
) => {
  if (quantity <= 0) {
    throw new Error('Số lượng chuyển kho phải lớn hơn 0.');
  }

  if (fromBranchId === toBranchId) {
    throw new Error('Chi nhánh nguồn và chi nhánh đích không được trùng nhau.');
  }

  const isDbConnected = await checkDbConnection();

  if (!isDbConnected) {
    initInMemoryInventory();
    const prod = fallbackProducts.find((p) => p.id === productId || p.slug === productId);
    const fromBranch = fallbackBranches.find((b) => b.id === fromBranchId || b.name.includes(fromBranchId));
    const toBranch = fallbackBranches.find((b) => b.id === toBranchId || b.name.includes(toBranchId));

    if (!prod) throw new Error(`Không tìm thấy sản phẩm với ID: ${productId}`);
    if (!fromBranch) throw new Error(`Không tìm thấy chi nhánh nguồn: ${fromBranchId}`);
    if (!toBranch) throw new Error(`Không tìm thấy chi nhánh đích: ${toBranchId}`);

    const fromKey = `${prod.id}:${fromBranch.id}`;
    const toKey = `${prod.id}:${toBranch.id}`;

    const currentFrom = inMemoryInventoryMap.get(fromKey)?.quantity || 0;
    if (currentFrom < quantity) {
      throw new Error(
        `Chi nhánh "${fromBranch.name}" chỉ còn ${currentFrom} máy, không đủ số lượng ${quantity} để chuyển.`
      );
    }

    const currentTo = inMemoryInventoryMap.get(toKey)?.quantity || 0;
    const now = new Date().toISOString();

    inMemoryInventoryMap.set(fromKey, {
      quantity: currentFrom - quantity,
      updatedAt: now,
    });
    inMemoryInventoryMap.set(toKey, {
      quantity: currentTo + quantity,
      updatedAt: now,
    });
    saveInventoryToLocalDb();

    return {
      success: true,
      productId: prod.id,
      productName: prod.name,
      fromBranch: { id: fromBranch.id, name: fromBranch.name, remaining: currentFrom - quantity },
      toBranch: { id: toBranch.id, name: toBranch.name, newTotal: currentTo + quantity },
      transferredQuantity: quantity,
      note: note || 'Điều chuyển hàng giữa các showroom',
      timestamp: now,
    };
  }

  // Database PostgreSQL Mode (Transaction)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fromRes = await client.query(
      `SELECT quantity FROM inventories WHERE product_id = $1 AND branch_id = $2 FOR UPDATE`,
      [productId, fromBranchId]
    );
    const currentFrom = Number(fromRes.rows[0]?.quantity) || 0;

    if (currentFrom < quantity) {
      throw new Error(`Chi nhánh nguồn chỉ còn ${currentFrom} máy, không đủ số lượng để chuyển.`);
    }

    await client.query(
      `UPDATE inventories SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $2 AND branch_id = $3`,
      [quantity, productId, fromBranchId]
    );

    await client.query(
      `INSERT INTO inventories (product_id, branch_id, quantity, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (product_id, branch_id)
       DO UPDATE SET quantity = inventories.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP`,
      [productId, toBranchId, quantity]
    );

    await client.query('COMMIT');

    return {
      success: true,
      productId,
      fromBranchId,
      toBranchId,
      transferredQuantity: quantity,
      note: note || 'Điều chuyển hàng giữa các showroom',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
