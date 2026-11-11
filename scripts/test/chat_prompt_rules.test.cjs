const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {selectPromptRules,MAX_RULE_CHARACTERS,PRIORITY_KEYS}=require('../api/chat_prompt_rules.js');

test('all twenty configured rule roles fit and survive arbitrary source order',()=>{
 const rows=PRIORITY_KEYS.map(key=>({prompt_key:key,content:('Rule '+key+' ').repeat(10)}));
 const forward=selectPromptRules(rows),backward=selectPromptRules([...rows].reverse());
 assert.equal(forward.length,20);assert.deepEqual(forward,backward);
 for(const key of ['privacy_security','anti_hallucination_rule','pet_health_safety','booking_support','payment_voucher_rule'])assert(forward.some(row=>row.prompt_key===key));
});
test('budget keeps complete safety rules before optional rules and does not truncate content',()=>{
 const rows=[{prompt_key:'z_optional',content:'z'.repeat(MAX_RULE_CHARACTERS)},...PRIORITY_KEYS.slice(0,7).map(key=>({prompt_key:key,content:key.repeat(15)}))];
 const result=selectPromptRules(rows);
 assert.equal(result.length,7);assert(result.reduce((n,row)=>n+row.content.length+1,0)<=MAX_RULE_CHARACTERS);
 assert(result.every(row=>row.content===rows.find(source=>source.prompt_key===row.prompt_key).content));
});
test('empty, inactive and duplicate keys do not enter the selected prompt',()=>{
 const rows=[null,{prompt_key:'x',content:''},{prompt_key:'y',content:'hidden',is_active:false},{prompt_key:'bot_role',content:'B'},{prompt_key:'bot_role',content:'A'}];
 assert.deepEqual(selectPromptRules(rows),[{prompt_key:'bot_role',content:'A'}]);
});
test('loader remains cached and uses a bounded deterministic web query',async()=>{
 const source=fs.readFileSync('scripts/api/chat.js','utf8');const start=source.indexOf('async function getActiveSystemPrompts()');const end=source.indexOf("const { evaluateToxicAndSentiment }",start);
 let calls=0;const ops=[];const query={select(v){ops.push(['select',v]);return this;},eq(k,v){ops.push(['eq',k,v]);return this;},order(k,v){ops.push(['order',k,v]);return this;},limit(v){ops.push(['limit',v]);return Promise.resolve({data:[{prompt_key:'privacy_security',content:'Protect customer data.'}],error:null});}};
 const context={supabase:{from(table){calls++;assert.equal(table,'chatbot_system_prompt');return query;}},selectPromptRules,cachedSystemPrompts:null,lastPromptsFetchTime:0,CACHE_TTL_RULES:300000,Date,console};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 await vm.runInContext('getActiveSystemPrompts()',context);await vm.runInContext('getActiveSystemPrompts()',context);
 assert.equal(calls,1);assert(ops.some(op=>op[0]==='eq'&&op[1]==='channel'&&op[2]==='web'));assert(ops.some(op=>op[0]==='order'&&op[1]==='prompt_key'));assert(ops.some(op=>op[0]==='limit'&&op[1]===50));
 assert(!source.includes('systemPrompts.slice(0, 5)'));
});
