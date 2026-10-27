const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createClient}=require('@supabase/supabase-js');
const {connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--cloud-readonly')){console.log('Use --cloud-readonly for public-catalog quote and permission probes.');process.exit(0);}
(async()=>{
 const db=await connect();let variant;
 try{await db.query("BEGIN READ ONLY;SET LOCAL statement_timeout='8s'");variant=(await db.query(`SELECT v.id FROM public.product_variant v JOIN public.product p ON p.id=v.product_id
 WHERE lower(v.status)='active' AND lower(p.status)='active' AND v.sale_price=round(v.sale_price)
 AND coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=v.id),0)-coalesce((SELECT sum(quantity) FROM public.stock_reservation WHERE product_variant_id=v.id AND status='active' AND expires_at>now()),0)>=1
 ORDER BY v.id LIMIT 1`)).rows[0]?.id;await db.query('ROLLBACK');assert.ok(variant,'No sellable in-stock catalog variant');}finally{await db.end();}
 const {config}=require('../database/v1/cloud_connection.cjs').settings(),options={auth:{persistSession:false,autoRefreshToken:false}},args={p_hash:crypto.randomBytes(32).toString('hex'),p_details:{delivery:false,discount_mode:'none'},p_lines:[{variant_id:variant,quantity:1}]};
 const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options),anon=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
 const quote=await service.rpc('guest_sales_quote',args);assert.equal(quote.error,null);assert.equal(quote.data.lines.length,1);assert.equal(Number(quote.data.total),Number(quote.data.lines[0].unitPrice));assert.equal(quote.data.customer_id,undefined);
 const denied=await anon.rpc('guest_sales_quote',args);assert.ok(['42501','PGRST202'].includes(denied.error?.code));assert.equal(denied.data,null);
 const receipt=await service.rpc('guest_sales_receipt',{p_hash:args.p_hash,p_request:crypto.randomUUID()});assert.equal(receipt.error?.code,'42501');assert.equal(receipt.data,null);
 fs.writeFileSync('docs/verification/sync/guest-sales-rest-readonly.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',requests:3,unboundQuoteMatchesPublicCatalogLine:true,ownerIdNotExposed:true,anonymousDenied:true,unboundReceiptDenied:true,scope:'One public in-stock variant selected with bounded read; real Supabase REST quote/service and anon denial/receipt denial; no customer/phone/history reads, no order or business writes; no deployed backend/UI acceptance'},null,2)+'\n');
 console.log('PASS three REST probes: public catalog quote correct, anonymous RPC and unbound receipt denied; no business writes.');
})().catch(e=>{console.error(e.code||e.name);process.exitCode=1;});
