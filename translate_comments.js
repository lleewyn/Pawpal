const fs = require('fs');
const path = require('path');

const replacements = [
    ["/* Base FAB item */", "/* Nút FAB cơ bản */"],
    ["/* Tooltip */", "/* Chú thích (Tooltip) */"],
    ["/* Colors */", "/* Màu sắc */"],
    ["/* Messages */", "/* Tin nhắn */"],
    ["/* Suggestions */", "/* Gợi ý */"],
    ["/* Input */", "/* Đầu vào */"],
    ["/* Mobile */", "/* Điện thoại di động */"],
    ["/* Extracted from fab.html */", "/* Trích xuất từ fab.html */"],
    ["// Send message", "// Gửi tin nhắn"],
    ["// Remove suggestions on first user message", "// Xóa gợi ý ở tin nhắn đầu tiên của người dùng"],
    ["/* ignore parse errors on partial chunks */", "/* Bỏ qua lỗi parse khi nhận chunk chưa hoàn chỉnh */"],
    ["/* Footer CTA Banner */", "/* Banner kêu gọi hành động ở Footer */"],
    ["/* Main Footer */", "/* Footer chính */"],
    ["/* Map capsule (in footer) */", "/* Khung bản đồ (trong footer) */"],
    ["/* Extracted from footer.html */", "/* Trích xuất từ footer.html */"],
    ["<!-- Col 1 -->", "<!-- Cột 1 -->"],
    ["<!-- Col 2 -->", "<!-- Cột 2 -->"],
    ["<!-- Col 3 -->", "<!-- Cột 3 -->"],
    ["<!-- Col 4 -->", "<!-- Cột 4 -->"],
    ["<!-- Google Maps Capsule inside Footer -->", "<!-- Bản đồ Google Maps trong Footer -->"],
    ["<!-- Toast Notification Container -->", "<!-- Container chứa thông báo Toast -->"],
    ["// Redirect to register page with phone prefilled", "// Chuyển hướng tới trang đăng ký và điền sẵn SĐT"],
    ["/* Force Bootstrap collapse behavior at custom breakpoint 1250px */", "/* Bắt buộc Bootstrap collapse ở breakpoint 1250px */"],
    ["/* Desktop: nav-menu visible as flex row */", "/* Desktop: menu hiển thị dạng hàng ngang */"],
    ["/* Small fix: ensure header children don't create unexpected stacking issues */", "/* Sửa lỗi nhỏ: đảm bảo các thành phần không bị đè lên nhau */"],
    ["/* Header container — 3-column grid: [logo] [nav] [actions] */", "/* Container header - Lưới 3 cột: [logo] [nav] [hành động] */"],
    ["/* Reset any mobile drawer styles */", "/* Đặt lại các style của menu vuốt (mobile drawer) */"],
    ["/* Smooth caret rotation for dropdown toggles (desktop & mobile) */", "/* Xoay mượt mũi tên cho dropdown (desktop & mobile) */"],
    ["/* Mobile drawer */", "/* Menu vuốt trên Mobile */"],
    ["/* Drawer — hidden by default */", "/* Drawer - ẩn mặc định */"],
    ["/* Ensure drawer sits above the sticky header */", "/* Đảm bảo drawer nằm trên header khi cuộn */"],
    ["/* Mobile Dropdown styles */", "/* Style dropdown trên Mobile */"],
    ["/* Search bar */", "/* Thanh tìm kiếm */"],
    ["/* Mobile Account Submenu Toggle */", "/* Đóng/mở menu con tài khoản trên Mobile */"],
    ["/* Nav links */", "/* Các liên kết điều hướng */"],
    ["/* Hide default Bootstrap dropdown caret everywhere */", "/* Ẩn mũi tên mặc định của Bootstrap */"],
    ["/* Header actions */", "/* Các hành động trên Header */"],
    ["/* Lookup trigger */", "/* Nút tra cứu */"],
    ["/* View transition — header stays fixed */", "/* Hiệu ứng chuyển trang - header cố định */"],
    ["/* ── Responsive header tightening ── */", "/* ── Thu gọn header trên màn hình nhỏ ── */"],
    ["/* Fluid responsiveness for intermediate screens (1250px - 1480px) */", "/* Responsive linh hoạt cho màn hình vừa (1250px - 1480px) */"],
    ["/* Temporary Account Warning */", "/* Cảnh báo Tài khoản Tạm thời */"],
    ["/* Responsive */", "/* Tương thích (Responsive) */"],
    ["/* Injected from JS refactoring */", "/* Được tiêm từ JS refactoring */"],
    ["<!-- Notification Bar -->", "<!-- Thanh thông báo -->"],
    ["<!-- Left: Logo + Search -->", "<!-- Bên trái: Logo + Tìm kiếm -->"],
    ["<!-- Mobile Toggle -->", "<!-- Nút đóng/mở Mobile -->"],
    ["<!-- Mobile only - Common -->", "<!-- Chỉ Mobile - Chung -->"],
    ["<!-- Mobile only - Guest -->", "<!-- Chỉ Mobile - Khách -->"],
    ["<!-- Mobile only - Logged-in User -->", "<!-- Chỉ Mobile - Đã đăng nhập -->"],
    ["<!-- Mobile only - Temporary Account -->", "<!-- Chỉ Mobile - Tài khoản tạm thời -->"],
    ["<!-- Desktop actions — ngoài collapse, ngang hàng với logo -->", "<!-- Hành động Desktop - ngoài collapse, ngang hàng với logo -->"],
    ["<!-- Divider -->", "<!-- Dòng chia cách -->"],
    ["// Attach dropdown toggle handler", "// Gắn sự kiện đóng mở dropdown"],
    ["// Toggle dropdown", "// Đóng/mở dropdown"],
    ["// Close dropdown when clicking outside", "// Đóng dropdown khi click ra ngoài (ngoại trừ dropdown)"],
    ["// Run when header is injected", "// Chạy khi header được chèn vào HTML"],
    ["// Listen for auth state changes", "// Lắng nghe thay đổi trạng thái đăng nhập"],
    ["/* Sidebar */", "/* Thanh bên (Sidebar) */"],
    ["// Auto-detect current page and set active state", "// Tự động nhận diện trang hiện tại và đặt trạng thái active"],
    ["// Check if on dashboard page with specific tab", "// Kiểm tra nếu đang ở trang dashboard với tab cụ thể"],
    ["// Add smooth tab switching for dashboard internal tabs", "// Thêm hiệu ứng chuyển tab mượt mà cho dashboard"],
    ["// Update URL without reload", "// Cập nhật URL mà không cần tải lại trang"],
    ["// Hide all tabs", "// Ẩn tất cả các tab"],
    ["// Show target tab", "// Hiển thị tab mục tiêu"],
    ["// Update active states", "// Cập nhật trạng thái active"],
    ["// Check other pages", "// Kiểm tra các trang khác"]
];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith(".js") || file.endsWith(".html") || file.endsWith(".css")) results.push(file);
        }
    });
    return results;
}

const files = walk("components");
let totalReplacements = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, "utf8");
    let original = content;
    
    replacements.forEach(([search, replace]) => {
        content = content.split(search).join(replace);
    });
    
    if (content !== original) {
        fs.writeFileSync(file, content, "utf8");
        console.log("Updated " + file);
        totalReplacements++;
    }
});

console.log("Done! Updated " + totalReplacements + " files.");
