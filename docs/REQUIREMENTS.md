# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
## DỰ ÁN: WEBSITE THƯƠNG MẠI ĐIỆN TỬ THIẾT BỊ CÔNG NGHỆ TÍCH HỢP AI CHATBOT (BK-STORE)

* **Loại đề tài:** Đồ án liên ngành Công nghệ thông tin
* **Nền tảng công nghệ:** Next.js 16 (Frontend), Node.js/Express (Backend), LangChain.js & Google Gemini API (AI Service), PostgreSQL 16 / PGVector (Database).
* **Phiên bản tài liệu:** 2.0 (Cập nhật đồng bộ theo kiến trúc thực tế hệ thống)
* **Ngày cập nhật:** 2026-10-26

---

## 1. GIỚI THIỆU DỰ ÁN (INTRODUCTION)

### 1.1. Mục đích tài liệu
Tài liệu này xác định chi tiết các yêu cầu chức năng, phi chức năng, phạm vi và tiêu chí nghiệm thu cho hệ thống website thương mại điện tử thiết bị công nghệ BK-Store, phục vụ việc đối chiếu nghiệm thu và chuẩn hóa trong quy trình phát triển phần mềm (SDLC).

### 1.2. Mục tiêu hệ thống
* **Website E-Commerce:** Cung cấp kênh bán lẻ trực tuyến cho các thiết bị công nghệ chính hãng (Laptop, Smartphone, Phụ kiện) với chu trình khép kín: duyệt danh mục, thương hiệu, xem thông số, giỏ hàng, đặt hàng (COD/QR Pay), đăng ký/đăng nhập thành viên, quản lý tài khoản và gửi đánh giá sản phẩm sau khi đơn giao thành công.
* **AI Chatbot (BK-Bot):** Xây dựng trợ lý ảo thông minh đóng vai trò nhân viên tư vấn bán hàng và chăm sóc khách hàng 24/7, có khả năng tư vấn cấu hình, so sánh máy, giải đáp chính sách (RAG), truy vấn dữ liệu thực tế (Tool Calling) và hiển thị thẻ sản phẩm tương tác trực quan ngay trong luồng chat.
* **Admin Dashboard:** Cung cấp công cụ quản lý toàn diện cho ban quản trị: quản lý danh mục/sản phẩm, quản lý đơn hàng & đổi trạng thái vận đơn, quản lý số lượng tồn kho theo chi nhánh, và quản lý tri thức RAG.

### 1.3. Các tác nhân trong hệ thống (Actors)
1. **Khách hàng vãng lai (Guest):** Duyệt web, lọc thông số, trò chuyện với AI, đặt hàng nhanh COD/QR, tra cứu đơn hàng bằng Mã đơn + SĐT.
2. **Khách hàng đã đăng ký (Registered Customer):** Đăng nhập tài khoản, xem lịch sử các đơn hàng đã đặt, gửi đánh giá (1-5★) cho sản phẩm của đơn hàng đã nhận thành công.
3. **Trợ lý ảo AI (BK-Bot):** Tự động phản hồi khách hàng theo ngữ cảnh tự nhiên, gọi 6 công cụ nội bộ để tra cứu kho, đơn hàng, thông số và đánh giá.
4. **Quản trị viên (Admin):** Quản lý sản phẩm, thông số cấu hình, tồn kho theo chi nhánh, cập nhật trạng thái đơn hàng và kiểm tra tri thức RAG.

---

## 2. PHẠM VI HỆ THỐNG (SYSTEM SCOPE)

