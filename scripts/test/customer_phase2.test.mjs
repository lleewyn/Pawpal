import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveCustomerProfile, applyProfileSnapshot } from '../shared/customer-profile.mjs';
import { resolveAuthenticatedCustomerId } from '../shared/customer-identity.mjs';
import { createLatestRenderer } from '../shared/latest-render.mjs';
import { updateCustomerBooking } from '../shared/customer-booking.mjs';
import fs from 'node:fs';
import vm from 'node:vm';

const id = '11111111-1111-4111-8111-111111111111';
const addressId = '22222222-2222-4222-8222-222222222222';
const user = { id, phone: '0912345678', profileRevision: 'old', addresses: [{ id: addressId }] };
const snapshot = { id, phone: user.phone, name: 'Khách thử', email: '', addresses: [], revision: 'new' };

test('database failure cannot mutate the original user or return profile success', async () => {
    const original = structuredClone(user);
    await assert.rejects(saveCustomerProfile({ rpc: async () => ({ error: { message: 'Save rejected' } }) }, user,
        { name: 'Tên mới', email: '', addresses: [] }), /Save rejected/);
    assert.deepEqual(user, original);
});

test('profile UI keeps the editor open and browser cache unchanged when saving fails', async () => {
    const elements = {};
    function element(id, value = '') {
        return elements[id] = { value, disabled: false, style: {}, classList: { add() {}, remove() {} },
            querySelectorAll: () => [], addEventListener(event, handler) { this[event] = handler; } };
    }
    element('btnEditProfile'); element('profileEditModal'); element('btnSaveProfile');
    element('profileNameInput', 'Tên mới'); element('profileEmailInput', ''); element('profilePhoneInput', user.phone);
    const context = { console, clearTimeout, setTimeout, window: { getSupabaseClient: () => ({}) },
        document: { getElementById: id => elements[id] || null },
        localStorage: { getItem: () => JSON.stringify(user), setItem: () => { throw new Error('Cache must not change'); } },
        sessionStorage: {}, saveCustomerProfile: async () => { throw new Error('Lưu bị từ chối'); } };
    vm.createContext(context);
    const source = fs.readFileSync('pages/user/modules/profile/profile.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
    vm.runInContext(source, context);
    vm.runInContext('globalThis.toasts=[];showToast=(type,message)=>toasts.push({type,message});', context);
    context.user = user;
    vm.runInContext('initProfileEditModal(user)', context);
    await elements.btnSaveProfile.click();
    assert.equal(context.toasts.length, 1);
    assert.equal(context.toasts[0].type, 'error');
    assert.equal(elements.profileNameInput.value, 'Tên mới');
    assert.equal(elements.btnSaveProfile.disabled, false);
});
test('address save preserves database IDs and separate location fields', async () => {
    let args;
    const updated = await saveCustomerProfile({ rpc: async (name, values) => {
        assert.equal(name, 'customer_profile_save'); args = values; return { data: snapshot };
    } }, user, { name: 'Tên mới', email: '', addresses: [{ id: addressId, rawStreet: '12 đường A', street: '12 đường A, Q1, HCM', district: 'Q1', province: 'HCM', isDefault: true }] });
    assert.equal(args.p_addresses[0].id, addressId);
    assert.equal(args.p_addresses[0].street_address, '12 đường A');
    assert.equal(args.p_addresses[0].district, 'Q1');
    assert.equal(args.p_revision, 'old');
    assert.deepEqual(updated.addresses, []); // Empty database addresses replace stale browser copies.
});
test('new UI address IDs are sent as inserts and stale revisions reject save', async () => {
    let payload;
    await assert.rejects(saveCustomerProfile({ rpc: async (_, args) => { payload = args; return { error: { message: 'Hồ sơ đã thay đổi' } }; } }, user,
        { name: 'A', email: '', addresses: [{ id: 'addr-123', street: '12 A', isDefault: true }] }), /đã thay đổi/);
    assert.equal(payload.p_addresses[0].id, null);
});
test('a response belonging to another customer is rejected', () => {
    assert.throws(() => applyProfileSnapshot(user, { ...snapshot, id: 'someone-else' }));
});
test('an address referenced by an order reports a failure rather than local success', async () => {
    await assert.rejects(saveCustomerProfile({ rpc: async () => ({ error: { code: '23503' } }) }, user,
        { name: 'A', email: '', addresses: [] }), /đang được dùng/);
});
function dbFor(customerId = id, authError = null) {
    return { auth: { getUser: async () => ({ data: { user: { id: 'native-auth-id' } }, error: authError }) }, from(table) {
        assert.equal(table, 'customer');
        return { select() { return this; }, eq(column, value) { assert.equal(column, 'auth_user_id'); assert.equal(value, 'native-auth-id'); return this; },
            maybeSingle: async () => ({ data: { id: customerId, account_status: 'ACTIVE', is_temporary: false } }) };
    } };
}
test('customer resolution uses native identity and rejects forged browser IDs', async () => {
    assert.equal(await resolveAuthenticatedCustomerId(dbFor(), { id }), id);
    await assert.rejects(resolveAuthenticatedCustomerId(dbFor(), 'other-id'), /không thuộc/);
    await assert.rejects(resolveAuthenticatedCustomerId(dbFor(id, new Error('expired')), id), /hết hạn/);
});

test('booking update requires owner and matching current status and rejects a zero-row write', async () => {
    const db = dbFor(), from = db.from.bind(db), filters = [];
    db.from = table => table === 'customer' ? from(table) : {
        update(payload) { assert.equal(payload.appointment_status, 'CANCELLED'); return this; },
        eq(key, value) { filters.push([key, value]); return this; }, select() { return this; },
        single: async () => ({ data: null, error: { code: 'PGRST116' } })
    };
    await assert.rejects(updateCustomerBooking(db, user, { _supabaseId: 'booking-id', bookingStatus: 'CONFIRMED' },
        { appointment_status: 'CANCELLED' }), /Không thể cập nhật/);
    assert.deepEqual(filters, [['id', 'booking-id'], ['customer_id', id], ['appointment_status', 'CONFIRMED']]);
    await assert.rejects(updateCustomerBooking(db, user, { _supabaseId: 'booking-id', bookingStatus: 'COMPLETED' },
        { appointment_status: 'CANCELLED' }), /không còn/);
});
test('late responses cannot replace the latest requested route', async () => {
    const gate = createLatestRenderer(), displayed = [];
    const old = gate.begin(), current = gate.begin();
    await gate.commit(current, () => displayed.push('orders'));
    assert.equal(await gate.commit(old, () => displayed.push('profile')), false);
    assert.deepEqual(displayed, ['orders']);
});
test('new route rendering waits for old asynchronous initialization to finish', async () => {
    const gate = createLatestRenderer(), events = [];
    let release, started;
    const startedPromise = new Promise(resolve => { started = resolve; });
    const pending = new Promise(resolve => { release = resolve; });
    const first = gate.commit(gate.begin(), async () => { started(); await pending; events.push('old initialized'); });
    await startedPromise;
    const next = gate.commit(gate.begin(), () => events.push('new rendered'));
    release(); await Promise.all([first, next]);
    assert.deepEqual(events, ['old initialized', 'new rendered']);
});
