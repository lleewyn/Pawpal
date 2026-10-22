const { createHash } = require('node:crypto');
const saves = new Map();

const addressesForCompare = addresses => addresses.map(a => ({
    id: a.id, street_address: a.street_address || '', province: a.province || '',
    district: a.district || '', ward: a.ward || '', is_default: !!a.is_default
})).sort((a, b) => String(a.id).localeCompare(String(b.id)));

function createCustomerProfileService(admin, writer = admin) {
    async function snapshot(customerId) {
        const [customer, profile, addresses, phones] = await Promise.all([
            admin.from('customer').select('id, contact_email').eq('id', customerId).single(),
            admin.from('customer_profile').select('full_name, date_of_birth, gender').eq('customer_id', customerId).maybeSingle(),
            admin.from('customer_address').select('*').eq('customer_id', customerId).order('id'),
            admin.from('customer_phone').select('phone_number, is_primary').eq('customer_id', customerId)
        ]);
        for (const result of [customer, profile, addresses, phones]) if (result.error) throw result.error;
        const addressStorage = addresses.data?.length && Object.hasOwn(addresses.data[0], 'district') ? 'structured' : 'legacy';
        const savedAddresses = (addresses.data || []).map(a => {
            if (addressStorage === 'structured') return a;
            const parts = (a.street_address || '').split(',');
            const district = parts.length > 1 ? parts.pop().trim() : '';
            return { ...a, street_address: parts.join(',').trim(), district, ward: '' };
        });
        const phoneList = Array.isArray(phones.data) ? phones.data : (phones.data ? [phones.data] : []);
        const primaryPhone = phoneList.find(p => p.is_primary)?.phone_number || phoneList[0]?.phone_number || '';
        const result = { addressStorage, id: customerId, phone: primaryPhone, email: customer.data?.contact_email || '',
            name: profile.data?.full_name || '', addresses: savedAddresses };
        result.revision = 'api:' + createHash('sha256').update(JSON.stringify(result)).digest('hex');
        return result;
    }
    async function save(customerId, input) {
        const name = String(input.name || '').trim();
        const email = String(input.email || '').trim();
        if (!name || name.length > 150 || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
            throw new Error('Vui lòng nhập họ tên và email hợp lệ.');
        }
        const before = await snapshot(customerId);
        if (before.revision !== input.revision) throw new Error('Hồ sơ đã thay đổi. Vui lòng mở lại form trước khi lưu.');
        if (!Array.isArray(input.addresses) || input.addresses.length > 20) throw new Error('Chỉ lưu tối đa 20 địa chỉ.');
        const { normalizeAddress, validateAddress, addressKey } = await import('../shared/address-validation.mjs');
        const addresses = input.addresses.map(normalizeAddress);
        const existing = new Map(before.addresses.map(a => [a.id, a]));
        const ids = new Set();
        for (const address of addresses) {
            if (address.id && (!existing.has(address.id) || ids.has(address.id))) throw new Error('Địa chỉ không hợp lệ hoặc không thuộc tài khoản.');
            if (address.id) ids.add(address.id);
            const old = existing.get(address.id);
            // Keep unchanged legacy addresses; validate every new or edited address.
            const changed = !old || JSON.stringify(addressesForCompare([old])) !== JSON.stringify(addressesForCompare([address]));
            if (changed) {
                const errors = validateAddress(address);
                if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
            }
        }
        const keys = addresses.map(addressKey);
        if (new Set(keys).size !== keys.length) throw new Error('Địa chỉ bị trùng trong sổ địa chỉ.');
        if (addresses.length && addresses.filter(a => a.is_default).length !== 1) throw new Error('Vui lòng chọn đúng một địa chỉ mặc định.');
        const changedAddresses = JSON.stringify(addressesForCompare(before.addresses)) !== JSON.stringify(addressesForCompare(addresses));
        let emailUpdate = writer.from('customer').update({ contact_email: email || null }).eq('id', customerId);
        emailUpdate = before.email ? emailUpdate.eq('contact_email', before.email) : emailUpdate.is('contact_email', null);
        const emailResult = await emailUpdate.select('id').single();
        if (emailResult.error) throw new Error(emailResult.error.code === '23505' ? 'Email đã được sử dụng bởi tài khoản khác.' : 'Không thể lưu email. Vui lòng thử lại.');
        const profileResult = await writer.from('customer_profile').upsert({ customer_id: customerId, full_name: name }).select('full_name').single();
        if (profileResult.error) {
            let rollback = writer.from('customer').update({ contact_email: before.email || null }).eq('id', customerId);
            rollback = email ? rollback.eq('contact_email', email) : rollback.is('contact_email', null);
            const reverted = await rollback.select('id').single();
            if (reverted.error) throw new Error('Không thể lưu tên; vui lòng tải lại để kiểm tra email trước khi thử lại.');
            throw new Error('Không thể lưu hồ sơ. Thay đổi email đã được hoàn tác.');
        }
        if (changedAddresses) {
            const inserted = [];
            try {
                const reset = await admin.from('customer_address').update({ is_default: false }).eq('customer_id', customerId);
                if (reset.error) throw reset.error;
                for (const address of addresses) {
                    const fields = before.addressStorage === 'legacy'
                        ? { street_address: [address.street_address, address.district].filter(Boolean).join(', '), province: address.province, is_default: !!address.is_default }
                        : { street_address: address.street_address, district: address.district, province: address.province, ward: address.ward, is_default: !!address.is_default };
                    const query = address.id
                        ? admin.from('customer_address').update(fields).eq('id', address.id).eq('customer_id', customerId)
                        : admin.from('customer_address').insert({ ...fields, customer_id: customerId, receiver_name: name, receiver_phone: before.phone });
                    const result = await query.select('id').single();
                    if (result.error) throw result.error;
                    if (!address.id) inserted.push(result.data.id);
                }
                const removed = before.addresses.filter(a => !ids.has(a.id)).map(a => a.id);
                if (removed.length) {
                    const result = await admin.from('customer_address').delete().eq('customer_id', customerId).in('id', removed);
                    if (result.error) throw result.error;
                }
            } catch (error) {
                const rollbackResults = [];
                if (inserted.length) rollbackResults.push(await admin.from('customer_address').delete().eq('customer_id', customerId).in('id', inserted));
                rollbackResults.push(await admin.from('customer_address').update({ is_default: false }).eq('customer_id', customerId));
                for (const old of before.addresses) rollbackResults.push(await admin.from('customer_address').update({
                    ...(before.addressStorage === 'legacy' ? { street_address: [old.street_address, old.district].filter(Boolean).join(', '), province: old.province || '' } : { street_address: old.street_address, district: old.district || '', province: old.province || '', ward: old.ward || '' }), is_default: old.is_default
                }).eq('id', old.id).eq('customer_id', customerId));
                rollbackResults.push(await writer.from('customer').update({ contact_email: before.email || null }).eq('id', customerId));
                rollbackResults.push(await writer.from('customer_profile').upsert({ customer_id: customerId, full_name: before.name }));
                if (rollbackResults.some(r => r.error)) throw new Error('Lưu địa chỉ thất bại. Vui lòng tải lại để kiểm tra thông tin trước khi thử lại.');
                throw new Error(error.code === '23503' ? 'Địa chỉ đang được dùng cho đơn hàng. Vui lòng giữ địa chỉ đó.' : 'Không thể lưu địa chỉ. Thay đổi đã được hoàn tác.');
            }
        }
        return snapshot(customerId);
    }
    return { snapshot, async save(customerId, input) {
        const previous = saves.get(customerId) || Promise.resolve();
        const pending = previous.catch(() => {}).then(() => save(customerId, input));
        saves.set(customerId, pending);
        try { return await pending; }
        finally { if (saves.get(customerId) === pending) saves.delete(customerId); }
    } };
}
module.exports = { createCustomerProfileService };
