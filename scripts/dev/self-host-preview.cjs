// Isolated Admin preview: uses local self-host without changing the normal app .env.
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const envPath = process.argv[2];
if (!envPath || !path.isAbsolute(envPath)) throw Error('Pass absolute self-host .env path');
const config = require('dotenv').parse(fs.readFileSync(envPath));
if (config.SUPABASE_PUBLIC_URL !== 'http://localhost:8000') throw Error('Local self-host only');
const root = path.resolve(__dirname, '../..');
const app = express();
app.disable('x-powered-by');
app.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
app.get('/api/admin-config',(_req,res)=>res.type('js').send('window.__PAWPAL_SUPABASE_CONFIG__='+JSON.stringify({required:true,url:'http://127.0.0.1:8000',anonKey:config.ANON_KEY})+';'));
app.get('/scripts/api/supabase-client.js',(_req,res)=>{
 const publicConfig={url:'http://127.0.0.1:8000',anonKey:config.ANON_KEY};
 res.type('js').send('window.__PAWPAL_SUPABASE_CONFIG__='+JSON.stringify(publicConfig)+';\n'+
  'if (/^\\/admin\\/?$/.test(location.pathname) && !location.hash) history.replaceState(null,"","/admin#tab-list");\n'+
  fs.readFileSync(path.join(root,'scripts/api/supabase-client.js'),'utf8'));
});
app.get('/',(_req,res)=>res.redirect('/admin/login'));
app.get(['/admin/login','/admin/login/'],(_req,res)=>res.sendFile(path.join(root,'pages/admin/login/login.html')));
app.get(['/admin','/admin/'],(_req,res)=>res.sendFile(path.join(root,'pages/admin/index.html')));
app.get('/admin.css',(_req,res)=>res.sendFile(path.join(root,'pages/admin/admin.css')));
app.get('/admin.js',(_req,res)=>res.sendFile(path.join(root,'pages/admin/admin.js')));
app.use('/modules',express.static(path.join(root,'pages/admin/modules')));
app.post('/api/admin/auth/complete-password-change', express.json({limit:'4kb'}),
 require('../server/staff-password-handler.cjs')({url:config.SUPABASE_PUBLIC_URL,anonKey:config.ANON_KEY,serviceKey:config.SERVICE_ROLE_KEY}));
// Unmigrated backend features must fail explicitly, never proxy back to Cloud.
app.use('/api',(_req,res)=>res.status(503).json({error:'API này chưa được nghiệm thu trên bản self-host thử nghiệm.'}));
app.use(express.static(root,{extensions:['html'],dotfiles:'deny'}));
app.listen(3001,'127.0.0.1',()=>console.log('Self-host Admin preview: http://localhost:3001/admin/login (V1 login; business modules pending migration)'));
