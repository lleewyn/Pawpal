// Exact-ID follow-up. Never disables triggers, modifies ledgers, or calls external file deletion.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {connect}=require('./service_import_connection.cjs');
const mode=process.argv[2]||'plan';
if(!['plan','verify','apply'].includes(mode))throw Error('Use plan, verify, or apply <private-plan-path>');
const quote=s=>'"'+s.replace(/"/g,'""')+'"';
const qualified=s=>s.split('.').map(quote).join('.');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const stable=v=>JSON.stringify(canonical(v));
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const roots={
 'public.appointment':['2d5c7430-8544-4823-a2c5-5be817ca5078','59a8c7c8-8a46-49f6-b09d-4cca8e720552'],
 'public.pet_profile':['4e4a3c1c-055f-43bb-adb2-cee01e896107'],
 'public.sales_order':['0f79ee72-ee12-4df0-a939-9efd8fbf1c8e'],
 'public.staff':['490fec43-0971-46f1-a193-1420a742c1ae'],
 'auth.users':['a476064e-9621-4988-89a2-d2b7dbbf6e3c']
};
const sessions=new Set(['24acfcc2-f354-4e4b-aabd-eba51bca5577','5a65cfa9-3fae-4d6f-bf48-86dffd58edea','6d6ad6cd-4b20-43f6-b7b2-85f7d7be89fd']);
const assets=new Set(['cd7069e7-edaf-46fa-a25c-5e152edfd481','d803c0ff-b12e-47f0-b996-d222131911f4','fdc94fd5-61d6-4e02-853c-d1fcdbb1716e']);
const allowedTables=new Set([...Object.keys(roots),'auth.identities','public.appointment_item','public.appointment_record','public.appointment_record_media','public.appointment_adjustment','public.appointment_adjustment_media','public.care_log','public.care_log_media','public.hotel_booking','public.taxi_trip','public.notification','public.pet_weight_history','public.media_upload_session','public.media_asset','public.sales_order_detail','public.stock_reservation','public.voucher_redemption']);

(async()=>{
 const client=await connect();let committed=false;
 try{
  const approved=mode==='plan'?null:JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
  await client.query(mode==='plan'?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN ISOLATION LEVEL SERIALIZABLE');
  await client.query("SET LOCAL statement_timeout='30s'; SET LOCAL lock_timeout='8s'");
  const read=async(sql,params=[]) => (await client.query(sql,params)).rows;
  const metadata=await read(`SELECT cn.nspname||'.'||cc.relname AS child,pn.nspname||'.'||pc.relname AS parent,
    array_agg(ca.attname::text ORDER BY k.ord) AS child_columns,array_agg(pa.attname::text ORDER BY k.ord) AS parent_columns
    FROM pg_constraint con JOIN pg_class cc ON cc.oid=con.conrelid JOIN pg_namespace cn ON cn.oid=cc.relnamespace
    JOIN pg_class pc ON pc.oid=con.confrelid JOIN pg_namespace pn ON pn.oid=pc.relnamespace
    CROSS JOIN LATERAL unnest(con.conkey,con.confkey) WITH ORDINALITY k(cnum,pnum,ord)
    JOIN pg_attribute ca ON ca.attrelid=cc.oid AND ca.attnum=k.cnum JOIN pg_attribute pa ON pa.attrelid=pc.oid AND pa.attnum=k.pnum
    WHERE con.contype='f' AND pn.nspname IN ('public','pawpal_private','auth') GROUP BY con.oid,cn.nspname,cc.relname,pn.nspname,pc.relname`);
  const pkRows=await read(`SELECT n.nspname||'.'||c.relname AS name,array_agg(a.attname::text ORDER BY k.ord) AS columns
    FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.num
    WHERE con.contype='p' AND n.nspname IN ('public','pawpal_private','auth') GROUP BY con.oid,n.nspname,c.relname`);
  const pks=new Map(pkRows.map(row=>[row.name,row.columns]));
  const nodes=new Map(),edges=new Map();
  const keyOf=(table,row)=>table+'|'+JSON.stringify(pks.get(table).map(column=>row[column]));
  const add=(table,row)=>{
    if(!allowedTables.has(table))throw Error('Unexpected dependency; nothing deleted: '+table);
    if(!pks.has(table))throw Error('Missing primary key '+table);
    const key=keyOf(table,row);nodes.set(key,{key,table,row});
    if(nodes.size>100)throw Error('Unexpectedly large follow-up closure');
    return key;
  };
  for(const [table,ids]of Object.entries(roots)){
    const found=await read(`SELECT to_jsonb(t) AS row FROM ${qualified(table)} t WHERE id=ANY($1::uuid[])`,[ids]);
    if(found.length!==ids.length)throw Error('Root already removed or missing: '+table);
    found.forEach(record=>add(table,record.row));
  }
  const expanded=new Set();
  while([...nodes.keys()].some(key=>!expanded.has(key))){
    const groups=new Map();for(const node of nodes.values())if(!expanded.has(node.key)){expanded.add(node.key);const list=groups.get(node.table)||[];list.push(node);groups.set(node.table,list);}
    for(const [table,parents]of groups)for(const fk of metadata.filter(fk=>fk.parent===table)){
      if(fk.child_columns.length!==1)throw Error('Composite FK needs review');
      const pc=fk.parent_columns[0],cc=fk.child_columns[0];
      const values=[...new Set(parents.map(node=>node.row[pc]).filter(v=>v!==null&&v!==undefined).map(String))];
      if(!values.length)continue;
      const children=await read(`SELECT to_jsonb(t) AS row FROM ${qualified(fk.child)} t WHERE ${quote(cc)}::text=ANY($1::text[])`,[values]);
      for(const {row}of children){const child=add(fk.child,row);for(const parent of parents.filter(n=>String(n.row[pc])===String(row[cc]))){const list=edges.get(parent.key)||new Set();list.add(child);edges.set(parent.key,list);}}
    }
  }
  for(const node of nodes.values()){
    const {table,row}=node;
    if(roots[table]&&!roots[table].includes(row.id))throw Error('Unexpected additional business identity: '+table);
    if(table==='public.media_upload_session'&&(!sessions.has(row.id)||row.state!=='deleted'))throw Error('Media session is not the reviewed deleted tombstone');
    if(table==='public.media_asset'&&(!assets.has(row.id)||row.status!=='deleted'))throw Error('Media asset is not the reviewed deleted tombstone');
    if(table==='public.appointment_record'&&row.customer_confirmation_status==='confirmed')throw Error('Signed record cannot be deleted');
    if(table==='public.staff'&&(row.full_name!=='Test'||row.auth_user_id!==roots['auth.users'][0]))throw Error('Staff identity changed');
    if(table==='auth.users'&&(row.last_sign_in_at||!(Date.parse(row.banned_until)>Date.now())))throw Error('Auth account is no longer an unused banned test identity');
    if(table==='public.voucher_redemption'&&(row.id!=='828baab4-12b5-4bd3-b1b0-4ce68e141a3d'||row.customer_voucher_id))throw Error('Unexpected or personal voucher use');
  }
  if((await read('SELECT id FROM public.payment WHERE order_id=ANY($1::uuid[]) OR appointment_id=ANY($2::uuid[])',[roots['public.sales_order'],roots['public.appointment']])).length)throw Error('A target acquired payment records');
  if((await read('SELECT staff_id FROM public.staff_role WHERE staff_id=ANY($1::uuid[])',[roots['public.staff']])).length)throw Error('Staff acquired access roles');
  if([...nodes.values()].filter(n=>n.table==='public.media_asset').length!==3)throw Error('Expected three deleted assets');
  if([...nodes.values()].filter(n=>n.table==='public.media_upload_session').length!==3)throw Error('Expected three deleted upload sessions');
  const fingerprint=hash([...nodes.values()].map(node=>node.key+stable(node.row)).sort().join('\n'));
  const counts=[...nodes.values()].reduce((acc,node)=>{acc[node.table]=(acc[node.table]||0)+1;return acc;},{});
  const folder=mode==='plan'?path.join('D:/Aboutme/Pawpal-infra/supabase-local/backups','test-cleanup-followup-'+new Date().toISOString().replace(/[:.]/g,'-')):path.dirname(path.resolve(process.argv[3]));
  if(mode==='plan'){
    fs.mkdirSync(folder,{recursive:true});
    fs.writeFileSync(path.join(folder,'plan.private.json'),JSON.stringify({createdAt:new Date().toISOString(),fingerprint,counts,records:[...nodes.values()]},null,2));
    await client.query('ROLLBACK');
    console.log(JSON.stringify({counts,total:nodes.size,plan:path.join(folder,'plan.private.json')},null,2));return;
  }
  if(fingerprint!==approved.fingerprint)throw Error('Source changed since reviewed plan');
  if(mode==='apply'){
    const proof=JSON.parse(fs.readFileSync(path.join(folder,'verified.private.json'),'utf8'));
    if(proof.fingerprint!==fingerprint||!proof.protectedAndRetainedRowsUnchanged)throw Error('Matching rollback verification is required');
  }
  console.log('Exact-ID source checks passed: '+nodes.size+' records.');
  for(const node of nodes.values()){
    const columns=pks.get(node.table),params=columns.map(column=>node.row[column]);
    await client.query(`SELECT 1 FROM ${qualified(node.table)} WHERE ${columns.map((column,i)=>quote(column)+' IS NOT DISTINCT FROM $'+(i+1)).join(' AND ')} FOR UPDATE`,params);
  }
  const tables=[...new Set([...nodes.values()].map(node=>node.table))];
  const catalogNames=(await read(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE 'product%' OR tablename LIKE 'service%' OR tablename IN ('customer','customer_profile','customer_membership','inventory','inventory_transaction','paw_point_transaction','payment','refund_transaction','voucher','customer_voucher','hotel_room','hotel_room_type','taxi_price_rule','pet_breed','pet_species','staff_role','staff_permission','support_ticket','support_ticket_message','chat_conversation','chat_message')) ORDER BY tablename`)).map(row=>'public.'+row.tablename);
  const snapshot=async()=>{
    const result={};for(const table of [...new Set([...catalogNames,...tables])].sort()){
      if(table.startsWith('auth.')){
        const selectedIds=[...nodes.values()].filter(node=>node.table===table).map(node=>String(node.row.id));
        const rows=await read(`SELECT md5(to_jsonb(t)::text) AS digest FROM ${qualified(table)} t WHERE NOT (id::text=ANY($1::text[])) ORDER BY 1`,[selectedIds]);
        result[table]=hash(rows.map(row=>row.digest).join('\n'));continue;
      }
      const rows=(await read(`SELECT to_jsonb(t) AS row FROM ${qualified(table)} t`)).map(r=>r.row);
      const kept=rows.filter(row=>!nodes.has(keyOf(table,row)));
      result[table]=hash(kept.map(stable).sort().join('\n'));
    }return result;
  };
  const before=await snapshot();
  const backupFile=path.join(folder,mode==='verify'?'before-verify.private.json':'before-delete.private.json');
  fs.writeFileSync(backupFile,JSON.stringify({createdAt:new Date().toISOString(),fingerprint,records:[...nodes.values()],protectedDigests:before},null,2),{flag:'wx'});
  fs.writeFileSync(backupFile.replace('.private.json','.sha256'),hash(fs.readFileSync(backupFile))+'\n');
  console.log('Private backup created outside webroot; no deletion yet.');
  const pending=new Map(nodes),deleted={};
  while(pending.size){
    const leaves=[...pending.values()].filter(node=>![...(edges.get(node.key)||[])].some(child=>pending.has(child)));
    if(!leaves.length)throw Error('FK cycle; rollback required');
    for(const node of leaves){
      const columns=pks.get(node.table),values=columns.map(column=>node.row[column]);
      const predicate=columns.map((column,i)=>quote(column)+' IS NOT DISTINCT FROM $'+(i+1)).join(' AND ');
      const res=await client.query(`DELETE FROM ${qualified(node.table)} t WHERE ${predicate} AND to_jsonb(t)=$${values.length+1}::jsonb RETURNING 1`,[...values,JSON.stringify(node.row)]);
      if(res.rowCount!==1)throw Error('Source row changed: '+node.table);
      deleted[node.table]=(deleted[node.table]||0)+1;pending.delete(node.key);
    }
  }
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');
  if(stable(before)!==stable(await snapshot()))throw Error('Protected or retained data changed; rolling back');
  if(mode==='verify'){
    await client.query('ROLLBACK');
    fs.writeFileSync(path.join(folder,'verified.private.json'),JSON.stringify({verifiedAt:new Date().toISOString(),fingerprint,deletedWithinRolledBackTransaction:deleted,protectedAndRetainedRowsUnchanged:true},null,2));
    console.log(JSON.stringify({rolledBack:true,deleted,protectedAndRetainedRowsUnchanged:true},null,2));return;
  }
  await client.query('COMMIT');committed=true;
  const report={committedAt:new Date().toISOString(),deleted,total:Object.values(deleted).reduce((a,b)=>a+b,0),protectedAndRetainedRowsUnchanged:true,backup:backupFile};
  fs.writeFileSync(path.join(folder,'result.private.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }catch(error){if(!committed)await client.query('ROLLBACK').catch(()=>{});throw error;}
 finally{await client.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
