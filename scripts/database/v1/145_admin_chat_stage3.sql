BEGIN;
-- Closed, caller-scoped read catalog. No question supplies SQL identifiers.
CREATE OR REPLACE FUNCTION public.run_admin_stage3_read(p_lease uuid,p_tool text,p_filters jsonb,p_max_bytes integer DEFAULT 32768)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE allowed text[]; permissions text[]; statuses text[]; stmt text; result jsonb;
 q text; a timestamptz; b timestamptz; pg integer:=1; perm text; notes jsonb:='[]';
BEGIN
 IF p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 1 AND 32768 OR p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR octet_length(p_filters::text)>2000 THEN RAISE EXCEPTION 'invalid_chat_read' USING ERRCODE='22023'; END IF;
 CASE p_tool
 WHEN 'customer.pets' THEN allowed:=ARRAY['query'];permissions:=ARRAY['customer.read','customer_profile.read','customer_phone.read','pet_profile.read','pet_breed.read','pet_species.read'];
 WHEN 'pet.lookup' THEN allowed:=ARRAY['query'];permissions:=ARRAY['pet_profile.read','pet_breed.read','pet_species.read'];
 WHEN 'payment.order' THEN allowed:=ARRAY['query'];permissions:=ARRAY['sales_order.read','payment.read','refund_transaction.read'];
 WHEN 'order.refund_pending' THEN allowed:=ARRAY['start_at','end_at'];permissions:=ARRAY['sales_order.read','payment.read','refund_transaction.read'];
 WHEN 'appointment.search' THEN allowed:=ARRAY['start_at','end_at','category','status','day_part','unassigned'];permissions:=ARRAY['appointment.read','appointment_item.read','service.read','service_category.read'];statuses:=ARRAY['pending','confirmed','checked_in','in_progress','completed','cancelled','no_show'];
 WHEN 'ticket.lookup' THEN allowed:=ARRAY['query'];permissions:=ARRAY['support_ticket.read'];
 WHEN 'conversation.list' THEN allowed:=ARRAY['query','start_at','end_at','status'];permissions:=ARRAY['chat_conversation.read','chat_message.read','customer.read','customer_profile.read'];statuses:=ARRAY['bot_handling','waiting_agent','agent_handling','resolved','closed','completed','blocked'];
 WHEN 'points.lookup' THEN allowed:=ARRAY['query'];permissions:=ARRAY['customer.read','customer_profile.read','customer_phone.read','paw_point_transaction.read'];
 WHEN 'offer.list' THEN allowed:=ARRAY['query'];permissions:=ARRAY['voucher.read','promotion.read'];
 WHEN 'staff.lookup' THEN allowed:=ARRAY['query','status'];permissions:=ARRAY['staff.read'];statuses:=ARRAY['active','inactive','terminated'];
 WHEN 'staff.schedule' THEN allowed:=ARRAY['query','start_at','end_at'];permissions:=ARRAY['staff.read','staff_schedule.read'];
 WHEN 'review.list' THEN allowed:=ARRAY['query','start_at','end_at','rating_max'];permissions:=ARRAY['review.read'];
 WHEN 'content.list' THEN allowed:=ARRAY['query','status'];permissions:=ARRAY['blog_post.read'];statuses:=ARRAY['draft','pending','published','archived'];
 WHEN 'report.operations' THEN allowed:=ARRAY['start_at','end_at'];permissions:=ARRAY['sales_order.read','appointment.read','support_ticket.read'];
 WHEN 'settings.read' THEN allowed:=ARRAY['query'];permissions:=ARRAY['pawpal_setting.read'];
 ELSE RAISE EXCEPTION 'unsupported_chat_read' USING ERRCODE='22023';
 END CASE;
 allowed:=allowed||ARRAY['page'];
 IF EXISTS(SELECT 1 FROM jsonb_each(p_filters) e WHERE NOT e.key=ANY(allowed) OR jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>120 OR (e.value#>>'{}') ~ '[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_chat_filter' USING ERRCODE='22023'; END IF;
 IF p_filters ? 'page' THEN
  IF p_filters->>'page' !~ '^[1-9][0-9]{0,4}$' THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023'; END IF;
  pg:=(p_filters->>'page')::integer;
  IF pg>10000 THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023'; END IF;
 END IF;
 q:=public.admin_sales_search_text(coalesce(p_filters->>'query',''));
 IF p_tool IN ('customer.pets','pet.lookup','payment.order','ticket.lookup','points.lookup') AND length(trim(q))<3 THEN RAISE EXCEPTION 'chat_query_required' USING ERRCODE='22023'; END IF;
 IF (p_filters ? 'status' AND NOT coalesce(p_filters->>'status'=ANY(statuses),false))
 OR (p_filters ? 'category' AND p_filters->>'category' NOT IN ('grooming_spa','pet_hotel','pet_taxi'))
 OR (p_filters ? 'day_part' AND p_filters->>'day_part' NOT IN ('morning','afternoon','evening'))
 OR (p_filters ? 'unassigned' AND p_filters->>'unassigned' NOT IN ('true','false'))
 OR (p_filters ? 'rating_max' AND p_filters->>'rating_max' !~ '^[1-5]$') THEN RAISE EXCEPTION 'invalid_chat_filter' USING ERRCODE='22023'; END IF;
 IF p_filters ? 'start_at' OR p_filters ? 'end_at' OR p_tool IN ('appointment.search','staff.schedule','review.list','report.operations') THEN
  a:=(p_filters->>'start_at')::timestamptz;b:=(p_filters->>'end_at')::timestamptz;
  IF a IS NULL OR b IS NULL OR NOT isfinite(a) OR NOT isfinite(b) OR b<=a OR b>a+interval '31 days' THEN RAISE EXCEPTION 'invalid_chat_period' USING ERRCODE='22023'; END IF;
 END IF;
 FOREACH perm IN ARRAY permissions LOOP
  IF NOT pawpal_private.has_permission(perm) THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 END LOOP;
 PERFORM pawpal_private.admit_chat_read_source(p_lease);
 CASE p_tool
 WHEN 'customer.pets','pet.lookup' THEN
 stmt:=$q$ SELECT p.id::text key,p.pet_code sort_key,jsonb_build_object('code',p.pet_code,'name',p.pet_name,'breed',concat_ws(' / ',s.species_name,b.breed_name),'notes',left(concat_ws('; ',nullif(p.allergy,''),nullif(p.safety_note,'')),600),'truncated',length(concat_ws('; ',p.allergy,p.safety_note))>600) record
 FROM public.pet_profile p LEFT JOIN public.pet_breed b ON b.id=p.breed_id LEFT JOIN public.pet_species s ON s.id=b.species_id
 WHERE $q$ || CASE WHEN p_tool='pet.lookup' THEN $q$ strpos(public.admin_sales_search_text(concat_ws(' ',p.pet_code,p.pet_name)),$1)>0 $q$ ELSE $q$ EXISTS(SELECT 1 FROM public.customer c LEFT JOIN public.customer_profile cp ON cp.customer_id=c.id WHERE c.id=p.customer_id AND (strpos(public.admin_sales_search_text(concat_ws(' ',c.customer_code,cp.full_name)),$1)>0 OR EXISTS(SELECT 1 FROM public.customer_phone ph WHERE ph.customer_id=c.id AND strpos(public.admin_sales_search_text(ph.phone_number),$1)>0))) $q$ END;
 WHEN 'payment.order','order.refund_pending' THEN
 stmt:=$q$ SELECT o.id::text key,o.order_code sort_key,jsonb_build_object('code',o.order_code,'collected',pay.amount,'refunded',ref.amount,'net',pay.amount-ref.amount,'pending_refunds',ref.pending) record
 FROM public.sales_order o
 CROSS JOIN LATERAL(SELECT coalesce(sum(p.amount) FILTER(WHERE p.transaction_status='succeeded'),0) amount FROM public.payment p WHERE p.order_id=o.id) pay
 CROSS JOIN LATERAL(SELECT coalesce(sum(r.refunded_amount) FILTER(WHERE r.refund_status='succeeded'),0) amount,count(*) FILTER(WHERE r.refund_status IN ('pending','approved','processing')) pending FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.order_id=o.id) ref
 WHERE $q$||CASE WHEN p_tool='payment.order' THEN $q$ strpos(public.admin_sales_search_text(o.order_code),$1)>0 $q$ ELSE $q$ o.order_status='cancelled' AND pay.amount>ref.amount AND ($2 IS NULL OR o.created_at >= $2 AND o.created_at < $3) $q$ END;
 notes:='["Đã thu: giao dịch succeeded; đã hoàn: yêu cầu succeeded. Chênh lệch là số đã thu trừ số đã hoàn, không phải khoản hoàn đã được phê duyệt.","Khoảng ngày nếu có lọc theo ngày tạo đơn; dữ liệu không có mốc hủy đơn riêng."]';
 WHEN 'appointment.search' THEN
 stmt:=$q$ SELECT a.id::text key,a.scheduled_start_at::text||a.id::text sort_key,jsonb_build_object('code',a.appointment_code,'status',a.appointment_status,'scheduled_at',a.scheduled_start_at,'services',left((SELECT string_agg(ai.name_snapshot,', ' ORDER BY ai.id) FROM public.appointment_item ai WHERE ai.appointment_id=a.id AND ai.status<>'cancelled'),600)) record
 FROM public.appointment a WHERE a.scheduled_start_at >= $2 AND a.scheduled_start_at < $3
 AND (NOT $4 ? 'status' OR a.appointment_status=$4->>'status')
 AND (NOT $4 ? 'category' OR EXISTS(SELECT 1 FROM public.appointment_item ai JOIN public.service s ON s.id=ai.service_id JOIN public.service_category sc ON sc.id=s.category_id WHERE ai.appointment_id=a.id AND ai.status<>'cancelled' AND sc.category_code=$4->>'category'))
 AND (NOT $4 ? 'day_part' OR CASE $4->>'day_part' WHEN 'morning' THEN extract(hour FROM a.scheduled_start_at AT TIME ZONE 'Asia/Ho_Chi_Minh')<12 WHEN 'afternoon' THEN extract(hour FROM a.scheduled_start_at AT TIME ZONE 'Asia/Ho_Chi_Minh')>=12 AND extract(hour FROM a.scheduled_start_at AT TIME ZONE 'Asia/Ho_Chi_Minh')<18 ELSE extract(hour FROM a.scheduled_start_at AT TIME ZONE 'Asia/Ho_Chi_Minh')>=18 END)
 AND (NOT $4 ? 'unassigned' OR (a.staff_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.appointment_item ai WHERE ai.appointment_id=a.id AND ai.status<>'cancelled' AND ai.staff_id IS NOT NULL))=($4->>'unassigned')::boolean) $q$;
 notes:='["Buổi sáng 00–12h, chiều 12–18h, tối 18–24h theo giờ Việt Nam; lọc theo giờ bắt đầu lịch.","Chưa có KTV: cả lịch và mọi hạng mục chưa hủy đều chưa được phân công."]';
 WHEN 'ticket.lookup' THEN
 stmt:=$q$ SELECT t.id::text key,t.ticket_code sort_key,jsonb_build_object('code',t.ticket_code,'name',left(t.subject,400),'status',t.status) record FROM public.support_ticket t WHERE strpos(public.admin_sales_search_text(concat_ws(' ',t.ticket_code,t.subject)),$1)>0 $q$;
 WHEN 'conversation.list' THEN
 stmt:=$q$ SELECT c.id::text key,c.updated_at::text||c.id::text sort_key,jsonb_build_object('code',c.id,'name',coalesce(cp.full_name,'Khách vãng lai'),'status',c.status,'detail',left((SELECT m.content FROM public.chat_message m WHERE m.conversation_id=c.id AND m.sender_type IN ('customer','bot','staff') ORDER BY m.created_at DESC,m.id DESC LIMIT 1),160)) record FROM public.chat_conversation c LEFT JOIN public.customer cu ON cu.id=c.customer_id LEFT JOIN public.customer_profile cp ON cp.customer_id=cu.id WHERE ($2 IS NULL OR c.created_at >= $2 AND c.created_at < $3) AND (NOT $4 ? 'status' OR c.status=$4->>'status') AND ($1='' OR strpos(public.admin_sales_search_text(concat_ws(' ',c.id,cu.customer_code,cp.full_name)),$1)>0) $q$;
 WHEN 'points.lookup' THEN
 stmt:=$q$ SELECT c.id::text key,c.customer_code sort_key,jsonb_build_object('code',c.customer_code,'name',cp.full_name,'balance',coalesce((SELECT sum(pt.points) FROM public.paw_point_transaction pt WHERE pt.customer_id=c.id),0)) record FROM public.customer c LEFT JOIN public.customer_profile cp ON cp.customer_id=c.id WHERE strpos(public.admin_sales_search_text(concat_ws(' ',c.customer_code,cp.full_name)),$1)>0 OR EXISTS(SELECT 1 FROM public.customer_phone ph WHERE ph.customer_id=c.id AND strpos(public.admin_sales_search_text(ph.phone_number),$1)>0) $q$;
 WHEN 'offer.list' THEN
 stmt:=$q$ SELECT 'voucher:'||v.id::text key,v.voucher_code sort_key,jsonb_build_object('code',v.voucher_code,'name',left(v.voucher_name,300),'detail',left(v.description,400)) record FROM public.voucher v WHERE v.is_active AND (v.start_date IS NULL OR v.start_date<=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND (v.end_date IS NULL OR v.end_date>=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND ($1='' OR strpos(public.admin_sales_search_text(concat_ws(' ',v.voucher_code,v.voucher_name)),$1)>0)
 UNION ALL SELECT 'promotion:'||p.id::text,p.promotion_name,jsonb_build_object('code',p.id,'name',left(p.promotion_name,300),'detail',left(p.description,400)) FROM public.promotion p WHERE p.status='active' AND (p.start_date IS NULL OR p.start_date<=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND (p.end_date IS NULL OR p.end_date>=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND ($1='' OR strpos(public.admin_sales_search_text(p.promotion_name),$1)>0) $q$;
 notes:='["Đây là ưu đãi đang hiệu lực; chưa xác nhận điều kiện áp dụng cho khách hoặc đơn cụ thể."]';
 WHEN 'staff.lookup' THEN
 stmt:=$q$ SELECT s.id::text key,s.full_name sort_key,jsonb_build_object('code',s.id,'name',s.full_name,'status',s.employment_status,'detail',s.job_title) record FROM public.staff s WHERE ($1='' OR strpos(public.admin_sales_search_text(s.full_name),$1)>0) AND (NOT $4 ? 'status' OR s.employment_status=$4->>'status') $q$;
 WHEN 'staff.schedule' THEN
 stmt:=$q$ SELECT ss.id::text key,ss.start_at::text||ss.id::text sort_key,jsonb_build_object('code',ss.id,'name',s.full_name,'start_at',ss.start_at,'end_at',ss.end_at,'status',ss.availability_status) record FROM public.staff_schedule ss JOIN public.staff s ON s.id=ss.staff_id WHERE ss.start_at < $3 AND ss.end_at > $2 AND ($1='' OR strpos(public.admin_sales_search_text(s.full_name),$1)>0) $q$;
 notes:='["Lịch trực có thời gian giao với khoảng tra cứu; không hiển thị lý do nghỉ cá nhân."]';
 WHEN 'review.list' THEN
 stmt:=$q$ SELECT r.id::text key,r.created_at::text||r.id::text sort_key,jsonb_build_object('code',r.id,'rating',r.rating,'status',r.review_status,'excerpt',left(r.review_content,400),'truncated',length(r.review_content)>400) record FROM public.review r WHERE r.created_at >= $2 AND r.created_at < $3 AND (NOT $4 ? 'rating_max' OR r.rating<=($4->>'rating_max')::integer) AND ($1='' OR strpos(public.admin_sales_search_text(r.review_content),$1)>0) $q$;
 WHEN 'content.list' THEN
 stmt:=$q$ SELECT b.id::text key,b.title||b.id::text sort_key,jsonb_build_object('code',b.id,'name',left(b.title,400),'status',b.status,'detail',left(b.summary,400),'truncated',length(b.summary)>400) record FROM public.blog_post b WHERE ($1='' OR strpos(public.admin_sales_search_text(concat_ws(' ',b.title,b.slug)),$1)>0) AND (NOT $4 ? 'status' OR b.status=$4->>'status') $q$;
 WHEN 'report.operations' THEN
 stmt:=$q$ SELECT code key,code sort_key,jsonb_build_object('code',code,'name',name,'count',n) record FROM (SELECT 'orders_created' code,'Đơn được tạo' name,count(*) n FROM public.sales_order WHERE created_at >= $2 AND created_at < $3 UNION ALL SELECT 'appointments_scheduled','Lịch hẹn bắt đầu',count(*) FROM public.appointment WHERE scheduled_start_at >= $2 AND scheduled_start_at < $3 UNION ALL SELECT 'tickets_created','Phiếu hỗ trợ được tạo',count(*) FROM public.support_ticket WHERE created_at >= $2 AND created_at < $3) x $q$;
 notes:='["Ba chỉ số độc lập; không cộng thành một tổng nghiệp vụ. Đơn/phiếu theo ngày tạo, lịch theo giờ bắt đầu."]';
 WHEN 'settings.read' THEN
 stmt:=$q$ SELECT x.code key,x.code sort_key,jsonb_build_object('code',x.code,'value',left(x.value,400),'truncated',length(x.value)>400) record FROM public.pawpal_setting s CROSS JOIN LATERAL(VALUES
 ('store_name',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{storeInfo,brandName}'),('hotline',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{storeInfo,hotline}'),('address',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{storeInfo,address}'),
 ('weekday_open',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{operatingHours,weekday,open}'),('weekday_close',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{operatingHours,weekday,close}'),('weekend_open',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{operatingHours,weekend,open}'),('weekend_close',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{operatingHours,weekend,close}'),('free_cancel_hours',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{bookingPolicy,freeCancelHours}'),('slot_capacity',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{bookingPolicy,slotCapacityMax}')) x(code,value)
 WHERE s.setting_key='system_config' AND x.value IS NOT NULL AND ($1='' OR strpos(x.code,$1)>0) $q$;
 END CASE;
 -- Constant query templates only. Parameters remain parameters even for count/paging.
 EXECUTE 'WITH matched AS NOT MATERIALIZED ('||stmt||'), bounds AS (SELECT count(*) total,least($5,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched), rows AS (SELECT record FROM matched ORDER BY sort_key,key LIMIT 10 OFFSET (SELECT (page-1)*10 FROM bounds)) SELECT jsonb_build_object(''total'',total,''page'',page,''pages'',greatest(1,ceil(total/10.0)::integer),''items'',coalesce((SELECT jsonb_agg(record) FROM rows),''[]''::jsonb)) FROM bounds'
 INTO result USING q,a,b,p_filters,pg;
 result:=result||jsonb_build_object('intent',p_tool,'source','Supabase / caller RLS','as_of',clock_timestamp(),'scope',jsonb_build_object('start_at',a,'end_at',b,'time_zone','Asia/Ho_Chi_Minh'),'limitations',notes);
 IF octet_length(convert_to(result::text,'UTF8'))>p_max_bytes THEN RAISE EXCEPTION 'chat_read_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.run_admin_stage3_read(uuid,text,jsonb,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.run_admin_stage3_read(uuid,text,jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
