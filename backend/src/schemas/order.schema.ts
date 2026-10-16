import { z } from 'zod';

export const createOrderSchema = z.object({
  customerName: z.string().min(2, 'Tên khách hàng tối thiểu 2 ký tự'),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ (cần 10 số bắt đầu bằng 0)'),
  address: z.string().min(5, 'Địa chỉ nhận hàng tối thiểu 5 ký tự'),
  note: z.string().optional(),
  branchId: z.string().optional(),
  userId: z.string().optional(),
  paymentMethod: z.enum(['COD', 'QR_PAY'], {
    errorMap: () => ({ message: 'Phương thức thanh toán phải là COD hoặc QR_PAY' }),
  }),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID không được để trống'),
      quantity: z.number().int().positive('Số lượng phải lớn hơn 0'),
    })
  ).min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Trạng thái đơn hàng không hợp lệ' }),
  }),
  trackingInfo: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
