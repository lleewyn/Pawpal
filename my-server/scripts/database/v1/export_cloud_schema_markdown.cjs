// Read-only schema dictionary. Never reads business rows, Auth identities or key values.
const fs=require('node:fs');
const {sql}=require('./cloud_connection.cjs');
const query=`BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT jsonb_build_object(
 'captured_at',now(),
 'tables',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'comment',obj_description(c.oid),
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
 'required',a.attnotnull,'comment',col_description(c.oid,a.attnum),'generated',a.attgenerated<>'', 'identity',a.attidentity<>'',
 'has_default',a.atthasdef) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'kind',k.contype,
 'definition',pg_get_constraintdef(k.oid)) ORDER BY k.contype,k.conname),'[]'::jsonb) FROM pg_constraint k WHERE k.conrelid=c.oid),
 'rls',c.relrowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition),
 'views',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind) ORDER BY c.relname),'[]'::jsonb) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('v','m')));
COMMIT;`;
const data=JSON.parse(sql(query));
const escape=v=>String(v??'—').replaceAll('|','&#124;').replace(/\r?\n/g,'<br>');
const lines=[];const add=s=>lines.push(s);
const total=data.tables.reduce((n,t)=>n+t.columns.length,0);
add('# Cấu trúc CSDL Pawpal đang có trên Supabase Cloud mới');add('');
add(`Thời điểm đọc cấu trúc: ${new Date(data.captured_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok',hour12:false})} (UTC+7).`);
add('');add('Project: `cpzuvaplseielhgcnqrn`. Nguồn: metadata PostgreSQL của Cloud mới, truy vấn chỉ đọc trong cùng một snapshot.');
add('');add(`Phạm vi: **${data.tables.length} bảng, ${total} cột và ${data.views.length} view trong schema public**. Không lấy dữ liệu các hàng, mật khẩu, OTP hay giá trị API key. Schema Auth/Storage và các bảng nội bộ pawpal_private nằm ngoài danh mục nghiệp vụ này.`);
add('');add('Đây là bản chụp cấu trúc vật lý đang triển khai của mô hình V1, không phải kết luận tự động rằng mọi bảng đã đạt 3NF. Muốn xác nhận 3NF cần đối chiếu khóa ứng viên, phụ thuộc hàm và quy tắc nghiệp vụ; tên bảng hoặc việc có khóa chính chưa đủ chứng minh.');
add('');add('## 1. Danh mục bảng');add('');
add('| STT | Thực thể | Mô tả từ CSDL | Thuộc tính | Khóa chính |');add('| :---: | --- | --- | --- | --- |');
data.tables.forEach((t,i)=>add(`| ${i+1} | \`${t.name}\` | ${escape(t.comment||'CSDL chưa ghi chú mô tả')} | ${t.columns.map(c=>'`'+c.name+'`').join(', ')} | ${escape(t.constraints.filter(k=>k.kind==='p').map(k=>k.definition).join('; ')||'Chưa khai báo')} |`));
add('');add('## 2. Từ điển cột và ràng buộc');add('');
add('Ý nghĩa cột lấy từ COMMENT trong CSDL. Khi chưa có COMMENT, ghi rõ chưa có mô tả để tránh tự gán ý nghĩa nghiệp vụ. “Có mặc định” chỉ báo sự tồn tại, không xuất biểu thức mặc định có thể chứa nội dung cấu hình.');
data.tables.forEach((t,i)=>{
 add('');add(`### ${i+1}. ${t.name}`);add('');add(`RLS: **${t.rls?'Bật':'Tắt'}**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.`);add('');
 add('| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |');add('| :---: | --- | --- | :---: | --- | --- |');
 t.columns.forEach((c,j)=>add(`| ${j+1} | \`${c.name}\` | ${escape(c.type)} | ${c.required?'Có':'Không'} | ${c.identity?'Identity':c.generated?'Cột tính toán':c.has_default?'Có mặc định':'—'} | ${escape(c.comment||'Chưa có COMMENT')} |`));
 add('');add('| Loại | Tên ràng buộc | Định nghĩa |');add('| --- | --- | --- |');
 t.constraints.forEach(k=>add(`| ${escape(({p:'Khóa chính',f:'Khóa ngoại',u:'Duy nhất',c:'Kiểm tra',x:'Loại trừ'})[k.kind]||k.kind)} | \`${k.name}\` | ${escape(k.definition)} |`));
 if(!t.constraints.length)add('| — | — | Chưa khai báo ràng buộc |');
});
add('');add('## 3. View public');add('');add('| STT | View | Loại |');add('| :---: | --- | --- |');
data.views.forEach((v,i)=>add(`| ${i+1} | \`${v.name}\` | ${v.kind==='m'?'Materialized view':'View'} |`));
add('');add('## 4. Cách cập nhật');add('');add('Chạy `node scripts/database/v1/export_cloud_schema_markdown.cjs`. Lệnh chỉ đọc metadata Cloud; ghi lại file Markdown này trong workspace. Không sửa thiết kế logic gốc và không thay đổi CSDL.');add('');
const destination='docs/database/PAWPAL_CSDL_CLOUD_MOI_HIEN_TAI_DANG_BANG.md';
fs.writeFileSync(destination,lines.join('\n'),'utf8');
if((lines.join('\n').match(/^### \d+\./gm)||[]).length!==data.tables.length)throw Error('Incomplete dictionary');
console.log(`Created ${destination}: ${data.tables.length} tables, ${total} columns, ${data.views.length} views; metadata only.`);
