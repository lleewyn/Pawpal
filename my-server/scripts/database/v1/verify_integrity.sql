-- All fixtures are transaction-local and rolled back. No application seed/mock data.
BEGIN;
CREATE FUNCTION pg_temp.expect_error(statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement;
 EXCEPTION WHEN check_violation OR unique_violation OR foreign_key_violation OR raise_exception OR exclusion_violation OR insufficient_privilege THEN RETURN;
 END;
 RAISE EXCEPTION 'Expected rejection: %',statement;
END $$;
DO $$
DECLARE c uuid; c2 uuid; species uuid; breed uuid; pet uuid; service_cat uuid; service_id uuid; app uuid;
 order_key uuid; category_key uuid; product_key uuid; variant_key uuid; line_key uuid; paymethod uuid; pay_key uuid;
 v uuid; r uuid; staff_key uuid; auth_key uuid;
BEGIN
 INSERT INTO public.customer(customer_code) VALUES('VERIFY-C1') RETURNING id INTO c;
 INSERT INTO public.customer(customer_code) VALUES('VERIFY-C2') RETURNING id INTO c2;
 INSERT INTO public.customer_profile(customer_id,full_name) VALUES(c,'Schema verification');
 PERFORM pg_temp.expect_error(format('INSERT INTO public.customer_profile(customer_id,full_name) VALUES(%L,''Duplicate'')',c));
 INSERT INTO public.customer_phone(customer_id,phone_number,is_primary) VALUES(c,'0900000001',true);
 PERFORM pg_temp.expect_error(format('INSERT INTO public.customer_phone(customer_id,phone_number,is_primary) VALUES(%L,''0900000001'',true)',c2));
 INSERT INTO public.customer_phone(customer_id,phone_number,is_primary) VALUES(c2,'0900000001',false);
 INSERT INTO public.customer_phone(customer_id,phone_number,is_primary) VALUES(c2,'0900000002',true);
 INSERT INTO public.customer_address(customer_id,receiver_name,receiver_phone,province,street_address,is_default) VALUES(c,'Receiver','0900000001','Province','Address',true);
 PERFORM pg_temp.expect_error(format('INSERT INTO public.customer_address(customer_id,receiver_name,receiver_phone,province,street_address,is_default) VALUES(%L,''R'',''0900000001'',''P'',''A'',true)',c));
 INSERT INTO public.pet_species(species_name) VALUES('Verification species') RETURNING id INTO species;
 INSERT INTO public.pet_breed(species_id,breed_name) VALUES(species,'Verification breed') RETURNING id INTO breed;
 INSERT INTO public.pet_profile(customer_id,pet_code,pet_name,breed_id) VALUES(c,'VERIFY-PET','Verification pet',breed) RETURNING id INTO pet;
 INSERT INTO public.pet_weight_history(pet_id,weight,measured_at) VALUES(pet,8,now()-interval '1 day'),(pet,4,now()-interval '2 days');
 IF (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet)<>8 THEN RAISE EXCEPTION 'Current weight order incorrect'; END IF;
 PERFORM pg_temp.expect_error(format('INSERT INTO public.pet_weight_history(pet_id,weight) VALUES(%L,-1)',pet));
 INSERT INTO public.service_category(category_code,category_name) VALUES('VERIFY','Verification') RETURNING id INTO service_cat;
 INSERT INTO public.service(category_id,service_code,service_name,estimated_duration) VALUES(service_cat,'VERIFY-SERVICE','Verification',30) RETURNING id INTO service_id;
 INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status) VALUES(service_id,0,10,100,now(),'active');
 PERFORM pg_temp.expect_error(format('INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status) VALUES(%L,5,15,100,now(),''active'')',service_id));
 INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status) VALUES(service_id,10,20,100,now(),'active');
 PERFORM pg_temp.expect_error(format('INSERT INTO public.appointment(appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at) VALUES(''BAD'',%L,%L,now(),now()+interval ''1 hour'')',c2,pet));
 INSERT INTO public.appointment(appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at) VALUES('VERIFY-A',c,pet,now(),now()+interval '1 hour') RETURNING id INTO app;
 PERFORM pg_temp.expect_error(format('INSERT INTO public.appointment_item(appointment_id,name_snapshot,quantity,unit_price,duration_minutes,status) VALUES(%L,''Bad'',1,100,30,''active'')',app));
 INSERT INTO public.appointment_item(appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,duration_minutes,status) VALUES(app,service_id,true,'Snapshot',1,100,30,'active');
 INSERT INTO public.appointment_record(appointment_id,record_type,schema_version,recorded_by,condition_note,customer_confirmation_status,confirmed_at)
 SELECT app,'intake',1,id,'Condition','confirmed',now() FROM public.staff LIMIT 1;
 PERFORM pg_temp.expect_error(format('UPDATE public.appointment_record SET note=''Changed'' WHERE appointment_id=%L',app));
 INSERT INTO public.product_category(category_name) VALUES('Verification category') RETURNING id INTO category_key;
 INSERT INTO public.product(category_id,product_name,unit,slug) VALUES(category_key,'Verification product','item','verify-product') RETURNING id INTO product_key;
 INSERT INTO public.product_variant(product_id,sku_variant,cost_price,sale_price) VALUES(product_key,'VERIFY-SKU',10,100) RETURNING id INTO variant_key;
 PERFORM pg_temp.expect_error(format('INSERT INTO public.product_variant(product_id,sku_variant,cost_price,sale_price) VALUES(%L,''VERIFY-SKU2'',10,100)',product_key));
 INSERT INTO public.sales_order(customer_id,order_code,order_status) VALUES(c,'VERIFY-O','completed') RETURNING id INTO order_key;
 INSERT INTO public.sales_order_detail(order_id,product_variant_id,quantity,unit_price,product_name_snapshot,sku_snapshot) VALUES(order_key,variant_key,1,100,'Snapshot product','Snapshot SKU') RETURNING id INTO line_key;
 INSERT INTO public.payment_method_config(name,fee,available,requires_info) VALUES('Verification',0,true,false) RETURNING id INTO paymethod;
 PERFORM pg_temp.expect_error(format('INSERT INTO public.payment(payment_code,customer_id,payment_method_config_id,payment_type,amount,order_id,appointment_id,idempotency_key) VALUES(''BAD'',%L,%L,''full'',1,%L,%L,''BAD'')',c,paymethod,order_key,app));
 PERFORM pg_temp.expect_error(format('INSERT INTO public.payment(payment_code,customer_id,payment_method_config_id,payment_type,amount,order_id,idempotency_key) VALUES(''BAD2'',%L,%L,''full'',1,%L,''BAD2'')',c2,paymethod,order_key));
 INSERT INTO public.payment(payment_code,customer_id,payment_method_config_id,payment_type,amount,order_id,idempotency_key,transaction_status,succeeded_at,eligible_spend_amount) VALUES('VERIFY-PAY',c,paymethod,'full',100,order_key,'VERIFY-PAY','succeeded',now(),100) RETURNING id INTO pay_key;
 PERFORM pg_temp.expect_error(format('UPDATE public.payment SET amount=99 WHERE id=%L',pay_key));
 PERFORM pg_temp.expect_error(format('DELETE FROM public.payment WHERE id=%L',pay_key));
 PERFORM pg_temp.expect_error(format('INSERT INTO public.refund_transaction(refund_code,payment_id,refund_type,requested_amount,approved_amount,refunded_amount,refund_method,refund_status,completed_at,eligible_refund_amount) VALUES(''BAD-R'',%L,''full'',101,101,101,''original'',''succeeded'',now(),101)',pay_key));
 INSERT INTO public.refund_transaction(refund_code,payment_id,refund_type,requested_amount,approved_amount,refunded_amount,refund_method,refund_status,completed_at,eligible_refund_amount) VALUES('VERIFY-R',pay_key,'partial',20,20,20,'original','succeeded',now(),20);
 IF (SELECT eligible_spend FROM public.customer_eligible_spend WHERE customer_id=c)<>80 THEN RAISE EXCEPTION 'Eligible spend mismatch'; END IF;
 INSERT INTO public.paw_point_transaction(customer_id,points,idempotency_key,sequence_no) VALUES(c,10,'VERIFY-POINTS',1);
 PERFORM pg_temp.expect_error(format('INSERT INTO public.paw_point_transaction(customer_id,points,idempotency_key,sequence_no) VALUES(%L,-11,''BAD-POINTS'',2)',c));
 PERFORM pg_temp.expect_error(format('UPDATE public.paw_point_transaction SET points=20 WHERE customer_id=%L',c));
 INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,idempotency_key) VALUES(variant_key,'adjustment',5,'VERIFY-STOCK');
 IF (SELECT quantity_in_stock FROM public.inventory WHERE product_variant_id=variant_key)<>5 THEN RAISE EXCEPTION 'Inventory projection mismatch'; END IF;
 PERFORM pg_temp.expect_error(format('INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,idempotency_key) VALUES(%L,''adjustment'',-6,''BAD-STOCK'')',variant_key));
 INSERT INTO public.stock_reservation(product_variant_id,order_id,quantity,expires_at,status) VALUES(variant_key,order_key,4,now()+interval '1 hour','active');
 PERFORM pg_temp.expect_error(format('INSERT INTO public.stock_reservation(product_variant_id,order_id,quantity,expires_at,status) VALUES(%L,%L,2,now()+interval ''1 hour'',''active'')',variant_key,order_key));
 INSERT INTO public.return_request(sales_order_id,reason,return_type,request_status) VALUES(order_key,'Verification','return','pending') RETURNING id INTO r;
 PERFORM pg_temp.expect_error(format('INSERT INTO public.return_request_detail(return_request_id,sales_order_detail_id,quantity) VALUES(%L,%L,2)',r,line_key));
 INSERT INTO public.review(sales_order_detail_id,rating) VALUES(line_key,5);
 PERFORM pg_temp.expect_error(format('INSERT INTO public.review(sales_order_detail_id,rating) VALUES(%L,5)',line_key));
 PERFORM pg_temp.expect_error(format('INSERT INTO public.support_ticket(ticket_code,customer_id,order_id,channel,category,subject,priority,type) VALUES(''BAD-T'',%L,%L,''web'',''other'',''Verification'',''normal'',''request'')',c2,order_key));
 -- Fail deferred "at least one" within a subtransaction, then return to deferred mode.
 BEGIN
  DELETE FROM public.customer_phone WHERE customer_id=c AND is_primary;
  INSERT INTO public.customer_phone(customer_id,phone_number,is_primary) VALUES(c,'0900000009',false);
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'Expected missing primary error' USING ERRCODE='XX000';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 SET CONSTRAINTS ALL DEFERRED;
 SET CONSTRAINTS ALL IMMEDIATE;
 RAISE NOTICE 'PASS schema integrity: contacts, pet/weight, service ranges, XOR, snapshots, money, refunds, points, inventory/reservations, returns/reviews and ticket ownership';
END $$;
ROLLBACK;
