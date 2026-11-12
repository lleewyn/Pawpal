'use strict';
const supportReply='PawPal hiểu bạn cần được hỗ trợ về vấn đề này. Bạn vui lòng [Tạo yêu cầu trong mục Hỗ trợ](/user#support-create), chọn đơn hàng hoặc lịch hẹn liên quan và gửi mô tả cùng minh chứng. Khiếu nại và đề nghị bồi hoàn được tiếp nhận, xem xét và thông báo kết quả tại đó. Chat dùng để tư vấn và trao đổi với CSKH; nội dung trao đổi tại đây chưa phải yêu cầu khiếu nại hay quyết định bồi hoàn.';
function needsSupportRequest(question,evaluation={}){
 return ['billing_dispute','service_complaint'].includes(evaluation.riskType)||/khiếu nại|bồi hoàn|bồi thường|đền bù|yêu cầu hoàn tiền|hoàn tiền cho (?:tôi|mình|em|khách)/iu.test(String(question));
}
const modelBoundary='Chat chỉ dùng để tư vấn và trao đổi với CSKH. Khiếu nại hoặc đề nghị bồi hoàn phải hướng khách tới [Tạo yêu cầu trong mục Hỗ trợ](/user#support-create). Không lập yêu cầu khiếu nại trong chat, không đề xuất hay phê duyệt mức bồi hoàn, không khẳng định đã tiếp nhận yêu cầu chính thức hoặc đã quyết định hoàn tiền/điểm. Kết quả phải được xem xét và thông báo trong mục Hỗ trợ.';
module.exports={supportReply,needsSupportRequest,modelBoundary};
