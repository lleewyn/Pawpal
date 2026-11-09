const { connect } = require('../database/v1/service_import_connection.cjs');

(async () => {
    const db = await connect();
    try {
        const orders = await db.query(`
            SELECT o.id, o.order_code, o.order_status, o.customer_id, cp.full_name,
                   array_agg(d.id) as line_ids,
                   count(r.id) as review_count
            FROM sales_order o 
            JOIN customer c ON c.id = o.customer_id 
            LEFT JOIN customer_profile cp ON cp.customer_id = c.id
            JOIN sales_order_detail d ON d.order_id = o.id 
            LEFT JOIN review r ON r.sales_order_detail_id = d.id
            WHERE o.order_status IN ('completed', 'delivered') 
            GROUP BY o.id, o.order_code, o.order_status, o.customer_id, cp.full_name 
            HAVING count(r.id) = 0
            LIMIT 5
        `);
        console.log('Orders eligible for review:', JSON.stringify(orders.rows, null, 2));

        if (orders.rows.length > 0) {
            const customerIds = orders.rows.map(o => o.customer_id);
            const auths = await db.query(`
                SELECT c.id, c.customer_code, u.id as auth_id, u.email as auth_email
                FROM customer c
                JOIN auth.users u ON u.id = c.auth_user_id
                WHERE c.id = ANY($1)
            `, [customerIds]);
            console.log('Customers with auth accounts:', JSON.stringify(auths.rows, null, 2));
        }
    } finally {
        await db.end();
    }
})().catch(console.error);
