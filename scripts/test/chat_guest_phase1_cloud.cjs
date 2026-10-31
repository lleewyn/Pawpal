// Explicit opt-in: actual public API handler + configured Cloud, never Gemini.
if(!process.argv.includes('--cloud-public-smoke')){console.log('No changes. Use --cloud-public-smoke for owned public diagnostic conversations.');process.exit(0);}
require('dotenv').config({quiet:true});
const fs=require('fs'),assert=require('assert/strict'),{randomUUID}=require('crypto');
const {createClient}=require('@supabase/supabase-js'),{createHandler}=require('../../api/admin-chat.js');
const {plan}=require('../api/chat_public_guest.js');
const service=createClient(process.env.PAWPAL_ADMIN_SUPABASE_URL,process.env.PAWPAL_ADMIN_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let modelCalls=0;const handler=createHandler({serviceClient:service,generateReply:async()=>{modelCalls++;throw Error('Model forbidden in phase1 technical checks');}});
const token=randomUUID()+randomUUID(),checks=[];
async function call(body){const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};await handler({method:'POST',headers:{'x-real-ip':'phase1-smoke'},body:{sessionToken:token,...body}},res);assert.equal(res.statusCode,200,res.data?.error);assert.equal(res.data.ok,true);return res.data;}
(async()=>{
 const variants=await service.from('product_variant').select('sku_variant,product!inner(status)').eq('status','active').eq('catalog_retired',false).eq('product.status','active').limit(2);assert.ifError(variants.error);assert.equal(variants.data.length,2);
 const questions=['PawPal ở đâu?','Mở cửa mấy giờ?','Không đăng nhập đặt lịch được không?','Khách vãng lai mua hàng như thế nào?','Phí giao hàng bao nhiêu?','Tôi muốn đổi trả hàng','Paw Points là gì?','Cần chuẩn bị gì cho bé dị ứng?','Cách tra cứu mã đơn','Tư vấn tắm và cắt tỉa','Bé 7kg','So sánh Hotel thường và VIP','Hotel còn phòng không?','Taxi bé 7kg đi 3km','Còn hàng không?','Cho tôi số dư Paw Points của tôi','Sản phẩm '+variants.data[0].sku_variant,'So sánh sản phẩm '+variants.data[0].sku_variant+' và '+variants.data[1].sku_variant,'Tư vấn hạt cho mèo'];
 let id;
 for(let i=0;i<questions.length;i++){
  if(i%8===0){id=randomUUID();await call({action:'public_open',conversationId:id});}
  assert(plan(questions[i],i===10?[questions[9]]:[])!=null,'Known phase1 question must not enter model fallback');
  await call({action:'public_send',conversationId:id,requestId:randomUUID(),question:questions[i]});
  const read=await call({action:'public_read',conversationId:id});
  const bot=read.messages.find(m=>m.sender_type==='bot');assert(bot&&bot.content.trim());
  assert(!/vượt phần chat có thể đọc|AI chưa sẵn sàng/.test(bot.content));
  checks.push({question:questions[i],status:'PASS',replyLength:bot.content.length});
 }
 assert.equal(modelCalls,0);fs.mkdirSync('docs/chatbot/guest-phase1-2026-10-31',{recursive:true});
 fs.writeFileSync('docs/chatbot/guest-phase1-2026-10-31/api-checks.txt',JSON.stringify({scope:'Actual local handler with Cloud public RPCs and owned guest conversations; no browser acceptance; diagnostic chat history retained',modelCalls,checks},null,2)+'\n');
 console.log('PASS '+checks.length+' real-handler/Cloud public scenarios; no Gemini calls, no private business reads or order/booking mutations.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
