// Opt-in: exact public-only packet approved on 2026-11-01. Never invoked by tests.
'use strict';
if(!process.argv.includes('--approved-one-request'))throw Error('explicit_opt_in_required');
require('dotenv').config({quiet:true});
const fs=require('node:fs'),assert=require('node:assert/strict');
const file='docs/chatbot/admin-completion-2026-11-01/model-result.txt';
if(fs.existsSync(file))throw Error('approved_request_already_recorded_do_not_repeat');
const {createGenerator}=require('../../api/admin-chat.js');
const question='Soạn một tin hướng dẫn khách vãng lai đặt lịch PawPal, chưa có xác nhận đặt thành công.';
const context={faq:[{question:'Đặt lịch PawPal như thế nào?',answer:'Khách có thể đặt lịch mà không cần tài khoản. Chọn dịch vụ, thông tin bé, thời gian và thông tin liên hệ, kiểm tra báo giá rồi gửi yêu cầu. Đã tiếp nhận yêu cầu chưa có nghĩa là đã thanh toán hoặc cửa hàng đã duyệt.'}]};
// Reserve the single invocation even if the provider fails; do not retry this script.
fs.writeFileSync(file,'Status: STARTED. One approved generator invocation; maximum four provider attempts.\n');
(async()=>{try{
 const reply=await createGenerator()(question,context,[],{audience:'staff'});
 assert.ok(reply.trim());
 fs.writeFileSync(file,'Status: RESPONSE_RECEIVED; manually review the public draft below.\nScope: exact approved public FAQ, empty history, staff audience. No business records.\n\n'+reply+'\n');
 console.log('Approved single generation completed; public draft saved for review.');
}catch(e){fs.writeFileSync(file,'Status: FAILED; no further invocation authorized by this script.\nError category: '+String(e.message).replace(/[^a-zA-Z0-9_]/g,'').slice(0,100)+'\n');process.exitCode=1;console.log('Generation failed; see sanitized result category.');}})();
