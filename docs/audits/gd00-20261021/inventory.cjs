// Read-only lexical audit. Does not execute application code or contact Supabase.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.cwd();
const out = __dirname;
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const rel = p => path.relative(root, p).replaceAll('\\', '/');
const csv = rows => rows.map(row => row.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(',')).join('\n') + '\n';
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? true]));
const files = walk(path.join(root, 'pages'));
const fields = [['file','line','tag','type','id','name','required','readonly','disabled','classification','aria_describedby','pattern','min','max','maxlength']];
const forms = [['file','line','id','name','onsubmit','novalidate']];
const dynamic = [['file','line','signal']];
const hashes = [['file','sha256']];
const summary = new Map();
for (const file of files.filter(f => /\.(html|js|mjs)$/.test(f))) {
  const text = fs.readFileSync(file, 'utf8');
  hashes.push([rel(file), crypto.createHash('sha256').update(text).digest('hex')]);
  const line = i => text.slice(0, i).split('\n').length;
  if (file.endsWith('.html')) {
    // Ignore comments/scripts/styles so examples and JS template controls are not counted as static HTML.
    const source = text.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, m => m.replace(/[^\n]/g, ' '));
    const region = rel(file).split('/')[1];
    const counts = summary.get(region) || { files: 0, forms: 0, fields: 0 };
    counts.files++;
    for (const m of source.matchAll(/<form\b[^>]*>/gi)) {
      const a = attrs(m[0]); forms.push([rel(file),line(m.index),a.id,a.name,a.onsubmit,!!a.novalidate]); counts.forms++;
    }
    for (const m of source.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
      const a = attrs(m[0]); const type = a.type || (m[1] === 'input' ? 'text' : m[1]);
      const classification = type === 'hidden' ? 'hidden' : a.readonly ? 'readonly' : /search|filter/i.test([a.id,a.name,a.placeholder,a.class].join(' ')) || type === 'search' ? 'search/filter candidate' : 'editable candidate';
      fields.push([rel(file),line(m.index),m[1],type,a.id,a.name,!!a.required,!!a.readonly,!!a.disabled,classification,a['aria-describedby'],a.pattern,a.min,a.max,a.maxlength]); counts.fields++;
    }
    summary.set(region, counts);
  } else {
    text.split('\n').forEach((s, i) => {
      const signals = ['innerHTML','insertAdjacentHTML','createElement','showToast','reportValidity','setCustomValidity','preventDefault','destroy','unmount'].filter(k => s.includes(k));
      if (signals.length) dynamic.push([rel(file),i+1,signals.join(';')]);
    });
  }
}
for (const [name, rows] of [['fields.csv',fields],['forms.csv',forms],['dynamic-signals.csv',dynamic],['source-hashes.csv',hashes]]) fs.writeFileSync(path.join(out,name), '\ufeff'+csv(rows));
fs.writeFileSync(path.join(out,'counts.md'), '| Khu vực | HTML | Form | Control tĩnh |\n|---|---:|---:|---:|\n'+[...summary].map(([k,v])=>`| ${k} | ${v.files} | ${v.forms} | ${v.fields} |`).join('\n')+'\n');
console.log(fs.readFileSync(path.join(out,'counts.md'),'utf8'));
console.log(`Fields: ${fields.length-1}; forms: ${forms.length-1}; dynamic signals: ${dynamic.length-1}. Lexical inventory only; runtime NOT RUN.`);
