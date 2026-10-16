import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';

export const handleChatMessage = async (req: Request, res: Response) => {
  try {
    const { message, history, stream } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung tin nhắn không được để trống.',
      });
    }

    const isStreamRequested =
      stream === true ||
      req.query.stream === 'true' ||
      req.headers.accept?.includes('text/event-stream');

    if (isStreamRequested) {
      // Thiết lập SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        await chatService.streamChat({ message, history, currentUser: req.user }, sendEvent);
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
    const responseData = await chatService.handleMessage({ message, history, currentUser: req.user });
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
