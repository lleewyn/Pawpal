const test = require('node:test');
const assert = require('node:assert/strict');
const { createCustomerProfileService } = require('../api/customer_profile_persistence');

function fixture() {
    const state = { customer: { id: 'customer-1', phone_main: '0900000000', email: null },
        profile: { full_name: 'Tên cũ' }, failProfile: false };
    const db = { from(table) {
        let patch;
        const query = {
            select() { return query; }, eq() { return query; }, is() { return query; }, order() { return query; },
            update(value) { patch = value; return query; }, upsert(value) { patch = value; return query; }, single() { return query; }, maybeSingle() { return query; },
            then(resolve, reject) {
                if (patch && table === 'customer_profile' && state.failProfile) return Promise.resolve({ error: { code: '42501' } }).then(resolve, reject);
                const target = table === 'customer' ? state.customer : state.profile;
                if (patch) Object.assign(target, patch);
                return Promise.resolve({ data: table === 'customer_address' ? [] : { ...target }, error: null }).then(resolve, reject);
            }
        };
        return query;
    } };
    return { state, service: createCustomerProfileService(db) };
}

test('save confirms new name and email in a fresh snapshot', async () => {
    const { service } = fixture();
    const before = await service.snapshot('customer-1');
    const after = await service.save('customer-1', { name: 'Thi Nguyễn Lê', email: 'qa@example.invalid', addresses: [], revision: before.revision });
    assert.equal(after.name, 'Thi Nguyễn Lê');
    assert.equal(after.email, 'qa@example.invalid');
    assert.notEqual(after.revision, before.revision);
});

test('stale revisions and invalid email do not write', async () => {
    const { service, state } = fixture();
    await assert.rejects(service.save('customer-1', { name: 'Tên mới', email: '', addresses: [], revision: 'stale' }), /đã thay đổi/);
    await assert.rejects(service.save('customer-1', { name: 'Tên mới', email: 'invalid', addresses: [] }), /hợp lệ/);
    assert.equal(state.profile.full_name, 'Tên cũ');
    assert.equal(state.customer.email, null);
});

test('failed profile write rejects and restores email', async () => {
    const { service, state } = fixture();
    const before = await service.snapshot('customer-1');
    state.failProfile = true;
    await assert.rejects(service.save('customer-1', { name: 'Tên mới', email: 'qa@example.invalid', addresses: [], revision: before.revision }), /hoàn tác/);
    assert.equal(state.profile.full_name, 'Tên cũ');
    assert.equal(state.customer.email, null);
});

test('empty, whitespace and 300-character names never change saved data', async () => {
    const { service, state } = fixture();
    const before = await service.snapshot('customer-1');
    for (const name of ['', '           ', 'a'.repeat(300)]) {
        await assert.rejects(service.save('customer-1', { name, email: '', addresses: [], revision: before.revision }), /hợp lệ/);
        assert.equal(state.profile.full_name, 'Tên cũ');
        assert.equal(state.customer.email, null);
    }
});

test('email accepts valid and empty values but rejects abc@ without writing', async () => {
    const { service, state } = fixture();
    let current = await service.snapshot('customer-1');
    await assert.rejects(service.save('customer-1', { name: current.name, email: 'abc@', addresses: [], revision: current.revision }), /hợp lệ/);
    assert.equal(state.customer.email, null);
    current = await service.save('customer-1', { name: current.name, email: 'an@example.com', addresses: [], revision: current.revision });
    assert.equal(current.email, 'an@example.com');
    current = await service.save('customer-1', { name: current.name, email: '', addresses: [], revision: current.revision });
    assert.equal(current.email, '');
    assert.equal(state.customer.email, null);
});

test('addresses require street, district and province before any profile write', async () => {
    const { service, state } = fixture();
    const current = await service.snapshot('customer-1');
    for (const field of ['street_address', 'district', 'province']) {
        const address = { street_address: '12 Nguyễn Trãi', district: 'Quận 1', province: 'TP. Hồ Chí Minh', is_default: true, [field]: '   ' };
        await assert.rejects(service.save('customer-1', { name: 'Tên mới', email: '', addresses: [address], revision: current.revision }), /Vui lòng nhập/);
        assert.equal(state.profile.full_name, 'Tên cũ');
    }
});

test('address normalization, duplicates and length boundaries', async () => {
    const { normalizeAddress, validateAddress, addressKey } = await import('../shared/address-validation.mjs');
    assert.equal(addressKey({ street_address: '12 Nguyễn Trãi', district: 'Quận 1', province: 'Hà Nội' }),
        addressKey({ street_address: '  12   NGUYỄN TRÃI '.normalize('NFD'), district: ' QUẬN 1 ', province: ' HÀ NỘI ' }));
    assert.equal(normalizeAddress({ street_address: '  12   Nguyễn Trãi  ' }).street_address, '12 Nguyễn Trãi');
    const address = { street_address: 'a'.repeat(500), district: 'Quận 1', province: 'TP. Hồ Chí Minh' };
    assert.deepEqual(validateAddress(address), {});
    assert.match(validateAddress({ ...address, street_address: 'a'.repeat(1001) }).street_address, /1000/);
    const { service } = fixture();
    const current = await service.snapshot('customer-1');
    await assert.rejects(service.save('customer-1', { name: current.name, email: '', addresses: [address, address], revision: current.revision }), /trùng/);
});
