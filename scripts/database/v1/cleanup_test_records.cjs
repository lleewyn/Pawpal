// Explicit test-data cleanup. No catalog edits, trigger disabling, or ledger bypasses.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { connect } = require('./service_import_connection.cjs');
const mode = process.argv[2] || 'plan';
if (!['plan', 'verify', 'apply'].includes(mode)) throw Error('Use plan, verify, or apply <plan.private.json>');
const q = value => '"' + value.replace(/"/g, '""') + '"';
const qualified = key => key.split('.').map(q).join('.');
const marker = /(?:\b(?:test|testing|demo|dummy|mock|seed|e2e|qa|fixture|sandbox|playwright|smoke|regression)\b|\b(?:QA|E2E)\d+|\bAPP-GEN-|giả lập|kiểm thử|thử nghiệm|du lieu mau|dữ liệu mẫu)/i;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value==='object' ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
const stable = value => JSON.stringify(canonical(value));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const rootFields = {
  customer: ['customer_code', 'note'], customer_profile: ['full_name'], pet_profile: ['pet_code','pet_name'],
  appointment: ['appointment_code','note'], support_ticket: ['ticket_code','subject','description'],
  return_request: ['reason','description'], review: ['review_content']
};
const protectedTables = new Set(['public.paw_point_transaction','public.inventory_transaction','public.audit_log','public.inventory','public.media_asset','public.media_upload_session','public.voucher_redemption']);
const contextChildren = new Set(['public.customer_profile','public.customer_phone','public.customer_address','public.customer_membership','public.customer_voucher','public.guest_session','public.cart','public.wishlist']);

(async () => {
 const client = await connect();
 let committed = false;
 try {
  const approved = mode !== 'plan' ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
  await client.query(mode !== 'plan' ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout='45s'; SET LOCAL lock_timeout='10s'");
  const fkRows = (await client.query(`SELECT cn.nspname||'.'||cc.relname AS child,pn.nspname||'.'||pc.relname AS parent,
    array_agg(ca.attname::text ORDER BY k.ord) AS child_columns,array_agg(pa.attname::text ORDER BY k.ord) AS parent_columns,con.confdeltype AS action
    FROM pg_constraint con JOIN pg_class cc ON cc.oid=con.conrelid JOIN pg_namespace cn ON cn.oid=cc.relnamespace
    JOIN pg_class pc ON pc.oid=con.confrelid JOIN pg_namespace pn ON pn.oid=pc.relnamespace
    CROSS JOIN LATERAL unnest(con.conkey,con.confkey) WITH ORDINALITY AS k(childnum,parentnum,ord)
    JOIN pg_attribute ca ON ca.attrelid=con.conrelid AND ca.attnum=k.childnum
    JOIN pg_attribute pa ON pa.attrelid=con.confrelid AND pa.attnum=k.parentnum
    WHERE cn.nspname IN ('public','pawpal_private') AND pn.nspname IN ('public','pawpal_private') AND con.contype='f'
    GROUP BY con.oid,cn.nspname,cc.relname,pn.nspname,pc.relname,con.confdeltype`)).rows;
  if (fkRows.some(fk=>fk.child_columns.length!==1)) throw Error('Composite FK requires manual review');
  const pkRows = (await client.query(`SELECT n.nspname||'.'||c.relname AS name,array_agg(a.attname::text ORDER BY k.ord) AS columns
    FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.num
    WHERE con.contype='p' AND n.nspname IN ('public','pawpal_private') GROUP BY con.oid,n.nspname,c.relname`)).rows;
  const pks = new Map(pkRows.map(row=>[row.name,row.columns]));
  const nodes = new Map(), edges = new Map(), roots = new Set();
  const keyOf = (table,row) => table+'|'+JSON.stringify(pks.get(table).map(column=>row[column]));
  const add = (table,row,root=false) => {
    if (!pks.has(table)) throw Error('Missing PK '+table);
    const key = keyOf(table,row);
    if (!nodes.has(key)) nodes.set(key,{key,table,row});
    if (root) roots.add(key);
    if (nodes.size>5000) throw Error('Unexpectedly large deletion closure');
    return key;
  };
  for (const [table,fields] of Object.entries(rootFields)) {
    const rows=(await client.query(`SELECT to_jsonb(t) AS row FROM public.${q(table)} t`)).rows.map(x=>x.row);
    for (const row of rows.filter(row=>marker.test(fields.map(field=>row[field]||'').join(' ')))) {
      if (table==='customer_profile') {
        const parent=await client.query('SELECT to_jsonb(t) AS row FROM public.customer t WHERE id=$1',[row.customer_id]);
        if(parent.rows[0]) add('public.customer',parent.rows[0].row,true);
      } else add('public.'+table,row,true);
    }
  }
  // Expand only children of explicit test records, never parent catalogs or staff identities.
  const expanded = new Set();
  while ([...nodes.keys()].some(key=>!expanded.has(key))) {
    const batch=[...nodes.values()].filter(node=>!expanded.has(node.key));
    const groups=new Map();
    for(const node of batch){expanded.add(node.key);const group=groups.get(node.table)||[];group.push(node);groups.set(node.table,group);}
    for (const [parent,parents] of groups) for(const fk of fkRows.filter(fk=>fk.parent===parent)) {
      if(fk.child==='public.audit_log') throw Error('Audit evidence must not be included in deletion closure');
      const pc=fk.parent_columns[0],cc=fk.child_columns[0];
      const values=[...new Set(parents.map(node=>node.row[pc]).filter(v=>v!==null&&v!==undefined))];
      if(!values.length)continue;
      const rows=(await client.query(`SELECT to_jsonb(t) AS row FROM ${qualified(fk.child)} t WHERE ${q(cc)}::text=ANY($1::text[])`,[values.map(String)])).rows.map(x=>x.row);
      for(const row of rows){const childKey=add(fk.child,row);for(const parentNode of parents.filter(n=>String(n.row[pc])===String(row[cc]))){const set=edges.get(parentNode.key)||new Set();set.add(childKey);edges.set(parentNode.key,set);}}
    }
  }
  const blocked=new Map();
  const block=(key,reason)=>{if(!blocked.has(key)){blocked.set(key,reason);return true;}return false;};
  for(const node of nodes.values()) {
    if(protectedTables.has(node.table))block(node.key,'Protected ledger, inventory or media lifecycle');
    if(node.table==='public.payment'&&node.row.transaction_status==='succeeded')block(node.key,'Posted payment');
    if(node.table==='public.refund_transaction'&&node.row.refund_status==='succeeded')block(node.key,'Posted refund');
    if(node.table==='public.appointment_record'&&node.row.customer_confirmation_status==='confirmed')block(node.key,'Signed appointment record');
    if(node.table==='public.sales_replacement')block(node.key,'Replacement workflow history');
    if(node.table==='public.pet_profile'&&(node.row.avatar_media_asset_id||node.row.vaccine_media_asset_id))block(node.key,'Retain verified media lifecycle');
    if(/(?:_media|_media_asset|attachment)$/.test(node.table))block(node.key,'Retain attachment and asset lifecycle');
  }
  // Keep protected financial/signed contexts intact; retain identity/contact rows of retained customers.
  let changed=true;
  while(changed){changed=false;
    for(const [parent,children]of edges){
      if([...children].some(child=>blocked.has(child)))changed=block(parent,'Dependent protected record')||changed;
      if(blocked.has(parent)){
        const parentTable=nodes.get(parent).table;
        for(const child of children){const childTable=nodes.get(child).table;
          if(['public.appointment','public.sales_order','public.payment','public.refund_transaction','public.review','public.support_ticket'].includes(parentTable)
            ||(parentTable==='public.customer'&&contextChildren.has(childTable))
            ||(parentTable==='public.pet_profile'&&childTable==='public.pet_weight_history'))changed=block(child,'Retained parent context')||changed;
        }
      }
    }
  }
  // A transaction child cannot be removed separately if its business parent is retained outside this plan.
  const atomicChildren={
    'public.appointment_item':['appointment_id','public.appointment'],
    'public.sales_order_detail':['order_id','public.sales_order'],
    'public.appointment_adjustment':['appointment_id','public.appointment'],
    'public.voucher_redemption':['appointment_id','public.appointment']
  };
  for(const node of nodes.values()){const relation=atomicChildren[node.table];if(relation&&node.row[relation[0]]){
    const parentKey=relation[1]+'|'+JSON.stringify([node.row[relation[0]]]);
    if(!nodes.has(parentKey)||blocked.has(parentKey))block(node.key,'Retained financial parent');
  }}
  changed=true;while(changed){changed=false;for(const [parent,children]of edges){
    if([...children].some(child=>blocked.has(child)))changed=block(parent,'Retained dependent')||changed;
    if(blocked.has(parent)){
      const parentTable=nodes.get(parent).table;
      for(const child of children){const childTable=nodes.get(child).table;
        if(['public.appointment','public.sales_order','public.payment','public.refund_transaction','public.review','public.support_ticket'].includes(parentTable)
          ||(parentTable==='public.customer'&&contextChildren.has(childTable))
          ||(parentTable==='public.pet_profile'&&childTable==='public.pet_weight_history'))changed=block(child,'Retained parent context')||changed;
      }
    }
  }}
  const selected=new Map([...nodes].filter(([key])=>!blocked.has(key)));
  // Never prune an ordinary non-test identity just because a test child references it.
  const counts=map=>[...map.values()].reduce((acc,node)=>{acc[node.table]=(acc[node.table]||0)+1;return acc;},{});
  const graphHash=digest([...selected.values()].map(n=>n.key+stable(n.row)).sort().join('\n'));
  const rootSummary=[...roots].map(key=>{const n=nodes.get(key);return{table:n.table,id:n.row.id,code:n.row.appointment_code||n.row.pet_code||n.row.customer_code||n.row.ticket_code,name:n.row.full_name||n.row.pet_name,status:blocked.has(key)?'retained':'delete',reason:blocked.get(key)||'Explicit test marker'};});
  const summary={createdAt:new Date().toISOString(),roots:rootSummary,deleteCounts:counts(selected),retainCounts:counts(new Map([...nodes].filter(([key])=>blocked.has(key)))),fingerprint:graphHash};
  const folder=mode!=='plan'?path.dirname(path.resolve(process.argv[3])):path.resolve('artifacts/data-cleanup',new Date().toISOString().replace(/[:.]/g,'-'));
  if(mode==='plan'){
    fs.mkdirSync(folder,{recursive:true});
    fs.writeFileSync(path.join(folder,'plan.private.json'),JSON.stringify({...summary,records:[...selected.values()],retained:[...blocked].map(([key,reason])=>({key,reason}))},null,2));
    await client.query('ROLLBACK');
    console.log(JSON.stringify({deleteCounts:summary.deleteCounts,retainCounts:summary.retainCounts,rootCounts:{delete:rootSummary.filter(r=>r.status==='delete').length,retained:rootSummary.filter(r=>r.status==='retained').length},fingerprint:graphHash,plan:path.join(folder,'plan.private.json')},null,2));
    return;
  }
  if(graphHash!==approved.fingerprint)throw Error('Source records changed after reviewed plan; abort without deletion');
  const lockTables=[...new Set([...selected.values()].map(n=>n.table))];
  if(!lockTables.length)throw Error('No safely removable test data');
  await client.query('LOCK TABLE '+lockTables.sort().map(qualified).join(',')+' IN SHARE ROW EXCLUSIVE MODE');
  // Catalog/inventory rows are independently checked before commit.
  const protectedNames=(await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND
    (tablename LIKE 'product%' OR tablename LIKE 'service%' OR tablename IN ('inventory','inventory_transaction','paw_point_transaction','hotel_room','hotel_room_type','taxi_price_rule','pet_breed','pet_species','staff','staff_role','staff_permission','media_asset','media_upload_session','voucher','customer_voucher','voucher_redemption')) ORDER BY tablename`)).rows.map(r=>r.tablename);
  const snapshots=async()=>{
    const result={};for(const table of protectedNames){const rows=(await client.query(`SELECT to_jsonb(t)::text AS row FROM public.${q(table)} t ORDER BY to_jsonb(t)::text`)).rows;result[table]=digest(rows.map(r=>r.row).join('\n'));}
    for(const [table,field]of [['payment','transaction_status'],['refund_transaction','refund_status']]){
      const rows=(await client.query(`SELECT to_jsonb(t)::text AS row FROM public.${q(table)} t WHERE ${q(field)}='succeeded' ORDER BY to_jsonb(t)::text`)).rows;result[table+'_posted']=digest(rows.map(r=>r.row).join('\n'));
    }
    for(const table of lockTables){
      const rows=(await client.query(`SELECT to_jsonb(t) AS row FROM ${qualified(table)} t`)).rows.map(r=>r.row).filter(row=>!selected.has(keyOf(table,row)));
      result['unselected:'+table]=digest(rows.map(stable).sort().join('\n'));
    }
    return result;
  };
  const before=await snapshots();
  const backup={createdAt:new Date().toISOString(),fingerprint:graphHash,records:[...selected.values()],protectedDigests:before};
  const backupFile=path.join(folder,mode==='verify'?'before-verify.private.json':'before-delete.private.json');
  fs.writeFileSync(backupFile,JSON.stringify(backup,null,2),{flag:'wx'});
  fs.writeFileSync(backupFile.replace('.private.json','.sha256'),digest(fs.readFileSync(backupFile))+'\n');
  const pending=new Map(selected),deleted={};
  // Topological leaf-first order. Cycles fail closed rather than bypass constraints.
  while(pending.size){
    const leaves=[...pending.values()].filter(node=>![...(edges.get(node.key)||[])].some(child=>pending.has(child)));
    if(!leaves.length)throw Error('Dependency cycle requires manual review');
    for(const node of leaves){
      const columns=pks.get(node.table), values=columns.map(column=>node.row[column]);
      const predicate=columns.map((column,index)=>q(column)+' IS NOT DISTINCT FROM $'+(index+1)).join(' AND ');
      const res=await client.query(`DELETE FROM ${qualified(node.table)} t WHERE ${predicate} AND to_jsonb(t)=$${values.length+1}::jsonb RETURNING 1`,[...values,JSON.stringify(node.row)]);
      if(res.rowCount!==1)throw Error('Concurrent change or missing row: '+node.table);
      deleted[node.table]=(deleted[node.table]||0)+1;pending.delete(node.key);
    }
  }
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');
  const after=await snapshots();
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Protected catalog, inventory, points or staff changed; rolling back');
  if(mode==='verify'){
    await client.query('ROLLBACK');
    fs.writeFileSync(path.join(folder,'verified.private.json'),JSON.stringify({verifiedAt:new Date().toISOString(),fingerprint:graphHash,deletedWithinRolledBackTransaction:deleted,protectedAndUnselectedRowsUnchanged:true},null,2));
    console.log(JSON.stringify({rolledBack:true,deleteCounts:deleted,protectedAndUnselectedRowsUnchanged:true},null,2));
    return;
  }
  await client.query('COMMIT');committed=true;
  const report={committedAt:new Date().toISOString(),deleted,retainedRoots:rootSummary.filter(r=>r.status==='retained'),protectedTablesUnchanged:protectedNames,backup:backupFile};
  fs.writeFileSync(path.join(folder,'result.private.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
 } catch(error){if(!committed)await client.query('ROLLBACK').catch(()=>{});throw error;}
 finally{await client.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
