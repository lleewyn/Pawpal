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

// 1. data/care-logs.json
replaceInFile('data/care-logs.json', [
    ['Nhan vien kiem tra tai, mong, da bung va long truoc khi bat dau dich vu.', 'Nhân viên kiểm tra tai, móng, da bụng và lông trước khi bắt đầu dịch vụ.'],
    ['Kiem tra can nang 8.5kg va tinh trang da long truoc dich vu.', 'Kiểm tra cân nặng 8.5kg và tình trạng da lông trước dịch vụ.']
]);

// 2. data/returns.json
replaceInFile('data/returns.json', [
    ['San pham cat ve sinh bi rach bao bi va am khi mo hop, nho shop kiem tra va doi san pham khac', 'Sản phẩm cát vệ sinh bị rách bao bì và ẩm khi mở hộp, nhờ shop kiểm tra và đổi sản phẩm khác']
]);

// 3. data/support-tickets.json
replaceInFile('data/support-tickets.json', [
    ['Loi tru tien Momo nhung don hang bao that bai', 'Lỗi trừ tiền Momo nhưng đơn hàng báo thất bại'],
    ['Toi da thanh toan Momo thanh cong va bi tru 250k nhung he thong van bao don hang chua duoc thanh toan.', 'Tôi đã thanh toán Momo thành công và bị trừ 250k nhưng hệ thống vẫn báo đơn hàng chưa được thanh toán.'],
    ['PawPal xin loi ban vi su co nay a. Chung toi da chuyen thong tin giao dich sang bo phan ky thuat.', 'PawPal xin lỗi bạn vì sự cố này ạ. Chúng tôi đã chuyển thông tin giao dịch sang bộ phận kỹ thuật.'],
    ['Dich vu cuc tuyet voi, giai quyet nhanh!', 'Dịch vụ cực tuyệt vời, giải quyết nhanh!'],
    ['San pham thu cung bi hong khi nhan hang', 'Sản phẩm thú cưng bị hỏng khi nhận hàng'],
    ['Hoi ve dich vu spa cho cho long dai', 'Hỏi về dịch vụ spa cho chó lông dài'],
    ['Be toi la cho Golden Retriever, long dai. Co dich vu spa chuyen biet nao cho long dai khong?', 'Bé tôi là chó Golden Retriever, lông dài. Có dịch vụ spa chuyên biệt nào cho lông dài không?'],
    ['Dang ky Paw Points bi loi', 'Đăng ký Paw Points bị lỗi'],
    ['Toi muon tham gia chuong trinh Paw Points nhung nut dang ky khong hoat dong. Co van de gi khong?', 'Tôi muốn tham gia chương trình Paw Points nhưng nút đăng ký không hoạt động. Có vấn đề gì không?'],
    ['Xin loi ban! Chung toi dang kiem tra van de ky thuat nay. Ban thu dang xuat roi dang nhap lai xem sao nhe.', 'Xin lỗi bạn! Chúng tôi đang kiểm tra vấn đề kỹ thuật này. Bạn thử đăng xuất rồi đăng nhập lại xem sao nhé.']
]);

// 4. pages/services/service-detail/service-detail.js
replaceInFile('pages/services/service-detail/service-detail.js', [
    ["name: 'Khach hang'", "name: 'Khách hàng'"],
    ["text: 'Dich vu on, giao dien ro rang va trai nghiem on dinh.'", "text: 'Dịch vụ ổn, giao diện rõ ràng và trải nghiệm ổn định.'"]
]);

// 5. pages/shop/shop.js
replaceInFile('pages/shop/shop.js', [
    ["|| 'San pham'", "|| 'Sản phẩm'"],
    ["|| 'San pham'", "|| 'Sản phẩm'"],
    ["Con ${product.stock || 0} san pham trong kho", "Còn ${product.stock || 0} sản phẩm trong kho"]
]);

// 6. pages/user/dashboard/dashboard.js
replaceInFile('pages/user/dashboard/dashboard.js', [
    ["Vui long nhap day du dia chi chi tiet, quan/huyen va thanh pho/tinh.", "Vui lòng nhập đầy đủ địa chỉ chi tiết, quận/huyện và thành phố/tỉnh."],
    ["|| 'Dich vu cham soc'", "|| 'Dịch vụ chăm sóc'"],
    [": 'San pham mua sam'", ": 'Sản phẩm mua sắm'"]
]);

// 7. pages/user/dashboard-init.js
replaceInFile('pages/user/dashboard-init.js', [
    ["Vui long dang nhap de truy cap trang nay", "Vui lòng đăng nhập để truy cập trang này"]
]);

// 8. pages/user/orders/orders.js
replaceInFile('pages/user/orders/orders.js', [
    ["Don hang ${orderId} da duoc huy thanh cong.", "Đơn hàng ${orderId} đã được hủy thành công."],
    ["Da them cac sản phẩm cua don hang ${orderId} vao gio hang.", "Đã thêm các sản phẩm của đơn hàng ${orderId} vào giỏ hàng."]
]);
