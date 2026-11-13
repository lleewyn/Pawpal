// Scoped business-function checks. Never reads Supabase infrastructure Logs.
const fs=require('node:fs');
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();const sql=query=>db.query(query);try{
if(process.argv.includes('--schema')){
 console.log((await sql("SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_log' ORDER BY ordinal_position")).rows);
 return;
}
const migration=['235_admin_audit_page.sql','236_admin_service_review_summary.sql','237_admin_service_review_page.sql','238_admin_settings_pages.sql'].map(name=>fs.readFileSync('scripts/database/v1/'+name,'utf8')).join('\n');
if(process.argv.includes('--apply')){await sql(migration);console.log('Applied admin audit pagination function.');return;}
await sql('BEGIN;\n'+migration.replace(/^BEGIN;\s*|^COMMIT;\s*$/gm,'')+`
DO $$ DECLARE u uuid:=gen_random_uuid();s uuid:=gen_random_uuid();prefix text:='Kiểm tra nhật ký '||translate(replace(gen_random_uuid()::text,'-',''),'0123456789','abcdefghij');vprefix text:='QA'||upper(left(replace(gen_random_uuid()::text,'-',''),12));r jsonb;n integer;BEGIN
 INSERT INTO auth.users(id) VALUES(u);
 INSERT INTO public.staff(id,full_name,phone_number,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,prefix,'09'||lpad(floor(random()*100000000)::text,8,'0'),'QA',u,'active',false);
 INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
 INSERT INTO public.audit_log(staff_id,action,entity_name,description,created_at)
 SELECT s,CASE WHEN i%2=0 THEN 'SETTINGS_WRITE' ELSE 'UPDATE' END,CASE WHEN i%2=0 THEN 'pawpal_setting' ELSE 'product' END,'Private detail must not be in page payload',now()-i*interval '1 second' FROM generate_series(1,23)i;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 r:=public.admin_audit_page(prefix,'all',1);
 IF (r->>'total')::integer<>23 OR jsonb_array_length(r->'rows')<>10 OR (r->>'page')::integer<>1 THEN RAISE EXCEPTION 'page_one';END IF;
 IF (r->'rows'->0) ? 'description' THEN RAISE EXCEPTION 'full_detail_leak';END IF;
 r:=public.admin_audit_page(prefix,'all',3);IF jsonb_array_length(r->'rows')<>3 THEN RAISE EXCEPTION 'last_page';END IF;
 r:=public.admin_audit_page(prefix,'Cấu hình',1);IF (r->>'total')::integer<>11 THEN RAISE EXCEPTION 'module_filter';END IF;
 r:=public.admin_audit_page(prefix,'all',999);IF (r->>'page')::integer<>3 THEN RAISE EXCEPTION 'page_clamp';END IF;
 r:=public.admin_audit_page(prefix||'-missing','all',1);IF (r->>'total')::integer<>0 OR jsonb_array_length(r->'rows')<>0 THEN RAISE EXCEPTION 'empty';END IF;
 SELECT count(*) INTO n FROM public.audit_log;IF (r->'stats'->>'total')::integer<>n THEN RAISE EXCEPTION 'global_count';END IF;
 r:=public.admin_service_review_summary();
 SELECT count(*) INTO n FROM public.review v JOIN public.appointment_item i ON i.id=v.appointment_item_id WHERE i.service_id IS NOT NULL AND v.rating BETWEEN 1 AND 5 AND v.rating=trunc(v.rating);
 IF coalesce((SELECT sum((x->>'review_count')::integer) FROM jsonb_array_elements(r)x),0)<>n THEN RAISE EXCEPTION 'review_summary_count';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(r)x WHERE (x->>'average_rating')::numeric IS DISTINCT FROM
  (SELECT avg(v.rating) FROM public.review v JOIN public.appointment_item i ON i.id=v.appointment_item_id WHERE i.service_id=(x->>'service_id')::uuid AND v.rating BETWEEN 1 AND 5 AND v.rating=trunc(v.rating))) THEN RAISE EXCEPTION 'review_summary_average';END IF;
 r:=public.admin_service_review_page('{}',1,10);
 SELECT count(*) INTO n FROM public.review v JOIN public.appointment_item i ON i.id=v.appointment_item_id JOIN public.appointment a ON a.id=i.appointment_id;
 IF (r->>'total')::integer<>n OR jsonb_array_length(r->'rows')>10 OR (r->'stats'->>'total')::integer<>n THEN RAISE EXCEPTION 'review_page_totals';END IF;
 r:=public.admin_service_review_page('{"star":"LOW"}',1,10);
 SELECT count(*) INTO n FROM public.review v JOIN public.appointment_item i ON i.id=v.appointment_item_id JOIN public.appointment a ON a.id=i.appointment_id WHERE v.rating BETWEEN 1 AND 3;
 IF (r->>'total')::integer<>n OR pawpal_private.fold_search('Đánh giá')<>'danh gia' THEN RAISE EXCEPTION 'review_filter_search';END IF;
 INSERT INTO public.blog_post(category_id,author_id,title,slug,content,status)
 SELECT c.id,s,prefix||' '||i,lower(vprefix)||'-'||i,'Nội dung kiểm thử','published' FROM (SELECT id FROM public.blog_category ORDER BY id LIMIT 1)c CROSS JOIN generate_series(1,23)i;
 INSERT INTO public.voucher(voucher_code,voucher_name,discount_value,start_date,end_date,type,applicable_for,max_usage)
 SELECT vprefix||i,prefix||' '||i,1000,current_date,current_date+30,'fixed','shop',CASE WHEN i=23 THEN NULL ELSE 100 END FROM generate_series(1,23)i;
 r:=public.admin_article_page('{}',1);
 SELECT count(*) INTO n FROM public.blog_post;
 IF (r->>'total')::integer<>n OR jsonb_array_length(r->'blogs')>10 OR EXISTS(SELECT 1 FROM jsonb_array_elements(r->'blogs')x WHERE x?'content') THEN RAISE EXCEPTION 'article_page';END IF;
 r:=public.admin_article_page(jsonb_build_object('query',prefix),3);
 IF (r->>'total')::integer<>23 OR jsonb_array_length(r->'blogs')<>3 THEN RAISE EXCEPTION 'article_search_last_page';END IF;
 r:=public.admin_promos_page(1,1,'{}');
 IF jsonb_array_length(r->'banners')>10 OR jsonb_array_length(r->'vouchers')>10 OR r?'redemptions' THEN RAISE EXCEPTION 'promos_page';END IF;
 r:=public.admin_promos_page(1,3,jsonb_build_object('query',prefix));
 IF (r->>'voucherTotal')::integer<>23 OR jsonb_array_length(r->'vouchers')<>3 THEN RAISE EXCEPTION 'voucher_search_last_page';END IF;
 r:=public.admin_promos_page(1,1,jsonb_build_object('query',prefix,'status','zero-miss'));
 IF (r->>'voucherTotal')::integer<>0 THEN RAISE EXCEPTION 'unlimited_is_not_exhausted';END IF;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.admin_audit_page();RAISE EXCEPTION 'anon_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_service_review_summary();RAISE EXCEPTION 'anon_summary_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_service_review_page();RAISE EXCEPTION 'anon_reviews_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_article_page();RAISE EXCEPTION 'anon_articles_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_promos_page();RAISE EXCEPTION 'anon_promos_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 UPDATE public.staff_role SET role_code='STAFF' WHERE staff_id=s;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 BEGIN PERFORM public.admin_service_review_page();RAISE EXCEPTION 'staff_reviews_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_article_page();RAISE EXCEPTION 'staff_articles_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_promos_page();RAISE EXCEPTION 'staff_promos_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 END $$;
ROLLBACK;`);
console.log('PASS audit/review/article/voucher pages, global totals, filters/search, bounded bodies and aggregate ratings; anonymous/staff denied. All fixtures rolled back.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||'',e.message);process.exitCode=1;});
