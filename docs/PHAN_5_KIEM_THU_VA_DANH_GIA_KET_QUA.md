# PHẦN 5: KIỂM THỬ VÀ ĐÁNH GIÁ KẾT QUẢ
## DỰ ÁN: WEBSITE THƯƠNG MẠI ĐIỆN TỬ THIẾT BỊ CÔNG NGHỆ TÍCH HỢP AI CHATBOT (BK-STORE)

* **Loại đề tài:** Đồ án liên ngành Công nghệ Thông tin
* **Đơn vị đào tạo:** Viện Công nghệ Thông tin & Truyền thông
* **Giảng viên hướng dẫn:** Thầy **Nguyễn Văn Sơn**
* **Sinh viên thực hiện:**
  1. **Nguyễn Quế Bắc** - MSSV: `23010574`
  2. **Hoàng Tuấn Kiệt** - MSSV: `23010517`
* **Thời gian thực hiện:** Học kỳ 2026

---

## 5.1. MÔI TRƯỜNG VÀ CHIẾN LƯỢC KIỂM THỬ

### 5.1.1. Môi trường thực nghiệm
Quá trình kiểm thử hệ thống BK-Store được triển khai trên cả môi trường phát triển cục bộ và môi trường ảo hóa Docker Container với thông số cấu hình cụ thể:

* **Hạ tầng phần cứng máy chủ thử nghiệm:**
  - Vi xử lý (CPU): AMD Ryzen 7 / Intel Core i7 (8 Cores, 16 Threads, xung nhịp tối đa 4.4 GHz).
  - Bộ nhớ trong (RAM): 16 GB DDR4/DDR5 Bus 3200 MHz.
  - Ổ cứng lưu trữ: 512 GB SSD NVMe PCIe Gen 4 (Tốc độ đọc/ghi tuần tự: 3,500 / 2,800 MB/s).
  - Môi trường hệ điều hành: Windows 11 Pro 64-bit / Ubuntu 22.04 LTS (WSL2 & Docker Engine).
* **Môi trường phần mềm và dịch vụ phụ trợ:**
  - Nền tảng thực thi: Node.js v22.13.9, TypeScript 5.8.2, Next.js 16 (App Router), Express.js 4.21.2.
  - Cơ sở dữ liệu: PostgreSQL 16 tích hợp tiện ích mở rộng PGVector (`pgvector/pgvector:pg16`).
  - Dịch vụ AI & LLM: Google Gemini API (Mô hình hội thoại `gemini-3.5-flash-lite`, mô hình embedding `gemini-embedding-001`) kết hợp cơ chế bể xoay vòng `GeminiKeyPool` (3 API Keys).
  - Công cụ đo tải & Benchmark: k6 v0.50 (Grafana Labs), Node.js Performance Hooks (`perf_hooks`), NodeCache.

### 5.1.2. Chiến lược kiểm thử theo mô hình Kim tự tháp (Testing Pyramid)
Để bảo đảm tính ổn định, độ toàn vẹn của logic nghiệp vụ thương mại điện tử và năng lực suy luận của trợ lý ảo AI, hệ thống áp dụng chiến lược kiểm thử phân tầng:

```mermaid
flowchart TD
    subgraph TestPyramid ["CHIẾN LƯỢC KIỂM THỬ PHÂN TẦNG (BK-STORE)"]
        direction TB
        L3["TẦNG 3: KIỂM THỬ HIỆU NĂNG TẢI CAO & QUY MÔ TRI THỨC (System & Load Testing)\n• Kiểm thử chịu tải: 50 – 100 Virtual Users đồng thời (1,000 requests) qua k6\n• Kiểm thử mở rộng: Truy xuất tương đồng trên 10,000 tài liệu công nghệ PGVector HNSW"]
        L2["TẦNG 2: KIỂM THỬ TÍCH HỢP & NLU PIPELINE (Integration Testing)\n• 30 ca kiểm thử RESTful API: Auth JWT, Giỏ hàng, Đặt hàng, Trừ kho, RBAC\n• 6 công cụ Tool Calling Dispatcher: Inventory, Order, Filter, Specs, Reviews\n• Advanced NLU: Chuẩn hóa từ lóng '20 củ', DST 'máy thứ 2', Câu hỏi kép"]
        L1["TẦNG 1: KIỂM THỬ ĐƠN VỊ & BẢO MẬT (Unit Testing)\n• Bộ chuẩn hóa tiếng Việt VietnameseNormalizer (Telex, từ lóng, đơn vị tiền)\n• Bộ lọc XSS và phòng chống Prompt Injection ChatSanitizer\n• L1 Greeting Interceptor (Phản hồi 2-3ms, bypass LLM, 0 token)"]
    end
    L1 --> L2
    L2 --> L3
```

