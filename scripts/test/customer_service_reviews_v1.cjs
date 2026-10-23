const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const {state}=require('./customer_completion_helpers.cjs');
const ddl=fs.readFileSync('scripts/database/v1/070_customer_service_reviews.sql','utf8').replace(/^BEGIN;|^COMMIT;|^NOTIFY.*$/gm,'');
const q=`BEGIN;${ddl}
DO $$ DECLARE uid uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); cid uuid; pet uuid; svc uuid;
 aid uuid:=gen_random_uuid(); l1 uuid:=gen_random_uuid(); l2 uuid:=gen_random_uuid(); r1 uuid:=gen_random_uuid(); r2 uuid:=gen_random_uuid(); payload jsonb; rejected boolean;
BEGIN
 INSERT INTO auth.users(id) VALUES(uid),(outsider);
 SELECT customer_id,id INTO cid,pet FROM public.pet_profile LIMIT 1;
 UPDATE public.customer SET auth_user_id=uid,customer_status='active' WHERE id=cid;
 SELECT id INTO svc FROM public.service LIMIT 1;
 INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at,appointment_status)
 VALUES(aid,'TEST-'||aid,cid,pet,now()-interval '2 days',now()-interval '1 day','completed');
 INSERT INTO public.appointment_item(id,appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,duration_minutes,status)
 VALUES(l1,aid,svc,true,'Review one',1,100,60,'completed'),(l2,aid,svc,false,'Review two',1,50,15,'completed');
 payload:=jsonb_build_array(jsonb_build_object('id',r1,'line_id',l1,'rating',5,'content','Verified review'),jsonb_build_object('id',r2,'line_id',l2,'rating',0,'content','Invalid'));
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);PERFORM set_config('request.jwt.claim.role','authenticated',true);PERFORM set_config('role','authenticated',true);
 rejected:=false;BEGIN PERFORM public.submit_own_service_reviews(aid,payload);EXCEPTION WHEN invalid_parameter_value THEN rejected:=true;END;
 IF NOT rejected OR jsonb_array_length(public.own_service_reviews(aid))<>0 THEN RAISE EXCEPTION 'Invalid batch was not atomic';END IF;
 payload:=jsonb_set(payload,'{1,rating}','4');
 PERFORM public.submit_own_service_reviews(aid,payload);PERFORM public.submit_own_service_reviews(aid,payload);
 IF jsonb_array_length(public.own_service_reviews(aid))<>2 OR EXISTS(SELECT 1 FROM public.review WHERE id IN(r1,r2) AND review_status<>'pending') THEN RAISE EXCEPTION 'Replay or moderation failed';END IF;
 rejected:=false;BEGIN PERFORM public.submit_own_service_reviews(aid,jsonb_set(payload,'{0,rating}','3'));EXCEPTION WHEN SQLSTATE 'PT409' THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Conflicting review accepted';END IF;
 PERFORM set_config('role','supabase_admin',true);
 UPDATE public.appointment SET appointment_status='pending' WHERE id=aid;
 PERFORM set_config('role','authenticated',true);
 rejected:=false;BEGIN PERFORM public.submit_own_service_reviews(aid,payload);EXCEPTION WHEN invalid_parameter_value THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Unfinished service accepted';END IF;
 PERFORM set_config('request.jwt.claim.sub',outsider::text,true);
 rejected:=false;BEGIN PERFORM public.own_service_reviews(aid);EXCEPTION WHEN insufficient_privilege THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Other customer can read reviews';END IF;
 rejected:=false;BEGIN PERFORM public.submit_own_service_reviews(aid,payload);EXCEPTION WHEN insufficient_privilege THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Other customer can submit reviews';END IF;
 PERFORM set_config('role','supabase_admin',true);
END $$;ROLLBACK;`;
const r=spawnSync('docker',['exec','-i','supabase-db','psql','-X','-q','-U','supabase_admin','-d',state.stage,'-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true});
if(r.status!==0)throw Error(r.stderr);
console.log('PASS service reviews: owner read/write, batch rollback, pending moderation, replay and conflicting retry; fixtures rolled back.');
