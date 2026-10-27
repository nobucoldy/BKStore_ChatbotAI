import { Router } from 'express';
import { handleChatMessage, clearChatSession } from '../controllers/chat.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/chat - Gửi câu hỏi đến AI BK-Bot (hỗ trợ cả JSON và SSE streaming, tự động nhận diện user nếu đăng nhập)
router.post('/', optionalAuth, handleChatMessage);

// DELETE /api/chat/session/:sessionId - Làm mới phiên hội thoại trên server
router.delete('/session/:sessionId', clearChatSession);
router.post('/session/clear', clearChatSession);

export default router;

