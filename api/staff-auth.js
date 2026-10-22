// Cloud uses server-only credentials; the local demo keeps the existing gateway bridge.
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const actions={'provision-account':'provisionAccount','reset-password':'resetPassword','toggle-account-status':'toggleAccountStatus'};
 if(req.query?.action){if(typeof req.query.action!=='string'||!Object.hasOwn(actions,req.query.action))return res.status(404).json({error:'Không tìm thấy thao tác.'});return require('../scripts/api/staff_auth.js')[actions[req.query.action]](req,res);}
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Phương thức không được hỗ trợ.'});}
 const url=process.env.PAWPAL_ADMIN_SUPABASE_URL || '';
 if(!/^https:\/\/[^/]+\/?$/.test(url))return res.status(503).json({error:'Chưa cấu hình kết nối Supabase cho admin.'});
 const authorization=req.headers.authorization;
 if(typeof authorization!=='string'||!/^Bearer \S+$/.test(authorization))return res.status(401).json({error:'Vui lòng đăng nhập lại.'});
 let body=req.body;
 try{if(typeof body==='string')body=JSON.parse(body);}catch{return res.status(400).json({error:'Dữ liệu không hợp lệ.'});}
 const password=body?.password;
 if(typeof password!=='string'||password.length<6||password.length>128)return res.status(400).json({error:'Mật khẩu phải có từ 6 đến 128 ký tự.'});
 const cloudServiceKey=process.env.PAWPAL_ADMIN_SUPABASE_SERVICE_ROLE_KEY;
 if(cloudServiceKey){
  let role='';try{role=JSON.parse(Buffer.from(cloudServiceKey.split('.')[1],'base64url')).role;}catch{}
  if(role!=='service_role'||!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)||!process.env.PAWPAL_ADMIN_SUPABASE_ANON_KEY)return res.status(503).json({error:'Cấu hình Auth Cloud chưa đầy đủ.'});
  const handler=require('../scripts/api/staff-password-handler.cjs')({url,anonKey:process.env.PAWPAL_ADMIN_SUPABASE_ANON_KEY,serviceKey:cloudServiceKey});
  req.body={password};return handler(req,res);
 }
 if(/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url))return res.status(503).json({error:'Chưa cấu hình máy chủ cho thao tác đổi mật khẩu.'});
 try{
  const response=await fetch(new URL('/pawpal/admin/password-change',url),{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({password}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();return res.status(response.status).json(result);
 }catch{return res.status(503).json({error:'Không thể kết nối máy đang chạy Supabase. Vui lòng thử lại.'});}
};
