const assert=require('node:assert/strict'),crypto=require('node:crypto');const {execFileSync}=require('node:child_process');const h=require('./customer_completion_helpers.cjs');
function sql(query){return execFileSync('docker',['exec','supabase-db','psql','-U','supabase_admin','-d',h.state.stage,'-v','ON_ERROR_STOP=1','-At','-c',query],{encoding:'utf8'}).trim();}
(async()=>{
 // Authenticate only the existing local admin; all business writes target the restored database.
 const fs=require('node:fs'),text=fs.readFileSync(h.infra+'/PAWPAL-ADMIN.private.txt','utf8');await h.ok(h.admin.auth.signInWithPassword({email:text.match(/^Email: (.+)$/m)[1],password:text.match(/^Password: (.+)$/m)[1]}));
 const c=await h.customer('Rollback verification'),breed=(await h.ok(h.service.from('pet_breed').select('id').eq('is_active',true).limit(1)))[0];
 const id=crypto.randomUUID(),payload={p_customer_id:c.id,p_pet_id:id,p_name:'Rollback pet',p_breed_id:breed.id,p_weight:4,p_safety_note:'Original safety',p_allergy:null,p_routine:null};
 await h.ok(h.admin.rpc('add_customer_pet',payload));
 const customer=await h.ok(h.service.from('customer').select('*').eq('id',c.id).single()),pet=await h.ok(h.service.from('pet_profile').select('*').eq('id',id).single());
 const requests=[
  ['set_customer_status',{p_customer_id:c.id,p_expected_updated_at:customer.updated_at,p_status:'locked'}],
  ['save_customer_note',{p_customer_id:c.id,p_expected_updated_at:customer.updated_at,p_note:'Must roll back'}],
  ['adjust_customer_points',{p_customer_id:c.id,p_points:15,p_reason:'Rollback point',p_request_id:crypto.randomUUID()}],
  ['add_customer_pet',{...payload,p_pet_id:crypto.randomUUID(),p_name:'Must roll back'}],
  ['update_customer_pet',{p_customer_id:c.id,p_pet_id:id,p_expected_updated_at:pet.updated_at,p_name:'Must roll back',p_breed_id:breed.id,p_weight:8,p_safety_note:'Must roll back',p_allergy:null,p_routine:null}],
  ['remove_customer_pet',{p_customer_id:c.id,p_pet_id:id,p_expected_updated_at:pet.updated_at,p_restore:false}]
 ];
 const banned=(await h.ok(h.service.from('staff').select('auth_user_id,must_change_password').eq('must_change_password',true).limit(1)))[0];
 for(const uid of [crypto.randomUUID(),banned.auth_user_id])for(const [name,payload] of requests){
  const r=await fetch('http://localhost:8011/rpc/'+name,{method:'POST',headers:{Authorization:'Bearer '+h.token(uid),'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(r.status,403,name+' must deny non-staff/banned caller');
 }
 for(const [name,payload] of requests){const r=await fetch('http://localhost:8011/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});assert([401,403].includes(r.status));}
 console.log('PASS all completion RPCs deny anonymous, non-staff and banned/must-change-password identities');
 const baseline=sql(`SELECT (SELECT count(*) FROM public.pet_profile WHERE customer_id='${c.id}')||':'||(SELECT count(*) FROM public.pet_weight_history WHERE pet_id='${id}')||':'||(SELECT count(*) FROM public.paw_point_transaction WHERE customer_id='${c.id}')||':'||(SELECT count(*) FROM public.audit_log)`);
 sql("CREATE FUNCTION public.customer_verify_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced_customer_verification_failure'; END $$; CREATE TRIGGER customer_verify_audit_failure BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.customer_verify_audit_failure();");
 try{
  for(const [name,payload] of requests){const r=await h.admin.rpc(name,payload);assert(r.error,name+' must roll back when final audit fails');assert(r.error.message.includes('forced_customer_verification_failure'));}
  const after=await h.ok(h.service.from('customer').select('*').eq('id',c.id).single()),petAfter=await h.ok(h.service.from('pet_profile').select('*').eq('id',id).single());
  assert.equal(after.note,customer.note);assert.equal(after.customer_status,customer.customer_status);assert.equal(after.updated_at,customer.updated_at);assert.equal(petAfter.pet_name,pet.pet_name);assert.equal(petAfter.status,pet.status);assert.equal(petAfter.safety_note,pet.safety_note);
  assert.equal(sql(`SELECT (SELECT count(*) FROM public.pet_profile WHERE customer_id='${c.id}')||':'||(SELECT count(*) FROM public.pet_weight_history WHERE pet_id='${id}')||':'||(SELECT count(*) FROM public.paw_point_transaction WHERE customer_id='${c.id}')||':'||(SELECT count(*) FROM public.audit_log)`),baseline);
  console.log('PASS forced audit failure rolls back status/note/points/pet create/edit/remove, measurements and audit traces');
 }finally{sql('DROP TRIGGER customer_verify_audit_failure ON public.audit_log; DROP FUNCTION public.customer_verify_audit_failure();');}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
