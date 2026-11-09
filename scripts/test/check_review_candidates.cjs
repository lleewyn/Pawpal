const { connect } = require('../database/v1/service_import_connection.cjs');

(async () => {
    const db = await connect();
    try {
        const orders = await db.query(`
            SELECT o.id, o.order_code, o.order_status, o.customer_id, c.full_name, c.email, c.phone_number, 
                   array_agg(d.id) as line_ids,
                   count(r.id) as review_count
            FROM sales_order o 
            JOIN customer c ON c.id = o.customer_id 
            JOIN sales_order_detail d ON d.sales_order_id = o.id 
            LEFT JOIN review r ON r.sales_order_detail_id = d.id
            WHERE o.order_status IN ('completed', 'delivered') 
            GROUP BY o.id, o.order_code, o.order_status, o.customer_id, c.full_name, c.email, c.phone_number 
            HAVING count(r.id) = 0
            LIMIT 5
        `);
        console.log('Delivered orders without reviews:', JSON.stringify(orders.rows, null, 2));

        // Also check customer accounts that can log in (have auth_user_id)
        const customers = await db.query(`
            SELECT c.id, c.full_name, c.email, c.phone_number, c.auth_user_id, u.email as auth_email
            FROM customer c
            JOIN auth.users u ON u.id = c.auth_user_id
            WHERE c.id = ANY($1)
        `, [orders.rows.map(o => o.customer_id)]);
        console.log('Customers with auth:', JSON.stringify(customers.rows, null, 2));
    } finally {
        await db.end();
    }
})().catch(console.error);

