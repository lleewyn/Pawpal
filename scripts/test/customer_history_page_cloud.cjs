const fs=require('node:fs');const{connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 const migration=fs.readFileSync('scripts/database/v1/239_customer_history_pages.sql','utf8');
 if(process.argv.includes('--apply')){await db.query(migration);console.log('Applied owner history paging RPC.');return;}
 await db.query(migration.replace(/COMMIT;\s*$/,'')+`
 DO $$ DECLARE u uuid:=gen_random_uuid();other uuid:=gen_random_uuid();c uuid:=gen_random_uuid();oc uuid:=gen_random_uuid();p uuid:=gen_random_uuid();prefix text:=gen_random_uuid()::text;r jsonb;first_ids jsonb;BEGIN
 INSERT INTO auth.users(id) VALUES(u),(other);
 INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES(c,u,'PAGE-'||c),(oc,other,'PAGE-'||oc);
 INSERT INTO public.pet_profile(id,pet_code,customer_id,pet_name,breed_id) SELECT p,'PAGE-'||p,c,'Bé kiểm tra',id FROM public.pet_breed WHERE is_active ORDER BY id LIMIT 1;
 INSERT INTO public.sales_order(order_code,customer_id,order_status,created_at) SELECT prefix||'-'||i,c,CASE WHEN i%2=0 THEN 'cancelled' ELSE 'pending' END,now()-i*interval '1 second' FROM generate_series(1,23)i;
 INSERT INTO public.sales_order(order_code,customer_id) VALUES(prefix||'-other',oc);
 INSERT INTO public.appointment(appointment_code,customer_id,pet_id,appointment_status,scheduled_start_at,scheduled_end_at) SELECT prefix||'-'||i,c,p,'pending',now()+(i+20)*interval '1 day',now()+(i+20)*interval '1 day'+interval '1 hour' FROM generate_series(1,23)i;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);PERFORM set_config('request.jwt.claim.role','authenticated',true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 r:=public.own_history_page('orders','all','',1);first_ids:=r->'ids';
 IF (r->>'total')::integer<>23 OR jsonb_array_length(r->'ids')<>10 OR (r->'counts'->>'all')::integer<>23 OR jsonb_array_length(r->'summaries')<>10 THEN RAISE EXCEPTION 'order_page_one';END IF;
 r:=public.own_history_page('orders','all','',3);IF jsonb_array_length(r->'ids')<>3 THEN RAISE EXCEPTION 'order_page_last';END IF;
 r:=public.own_history_page('orders','pending','',1);IF (r->>'total')::integer<>12 THEN RAISE EXCEPTION 'order_filter';END IF;
 r:=public.own_history_page('orders','all',prefix||'-23',1);IF (r->>'total')::integer<>1 OR (r->'counts'->>'all')::integer<>23 THEN RAISE EXCEPTION 'order_search_counts';END IF;
 r:=public.own_history_page('bookings','all','',3);IF (r->>'total')::integer<>23 OR jsonb_array_length(r->'ids')<>3 THEN RAISE EXCEPTION 'booking_page %',r->>'total';END IF;
 PERFORM set_config('request.jwt.claim.sub',other::text,true);r:=public.own_history_page('orders','all','',1);
 IF (r->>'total')::integer<>1 OR r->>'owner'<>oc::text OR first_ids ? (r->'ids'->>0) THEN RAISE EXCEPTION 'owner_isolation';END IF;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.own_history_page('orders');RAISE EXCEPTION 'anonymous_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 END $$;
 ROLLBACK;`);
 console.log('PASS owner pages: 23 rows, 10/10/3 pages, filters/search, global counts, scoped summaries, booking pages, owner isolation and anonymous denial; rolled back.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||'',e.message);process.exitCode=1;});
