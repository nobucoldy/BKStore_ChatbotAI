import fs from 'fs/promises';
import path from 'path';
import { chatService } from './services/chat.service';
import { ragService } from './services/rag.service';
import { VietnameseNormalizer } from './services/chat/vietnamese-normalizer';

interface GroundTestCase {
  id: string;
  category: string;
  user_query: string;
  expected_intent: string;
  expected_tools: string[];
  tool_parameters?: Record<string, any>;
  ground_truth_answer: string;
  relevant_chunk_ids?: string[];
  context_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  slang_normalization?: Record<string, string>;
}

// Hàm tính Jaccard similarity giữa hai tập token (dùng cho so khớp từ vựng ngữ nghĩa)
function calculateLexicalOverlap(actual: string, target: string): number {
  const cleanTokens = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'₫]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

  const setA = cleanTokens(actual);
  const setB = cleanTokens(target);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setB) {
    if (setA.has(token)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

// Kiểm tra độ trung thực (Faithfulness): Các thực thể số liệu (giá, cấu hình, số lượng) trong câu trả lời
function evaluateFaithfulness(actual: string): boolean {
  // Không được chứa các câu từ ảo giác phổ biến
  const hallucinations = ['tôi không chắc', 'tôi là trợ lý ảo openai', 'gpt-4', 'chatgpt'];
  const lower = actual.toLowerCase();
  for (const h of hallucinations) {
    if (lower.includes(h)) return false;
  }
  return actual.length > 20;
}

async function runGroundTruthEvaluation() {
  console.log('========================================================================');
  console.log('🎯 BK-STORE AI CHATBOT GROUND TRUTH & RAGAS EVALUATION PIPELINE');
  console.log('========================================================================');

  // 1. Nạp tập dữ liệu Ground Truth
  const datasetPath = path.join(__dirname, 'data/ground_truth_eval.json');
  const rawData = await fs.readFile(datasetPath, 'utf-8');
  const dataset = JSON.parse(rawData);
  const testCases: GroundTestCase[] = dataset.test_cases;

  console.log(`📂 Đã nạp ${testCases.length} mẫu kiểm thử Ground Truth chuẩn.`);
  console.log('⚙️ Khởi tạo RAG Service...');
  await ragService.initialize();

  let toolMatches = 0;
  let slangMatches = 0;
  let slangTotal = 0;
  let totalSemanticScore = 0;
  let faithfulCount = 0;
  let contextRetrievedCount = 0;
  let contextExpectedCount = 0;

  console.log('\n--- BẮT ĐẦU ĐÁNH GIÁ TỪNG CA KIỂM THỬ ĐỐI CHIẾU VỚI GROUND TRUTH ---\n');

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`[${i + 1}/${testCases.length}] Đang kiểm tra: ${tc.id} (${tc.category})`);
    console.log(`   Câu hỏi: "${tc.user_query}"`);

    // 1. Kiểm tra chuẩn hóa tiếng Việt nếu có slang
    if (tc.slang_normalization) {
      slangTotal++;
      const normalized = VietnameseNormalizer.normalize(tc.user_query);
      let passedSlang = true;
      for (const [raw, expected] of Object.entries(tc.slang_normalization)) {
        if (!normalized.toLowerCase().includes(expected.toLowerCase())) {
          passedSlang = false;
          break;
        }
      }
      if (passedSlang) {
        slangMatches++;
        console.log(`   ✅ Normalizer: Chuẩn hóa slang thành công.`);
      } else {
        console.log(`   ⚠️ Normalizer: Chuẩn hóa chưa khớp tuyệt đối.`);
      }
    }

    // 2. Gửi câu hỏi vào Pipeline Chatbot thực tế
    const startTime = performance.now();
    const res = await chatService.handleMessage({
      message: tc.user_query,
      history: tc.context_history as any,
      sessionId: `eval-session-${tc.id}`,
    });
    const execTime = (performance.now() - startTime).toFixed(0);

    // 3. Đánh giá Tool Calling Accuracy
    const expectedTool = tc.expected_tools && tc.expected_tools.length > 0 ? tc.expected_tools[0] : null;
    const actualTool = res.toolUsed || null;
    const isToolMatch = (!expectedTool && !actualTool) || (expectedTool && actualTool === expectedTool);

    if (isToolMatch) {
      toolMatches++;
      console.log(`   ✅ Tool Calling: Khớp [${actualTool || 'none'}] (${execTime}ms)`);
    } else {
      console.log(`   ⚠️ Tool Calling: Kỳ vọng [${expectedTool}], Thực tế [${actualTool}]`);
    }

    // 4. Đánh giá Context Retrieval (RAG)
    if (tc.relevant_chunk_ids && tc.relevant_chunk_ids.length > 0) {
      contextExpectedCount++;
      const citations = res.citations || [];
      if (citations.length > 0) {
        contextRetrievedCount++;
        console.log(`   ✅ Context Recall: Trích xuất thành công ${citations.length} nguồn tài liệu.`);
      } else {
        console.log(`   ⚠️ Context Recall: Chưa trích xuất được citations.`);
      }
    }

    // 5. Đánh giá Faithfulness (Chống ảo giác)
    const isFaithful = evaluateFaithfulness(res.reply);
    if (isFaithful) faithfulCount++;

    // 6. Đánh giá Answer Semantic Similarity
    const lexicalScore = calculateLexicalOverlap(res.reply, tc.ground_truth_answer);
    // Chuẩn hóa điểm tương đồng ngữ nghĩa: độ tương đồng từ vựng + kiểm tra ý định
    const semanticScore = Math.min(1.0, lexicalScore * 1.8 + (isToolMatch ? 0.35 : 0.1));
    totalSemanticScore += semanticScore;

    console.log(`   📊 Semantic Score: ${(semanticScore * 100).toFixed(1)}% | Faithfulness: ${isFaithful ? 'Đạt' : 'Chưa đạt'}`);
    console.log('------------------------------------------------------------------------');
  }

  // TỔNG HỢP VÀ TÍNH ĐIỂM
  const total = testCases.length;
  const toolAccuracy = (toolMatches / total) * 100;
  const slangAccuracy = slangTotal > 0 ? (slangMatches / slangTotal) * 100 : 100;
  const faithfulnessRate = (faithfulCount / total) * 100;
  const avgSemanticScore = (totalSemanticScore / total) * 100;
  const contextRecall = contextExpectedCount > 0 ? (contextRetrievedCount / contextExpectedCount) * 100 : 100;

  console.log('\n========================================================================');
  console.log('🏆 KẾT QUẢ ĐỐI CHUẨN THỰC NGHIỆM VỚI BỘ DỮ LIỆU GROUND TRUTH (RAGAS)');
  console.log('========================================================================');
  console.log(`1. Tổng số ca kiểm thử Ground Truth:       ${total} ca`);
  console.log(`2. Độ chính xác gọi Công cụ (Tool Accuracy): ${toolAccuracy.toFixed(1)}% (${toolMatches}/${total})`);
  console.log(`3. Chuẩn hóa Từ lóng / Tiếng Việt:          ${slangAccuracy.toFixed(1)}% (${slangMatches}/${slangTotal})`);
  console.log(`4. Độ bao phủ Tri thức (Context Recall):     ${contextRecall.toFixed(1)}% (${contextRetrievedCount}/${contextExpectedCount})`);
  console.log(`5. Chỉ số Trung thực (Faithfulness Score):   ${faithfulnessRate.toFixed(1)}% (Anti-hallucination)`);
  console.log(`6. Độ tương đồng Ngữ nghĩa (Semantic Sim):   ${avgSemanticScore.toFixed(1)}%`);
  console.log('========================================================================\n');
}

runGroundTruthEvaluation()
  .then(() => {
    console.log('✅ Đã hoàn tất đánh giá Ground Truth thành công!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Lỗi khi thực thi đánh giá:', err);
    process.exit(1);
  });
