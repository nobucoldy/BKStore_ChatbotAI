import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { chatSessionService } from '../services/chat/chat-session.service';

export const handleChatMessage = async (req: Request, res: Response) => {
  try {
    const { message, history: rawHistory, stream, sessionId: rawSessionId } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung tin nhắn không được để trống.',
      });
    }

    // 1. Quản lý phiên hội thoại phía Server (Server-side Session Management)
    const headerSessionId = req.headers['x-session-id'] as string | undefined;
    const incomingSessionId = rawSessionId || headerSessionId;
    const session = chatSessionService.getOrCreateSession(incomingSessionId, req.user?.id);
    const sessionId = session.sessionId;

    // Xác định lịch sử hội thoại:
    // Ưu tiên lịch sử bảo mật lưu trên server; nếu session mới và client có truyền rawHistory, làm sạch và kế thừa
    let history = chatSessionService.getHistory(sessionId, 8);
    if (history.length === 0 && Array.isArray(rawHistory) && rawHistory.length > 0) {
      history = chatSessionService.sanitizeHistory(rawHistory, 8);
      // Nạp các tin nhắn cũ đã làm sạch vào server session
      for (const h of history) {
        chatSessionService.addMessage(sessionId, h.role, h.content);
      }
    }

    // Ghi nhận tin nhắn người dùng vào server-side session
    chatSessionService.addMessage(sessionId, 'user', message);

    const isStreamRequested =
      stream === true ||
      req.query.stream === 'true' ||
      req.headers.accept?.includes('text/event-stream');

    if (isStreamRequested) {
      // Thiết lập SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Session-Id', sessionId);
      res.flushHeaders?.();

      const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        await chatService.streamChat(
          { message, history, sessionId, currentUser: req.user },
          sendEvent
        );
      } catch (streamErr: any) {
        sendEvent('error', {
          message: streamErr.message || 'Đã có lỗi xảy ra trong quá trình phản hồi.',
        });
      } finally {
        res.end();
      }
      return;
    }

    // Phản hồi dạng JSON thông thường
    const responseData = await chatService.handleMessage({
      message,
      history,
      sessionId,
      currentUser: req.user,
    });

    // Lưu câu trả lời của trợ lý vào server session
    chatSessionService.addMessage(sessionId, 'assistant', responseData.reply);
    responseData.sessionId = sessionId;

    return res.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('❌ [ChatController Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xử lý tin nhắn.',
      error: error.message,
    });
  }
};

export const clearChatSession = async (req: Request, res: Response) => {
  try {
    const sessionId = (req.params.sessionId || req.body.sessionId || req.headers['x-session-id']) as string;
    if (sessionId) {
      chatSessionService.clearSession(sessionId);
    }
    return res.json({
      success: true,
      message: 'Đã xóa và làm mới phiên hội thoại.',
      sessionId: sessionId || chatSessionService.generateSessionId(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi làm mới phiên hội thoại.',
    });
  }
};


