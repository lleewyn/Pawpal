const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {admin,service,ok,infra,env}=require('./customer_completion_helpers.cjs');
const fs=require('node:fs');
(async()=>{
 const raw=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');await ok(admin.auth.signInWithPassword({email:raw.match(/^Email: (.+)$/m)[1],password:raw.match(/^Password: (.+)$/m)[1]}));
 const ids=[],tag='Settings verification '+randomUUID();
 async function save(table,id,expected,values,remove=false,request=randomUUID()){return admin.rpc('save_admin_setting_record',{p_request:request,p_table:table,p_id:id,p_expected:expected,p_values:values,p_delete:remove});}
 try{
  const id=randomUUID(),request=randomUUID();ids.push(['banner',id]);
  const values={title:tag,image_url:'https://example.test/image.png',link:'/shop',status:'active',display_order:0};
  let b=await ok(save('banner',id,null,values,false,request));assert.equal(b.title,tag);
  assert.equal((await ok(save('banner',id,null,values,false,request))).replayed,true);
  assert.equal((await save('banner',id,null,{...values,title:'Changed'},false,request)).error.code,'PT409');
  assert.equal((await save('banner',id,null,{title:'Stale'})).error.code,'PT409');
  assert.ok((await admin.from('banner').update({title:'Bypass'}).eq('id',id)).error);
  b=await ok(save('banner',id,b,{title:tag+' changed'}));assert.equal(b.title,tag+' changed');
  const audit=await ok(service.from('audit_log').select('staff_id,action').eq('id',request).single());assert.equal(audit.action,'SETTINGS_WRITE');
  const context=await ok(admin.rpc('get_staff_login_context'));assert.equal(audit.staff_id,context.staff.id);
  assert.ok((await save('banner',randomUUID(),null,{...values,link:'javascript:alert(1)'})).error);
  const cat=(await ok(service.from('blog_category').select('id').limit(1)))[0];const articleId=randomUUID();ids.push(['blog_post',articleId]);
  const article=await ok(save('blog_post',articleId,null,{title:tag,slug:'verification-'+articleId,content:'<p>Verification</p>',category_id:cat.id,status:'draft'}));assert.equal(article.author_id,context.staff.id);
  const voucherId=randomUUID();ids.push(['voucher',voucherId]);
  const voucher=await ok(save('voucher',voucherId,null,{voucher_code:'VERIFY'+voucherId.slice(0,8),voucher_name:tag,discount_value:10,type:'percentage',applicable_for:'all',start_date:'2026-10-01',end_date:'2026-12-31'}));assert.equal(voucher.applicable_for,'all');
  assert.ok((await save('voucher',voucherId,voucher,{discount_value:110})).error);
  await ok(save('banner',id,b,{},true));
  console.log('PASS atomic settings audit/actor, replay/conflict, stale rejection, direct-write denial, safe URL, article author and voucher validation.');
 }finally{for(const [t,id]of ids.reverse())await ok(service.from(t).delete().eq('id',id));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
