const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const {service,admin,ok}=require('./customer_completion_helpers.cjs');const uuid=()=>crypto.randomUUID();
(async()=>{
 const file=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');await ok(admin.auth.signInWithPassword({email:file.match(/^Email: (.+)$/m)[1].trim(),password:file.match(/^Password: (.+)$/m)[1].trim()}));
 const directory=await ok(admin.rpc('get_admin_staff_directory')),booked=await ok(service.from('appointment').select('staff_id,items:appointment_item(staff_id)').not('appointment_status','in','(completed,cancelled,no_show)'));
 const busy=new Set(booked.flatMap(a=>[a.staff_id,...a.items.map(i=>i.staff_id)]));
 const free=directory.filter(d=>!d.roles.some(r=>r.code==='ADMIN')&&!d.staff_record.service_locked&&!busy.has(d.staff_record.id));assert.ok(free.length>=2,'Need two free restored staff profiles');const source=free[0],target=free[1];
 const category=(await ok(service.from('service_category').select('id').limit(1).single())).id,svc=uuid();await ok(service.from('service').insert({id:svc,category_id:category,service_code:'HANDOVER-'+svc,service_name:'Handover verification',estimated_duration:30}));
 const pet=await ok(service.from('pet_profile').select('id,customer_id').limit(1).single()),ids=[uuid(),uuid()];
 for(let i=0;i<2;i++){
  await ok(service.from('appointment').insert({id:ids[i],appointment_code:'TEST-'+ids[i],customer_id:pet.customer_id,pet_id:pet.id,staff_id:i===0?source.staff_record.id:null,scheduled_start_at:`2097-01-01T${i===0?'09':'11'}:00:00+07:00`,scheduled_end_at:`2097-01-01T${i===0?'10':'12'}:00:00+07:00`,appointment_status:'confirmed'}));
  await ok(service.from('appointment_item').insert({appointment_id:ids[i],is_primary:true,service_id:svc,name_snapshot:'Handover verification',quantity:1,unit_price:10,duration_minutes:30,staff_id:source.staff_record.id}));
 }
 const handover=await Promise.all(ids.map(async id=>({appointment_id:id,expected_updated_at:(await ok(service.from('appointment').select('updated_at').eq('id',id).single())).updated_at,replacement_staff_id:target.staff_record.id})));
 const request={p_request_id:uuid(),p_staff_id:source.staff_record.id,p_expected_updated_at:source.staff_record.updated_at,p_reason:'Verification atomic handover',p_handover:handover};
 const bad=structuredClone(request);bad.p_request_id=uuid();bad.p_handover[1].expected_updated_at='2000-01-01T00:00:00Z';assert.ok((await admin.rpc('handover_admin_staff_work',bad)).error);
 assert.equal((await ok(service.from('appointment').select('staff_id').eq('id',ids[0]).single())).staff_id,source.staff_record.id);assert.equal((await ok(service.from('staff').select('service_locked').eq('id',source.staff_record.id).single())).service_locked,false);
 await ok(admin.rpc('handover_admin_staff_work',request));await ok(admin.rpc('handover_admin_staff_work',request));
 assert.equal((await ok(service.from('appointment').select('staff_id').eq('id',ids[0]).single())).staff_id,target.staff_record.id);
 for(const id of ids)assert.equal((await ok(service.from('appointment_item').select('staff_id').eq('appointment_id',id).single())).staff_id,target.staff_record.id);
 const after=(await ok(admin.rpc('get_admin_staff_directory'))).find(d=>d.staff_record.id===source.staff_record.id);assert.equal(after.staff_record.service_locked,true);assert.equal(after.login_blocked,source.login_blocked);assert.deepEqual(after.roles,source.roles);
 console.log('PASS handover parent/item assignments, full rollback on changed work, lock-after-handover, idempotency, Auth/roles preserved');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
