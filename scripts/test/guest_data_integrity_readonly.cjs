// Aggregate-only guest identity preflight; no phone, names or customer IDs exported.
const fs = require('node:fs');
const { connect } = require('../database/v1/service_import_connection.cjs');
if (!process.argv.includes('--cloud-readonly')) {
    console.log('Use --cloud-readonly for aggregate checks. No migration or data writes.');
    process.exit(0);
}
(async () => {
    const db = await connect();
    try {
        await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='8s'; SET LOCAL lock_timeout='2s'");
        const phone = (await db.query(`WITH clean AS (
            SELECT customer_id,is_primary,regexp_replace(btrim(phone_number),'[[:space:]().-]','','g') raw FROM public.customer_phone
        ), normalized AS (
            SELECT customer_id,is_primary,CASE WHEN raw ~ '^([+]84|0084|84)[0-9]{9}$' THEN '0'||right(raw,9) ELSE raw END phone FROM clean
        ) SELECT
            (SELECT count(*)::integer FROM normalized) phone_rows,
            (SELECT count(*)::integer FROM normalized WHERE phone !~ '^0[0-9]{9}$') invalid_phone_rows,
            (SELECT count(*)::integer FROM (SELECT phone FROM normalized WHERE phone ~ '^0[0-9]{9}$' GROUP BY phone HAVING count(DISTINCT customer_id)>1) s) phones_on_multiple_customers,
            (SELECT count(*)::integer FROM (SELECT phone FROM normalized WHERE is_primary AND phone ~ '^0[0-9]{9}$' GROUP BY phone HAVING count(DISTINCT customer_id)>1) s) primary_phones_on_multiple_customers,
            (SELECT count(*)::integer FROM (SELECT customer_id,phone FROM normalized GROUP BY customer_id,phone HAVING count(*)>1) s) duplicate_normalized_rows_per_customer,
            (SELECT count(*)::integer FROM (SELECT customer_id FROM normalized GROUP BY customer_id HAVING count(*) FILTER(WHERE is_primary)<>1) s) customers_with_invalid_primary_count`)).rows[0];
        const relationships = (await db.query(`SELECT
            (SELECT count(*)::integer FROM public.pet_profile p LEFT JOIN public.customer c ON c.id=p.customer_id WHERE c.id IS NULL) pets_without_customer,
            (SELECT count(*)::integer FROM public.appointment a LEFT JOIN public.pet_profile p ON p.id=a.pet_id WHERE p.id IS NULL OR p.customer_id IS DISTINCT FROM a.customer_id) appointment_owner_mismatches,
            (SELECT count(*)::integer FROM public.appointment_item i LEFT JOIN public.appointment a ON a.id=i.appointment_id WHERE a.id IS NULL) orphan_appointment_items,
            (SELECT count(*)::integer FROM public.sales_order_detail d LEFT JOIN public.sales_order o ON o.id=d.order_id WHERE o.id IS NULL) orphan_order_details`)).rows[0];
        await db.query('ROLLBACK');
        const result = { capturedAt: new Date().toISOString(), scope: 'Cloud READ ONLY aggregates; no record/phone exported, no repair, no migration; not transaction E2E', phone, relationships };
        fs.writeFileSync('docs/verification/sync/guest-data-integrity-readonly.txt', JSON.stringify(result, null, 2)+'\n');
        console.log(JSON.stringify(result));
    } finally { await db.end(); }
})().catch(error => { console.error(error.code || error.name); process.exitCode = 1; });
