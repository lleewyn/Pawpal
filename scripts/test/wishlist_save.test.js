const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture({ failRead = false, failInsert = false, failAuth = false } = {}) {
    const rows = [{ id: 'old-product', product_id: 'SP02' }, { id: 'service', service_id: 'SV01' }];
    const inserts = [], deletes = [];
    const db = { from: () => ({
        select: () => ({ eq: async () => ({ data: rows, error: failRead ? new Error('Read rejected') : null }) }),
        insert: async items => { inserts.push(...items); return { error: failInsert ? new Error('Insert rejected') : null }; },
        delete: () => ({ eq: () => ({ in: async (column, ids) => { deletes.push(...ids); return { error: null }; } }) }),
    }) };
    const source = fs.readFileSync('scripts/api/api.js', 'utf8');
    const start = source.indexOf('    async saveUserWishlist(');
    const end = source.indexOf('    async toggleWishlist(', start);
    const context = {
        window: { getSupabaseClient: () => db },
        resolveCustomerId: async (client, id) => { if (failAuth) throw new Error('Unauthorized'); return id; },
    };
    vm.runInNewContext('globalThis.api = {' + source.slice(start, end) + '};', context);
    context.api.getOrCreateWishlist = async () => ({ id: 'wishlist-1' });
    return { save: ids => context.api.saveUserWishlist('customer-1', { productIds: ids }), inserts, deletes };
}

test('saveUserWishlist updates product entries and preserves service entries', async () => {
    const f = fixture();
    assert.equal((await f.save(['SP01', 'SP01'])).success, true);
    assert.deepEqual(JSON.parse(JSON.stringify(f.inserts)), [{ wishlist_id: 'wishlist-1', product_id: 'SP01' }]);
    assert.deepEqual(f.deletes, ['old-product']);
});
test('empty product list removes products only', async () => {
    const f = fixture(); await f.save([]);
    assert.deepEqual(f.inserts, []);
    assert.deepEqual(f.deletes, ['old-product']);
});
for (const failure of ['failRead', 'failInsert', 'failAuth']) {
    test(`${failure} prevents deletion of existing wishlist entries`, async () => {
        const f = fixture({ [failure]: true });
        await assert.rejects(f.save(['SP01']));
        assert.deepEqual(f.deletes, []);
    });
}
