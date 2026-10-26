DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); policy uuid:=gen_random_uuid(); owner uuid; BEGIN
 INSERT INTO auth.users(id) VALUES(u),(outsider);
 INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Kiểm tra thao tác chat','QA',u,'active',false);
 INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
 SELECT id INTO owner FROM public.customer ORDER BY id LIMIT 1;
 INSERT INTO public.chat_conversation(id,customer_id,status,assigned_staff_id,channel,sentiment_level,sentiment_trend) VALUES(c,owner,'agent_handling',s,'web',1,'stable');
 INSERT INTO public.chat_message(conversation_id,sender_type,content,raw_content,is_toxic,sentiment_score,metadata)
 SELECT c,'system',repeat('x',1000),'RAW-SECRET',false,0,'{}'::jsonb FROM generate_series(1,13);
 INSERT INTO public.chatbot_compensation_policy(id,issue_type,max_points,max_discount_vnd,approval_required,description,is_active) VALUES(policy,'Kiểm tra hoàn tác',10,0,false,'Chính sách thử',true);
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('pawpal.test.chat',c::text,true);PERFORM set_config('pawpal.test.policy',policy::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE c public.chat_conversation; policy uuid:=current_setting('pawpal.test.policy')::uuid; request uuid:=gen_random_uuid(); r jsonb; n integer; BEGIN
 SELECT id,updated_at INTO c.id,c.updated_at FROM public.chat_conversation WHERE id=current_setting('pawpal.test.chat')::uuid;
 r:=public.admin_copilot_chat_context(c.id);
 IF jsonb_array_length(r)<>12 OR r::text LIKE '%RAW-SECRET%' OR EXISTS(SELECT 1 FROM jsonb_array_elements(r) x WHERE length(x->>'content')>800 OR x ? 'raw_content') THEN RAISE EXCEPTION 'Masked chat context size/privacy failed'; END IF;
 BEGIN PERFORM public.adjust_admin_chat_points(gen_random_uuid(),c.id,c.updated_at-interval '1 second',policy,5);RAISE EXCEPTION 'Stale case version accepted';EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL;END;
 BEGIN PERFORM public.adjust_admin_chat_points(gen_random_uuid(),c.id,c.updated_at,policy,11);RAISE EXCEPTION 'Policy limit ignored';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 r:=public.adjust_admin_chat_points(request,c.id,c.updated_at,policy,5);
 PERFORM public.adjust_admin_chat_points(request,c.id,c.updated_at,policy,5);
 SELECT count(*) INTO n FROM public.paw_point_transaction WHERE id=(r->>'id')::uuid;
 IF n<>1 THEN RAISE EXCEPTION 'Duplicate chat award'; END IF;
 BEGIN PERFORM public.adjust_admin_chat_points(request,c.id,c.updated_at,policy,6);RAISE EXCEPTION 'Changed replay accepted';EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 BEGIN PERFORM public.adjust_admin_chat_points(gen_random_uuid(),c.id,c.updated_at,policy,5);RAISE EXCEPTION 'Non-owner accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
UPDATE public.chatbot_compensation_policy SET approval_required=true WHERE id=current_setting('pawpal.test.policy')::uuid;
DO $$ DECLARE u uuid; BEGIN SELECT s.auth_user_id INTO u FROM public.chat_conversation c JOIN public.staff s ON s.id=c.assigned_staff_id WHERE c.id=current_setting('pawpal.test.chat')::uuid;PERFORM set_config('request.jwt.claim.sub',u::text,true);END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE c public.chat_conversation; BEGIN
 SELECT id,updated_at INTO c.id,c.updated_at FROM public.chat_conversation WHERE id=current_setting('pawpal.test.chat')::uuid;
 BEGIN PERFORM public.adjust_admin_chat_points(gen_random_uuid(),c.id,c.updated_at,current_setting('pawpal.test.policy')::uuid,5);RAISE EXCEPTION 'Required approval bypassed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
