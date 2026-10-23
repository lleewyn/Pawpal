// Read a pasted SQL Editor Markdown result. Never imports rows into the database.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {tables,root}=require('./model.cjs');
const input=process.argv[2];
if(!input||!path.isAbsolute(input))throw Error('Pass absolute path to pasted Cloud export');
const raw=fs.readFileSync(input,'utf8');
const datasets=[];
for(const line of raw.split(/\r?\n/)){
 const m=line.match(/^\|\s*(\w+)\s*\|\s*(public\.\w+)\s*\|\s*(\w+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\[.*?\])\s*\|\s*(\[.*\])\s*\|\s*$/);
 if(!m)continue;
 const columns=JSON.parse(m[6]),rows=JSON.parse(m[7]);
 if(rows.length!==+m[5])throw Error('Export count mismatch: '+m[1]);
 if(new Set(rows.filter(r=>r.id).map(r=>r.id)).size!==rows.filter(r=>r.id).length)throw Error('Duplicate exported IDs: '+m[1]);
 datasets.push({name:m[1],source:m[2],status:m[3],total:+m[4],exported:+m[5],columns,rows});
}
if(datasets.length!==33||new Set(datasets.map(d=>d.name)).size!==33)throw Error('Expected exactly 33 distinct datasets');
const hash=crypto.createHash('sha256').update(raw).digest('hex');
const archive=path.resolve('D:/Aboutme/Pawpal-infra/supabase-local/imports/cloud-reference-'+hash.slice(0,12));
fs.mkdirSync(archive,{recursive:true});
const copy=path.join(archive,'source-export.private.txt');
if(fs.existsSync(copy)&&crypto.createHash('sha256').update(fs.readFileSync(copy)).digest('hex')!==hash)throw Error('Archive checksum mismatch');
fs.writeFileSync(copy,raw,'utf8');fs.writeFileSync(path.join(archive,'SHA256.txt'),hash+'  source-export.private.txt\n');
const byName=new Map(datasets.map(d=>[d.name,d]));
const model=new Map(tables.map(t=>[t.name,t]));
const issues=[];
for(const d of datasets){
 const t=model.get(d.name);if(!t)continue;
 for(const c of t.columns){
  if(!c.nullable&&c.default===null&&!c.pk){
   const missing=d.rows.filter(r=>r[c.name]==null||r[c.name]==='');
   if(missing.length)issues.push([d.name,c.name,missing.length,'Thiếu/rỗng trường bắt buộc V1; cần ánh xạ, không tự điền dữ liệu giả']);
  }
  const ref=c.ref?.match(/^public\.(\w+)\((\w+)\)$/);
  if(ref){
   const target=byName.get(ref[1]);
   const assigned=d.rows.filter(r=>r[c.name]!=null);
   if(!assigned.length)continue;
   if(!target||!target.rows.length){issues.push([d.name,c.name,assigned.length,'Chưa có danh mục đích trong bản xuất: '+ref[1]]);continue;}
   const keys=new Set(target.rows.map(r=>r[ref[2]]));
   const invalid=assigned.filter(r=>!keys.has(r[c.name]));
   if(invalid.length)issues.push([d.name,c.name,invalid.length,'FK không tìm thấy trong dữ liệu '+ref[1]+' đã xuất']);
  }
  if(c.type==='text'){
   const complex=d.rows.filter(r=>r[c.name]!==null&&typeof r[c.name]==='object');
   if(complex.length)issues.push([d.name,c.name,complex.length,'Nguồn là array/object nhưng V1 dùng text; cần chuyển thành mô tả phù hợp']);
  }
 }
}
const nameField={service:'service_name',product:'product_name',care_action:'action_name'};
const junk=[];
for(const [tableName,field]of Object.entries(nameField))for(const row of byName.get(tableName)?.rows||[]){
 if(/\bQA\b|kiểm thử|^sdf\w*$|^test\b/i.test(row[field]||''))junk.push([tableName,row.id,row[field]]);
}
const services=byName.get('service')?.rows||[];
const veterinary=services.filter(r=>/thuốc|trị liệu|da liễu|thú y|tiêm phòng/i.test([r.service_name,r.description].filter(Boolean).join(' ')));
const groups=[...new Set(services.map(r=>r.service_category).filter(Boolean))];
const mismatches=services.filter(r=>/^phòng\b|\bsuite\b|\bcondo\b/i.test(r.service_name||'')&&r.service_category!=='pet_hotel');
const taxonomy=byName.get('legacy_pet_taxonomy')?.rows||[];
const invalidBreed=taxonomy.filter(r=>!r.breed||/^\d+$|^chưa rõ$|^chưa cập nhật$|^unknown$|^null$/i.test(String(r.breed).trim()));
const conflicts=taxonomy.filter(r=>/^(cat|mèo)$/i.test(r.species||'')&&/corgi/i.test(r.breed||'')||/^(dog|chó)$/i.test(r.species||'')&&/anh lông ngắn/i.test(r.breed||''));
const esc=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ');
const report=['# Đối chiếu dữ liệu danh mục Cloud với V1','',
 `Nguồn: kết quả SQL Editor người dùng gửi. Đã đọc ${datasets.length} nhóm và ${datasets.reduce((n,d)=>n+d.exported,0)} bản ghi xuất ra; chưa ghi bất kỳ bản ghi nào vào database local.`, '',
 `SHA256 nguồn: \`${hash}\`. Bản gốc lưu ngoài webroot tại \`${archive}\`.`, '',
 '## 1. Độ đầy đủ của dữ liệu','',
 '| Nhóm | Trạng thái | Tổng nguồn | Đã xuất |','|---|---|---:|---:|',
 ...datasets.map(d=>`| \`${d.name}\` | ${d.status} | ${d.total} | ${d.exported} |`),'',
 'Bản xuất có một nhóm more_rows: service_price_matrix mới có 100/102 dòng. Cần chạy export_cloud_service_prices_complete.sql trên Cloud và gửi lại đầy đủ bảng giá. Không dựa vào pg_temp ở phiên SQL trước vì kết nối SQL Editor có thể thay đổi.', '',
 'Các bảng danh mục V1 chưa có ở Cloud cũ không phải lỗi mất dữ liệu; loài/giống và nhóm dịch vụ cần được tạo qua ánh xạ từ dữ liệu text cũ. Các nhóm missing_table không được tự biến thành bảng legacy mới trong V1.', '',
 '## 2. Sai khác trường và quan hệ cần xử lý','',
 '| Bảng | Cột | Số dòng cần xét | Phát hiện |','|---|---|---:|---|',
 ...issues.map(i=>'| '+i.map(esc).join(' | ')+' |'),'',
 'Bảng trên là kiểm tra trường/FK của phần danh mục đã xuất, chưa thay thế thử import trong database riêng. Thời điểm tạo/cập nhật có default sẽ để database áp dụng nếu nguồn không có. Các ID hợp lệ được ưu tiên giữ để duy trì quan hệ; không đổi ID tùy tiện.', '',
 '## 3. Dữ liệu cần làm sạch trước khi nhập','',
 `- Nhóm dịch vụ cũ: ${groups.map(esc).join(', ')}; cần chuyển thành service_category và category_id.`,
 `- Có ${junk.length} tên có dấu hiệu dữ liệu kiểm thử/rác trong service/product/care_action; danh sách dưới là ứng viên rà soát, chưa tự xóa hoặc nhập.`,
 `- Có ${veterinary.length} dịch vụ chứa nội dung thuốc/trị liệu/da liễu/thú y; cần đối chiếu phạm vi không thú y, không nhập nguyên trạng chỉ vì Cloud có sẵn.`,
 `- Có ${mismatches.length} dịch vụ tên phòng/suite/condo nhưng nhóm cũ không phải pet_hotel.`,
 `- Loài/giống text: ${taxonomy.length} cặp, trong đó ${invalidBreed.length} cặp thiếu/giá trị mặc định/vô nghĩa và ${conflicts.length} cặp mâu thuẫn rõ giữa tên giống và loài. Cần chuẩn hóa mã dog/cat với tên Chó/Mèo, đối chiếu các tên đồng nghĩa; không tự đoán loài cho tên mơ hồ.`, '',
 '| Loại | Bảng/ID nguồn | Nội dung cần xét |','|---|---|---|',
 ...junk.map(([t,id,name])=>`| Tên kiểm thử/rác | ${esc(t)} / ${esc(id)} | ${esc(name)} |`),
 ...veterinary.map(r=>`| Phạm vi dịch vụ | service / ${r.id} | ${esc(r.service_name)} |`),
 ...mismatches.map(r=>`| Nhóm dịch vụ không khớp | service / ${r.id} | ${esc(r.service_name)} → ${esc(r.service_category)} |`),
 ...conflicts.map(r=>`| Loài/giống mâu thuẫn | pet_profile (chỉ lấy danh mục) | ${esc(r.species)} / ${esc(r.breed)} |`), '',
 '## 4. Thứ tự xử lý tiếp','',
 '1. Bổ sung đủ bảng giá 102 dòng; xác minh các quan hệ chưa tìm thấy trước khi nhập.',
 '2. Lập ánh xạ danh mục loài/giống, nhóm dịch vụ và cấp độ chuyên môn. Chức danh như người chăm sóc/tài xế không được tự chuyển thành thứ hạng chuyên môn.',
 '3. Chuẩn hóa trạng thái tiếng Việt cũ sang mã V1; chuyển tiện ích mảng thành mô tả text, giữ specs đúng jsonb theo ý nghĩa.',
 '4. Phân loại bản ghi QA/rác, dịch vụ không đúng phạm vi và các tên/nhóm mâu thuẫn; ghi lại cách xử lý thay vì tự đoán hoặc lặng lẽ bỏ.',
 '5. Tạo SQL import theo thứ tự FK, thử trên database riêng với constraint V1 (gồm khoảng giá chồng lấn); chỉ sau khi dữ liệu đủ và ánh xạ rõ mới áp dụng vào local.', '',
 'Báo cáo này không xác nhận đã nhập dữ liệu. Không dùng file JSON/array giả trên giao diện làm cách bù các danh mục đang thiếu.', ''];
fs.writeFileSync(path.join(root,'docs/archive/migration/PAWPAL_DU_LIEU_CLOUD_DOI_CHIEU_V1.md'),report.join('\n'),'utf8');
console.log(`Parsed ${datasets.length} datasets / ${datasets.reduce((n,d)=>n+d.exported,0)} rows. Missing price rows: 2. Field/FK findings: ${issues.length}.`);
console.log('Report: PAWPAL_DU_LIEU_CLOUD_DOI_CHIEU_V1.md');
console.log('No business data imported. Source archived outside webroot.');
