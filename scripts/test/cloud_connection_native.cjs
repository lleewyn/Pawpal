// Offline transport contract: no database, network or credentials are accessed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../database/v1/cloud_connection.cjs'),'utf8');
const config={DESTINATION_DATABASE_URL:'postgres://postgres.cpzuvaplseielhgcnqrn@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',DESTINATION_DATABASE_PASSWORD:'offline-test-password',DESTINATION_SUPABASE_URL:'https://cpzuvaplseielhgcnqrn.supabase.co'};
let calls=[],logs=[],reply={status:0,stdout:'  ok\n'};
const context={module:{exports:{}},URL,process:{platform:'win32',env:{}},require(name){
 if(name==='node:fs')return {readFileSync:()=>Buffer.from(''),writeFileSync:(file,content)=>logs.push(content)};
 if(name==='node:path')return path;
 if(name==='dotenv')return {parse:()=>config};
 if(name==='node:child_process')return {spawnSync:(...args)=>{calls.push(args);return reply;}};
 throw Error('Unexpected dependency '+name);
}};
vm.runInNewContext(source,context);const {sql,cloud}=context.module.exports;
assert.equal(sql('SELECT 1'),'ok');let [exe,args,options]=calls[0];
assert.equal(exe,'psql');assert.equal(options.input,'SELECT 1');assert.equal(options.env.PGPASSWORD,config.DESTINATION_DATABASE_PASSWORD);
assert.equal(options.env.PGSSLMODE,'require');assert.equal(options.windowsHide,true);assert.ok(!args.includes(config.DESTINATION_DATABASE_PASSWORD));assert.ok(args.includes('postgres.cpzuvaplseielhgcnqrn'));
cloud('pg_dump',['--schema-only']);assert.equal(calls[1][0],'pg_dump');
assert.throws(()=>cloud('unexpected'),/Unsupported migration command/);
reply={status:null,error:{code:'ENOENT'}};assert.throws(()=>sql('SELECT 1'),/PostgreSQL client not found/);
reply={status:1,stderr:'Failure '+config.DESTINATION_DATABASE_PASSWORD};assert.throws(()=>sql('SELECT 1'),/Cloud command failed/);assert.ok(!logs.at(-1).includes(config.DESTINATION_DATABASE_PASSWORD));
console.log('PASS native Cloud PostgreSQL clients, guarded destination, SQL input, private password environment, missing-client errors and redacted failure output. No network or database calls.');
