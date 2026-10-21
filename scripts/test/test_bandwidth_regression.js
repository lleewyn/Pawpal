// Offline regression tests: no requests or mutations against the live database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const quietConsole = { log() {}, warn() {}, error() {} };
const tick = () => new Promise(resolve => setImmediate(resolve));

function browserContext() {
    const values = new Map([
        ['pawpal_admin_active_module', 'Dashboard'],
        ['pawpal_admin_user', JSON.stringify({ id: 'test-actor' })]
    ]);
    const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
    const context = vm.createContext({
        console: quietConsole, setTimeout, clearTimeout, URL, Headers, Response,
        sessionStorage: storage, localStorage: storage,
        CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
    });
    function eventTarget(extra = {}) {
        const listeners = new Map();
        return Object.assign(extra, {
            addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); },
            dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); }
        });
    }
    context.window = eventTarget({ location: { pathname: '/pages/admin/', hash: '' }, localStorage: storage, _pawpalAdminLoaded: true });
    context.document = eventTarget({ hidden: false, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] });
    return context;
}
function load(context, file) { vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }); }

async function testFetch() {
    const ctx = browserContext();
    let fetchOptions;
    let calls = 0;
    let now = 1_000_000;
    ctx.Date = class extends Date { static now() { return now; } };
    let reply = () => new Response('[{"id":1}]');
    ctx.window.fetch = async () => { calls++; await tick(); return reply(); };
    ctx.window.supabase = { createClient(url, optionsKey, options) { fetchOptions = options; return {}; } };
    load(ctx, 'scripts/api/supabase-client.js');
    const fetch = fetchOptions.global.fetch;
    const url = `${ctx.window.SupabaseClientConfig.url}/rest/v1/customer?select=id`;
    const auth = { headers: { Authorization: 'Bearer actor-a' } };
    const results = await Promise.all([fetch(url, auth), fetch(url, auth), fetch(url, auth)]);
    assert.equal(calls, 1, 'Three concurrent identical reads must use one network request');
    for (const response of results) assert.deepEqual(await response.json(), [{ id: 1 }]);
    await fetch(url, auth);
    assert.equal(calls, 2, 'Completed reads must not become a stale HTTP cache');
    await Promise.all([fetch(url, auth), fetch(url, { headers: { Authorization: 'Bearer actor-b' } })]);
    assert.equal(calls, 4, 'Different authorization must never share responses');
    await Promise.all([fetch(url, { method: 'POST' }), fetch(url, { method: 'POST' })]);
    assert.equal(calls, 6, 'Writes must never be deduplicated');
    const controller = new AbortController();
    await Promise.all([fetch(url, { signal: controller.signal }), fetch(url, { signal: controller.signal })]);
    assert.equal(calls, 8, 'Independent cancellation must not be shared');

    reply = () => new Response('{"code":"exceeded_egress_quota"}', { status: 402 });
    assert.equal((await fetch(url)).status, 402);
    const beforeCooldown = calls;
    assert.equal((await fetch(`${url}&limit=10`)).status, 402);
    assert.equal(calls, beforeCooldown, 'Quota failure must suppress subsequent REST reads for 60 seconds');
    await fetch(url, { method: 'PATCH' });
    await fetch(`${ctx.window.SupabaseClientConfig.url}/auth/v1/token`);
    assert.equal(calls, beforeCooldown + 2, 'Quota guard must leave writes and Auth untouched');
    now += 60_001;
    reply = () => new Response('[]');
    assert.equal((await fetch(url)).status, 200, 'REST reads must recover after cooldown');
    reply = () => new Response('other payment error', { status: 402 });
    await fetch(url);
    await fetch(url);
    assert.equal(calls, beforeCooldown + 5, 'Unrelated 402 errors must not activate egress cooldown');
    console.log('PASS: REST deduplication, actor isolation, writes, cancellation, quota cooldown and recovery');
}

