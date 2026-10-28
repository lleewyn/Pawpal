// UI handlers plus optional real RPC/RLS verification. All database fixtures ROLLBACK.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});let payloads;
 try{
  const p=await browser.newPage();await p.route('**/*',r=>r.abort());
  await p.route('http://localhost:3001/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await p.goto('http://localhost:3001/');
  await p.setContent(fs.readFileSync('pages/admin/modules/settings/settings.html','utf8'),{waitUntil:'domcontentloaded'});
  await p.evaluate(()=>{
   const category='11111111-1111-4111-8111-111111111111';window.saved=[];window.notices=[];
   window.PawpalSettings={state:{isLoaded:true,isSafeModeLocked:false,articlesList:[],blogCategoriesList:[{id:category,category_name:'Chó'}]},subtabs:{},escapeHtml:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),getSupabaseClient:()=>({}),showToast:(m,t)=>notices.push({m,t}),
    openModal:id=>document.getElementById(id).classList.add('active'),closeModal:id=>document.getElementById(id).classList.remove('active'),
    saveRecord:async(table,id,values)=>{if(window.failSave)throw Error('QA save failed');saved.push(structuredClone(values));return values;},
    loadSettingsModuleData:async()=>{PawpalSettings.state.articlesList=saved.map((v,i)=>({...v,id:String(i),category:'Chó',status:({da_xuat_ban:'published',nhap:'draft',da_an:'hidden'})[v.status],ragSynced:false,views:0,author:'QA',updatedAt:'27/10/2026'}));}};
  });
  await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/settings/subtabs/tab-settings-content.js','utf8')});
  const fill=async(status,title)=>{await p.evaluate(()=>document.getElementById('btnOpenCreateArticleModal').click());await p.locator('#inputArticleTitle').fill(title);await p.locator('#inputArticleSummary').fill('QA summary');await p.locator('#inputArticleContent').fill('QA content');await p.selectOption('#inputArticleStatus',status);};
  for(const [status,db,label] of [['published','da_xuat_ban','Công khai'],['draft','nhap','Bản nháp'],['hidden','da_an','Tạm ẩn']]){
   await fill(status,'QA-'+status);await p.evaluate(()=>document.getElementById('btnSaveArticle').click());
   await p.waitForFunction(()=>!document.getElementById('articleModalOverlay').classList.contains('active'));
   assert.equal(await p.evaluate(()=>saved.at(-1).status),db);
   const row=p.locator('#articlesTableBody tr').filter({hasText:'QA-'+status});assert.ok((await row.textContent()).includes(label));assert.ok((await row.textContent()).includes('Chó'));
  }
  payloads=await p.evaluate(()=>saved);
  await fill('published','QA-locked');await p.evaluate(()=>{PawpalSettings.state.isSafeModeLocked=true;document.getElementById('btnSaveArticle').click();});assert.equal(await p.evaluate(()=>saved.length),3);
  await p.evaluate(()=>{PawpalSettings.state.isSafeModeLocked=false;window.failSave=true;document.getElementById('btnSaveArticle').click();});await p.waitForFunction(()=>notices.some(n=>n.m.includes('QA save failed')));assert.equal(await p.evaluate(()=>saved.length),3);assert.equal(await p.locator('#articleModalOverlay').evaluate(e=>e.classList.contains('active')),true);
  console.log('PASS real article UI handlers: published/draft/hidden payloads, list titles/categories/statuses, safe lock and failed-save retention. Isolated transport.');
 }finally{await browser.close();}
 if(!process.argv.includes('--cloud'))return;
 const {connect}=require('../database/v1/service_import_connection.cjs');const db=await connect();
 const report={timestamp:new Date().toISOString(),scope:'Three synthetic posts through existing RPC; anonymous visibility; all data ROLLBACK; no Logs',checks:[]};
 try{
  await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  const user=randomUUID(),staff=randomUUID(),ids=[];
  await db.query('INSERT INTO auth.users(id) VALUES($1)',[user]);
  await db.query("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES($1,$2,'QA article rollback','QA','active',false)",[staff,user]);
  await db.query("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN')",[staff]);
  const category=(await db.query('SELECT id FROM public.blog_category ORDER BY id LIMIT 1')).rows[0]?.id;assert.ok(category,'Live blog category required');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user]);await db.query('SET LOCAL ROLE authenticated');
  for(let values of payloads){
   const id=randomUUID();ids.push(id);values={...values,slug:'qa-article-'+id,category_id:category};
   const args=[randomUUID(),'blog_post',id,null,JSON.stringify(values)];
   const saved=(await db.query('SELECT public.save_admin_setting_record($1,$2,$3,$4::jsonb,$5::jsonb,false) value',args)).rows[0].value;
   assert.equal(saved.status,values.status);assert.equal(saved.title,values.title);assert.equal(saved.category_id,category);
   const row=(await db.query('SELECT title,status,category_id FROM public.blog_post WHERE id=$1',[id])).rows[0];assert.equal(row.status,values.status);assert.equal(row.title,values.title);
   await db.query('SELECT public.save_admin_setting_record($1,$2,$3,$4::jsonb,$5::jsonb,false)',args);
   report.checks.push({status:values.status,adminSavedAndRead:true,retryIdempotent:true});
  }
  await db.query('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claim.role','anon',true)");await db.query('SET LOCAL ROLE anon');
  const visible=(await db.query('SELECT id,status FROM public.blog_post WHERE id=ANY($1::uuid[])',[ids])).rows;
  assert.equal(visible.length,1);assert.equal(visible[0].id,ids[0]);assert.equal(visible[0].status,'da_xuat_ban');
  report.publicVisibility={published:true,draft:false,hidden:false};await db.query('ROLLBACK');report.status='PASS';
  fs.writeFileSync('docs/verification/sync/settings-article-create-states-rollback.txt',JSON.stringify(report,null,2)+'\n');
  console.log('PASS live article RPC: all 3 statuses saved/read correctly, retries idempotent; only published visible to anon. All fixtures rolled back.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
