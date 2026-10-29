const crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {createSupabaseAuthStore,hashOtp}=require('./customer_auth_store');
const {normalizeVietnamPhone}=require('../shared/phone-normalization.cjs');

// A legacy phone is a search key. Only a consumed server OTP challenge grants history access.
function createGuestPhoneHistory({admin,secret,production=true,store=createSupabaseAuthStore(admin),
 now=()=>Date.now(),demo=false,clientFactory=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})}){
 const cookieName=production?'__Host-pawpal_lookup':'pawpal_lookup_dev';
 const sign=value=>crypto.createHmac('sha256',secret).update('guest-phone-history:v1\0'+value).digest('base64url');
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
 async function customer(phone){
  const result=await admin.from('customer_phone').select('customer_id').eq('phone_number',phone).limit(2);
  if(result.error)throw Error('Chưa kiểm tra được số điện thoại. Vui lòng thử lại.');
  if(result.data?.length!==1)throw Error('Chưa tìm thấy hồ sơ vãng lai duy nhất cho số điện thoại này. Vui lòng liên hệ PawPal.');
  const row=await admin.from('customer').select('id,auth_user_id,customer_status').eq('id',result.data[0].customer_id).maybeSingle();
  if(row.error)throw Error('Chưa kiểm tra được hồ sơ. Vui lòng thử lại.');
  const c=row.data;
  if(!c||!['active','ACTIVE','dang_hoat_dong'].includes(c.customer_status))throw Error('Hồ sơ không hoạt động. Vui lòng liên hệ PawPal.');
  if(c.auth_user_id)throw Error('Số điện thoại này đã có tài khoản. Vui lòng đăng nhập để xem lịch sử.');
  const staff=await admin.from('staff').select('id').eq('phone_number',phone).limit(1);
  if(staff.error||staff.data?.length)throw Error('Số điện thoại này không thuộc luồng tra cứu khách vãng lai.');
  return c;
 }
 return async function handle(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Cookie, Origin');
  const body=req.body||{};
  // Fixed demonstration codes are confined to a local server and a loopback origin.
  const localDemo=demo&&!production&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin||'');
  const mode=localDemo?'preview':'supabase';
  try{
   if(Object.keys(body).some(k=>!['phone','challengeId','code'].includes(k)))throw Error('Yêu cầu tra cứu không hợp lệ.');
   const phone=normalizeVietnamPhone(body.phone);
   if(body.challengeId==null&&body.code==null){
    await store.limit('guest-history:sms:'+phone,1,60000);
    await store.limit('guest-history:sms-ip:'+String(req.socket?.remoteAddress||req.ip),10,600000);
    await customer(phone);
    const id=crypto.randomUUID(),nonce=crypto.randomBytes(32).toString('base64url');
    const payload=[id,Math.floor(now()/1000)+300,nonce].join('.'),cookieValue=payload+'.'+sign(payload);
    const code=localDemo?'555666':null;
    await store.issue({id,phone,purpose:'activate',mode,hash:code?hashOtp(id,'guest-history:'+digest(cookieValue)+':'+code):null});
    try{
     if(!localDemo){const sent=await clientFactory().auth.signInWithOtp({phone:'+84'+phone.slice(1),options:{shouldCreateUser:true}});if(sent.error)throw Error('Chưa gửi được SMS xác thực. Vui lòng liên hệ PawPal.');}
     await store.activate(id,true);
    }catch(error){await store.activate(id,false);throw error;}
    setCookie(res,cookieValue);
    return res.json({success:true,requiresOtp:true,challengeId:id,expiresIn:300,...(localDemo?{testMode:true,testCode:code}:{})});
   }
   if(!/^[0-9a-f-]{36}$/i.test(String(body.challengeId||''))||!/^\d{6}$/.test(String(body.code||'')))throw Error('Vui lòng nhập mã xác thực gồm 6 chữ số.');
   await store.limit('guest-history:verify:'+String(req.socket?.remoteAddress||req.ip),30,600000);
   const cookieHash=proof(req,body.challengeId),claimId=crypto.randomUUID();
   const challenge=await store.claim(body.challengeId,mode,hashOtp(body.challengeId,'guest-history:'+cookieHash+':'+body.code),claimId);
   let finished=false;
   try{
    if(challenge.phone!==phone||challenge.purpose!=='activate')throw Error('Yêu cầu xác thực không khớp số điện thoại.');
    const c=await customer(phone);
    if(!localDemo){
     const verified=await clientFactory().auth.verifyOtp({phone:'+84'+phone.slice(1),token:body.code,type:'sms'});
     if(verified.error||normalizeVietnamPhone(verified.data?.user?.phone)!==phone)throw Error('Mã xác thực không đúng hoặc đã hết hạn.');
    }
    await store.finish(body.challengeId,claimId,true);finished=true;
    const [bookings,orders,profile]=await Promise.all([
     admin.from('appointment').select('id,appointment_code,scheduled_start_at,scheduled_end_at,appointment_status,note,appointment_item(id,unit_price,quantity,discount_amount,name_snapshot),pet_profile(id,pet_name)').eq('customer_id',c.id).order('scheduled_start_at',{ascending:false}).limit(50),
     admin.from('sales_order').select('id,order_code,order_status,shipping_fee_snapshot,receiver_name_snapshot,receiver_phone_snapshot,street_address_snapshot,province_snapshot,created_at,updated_at,note,sales_order_detail(id,quantity,unit_price,discount_amount,product_name_snapshot,sku_snapshot)').eq('customer_id',c.id).order('created_at',{ascending:false}).limit(50),
     admin.from('customer_profile').select('full_name').eq('customer_id',c.id).maybeSingle()
    ]);
    if(bookings.error||orders.error||profile.error)throw Error('Đã xác thực nhưng chưa tải được lịch sử. Vui lòng thử lại.');
    res.setHeader('Set-Cookie',`${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${production?'; Secure':''}`);
    return res.json({success:true,customer:{name:profile.data?.full_name||'',phone},bookings:bookings.data||[],orders:orders.data||[]});
   }finally{if(!finished)await store.finish(body.challengeId,claimId,false);}
  }catch(error){return res.status(400).json({success:false,message:error.message==='invalid_phone'?'Vui lòng nhập số điện thoại hợp lệ.':error.message||'Chưa tra cứu được. Vui lòng thử lại.'});}
 };
}
module.exports={createGuestPhoneHistory};