### 2.1. Trong phạm vi (In-Scope)
* **Quản lý danh mục & thương hiệu:** Hơn 30+ sản phẩm thiết bị công nghệ thật (Apple, Asus, Dell, Lenovo, Samsung, Sony...) với cấu hình kỹ thuật đầy đủ (CPU, GPU, RAM, Ổ cứng, Màn hình, Pin...).
* **Bộ lọc thông số đa chiều:** Lọc theo phân loại, thương hiệu, mức giá, từ khóa tìm kiếm.
* **Giỏ hàng & Đặt hàng tinh gọn:** Thêm/sửa/xóa sản phẩm, chọn hình thức COD hoặc quét mã VietQR tĩnh, sinh mã đơn hàng độc nhất (ví dụ: `#BK-1024`).
* **Hệ thống đánh giá sản phẩm gắn liền đơn hàng:** Ràng buộc chặt chẽ - chỉ khách hàng có đơn hàng trạng thái `delivered` mới được quyền gửi đánh giá sao và nhận xét cho máy đã mua.
* **Hệ thống AI Chatbot chuyên sâu:**
  * Trò chuyện thời gian thực dạng Streaming (Server-Sent Events - SSE).
  * Duy trì trí nhớ ngữ cảnh đa lượt hỏi đáp (Session Memory).
  * Tư vấn theo nhu cầu (học tập, văn phòng, đồ họa, lập trình) & so sánh 2–3 máy.
  * Truy xuất tri thức chính sách qua RAG Engine từ 8 tài liệu cửa hàng (bảo hành, đổi trả, giao hàng, hóa đơn...).
  * Bộ 6 công cụ Tool Calling nội bộ: `checkInventory`, `trackOrder`, `filterProducts`, `getProductDetails`, `getProductReviews`, `checkReviewEligibility`.
  * Rich UI Cards: Hiển thị Thẻ Card sản phẩm (ảnh, giá, thông số, nút "Xem chi tiết" / "Thêm giỏ") ngay trong khung chat.
  * Gemini KeyPool xoay vòng API Keys tự động chịu lỗi và hàng đợi kiểm soát concurrency.
* **Trang quản trị (Admin):**
  * Quản lý sản phẩm (CRUD, specs JSON, hình ảnh qua upload API).
  * Quản lý đơn hàng (theo dõi danh sách, đổi trạng thái: `pending` → `confirmed` → `shipping` → `delivered` → `cancelled`).
  * Quản lý tồn kho theo từng chi nhánh trên cả nước.
  * Quản lý tài liệu RAG và tái vector hóa cơ sở tri thức.

### 2.2. Ngoài phạm vi (Out-of-Scope)
* Không tích hợp trực tiếp API cổng thanh toán trung gian bên thứ ba (VNPAY, MoMo Sandbox) vì rào cản pháp lý → Thay thế bằng COD và chuyển khoản quét mã QR ngân hàng tĩnh.
* Không kết nối trực tiếp API của hãng vận chuyển thứ 3 (GHN, Viettel Post) → Tiến trình vận đơn được mô phỏng linh hoạt bởi hệ thống và admin.
* Không xây dựng sàn thương mại đa người bán (Multi-vendor).
* Không tự huấn luyện lại mô hình ngôn ngữ lớn từ đầu (Pre-train/Fine-tune LLM).

---

## 3. YÊU CẦU CHỨC NĂNG CHI TIẾT (FUNCTIONAL REQUIREMENTS)

### 3.1. Phân hệ Cửa hàng (Storefront)
| Mã yêu cầu | Tên chức năng | Mô tả chi tiết |
| :--- | :--- | :--- |
| **FR-01** | Trang chủ & Danh mục | Trình bày banner sự kiện, danh mục nổi bật (Laptop, Smartphone, Phụ kiện), thương hiệu chính hãng và các máy bán chạy. |
| **FR-02** | Tìm kiếm & Bộ lọc | Tìm kiếm theo tên thiết bị; lọc đa tiêu chí theo Hãng (Brand), Phân loại (Category), Tầm giá (Price Range) và sắp xếp. |
| **FR-03** | Chi tiết sản phẩm & QuickView | Xem thông số kỹ thuật chi tiết dạng bảng (CPU, RAM, Ổ cứng, GPU, Màn hình, Pin), chính sách bảo hành, ảnh zoom và danh sách đánh giá từ người mua trước. |
| **FR-04** | Quản lý giỏ hàng | Thêm sản phẩm vào giỏ, điều chỉnh số lượng, xóa sản phẩm, tính tự động tổng giá trị; lưu trữ qua LocalStorage. |
| **FR-05** | Đặt hàng (Checkout) | Nhập thông tin nhận hàng (Họ tên, SĐT, Địa chỉ, Ghi chú), chọn hình thức COD hoặc QR Chuyển khoản, tạo mã đơn dạng `#BK-XXXX`. |
| **FR-06** | Xác thực & Người dùng | Đăng ký, đăng nhập JWT, cập nhật hồ sơ cá nhân, xem toàn bộ lịch sử đơn hàng của tài khoản. |
| **FR-07** | Tra cứu đơn hàng | Modal tra cứu nhanh cho khách vãng lai: nhập `Mã đơn` + `Số điện thoại` để xem chi tiết lộ trình vận đơn. |
| **FR-08** | Đánh giá sản phẩm (Reviews) | Khách hàng nhập Mã đơn + SĐT (đơn phải ở trạng thái `delivered`) để chấm điểm 1-5 sao và viết cảm nhận thực tế. |

