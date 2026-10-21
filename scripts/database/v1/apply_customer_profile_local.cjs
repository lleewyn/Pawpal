const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {verify}=require('./verify.cjs');
const suffix=crypto.randomBytes(6).toString('hex'),stage='pawpal_profile_'+suffix;
const folder=path.resolve('D:/Aboutme/Pawpal-infra/supabase-local/backups/customer-profile-'+suffix);
const remote='/tmp/'+stage;
function docker(args){return execFileSync('docker',args,{encoding:'utf8',maxBuffer:8*1024*1024});}
function sql(db,query){return docker(['exec','supabase-db','psql','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-At','-c',query]).trim();}
let created=false;
try{
 verify(sql,'postgres'); fs.mkdirSync(folder,{recursive:true});
 docker(['exec','supabase-db','pg_dump','-U','supabase_admin','-d','postgres','-Fc','-f',remote+'.dump']);
 docker(['cp','supabase-db:'+remote+'.dump',path.join(folder,'before-profile-full.dump')]);
 docker(['exec','supabase-db','createdb','-U','supabase_admin','-T','template0',stage]);created=true;
 docker(['exec','supabase-db','pg_restore','-U','supabase_admin','--exit-on-error','-d',stage,remote+'.dump']);
 docker(['cp',path.join(__dirname,'007_update_customer_profile.sql'),'supabase-db:'+remote+'.sql']);
 docker(['exec','supabase-db','psql','-U','supabase_admin','-d',stage,'-v','ON_ERROR_STOP=1','-f',remote+'.sql']);
 const admin=sql(stage,"SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' LIMIT 1");
 sql(stage,`BEGIN;
  CREATE FUNCTION public.profile_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced_audit_failure'; END $$;
  CREATE TRIGGER profile_test_fail BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.profile_test_fail();
  SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${admin}',true);
  DO $$ DECLARE c uuid; stamp timestamptz; t uuid; BEGIN
   c:=public.create_customer_quick('Profile rollback original','0999999982');
   SELECT updated_at INTO stamp FROM public.customer WHERE id=c;
   SELECT membership_tier_id INTO t FROM public.customer_membership WHERE customer_id=c;
   BEGIN
    PERFORM public.update_customer_profile(c,stamp,'Profile changed','0999999983','check@example.test',NULL,NULL,t,
     '[{"receiver_name":"Receiver","receiver_phone":"0999999983","street_address":"Verification street","province":"Verification province","is_default":true}]'::jsonb);
    RAISE EXCEPTION 'Expected forced audit failure';
   EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'forced_audit_failure' THEN RAISE; END IF; END;
   IF (SELECT full_name FROM public.customer_profile WHERE customer_id=c)<>'Profile rollback original'
    OR (SELECT phone_number FROM public.customer_phone WHERE customer_id=c)<>'0999999982'
    OR EXISTS(SELECT 1 FROM public.customer_address WHERE customer_id=c)
    OR (SELECT contact_email FROM public.customer WHERE id=c) IS NOT NULL THEN RAISE EXCEPTION 'Partial edit persisted'; END IF;
  END $$; ROLLBACK;`);
 verify(sql,stage);
 docker(['exec','supabase-db','psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-f',remote+'.sql']);
 verify(sql,'postgres');
 fs.writeFileSync(path.join(folder,'verification.txt'),'Migration 007 verified in restored database; forced last-step audit failure rolls back customer/profile/phone/address. Live schema remains 105 tables / 906 columns.\n');
 console.log('PASS migration 007 rollback trial and live schema verification. Backup: '+folder);
}finally{if(created)docker(['exec','supabase-db','dropdb','-U','supabase_admin','--force',stage]);}
