import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/bkstore';

export const pool = new Pool({
  connectionString,
  max: 50, // Nâng từ 20 lên 50 connections phục vụ kiểm thử tải đồng thời
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Tăng timeout lên 5s tránh rớt kết nối khi burst traffic
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

let lastDbCheckTime = 0;
let cachedDbStatus: boolean | null = null;
const DB_CHECK_INTERVAL_MS = 20000; // Cache trạng thái kết nối DB trong 20s, không spam socket

export const checkDbConnection = async (forceCheck = false): Promise<boolean> => {
  const now = Date.now();
  if (!forceCheck && cachedDbStatus !== null && now - lastDbCheckTime < DB_CHECK_INTERVAL_MS) {
    return cachedDbStatus;
  }

  lastDbCheckTime = now;
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    cachedDbStatus = true;
    return true;
  } catch (error) {
    cachedDbStatus = false;
    return false;
  }
};
