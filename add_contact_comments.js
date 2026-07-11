const fs = require('fs');
let js = fs.readFileSync('pages/public/contact/contact.js', 'utf8');

js = js.replace('function getValue(id) {', '// Lấy giá trị từ input theo ID\nfunction getValue(id) {');
js = js.replace('function showFeedback(type, message) {', '// Hiển thị thông báo (toast) phản hồi\nfunction showFeedback(type, message) {');
js = js.replace('function buildTicketPayload() {', '// Thu thập dữ liệu từ form liên hệ\nfunction buildTicketPayload() {');
js = js.replace('function validatePayload(payload) {', '// Kiểm tra tính hợp lệ của dữ liệu form\nfunction validatePayload(payload) {');
js = js.replace('async function saveContactTicket(payload) {', '// Lưu thông tin liên hệ thành một ticket hỗ trợ\nasync function saveContactTicket(payload) {');
js = js.replace('async function handleSubmit(event) {', '// Xử lý sự kiện gửi form liên hệ\nasync function handleSubmit(event) {');
js = js.replace("if (document.readyState === 'loading') {", "// Chạy hàm khởi tạo khi DOM tải xong\nif (document.readyState === 'loading') {");

fs.writeFileSync('pages/public/contact/contact.js', js, 'utf8');
