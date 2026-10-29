// Opt-in data migration tests; refuses any database without the task ownership marker.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
if(!process.argv.includes('--local-fixtures')){console.log('No changes. Pass --local-fixtures for owned local database tests.');process.exit(0);}
const hotel=process.argv.includes('--hotel-fixtures'),dirIndex=process.argv.indexOf('--evidence-dir'),out=dirIndex<0?'docs/chatbot/stage3-faq-2026-10-29':process.argv[dirIndex+1];assert.match(out,/^docs\/chatbot\/stage3-[a-z0-9-]+$/);
const env=JSON.parse(fs.readFileSync(out+'/local-environment.txt','utf8'));
assert.equal(env.status,'READY');assert.match(env.database,/^pawpal_chatbot_g0_[a-f0-9]{12}$/);
assert.equal(env.ownerMarker,'pawpal-chatbot-g0-'+env.database.slice('pawpal_chatbot_g0_'.length));
const sql=text=>execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',env.database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],{input:text,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:15000}).trim();
assert.equal(sql("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"),env.ownerMarker);
const root='scripts/database/v1/'+(hotel?'152_chat_hotel_faq_missing_prices':'150_chat_booking_faq_audience'),forward=fs.readFileSync(root+'.sql','utf8'),back=fs.readFileSync(root+'.rollback.sql','utf8');
const previous=forward.match(/\$previous\$([\s\S]*?)\$previous\$/)[1],corrected=forward.match(/\$corrected\$([\s\S]*?)\$corrected\$/)[1];
const quote=s=>"'"+s.replace(/'/g,"''")+"'",question=hotel?'Phòng Hotel thường và VIP khác nhau về giá thế nào?':'Đặt lịch PawPal như thế nào?',id=(hotel?'152':'150')+'00000-0000-4000-8000-000000000001',prefix=hotel?'hotel':'booking';
const report={scope:'Migration '+(hotel?'152':'150')+' on marker-owned local PostgreSQL only; no Cloud or model',database:env.database,checks:[],status:'INCOMPLETE',hashes:{}};
for(const [key,value]of Object.entries({forward,rollback:back}))report.hashes[key]=crypto.createHash('sha256').update(value).digest('hex');
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
const get=()=>JSON.parse(sql(`SELECT row_to_json(f) FROM public.chatbot_knowledge_faq f WHERE id='${id}'`));
function seed(answer=previous,active=true){sql(`DELETE FROM public.chatbot_knowledge_faq WHERE question=${quote(question)}; INSERT INTO public.chatbot_knowledge_faq(id,category,question,answer,keywords,priority,is_active) VALUES('${id}','QA-local',${quote(question)},${quote(answer)},ARRAY['QA-local'],17,${active});`);}
function rejected(migration,reason){try{sql(migration);assert.fail('migration should refuse');}catch(error){assert.ok(String(error.stderr||'').includes(reason),'expected bounded precondition error');}}
try{
 assert.equal(previous,JSON.parse(fs.readFileSync('docs/chatbot/stage3-staff-2026-10-28/model-request.txt','utf8')).cases[hotel?1:0].context.faq[0].answer);
 if(hotel){assert.match(corrected,/chưa có mức giá cụ thể/);assert.match(corrected,/chưa đủ thông tin để so sánh/);assert.doesNotMatch(corrected,/có thể giúp/);}else{assert.match(corrected,/Thành viên đăng nhập/);assert.match(corrected,/Khách vãng lai có thể/);assert.match(corrected,/chưa có nghĩa là đã thanh toán/);}
 seed();const original=get();sql(forward);const applied=get();assert.equal(applied.answer,corrected);
 for(const key of ['id','category','question','keywords','priority','is_active','created_at'])assert.deepEqual(applied[key],original[key]);
 sql(forward);assert.deepEqual(get(),applied);pass('Forward changes only the reviewed answer; reapply is a no-op');
 sql(back);assert.equal(get().answer,previous);const rolled=get();sql(back);assert.deepEqual(get(),rolled);pass('Rollback restores exact previous answer; reapply is a no-op');
 seed('Independently edited answer');for(const migration of [forward,back])rejected(migration,prefix+'_faq_changed_review_required');assert.equal(get().answer,'Independently edited answer');pass('Both directions preserve independent edits');
 sql(`DELETE FROM public.chatbot_knowledge_faq WHERE question=${quote(question)}`);for(const migration of [forward,back])rejected(migration,prefix+'_faq_missing_review_required');pass('Missing FAQ refuses instead of inserting or inventing a row');
 seed();sql(`INSERT INTO public.chatbot_knowledge_faq(category,question,answer,priority) VALUES('QA-local',${quote(question)},${quote(previous)},17)`);for(const migration of [forward,back])rejected(migration,prefix+'_faq_ambiguous_review_required');assert.equal(get().answer,previous);pass('Duplicate question refuses without partially updating rows');
 seed(previous,false);sql(forward);assert.equal(get().is_active,false);assert.equal(get().answer,corrected);sql(back);assert.equal(get().is_active,false);pass('Inactive FAQ stays inactive across forward and rollback');
 seed();sql(forward);sql(`UPDATE public.chatbot_knowledge_faq SET answer='Later independent edit' WHERE id='${id}'`);rejected(back,prefix+'_faq_changed_review_required');assert.equal(get().answer,'Later independent edit');pass('Rollback refuses to overwrite an edit made after migration');
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.name;process.exitCode=1;console.error('Local FAQ verification failed; SQL and private values suppressed.');}
finally{fs.writeFileSync(out+(hotel?'/hotel-faq-results.txt':'/local-results.txt'),JSON.stringify(report,null,2)+'\n');}
