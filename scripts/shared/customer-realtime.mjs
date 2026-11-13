export function watchCustomerTables(client, customerId, tables, refresh, {filters={}} = {}) {
    if (!client?.channel || !customerId) return () => {};
    const doc = typeof document === 'undefined' ? null : document;
    let timer, disposed = false, dirty = false, pending = false;
    async function flush() {
        if (disposed || doc?.hidden || pending || !dirty) return;
        dirty = false; pending = true;
        try { await refresh(); } catch (_) { /* The view owns its error state; do not retry in a loop. */ }
        finally { pending = false; if (dirty && !disposed && !doc?.hidden) schedule(); }
    }
    function schedule() {
        dirty = true; clearTimeout(timer);
        if (!disposed && !doc?.hidden) timer = setTimeout(flush, 300);
    }
    const visible = () => { if (!doc?.hidden && dirty) schedule(); };
    const channel = client.channel(`customer-view-${customerId}-${Math.random().toString(36).slice(2)}`);
    for (const table of tables) {
        // Child tables derive ownership through order/line RLS; they have no
        // customer_id column. A filter on that missing column never refreshes.
        const viaParent = ['return_request','return_request_detail','review','review_media','sales_order_detail','appointment_item','hotel_booking','taxi_trip','appointment_record','appointment_adjustment','care_log','care_log_media','pet_weight_history'].includes(table);
        const filter = filters[table] || (viaParent ? null : `customer_id=eq.${customerId}`);
        channel.on('postgres_changes', { event: '*', schema: 'public', table, ...(filter?{filter}:{}) }, schedule);
    }
    let subscribed = false;
    channel.subscribe(status => { if (status === 'SUBSCRIBED') { if (subscribed) schedule(); subscribed = true; } });
    doc?.addEventListener('visibilitychange', visible);
    return () => { disposed = true; clearTimeout(timer); doc?.removeEventListener('visibilitychange', visible); client.removeChannel(channel); };
}
