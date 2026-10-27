import { products as seedProducts } from '../../db/seedData';
import { normalizeText } from '../ai-tools.service';
import { ChatHistoryItem } from './chat.types';

export interface DialogueCandidate {
  index: number;
  id: string;
  name: string;
  slug: string;
  brand: string;
  price: number;
  formattedPrice: string;
}

export interface DialogueStateSnapshot {
  activeProduct?: DialogueCandidate;
  recentCandidates: DialogueCandidate[];
  resolvedQueryText: string;
  referenceType?: 'ordinal' | 'comparative_cheaper' | 'comparative_expensive' | 'pronoun' | 'direct';
}

export class DialogueStateService {
  /**
   * Trích xuất danh sách các sản phẩm ứng viên được bot hoặc người dùng nhắc tới gần nhất trong lịch sử hội thoại
   */
  public extractRecentCandidates(history: ChatHistoryItem[] = []): DialogueCandidate[] {
    const candidates: DialogueCandidate[] = [];
    const seenSlugs = new Set<string>();

    // Duyệt ngược lịch sử tìm các tin nhắn của assistant gần nhất
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.role === 'assistant') {
        const content = msg.content || '';
        const normContent = normalizeText(content);

        const matchedPositions: Array<{ pos: number; prod: (typeof seedProducts)[0] }> = [];

        for (const prod of seedProducts) {
          const pNameNorm = normalizeText(prod.name);
          const pSlugClean = normalizeText(prod.slug).replace(/-/g, ' ');

          let pos = normContent.indexOf(pNameNorm);
          if (pos === -1) pos = normContent.indexOf(pSlugClean);
          if (pos !== -1) {
            matchedPositions.push({ pos, prod });
          }
        }

        // Sắp xếp các sản phẩm theo đúng thứ tự xuất hiện trong câu trả lời của trợ lý
        matchedPositions.sort((a, b) => a.pos - b.pos);

        for (const item of matchedPositions) {
          const prod = item.prod;
          if (!seenSlugs.has(prod.slug)) {
            seenSlugs.add(prod.slug);
            candidates.push({
              index: candidates.length + 1,
              id: prod.id,
              name: prod.name,
              slug: prod.slug,
              brand: prod.brand,
              price: Number(prod.price),
              formattedPrice: new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
              }).format(Number(prod.price)),
            });
          }
        }

        // Nếu đã tìm thấy ít nhất 1 sản phẩm trong tin nhắn bot gần nhất thì dừng
        if (candidates.length > 0) {
          break;
        }
      }
    }

    return candidates;
  }

  /**
   * Khử tham chiếu đại từ (Coreference Resolution):
   * Thay thế các từ như "máy thứ hai", "máy 1", "con rẻ hơn", "máy này", "ở Cầu Giấy còn nó không"
   * thành tên sản phẩm cụ thể.
   */
  public resolveCoreferences(
    message: string,
    history: ChatHistoryItem[] = []
  ): DialogueStateSnapshot {
    const candidates = this.extractRecentCandidates(history);
    const norm = normalizeText(message);
    let activeProduct: DialogueCandidate | undefined = undefined;
    let referenceType: DialogueStateSnapshot['referenceType'] = undefined;
    let resolvedQueryText = message;

    if (candidates.length > 0) {
      // 1. Tham chiếu theo thứ tự (Ordinal Reference: "máy 1", "máy thứ 2", "con thứ nhất", "máy 2")
      const rawOrdinalMatch =
        resolvedQueryText.match(/\b(?:máy|con|chiếc)\s+(?:thứ\s+)?(\d+)\b/i) ||
        resolvedQueryText.match(/\b(?:máy|con|chiếc)\s+(\d+)\b/i);
      const ordinalMatch =
        rawOrdinalMatch ||
        norm.match(/\b(?:may|con|chiec)\s+(?:thu\s+)?(\d+)\b/i) ||
        norm.match(/\b(?:may|con|chiec)\s+(\d+)\b/i);

      if (ordinalMatch) {
        const idx = parseInt(ordinalMatch[1], 10) - 1;
        if (idx >= 0 && idx < candidates.length) {
          activeProduct = candidates[idx];
          referenceType = 'ordinal';
          const matchToReplace = rawOrdinalMatch ? rawOrdinalMatch[0] : ordinalMatch[0];
          resolvedQueryText = resolvedQueryText.replace(
            matchToReplace,
            activeProduct.name
          );
        }
      }

      // 2. Tham chiếu so sánh giá (Comparative Reference: "con rẻ hơn", "máy rẻ nhất", "bản rẻ hơn")
      if (!activeProduct) {
        const isAskingCheaper =
          norm.includes('re hon') ||
          norm.includes('re nhat') ||
          norm.includes('it tien hon') ||
          norm.includes('gia thap hon');

        const isAskingMoreExpensive =
          norm.includes('dat hon') ||
          norm.includes('dat nhat') ||
          norm.includes('cao cap hon') ||
          norm.includes('gia cao hon') ||
          norm.includes('xin hon');

        if (isAskingCheaper && candidates.length >= 2) {
          const sorted = [...candidates].sort((a, b) => a.price - b.price);
          activeProduct = sorted[0];
          referenceType = 'comparative_cheaper';
          resolvedQueryText = `${resolvedQueryText} (${activeProduct.name})`;
        } else if (isAskingMoreExpensive && candidates.length >= 2) {
          const sorted = [...candidates].sort((a, b) => b.price - a.price);
          activeProduct = sorted[0];
          referenceType = 'comparative_expensive';
          resolvedQueryText = `${resolvedQueryText} (${activeProduct.name})`;
        }
      }

      // 3. Tham chiếu đại từ chỉ định đơn lẻ: "máy này", "con này", "chế độ bảo hành của nó", "còn nó không"
      if (!activeProduct) {
        const hasPronounRef =
          norm.includes('may nay') ||
          norm.includes('con nay') ||
          norm.includes('chiec nay') ||
          norm.includes('cua no') ||
          norm.includes('con no khong') ||
          norm.includes('may do') ||
          norm.includes('con do');

        if (hasPronounRef) {
          // Lấy sản phẩm đầu tiên hoặc sản phẩm duy nhất trong context
          activeProduct = candidates[0];
          referenceType = 'pronoun';
          resolvedQueryText = resolvedQueryText
            .replace(/\b(?:máy này|con này|chiếc này|máy đó|con đó)\b/gi, activeProduct.name)
            .replace(/\bcủa nó\b/gi, `của ${activeProduct.name}`)
            .replace(/\bcòn nó không\b/gi, `còn ${activeProduct.name} không`);
        }
      }
    }

    // 4. Nếu câu hỏi nhắc trực tiếp một sản phẩm cụ thể
    if (!activeProduct) {
      for (const prod of seedProducts) {
        const pNameNorm = normalizeText(prod.name);
        if (norm.includes(pNameNorm)) {
          activeProduct = {
            index: 1,
            id: prod.id,
            name: prod.name,
            slug: prod.slug,
            brand: prod.brand,
            price: Number(prod.price),
            formattedPrice: new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(Number(prod.price)),
          };
          referenceType = 'direct';
          break;
        }
      }
    }

    return {
      activeProduct,
      recentCandidates: candidates,
      resolvedQueryText,
      referenceType,
    };
  }
}

export const dialogueStateService = new DialogueStateService();