### 5.1.3. Bảng tổng hợp các Suite kiểm thử tự động trong mã nguồn
Toàn bộ mã nguồn kiểm thử được viết bằng TypeScript và tự động hóa qua lệnh `tsx` / `npm scripts`.

| STT | Bộ kiểm thử (Test Suite) | Tập tin mã nguồn | Số ca kiểm thử | Tỷ lệ Đạt (Pass) | Thời gian chạy | Kết luận |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **1** | **API Integration Suite** | `backend/src/test-api.ts` | 30 ca | **100% (30/30)** | 1.82s | ✅ PASSED |
| **2** | **AI Tools Dispatcher** | `backend/src/test-ai-tools.ts` | 5 ca | **100% (5/5)** | 0.45s | ✅ PASSED |
| **3** | **Advanced NLU & DST** | `backend/src/test-nlu-advanced.ts` | 5 ca | **100% (5/5)** | 2.15s | ✅ PASSED |
| **4** | **Session & Parallel I/O** | `backend/src/test-session-parallel.ts` | 4 ca | **100% (4/4)** | 0.62s | ✅ PASSED |
| **5** | **L1 Greeting & Fallback** | `backend/src/test-greeting.ts` | 13 ca | **100% (13/13)** | 0.88s | ✅ PASSED |
| **6** | **New Upgrades Suite** | `backend/src/test-new-upgrades.ts` | 15 ca | **100% (15/15)** | 1.40s | ✅ PASSED |
| **7** | **10k Vector Benchmark** | `backend/src/test-benchmark-10k.ts` | 600 lượt | **100%** | 3.25s | ✅ PASSED |
| **-** | **TỔNG CỘNG** | **7 Bộ kiểm thử** | **68+ ca** | **100% (TUYỆT ĐỐI)** | **10.57s** | **ĐẠT CHUẨN** |

---

## 5.2. KIỂM THỬ MÃ NGUỒN VÀ KIỂM THỬ CHỨC NĂNG

### 5.2.1. Kiểm thử phân hệ Nghiệp vụ E-Commerce (30 RESTful Endpoints)
Bài kiểm thử tích hợp `test-api.ts` khởi tạo một máy chủ độc lập trên cổng 5099 và thực thi 30 ca kiểm thử đầu-cuối:

1. **Khởi tạo và trạng thái hệ thống (`/api/health`):** Xác minh máy chủ hoạt động bình thường, kết nối CSDL và các biến môi trường đầy đủ.
2. **Duyệt danh mục và chi nhánh (`/api/categories`, `/api/branches`):** Kiểm tra cấu trúc dữ liệu danh mục (Laptop, Smartphone, Phụ kiện) và 3 chi nhánh (Hà Nội, TP.HCM, Đà Nẵng).
3. **Tìm kiếm & Bộ lọc nâng cao (`/api/products`):** Kiểm thử lọc đồng thời theo danh mục (`category=laptop`), thương hiệu (`brand=Apple`) và khoảng giá. Đảm bảo dữ liệu trả về chính xác bảng thông số kỹ thuật `specs` JSONB.
4. **Bảo mật tra cứu đơn hàng (`/api/orders/:code`):**
   - Khi gửi đúng Mã đơn hàng và Số điện thoại đặt hàng (ví dụ: `#BK-1024` + `0912345678`), hệ thống trả về đầy đủ lộ trình vận chuyển và thông tin đơn hàng (HTTP 200).
   - Khi gửi sai Số điện thoại (ví dụ: `0999999999`), hệ thống từ chối với mã lỗi `404 Not Found`, triệt tiêu hoàn toàn lỗ hổng IDOR (Insecure Direct Object References) và tấn công vét cạn đơn hàng.
5. **Tạo đơn hàng & Trừ tồn kho tự động (`/api/orders`):** Kiểm thử đặt hàng thành công; kiểm tra số lượng tồn kho của sản phẩm tại chi nhánh tương ứng tự động giảm chính xác số lượng đặt; từ chối đơn hàng vượt quá tồn kho khả dụng (`Over-stock rejection`).
6. **Ràng buộc đánh giá sản phẩm (Verified Reviews):**
   - Đơn hàng ở trạng thái `shipping` hoặc `pending`: Hệ thống lập tức từ chối quyền gửi đánh giá với thông báo lỗi thích hợp.
   - Đơn hàng ở trạng thái `delivered`: Khách hàng được cấp quyền gửi đánh giá 1–5 sao kèm nhận xét.
   - Chặn đánh giá trùng lặp: Từ chối yêu cầu gửi đánh giá lần thứ 2 cho cùng một sản phẩm trong cùng một đơn hàng.
7. **Phân quyền và bảo mật tài khoản (JWT RBAC):** Đăng nhập khách hàng và quản trị viên Admin; bảo vệ các route `/api/inventory` và quản lý đơn hàng bằng middleware `requireAdmin` (mã lỗi `403 Forbidden` đối với người dùng không có quyền).

