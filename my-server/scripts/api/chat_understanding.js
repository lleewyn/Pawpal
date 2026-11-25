'use strict';
const clarification='PawPal chưa hiểu rõ câu hỏi. Bạn vui lòng mô tả thêm vấn đề hoặc dịch vụ cần hỗ trợ.';
function parseCustomerReply(value){
    const text=String(value||'').trim();
    let parsed;try{parsed=JSON.parse(text);}catch{}
    if(parsed&&typeof parsed==='object'&&typeof parsed.reply==='string'&&typeof parsed.understood==='boolean'){
        return {reply:parsed.reply.trim()||clarification,understood:parsed.understood&&Boolean(parsed.reply.trim())};
    }
    if(!text||/^[{[]/.test(text))return {reply:clarification,understood:false};
    const unclear=/(?:chưa|không) (?:hiểu|rõ|đủ thông tin)|không có (?:đủ )?thông tin|bạn (?:muốn hỏi về điều gì|có câu hỏi gì)|vui lòng (?:nói|diễn đạt|mô tả) (?:lại|rõ hơn)/iu.test(text);
    return {reply:text,understood:!unclear};
}
function isUnclearInput(question){return !/[\p{L}\p{N}]/u.test(String(question||''));}
module.exports={parseCustomerReply,isUnclearInput,clarification};
