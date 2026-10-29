import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ============================================================================
// BK-STORE LOAD TEST SCRIPT (k6)
// Scenario: 50 - 100 Concurrent Virtual Users (VUs) executing 1,000 Requests
// Target: Backend Express REST API + SSE Chatbot Streaming
// ============================================================================

// Custom Metrics
export const sseFirstTokenTrend = new Trend('sse_first_token_duration');
export const apiRequestDuration = new Trend('api_request_duration');
export const errorRate = new Rate('system_error_rate');
export const completedRequests = new Counter('total_completed_requests');

export const options = {
  scenarios: {
    stress_peak_load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { duration: '15s', target: 50 },  // Ramp-up to 50 requests/sec
        { duration: '30s', target: 80 },  // Peak traffic 80 requests/sec with 100 VUs
        { duration: '15s', target: 20 },  // Ramp-down
      ],
    },
  },
  thresholds: {
    // 95% of non-streaming requests should complete in under 250ms
    api_request_duration: ['p(95)<250'],
    // 95% of SSE first tokens should arrive in under 1.5s
    sse_first_token_duration: ['p(95)<1500'],
    // System error rate should be 0% (less than 1%)
    system_error_rate: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5000';

const sampleQueries = [
  'Tư vấn laptop văn phòng mỏng nhẹ pin trâu dưới 20 triệu',
  'MacBook Air M3 ở Cầu Giấy còn hàng không shop?',
  'Shop có chính sách đổi trả hàng như thế nào?',
  'Tư vấn con lap tuf tầm 20 củ chơi game mượt',
  'So sánh ThinkPad E14 và MacBook Air M3',
  'Có được trả góp 0% khi mua điện thoại iPhone không?',
  'Tra cứu đơn hàng #BK-1024 số điện thoại 0912345678',
];

export default function () {
  const rand = Math.random();

  if (rand < 0.40) {
    // Luồng 1 (40%): SSE Chatbot Streaming Request
    const query = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    const payload = JSON.stringify({
      message: query,
      sessionId: `bench_user_${__VU}_${__ITER}`,
    });

    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/chat`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s',
    });

    const duration = Date.now() - start;
    sseFirstTokenTrend.add(duration);
    completedRequests.add(1);

    const isSuccess = check(res, {
      'Chat status is 200': (r) => r.status === 200,
      'Chat response has reply': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && body.data?.reply?.length > 0;
        } catch (_) {
          return false;
        }
      },
    });

    errorRate.add(!isSuccess);

  } else if (rand < 0.70) {
    // Luồng 2 (30%): Filter Products & Search
    const categories = ['laptop', 'smartphone', 'phu-kien'];
    const chosenCat = categories[Math.floor(Math.random() * categories.length)];

    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/products?category=${chosenCat}&limit=12`);
    const duration = Date.now() - start;

    apiRequestDuration.add(duration);
    completedRequests.add(1);

    const isSuccess = check(res, {
      'Filter products status 200': (r) => r.status === 200,
      'Product list returned': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && Array.isArray(body.data);
        } catch (_) {
          return false;
        }
      },
    });

    errorRate.add(!isSuccess);

  } else if (rand < 0.90) {
    // Luồng 3 (20%): Product Detail & Branch Stock Inquiry
    const slugs = [
      'macbook-air-m3-13-16gb-512gb',
      'lenovo-thinkpad-e14-gen-7-21t90025vn',
      'asus-vivobook-14-x1404va-eb355w',
      'iphone-16-pro-max-256gb-desert-titan',
    ];
    const slug = slugs[Math.floor(Math.random() * slugs.length)];

    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/products/${slug}`);
    const duration = Date.now() - start;

    apiRequestDuration.add(duration);
    completedRequests.add(1);

    const isSuccess = check(res, {
      'Product detail status 200': (r) => r.status === 200,
      'Specs & Inventories present': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.specs && body.data?.inventories?.length > 0;
        } catch (_) {
          return false;
        }
      },
    });

    errorRate.add(!isSuccess);

  } else {
    // Luồng 4 (10%): Get Categories & Branches (Metadata API)
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/categories`);
    const duration = Date.now() - start;

    apiRequestDuration.add(duration);
    completedRequests.add(1);

    const isSuccess = check(res, {
      'Category API status 200': (r) => r.status === 200,
    });

    errorRate.add(!isSuccess);
  }

  // Pacing interval: sleep 100ms - 300ms between VU steps
  sleep(Math.random() * 0.2 + 0.1);
}
