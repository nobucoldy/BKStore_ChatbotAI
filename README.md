# BK-Store: Website Thương Mại Điện Tử Thiết Bị Công Nghệ Tích Hợp AI Chatbot

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-v16+-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20PGVector-blue.svg)](https://www.postgresql.org/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-3.8%20Flash%20%2F%20KeyPool-orange.svg)](https://ai.google.dev/)
[![LangChain](https://img.shields.io/badge/LangChain.js-v0.3+-blueviolet.svg)](https://js.langchain.com/)

> **Đồ án liên ngành Công nghệ Thông tin**  
> Nghiên cứu và xây dựng Website thương mại điện tử thiết bị công nghệ tích hợp Trợ lý ảo AI chăm sóc khách hàng dựa trên nền tảng **Node.js, Express, Next.js, LangChain.js và Google Gemini**.

---

## 👥 THÔNG TIN THỰC HIỆN ĐỀ TÀI

* **Giảng viên hướng dẫn:** Thầy **Nguyễn Văn Sơn**
* **Sinh viên thực hiện:**
  1. **Nguyễn Quế Bắc** - Mã sinh viên: `23010574`
  2. **Hoàng Tuấn Kiệt** - Mã sinh viên: `23010517`
* **Thời gian thực hiện:** Năm học 2026
* **Link Notion Dự án:** [BK-Store Notion Workspace](https://app.notion.com/p/BK-Store-chatbot-AI-c8f1c094d508834d97dc81377b278b2e)

---

## 🌟 GIỚI THIỆU DỰ ÁN

**BK-Store** là giải pháp thương mại điện tử chuyên cung cấp thiết bị công nghệ chính hãng (Laptop, Smartphone, Phụ kiện) với điểm nhấn cốt lõi là **Trợ lý ảo AI (BK-Bot)** được tích hợp sâu vào toàn bộ hệ thống:

* **Tư vấn cấu hình chuyên sâu:** Tự nhiên phân tích nhu cầu học tập, văn phòng, đồ họa, lập trình và mức ngân sách để đề xuất máy tối ưu.
* **So sánh sản phẩm trực quan:** Đối chiếu chi tiết thông số kỹ thuật (CPU, RAM, Ổ cứng, GPU, Màn hình, Pin, Trọng lượng) giữa các sản phẩm.
* **RAG Kiến thức chuẩn xác:** Trả lời chính sách bảo hành, đổi trả, vận chuyển, xuất hóa đơn VAT từ 8 bộ tài liệu chuyên sâu của cửa hàng với cơ chế Vector Embedding + Cosine Similarity, hạn chế tối đa ảo giác thông tin.
* **Agentic Tool Calling:** Tự động gọi các API nghiệp vụ: kiểm tra tồn kho theo chi nhánh (`checkInventory`), tra cứu vận đơn thời gian thực (`trackOrder`), lọc cấu hình theo ngân sách (`filterProducts`), lấy chi tiết máy (`getProductDetails`), tra cứu đánh giá (`getProductReviews`) và kiểm tra điều kiện đánh giá (`checkReviewEligibility`).
* **Hệ thống đánh giá sản phẩm gắn liền đơn hàng:** Cơ chế Review minh bạch chỉ cho phép những đơn hàng đã giao thành công (`delivered`) được gửi đánh giá thực tế (1 - 5 sao kèm bình luận).
* **Kiến trúc chịu tải & phục hồi (Fault-tolerant Dual DB & KeyPool):** 
  - Hỗ trợ bể khóa API (**Gemini KeyPool**) tự động phát hiện mã lỗi `429 Too Many Requests` và xoay vòng key kèm hàng đợi kiểm soát tải (Concurrency Limiter).
  - Hoạt động mượt mà với **PostgreSQL + PGVector**, đồng thời tích hợp cơ chế **Local Dual-Mode Fallback** (`local_db.json`) giúp website luôn khả dụng ngay cả khi cơ sở dữ liệu quan hệ bảo trì.

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG (TECH STACK)

| Thành phần | Công nghệ chính | Phiên bản / Chi tiết |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router), React, TailwindCSS, Zustand | Next.js 16, React 19, TailwindCSS 4, Lucide Icons |
| **Backend API** | Node.js, Express.js, TypeScript | Express 4.21, TypeScript 5.8, tsx runtime |
| **AI Engine & Framework** | `@google/generative-ai`, LangChain.js | Gemini 3.8 Flash / 3.5 Flash, `gemini-embedding-001` |
| **Vector DB & RAG** | PostgreSQL + PGVector / In-Memory Vector Search | HNSW Index Cosine Similarity + File Embeddings Cache |
| **Cơ sở dữ liệu** | PostgreSQL 16 + Local JSON Fallback Store | Pool connection có kiểm soát tải, auto schema migration |
| **Xác thực & Bảo mật** | JWT (JSON Web Token), bcryptjs, Helmet, CORS | Role-based (Khách hàng / Quản trị viên Admin) |
| **Đóng gói & Chạy ngầm** | Docker, Docker Compose | `pgvector/pgvector:pg16` |

---

## 🚀 TÍNH NĂNG HỆ THỐNG HIỆN TẠI

### 1. Phân hệ Cửa hàng (Storefront)
- [x] **Duyệt danh mục & Thương hiệu:** Xem theo danh mục sản phẩm (Laptop, Smartphone, Phụ kiện) và theo thương hiệu nổi tiếng (Apple, Asus, Dell, Lenovo, Samsung, Sony...).
- [x] **Bộ lọc thông số kỹ thuật đa năng:** Lọc theo phân loại, thương hiệu, tầm giá, sắp xếp theo giá tăng/giảm hoặc mới nhất.
- [x] **Trang chi tiết & Xem nhanh (Quick View):** Bảng thông số chi tiết (CPU, RAM, GPU, Màn hình, Ổ cứng, Pin...), hình ảnh trực quan, chính sách bảo hành.
- [x] **Quản lý giỏ hàng:** Lưu trữ an toàn trên máy khách với Zustand LocalStorage, thao tác tăng/giảm số lượng và áp dụng giỏ tức thời.
- [x] **Hệ thống Đặt hàng (Checkout):** Hỗ trợ thanh toán khi nhận hàng (COD) hoặc quét mã QR chuyển khoản, hỗ trợ cả khách vãng lai và người dùng đăng nhập.
- [x] **Đăng ký / Đăng nhập & Trang cá nhân:** Quản lý thông tin cá nhân và lịch sử tất cả đơn hàng đã mua.
- [x] **Tra cứu đơn hàng (Order Tracking Modal):** Tra cứu lộ trình vận chuyển bằng `Mã đơn` + `Số điện thoại`.
- [x] **Đánh giá sản phẩm đã mua:** Modal đánh giá sao (1 - 5★) và nhận xét, tích hợp trực tiếp kiểm tra tính hợp lệ từ đơn hàng `delivered`.

### 2. Phân hệ Trợ lý ảo AI (BK-Bot)
- [x] **Floating Chat Widget:** Cửa sổ chat nổi góc dưới màn hình, hỗ trợ thu phóng, âm thanh thông báo và gợi ý nhanh (Quick Prompts).
- [x] **Phản hồi thời gian thực (SSE Streaming):** Truyền dòng text mượt mà qua Server-Sent Events với độ trễ phản hồi ban đầu cực thấp.
- [x] **Rich Interactive UI Cards:** Trực tiếp kết xuất Card sản phẩm tương tác (hình ảnh, giá, nút "Xem chi tiết", "Thêm vào giỏ") trong giao diện chat.
- [x] **Cơ chế RAG 8 tài liệu:** Nạp sẵn các tài liệu markdown về Bảo hành, Đổi trả, Vận chuyển, Thanh toán/Hóa đơn, Cẩm nang cấu hình, Thông tin doanh nghiệp, Thương hiệu và Hướng dẫn đánh giá.
- [x] **Function / Tool Calling mạnh mẽ:**
  - `checkInventory`: Kiểm tra số lượng tồn kho theo từng chi nhánh cụ thể (Hà Nội, TP.HCM, Đà Nẵng).
  - `trackOrder`: Kiểm tra trạng thái đơn hàng, đơn vị giao vận và lộ trình chi tiết.
  - `filterProducts`: Lọc danh sách máy dựa theo tiêu chí cấu hình hoặc tầm giá.
  - `getProductDetails`: Tra cứu chi tiết cấu hình chuyên sâu của một mã máy.
  - `getProductReviews`: Đọc số sao trung bình và phản hồi thực tế của khách hàng đã mua.
  - `checkReviewEligibility`: Hướng dẫn và kiểm tra quyền gửi đánh giá từ đơn hàng thực tế.
- [x] **Cơ chế chịu lỗi nâng cao:** KeyPool quay vòng API key khi bị rate limit (429), Fallback candidate models (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.8-flash`).

### 3. Phân hệ Quản trị (Admin Dashboard)
- [x] **Bảng điều khiển tổng quan:** Thống kê doanh thu, số lượng đơn hàng, số mặt hàng và tổng kho.
- [x] **Quản lý sản phẩm (`/admin/products`):** Thêm mới sản phẩm kèm thông số kỹ thuật (specs JSON), chỉnh sửa giá, kho và cập nhật ảnh qua API upload.
- [x] **Quản lý đơn hàng (`/admin/orders`):** Cập nhật trạng thái đơn (`pending` ➔ `confirmed` ➔ `shipping` ➔ `delivered` ➔ `cancelled`), theo dõi phương thức và thông tin nhận hàng.
- [x] **Quản lý tồn kho (`/admin/inventory`):** Quản lý tồn kho chi tiết của từng máy theo các chi nhánh trên cả nước.
- [x] **Quản lý tri thức RAG (`/admin/knowledge`):** Xem danh sách tài liệu tri thức, theo dõi số lượng chunks, nội dung tóm tắt và kích hoạt vector hóa lại thủ công.

---

## 📂 CẤU TRÚC THƯ MỤC DỰ ÁN

```bash
BKStore_ChatbotAI/
├── backend/                       # Node.js + Express Backend Server
│   ├── data/                      # Lưu trữ dữ liệu dự phòng (local_db.json)
│   ├── src/
│   │   ├── config/                # Cấu hình Database Pool & Gemini KeyPool Manager
│   │   ├── controllers/           # Controllers xử lý nghiệp vụ HTTP
│   │   ├── data/knowledge/        # 8 tài liệu RAG tri thức dạng Markdown & Embeddings Cache
│   │   ├── db/                    # Schema PostgreSQL, scripts migrate, seed & local store
│   │   ├── middlewares/           # Middleware xác thực JWT, RBAC & Zod Schema Validation
│   │   ├── routes/                # Khai báo các API Endpoints
│   │   ├── schemas/               # Zod validation schemas
│   │   ├── services/              # Logic cốt lõi: AI Tools, Chat, RAG, Product, Order, Review...
│   │   ├── app.ts                 # Cấu hình Express app, middlewares, cors
│   │   └── server.ts              # Khởi động HTTP Server và warmup RAG service
│   ├── .env.example               # Mẫu biến môi trường Backend
│   └── package.json
├── frontend/                      # Next.js 16 App Router Client
│   ├── src/
│   │   ├── app/                   # App Router: Storefront, Admin routes, API routes
│   │   ├── components/            # Giao diện tái sử dụng: ChatWidget, Header, Modals, ProductCard...
│   │   ├── lib/                   # API Client, fetch wrappers, utility helpers
│   │   ├── store/                 # Quản lý trạng thái Zustand (Cart, Chat, Auth)
│   │   └── types/                 # TypeScript interfaces và types
│   └── package.json
├── docker/                        # Cấu hình Docker Database (PostgreSQL + pgvector init)
├── docs/                          # Tài liệu kỹ thuật chi tiết
│   ├── PROJECT_PROPOSAL.md        # Đề cương chi tiết đồ án
│   └── REQUIREMENTS.md            # Tài liệu đặc tả yêu cầu phần mềm (SRS)
├── docker-compose.yml             # Cấu hình Docker Compose cho PostgreSQL PGVector
└── package.json                   # Root package quản lý lệnh chạy đồng thời cả hệ thống
```

---

## ⚡ HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### Yêu cầu tiên quyết
- **Node.js**: Phiên bản 20.x trở lên
- **Docker & Docker Compose**: Để chạy PostgreSQL + PGVector (hoặc bạn có thể dùng PostgreSQL local)
- **Google Gemini API Key**: Lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/)

---

### Bước 1: Khởi động Cơ sở dữ liệu Docker (PostgreSQL 16 + PGVector)

Tại thư mục gốc của dự án, mở terminal và chạy:

```bash
npm run db:up
```

> Thao tác này sẽ khởi chạy container `bkstore-postgres` trên cổng `5432` với user `postgres` và database `bkstore`.

---

### Bước 2: Cài đặt Dependencies cho toàn bộ dự án

```bash
# Cài đặt root dependencies
npm install

# Cài đặt Backend dependencies
cd backend
npm install

# Cài đặt Frontend dependencies
cd ../frontend
npm install

# Quay trở lại thư mục gốc
cd ..
```

---

### Bước 3: Cấu hình biến môi trường Backend

Tạo file `backend/.env` từ file mẫu `backend/.env.example`:

```env
# Cấu hình máy chủ
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Cấu hình PostgreSQL Database
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/bkstore

# Google Gemini API Keys (Khuyên dùng cung cấp 2-3 keys để kích hoạt tự động xoay vòng)
GEMINI_API_KEY=AIzaSy...your_primary_key
GEMINI_API_KEY_BACKUP=AIzaSy...your_backup_key_1
GEMINI_API_KEY_BACKUP_2=AIzaSy...your_backup_key_2

# Khóa bí mật JWT cho đăng nhập & xác thực
JWT_SECRET=bkstore_super_secret_jwt_key_2026
```

---

### Bước 4: Khởi tạo bảng và nạp dữ liệu mẫu (Database Setup)

Tại thư mục gốc, chạy lệnh tạo bảng và nạp dữ liệu mẫu ban đầu (sản phẩm, chi nhánh, kho, tài khoản admin, đơn hàng mẫu):

```bash
npm run db:setup
```

*(Hoặc chạy trực tiếp trong thư mục backend: `npm run db:setup`)*.

---

### Bước 5: Chạy dự án đồng thời (Backend + Frontend)

Tại thư mục gốc, chỉ cần thực thi một lệnh duy nhất:

```bash
npm run dev
```

* **Frontend Client:** [http://localhost:3000](http://localhost:3000)
* **Backend API Server:** [http://localhost:5000](http://localhost:5000)
* **API Healthcheck:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 TÀI KHOẢN MẪU KIỂM THỬ HỆ THỐNG

| Vai trò | Email | Mật khẩu | Chức năng truy cập |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@bkstore.vn` | `admin123` | Toàn quyền trang `/admin` (Sản phẩm, Đơn hàng, Tồn kho, Tri thức RAG) |
| **Khách hàng thân thiết** | `customer@bkstore.vn` | `customer123` | Đăng nhập tài khoản, xem lịch sử đơn hàng, gửi đánh giá sản phẩm |
| **Khách vãng lai** | Không cần đăng nhập | — | Mua hàng COD/QR, tra cứu đơn hàng bằng Mã + SĐT, Chat với AI Bot |

### Thông tin đơn hàng mẫu để kiểm thử AI Tool & Đánh giá:
* **Mã đơn hàng mẫu:** `#BK-1024` (Khách hàng: Nguyễn Văn An - SĐT: `0987654321` - Trạng thái: `delivered` ➔ **Đã đủ điều kiện gửi đánh giá**).
* **Mã đơn hàng đang giao:** `#BK-1025` (Khách hàng: Trần Thị Bình - SĐT: `0912345678` - Trạng thái: `shipping`).

---

## 📚 TÀI LIỆU DỰ ÁN LIÊN QUAN

* [Tài liệu đề xuất đề tài (PROJECT_PROPOSAL.md)](file:///c:/Users/icomh/Desktop/BKStore_ChatbotAI/docs/PROJECT_PROPOSAL.md)
* [Tài liệu đặc tả yêu cầu phần mềm SRS (REQUIREMENTS.md)](file:///c:/Users/icomh/Desktop/BKStore_ChatbotAI/docs/REQUIREMENTS.md)
* [Tài liệu cơ sở tri thức RAG (backend/src/data/knowledge/README.md)](file:///c:/Users/icomh/Desktop/BKStore_ChatbotAI/backend/src/data/knowledge/README.md)

---
*© 2026 BK-Store Team. Đồ án liên ngành Công nghệ Thông tin.*
