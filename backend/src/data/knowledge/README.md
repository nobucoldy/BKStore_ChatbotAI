# THƯ MỤC CƠ SỞ TRI THỨC BK-STORE (RAG KNOWLEDGE BASE)

Thư mục này chứa toàn bộ các văn bản chính sách, hướng dẫn kỹ thuật, thông tin doanh nghiệp và hướng dẫn nghiệp vụ của hệ sinh thái **BK-Store**. Các tài liệu này được hệ thống AI tự động phân đoạn (Chunking) và tính toán vector hóa (Embedding với model `gemini-embedding-001` / HNSW Vector Index Cosine Similarity) để cung cấp tri thức chính xác, loại bỏ hoàn toàn hiện tượng ảo giác thông tin cho **Trợ lý Trí tuệ Nhân tạo BK-Bot**.

---

## 📁 Danh mục 8 tài liệu tri thức chuẩn của hệ thống:

1. **`01_chinh_sach_bao_hanh.md`**:
   - Thời hạn bảo hành 12 - 24 tháng chính hãng cho Laptop, Smartphone, Phụ kiện.
   - Đặc quyền "1 Đổi 1 trong 30 ngày đầu tiên" nếu phát sinh lỗi phần cứng từ nhà sản xuất.
   - Tiêu chuẩn điểm chết màn hình (từ 3 điểm sáng hoặc 5 điểm chết thường) và dung lượng pin chai dưới 80%.
   - Quy định trường hợp từ chối bảo hành (vào nước, rơi vỡ cấn móp, can thiệp linh kiện trái phép).

2. **`02_chinh_sach_doi_tra_hoan_tien.md`**:
   - Quy trình đổi mới máy 100% nguyên hộp miễn phí trong 30 ngày đầu.
   - Quy định đổi trả theo nhu cầu cá nhân/đổi ý trong vòng 14 ngày (phí dịch vụ thu hồi 10%).
   - Thời gian hoàn trả tiền mặt hoặc chuyển khoản ngân hàng (24h - 48h).

3. **`03_chinh_sach_van_chuyen_giao_hang.md`**:
   - Miễn phí vận chuyển toàn quốc cho đơn hàng từ 1.000.000₫ (dưới 1 triệu đồng giá 30.000₫).
   - Dịch vụ giao hàng siêu tốc trong 02 giờ tại nội thành Hà Nội, TP.HCM, Đà Nẵng.
   - Quyền lợi mở hộp kiểm tra ngoại quan cùng nhân viên giao hàng (đồng kiểm) trước khi thanh toán.

4. **`04_huong_dan_thanh_toan_hoa_don.md`**:
   - Thanh toán tiền mặt khi nhận hàng (COD).
   - Thanh toán quét mã QR chuẩn VietQR tự động qua 40+ ngân hàng thương mại Việt Nam.
   - Hướng dẫn xuất hóa đơn giá trị gia tăng điện tử (VAT) cho cơ quan, doanh nghiệp.

5. **`05_cam_nang_tu_van_cau_hinh.md`**:
   - Hướng dẫn chi tiết chọn cấu hình Laptop theo ngành nghề:
     - Sinh viên kinh tế / Văn phòng: mỏng nhẹ, pin trâu, CPU Core i5 / Ryzen 5, RAM 16GB.
     - Lập trình viên / AI & Data Science: RAM tối thiểu 16GB-32GB, chip Intel Core Ultra / AMD Ryzen 8000, GPU Nvidia RTX hỗ trợ CUDA.
     - Thiết kế đồ họa & Gaming: Màn hình chuẩn màu 100% sRGB / DCI-P3, GPU RTX 4050 trở lên, tần số quét cao.
   - Tư vấn Smartphone: Hệ sinh thái Apple iOS vs Android Flagship (Galaxy AI & camera Leica).

6. **`06_thong_tin_doanh_nghiep_bkstore.md`**:
   - Tên thương hiệu: Hệ thống Bán lẻ Thiết bị Công nghệ BK-Store.
   - Tổng đài hỗ trợ & Hotline miễn cước: `1800 6868`.
   - Danh sách 3 chi nhánh trung tâm:
     - **Chi nhánh Hà Nội:** Số 1 Đại Cồ Việt, P. Bách Khoa, Q. Hai Bà Trưng.
     - **Chi nhánh TP. Hồ Chí Minh:** 268 Lý Thường Kiệt, P. 14, Quận 10.
     - **Chi nhánh Đà Nẵng:** 54 Nguyễn Lương Bằng, P. Hòa Khánh Bắc, Q. Liên Chiểu.
   - Cam kết 100% hàng chính hãng, hỗ trợ kỹ thuật và vệ sinh máy trọn đời.

7. **`07_thong_tin_thuong_hieu_chinh_hang.md`**:
   - Hồ sơ các thương hiệu công nghệ đối tác: Apple, Asus, Dell, Lenovo, Samsung, Sony...
   - Thế mạnh công nghệ cốt lõi và chính sách bảo hành chính hãng của các thương hiệu đối tác.

8. **`08_chinh_sach_va_huong_dan_danh_gia.md`**:
   - Quy định về tính khách quan và minh bạch của hệ thống đánh giá sản phẩm tại BK-Store.
   - **Điều kiện cốt lõi:** Chỉ các đơn hàng đã được giao hàng thành công (trạng thái `delivered`) mới đủ điều kiện gửi đánh giá (chấm điểm từ 1 đến 5 sao và viết nhận xét trải nghiệm).
   - Quy trình hướng dẫn khách hàng gửi đánh giá: Nhập Mã đơn hàng (`#BK-XXXX`) và Số điện thoại đặt hàng trên giao diện web hoặc thông qua trợ lý ảo BK-Bot.

---

## ⚡ Cơ chế Tối ưu hóa Vector Embedding & Caching:
- File `.embeddings_cache.json` lưu giữ trước các vector nhúng ngữ nghĩa của toàn bộ các đoạn văn bản (chunks) giúp hệ thống Backend khởi động tức thì mà không cần gọi lại Google Gemini Embedding API, tiết kiệm tối đa quota và đảm bảo tốc độ phản hồi cực nhanh.
- Tại giao diện Quản trị (`/admin/knowledge`), Admin có thể kích hoạt tính năng tái nạp vector hóa (Re-vectorize) khi cập nhật thêm hoặc sửa đổi nội dung các file tài liệu.
