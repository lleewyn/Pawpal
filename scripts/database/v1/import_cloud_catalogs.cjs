// Cloud export -> normalized V1 catalog rows. No Cloud connection, Auth changes or mock fallback.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {tables,root}=require('./model.cjs');
const {verify}=require('./verify.cjs');
const [referencePath,pricesPath]=process.argv.slice(2).filter(a=>!a.startsWith('--'));
if(!referencePath||!pricesPath||!path.isAbsolute(referencePath)||!path.isAbsolute(pricesPath))throw Error('Pass absolute paths to both pasted exports');
const apply=process.argv.includes('--apply');
const source=fs.readFileSync(referencePath,'utf8'),priceSource=fs.readFileSync(pricesPath,'utf8');
const data=new Map();
for(const l of source.split(/\r?\n/)){
 const m=l.match(/^\|\s*(\w+)\s*\|\s*public\.\w+\s*\|\s*\w+\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*\[.*?\]\s*\|\s*(\[.*\])\s*\|\s*$/);
 if(m){const rows=JSON.parse(m[4]);if(rows.length!==+m[3])throw Error('Reference count mismatch');data.set(m[1],rows);}
}
if(data.size!==33)throw Error('Expected 33 reference datasets');
let fullPrices;
for(const l of priceSource.split(/\r?\n/)){
 const m=l.match(/^\|\s*service_price_matrix\s*\|\s*(\d+)\s*\|\s*(\[.*\])\s*\|\s*$/);
 if(m){fullPrices=JSON.parse(m[2]);if(fullPrices.length!==+m[1])throw Error('Price count mismatch');}
}
if(!fullPrices||fullPrices.length!==102||new Set(fullPrices.map(r=>r.id)).size!==102)throw Error('Expected 102 distinct price records');
const canonical=x=>JSON.stringify(Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))));
const priceMap=new Map(fullPrices.map(r=>[r.id,r]));
for(const old of data.get('service_price_matrix'))if(!priceMap.has(old.id)||canonical(old)!==canonical(priceMap.get(old.id)))throw Error('Prices changed between exports; review before importing');
data.set('service_price_matrix',fullPrices);
const model=new Map(tables.map(t=>[t.name,t]));
const mapped=new Map(),changes=[],held=[];
const list=n=>data.get(n)||[];
const stableId=(domain,name)=>{
 const hex=crypto.createHash('sha256').update('pawpal-v1-cloud:'+domain+':'+name).digest('hex').slice(0,32).split('');
 hex[12]='8';hex[16]='8';const s=hex.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
};
const validId=id=>/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id);
const statusMap={dang_hoat_dong:'active',dang_ban:'active',dang_ap_dung:'active',dang_hop_tac:'active',tam_ngung:'disabled',ngung_hoat_dong:'disabled',trong:'available',bao_tri:'maintenance',dang_su_dung:'occupied',dang_dat:'reserved'};
function hold(table,row,reason){held.push({table,id:row.id||null,name:row.service_name||row.action_name||row.breed||row.voucher_code||row.room_number||'',reason});}
function add(name,row){
 const t=model.get(name);if(!t)throw Error('Target outside V1 '+name);
 const value={};
 for(const c of t.columns){
  let v=row[c.name];
  if(v===undefined)continue;
  if(v===null&&!c.nullable&&c.default!==null)continue;
  if(c.type==='uuid'&&v!==null&&!validId(v)){
   const next=stableId(name,String(v));changes.push(`${name}: ID ${v} → ${next}`);v=next;
  }
  if(c.name==='status'&&v!=null){if(!statusMap[v]&&!['active','disabled','available','maintenance'].includes(v))throw Error('Unknown source status '+name+': '+v);v=statusMap[v]||v;}
  if(c.type==='date'&&typeof v==='string')v=v.slice(0,10);
  if(name==='delivery_option_config'&&c.name==='estimated_days'&&(Array.isArray(v)||typeof v==='string'&&/^\d+[,\-]\d+$/.test(v))){
   const values=Array.isArray(v)?v:v.split(/[,\-]/).map(Number);
   if(!values.length||values.some(n=>!Number.isInteger(n)||n<0))throw Error('Invalid source delivery range');
   const upper=Math.max(...values);
   changes.push(`delivery_option_config ${row.id}: estimated_days khoảng ${v} → ${upper} ngày (cận trên; mô tả khoảng nguồn được giữ)`);v=upper;
  }
  if(v!=null&&['integer','bigint','smallint'].includes(c.type)&&(!['number','string'].includes(typeof v)||!Number.isSafeInteger(Number(v))))throw Error('Invalid integer '+name+'.'+c.name);
  if(v!=null&&c.type.startsWith('numeric')&&(!['number','string'].includes(typeof v)||!Number.isFinite(Number(v))))throw Error('Invalid numeric '+name+'.'+c.name);
  if(c.type==='text'&&v!==null&&typeof v==='object')throw Error('Unmapped structured text '+name+'.'+c.name);
  value[c.name]=v;
 }
 for(const c of t.columns){
  const v=value[c.name];
  if(v!=null&&(['integer','bigint','smallint'].includes(c.type)||c.type.startsWith('numeric'))&&Number(v)<0){hold(name,row,'Giá trị âm không hợp lệ theo V1: '+c.name);return false;}
 }
 if((value.weight_to!=null&&Number(value.weight_to)<=Number(value.weight_from))||(value.distance_to!=null&&Number(value.distance_to)<=Number(value.distance_from))){hold(name,row,'Khoảng cân nặng/khoảng cách không hợp lệ');return false;}
 if(name==='voucher'&&(value.end_date<value.start_date||value.type==='percent'&&Number(value.discount_value)>100)){hold(name,row,'Ngày hoặc mức voucher không hợp lệ');return false;}
 if(!mapped.has(name))mapped.set(name,[]);
 mapped.get(name).push(value);
 return true;
}
const junk=r=>/\bQA\b|kiểm thử|^sdf\w*$|^test\b/i.test(r.service_name||r.product_name||r.action_name||'');
for(const name of ['membership_tier','reward_rule','product_category','variant_color','variant_size','variant_flavor','supplier','payment_method_config','delivery_option_config','shipping_provider','taxi_price_rule'])for(const r of list(name))add(name,r);
for(const r of list('hotel_room_type'))add('hotel_room_type',{...r,amenities:Array.isArray(r.amenities)?r.amenities.join('; '):r.amenities});
for(const r of list('hotel_room')){
 if(['dang_su_dung','dang_dat'].includes(r.status)){hold('hotel_room',r,'Không nhập trạng thái đang ở/đang giữ vì không chuyển booking nguồn');continue;}
 if(!(mapped.get('hotel_room_type')||[]).some(t=>t.id===r.room_type_id)){hold('hotel_room',r,'Loại phòng được tạm giữ');continue;}
 add('hotel_room',r);
}
// Dictionary codes are derived from source groups. No extra business table is added.
const groupNames={grooming_spa:'Spa và cắt tỉa',pet_hotel:'Khách sạn thú cưng',pet_taxi:'Đưa đón thú cưng'};
for(const code of Object.keys(groupNames))add('service_category',{id:stableId('service_category',code),category_code:code,category_name:groupNames[code]});
const levelNames=['Junior Groomer','Senior Groomer','Master Groomer'];
for(const [i,name]of levelNames.entries())if(list('service').some(r=>r.groomer_level===name))add('staff_level',{id:stableId('staff_level',name),level_code:['JUNIOR','SENIOR','MASTER'][i],level_name:name,rank_order:i+1,is_active:true});
const includedServices=new Set();
for(const r of list('service')){
 if(junk(r)){hold('service',r,'Tên dữ liệu QA/kiểm thử/rác');continue;}
 if(/thuốc|trị liệu|da liễu|thú y|tiêm phòng/i.test(r.service_name)){hold('service',r,'Tên dịch vụ ngoài phạm vi không thú y');continue;}
 let group=r.service_category;
 if(/^phòng\b|\bsuite\b|\bcondo\b/i.test(r.service_name)&&group!=='pet_hotel'){
  changes.push(`service ${r.id}: ${r.service_name}, ${group} → pet_hotel`);group='pet_hotel';
 }
 if(!groupNames[group])throw Error('Unknown service group');
 if(add('service',{...r,category_id:stableId('service_category',group),staff_level_required_id:levelNames.includes(r.groomer_level)?stableId('staff_level',r.groomer_level):null}))includedServices.add(r.id);
}
for(const name of ['service_addon','service_price_matrix'])for(const r of list(name)){
 if(!includedServices.has(r.service_id)){hold(name,r,'Dịch vụ cha được tạm giữ, không tạo FK treo');continue;}add(name,r);
}
for(const r of list('care_action')){
 if(junk(r)){hold('care_action',r,'Tên dữ liệu QA/kiểm thử');continue;}
 add('care_action',r);
 if(r.service_id&&includedServices.has(r.service_id))add('service_care_action',{service_id:r.service_id,care_action_id:r.id,display_order:0,estimated_duration:0});
}
for(const r of list('product')){
 if(junk(r)){hold('product',r,'Tên dữ liệu kiểm thử');continue;}
 const stem=r.product_name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const slug=r.slug||`${stem||'san-pham'}-${r.id}`;
 if(!r.slug)changes.push(`product ${r.id}: tạo slug từ tên và ID nguồn để bảo đảm duy nhất`);
 add('product',{...r,slug});
}
const products=new Set((mapped.get('product')||[]).map(r=>r.id));
for(const r of list('product_variant'))if(products.has(r.product_id))add('product_variant',r);else hold('product_variant',r,'Sản phẩm cha được tạm giữ');
for(const r of list('promotion'))add('promotion',{...r,discount_type:r.discount_type==='phan_tram'?'percent':r.discount_type});
for(const name of ['promotion_product','promotion_service'])for(const r of list(name)){
 if(name==='promotion_service'&&!includedServices.has(r.service_id)||name==='promotion_product'&&!(mapped.get('product_variant')||[]).some(v=>v.id===r.product_variant_id)){
  hold(name,r,'Dịch vụ/biến thể cha được tạm giữ');continue;
 }
 add(name,r);
}
for(const r of list('voucher')){
 const scope=Array.isArray(r.applicable_for)?r.applicable_for:[r.applicable_for];
 if(scope.length!==1||!scope[0]){hold('voucher',r,'Scope nhiều giá trị chưa có ánh xạ scalar V1; không tự mở rộng thành all');continue;}
 add('voucher',{...r,applicable_for:scope[0]});
}
// Keep unambiguous source taxonomy, normalize obvious aliases, preserve ambiguous source in quarantine.
const speciesAliases={dog:'Chó','chó':'Chó',cat:'Mèo','mèo':'Mèo',rabbit:'Thỏ','chuột hamster':'Chuột Hamster',other:'Khác'};
const speciesUsed=new Set(),breedUsed=new Set();
for(const r of list('legacy_pet_taxonomy')){
 const species=speciesAliases[String(r.species||'').toLowerCase().trim()];
 if(!species){hold('legacy_pet_taxonomy',r,'Loài chưa có ánh xạ rõ');continue;}
 speciesUsed.add(species);
 let breed=String(r.breed||'').trim();
 if(!breed||/^\d+$|^chưa rõ$|^chưa cập nhật$|^unknown$|^null$|^khác$|^chó$/i.test(breed))continue;
 if(species==='Mèo'&&/corgi/i.test(breed)||species==='Chó'&&/anh lông ngắn/i.test(breed)||['Mèo cam','Mướp','Nhật Bản'].includes(breed)){
  hold('legacy_pet_taxonomy',r,'Loài/giống mâu thuẫn hoặc tên màu lông/tên mơ hồ');continue;
 }
 if(species==='Mèo'&&/anh lông ngắn/i.test(breed))breed='Anh lông ngắn';
 if(species==='Chó'&&/^golden(?: retriver| retriever)?$/i.test(breed))breed='Golden Retriever';
 const key=species+'|'+breed;
 if(!breedUsed.has(key)){breedUsed.add(key);add('pet_breed',{id:stableId('pet_breed',key),species_id:stableId('pet_species',species),breed_name:breed,is_active:true});}
}
for(const species of speciesUsed){
 add('pet_species',{id:stableId('pet_species',species),species_name:species,is_active:true});
 add('pet_breed',{id:stableId('pet_breed',species+'|unknown'),species_id:stableId('pet_species',species),breed_name:'Chưa xác định',is_active:true});
}
const order=['membership_tier','reward_rule','pet_species','pet_breed','staff_level','service_category','service','service_addon','care_action','service_care_action','service_price_matrix','taxi_price_rule','hotel_room_type','hotel_room','supplier','product_category','variant_color','variant_size','variant_flavor','product','product_variant','payment_method_config','delivery_option_config','shipping_provider','voucher','promotion','promotion_product','promotion_service'];
const lit=v=>v==null?'NULL':typeof v==='number'?String(v):typeof v==='boolean'?String(v):"'"+String(v).replaceAll("'","''")+"'";
let importSql='BEGIN;\nSET LOCAL lock_timeout=\'15s\';\nSET LOCAL TIME ZONE \'Asia/Bangkok\';\nSELECT pg_advisory_xact_lock(198512,337);\n';
for(const name of order)for(const r of mapped.get(name)||[]){
 const cols=Object.keys(r);
 const vals=cols.map(col=>{const spec=model.get(name).columns.find(c=>c.name===col);return spec.type==='jsonb'&&r[col]!=null?lit(JSON.stringify(r[col]))+'::jsonb':lit(r[col]);});
 importSql+=`INSERT INTO public.${name} (${cols.map(c=>'"'+c+'"').join(',')}) VALUES (${vals.join(',')});\n`;
}
importSql+='SET CONSTRAINTS ALL IMMEDIATE;\nCOMMIT;\n';
const token=crypto.randomBytes(8).toString('hex'),stage='pawpal_catalogcheck_'+token;
const folder=path.resolve('D:/Aboutme/Pawpal-infra/supabase-local/imports/catalog-'+token);
fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'reference-source.private.txt'),source);fs.writeFileSync(path.join(folder,'prices-source.private.txt'),priceSource);
fs.writeFileSync(path.join(folder,'import.private.sql'),importSql);
fs.writeFileSync(path.join(folder,'source-sha256.txt'),[source,priceSource].map(s=>crypto.createHash('sha256').update(s).digest('hex')).join('\n'));
function docker(args){try{return execFileSync('docker',args,{encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});}catch(e){fs.writeFileSync(path.join(folder,'error.private.log'),e.stderr?.toString()||e.message);throw Error('Catalog import failed; private log in '+folder);}}
const sql=(db,q)=>docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-Atc',q]).trim();
const labels=JSON.parse(docker(['inspect','supabase-db','--format','{{json .Config.Labels}}']));
if(labels['com.docker.compose.project']!=='supabase'||labels['com.docker.compose.service']!=='db')throw Error('Not the local Supabase DB');
verify(sql,'postgres');
function emptyTargets(db){for(const n of mapped.keys())if(sql(db,`SELECT count(*) FROM public.${n}`)!=='0')throw Error('Refuse non-empty import target '+n);}
function check(db){verify(sql,db);for(const[n,rows]of mapped){if(Number(sql(db,`SELECT count(*) FROM public.${n}`))!==rows.length)throw Error('Import count mismatch '+n);}}
const authSql="SELECT md5(coalesce(string_agg(id::text||coalesce(encrypted_password,''),',' ORDER BY id),'')) FROM auth.users";
let created=false,applied=false;
try{
 emptyTargets('postgres');const authHash=sql('postgres',authSql);
 const remoteDump='/tmp/'+stage+'.dump',remoteSql='/tmp/'+stage+'.sql';
 docker(['exec','supabase-db','pg_dump','-U','supabase_admin','-d','postgres','-Fc','-f',remoteDump]);
 docker(['cp','supabase-db:'+remoteDump,path.join(folder,'before-import-full.dump')]);
 docker(['exec','supabase-db','createdb','-U','supabase_admin','-T','template0',stage]);created=true;
 docker(['exec','supabase-db','pg_restore','-U','supabase_admin','--exit-on-error','-d',stage,remoteDump]);
 docker(['cp',path.join(folder,'import.private.sql'),'supabase-db:'+remoteSql]);
 docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d',stage,'-v','ON_ERROR_STOP=1','-f',remoteSql]);
 check(stage);if(sql(stage,authSql)!==authHash)throw Error('Stage Auth unexpectedly changed');
 console.log('PASS isolated import with V1 FK/unique/check/exclusion constraints and exact row counts; Auth unchanged');
 if(apply){emptyTargets('postgres');docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-f',remoteSql]);applied=true;check('postgres');if(sql('postgres',authSql)!==authHash)throw Error('Live Auth changed');}
 const report=['# Nhập danh mục Cloud vào V1','',`Trạng thái: ${applied?'ĐÃ NHẬP vào local':'CHỈ THỬ trên database riêng; chưa nhập local'}. Nguồn gồm 33 nhóm xuất và bảng giá đủ 102 dòng; 100 dòng bảng giá ở lần đầu khớp nguyên dữ liệu lần bổ sung.`, '',
 `Backup đầy đủ trước nhập, SQL nhập và bản nguồn giữ tại \`${folder}\` ngoài webroot. Auth/mật khẩu Admin không thay đổi. Schema vẫn 105 bảng/906 cột/160 FK.`, '',
 '| Bảng V1 | Số dòng nhập |','|---|---:|',...order.filter(n=>mapped.has(n)).map(n=>`| ${n} | ${mapped.get(n).length} |`),'',
 '## Quy tắc chuyển dữ liệu','',
 '- Giữ ID UUID nguồn; ID dạng bank/cod/express... được ánh xạ UUID xác định theo tên bảng và ID cũ. Không sửa schema V1 để dùng lại ID text.',
 '- Tạo nhóm dịch vụ từ ba mã nhóm nguồn; sửa ba phòng có tên rõ nhưng nhóm sai sang pet_hotel. Chỉ tạo cấp độ Junior/Senior/Master từ cấp groomer nguồn; không biến chức danh chăm sóc/tài xế thành hạng chuyên môn.',
 '- Slug sản phẩm thiếu được tạo từ tên và UUID nguồn; tiện ích hotel mảng được chuyển thành mô tả text. Voucher chỉ lấy scope scalar rõ ràng; scope nhiều giá trị được giữ ngoài bản nhập để xử lý sau.',
 '- Ngày cấu hình lấy phần YYYY-MM-DD nguồn; không kéo dài hạn voucher/khuyến mãi đã hết hạn. Trạng thái chuyển mã rõ ràng; bảng giá tam_ngung thành disabled, không kích hoạt lại.',
 '- Không nhập QA/rác và dịch vụ tên thuốc/trị liệu theo phạm vi không thú y; các dòng phụ thuộc cũng được giữ ngoài bản nhập. Tắm khô không tự bị loại chỉ vì mô tả có nhắc từ thuốc.',
 '- Loài/giống được chuẩn hóa từ cặp nguồn, gộp một số tên đồng nghĩa rõ. Không nhập nhầm loài hoặc màu lông/tên mơ hồ làm giống; mỗi loài có giống quy ước Chưa xác định, giao diện phải lọc mục quy ước khỏi gợi ý giống thực.',
 '- Không nhập trạng thái phòng đang ở/giữ chỗ khi không chuyển booking. Không tạo booking, tồn kho, số dư điểm, checklist áp dụng hàng loạt hoặc loài dịch vụ hỗ trợ để bù dữ liệu chưa được cung cấp.', '',
 '## Bản ghi giữ ngoài bản nhập','', '| Bảng nguồn | ID/nhãn | Lý do |','|---|---|---|',...held.map(r=>`| ${r.table} | ${r.id||'—'} ${String(r.name).replaceAll('|','/')} | ${r.reason} |`),'',
 'Các bản ghi trên vẫn còn trong bản nguồn, chưa bị xóa trên Cloud và chưa được tạo trong local. Không tự coi chúng là dữ liệu đã di chuyển thành công.', '',
 '## Ánh xạ/hiệu chỉnh có ghi nhận','',...changes.map(s=>'- '+s),'',
 'Đã thử import vào bản sao V1 rồi đối chiếu từng bảng, khóa ngoại, unique, CHECK và exclusion giá. Việc có danh mục trong database không nghiệm thu các màn hình nghiệp vụ còn dùng schema cũ. Ảnh/file, bank_info và các cột không có trong bản xuất chưa được chuyển.', ''];
 fs.writeFileSync(path.join(root,'PAWPAL_NHAP_DANH_MUC_CLOUD_VAO_V1.md'),report.join('\n'),'utf8');
 console.log(`${applied?'APPLIED':'DRY RUN'}: ${[...mapped.values()].reduce((s,r)=>s+r.length,0)} V1 catalog rows; ${held.length} source rows held outside import. Report: PAWPAL_NHAP_DANH_MUC_CLOUD_VAO_V1.md`);
}finally{if(created&&/^pawpal_catalogcheck_[a-f0-9]{16}$/.test(stage))docker(['exec','supabase-db','dropdb','-U','supabase_admin','--force',stage]);}
