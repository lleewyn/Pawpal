const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {infra,cloud,sql}=require('./cloud_connection.cjs');
const folder=path.join(infra,'backups','service-species-cloud-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(folder,{recursive:true});
const dump=cloud('pg_dump',['--data-only','--table=public.service_supported_species','--table=public.service','--table=public.pet_species','--no-owner'],'',{folder});
fs.writeFileSync(path.join(folder,'before-service-species.private.sql'),dump);
fs.writeFileSync(path.join(folder,'before-SHA256.txt'),crypto.createHash('sha256').update(dump).digest('hex')+'\n');
const source=fs.readFileSync(path.join(__dirname,'069_service_species_seed.sql'),'utf8').replace(/^BEGIN;|^COMMIT;$/gm,'');
const snapshot=`CREATE FUNCTION pg_temp.seed_snapshot() RETURNS jsonb LANGUAGE plpgsql AS $$
 DECLARE t record; digest text; result jsonb:='{}';BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'service_supported_species' ORDER BY tablename LOOP
 EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text,chr(10) ORDER BY to_jsonb(r)::text),'''')) FROM public.%I r',t.tablename) INTO digest;
 result:=result||jsonb_build_object(t.tablename,digest);END LOOP;
 SELECT md5(coalesce(string_agg(jsonb_build_array(id,email,encrypted_password,banned_until)::text,chr(10) ORDER BY id),'')) INTO digest FROM auth.users;
 RETURN result||jsonb_build_object('auth',digest);END $$;
 CREATE TEMP TABLE seed_before ON COMMIT DROP AS SELECT pg_temp.seed_snapshot() snapshot;
 CREATE TEMP TABLE seed_old_links ON COMMIT DROP AS SELECT * FROM public.service_supported_species;`;
const result=sql(`BEGIN;SET LOCAL lock_timeout='15s';${snapshot}\n${source}\nDO $$ BEGIN
 IF (SELECT snapshot FROM seed_before) IS DISTINCT FROM pg_temp.seed_snapshot() THEN RAISE EXCEPTION 'Non-target data changed; rollback';END IF;
 IF EXISTS(SELECT * FROM seed_old_links EXCEPT SELECT * FROM public.service_supported_species) THEN RAISE EXCEPTION 'Existing association lost';END IF;
 END $$;
 SELECT jsonb_build_object('configured_services',count(DISTINCT service_id),'associations',count(*)) FROM public.service_supported_species;
 COMMIT;`,{folder});
fs.writeFileSync(path.join(folder,'verification.txt'),result+'\n');
console.log('PASS species configuration applied; existing associations and all other public/Auth data preserved. '+result);
