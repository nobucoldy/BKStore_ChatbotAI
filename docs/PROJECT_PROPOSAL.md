# PROJECT PROPOSAL

## THÔNG TIN CHUNG VỀ ĐỀ TÀI

* **Tên đề tài :** Xây dựng Website thương mại điện tử thiết bị công nghệ tích hợp Trợ lý ảo AI chăm sóc khách hàng dựa trên Node.js, Express, Next.js, LangChain.js và Google Gemini.
* **Tên sản phẩm dự kiến:** **BK-Store** (*Smart Tech Commerce*)
* **Loại đề tài:** Đồ án liên ngành Công nghệ thông tin 
* **Thời gian thực hiện dự kiến:** 10 tuần 
* **Giảng viên hướng dẫn:** Thầy **Nguyễn Văn Sơn**
* **Sinh viên thực hiện:**
  1. **Nguyễn Quế Bắc** - MSSV: `23010574`
  2. **Hoàng Tuấn Kiệt** - MSSV: `23010517`

---

## 1. ĐẶT VẤN ĐỀ & TÍNH CẤP THIẾT CỦA ĐỀ TÀI

### 1.1. Bối cảnh thực tiễn
Thương mại điện tử (E-Commerce) trong lĩnh vực thiết bị điện tử, công nghệ (Laptop, Điện thoại thông minh, Phụ kiện số) là một trong những ngành hàng có giá trị đơn hàng cao và tốc độ phát triển mạnh mẽ. Tuy nhiên, khác với các mặt hàng tiêu dùng thông thường, thiết bị công nghệ có **thông số kỹ thuật phức tạp** (CPU, GPU, dung lượng RAM/ROM, chuẩn màn hình, tản nhiệt, chuẩn kết nối) và **yêu cầu bảo hành nghiêm ngặt**. 

Khách hàng khi mua sắm trực tuyến thường có nhu cầu rất lớn về:
* Được tư vấn dòng sản phẩm tối ưu theo ngân sách và mục đích sử dụng cụ thể (lập trình, đồ họa 3D, gaming, văn phòng).
* So sánh chi tiết ưu - nhược điểm giữa các dòng máy tương đương từ nhiều thương hiệu khác nhau (Apple, Asus, Dell, Lenovo, Samsung, Sony...).
* Hỏi đáp nhanh về chính sách đổi trả, bảo hành linh kiện, vận chuyển, xuất hóa đơn VAT.
* Tra cứu thực tế đánh giá của những khách hàng đã nhận đơn giao thành công trước khi đưa ra quyết định mua sắm.

### 1.2. Hạn chế của các giải pháp hiện tại
1. **Chatbot dựa trên quy tắc (Rule-based Chatbot):** Thường dựa trên các cây kịch bản định sẵn (menu nút bấm hoặc nhận diện từ khóa cứng). Hệ thống này bất lực trước câu hỏi tự nhiên phức tạp, không hiểu ngữ cảnh hội thoại đa biến và không có khả năng so sánh thông số linh hoạt.
2. **Đội ngũ nhân viên trực 24/7:** Chi phí vận hành nhân sự trực ca đêm hoặc giờ cao điểm rất lớn, tốc độ trả lời phụ thuộc vào kiến thức cá nhân của từng nhân viên.

### 1.3. Giải pháp đề xuất
Đề tài đề xuất ứng dụng **Mô hình ngôn ngữ lớn (Large Language Model - LLM)** tiên tiến từ **Google Gemini (Gemini 3.8 Flash / 3.5 Flash)** kết hợp với framework **LangChain.js** và kỹ thuật **RAG (Retrieval-Augmented Generation)** để xây dựng một **Trợ lý ảo AI (BK-Bot)**:
* Tự động tư vấn thông số kỹ thuật chuẩn xác theo ngôn ngữ tự nhiên.
* Truy xuất chính xác tài liệu chính sách của cửa hàng thông qua Cơ sở dữ liệu Vector (Vector DB / HNSW Indexing), loại bỏ hoàn toàn hiện tượng ảo giác (hallucination).
* Ứng dụng **Function / Tool Calling** để bot kết nối trực tiếp với Cơ sở dữ liệu, tự động tra cứu số lượng tồn kho theo chi nhánh, kiểm tra tiến độ đơn hàng, tìm kiếm máy theo khoảng giá và tra cứu đánh giá thực tế của sản phẩm.
* Cơ chế **Gemini KeyPool xoay vòng API Keys** và kiểm soát concurrency đảm bảo hệ thống không bị gián đoạn khi chạm quota.
* Toàn bộ hệ thống Backend được phát triển trên nền tảng **Node.js/Express (TypeScript)**, kết hợp cơ chế Non-blocking I/O để xử lý luồng phản hồi tức thời (Server-Sent Events - SSE).

