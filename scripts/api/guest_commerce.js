const crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {createSupabaseAuthStore}=require('./customer_auth_store');
const {normalizeVietnamPhone:normalizePhone}=require('../shared/phone-normalization.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TTL=7*86400;
function createGuestCommerce({admin,secret,origins,production=true,limit,now=()=>Date.now(),randomBytes=crypto.randomBytes}){
 if(typeof secret!=='string'||Buffer.byteLength(secret)<32)throw Error('Missing guest cookie secret');
 const allowed=new Set(origins),cookieName=production?'__Host-pawpal_guest':'pawpal_guest_dev';
 const signature=value=>crypto.createHmac('sha256',secret).update('pawpal-commerce-cookie:v1\0'+value).digest('base64url');
 const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
 const recoverySignature=value=>crypto.createHmac('sha256',secret).update('pawpal-private-receipt:v1\0'+value).digest('base64url');
 const recoveryCode=(kind,id)=>{const value=kind+'.'+id.toLowerCase()+'.'+(Math.floor(now()/1000)+90*86400);return 'r1.'+value+'.'+recoverySignature(value);};
 function cookie(req){
  const matches=String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(cookieName+'='));
  if(matches.length>1)throw Error('invalid_session');
  if(!matches.length)return null;
  const value=matches[0].slice(cookieName.length+1),match=/^v1\.(\d{10})\.([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/.exec(value);
  if(!match)throw Error('invalid_session');
  const signed=match[1]+'.'+match[2],expected=signature(signed);
  if(!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(match[3])))throw Error('invalid_session');
  const issued=Number(match[1]),seconds=Math.floor(now()/1000);
  if(issued>seconds+60||issued+TTL<=seconds)throw Error('invalid_session');
  return {value,hash:digest(value),expires:new Date((issued+TTL)*1000).toISOString()};
 }
 function setCookie(res,value,age=TTL){res.setHeader('Set-Cookie',`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${production?'; Secure':''}`);}
 async function rpc(name,args){const result=await admin.rpc(name,args);if(result.error)throw Object.assign(Error('rpc_error'),{dbCode:result.error.code,reason:result.error.message});return result.data;}
 const limiter=limit||createSupabaseAuthStore(admin).limit;
 const handle=async function handle(req,res,action){
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Cookie, Origin');
  let requestSession;
  try{
   if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({success:false,message:'Phương thức không được hỗ trợ.'});}
   if(!allowed.has(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({success:false,message:'Nguồn yêu cầu không hợp lệ.'});
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return res.status(415).json({success:false,message:'Dữ liệu yêu cầu không hợp lệ.'});
   if(req.headers.authorization)return res.status(409).json({success:false,message:'Vui lòng dùng chức năng dành cho tài khoản đang đăng nhập.'});
   if(typeof req.body==='string'){if(Buffer.byteLength(req.body)>16384)throw Error('invalid_body');req.body=JSON.parse(req.body);}
   const body=req.body;
   if(!body||typeof body!=='object'||Array.isArray(body)||Buffer.byteLength(JSON.stringify(body))>16384)throw Error('invalid_body');
   if(!['session','context','pets','profile-read','profile-update','recover','end','booking-slots','booking-quote','booking-create','booking-receipt','order-quote','order-create','order-receipt'].includes(action))return res.status(404).json({success:false,message:'Không tìm thấy chức năng.'});
   const keys=action==='pets'?['requestId','contact','pet']:action==='context'?['page']:
    action==='booking-slots'?['details','day']:action==='booking-quote'?['details']:action==='booking-create'?['requestId','expectedQuote','details']:action==='booking-receipt'?['requestId']:
    action==='order-quote'?['details','lines']:action==='order-create'?['requestId','expectedQuote','contact','details','lines','paymentMethodId']:action==='order-receipt'?['requestId']:
    action==='profile-read'?['petId']:action==='profile-update'?['requestId','revision','contact','pet']:action==='recover'?['code']:[];
   if(Object.keys(body).some(k=>!keys.includes(k)))throw Error('invalid_body');
   const forwarded=process.env.VERCEL?req.headers['x-vercel-forwarded-for']:null;
   const ip=String(forwarded||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
   try{await limiter('guest-commerce:'+action+':'+ip,['pets','profile-update','booking-create','order-create'].includes(action)?20:60,60000);}catch(error){
    if(!String(error.message).includes('thao tác quá')&&error.code!=='RATE_LIMIT')throw error;
    return res.status(429).json({success:false,message:'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.'});
   }
   if(action==='recover'){
    const match=typeof body.code==='string'&&/^r1\.(booking|order)\.([a-f0-9-]{36})\.(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(body.code.trim());
    if(!match||!UUID.test(match[2]))return res.status(403).json({success:false,message:'Mã tra cứu riêng không hợp lệ hoặc đã hết hạn.'});
    const value=match[1]+'.'+match[2]+'.'+match[3],expected=recoverySignature(value),seconds=Math.floor(now()/1000);
    if(!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(match[4]))||Number(match[3])<=seconds||Number(match[3])>seconds+90*86400)
     return res.status(403).json({success:false,message:'Mã tra cứu riêng không hợp lệ hoặc đã hết hạn.'});
    return res.json({success:true,kind:match[1],receipt:await rpc(match[1]==='booking'?'guest_booking_recover':'guest_sales_recover',{p_request:match[2]})});
   }
   let session=cookie(req);requestSession=session;
   if(action==='session'){
    if(session)return res.json({success:true,...await rpc('guest_commerce_context',{p_hash:session.hash,p_page:1})});
    const signed=Math.floor(now()/1000)+'.'+randomBytes(32).toString('base64url');
    const value='v1.'+signed+'.'+signature(signed);setCookie(res,value);
    return res.json({success:true,initialized:false,pets:[],page:1,hasMore:false});
   }
   if(!session)throw Error('invalid_session');
   if(action==='end'){
    await rpc('guest_commerce_end',{p_hash:session.hash});setCookie(res,'',0);return res.json({success:true});
   }
   if(action==='context'){
    const page=body.page??1;if(!Number.isInteger(page)||page<1||page>1000)throw Error('invalid_body');
    return res.json({success:true,...await rpc('guest_commerce_context',{p_hash:session.hash,p_page:page})});
   }
   if(action==='profile-read'){
    if(body.petId!=null&&!UUID.test(body.petId))throw Error('invalid_body');
    return res.json({success:true,...await rpc('guest_profile_read',{p_hash:session.hash,p_pet:body.petId||null})});
   }
   if(action==='profile-update'){
    if(!UUID.test(body.requestId)||typeof body.revision!=='string'||!/^[a-f0-9]{32}$/.test(body.revision)
     ||(body.contact==null)===(body.pet==null))throw Error('invalid_body');
    const contact=body.contact,pet=body.pet;
    if(contact!=null&&(!contact||Array.isArray(contact)||typeof contact!=='object'||Object.keys(contact).some(k=>!['name','phone'].includes(k))
     ||typeof contact.name!=='string'||!contact.name.trim()||contact.name.trim().length>150))throw Error('invalid_body');
    if(pet!=null&&(!pet||Array.isArray(pet)||typeof pet!=='object'||Object.keys(pet).some(k=>!['id','name','breedId','gender','weight','allergy','safetyNote'].includes(k))
     ||!UUID.test(pet.id)||!UUID.test(pet.breedId)||typeof pet.name!=='string'||!pet.name.trim()||pet.name.trim().length>100
     ||!['nam','nu','chua_ro'].includes(pet.gender)||typeof pet.weight!=='number'||!Number.isFinite(pet.weight)||pet.weight<=0||pet.weight>200
     ||['allergy','safetyNote'].some(k=>pet[k]!=null&&(typeof pet[k]!=='string'||pet[k].length>1000))))throw Error('invalid_body');
    // Deterministic rotation permits a lost-response retry with the original cookie;
    // the database verifies the exact recorded operation and new session is still valid.
    const issued=session.value.split('.')[1],nonce=crypto.createHmac('sha256',secret).update('guest-profile-rotate:v1\0'+session.value+'\0'+body.requestId).digest('base64url');
    const signed=issued+'.'+nonce,value='v1.'+signed+'.'+signature(signed);
    const result=await rpc('guest_profile_update',{p_hash:session.hash,p_new_hash:digest(value),p_request:body.requestId,p_revision:body.revision,
     p_contact:contact?{name:contact.name.trim(),phone:normalizePhone(contact.phone)}:null,p_pet:pet||null});
    if(result.rotated)setCookie(res,value,Math.max(0,Math.floor((Date.parse(session.expires)-now())/1000)));
    return res.json({success:true,...result});
   }
   if(action.startsWith('order-')){
    if(action==='order-receipt'){
     if(!UUID.test(body.requestId))throw Error('invalid_body');
     return res.json({success:true,order:await rpc('guest_sales_receipt',{p_hash:session.hash,p_request:body.requestId}),recoveryCode:recoveryCode('order',body.requestId)});
    }
    const details=body.details,lines=body.lines;
    const allowedDetails=['delivery','delivery_option_id','receiver_name','receiver_phone','street_address','province','note','discount_mode','voucher_code'];
    if(!details||typeof details!=='object'||Array.isArray(details)||Object.keys(details).some(k=>!allowedDetails.includes(k))
     ||typeof details.delivery!=='boolean'||!['none','voucher'].includes(details.discount_mode)
     ||(details.delivery_option_id!=null&&!UUID.test(details.delivery_option_id))
     ||['receiver_name','receiver_phone','street_address','province','note','voucher_code'].some(k=>details[k]!=null&&typeof details[k]!=='string')
     ||(details.note?.length||0)>4000||(details.voucher_code?.length||0)>100||(details.receiver_name?.length||0)>300
     ||(details.street_address?.length||0)>1000||(details.province?.length||0)>200
     ||!Array.isArray(lines)||lines.length<1||lines.length>100||lines.some(l=>!l||typeof l!=='object'||Array.isArray(l)
      ||Object.keys(l).some(k=>!['variant_id','quantity'].includes(k))||!UUID.test(l.variant_id)||!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>1000000))throw Error('invalid_body');
    const canonical={...details};if(canonical.receiver_phone!=null)canonical.receiver_phone=normalizePhone(canonical.receiver_phone);
    if(action==='order-quote')return res.json({success:true,quote:await rpc('guest_sales_quote',{p_hash:session.hash,p_details:canonical,p_lines:lines})});
    const contact=body.contact;
    if(!UUID.test(body.requestId)||!UUID.test(body.paymentMethodId)||typeof body.expectedQuote!=='string'||!/^[a-f0-9]{32}$/.test(body.expectedQuote)
     ||!contact||typeof contact!=='object'||Array.isArray(contact)||Object.keys(contact).some(k=>!['name','phone'].includes(k))
     ||typeof contact.name!=='string'||!contact.name.trim()||contact.name.trim().length>150)throw Error('invalid_body');
    return res.json({success:true,orderId:await rpc('guest_sales_create',{p_hash:session.hash,p_expires:session.expires,p_request:body.requestId,p_expected_quote:body.expectedQuote,
     p_contact:{name:contact.name.trim(),phone:normalizePhone(contact.phone)},p_details:canonical,p_lines:lines,p_payment:body.paymentMethodId})});
   }
   if(action.startsWith('booking-')){
    if(action==='booking-receipt'){
     if(!UUID.test(body.requestId))throw Error('invalid_body');
     return res.json({success:true,booking:await rpc('guest_booking_receipt',{p_hash:session.hash,p_request:body.requestId}),recoveryCode:recoveryCode('booking',body.requestId)});
    }
    const details=body.details;
    const allowedDetails=['pet_id','service_id','scheduled_start_at','note','addon_ids','preferred_staff_id','check_out_at','room_id','diet_notes','care_notes','pickup_address','dropoff_address','distance_km','trip_type','return_at'];
    const dateKeys=['scheduled_start_at','check_out_at','return_at'];
    if(!details||typeof details!=='object'||Array.isArray(details)||Buffer.byteLength(JSON.stringify(details))>12000
     ||Object.keys(details).some(k=>!allowedDetails.includes(k))||!UUID.test(details.pet_id)||!UUID.test(details.service_id)
     ||typeof details.scheduled_start_at!=='string'
     ||dateKeys.some(k=>details[k]!=null&&(typeof details[k]!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(details[k])||!Number.isFinite(Date.parse(details[k]))))
     ||['note','diet_notes','care_notes'].some(k=>details[k]!=null&&(typeof details[k]!=='string'||details[k].length>4000))
     ||['pickup_address','dropoff_address'].some(k=>details[k]!=null&&(typeof details[k]!=='string'||details[k].length>1000))
     ||['preferred_staff_id','room_id'].some(k=>details[k]!=null&&!UUID.test(details[k]))
     ||(details.distance_km!=null&&(typeof details.distance_km!=='number'||!Number.isFinite(details.distance_km)||details.distance_km<=0))
     ||(details.trip_type!=null&&!['one_way','round_trip'].includes(details.trip_type))
     ||(details.addon_ids!=null&&(!Array.isArray(details.addon_ids)||details.addon_ids.length>50||details.addon_ids.some(id=>!UUID.test(id)))))throw Error('invalid_body');
    if(action==='booking-slots'){
     if(typeof body.day!=='string'||!/^\d{4}-\d\d-\d\d$/.test(body.day))throw Error('invalid_body');
     return res.json({success:true,availability:await rpc('guest_booking_day_slots',{p_hash:session.hash,p_details:details,p_day:body.day})});
    }
    if(action==='booking-quote')return res.json({success:true,quote:await rpc('guest_booking_quote',{p_hash:session.hash,p_details:details})});
    if(!UUID.test(body.requestId)||typeof body.expectedQuote!=='string'||!/^[a-f0-9]{32}$/.test(body.expectedQuote))throw Error('invalid_body');
    return res.json({success:true,bookingId:await rpc('guest_booking_create',{p_hash:session.hash,p_request:body.requestId,p_expected_quote:body.expectedQuote,p_details:details})});
   }
   if(!UUID.test(body.requestId)||!body.contact||Array.isArray(body.contact)||typeof body.contact!=='object'
    ||Object.keys(body.contact).some(k=>!['name','phone'].includes(k))||typeof body.contact.name!=='string'
    ||!body.contact.name.trim()||body.contact.name.trim().length>150)throw Error('invalid_body');
   const phone=normalizePhone(body.contact.phone),pet=body.pet;
   if(!pet||typeof pet!=='object'||Array.isArray(pet)||Object.keys(pet).some(k=>!['name','breedId','gender','weight','allergy','safetyNote'].includes(k))
    ||typeof pet.name!=='string'||!pet.name.trim()||pet.name.trim().length>100||!UUID.test(pet.breedId)
    ||(pet.weight!=null&&(typeof pet.weight!=='number'||!Number.isFinite(pet.weight)||pet.weight<=0||pet.weight>200))
    ||(pet.gender!=null&&!['nam','nu','chua_ro'].includes(pet.gender))
    ||['allergy','safetyNote'].some(k=>pet[k]!=null&&(typeof pet[k]!=='string'||pet[k].length>1000)))throw Error('invalid_body');
   const result=await rpc('guest_commerce_save_pet',{p_hash:session.hash,p_expires:session.expires,p_request:body.requestId,p_phone:phone,p_name:body.contact.name.trim(),p_pet:pet});
   return res.json({success:true,...result});
  }catch(error){
   let status=503,message='Chưa xử lý được yêu cầu. Vui lòng thử lại sau.';
   // A valid first-write cookie may not have a database binding yet. Keep it
   // while the caller checks an uncertain submit, including one still in flight.
   let unboundReceipt=false;
   if(action==='order-receipt'&&requestSession&&error.dbCode==='42501'&&error.reason==='guest_session_invalid'){
    try{unboundReceipt=(await rpc('guest_commerce_context',{p_hash:requestSession.hash,p_page:1}))?.initialized===false;}catch{}
   }
   if(['invalid_body','invalid_phone'].includes(error.message)||error instanceof SyntaxError||['22023','22007','22008','22P02','23514'].includes(error.dbCode)){status=400;message='Thông tin liên hệ hoặc bé cưng không hợp lệ.';}
   const foreignPet=['guest_pet_owner_required','pet_owner_mismatch'].includes(error.reason);
   if(error.message==='invalid_session'||(error.dbCode==='42501'&&!foreignPet&&!unboundReceipt)){status=401;message='Phiên khách vãng lai đã hết hiệu lực. Vui lòng bắt đầu lại.';setCookie(res,'',0);}
   if(foreignPet){status=403;message='Bạn không có quyền sử dụng hồ sơ bé cưng này.';}
   if(error.dbCode==='P0002'){status=404;message=action.startsWith('order-')?'Không tìm thấy đơn hàng trong phiên này.':'Không tìm thấy lịch hẹn trong phiên này.';}
   if(unboundReceipt){status=404;message='Chưa tìm thấy kết quả đơn hàng trong phiên này. Vui lòng kiểm tra lại trước khi gửi tiếp.';}
   if(error.dbCode==='PT409'){status=409;message='Thông tin yêu cầu đã thay đổi. Vui lòng kiểm tra trước khi gửi lại.';}
   if(error.reason==='sales_available_stock_insufficient'){status=409;message='Sản phẩm không đủ tồn kho khả dụng. Vui lòng cập nhật giỏ hàng.';}
   if(status===400&&action.startsWith('order-'))message='Thông tin đơn hàng hoặc số lượng sản phẩm không hợp lệ.';
   const bookingErrors={invalid_slot_day:['scheduled_start_at','Vui lòng chọn ngày trong 90 ngày tới để xem giờ khả dụng.'],outside_operating_hours:['scheduled_start_at','Giờ đã chọn nằm ngoài giờ phục vụ hoặc không đủ thời gian hoàn thành.'],booking_slot_full:['scheduled_start_at','Khung giờ này đã đủ lịch. Vui lòng chọn giờ khác.'],future_booking_required:['scheduled_start_at','Vui lòng chọn thời gian trong tương lai.'],invalid_hotel_stay:['check_out_at','Thời gian trả phòng phải sau thời gian nhận phòng.'],hotel_room_conflict:['room_id','Phòng đã có lịch trong thời gian này. Vui lòng chọn phòng hoặc thời gian khác.'],hotel_room_unavailable:['room_id','Phòng không còn khả dụng. Vui lòng chọn phòng khác.'],invalid_taxi_return:['return_at','Thời gian lượt về phải sau khi hoàn thành lượt đi.']};
   const field=bookingErrors[error.reason];if(field&&action.startsWith('booking-')){message=field[1];if(status===503)status=400;}
   return res.status(status).json({success:false,message,...(field&&action.startsWith('booking-')?{fields:{[field[0]]:field[1]}}:{})});
  }
 };
 handle.prepareAccountLink=req=>{
  if(!allowed.has(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site')throw Error('Nguồn yêu cầu liên kết không hợp lệ.');
  const session=cookie(req);if(!session)throw Error('Cần phiên khách vãng lai hợp lệ để liên kết.');
  return {hash:session.hash,expires:session.expires};
 };
 handle.clearAccountCookie=res=>setCookie(res,'',0);
 return handle;
}
function cookieConfiguration(env=process.env){
 const production=env.VERCEL==='1'||env.NODE_ENV==='production';
 if(!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Missing backend configuration');
 const secret=env.PAWPAL_GUEST_COOKIE_SECRET||crypto.createHmac('sha256',env.SUPABASE_SERVICE_ROLE_KEY).update('pawpal-guest-commerce-cookie-key-v1').digest('hex');
 const origins=['https://pawpalgr3.vercel.app',env.PAWPAL_PUBLIC_ORIGIN,env.VERCEL_URL?'https://'+env.VERCEL_URL:null];
 if(!production)origins.push('http://localhost:4000','http://127.0.0.1:4000',`http://localhost:${env.PORT||3000}`,`http://127.0.0.1:${env.PORT||3000}`);
 return {secret,origins:origins.filter(Boolean),production};
}
let handler;
module.exports={createGuestCommerce,cookieConfiguration,normalizePhone,handle:async(req,res,action)=>{
 res.setHeader('Cache-Control','no-store');
 try{
  if(!handler){
   const env=process.env;
   if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Missing backend configuration');
   handler=createGuestCommerce({admin:createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),...cookieConfiguration(env)});
  }
  return await handler(req,res,action);
 }catch{return res.status(503).json({success:false,message:'Chưa cấu hình dịch vụ khách vãng lai.'});}
}};