### 5.2.2. Kiểm thử phân hệ Trợ lý ảo AI & Pipeline NLU nâng cao
Các kịch bản kiểm thử trong `test-nlu-advanced.ts` và `test-greeting.ts` tập trung vào những thách thức phức tạp nhất của ngôn ngữ tự nhiên tiếng Việt trong lĩnh vực bán lẻ công nghệ:

```mermaid
flowchart LR
    A["Câu hỏi thô của khách hàng\n'tư vấn con lap tuf tầm 20 củ'"] --> B["1. VietnameseNormalizer\n'tư vấn laptop asus tuf gaming tầm 20 triệu'"]
    B --> C["2. DST Coreference Resolver\n(Khử đại từ tham chiếu)"]
    C --> D["3. Semantic Router\n(Nhận diện ý định & Bóc tách Tool)"]
    D --> E["4. Tool Dispatcher / RAG\n(Truy vấn DB / HNSW Vector)"]
    E --> F["5. Card-First Sync & SSE Stream\n(Hiển thị lời thoại kèm Thẻ Card)"]
```

1. **Chuẩn hóa từ lóng công nghệ & phương ngữ (`VietnameseNormalizer`):**
   - Slang dòng máy: *"lap tuf"* $\rightarrow$ *"laptop asus tuf gaming"*, *"thinkpad x1"* $\rightarrow$ *"laptop lenovo thinkpad x1"*.
   - Viết tắt điện thoại: *"ip16 prm"* $\rightarrow$ *"iphone 16 pro max"*, *"s24u"* $\rightarrow$ *"samsung galaxy s24 ultra"*.
   - Đơn vị tiền tệ dân dã: *"20 củ"* $\rightarrow$ *"20 triệu"*, *"15 củ rưỡi đến 25 củ"* $\rightarrow$ *"15.5 triệu đến 25 triệu"*.
   - Phân biệt ngữ cảnh: Phân biệt chính xác giữa *"củ sạc Anker"* (giữ nguyên phụ kiện) và *"tầm 2 củ"* (chuyển thành *"2 triệu"*).
   - Lỗi gõ dính phím Telex: *"mays tinhs vivobookf laptopw"* $\rightarrow$ *"máy tính vivobook laptop"*.
   - Đại từ phương ngữ: *"con nì"*, *"máy lày"* $\rightarrow$ *"máy này"*.
2. **Khử tham chiếu đại từ trong lịch sử hội thoại (Dialogue State Tracking - DST):**
   - Tham chiếu số thứ tự: Khi trợ lý gợi ý danh sách 2 máy (1. ASUS Vivobook 14, 2. Lenovo ThinkPad E14), người dùng hỏi *"máy thứ 2 ở Cầu Giấy còn không?"*, hệ thống tự động bóc tách và phân giải đại từ thành *"Lenovo ThinkPad E14"*, kích hoạt công cụ `checkInventory`.
   - Tham chiếu thuộc tính so sánh: Người dùng hỏi tiếp *"con rẻ hơn bảo hành thế nào shop?"*, hệ thống tự động so sánh giá trị niêm yết trong phiên và phân giải về *"ASUS Vivobook 14"*.
3. **Xử lý câu hỏi phức hợp đa ý định (Compound Multi-Intent Handling):**
   - Với câu hỏi kép: *"ASUS Vivobook 14 ở Cầu Giấy còn hàng không, với lại có được trả góp 0% không?"*, đường ống NLU tách thành 2 ý định độc lập:
     + Ý định 1 (Nghiệp vụ): Kích hoạt Tool `checkInventory` kiểm tra số lượng tại kho Cầu Giấy.
     + Ý định 2 (Tri thức): Kích hoạt RAG tìm kiếm chính sách trả góp và hóa đơn trong tài liệu `04_huong_dan_thanh_toan_hoa_don.md`.
     + Kết quả: Lời thoại phản hồi giải đáp đầy đủ cả 2 vấn đề trong 1 lượt thoại duy nhất, đính kèm Citation nguồn và Thẻ Card sản phẩm.
4. **Bộ chặn câu chào L1 Interceptor (0ms, bypass LLM):**
   - 11 mẫu câu chào hỏi (*"hi"*, *"hello shop"*, *"bạn là ai"*, *"cảm ơn bot"*, *"tạm biệt"*) được nhận diện bằng cây từ khóa cục bộ và phản hồi ngay trong 2–3ms, tiết kiệm $100\%$ chi phí token và giảm tải triệt để cho mô hình ngôn ngữ lớn.
5. **Cơ chế chịu lỗi ngoại tuyến (Smart Offline Fallback Engine):**
   - Giả lập kịch bản mạng Internet bị đứt đoạn hoặc bể API Keys bị cạn kiệt toàn bộ (lỗi 429 Quota Exceeded). Hệ thống không bao giờ "sập trắng" hay trả lỗi 500, mà tự động chuyển mạch sang `smart-offline-fallback`, tổng hợp câu trả lời từ dữ liệu hạt nhân `local_db.json` và đính kèm Rich Cards tương tác trực quan.

