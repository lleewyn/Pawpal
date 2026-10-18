import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture(user = null) {
    const nodes = new Map(), removedClasses = [], timers = [], redirects = [];
    const staleModal = { hidden: false };
    function element() {
        return { style: {}, children: [], setAttribute() {}, appendChild(child) { this.children.push(child); }, remove() { nodes.delete(this.id); } };
    }
    const context = {
        localStorage: { getItem: () => JSON.stringify(user) },
        window: { location: { pathname: '/cart', assign: url => redirects.push(url) } },
        document: {
            querySelectorAll: () => [staleModal], getElementById: id => nodes.get(id), createElement: element,
            body: { classList: { remove: name => removedClasses.push(name) }, appendChild: node => nodes.set(node.id, node) },
        },
        setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    };
    const source = fs.readFileSync('scripts/shared/cart-access.mjs', 'utf8').replaceAll('export function', 'function');
    vm.runInNewContext(source, context);
    return { context, nodes, timers, redirects, staleModal, removedClasses, ensure: () => context.ensureCartAccess() };
}
test('guest warning closes stale modal and schedules exactly one 1500ms redirect', () => {
    const f = fixture();
    assert.equal(f.ensure(), false); assert.equal(f.ensure(), false);
    assert.equal(f.staleModal.hidden, true);
    assert.ok(f.removedClasses.includes('buy-now-modal-open'));
    assert.equal(f.nodes.get('cart-login-toast').children[0].textContent, 'Vui lòng đăng nhập để xem giỏ hàng');
    assert.equal(f.timers.length, 1); assert.equal(f.timers[0].delay, 1500);
    f.timers[0].callback(); assert.deepEqual(f.redirects, ['/login']);
});
test('member is allowed without warning or redirect', () => {
    const f = fixture({ id: 'member-1' });
    assert.equal(f.ensure(), true); assert.equal(f.timers.length, 0); assert.equal(f.nodes.size, 0);
});
test('temporary guest cannot access member cart', () => {
    const f = fixture({ id: 'guest-1', is_temporary: true });
    assert.equal(f.ensure(), false); assert.equal(f.timers.length, 1);
});
test('timer does not redirect after navigating away from cart', () => {
    const f = fixture(); f.ensure(); f.context.window.location.pathname = '/about';
    f.timers[0].callback(); assert.deepEqual(f.redirects, []);
});
