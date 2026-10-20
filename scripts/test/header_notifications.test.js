const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture() {
    const values = new Map();
    const events = {};
    const documentEvents = {};
    const badge = { textContent: '', style: {} };
    const context = {
        localStorage: { getItem: key => values.get(key) || null },
        document: {
            readyState: 'loading',
            addEventListener: (name, handler) => { documentEvents[name] = handler; },
            getElementById: id => id === 'notificationBadge' ? badge : null,
        },
        window: { addEventListener: (name, handler) => { events[name] = handler; } },
    };
    vm.runInNewContext(fs.readFileSync('components/header/header.js', 'utf8'), context);
    return {
        badge, events, documentEvents,
        update: context.window.updateNotificationBadge,
        set: notices => values.set('pawpal_notifications', JSON.stringify(notices)),
    };
}

for (const count of [0, 3, 9, 10, 12]) {
    test(`notification badge displays the expected state for ${count} unread notices`, () => {
        const f = fixture();
        f.set(Array.from({ length: count }, (_, id) => ({ id, read: false })));
        f.update();
        assert.equal(String(f.badge.textContent), count > 9 ? '9+' : String(count));
        assert.equal(f.badge.style.display, count ? 'flex' : 'none');
    });
}

test('badge updates across tabs and hides after all notices are read', () => {
    const f = fixture();
    f.set(Array.from({ length: 12 }, (_, id) => ({ id, read: false })));
    f.events.storage({ key: 'pawpal_notifications' });
    assert.equal(f.badge.textContent, '9+');
    f.set([{ read: true }, { isRead: true }]);
    f.documentEvents.notifications_updated();
    assert.equal(f.badge.style.display, 'none');
    assert.equal(String(f.badge.textContent), '0');
});

test('clearing storage in another tab hides an existing badge', () => {
    const f = fixture();
    f.set([{ read: false }]);
    f.update();
    f.set([]);
    f.events.storage({ key: null });
    assert.equal(f.badge.style.display, 'none');
});

test('XSS content is escaped and javascript: urls are sanitized', () => {
    const values = new Map();
    const documentEvents = {};
    const badge = { textContent: '', style: {} };
    const list = { innerHTML: '', querySelectorAll: () => [] };
    const context = {
        localStorage: {
            getItem: key => values.get(key) || null,
            setItem: (key, val) => values.set(key, val)
        },
        document: {
            readyState: 'loading',
            addEventListener: (name, handler) => { documentEvents[name] = handler; },
            getElementById: id => {
                if (id === 'notificationBadge') return badge;
                if (id === 'headerNotificationList') return list;
                return null;
            },
        },
        window: { addEventListener: () => {} },
    };
    vm.runInNewContext(fs.readFileSync('components/header/header.js', 'utf8'), context);
    values.set('pawpal_notifications', JSON.stringify([{
        id: 1,
        title: '<img src=x onerror=alert(1)>',
        content: '<script>alert("xss")</script>',
        link: 'javascript:alert(1)',
        read: false
    }]));
    context.window.updateNotificationBadge();
    assert.ok(!list.innerHTML.includes('<script>'), 'script tag must not appear raw in innerHTML');
    assert.ok(list.innerHTML.includes('&lt;script&gt;'), 'script tag must be HTML escaped');
    assert.ok(!list.innerHTML.includes('href="javascript:'), 'javascript: url must be blocked');
    assert.ok(list.innerHTML.includes('href="#"'), 'sanitized href must fallback to #');
});

test('customer-scoped notifications are loaded when logged in', () => {
    const values = new Map();
    const documentEvents = {};
    const badge = { textContent: '', style: {} };
    const context = {
        localStorage: {
            getItem: key => values.get(key) || null,
            setItem: (key, val) => values.set(key, val)
        },
        document: {
            readyState: 'loading',
            addEventListener: (name, handler) => { documentEvents[name] = handler; },
            getElementById: id => (id === 'notificationBadge' ? badge : null),
        },
        window: { addEventListener: () => {} },
    };
    values.set('pawpal_current_user', JSON.stringify({ id: 'cust_qa_001', name: 'User A' }));
    values.set('pawpal_notifications_cust_qa_001', JSON.stringify([
        { id: 'notif_1', title: 'Thông báo của A', read: false }
    ]));
    // Legacy / other user notifications
    values.set('pawpal_notifications', JSON.stringify([
        { id: 'notif_other', title: 'Thông báo cũ', read: true }
    ]));

    vm.runInNewContext(fs.readFileSync('components/header/header.js', 'utf8'), context);
    context.window.updateNotificationBadge();
    assert.equal(String(badge.textContent), '1');
    assert.equal(badge.style.display, 'flex');
});

