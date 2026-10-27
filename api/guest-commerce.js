const api=require('../scripts/api/guest_commerce');
module.exports=(req,res)=>{
 const url=new URL(req.url,'https://pawpal.invalid');
 const action=url.searchParams.get('action')||url.pathname.replace(/^\/api\/customer\/guest\//,'');
 return api.handle(req,res,action);
};
