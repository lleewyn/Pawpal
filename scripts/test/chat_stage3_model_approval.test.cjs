const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync('scripts/test/chat_stage3_model_local.cjs','utf8'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function check(mode){
 const api=Buffer.from('offline-generator'),privacy=Buffer.from('offline-sanitizer'),marker='pawpal-chatbot-g0-123456abcdef';let keyReads=0,result;
 const payload=Buffer.from(JSON.stringify({version:2,destination:'https://generativelanguage.googleapis.com',model:'gemini-2.5-flash',generatorSha256:mode==='generator'?hash('different'):hash(api),sanitizerSha256:mode==='sanitizer'?hash('different'):hash(privacy),maxGenerations:mode==='invalid-budget'?0:1,cases:mode==='budget'?[{status:'READY'},{status:'READY'}]:[]}));
 const fakeFs={existsSync:()=>true,readFileSync(file){
  if(file.endsWith('local-environment.txt'))return JSON.stringify({status:'READY',database:'pawpal_chatbot_g0_123456abcdef',ownerMarker:marker,privateDir:'offline-private'});
  if(file.endsWith('connection.private.txt'))return JSON.stringify({rest:'http://127.0.0.1:18011',auth:'http://127.0.0.1:19991',api:'http://127.0.0.1:18080',jwtSecret:'offline'});
  if(file.endsWith('model-request.txt'))return payload;
  if(file==='api/admin-chat.js')return api;
  if(file==='scripts/api/chat_model_privacy.js')return privacy;
  assert.fail('unexpected file read');
 },writeFileSync(file,data){assert.ok(file.endsWith('model-results.txt'));result=JSON.parse(data);}};
 const args=['node','runner',mode==='overwrite'?'--prepare-local':'--local-model','--approved-payload-sha256',mode==='payload'?'0'.repeat(64):hash(payload)];
 const fakeProcess={argv:args,env:new Proxy({},{get(target,key){if(key==='GEMINI_API_KEY')keyReads++;return undefined;}}),exit:()=>assert.fail('unexpected exit')};
 const runtime={process:fakeProcess,console:{log(){},error(){}},Buffer,setTimeout,clearTimeout,URL,require(name){
  if(name==='node:fs')return fakeFs;
  if(name==='node:child_process')return {execFileSync:()=>marker,spawn:()=>assert.fail('must not spawn')};
  if(name==='jsonwebtoken')return {sign:()=> 'offline'};
  if(name==='../api/chat_model_privacy.js')return {sanitizeModelData:x=>x};
  if(['node:path','node:assert/strict','node:crypto'].includes(name))return require(name);
  assert.fail('credential/provider loading before review guard: '+name);
 }};
 await vm.runInNewContext(source,runtime);assert.equal(keyReads,0);assert.equal(result.generations,0);assert.equal(result.status,'INCOMPLETE');
}
test('payload, generator and sanitizer changes stop before credential or provider access',async()=>{for(const mode of ['payload','generator','sanitizer'])await check(mode);});
test('preparation refuses to overwrite an existing reviewed payload',async()=>{await check('overwrite');});
test('generation count cannot exceed the single-call approved budget or use an invalid budget',async()=>{for(const mode of ['budget','invalid-budget'])await check(mode);});
