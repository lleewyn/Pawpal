// Real keys stay outside the repository and are never printed.
const fs=require('node:fs'),path=require('node:path');
const {infra,sql}=require('./cloud_connection.cjs');
if(process.argv[2]!=='apply')throw Error('Use apply after filling AI-KEYS.private.env outside the repository');
const filename=path.join(infra,'AI-KEYS.private.env');
const env=require('dotenv').parse(fs.readFileSync(filename));
const entries=Object.entries(env).filter(([name,value])=>/^GEMINI_KEY_\d+$/.test(name)&&value.trim());
if(!entries.length||entries.length>20)throw Error('Fill 1..20 GEMINI_KEY_N values in the private file');
if(entries.some(([,value])=>!/^AIza[A-Za-z0-9_-]{20,100}$/.test(value)))throw Error('One or more values are not valid Gemini API key formats; no changes made');
if(new Set(entries.map(([,value])=>value)).size!==entries.length)throw Error('Duplicate keys in the private file; no changes made');
const literal=value=>"'"+value.replace(/'/g,"''")+"'";
const values=entries.map(([name,value])=>`(${literal(name)},${literal(value)})`).join(',');
// Do not reactivate or reset cooldown for an existing key during re-import.
const statement=`BEGIN; DO $$ BEGIN
 INSERT INTO pawpal_private.ai_api_key(label,api_key) VALUES ${values}
 ON CONFLICT(api_key) DO UPDATE SET label=excluded.label;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'ai_key_import_failed'; END $$; COMMIT;`;
sql(statement);
console.log('PASS imported '+entries.length+' private Gemini keys; existing cooldown/disabled states preserved.');
