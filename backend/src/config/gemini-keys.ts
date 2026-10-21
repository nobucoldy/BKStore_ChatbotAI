import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Nạp biến môi trường từ mọi vị trí khả dĩ (.env ở root hoặc backend/.env)
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

export interface KeyStatus {
  index: number;
  masked: string;
  isExhausted: boolean;
  exhaustedUntil?: number;
}

class GeminiKeyManager {
  private keys: string[] = [];
  private currentIndex = 0;
  private exhaustedMap = new Map<number, number>(); // index -> timestamp cooldown expires (ms)

  constructor() {
    this.reloadKeys();
  }

  /**
   * Đọc danh sách API Keys từ biến môi trường
   * Hỗ trợ:
   * 1. GEMINI_API_KEYS (danh sách phân tách bằng dấu phẩy)
   * 2. GEMINI_API_KEY (key chính)
   * 3. GEMINI_API_KEY_BACKUP, GEMINI_API_KEY_BACKUP_2 (các key dự phòng)
   */
  public reloadKeys(): void {
    const rawKeys: string[] = [];

    // 1. Phân tách danh sách GEMINI_API_KEYS nếu có
    if (process.env.GEMINI_API_KEYS) {
      const split = process.env.GEMINI_API_KEYS.split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 5);
      rawKeys.push(...split);
    }

