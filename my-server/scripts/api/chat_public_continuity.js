'use strict';

const {evaluateToxicAndSentiment}=require('./chat_moderation.js');
const {needsSupportRequest}=require('./chat_support_boundary.js');
const fold=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/\s+/g,' ').trim();

function isNextStepFollowup(question){
 const q=fold(question);
 return q.length<=60&&/^(?:(?:h|gio|bay gio|roi|vay|the|thi|nhu vay|nhu the)\s+)?(?:lam )?sao(?: (?:day|nua|duoc|bay gio|gio|ban|ha|vay|the|chu|ki vay|ky vay))?[?!.\s]*$/.test(q);
}
function followupKind(question,evaluation){
 const q=fold(question);
 if(q.length>220)return null;
 if(/\b(?:da|vua) (?:gui|tao) (?:yeu cau|phieu)\b/.test(q)||/^(?:minh |toi |em )?da gui roi[.?!\s]*$/.test(q))return 'request_sent';
 if(/\b(?:da|vua) co (?:anh giao dich|anh minh chung|bien lai)|\b(?:gui|them) minh chung (?:o dau|the nao)/.test(q))return 'evidence';
 if(/^(?:(?:vay|the) )?(?:bao lau (?:(?:moi|thi) )?(?:co ket qua|duoc xu ly|duoc ho tro)|khi nao (?:co ket qua|duoc xu ly))/.test(q))return 'timing';
 if(/^(?:be|cun|meo|cho) .*\b(?:non|chua chiu an|chua an|van met|van bo an|van bieng an)\b/.test(q))return 'health_update';
 if(/^(?:(?:minh|toi|em) )?(?:(?:van|dang) )?(?:(?:rat|qua) )?(?:buc xuc|buc minh|buc|tuc gian|tuc)(?: (?:lam|qua))?[.?!\s]*$/.test(q))return 'concern';
 if(/^(?:(?:vay|the) )?(?:(?:minh|toi|em) (?:van (?:rat )?lo|lo qua|lo qua di|so qua)|(?:minh |toi |em )?nen lam gi (?:bay gio|tiep theo)|(?:minh |toi |em )?nen noi gi voi bac si)[.?!\s]*$/.test(q))return 'concern';
 if(evaluation?.isImplicitlyUpset&&!topicFor(question,evaluation)&&!/\b(?:don(?: hang)?|lich hen|khoan tien|su viec) khac\b/.test(q))return 'unresolved';
 return null;
}

function topicFor(question,evaluation){
 if(evaluation.riskType==='medical_emergency')return 'urgent_health';
 if(evaluation.riskType==='special_care')return 'health';
 if(evaluation.riskType==='billing_dispute')return 'billing';
 if(evaluation.riskType==='service_complaint')return 'service';
 if(needsSupportRequest(question,evaluation))return 'support';
 return null;
}

const isSupportTopic=topic=>['support','billing','service'].includes(topic);

function continuesTopic(kind,topic){
 if(kind==='concern')return true;
 if(isSupportTopic(topic))return ['request_sent','evidence','timing','unresolved'].includes(kind);
 return kind==='health_update';
}

function findContinuation(question,evaluation,recent){
 const currentTopic=topicFor(question,evaluation), kind=followupKind(question,evaluation);
 if(!currentTopic&&!kind)return null;
 const pending=[];
 for(const text of recent){
  const previousEvaluation=evaluateToxicAndSentiment(text);
  const previousTopic=topicFor(text,previousEvaluation);
  if(previousTopic){
   if(pending.some(item=>!continuesTopic(item,previousTopic)))return null;
   const sameTopic=currentTopic===previousTopic&&(!isSupportTopic(currentTopic)||kind||fold(question)===fold(text));
   const sameHealthThread=['health','urgent_health'].includes(currentTopic)&&['health','urgent_health'].includes(previousTopic);
   const genericSupportFollowup=currentTopic==='support'&&isSupportTopic(previousTopic)&&continuesTopic(kind,previousTopic);
   if(sameTopic||sameHealthThread||genericSupportFollowup||!currentTopic&&continuesTopic(kind,previousTopic))return {topic:previousTopic,kind};
   return null;
  }
  const previousKind=followupKind(text,previousEvaluation);
  if(!previousKind)return null;
  pending.push(previousKind);
 }
 return null;
}

