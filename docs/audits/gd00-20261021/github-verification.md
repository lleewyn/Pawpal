# Xác minh dependency trên GitHub

- Repo từ `git remote -v`: `lleewyn/Pawpal`.
- Công cụ: GitHub `fetch_file`, đọc tại commit `37c274561460ff5351dafd175636cfc79697f6b0`.
- File: [scripts/shared/address-validation.mjs](https://github.com/lleewyn/Pawpal/blob/37c274561460ff5351dafd175636cfc79697f6b0/scripts/shared/address-validation.mjs).
- Kết quả connector: có nội dung file, encoding utf-8, không có lỗi.
- Git blob SHA trả về: `31b57051c91162733c09d86d43bb23cc5e110279`.
- `git hash-object scripts/shared/address-validation.mjs` tại workspace trả cùng blob SHA, exit 0.
- Kết luận: dependency tồn tại trên GitHub tại đúng commit audit và khớp bản local. Đây là xác minh repository; chưa xác minh artifact production, cấu hình deploy hoặc runtime import trong browser.
