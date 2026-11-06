const {createClient}=require('@supabase/supabase-js');

module.exports=function createOwnPasswordHandler(config){
    const transport=config.fetch||fetch;
    const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init={})=>transport(input,{...init,signal:AbortSignal.any([...(init.signal?[init.signal]:[]),AbortSignal.timeout(15000)])})}};
    const fail=(res,status,code,message)=>res.status(status).json({success:false,code,message});
    function validContext(context,id){const staff=context?.staff;return context?.is_staff===true&&context.is_active===true&&staff?.must_change_password===false&&staff.auth_user_id===id&&Array.isArray(staff.access_roles)&&staff.access_roles.length===1&&['ADMIN','STAFF'].includes(staff.access_roles[0])&&Array.isArray(staff.permission_codes)&&staff.permission_codes.length>0&&staff.permission_codes.every(code=>typeof code==='string');}
    return async(req,res)=>{
        res.setHeader('Cache-Control','no-store');
        if(req.method!=='POST')return fail(res,405,'method_not_allowed','Chỉ hỗ trợ POST.');
        const token=req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];if(!token)return fail(res,401,'session_invalid','Vui lòng đăng nhập lại.');
        let body=req.body;try{if(typeof body==='string')body=JSON.parse(body);}catch{return fail(res,400,'invalid_input','Dữ liệu không hợp lệ.');}
        if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['currentPassword','newPassword'].includes(key))||typeof body.currentPassword!=='string'||body.currentPassword.length<1||body.currentPassword.length>128||typeof body.newPassword!=='string'||body.newPassword.length<6||body.newPassword.length>128||body.currentPassword===body.newPassword)return fail(res,400,'invalid_input','Nhập mật khẩu hiện tại và mật khẩu mới khác mật khẩu cũ, từ 6 đến 128 ký tự.');
        const caller=createClient(config.url,config.anonKey,{...options,global:{...options.global,headers:{Authorization:'Bearer '+token}}});
        const checked=createClient(config.url,config.anonKey,options);let signedIn=false,writeStarted=false;
        try{
            const identity=await caller.auth.getUser(token);if(identity.error||!identity.data?.user)return fail(res,401,'session_invalid','Phiên đăng nhập không hợp lệ.');
            const user=identity.data.user,context=await caller.rpc('get_staff_login_context');
            if(context.error||!validContext(context.data,user.id))return fail(res,403,'staff_forbidden','Tài khoản hiện không có quyền công vụ.');
            if(!user.email)return fail(res,400,'identity_unavailable','Tài khoản chưa có email đăng nhập hợp lệ. Liên hệ Quản lý.');
            const credentials=await checked.auth.signInWithPassword({email:user.email,password:body.currentPassword});
            if(credentials.error||credentials.data.user?.id!==user.id){if(credentials.error?.status===429)return fail(res,429,'rate_limited','Thử quá nhiều lần. Vui lòng thử lại sau.');return fail(res,400,'current_password_invalid','Mật khẩu hiện tại không đúng hoặc không thể xác thực lại.');}
            signedIn=true;
            const fresh=await checked.rpc('get_staff_login_context');if(fresh.error||!validContext(fresh.data,user.id))return fail(res,403,'staff_forbidden','Quyền công vụ đã thay đổi. Vui lòng đăng nhập lại.');
            // The verified user's own Auth session performs the update. No service key or caller-supplied target ID.
            writeStarted=true;const changed=await checked.auth.updateUser({password:body.newPassword});
            if(changed.error){if(!(changed.error.status>=400&&changed.error.status<500))return fail(res,503,'outcome_unknown','Chưa xác nhận đổi mật khẩu thành công. Đăng nhập lại để kiểm tra trước khi thử tiếp.');return fail(res,400,'password_rejected','Auth chưa chấp nhận mật khẩu mới. Kiểm tra quy định mật khẩu và thử lại.');}
            if(changed.data.user?.id!==user.id)return fail(res,503,'outcome_unknown','Chưa xác nhận đổi mật khẩu thành công. Đăng nhập lại để kiểm tra.');
            return res.json({success:true});
        }catch{return fail(res,503,writeStarted?'outcome_unknown':'auth_unavailable',writeStarted?'Chưa xác nhận đổi mật khẩu thành công. Đăng nhập lại để kiểm tra.':'Không thể kết nối xác thực. Vui lòng thử lại.');}
        finally{if(signedIn)try{await checked.auth.signOut({scope:'local'});}catch{}}
    };
};

module.exports.handle=async(req,res)=>{
    const url=process.env.PAWPAL_ADMIN_SUPABASE_URL,anonKey=process.env.PAWPAL_ADMIN_SUPABASE_ANON_KEY;
    if(!url||!anonKey)return res.status(503).json({success:false,code:'auth_unavailable',message:'Chưa cấu hình Auth quản trị.'});
    return module.exports({url,anonKey})(req,res);
};
