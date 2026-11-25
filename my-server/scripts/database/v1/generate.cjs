const fs=require('node:fs'),path=require('node:path');
const {tables,hash,root}=require('./model.cjs');
const q=s=>'"'+s+'"', lit=s=>"'"+s.replaceAll("'","''")+"'";
const sql=[`-- Generated from reviewed V1 physical model. Fingerprint: ${hash}`,
 '-- Creates exactly 105 application tables / 906 columns in an EMPTY public schema.',
 '-- Auth/Storage are managed by Supabase and are not recreated. Never run on Cloud.',
 'CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;',
 'CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;',
 'SET search_path=public,extensions,pg_catalog;',
 'CREATE SCHEMA IF NOT EXISTS pawpal_private;',
 'REVOKE ALL ON SCHEMA pawpal_private FROM PUBLIC,anon,authenticated;',
 'GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;'];
const statusDefaults={customer_status:'active',employment_status:'active',transaction_status:'pending',refund_status:'pending',appointment_status:'pending',review_status:'pending',cart_status:'active',request_status:'pending',order_status:'draft',schedule_status:'active',availability_status:'available',voucher_status:'available',approval_status:'pending',customer_consent_status:'pending',customer_confirmation_status:'pending',benchmark_status:'pending'};
function def(t,c){
 if(c.name==='revision_no')return '1';
 if(t.name==='voucher_redemption'&&c.name==='status')return "'applied'";
 if(c.default!==null)return c.default;
 if(statusDefaults[c.name])return lit(statusDefaults[c.name]);
 if(c.name==='status')return lit(['service_price_matrix','taxi_price_rule','pet_profile','service','service_addon','hotel_room','hotel_room_type','supplier','product_category','product','product_variant','shipping_provider','blog_category'].includes(t.name)?'active':'pending');
 return null;
}
const doc=['# Đặc tả vật lý database V1','',`Fingerprint mô hình: \`${hash}\`.`, '',
 'Nguồn: mục 15 của PAWPAL_THIET_KE_DATABASE_3NF_V1.md, kết hợp các quy tắc mục 3–13. Không thêm bảng/cột nghiệp vụ ngoài 105 bảng/906 thuộc tính.', '',
 'Quyết định vật lý: UUID nghiệp vụ; tiền/cân/khoảng cách numeric(18,4); số lượng nguyên; thời điểm timestamptz; ngày date; vector không khóa chiều khi chưa chọn mô hình embedding. Các trường metadata/specs/bank_info dùng jsonb theo ý nghĩa nội dung; không nạp file JSON làm dữ liệu giả. Từ khóa dạng text[].', '',
 'Trạng thái dùng mã tiếng Anh chữ thường; đây là mã lưu trữ, giao diện phải dịch tiếng Việt. active là đang áp dụng; pending là chờ; draft là nháp; succeeded/completed/delivered ghi nhận thu hoặc hoàn tất; cancelled/reversed/disabled không còn hiệu lực. Cột loại nghiệp vụ không có default phải được bên ghi chỉ định. Chưa có quy trình/API không đồng nghĩa default cho phép bỏ qua kiểm tra quyền.', '',
 'FK mặc định NO ACTION, DEFERRABLE INITIALLY IMMEDIATE để không xóa dây chuyền lịch sử. Chỉ rõ quy tắc cùng bảng và các trigger bổ sung trong 002_rules.sql. promotion_id ở hai bảng khuyến mãi được gắn FK vì quy tắc V1 yêu cầu dù bảng từ điển thiếu nhãn FK.', '',
 'Mỗi PK xác định toàn bộ thuộc tính của bảng; PK ghép dùng toàn bộ các cột được đánh dấu. Các khóa ứng viên UQ và khóa theo tổ hợp được tạo trong SQL. Quan hệ customer_profile/customer_membership dùng customer_id PK/FK; loài được suy từ breed, không lưu lại ở pet; trạng thái đọc suy từ read_at; tổng/điểm/cân hiện tại qua view. Snapshot là sự kiện lịch sử, không đồng nhất với giá trị danh mục hiện tại. Đây là đặc tả triển khai, không tuyên bố tự động chứng minh 3NF cho mọi nội dung text/metadata.', ''];
