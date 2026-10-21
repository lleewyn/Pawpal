// Guarded local migration. Raw export and rejected rows stay outside the web root.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {createClient}=require('@supabase/supabase-js');
const {readExport}=require('./business_export.cjs');
const {tables,root}=require('./model.cjs');
const {verify}=require('./verify.cjs');
const input=process.argv.find(a=>a.endsWith('.txt'));
if(!input||!path.isAbsolute(input))throw Error('Pass absolute business export path');
const apply=process.argv.includes('--apply'),source=readExport(input);
const infra='D:/Aboutme/Pawpal-infra/supabase-local';
const folder=path.join(infra,'imports','business-'+source.hash.slice(0,12));
fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'source-export.private.txt'),source.raw);
fs.writeFileSync(path.join(folder,'SHA256.txt'),source.hash+'  source-export.private.txt\n');
if(fs.existsSync(path.join(folder,'applied.private.txt')))throw Error('This source was already applied; do not duplicate opening balances');
const env=require('dotenv').parse(fs.readFileSync(path.join(infra,'.env')));
if(env.SUPABASE_PUBLIC_URL!=='http://localhost:8000')throw Error('Local only');
const service=createClient(env.SUPABASE_PUBLIC_URL,env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
function docker(args){try{return execFileSync('docker',args,{encoding:'utf8',maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});}catch(e){fs.writeFileSync(path.join(folder,'failure.private.log'),e.stderr?.toString()||e.message);throw Error('SQL step failed; private details saved outside webroot');}}
const sql=(db,q)=>docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-Atc',q]).trim();
const labels=JSON.parse(docker(['inspect','supabase-db','--format','{{json .Config.Labels}}']));
if(labels['com.docker.compose.project']!=='supabase'||labels['com.docker.compose.service']!=='db')throw Error('Unexpected database');
if(sql('postgres','SELECT count(*) FROM public.customer')!=='0')throw Error('Customer target is not empty; review instead of overwriting');
const seed=source.hash.slice(0,12),stage='pawpal_business_'+crypto.randomBytes(8).toString('hex');
const q=s=>'"'+s+'"',lit=v=>v==null?'NULL':typeof v==='boolean'||typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'";
const uuid=(kind,id)=>{const s=crypto.createHash('sha256').update('pawpal-v1-cloud:'+kind+':'+id).digest('hex').slice(0,32).split('');s[12]='8';s[16]='8';const h=s.join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
const isUuid=v=>typeof v==='string'&&/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
const map=new Map(tables.map(t=>[t.name,t]));
const get=source.get;
const units=[],dispositions=[],warnings=[];
const catalogKeys=JSON.parse(sql('postgres','SELECT json_object_agg(name,keys) FROM ('+tables.map(t=>`SELECT ${lit(t.name)} AS name,(SELECT coalesce(json_agg(${q(t.columns.find(c=>c.pk).name)}),'[]') FROM public.${q(t.name)}) AS keys`).join(' UNION ALL ')+') all_keys'));
const existing=new Map(tables.map(t=>[t.name,new Set(catalogKeys[t.name])]));
const statusMap={dang_hoat_dong:'active',da_khoa:'locked',tam_khoa:'locked',bi_khoa:'locked',tam_ngung:'disabled',dang_lam_viec:'active',da_nghi_viec:'inactive',nghi_viec:'inactive',nghi_phep:'leave',cho_xac_nhan:'pending',da_xac_nhan:'confirmed',dang_thuc_hien:'in_progress',da_hoan_tat:'completed',da_huy:'cancelled',dang_giao_hang:'shipping',da_giao_hang:'delivered',da_tra_hang:'returned',dang_dong_goi:'packing',cho_xu_ly:'pending',thanh_cong:'succeeded',that_bai:'failed',dang_xu_ly:'processing',da_nhan_du:'received',da_len_lich:'active',nghi:'inactive',da_doc:'read',dang_hoat_dong:'active',da_xuat_ban:'published',ban_nhap:'draft',het_han:'expired',da_su_dung:'used',chua_su_dung:'available'};
const translate=v=>statusMap[v]||v;
const byId=name=>new Map(get(name).map(r=>[r.id,r]));
function disposition(table,r,state,reason){dispositions.push({table,id:r.id||null,state,reason});}
function hold(table,r,reason){disposition(table,r,'held',reason);}
function insert(name,row){
 const t=map.get(name);if(!t)throw Error('Unknown target '+name);
 const cleaned={};
 for(const c of t.columns){let v=row[c.name];if(v===undefined)continue;if(v===null&&!c.nullable&&c.default!==null)continue;
  if(c.name.endsWith('status')&&v!=null)v=translate(v);
  if(c.type==='date'&&v)v=String(v).slice(0,10);
  if(c.type==='text'&&v!=null&&typeof v!=='string')throw Error('Structured source requires mapping: '+name+'.'+c.name);
  if(v===null&&!c.nullable)throw Error('Missing required '+name+'.'+c.name);
  if(c.type==='uuid'&&v!=null&&!isUuid(v))throw Error('Invalid UUID '+name+'.'+c.name);
  cleaned[c.name]=v;
 }
 const cols=Object.keys(cleaned);if(!cols.length)throw Error('Empty row');
 return `INSERT INTO public.${q(name)} (${cols.map(q).join(',')}) VALUES (${cols.map(n=>{const c=t.columns.find(c=>c.name===n),v=cleaned[n];if(v==null)return 'NULL';if(c.type==='jsonb')return lit(JSON.stringify(v))+'::jsonb';if(c.type==='text[]')return `ARRAY[${(Array.isArray(v)?v:[v]).map(lit).join(',')}]::text[]`;return lit(v);}).join(',')});`;
}
function unit(table,r,statements,target=table){units.push({index:units.length,table,id:r.id||null,target,statements:Array.isArray(statements)?statements.join('\n'):statements});disposition(table,r,'attempted','Validate on restored V1 before apply');}
function attempt(table,r,fn,target){try{unit(table,r,fn(),target);}catch(e){hold(table,r,e.message);}}
const authMap=new Map(),createdAuth=[];
let stageCreated=false,applied=false;
const adminBefore=sql('postgres',"SELECT md5(coalesce(string_agg(u.id::text||coalesce(u.encrypted_password,''),',' ORDER BY u.id),'')) FROM auth.users u JOIN public.staff s ON s.auth_user_id=u.id");
async function ok(p){const r=await p;if(r.error)throw Error(r.error.message);return r.data;}
function build(){
 // Relations already normalized in the previous catalog import are retained, never upserted.
 const catalogs=new Set(['membership_tier','reward_rule','service','service_addon','service_price_matrix','taxi_price_rule','hotel_room_type','hotel_room','product','product_category','product_variant','variant_color','variant_size','variant_flavor','supplier','payment_method_config','delivery_option_config','shipping_provider','voucher','promotion','promotion_product','promotion_service','care_action']);
 for(const t of source.tables)if(catalogs.has(t.source_table.slice(7)))for(const r of t.rows_json)disposition(t.source_table.slice(7),r,existing.get(t.source_table.slice(7))?.has(r.id)?'existing':'held','Catalog already reconciled separately; do not silently restore quarantined source rows');
 for(const r of get('staff'))attempt('staff',r,()=>insert('staff',{...r,auth_user_id:authMap.get(r.id),job_title:r.role,employment_status:translate(r.status||'dang_lam_viec'),hire_date:r.hire_date||null,service_locked:r.service_locked||false,must_change_password:true}));
 for(const r of get('customer'))attempt('customer',r,()=>insert('customer',{...r,customer_code:'CUS-'+r.id,auth_user_id:null,contact_email:r.email?.trim()||null,customer_status:translate(r.account_status)}));
 for(const r of get('customer_profile'))attempt('customer_profile',r,()=>insert('customer_profile',r));
 // Contact operations are atomic per customer, allowing the deferred exact-one constraint.
 for(const c of get('customer')){
  const phoneRows=get('customer_phone').filter(r=>r.customer_id===c.id);
  const normalized=s=>String(s||'').replace(/[\s.()-]/g,'');
  const main=normalized(c.phone_main),all=new Map();
  for(const r of phoneRows){const n=normalized(r.phone_number);if(!/^\+?\d{8,15}$/.test(n)){hold('customer_phone',r,'Invalid phone, not guessed');continue;}all.set(n,{...r,phone_number:n,verified_at:null});}
  if(/^\+?\d{8,15}$/.test(main)&&!all.has(main))all.set(main,{id:uuid('customer_phone',c.id+':'+main),customer_id:c.id,phone_number:main,verified_at:null,created_at:c.created_at,updated_at:c.updated_at});
  else if(main&&!/^\+?\d{8,15}$/.test(main))warnings.push({table:'customer',id:c.id,reason:'Invalid phone_main retained in source archive, not imported'});
  if(all.size){const primary=all.has(main)?main:[...all.keys()].sort()[0];if(!all.has(main))warnings.push({table:'customer',id:c.id,reason:'Primary phone chosen deterministically from valid source contacts; not verified for login'});
   const rows=[...all.values()].map(r=>({...r,is_primary:r.phone_number===primary}));
   attempt('customer_phone_bundle',c,()=>rows.map(r=>insert('customer_phone',r)),'customer_phone');
  }
  const addresses=get('customer_address').filter(r=>r.customer_id===c.id).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))||a.id.localeCompare(b.id));
  if(addresses.length){const defaults=addresses.filter(r=>r.is_default);const chosen=defaults[0]||addresses[0];if(defaults.length!==1)warnings.push({table:'customer_address',id:c.id,reason:'Default normalized: retain earliest marked default, otherwise earliest source address'});
   attempt('customer_address_bundle',c,()=>addresses.map(r=>insert('customer_address',{...r,is_default:r.id===chosen.id})),'customer_address');
  }
 }
 for(const r of get('customer_membership'))attempt('customer_membership',r,()=>insert('customer_membership',{customer_id:r.customer_id,membership_tier_id:r.membership_tier_id,assigned_at:r.updated_at||r.created_at,created_at:r.created_at,updated_at:r.updated_at}));
 const breeds=JSON.parse(sql('postgres',"SELECT coalesce(json_agg(json_build_object('id',b.id,'name',b.breed_name,'species',s.species_name)),'[]') FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id"));
 const aliases={dog:'Chó','chó':'Chó',cat:'Mèo','mèo':'Mèo',rabbit:'Thỏ','chuột hamster':'Chuột Hamster',other:'Khác'};
 for(const r of get('pet_profile'))attempt('pet_profile',r,()=>{
  const species=aliases[String(r.species||'').trim().toLowerCase()];if(!species)throw Error('Unknown source species');
  let breed=String(r.breed||'').trim();if(species==='Mèo'&&/anh lông ngắn/i.test(breed))breed='Anh lông ngắn';if(species==='Chó'&&/^golden(?: retriver| retriever)?$/i.test(breed))breed='Golden Retriever';
  const found=breeds.find(b=>b.species===species&&b.name.toLowerCase()===breed.toLowerCase());
  const fallback=breeds.find(b=>b.species===species&&b.name==='Chưa xác định');
  if(!found)warnings.push({table:'pet_profile',id:r.id,reason:'Breed unknown/ambiguous: use V1 unknown breed in source species, original retained privately'});
  return insert('pet_profile',{...r,breed_id:(found||fallback)?.id,safety_note:null});
 });
 for(const r of get('pet_weight_history'))attempt('pet_weight_history',r,()=>insert('pet_weight_history',{...r,recorded_by:get('staff').filter(s=>s.full_name===r.recorded_by_name).length===1?get('staff').find(s=>s.full_name===r.recorded_by_name).id:null,note:r.recorded_by_name?'Tên người ghi ở nguồn: '+r.recorded_by_name:null}));
 for(const r of get('customer_membership')){
  if(r.total_paw_points>0)attempt('opening_points',r,()=>insert('paw_point_transaction',{id:uuid('opening_points',seed+':'+r.customer_id),customer_id:r.customer_id,points:r.total_paw_points,sequence_no:1,idempotency_key:'cloud-opening:'+source.hash+':'+r.customer_id,description:'Số dư chuyển hệ thống từ customer_membership; lịch sử cũ lưu riêng chưa đối soát',created_at:source.exportedAt}),'paw_point_transaction');
 }
 for(const r of get('paw_point_transaction'))hold('paw_point_transaction',r,'Archived historical ledger; opening balance is authoritative per user instruction, do not double-count');
 for(const r of get('inventory'))attempt('opening_inventory',r,()=>{
  if(!Number.isInteger(r.quantity_in_stock)||r.quantity_in_stock<0)throw Error('Invalid stock snapshot');
  const stm=[];if(r.quantity_in_stock>0)stm.push(insert('inventory_transaction',{id:uuid('opening_inventory',seed+':'+r.product_variant_id),product_variant_id:r.product_variant_id,transaction_type:'opening_balance',quantity:r.quantity_in_stock,idempotency_key:'cloud-opening:'+source.hash+':'+r.product_variant_id,note:'Số dư chuyển hệ thống từ inventory; lịch sử cũ lưu riêng chưa đối soát',created_at:source.exportedAt,recorded_at:source.exportedAt}));
  else stm.push(insert('inventory',{...r,quantity_in_stock:0}));
  stm.push(`UPDATE public.inventory SET minimum_stock=${lit(r.minimum_stock||0)} WHERE product_variant_id=${lit(r.product_variant_id)};`);return stm;
 },'inventory');
 for(const r of get('inventory_transaction'))hold('inventory_transaction',r,'Archived historical stock ledger; not counted again with opening balance');
 const variants=byId('product_variant'),products=byId('product'),addresses=byId('customer_address');
 for(const r of get('purchase_order'))attempt('purchase_order',r,()=>[insert('purchase_order',r),...get('purchase_order_detail').filter(d=>d.purchase_order_id===r.id).map(d=>insert('purchase_order_detail',d))]);
 for(const r of get('sales_order'))attempt('sales_order',r,()=>{
  const addr=addresses.get(r.shipping_address_id),details=get('sales_order_detail').filter(d=>d.order_id===r.id);
  if(!details.length&&Number(r.total_amount)>0)throw Error('Order total has no source detail rows; do not invent line items');
  const snapshot={};for(const [from,to]of [['receiver_name','receiver_name_snapshot'],['receiver_phone','receiver_phone_snapshot'],['province','province_snapshot'],['street_address','street_address_snapshot'],['postal_code','postal_code_snapshot']])if(addr)snapshot[to]=addr[from];
  if(addr)warnings.push({table:'sales_order',id:r.id,reason:'Shipping snapshot taken from exported address, cannot certify original historical address'});
  const due=details.reduce((s,d)=>s+Number(d.quantity)*Number(d.unit_price)-Number(d.discount_amount||0),0);
  if(Math.abs(due-Number(r.total_amount||0))>0.01)throw Error('Source order total differs from detail sum; missing shipping/discount breakdown');
  return [insert('sales_order',{...r,...snapshot,shipping_fee_snapshot:0,delivery_option_id:r.delivery_id?uuid('delivery_option_config',r.delivery_id):null}),...details.map(d=>{const v=variants.get(d.product_variant_id),p=products.get(v?.product_id);if(!p||!v)throw Error('Missing source variant/product');return insert('sales_order_detail',{...d,product_name_snapshot:p.product_name,sku_snapshot:v.sku_variant});})];
 });
 const services=byId('service');
 for(const r of get('appointment'))attempt('appointment',r,()=>{
  const s=services.get(r.service_id);if(!s||!existing.get('service').has(s.id))throw Error('Service missing/held from catalog');
  if(!r.appointment_date||!r.appointment_time||!(s.estimated_duration>0)||r.total_price==null)throw Error('Missing schedule/duration/price; do not invent snapshot');
  const start=new Date(r.appointment_date+'T'+r.appointment_time+'+07:00');if(!Number.isFinite(+start))throw Error('Invalid appointment local time');
  // Trigger validates current ownership only at insertion; old bookings may have another historical owner.
  const pet=get('pet_profile').find(p=>p.id===r.pet_id);if(pet?.customer_id!==r.customer_id)throw Error('Historical owner differs; requires dedicated validated historical migration');
  return [insert('appointment',{...r,scheduled_start_at:start.toISOString(),scheduled_end_at:new Date(+start+s.estimated_duration*60000).toISOString()}),insert('appointment_item',{id:uuid('appointment_item',r.id),appointment_id:r.id,service_id:r.service_id,is_primary:true,name_snapshot:s.service_name,quantity:1,unit_price:r.total_price,discount_amount:0,duration_minutes:s.estimated_duration,staff_id:r.staff_id||null,status:translate(r.appointment_status),created_at:r.created_at,updated_at:r.updated_at})];
 });
 for(const r of get('support_ticket'))attempt('support_ticket',r,()=>insert('support_ticket',{...r,subject:r.subject||r.title,ticket_code:r.ticket_code||'TICKET-'+r.id,created_by_account_id:null,customer_id:r.customer_id||r.user_id||null}));
 for(const r of get('payment'))attempt('payment',r,()=>{
  if(Number(r.paw_points_used)>0||r.voucher_id)throw Error('Payment embeds voucher/point discount without V1 redemption source');
  return insert('payment',{...r,payment_method_config_id:uuid('payment_method_config',r.payment_method_config_id),transaction_status:translate(r.transaction_status),succeeded_at:r.transaction_status==='thanh_cong'?r.updated_at||r.created_at:null,idempotency_key:'cloud-payment:'+r.id,eligible_spend_amount:0});
 });
 for(const r of get('return_request'))attempt('return_request',r,()=>insert('return_request',r));
 for(const r of get('return_request_detail'))attempt('return_request_detail',r,()=>{
  const parent=get('return_request').find(t=>t.id===r.return_request_id);
  const candidates=get('sales_order_detail').filter(d=>d.order_id===parent?.sales_order_id&&d.product_variant_id===r.product_variant_id);
  if(candidates.length!==1)throw Error('Return cannot identify exactly one purchased line');return insert('return_request_detail',{...r,sales_order_detail_id:candidates[0].id});
 });
 for(const r of get('refund_transaction'))attempt('refund_transaction',r,()=>insert('refund_transaction',{...r,refund_status:r.refund_status==='da_hoan_tat'?'succeeded':r.refund_status==='dang_xu_ly'?'approved':translate(r.refund_status),eligible_refund_amount:0}));
 for(const r of get('review'))attempt('review',r,()=>{
  let line=null,item=null;
  if(r.sales_order_id){const candidates=get('sales_order_detail').filter(d=>d.order_id===r.sales_order_id&&(!r.product_id||variants.get(d.product_variant_id)?.product_id===r.product_id));if(candidates.length!==1)throw Error('Review cannot identify one purchased line');line=candidates[0].id;}
  if(r.appointment_id){if(line)throw Error('Review has both order and appointment sources');item=uuid('appointment_item',r.appointment_id);}
  if(!line&&!item)throw Error('Review not tied to proven purchase/service');
  return insert('review',{...r,sales_order_detail_id:line,appointment_item_id:item});
 });
 for(const r of get('review_response'))attempt('review_response',r,()=>insert('review_response',r));
 for(const r of get('cart'))attempt('cart',r,()=>insert('cart',r));
 for(const r of get('cart_item'))attempt('cart_item',r,()=>insert('cart_item',r));
 for(const r of get('wishlist'))attempt('wishlist',r,()=>insert('wishlist',r));
 for(const r of get('wishlist_item'))attempt('wishlist_item',r,()=>{
  if((r.product_id?1:0)+(r.service_id?1:0)!==1)throw Error('Wishlist row must have one target');return insert(r.product_id?'wishlist_product':'wishlist_service',r);
 },'wishlist_product/service');
 for(const r of get('customer_voucher'))attempt('customer_voucher',r,()=>{if(r.used_at||r.voucher_status==='da_su_dung')throw Error('Used voucher lacks identifiable V1 redemption source');return insert('customer_voucher',r);});
 for(const r of get('notification'))attempt('notification',r,()=>{if(r.is_read&&!r.read_at)throw Error('Read flag has no read timestamp');return insert('notification',r);});
 for(const r of get('care_log'))attempt('care_log',r,()=>{
  if(!r.appointment_id)throw Error('Care log lacks appointment');const action=get('care_action').find(a=>a.id===r.care_action_id);return insert('care_log',{...r,observed_condition:r.health_status,recorded_by:null,action_name_snapshot:action?.action_name});
 });
 for(const r of get('care_log_media'))attempt('care_log_media',r,()=>insert('care_log_media',r));
 for(const r of get('staff_schedule'))attempt('staff_schedule',r,()=>{
  if(!r.work_date||!r.start_time||!r.end_time)throw Error('Schedule has incomplete source times');return insert('staff_schedule',{...r,start_at:r.work_date+'T'+r.start_time+'+07:00',end_at:r.work_date+'T'+r.end_time+'+07:00'});
 });
 const staffAccount=old=>{if(!old)return null;const person=get('staff').find(s=>s.id===old||s.auth_user_id===old);return person?authMap.get(person.id):null;};
 for(const r of get('staff_shift_request'))attempt('staff_shift_request',r,()=>{
  const creator=staffAccount(r.created_by),reviewer=staffAccount(r.reviewed_by);
  if(!creator)throw Error('Shift request creator Auth not mapped');
  if(r.reviewed_by&&!reviewer)throw Error('Shift request reviewer Auth not mapped');
  return insert('staff_shift_request',{...r,created_by:creator,reviewed_by:reviewer});
 });
 // Original audit attribution is retained by staff FK, not forged client identities.
 for(const r of get('audit_log'))attempt('audit_log',r,()=>insert('audit_log',r));
 for(const n of ['blog_category','blog_post','banner','product_variant_media'])for(const r of get(n))attempt(n,r,()=>insert(n,r));
 for(const r of get('pawpal_setting'))attempt('pawpal_setting',r,()=>{
  if(/secret|password|smtp|api.?key|token/i.test(r.setting_key))throw Error('Sensitive setting kept outside runtime import');
  return insert('pawpal_setting',{...r,setting_value:typeof r.setting_value==='string'?r.setting_value:JSON.stringify(r.setting_value)});
 });
 // Generic chatbot configuration only when physical types and real FKs match; never coerce prose thresholds into numbers.
 for(const n of ['chatbot_sentiment_tier','chatbot_canned_response','chatbot_compensation_policy','chatbot_knowledge_faq','chatbot_profanity_filter','chatbot_system_prompt','chatbot_scenario_matrix','chatbot_sentiment_trigger','chatbot_sentiment_action','chatbot_handover_rule'])for(const r of get(n))attempt(n,r,()=>{
  const converted={...r};for(const c of map.get(n).columns){const v=converted[c.name];if(v!=null&&(c.type==='integer'||c.type.startsWith('numeric'))){if(!['string','number'].includes(typeof v)||!Number.isFinite(Number(v)))throw Error('Source prose cannot be converted into '+c.name);converted[c.name]=Number(v);}}
  return insert(n,converted);
 });
 // An anonymous transcript lacks the original guest identity: keep source intact instead of inventing an authenticated sender.
 for(const r of get('chat_conversation'))attempt('chat_conversation',r,()=>{if(!r.customer_id)throw Error('Anonymous conversation requires original guest-session mapping');return insert('chat_conversation',r);});
 for(const r of get('chat_message'))attempt('chat_message',r,()=>{
  const account=r.sender_type==='staff'?authMap.get(r.sender_id)||authMap.get(get('staff').find(s=>s.auth_user_id===r.sender_id)?.id):null;
  if(!['bot','system'].includes(r.sender_type)&&!account)throw Error('Sender Auth identity not migrated; cannot impersonate source customer');
  return insert('chat_message',{...r,sender_account_id:account,sender_guest_session_id:null});
 });
 for(const r of get('support_ticket_message'))attempt('support_ticket_message',r,()=>{
  const s=get('staff').find(s=>s.id===r.sender_id||s.auth_user_id===r.sender_id),account=s?authMap.get(s.id):null;
  if(!account)throw Error('Message sender Auth identity unresolved');return insert('support_ticket_message',{...r,sender_type:'staff',sender_account_id:account,sender_guest_session_id:null});
 });
 for(const r of get('chat_moderation_log'))attempt('chat_moderation_log',r,()=>insert('chat_moderation_log',r));
 const handled=new Set(dispositions.map(d=>d.table));
 for(const t of source.tables){const n=t.source_table.slice(7);if(handled.has(n)||['customer_phone','customer_address','sales_order_detail','purchase_order_detail','inventory'].includes(n))continue;for(const r of t.rows_json)hold(n,r,'Requires separate source-to-V1 relation mapping; source preserved, not silently dropped');}
}
async function main(){
 let outcome;
 try{
  // Backup before creating even the authorized locked Auth identities.
  const remoteDump='/tmp/'+stage+'.dump';
  docker(['exec','supabase-db','pg_dump','-U','supabase_admin','-d','postgres','-Fc','-f',remoteDump]);
  docker(['cp','supabase-db:'+remoteDump,path.join(folder,'before-business-full.dump')]);
  console.log('Full local backup and source archive saved outside webroot.');
  for(const r of get('staff')){
   const placeholderEmail='migrated-staff-'+r.id+'@pawpal.test';
   const created=await ok(service.auth.admin.createUser({email:placeholderEmail,password:crypto.randomBytes(32).toString('base64url'),email_confirm:false,ban_duration:'876000h',app_metadata:{migration_source:source.hash,source_staff_id:r.id}}));
   const id=created.user.id;createdAuth.push(id);authMap.set(r.id,id);
   if(!created.user.banned_until||new Date(created.user.banned_until)<=new Date())throw Error('New staff identity is not banned');
  }
  fs.writeFileSync(path.join(folder,'staff-auth-map.private.txt'),JSON.stringify([...authMap],null,2));
  console.log('Created '+createdAuth.length+' blocked staff Auth identities; no original password or login privilege copied.');
  // Restore a full snapshot including new locked accounts into a disposable database.
  docker(['exec','supabase-db','pg_dump','-U','supabase_admin','-d','postgres','-Fc','-f',remoteDump]);
  docker(['exec','supabase-db','createdb','-U','supabase_admin','-T','template0',stage]);stageCreated=true;
  docker(['exec','supabase-db','pg_restore','-U','supabase_admin','--exit-on-error','-d',stage,remoteDump]);
  sql(stage,fs.readFileSync(path.join(__dirname,'005_staff_unknown_hire_date.sql'),'utf8'));
  build();
  fs.writeFileSync(path.join(folder,'planned-units.private.txt'),JSON.stringify(units));
  const prefix=`CREATE TEMP TABLE migration_result(index integer PRIMARY KEY,ok boolean,code text,detail text);
CREATE FUNCTION pg_temp.try_import(idx integer,statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN
  EXECUTE statement;
  SET CONSTRAINTS ALL IMMEDIATE;
  INSERT INTO migration_result VALUES(idx,true,NULL,NULL);
 EXCEPTION WHEN OTHERS THEN INSERT INTO migration_result VALUES(idx,false,SQLSTATE,SQLERRM);
 END;
END $$;\nBEGIN;\n`;
  const trial=prefix+units.map(u=>`SELECT pg_temp.try_import(${u.index},${lit(u.statements)});`).join('\n')+'\nCOMMIT;\nSELECT \'MIGRATION_RESULTS:\'||coalesce(json_agg(migration_result ORDER BY index),\'[]\')::text FROM migration_result;';
  const trialPath=path.join(folder,'trial.private.sql');fs.writeFileSync(trialPath,trial);
  const remote='/tmp/'+stage+'.sql';docker(['cp',trialPath,'supabase-db:'+remote]);
  const output=docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d',stage,'-v','ON_ERROR_STOP=1','-At','-f',remote]);
  const position=output.lastIndexOf('MIGRATION_RESULTS:');if(position<0)throw Error('Missing trial results');
  outcome=JSON.parse(output.slice(position+'MIGRATION_RESULTS:'.length).trim());if(outcome.length!==units.length)throw Error('Trial accounting mismatch');
  fs.writeFileSync(path.join(folder,'trial-results.private.txt'),JSON.stringify(outcome,null,2));
  verify(sql,stage);
  // Opening balances must equal each imported snapshot, not just match global row counts.
  for(const r of get('customer_membership')){
   const balance=Number(sql(stage,`SELECT coalesce(sum(points),0) FROM public.paw_point_transaction WHERE customer_id=${lit(r.customer_id)}`));
   if(balance!==r.total_paw_points)throw Error('Opening customer point snapshot does not reconcile');
  }
  for(const r of get('inventory')){
   const balance=Number(sql(stage,`SELECT quantity_in_stock FROM public.inventory WHERE product_variant_id=${lit(r.product_variant_id)}`));
   if(balance!==r.quantity_in_stock)throw Error('Opening stock snapshot does not reconcile');
  }
  const good=units.filter(u=>outcome.find(r=>r.index===u.index)?.ok);
  const migration='BEGIN;\nSELECT pg_advisory_xact_lock(198512,2167);\n'+fs.readFileSync(path.join(__dirname,'005_staff_unknown_hire_date.sql'),'utf8')+'\n'+good.map(u=>u.statements+'\nSET CONSTRAINTS ALL IMMEDIATE;').join('\n')+'\nCOMMIT;\n';
  fs.writeFileSync(path.join(folder,'accepted-import.private.sql'),migration);
  console.log('Trial: '+good.length+' accepted units, '+(units.length-good.length)+' rejected units; source retained for all.');
  if(apply){
   if(sql('postgres','SELECT count(*) FROM public.customer')!=='0')throw Error('Target changed while validating');
   docker(['cp',path.join(folder,'accepted-import.private.sql'),'supabase-db:'+remote]);
   docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-f',remote]);applied=true;verify(sql,'postgres');
   const compare='SELECT json_object_agg(name,total) FROM ('+tables.map(t=>`SELECT ${lit(t.name)} AS name,(SELECT count(*) FROM public.${q(t.name)}) AS total`).join(' UNION ALL ')+') counts';
   if(sql(stage,compare)!==sql('postgres',compare))throw Error('Live/stage row counts differ');
   if(sql('postgres',"SELECT md5(coalesce(string_agg(u.id::text||coalesce(u.encrypted_password,''),',' ORDER BY u.id),'')) FROM auth.users u JOIN public.staff s ON s.auth_user_id=u.id WHERE s.id NOT IN ("+get('staff').map(r=>lit(r.id)).join(',')+")")!==adminBefore)throw Error('Original Admin identity changed');
   fs.writeFileSync(path.join(folder,'applied.private.txt'),new Date().toISOString());
  }
  const stats=JSON.parse(sql(stage,'SELECT coalesce(json_agg(x),\'[]\') FROM ('+tables.map(t=>`SELECT ${lit(t.name)} AS name,(SELECT count(*) FROM public.${q(t.name)}) AS total`).join(' UNION ALL ')+') x WHERE total>0')).map(r=>[r.name,r.total]);
  const escape=s=>String(s||'').replaceAll('|','/').replaceAll('\n',' ');
  const report=['# Chuyển dữ liệu nghiệp vụ Cloud sang V1','',`Trạng thái: ${applied?'ĐÃ NHẬP các đơn vị hợp lệ vào local':'CHỈ THỬ; chưa áp dụng vào local'}. Bản nguồn đủ ${source.tables.length} bảng, ${source.tables.reduce((s,t)=>s+t.exported_rows,0)} dòng; không thiếu trang.`, '',
   `Nguồn SHA256: \`${source.hash}\`. Toàn bộ bản xuất, backup trước nhập, ánh xạ Auth, SQL và kết quả từ chối được giữ tại \`${folder}\` ngoài webroot. Không ghi dữ liệu cá nhân vào báo cáo công khai này.`, '',
   '## Quyết định áp dụng','',
   '- Tạo 16 tài khoản Auth local mới với email kỹ thuật riêng, mật khẩu ngẫu nhiên không phát hành, ban 100 năm, must_change_password=true; không gán vai trò. Hồ sơ giữ email liên hệ gốc. Admin local hiện có giữ nguyên.',
   '- Hồ sơ khách không được gắn Auth ID Cloud cũ vì danh tính đó không tồn tại ở local; khách được chuyển dưới dạng hồ sơ tại quầy, việc khôi phục đăng nhập khách cần quy trình xác minh riêng.',
   '- Điện thoại chính lấy phone_main hợp lệ; nếu thiếu chọn số hợp lệ có sẵn, không xác nhận đăng nhập. Số sai được lưu bản nguồn. Địa chỉ có nhiều/không có mặc định được chuẩn hóa bằng thứ tự nguồn ổn định, ghi nhật ký riêng.',
   '- Loài/giống theo danh mục đã nhập; giống mơ hồ dùng giống Chưa xác định thuộc đúng loài nguồn. Không nhập lịch sử tiêm phòng vào V1 không thú y.',
   '- Giữ số dư điểm và tồn kho nguồn bằng bút toán mở đầu ghi nguồn theo lựa chọn người dùng. Lịch sử cũ được lưu riêng để tránh cộng trùng. Không tự coi điểm xét hạng cũ là chi tiêu hợp lệ.',
   '- Ngày vào làm chưa biết được phép NULL thay vì tạo ngày giả. Không thêm bảng/cột ngoài 105 bảng V1. Các catalog đã nhập trước không bị ghi đè.',
   '- Đơn/lịch chuyển theo dòng và snapshot xác định được; thiếu dòng/giá/timestamp hoặc tổng không khớp thì giữ ngoài bản nhập. Không tắt trigger/FK để ép dữ liệu qua.',
   '- Các giao dịch, đánh giá, chat hoặc bảng khác còn thiếu nguồn FK, danh tính người gửi hay thông tin bắt buộc được giữ riêng. Không tuyên bố tất cả dữ liệu đã nhập chỉ vì nguồn đã xuất đủ.', '',
   '## Số dòng trong V1 sau thử/áp dụng (gồm danh mục có trước)','', '| Bảng | Dòng |','|---|---:|',...stats.map(([n,c])=>`| ${n} | ${c} |`),'',
   '## Kết quả theo đơn vị chuyển đổi','',`Đã thử ${units.length} đơn vị: ${good.length} hợp lệ, ${units.length-good.length} từ chối. Một đơn vị có thể gồm header + dòng hoặc toàn bộ địa chỉ/số liên hệ của một khách.`, '',
   '| Nhóm nguồn | Đơn vị hợp lệ | Đơn vị bị từ chối |','|---|---:|---:|',...[...new Set(units.map(u=>u.table))].map(n=>{const a=units.filter(u=>u.table===n);return `| ${n} | ${a.filter(u=>outcome.find(r=>r.index===u.index)?.ok).length} | ${a.filter(u=>!outcome.find(r=>r.index===u.index)?.ok).length} |`;}),'',
   '## Lý do chưa chuyển (chỉ tổng hợp, không công khai bản ghi cá nhân)','',
   ...[...new Set([...dispositions.filter(d=>d.state==='held').map(d=>d.table+': '+d.reason),...outcome.filter(o=>!o.ok).map(o=>units[o.index].table+': PostgreSQL '+o.code)])].map(s=>'- '+escape(s)), '',
   'Cảnh báo chuyển đổi chi tiết, bản nguồn và dòng bị từ chối nằm trong thư mục private nêu trên. Phần chưa chuyển vẫn phải xử lý tiếp theo quan hệ V1; backup này nằm cùng máy, chưa thay bản sao ngoài máy. Các màn hình nghiệp vụ cũ vẫn cần chuyển mã và nghiệm thu riêng.', ''];
  fs.writeFileSync(path.join(root,'PAWPAL_NHAP_DU_LIEU_NGHIEP_VU_V1.md'),report.join('\n'),'utf8');
  fs.writeFileSync(path.join(folder,'dispositions.private.txt'),JSON.stringify({dispositions,warnings,outcome,units:units.map(({statements,...rest})=>rest)},null,2));
  console.log((applied?'APPLIED':'DRY RUN')+' migration; report PAWPAL_NHAP_DU_LIEU_NGHIEP_VU_V1.md');
 }finally{
  if(stageCreated&&/^pawpal_business_[a-f0-9]{16}$/.test(stage))docker(['exec','supabase-db','dropdb','-U','supabase_admin','--force',stage]);
  if(!applied)for(const id of createdAuth)await service.auth.admin.deleteUser(id);
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
