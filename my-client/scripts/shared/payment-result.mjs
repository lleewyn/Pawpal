export function paymentResult(order){
 const cancelled=order.status==='cancelled',paid=order.paymentStatus==='paid';
 const base={orderLabel:cancelled?'Đã hủy':({pending:'Chờ xác nhận',preparing:'Đang chuẩn bị',shipping:'Đang giao',delivered:'Đã giao',completed:'Hoàn thành',returned:'Đổi trả'}[order.status]||'Đã ghi nhận')};
 if(cancelled)return {...base,state:'failed',mark:'!',title:'Đơn hàng đã hủy',paymentLabel:paid?'Đã ghi nhận thanh toán':'Chưa hoàn tất',message:'Đơn hàng đã bị hủy. Xem chi tiết đơn để kiểm tra thanh toán và thông tin hoàn tiền nếu có.'};
 if(paid)return {...base,state:'success',mark:'✓',title:'Thanh toán thành công',paymentLabel:'Đã thanh toán',message:'PawPal đã ghi nhận đơn hàng và khoản thanh toán của bạn. Bạn có thể theo dõi tiến trình trong chi tiết đơn hàng.'};
 return {...base,state:'success',mark:'✓',title:'Đặt hàng thành công',paymentLabel:order.paymentStatus==='partial'?'Đã thanh toán một phần':'Chưa thanh toán',message:order.paymentStatus==='partial'?'Đơn hàng đã được ghi nhận. Bạn còn khoản cần thanh toán; xem chi tiết đơn để kiểm tra.':'Đơn hàng đã được ghi nhận. Thanh toán chưa được xác nhận; vui lòng xem hướng dẫn và trạng thái trong chi tiết đơn hàng.'};
}
