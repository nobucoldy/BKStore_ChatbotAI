import { chatService } from './services/chat.service';

async function testSmalltalkAndFallback() {
  console.log('--- 1. TESTING LOCAL GREETING & SMALLTALK INTERCEPTOR ---');

  const testQueries = [
    { q: 'hi', expectedIntent: 'greeting', expectedModel: 'local-rule-engine' },
    { q: 'hello shop', expectedIntent: 'greeting', expectedModel: 'local-rule-engine' },
    { q: 'xin chào bạn', expectedIntent: 'greeting', expectedModel: 'local-rule-engine' },
    { q: 'alo bot oi', expectedIntent: 'greeting', expectedModel: 'local-rule-engine' },
    { q: 'bạn là ai', expectedIntent: 'about_bot', expectedModel: 'local-rule-engine' },
    { q: 'bạn tên gì', expectedIntent: 'about_bot', expectedModel: 'local-rule-engine' },
    { q: 'em là ai thế', expectedIntent: 'about_bot', expectedModel: 'local-rule-engine' },
    { q: 'giới thiệu bản thân đi', expectedIntent: 'about_bot', expectedModel: 'local-rule-engine' },
    { q: 'bot có thể làm được gì', expectedIntent: 'about_bot', expectedModel: 'local-rule-engine' },
    { q: 'cảm ơn bot nhiều', expectedIntent: 'courtesy', expectedModel: 'local-rule-engine' },
    { q: 'tạm biệt shop', expectedIntent: 'courtesy', expectedModel: 'local-rule-engine' },
  ];

  for (const item of testQueries) {
    const start = performance.now();
    const res = await chatService.handleMessage({ message: item.q });
    const duration = Math.round(performance.now() - start);

    console.log(`Query: "${item.q}" -> Tool: ${res.toolUsed} | Model: ${res.model} | Time: ${duration}ms`);

    if (res.model !== item.expectedModel) {
      throw new Error(`Failed for "${item.q}": expected model ${item.expectedModel}, got ${res.model}`);
    }
    if (res.toolUsed !== item.expectedIntent) {
      throw new Error(`Failed for "${item.q}": expected intent ${item.expectedIntent}, got ${res.toolUsed}`);
    }
  }
  console.log('✅ ALL 11 LOCAL GREETING TESTS PASSED!');

  console.log('\n--- 2. TESTING NON-SMALLTALK QUERIES WITH GREETING PREFIX (MUST NOT BE INTERCEPTED AS SMALLTALK) ---');
  // Query starting with greeting but contains actual task
  const taskQuery = 'chào bot, tư vấn cho mình laptop 20 triệu';
  const taskRes = await chatService.handleMessage({ message: taskQuery });
  console.log(`Query: "${taskQuery}" -> Tool: ${taskRes.toolUsed} | Model: ${taskRes.model}`);
  if (taskRes.toolUsed === 'greeting' || taskRes.toolUsed === 'about_bot') {
    throw new Error(`Failed: "${taskQuery}" should be a product consultation task, not smalltalk!`);
  }
  console.log('✅ PASS: Greeting with task is correctly routed to task processor!');

  console.log('\n--- 3. TESTING SMART OFFLINE FALLBACK (SIMULATING 429 QUOTA EXCEEDED) ---');
  // Mock generateWithFallback to simulate Gemini 429 Quota Exceeded
  const originalGenerate = (chatService as any).generateWithFallback;
  (chatService as any).generateWithFallback = async () => {
    const err: any = new Error('429 Resource Exhausted: Quota exceeded for quota metric');
    err.status = 429;
    throw err;
  };

  try {
    // Test general question when Gemini is 429
    const fallbackRes = await chatService.handleMessage({
      message: 'Có những dòng máy nào mỏng nhẹ dành cho doanh nhân?',
    });
    console.log('Fallback query: "Có những dòng máy nào mỏng nhẹ dành cho doanh nhân?"');
    console.log('Fallback model:', fallbackRes.model);
    console.log('Fallback suggestions:', fallbackRes.suggestions);
    console.log('Fallback cards attached:', !!fallbackRes.cards);
    console.log('Fallback reply preview:\n' + fallbackRes.reply.slice(0, 200) + '...');

    if (fallbackRes.model !== 'smart-offline-fallback') {
      throw new Error(`Expected model smart-offline-fallback, got ${fallbackRes.model}`);
    }
    if (!fallbackRes.reply.includes('BK-Bot') && !fallbackRes.reply.includes('BK-Store')) {
      throw new Error('Fallback reply should be courteous and mention BK-Bot / BK-Store');
    }
    console.log('✅ PASS: Smart Offline Fallback handles 429 smoothly without throwing error or crashing!');
  } finally {
    (chatService as any).generateWithFallback = originalGenerate;
  }

  console.log('\n🎉 ALL INTEGRATION & FALLBACK TESTS PASSED 100%!');
  process.exit(0);
}

testSmalltalkAndFallback().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
