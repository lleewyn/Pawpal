const fs=require('node:fs'),crypto=require('node:crypto');
function readExport(file){
 const raw=fs.readFileSync(file,'utf8');
 const line=raw.split(/\r?\n/).find(l=>/^\|\s*\d{4}-/.test(l));
 const m=line?.match(/^\|\s*([^|]+)\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\[.*\])\s*\|\s*$/);
 if(!m)throw Error('Business export header not found');
 let rows;let markdownDecoded=false;
 try{rows=JSON.parse(m[5]);}catch{
  // Markdown table rendering doubles literal backslashes and escapes cell pipes.
  // Decode this presentation layer once, then require strict JSON and row counts.
  try{rows=JSON.parse(m[5].replace(/\\([\\|])/g,'$1'));markdownDecoded=true;}catch{throw Error('Invalid business export JSON after Markdown decoding; send CSV export instead');}
 }
 if(rows.length!==+m[3]||new Set(rows.map(t=>t.source_table)).size!==rows.length)throw Error('Table inventory mismatch');
 for(const t of rows){if(t.rows_json.length!==t.exported_rows)throw Error('Record count mismatch '+t.source_table);}
 if(+m[4]!==0||rows.some(t=>t.status==='more_rows'))throw Error('Export has additional pages');
 if(rows.some(t=>t.status.startsWith('query_error')||t.status==='access_denied'))throw Error('Export contains inaccessible tables');
 return {raw,hash:crypto.createHash('sha256').update(raw).digest('hex'),tables:rows,exportedAt:m[1].trim(),markdownDecoded,
  get:name=>rows.find(t=>t.source_table==='public.'+name)?.rows_json||[]};
}
module.exports={readExport};