for(const t of tables){
 const defs=t.columns.map(c=>` ${q(c.name)} ${c.type}${c.nullable?'':' NOT NULL'}${def(t,c)!==null?' DEFAULT '+def(t,c):''}${c.unique?' UNIQUE':''}`);
 defs.push(' PRIMARY KEY ('+t.columns.filter(c=>c.pk).map(c=>q(c.name)).join(', ')+')');
 sql.push(`CREATE TABLE public.${q(t.name)} (\n${defs.join(',\n')}\n);`);
 sql.push(`COMMENT ON TABLE public.${q(t.name)} IS ${lit(t.description)};`);
 doc.push(`## ${t.name}`,'',t.description,'','| Cột | Kiểu | NULL | Default | Khóa |','|---|---|---|---|---|');
 for(const c of t.columns){
  sql.push(`COMMENT ON COLUMN public.${q(t.name)}.${q(c.name)} IS ${lit(c.description)};`);
  doc.push(`| \`${c.name}\` | ${c.type} | ${c.nullable?'Có':'Không'} | ${def(t,c)===null?'—':'`'+def(t,c)+'`'} | ${[c.pk?'PK':null,c.unique?'UQ':null,c.ref?'FK → '+c.ref:null].filter(Boolean).join('; ')||'—'} |`);
 }
 doc.push('');
}
for(const t of tables)for(const c of t.columns){
 if(c.ref){
  sql.push(`ALTER TABLE public.${q(t.name)} ADD FOREIGN KEY (${q(c.name)}) REFERENCES ${c.ref} ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;`);
  // Avoid identifier truncation collisions on long attachment columns.
  const idx='v1fk_'+require('node:crypto').createHash('sha256').update(t.name+'.'+c.name).digest('hex').slice(0,18);
  sql.push(`CREATE INDEX ${idx} ON public.${q(t.name)} (${q(c.name)});`);
 }
 if(c.type==='text'&&!c.nullable&&!['description','note','content','raw_content','review_content','response_content','summary','instructions','benefits','amenities'].includes(c.name))
  sql.push(`ALTER TABLE public.${q(t.name)} ADD CHECK (length(btrim(${q(c.name)}))>0);`);
 if(['integer','bigint','numeric(18,4)'].includes(c.type)&&!['points','duration_delta_minutes','amount_delta','quantity','sentiment_score','expected_sentiment','weight'].includes(c.name))
  sql.push(`ALTER TABLE public.${q(t.name)} ADD CHECK (${q(c.name)}>=0);`);
 if(c.name==='quantity')sql.push(`ALTER TABLE public.${q(t.name)} ADD CHECK (quantity${t.name==='inventory_transaction'?'<>0':'>0'});`);
 if(c.name==='weight')sql.push(`ALTER TABLE public.${q(t.name)} ADD CHECK (weight${t.name==='pet_weight_history'?'>0':'>=0'});`);
}
const constraints={
 customer_phone:["phone_number ~ '^\\+?[0-9]{8,15}$'"],
 guest_session:['expires_at>created_at',"token_hash ~ '^[a-f0-9]{64}$'"],
 membership_tier:['discount_percent<=100'],service:['commission_rate<=100','estimated_duration>0'],
 customer_profile:['date_of_birth<=CURRENT_DATE'], pet_profile:['date_of_birth<=CURRENT_DATE'],
 pet_weight_history:['measured_at<=now()'],
 appointment:['scheduled_end_at>scheduled_start_at','check_out_time IS NULL OR check_out_time>=check_in_time'],
 appointment_item:['num_nonnulls(service_id,service_addon_id)=1','discount_amount<=quantity*unit_price','NOT is_primary OR service_id IS NOT NULL'],
 appointment_record:['revision_no>0','schema_version>0',"customer_confirmation_status IN ('pending','confirmed','declined')", "(customer_confirmation_status='confirmed')=(confirmed_at IS NOT NULL)"],
 service_price_matrix:['weight_to IS NULL OR weight_to>weight_from','effective_to IS NULL OR effective_to>effective_from'],
 taxi_price_rule:['weight_to IS NULL OR weight_to>weight_from','distance_to IS NULL OR distance_to>distance_from','effective_to IS NULL OR effective_to>effective_from'],
 hotel_booking:['check_out_at>check_in_at'],hotel_room_type:['capacity>0'],
 staff_schedule:['end_at>start_at'], staff_assessment:['score BETWEEN 0 AND 100'],
 staff_shift_request:['end_date>=start_date'],
 sales_order_detail:['discount_amount<=quantity*unit_price'],
 stock_reservation:['num_nonnulls(cart_id,order_id)=1','expires_at>reserved_at'],
 payment:['num_nonnulls(order_id,appointment_id)=1','amount>0','eligible_spend_amount<=amount',"transaction_status IN ('pending','succeeded','failed','cancelled')", "(transaction_status='succeeded')=(succeeded_at IS NOT NULL)","transaction_status='succeeded' OR eligible_spend_amount=0"],
 refund_transaction:['eligible_refund_amount<=refunded_amount','refunded_amount<=approved_amount','approved_amount<=requested_amount',"refund_status IN ('pending','approved','succeeded','failed','cancelled')", "(refund_status='succeeded')=(completed_at IS NOT NULL)","refund_status='succeeded' OR eligible_refund_amount=0"],
 voucher:['end_date>=start_date',"type<>'percent' OR discount_value<=100"],
 promotion:['end_date>=start_date',"discount_type<>'percent' OR discount_value<=100"],
 voucher_redemption:['num_nonnulls(order_id,appointment_id)=1',"status IN ('applied','reversed','cancelled')", "(status='reversed')=(reversed_at IS NOT NULL)"],
 review:['num_nonnulls(sales_order_detail_id,appointment_item_id)=1','rating BETWEEN 1 AND 5'],
 support_ticket:['rating BETWEEN 1 AND 5'],chat_feedback:['score BETWEEN 1 AND 5'],
 chat_conversation:['num_nonnulls(customer_id,guest_session_id)>=1'],
};
for(const [t,checks]of Object.entries(constraints))for(const check of checks)sql.push(`ALTER TABLE public.${q(t)} ADD CHECK (${check});`);
const uniques={pet_breed:'species_id,breed_name',customer_phone:'customer_id,phone_number',cart_item:'cart_id,product_variant_id',promotion_product:'promotion_id,product_variant_id',promotion_service:'promotion_id,service_id',appointment_record:'appointment_id,record_type,revision_no',paw_point_transaction:'customer_id,sequence_no'};
for(const[t,cols]of Object.entries(uniques))sql.push(`ALTER TABLE public.${t} ADD UNIQUE (${cols});`);
sql.push('ALTER TABLE public.product_variant ADD UNIQUE NULLS NOT DISTINCT (product_id,color_id,size_id,flavor_id);');
for(const[t,col,where]of [
 ['customer_phone','customer_id','is_primary'],['customer_phone','phone_number','is_primary'],
 ['customer_address','customer_id','is_default'],['appointment_item','appointment_id','is_primary'],
 ['service_image','service_id','is_thumbnail'],['product_media','product_id','is_thumbnail'],['product_variant_media','product_variant_id','is_thumbnail'],
 ['review','sales_order_detail_id','sales_order_detail_id IS NOT NULL'],['review','appointment_item_id','appointment_item_id IS NOT NULL'],
 ['voucher_redemption','customer_voucher_id',"customer_voucher_id IS NOT NULL AND status='applied'"]
]) sql.push(`CREATE UNIQUE INDEX ON public.${t} (${col}) WHERE ${where};`);
sql.push(`ALTER TABLE public.service_price_matrix ADD CONSTRAINT service_price_no_overlap EXCLUDE USING gist (service_id WITH =,numrange(weight_from,weight_to,'[)') WITH &&,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE (status='active');`,
 `ALTER TABLE public.taxi_price_rule ADD CONSTRAINT taxi_price_no_overlap EXCLUDE USING gist (numrange(distance_from,distance_to,'[)') WITH &&,numrange(weight_from,weight_to,'[)') WITH &&,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE (status='active');`,
 `ALTER TABLE public.hotel_booking ADD CONSTRAINT hotel_no_overlap EXCLUDE USING gist (room_id WITH =,tstzrange(check_in_at,check_out_at,'[)') WITH &&) WHERE (status NOT IN ('cancelled','closed'));`,
 `ALTER TABLE public.staff_schedule ADD CONSTRAINT staff_no_overlap EXCLUDE USING gist (staff_id WITH =,tstzrange(start_at,end_at,'[)') WITH &&) WHERE (schedule_status='active');`);
for(const t of tables)sql.push(`ALTER TABLE public.${q(t.name)} ENABLE ROW LEVEL SECURITY;`, `REVOKE ALL ON public.${q(t.name)} FROM PUBLIC,anon,authenticated;`, `GRANT ALL ON public.${q(t.name)} TO service_role;`);
sql.push('-- Application access policies and rules follow in 002_rules.sql.');
fs.writeFileSync(path.join(__dirname,'001_schema.sql'),sql.join('\n')+'\n','utf8');
fs.writeFileSync(path.join(root,'docs/database/PAWPAL_DATABASE_V1_DAC_TA_VAT_LY.md'),doc.join('\n'),'utf8');
console.log('Generated 105 tables, 906 columns and physical dictionary. Fingerprint '+hash);
