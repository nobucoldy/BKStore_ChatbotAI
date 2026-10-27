import { geminiKeyManager } from '../../config/gemini-keys';
import { geminiLimiter } from './chat-limiter';

// Danh sách các model tối ưu hạn mức (Quota) và tốc độ phản hồi thực tế
export const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
];

export class ChatLlmService {
  private unavailableModels = new Set<string>();

  /**
   * Gọi mô hình Gemini với cơ chế luân chuyển model (Model Fallback),
   * điều tiết hàng đợi (Rate Limiting) và Tự động xoay vòng API Key (Key Pool Failover)
   */
  public async generateWithFallback(
    prompt: string,
    systemInstructionText?: string
  ): Promise<{ text: string; modelName: string }> {
    if (geminiKeyManager.getKeyCount() === 0) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trong file .env');
    }

    // Đợi hàng đợi phân luồng nếu có quá nhiều request đồng thời
    await geminiLimiter.acquire();

    try {
      return await geminiKeyManager.executeWithRotation(async (activeGenAI) => {
        let lastError: any = null;

        for (const modelName of CANDIDATE_MODELS) {
          if (this.unavailableModels.has(modelName)) continue;
          try {
            const modelParams: any = {
              model: modelName,
              generationConfig: {
                temperature: 0.45,
                maxOutputTokens: 2048,
              },
            };
            if (systemInstructionText) {
              modelParams.systemInstruction = systemInstructionText;
            }

            const model = activeGenAI.getGenerativeModel(modelParams);
            const res = await model.generateContent(prompt);
            const text = res.response.text();
            if (text && text.trim().length > 0) {
              return { text: text.trim(), modelName };
            }
          } catch (err: any) {
            lastError = err;
            const errMsg = String(err?.message || '');
            if (err?.status === 404 || errMsg.includes('404 Not Found')) {
              this.unavailableModels.add(modelName);
            }

            // Nếu là lỗi Quota / Rate limit (429), ném lỗi ra ngoài để executeWithRotation đổi Key!
            const isQuotaError =
              err?.status === 429 ||
              errMsg.includes('429') ||
              errMsg.includes('Quota exceeded') ||
              errMsg.includes('RESOURCE_EXHAUSTED');

            if (isQuotaError) {
              throw err;
            }

            console.warn(`⚠️ [ChatService] Model ${modelName} gặp sự cố (${err.status || err.message}), thử model tiếp theo...`);
          }
        }

        throw lastError || new Error('Không thể kết nối với mô hình Gemini AI lúc này.');
      });
    } finally {
      geminiLimiter.release();
    }
  }
}

export const chatLlmService = new ChatLlmService();
