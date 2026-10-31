// Vietnamese literals live in this UTF-8 file; no shell-pipe encoding dependency.
const questions=[
 ['A01','Lịch hẹn hôm nay'],['A01','Lịch ngày mai'],['A02','Đơn hàng ORD-QA-NOT-FOUND'],
 ['A03','Khách hàng Nguyễn An'],['A04','Thú cưng Miu'],['A05','Khiếu nại chưa xử lý hôm nay'],
 ['A06','Tóm tắt hội thoại đang mở'],['A07','Sản phẩm sắp hết hàng'],['A08','Sản phẩm Royal Canin'],
 ['A09','Giá tắm bé 7kg'],['A10','Doanh thu tuần này'],['A11','Hướng dẫn hủy lịch'],
 ['A12','Điểm của khách CUS-QA-NOT-FOUND'],['A13','Đơn hủy chưa hoàn'],
 ['A14','Khách này có thú cưng và đơn hàng mới nhất?'],['A15','Lịch trực hôm nay'],
 ['A16','Hotel hôm nay'],['A16','Khách sạn còn phòng không?'],['A17','Việc cần xử lý hôm nay'],
 ['A18','So sánh thực thu hôm nay và hôm qua'],['A19','Đánh giá một sao hôm nay'],['A19','Bài viết bản nháp'],
 ['A19','Hotline cửa hàng']
];
module.exports=questions;
if(require.main===module){const {plan}=require('../api/admin_copilot.js');for(const [group,question]of questions)console.log(JSON.stringify({group,question,...plan(question,new Date('2026-11-01T02:00:00Z'))}));}
