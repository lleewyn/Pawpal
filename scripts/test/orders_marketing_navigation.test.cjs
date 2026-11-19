const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('marketing shortcut loads Settings through the router and keeps its tabs in Settings', async () => {
    const promos = fs.readFileSync('pages/admin/modules/orders/subtabs/tab-order-promos.js', 'utf8');
    const shell = fs.readFileSync('pages/admin/admin.js', 'utf8');
    const shortcutStart = promos.indexOf('    window.PawpalOrdersModule.navigateToSettingsMarketing = function()');
    const shortcut = promos.slice(shortcutStart, promos.indexOf('\n    };', shortcutStart) + 7);
    const routerStart = shell.indexOf("    window.addEventListener('hashchange', () => {");
    const router = shell.slice(routerStart, shell.indexOf('\n    });', routerStart) + 8);
    const storage = new Map([['pawpal_admin_active_module', 'Bán hàng']]);
    const listeners = new Map();
    const loads = [], panes = [], events = [];
    const settings = { module: 'Cấu hình' };
    const sidebar = ['Bán hàng', 'Cấu hình'].map(title => ({
        getAttribute: () => title,
        active: title === 'Bán hàng',
        classList: { toggle(name, active) { sidebar.find(b => b.getAttribute() === title).active = active; } }
    }));
    const context = {
        window: { PawpalOrdersModule: {}, location: { hash: '#tab-promos' },
            addEventListener: (name, fn) => listeners.set(name, fn), dispatchEvent: e => events.push(e) },
        sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        access: { isStaff: () => false }, sidebarBtns: sidebar,
        resolveModuleFromHash: hash => /^#tab-(banner|blog|audit)/.test(hash) ? 'Cấu hình' : 'Bán hàng',
        normalizeSubtabId: id => id, URLSearchParams,
        MODULE_SUBTABS_MAP: { 'Cấu hình': { storageKey: 'pawpal_admin_settings_subtab',
            subtabs: ['tab-banner-promos', 'tab-blog', 'tab-audit'].map(id => ({ id })) } },
        loadModule: async name => { loads.push(name); panes.push(settings); },
        renderHeaderSubtabsInstant: name => assert.equal(name, 'Cấu hình'),
        _moduleDomCache: new Map([['Cấu hình', settings]]), contentArea: { module: 'Bán hàng' },
        syncActiveSubtabPane: (pane, name) => { assert.equal(name, 'Cấu hình'); assert.equal(pane, settings); },
        CustomEvent: function(name, data) { this.type = name; this.detail = data.detail; }
    };
    vm.createContext(context);
    vm.runInContext(router + '\n' + shortcut, context);
    context.window.PawpalOrdersModule.navigateToSettingsMarketing();
    assert.equal(storage.get('pawpal_admin_active_module'), 'Bán hàng', 'shortcut must not tell router Settings is already loaded');
    assert.equal(context.window.location.hash, '#tab-banner-promos');
    listeners.get('hashchange')();
    await Promise.resolve();
    assert.deepEqual(loads, ['Cấu hình']);
    assert.equal(storage.get('pawpal_admin_active_module'), 'Cấu hình');
    assert.equal(sidebar[0].active, false);
    assert.equal(sidebar[1].active, true);
    assert.equal(panes[0], settings);
    for (const tab of ['tab-blog', 'tab-audit']) {
        context.window.location.hash = '#' + tab;
        listeners.get('hashchange')();
        assert.equal(storage.get('pawpal_admin_settings_subtab'), tab);
        assert.equal(events.at(-1).detail.tabId, tab);
    }
    assert.equal(loads.length, 1);
});
