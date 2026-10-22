import { pool, checkDbConnection } from '../config/db';
import { brands as fallbackBrands } from '../db/seedData';

export const getAllBrands = async () => {
  const isDbConnected = await checkDbConnection();
  if (!isDbConnected) {
    return fallbackBrands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      logo: (b as any).logo || `/brands/${b.slug.toLowerCase()}.svg`,
    }));
  }

  const query = `
    SELECT id, name, slug, description, created_at
    FROM brands
    ORDER BY name ASC
  `;
  const res = await pool.query(query);
  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    logo: `/brands/${r.slug.toLowerCase()}.svg`,
  }));
};

export const getBrandBySlug = async (slug: string) => {
  const isDbConnected = await checkDbConnection();
  if (!isDbConnected) {
    const brand = fallbackBrands.find((b) => b.slug.toLowerCase() === slug.toLowerCase());
    return brand ? { ...brand, logo: (brand as any).logo || `/brands/${brand.slug.toLowerCase()}.svg` } : null;
  }

  const query = `
    SELECT id, name, slug, description, created_at
    FROM brands
    WHERE LOWER(slug) = LOWER($1)
  `;
  const res = await pool.query(query, [slug]);
  return res.rows[0] ? { ...res.rows[0], logo: `/brands/${res.rows[0].slug.toLowerCase()}.svg` } : null;
};
