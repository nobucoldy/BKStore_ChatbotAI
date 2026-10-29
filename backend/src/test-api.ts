import { app } from './app';
import { Server } from 'http';
import { pool } from './config/db';
import { inMemoryReviews } from './services/review.service';

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

interface TestCase {
  name: string;
  run: () => Promise<void>;
}

const tests: TestCase[] = [
  {
    name: '1. Health Check Endpoint (/api/health)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const data = await res.json();
      if (data.status !== 'ok') throw new Error(`Expected status 'ok', got ${data.status}`);
    },
  },
  {
    name: '2. Get All Categories (/api/categories)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/categories`);
      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const body = await res.json();
      if (!body.success || !Array.isArray(body.data) || body.data.length !== 3) {
        throw new Error(`Expected 3 categories, got ${body.data?.length}`);
      }
    },
  },
  {
    name: '3. Get All Branches (/api/branches)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/branches`);
      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const body = await res.json();
      if (!body.success || !Array.isArray(body.data) || body.data.length !== 3) {
        throw new Error(`Expected 3 branches, got ${body.data?.length}`);
      }
    },
  },
  {
    name: '4. Filter Products by Category & Brand (/api/products?category=laptop&brand=Lenovo)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/products?category=laptop&brand=Lenovo`);
      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const body = await res.json();
      if (!body.success || body.data.length < 2) {
        throw new Error(`Expected at least 2 Lenovo laptops, got ${body.data?.length}`);
      }
      const names = body.data.map((p: any) => p.name);
      if (!names.some((n: string) => n.includes('ThinkPad') || n.includes('LOQ') || n.includes('ThinkBook'))) {
        throw new Error('Lenovo laptop not found in results');
      }
    },
  },
  {
    name: '5. Product Detail with Branch Inventories (/api/products/:slug)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/products/asus-tuf-gaming-a15-fa506ncg-hn396w`);
      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const body = await res.json();
      if (!body.success || !body.data.inventories || body.data.inventories.length === 0) {
        throw new Error('Product inventories not returned');
      }
      if (!body.data.specs || !body.data.specs.cpu) {
        throw new Error('Product specs missing CPU info');
      }
    },
  },
  {
    name: '6. Secure Order Lookup (Match Code + Phone: #BK-1024)',
    run: async () => {
      const encodedCode = encodeURIComponent('#BK-1024');
      const res = await fetch(`${BASE_URL}/api/orders/${encodedCode}?phone=0912345678`);
      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const body = await res.json();
      if (!body.success || body.data.customerName !== 'Nguyễn Văn An') {
        throw new Error(`Customer name mismatch, got ${body.data?.customerName}`);
      }
      if (body.data.status !== 'delivered') {
        throw new Error(`Order status mismatch, got ${body.data?.status}`);
      }
    },
  },
  {
    name: '7. Secure Order Lookup Rejection (Wrong Phone Number: 0999999999)',
    run: async () => {
      const encodedCode = encodeURIComponent('#BK-1024');
      const res = await fetch(`${BASE_URL}/api/orders/${encodedCode}?phone=0999999999`);
      if (res.status !== 404) {
        throw new Error(`Security failed: expected 404 for wrong phone, got ${res.status}`);
      }
    },
  },
  {
    name: '8. Create New Order (/api/orders)',
    run: async () => {
      const payload = {
        customerName: 'Hoàng Tuấn Kiệt',
        phone: '0988776655',
        address: 'Đại học Bách Khoa Hà Nội, Số 1 Đại Cồ Việt',
        paymentMethod: 'COD',
        items: [
          {
            productId: 'asus-tuf-gaming-a15-fa506ncg-hn396w',
            quantity: 1,
          },
        ],
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
      const body = await res.json();
      const createdOrderCode = body.data?.orderCode || body.data?.order_code;
      if (!body.success || !createdOrderCode || !createdOrderCode.startsWith('#BK-')) {
        throw new Error(`Invalid order code returned: ${createdOrderCode}`);
      }
      const totalAmount = Number(body.data?.totalAmount || body.data?.total_amount || 0);
      if (totalAmount !== 25990000) {
        throw new Error(`Total amount mismatch: expected 25990000, got ${totalAmount}`);
      }

      // Verify newly created order can be retrieved immediately
      const encodedNewCode = encodeURIComponent(createdOrderCode);
      const verifyRes = await fetch(`${BASE_URL}/api/orders/${encodedNewCode}?phone=0988776655`);
      if (verifyRes.status !== 200) {
        throw new Error('Failed to retrieve newly created order by code + phone');
      }
    },
  },
  {
    name: '9. Input Validation Rejection (Invalid Phone & Empty Items)',
    run: async () => {
      const invalidPayload = {
        customerName: 'A', // too short (< 2)
        phone: '12345',     // invalid phone format
        address: 'HN',      // too short (< 5)
        paymentMethod: 'INVALID_METHOD',
        items: [],          // empty items
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      if (res.status !== 400) {
        throw new Error(`Validation failed: expected 400 for invalid data, got ${res.status}`);
      }
      const body = await res.json();
      if (body.success !== false || !Array.isArray(body.details)) {
        throw new Error('Expected validation error details array');
      }
    },
  },
  {
    name: '10. Admin List All Orders (/api/orders)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/orders?page=1&limit=10`);
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      if (!body.success || !Array.isArray(body.data)) {
        throw new Error('Expected success true and data array of orders');
      }
      if (body.data.length === 0) {
        throw new Error('Expected at least 1 order in list');
      }
    },
  },
  {
    name: '11. Create New Product (/api/products)',
    run: async () => {
      const payload = {
        name: 'ASUS ROG Zephyrus G16 OLED 2026',
        categorySlug: 'laptop',
        brand: 'ASUS',
        price: 55990000,
        originalPrice: 59990000,
        stockQuantity: 15,
        thumbnail: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
        images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80'],
        specs: {
          CPU: 'Intel Core Ultra 9 185H',
          GPU: 'NVIDIA GeForce RTX 4080',
          RAM: '32GB LPDDR5X',
        },
        description: 'Laptop gaming cao cấp siêu mỏng nhẹ với màn hình ROG Nebula OLED 2.5K 240Hz.',
        warrantyMonths: 24,
      };

      const res = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status !== 201) throw new Error(`Expected status 201, got ${res.status}`);
      const body = await res.json();
      if (!body.success || !body.data.id || !body.data.slug) {
        throw new Error('Expected created product with id and slug');
      }

      // Verify product detail lookup by slug
      const detailRes = await fetch(`${BASE_URL}/api/products/${body.data.slug}`);
      if (detailRes.status !== 200) {
        throw new Error(`Failed to fetch newly created product by slug: ${body.data.slug}`);
      }
      const detailBody = await detailRes.json();
      if (detailBody.data.brand !== 'ASUS' || Number(detailBody.data.price) !== 55990000) {
        throw new Error('Product detail properties do not match created data');
      }
    },
  },
  {
    name: '12. Update Product (/api/products/:id)',
    run: async () => {
      // Find the created product or an existing product
      const listRes = await fetch(`${BASE_URL}/api/products?search=ASUS ROG Zephyrus G16`);
      const listBody = await listRes.json();
      if (!listBody.data || listBody.data.length === 0) {
        throw new Error('Target product for update not found');
      }

      const targetId = listBody.data[0].id;
      const updatePayload = {
        price: 52990000,
        stockQuantity: 20,
      };

      const res = await fetch(`${BASE_URL}/api/products/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const body = await res.json();
      if (!body.success || Number(body.data.price) !== 52990000) {
        throw new Error(`Expected updated price 52990000, got ${body.data?.price}`);
      }
    },
  },
  {
    name: '13. Delete Product (/api/products/:id)',
    run: async () => {
      const listRes = await fetch(`${BASE_URL}/api/products?search=ASUS ROG Zephyrus G16`);
      const listBody = await listRes.json();
      if (!listBody.data || listBody.data.length === 0) {
        throw new Error('Target product for delete not found');
      }

      const targetId = listBody.data[0].id;
      const targetSlug = listBody.data[0].slug;

      const res = await fetch(`${BASE_URL}/api/products/${targetId}`, {
        method: 'DELETE',
      });

      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const body = await res.json();
      if (!body.success) throw new Error('Expected delete success to be true');

      // Verify product is no longer found
      const verifyRes = await fetch(`${BASE_URL}/api/products/${targetSlug}`);
      if (verifyRes.status !== 404) {
        throw new Error(`Expected 404 for deleted product, got ${verifyRes.status}`);
      }
    },
  },
  {
    name: '14. Over-stock Order Rejection (/api/orders with excessive quantity)',
    run: async () => {
      // Order with 9999 items, which must exceed available stock
      const overStockPayload = {
        customerName: 'Khách hàng Test Tồn kho',
        phone: '0912345678',
        address: 'Hà Nội',
        paymentMethod: 'COD',
        items: [
          {
            productId: 'asus-tuf-gaming-a15-fa506ncg-hn396w',
            quantity: 9999,
          },
        ],
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overStockPayload),
      });

      if (res.status !== 400) {
        throw new Error(`Expected status 400 for over-stock order, got ${res.status}`);
      }
      const body = (await res.json()) as any;
      if (!body.error || !body.error.includes('không đủ số lượng')) {
        throw new Error(`Expected stock shortage error message, got: ${body.error}`);
      }
    },
  },
  {
    name: '15. Stock Deduction on Order Placement (/api/orders)',
    run: async () => {
      // 1. Check stock before ordering
      const getProdRes = await fetch(`${BASE_URL}/api/products/asus-tuf-gaming-a15-fa506ncg-hn396w`);
      const getProdBody = (await getProdRes.json()) as any;
      const initialStock = Number(getProdBody.data?.stock_quantity ?? getProdBody.data?.stockQuantity ?? getProdBody.data?.stock ?? 0);

      // 2. Place order with quantity: 2
      const orderPayload = {
        customerName: 'Kiểm tra trừ tồn kho',
        phone: '0987654321',
        address: 'Hồ Chí Minh',
        paymentMethod: 'COD',
        items: [
          {
            productId: 'asus-tuf-gaming-a15-fa506ncg-hn396w',
            quantity: 2,
          },
        ],
      };

      const orderRes = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (orderRes.status !== 201) throw new Error(`Order failed with status ${orderRes.status}`);

      // 3. Check stock after ordering
      const checkRes = await fetch(`${BASE_URL}/api/products/asus-tuf-gaming-a15-fa506ncg-hn396w`);
      const checkBody = (await checkRes.json()) as any;
      const finalStock = Number(checkBody.data?.stock_quantity ?? checkBody.data?.stockQuantity ?? checkBody.data?.stock ?? 0);

      if (finalStock !== initialStock - 2) {
        throw new Error(`Stock deduction failed: expected ${initialStock - 2}, got ${finalStock}`);
      }
    },
  },
  {
    name: '16. Get All Brands (/api/brands)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/brands`);
      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const body = (await res.json()) as any;
      if (!body.success || !Array.isArray(body.data) || body.data.length < 7) {
        throw new Error(`Expected at least 7 brands, got ${body.data?.length}`);
      }
      const slugs = body.data.map((b: any) => b.slug);
      if (!slugs.includes('apple') || !slugs.includes('lenovo') || !slugs.includes('asus')) {
        throw new Error('Expected core brands (apple, lenovo, asus) in brand list');
      }
    },
  },
  {
    name: '17. Get Brand by Slug (/api/brands/apple)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/brands/apple`);
      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const body = (await res.json()) as any;
      if (!body.success || !body.data || body.data.name !== 'Apple') {
        throw new Error(`Expected brand name 'Apple', got ${body.data?.name}`);
      }
    },
  },
  {
    name: '18. Get Brand by Non-existent Slug (/api/brands/non-existent-xyz)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/brands/non-existent-xyz`);
      if (res.status !== 404) {
        throw new Error(`Expected status 404 for invalid brand slug, got ${res.status}`);
      }
    },
  },
  {
    name: '19. Get Product Reviews (/api/reviews/product/:slug)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/reviews/product/asus-tuf-gaming-a15-fa506ncg-hn396w`);
      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const body = await res.json();
      if (!body.success || !Array.isArray(body.data?.reviews)) {
        throw new Error('Failed to fetch product reviews or reviews is not an array');
      }
      if (typeof body.data.averageRating !== 'number') {
        throw new Error('averageRating is missing or not a number');
      }
    },
  },
  {
    name: '20. Reject Review When Order Status is Not Delivered (#BK-2048 is shipping)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: '#BK-2048',
          phone: '0987654321',
          productId: 'lenovo-loq-15irx9-83dv01alvn',
          rating: 5,
          comment: 'Chưa nhận được máy nhưng muốn thử đánh giá.',
        }),
      });
      if (res.status !== 400) {
        throw new Error(`Expected status 400 for non-delivered order review, got ${res.status}`);
      }
      const body = await res.json();
      if (!body.error || !body.error.includes('giao thành công')) {
        throw new Error(`Expected error message about delivered status, got ${body.error}`);
      }
    },
  },
  {
    name: '21. Submit Review For Delivered Order (#BK-1024)',
    run: async () => {
      // Ensure idempotency across test executions: clear any existing review for #BK-1024
      try {
        await pool.query("DELETE FROM reviews WHERE LOWER(order_code) = '#bk-1024'");
      } catch (e) {}
      const idx = inMemoryReviews.findIndex((r) => r.orderCode.toLowerCase() === '#bk-1024');
      if (idx !== -1) inMemoryReviews.splice(idx, 1);

      const res = await fetch(`${BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: '#BK-1024',
          phone: '0912345678',
          productId: 'asus-tuf-gaming-a15-fa506ncg-hn396w',
          rating: 5,
          comment: 'Máy nguyên seal dùng cực mượt, màn hình đẹp và pin trâu 10/10.',
        }),
      });
      if (res.status !== 201) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`Expected status 201, got ${res.status}: ${JSON.stringify(body)}`);
      }
      const body = await res.json();
      if (!body.success || body.data?.rating !== 5) {
        throw new Error('Review submission response mismatch');
      }
    },
  },
  {
    name: '22. Reject Duplicate Review For Same Item in Order (#BK-1024)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: '#BK-1024',
          phone: '0912345678',
          productId: 'asus-tuf-gaming-a15-fa506ncg-hn396w',
          rating: 4,
          comment: 'Thử gửi lại đánh giá lần thứ 2 cho cùng sản phẩm.',
        }),
      });
      if (res.status !== 400) {
        throw new Error(`Expected status 400 for duplicate review, got ${res.status}`);
      }
    },
  },
  {
    name: '23. Get Inventory Overview (/api/inventory)',
    run: async () => {
      const res = await fetch(`${BASE_URL}/api/inventory`);
      if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
      const body = await res.json();
      if (!body.success || !body.data || !body.data.summary || !body.data.items) {
        throw new Error('Invalid inventory overview response format');
      }
      if (body.data.items.length === 0 || body.data.summary.totalStockUnits <= 0) {
        throw new Error('Expected items and total stock units in inventory overview');
      }
      if (!body.data.branches || body.data.branches.length !== 3) {
        throw new Error('Expected 3 showroom branches in inventory overview');
      }
    },
  },
  {
    name: '24. Update Branch Stock Quantity (PUT /api/inventory)',
    run: async () => {
      const listRes = await fetch(`${BASE_URL}/api/inventory`);
      const listBody = await listRes.json();
      const firstItem = listBody.data.items[0];
      const targetBranch = firstItem.branchesStock[0];

      const updateRes = await fetch(`${BASE_URL}/api/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: firstItem.productId,
          branchId: targetBranch.branchId,
          quantity: 25,
        }),
      });

      if (updateRes.status !== 200) throw new Error(`Expected status 200, got ${updateRes.status}`);
      const updateBody = await updateRes.json();
      if (!updateBody.success || updateBody.data.quantity !== 25) {
        throw new Error('Inventory update response mismatch');
      }
    },
  },
  {
    name: '25. Inter-branch Stock Transfer (POST /api/inventory/transfer)',
    run: async () => {
      const listRes = await fetch(`${BASE_URL}/api/inventory`);
      const listBody = await listRes.json();
      const firstItem = listBody.data.items[0];
      const fromBranch = firstItem.branchesStock[0];
      const toBranch = firstItem.branchesStock[1];

      const transferRes = await fetch(`${BASE_URL}/api/inventory/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: firstItem.productId,
          fromBranchId: fromBranch.branchId,
          toBranchId: toBranch.branchId,
          quantity: 2,
          note: 'Điều chuyển mẫu kiểm thử',
        }),
      });

      if (transferRes.status !== 200) throw new Error(`Expected status 200, got ${transferRes.status}`);
      const transferBody = await transferRes.json();
      if (!transferBody.success || transferBody.data.transferredQuantity !== 2) {
        throw new Error('Stock transfer response mismatch');
      }
    },
  },
  {
    name: '26. Reject Over-transfer Beyond Branch Stock',
    run: async () => {
      const listRes = await fetch(`${BASE_URL}/api/inventory`);
      const listBody = await listRes.json();
      const firstItem = listBody.data.items[0];
      const fromBranch = firstItem.branchesStock[0];
      const toBranch = firstItem.branchesStock[1];

      const transferRes = await fetch(`${BASE_URL}/api/inventory/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: firstItem.productId,
          fromBranchId: fromBranch.branchId,
          toBranchId: toBranch.branchId,
          quantity: 999999, // Excessive quantity
          note: 'Điều chuyển quá số lượng tồn',
        }),
      });

      if (transferRes.status !== 400) {
        throw new Error(`Expected status 400 for excessive stock transfer, got ${transferRes.status}`);
      }
    },
  },
  {
    name: '27. Auth: Customer & Admin Login (/api/auth/login)',
    run: async () => {
      // Customer login
      const customerRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'khachhang@bkstore.vn',
          password: '123456',
        }),
      });
      if (customerRes.status !== 200) {
        throw new Error(`Expected customer login status 200, got ${customerRes.status}`);
      }
      const customerData = await customerRes.json();
      if (!customerData.success || !customerData.data?.token || customerData.data?.user?.role !== 'customer') {
        throw new Error('Customer login payload mismatch');
      }

      // Admin login
      const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@bkstore.vn',
          password: 'admin123',
        }),
      });
      if (adminRes.status !== 200) {
        throw new Error(`Expected admin login status 200, got ${adminRes.status}`);
      }
      const adminData = await adminRes.json();
      if (!adminData.success || !adminData.data?.token || adminData.data?.user?.role !== 'admin') {
        throw new Error('Admin login payload mismatch');
      }
    },
  },
  {
    name: '28. Auth: Verify Current User Profile (/api/auth/me)',
    run: async () => {
      // First login
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'khachhang@bkstore.vn',
          password: '123456',
        }),
      });
      const loginData = await loginRes.json();
      const token = loginData.data.token;

      // Call /api/auth/me
      const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.status !== 200) {
        throw new Error(`Expected /api/auth/me 200, got ${meRes.status}`);
      }
      const meData = await meRes.json();
      if (!meData.success || meData.data?.email !== 'khachhang@bkstore.vn') {
        throw new Error('/api/auth/me response mismatch');
      }
    },
  },
  {
    name: '29. Orders: Authenticated User Order History (/api/orders/my-orders)',
    run: async () => {
      // Login as customer
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'khachhang@bkstore.vn',
          password: '123456',
        }),
      });
      const loginData = await loginRes.json();
      const token = loginData.data.token;

      // Get my orders
      const ordersRes = await fetch(`${BASE_URL}/api/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ordersRes.status !== 200) {
        throw new Error(`Expected /api/orders/my-orders 200, got ${ordersRes.status}`);
      }
      const ordersData = await ordersRes.json();
      if (!ordersData.success || !Array.isArray(ordersData.data)) {
        throw new Error('/api/orders/my-orders must return array of orders');
      }
      // Customer has at least #BK-1024 linked
      const hasOrder1024 = ordersData.data.some((o: any) => o.orderCode === '#BK-1024');
      if (!hasOrder1024) {
        throw new Error('Expected #BK-1024 in customer order history');
      }
    },
  },
  {
    name: '30. Chatbot: Authenticated User Order Inquiry (/api/chat)',
    run: async () => {
      // Login as customer
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'khachhang@bkstore.vn',
          password: '123456',
        }),
      });
      const loginData = await loginRes.json();
      const token = loginData.data.token;

      // Ask chatbot "đơn hàng của tôi đâu"
      const chatRes = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: 'Cho tôi xem đơn hàng của tôi',
        }),
      });
      if (chatRes.status !== 200) {
        throw new Error(`Expected /api/chat 200, got ${chatRes.status}`);
      }
      const chatData = await chatRes.json();
      if (!chatData.success || !chatData.data?.reply) {
        throw new Error('Chatbot response missing reply');
      }
      // The reply should mention the user's order #BK-1024
      if (!chatData.data.reply.includes('#BK-1024')) {
        throw new Error(`Expected chat reply to reference #BK-1024, got: ${chatData.data.reply}`);
      }
    },
  },
];


const runAllTests = async () => {
  console.log('====================================================');
  console.log('🧪 BK-STORE API INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let server: Server;

  await new Promise<void>((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`📡 Test server listening on ${BASE_URL}\n`);
      resolve();
    });
  });

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.run();
      console.log(`✅ [PASS] ${t.name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${t.name}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  await new Promise<void>((resolve) => {
    server.close(() => {
      console.log('🔒 Test server stopped.');
      resolve();
    });
  });

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
