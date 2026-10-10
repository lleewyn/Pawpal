const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const storage = initial => {
    const values = new Map(Object.entries(initial || {}));
    return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
test('old plaintext credentials are removed from both browser stores', () => {
    const context = { localStorage: storage({ pawpal_current_user: JSON.stringify({ id: 'c', password: 'old', password_hash: 'old' }), pawpal_users: JSON.stringify([{ id: 'c', password: 'old' }]), pawpal_temp_tokens: 'legacy' }), sessionStorage: storage({ pawpal_current_user: JSON.stringify({ id: 'c', password: 'old' }) }), window: {} };
    vm.createContext(context); vm.runInContext(fs.readFileSync('scripts/shared/customer-auth.js', 'utf8'), context);
    assert.equal(context.localStorage.getItem('pawpal_current_user'), '{"id":"c"}');
    assert.equal(context.sessionStorage.getItem('pawpal_current_user'), '{"id":"c"}');
    assert.equal(context.localStorage.getItem('pawpal_users'), '[{"id":"c"}]');
    assert.equal(context.localStorage.getItem('pawpal_temp_tokens'), null);
});
test('failed password change keeps form values and does not report success or change cached profile', async () => {
    const elements = {};
    function element(id, value = '') { return elements[id] = { value, textContent: '', classList: { add() {}, remove() {} }, addEventListener(event, callback) { this[event] = callback; } }; }
    let resets = 0, accepts = 0;
    element('changePasswordForm').reset = () => resets++;
    element('currentPassword', 'Wrong123!'); element('newPassword', 'NewPassword123!'); element('confirmNewPassword', 'NewPassword123!'); element('btnUpdateSecurity');
    const original = '{"id":"customer"}';
    const context = { console, localStorage: storage({ pawpal_current_user: original }), document: { getElementById: id => elements[id] || null }, window: { PawpalCustomerAuth: { request: async () => { throw new Error('Mật khẩu hiện tại không đúng.'); }, accept: async () => accepts++ } } };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('pages/user/modules/settings/settings.js', 'utf8').replace(/^export /gm, ''), context);
    vm.runInContext('globalThis.toasts=[];showToast=(type,message)=>toasts.push({type,message});initChangePasswordForm();', context);
    await elements.changePasswordForm.submit({ preventDefault() {} });
    assert.equal(context.toasts.length, 1); assert.equal(context.toasts[0].type, 'error');
    assert.equal(elements.newPassword.value, 'NewPassword123!'); assert.equal(resets, 0); assert.equal(accepts, 0);
    assert.equal(context.localStorage.getItem('pawpal_current_user'), original);
});
test('missing/forged auth session cannot access the portal using only cached user data', async () => {
    const context = { localStorage: storage({ pawpal_current_user: '{"id":"forged","role":"customer"}' }), sessionStorage: storage(), alert() {}, window: { location: { href: '/user' }, PawpalCustomerAuth: { request: async () => { throw new Error('No valid session'); } } } };
    vm.createContext(context);
    await vm.runInContext(fs.readFileSync('pages/user/user.js', 'utf8'), context);
    assert.equal(context.window.location.href, '/login'); assert.equal(context.localStorage.getItem('pawpal_current_user'), null);
});
