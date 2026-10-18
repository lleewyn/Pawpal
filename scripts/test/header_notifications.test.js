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
