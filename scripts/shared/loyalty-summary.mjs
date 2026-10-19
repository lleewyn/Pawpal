export function eligibleSpend(orders, appointments) {
    const paid = row => String(row.payment_status).toUpperCase() === 'PAID';
    const amount = value => Math.max(0, Number(value) || 0);
    return orders.filter(row => paid(row) && ['DELIVERED', 'COMPLETED'].includes(String(row.order_status).toUpperCase()))
        .reduce((sum, row) => sum + amount(row.total_amount), 0)
        + appointments.filter(row => paid(row) && String(row.appointment_status).toUpperCase() === 'COMPLETED')
            .reduce((sum, row) => sum + amount(row.total_price), 0);
}
export function loyaltySummary(spend) {
    const currentSpend = Math.max(0, Number(spend) || 0);
    const tier = currentSpend >= 15000000 ? 'Kim Cương' : currentSpend >= 5000000 ? 'Vàng' : currentSpend >= 1000000 ? 'Bạc' : 'Đồng';
    const nextTierLimit = currentSpend >= 5000000 ? 15000000 : currentSpend >= 1000000 ? 5000000 : 1000000;
    return { tier, spend: currentSpend, nextTierLimit, progressPercent: Math.min(currentSpend / nextTierLimit * 100, 100) };
}
