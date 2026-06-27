const fs = require('fs');

const replacements = {
    'Nguyen Thi Mai': 'Nguyễn Thị Mai',
    'Le Hoang An': 'Lê Hoàng An',
    'Tran Van Nam': 'Trần Văn Nam',
    'Pham Bao Chau': 'Phạm Bảo Châu',
    'BS. Hoang Thao': 'BS. Hoàng Thảo',
    'Dang Thu Ha': 'Đặng Thu Hà',
    'Da tam bang sua tam danh cho da nhay cam, tranh vung be co tien su di ung.': 'Đã tắm bằng sữa tắm dành cho da nhạy cảm, tránh vùng bé có tiền sử dị ứng.',
    'Tam say tron goi': 'Tắm sấy trọn gói',
    'Say va chai long': 'Sấy và chải lông',
    'Say long ky phan bung va chan, chai long roi nhe.': 'Sấy lông kỹ phần bụng và chân, chải lông rối nhẹ.',
    'Tam sach': 'Tắm sạch',
    'Tam voi sua tam cho cho long ngan, luu y tranh mat va tai.': 'Tắm với sữa tắm cho chó lông ngắn, lưu ý tránh mắt và tai.',
    'Xit khu mui diu nhe': 'Xịt khử mùi dịu nhẹ',
    'Cat tia long ve sinh': 'Cắt tỉa lông vệ sinh',
    'Da cat tia gon phan long chan, bung va quanh duoi. Be sach se va thoai mai.': 'Đã cắt tỉa gọn phần lông chân, bụng và quanh đuôi. Bé sạch sẽ và thoải mái.',
    'Cat tia va ve sinh tai': 'Cắt tỉa và vệ sinh tai',
    'Cat tia theo form gon gang, ve sinh tai bang dung dich chuyen dung.': 'Cắt tỉa theo form gọn gàng, vệ sinh tai bằng dung dịch chuyên dụng.',
    'Ve sinh tai': 'Vệ sinh tai',
    'Cat mong': 'Cắt móng',
    'Kiem tra lam sang': 'Kiểm tra lâm sàng',
    'Kiem tra rang mieng, tai, mat, da long va can nang.': 'Kiểm tra răng miệng, tai, mắt, da lông và cân nặng.',
    'Kiem tra suc khoe tong quat': 'Kiểm tra sức khỏe tổng quát',
    'Grooming cho meo long ngan': 'Grooming cho mèo lông ngắn',
    'Say long va cham soc mong': 'Sấy lông và chăm sóc móng',
    'Say bang gio am nhe, cat mong va lau sach dem chan.': 'Sấy bằng gió ấm nhẹ, cắt móng và lau sạch đệm chân.',
    'Tam kho va chai long': 'Tắm khô và chải lông',
    'Mimi duoc tam kho va chai long de giam rung long.': 'Mimi được tắm khô và chải lông để giảm rụng lông.',
    'Grooming meo long ngan': 'Grooming mèo lông ngắn',
    'Ve sinh tai va mat': 'Vệ sinh tai và mắt',
    'Da ve sinh tai, lau mat va kiem tra vung long quanh mat. Khong ghi nhan dau hieu bat thuong.': 'Đã vệ sinh tai, lau mắt và kiểm tra vùng lông quanh mắt. Không ghi nhận dấu hiệu bất thường.',
    'Dang ve sinh': 'Đang vệ sinh',
    'Lau sach mat va ve sinh tai nhe nhang, Mimi hop tac tot.': 'Lau sạch mắt và vệ sinh tai nhẹ nhàng, Mimi hợp tác tốt.',
    'Khach san thu cung 1 dem': 'Khách sạn thú cưng 1 đêm',
    'Mimi da duoc ban giao lai cho chu. Be an tot va ngu on dinh trong dem.': 'Mimi đã được bàn giao lại cho chủ. Bé ăn tốt và ngủ ổn định trong đêm.',
    'Cap nhat buoi toi': 'Cập nhật buổi tối',
    'Mimi an het 80% khau phan, da dung khay cat va nghi trong phong yen tinh.': 'Mimi ăn hết 80% khẩu phần, đã dùng khay cát và nghỉ trong phòng yên tĩnh.',
    'Nhan phong': 'Nhận phòng',
    'Mimi duoc dua vao phong meo rieng, co dem nam va khay cat moi.': 'Mimi được đưa vào phòng mèo riêng, có đệm nằm và khay cát mới.',
    'Khach san meo 1 dem': 'Khách sạn mèo 1 đêm',
    'Bua an pate ga': 'Bữa ăn pate gà',
    'Khach san thu cung 3 ngay': 'Khách sạn thú cưng 3 ngày',
    'Dang luu tru': 'Đang lưu trú',
    'Cap nhat buoi trua': 'Cập nhật buổi trưa',
    'Boss an het khau phan, choi 20 phut tai san choi va uong nuoc tot.': 'Boss ăn hết khẩu phần, chơi 20 phút tại sân chơi và uống nước tốt.',
    'Di dao va lam quen phong': 'Đi dạo và làm quen phòng',
    'Boss duoc di dao nhe va lam quen khu luu tru. Be vui ve, nang dong.': 'Boss được đi dạo nhẹ và làm quen khu lưu trú. Bé vui vẻ, năng động.',
    'Tam say cho lon': 'Tắm sấy cho chó lớn',
    'Tam va say long': 'Tắm và sấy lông',
    'Tam bang sua tam khu mui, say long theo tung lop vi long Boss day.': 'Tắm bằng sữa tắm khử mùi, sấy lông theo từng lớp vì lông Boss dày.',
    'Chai long giam rung': 'Chải lông giảm rụng'
};

let content = fs.readFileSync('data/care-logs.json', 'utf8');

for (const [key, value] of Object.entries(replacements)) {
    content = content.split(key).join(value);
}

fs.writeFileSync('data/care-logs.json', content, 'utf8');
console.log('Done!');
