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
        ['pawpal_supabase_url', 'http://localhost:8000'],
        ['pawpal_supabase_anon_key', 'obsolete-browser-key'],
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
    ctx.window.fetch = async input => { calls++; await tick(); return reply(input); };
    ctx.window.supabase = { createClient(url, optionsKey, options) { fetchOptions = options; return {}; } };
    load(ctx, 'scripts/api/supabase-client.js');
    assert.equal(ctx.window.SupabaseClientConfig.url, 'https://cpzuvaplseielhgcnqrn.supabase.co', 'Obsolete browser configuration must not select the retired local/Cloud backend');
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

    const started = [], pending = [];
    reply = input => new Response(new ReadableStream({ start(controller) {
        started.push(input);
        pending.push(() => controller.close());
    } }));
    const background = Array.from({ length: 6 }, (_, index) => fetch(`${url}&offset=${index}`));
    const page = fetch(`${ctx.window.SupabaseClientConfig.url}/rest/v1/rpc/admin_staff_list_page`, {
        method: 'POST', body: '{}'
    });
    for (let index = 0; index < 3; index++) await tick();
    assert.equal(started.length, 4, 'Only four Supabase read bodies can transfer concurrently');
    pending.shift()();
    for (let index = 0; index < 3; index++) await tick();
    assert.equal(started.length, 5);
    assert.match(started[4], /admin_staff_list_page$/);
    pending.pop()();
    await page;
    while (pending.length) {
        pending.splice(0).forEach(close => close());
        for (let index = 0; index < 3; index++) await tick();
    }
    await Promise.all(background);
    console.log('PASS: active list requests move ahead of queued ancillary reads');
}

async function testDataStore() {
    const ctx = browserContext();
    let now = 1000;
    ctx.Date = class extends Date { static now() { return now; } };
    load(ctx, 'pages/admin/admin-data-store.js');
    const cache = ctx.window.PawpalDataStore;
    const policy = { staleTimeMs: 10, gcTimeMs: 50 };
    let calls = 0, finishRefresh;
    const initial = async () => ++calls;
    assert.equal(await cache.fetch('cache:page', initial, policy), 1);
    assert.equal(await cache.fetch('cache:page', initial, policy), 1);
    now += 11;
    const refresh = () => { calls++; return new Promise(resolve => { finishRefresh = resolve; }); };
    assert.equal(await cache.fetch('cache:page', refresh, policy), 1);
    assert.equal(await cache.fetch('cache:page', refresh, policy), 1, 'Readers can keep the current page while one refresh is running');
    assert.equal(calls, 2, 'Stale reads share a single background refresh');
    finishRefresh(2);
    await tick();
    assert.equal(cache.peek('cache:page').data, 2);
    now += 51;
    assert.equal(cache.peek('cache:page'), null, 'Inactive data is collected after gcTime');
    assert.equal(cache.getStats().cache.hitRatio, 0.75);

    ctx.window.PawpalAdminAccess = { state: { user: { auth_user_id: 'actor', tenant_id: 'one', permissions: ['staff.read'] } } };
    await cache.fetch('unqualified-key', async () => 'tenant one');
    ctx.window.PawpalAdminAccess.state.user = { auth_user_id: 'actor', tenant_id: 'two', permissions: ['staff.read'] };
    assert.equal(cache.peek('unqualified-key'), null, 'A tenant change clears even unqualified cache keys');
    await cache.fetch('unqualified-key', async () => 'tenant two');
    ctx.window.PawpalAdminAccess.state.user.permissions = [];
    assert.equal(cache.peek('unqualified-key'), null, 'A permission change cannot reuse a previously authorized entry');
    await cache.fetch('chatbot:inbox', async () => []);
    await cache.fetch('orders:list:1', async () => []);
    cache.invalidateWorkspaceDomain('chat');
    assert.equal(cache.peek('chatbot:inbox').stale, true);
    assert.equal(cache.peek('orders:list:1').stale, false, 'Chat changes preserve the order-list cache');
    console.log('PASS: cache hits, stale refresh, inactivity GC, tenant isolation and permission isolation');

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

(async () => { await testFetch(); await testDataStore(); })().catch(error => { console.error(error); process.exitCode = 1; });
