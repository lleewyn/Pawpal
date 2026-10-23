const fs=require('node:fs'),{spawnSync}=require('node:child_process'),{state}=require('./customer_completion_helpers.cjs');
const ddl=fs.readFileSync('scripts/database/v1/075_customer_wishlist.sql','utf8').replace(/^BEGIN;|^COMMIT;/gm,'');
const query=`BEGIN;${ddl}
DO $$ DECLARE uid uuid:=gen_random_uuid();cid uuid:=gen_random_uuid();otheruid uuid:=gen_random_uuid();othercid uuid:=gen_random_uuid();p uuid;s uuid;BEGIN
 INSERT INTO auth.users(id) VALUES(uid),(otheruid);
 INSERT INTO public.customer(id,auth_user_id,customer_code,customer_status) VALUES(cid,uid,'TEST-'||cid,'active'),(othercid,otheruid,'TEST-'||othercid,'active');
 INSERT INTO public.customer_profile(customer_id,full_name) VALUES(cid,'Wishlist verification'),(othercid,'Other verification');
 SELECT id INTO p FROM public.product WHERE status='active' LIMIT 1;SELECT id INTO s FROM public.service WHERE status='active' LIMIT 1;
 IF p IS NULL OR s IS NULL THEN RAISE EXCEPTION 'Missing restored catalog';END IF;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);PERFORM set_config('role','authenticated',true);
 PERFORM public.set_own_wishlist_item('product',p,true,cid);PERFORM public.set_own_wishlist_item('product',p,true,cid);
 PERFORM public.set_own_wishlist_item('service',s,true,cid);
 IF jsonb_array_length(public.own_wishlist_snapshot()->'products')<>1 OR jsonb_array_length(public.own_wishlist_snapshot()->'services')<>1 THEN RAISE EXCEPTION 'Duplicate or mixed types';END IF;
 PERFORM set_config('request.jwt.claim.sub',otheruid::text,true);
 IF jsonb_array_length(public.own_wishlist_snapshot()->'products')<>0 THEN RAISE EXCEPTION 'Foreign list exposed';END IF;
 BEGIN PERFORM public.set_own_wishlist_item('product',p,false,cid);RAISE EXCEPTION 'Wrong account accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 BEGIN PERFORM public.set_own_wishlist_item('unknown',p,true,cid);RAISE EXCEPTION 'Invalid kind accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM set_config('role','supabase_admin',true);UPDATE public.product SET status='inactive' WHERE id=p;PERFORM set_config('role','authenticated',true);
 IF jsonb_array_length(public.own_wishlist_snapshot()->'products')<>1 THEN RAISE EXCEPTION 'Inactive saved item lost';END IF;
 PERFORM public.set_own_wishlist_item('product',p,false,cid);PERFORM public.set_own_wishlist_item('product',p,false,cid);
 IF jsonb_array_length(public.own_wishlist_snapshot()->'products')<>0 OR jsonb_array_length(public.own_wishlist_snapshot()->'services')<>1 THEN RAISE EXCEPTION 'Remove affected other kind';END IF;
 BEGIN PERFORM public.set_own_wishlist_item('product',p,true,cid);RAISE EXCEPTION 'Inactive item accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 IF has_function_privilege('anon','public.set_own_wishlist_item(text,uuid,boolean,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Anon execute';END IF;
END $$;ROLLBACK;`;
const r=spawnSync('docker',['exec','-i','supabase-db','psql','-X','-q','-U','supabase_admin','-d',state.stage,'-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',windowsHide:true});if(r.status)throw Error(r.stderr);console.log('PASS restored wishlist owner, product/service isolation, idempotent save/remove, inactive items and anonymous denial; rolled back.');
