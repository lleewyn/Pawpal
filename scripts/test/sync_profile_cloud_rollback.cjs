// Bounded Cloud integration: synthetic actors only; one transaction, always ROLLBACK.
// Does not test HTTP JWT verification, Realtime delivery or UI persistence after commit.
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {connect} = require('../database/v1/service_import_connection.cjs');
if (!process.argv.includes('--cloud')) {
    console.log('Use --cloud for the bounded, rollback-only profile integration check. No network used.');
    process.exit(0);
}
(async () => {
    const db = await connect();
    let queries = 0;
    const evidence = {environment:'Supabase Cloud cpzuvaplseielhgcnqrn', timestamp:new Date().toISOString(),
        scope:'Profile RPC/RLS integration only; synthetic A/B/staff; no commits or Logs', checks:[]};
    const q = async (sql, args) => {queries++; return db.query(sql,args);};
    const actor = async (id, role='authenticated') => {
        await q('RESET ROLE');
        await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[id,role]);
        await q(role==='anon'?'SET LOCAL ROLE anon':'SET LOCAL ROLE authenticated');
    };
    const rejected = async (fn, codes) => {
        await q('SAVEPOINT expected_denial');
        let denied = false;
        try {await fn();} catch(e) {assert.ok(codes.includes(e.code), 'Unexpected denial SQLSTATE: '+e.code); denied=true;}
        await q('ROLLBACK TO SAVEPOINT expected_denial');
        await q('RELEASE SAVEPOINT expected_denial');
        assert.ok(denied,'Expected database denial');
    };
    const pass = name => evidence.checks.push({name,status:'PASS'});
    try {
        await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
        const a=randomUUID(),b=randomUUID(),staffAuth=randomUUID(),staff=randomUUID(),ca=randomUUID(),cb=randomUUID();
        evidence.fixtureIds={customerA:ca,customerB:cb};
        await q('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[a,b,staffAuth]);
        await q("INSERT INTO public.customer(id,auth_user_id,customer_code,customer_status) VALUES($1,$2,$3,'active'),($4,$5,$6,'active')",[ca,a,'E2E-SYNC-A-'+ca,cb,b,'E2E-SYNC-B-'+cb]);
        await q("INSERT INTO public.customer_profile(customer_id,full_name) VALUES($1,'E2E Sync A'),($2,'E2E Sync B') ON CONFLICT(customer_id) DO UPDATE SET full_name=excluded.full_name",[ca,cb]);
        await q("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES($1,$2,'E2E Sync Admin','QA','active',false)",[staff,staffAuth]);
        await q("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN')",[staff]);
        await actor(a);
        let snapshot=(await q('SELECT public.customer_profile_snapshot() value')).rows[0].value;
        assert.equal(snapshot.id,ca);
        const balance=(await q('SELECT total_paw_points FROM public.customer_point_balance WHERE customer_id=$1',[ca])).rows[0];
        assert.ok(balance);assert.equal(Number(balance.total_paw_points),0);
        pass('A can read the bounded authoritative point balance used by profile UI');
        const beforeRevision=snapshot.revision;
        snapshot=(await q("SELECT public.customer_profile_save('E2E User Edited',NULL,'[]'::jsonb,$1) value",[beforeRevision])).rows[0].value;
        assert.equal(snapshot.name,'E2E User Edited');
        pass('User A profile_save returns authoritative updated snapshot');
        await actor(staffAuth);
        const row=(await q('SELECT c.id,c.updated_at::text updated_at,p.full_name FROM public.customer c JOIN public.customer_profile p ON p.customer_id=c.id WHERE c.id=$1',[ca])).rows[0];
        assert.equal(row.full_name,'E2E User Edited');
        pass('Admin actor reads A change by fixture ID under RLS');
        await q("SELECT public.update_customer_profile($1,$2,'E2E Admin Edited',NULL,NULL,NULL,NULL,NULL,NULL)",[ca,row.updated_at]);
        await actor(a);
        snapshot=(await q('SELECT public.customer_profile_snapshot() value')).rows[0].value;
        assert.equal(snapshot.name,'E2E Admin Edited');
        assert.equal(snapshot.id,ca);
        pass('A snapshot reads admin change from same database');
        await rejected(()=>q("SELECT public.customer_profile_save('E2E Stale',NULL,'[]'::jsonb,$1)",[beforeRevision]),['PT409']);
        pass('Stale user profile revision is rejected');
        await rejected(()=>q("SELECT public.customer_profile_save('',NULL,'[]'::jsonb,$1)",[snapshot.revision]),['22023']);
        pass('Invalid name is rejected without partial write');
        await actor(b);
        const sb=(await q('SELECT public.customer_profile_snapshot() value')).rows[0].value;
        assert.equal(sb.id,cb);assert.equal(sb.name,'E2E Sync B');
        let hidden;
        await q('SAVEPOINT check_read');
        try {hidden=(await q('SELECT customer_id,full_name FROM public.customer_profile WHERE customer_id=$1',[ca])).rows.length===0;}
        catch(e) {assert.equal(e.code,'42501');hidden=true;await q('ROLLBACK TO SAVEPOINT check_read');}
        await q('RELEASE SAVEPOINT check_read');
        assert.ok(hidden);
        pass('B cannot read A profile via explicit ID');
        await rejected(()=>q("SELECT public.update_customer_profile($1,$2,'E2E Forbidden',NULL,NULL,NULL,NULL,NULL,NULL)",[ca,row.updated_at]),['42501']);
        pass('B cannot call admin profile update for A');
        await actor('','anon');
        await rejected(()=>q('SELECT public.customer_profile_snapshot()'),['42501']);
        pass('Guest cannot execute private profile snapshot');
        await q('RESET ROLE');
        assert.equal((await q('SELECT full_name FROM public.customer_profile WHERE customer_id=$1',[ca])).rows[0].full_name,'E2E Admin Edited');
        pass('Denied actions leave fixture A unchanged');
        await q('ROLLBACK');
        const cleanup=(await q('SELECT EXISTS(SELECT 1 FROM public.customer WHERE id=ANY($1::uuid[])) OR EXISTS(SELECT 1 FROM auth.users WHERE id=ANY($2::uuid[])) remains',[[ca,cb],[a,b,staffAuth]])).rows[0];
        assert.equal(cleanup.remains,false);
        pass('Rollback removed all synthetic customer/auth fixtures');
        evidence.status='PASS';evidence.queries=queries;
        const file=path.resolve('docs/verification/sync/profile-cloud-rollback.txt');fs.mkdirSync(path.dirname(file),{recursive:true});
        fs.writeFileSync(file,JSON.stringify(evidence,null,2)+'\n');
        console.log('PASS',evidence.checks.length,'profile/RLS checks;',queries,'bounded SQL statements; all fixtures rolled back. Not full UI E2E.');
    } catch(e) {
        await db.query('ROLLBACK').catch(()=>{});
        console.error('Profile integration failed:',e.code||'',e.message);
        process.exitCode=1;
    } finally {await db.end();}
})().catch(e=>{console.error(e.code||'connection_failed');process.exitCode=1;});
