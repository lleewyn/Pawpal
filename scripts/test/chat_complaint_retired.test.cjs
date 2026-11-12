const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('legacy chat ticket action is retired without touching the database',async()=>{
 const context={module:{exports:{}},exports:{},process:{env:{SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'test'}},setInterval:()=>({unref(){}}),require(name){
  if(name==='dotenv')return {config(){}};
  if(name==='@supabase/supabase-js')return {createClient:()=>new Proxy({},{get(){throw Error('Unexpected database write');}})};
  if(name==='./staff_auth.js')return {verifyStaffCaller:async()=>null};
  if(name==='crypto')return require('node:crypto');
  throw Error('Unexpected import '+name);
 }};
 vm.runInNewContext(fs.readFileSync('scripts/api/chat_actions.js','utf8'),context);
 const res={statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
 await context.module.exports.handleCreateTicket({body:{}},res,{});
 assert.equal(res.statusCode,410);assert.equal(res.body.code,'COMPLAINTS_MODULE_REQUIRED');assert.match(res.body.error,/mục Khiếu nại/);
});
