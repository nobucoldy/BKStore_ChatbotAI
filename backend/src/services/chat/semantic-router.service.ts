import { normalizeText } from '../ai-tools.service';
import { VietnameseNormalizer } from './vietnamese-normalizer';
import { dialogueStateService, DialogueStateSnapshot } from './dialogue-state.service';
import { ChatHistoryItem, DetectedIntentResult } from './chat.types';

export interface CompoundIntentResult extends DetectedIntentResult {
  isCompound: boolean;
  secondaryIntent?: 'rag_policy' | 'check_inventory' | 'product_details' | 'general';
  secondaryTopic?: string;
  secondaryRAGQuery?: string;
  dialogueState?: DialogueStateSnapshot;
}

export class SemanticRouterService {
  /**
   * Phân tích câu hỏi người dùng, kết hợp chuẩn hóa tiếng Việt, khử tham chiếu đại từ và nhận diện câu hỏi phức hợp (Multi-Intent)
   */
  public analyzeQuery(
    rawMessage: string,
    history: ChatHistoryItem[] = []
  ): {
    normalizedText: string;
    dialogueState: DialogueStateSnapshot;
    compoundResult: {
      isCompound: boolean;
      primaryIntent?: string;
      secondaryTopic?: string;
      secondaryQuery?: string;
    };
  } {
    // 1. Chuẩn hóa tiếng Việt (Teencode, từ lóng, telex, tiền tệ)
    const normalizedText = VietnameseNormalizer.normalize(rawMessage);

    // 2. Khử tham chiếu ngữ cảnh (DST Coreference)
    const dialogueState = dialogueStateService.resolveCoreferences(normalizedText, history);
    const resolvedText = dialogueState.resolvedQueryText;
    const norm = normalizeText(resolvedText);

    // 3. Nhận diện các liên từ ghép đa ý định (Compound Connectors)
    const compoundConnectors = [
      'voi lai',
      'va cho minh hoi',
      'tien the',
      'dong thoi',
      'ngoai ra',
      'the con',
      'con ve',
      'co duoc tra gop',
      'co tra gop',
      'chinh sach the nao',
      'bao hanh the nao',
      'doi tra the nao',
    ];

    let isCompound = false;
    let secondaryTopic: string | undefined = undefined;
    let secondaryQuery: string | undefined = undefined;

    // Kiểm tra xem có 2 vế câu hỏi rõ rệt không
    const hasConnector = compoundConnectors.some((c) => norm.includes(c));

    // Kiểm tra sự xuất hiện đồng thời của Tool hỏi nghiệp vụ + Chủ đề chính sách RAG
    const hasInventoryQuery =
      norm.includes('con hang') ||
      norm.includes('ton kho') ||
      norm.includes('o chi nhanh') ||
      norm.includes('tai showroom');

    const hasOrderQuery =
      norm.includes('don hang') ||
      norm.includes('ma don') ||
      norm.includes('van don');

    const hasWarrantyPolicy =
      norm.includes('bao hanh') ||
      norm.includes('1 doi 1') ||
      norm.includes('doi tra') ||
      norm.includes('hoan tien');

    const hasPaymentPolicy =
      norm.includes('tra gop') ||
      norm.includes('0%') ||
      norm.includes('thanh toan') ||
      norm.includes('vietqr') ||
      norm.includes('hoa don vat') ||
      norm.includes('xuat vat');

    const hasShippingPolicy =
      norm.includes('giao hang') ||
      norm.includes('van chuyen') ||
      norm.includes('giao 2h') ||
      norm.includes('dong kiem') ||
      norm.includes('phi ship');

    if (hasInventoryQuery && (hasPaymentPolicy || hasWarrantyPolicy || hasShippingPolicy)) {
      isCompound = true;
      if (hasPaymentPolicy) {
        secondaryTopic = 'payment_installment';
        secondaryQuery = 'chính sách trả góp 0% và thanh toán hóa đơn';
      } else if (hasWarrantyPolicy) {
        secondaryTopic = 'warranty_policy';
        secondaryQuery = 'chính sách bảo hành 1 đổi 1 30 ngày';
      } else if (hasShippingPolicy) {
        secondaryTopic = 'shipping_policy';
        secondaryQuery = 'chính sách giao hàng siêu tốc 2 giờ và phí ship';
      }
    } else if (hasOrderQuery && (hasWarrantyPolicy || hasShippingPolicy)) {
      isCompound = true;
      secondaryTopic = hasWarrantyPolicy ? 'warranty_policy' : 'shipping_policy';
      secondaryQuery = hasWarrantyPolicy
        ? 'chính sách bảo hành và đổi trả đơn hàng'
        : 'thời gian giao hàng và đồng kiểm';
    }

    return {
      normalizedText: resolvedText,
      dialogueState,
      compoundResult: {
        isCompound,
        secondaryTopic,
        secondaryQuery,
      },
    };
  }
}

export const semanticRouterService = new SemanticRouterService();
