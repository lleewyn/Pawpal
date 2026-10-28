// Real adjustment handler, rapid clicks, submit events and ambiguous-response retries.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage();await p.route('**/*',r=>r.abort());await p.route('http://localhost:3001/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await p.goto('http://localhost:3001/');await p.setContent(fs.readFileSync('pages/admin/modules/customers/customers.html','utf8'));
 await p.evaluate(()=>{
  window.requests=[];window.transactions=new Map();window.balance=100;window.holdRpc=false;window.holdRefresh=false;window.failAfterCommit=false;window.toasts=[];
  window.PawpalCustomers={state:{customerDatabase:{QA:{id:'CUS-QA',dbId:'customer-qa',name:'QA',phone:'0901234567',points:100,tierName:'Bạc'}}},subtabs:{},escapeHtml:v=>String(v??''),showToast:(...args)=>toasts.push(args),
   refreshCustomerData:async()=>{if(holdRefresh)await new Promise(resolve=>window.releaseRefresh=resolve);PawpalCustomers.state.customerDatabase.QA.points=balance;}};
  window.getSupabaseClient=()=>({rpc:async(name,args)=>{
   requests.push(args);if(holdRpc)await new Promise(resolve=>window.releaseRpc=resolve);
   if(!transactions.has(args.p_request_id)){balance+=args.p_points;transactions.set(args.p_request_id,{id:args.p_request_id,balance});}
   if(failAfterCommit){failAfterCommit=false;return {error:{message:'response_lost'}};}
   return {data:transactions.get(args.p_request_id),error:null};
  }});
 });
 await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js','utf8')});
 await p.evaluate(()=>{PawpalCustomers.subtabs.pawpoint.init();PawpalCustomers.subtabs.pawpoint.init();});
 const prepare=async(type,points)=>{await p.evaluate(()=>PawpalCustomers.subtabs.pawpoint.openAdjustPointsModal('CUS-QA'));await p.selectOption('#adjustType',type);await p.locator('#adjustPointsVal').fill(String(points));await p.locator('#adjustReason').fill('Bù sự cố dịch vụ');};
 const clickMany=()=>p.evaluate(()=>{for(let i=0;i<12;i++)document.getElementById('btnSubmitAdjustPoints').click();document.getElementById('formAdjustPoints').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await prepare('ADD',50);await p.evaluate(()=>{holdRpc=true;holdRefresh=true;});await clickMany();assert.equal(await p.evaluate(()=>requests.length),1);assert.equal(await p.locator('#btnSubmitAdjustPoints').isDisabled(),true);
 await p.evaluate(()=>{holdRpc=false;releaseRpc();});await p.waitForFunction(()=>typeof releaseRefresh==='function');await clickMany();assert.equal(await p.evaluate(()=>requests.length),1);await p.evaluate(()=>{holdRefresh=false;releaseRefresh();});await p.waitForFunction(()=>!document.getElementById('btnSubmitAdjustPoints').disabled);assert.equal(await p.evaluate(()=>balance),150);
 await prepare('SUB',20);await clickMany();await p.waitForFunction(()=>!document.getElementById('btnSubmitAdjustPoints').disabled);assert.equal(await p.evaluate(()=>requests.length),2);assert.equal(await p.evaluate(()=>balance),130);assert.equal(await p.evaluate(()=>requests[1].p_points),-20);
 await prepare('ADD',50);await p.evaluate(()=>failAfterCommit=true);await clickMany();await p.waitForFunction(()=>!document.getElementById('btnSubmitAdjustPoints').disabled);assert.equal(await p.evaluate(()=>balance),180);assert.equal(await p.locator('#modalAdjustPoints').isVisible(),true);
 await clickMany();await p.waitForFunction(()=>!document.getElementById('btnSubmitAdjustPoints').disabled);assert.equal(await p.evaluate(()=>requests.length),4);assert.equal(await p.evaluate(()=>requests[2].p_request_id===requests[3].p_request_id),true);assert.equal(await p.evaluate(()=>balance),180);
 await prepare('ADD',50);await clickMany();await p.waitForFunction(()=>!document.getElementById('btnSubmitAdjustPoints').disabled);assert.equal(await p.evaluate(()=>balance),230);assert.equal(await p.evaluate(()=>transactions.size),4);assert.equal(await p.evaluate(()=>requests[4].p_request_id!==requests[3].p_request_id),true);
 assert.equal(await p.locator('#adjustPointsVal').inputValue(),'');assert.equal(await p.locator('#adjustReason').inputValue(),'');
 console.log('PASS actual UI: 12 clicks plus form submit issue one request, guarded during RPC/refresh; +50 and -20 once; lost-response retry reuses request ID; new intentional adjustment gets a new ID. Isolated transport.');
 }finally{await b.close();}
 if(!process.argv.includes('--cloud'))return;
 const {connect}=require('../database/v1/service_import_connection.cjs');const db=await connect();try{
  await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  const user=randomUUID(),staff=randomUUID(),owner=randomUUID();await db.query('INSERT INTO auth.users(id) VALUES($1)',[user]);await db.query("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES($1,$2,'QA duplicate points','QA','active',false)",[staff,user]);await db.query("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN')",[staff]);await db.query('INSERT INTO public.customer(id,customer_code) VALUES($1,$2)',[owner,'QA-POINT-'+owner]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user]);await db.query('SET LOCAL ROLE authenticated');
  const credit=randomUUID(),debit=randomUUID();
  for(const [amount,id,expected] of [[50,credit,50],[-20,debit,30]]){
   const first=(await db.query('SELECT public.adjust_customer_points($1,$2,$3,$4) value',[owner,amount,'Bù sự cố dịch vụ',id])).rows[0].value;
   for(let i=0;i<4;i++){const replay=(await db.query('SELECT public.adjust_customer_points($1,$2,$3,$4) value',[owner,amount,'Bù sự cố dịch vụ',id])).rows[0].value;assert.equal(replay.id,first.id);assert.equal(replay.balance,expected);assert.equal(replay.replayed,true);}
  }
  const reject=async(amount,id,expected)=>{await db.query('SAVEPOINT denied');let err;try{await db.query('SELECT public.adjust_customer_points($1,$2,$3,$4)',[owner,amount,'Bù sự cố dịch vụ',id]);}catch(e){err=e;}await db.query('ROLLBACK TO SAVEPOINT denied');await db.query('RELEASE SAVEPOINT denied');assert.equal(err?.message,expected);};
  await reject(-50,randomUUID(),'insufficient_points');await reject(999,credit,'point_request_conflict');
  const rows=(await db.query('SELECT points FROM public.paw_point_transaction WHERE customer_id=$1 ORDER BY sequence_no',[owner])).rows;assert.deepEqual(rows.map(r=>r.points),[50,-20]);
  assert.equal(Number((await db.query('SELECT sum(points) balance FROM public.paw_point_transaction WHERE customer_id=$1',[owner])).rows[0].balance),30);
  await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('ROLLBACK');fs.writeFileSync('docs/verification/sync/customer-points-duplicate-submit.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks:['Repeated credit request creates one +50 entry','Repeated debit request creates one -20 entry','Exact balance 30 and two ledger entries','Insufficient debit rejected','Same ID with different amount rejected','Constraints pass; all fixtures rolled back'],scope:'Installed Supabase RPC/RLS with synthetic actor/customer; no committed changes or Logs'},null,2)+'\n');
  console.log('PASS live RPC: repeated credit/debit each create exactly one entry, balance 30, insufficient debit and conflicting replay rejected. All fixtures rolled back.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