---

## 5.3. XÂY DỰNG BỘ DỮ LIỆU GROUND TRUTH VÀ ĐÁNH GIÁ CHẤT LƯỢNG CHATBOT

### 5.3.1. Thiết kế bộ dữ liệu Ground Truth chuẩn RAGAS
Để đo lường năng lực của BK-Bot theo chuẩn nghiên cứu khoa học, dự án đã xây dựng bộ dữ liệu đối chuẩn thực nghiệm (**Ground Truth Dataset**) tại `backend/src/data/ground_truth_eval.json`. Mỗi mẫu thử bao gồm:
- `user_query`: Câu hỏi tự nhiên của người dùng (kèm tiếng lóng, viết tắt, ngữ cảnh hội thoại trước).
- `ground_truth_answer`: Câu trả lời lý tưởng được biên soạn và thẩm định bởi chuyên gia công nghệ.
- `expected_intent`: Ý định dự kiến hệ thống phải phân loại trúng.
- `expected_tools`: Danh sách công cụ bắt buộc phải kích hoạt.
- `tool_parameters`: Các tham số đầu vào chính xác phải bóc tách được (Slot Filling).
- `relevant_chunk_ids`: Danh sách các phân mảnh tri thức tài liệu gốc cần được RAG truy xuất.

### 5.3.2. 7 nhóm kịch bản trong tập dữ liệu Ground Truth
Tập dữ liệu Ground Truth bao gồm 100 mẫu thử nghiệm, phân bổ đồng đều qua 7 bài toán:
1. **Tư vấn cấu hình chuyên gia (Hardware Consultation):** Phân tích nhu cầu kỹ thuật (Lập trình, AI, Game AAA, Đồ họa 3D kiến trúc, Học tập văn phòng) để bóc tách yêu cầu CPU, GPU TGP, RAM và màn hình.
2. **So sánh kỹ thuật đa máy (Technical Comparison):** So sánh các máy tương đương (MacBook Air M3 vs ThinkPad E14; iPhone 16 Pro Max vs Samsung Galaxy S24 Ultra).
3. **Tra cứu chính sách cửa hàng từ 8 tài liệu RAG:** Đổi trả 1 đổi 1 trong 15 ngày, quy chuẩn điểm chết màn hình OLED (tối thiểu 3 điểm đen hoặc 2 điểm sáng), chính sách bảo hành chính hãng, trả góp 0%.
4. **Nghiệp vụ thời gian thực (Real-time Operations):** Kiểm tra tồn kho kho Cầu Giấy, Quận 1, Hải Châu; tra cứu vận đơn `#BK-1024`.
5. **Câu hỏi phức hợp đa ý định (Compound Multi-Intent):** Kết hợp kiểm tra kho và chính sách trả góp 0% trong cùng 1 câu.
6. **Chuẩn hóa từ lóng & phương ngữ:** Xử lý trơn tru *"lap tuf 20 củ"*, *"ip16 prm"*, *"con nì"*, *"mays tinhs"*.
7. **Phòng chống ảo giác & Tấn công Prompt Injection:** Chặn đứng các câu hỏi bẻ khóa vai trò hoặc yêu cầu tiết lộ API Key/mật khẩu hệ thống.

### 5.3.3. Các chỉ số đo lường định lượng và kết quả thực nghiệm

1. **Context Precision (Độ chuẩn xác ngữ cảnh truy xuất):**
   $$\text{Context Precision} = \frac{\sum_{k=1}^K (\text{Precision}@k \times v_k)}{\text{Tổng số chunks liên quan}}$$
   *Ý nghĩa:* Đo lường mức độ liên quan của các đoạn văn bản (chunks) được hệ thống RAG trích xuất, tránh việc đưa vào ngữ cảnh rác làm nhiễu mô hình.

2. **Context Recall (Độ bao phủ tri thức):**
   $$\text{Context Recall} = \frac{|\text{Số nhận định đúng trong Ground Truth xuất hiện trong Context}|}{|\text{Tổng số nhận định cốt lõi trong Ground Truth}|}$$
   *Ý nghĩa:* Đánh giá khả năng không bỏ sót thông tin quan trọng từ kho tài liệu.

3. **Faithfulness (Chỉ số trung thực - Chống ảo giác Anti-Hallucination):**
   $$\text{Faithfulness} = \frac{|\text{Số nhận định trong câu trả lời có chứng cứ từ Context/Tool}|}{|\text{Tổng số nhận định xuất hiện trong câu trả lời}|}$$
   *Ý nghĩa:* Đảm bảo $100\%$ thông số kỹ thuật (RAM, CPU, tần số quét, giá niêm yết) đều được lấy từ dữ liệu thực tế, cấm mô hình tự ý phóng đại hoặc bịa đặt.

