// Exact cumulative rounding. Preview only; the database recomputes under row locks.
export function refundLoyaltyPreview(payment, amount) {
    const integer = value => {
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < 0) throw new Error('invalid');
        return BigInt(number);
    };
    try {
        if (!payment?.loyalty) throw new Error('metadata');
        const s = payment.loyalty, total = integer(payment.amount), next = integer(amount);
        if (!total || !next || payment.transaction_status !== 'succeeded') throw new Error('invalid');
        const refunds = (payment.refunds || []).filter(r => r.refund_status === 'succeeded');
        const money = refunds.reduce((n, r) => n + integer(r.refunded_amount), 0n);
        const eligible = refunds.reduce((n, r) => n + integer(r.eligible_refund_amount), 0n);
        const reward = integer(s.reward_points), reversed = integer(s.reversed_points);
        const spend = integer(payment.eligible_spend_amount), balance = integer(s.points_balance);
        if (money + next > total) return { error: 'Số tiền vượt số còn được hoàn.' };
        if (s.history_conflict || reversed !== reward * money / total || eligible !== spend * money / total)
            return { error: 'Lịch sử hoàn tiền và điểm chưa khớp. Cần đối soát trước khi hoàn.' };
        const points = reward * (money + next) / total - reversed;
        if (points > 2147483647n) throw new Error('invalid');
        if (points > balance) return { error: 'Khách không đủ điểm để thu hồi. Cần đối soát trước khi hoàn tiền.' };
        return { points: Number(points), eligible: Number(spend * (money + next) / total - eligible), balance: Number(balance - points) };
    } catch {
        return { error: 'Chưa có dữ liệu đối soát điểm hợp lệ. Tải lại khoản thu và kiểm tra số tiền.' };
    }
}
