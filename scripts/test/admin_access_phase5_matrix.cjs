// Build a reviewable acceptance index from passing reports; never infer PASS from unchecked rows.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const paths={full:'docs/security/phase5/full/ui-results.txt',rt:'docs/security/phase4/realtime/ui-results.txt'};
const reports=Object.fromEntries(Object.entries(paths).map(([key,file])=>{const report=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(report.status,'PASS',file);assert.equal(report.disposableDatabaseRemoved,true,file);for(const [source,hash]of Object.entries(report.sourceSha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),hash,source);return [key,report];}));
const specs=[
 [1,['full','PQ-01:']],
 [2,['full','Real ADMIN initializes'],['full','Real ADMIN creates a customer'],['full','PQ-15:']],
 [3,['full','Pet edits persist'],['full','Customer edits persist']],
 [4,['full','Booking uses database price'],['full','Own item start and completion persist']],
 [5,['full','Direct item mutation for a co-worker'],['full','Reassignment while intake is open']],
 [6,['full','Lost-response retry creates exactly one real pending order'],['full','Collecting the remaining balance persists']],
 [7,['full','A forged STAFF refund'],['full','PQ-07/PQ-09:']],
 [8,['full','PQ-08/PQ-09:']],
 [9,['full','PQ-08/PQ-09:'],['full','PQ-07/PQ-09:']],
 [10,['full','Inline reply saves one actual message'],['full','Foreign transcript is not fetched']],
 [11,['full','PQ-11/PQ-12:'],['full','Forged complaint approval']],
 [12,['full','PQ-11/PQ-12:']],
 [13,['full','Personal profile ignores a foreign staff ID'],['rt','Legacy search RPCs remain ADMIN-only']],
 [14,['full','Forged cached ADMIN and settings deep link']],
 [15,['full','PQ-15:'],['rt','PQ-21:']],
 [16,['full','Forged cached ADMIN and settings deep link'],['rt','PQ-19:']],
 [17,['full','A forged STAFF refund'],['rt','STAFF direct JSON and CSV exports']],
 [18,['full','PQ-18/public regression:'],['full','PQ-18 browser:']],
 [19,['rt','PQ-19:']], [20,['rt','PQ-20:']], [21,['rt','PQ-21:']], [22,['rt','PQ-22:']],
 [23,['rt','PQ-23:']], [24,['rt','PQ-24:']], [25,['rt','PQ-25:']],
 [26,['full','PQ-26:']], [27,['full','PQ-27:']], [28,['full','PQ-28:']], [29,['full','PQ-29:']], [30,['full','PQ-30:']]
];
const checklist=fs.readFileSync('PAWPAL_CHECKLIST_PHAN_QUYEN_ADMIN.md','utf8');
const rows=specs.map(([n,...selectors])=>{const code='PQ-'+String(n).padStart(2,'0'),line=checklist.split('\n').find(line=>/^\| \[[ x]\] \|/.test(line)&&line.includes('| '+code+' |'));assert.ok(line,code);const evidence=selectors.flatMap(([key,part])=>{const matching=reports[key].checks.filter(c=>c.status==='PASS'&&c.name.includes(part));assert.ok(matching.length,code+': '+part);return matching.map(c=>({report:paths[key],capturedAt:reports[key].capturedAt,check:c.name}));});return {code,status:'PASS',scenario:line.split('|')[4].trim(),evidence,...(n===17?{fileScope:'No management Storage bucket/object exists in the reviewed baseline; no private binary-transfer test is claimed. See phase2/storage-readonly.txt. JSON/CSV and printable receipts are tested.'}:{})};});
assert.equal(rows.length,30);assert.equal(new Set(rows.map(r=>r.code)).size,30);
fs.writeFileSync('docs/security/phase5/pq-results.txt',JSON.stringify({capturedAt:new Date().toISOString(),status:'PASS',scope:'Local acceptance index; full 165-186 Auth/browser regression plus retained phase-4 real Realtime/answer evidence. No Cloud deployment or live model calls.',rows},null,2)+'\n');
const header='# PQ-01 to PQ-30 acceptance evidence\n\nLocal test database only. Detailed proof: [pq-results.txt](pq-results.txt). Realtime cases reuse the phase-4 passing transport suite; their recorded production-source hashes were reverified.\n\n| Code | Result | Scenario | Report and exact checks |\n|---|---|---|---|\n';
fs.writeFileSync('docs/security/phase5/PQ_MATRIX.md',header+rows.map(r=>'| '+r.code+' | PASS | '+r.scenario+' | '+r.evidence.map(e=>'`'+e.report+'`: '+e.check).join('<br>')+' |').join('\n')+'\n\nPQ-17 file limitation: the reviewed baseline has no private management Storage bucket/object. No private binary download was fabricated or claimed; direct JSON/CSV exports and authorized printing are covered. Recheck actual Storage configuration during phase 6.\n');
console.log('PASS 30/30 PQ evidence mappings; report status, cleanup and production-source hashes verified');
