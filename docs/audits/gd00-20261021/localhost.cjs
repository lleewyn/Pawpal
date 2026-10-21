// HTTP GET source/routes only. No browser execution, authentication or data writes.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
async function main() {
 const routes=['/admin','/contact','/login','/booking','/checkout','/scripts/shared/address-validation.mjs'];
 const lines=['# Kiểm tra HTTP localhost — GĐ-00','',`Thời điểm: ${new Date().toISOString()} (UTC).`, '', 'Chỉ GET route/asset trên localhost:3000; không chạy JavaScript, không chứng minh form hoạt động hoặc deployment production.','', '| Route | HTTP | So sánh source |','|---|---|---|'];
 for(const route of routes){
  try{
   const response=await fetch('http://localhost:3000'+route,{signal:AbortSignal.timeout(5000)});
   const body=Buffer.from(await response.arrayBuffer());
   const same=route.endsWith('address-validation.mjs')?hash(body)===hash(fs.readFileSync(path.join(process.cwd(),'scripts/shared/address-validation.mjs'))):null;
   lines.push(`| ${route} | ${response.status} | ${same===null?'Chưa so':same?'SHA-256 khớp local':'SHA-256 KHÔNG khớp local'} |`);
  }catch(e){lines.push(`| ${route} | ${e.cause?.code||e.name} | Không lấy được |`);}
 }
 fs.writeFileSync(path.join(__dirname,'localhost.md'),lines.join('\n')+'\n');
 console.log(lines.join('\n'));
 if(lines.some(line=>/EACCES|ECONNREFUSED|TimeoutError/.test(line)))process.exitCode=1;
}
main().catch(()=>{console.error('Local HTTP probe failed; details suppressed');process.exitCode=1;});
