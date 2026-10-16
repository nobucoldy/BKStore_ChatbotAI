import { Request, Response } from 'express';
import { registerUser, loginUser, getUserById, updateUserProfile } from '../services/auth.service';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! Chào mừng bạn đến với BK-Store.',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Đăng ký không thành công.',
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await loginUser(req.body);
    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: result,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: error.message || 'Đăng nhập không thành công.',
    });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Chưa xác thực người dùng.' });
      return;
    }
    const user = await getUserById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });
      return;
    }
    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi tải thông tin tài khoản.',
    });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Chưa xác thực người dùng.' });
      return;
    }
    const updatedUser = await updateUserProfile(req.user.id, req.body);
    res.json({
      success: true,
      message: 'Cập nhật thông tin tài khoản thành công!',
      data: updatedUser,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Cập nhật thông tin thất bại.',
    });
  }
};
