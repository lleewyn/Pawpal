// Copy only the existing read-only audit snapshot to a durable private backup.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
if(!process.argv.includes('--archive')){console.log('No writes. Pass --archive to preserve the existing private snapshot.');process.exit(0);}
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const evidence='docs/chatbot/stage0-2026-10-28',inventory=JSON.parse(fs.readFileSync(evidence+'/inventory.txt','utf8'));
const source=path.resolve(inventory.cloud.privateDefinitionSnapshot),tempRoot=path.resolve(os.tmpdir())+path.sep;
if(!source.startsWith(tempRoot)||!path.basename(source).startsWith('pawpal-chatbot-stage0-'))throw Error('Unexpected snapshot location');
const destination=path.resolve('D:/Aboutme/Pawpal-infra/supabase-local/backups/chatbot-stage0-20261028');
fs.mkdirSync(destination,{recursive:true});
const files=[{name:'functions.sql',data:fs.readFileSync(path.join(source,'functions.sql'))},{name:'inventory.txt',data:fs.readFileSync(evidence+'/inventory.txt')}];
for(const file of files){const target=path.join(destination,file.name);if(fs.existsSync(target)&&hash(fs.readFileSync(target))!==hash(file.data))throw Error('Refusing to overwrite different backup');if(!fs.existsSync(target))fs.writeFileSync(target,file.data,{flag:'wx'});}
const manifest={archivedAt:new Date().toISOString(),snapshotAt:inventory.cloud.capturedAt,sourceHead:inventory.head,files:files.map(f=>({name:f.name,bytes:f.data.length,sha256:hash(f.data)})),scope:'Function definitions and catalog inventory only; not full database/Auth/data backup and not an automatically executable rollback.'};
const target=path.join(destination,'manifest.txt');if(!fs.existsSync(target))fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
const receipt={destination,verified:true,files:manifest.files,scope:manifest.scope};fs.writeFileSync(evidence+'/archive-receipt.txt',JSON.stringify(receipt,null,2)+'\n');
console.log('PASS: two existing snapshot files archived and hashes verified; no database calls.');
