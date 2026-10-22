export function watchCustomerTables(client, customerId, tables, refresh) {
    if (!client?.channel || !customerId) return () => {};
    let timer, disposed = false;
    const channel = client.channel(`customer-view-${customerId}-${Math.random().toString(36).slice(2)}`);
    for (const table of tables) {
        // Child tables derive ownership through order/line RLS; they have no
        // customer_id column. A filter on that missing column never refreshes.
        const viaParent = ['return_request','return_request_detail','review','sales_order_detail'].includes(table);
        channel.on('postgres_changes', { event: '*', schema: 'public', table, ...(viaParent?{}:{filter: `customer_id=eq.${customerId}`}) }, () => {
            clearTimeout(timer);
            timer = setTimeout(() => { if (!disposed) refresh(); }, 200);
        });
    }
    channel.subscribe();
    return () => { disposed = true; clearTimeout(timer); client.removeChannel(channel); };
}