function healthFollowupReply(question){
 const q=fold(question);
 let detail='Khi gọi bác sĩ thú y, bạn nói rõ tình trạng của bé hiện tại và những gì đã thay đổi từ lúc bắt đầu.';
 const vomiting=q.match(/^(?:be|cun|meo|cho)(?: nha (?:minh|toi|em))? (?:co|vua|da|bi) non\b(?! (?:khong|chua)\b)(?: (mot|hai|ba|[1-9]\d?) lan\b)?/);
 if(vomiting){
  const count=({mot:'một',hai:'hai',ba:'ba',1:'một'})[vomiting[1]]||vomiting[1];
  detail=count
   ? 'Bạn báo thêm cho bác sĩ là bé đã nôn '+count+' lần. Nếu nhớ, hãy nói thời điểm bé nôn.'
   : 'Bạn báo thêm cho bác sĩ là bé đã nôn. Nếu nhớ, hãy nói bé nôn lúc nào và bao nhiêu lần.';
 }else if(/\b(?:chua chiu an|chua an|van bo an|van bieng an)\b/.test(q)){
  detail='Bạn báo cho bác sĩ biết bé vẫn chưa ăn được như bình thường. Nếu nhớ, hãy nói lần cuối bé ăn hoặc uống là khi nào.';
 }
 return detail+' Nếu chưa liên hệ, bạn gọi bác sĩ thú y để được hướng dẫn cho tình trạng hiện tại của bé nhé.';
}

function supportFollowupReply(kind,signedIn){
 const openSupport=signedIn?'mở mục [Hỗ trợ](/user#support)':'[đăng nhập](/login) rồi mở mục Hỗ trợ';
 if(kind==='request_sent'){
  return 'Bạn có thể '+openSupport+' để xem tình trạng của yêu cầu vừa gửi. Nếu cần gửi thêm thông tin, bạn có thể bổ sung trong cùng yêu cầu khi còn mở nhé. Nhân viên bên mình sẽ kiểm tra và phản hồi sớm nhất cho bạn.';
 }
 if(kind==='evidence'){
  return 'Để gửi minh chứng, bạn '+openSupport+'. Nếu đã có yêu cầu đang mở, bạn bổ sung vào yêu cầu đó để nhân viên xem cùng nội dung trước nhé. Tụi mình sẽ đối soát ngay khi nhận đủ ảnh và chứng từ.';
 }
 if(kind==='timing'){
  return 'PawPal chưa thể xác nhận thời điểm có kết quả cho yêu cầu này. Bạn có thể '+openSupport+' để xem cập nhật nhé. Đội ngũ hỗ trợ sẽ xử lý nhanh nhất có thể theo đúng quy trình.';
 }
 if(kind==='unresolved'){
  return 'Bạn đã báo vấn đề này nhiều lần. Nếu yêu cầu vẫn đang mở, bạn có thể '+openSupport+' để bổ sung lần liên hệ gần nhất vào yêu cầu đó. Bạn đã gửi yêu cầu ở đó chưa?';
 }
 return 'Bạn đã gửi yêu cầu trong mục Hỗ trợ chưa? Bạn có thể '+openSupport+' để kiểm tra. Nếu chưa gửi, bạn chọn đơn hàng hoặc lịch hẹn liên quan để gửi thông tin cho nhân viên.';
}

module.exports={followupKind,isNextStepFollowup,topicFor,isSupportTopic,findContinuation,healthFollowupReply,supportFollowupReply};
