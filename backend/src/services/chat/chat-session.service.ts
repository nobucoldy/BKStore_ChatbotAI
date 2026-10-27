import crypto from 'crypto';
import NodeCache from 'node-cache';
import { ChatHistoryItem } from './chat.types';

export interface ChatSession {
  sessionId: string;
  userId?: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatHistoryItem[];
  metadata?: Record<string, any>;
}

export class ChatSessionService {
  // Bộ nhớ đệm lưu phiên trò chuyện: TTL 24 giờ, tối đa 5000 sessions đồng thời
  private sessionCache = new NodeCache({
    stdTTL: 86400, // 24 giờ
    checkperiod: 600, // dọn dẹp mỗi 10 phút
    maxKeys: 5000,
  });

  /**
   * Tạo mã phiên ngẫu nhiên duy nhất
   */
  public generateSessionId(): string {
    return `ses_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  /**
   * Lấy hoặc khởi tạo mới phiên trò chuyện
   */
  public getOrCreateSession(sessionId?: string, userId?: string): ChatSession {
    const validId = sessionId && sessionId.trim() ? sessionId.trim() : this.generateSessionId();
    const existing = this.sessionCache.get<ChatSession>(validId);

    if (existing) {
      if (userId && !existing.userId) {
        existing.userId = userId;
      }
      existing.updatedAt = Date.now();
      this.sessionCache.set(validId, existing);
      return existing;
    }

    const newSession: ChatSession = {
      sessionId: validId,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      metadata: {},
    };

    this.sessionCache.set(validId, newSession);
    return newSession;
  }

  /**
   * Lấy phiên trò chuyện hiện tại theo ID
   */
  public getSession(sessionId: string): ChatSession | null {
    if (!sessionId) return null;
    return this.sessionCache.get<ChatSession>(sessionId) || null;
  }

  /**
   * Lấy lịch sử hội thoại của phiên (tối đa maxTurns tin nhắn gần nhất)
   */
  public getHistory(sessionId: string, maxTurns = 8): ChatHistoryItem[] {
    const session = this.getSession(sessionId);
    if (!session || !session.messages) return [];
    return session.messages.slice(-maxTurns);
  }

  /**
   * Thêm một tin nhắn mới vào phiên (tự động giới hạn độ dài tin nhắn & số lượng tin nhắn)
   */
  public addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'model',
    content: string
  ): void {
    if (!sessionId || !content || !content.trim()) return;

    const session = this.getOrCreateSession(sessionId);
    const sanitizedContent = content.trim().slice(0, 3000); // Ngăn ngừa payload khổng lồ

    session.messages.push({
      role: role === 'model' ? 'assistant' : role,
      content: sanitizedContent,
    });

    // Giữ tối đa 30 tin nhắn gần nhất trong mỗi session
    if (session.messages.length > 30) {
      session.messages = session.messages.slice(-30);
    }

    session.updatedAt = Date.now();
    this.sessionCache.set(sessionId, session);
  }

  /**
   * Làm mới / Xóa toàn bộ lịch sử của phiên trò chuyện
   */
  public clearSession(sessionId: string): void {
    if (!sessionId) return;
    const session = this.getSession(sessionId);
    if (session) {
      session.messages = [];
      session.updatedAt = Date.now();
      this.sessionCache.set(sessionId, session);
    }
  }

  /**
   * Làm sạch và xác thực mảng lịch sử từ client (nếu client không dùng sessionId hoặc truyền mảng tùy biến)
   * Chống Prompt Injection và giả mạo ngữ cảnh trợ lý
   */
  public sanitizeHistory(rawHistory?: any[], maxTurns = 8): ChatHistoryItem[] {
    if (!Array.isArray(rawHistory) || rawHistory.length === 0) return [];

    const sanitized: ChatHistoryItem[] = [];

    for (const item of rawHistory.slice(-maxTurns)) {
      if (!item || typeof item !== 'object') continue;

      const role = item.role === 'assistant' || item.role === 'model' ? 'assistant' : 'user';
      let content = typeof item.content === 'string' ? item.content.trim() : '';

      if (!content) continue;

      // Giới hạn độ dài mỗi tin nhắn lịch sử (tối đa 1500 ký tự)
      if (content.length > 1500) {
        content = content.slice(0, 1500) + '...';
      }

      // Lọc các nhãn injection nguy hiểm nếu user cố tình chèn role mạo danh trong text
      content = content
        .replace(/system\s*instruction/gi, 'instruction')
        .replace(/\[\s*system\s*\]/gi, '[info]');

      sanitized.push({ role, content });
    }

    return sanitized;
  }
}

export const chatSessionService = new ChatSessionService();