### 3.2. Phân hệ Trợ lý ảo AI (BK-Bot)
| Mã yêu cầu | Tên chức năng | Mô tả chi tiết |
| :--- | :--- | :--- |
| **FR-09** | Giao diện Chat & SSE Stream | Cửa sổ chat nổi (Floating Widget) với hiệu ứng gõ chữ mượt mà qua kết nối SSE (`/api/chat/stream`). |
| **FR-10** | Quản lý phiên & Ngữ cảnh | Lưu lịch sử hội thoại trong phiên để AI hiểu câu hỏi tham chiếu tiếp theo (ví dụ: *"Máy đó pin dùng được mấy tiếng?"*). |
| **FR-11** | Tư vấn cấu hình thông minh | Phân tích nhu cầu tự nhiên (học CNTT, dựng video 4K, chơi game AAA, ngân sách dưới 25 triệu) → đề xuất máy thích hợp nhất. |
| **FR-12** | So sánh kỹ thuật | Tự động so sánh điểm mạnh, điểm yếu và cấu hình giữa 2 đến 3 mẫu máy theo yêu cầu của khách. |
| **FR-13** | RAG - Tra cứu chính sách | Tìm kiếm ngữ nghĩa trong 8 bộ tài liệu Markdown của cửa hàng để trả lời chính xác về bảo hành, đổi trả, giao hàng, hóa đơn. |
| **FR-14** | Tool: Tra cứu tồn kho | Gọi `checkInventory` để kiểm tra máy còn hay hết tại các kho Hà Nội, TP.HCM, Đà Nẵng. |
| **FR-15** | Tool: Tra cứu vận đơn | Gọi `trackOrder` để lấy trạng thái đơn hàng, đơn vị giao hàng và vị trí đơn thời gian thực. |
| **FR-16** | Tool: Lọc máy theo yêu cầu | Gọi `filterProducts` để tự động lọc máy phù hợp theo tầm giá và thương hiệu trực tiếp từ DB. |
| **FR-17** | Tool: Chi tiết cấu hình | Gọi `getProductDetails` để lấy thông số phần cứng chi tiết của mã máy khách đang quan tâm. |
| **FR-18** | Tool: Tra cứu đánh giá | Gọi `getProductReviews` để thông báo số sao trung bình và phản hồi thực tế của khách đã mua. |
| **FR-19** | Tool: Kiểm tra quyền đánh giá | Gọi `checkReviewEligibility` để hướng dẫn khách kiểm tra đơn hàng đã đủ điều kiện gửi đánh giá chưa. |
| **FR-20** | Thẻ tương tác Rich UI Cards | Tự động chèn Card sản phẩm (ảnh thu nhỏ, tên, giá bán, nút "Xem ngay" / "Thêm giỏ") ngay trong tin nhắn của bot. |
| **FR-21** | Cơ chế KeyPool & Chống lỗi | Tự động xoay vòng danh sách Google Gemini API Keys khi gặp lỗi 429 Quota Exceeded và fallback qua các model dự phòng. |

