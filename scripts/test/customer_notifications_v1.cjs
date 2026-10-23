const fs=require('node:fs'),{spawnSync}=require('node:child_process'),{state}=require('./customer_completion_helpers.cjs');
const ddl=fs.readFileSync('scripts/database/v1/076_customer_public_details_notifications.sql','utf8').replace(/^BEGIN;|^COMMIT;/gm,'');
const query=`BEGIN;${ddl}
DO $$ DECLARE uid uuid:=gen_random_uuid();cid uuid:=gen_random_uuid();otheruid uuid:=gen_random_uuid();othercid uuid:=gen_random_uuid();a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();cutoff timestamptz:=now();BEGIN
 INSERT INTO auth.users(id) VALUES(uid),(otheruid);INSERT INTO public.customer(id,auth_user_id,customer_code,customer_status) VALUES(cid,uid,'TEST-'||cid,'active'),(othercid,otheruid,'TEST-'||othercid,'active');
 INSERT INTO public.customer_profile(customer_id,full_name) VALUES(cid,'Notice fixture'),(othercid,'Other fixture');
 INSERT INTO public.notification(id,customer_id,notification_type,title,content,sent_at) VALUES(a,cid,'verification','Own','Own body',now()-interval '1 second'),(b,othercid,'verification','Foreign','Foreign body',now());
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);PERFORM set_config('role','authenticated',true);
 IF jsonb_array_length(public.own_notifications_snapshot()->'rows')<>1 OR public.own_notifications_snapshot()::text LIKE '%Foreign%' THEN RAISE EXCEPTION 'Ownership leak';END IF;
 BEGIN PERFORM public.mark_own_notifications_read(b,NULL,cid);RAISE EXCEPTION 'Foreign write accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 IF public.mark_own_notifications_read(a,NULL,cid)<>1 OR public.mark_own_notifications_read(a,NULL,cid)<>0 THEN RAISE EXCEPTION 'Read/retry mismatch';END IF;
 BEGIN PERFORM public.mark_own_notifications_read(NULL,now()+interval '1 day',cid);RAISE EXCEPTION 'Future cutoff accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub',otheruid::text,true);
 BEGIN PERFORM public.mark_own_notifications_read(NULL,cutoff,cid);RAISE EXCEPTION 'Wrong account accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('role','supabase_admin',true);
 IF (SELECT read_at FROM public.notification WHERE id=b) IS NOT NULL THEN RAISE EXCEPTION 'Foreign changed';END IF;
 IF has_function_privilege('anon','public.own_notifications_snapshot()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous read';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.customer_shop_catalog()) p WHERE (p->>'review_count')::bigint<>(SELECT count(*) FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id=(p->>'id')::uuid AND r.review_status IN ('da_duyet','approved','published'))) THEN RAISE EXCEPTION 'Public aggregate mismatch';END IF;
END $$;ROLLBACK;`;
const r=spawnSync('docker',['exec','-i','supabase-db','psql','-X','-q','-U','supabase_admin','-d',state.stage,'-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',windowsHide:true});if(r.status)throw Error(r.stderr);console.log('PASS isolated notification ownership/read/retry/cutoff and public product aggregates; rolled back.');
