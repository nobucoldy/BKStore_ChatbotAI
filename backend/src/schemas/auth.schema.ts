import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Họ và tên tối thiểu 2 ký tự'),
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ (cần 10 số bắt đầu bằng 0)'),
  address: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Họ và tên tối thiểu 2 ký tự').optional(),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ (cần 10 số bắt đầu bằng 0)').optional(),
  address: z.string().min(5, 'Địa chỉ tối thiểu 5 ký tự').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
