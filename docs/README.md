# Tài liệu PawPal

## Đang sử dụng

| Nội dung | Tài liệu |
| --- | --- |
| Trạng thái triển khai và kiểm tra liên thông | [Nghiệm thu tổng hợp](acceptance/PAWPAL_DICH_VU_V1_NGHIEM_THU.md) |
| Thiết kế CSDL chuẩn 3NF | [Thiết kế V1](database/PAWPAL_THIET_KE_DATABASE_3NF_V1.md) |
| Cấu trúc Cloud đang triển khai | [Danh sách bảng và thuộc tính](database/PAWPAL_CSDL_CLOUD_MOI_HIEN_TAI_DANG_BANG.md) |
| Đặc tả CSDL | [Đặc tả vật lý](database/PAWPAL_DATABASE_V1_DAC_TA_VAT_LY.md) |
| Nghiệp vụ | [Hướng dẫn luồng nghiệp vụ](business/HUONG_DAN_LUONG_NGHIEP_VU_PAWPAL.md) |
| Trang chủ V2.18 | [Phạm vi và kết quả kiểm tra](acceptance/PAWPAL_TRANG_CHU_V218_NGHIEM_THU.md) |

## Thư mục

Các tài liệu phát triển còn dùng đã được đưa ra khỏi `pages/`:

- [Quy chuẩn thiết kế Admin](design/ADMIN_DESIGN_SYSTEM.md)
- [Kiến trúc cache và rollback](architecture/PAWPAL_ADMIN_PERF_ARCHITECTURE_AND_ROLLBACK_GUIDE.md)
- [Kịch bản chatbot thủ công](testing/PAWPAL_AI_CHECKLIST_KICH_BAN_KIEM_THU_CHATBOT.md)
- [Lưu ý về test runner cũ](testing/PAWPAL_QA_AUDIT_5_TEST_RUNNER_HUONG_DAN_SUA.md)
- [Ma trận control UI được sinh từ mã](testing/generated/PAWPAL_GD1_MA_TRAN_TRUONG_UI.md)

- [acceptance](acceptance/): nghiệm thu từng phân hệ và kết quả kiểm tra đã thực hiện.
- [database](database/): thiết kế, đặc tả và bản mô tả schema hiện tại.
- [testing](testing/): kế hoạch, checklist và tiến độ kiểm thử; các bản ghi cũ không thay thế kết quả nghiệm thu mới nhất.
- [chatbot](chatbot/): tài liệu chuyên đề chatbot.
- [business](business/): mô tả luồng nghiệp vụ.
- [maintenance](maintenance/): các đợt bảo trì và dọn repo.
- [archive](archive/): kế hoạch đã hoàn tất, thiết kế cũ, self-host, chuyển Cloud và đề xuất đã hoãn. Chỉ để tham khảo lịch sử, không phải hướng dẫn vận hành hiện tại.

Việc gom tài liệu chỉ đổi vị trí file và liên kết; không xóa hoặc thay đổi dữ liệu Supabase Cloud/local.
