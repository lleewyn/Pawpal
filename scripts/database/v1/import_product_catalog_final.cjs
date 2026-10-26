const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {parse}=require('./import_service_catalog_final.cjs');const {connect}=require('./service_import_connection.cjs');
const {variantArtwork,productArtwork}=require('./product_variant_artwork.cjs');
const root=path.resolve(__dirname,'../../..'),source=path.join(root,'data/San_pham_final.csv');
const aliases={'DD-BAT-02':'DD-BAT-01','TP-BANH-15':'TP-SUP-15','VS-KEM-02':'VS-KIM-02'};
const clean=s=>s?.trim()||null;const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/&/g,'va').replace(/[^a-z0-9]+/g,' ').trim();
function load(){
 const text=fs.readFileSync(source,'utf8').replace(/^\uFEFF/,'');const records=parse(text);assert.equal(records[0].length,55);const rows=records.slice(1).filter(r=>r.some(Boolean)),groups=new Map();
 const skus=new Set(),barcodes=new Set();let stock=0;
 for(const r of rows){assert.equal(r.length,55);assert.ok(r[14].startsWith(r[1]+'-V'));assert.ok(!skus.has(r[14]),'Duplicate SKU');skus.add(r[14]);for(const i of [23,24,25,35,36,37])assert.match(r[i],/^\d+$/,`Invalid numeric ${r[14]} column ${i}`);assert.ok(!barcodes.has(r[26]),'Duplicate barcode');barcodes.add(r[26]);assert.equal(r[12],'Đang kinh doanh');assert.equal(r[27],'Còn hàng');stock+=Number(r[35]);if(!groups.has(r[1]))groups.set(r[1],{code:r[1],rows:[]});groups.get(r[1]).rows.push(r);}
 assert.equal(groups.size,38);assert.equal(skus.size,65);assert.equal(stock,4028);return {groups,rows,stock,sha:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')};
}
function physicalWeight(text){const t=(text||'').toLowerCase().replace(/,/g,'.');let m=t.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|g)$/);if(m)return Number(m[1])*Number(m[2])/(m[3]==='g'?1000:1);m=t.match(/(\d+(?:\.\d+)?)\s*(kg|g)\b/);return m?Number(m[1])/(m[2]==='g'?1000:1):null;}
async function put(db,table,data,id){const keys=Object.keys(data);if(id){await db.query(`UPDATE public.${table} SET ${keys.map((k,i)=>k+'=$'+(i+2)).join(',')} WHERE id=$1`,[id,...Object.values(data)]);return {id,...data};}return (await db.query(`INSERT INTO public.${table}(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,Object.values(data))).rows[0];}
function artwork(code){const verified=productArtwork(code);if(verified)return verified;if(code==='DD-BAT-01')return [];const stem=(aliases[code]||code).toLowerCase();return fs.readdirSync(path.join(root,'assets/images/shop/products')).filter(f=>{const s=path.parse(f).name.toLowerCase();return s===stem||s.startsWith(stem+'_');}).sort((a,b)=>a.length-b.length||a.localeCompare(b)).map(f=>'/assets/images/shop/products/'+f);}
async function main(){const input=load();if(process.argv.includes('--validate')){console.log({products:38,variants:65,stock:input.stock,sha:input.sha});return;}
 const db=await connect(),apply=process.argv.includes('--apply'),runId=crypto.randomUUID(),folder=path.join(os.tmpdir(),'pawpal-product-final-'+runId);fs.mkdirSync(folder,{recursive:true});
 try{
  await db.query("BEGIN;SET LOCAL lock_timeout='15s';SET LOCAL statement_timeout='90s';SELECT pg_advisory_xact_lock(20261025,99)");
  // Take a recoverable business snapshot outside the webroot; no customer secrets are exported.
  const targets=['product','product_variant','product_media','product_variant_media','variant_color','variant_size','variant_flavor','inventory'];
  let backup='-- Before product catalogue import; data snapshots, not an automatic restore script.\n';for(const t of targets){const rows=(await db.query(`SELECT * FROM public.${t}`)).rows;for(const r of rows)backup+=`-- ${t} ${JSON.stringify(r)}\n`;}
  fs.writeFileSync(path.join(folder,'before.private.sql'),backup,{mode:0o600});
  const protectedTables=['sales_order','sales_order_detail','payment','review','stock_reservation','purchase_order','purchase_order_detail'];
  const hashes=async()=>{const out=[];for(const t of protectedTables)out.push((await db.query(`SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) hash FROM public.${t} t`)).rows[0].hash);return out;};const before=await hashes();
  const oldLedger=(await db.query('SELECT id FROM public.inventory_transaction')).rows.map(r=>r.id);
  await db.query(fs.readFileSync(path.join(__dirname,'099_product_catalog_final.sql'),'utf8'));
  const products=(await db.query('SELECT * FROM public.product')).rows,variants=(await db.query('SELECT * FROM public.product_variant')).rows,categories=(await db.query('SELECT * FROM public.product_category')).rows;
  const attributes={};for(const attr of ['color','size','flavor'])attributes[attr]=(await db.query(`SELECT * FROM public.variant_${attr}`)).rows;
  async function attribute(attr,value){if(!clean(value))return null;let a=attributes[attr].find(a=>a[attr+'_name'].toLowerCase()===value.trim().toLowerCase());if(!a){a=await put(db,'variant_'+attr,{[attr+'_name']:value.trim(),...(attr==='color'?{hex_code:null}:{}),is_active:true});attributes[attr].push(a);}return a.id;}
  const used=new Set(),expected=[],warnings=[];
  for(const g of input.groups.values()){
   const r=g.rows[0];let p=products.find(p=>p.product_code===g.code)||products.find(p=>norm(p.product_name)===norm(r[2])&&!used.has(p.id));
   if(!p&&g.code!=='DD-BAT-01'){const oldSku=aliases[g.code]||g.code;const ov=variants.find(v=>v.sku_variant===oldSku);if(ov)p=products.find(p=>p.id===ov.product_id&&!used.has(p.id));}
   const old=p?variants.filter(v=>v.product_id===p.id):[];if(p)assert.ok(!used.has(p.id),'Product mapping collision '+g.code);
   const slugValues=[...new Set(g.rows.map(r=>clean(r[32])).filter(Boolean))];const slug=slugValues.length===1?slugValues[0]:g.code.toLowerCase();
   const data={product_code:g.code,product_name:r[2].replaceAll('&','và'),category_id:categories.find(c=>c.category_name===r[4]).id,unit:r[13],brand_name:r[5],target_pet:r[6].replaceAll('&','và'),origin:r[7],description:r[3],ingredients:r[8],benefits:r[9],usage_instructions:r[10],slug,status:'active',badge:r[18],specs:{expiry:r[11],quy_cach:r[16],features:r[17]}};
   p=await put(db,'product',data,p?.id);used.add(p.id);g.id=p.id;
   const parentImages=artwork(g.code);await db.query('DELETE FROM public.product_media WHERE product_id=$1',[p.id]);await db.query('INSERT INTO public.product_media(product_id,image_url,display_order,is_thumbnail) SELECT $1,url,ord-1,ord=1 FROM unnest($2::text[]) WITH ORDINALITY t(url,ord)',[p.id,parentImages]);
   const seen=[];
   for(const v of g.rows){let existing=variants.find(x=>x.sku_variant===v[14]);if(!existing&&g.rows.length===1&&old.length===1)existing=old[0];if(existing)assert.equal(existing.product_id,p.id,'Variant belongs to different product');
    const variant=await put(db,'product_variant',{product_id:p.id,sku_variant:v[14],variant_name:v[15],color_id:await attribute('color',v[19]),size_id:await attribute('size',v[20]),flavor_id:await attribute('flavor',v[21]),cost_price:Number(v[23]),compare_at_price:Number(v[24]),sale_price:Number(v[25]),barcode:clean(v[26]),weight:physicalWeight(v[22]),status:'active',catalog_retired:false,packaging:v[16],features:v[17],badge:v[18],gross_weight_text:v[22],description:v[3],ingredients:v[8],source_url:clean(v[28]),source_slug:clean(v[32])},existing?.id);
    seen.push(variant.id);const direct=/^https:\/\/.*\.(?:png|jpe?g|webp|avif)(?:\?.*)?$/i.test(v[28])?[v[28]]:[];
    const images=direct.length?direct:variantArtwork[v[14]]||parentImages;
    await db.query('DELETE FROM public.product_variant_media WHERE product_variant_id=$1',[variant.id]);await db.query('INSERT INTO public.product_variant_media(product_variant_id,image_url,display_order,is_thumbnail) SELECT $1,url,ord-1,ord=1 FROM unnest($2::text[]) WITH ORDINALITY t(url,ord)',[variant.id,images]);
    expected.push({id:variant.id,product_id:p.id,sku:v[14],name:v[15],price:Number(v[25]),cost:Number(v[23]),compare:Number(v[24]),stock:Number(v[35]),minimum:Number(v[36]),images});
    if(clean(v[29]))warnings.push({sku:v[14],issue:'Unlabelled image column retained only in source CSV; not assigned to this product.'});
   }
   await db.query("UPDATE public.product_variant SET status='inactive',catalog_retired=true WHERE product_id=$1 AND NOT(id=ANY($2::uuid[]))",[p.id,seen]);
   if(slugValues.length>1)warnings.push({product:g.code,issue:'Conflicting source slugs; canonical slug uses product code.'});
   console.log('Prepared',g.code,g.rows.length,'variants');
  }
  // Post only the adjustment needed to reach the authorized physical-stock snapshot.
  // Never import historical reservation/order/customer/staff identifiers from this sheet.
  await db.query(`INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,idempotency_key)
   SELECT x.id,'adjustment',x.stock-coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=x.id),0),'Đồng bộ số tồn theo San_pham_final.csv',$2||':'||x.sku
   FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,sku text,stock integer)
   WHERE x.stock<>coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=x.id),0)`,[JSON.stringify(expected),'product-csv:'+runId]);
  await db.query(`INSERT INTO public.inventory(product_variant_id,quantity_in_stock,minimum_stock) SELECT x.id,x.stock,x.minimum FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,stock integer,minimum integer) ON CONFLICT(product_variant_id) DO UPDATE SET minimum_stock=excluded.minimum_stock`,[JSON.stringify(expected)]);
  await db.query(fs.readFileSync(path.join(__dirname,'100_product_catalog_admin.sql'),'utf8'));
  await db.query(fs.readFileSync(path.join(root,'scripts/test/product_catalog_final_rollback.sql'),'utf8'));
  assert.deepEqual(await hashes(),before,'Historical orders/payments/reviews/reservations changed');assert.equal(Number((await db.query('SELECT count(*) n FROM public.inventory_transaction WHERE id=ANY($1::uuid[])',[oldLedger])).rows[0].n),oldLedger.length);
  const catalog=(await db.query('SELECT public.customer_shop_catalog() data')).rows[0].data;assert.equal(catalog.length,38);assert.equal(catalog.reduce((n,p)=>n+p.product_variant.length,0),65);assert.ok(!JSON.stringify(catalog).includes('cost_price'),'Cost leaked publicly');
  const stock=(await db.query('SELECT v.id,v.sku_variant,i.quantity_in_stock,i.minimum_stock,coalesce((SELECT sum(quantity) FROM inventory_transaction WHERE product_variant_id=v.id),0) ledger FROM product_variant v JOIN inventory i ON i.product_variant_id=v.id WHERE v.id=ANY($1::uuid[])',[expected.map(v=>v.id)])).rows;
  for(const v of expected){const p=catalog.find(p=>p.id===v.product_id),actual=p.product_variant.find(x=>x.id===v.id),inv=stock.find(x=>x.id===v.id);assert.ok(actual,v.sku);assert.equal(actual.variant_name,v.name);assert.equal(Number(actual.sale_price),v.price);assert.equal(Number(actual.compare_at_price),v.compare);assert.equal(inv.quantity_in_stock,v.stock);assert.equal(Number(inv.ledger),v.stock);assert.equal(inv.minimum_stock,v.minimum);assert.deepEqual(actual.image_urls,v.images);}
  await db.query("NOTIFY pgrst,'reload schema'");await db.query(apply?'COMMIT':'ROLLBACK');
  const report={status:apply?'COMMITTED':'DRY RUN ROLLED BACK',products:38,variants:65,stock:4028,sourceSha256:input.sha,historyPreserved:true,warnings,backupFolder:folder};fs.writeFileSync(path.join(folder,'verification.txt'),JSON.stringify(report,null,2));console.log(report);
 }catch(e){await db.query('ROLLBACK').catch(()=>{});console.error('Stage error',e.where||'',e.position||'');throw e;}finally{await db.end();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});module.exports={load,physicalWeight};
