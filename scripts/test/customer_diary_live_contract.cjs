const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('pages/user/modules/diary/diary.js','utf8');
function fixture({error=null,appointments=[],logs=[]}={}){
 const calls=[];
 const db={from(table){const q={select(){return q;},eq(k,v){calls.push([table,k,v]);return q;},in(){return q;},order(){return q;},then(resolve){return Promise.resolve({data:table==='appointment'?appointments:logs,error}).then(resolve);}};return q;}};
 const context={console,window:{SupabaseClient:db},localStorage:{getItem(){throw Error('Business cache must not be read');}}};
 vm.createContext(context);vm.runInContext(source.replace(/^import .*$/gm,'').replace(/^export /gm,''),context);return {context,calls};
}
test('diary without Cloud appointments is empty and never reads local/JSON data',async()=>{
 const f=fixture();const result=await vm.runInContext("syncPetDiaryFromSupabase({_supabaseId:'11111111-1111-4111-8111-111111111111',userId:'owner'})",f.context);
 assert.equal(result.currentSession,null);assert.equal(result.history.length,0);
 assert.ok(f.calls.some(([t,k,v])=>t==='appointment'&&k==='customer_id'&&v==='owner'));
});
test('diary DB errors reject instead of presenting a fake diary',async()=>{
 const f=fixture({error:new Error('Cloud denied')});await assert.rejects(vm.runInContext("syncPetDiaryFromSupabase({_supabaseId:'11111111-1111-4111-8111-111111111111',userId:'owner'})",f.context),/Cloud denied/);
});
test('diary source has no JSON mock fetching or persistent business-cache reads',()=>{
 assert.ok(!/localStorage|sessionStorage|fetchJsonSafely|seedDemoLogs|DEMO_STAFF/.test(source));
 assert.ok(source.includes('if (!activeSession && !targetSessionId)'));
});
test('log without media renders without a broken document URL as an image',()=>{
 const f=fixture();assert.equal(vm.runInContext('resolveTimelineImageUrl({}, {})',f.context),'');
});
