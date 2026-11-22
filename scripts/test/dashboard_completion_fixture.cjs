// Browser fixture helper, loaded by tests only. Never loaded by the Admin app.
module.exports = function dashboardTestAnalysis(args) {
    const M = window.PawpalBusinessMetrics, range = M.period(args.p_from, args.p_to);
    return { from: range.start, to: range.end, requested_to: range.end, previous_from: range.previousFrom + 'T00:00:00+07:00', previous_to: range.from + 'T00:00:00+07:00', partial: false,
        cash: { current: { collected: range.length * 100, refunded: range.length * 25, net: range.length * 75 }, previous: { collected: range.length * 100, refunded: range.length * 25, net: range.length * 75 } },
        transactions: [], customers: { eligible: 0, first_observed: 0, returned_from_before: 0, repeated_in_period: 0 },
        outcomes: { orders_created: 0, orders_cancelled: 0, appointments_created: 0, appointments_cancelled: 0, appointments_no_show: 0 },
        missing_completion_dates: { orders: 0, appointments: 0 }, history_from: null };
};
