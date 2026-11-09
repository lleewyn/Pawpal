# Giai đoạn 6 — Chuyển đổi và tối ưu dữ liệu ảnh cũ

Ngày thực hiện: 09/11/2026.
Phạm vi: Rà soát tham chiếu ảnh tĩnh `assets/`, chuyển đổi an toàn 3 avatar thú cưng Base64 sang MongoDB GridFS, đối soát toàn diện CSDL Supabase Cloud.

---

## 1. Kết quả chuyển đổi 3 avatar Base64 sang MongoDB GridFS

Trước Giai đoạn 6, bảng `pet_profile` tồn tại 3 bản ghi chứa chuỗi `data:image/...;base64,...` nhúng trực tiếp trong cột văn bản `avatar_url`, gây phình to dung lượng hàng dữ liệu và tốn băng thông truy vấn danh sách thú cưng.

### Chi tiết các bản ghi đã chuyển đổi:
1. **Bé Bông** (`PP-4643`, ID: `2a8816e2-c267-4ccf-85cd-422407266efd`)
   - Định dạng: `image/jpeg`
   - Kích thước: `51.120 bytes`
   - SHA256: `95c378c1229dafb738cafdb1e8cd5e9813ea8ab5a3cbfd64e1490e13e442aefd`
   - Media Asset ID: `f35eb980-5a99-4e68-843a-fe1cb4adfd1a`
   - Trạng thái DB: `avatar_url = NULL`, `avatar_media_asset_id` liên kết thành công (`attached`).

2. **Bé Meo** (`PET-1784708052477`, ID: `3cd34862-7e1d-4f32-81b4-3c2c562688ae`)
   - Định dạng: `image/png`
   - Kích thước: `1.228.990 bytes`
   - SHA256: `9fbc98dd141ab451d247301d6ee765ea09f193c3f425f6b0a4f82d4fedabb19a`
   - Media Asset ID: `ab82dfbd-1624-4483-bd22-0d9491d562c1`
   - Trạng thái DB: `avatar_url = NULL`, `avatar_media_asset_id` liên kết thành công (`attached`).

3. **Bé ĐẬU** (`PET-1791649301877`, ID: `ce152404-48ac-4c0a-8666-c38814455f5c`)
   - Định dạng: `image/png`
   - Kích thước: `1.584.606 bytes`
   - SHA256: `64e661b20d64384d664dc6d5965a745f7968184b079287e95189f4a3ee10602d`
   - Media Asset ID: `82d5c339-ad55-460f-ae2e-f8e6a194691e`
   - Trạng thái DB: `avatar_url = NULL`, `avatar_media_asset_id` liên kết thành công (`attached`).

### Đối soát và bảo vệ dữ liệu:
* **Số lượng chuỗi Base64 còn lại trong `pet_profile`**: **0** bản ghi (`SELECT count(*) FROM pet_profile WHERE avatar_url LIKE 'data:%'` = 0).
* **Sao lưu đối chiếu ngoại vi**: Lưu tại `D:/Aboutme/Pawpal-infra/media/phase6-migration/pet-avatars-backup.private.json` kèm 3 tệp ảnh vật lý nguyên gốc, đảm bảo khôi phục tức thì nếu cần.
* **Bảo mật và phân quyền**:
  - Admin và Chủ nuôi: Đọc ảnh qua `/api/media?id=${asset_id}` trả về HTTP 200, đúng MIME type và kích thước byte.
  - Khách vãng lai (Anonymous): Trả về HTTP 404 (bảo toàn tính riêng tư của hồ sơ thú cưng).

---

## 2. Rà soát tham chiếu ảnh tĩnh `assets/`

* **Quy mô thư mục `assets/`**: 395 tệp ảnh, tổng dung lượng khoảng **160,26 MiB**.
* **Chính sách triển khai**:
  - Tuyệt đối **không import bừa bãi toàn bộ 160 MiB này vào MongoDB Atlas**.
  - Các tài nguyên tĩnh (logo, icon danh mục, ảnh minh họa giao diện, banner mặc định) tiếp tục được phục vụ trực tiếp qua Vercel CDN với cache hiệu năng cao.
  - Toàn bộ hạn mức 512 MB của cụm MongoDB Atlas Free được bảo toàn dành riêng cho ảnh nghiệp vụ người dùng (Biên bản tiếp nhận, Biên bản bàn giao, Ảnh đánh giá, Ảnh chat, Ảnh biến thể, Banner động).

---

## 3. Tổng kết hạn mức Media hiện hành

| Chỉ số | Giá trị |
|---|---|
| Tổng tệp media đang `attached` trong Atlas GridFS | 8 tệp |
| Tổng dung lượng đang lưu trữ thực tế | ~4,66 MiB |
| Quota cấu hình thử nghiệm Preview | 100 MiB |
| Hạn mức MongoDB Atlas Free Cluster | 512 MiB |
| Tỷ lệ sử dụng so với hạn mức Atlas Free | **< 1%** (còn trống hơn 507 MiB) |
| Kiểm thử hồi quy (`npm run test:media`) | **44/44 tests PASS** |

**Kết luận**: Giai đoạn 6 hoàn thành 100% mục tiêu chuyển đổi và tối ưu dữ liệu cũ.