async function testDashboard() {
    const ctx = browserContext();
    load(ctx, 'pages/admin/admin-data-store.js');
    const requests = [];
    const handlers = {};
    const kpi = { textContent: '' };
    ctx.document.getElementById = id => id === 'dashboardCustomers' ? kpi : null;
    let failOrders = false;
    let appointments = [{ id: 'a1', customer_id: 'c1', pet_id: 'p1' }];
    const client = {
        from(table) {
            const request = { table };
            const query = {
                select(columns, options) { request.columns = columns; request.options = options; return this; },
                order() { return this; }, limit() { return this; },
                in(column, ids) { request.filter = { column, ids: [...ids] }; return this; },
                then(resolve, reject) {
                    requests.push(request);
                    const data = table === 'appointment' ? appointments
                        : table === 'customer_profile' ? [{ customer_id: 'c1', full_name: 'Test' }]
                        : table === 'pet_profile' && !request.options?.head ? [{ id: 'p1', pet_name: 'Test' }] : [];
                    const error = failOrders && table === 'sales_order' ? { message: 'exceeded_egress_quota' } : null;
                    return Promise.resolve({ data, count: request.options?.head ? 25 : null, error }).then(resolve, reject);
                }
            };
            return query;
        },
        channel() { return { on(type, filter, fn) { handlers[filter.table] = fn; return this; }, subscribe() {} }; }
    };
    ctx.window.getSupabaseClient = () => client;
    load(ctx, 'pages/admin/modules/dashboard/dashboard.js');
    const dashboard = ctx.window.PawpalDashboard;
    await dashboard.init();
    assert.equal(requests.length, 11);
    assert.equal(kpi.textContent, 25);
    assert.equal(requests.filter(r => r.table === 'product').length, 1, 'Empty inventory must not trigger fallback queries');
    assert.deepEqual(requests.find(r => r.table === 'customer_profile').filter.ids, ['c1']);
    assert.deepEqual(requests.find(r => r.table === 'pet_profile' && !r.options?.head).filter.ids, ['p1']);
    const initialCalls = requests.length;
    await dashboard.loadDashboardData();
    assert.equal(requests.length, initialCalls, 'Reopening a warm Dashboard must not load again');

    // Inactive module: invalidate immediately, no network. Reopen loads only affected data.
    ctx.sessionStorage.setItem('pawpal_admin_active_module', 'Bán hàng');
    handlers.sales_order();
    assert.equal(requests.length, initialCalls);
    await dashboard.loadDashboardData();
    assert.equal(requests.length, initialCalls + 1, 'One order event must refetch one dataset instead of eleven');
    assert.equal(requests.at(-1).table, 'sales_order');

    handlers.appointment();
    appointments = [{ id: 'a2', customer_id: 'c2', pet_id: 'p2' }];
    const beforeAppointment = requests.length;
    await dashboard.loadDashboardData();
    assert.equal(requests.length, beforeAppointment + 3, 'Appointment changes load appointments and only their two related profiles');
    assert.deepEqual(requests.filter(r => r.table === 'customer_profile').at(-1).filter.ids, ['c2']);

    // A failed read must be an error, not a cached successful empty list/KPI zero.
    failOrders = true;
    handlers.sales_order();
    await dashboard.loadDashboardData();
    dashboard.renderDashboardKPIs();
    assert.equal(kpi.textContent, '—');
    assert.equal(ctx.window.PawpalDataStore.peek(ctx.window.PawpalDataStore.buildKey('unused')), null);
    failOrders = false;
    await dashboard.loadDashboardData();
    dashboard.renderDashboardKPIs();
    assert.equal(kpi.textContent, 25, 'Failed resource must be retried, not treated as a successful empty cache');
    console.log('PASS: Dashboard 11 → 1 requests for an order event, related profiles, empty state and error recovery');

    // Cache correctness while a request is in flight or the user logs out.
    const store = ctx.window.PawpalDataStore;
    let finish;
    const pending = store.fetch('race', () => new Promise(resolve => { finish = resolve; }));
    await tick();
    store.invalidate('race');
    finish('old');
    await pending;
    assert.equal(store.peek('race').stale, true);
    assert.equal(await store.fetch('race', async () => 'new', { backgroundRevalidate: false }), 'new');
    const logoutPending = store.fetch('logout-race', () => new Promise(resolve => { finish = resolve; }));
    await tick();
    store.clear();
    finish('old-session');
    await logoutPending;
    assert.equal(store.getStats().cachedEntries, 0, 'Old in-flight responses must not repopulate a cleared session');

    ctx.sessionStorage.setItem('pawpal_admin_active_module', 'Dashboard');
    ctx.document.hidden = true;
    let refreshes = 0;
    store.handleRealtimeChange({ moduleName: 'Dashboard', onActiveRefresh: () => { refreshes++; }, debounceMs: 1 });
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(refreshes, 0, 'A hidden browser tab must not fetch on Realtime changes');
    ctx.document.hidden = false;
    ctx.document.dispatchEvent({ type: 'visibilitychange' });
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(refreshes, 1, 'Returning to the tab must apply one pending refresh');
    store.clear();
    console.log('PASS: invalidation races, logout isolation, hidden-tab suppression and resume');
}

(async () => { await testFetch(); await testDashboard(); })().catch(error => { console.error(error); process.exitCode = 1; });
