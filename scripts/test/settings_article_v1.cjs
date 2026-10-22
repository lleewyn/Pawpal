const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');const {browserPage,service,admin,ok,infra,env}=require('./customer_completion_helpers.cjs');const {createClient}=require('@supabase/supabase-js');
(async()=>{const {browser,page}=await browserPage(),title='Article verification '+randomUUID();let id;
 try{
  await page.locator('[data-title="Cấu hình"]').click();await page.locator('[data-tab="tab-content-management"]').click();await page.waitForFunction(()=>window.PawpalSettings?.state.isLoaded);
  await page.evaluate(()=>{PawpalSettings.state.isSafeModeLocked=false;PawpalSettings.updateSafeModeUI();});
  await page.locator('#btnOpenCreateArticleModal').click();await page.locator('#inputArticleTitle').fill(title);await page.locator('#inputArticleSummary').fill('Verified summary');await page.locator('#inputArticleContent').fill('<p>Verified article content</p>');
  await page.screenshot({path:infra+'/settings-article-v1.private.png'});await page.locator('#btnSaveArticle').click();await page.waitForFunction(()=>!document.getElementById('articleModalOverlay').classList.contains('active'));
  let a=await ok(service.from('blog_post').select('*').eq('title',title).single());id=a.id;assert.equal(a.status,'nhap');
  const anon=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,{auth:{persistSession:false},global:{fetch:(url,init)=>fetch(String(url).includes('/rest/v1/')?'http://localhost:8011'+new URL(url).pathname.replace(/^\/rest\/v1/,'')+new URL(url).search:url,init)}});
  assert.deepEqual(await ok(anon.from('blog_post').select('id').eq('id',id)),[]);
  await page.waitForFunction(id=>PawpalSettings.state.articlesList.some(a=>a.id===id),id);
  await page.evaluate(id=>{PawpalSettings.state.currentActiveArticleId=id;document.getElementById('btnActionEditArticle').click();},id);
  assert.equal(await page.locator('#inputArticleContent').inputValue(),'<p>Verified article content</p>');
  await page.locator('#inputArticleSummary').fill('Updated summary');await page.locator('#inputArticleStatus').selectOption('published');await page.locator('#btnSaveArticle').click();await page.waitForFunction(()=>!document.getElementById('articleModalOverlay').classList.contains('active'));
  a=await ok(service.from('blog_post').select('*').eq('id',id).single());assert.equal(a.summary,'Updated summary');assert.equal((await ok(anon.from('blog_post').select('id').eq('id',id))).length,1);
  const request=randomUUID();await ok(admin.rpc('sync_admin_article_knowledge',{p_request:request,p_article:id,p_expected:a}));await ok(admin.rpc('sync_admin_article_knowledge',{p_request:request,p_article:id,p_expected:a}));
  let k=await ok(service.from('chatbot_knowledge_faq').select('*').eq('id',id).single());assert.equal(k.is_active,true);assert.ok(k.answer.includes('Verified article content'));
  await page.evaluate(async()=>{await PawpalSettings.loadSettingsModuleData({force:true});});
  await page.evaluate(id=>{PawpalSettings.state.currentActiveArticleId=id;document.getElementById('btnActionViewRag').click();},id);
  await page.locator('#articleRagModalOverlay').waitFor({state:'visible'});assert.ok((await page.locator('#ragContentBox').innerText()).includes('Verified article content'));
  await page.screenshot({path:infra+'/settings-knowledge-v1.private.png'});await page.locator('#btnCancelRagModal').click();
  await page.evaluate(id=>{PawpalSettings.state.currentActiveArticleId=id;document.getElementById('btnActionToggleArticleStatus').click();},id);
  await page.waitForFunction(id=>PawpalSettings.state.articlesList.find(a=>a.id===id)?.status==='hidden',id);
  k=await ok(service.from('chatbot_knowledge_faq').select('is_active').eq('id',id).single());assert.equal(k.is_active,false);assert.deepEqual(await ok(anon.from('blog_post').select('id').eq('id',id)),[]);
  console.log('PASS article browser create/edit/publish/hide, public draft isolation, actual knowledge sync/replay and invalidation.');
 }finally{await browser.close();if(id){await ok(service.from('chatbot_knowledge_faq').delete().eq('id',id));await ok(service.from('blog_post').delete().eq('id',id));}else await ok(service.from('blog_post').delete().eq('title',title));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
