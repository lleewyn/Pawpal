const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { verify } = require('./verify.cjs');
const suffix = crypto.randomBytes(6).toString('hex');
const stage = 'pawpal_intake_' + suffix;
const folder = path.resolve('D:/Aboutme/Pawpal-infra/supabase-local/backups/customer-intake-' + suffix);
const remote = '/tmp/' + stage + '.dump';
const migration = path.join(__dirname, '006_create_customer_quick.sql');
function docker(args) { return execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }); }
function sql(db, query) { return docker(['exec', 'supabase-db', 'psql', '-U', 'supabase_admin', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At', '-c', query]).trim(); }
let created = false;
try {
    verify(sql, 'postgres');
    fs.mkdirSync(folder, { recursive: true });
    docker(['exec', 'supabase-db', 'pg_dump', '-U', 'supabase_admin', '-d', 'postgres', '-Fc', '-f', remote]);
    docker(['cp', 'supabase-db:' + remote, path.join(folder, 'before-intake-full.dump')]);
    docker(['exec', 'supabase-db', 'createdb', '-U', 'supabase_admin', '-T', 'template0', stage]); created = true;
    docker(['exec', 'supabase-db', 'pg_restore', '-U', 'supabase_admin', '--exit-on-error', '-d', stage, remote]);
    docker(['cp', migration, 'supabase-db:/tmp/' + stage + '.sql']);
    docker(['exec', 'supabase-db', 'psql', '-U', 'supabase_admin', '-d', stage, '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/' + stage + '.sql']);
    const admin = sql(stage, "SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' LIMIT 1");
    const count = Number(sql(stage, 'SELECT count(*) FROM public.customer'));
    // Fail after the customer, profile, phone and membership inserts; the RPC must undo all of them.
    sql(stage, `BEGIN;
      CREATE FUNCTION public.intake_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced_address_failure'; END $$;
      CREATE TRIGGER intake_test_fail BEFORE INSERT ON public.customer_address FOR EACH ROW EXECUTE FUNCTION public.intake_test_fail();
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub','${admin}',true);
      DO $$ BEGIN
        BEGIN PERFORM public.create_customer_quick('Intake transaction verification','0999999981','Verification address','Verification province');
          RAISE EXCEPTION 'Expected forced failure';
        EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'forced_address_failure' THEN RAISE; END IF; END;
        IF (SELECT count(*) FROM public.customer) <> ${count} THEN RAISE EXCEPTION 'Partial customer persisted'; END IF;
        IF EXISTS(SELECT 1 FROM public.customer_phone WHERE phone_number='0999999981') THEN RAISE EXCEPTION 'Partial phone persisted'; END IF;
      END $$;
      ROLLBACK;`);
    verify(sql, stage);
    docker(['exec', 'supabase-db', 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/' + stage + '.sql']);
    verify(sql, 'postgres');
    fs.writeFileSync(path.join(folder, 'verification.txt'), 'Migration 006 tested in restored database; forced late failure leaves no partial customer. Live schema remains 105 tables / 906 columns.\n');
    console.log('PASS migration 006 restored trial, atomic rollback, live schema verification. Backup: ' + folder);
} finally {
    if (created) docker(['exec', 'supabase-db', 'dropdb', '-U', 'supabase_admin', '--force', stage]);
}