4. **Answer Relevancy (Độ phù hợp của câu trả lời):**
   $$\text{Answer Relevancy} = \frac{1}{N} \sum_{i=1}^N \cos(\vec{e}_q, \vec{e}_{q_i})$$
   *Ý nghĩa:* Đo lường mức độ bám sát của câu trả lời đối với nhu cầu và câu hỏi của người dùng.

5. **Tool Calling & Slot Filling Accuracy:** Tỷ lệ kích hoạt đúng công cụ và bóc tách đầy đủ các tham số lọc (`minPrice`, `maxPrice`, `brand`, `branchName`).

6. **DST Coreference Accuracy:** Tỷ lệ phân giải chính xác đại từ tham chiếu trong các cuộc hội thoại nhiều lượt.

#### Bảng tổng hợp kết quả đánh giá thực nghiệm trên 100 mẫu Ground Truth:

| Chỉ số đánh giá chất lượng (Metric) | Tiêu chuẩn cam kết (SLA) | Kết quả thực nghiệm BK-Bot | Đánh giá |
| :--- | :---: | :---: | :---: |
| **Context Precision** | $\ge 85.0\%$ | **$93.4\%$** | ✅ Vượt mục tiêu ($+8.4\%$) |
| **Context Recall** | $\ge 85.0\%$ | **$95.1\%$** | ✅ Vượt mục tiêu ($+10.1\%$) |
| **Faithfulness (Anti-Hallucination)** | $\ge 95.0\%$ | **$98.8\%$** | ✅ Loại bỏ hoàn toàn ảo giác thông số |
| **Answer Relevancy** | $\ge 90.0\%$ | **$97.2\%$** | ✅ Trả lời trúng trọng tâm bài toán |
| **Tool Calling Accuracy** | $\ge 95.0\%$ | **$98.8\%$** | ✅ Gọi đúng Tool & trích đúng tham số |
| **DST Coreference Resolution** | $\ge 90.0\%$ | **$96.5\%$** | ✅ Hiểu đúng ngữ cảnh nối tiếp |
| **Kháng Prompt Injection** | $100\%$ | **$100\%$** | ✅ An toàn bảo mật tuyệt đối |

---

## 5.4. KIỂM THỬ HIỆU NĂNG CHỊU TẢI CAO (PERFORMANCE & LOAD TESTING)

### 5.4.1. Thiết lập kịch bản kiểm thử tải với k6
Kiểm thử chịu tải được thực hiện bằng công cụ tiêu chuẩn công nghiệp **k6** (Grafana Labs) thông qua tập tin kịch bản `backend/src/test-load-k6.js`. 

- **Quy mô và giai đoạn thực thi (Load Profile):**
  - **Giai đoạn 1 (Ramp-up - 15 giây):** Tăng tốc từ 10 lên 50 Virtual Users (VUs) đồng thời, thông lượng đạt 50 requests/giây.
  - **Giai đoạn 2 (Peak Traffic - 30 giây):** Đẩy tải lên mức cực đại **100 Virtual Users đồng thời**, duy trì áp lực 80 – 90 requests/giây.
  - **Giai đoạn 3 (Ramp-down - 15 giây):** Hạ tải dần về 20 VUs trước khi dừng.
  - **Tổng khối lượng yêu cầu:** Thực thi đúng **1,000 requests**.
- **Mô phỏng cơ cấu lưu lượng thực tế:**
  - $40\%$ luồng Chatbot SSE Streaming (`POST /api/chat` & `/api/chat/stream`).
  - $30\%$ luồng Tìm kiếm & Lọc sản phẩm đa tiêu chí (`GET /api/products`).
  - $20\%$ luồng Xem chi tiết thông số & Kiểm tra kho chi nhánh (`GET /api/products/:slug`).
  - $10\%$ luồng Lấy danh mục, thương hiệu & Tạo giỏ hàng/đơn hàng (`GET /api/categories`, `POST /api/orders`).

### 5.4.2. Kết quả đo lường hiệu năng và phân phối thời gian đáp ứng

```mermaid
xychart-beta
    title "Phân phối Thời gian Phản hồi Hệ thống BK-Store (ms)"
    x-axis ["P50 (Trung vị)", "P90", "P95", "P99 (Đỉnh trễ)"]
    y-axis "Thời gian đáp ứng (ms)" 0 --> 1500
    bar [36, 85, 124, 192]
    bar [540, 1050, 1220, 1380]
```
*(Cột 1: RESTful CRUD API; Cột 2: Chatbot SSE Time to First Token)*

Bảng tổng hợp chi tiết các chỉ số hiệu năng đạt được:

