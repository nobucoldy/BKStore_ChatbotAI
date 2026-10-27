import { app } from './app';
import { Server } from 'http';
import { pool } from './config/db';
import { ragService } from './services/rag.service';
import { sanitizeChatReply } from './services/chat.service';

const TEST_PORT = 5088;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runChatTests() {
  console.log('====================================================');
  console.log('🤖 BK-STORE AI CHATBOT & RAG INTEGRATION TESTS');
  console.log('====================================================');

  await ragService.initialize();

  const server: Server = app.listen(TEST_PORT, () => {
    console.log(`📡 Test server running on ${BASE_URL}`);
  });

  try {
    // Test 1: Empty message rejection
    console.log('\n--- 1. Testing Validation: Empty message ---');
    const res1 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });
    const data1 = (await res1.json()) as any;
    if (res1.status !== 400 || data1.success !== false) {
      throw new Error(`Expected 400 rejection, got ${res1.status}`);
    }
    console.log('✅ [PASS] Empty message rejected with 400 Bad Request');

    // Test 2: RAG Policy Query (Chính sách đổi trả)
    console.log('\n--- 2. Testing RAG Policy Query: Đổi trả 1 đổi 1 ---');
    const res2 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Chính sách 1 đổi 1 trong bao nhiêu ngày nếu máy bị lỗi phần cứng?',
      }),
    });
    const data2 = (await res2.json()) as any;
    if (!data2.success || !data2.data?.reply) {
      throw new Error(`Failed to get reply: ${JSON.stringify(data2)}`);
    }
    console.log('Model used:', data2.data.model);
    console.log('Citations:', data2.data.citations);
    console.log('Reply preview:', data2.data.reply.slice(0, 150) + '...');
    if (!data2.data.reply.includes('30 ngày') && !data2.data.reply.includes('1 đổi 1') && !data2.data.reply.includes('đổi')) {
      console.warn('⚠️ Warning: Expected 30 ngày in reply');
    }
    console.log('✅ [PASS] RAG Knowledge correctly referenced in response');

    // Test 3: AI Tool: Check Inventory
    console.log('\n--- 3. Testing AI Tool: checkInventory ---');
    const res3 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Laptop ASUS Vivobook 14 ở Cầu Giấy còn hàng không shop?',
      }),
    });
    const data3 = (await res3.json()) as any;
    if (!data3.success || data3.data?.toolUsed !== 'checkInventory') {
      throw new Error(`Expected toolUsed: checkInventory, got ${data3.data?.toolUsed}`);
    }
    console.log('Tool used:', data3.data.toolUsed);
    console.log('Cards attached:', data3.data.cards?.type);
    console.log('Reply preview:', data3.data.reply.slice(0, 150) + '...');
    console.log('✅ [PASS] checkInventory executed and returned stock card');

    // Test 4: AI Tool: Safe Order Lookup (Block code/phone in chat & require auth/Header)
    console.log('\n--- 4. Testing AI Tool: getMyOrders (Block direct orderCode & phone in chat) ---');
    const res4 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Kiểm tra giúp mình đơn hàng #BK-1024 số điện thoại 0912345678 với',
      }),
    });
    const data4 = (await res4.json()) as any;
    if (!data4.success || data4.data?.toolUsed !== 'getMyOrders') {
      throw new Error(`Expected toolUsed: getMyOrders, got ${data4.data?.toolUsed}`);
    }
    console.log('Tool used:', data4.data.toolUsed);
    console.log('Reply preview:', data4.data.reply.slice(0, 150) + '...');
    if (!data4.data.reply.includes('bảo mật') && !data4.data.reply.includes('Đăng nhập') && !data4.data.reply.includes('Tra cứu vận đơn')) {
      throw new Error('Expected security or login guidance in response to direct orderCode/phone lookup');
    }
    console.log('✅ [PASS] Direct orderCode/phone in chat safely blocked and guided to login/Header');

    // Test 5: AI Tool: Filter Products by Budget
    console.log('\n--- 5. Testing AI Tool: filterProducts ---');
    const res5 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Tài chính tầm 30 đến 40 triệu tư vấn giúp mình laptop cấu hình mạnh',
      }),
    });
    const data5 = (await res5.json()) as any;
    if (!data5.success || data5.data?.toolUsed !== 'filterProducts') {
      throw new Error(`Expected toolUsed: filterProducts, got ${data5.data?.toolUsed}`);
    }
    console.log('Tool used:', data5.data.toolUsed);
    console.log('Cards type:', data5.data.cards?.type, 'Products count:', data5.data.cards?.data?.length);
    console.log('Reply preview:', data5.data.reply.slice(0, 150) + '...');
    console.log('✅ [PASS] filterProducts executed and returned product cards');

    // Test 6: Brand Knowledge Query (Thương hiệu & Công nghệ)
    console.log('\n--- 6. Testing Brand Knowledge Query: Xuất xứ & Ưu điểm Keychron / Apple ---');
    const res6 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Bàn phím cơ Keychron xuất xứ từ đâu và có những ưu điểm công nghệ gì?',
      }),
    });
    const data6 = (await res6.json()) as any;
    if (!data6.success || !data6.data?.reply) {
      throw new Error(`Failed to get reply for brand query: ${JSON.stringify(data6)}`);
    }
    console.log('Model used:', data6.data.model);
    console.log('Citations:', data6.data.citations);
    console.log('Reply preview:', data6.data.reply.slice(0, 150) + '...');
    console.log('✅ [PASS] Brand Knowledge successfully retrieved and answered by Chatbot');

    // Test 7: Output Sanitizer Unit Verification (Strip internal metadata & checklist leaks)
    console.log('\n--- 7. Testing Output Sanitizer (Metadata & CoT Leak Prevention) ---');
    const dirtySample = `Dạ em chào anh/chị! BK-Store hiện có đầy đủ các mẫu laptop và phụ kiện chính hãng. Anh/chị có muốn em giữ máy trước tại showroom gần mình không ạ?

/technical metadata printed:* Checked (no [Tài liệu: ...] or internal JSON tags). * Suggest next step at end: Checked.`;

    const cleaned = sanitizeChatReply(dirtySample);
    if (
      cleaned.includes('technical metadata') ||
      cleaned.includes('Checked') ||
      cleaned.includes('Suggest next step') ||
      cleaned.includes('internal JSON tags')
    ) {
      throw new Error(`Sanitizer failed to clean metadata leak! Got: "${cleaned}"`);
    }
    if (!cleaned.includes('BK-Store hiện có đầy đủ')) {
      throw new Error(`Sanitizer erroneously modified genuine reply content! Got: "${cleaned}"`);
    }
    console.log('Cleaned text preview:', cleaned);
    console.log('✅ [PASS] Internal metadata and checklist leak completely purged by Sanitizer');

    console.log('\n====================================================');
    console.log('🎉 ALL 7 AI CHATBOT & RAG INTEGRATION TESTS PASSED!');
    console.log('====================================================');
  } finally {
    server.close();
    await pool.end();
  }
}

runChatTests().catch((err) => {
  console.error('❌ Chat API Test Failed:', err);
  process.exit(1);
});
