const { createClient } = require('@supabase/supabase-js');

function getSupabaseAdmin() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file .env');
    }
    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

const jwt = require('jsonwebtoken');

function getJwtSigningSecret() {
    return process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'pawpal_internal_signing_secret_do_not_use_in_prod';
}

/**
 * Ký token JWT xác thực danh tính nhân sự
 */
function signStaffToken(staff, expiresIn = '8h') {
    if (!staff || !staff.id) {
        throw new Error('Cần thông tin staff hợp lệ để ký token JWT.');
    }
    const payload = {
        sub: staff.id,
        staff_id: staff.id,
        auth_user_id: staff.auth_user_id || null,
        system_role: staff.system_role || 'STAFF',
        permissions: Array.isArray(staff.permissions) ? staff.permissions : [],
        full_name: staff.full_name || staff.name || 'Nhân sự PawPal'
    };
    return jwt.sign(payload, getJwtSigningSecret(), { expiresIn, algorithm: 'HS256' });
}

/**
 * Xác thực phiên người gọi và kiểm tra quyền hạn nhân sự (CB-01, CB-05)
 */
const crypto=require('node:crypto');
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function stable(value){return Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;}
function createStaffAuthHandlers(config){
 if(!config?.url||!config.anonKey||!config.serviceKey)throw Error('Staff Auth configuration missing');
 const options={auth:{persistSession:false,autoRefreshToken:false},...(config.fetch?{global:{fetch:config.fetch}}:{})};
 const service=createClient(config.url,config.serviceKey,options);
 const fingerprint=value=>crypto.createHmac('sha256',config.serviceKey).update(JSON.stringify(stable(value))).digest('hex');
 const fail=(res,status,message)=>res.status(status).json({success:false,message});
 function body(req){let value=req.body;if(typeof value==='string')value=JSON.parse(value);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_request');return value;}
 async function verify(req,required=null){
  const token=req.headers?.authorization?.match(/^Bearer (\S+)$/i)?.[1];if(!token)return {authorized:false,status:401,message:'Vui lòng đăng nhập lại.'};
  try{
   const caller=createClient(config.url,config.anonKey,{...options,global:{...(options.global||{}),headers:{Authorization:'Bearer '+token}}});
   const user=await caller.auth.getUser(token);if(user.error||!user.data?.user)return {authorized:false,status:401,message:'Phiên đăng nhập không hợp lệ.'};
   const result=await caller.rpc('get_staff_login_context'),context=result.data,staff=context?.staff;
   if(result.error||!context?.is_active||!staff||staff.must_change_password||staff.auth_user_id!==user.data.user.id)return {authorized:false,status:403,message:'Tài khoản không có quyền truy cập công vụ hiện tại.'};
   const roles=staff.access_roles||[],permissions=staff.permission_codes||[],wanted=required?(Array.isArray(required)?required:[required]):[];
   if(wanted.length&&!wanted.some(code=>roles.includes(code)||permissions.includes(code)))return {authorized:false,status:403,message:'Bạn chưa có quyền thực hiện thao tác này.'};
   return {authorized:true,caller,user:user.data.user,staff:{...staff,system_role:roles.includes('ADMIN')?'ADMIN':roles[0]||'',permissions,account_status:'ACTIVE'}};
  }catch{return {authorized:false,status:503,message:'Không thể xác minh phiên công vụ.'};}
 }
 const errorMessage=error=>({staff_profile_changed:'Hồ sơ đã thay đổi. Tải lại trước khi thao tác.',staff_last_admin_required:'Cần giữ ít nhất một Admin đang hoạt động.',staff_use_own_password_workflow:'Dùng chức năng đổi mật khẩu cá nhân; không tự khóa hoặc reset tài khoản đang quản trị.',staff_auth_busy:'Tài khoản đang có yêu cầu xử lý. Chờ hoàn tất rồi tải lại.',staff_request_conflict:'Mã yêu cầu đã được dùng với nội dung khác.',staff_auth_previous_failure:'Lần xử lý trước chưa thành công. Tải lại và tạo yêu cầu mới.',staff_access_forbidden:'Bạn chưa có quyền quản lý tài khoản.',staff_provisioned_identity_required:'Không thể xác nhận tài khoản vừa cấp.',invalid_staff_profile:'Kiểm tra thông tin hồ sơ nhân viên.',invalid_staff_access:'Chọn vai trò và quyền thực tế trong danh mục.'})[error?.message]||'Không thể hoàn tất quản lý tài khoản. Tải lại để kiểm tra trạng thái.';
 const rpcFailure=(res,error)=>fail(res,error?.code==='42501'?403:error?.code==='PT409'?409:400,errorMessage(error));
 async function provisionAccount(req,res){
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return fail(res,405,'Chỉ hỗ trợ POST.');
  const auth=await verify(req,'ADMIN');if(!auth.authorized)return fail(res,auth.status,auth.message);
  let request;try{request=body(req);}catch{return fail(res,400,'Dữ liệu không hợp lệ.');}
  const {requestId,staffId,profile,email,password,enableLogin}=request;
  const roles=Array.isArray(request.roles)?[...new Set(request.roles)].sort():null,permissions=Array.isArray(request.permissions)?[...new Set(request.permissions)].sort():null;
  if(!uuid(requestId)||!uuid(staffId)||!profile||typeof profile!=='object'||Array.isArray(profile)||typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
   ||typeof password!=='string'||password.length<6||password.length>128||typeof enableLogin!=='boolean'||!roles||roles.length>30||!permissions||permissions.length>250||(enableLogin&&roles.length+permissions.length===0)||[...roles,...permissions].some(v=>typeof v!=='string'))return fail(res,400,'Nhập hồ sơ, email đăng nhập, mật khẩu từ 6 đến 128 ký tự và chọn quyền nếu cho phép đăng nhập.');
  const signature=fingerprint({requestId,staffId,profile,email:email.toLowerCase(),password,enableLogin,roles,permissions});
  try{
   const complete=await service.from('audit_log').select('staff_id,description').eq('action','STAFF_PROVISION_DONE').eq('entity_id',requestId).maybeSingle();if(complete.error)return fail(res,503,'Không thể kiểm tra yêu cầu đã lưu.');
   if(complete.data){const prior=JSON.parse(complete.data.description);if(complete.data.staff_id!==auth.staff.id||prior.staff_id!==staffId||prior.fingerprint!==signature)return fail(res,409,'Yêu cầu đã được dùng với nội dung khác.');return res.json({success:true,staffId,message:'Hồ sơ và tài khoản đã được cấp trước đó.'});}
   const [roleRows,permissionRows]=await Promise.all([auth.caller.from('access_role').select('code').in('code',roles),permissions.length?auth.caller.from('permission').select('code').in('code',permissions):Promise.resolve({data:[],error:null})]);
   if(roleRows.error||permissionRows.error||roleRows.data.length!==roles.length||permissionRows.data.length!==permissions.length)return fail(res,400,'Vai trò hoặc quyền không còn hợp lệ.');
   let identity=null,created=false;
   const added=await service.auth.admin.createUser({email,password,email_confirm:true,ban_duration:'876000h',app_metadata:{pawpal_staff_request:requestId,pawpal_staff_id:staffId,pawpal_staff_fingerprint:signature}});
   if(!added.error){identity=added.data.user;created=true;}
   else{
    // An existing email is never reassigned or reset. Only resume our exact request.
    for(let page=1;page<=100&&!identity;page++){const listed=await service.auth.admin.listUsers({page,perPage:200});if(listed.error)break;identity=listed.data.users.find(u=>u.email?.toLowerCase()===email.toLowerCase()&&u.app_metadata?.pawpal_staff_request===requestId&&u.app_metadata?.pawpal_staff_id===staffId&&u.app_metadata?.pawpal_staff_fingerprint===signature);if(listed.data.users.length<200)break;}
    if(!identity)return fail(res,409,'Email đã được dùng hoặc không thể cấp tài khoản. Không thay đổi tài khoản hiện có.');
   }
   const saved=await auth.caller.rpc('create_admin_staff_profile',{p_request_id:requestId,p_staff_id:staffId,p_auth_user_id:identity.id,p_details:profile,p_roles:roles,p_permissions:permissions});
   if(saved.error){
    if(created){const linked=await service.from('staff').select('id').eq('auth_user_id',identity.id).maybeSingle();if(!linked.error&&!linked.data)await service.auth.admin.deleteUser(identity.id);}
    return rpcFailure(res,saved.error);
   }
   const [current,creation]=await Promise.all([service.from('staff').select('updated_at').eq('id',staffId).single(),service.from('audit_log').select('created_at').eq('action','STAFF_PROFILE_CREATE').eq('entity_id',requestId).single()]);
   if(current.error||creation.error)return fail(res,503,'Hồ sơ đã lưu; chưa xác nhận trạng thái đăng nhập. Tải lại để kiểm tra.');
   if(current.data.updated_at!==creation.data.created_at)return fail(res,409,'Hồ sơ đã có thao tác quản lý mới. Giữ nguyên tài khoản và tải lại để kiểm tra.');
   const activated=await service.auth.admin.updateUserById(identity.id,{ban_duration:enableLogin?'none':'876000h'});
   if(activated.error)return fail(res,503,'Hồ sơ đã lưu; chưa xác nhận cho phép đăng nhập. Tải lại để kiểm tra.');
   const finished=await service.rpc('finish_admin_staff_provision',{p_actor_auth_id:auth.user.id,p_request_id:requestId,p_staff_id:staffId,p_fingerprint:signature,p_enable_login:enableLogin});
   if(finished.error)return fail(res,503,'Hồ sơ đã lưu; cần tải lại để xác nhận tài khoản.');
   return res.json({success:true,staffId,accountStatus:enableLogin?'ACTIVE':'LOCKED',mustChangePassword:true,message:'Đã cấp tài khoản. Nhân viên phải đổi mật khẩu khi đăng nhập.'});
  }catch{return fail(res,503,'Không thể hoàn tất cấp tài khoản. Tải lại trước khi thử tiếp.');}
 }
 async function accountAction(req,res,action){
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return fail(res,405,'Chỉ hỗ trợ POST.');const auth=await verify(req,'ADMIN');if(!auth.authorized)return fail(res,auth.status,auth.message);
  let request;try{request=body(req);}catch{return fail(res,400,'Dữ liệu không hợp lệ.');}
  if(!uuid(request.requestId)||!uuid(request.staffId)||typeof request.expectedUpdatedAt!=='string'||(action==='reset'&&(typeof request.password!=='string'||request.password.length<6||request.password.length>128)))return fail(res,400,'Kiểm tra mã yêu cầu, hồ sơ và mật khẩu từ 6 đến 128 ký tự.');
  try{
   const started=await service.rpc('begin_admin_staff_auth_action',{p_actor_auth_id:auth.user.id,p_request_id:request.requestId,p_staff_id:request.staffId,p_expected_updated_at:request.expectedUpdatedAt,p_action:action,p_fingerprint:fingerprint({staffId:request.staffId,action,password:action==='reset'?request.password:null})});
   if(started.error)return rpcFailure(res,started.error);if(started.data.done)return res.json({success:true,message:'Yêu cầu đã được ghi nhận trước đó.'});
   const updated=await service.auth.admin.updateUserById(started.data.auth_user_id,action==='reset'?{password:request.password}:{ban_duration:action==='lock'?'876000h':'none'});
   if(updated.error){if(updated.error.status>=400&&updated.error.status<500)await service.rpc('finish_admin_staff_auth_action',{p_actor_auth_id:auth.user.id,p_request_id:request.requestId,p_success:false});return fail(res,503,'Chưa hoàn tất yêu cầu Auth. Giữ mã yêu cầu và tải lại để kiểm tra trước khi thử tiếp.');}
   const finished=await service.rpc('finish_admin_staff_auth_action',{p_actor_auth_id:auth.user.id,p_request_id:request.requestId,p_success:true});if(finished.error)return fail(res,503,'Auth đã xử lý; chưa hoàn tất xác nhận. Giữ mã yêu cầu và thử lại để đối chiếu.');
   return res.json({success:true,message:action==='reset'?'Đã đặt lại mật khẩu; nhân viên phải đổi khi đăng nhập.':action==='lock'?'Đã khóa đăng nhập.':'Đã mở khóa đăng nhập.'});
  }catch{return fail(res,503,'Không thể xác nhận kết quả Auth. Giữ mã yêu cầu và tải lại để kiểm tra.');}
 }
 return {verifyStaffCaller:verify,verifyAdminCaller:req=>verify(req,'ADMIN'),provisionAccount,resetPassword:(req,res)=>accountAction(req,res,'reset'),toggleAccountStatus:(req,res)=>{
  let input;try{input=body(req);}catch{return fail(res,400,'Dữ liệu không hợp lệ.');}
  if(!['lock','unlock'].includes(input.action))return fail(res,400,'Chọn rõ khóa hoặc mở khóa đăng nhập.');return accountAction(req,res,input.action);
 }};
}
let cachedConfig='',cachedHandlers=null;
function configuredHandlers(){
 const config={url:process.env.PAWPAL_ADMIN_SUPABASE_URL,anonKey:process.env.PAWPAL_ADMIN_SUPABASE_ANON_KEY,serviceKey:process.env.PAWPAL_ADMIN_SUPABASE_SERVICE_ROLE_KEY};
 const signature=JSON.stringify(config);if(signature!==cachedConfig||!cachedHandlers){cachedHandlers=createStaffAuthHandlers(config);cachedConfig=signature;}return cachedHandlers;
}
const endpoint=name=>async(req,res)=>{try{return await configuredHandlers()[name](req,res);}catch{return res.status(503).json({success:false,message:'Chưa cấu hình Auth quản trị.'});}};
module.exports={createStaffAuthHandlers,provisionAccount:endpoint('provisionAccount'),resetPassword:endpoint('resetPassword'),toggleAccountStatus:endpoint('toggleAccountStatus'),
 verifyStaffCaller:async(req,required)=>{try{return await configuredHandlers().verifyStaffCaller(req,required);}catch{return {authorized:false,status:503,message:'Chưa cấu hình xác thực công vụ.'};}},
 verifyAdminCaller:async req=>{try{return await configuredHandlers().verifyAdminCaller(req);}catch{return {authorized:false,status:503,message:'Chưa cấu hình xác thực công vụ.'};}},signStaffToken,getJwtSigningSecret};