    // 2. Key chính
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5) {
      rawKeys.push(process.env.GEMINI_API_KEY.trim());
    }

    // 3. Key dự phòng 1 & 2
    if (process.env.GEMINI_API_KEY_BACKUP && process.env.GEMINI_API_KEY_BACKUP.trim().length > 5) {
      rawKeys.push(process.env.GEMINI_API_KEY_BACKUP.trim());
    }
    if (process.env.GEMINI_API_KEY_BACKUP_2 && process.env.GEMINI_API_KEY_BACKUP_2.trim().length > 5) {
      rawKeys.push(process.env.GEMINI_API_KEY_BACKUP_2.trim());
    }

    // Loại bỏ key trùng lặp
    this.keys = Array.from(new Set(rawKeys));
    this.currentIndex = 0;
    this.exhaustedMap.clear();

    if (this.keys.length > 0) {
      console.log(`🔑 [KeyPool] Đã nạp ${this.keys.length} Gemini API Key(s) vào bể dự phòng.`);
      this.keys.forEach((k, idx) => {
        console.log(`   [Key #${idx + 1}] ${this.maskKey(k)}`);
      });
    } else {
      console.warn('⚠️ [KeyPool] Chưa tìm thấy GEMINI_API_KEY hợp lệ trong file .env');
    }
  }

  /**
   * Che giấu key để in log an toàn (vd: AIzaSy...4F2d)
   */
  public maskKey(key: string): string {
    if (!key || key.length < 10) return '***';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  }

  /**
   * Lấy số lượng key được cấu hình
   */
  public getKeyCount(): number {
    return this.keys.length;
  }

  /**
   * Tìm vị trí key khả dụng tiếp theo (bỏ qua các key đang bị exhausted)
   */
  private getNextAvailableIndex(): number | null {
    const now = Date.now();
    const total = this.keys.length;
    if (total === 0) return null;

    for (let i = 0; i < total; i++) {
      const idx = (this.currentIndex + i) % total;
      const exhaustedUntil = this.exhaustedMap.get(idx);

      // Nếu key chưa bị đánh dấu hết hạn mức hoặc đã qua thời gian cooldown
      if (!exhaustedUntil || now > exhaustedUntil) {
        if (exhaustedUntil && now > exhaustedUntil) {
          this.exhaustedMap.delete(idx);
          console.log(`♻️ [KeyPool] Key #${idx + 1} (${this.maskKey(this.keys[idx])}) đã hết thời gian cooldown, sẵn sàng sử dụng lại.`);
        }
        return idx;
      }
    }

    return null;
  }

  /**
   * Đánh dấu key tại index đã hết Quota (cooldown 1 tiếng)
   */
  public markExhausted(index: number, reason = '429 Quota Exceeded'): void {
    const key = this.keys[index];
    const COOLDOWN_MS = 60 * 60 * 1000; // 1 tiếng
    this.exhaustedMap.set(index, Date.now() + COOLDOWN_MS);

    console.warn(`⚠️ [KeyPool] Key #${index + 1} (${this.maskKey(key)}) đã hết hạn ngạch (${reason}).`);

    // Chuyển con trỏ sang key tiếp theo
    this.currentIndex = (index + 1) % this.keys.length;
  }

  /**
   * Thực thi một tác vụ gọi Gemini với cơ chế tự động Failover sang Key tiếp theo nếu gặp 429
   */
  public async executeWithRotation<T>(
    operation: (genAI: GoogleGenerativeAI, info: { keyIndex: number; masked: string }) => Promise<T>
  ): Promise<T> {
    if (this.keys.length === 0) {
      throw new Error('Chưa cấu hình bất kỳ GEMINI_API_KEY nào trong hệ thống.');
    }

    let lastError: any = null;
    const triedIndices = new Set<number>();

    // Vòng lặp thử qua các API Keys khả dụng
    while (triedIndices.size < this.keys.length) {
      const idx = this.getNextAvailableIndex();
      if (idx === null) {
        throw new Error(
          `Toàn bộ ${this.keys.length} Gemini API Key trong hệ thống đều đã hết hạn mức Quota trong ngày!`
        );
      }

      triedIndices.add(idx);
      this.currentIndex = idx;
      const currentKey = this.keys[idx];
      const masked = this.maskKey(currentKey);
      const genAI = new GoogleGenerativeAI(currentKey);

      try {
        const result = await operation(genAI, { keyIndex: idx, masked });
        return result;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || '');
        const isQuotaError =
          err?.status === 429 ||
          errMsg.includes('429') ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('RESOURCE_EXHAUSTED');

        if (isQuotaError) {
          this.markExhausted(idx, '429 Quota Exceeded');
          const nextIdx = this.getNextAvailableIndex();
          if (nextIdx !== null && nextIdx !== idx) {
            console.log(
              `🔄 [KeyPool] Tự động chuyển giao quyền sang Key dự phòng #${nextIdx + 1} (${this.maskKey(this.keys[nextIdx])})...`
            );
            continue; // Thử lại ngay lập tức với key tiếp theo
          }
        }

        // Nếu lỗi 403 / 400 API_KEY_INVALID (key sai hoặc bị revoke)
        if (
          err?.status === 400 ||
          err?.status === 403 ||
          errMsg.includes('API_KEY_INVALID') ||
          errMsg.includes('API key not valid')
        ) {
          this.markExhausted(idx, 'Invalid API Key');
          const nextIdx = this.getNextAvailableIndex();
          if (nextIdx !== null && nextIdx !== idx) {
            console.log(
              `🔄 [KeyPool] Key #${idx + 1} không hợp lệ, chuyển sang Key #${nextIdx + 1} (${this.maskKey(this.keys[nextIdx])})...`
            );
            continue;
          }
        }

        // Nếu là lỗi khác (ví dụ: Model 404), quăng ra để tầng model-fallback xử lý
        throw err;
      }
    }

    throw lastError || new Error('Tất cả các Gemini API Key dự phòng đều gặp sự cố.');
  }

  /**
   * Lấy một instance GoogleGenerativeAI đang hoạt động
   */
  public getActiveGenAI(): GoogleGenerativeAI | null {
    const idx = this.getNextAvailableIndex();
    if (idx === null || !this.keys[idx]) return null;
    return new GoogleGenerativeAI(this.keys[idx]);
  }

  /**
   * Kiểm tra xem toàn bộ các API Key có đang bị hết hạn ngạch (429) không
   */
  public isAllExhausted(): boolean {
    return this.getNextAvailableIndex() === null;
  }

  /**
   * Lấy danh sách thống kê trạng thái các key
   */
  public getStats(): KeyStatus[] {
    const now = Date.now();
    return this.keys.map((k, index) => {
      const exhaustedUntil = this.exhaustedMap.get(index);
      return {
        index: index + 1,
        masked: this.maskKey(k),
        isExhausted: !!(exhaustedUntil && now < exhaustedUntil),
        exhaustedUntil,
      };
    });
  }
}

export const geminiKeyManager = new GeminiKeyManager();
