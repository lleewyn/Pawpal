const fs=require('node:fs'),{connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--verify-cloud')){console.log('Use --verify-cloud for installed checkout deferred-constraint checks in rollback.');process.exit(0);}
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='2s'");
 await db.query(`DO $$ DECLARE
  product uuid:=gen_random_uuid();variant uuid:=gen_random_uuid();order_id uuid:=gen_random_uuid();category uuid;method uuid;owner_id uuid;
  token_hash text:=repeat(replace(gen_random_uuid()::text,'-',''),2);details jsonb:='{"delivery":false,"discount_mode":"none"}';lines jsonb;q jsonb;receipt jsonb;rejected boolean:=false;
 BEGIN
  SELECT id INTO category FROM public.product_category ORDER BY id LIMIT 1;
  SELECT id INTO method FROM public.payment_method_config WHERE available AND fee=0 AND lower(short_name) IN('cod','cash','bank transfer','vietqr') ORDER BY id LIMIT 1;
  IF category IS NULL OR method IS NULL THEN RAISE EXCEPTION 'catalog_or_manual_method_missing';END IF;
  INSERT INTO public.product(id,category_id,product_name,unit,slug) VALUES(product,category,'Deferred checkout probe','Cai','g115-commit-'||product);
  INSERT INTO public.product_variant(id,product_id,sku_variant,cost_price,sale_price) VALUES(variant,product,'G115-COMMIT-'||variant,30000,50000);
  INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,idempotency_key,note) VALUES(variant,'opening',2,'g115-commit-stock:'||variant,'Rollback probe');
  lines:=jsonb_build_array(jsonb_build_object('variant_id',variant,'quantity',1));
  BEGIN
   PERFORM public.guest_sales_quote(token_hash,details,jsonb_build_array(jsonb_build_object('variant_id',variant,'quantity',1,'unit_price',1)));
  EXCEPTION WHEN invalid_parameter_value THEN rejected:=true;END;
  IF NOT rejected THEN RAISE EXCEPTION 'client_price_not_rejected_by_rpc';END IF;
  q:=public.guest_sales_quote(token_hash,details,lines);
  PERFORM public.guest_sales_create(token_hash,now()+interval '1 day',order_id,q->>'version',jsonb_build_object('name','Deferred checkout probe','phone','0950000001'),details,lines,method);
  SET CONSTRAINTS ALL IMMEDIATE;
  receipt:=public.guest_sales_receipt(token_hash,order_id);
  IF receipt->>'paymentStatus'<>'pending' OR (receipt->>'paidAmount')::numeric<>0 THEN RAISE EXCEPTION 'pending_payment_incorrect';END IF;
  SELECT customer_id INTO owner_id FROM public.sales_order WHERE id=order_id;
  INSERT INTO public.payment(payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,idempotency_key,order_id,succeeded_at)
   VALUES('PART-'||order_id,owner_id,method,'collection',1000,'succeeded','g115-partial-commit:'||order_id,order_id,now());
  receipt:=public.guest_sales_receipt(token_hash,order_id);
  IF receipt->>'paymentStatus'<>'partial' OR (receipt->>'paidAmount')::numeric<>1000 THEN RAISE EXCEPTION 'partial_payment_incorrect';END IF;
  INSERT INTO public.payment(payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,idempotency_key,order_id,succeeded_at)
   VALUES('FINAL-'||order_id,owner_id,method,'collection',49000,'succeeded','g115-final-commit:'||order_id,order_id,now());
  receipt:=public.guest_sales_receipt(token_hash,order_id);
  IF receipt->>'paymentStatus'<>'paid' OR (receipt->>'paidAmount')::numeric<>50000 THEN RAISE EXCEPTION 'full_payment_incorrect';END IF;
 END $$`);
 await db.query('ROLLBACK');fs.writeFileSync('docs/verification/sync/guest-sales-constraints-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks:['RPC rejects forged unit price directly','Guest order/hold/payment passes all deferred constraints forced immediate','Pending, partial and fully collected receipt states match actual amounts'],scope:'Installed SQL RPC, synthetic product/stock/contact/order/payment fixtures; deferred constraints explicitly fired then all data rolled back; no real gateway/Auth/commit/Realtime/UI or refund lifecycle acceptance'},null,2)+'\n');
 console.log('PASS direct price guard and deferred constraints; pending/partial/paid receipts correct; all fixtures rolled back.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
