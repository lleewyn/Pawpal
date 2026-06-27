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

replaceAll('data/support-tickets.json', {
    'PawPal xin loi ban vi su co nay a. Chung toi da chuyen thong tin giao dich sang bo phan ky thuat kiem soat doi chieu dong tien. Ban doi chung toi 5 phut a!': 'PawPal xin lỗi bạn vì sự cố này ạ. Chúng tôi đã chuyển thông tin giao dịch sang bộ phận kỹ thuật kiểm soát đối chiếu dòng tiền. Bạn đợi chúng tôi 5 phút ạ!',
    'Toi muon tham gia chuong trinh Paw Points nhung nut dang ky khong hoat dong. Co van de gi khong a?': 'Tôi muốn tham gia chương trình Paw Points nhưng nút đăng ký không hoạt động. Có vấn đề gì không ạ?'
});

let apiContent = fs.readFileSync('scripts/api/api.js', 'utf8');
apiContent = apiContent.replace(/DATA_VERSION: '2026-06-27-v3-fix-vietnamese'/, "DATA_VERSION: '2026-06-27-v4-fix-vietnamese'");
fs.writeFileSync('scripts/api/api.js', apiContent, 'utf8');
console.log('Bumped DATA_VERSION in api.js');
