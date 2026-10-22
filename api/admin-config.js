// Only browser-safe values. Admin config must never silently select the old Cloud project.
module.exports=(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/javascript; charset=utf-8');
 const url=process.env.PAWPAL_ADMIN_SUPABASE_URL || '',anonKey=process.env.PAWPAL_ADMIN_SUPABASE_ANON_KEY || '';
 let publicKey=false;
 if(anonKey.startsWith('sb_publishable_')){
  publicKey=true;
 }else{
  try{publicKey=JSON.parse(Buffer.from(anonKey.split('.')[1],'base64url').toString('utf8')).role==='anon';}catch{}
 }
 const valid=/^https:\/\/[^/]+\/?$/.test(url)&&publicKey;
 res.statusCode=valid?200:503;
 res.end('window.__PAWPAL_SUPABASE_CONFIG__='+JSON.stringify({required:true,url:valid?url.replace(/\/$/,''):'',anonKey:valid?anonKey:''}).replace(/</g,'\\u003c')+';');
};
