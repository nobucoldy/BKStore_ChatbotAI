import crypto from 'crypto';
import { pool, checkDbConnection } from '../config/db';
import { readLocalDb, writeLocalDb } from '../db/localStore';
import { products as fallbackProducts, branches as fallbackBranches, categories as fallbackCategories } from '../db/seedData';
import { CreateProductInput, UpdateProductInput } from '../schemas/product.schema';
import { getProductBranchInventoriesInMemory } from './inventory.service';

export interface ProductFilterOptions {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
}

// Default seed products normalized
const defaultProducts: any[] = fallbackProducts.map((p) => {
  const cat = fallbackCategories.find((c) => c.slug === p.categorySlug);
  return {
    ...p,
    categoryName: cat?.name || p.categorySlug,
    category_name: cat?.name || p.categorySlug,
    stockQuantity: (p as any).stockQuantity ?? (p as any).stock ?? 15,
    stock: (p as any).stockQuantity ?? (p as any).stock ?? 15,
  };
});

const persistedProducts = readLocalDb().products;
let inMemoryProducts: any[] =
  Array.isArray(persistedProducts) && persistedProducts.length > 0
    ? persistedProducts
    : [...defaultProducts];

export const findProductByIdOrSlug = (idOrSlug: string) => {
  if (!idOrSlug) return null;
  const normalized = idOrSlug.trim().toLowerCase();
  return (
    inMemoryProducts.find(
      (p) =>
        p.id === idOrSlug ||
        p.slug?.toLowerCase() === normalized ||
        p.name?.toLowerCase() === normalized
    ) || null
  );
};