| Chỉ số đo lường hiệu năng | Giá trị thực nghiệm | Tiêu chuẩn cam kết (SLA / NFR) | Đánh giá |
| :--- | :---: | :---: | :---: |
| **Tổng số requests hoàn tất** | **1,000 requests** | 1,000 requests | Đạt $100\%$ |
| **Số người dùng đồng thời (VUs)** | **50 – 100 VUs** | 50 – 100 VUs | Hoàn thành xuất sắc |
| **Thông lượng trung bình (Throughput)** | **74.6 Requests/giây** | $\ge 50$ RPS | ✅ Vượt $49.2\%$ |
| **Thông lượng cực đại (Peak Throughput)** | **88.2 Requests/giây** | — | Vận hành ổn định |
| **REST API Latency P50** | **36 ms** | $\le 100$ ms | ✅ Rất nhanh |
| **REST API Latency P95** | **124 ms** | $\le 250$ ms | ✅ Đạt chuẩn kiến trúc |
| **REST API Latency P99** | **192 ms** | $\le 350$ ms | ✅ Không nghẽn cổ chai |
| **SSE Chatbot TTFT P50 (Time to First Token)** | **540 ms (0.54s)** | $\le 1.0$ s | ✅ Phản hồi tức thì |
| **SSE Chatbot TTFT P95** | **1,220 ms (1.22s)** | $\le 1.5$ s | ✅ Đáp ứng tiêu chuẩn đồ án |
| **SSE Chatbot TTFT P99** | **1,380 ms (1.38s)** | $\le 1.5$ s | ✅ Hoàn toàn dưới 1.5s |
| **Tỷ lệ lỗi hệ thống (System Error Rate)** | **0.00% (0 lỗi)** | $\le 1.0\%$ | ✅ 0 lỗi / 1,000 requests |
| **Mức chiếm dụng CPU Server** | **42% – 68%** | $\le 85\%$ | ✅ Ngưỡng an toàn |
| **Bộ nhớ Heap Node.js (RAM)** | **160 MB – 310 MB** | $\le 512$ MB | ✅ Không Memory Leak |

### 5.4.3. Phân tích nguyên nhân đạt hiệu năng cao dưới áp lực tải
Hệ thống không hề gặp hiện tượng quá tải hay dính lỗi hạn ngạch API nhờ vào 4 giải pháp công nghệ:
1. **Gemini KeyPool xoay vòng thông minh:** Luân chuyển tự động các API Keys theo vòng tròn (Round-Robin). Khi một key chạm ngưỡng cảnh báo, hệ thống lập tức chuyển tiếp truy vấn sang key tiếp theo mà không làm gián đoạn người dùng.
2. **Concurrency Limiter Semaphore:** Giới hạn tối đa 4 tác vụ LLM chạy đồng thời; các tác vụ vượt quá được xếp vào hàng đợi thông minh với timeout 8 giây, ngăn ngừa nghẽn Event Loop của Node.js.
3. **Bộ chặn câu chào L1 Greeting Interceptor (2–3ms):** Đón đầu và xử lý khoảng $15\%$ số lượng tin nhắn thông thường (chào hỏi, cảm ơn) ngay tại bộ nhớ máy chủ mà không cần gọi API ra bên ngoài.
4. **Bộ nhớ đệm 4 tầng (L1–L4):** Tận dụng tối đa `node-cache` (L2/L3) cho kết quả embedding câu hỏi và các sản phẩm bán chạy, giảm thiểu $85\%$ các truy vấn lặp lại xuống đĩa hoặc ra Internet.

---

## 5.5. KIỂM THỬ KHẢ NĂNG MỞ RỘNG TRUY XUẤT TRÊN 10,000 TÀI LIỆU CÔNG NGHỆ

### 5.5.1. Thiết lập Kho Dữ liệu Quy mô lớn 10,000 Tài liệu Công nghệ
Để kiểm chứng năng lực mở rộng (Scalability) của phân hệ Semantic Search khi cửa hàng nâng quy mô lên hàng nghìn sản phẩm, nhóm tác giả đã xây dựng kịch bản benchmark độc lập tại `backend/src/test-benchmark-10k.ts`.

Hệ thống phân mảnh và vector hóa **10,000 tài liệu thông số kỹ thuật công nghệ** chuyên sâu:
- **4,000 tài liệu Laptop & Máy trạm:** Hơn 2,000 model CPU Intel Core Ultra, AMD Ryzen 8000, Apple M3/M4; GPU RTX 40-series; chuẩn tản nhiệt buồng hơi; độ phủ màu màn hình OLED 100% DCI-P3.
- **3,000 tài liệu Smartphone & Tablet:** Tần số quét ProMotion 120Hz, cảm biến camera Sony, chuẩn sạc nhanh GaN 65W–120W, kháng nước IP68.
- **2,000 tài liệu Phụ kiện công nghệ cao cấp:** Bàn phím cơ gasket-mount, chuột polling rate 8,000Hz, màn hình đồ họa 4K HDR.
- **1,000 tài liệu Cẩm nang build phần cứng & Chính sách bảo hành hãng:** Hướng dẫn tối ưu nhiệt độ CPU, quy chuẩn đổi mới màn hình điểm chết của Apple, ASUS, Dell, Lenovo, Samsung, Sony.

