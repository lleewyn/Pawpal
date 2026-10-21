// Temporary API-only ingress. Never forward Studio, meta, SQL, storage or Auth Admin.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const express=require('express');
const createPasswordHandler=require('../server/staff-password-handler.cjs');
function createGateway(config){
 const origins=new Set(['https://pawpalgr3.vercel.app','http://localhost:3001']);
 const app=express();app.disable('x-powered-by');
 const safePath=raw=>{
  const url=new URL(raw,'http://gateway.invalid');
  if(/%2f|%5c|%00/i.test(url.pathname))return null;
  const allowed=/^\/rest\/v1\//.test(url.pathname)||/^\/realtime\/v1\//.test(url.pathname)||/^\/auth\/v1\/(token|logout|user|health|settings)$/.test(url.pathname);
  return allowed?url.pathname+url.search:null;
 };
 app.use((req,res,next)=>{
  res.set('Cache-Control','no-store');
  const origin=req.headers.origin;
  if(origin&&!origins.has(origin))return res.status(403).json({error:'Origin is not enabled for this demo.'});
  if(origin){res.set('Access-Control-Allow-Origin',origin);res.set('Vary','Origin');}
  res.set('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,prefer,range,range-unit,accept-profile,content-profile,x-supabase-api-version');
  res.set('Access-Control-Expose-Headers','content-range,range-unit,preference-applied');
  res.set('Access-Control-Allow-Methods','GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(Number(req.headers['content-length']||0)>2*1024*1024)return res.status(413).end();
  next();
 });
 app.get('/healthz',(_req,res)=>res.json({service:'pawpal-demo-api',ready:true}));
 app.post('/pawpal/admin/password-change',express.json({limit:'4kb'}),createPasswordHandler({url:'http://127.0.0.1:8000',anonKey:config.ANON_KEY,serviceKey:config.SERVICE_ROLE_KEY}));
 app.use((req,res)=>{
  const target=safePath(req.originalUrl);if(!target)return res.status(404).json({error:'This endpoint is not exposed.'});
  const headers={...req.headers,host:'127.0.0.1:8000'};delete headers.connection;
  const upstream=http.request({hostname:'127.0.0.1',port:8000,path:target,method:req.method,headers},response=>{
   res.status(response.statusCode);
   for(const [name,value] of Object.entries(response.headers))if(value!==undefined&&!/^(access-control-|connection|transfer-encoding|keep-alive)/i.test(name))res.setHeader(name,value);
   res.set('Cache-Control','no-store');response.pipe(res);
  });
  upstream.on('error',()=>{if(!res.headersSent)res.status(502).json({error:'Local Supabase is unavailable.'});else res.destroy();});
  req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
 });
 const server=http.createServer(app);
 server.on('upgrade',(req,socket,head)=>{
  const target=safePath(req.url);
  if(!target?.startsWith('/realtime/v1/') || (req.headers.origin&&!origins.has(req.headers.origin))){socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');return;}
  const upstream=http.request({hostname:'127.0.0.1',port:8000,path:target,headers:{...req.headers,host:'127.0.0.1:8000'}});
  upstream.on('upgrade',(response,remote,remoteHead)=>{
   socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')}\r\n\r\n`);
   if(head.length)remote.write(head);if(remoteHead.length)socket.write(remoteHead);
   socket.pipe(remote).pipe(socket);remote.on('error',()=>socket.destroy());socket.on('error',()=>remote.destroy());socket.on('close',()=>remote.destroy());
  });
  upstream.on('response',response=>{socket.end(`HTTP/1.1 ${response.statusCode} Rejected\r\nConnection: close\r\n\r\n`);response.resume();});
  upstream.on('error',()=>socket.destroy());upstream.end();
 });
 return server;
}
module.exports={createGateway};
if(require.main===module){
 const file=process.argv[2];if(!file||!path.isAbsolute(file))throw Error('Pass the absolute private self-host environment file');
 const config=require('dotenv').parse(fs.readFileSync(file));
 if(config.SUPABASE_PUBLIC_URL!=='http://localhost:8000')throw Error('This gateway only serves the installed local Supabase');
 createGateway(config).listen(8012,'127.0.0.1',()=>console.log('Pawpal API-only demo gateway listening on 127.0.0.1:8012'));
}
