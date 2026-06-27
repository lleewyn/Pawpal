const fs = require('fs');

function replaceAll(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of Object.entries(replacements)) {
        content = content.split(search).join(replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
}

replaceAll('data/returns.json', {
    'San pham cat ve sinh bi rach bao bi va am khi mo hop, nho shop kiem tra va doi san pham moi.': 'Sản phẩm cát vệ sinh bị rách bao bì và ẩm khi mở hộp, nhờ shop kiểm tra và đổi sản phẩm mới.',
    'Cat ve sinh cho meo Catsan 10L': 'Cát vệ sinh cho mèo Catsan 10L',
    'Khach bao nhan sai mau do choi, dang cho bo phan CSKH kiem tra hinh anh doi chieu.': 'Khách báo nhận sai màu đồ chơi, đang chờ bộ phận CSKH kiểm tra hình ảnh đối chiếu.'
});

replaceAll('data/support-tickets.json', {
    'Duoc a! PawPal vua doi lich Bong tu thu 5 sang thu 6 luc 14:00 roi. Ban kiem tra email xac nhan nhe a!': 'Được ạ! PawPal vừa đổi lịch Bông từ thứ 5 sang thứ 6 lúc 14:00 rồi. Bạn kiểm tra email xác nhận nhé ạ!',
    'Xin loi ban! Chung toi dang kiem tra van de ky thuat nay. Ban thu dang xuat roi dang nhap lai xem nhe.': 'Xin lỗi bạn! Chúng tôi đang kiểm tra vấn đề kỹ thuật này. Bạn thử đăng xuất rồi đăng nhập lại xem nhé.',
    'Can ho tro OTP nhan lich cho khach vang lai': 'Cần hỗ trợ OTP nhận lịch cho khách vãng lai'
});