---

## 2. MỤC TIÊU CỦA ĐỀ TÀI

### 2.1. Mục tiêu tổng quát
Xây dựng một nền tảng thương mại điện tử chuyên ngành công nghệ hoàn chỉnh từ giao diện người dùng đến hệ thống quản trị, tích hợp sâu một Trợ lý ảo AI có khả năng tư vấn nghiệp vụ và hỗ trợ khách hàng tự động 24/7.

### 2.2. Mục tiêu cụ thể
1. **Về Kỹ nghệ phần mềm (Software Engineering):**
   * Xây dựng website bán hàng hiện đại với Next.js (App Router), TailwindCSS và Zustand; Backend RESTful API với Node.js/Express và TypeScript.
   * Thiết kế cơ sở dữ liệu quan hệ PostgreSQL chuẩn hóa cho nghiệp vụ bán hàng kết hợp mở rộng PGVector cho dữ liệu ngữ nghĩa.
   * Xây dựng cơ chế Local Fallback Store (`local_db.json`) giúp hệ thống vận hành linh hoạt và có tính sẵn sàng cao.
   * Hoàn thiện phân hệ người dùng (xem lịch sử đơn hàng, đánh giá sau khi nhận hàng) và phân hệ quản trị Admin (quản lý sản phẩm, tồn kho, đơn hàng, tài liệu RAG).
   
2. **Về Trí tuệ nhân tạo ứng dụng (Applied AI):**
   * Xây dựng pipeline RAG hoàn chỉnh với 8 bộ tài liệu doanh nghiệp: Phân mảnh (Chunking) → Sinh Vector Embedding (`gemini-embedding-001`) → Lưu trữ & Truy vấn ngữ nghĩa (Semantic Search).
   * Triển khai kỹ thuật Agentic Tool Calling với 6 công cụ nghiệp vụ: `checkInventory`, `trackOrder`, `filterProducts`, `getProductDetails`, `getProductReviews`, `checkReviewEligibility`.
   * Tối ưu hóa trải nghiệm người dùng với Server-Sent Events (SSE) và Rich Card hiển thị sản phẩm tương tác trực tiếp trong luồng chat.

---

## 3. ĐỐI TƯỢNG VÀ PHẠM VI NGHIÊN CỨU

### 3.1. Đối tượng nghiên cứu
* Kiến trúc ứng dụng Web hướng dịch vụ sử dụng Node.js, Express và Next.js.
* Mô hình ngôn ngữ lớn Google Gemini (`gemini-3.8-flash`, `gemini-3.5-flash`) và mô hình nhúng (`gemini-embedding-001`).
* Framework LangChain.js và kỹ thuật RAG trong môi trường JavaScript/TypeScript.
* Cơ sở dữ liệu Vector và thuật toán tìm kiếm tương đồng vector (Cosine Similarity / HNSW Index).

### 3.2. Phạm vi đề tài (Scope)

#### A. Trong phạm vi (In-Scope)
* **Website bán hàng:** Danh mục thiết bị điện tử (Laptop, Smartphone, Phụ kiện); bộ lọc thông số kỹ thuật (Hãng, Giá, Phân loại); giỏ hàng; đặt hàng nhanh (COD / Chuyển khoản QR tĩnh); tài khoản khách hàng; tra cứu vận đơn theo Mã đơn + SĐT; đánh giá sản phẩm sau khi đơn giao thành công.
* **AI Chatbot:** Widget chat nổi; stream chữ thời gian thực (SSE); tư vấn cấu hình theo nhu cầu; so sánh 2–3 sản phẩm; hỏi đáp chính sách (RAG); gọi công cụ kiểm tra tồn kho, đơn hàng, đánh giá (Tool Calling); hiển thị thẻ sản phẩm tương tác (Card) có nút thêm giỏ và xem chi tiết.
* **Trang quản trị (Admin Dashboard):** Báo cáo tổng quan; quản lý sản phẩm, thông số cấu hình và upload ảnh; quản lý tồn kho theo chi nhánh; quản lý trạng thái đơn hàng; giám sát tri thức RAG và tái vector hóa.

