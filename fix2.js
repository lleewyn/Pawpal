const fs = require('fs');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated', filePath);
    }
}

replaceInFile('pages/user/orders/orders.js', [
    ['Xem danh gia don hang', 'Xem đánh giá đơn hàng'],
    ['Xem danh gia<', 'Xem đánh giá<'],
    ['Danh gia don hang', 'Đánh giá đơn hàng'],
    ['>Danh gia<', '>Đánh giá<']
]);

replaceInFile('pages/user/dashboard/dashboard.js', [
    ['Doi mat khau voi thanh do do manh', 'Đổi mật khẩu với thanh đo độ mạnh'],
    ["'Thanh cong'", "'Thành công'"],
    ["'Dia chi da luu'", "'Địa chỉ đã lưu'"],
    ["'Dia chi mac dinh'", "'Địa chỉ mặc định'"],
    ['`Dia chi ${', '`Địa chỉ ${'],
    ["'Da cap nhat dia chi thanh cong!'", "'Đã cập nhật địa chỉ thành công!'"],
    ["'Cho xac nhan'", "'Chờ xác nhận'"]
]);

replaceInFile('pages/user/bookings/bookings.js', [
    ['Nhan de xem chi tiet', 'Nhấn để xem chi tiết'],
    ['Xem chi tiet lich hen', 'Xem chi tiết lịch hẹn']
]);
