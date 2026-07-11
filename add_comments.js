const fs = require('fs');
let js = fs.readFileSync('pages/public/blog-detail/blog-detail.js', 'utf8');

js = js.replace('async function initBlogDetail() {', '// Khởi tạo trang chi tiết bài viết (Blog Detail)\nasync function initBlogDetail() {');
js = js.replace('function formatDate(dateStr) {', '    // Định dạng ngày tháng năm\n    function formatDate(dateStr) {');
js = js.replace('async function loadBlogData() {', '    // Tải dữ liệu bài viết từ URL slug\n    async function loadBlogData() {');
js = js.replace('function setupTOC(contentEl) {', '    // Cài đặt Mục lục (Table of Contents)\n    function setupTOC(contentEl) {');
js = js.replace('function setupShareBtns() {', '    // Cài đặt các nút chia sẻ mạng xã hội\n    function setupShareBtns() {');
js = js.replace("if (document.readyState === 'loading') {", "// Chạy hàm khởi tạo khi trang đã tải xong\nif (document.readyState === 'loading') {");

fs.writeFileSync('pages/public/blog-detail/blog-detail.js', js, 'utf8');
