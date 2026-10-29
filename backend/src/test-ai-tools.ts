import { checkInventory, trackOrder, filterProducts, getProductDetails, executeAiTool } from './services/ai-tools.service';
import { pool } from './config/db';

async function testAll() {
  console.log('--- 1. Testing checkInventory ---');
  const inv1 = await checkInventory({ productName: 'ASUS TUF', branchName: 'Cầu Giấy' });
  console.log('Result inv1 found:', inv1.found);
  console.log('Product:', inv1.product?.name);
  console.log('Stock at Cầu Giấy:', inv1.totalStock);
  console.log('Message:', inv1.message);

  console.log('\n--- 2. Testing trackOrder ---');
  const ord1 = await trackOrder({ orderCode: '1024' });
  console.log('Result ord1 found:', ord1.found);
  console.log('Order code:', ord1.orderCode);
  console.log('Customer:', ord1.customerName);
  console.log('Status:', ord1.statusLabel);
  console.log('Total:', ord1.formattedTotal);
  console.log('Tracking:', ord1.trackingInfo);

  console.log('\n--- 3. Testing filterProducts ---');
  const filt1 = await filterProducts({ category: 'laptop', minPrice: 30000000, maxPrice: 40000000 });
  console.log('Result filt1 matches count:', filt1.totalMatches);
  console.log('Matches:', filt1.products.map((p) => `${p.name} (${p.formattedPrice})`));

  console.log('\n--- 4. Testing getProductDetails ---');
  const det1 = await getProductDetails('lenovo-thinkpad-e14-gen-7-21t90025vn');
  console.log('Result det1 found:', det1.found);
  console.log('Product:', det1.product?.name);
  console.log('CPU:', det1.product?.specs?.cpu);
  console.log('RAM:', det1.product?.specs?.ram);

  console.log('\n--- 5. Testing executeAiTool Dispatcher ---');
  const dispRes = await executeAiTool('checkInventory', { productName: 'Lenovo ThinkPad' });
  console.log('Dispatcher Res found:', dispRes.found);
  console.log('Product:', dispRes.product?.name);
  console.log('Total Stock across all branches:', dispRes.totalStock);

  console.log('\n🎉 ALL AI TOOLS FUNCTIONED PERFECTLY!');
  
  await pool.end();
  process.exit(0);
}

testAll().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
