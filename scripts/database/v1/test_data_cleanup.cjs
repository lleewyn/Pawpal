const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { connect } = require('./service_import_connection.cjs');

(async () => {
  const client = await connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout='30s'");
    const tables = await client.query(`SELECT n.nspname AS schema,c.relname AS name
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','pawpal_private') AND c.relkind IN ('r','p') ORDER BY 1,2`);
    const fks = await client.query(`SELECT cn.nspname AS child_schema,cc.relname AS child,
      pn.nspname AS parent_schema,pc.relname AS parent,
      array_agg(ca.attname ORDER BY k.ord) AS child_columns,
      array_agg(pa.attname ORDER BY k.ord) AS parent_columns,con.confdeltype AS action
      FROM pg_constraint con JOIN pg_class cc ON cc.oid=con.conrelid JOIN pg_namespace cn ON cn.oid=cc.relnamespace
      JOIN pg_class pc ON pc.oid=con.confrelid JOIN pg_namespace pn ON pn.oid=pc.relnamespace
      CROSS JOIN LATERAL unnest(con.conkey,con.confkey) WITH ORDINALITY AS k(childnum,parentnum,ord)
      JOIN pg_attribute ca ON ca.attrelid=con.conrelid AND ca.attnum=k.childnum
      JOIN pg_attribute pa ON pa.attrelid=con.confrelid AND pa.attnum=k.parentnum
      WHERE cn.nspname IN ('public','pawpal_private') AND pn.nspname IN ('public','pawpal_private')
      GROUP BY con.oid,cn.nspname,cc.relname,pn.nspname,pc.relname,con.confdeltype`);
    const triggers = await client.query(`SELECT n.nspname AS schema,c.relname AS name,t.tgname,
      pg_get_triggerdef(t.oid) AS definition,p.proname AS function
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal AND n.nspname IN ('public','pawpal_private')
      AND (t.tgtype::int & 8)<>0`);
    const seeds = {};
    for (const table of ['customer','customer_profile','pet_profile','appointment','support_ticket','return_request','review','staff']) {
      seeds[table] = (await client.query(`SELECT to_jsonb(t) AS row FROM public."${table}" t`)).rows.map(x=>x.row);
    }
    await client.query('ROLLBACK');
    const dir = path.join(os.tmpdir(), 'pawpal-test-cleanup-' + new Date().toISOString().replace(/[:.]/g,'-'));
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'inspection.private.json'), JSON.stringify({ tables: tables.rows, fks:fks.rows,triggers:triggers.rows,seeds }, null, 2));
    console.log('Inspection saved privately: '+dir);
    console.log(JSON.stringify({tables:tables.rowCount,foreignKeys:fks.rowCount,deleteTriggers:triggers.rows},null,2));
  } finally { await client.end(); }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
