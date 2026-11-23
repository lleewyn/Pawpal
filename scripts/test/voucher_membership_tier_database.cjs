'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {connect}=require('../database/v1/service_import_connection.cjs');
async function main(){
 const db=await connect(),migration=fs.readFileSync('scripts/database/v1/285_voucher_membership_tier.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,'');
 try{
  await db.query("BEGIN;SET LOCAL statement_timeout='10s'");await db.query(migration);await db.query(migration);
  const tiers=(await db.query('SELECT id,tier_name,is_active FROM public.membership_tier ORDER BY minimum_expenditure')).rows,gold=tiers.find(t=>t.tier_name==='Vàng'),inactive=tiers.find(t=>!t.is_active);
  const customers=(await db.query("SELECT DISTINCT ON(t.minimum_expenditure) m.customer_id,t.tier_name,t.minimum_expenditure FROM public.customer_membership m JOIN public.membership_tier t ON t.id=m.membership_tier_id JOIN public.customer c ON c.id=m.customer_id WHERE t.is_active AND c.customer_status='active' ORDER BY t.minimum_expenditure,m.customer_id")).rows;
  assert.equal(customers.length,3);
  const variant=(await db.query("SELECT v.id FROM public.product_variant v JOIN public.product p ON p.id=v.product_id WHERE v.status='active' AND p.status='active' AND v.sale_price=round(v.sale_price) AND (SELECT coalesce(sum(quantity),0) FROM public.inventory_transaction WHERE product_variant_id=v.id)-(SELECT coalesce(sum(quantity),0) FROM public.stock_reservation WHERE product_variant_id=v.id AND status='active' AND expires_at>now())>=1 LIMIT 1")).rows[0];assert.ok(variant);
  const actors=(await db.query("SELECT s.auth_user_id,r.role_code FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE s.employment_status='active' AND NOT s.must_change_password AND s.auth_user_id IS NOT NULL")).rows;
  const as=async role=>{await db.query('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actors.find(a=>a.role_code===role).auth_user_id]);await db.query('SET LOCAL ROLE authenticated');};
  const id=randomUUID(),code='TIER-'+id.slice(0,8),dates=(await db.query("SELECT current_date::text start,(current_date+30)::text finish")).rows[0];
  const values={voucher_code:code,voucher_name:'Kiểm tra điều kiện hạng thành viên',description:'Kiểm tra riêng, hoàn tác sau xác minh',type:'fixed',discount_value:1000,minimum_order_amount:0,required_points:0,max_usage:100,start_date:dates.start,end_date:dates.finish,is_active:true,applicable_for:'all',minimum_membership_tier_id:gold.id};
  await as('ADMIN');const saved=(await db.query("SELECT public.save_admin_setting_record($1,'voucher',$2,NULL,$3,false) value",[randomUUID(),id,JSON.stringify(values)])).rows[0].value;assert.equal(saved.minimum_membership_tier_id,gold.id);
  for(const customer of customers){
   await db.query('SAVEPOINT quote');
   try{const quote=(await db.query('SELECT public.quote_admin_sales_order($1,$2,$3) value',[customer.customer_id,JSON.stringify({delivery:false,discount_mode:'voucher',voucher_code:code}),JSON.stringify([{variant_id:variant.id,quantity:1}])])).rows[0].value;assert.notEqual(customer.tier_name,'Bạc');assert.equal(Number(quote.voucher_discount),1000);}catch(error){assert.equal(customer.tier_name,'Bạc');assert.equal(error.message,'sales_voucher_not_applicable');await db.query('ROLLBACK TO SAVEPOINT quote');}
  }
  await db.query('RESET ROLE');assert.equal((await db.query('SELECT pawpal_private.voucher_membership_allows($1,NULL) allowed',[id])).rows[0].allowed,false);
  await db.query('UPDATE public.voucher SET minimum_membership_tier_id=NULL WHERE id=$1',[id]);assert.equal((await db.query('SELECT pawpal_private.voucher_membership_allows($1,NULL) allowed',[id])).rows[0].allowed,true);
  await db.query('SAVEPOINT inactive');try{await db.query('UPDATE public.voucher SET minimum_membership_tier_id=$1 WHERE id=$2',[inactive.id,id]);assert.fail('Inactive tier accepted');}catch(error){assert.equal(error.message,'invalid_voucher_membership_tier');await db.query('ROLLBACK TO SAVEPOINT inactive');}
  await as('STAFF');await db.query('SAVEPOINT staff');try{await db.query("SELECT public.save_admin_setting_record($1,'voucher',$2,NULL,$3,false) value",[randomUUID(),randomUUID(),JSON.stringify(values)]);assert.fail('STAFF management accepted');}catch(error){assert.equal(error.code,'42501');await db.query('ROLLBACK TO SAVEPOINT staff');}
  await db.query('ROLLBACK');assert.equal((await db.query('SELECT 1 FROM public.voucher WHERE id=$1',[id])).rowCount,0);
  if(process.argv.includes('--apply-cloud')){await db.query('BEGIN');await db.query(migration);await db.query('COMMIT');}
  console.log('PASS: save tier restriction; real quotes reject Silver and allow Gold/Diamond; unrestricted/unknown member behavior; inactive tier and STAFF management rejected; fixture rolled back; schema applied='+process.argv.includes('--apply-cloud'));
 }finally{await db.query('ROLLBACK');await db.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
