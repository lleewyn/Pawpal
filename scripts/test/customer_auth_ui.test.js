const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const storage = initial => {
    const values = new Map(Object.entries(initial || {}));
    return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
test('registration explains weak passwords and mismatches, then clears errors when corrected', async () => {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) {
            const classes = new Set();
            elements.set(id, {
                value: '', style: {}, attributes: {}, listeners: {}, disabled: false,
                classList: {
                    add: name => classes.add(name), remove: name => classes.delete(name),
                    contains: name => classes.has(name),
                    toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }
                },
                setAttribute(name, value) { this.attributes[name] = value; },
                addEventListener(event, callback) { this.listeners[event] = callback; }
            });
        }
        return elements.get(id);
    };
    const location = { search: '?action=register', hash: '', origin: 'http://localhost' };
    const context = {
        URLSearchParams, location, localStorage: storage(), sessionStorage: storage(), clearInterval() {},
        window: { location, addEventListener() {} },
        document: { readyState: 'complete', getElementById: element, querySelectorAll: () => [], addEventListener() {} }
    };
    vm.createContext(context);
    const source = fs.readFileSync('pages/public/login/login.js', 'utf8')
        .replace("const { consumeLoginTarget } = await import('/scripts/shared/login-redirect.mjs');", "const consumeLoginTarget = () => '/';");
    await vm.runInContext(source, context);
    const update = (id, value, event = 'input') => {
        element(id).value = value;
        element(id).listeners[event]();
    };
    const feedbackVisible = id => element(id).classList.contains('d-block');
    assert.equal(feedbackVisible('registerPasswordFeedback'), false);
    assert.equal(element('btnRegisterSubmit').disabled, true);
    update('registerName', 'Khách kiểm thử');
    update('registerPhone', '0912345678');
    for (const pass of ['12345678', 'A112233', '123456789']) {
        update('registerPassword', pass);
        update('registerConfirmPassword', pass);
        assert.equal(feedbackVisible('registerPasswordFeedback'), true);
        assert.equal(element('registerPassword').attributes['aria-invalid'], 'true');
        assert.equal(element('btnRegisterSubmit').disabled, true);
    }
    update('registerPassword', 'A112233@', 'change');
    assert.equal(feedbackVisible('registerPasswordFeedback'), false);
    assert.equal(feedbackVisible('registerConfirmFeedback'), true);
    assert.equal(element('btnRegisterSubmit').disabled, true);
    update('registerConfirmPassword', 'A112233@', 'change');
    assert.equal(feedbackVisible('registerConfirmFeedback'), false);
    assert.equal(element('registerPassword').attributes['aria-invalid'], 'false');
    assert.equal(element('btnRegisterSubmit').disabled, false);
    update('registerPassword', '');
    assert.equal(feedbackVisible('registerPasswordFeedback'), false);
    assert.equal(element('btnRegisterSubmit').disabled, true);
});
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
    vm.runInContext(fs.readFileSync('pages/user/modules/settings/settings.js', 'utf8').replace(/^import .*?;/gm, 'const withDeadline = async (fn) => fn();').replace(/^export /gm, ''), context);
    vm.runInContext('globalThis.toasts=[];showToast=(type,message)=>toasts.push({type,message});initChangePasswordForm();', context);
    await elements.btnUpdateSecurity.click({ preventDefault() {} });
    assert.equal(context.toasts.length, 1); assert.equal(context.toasts[0].type, 'error');
    assert.equal(elements.newPassword.value, 'NewPassword123!'); assert.equal(resets, 0); assert.equal(accepts, 0);
    assert.equal(context.localStorage.getItem('pawpal_current_user'), original);
});
test('missing/forged auth session cannot access the portal using only cached user data', async () => {
    const context = { console: {warn() {}}, localStorage: storage({ pawpal_current_user: '{"id":"forged","role":"customer"}' }), sessionStorage: storage(), alert() {}, window: { addEventListener() {}, location: { href: '/user' }, PawpalCustomerAuth: { request: async () => { throw new Error('No valid session'); } } } };
    vm.createContext(context);
    await vm.runInContext(fs.readFileSync('pages/user/user.js', 'utf8'), context);
    assert.equal(context.window.location.href, '/login'); assert.equal(context.localStorage.getItem('pawpal_current_user'), null);
});
