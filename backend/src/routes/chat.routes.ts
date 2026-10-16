import { Router } from 'express';
import { handleChatMessage } from '../controllers/chat.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/chat - Gửi câu hỏi đến AI BK-Bot (hỗ trợ cả JSON và SSE streaming, tự động nhận diện user nếu đăng nhập)
router.post('/', optionalAuth, handleChatMessage);

export default router;
