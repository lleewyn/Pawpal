// Audit only: source inventory and baseline. Does not execute application code.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = process.cwd(), out = __dirname;
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const csv = rows => '\ufeff' + rows.map(row => row.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(',')).join('\n') + '\n';
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const rel = file => path.relative(root, file).replaceAll('\\', '/');
const before = git('rev-parse', 'HEAD');
const stamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
fs.writeFileSync(path.join(out, 'baseline.txt'), `Local time (Asia/Bangkok): ${stamp}\nBranch: ${git('branch', '--show-current')}\nHEAD: ${before}\nNode: ${process.version}\nStatus at snapshot (includes audit artifacts):\n${git('status', '--short')}\n\nChanges since previous audit HEAD:\n${git('diff', '--name-status', 'b078d165fc131e7048eab4449e4d1a1dc2068031', before)}\n`);
// Preserve prior audit; identical inventory implementation writes into this run's directory.
const inventory = fs.readFileSync(path.join(root, 'docs/audits/gd00-20261020/inventory.cjs'), 'utf8');
fs.writeFileSync(path.join(out, 'inventory.cjs'), inventory);
const inventoryOutput = execFileSync(process.execPath, [path.join(out, 'inventory.cjs')], { cwd: root, encoding: 'utf8' });
fs.writeFileSync(path.join(out, 'inventory-run.txt'), `Command: node docs/audits/gd00-20261021/inventory.cjs\nExit: 0\n${inventoryOutput}`);
const dynamic = [['file','line','tag','id','name','kind','verification']];
const scopes = [['file','line','form_id','onsubmit_return_false','novalidate','controls','required_controls','controls_without_id_and_name']];
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? true]));
for (const file of walk(path.join(root, 'pages')).filter(f => /\.(html|js|mjs)$/.test(f))) {
  const source = fs.readFileSync(file, 'utf8');
  if (!file.endsWith('.html')) {
    for (const m of source.matchAll(/<(input|select|textarea|form)\b[^>]*>/gi)) {
      const a = attrs(m[0]);
      dynamic.push([rel(file),source.slice(0,m.index).split('\n').length,m[1],a.id,a.name,'literal HTML candidate in JavaScript; may be comment/dead branch','RUNTIME NOT RUN']);
    }
    continue;
  }
  const clean = source.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, m => m.replace(/[^\n]/g, ' '));
  for (const m of clean.matchAll(/<form\b[^>]*>[\s\S]*?<\/form\s*>/gi)) {
    const a = attrs(m[0].slice(0,m[0].indexOf('>')+1));
    const controls = [...m[0].matchAll(/<(input|select|textarea)\b[^>]*>/gi)].map(x => attrs(x[0]));
    scopes.push([rel(file),clean.slice(0,m.index).split('\n').length,a.id,/return\s+false/.test(a.onsubmit || ''),Object.hasOwn(a,'novalidate'),controls.length,controls.filter(x => Object.hasOwn(x,'required')).length,controls.filter(x => !x.id && !x.name).length]);
  }
}
fs.writeFileSync(path.join(out,'dynamic-controls.csv'),csv(dynamic));
fs.writeFileSync(path.join(out,'form-scopes.csv'),csv(scopes));
const prior = new Map(fs.readFileSync(path.join(root,'docs/audits/gd00-20261020/source-hashes.csv'),'utf8').replace(/^\ufeff/,'').trim().split('\n').slice(1).map(line => line.replace(/\r$/,'').split('","').map(x => x.replace(/^"|"$/g,''))));
const drift = [['file','old_sha256','new_sha256','state']];
for(const file of walk(path.join(root,'pages')).filter(f => /\.(html|js|mjs)$/.test(f))) {
 const name=rel(file),hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 if(prior.get(name)!==hash)drift.push([name,prior.get(name)||'',hash,prior.has(name)?'changed':'added']);
 prior.delete(name);
}
for(const [name,hash]of prior)drift.push([name,hash,'','removed']);
fs.writeFileSync(path.join(out,'source-drift.csv'),csv(drift));
if (before !== git('rev-parse','HEAD')) throw new Error('HEAD changed during audit; baseline must be repeated');
console.log(inventoryOutput.trim());
console.log(`Dynamic control candidates: ${dynamic.length-1}; static form scopes: ${scopes.length-1}; source drift files: ${drift.length-1}. No runtime or E2E PASS implied.`);
