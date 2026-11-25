const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {connect}=require('./service_import_connection.cjs');
const mode=process.argv[2]||'plan';if(!['plan','verify','apply'].includes(mode))throw Error('Use plan, verify, or apply <private plan>');
const roots=['9e250f85-e1ab-432d-a1dd-e3e8afe5a67f','ad3e300d-5fb1-4783-b867-62741045ffcd','cf57c9e1-d211-4c4b-b77a-5ef3de0a2f45','bf4ac1f0-ef86-4c51-81ad-8b09a61e16d2'];
const articleId='015aa7c9-e007-4855-a3ad-2f9268a36799';
const allowed=new Set(['public.chat_conversation','public.chat_message','public.chat_feedback','public.chat_moderation_log','pawpal_private.chat_read_slot','pawpal_private.chat_read_rate']);
const quote=x=>'"'+x.replace(/"/g,'""')+'"',qualified=x=>x.split('.').map(quote).join('.');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const stable=v=>JSON.stringify(canonical(v)),hash=v=>crypto.createHash('sha256').update(v).digest('hex');
(async()=>{const db=await connect();let committed=false;try{
 const approved=mode==='plan'?null:JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
 await db.query(mode==='plan'?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN ISOLATION LEVEL SERIALIZABLE');await db.query("SET LOCAL statement_timeout='15s'; SET LOCAL lock_timeout='5s'");
 const read=async(sql,args=[]) => (await db.query(sql,args)).rows;
 const article=(await read('SELECT to_jsonb(t) AS row FROM public.blog_post t WHERE id=$1',[articleId]))[0]?.row;
 const faq=(await read('SELECT to_jsonb(t) AS row FROM public.chatbot_knowledge_faq t WHERE id=$1',[articleId]))[0]?.row;
 if(!article||!faq||faq.category!=='blog:'+articleId||faq.question!==article.title||!article.title.endsWith(' E2E11'))throw Error('Article/FAQ source changed; no blind replacement');
 const title=article.title.replace(/\s+E2E11$/,'');if(!title.trim())throw Error('Invalid cleaned title');
 const pkRows=await read(`SELECT n.nspname||'.'||c.relname AS name,array_agg(a.attname::text ORDER BY k.ord) AS cols FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.num WHERE con.contype='p' AND n.nspname||'.'||c.relname=ANY($1::text[]) GROUP BY con.oid,n.nspname,c.relname`,[[...allowed]]);
 const pks=new Map(pkRows.map(r=>[r.name,r.cols]));
 const fks=await read(`SELECT cn.nspname||'.'||cc.relname AS child,pn.nspname||'.'||pc.relname AS parent,array_agg(ca.attname::text ORDER BY k.ord) AS cc,array_agg(pa.attname::text ORDER BY k.ord) AS pc FROM pg_constraint con JOIN pg_class cc ON cc.oid=con.conrelid JOIN pg_namespace cn ON cn.oid=cc.relnamespace JOIN pg_class pc ON pc.oid=con.confrelid JOIN pg_namespace pn ON pn.oid=pc.relnamespace CROSS JOIN LATERAL unnest(con.conkey,con.confkey) WITH ORDINALITY k(cnum,pnum,ord) JOIN pg_attribute ca ON ca.attrelid=cc.oid AND ca.attnum=k.cnum JOIN pg_attribute pa ON pa.attrelid=pc.oid AND pa.attnum=k.pnum WHERE con.contype='f' AND pn.nspname||'.'||pc.relname=ANY($1::text[]) GROUP BY con.oid,cn.nspname,cc.relname,pn.nspname,pc.relname`,[[...allowed]]);
 const nodes=new Map(),edges=new Map(),keyOf=(table,row)=>table+'|'+JSON.stringify(pks.get(table).map(col=>row[col]));
 const add=(table,row)=>{if(!allowed.has(table)||!pks.has(table))throw Error('Dependency needs separate review: '+table);if(table==='public.chat_conversation'&&!roots.includes(row.id))throw Error('Unexpected other conversation');const key=keyOf(table,row);nodes.set(key,{key,table,row});if(nodes.size>100)throw Error('Unexpectedly large chat closure');return key;};
 const conversations=await read('SELECT to_jsonb(t) AS row FROM public.chat_conversation t WHERE id=ANY($1::uuid[])',[roots]);
 if(conversations.length!==4)throw Error('A reviewed conversation is missing');conversations.forEach(r=>add('public.chat_conversation',r.row));
 const expanded=new Set();while([...nodes.keys()].some(key=>!expanded.has(key))){
  const groups=new Map();for(const node of nodes.values())if(!expanded.has(node.key)){expanded.add(node.key);const list=groups.get(node.table)||[];list.push(node);groups.set(node.table,list);}
  for(const [table,parents]of groups)for(const fk of fks.filter(f=>f.parent===table)){
   if(fk.cc.length!==1)throw Error('Composite dependency needs review');const cc=fk.cc[0],pc=fk.pc[0];
   const values=[...new Set(parents.map(n=>n.row[pc]).filter(x=>x!==null&&x!==undefined).map(String))];if(!values.length)continue;
   const rows=await read(`SELECT to_jsonb(t) AS row FROM ${qualified(fk.child)} t WHERE ${quote(cc)}::text=ANY($1::text[])`,[values]);
   for(const {row}of rows){const child=add(fk.child,row);for(const parent of parents.filter(n=>String(n.row[pc])===String(row[cc]))){const set=edges.get(parent.key)||new Set();set.add(child);edges.set(parent.key,set);}}
  }
 }
 for(const id of roots)if(![...nodes.values()].some(n=>n.table==='public.chat_message'&&n.row.conversation_id===id&&['guest','customer','staff'].includes(n.row.sender_type)&&/kiểm thử/i.test(n.row.content)))throw Error('Missing explicit participant test evidence');
 const records=[...nodes.values()],fingerprint=hash(stable({records:records.map(n=>({key:n.key,row:n.row})).sort((a,b)=>a.key.localeCompare(b.key)),article,faq}));
 const counts=records.reduce((a,n)=>(a[n.table]=(a[n.table]||0)+1,a),{});
 const folder=mode==='plan'?path.join('D:/Aboutme/Pawpal-infra/supabase-local/backups','chatbot-cleanup-'+new Date().toISOString().replace(/[:.]/g,'-')):path.dirname(path.resolve(process.argv[3]));
 if(mode==='plan'){fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'plan.private.json'),JSON.stringify({fingerprint,records,article,faq,title,counts},null,2));await db.query('ROLLBACK');console.log(JSON.stringify({counts,oldTitle:article.title,newTitle:title,plan:path.join(folder,'plan.private.json')}));return;}
 if(fingerprint!==approved.fingerprint)throw Error('Reviewed source changed');
 if(mode==='apply'&&JSON.parse(fs.readFileSync(path.join(folder,'verified.private.json'),'utf8')).fingerprint!==fingerprint)throw Error('Rollback verification required');
 const protectedNames=(await read(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE 'product%' OR tablename LIKE 'service%' OR tablename IN ('inventory','inventory_transaction','paw_point_transaction','payment','refund_transaction','customer','staff','chatbot_system_prompt','chatbot_canned_response','chatbot_compensation_policy','chatbot_handover_rule')) ORDER BY tablename`)).map(r=>r.tablename);
 const snapshot=async()=>{const out={};for(const table of protectedNames)out[table]=(await read(`SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS hash FROM public.${quote(table)} t`))[0].hash;
  for(const table of ['chat_conversation','chat_message','chat_feedback','chatbot_knowledge_faq','blog_post']){
   const excluded=table==='chatbot_knowledge_faq'||table==='blog_post'?[articleId]:records.filter(n=>n.table==='public.'+table).map(n=>n.row.id);
   out['other_'+table]=(await read(`SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) AS hash FROM public.${quote(table)} t WHERE NOT(id=ANY($1::uuid[]))`,[excluded]))[0].hash;
  }return out;};
 const before=await snapshot();const backup=path.join(folder,mode==='verify'?'before-verify.private.json':'before-delete.private.json');
 fs.writeFileSync(backup,JSON.stringify({fingerprint,records,article,faq,before},null,2),{flag:'wx'});fs.writeFileSync(backup.replace('.private.json','.sha256'),hash(fs.readFileSync(backup))+'\n');
 const a=await db.query('UPDATE public.blog_post t SET title=$2,updated_at=clock_timestamp() WHERE id=$1 AND to_jsonb(t)=$3::jsonb',[articleId,title,JSON.stringify(article)]);
 const f=await db.query('UPDATE public.chatbot_knowledge_faq t SET question=$2,updated_at=clock_timestamp() WHERE id=$1 AND to_jsonb(t)=$3::jsonb',[articleId,title,JSON.stringify(faq)]);
 if(a.rowCount!==1||f.rowCount!==1)throw Error('Concurrent article/FAQ change');
 const pending=new Map(nodes);while(pending.size){const leaves=[...pending.values()].filter(n=>![...(edges.get(n.key)||[])].some(k=>pending.has(k)));if(!leaves.length)throw Error('Dependency cycle');for(const node of leaves){const cols=pks.get(node.table),args=cols.map(c=>node.row[c]);const res=await db.query(`DELETE FROM ${qualified(node.table)} t WHERE ${cols.map((c,i)=>quote(c)+' IS NOT DISTINCT FROM $'+(i+1)).join(' AND ')} AND to_jsonb(t)=$${args.length+1}::jsonb RETURNING 1`,[...args,JSON.stringify(node.row)]);if(res.rowCount!==1)throw Error('Concurrent chat change');pending.delete(node.key);}}
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');if(stable(before)!==stable(await snapshot()))throw Error('Protected or unrelated records changed');
 await db.query(mode==='verify'?'ROLLBACK':'COMMIT');committed=mode==='apply';
 const result={fingerprint,applied:committed,counts,correctedArticleAndFaq:true,protectedAndOtherDataUnchanged:true,backup};
 fs.writeFileSync(path.join(folder,committed?'result.private.json':'verified.private.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){if(!committed)await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message||e.code||e.name);process.exitCode=1;});
