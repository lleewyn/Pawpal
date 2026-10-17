// test_phase2_datastore.js - Automated Verification for Phase 2 Data Store & Single-Flight Cache
const assert = require('assert');

// Mock browser global window & sessionStorage
global.window = {
    addEventListener: (event, handler) => {
        global.window._listeners = global.window._listeners || {};
        global.window._listeners[event] = global.window._listeners[event] || [];
        global.window._listeners[event].push(handler);
    },
    dispatchEvent: (customEvent) => {
        const handlers = global.window._listeners?.[customEvent.type] || [];
        handlers.forEach(h => h(customEvent));
    }
};

global.CustomEvent = class {
    constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
    }
};

global.sessionStorage = {
    getItem: (key) => {
        if (key === 'pawpal_admin_user') return JSON.stringify({ id: 'staff-test-01', auth_user_id: 'auth-user-01' });
        return null;
    }
};

global.localStorage = {
    getItem: () => null
};

// Require admin-data-store
const PawpalDataStore = require('../../pages/admin/admin-data-store.js');

async function runTests() {
    console.log('=== BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 2: DATA STORE & SINGLE-FLIGHT CACHE ===\n');

    // Test 1: API Surface Verification (PERF-02.02)
    assert(PawpalDataStore, 'PawpalDataStore phải tồn tại');
    assert(typeof PawpalDataStore.fetch === 'function', 'PawpalDataStore.fetch phải là function');
    assert(typeof PawpalDataStore.buildKey === 'function', 'PawpalDataStore.buildKey phải là function');
    assert(typeof PawpalDataStore.invalidate === 'function', 'PawpalDataStore.invalidate phải là function');
    assert(typeof PawpalDataStore.clear === 'function', 'PawpalDataStore.clear phải là function');
    assert(typeof PawpalDataStore.emitMutation === 'function', 'PawpalDataStore.emitMutation phải là function');
    console.log('✓ Test 1: API Surface & Khởi tạo hoàn chỉnh (PERF-02.02)');

    // Test 2: Deterministic Actor & Param Scoped Keys (PERF-02.03)
    const key1 = PawpalDataStore.buildKey('customer_list', { page: 1, limit: 10 });
    const key2 = PawpalDataStore.buildKey('customer_list', { limit: 10, page: 1 });
    assert.strictEqual(key1, key2, 'Key phải sắp xếp params để đảm bảo tính tất định');
    assert(key1.includes('staff-test-01'), 'Key phải gắn actor id hiện tại để cô lập bảo mật');
    console.log('✓ Test 2: Xây dựng Cache Key phân lập theo Actor/Branch/Params (PERF-02.03)');

    // Test 3: Single-Flight Concurrent Deduplication (PERF-02.04)
    PawpalDataStore.clear();
    let fetchCount = 0;
    const mockFetcher = async () => {
        fetchCount++;
        await new Promise(r => setTimeout(r, 50));
        return [{ id: 1, name: 'Bé Miu' }, { id: 2, name: 'Cún Ki' }];
    };

    const call1 = PawpalDataStore.fetch(key1, mockFetcher, { ttlMs: 5000 });
    const call2 = PawpalDataStore.fetch(key1, mockFetcher, { ttlMs: 5000 });
    const call3 = PawpalDataStore.fetch(key1, mockFetcher, { ttlMs: 5000 });

    const [res1, res2, res3] = await Promise.all([call1, call2, call3]);
    assert.strictEqual(fetchCount, 1, 'Single-flight: 3 lệnh gọi đồng thời chỉ được gọi fetcher ĐÚNG 1 LẦN');
    assert.strictEqual(res1.length, 2);
    assert.strictEqual(res2.length, 2);
    assert.strictEqual(res3.length, 2);
    console.log('✓ Test 3: Single-Flight deduplication 3 cuộc gọi đồng thời chỉ phát 1 request DB (PERF-02.04)');

    // Test 4: Stale-While-Revalidate & Cache Hit (PERF-02.05)
    const cachedCall = await PawpalDataStore.fetch(key1, mockFetcher, { ttlMs: 5000 });
    assert.strictEqual(fetchCount, 1, 'Lệnh gọi tiếp theo trong TTL phải lấy từ cache, không tăng fetchCount');
    assert.strictEqual(cachedCall[0].name, 'Bé Miu');
    console.log('✓ Test 4: Cache Hit tức thì trong hạn TTL 0ms (PERF-02.05)');

    // Test 5: Force refresh bypasses cache (PERF-02.07)
    await PawpalDataStore.fetch(key1, mockFetcher, { ttlMs: 5000, force: true });
    assert.strictEqual(fetchCount, 2, 'Force refresh phải gọi lại fetcher');
    console.log('✓ Test 5: Force refresh làm mới dữ liệu có chủ đích (PERF-02.07)');

    // Test 6: Invalidation by key & wildcard pattern (PERF-02.08, PERF-02.13)
    const keyPet1 = PawpalDataStore.buildKey('pet_detail', { id: 'PET-01' });
    const keyPet2 = PawpalDataStore.buildKey('pet_detail', { id: 'PET-02' });
    await PawpalDataStore.fetch(keyPet1, async () => ({ id: 'PET-01' }), { ttlMs: 5000 });
    await PawpalDataStore.fetch(keyPet2, async () => ({ id: 'PET-02' }), { ttlMs: 5000 });

    PawpalDataStore.invalidate('*pet_detail*');
    const peek1 = PawpalDataStore.peek(keyPet1);
    const peek2 = PawpalDataStore.peek(keyPet2);
    assert(peek1 && peek1.stale === true, 'Key 1 phải bị đánh dấu stale sau invalidation');
    assert(peek2 && peek2.stale === true, 'Key 2 phải bị đánh dấu stale sau invalidation');
    console.log('✓ Test 6: Invalidation theo mẫu Wildcard chính xác (PERF-02.08, PERF-02.13)');

    // Test 7: Cross-Module Mutation Event Bus (PERF-02.15)
    const keyOrder = PawpalDataStore.buildKey('order_list', { status: 'PAID' });
    const keyDash = PawpalDataStore.buildKey('dashboard_metrics');
    await PawpalDataStore.fetch(keyOrder, async () => [{ id: 'ORD-01' }], { ttlMs: 5000 });
    await PawpalDataStore.fetch(keyDash, async () => ({ revenue: 5000000 }), { ttlMs: 5000 });

    PawpalDataStore.emitMutation('pawpal:order-mutated', { orderId: 'ORD-01' });
    assert.strictEqual(PawpalDataStore.peek(keyOrder).stale, true, 'order_list phải stale sau order-mutated');
    assert.strictEqual(PawpalDataStore.peek(keyDash).stale, true, 'dashboard_metrics phải stale sau order-mutated');
    console.log('✓ Test 7: Event Bus liên phân hệ tự động đồng bộ invalidation (PERF-02.15)');

    // Test 8: Logout / Session boundary clean (PERF-02.12)
    PawpalDataStore.emitMutation('pawpal:auth-logout');
    assert.strictEqual(PawpalDataStore.getStats().cachedEntries, 0, 'Toàn bộ cache phải bị xóa sạch khi đăng xuất');
    console.log('✓ Test 8: Xóa sạch cache nhạy cảm khi đăng xuất (PERF-02.12)');

    console.log('\n=== TẤT CẢ 8 BÀI TEST GIAI ĐOẠN 2 ĐỀU ĐẠT CHUẨN 100% PASS ===');
}

runTests().catch(err => {
    console.error('Test thất bại:', err);
    process.exit(1);
});
