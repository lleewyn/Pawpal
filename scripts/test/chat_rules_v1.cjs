const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {browserPage,admin,service,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{
 const {browser,page}=await browserPage(),tag='Chat rule '+randomUUID()+' <img src=x onerror=window.__ruleXss=1>';let record,profanity,canned;
 try{
  await page.locator('[data-title="Chatbot"]').click();await page.locator('[data-tab="tab-chatbot-rules"]').click();
  await page.locator('#btnOpenAddFaqModal').click();
  await page.locator('#inputFaqQuestionText').fill(tag);await page.locator('#textareaFaqAnswerText').fill('Verified FAQ answer');
  await page.screenshot({path:infra+'/chat-faq-v1.private.png'});
  await page.route('**/rest/v1/rpc/save_admin_chat_rule',r=>r.abort());await page.locator('#btnSaveFaqRecord').click();await page.waitForFunction(()=>!document.getElementById('btnSaveFaqRecord').disabled);
  assert.equal(await page.locator('#inputFaqQuestionText').inputValue(),tag);
  await page.unroute('**/rest/v1/rpc/save_admin_chat_rule');await page.locator('#btnSaveFaqRecord').click();
  await page.waitForFunction(()=>document.getElementById('modalFaqEditorOverlay').style.display==='none');
  record=await ok(service.from('chatbot_knowledge_faq').select('*').eq('question',tag).single());
  await page.locator('#inputFaqSearch').fill(tag);assert.equal(await page.locator('#faqTableBody img').count(),0);assert.equal(await page.evaluate(()=>window.__ruleXss),undefined);
  assert.equal(record.answer,'Verified FAQ answer');
  const stale={p_table:'chatbot_knowledge_faq',p_id:record.id,p_expected:{...record,answer:'stale'},p_values:{answer:'Must not overwrite'},p_delete:false};
  assert.equal((await admin.rpc('save_admin_chat_rule',stale)).error.code,'PT409');
  assert.ok((await admin.from('chatbot_knowledge_faq').update({answer:'Bypass'}).eq('id',record.id)).error);
  await page.locator('[data-rules-view="profanity"]').click();await page.locator('#btnOpenAddProfanityModal').click();
  await page.locator('#inputProfanityKeywordText').fill(tag);
  await page.screenshot({path:infra+'/chat-filter-v1.private.png'});
  await page.locator('#btnSaveProfanityRecord').click();await page.waitForFunction(()=>document.getElementById('modalProfanityEditorOverlay').style.display==='none');
  profanity=await ok(service.from('chatbot_profanity_filter').select('*').eq('keyword',tag.toLowerCase()).single());assert.equal(profanity.is_active,true);
  await page.locator('[data-rules-view="canned"]').click();await page.locator('#btnOpenAddCannedModal').click();
  await page.locator('#inputCannedShortcutText').fill('/verified');await page.locator('#inputCannedTitleText').fill(tag);await page.locator('#textareaCannedContentText').fill('Verified response template');
  await page.screenshot({path:infra+'/chat-template-v1.private.png'});
  await page.locator('#btnSaveCannedRecord').click();await page.waitForFunction(()=>!document.getElementById('modalCannedEditorOverlay').classList.contains('active'));
  canned=await ok(service.from('chatbot_canned_response').select('*').eq('title',tag).single());assert.equal(canned.usage_count,0);
  console.log('PASS FAQ browser save, retained draft, stale-version rejection and direct-write denial.');
 }finally{await browser.close();if(record)await ok(service.from('chatbot_knowledge_faq').delete().eq('id',record.id));if(profanity)await ok(service.from('chatbot_profanity_filter').delete().eq('id',profanity.id));if(canned)await ok(service.from('chatbot_canned_response').delete().eq('id',canned.id));}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
