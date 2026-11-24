'use strict';
const acknowledgments = {
 billing_dispute: 'PawPal hiểu vì sao bạn lo khi thấy khoản thanh toán có vấn đề. Tụi mình sẽ cùng bạn kiểm tra ngay.',
 service_complaint: 'PawPal rất tiếc vì bạn gặp sự cố khi sử dụng dịch vụ. Tụi mình luôn sẵn sàng lắng nghe và hỗ trợ bạn chu đáo.'
};

const upsetAcknowledgment = 'PawPal rất tiếc vì chuyện này khiến bạn bức xúc.';
const unresolvedAcknowledgment = 'PawPal rất tiếc vì việc này vẫn chưa được giải quyết.';

function supportReply({question, riskType, isHighlyUpset, isImplicitlyUpset, missedAppointment, signedIn}){
 let acknowledgment = isHighlyUpset
  ? upsetAcknowledgment + ' Bên mình cần một vài thông tin để kiểm tra chuyện đã xảy ra.'
  : isImplicitlyUpset ? unresolvedAcknowledgment : acknowledgments[riskType] || 'PawPal sẽ hướng dẫn bạn gửi yêu cầu và theo dõi kết quả nhé.';
 let details = 'bạn chọn đơn hàng hoặc lịch hẹn liên quan, mô tả sự việc và đính kèm minh chứng nếu có.';
 if (riskType === 'billing_dispute' && /trừ tiền (?:hai|2) lần/iu.test(question)) {
  if (!isHighlyUpset && !isImplicitlyUpset) acknowledgment = 'Thấy tiền bị trừ hai lần, bạn lo là điều dễ hiểu. Bạn an tâm nhé, PawPal sẽ hỗ trợ đối soát để bạn không bị thiệt thòi.';
  details = 'bạn chọn đơn hàng và ghi thời điểm của hai giao dịch để bên mình đối soát.';
 } else if (riskType === 'service_complaint' && /trầy (?:da|xước)/iu.test(question)) {
  if (!isHighlyUpset && !isImplicitlyUpset) acknowledgment = 'PawPal rất tiếc khi biết bé bị trầy. Bên mình hiểu bạn lo khi thấy bé như vậy và xót cho bé nhiều lắm.';
  details = 'bạn chọn lịch hẹn và mô tả tình trạng của bé để nhân viên kiểm tra lại buổi chăm sóc.';
 } else if (riskType === 'service_complaint' && missedAppointment) {
  if (!isHighlyUpset) acknowledgment = 'PawPal rất tiếc vì bạn đã phải chờ quá giờ hẹn. Tụi mình thành thật xin lỗi vì sự bất tiện này.';
  details = 'bạn chọn lịch hẹn liên quan và ghi thời gian đã hẹn cùng lần liên hệ gần nhất để bên mình kiểm tra.';
 }
 const signIn = signedIn ? '' : 'Bạn [đăng nhập](/login) trước nhé. ';
 return acknowledgment + '\n\n' + signIn + 'Trong mục [Hỗ trợ](/user#support-create), ' + details + ' Sau khi gửi yêu cầu, bạn có thể theo dõi kết quả ngay tại đó nhé. Đội ngũ nhân viên luôn sẵn sàng đồng hành cùng bạn!';
}
function needsSupportRequest(question,evaluation={}){
 return ['billing_dispute','service_complaint'].includes(evaluation.riskType)||/khiếu nại|bồi hoàn|bồi thường|đền bù|yêu cầu hoàn tiền|hoàn tiền cho (?:tôi|mình|em|khách)/iu.test(String(question));
}
const modelBoundary='Chat chỉ dùng để tư vấn và trao đổi với CSKH. Khiếu nại hoặc đề nghị bồi hoàn phải hướng khách tới [Tạo yêu cầu trong mục Hỗ trợ](/user#support-create). Không lập yêu cầu khiếu nại trong chat, không đề xuất hay phê duyệt mức bồi hoàn, không khẳng định đã tiếp nhận yêu cầu chính thức hoặc đã quyết định hoàn tiền/điểm. Kết quả phải được xem xét và thông báo trong mục Hỗ trợ.';
module.exports={supportReply,needsSupportRequest,modelBoundary,upsetAcknowledgment,unresolvedAcknowledgment};
