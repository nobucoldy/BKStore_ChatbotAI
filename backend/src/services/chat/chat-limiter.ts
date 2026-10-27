import NodeCache from 'node-cache';

// Bộ nhớ đệm lưu câu trả lời cho các câu hỏi phổ biến (TTL 5 phút)
export const chatResponseCache = new NodeCache({ stdTTL: 300, checkperiod: 60, maxKeys: 1000 });

// Hàng đợi điều tiết Concurrency cho Gemini API (Tối đa 8 requests đồng thời, bảo vệ khỏi 429)
export class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  release(): void {
    this.running--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

export const geminiLimiter = new ConcurrencyLimiter(8);
