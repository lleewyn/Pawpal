const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
const root=path.resolve(__dirname,'../../..');
const source=path.join(root,'data/Dich_vu_data_final.csv');
// Excel exported a tab-separated file with quoted multiline cells despite the .csv extension.
function parse(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
 else if(!quoted&&(c==='\t'||c==='\n')){row.push(cell.replace(/\r$/,''));cell='';if(c==='\n'){rows.push(row);row=[];}}
 else cell+=c;}
 assert.equal(quoted,false,'Unclosed quote');if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
const clean=s=>!s||s.trim()==='-'?null:s.trim();
function range(text){const n=text.match(/\d+(?:\.\d+)?/g)?.map(Number)||[];assert.ok(n.length,'Missing range');
 if(text.includes('>='))return {from:n[0],to:null,inclusive:false};
 return {from:n.length===1?0:n[0],to:n.length===1?n[0]:n[1],inclusive:!text.includes('<')&&n.at(-1)===99};}
function load(){
 const raw=parse(fs.readFileSync(source,'utf8').replace(/^\uFEFF/,''));assert.equal(raw[0].length,29);const rows=raw.slice(2).filter(r=>r.some(Boolean));
 const groups=new Map();const missing=new Set();const assets=new Map();
 function walk(p){for(const d of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,d.name);if(d.isDirectory())walk(f);else if(!assets.has(d.name.toLowerCase()))assets.set(d.name.toLowerCase(),'/'+path.relative(root,f).replaceAll('\\','/'));}}walk(path.join(root,'assets/images/services'));
 for(const r of rows){assert.equal(r.length,29);assert.match(r[1],/^SVC-(SPA|HTL|TAX)-\d{2}$/);assert.ok(Number(r[23])>=0);assert.equal(r[7],'Đang phục vụ');
  if(!groups.has(r[1]))groups.set(r[1],{code:r[1],rows:[],variants:new Map(),images:[]});const g=groups.get(r[1]);g.rows.push(r);
  if(g.variants.has(r[16])){const old=g.variants.get(r[16]);for(let i=0;i<r.length;i++)if(![0,20].includes(i))assert.equal(r[i],old[i],`Conflicting duplicate ${r[16]} column ${i}`);}else g.variants.set(r[16],r);
  for(const name of (r[13]||'').split(/[\s;,]+/).filter(Boolean)){const url=assets.get(name.toLowerCase());if(url){if(!g.images.includes(url))g.images.push(url);}else missing.add(name);}
 }
 assert.equal(groups.size,24);assert.equal([...groups.values()].reduce((n,g)=>n+g.variants.size,0),37);
 return {groups,missing:[...missing],rows:rows.length};
}
async function insert(db,table,data){const keys=Object.keys(data);return (await db.query(`INSERT INTO public.${table}(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,Object.values(data))).rows[0];}
async function update(db,table,id,data){const keys=Object.keys(data);await db.query(`UPDATE public.${table} SET ${keys.map((k,i)=>k+'=$'+(i+2)).join(',')} WHERE id=$1`,[id,...Object.values(data)]);}
async function main(){
 const input=load();if(process.argv.includes('--validate')){console.log({services:input.groups.size,variants:37,sourceRows:input.rows,missingImages:input.missing});return;}
 const apply=process.argv.includes('--apply');const db=await connect();const backup=path.join(os.tmpdir(),'pawpal-services-final-'+new Date().toISOString().replace(/[:.]/g,'-')+'.private.sql');
 try{
  await db.query("BEGIN; SET LOCAL lock_timeout='15s'; SET LOCAL statement_timeout='60s'; SELECT pg_advisory_xact_lock(20261025,96)");
  const target=['service','service_price_matrix','service_image','service_supported_species','service_care_action','care_action','pet_species','hotel_room_type','hotel_room','taxi_price_rule'];
  let restore='BEGIN;\n';for(const t of target){const {rows}=await db.query(`SELECT * FROM public.${t}`);restore+=`-- ${t}\n`;for(const row of rows)restore+=`-- BEFORE ${t}: ${JSON.stringify(row)}\n`;}
  const defs=(await db.query("SELECT n.nspname,p.proname,pg_get_functiondef(p.oid) def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','pawpal_private') AND p.prokind='f' AND (p.prosrc LIKE '%taxi_price_rule%' OR p.prosrc LIKE '%hotel_room_type%' OR p.prosrc LIKE '%service_price_matrix%')")).rows;
  restore+=defs.map(r=>r.def+';').join('\n')+'\nROLLBACK;\n';fs.writeFileSync(backup,restore,{mode:0o600});
  const protectedTables=['appointment','appointment_item','hotel_booking','taxi_trip','review','payment'];
  const hashes=async()=>{const out=[];for(const t of protectedTables)out.push((await db.query(`SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) hash FROM public.${t} t`)).rows[0].hash);return out;};const before=await hashes();
  await db.query(fs.readFileSync(path.join(__dirname,'096_service_catalog_final.sql'),'utf8'));
  const categories=(await db.query('SELECT * FROM public.service_category')).rows;const levels=(await db.query('SELECT * FROM public.staff_level')).rows;const species=(await db.query('SELECT * FROM public.pet_species')).rows;
  const oldServices=(await db.query('SELECT * FROM public.service')).rows;const roomTypes=(await db.query('SELECT * FROM public.hotel_room_type')).rows;
  const summary=[];
  for(const g of input.groups.values()){
   const r=g.rows[0],kind=r[3]==='Spa/Grooming'?'grooming_spa':r[3]==='Pet Hotel'?'pet_hotel':'pet_taxi';
   const legacy=r[1].replace('SVC-','').replaceAll('-','').replace('TAX','TXI');let svc=oldServices.find(s=>s.service_code===g.code)||oldServices.find(s=>s.service_code===legacy);
   const minutes=r[8].includes('ngày')?1440:/\d+/.test(r[8])?Number(r[8].match(/\d+/)[0]):svc?.estimated_duration||30;
   const lv={Basic:'JUNIOR',Intermediate:'SENIOR',Advanced:'MASTER'}[r[9]];
   const data={service_code:g.code,service_name:r[2].replaceAll('&','và'),description:r[5],benefits:r[10],amenities:r[12],estimated_duration:minutes,
    status:'active',category_id:categories.find(c=>c.category_code===kind).id,staff_level_required_id:lv?levels.find(l=>l.level_code===lv).id:null,
    package_name:r[4],duration_label:r[8],trip_type:kind==='pet_taxi'?(g.code.endsWith('02')?'round_trip':'one_way'):null};
   if(svc)await update(db,'service',svc.id,data);else svc=await insert(db,'service',data);g.id=svc.id;
   await db.query('DELETE FROM public.service_supported_species WHERE service_id=$1',[svc.id]);
   const speciesIds=[];for(let name of r[6].split(',').map(s=>s.trim())){if(name==='Hamster')name='Chuột Hamster';if(name==='Chó từ 10kg trở lên')name='Chó';let sp=species.find(s=>s.species_name===name);if(!sp&&['Bọ Ú','Rùa'].includes(name)){sp=await insert(db,'pet_species',{species_name:name,is_active:true});species.push(sp);}assert.ok(sp,'Unknown species '+name);speciesIds.push(sp.id);}
   await db.query('INSERT INTO public.service_supported_species(service_id,species_id) SELECT $1,unnest($2::uuid[])',[svc.id,speciesIds]);
   await db.query('DELETE FROM public.service_care_action WHERE service_id=$1',[svc.id]);
   const steps=r[11].split(';').map(s=>s.trim()).filter(Boolean);
   await db.query('INSERT INTO public.care_action(action_name,is_active) SELECT DISTINCT n,true FROM unnest($1::text[]) n WHERE NOT EXISTS(SELECT 1 FROM public.care_action WHERE action_name=n AND is_active)',[steps]);
   await db.query('INSERT INTO public.service_care_action(service_id,care_action_id,display_order,estimated_duration) SELECT $1,(SELECT id FROM public.care_action WHERE action_name=n AND is_active ORDER BY id LIMIT 1),ord-1,0 FROM unnest($2::text[]) WITH ORDINALITY AS t(n,ord)',[svc.id,steps]);
   await db.query('DELETE FROM public.service_image WHERE service_id=$1',[svc.id]);
   await db.query('INSERT INTO public.service_image(service_id,image_url,display_order,is_thumbnail) SELECT $1,url,ord-1,ord=1 FROM unnest($2::text[]) WITH ORDINALITY t(url,ord)',[svc.id,g.images]);
   await db.query("UPDATE public.service_price_matrix SET status='inactive' WHERE service_id=$1 AND status='active'",[svc.id]);
   if(kind==='grooming_spa')for(const v of g.variants.values()){const w=range(v[18]);await insert(db,'service_price_matrix',{service_id:svc.id,variant_code:v[16],variant_condition:v[17],weight_from:w.from,weight_to:w.to,weight_to_inclusive:w.inclusive,unit_price:Number(v[23]),duration_minutes:Number(v[8].match(/\d+/)[0]),effective_from:v[24]+'T00:00:00+07:00',effective_to:clean(v[25]),status:'active'});}
   if(kind==='pet_taxi'){
    await db.query("UPDATE public.taxi_price_rule SET status='inactive' WHERE service_id=$1 OR service_id IS NULL",[svc.id]);
    for(const v of g.variants.values()){const w=range(v[18]),d=range(v[26]);await insert(db,'taxi_price_rule',{service_id:svc.id,variant_code:v[16],variant_condition:v[17],weight_from:w.from,weight_to:w.to,weight_to_inclusive:w.inclusive,distance_from:d.from,distance_to:d.to,distance_to_inclusive:d.to===20,base_price:Number(v[23]),surcharge:0,effective_from:(clean(v[27])||v[24])+'T00:00:00+07:00',effective_to:clean(v[28]),status:'active'});}
   }
   if(kind==='pet_hotel'){
    const w=range(r[18]);let type=roomTypes.find(t=>t.service_id===svc.id)||roomTypes.find(t=>t.room_type===r[19]);
    const tdata={room_type:r[19],capacity:Number(r[21]),daily_price:Number(r[23]),description:r[22],amenities:r[12],status:'active',service_id:svc.id,variant_code:r[16],variant_condition:r[17],weight_from:w.from,weight_to:w.to,weight_to_inclusive:w.inclusive,billing_minutes:minutes,effective_from:r[24]+'T00:00:00+07:00',effective_to:clean(r[25])};
    if(type)await update(db,'hotel_room_type',type.id,tdata);else type=await insert(db,'hotel_room_type',tdata);
    for(const v of g.rows){const room=(await db.query('SELECT * FROM public.hotel_room WHERE room_number=$1',[v[20]])).rows[0];if(room){assert.equal(room.room_type_id,type.id);}else await insert(db,'hotel_room',{room_number:v[20],room_type_id:type.id,status:'available',description:v[22]});}
   }
   summary.push({code:g.code,variants:g.variants.size,images:g.images.length});
   console.log('Validated source group',g.code);
  }
  // CSV is authoritative; unused legacy codes are reversibly retired, never deleted.
  await db.query("UPDATE public.hotel_room r SET status='inactive' WHERE r.room_number IN ('H-PLUS-001','H-LUX-001') AND NOT EXISTS(SELECT 1 FROM public.hotel_booking b WHERE b.room_id=r.id)");
  await db.query(fs.readFileSync(path.join(__dirname,'097_service_catalog_functions.sql'),'utf8'));
  await db.query(fs.readFileSync(path.join(__dirname,'098_public_service_catalog.sql'),'utf8'));
  await db.query(fs.readFileSync(path.join(root,'scripts/test/service_catalog_final_rollback.sql'),'utf8'));
  assert.deepEqual(await hashes(),before,'Historical business data changed');
  const catalog=(await db.query('SELECT public.public_service_directory() data')).rows[0].data;assert.equal(catalog.length,24);
  for(const g of input.groups.values()){
   const s=catalog.find(s=>s.service_code===g.code);assert.ok(s,g.code);assert.equal(s.prices.length,g.variants.size);
   assert.equal(s.description,g.rows[0][5]);assert.equal(s.benefits,g.rows[0][10]);assert.equal(s.amenities,g.rows[0][12]);
   assert.deepEqual(s.images,g.images);
   for(const v of g.variants.values()){const p=s.prices.find(p=>p.variant_code===v[16]);assert.ok(p,v[16]);assert.equal(Number(p.unit_price),Number(v[23]));const w=range(v[18]);assert.equal(Number(p.weight_from),w.from);assert.equal(p.weight_to==null?null:Number(p.weight_to),w.to);assert.equal(p.weight_to_inclusive,w.inclusive);if(g.code.includes('-SPA-'))assert.equal(p.duration_minutes,Number(v[8].match(/\d+/)[0]));}
  }
  await db.query("NOTIFY pgrst,'reload schema'");await db.query(apply?'COMMIT':'ROLLBACK');
  console.log({mode:apply?'COMMITTED':'DRY RUN ROLLED BACK',sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),backup,missingImages:input.missing,services:summary,historyPreserved:true});
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={load,parse,range};