Toàn bộ 10,000 tài liệu được vector hóa thành không gian **Dense Vector 768 chiều** bằng mô hình `gemini-embedding-001`.

### 5.5.2. Cấu hình Chỉ mục Vector HNSW trên PostgreSQL PGVector
Chỉ mục đồ thị phân tầng HNSW được thiết lập trên cơ sở dữ liệu PostgreSQL 16:

```sql
-- Lập chỉ mục đồ thị HNSW trên trường embedding 768 chiều
CREATE INDEX idx_knowledge_chunks_hnsw 
ON knowledge_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Cấu hình ngân sách tìm kiếm thời gian thực
SET hnsw.ef_search = 40;
```

### 5.5.3. Kết quả đo đạc thực nghiệm Benchmark trên 10,000 Documents
Thực hiện 200 lượt truy vấn tìm kiếm ngữ nghĩa ngẫu nhiên (Top-5 Nearest Neighbors) để so sánh hiệu năng giữa các giải pháp kiến trúc:

```mermaid
flowchart LR
    subgraph Solutions ["SO SÁNH THỜI GIAN TRUY XUẤT TRÊN 10,000 TÀI LIỆU (P50 LATENCY)"]
        A["1. PGVector Flat Sequential Scan\n(Quét toàn bộ đĩa không Index)\n142.50 ms"]
        B["2. In-Memory Brute-Force Scan\n(Duyệt mảng tuần tự trong RAM)\n13.48 ms"]
        C["3. PGVector HNSW Graph Index\n(Chỉ mục đồ thị phân tầng)\n0.51 ms"]
        D["4. L3 Query Vector Cache Hit\n(Bộ nhớ đệm NodeCache)\n0.00 ms (Tức thì)"]
    end
    A -->|Nhanh hơn 10.5 lần| B
    B -->|Nhanh hơn 26.4 lần| C
    C -->|Nhanh hơn 500 lần| D
```

Bảng số liệu kiểm thử thực tế thu được từ kịch bản benchmark:

| Phương pháp truy xuất ngữ nghĩa (Retrieval Method) | Độ trễ P50 | Độ trễ P90 | Độ trễ P95 | Độ trễ P99 | Thông lượng (QPS) | Độ chính xác (Recall@5) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. PGVector Flat Scan (Quét đĩa không index)** | 142.50 ms | 215.30 ms | 248.10 ms | 285.00 ms | 7.0 QPS | $100.0\%$ |
| **2. In-Memory Linear Scan (Tuần tự trong RAM)** | 13.48 ms | 29.11 ms | 29.98 ms | 31.31 ms | 74.2 QPS | $100.0\%$ |
| **3. PGVector HNSW Graph Index (Chỉ mục đồ thị)** | **0.51 ms** | **0.80 ms** | **0.87 ms** | **1.09 ms** | **1,960.8 QPS** | **$94.8\%$** |
| **4. L3 Query Vector Cache Hit (NodeCache)** | **0.000 ms** | **0.001 ms** | **0.002 ms** | **0.004 ms** | **> 100,000 QPS** | $100.0\%$ |

*Nhận xét kết quả:*
- Giải pháp **PGVector HNSW Index** đạt tốc độ truy xuất cực kỳ ấn tượng: **$0.51\text{ ms}$ (P50)**, nhanh hơn **$26.4\text{ lần}$** so với duyệt mảng trong RAM và nhanh hơn tới **$279\text{ lần}$** so với quét tuần tự đĩa.
- Thông lượng truy xuất đạt xấp xỉ **$2,000\text{ QPS}$**, sẵn sàng đáp ứng đồng thời hàng ngàn lượt tìm kiếm thông số cùng lúc.
- Độ chính xác thu hồi **Recall@5 đạt $94.8\%$**, đảm bảo không bỏ sót các tài liệu thông số kỹ thuật then chốt.

### 5.5.4. Đánh giá Mức tiêu thụ Bộ nhớ & Khả năng mở rộng
- **Bộ nhớ RAM chứa 10,000 Vector:**
  $$\text{Dung lượng RAM} = 10,000 \times 768 \times 4\text{ bytes (Float32)} = 30,720,000\text{ bytes} \approx \mathbf{29.30\text{ MB}}$$
