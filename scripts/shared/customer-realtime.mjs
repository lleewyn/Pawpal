export function watchCustomerTables(client, customerId, tables, refresh) {
    if (!client?.channel || !customerId) return () => {};
    let timer, disposed = false;
    const channel = client.channel(`customer-view-${customerId}-${Math.random().toString(36).slice(2)}`);
    for (const table of tables) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `customer_id=eq.${customerId}` }, () => {
            clearTimeout(timer);
            timer = setTimeout(() => { if (!disposed) refresh(); }, 200);
        });
    }
    channel.subscribe();
    return () => { disposed = true; clearTimeout(timer); client.removeChannel(channel); };
}
