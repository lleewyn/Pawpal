function calculateVoucherPoints(voucher = {}) {
    const configured = Number(voucher.required_points || 0);
    if (Number.isSafeInteger(configured) && configured > 0) return configured;
    const type = String(voucher.type || '').toLowerCase();
    const discount = Number(voucher.discount_value || 0);
    const estimatedValue = type.includes('fixed') || type.includes('co_dinh')
        ? discount
        : discount * 2500;
    const levels = [
        [30000, 50], [50000, 100], [100000, 200],
        [150000, 300], [250000, 500], [Infinity, 1000]
    ];
    return levels.find(([maximum]) => estimatedValue <= maximum)?.[1] || 100;
}

function createCustomerLoyaltyService(admin) {
    const customerLocks = new Map();

    const serialize = (customerId, operation) => {
        const previous = customerLocks.get(customerId) || Promise.resolve();
        const next = previous.catch(() => {}).then(operation);
        customerLocks.set(customerId, next);
        return next.finally(() => {
            if (customerLocks.get(customerId) === next) customerLocks.delete(customerId);
        });
    };

    const voucherView = row => {
        const voucher = row.voucher || {};
        return {
            id: row.id,
            voucherId: voucher.id,
            code: voucher.voucher_code,
            name: voucher.voucher_name || voucher.voucher_code,
            discountDisplay: String(voucher.type || '').toLowerCase().includes('percent')
                ? `${Number(voucher.discount_value || 0)}%`
                : `${Math.round(Number(voucher.discount_value || 0) / 1000)}K`,
            pointsCost: Number(voucher.required_points || 0),
            createdAt: row.acquired_at,
            expiresAt: row.expired_at || voucher.end_date,
            status: row.voucher_status || 'AVAILABLE'
        };
    };

    async function wallet(customerId) {
        const { data, error } = await admin.from('customer_voucher')
            .select('id, acquired_at, expired_at, voucher_status, voucher:voucher_id(id, voucher_code, voucher_name, discount_value, type, required_points, end_date)')
            .eq('customer_id', customerId)
            .order('acquired_at', { ascending: false });
        if (error) throw new Error('Không thể tải ví voucher.');
        return (data || []).map(voucherView);
    }

    async function redeem(customerId, input = {}) {
        return serialize(customerId, async () => {
            const voucherId = String(input.voucherId || '').trim();
            const voucherCode = String(input.voucherCode || '').trim();
            if (!voucherId && !voucherCode) throw new Error('Không xác định được ưu đãi cần đổi.');

            let voucherQuery = admin.from('voucher')
                .select('id, voucher_code, voucher_name, discount_value, type, required_points, start_date, end_date, is_active, usage_count, max_usage')
                .limit(1);
            voucherQuery = voucherId ? voucherQuery.eq('id', voucherId) : voucherQuery.eq('voucher_code', voucherCode);
            const voucherResult = await voucherQuery.maybeSingle();
            if (voucherResult.error || !voucherResult.data) throw new Error('Ưu đãi không tồn tại hoặc đã bị gỡ.');
            const voucher = voucherResult.data;
            const now = new Date();
            if (!voucher.is_active || (voucher.start_date && new Date(voucher.start_date) > now) || (voucher.end_date && new Date(voucher.end_date) < now)) {
                throw new Error('Ưu đãi hiện không còn hiệu lực.');
            }
            const usageCount = Number(voucher.usage_count || 0);
            if (voucher.max_usage != null && usageCount >= Number(voucher.max_usage)) throw new Error('Ưu đãi đã hết lượt đổi.');
            const cost = calculateVoucherPoints(voucher);
            if (!Number.isSafeInteger(cost) || cost <= 0) throw new Error('Mức điểm đổi ưu đãi không hợp lệ.');

            const { data: txList, error: txErr } = await admin.from('paw_point_transaction')
                .select('points')
                .eq('customer_id', customerId);
            if (txErr) throw new Error('Không thể tra cứu số dư Paw Points.');
            const oldBalance = (txList || []).reduce((sum, r) => sum + (Number(r.points) || 0), 0);
            if (oldBalance < cost) throw new Error('Số điểm hiện tại chưa đủ để đổi ưu đãi này.');
            const newBalance = oldBalance - cost;

            let transactionId = null;
            let customerVoucherId = null;
            try {
                const rewardRule = await admin.from('reward_rule').select('id').eq('is_active', true).limit(1).maybeSingle();
                const ruleId = rewardRule?.data?.id || null;

                const transactionPayload = {
                    customer_id: customerId,
                    points: -cost,
                    description: `[REDEEM] Đổi ưu đãi: ${voucher.voucher_name} (${voucher.voucher_code})`
                };
                if (ruleId) transactionPayload.reward_rule_id = ruleId;

                const transaction = await admin.from('paw_point_transaction').insert(transactionPayload).select('id').single();
                if (transaction.error || !transaction.data) throw new Error('Không thể ghi lịch sử đổi điểm.');
                transactionId = transaction.data.id;

                const acquired = await admin.from('customer_voucher').insert({
                    customer_id: customerId,
                    voucher_id: voucher.id,
                    acquired_method: 'POINT_REDEMPTION',
                    voucher_status: 'AVAILABLE',
                    acquired_at: new Date().toISOString(),
                    expired_at: voucher.end_date || null
                }).select('id, acquired_at, expired_at, voucher_status').single();
                if (acquired.error || !acquired.data) throw new Error('Không thể thêm ưu đãi vào ví.');
                customerVoucherId = acquired.data.id;

                let usageQuery = admin.from('voucher')
                    .update({ usage_count: usageCount + 1, updated_at: new Date().toISOString() })
                    .eq('id', voucher.id);
                usageQuery = voucher.usage_count == null
                    ? usageQuery.is('usage_count', null)
                    : usageQuery.eq('usage_count', usageCount);
                const usageUpdate = await usageQuery.select('id').maybeSingle();
                if (usageUpdate.error || !usageUpdate.data) throw new Error('Số lượt ưu đãi vừa thay đổi. Vui lòng thử lại.');

                return {
                    points: newBalance,
                    transactionType: 'REDEEM',
                    transactionId,
                    voucher: voucherView({ ...acquired.data, voucher })
                };
            } catch (error) {
                if (customerVoucherId) await admin.from('customer_voucher').delete().eq('id', customerVoucherId).eq('customer_id', customerId);
                if (transactionId) await admin.from('paw_point_transaction').delete().eq('id', transactionId).eq('customer_id', customerId);
                throw error;
            }
        });
    }

    return { wallet, redeem };
}

module.exports = { createCustomerLoyaltyService, calculateVoucherPoints };