### 3.3. Phân hệ Quản trị (Admin Dashboard)
| Mã yêu cầu | Tên chức năng | Mô tả chi tiết |
| :--- | :--- | :--- |
| **FR-22** | Xác thực Admin (RBAC) | Kiểm tra quyền `role: admin` qua JWT middleware trước khi cho phép vào khu vực quản trị `/admin`. |
| **FR-23** | Thống kê Dashboard | Hiển thị tổng quan doanh thu, số lượng đơn hàng, số mặt hàng và tổng số lượng tồn kho. |
| **FR-24** | Quản lý sản phẩm | Xem bảng danh sách, tìm kiếm, thêm mới máy, sửa cấu hình specs (JSON), cập nhật giá/kho, tải ảnh sản phẩm. |
| **FR-25** | Quản lý đơn hàng | Xem danh sách đơn đặt, lọc theo trạng thái, cập nhật trạng thái đơn hàng (`pending` ➔ `confirmed` ➔ `shipping` ➔ `delivered` ➔ `cancelled`). |
| **FR-26** | Quản lý kho hàng chi nhánh | Điều chỉnh số lượng sản phẩm tại từng chi nhánh (Hà Nội, Hồ Chí Minh, Đà Nẵng). |
| **FR-27** | Quản lý cơ sở tri thức RAG | Giám sát danh sách 8 tài liệu tri thức, xem số chunks, nội dung tóm tắt và thực hiện tái tạo Vector Embeddings. |

---

## 4. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

| Mã yêu cầu | Hạng mục | Tiêu chí kỹ thuật |
| :--- | :--- | :--- |
| **NFR-01** | **Thời gian đáp ứng (Latency)** | Thời gian phát sinh ký tự đầu tiên (Time to First Token) của Chatbot ≤ 1.5 giây qua SSE. API nghiệp vụ CRUD thông thường ≤ 250ms. |
| **NFR-02** | **Tính chính xác & Chống ảo giác (Groundedness)** | Câu trả lời về chính sách cửa hàng bắt buộc bám sát tài liệu RAG. Tỷ lệ tự bịa thông số/giá không có trong cơ sở dữ liệu ≤ 3%. |
| **NFR-03** | **Bảo mật & Phân quyền (Security)** | Khóa API Gemini và bí mật JWT được bảo vệ trong biến môi trường Backend. Mật khẩu người dùng được băm bằng bcryptjs (salt 10 vòng). |
| **NFR-04** | **Tính sẵn sàng & Chịu lỗi (High Availability)** | Hệ thống trang bị Gemini KeyPool chịu lỗi 429 và cơ chế Dual-Mode Local Store (`local_db.json`) giúp ứng dụng vẫn chạy tốt khi database ngoài bảo trì. |
| **NFR-05** | **Giao diện & Trải nghiệm (UI/UX)** | Chuẩn Responsive hoàn hảo cho cả thiết bị máy tính bàn và điện thoại di động; Chat Widget hỗ trợ phím tắt, âm thanh và trạng thái gõ chữ. |
| **NFR-06** | **Kiến trúc module hóa (Architecture)** | 100% mã nguồn JavaScript/TypeScript trên nền Node.js/Express và Next.js App Router, cấu trúc phân lớp rõ ràng (Routes, Middlewares, Controllers, Services, AI Tools). |
| **NFR-07** | **Khả năng chịu tải đồng thời (Scalability & Concurrency)** | Hệ thống chịu tải mượt mà từ 50 – 100 người dùng ảo đồng thời (1,000 requests) với tỷ lệ lỗi 0.00%, thông lượng xử lý đạt ≥ 70 requests/giây thông qua Gemini KeyPool và Concurrency Limiter. |
| **NFR-08** | **Quy mô tri thức công nghệ lớn (10k Tech Documents)** | Lưu trữ và lập chỉ mục PGVector HNSW trên 10,000 tài liệu thông số kỹ thuật phần cứng, thời gian truy xuất P50 < 1ms (đạt 0.51ms), Recall@5 ≥ 94.0%. |
| **NFR-09** | **Độ tin cậy & Kiểm chuẩn Ground Truth** | Đánh giá đạt chuẩn trên bộ đối sánh Ground Truth: Faithfulness (chống ảo giác) ≥ 98%, Tool Calling Accuracy ≥ 98%, Context Precision ≥ 93%. |

---

## 5. MÔ TẢ LUỒNG HOẠT ĐỘNG CỦA AI CHATBOT (AI WORKFLOW)

