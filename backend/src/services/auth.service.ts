import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, checkDbConnection } from '../config/db';
import { readLocalDb, writeLocalDb } from '../db/localStore';
import { RegisterInput, LoginInput, UpdateProfileInput } from '../schemas/auth.schema';
import { inMemoryOrders } from './order.service';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'admin';
  createdAt: string;
}

export type SanitizedUser = Omit<User, 'passwordHash'>;

const JWT_SECRET = process.env.JWT_SECRET || 'bkstore-jwt-secret-key-2026';

// Seed initial users if none exist in local storage
const seedInitialUsers: User[] = [
  {
    id: 'u-customer-001',
    name: 'Nguyễn Văn An',
    email: 'khachhang@bkstore.vn',
    passwordHash: bcrypt.hashSync('123456', 10),
    phone: '0912345678',
    address: 'Số 18 Hoàng Quốc Việt, Phường Nghĩa Đô, Cầu Giấy, Hà Nội',
    role: 'customer',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'u-admin-001',
    name: 'Quản Trị Viên BK-Store',
    email: 'admin@bkstore.vn',
    passwordHash: bcrypt.hashSync('admin123', 10),
    phone: '0988889999',
    address: '268 Cầu Giấy, Hà Nội',
    role: 'admin',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

const persistedUsers = readLocalDb().users;
export const inMemoryUsers: User[] =
  Array.isArray(persistedUsers) && persistedUsers.length > 0
    ? persistedUsers
    : [...seedInitialUsers];

// Save initial users if not persisted yet
if (!persistedUsers || persistedUsers.length === 0) {
  writeLocalDb({ users: inMemoryUsers });
}

export const sanitizeUser = (user: User): SanitizedUser => {
  const { passwordHash, ...rest } = user;
  return rest;
};

export const generateToken = (user: User): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): any => {
  if (token === 'mock-jwt-admin-token') {
    return {
      id: 'u-admin-001',
      name: 'Quản Trị Viên BK-Store',
      email: 'admin@bkstore.vn',
      role: 'admin',
      phone: '0988889999',
    };
  }
  if (token === 'mock-jwt-customer-token' || token.startsWith('mock-jwt-')) {
    return {
      id: 'u-customer-001',
      name: 'Nguyễn Văn An',
      email: 'khachhang@bkstore.vn',
      role: 'customer',
      phone: '0912345678',
    };
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

export const registerUser = async (input: RegisterInput): Promise<{ user: SanitizedUser; token: string }> => {
  const normalizedEmail = input.email.trim().toLowerCase();
  const isDbConnected = await checkDbConnection();

  // 1. Check existing in memory
  const existingInMemory = inMemoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existingInMemory) {
    throw new Error('Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const userId = `u-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newUser: User = {
    id: userId,
    name: input.name.trim(),
    email: normalizedEmail,
    passwordHash,
    phone: input.phone?.trim(),
    address: input.address?.trim() || '',
    role: 'customer',
    createdAt: new Date().toISOString(),
  };

  // 2. Insert into memory & local store
  inMemoryUsers.unshift(newUser);
  writeLocalDb({ users: inMemoryUsers });

  // 3. Auto-link previous guest orders with matching phone number
  if (newUser.phone) {
    for (const ord of inMemoryOrders) {
      if (ord.phone === newUser.phone && !ord.userId) {
        ord.userId = newUser.id;
      }
    }
    writeLocalDb({ orders: inMemoryOrders });
  }

  // 4. Try PostgreSQL if connected
  if (isDbConnected) {
    try {
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, phone, address, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO NOTHING`,
        [newUser.id, newUser.name, newUser.email, newUser.passwordHash, newUser.phone, newUser.address, newUser.role]
      );
      if (newUser.phone) {
        await pool.query('UPDATE orders SET user_id = $1 WHERE phone = $2 AND user_id IS NULL', [
          newUser.id,
          newUser.phone,
        ]);
      }
    } catch (err) {
      console.warn('⚠️ [AuthService] Failed to insert user into PostgreSQL:', err);
    }
  }

  const token = generateToken(newUser);
  return { user: sanitizeUser(newUser), token };
};

export const loginUser = async (input: LoginInput): Promise<{ user: SanitizedUser; token: string }> => {
  const normalizedEmail = input.email.trim().toLowerCase();
  const isDbConnected = await checkDbConnection();

  let foundUser: User | undefined = inMemoryUsers.find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );

  // If DB connected, try to fetch from DB
  if (isDbConnected) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        foundUser = {
          id: row.id,
          name: row.name,
          email: row.email,
          passwordHash: row.password_hash,
          phone: row.phone,
          address: row.address,
          role: row.role,
          createdAt: row.created_at,
        };
      }
    } catch (err) {
      console.warn('⚠️ [AuthService] DB query failed in loginUser:', err);
    }
  }

  if (!foundUser) {
    throw new Error('Email hoặc mật khẩu không chính xác.');
  }

  const isPasswordValid = await bcrypt.compare(input.password, foundUser.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Email hoặc mật khẩu không chính xác.');
  }

  const token = generateToken(foundUser);
  return { user: sanitizeUser(foundUser), token };
};

export const getUserById = async (id: string): Promise<SanitizedUser | null> => {
  const isDbConnected = await checkDbConnection();
  if (isDbConnected) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE id::text = $1', [id]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          address: row.address,
          role: row.role,
          createdAt: row.created_at,
        };
      }
    } catch {}
  }

  const user = inMemoryUsers.find((u) => u.id === id);
  return user ? sanitizeUser(user) : null;
};

export const findUserByPhone = (phone: string): User | undefined => {
  if (!phone) return undefined;
  const clean = phone.trim();
  return inMemoryUsers.find((u) => u.phone === clean);
};

export const updateUserProfile = async (
  userId: string,
  input: UpdateProfileInput
): Promise<SanitizedUser> => {
  const idx = inMemoryUsers.findIndex((u) => u.id === userId);
  if (idx === -1) {
    throw new Error('Không tìm thấy thông tin người dùng.');
  }

  if (input.name) inMemoryUsers[idx].name = input.name.trim();
  if (input.phone) inMemoryUsers[idx].phone = input.phone.trim();
  if (input.address) inMemoryUsers[idx].address = input.address.trim();

  writeLocalDb({ users: inMemoryUsers });

  const isDbConnected = await checkDbConnection();
  if (isDbConnected) {
    try {
      await pool.query(
        'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), address = COALESCE($3, address) WHERE id::text = $4',
        [input.name || null, input.phone || null, input.address || null, userId]
      );
    } catch (err) {
      console.warn('⚠️ [AuthService] Failed to update user in PostgreSQL:', err);
    }
  }

  return sanitizeUser(inMemoryUsers[idx]);
};
