import fs from 'fs';
import path from 'path';

export interface LocalDbSchema {
  orders?: any[];
  reviews?: any[];
  products?: any[];
  inventory?: Record<string, number>;
  updatedAt?: string;
}

const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.argv.some((arg) => arg.includes('test-api'));

const DATA_DIR = path.resolve(__dirname, '../../data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'local_db.json');

export const readLocalDb = (): LocalDbSchema => {
  if (isTestEnv) return {};
  try {
    if (!fs.existsSync(LOCAL_DB_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
    return JSON.parse(raw) as LocalDbSchema;
  } catch (err) {
    console.warn('⚠️ Failed to read local_db.json:', err);
    return {};
  }
};

export const writeLocalDb = (partial: Partial<LocalDbSchema>): void => {
  if (isTestEnv) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = readLocalDb();
    const merged: LocalDbSchema = {
      ...current,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️ Failed to write local_db.json:', err);
  }
};