#### B. Ngoài phạm vi (Out-of-Scope)
* Không tích hợp cổng thanh toán trực tuyến của bên thứ ba (VNPAY, MoMo) vì lý do pháp lý doanh nghiệp → Thay thế bằng COD và mã QR chuyển khoản tĩnh.
* Không kết nối trực tiếp API của hãng vận chuyển thứ ba (GHN, Viettel Post) → Tiến trình đơn hàng được mô phỏng linh hoạt bởi hệ thống và quản trị viên.
* Không xây dựng sàn thương mại đa người bán (Multi-vendor).
* Không tự huấn luyện lại mô hình nền tảng (Pre-train/Fine-tune LLM từ đầu).

---

## 4. PHƯƠNG PHÁP NGHIÊN CỨU & KIẾN TRÚC GIẢI PHÁP

### 4.1. Phương pháp luận phát triển (SDLC)
Dự án áp dụng mô hình **Iterative Agile / Scrum** với các chu kỳ lặp ngắn (Sprints 2 tuần), đảm bảo việc tích hợp liên tục giữa Frontend, Backend và AI Service.

### 4.2. Kiến trúc giải pháp kỹ thuật

```
[Khách hàng (Trình duyệt)] 
           │ (HTTP / SSE)
           ▼
[Frontend: Next.js (React) + TailwindCSS + Zustand]
           │ (RESTful API & EventSource)
           ▼
[Backend: Node.js + Express.js API Server (TypeScript)]
   ├── [Module Nghiệp vụ]: Auth (JWT), Product, Cart, Order, Review, Branch, Inventory
   └── [Module AI Service (Gemini + LangChain.js)]:
            ├── Google Gemini Engine (KeyPool xoay vòng & Concurrency Limiter)
            ├── Embeddings Service (gemini-embedding-001)
            ├── Vector RAG Store: PGVector / In-Memory (8 bộ tri thức chính sách)
            └── Agent Tools:
                 ├── checkInventory (Tra cứu kho 3 miền)
                 ├── trackOrder (Tra cứu đơn hàng)
                 ├── filterProducts (Lọc sản phẩm theo cấu hình & ngân sách)
                 ├── getProductDetails (Thông số kỹ thuật chi tiết)
                 ├── getProductReviews (Đánh giá thực tế)
                 └── checkReviewEligibility (Kiểm tra quyền đánh giá đơn hàng)
           │
           ▼
[Cơ sở dữ liệu: PostgreSQL 16 (PGVector) + Local Dual-Mode JSON Store]
```

---

## 5. KẾ HOẠCH & TIẾN ĐỘ THỰC HIỆN (ROADMAP 10 TUẦN)

| Giai đoạn (Sprint) | Thời gian | Nội dung công việc chính | Sản phẩm đầu ra (Deliverables) |
| :--- | :---: | :--- | :--- |
| **Pha 1: Khởi động & Đặc tả yêu cầu** | Tuần 1 | • Khảo sát nghiệp vụ bán lẻ công nghệ.<br>• Phân tích yêu cầu chức năng & phi chức năng.<br>• Viết tài liệu đặc tả yêu cầu (SRS) và đề cương Proposal. | • Bản SRS hoàn chỉnh.<br>• Bản đề cương Proposal. |
| **Pha 2: Thiết kế hệ thống & CSDL** | Tuần 2 | • Thiết kế kiến trúc tổng thể Backend/Frontend.<br>• Thiết kế ERD CSDL PostgreSQL & PGVector Schema.<br>• Thiết kế giao diện Storefront & Admin. | • Database Schema SQL hoàn chỉnh.<br>• Giao diện UI/UX mẫu. |
| **Pha 3: Phát triển Core E-Commerce** | Tuần 3–4 | • Xây dựng Backend Express API (Sản phẩm, Đơn hàng, Đánh giá, Kho).<br>• Xây dựng Frontend Next.js (Danh mục, Chi tiết máy, Giỏ hàng, Đặt hàng, Tra cứu).<br>• Triển khai cơ chế Dual-Mode Local JSON Store. | • Web bán hàng hoạt động trọn vẹn từ duyệt máy đến đặt hàng và tra cứu. |
| **Pha 4: Xây dựng AI RAG Pipeline** | Tuần 5–6 | • Biên soạn 8 bộ tài liệu chính sách & cẩm nang kỹ thuật chuẩn.<br>• Xây dựng RAG Service, chunking, caching embedding và PGVector Cosine search.<br>• Tối ưu System Prompt hạn chế tối đa ảo giác. | • Module RAG tra cứu chính sách chuẩn xác 100% bám sát văn bản. |
| **Pha 5: Agent Tool Calling, KeyPool & SSE** | Tuần 7–8 | • Viết 6 công cụ Tool Calling kết nối trực tiếp CSDL.<br>• Triển khai Gemini KeyPool xoay vòng API key & Concurrency Limiter.<br>• Xây dựng SSE Endpoint stream chữ và Rich Product Cards trong Chat Widget. | • Trợ lý ảo AI hoạt động mượt mà, gọi tool chính xác, hiển thị trực quan. |
| **Pha 6: Kiểm thử, Tối ưu & Báo cáo** | Tuần 9–10 | • Kiểm thử toàn diện API, tải đồng thời, cơ chế fallback.<br>• Đóng gói Docker Compose & hoàn thiện Báo cáo đồ án.<br>• Chuẩn bị slide thuyết trình và video kịch bản demo. | • Toàn bộ mã nguồn hoàn thiện.<br>• Bộ tài liệu kỹ thuật & Báo cáo đồ án tốt nghiệp. |

