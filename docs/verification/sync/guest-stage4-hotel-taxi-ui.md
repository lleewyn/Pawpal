# Hotel, taxi và nhiều bé qua giao diện/SQL thật

Ngày 27/10/2026, Asia/Bangkok. Tiếp nối spa và shop, kiểm tra hotel/taxi bằng handler và Cloud SQL thật trong rollback, thay phạm vi UI intercept của đợt trước. Không đổi mã nghiệp vụ, schema hoặc dữ liệu đã commit; chưa push/deploy.

## Hotel và hai bé trùng tên

[39 SQL / rollback](guest-hotel-browser-rollback.txt): Playwright trên frontend 4001, guest API chuyển tiếp sang HTTP bridge 4002 dùng RPC đã cài trong transaction rollback. Catalog dịch vụ/giống/phòng đọc công khai thật. Rate limiter bypass trong bridge như các lượt trước.

Tạo hai bé cùng tên, cùng phiên. Sau bé đầu, form bé thứ hai tự dùng lại liên hệ máy chủ, không phải nhập lại. Hai thẻ có hai Pet ID riêng; chọn lại **bé đầu** trước khi tiếp tục. Quote hotel dùng hồ sơ bé đã lưu dù context tối thiểu không trả cân nặng; không bắt nhập lại cân nặng hay đoán giá ở browser.

Chọn phòng bằng popover, nhập kỳ lưu trú 24 giờ và ghi chú chăm sóc thử; quote/create/receipt thật PASS, trạng thái **Chờ xác nhận**. Dịch vụ/phòng được chọn tính theo giờ; giá receipt trong lượt này là 2.400.000 đ cho kỳ đã chọn, không suy ra giá này cho mọi loại phòng hoặc gói theo ngày.

SQL kiểm tra hai pet/một owner, một appointment đúng `pet_id` đã gửi, một `hotel_booking`, không taxi/payment. Ràng buộc trì hoãn chạy trước rollback; còn 0 fixture customer/pet/appointment. Rollback ngay sau khi nhận receipt, không để phòng thử được commit hoặc giữ transaction chờ chụp ảnh.

## Taxi khứ hồi

[33 SQL / rollback](guest-taxi-browser-rollback.txt): phiên/browser và transaction mới, không dùng lại dữ liệu fixture của lượt hotel. Thêm bé 5 kg, chọn taxi khứ hồi trong catalog, nhập hai địa chỉ thử, 5 km mỗi lượt, giờ đi và giờ về.

Quote/create/receipt qua handler/SQL thật PASS. Receipt hiện chờ xác nhận, 280.000 đ theo dữ liệu hiện tại của gói được chọn. SQL kiểm tra đúng Pet ID, một `taxi_trip`, không hotel/payment; ràng buộc trì hoãn PASS, rollback ngay sau receipt, còn 0 fixture. Không tạo chuyến taxi hoặc thu tiền đã commit.

## Bằng chứng và giới hạn

Không intercept/giả lập response quote/create/receipt ở hai lượt này; cả hai không lỗi page JavaScript. Đã xem ảnh `.playwright-mcp/guest-hotel-real-sql.png` và `guest-taxi-real-sql.png`; ảnh ngoài git. Browser context đóng và server thử dừng sau kiểm tra, không thay tiến trình cổng 4000 của người dùng.

Runner bổ sung kiểm tra Pet ID/status từ appointment và số dòng logistics/payment; cờ `--hotel-run`/`--taxi-run` giữ report riêng của các đợt trước. Syntax/whitespace PASS. Bộ Node 83 test của đợt trước không thay mã nghiệp vụ trong lượt này, không chạy lại chỉ để tăng số test.

Không dùng Logs, stress test, gateway, SMS hoặc Storage. Chưa nghiệm thu committed User/Admin/Realtime, cạnh tranh phòng sau commit, cập nhật/hủy lịch guest, sửa contact/pet, mọi lỗi validation hoặc hồi quy member. Các gate tổng thể vẫn mở; checklist V1.17 đánh thêm phần dùng lại dữ liệu đã được phiên cấp quyền.
