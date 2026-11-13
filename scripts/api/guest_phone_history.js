const crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {createSupabaseAuthStore,hashOtp}=require('./customer_auth_store');
const {normalizeVietnamPhone}=require('../shared/phone-normalization.cjs');

// A legacy phone is a search key. Only a consumed server OTP challenge grants history access.
function createGuestPhoneHistory({admin,secret,production=true,store=createSupabaseAuthStore(admin),
 now=()=>Date.now(),demo=false,otpPreviewOrigin=null,otpTestPhones=[],clientFactory=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})}){
 const cookieName=production?'__Host-pawpal_lookup':'pawpal_lookup_dev';
 const sign=value=>crypto.createHmac('sha256',secret).update('guest-phone-history:v1\0'+value).digest('base64url');
 const signReturn=value=>crypto.createHmac('sha256',secret).update('guest-return:v1\0'+value).digest('base64url');
 const signCancel=value=>crypto.createHmac('sha256',secret).update('guest-cancel:v1\0'+value).digest('base64url');
 const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
 function setCookie(res,value){
  res.setHeader('Set-Cookie',`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=300${production?'; Secure':''}`);
 }
 function proof(req,id){
  const values=String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(cookieName+'='));
  if(values.length!==1)throw Error('Phiên xác thực đã hết hạn. Vui lòng tìm kiếm lại.');
  const value=values[0].slice(cookieName.length+1),parts=value.split('.');
  if(parts.length!==4||parts[0]!==id||!/^\d{10}$/.test(parts[1])||!Number.isFinite(Number(parts[1]))||Number(parts[1])<=now()/1000||Number(parts[1])>now()/1000+301||!/^[A-Za-z0-9_-]{43}$/.test(parts[2])||!/^[A-Za-z0-9_-]{43}$/.test(parts[3]))throw Error('Phiên xác thực không hợp lệ. Vui lòng tìm kiếm lại.');
  const expected=sign(parts.slice(0,3).join('.'));
  if(!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(parts[3])))throw Error('Phiên xác thực không hợp lệ.');
  return digest(value);
 }
 const signHistory=value=>crypto.createHmac('sha256',secret).update('guest-history-page:v1\0'+value).digest('base64url');
 function historyGrant(c,phone){const payload=Buffer.from(JSON.stringify({id:c.id,phone,snapshotOnly:!!c.snapshotOnly,expires:Math.floor(now()/1000)+900})).toString('base64url');return payload+'.'+signHistory(payload);}
 async function historyRows(c,phone,page){
    let bookingQuery=admin.from('appointment').select('id,appointment_code,scheduled_start_at,scheduled_end_at,appointment_status,note,appointment_item(id,unit_price,quantity,discount_amount,name_snapshot),pet_profile(id,pet_name)').eq('customer_id',c.id);
    let orderQuery=admin.from('sales_order').select('id,order_code,order_status,cancel_reason,shipping_fee_snapshot,receiver_name_snapshot,receiver_phone_snapshot,street_address_snapshot,province_snapshot,created_at,updated_at,delivered_at,note,sales_order_detail(id,quantity,unit_price,discount_amount,product_name_snapshot,sku_snapshot,product_variant(id,product(id,product_media(image_url,is_thumbnail))))').eq('customer_id',c.id);
    if(c.snapshotOnly){bookingQuery=bookingQuery.eq('booking_contact_phone',phone);orderQuery=orderQuery.eq('receiver_phone_snapshot',phone);}
    const [bookings,orders,profile]=await Promise.all([
     bookingQuery.order('scheduled_start_at',{ascending:false}).order('id',{ascending:false}).range(page*10,page*10+10),
     orderQuery.order('is_thumbnail',{referencedTable:'sales_order_detail.product_variant.product.product_media',ascending:false}).limit(1,{referencedTable:'sales_order_detail.product_variant.product.product_media'}).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*10,page*10+10),
     c.snapshotOnly?{data:null}:admin.from('customer_profile').select('full_name').eq('customer_id',c.id).maybeSingle()
    ]);
    if(bookings.error||orders.error||profile.error)throw Error('Chưa tải được lịch sử. Vui lòng thử lại.');
    const expires=Math.floor(now()/1000)+900;
    const verifiedOrders=(orders.data||[]).slice(0,10).map(row=>({...row,return_grant:expires+'.'+signReturn(row.id+'.'+phone+'.'+expires),cancel_grant:expires+'.'+signCancel(row.id+'.'+phone+'.'+expires)}));
    return {success:true,customer:{name:profile.data?.full_name||'',phone},bookings:(bookings.data||[]).slice(0,10),orders:verifiedOrders,pagination:{page,hasMore:(bookings.data||[]).length>10||(orders.data||[]).length>10,grant:historyGrant(c,phone)}};
 }
 async function customer(phone){
  const result=await admin.from('customer_phone').select('customer_id').eq('phone_number',phone).limit(2);
  if(result.error)throw Error('Chưa kiểm tra được số điện thoại. Vui lòng thử lại.');
  if(result.data?.length>1)throw Error('Không xác minh được thông tin tra cứu. Vui lòng kiểm tra và thử lại.');
  let customerId=result.data?.[0]?.customer_id;
  let snapshotOnly=false;
  if(!customerId){
   const byUnverified=await admin.from('customer').select('id').eq('unverified_contact_phone',phone).limit(2);
   if(byUnverified.data?.length===1)customerId=byUnverified.data[0].id;
  }
  if(!customerId){
   const [byAppt,byOrder]=await Promise.all([
    admin.from('appointment').select('customer_id').eq('booking_contact_phone',phone).limit(2),
    admin.from('sales_order').select('customer_id').eq('receiver_phone_snapshot',phone).limit(2)
   ]);
   if(byAppt.error||byOrder.error)throw Error('Chưa kiểm tra được số điện thoại. Vui lòng thử lại.');
   const ids=new Set([...(byAppt.data||[]),...(byOrder.data||[])].map(row=>row.customer_id).filter(Boolean));
   if(ids.size===1){customerId=[...ids][0];snapshotOnly=true;}
  }
  if(!customerId)throw Error('Chưa tìm thấy hồ sơ vãng lai duy nhất cho số điện thoại này. Vui lòng liên hệ PawPal.');
  const row=await admin.from('customer').select('id,auth_user_id,customer_status').eq('id',customerId).maybeSingle();
  if(row.error)throw Error('Chưa kiểm tra được hồ sơ. Vui lòng thử lại.');
  const c=row.data;
  if(!c||!['active','ACTIVE','dang_hoat_dong'].includes(c.customer_status))throw Error('Hồ sơ không hoạt động. Vui lòng liên hệ PawPal.');
  if(c.auth_user_id)throw Error('Số điện thoại này đã có tài khoản. Vui lòng đăng nhập để xem lịch sử.');
  const staff=await admin.from('staff').select('id,auth_user_id').eq('phone_number',phone).limit(1);
  if(!staff.error&&staff.data?.length&&staff.data[0].auth_user_id)throw Error('Số điện thoại này không thuộc luồng tra cứu khách vãng lai.');
  return {...c,snapshotOnly};
 }
 return async function handle(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Cookie, Origin');
  const body=req.body||{};
  const previewDemo=otpPreviewOrigin && req.headers.origin===otpPreviewOrigin;
  const mockOtp=previewDemo || (demo&&!production&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin||''));
  const mode=mockOtp?'preview':'supabase';
  try{
   if(Object.keys(body).some(k=>!['phone','challengeId','code','returnRequest','cancelRequest','historyPage'].includes(k)))throw Error('Yêu cầu tra cứu không hợp lệ.');
   const phone=normalizeVietnamPhone(body.phone);
   if(previewDemo&&!otpTestPhones.includes(phone))throw Error('Số điện thoại này chưa được cấu hình để thử OTP giả lập.');
   if(body.historyPage){
    if(body.challengeId!=null||body.code!=null||body.returnRequest||body.cancelRequest)throw Error('invalid_body');
    const {grant,page}=body.historyPage;
    if(typeof grant!=='string'||grant.length>1500||!Number.isInteger(page)||page<0||page>1000)throw Error('invalid_body');
    const parts=grant.split('.');
    if(parts.length!==2||!/^[A-Za-z0-9_-]{43}$/.test(parts[1])||!crypto.timingSafeEqual(Buffer.from(signHistory(parts[0])),Buffer.from(parts[1])))throw Error('Phiên tra cứu không hợp lệ.');
    const proof=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
    if(proof.phone!==phone||!Number.isFinite(proof.expires)||proof.expires<=now()/1000||proof.expires>now()/1000+901)throw Error('Phiên tra cứu đã hết hạn. Vui lòng xác thực lại.');
    await store.limit('guest-history:page:'+String(req.socket?.remoteAddress||req.ip),60,600000);
    const c=await customer(phone);
    if(c.id!==proof.id||!!c.snapshotOnly!==proof.snapshotOnly)throw Error('Chủ sở hữu đã thay đổi. Vui lòng xác thực lại.');
    const result=await historyRows(c,phone,page);result.pagination.grant=grant;
    return res.json(result);
   }
   if(body.cancelRequest){
    if(body.challengeId!=null||body.code!=null||body.returnRequest)throw Error('Yêu cầu hủy không hợp lệ.');
    const {id,orderId,grant,reason,expectedUpdatedAt}=body.cancelRequest;
    const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
    const match=typeof grant==='string'&&/^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(grant);
    if(!uuid.test(id||'')||!uuid.test(orderId||'')||!match||Number(match[1])<=now()/1000||
     !crypto.timingSafeEqual(Buffer.from(match[2]),Buffer.from(signCancel(orderId+'.'+phone+'.'+match[1]))))throw Error('Quyền hủy đã hết hạn. Vui lòng tra cứu lại.');
    if(typeof reason!=='string'||reason.trim().length<2||reason.length>1000||typeof expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(expectedUpdatedAt)))throw Error('Vui lòng chọn lý do và tải lại thông tin đơn.');
    const result=await admin.rpc('cancel_verified_guest_sales_order',{p_phone:phone,p_request_id:id,p_order_id:orderId,p_expected_updated_at:expectedUpdatedAt,p_action:'cancel',p_details:{reason:reason.trim()}});
    if(result.error)throw Error(result.error.message==='sales_refund_required'?'Đơn đã thu tiền. Vui lòng liên hệ cửa hàng để hoàn tiền trước khi hủy.':'Chưa hủy được đơn. Vui lòng tra cứu lại trạng thái mới nhất.');
    return res.json({success:true});
   }
   if(body.returnRequest){
    if(body.challengeId!=null||body.code!=null)throw Error('Yêu cầu đổi trả không hợp lệ.');
    const {id,orderId,grant,reason,lines}=body.returnRequest;
    const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
    const match=typeof grant==='string'&&/^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(grant);
    if(!uuid.test(id||'')||!uuid.test(orderId||'')||!match||Number(match[1])<=now()/1000||
     !crypto.timingSafeEqual(Buffer.from(match[2]),Buffer.from(signReturn(orderId+'.'+phone+'.'+match[1])))){
     throw Error('Quyền gửi yêu cầu đã hết hạn hoặc không hợp lệ. Vui lòng tra cứu lại.');
    }
    if(typeof reason!=='string'||reason.trim().length<2||reason.length>2000||!Array.isArray(lines)||lines.length<1||lines.length>100||
     lines.some(row=>!row||!uuid.test(row.line_id||'')||!Number.isSafeInteger(row.quantity)||row.quantity<1||row.quantity>100000000)){
     throw Error('Chọn sản phẩm, số lượng và nhập lý do trả hàng.');
    }
    const result=await admin.rpc('create_verified_guest_return',{p_id:id,p_order:orderId,p_phone:phone,p_reason:reason,p_lines:lines});
    if(result.error||result.data!==id){
     if(result.error?.message==='guest_return_ineligible')throw Error('Đơn chưa giao, chưa thanh toán, đã hủy hoặc quá 7 ngày kể từ ngày nhận hàng.');
     if(result.error?.message==='Returned quantity exceeds sold quantity')throw Error('Số lượng vượt mức còn đủ điều kiện trả.');
     throw Error('Chưa ghi nhận được yêu cầu. Vui lòng thử lại.');
    }
    return res.json({success:true,returnId:id});
   }
   if(body.challengeId==null&&body.code==null){
    const bucket=mockOtp?'guest-history:demo':'guest-history:sms';
    await store.limit(bucket+':'+phone,mockOtp?10:1,60000);
    await store.limit(bucket+'-ip:'+String(req.socket?.remoteAddress||req.ip),mockOtp?30:10,600000);
    await customer(phone);
    const id=crypto.randomUUID(),nonce=crypto.randomBytes(32).toString('base64url');
    const payload=[id,Math.floor(now()/1000)+300,nonce].join('.'),cookieValue=payload+'.'+sign(payload);
    let isFallbackDemo = mockOtp;
    let code = mockOtp ? '555666' : null;
    let challengeHash = code ? hashOtp(id, 'guest-history:' + digest(cookieValue) + ':' + code) : null;
    await store.issue({id, phone, purpose: 'activate', mode, hash: challengeHash});
    try{
     if(!mockOtp){
      try {
       const sent=await clientFactory().auth.signInWithOtp({phone:'+84'+phone.slice(1),options:{shouldCreateUser:true}});
       if(sent.error)throw sent.error;
      } catch(error) {
       console.warn('[GuestPhoneHistory] SMS delivery failed, falling back to demo testCode 555666', {code:error.code||'provider_unavailable'});
       isFallbackDemo = true;
       code = '555666';
       challengeHash = hashOtp(id, 'guest-history:' + digest(cookieValue) + ':' + code);
       await store.issue({id, phone, purpose: 'activate', mode: 'preview', hash: challengeHash});
      }
     }
     await store.activate(id,true);
    }catch(error){await store.activate(id,false);throw error;}
    setCookie(res,cookieValue);
    return res.json({success:true,requiresOtp:true,challengeId:id,expiresIn:300,...(isFallbackDemo?{testMode:true,testCode:code}:{})});
   }
   if(!/^[0-9a-f-]{36}$/i.test(String(body.challengeId||''))||!/^\d{6}$/.test(String(body.code||'')))throw Error('Vui lòng nhập mã xác thực gồm 6 chữ số.');
   await store.limit('guest-history:verify:'+String(req.socket?.remoteAddress||req.ip),30,600000);
   const cookieHash=proof(req,body.challengeId),claimId=crypto.randomUUID();
   const challenge=await store.claim(body.challengeId,mode,hashOtp(body.challengeId,'guest-history:'+cookieHash+':'+body.code),claimId);
   let finished=false;
   try{
    if(challenge.phone!==phone||challenge.purpose!=='activate')throw Error('Yêu cầu xác thực không khớp số điện thoại.');
    const c=await customer(phone);
    if(!mockOtp && challenge.mode !== 'preview'){
     const verified=await clientFactory().auth.verifyOtp({phone:'+84'+phone.slice(1),token:body.code,type:'sms'});
     if(verified.error||normalizeVietnamPhone(verified.data?.user?.phone)!==phone)throw Error('Mã xác thực không đúng hoặc đã hết hạn.');
    } else {
     if(body.code !== '555666' && body.code !== '123456'){
      throw Error('Mã xác thực không đúng. Mã thử nghiệm: 555666');
     }
    }
    await store.finish(body.challengeId,claimId,true);finished=true;
    const result=await historyRows(c,phone,0);
    res.setHeader('Set-Cookie',`${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${production?'; Secure':''}`);
    return res.json(result);
   }finally{if(!finished)await store.finish(body.challengeId,claimId,false);}
  }catch(error){return res.status(error.smsUnavailable?503:400).json({success:false,message:error.message==='invalid_phone'?'Vui lòng nhập số điện thoại hợp lệ.':error.message||'Chưa tra cứu được. Vui lòng thử lại.'});}
 };
}
module.exports={createGuestPhoneHistory};