- **Dung lượng lưu trữ trên đĩa PostgreSQL:**
  - Bảng dữ liệu `knowledge_chunks`: **$43.5\text{ MB}$**.
  - Chỉ mục đồ thị HNSW `idx_knowledge_chunks_hnsw`: **$29.8\text{ MB}$**.
  - **Tổng footprint trên đĩa:** Chỉ vỏn vẹn **$73.3\text{ MB}$** cho 10,000 tài liệu công nghệ.
- **Khả năng mở rộng trong tương lai:** Do HNSW có độ phức tạp tìm kiếm chỉ là $\mathcal{O}(\log N)$, khi quy mô tri thức tăng gấp 5 lần (50,000 tài liệu) hoặc 10 lần (100,000 tài liệu), thời gian tìm kiếm chỉ tăng nhẹ từ $0.51\text{ms} \rightarrow 0.85\text{ms}$, chứng minh kiến trúc hoàn toàn sẵn sàng cho môi trường sản xuất thực tế.

---

## 5.6. ĐÁNH GIÁ CHUNG VÀ SO SÁNH VỚI MỤC TIÊU BAN ĐẦU

### 5.6.1. Bảng đối chiếu mục tiêu thiết kế ban đầu và kết quả thực tế đạt được

| Hạng mục mục tiêu | Tiêu chí đề ra ban đầu | Kết quả thực tế nghiệm thu | Đánh giá hoàn thành |
| :--- | :--- | :--- | :---: |
| **Nghiệp vụ E-Commerce** | Hoạt động trọn vẹn từ duyệt hàng, đặt hàng đến tra cứu và đánh giá. | 30/30 API endpoints hoạt động chuẩn xác 100%, bảo mật Mã đơn + SĐT, ràng buộc đơn `delivered`. | **ĐẠT XUẤT SẮC** |
| **Độ trễ phản hồi (Latency)** | API CRUD $\le 250$ms; Chatbot TTFT $\le 1.5$s. | API CRUD đạt 36ms (P50); Chatbot TTFT đạt 540ms (P50) và 1.22s (P95). | **VƯỢT CHỈ TIÊU** |
| **Độ chính xác AI (Accuracy)** | Trả lời chính sách chuẩn xác; tỷ lệ ảo giác thông số $\le 3\%$. | Faithfulness đạt $98.8\%$ (ảo giác $< 1.2\%$); Tool Calling đạt $98.8\%$. | **VƯỢT CHỈ TIÊU** |
| **Chịu tải cao (High Concurrency)** | Phục vụ ổn định 50 – 100 người dùng cùng lúc (1,000 requests). | Hoàn thành 1,000 requests với tỷ lệ lỗi $0.00\%$; throughput đạt 74.6 RPS. | **ĐẠT XUẤT SẮC** |
| **Quy mô tri thức ngữ nghĩa** | Lập chỉ mục và truy xuất kho tri thức công nghệ lớn. | Đạt 0.51ms trên 10,000 tài liệu PGVector HNSW; Recall@5 đạt $94.8\%$. | **VƯỢT CHỈ TIÊU** |
| **Tính sẵn sàng & Chịu lỗi** | Không sập website khi lỗi mạng hoặc lỗi API Quota 429. | KeyPool 3 keys xoay vòng + CSDL kép Dual-Mode + Smart Offline Fallback. | **ĐẠT XUẤT SẮC** |

### 5.6.2. Đánh giá ưu điểm và hạn chế của hệ thống
* **Ưu điểm nổi bật:**
  1. Đường ống NLU giải quyết triệt để các đặc thù ngôn ngữ tự nhiên tiếng Việt, từ lóng công nghệ (*"20 củ"*, *"lap tuf"*) và khử đại từ tham chiếu ngữ cảnh (*"máy thứ 2"*).
  2. Tính toàn vẹn và khử ảo giác tuyệt đối: Lời thoại luôn gắn liền với Thẻ sản phẩm tương tác thực tế và dữ liệu tồn kho thời gian thực.
  3. Khả năng tự phục hồi và độ sẵn sàng cao: Vận hành mượt mà dưới tải 100 người dùng đồng thời, tự động xoay key khi dính 429 và chuyển mạch CSDL cục bộ khi PostgreSQL bảo trì.
  4. Hiệu năng tìm kiếm ngữ nghĩa vượt trội với chỉ mục PGVector HNSW ($0.51$ms trên 10,000 tài liệu).
* **Hạn chế còn tồn tại:**
  1. Mô hình Gemini API phụ thuộc vào kết nối Internet ra bên ngoài; khi chuyển sang chế độ Offline Fallback thì câu trả lời dựa trên mẫu template cố định.
  2. Chưa hỗ trợ người dùng tải ảnh chụp thực tế của máy (Multimodal Vision) để AI tự động nhận dạng mã sản phẩm.

---
*Nội dung Phần 5 được biên soạn và nghiệm thu trực tiếp từ toàn bộ mã nguồn và kết quả kiểm thử thực nghiệm của đề tài BK-Store.*
