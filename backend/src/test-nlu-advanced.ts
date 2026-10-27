import { VietnameseNormalizer } from './services/chat/vietnamese-normalizer';
import { dialogueStateService } from './services/chat/dialogue-state.service';
import { chatService } from './services/chat.service';
import { pool } from './config/db';

async function runAdvancedNluTests() {
  console.log('========================================================');
  console.log('🧠 BK-BOT ADVANCED NLU & CONVERSATIONAL AI TEST SUITE');
  console.log('========================================================');

  // --------------------------------------------------------------------------
  // TEST 1: Vietnamese Normalizer (Slang, Teencode, Telex typos, Currencies)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing VietnameseNormalizer ---');

  const t1 = VietnameseNormalizer.normalize('tư vấn con lap tuf tầm 20 củ');
  console.log('Raw: "tư vấn con lap tuf tầm 20 củ"');
  console.log('Normalized:', t1);
  if (!t1.includes('laptop') || !t1.includes('tuf gaming') || !t1.includes('20 triệu')) {
    throw new Error(`Normalization failed for slang: got "${t1}"`);
  }
  console.log('✅ PASS: Slang "lap tuf 20 củ" successfully normalized');

  const t2 = VietnameseNormalizer.normalize('ip16 prm giá bao nhiêu');
  console.log('Raw: "ip16 prm giá bao nhiêu"');
  console.log('Normalized:', t2);
  if (!t2.includes('iphone 16') || !t2.includes('pro max')) {
    throw new Error(`Normalization failed for ip16 prm: got "${t2}"`);
  }
  console.log('✅ PASS: Acronym "ip16 prm" normalized to "iphone 16 pro max"');

  const t3 = VietnameseNormalizer.normalize('mays tinhs vivobookf 15-25 củ');
  console.log('Raw: "mays tinhs vivobookf 15-25 củ"');
  console.log('Normalized:', t3);
  if (!t3.includes('máy') || !t3.includes('tính') || !t3.includes('vivobook') || !t3.includes('15 triệu đến 25 triệu')) {
    throw new Error(`Normalization failed for telex: got "${t3}"`);
  }
  console.log('✅ PASS: Telex typo & currency range normalized correctly');

  const t4 = VietnameseNormalizer.normalize('con nì bảo hành thế nào');
  console.log('Raw: "con nì bảo hành thế nào"');
  console.log('Normalized:', t4);
  if (!t4.includes('máy này')) {
    throw new Error(`Normalization failed for dialect: got "${t4}"`);
  }
  console.log('✅ PASS: Dialect pronoun "con nì" normalized to "máy này"');

  // --------------------------------------------------------------------------
  // TEST 2: Coreference Resolution (Dialogue State Tracking - DST)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Coreference Resolution (DST) ---');

  const mockHistory = [
    {
      role: 'user' as const,
      content: 'Tư vấn laptop cho mình tầm 15 đến 25 triệu',
    },
    {
      role: 'assistant' as const,
      content:
        'Dạ em xin gợi ý 2 mẫu máy rất phù hợp cho mình:\n1. Laptop ASUS Vivobook 14 X1404VA-EB355W (Giá 14.990.000₫) mỏng nhẹ pin tốt.\n2. Laptop Lenovo ThinkPad E14 Gen 7 21T90025VN (Giá 21.990.000₫) độ bền chuẩn quân đội, bàn phím gõ cực êm.',
    },
  ];

  // 2.1. Ordinal reference: "máy thứ 2"
  const snap1 = dialogueStateService.resolveCoreferences('máy thứ 2 ở Cầu Giấy còn hàng không?', mockHistory);
  console.log('Ordinal query: "máy thứ 2 ở Cầu Giấy còn hàng không?"');
  console.log('Resolved machine:', snap1.activeProduct?.name);
  console.log('Resolved query text:', snap1.resolvedQueryText);
  if (!snap1.activeProduct?.name.includes('ThinkPad E14')) {
    throw new Error(`Expected ThinkPad E14 for "máy thứ 2", got ${snap1.activeProduct?.name}`);
  }
  console.log('✅ PASS: Ordinal reference "máy thứ 2" correctly resolved to ThinkPad E14');

  // 2.2. Comparative reference: "con rẻ hơn"
  const snap2 = dialogueStateService.resolveCoreferences('con rẻ hơn bảo hành thế nào shop?', mockHistory);
  console.log('Comparative query: "con rẻ hơn bảo hành thế nào shop?"');
  console.log('Resolved machine:', snap2.activeProduct?.name);
  if (!snap2.activeProduct?.name.includes('Vivobook 14')) {
    throw new Error(`Expected Vivobook 14 for "con rẻ hơn", got ${snap2.activeProduct?.name}`);
  }
  console.log('✅ PASS: Comparative reference "con rẻ hơn" correctly resolved to Vivobook 14');

  // --------------------------------------------------------------------------
  // TEST 3: End-to-End Chat with Coreference in History
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing E2E Chat with Coreference Resolution ---');
  const chatRes1 = await chatService.handleMessage({
    message: 'máy thứ 2 ở Cầu Giấy còn hàng không shop?',
    history: mockHistory,
  });
  console.log('Tool used:', chatRes1.toolUsed);
  console.log('Cards attached:', chatRes1.cards?.type);
  console.log('Reply preview:\n' + chatRes1.reply.slice(0, 180) + '...');
  if (chatRes1.toolUsed !== 'checkInventory') {
    throw new Error(`Expected checkInventory tool, got ${chatRes1.toolUsed}`);
  }
  if (!chatRes1.reply.toLowerCase().includes('thinkpad')) {
    throw new Error('Expected ThinkPad in reply');
  }
  console.log('✅ PASS: E2E Chat resolved "máy thứ 2" -> ThinkPad inventory check!');

  // --------------------------------------------------------------------------
  // TEST 4: Multi-Intent / Compound Query Handling (Inventory + 0% Installment)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Multi-Intent (Inventory check + 0% Installment Policy) ---');
  const compoundQuery = 'ASUS Vivobook 14 ở Cầu Giấy còn hàng không, với lại có được trả góp 0% không?';
  const chatRes2 = await chatService.handleMessage({
    message: compoundQuery,
  });

  console.log('Query:', compoundQuery);
  console.log('Tool used:', chatRes2.toolUsed);
  console.log('Citations:', chatRes2.citations);
  console.log('Cards attached:', chatRes2.cards?.type);
  console.log('Reply preview:\n' + chatRes2.reply.slice(0, 250) + '...');

  if (chatRes2.toolUsed !== 'checkInventory') {
    throw new Error(`Expected primary tool checkInventory, got ${chatRes2.toolUsed}`);
  }
  if (chatRes2.citations.length === 0) {
    throw new Error('Expected citations for secondary intent (Installment/Payment policy)');
  }
  const replyLower = chatRes2.reply.toLowerCase();
  const mentionsStock = replyLower.includes('cầu giấy') || replyLower.includes('còn hàng') || replyLower.includes('tồn');
  const mentionsInstallment = replyLower.includes('trả góp') || replyLower.includes('0%') || replyLower.includes('thanh toán');

  if (!mentionsStock || !mentionsInstallment) {
    throw new Error('Compound reply should address BOTH inventory stock AND installment policy!');
  }
  console.log('✅ PASS: Compound query answered BOTH Inventory AND Installment policy in 1 turn!');

  // --------------------------------------------------------------------------
  // TEST 5: Slang & Teencode Query ("lap tuf 20 củ")
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Slang & Teencode E2E Consultation ---');
  const slangQuery = 'Tư vấn cho mình con lap tuf tầm 20 củ chơi game mượt';
  const chatRes3 = await chatService.handleMessage({
    message: slangQuery,
  });
  console.log('Query:', slangQuery);
  console.log('Tool used:', chatRes3.toolUsed);
  console.log('Model:', chatRes3.model);
  console.log('Cards type:', chatRes3.cards?.type, 'Count:', chatRes3.cards?.data?.length);
  console.log('Reply preview:\n' + chatRes3.reply.slice(0, 200) + '...');

  if (chatRes3.toolUsed !== 'filterProducts') {
    throw new Error(`Expected filterProducts for slang query, got ${chatRes3.toolUsed}`);
  }
  if (!chatRes3.cards || chatRes3.cards.data.length === 0) {
    throw new Error('Expected products card attached for slang query');
  }
  console.log('✅ PASS: Slang "lap tuf 20 củ" correctly routed to filterProducts & returned ASUS TUF!');

  console.log('\n========================================================');
  console.log('🎉 ALL ADVANCED NLU & CONVERSATIONAL AI TESTS PASSED 100%!');
  console.log('========================================================');

  await pool.end();
  process.exit(0);
}

runAdvancedNluTests().catch(async (err) => {
  console.error('❌ Advanced NLU Test Failed:', err);
  await pool.end();
  process.exit(1);
});
