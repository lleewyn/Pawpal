const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture({ user = { id: 'customer-1', phone: '0911223344' }, toggle, load = async () => ({ productIds: [] }) } = {}) {
    const states = new Set(), attributes = {}, notices = [], calls = [];
    let click;
    const stored = new Map();
    const button = {
        dataset: { productId: 'SP01' }, disabled: false,
        classList: { toggle: (name, active) => active ? states.add(name) : states.delete(name) },
        setAttribute: (key, value) => { attributes[key] = value; },
    };
    const grid = {
        dataset: {}, contains: node => node === button,
        querySelectorAll: () => [button],
        addEventListener: (name, listener) => { click = listener; },
    };
    const context = {
        Set, CustomEvent: class {},
        localStorage: {
            getItem: key => key === 'pawpal_current_user' ? JSON.stringify(user) : stored.get(key) || null,
            setItem: (key, value) => stored.set(key, value),
        },
        document: { dispatchEvent() {}, addEventListener() {} },
        window: {
            showGlobalToast: (type, message) => notices.push({ type, message }),
            API: { getUserWishlist: load, saveUserWishlist: async (...args) => {
                calls.push(JSON.parse(JSON.stringify(args)));
                return toggle ? toggle(...args) : { success: true };
            } },
        },
    };
    const source = fs.readFileSync('scripts/shared/main.js', 'utf8');
    vm.runInNewContext(source.slice(source.indexOf('function setupLandingProductWishlist('), source.indexOf('function setupLandingServiceWishlist(')), context);
    context.window.setupLandingProductWishlist(grid);
    return { button, states, attributes, notices, calls, stored,
        click: () => click({ target: { closest: () => button }, preventDefault() {}, stopPropagation() {} }),
    };
}

test('SP01 toggles on and off using persisted API results', async () => {
    const f = fixture();
    await Promise.resolve();
    await f.click();
    assert.ok(f.states.has('active'));
    assert.equal(f.attributes['aria-pressed'], 'true');
    await f.click();
    assert.ok(!f.states.has('active'));
    assert.equal(f.attributes['aria-pressed'], 'false');
    assert.deepEqual(f.calls, [['customer-1', { productIds: ['SP01'] }], ['customer-1', { productIds: [] }]]);
    assert.equal(f.stored.get('pawpal_wishlist_0911223344'), '[]');
    assert.equal(f.stored.has('pawpal_wishlist_guest'), false);
});

test('guest toggles local wishlist without calling Supabase', async () => {
    const f = fixture({ user: null });
    await f.click();
    assert.equal(f.calls.length, 0);
    assert.equal(f.stored.get('pawpal_wishlist_guest'), '["SP01"]');
    assert.ok(f.states.has('active'));
    await f.click();
    assert.equal(f.stored.get('pawpal_wishlist_guest'), '[]');
    assert.ok(!f.states.has('active'));
});

test('failed save leaves the heart unchanged and restores the button', async () => {
    const f = fixture({ toggle: async () => { throw new Error('Database rejected'); } });
    await f.click();
    assert.ok(!f.states.has('active'));
    assert.equal(f.button.disabled, false);
    assert.equal(f.notices.at(-1).type, 'error');
});

test('waits for initial read and ignores repeated clicks during a save', async () => {
    let finishSave, finishRead;
    const f = fixture({ toggle: () => new Promise(resolve => { finishSave = resolve; }), load: () => new Promise(resolve => { finishRead = resolve; }) });
    const saving = f.click();
    await f.click();
    assert.equal(f.calls.length, 0);
    finishRead({ productIds: [] });
    await new Promise(setImmediate);
    assert.equal(f.calls.length, 1);
    finishSave({ success: true });
    await saving;
    assert.ok(f.states.has('active'));
    assert.equal(f.button.disabled, false);
});

test('failed initial read cannot overwrite existing remote wishlist', async () => {
    const f = fixture({ load: async () => { throw new Error('Network error'); } });
    await f.click();
    assert.equal(f.calls.length, 0);
    assert.equal(f.stored.has('pawpal_wishlist_0911223344'), false);
    assert.equal(f.notices.at(-1).type, 'error');
});
