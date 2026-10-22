const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {service,admin,ok,browserPage,infra}=require('./customer_completion_helpers.cjs');const uuid=()=>crypto.randomUUID();
(async()=>{const {browser,page}=await browserPage();try{
 const customer=(await ok(service.from('customer').select('id').limit(1).single())).id,v=await ok(service.from('product_variant').select('id,product_id,sku_variant').eq('status','active').limit(1).single()),order=uuid(),line=uuid(),review=uuid();
 await ok(service.from('sales_order').insert({id:order,order_code:'REVIEW-'+order,customer_id:customer,order_status:'completed'}));await ok(service.from('sales_order_detail').insert({id:line,order_id:order,product_variant_id:v.id,quantity:1,unit_price:20,product_name_snapshot:'Review verification',sku_snapshot:v.sku_variant}));
 await ok(service.from('review').insert({id:review,sales_order_detail_id:line,rating:2,review_content:'<script>window.reviewInjected=true</script>',review_status:'published'}));
 const reply={p_review_id:review,p_response_id:null,p_expected_updated_at:null,p_text:'API review reply'};await ok(admin.rpc('reply_admin_sales_review',reply));assert.equal((await admin.rpc('reply_admin_sales_review',reply)).error.code,'PT409');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
 await page.locator('[data-title="Bán hàng"]').click();await page.waitForFunction(()=>window.PawpalOrders?.state.productsLoaded);
 await page.evaluate(productId=>window.PawpalOrdersModule.openProductReviewsModal(window.PawpalOrders.state.products.find(p=>p.id===productId).sku),v.product_id);
 await page.waitForFunction(()=>document.getElementById('productReviewsListContainer').textContent.includes('<script>window.reviewInjected=true</script>'));
 assert.equal(await page.evaluate(()=>window.reviewInjected),undefined);
 const block=page.locator('#productReviewsListContainer > div').filter({hasText:'<script>window.reviewInjected=true</script>'}).first();await block.getByRole('textbox',{name:'Phản hồi đánh giá'}).fill('Browser reply <img src=x onerror=window.reviewInjected=true>');
 await page.screenshot({path:infra+'/sales-review-modal.private.png',fullPage:true});const saved=page.waitForResponse(r=>r.url().includes('/rpc/reply_admin_sales_review'));await block.getByRole('button',{name:'Lưu phản hồi'}).click();assert.equal((await saved).status(),200);
 const persisted=(await ok(service.from('review_response').select('response_content').eq('review_id',review).single())).response_content;assert.match(persisted,/Browser reply/);assert.equal(await page.evaluate(()=>window.reviewInjected),undefined);assert.deepEqual(errors,[]);
 console.log('PASS product reviews normalized source/reply/stale protection/browser rendering and escaped content');
 }finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
