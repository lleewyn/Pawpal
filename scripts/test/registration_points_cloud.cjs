const {connect} = require('../database/v1/service_import_connection.cjs');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
(async () => {
    const client = await connect();
    try {
        const migration = fs.readFileSync(require.resolve('../database/v1/204_registration_welcome_points.sql'), 'utf8');
        await client.query('BEGIN');
        await client.query("SET LOCAL statement_timeout='20s'");
        await client.query(migration.replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, ''));
        await client.query('SAVEPOINT registration_tests');
        const authId = randomUUID();
        const phone = '099' + String(Math.floor(Math.random()*1e7)).padStart(7, '0');
        const exists = await client.query('SELECT 1 FROM public.customer_phone WHERE phone_number=$1 UNION ALL SELECT 1 FROM auth.users WHERE phone=$2', [phone, '84'+phone.slice(1)]);
        assert.equal(exists.rowCount, 0, 'Disposable phone must be unused');
        await client.query('INSERT INTO auth.users(id,phone,phone_confirmed_at) VALUES($1,$2,now())', [authId, '84'+phone.slice(1)]);
        const call = () => client.query('SELECT public.complete_customer_auth($1,$2,$3) AS id', [authId, phone, 'Kiểm thử điểm đăng ký']);
        const customerId = (await call()).rows[0].id;
        const balance = async () => Number((await client.query('SELECT total_paw_points FROM public.customer_point_balance WHERE customer_id=$1', [customerId])).rows[0].total_paw_points);
        assert.equal(await balance(), 50, 'New registration receives 50');
        await call();
        assert.equal(await balance(), 50, 'Replay/password reset cannot grant another reward');
        await client.query('SAVEPOINT ledger_failure');
        // Simulate an existing unlinked counter profile, retaining its previous transactions.
        await client.query('UPDATE public.customer SET auth_user_id=NULL WHERE id=$1', [customerId]);
        await call();
        assert.equal(await balance(), 50, 'Reactivation cannot duplicate an existing welcome reward');
        await client.query('ROLLBACK TO SAVEPOINT ledger_failure');
        await client.query('ROLLBACK TO SAVEPOINT registration_tests');
        console.log('PASS: registration +50; replay/reset unchanged; reactivation does not double award. Test records rolled back.');
        const repairPhone = process.argv.find(arg => arg.startsWith('--repair-phone='))?.split('=')[1];
        if (repairPhone) {
            assert.match(repairPhone, /^0\d{9}$/);
            const eligible = await client.query(`SELECT c.id FROM public.customer c
                JOIN public.customer_phone p ON p.customer_id=c.id
                JOIN auth.users u ON u.id=c.auth_user_id
                WHERE p.phone_number=$1 AND p.verified_at IS NOT NULL
                AND c.customer_status='active' AND c.note='Đăng ký trực tuyến qua Cổng Khách hàng.'
                AND u.deleted_at IS NULL AND u.phone_confirmed_at IS NOT NULL
                AND ltrim(u.phone,'+')='84'||substring($1 FROM 2)
                FOR UPDATE OF c`, [repairPhone]);
            assert.equal(eligible.rowCount, 1, 'Repair requires exactly one verified online registration');
            const id = eligible.rows[0].id;
            const repaired = await client.query(`INSERT INTO public.paw_point_transaction
                (customer_id,points,description,idempotency_key,sequence_no)
                SELECT $1,50,'Thưởng thành viên mới đăng ký tài khoản',
                    'registration-welcome:'||$1::text,coalesce(max(sequence_no),0)+1
                FROM public.paw_point_transaction WHERE customer_id=$1
                HAVING NOT EXISTS(SELECT 1 FROM public.paw_point_transaction
                    WHERE customer_id=$1 AND (idempotency_key='registration-welcome:'||$1::text
                    OR description='Thưởng thành viên mới đăng ký tài khoản'))`, [id]);
            console.log('Reported account welcome rewards repaired:', repaired.rowCount);
        }
        if (process.argv.includes('--apply')) {
            await client.query('COMMIT');
            console.log('Applied registration reward function to Supabase.');
        } else {
            await client.query('ROLLBACK');
            console.log('Rehearsal only: function change rolled back.');
        }
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally { await client.end(); }
})().catch(error => { console.error(error.message || error.code || String(error)); process.exitCode = 1; });
