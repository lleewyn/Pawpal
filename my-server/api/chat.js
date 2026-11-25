// Legacy clients cannot bypass the reviewed V1 chat transactions.
const gateway=require('./admin-chat.js');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.body?.isCopilot===true)return gateway(req,res);
 if(req.body?.action==='feedback'||String(req.body?.action||'').startsWith('public_'))return gateway(req,res);
 return res.status(410).json({ok:false,error:'Luồng chat đã được cập nhật. Vui lòng tải lại trang.'});
};
