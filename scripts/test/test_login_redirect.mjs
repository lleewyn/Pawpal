import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLoginTarget, consumeLoginTarget } from '../shared/login-redirect.mjs';
test('settings survives login and the saved target is consumed', () => {
    const values = new Map([['pawpal_redirect_after_login', '/pages/user/#settings']]);
    const storage = { getItem: k => values.get(k), removeItem: k => values.delete(k) };
    assert.equal(consumeLoginTarget(storage, 'http://localhost:3000'), '/pages/user/#settings');
    assert.equal(values.size, 0);
});
test('rejects external, login and admin redirect targets', () => {
    for (const target of ['https://example.com', '//example.com', '/admin', '/login', 'javascript:alert(1)']) {
        assert.equal(safeLoginTarget(target, 'http://localhost:3000'), '/pages/user/#profile');
    }
});
