const fs = require('fs');
const path = require('path');

function replaceAll(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [search, replace] of replacements) {
        if (typeof search === 'string') {
            content = content.split(search).join(replace);
        } else {
            content = content.replace(search, replace);
        }
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated', filePath);
    }
}

replaceAll('pages/user/orders/orders.js', [
    ['Xem danh gia don hang', 'Xem đánh giá đơn hàng'],
    ['Xem danh gia<', 'Xem đánh giá<'],
    ['Danh gia don hang', 'Đánh giá đơn hàng'],
    ['>Danh gia<', '>Đánh giá<'],
    ['Mua lai', 'Mua lại'],
    [/va (\S+) sản phẩm khac/g, 'và $1 sản phẩm khác']
]);

replaceAll('pages/user/dashboard/dashboard.js', [
    ['Doi mat khau voi thanh do do manh', 'Đổi mật khẩu với thanh đo độ mạnh'],
    ["'Thanh cong'", "'Thành công'"],
    ["'Dia chi da luu'", "'Địa chỉ đã lưu'"],
    ["'Dia chi mac dinh'", "'Địa chỉ mặc định'"],
    ['`Dia chi ${', '`Địa chỉ ${'],
    ["'Da cap nhat dia chi thanh cong!'", "'Đã cập nhật địa chỉ thành công!'"],
    ["'Cho xac nhan'", "'Chờ xác nhận'"],
    ["'Nu'", "'Nữ'"],
    ["'Khac'", "'Khác'"]
]);

replaceAll('pages/user/bookings/bookings.js', [
    ['Nhan de xem chi tiet', 'Nhấn để xem chi tiết'],
    ['Xem chi tiet lich hen', 'Xem chi tiết lịch hẹn']
]);
