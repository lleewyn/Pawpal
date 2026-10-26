const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const config=JSON.parse(fs.readFileSync('vercel.json','utf8')),source=fs.readFileSync('server.js','utf8');
const byPath=new Map(config.rewrites.map(r=>[r.source,r.destination]));
test('Vercel clean page/asset routes match local sendFile routes and files exist',()=>{
 const routes=[...source.matchAll(/app\.get\('([^']+)',\s*\(req,\s*res\)\s*=>\s*res\.sendFile\(path\.join\(__dirname,\s*'([^']+)'\)\)\)/g)];
 assert.ok(routes.length>40);
 for(const [,path,file] of routes){assert.equal(byPath.get(path),'/'+file,path+' differs between local and Vercel');assert.ok(fs.existsSync(file),'Missing destination '+file);}
});
test('Static output explicitly uses Other preset and homepage has no redirect loop',()=>{
 assert.equal(config.framework,null);assert.equal(config.outputDirectory,'.');assert.equal(config.buildCommand,'');assert.equal(byPath.get('/'),'/index.html');assert.ok(!config.redirects.some(r=>r.source==='/'));
 for(const [path,target] of byPath)if(!path.includes(':')&&!path.startsWith('/api/'))assert.ok(fs.existsSync(target.slice(1)),target);
 assert.equal(new Set(config.rewrites.map(r=>r.source)).size,config.rewrites.length);
 assert.equal(new Set(config.redirects.map(r=>r.source)).size,config.redirects.length);
});
test('Auth API rewrites resolve to existing Vercel handlers without routing API to HTML',()=>{
 assert.equal(byPath.get('/api/customer/auth/:path*'),'/api/customer-auth?action=:path*');
 assert.equal(byPath.get('/api/admin/staff/:action'),'/api/staff-auth?action=:action');
 assert.equal(byPath.get('/api/admin/auth/complete-password-change'),'/api/staff-auth');
 for(const rule of config.rewrites.filter(r=>r.source.startsWith('/api/')))assert.ok(fs.existsSync(rule.destination.split('?')[0].slice(1)+'.js'));
 assert.ok(!config.rewrites.some(r=>r.source==='/(.*)'||r.source==='/:path*'),'Missing resources must not return homepage HTML');
});
test('Legacy page redirects lead to configured destinations and keep user sections as fragments',()=>{
 for(const rule of config.redirects){assert.equal(rule.permanent,false);const path=rule.destination.split('#')[0];assert.ok(byPath.has(path)||fs.existsSync(path.slice(1)),rule.source+' has missing redirect target');assert.notEqual(rule.source,path);}
 assert.equal(byPath.get('/modules/:path*'),'/pages/admin/modules/:path*');
});