```
[Khách hàng gửi tin nhắn vào Chat Widget]
                 │
                 ▼
[Express Server: Endpoint /api/chat/stream]
                 │
                 ├── [Kiểm tra Concurrency Limiter & Lấy Key từ KeyPool]
                 │
                 ▼
[Gemini LLM kết hợp LangChain.js Tool Declarations]
                 │
  ┌──────────────┴───────────────────────────────────────────────────────┐
  │                                                                      │
[1. Ý định tra cứu chính sách / thông tin]                [2. Ý định tra cứu nghiệp vụ hệ thống]
  │                                                                      │
  ▼                                                                      ▼
[RAG Engine: Embed Query -> Cosine Search]                 [Function Calling Dispatcher]
  │                                                                      │
  ├── 01_chinh_sach_bao_hanh.md                                          ├── checkInventory (Kho 3 miền)
  ├── 02_chinh_sach_doi_tra_hoan_tien.md                                 ├── trackOrder (Trạng thái đơn hàng)
  ├── 03_chinh_sach_van_chuyen_giao_hang.md                              ├── filterProducts (Lọc cấu hình/giá)
  ├── 04_huong_dan_thanh_toan_hoa_don.md                                 ├── getProductDetails (Thông số máy)
  ├── 05_cam_nang_tu_van_cau_hinh.md                                     ├── getProductReviews (Số sao & nhận xét)
  ├── 06_thong_tin_doanh_nghiep_bkstore.md                               └── checkReviewEligibility (Quyền đánh giá)
  ├── 07_thong_tin_thuong_hieu_chinh_hang.md                             │
  └── 08_chinh_sach_va_huong_dan_danh_gia.md                             ▼
  │                                                        [Thực thi hàm & Query CSDL PostgreSQL / Local Store]
  │                                                                      │
  └──────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
                 [Gemini tổng hợp lời thoại tự nhiên]
                                 │
                                 ▼
         [Server-Sent Events: Stream Token + Rich Product Cards]
                                 │
                                 ▼
                     [Hiển thị mượt mà trên Chat Widget]
```

---

## 6. TIÊU CHÍ NGHIỆM THU ĐỒ ÁN (ACCEPTANCE CRITERIA)

Dự án được đánh giá hoàn thành xuất sắc khi đáp ứng đủ các tiêu chí:
1. **Hoạt động trọn vẹn nghiệp vụ bán hàng:** Duyệt danh mục, lọc theo hãng/giá, xem bảng cấu hình chi tiết, thêm giỏ, đặt hàng nhận mã đơn `#BK-XXXX`, xem lịch sử tài khoản.
2. **Cơ chế đánh giá thực tế:** Chỉ cho phép đánh giá đơn hàng đã ở trạng thái `delivered`; hiển thị công khai số sao trung bình trên trang chi tiết máy.
3. **Chatbot AI thông minh và thực tế:**
   - Trả lời trôi chảy, đúng phong thái chuyên viên tư vấn công nghệ BK-Store.
   - Stream chữ mượt mà qua SSE, hiển thị Card sản phẩm kèm ảnh và nút thao tác trực tiếp.
   - Trả lời chuẩn xác các câu hỏi chính sách dựa trên 8 tài liệu RAG.
   - Thực thi chính xác cả 6 công cụ Tool Calling khi khách hỏi về kho, đơn hàng, cấu hình và đánh giá.
4. **Độ ổn định và cơ chế tự phục hồi:** Hoạt động ổn định với Docker Compose (PostgreSQL 16 PGVector); tự động xoay key khi bị giới hạn hạn ngạch Gemini; vượt qua bài kiểm thử tải 50-100 VUs (1,000 requests) với tỷ lệ lỗi 0.00% và chỉ số HNSW truy xuất 10,000 tài liệu công nghệ đạt 0.51ms.
5. **Đầy đủ hồ sơ tài liệu & bộ dữ liệu kiểm thử:** Đề cương đề tài (PROJECT_PROPOSAL.md), Đặc tả yêu cầu phần mềm (REQUIREMENTS.md), Báo cáo kiến trúc & kiểm thử hiệu năng (SYSTEM_ARCHITECTURE.md), Bộ dữ liệu Ground Truth (`ground_truth_eval.json`), Script benchmark (`test-benchmark-10k.ts`) và Kịch bản tải k6 (`test-load-k6.js`).

---
*© 2026 BK-Store Team. Đồ án liên ngành Công nghệ Thông tin.*