export const deductStockInMemory = (productId: string, quantity: number): boolean => {
  const prod = inMemoryProducts.find((p) => p.id === productId || p.slug === productId);
  if (!prod) return false;
  const currentStock = prod.stockQuantity ?? prod.stock ?? 10;
  if (currentStock < quantity) return false;
  prod.stockQuantity = currentStock - quantity;
  prod.stock = prod.stockQuantity;
  writeLocalDb({ products: inMemoryProducts });
  return true;
};

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const getProducts = async (options: ProductFilterOptions) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 12));
  const offset = (page - 1) * limit;

  const isDbConnected = await checkDbConnection();
  if (!isDbConnected) {
    // In-memory fallback
    let filtered = [...inMemoryProducts];

    if (options.category) {
      filtered = filtered.filter(
        (p) => p.categorySlug?.toLowerCase() === options.category?.toLowerCase()
      );
    }
    if (options.brand) {
      filtered = filtered.filter(
        (p) => p.brand?.toLowerCase() === options.brand?.toLowerCase()
      );
    }
    if (options.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= (options.minPrice || 0));
    }
    if (options.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= (options.maxPrice || Infinity));
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          JSON.stringify(p.specs || {}).toLowerCase().includes(q)
      );
    }

    // Sorting
    if (options.sort === 'price_asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (options.sort === 'price_desc') {
      filtered.sort((a, b) => b.price - a.price);
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit).map((p) => ({
      ...p,
      inventories: getProductBranchInventoriesInMemory(p.id),
    }));

    return {
      products: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // PostgreSQL Query
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (options.category) {
    conditions.push(`c.slug = $${paramIdx++}`);
    params.push(options.category);
  }

  if (options.brand) {
    conditions.push(`LOWER(p.brand) = LOWER($${paramIdx++})`);
    params.push(options.brand);
  }

  if (options.minPrice !== undefined) {
    conditions.push(`p.price >= $${paramIdx++}`);
    params.push(options.minPrice);
  }

  if (options.maxPrice !== undefined) {
    conditions.push(`p.price <= $${paramIdx++}`);
    params.push(options.maxPrice);
  }

  if (options.search) {
    conditions.push(`(p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx} OR p.specs::text ILIKE $${paramIdx})`);
    params.push(`%${options.search}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderBy = 'ORDER BY p.created_at DESC';
  if (options.sort === 'price_asc') {
    orderBy = 'ORDER BY p.price ASC';
  } else if (options.sort === 'price_desc') {
    orderBy = 'ORDER BY p.price DESC';
  }

  // Count total
  const countQuery = `
    SELECT COUNT(p.id)::int as total
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
  `;
  const countRes = await pool.query(countQuery, params);
  const total = countRes.rows[0].total;

  // Query products
  const dataQuery = `
    SELECT 
      p.id, p.name, p.slug, p.brand, p.price, p.original_price,
      p.stock_quantity, p.thumbnail, p.images, p.specs, p.description,
      p.warranty_months, p.created_at,
      c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
    ${orderBy}
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  params.push(limit, offset);

  const dataRes = await pool.query(dataQuery, params);

  return {
    products: dataRes.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getProductBySlug = async (slug: string) => {
  const isDbConnected = await checkDbConnection();
  if (!isDbConnected) {
    const prod = inMemoryProducts.find((p) => p.slug === slug || p.id === slug);
    if (!prod) return null;

    // Attach real-time branch inventories from inventory.service
    const inventories = getProductBranchInventoriesInMemory(prod.id);

    return {
      ...prod,
      inventories,
    };
  }

  const query = `
    SELECT 
      p.id, p.name, p.slug, p.brand, p.price, p.original_price,
      p.stock_quantity, p.thumbnail, p.images, p.specs, p.description,
      p.warranty_months, p.created_at,
      c.name as category_name, c.slug as category_slug,
      COALESCE(
        json_agg(
          json_build_object(
            'branchId', b.id,
            'branchName', b.name,
            'city', b.city,
            'address', b.address,
            'quantity', inv.quantity
          )
        ) FILTER (WHERE b.id IS NOT NULL), '[]'::json
      ) as inventories
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventories inv ON inv.product_id = p.id
    LEFT JOIN branches b ON inv.branch_id = b.id
    WHERE p.slug = $1 OR p.id::text = $1
    GROUP BY p.id, c.name, c.slug
  `;

  const res = await pool.query(query, [slug]);
  return res.rows[0] || null;
};

export const createProduct = async (input: CreateProductInput) => {
  const isDbConnected = await checkDbConnection();
  const baseSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.name);

  if (!isDbConnected) {
    let finalSlug = baseSlug;
    if (inMemoryProducts.some((p) => p.slug === finalSlug)) {
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const categoryMap: Record<string, string> = {
      laptop: 'Laptop & Máy tính xách tay',
      smartphone: 'Điện thoại thông minh',
      accessory: 'Phụ kiện & Ngoại vi',
    };

    const newProduct: any = {
      id: crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`,
      categorySlug: input.categorySlug,
      categoryName: categoryMap[input.categorySlug] || input.categorySlug,
      name: input.name,
      slug: finalSlug,
      brand: input.brand,
      price: input.price,
      originalPrice: input.originalPrice || input.price,
      stockQuantity: input.stockQuantity ?? 10,
      stock: input.stockQuantity ?? 10,
      thumbnail: input.thumbnail,
      images: input.images && input.images.length > 0 ? input.images : [input.thumbnail],
      specs: input.specs || {},
      description: input.description,
      warrantyMonths: input.warrantyMonths ?? 12,
      createdAt: new Date().toISOString(),
    };

    inMemoryProducts.unshift(newProduct);
    writeLocalDb({ products: inMemoryProducts });
    return newProduct;
  }

  // PostgreSQL logic
  let finalSlug = baseSlug;
  const existingRes = await pool.query('SELECT id FROM products WHERE slug = $1', [finalSlug]);
  if (existingRes.rows.length > 0) {
    finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
  }

  let categoryId: string | null = null;
  const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1 LIMIT 1', [input.categorySlug]);
  if (catRes.rows.length > 0) {
    categoryId = catRes.rows[0].id;
  }

  const query = `
    INSERT INTO products (
      name, slug, category_id, brand, price, original_price,
      stock_quantity, thumbnail, images, specs, description, warranty_months
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING 
      id, name, slug, brand, price, original_price, stock_quantity,
      thumbnail, images, specs, description, warranty_months, created_at
  `;
  const values = [
    input.name,
    finalSlug,
    categoryId,
    input.brand,
    input.price,
    input.originalPrice || input.price,
    input.stockQuantity ?? 10,
    input.thumbnail,
    JSON.stringify(input.images && input.images.length > 0 ? input.images : [input.thumbnail]),
    JSON.stringify(input.specs || {}),
    input.description,
    input.warrantyMonths ?? 12,
  ];

  const res = await pool.query(query, values);
  return {
    ...res.rows[0],
    categorySlug: input.categorySlug,
  };
};

export const updateProduct = async (id: string, input: UpdateProductInput) => {
  const isDbConnected = await checkDbConnection();

  if (!isDbConnected) {
    const idx = inMemoryProducts.findIndex((p) => p.id === id || p.slug === id);
    if (idx === -1) return null;

    const existing = inMemoryProducts[idx];
    const categoryMap: Record<string, string> = {
      laptop: 'Laptop & Máy tính xách tay',
      smartphone: 'Điện thoại thông minh',
      accessory: 'Phụ kiện & Ngoại vi',
    };

    const updated: any = {
      ...existing,
      ...input,
      categoryName: input.categorySlug ? (categoryMap[input.categorySlug] || input.categorySlug) : existing.categoryName,
      originalPrice: input.originalPrice ?? existing.originalPrice,
      stockQuantity: input.stockQuantity ?? (existing.stockQuantity ?? existing.stock ?? 10),
      stock: input.stockQuantity ?? (existing.stockQuantity ?? existing.stock ?? 10),
      specs: input.specs !== undefined ? input.specs : existing.specs,
      images: input.images !== undefined ? input.images : existing.images,
      updatedAt: new Date().toISOString(),
    };

    inMemoryProducts[idx] = updated;
    writeLocalDb({ products: inMemoryProducts });
    return updated;
  }

  // PostgreSQL logic
  const checkRes = await pool.query('SELECT * FROM products WHERE id::text = $1 OR slug = $1', [id]);
  if (checkRes.rows.length === 0) {
    return null;
  }
  const prodId = checkRes.rows[0].id;

  const updates: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIdx++}`);
    values.push(input.name);
  }
  if (input.slug !== undefined) {
    updates.push(`slug = $${paramIdx++}`);
    values.push(slugify(input.slug));
  }
  if (input.brand !== undefined) {
    updates.push(`brand = $${paramIdx++}`);
    values.push(input.brand);
  }
  if (input.price !== undefined) {
    updates.push(`price = $${paramIdx++}`);
    values.push(input.price);
  }
  if (input.originalPrice !== undefined) {
    updates.push(`original_price = $${paramIdx++}`);
    values.push(input.originalPrice);
  }
  if (input.stockQuantity !== undefined) {
    updates.push(`stock_quantity = $${paramIdx++}`);
    values.push(input.stockQuantity);
  }
  if (input.thumbnail !== undefined) {
    updates.push(`thumbnail = $${paramIdx++}`);
    values.push(input.thumbnail);
  }
  if (input.images !== undefined) {
    updates.push(`images = $${paramIdx++}`);
    values.push(JSON.stringify(input.images));
  }
  if (input.specs !== undefined) {
    updates.push(`specs = $${paramIdx++}`);
    values.push(JSON.stringify(input.specs));
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIdx++}`);
    values.push(input.description);
  }
  if (input.warrantyMonths !== undefined) {
    updates.push(`warranty_months = $${paramIdx++}`);
    values.push(input.warrantyMonths);
  }
  if (input.categorySlug !== undefined) {
    const catRes = await pool.query('SELECT id FROM categories WHERE slug = $1 LIMIT 1', [input.categorySlug]);
    if (catRes.rows.length > 0) {
      updates.push(`category_id = $${paramIdx++}`);
      values.push(catRes.rows[0].id);
    }
  }

  updates.push(`updated_at = NOW()`);

  values.push(prodId);
  const query = `
    UPDATE products
    SET ${updates.join(', ')}
    WHERE id = $${paramIdx}
    RETURNING 
      id, name, slug, brand, price, original_price, stock_quantity,
      thumbnail, images, specs, description, warranty_months, updated_at
  `;
  const res = await pool.query(query, values);
  return res.rows[0];
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  const isDbConnected = await checkDbConnection();

  if (!isDbConnected) {
    const initialLen = inMemoryProducts.length;
    inMemoryProducts = inMemoryProducts.filter((p) => p.id !== id && p.slug !== id);
    const deleted = inMemoryProducts.length < initialLen;
    if (deleted) {
      writeLocalDb({ products: inMemoryProducts });
    }
    return deleted;
  }

  const res = await pool.query('DELETE FROM products WHERE id::text = $1 OR slug = $1 RETURNING id', [id]);
  return (res.rowCount ?? 0) > 0;
};
