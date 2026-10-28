// Repairs only the marker-owned fixture Auth signer to match fixture REST HS256.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
if(!process.argv.includes('--local-only')){console.log('No changes. Use --local-only.');process.exit(0);}
const out='docs/chatbot/stage1-acceptance-2026-10-28',file=out+'/local-environment.txt',env=JSON.parse(fs.readFileSync(file,'utf8'));
if(env.status!=='READY'||!/^pawpal_chatbot_g0_[a-f0-9]{12}$/.test(env.database))throw Error('invalid_fixture');
const docker=args=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});
const entry=env.containers.find(c=>c.kind==='auth'),actual=JSON.parse(docker(['inspect',entry.id]))[0];
if(actual.Config.Labels?.['pawpal.stage0.owner']!==env.ownerMarker||actual.Name!=='/'+entry.name)throw Error('owner_mismatch');
const config=JSON.parse(fs.readFileSync(path.join(env.privateDir,'connection.private.txt'),'utf8'));
const values=Object.fromEntries(actual.Config.Env.map(v=>{const i=v.indexOf('=');return [v.slice(0,i),v.slice(i+1)];}));delete values.GOTRUE_JWT_KEYS;values.GOTRUE_JWT_SECRET=config.jwtSecret;
const envFile=path.join(env.privateDir,'auth.private.env');fs.writeFileSync(envFile,Object.entries(values).map(([k,v])=>k+'='+v).join('\n')+'\n');
docker(['rm','-f',entry.id]);entry.id=docker(['run','-d','--pull=never','--name',entry.name,'--label','pawpal.stage0.owner='+env.ownerMarker,'--network',env.network,'-p','127.0.0.1:19991:9999','--env-file',envFile,'supabase/gotrue:v2.197.0']).trim();
env.fixtureAuthSigning='HS256 isolated fixture secret; inherited asymmetric keys removed';fs.writeFileSync(file,JSON.stringify(env,null,2)+'\n');console.log('Recreated marker-owned local Auth container only; secrets suppressed.');