---

## 6. ĐÁNH GIÁ RỦI RO & PHƯƠNG ÁN GIẢI QUYẾT

| Rủi ro tiềm ẩn | Mức độ | Phương án phòng ngừa / Giải quyết |
| :--- | :---: | :--- |
| **Chi phí / Hạn mức Gemini API bị cạn kiệt (Lỗi 429)** | Cao | Tích hợp module `GeminiKeyManager` cho phép cấu hình danh sách nhiều API keys và tự động chuyển sang key dự phòng khi gặp 429; áp dụng hàng đợi điều tiết Concurrency Limiter. |
| **Hiện tượng ảo giác thông tin (Hallucination)** | Cao | Ép buộc bot trả lời dựa trên RAG Context; sử dụng System Prompt nghiêm ngặt cấm bịa thông số/giá tiền; trả về fallback nếu không tìm thấy dữ liệu trong DB. |
| **Độ trễ phản hồi của Chatbot cao** | Trung bình | Ứng dụng Server-Sent Events (SSE) để stream token ngay khi model vừa sinh chữ; áp dụng caching cho query vector và câu hỏi thường gặp (NodeCache). |
| **Cơ sở dữ liệu chính gặp trục trặc kết nối** | Trung bình | Xây dựng cơ chế Local Dual-Mode Store tự động đọc ghi vào `local_db.json`, đảm bảo website và AI vẫn trả lời được mà không làm gián đoạn trải nghiệm người dùng. |

---

## 7. KẾT QUẢ VÀ Ý NGHĨA ĐỀ TÀI

### 7.1. Sản phẩm bàn giao
1. **Ứng dụng hoàn chỉnh:** Website BK-Store hoạt động ổn định, đầy đủ phân hệ Khách hàng, Trợ lý ảo AI và Quản trị viên Admin.
2. **Bộ mã nguồn:** 100% JavaScript/TypeScript phân tầng rõ ràng, chuẩn hoá theo MVC & Service Layer, sẵn sàng chạy với Docker Compose.
3. **Hồ sơ tài liệu kỹ thuật:**
   * Bản đề cương đề tài (PROJECT_PROPOSAL.md).
   * Bản đặc tả yêu cầu phần mềm (REQUIREMENTS.md).
   * Tài liệu cơ sở tri thức RAG (backend/src/data/knowledge/README.md).
   * Tài liệu tổng quan hệ thống và hướng dẫn cài đặt (README.md).

### 7.2. Ý nghĩa thực tiễn
* Đưa ra giải pháp thực tế chứng minh việc ứng dụng Mô hình ngôn ngữ lớn (Google Gemini) kết hợp RAG và Tool Calling có thể giải quyết trọn vẹn bài toán chăm sóc khách hàng trong ngành bán lẻ thiết bị công nghệ mà không cần đầu tư hạ tầng máy chủ AI đắt đỏ.
* Đóng góp một kiến trúc tham chiếu (Reference Blueprint) cho các hệ thống thương mại điện tử thế hệ mới tích hợp Trí tuệ nhân tạo đàm thoại (Conversational Commerce).

---
*© 2026 BK-Store Team. Đồ án liên ngành Công nghệ Thông tin.*
