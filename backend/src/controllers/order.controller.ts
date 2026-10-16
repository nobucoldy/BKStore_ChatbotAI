import { Request, Response } from 'express';
import * as orderService from '../services/order.service';

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page, limit } = req.query;
    const result = await orderService.getAllOrders({
      status: status as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi lấy danh sách đơn hàng',
    });
  }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = {
      ...req.body,
      userId: req.user?.id || req.body.userId,
    };
    const order = await orderService.createOrder(payload);
    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công!',
      data: order,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Lỗi khi tạo đơn hàng',
    });
  }
};

export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để xem lịch sử đơn hàng.' });
      return;
    }
    const orders = await orderService.getOrdersByUserId(req.user.id, req.user.phone);
    res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi lấy lịch sử đơn hàng.',
    });
  }
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderCode = req.params.orderCode as string;
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp số điện thoại đã dùng đặt hàng để xác thực bảo mật.',
      });
      return;
    }

    const order = await orderService.getOrderByCodeAndPhone(orderCode, phone.trim());

    if (!order) {
      res.status(404).json({
        success: false,
        error: `Không tìm thấy đơn hàng "${orderCode}" khớp với số điện thoại đã nhập.`,
      });
      return;
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi tra cứu đơn hàng',
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderCode = req.params.orderCode as string;
    const { status, trackingInfo } = req.body;

    const updated = await orderService.updateOrderStatus(orderCode, status, trackingInfo);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: `Không tìm thấy đơn hàng "${orderCode}" để cập nhật.`,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công!',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi cập nhật trạng thái đơn hàng',
    });
  }
};
