const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('late legacy product load cannot replace landing cards or their buy-now buttons', async () => {
    let finishLoad;
    const grid = { dataset: {}, innerHTML: 'landing cards and buttons' };
    const context = {
        document: { getElementById: () => grid },
        window: { DataLoader: { loadProducts: () => new Promise(resolve => { finishLoad = resolve; }) } },
        setupShopLandingActions() { throw new Error('Legacy handlers must not run'); },
        setupFilterInteractions() { throw new Error('Legacy filters must not run'); },
        console,
    };
    const source = fs.readFileSync('scripts/shared/main.js', 'utf8');
    const start = source.indexOf('function initShopFilter()');
    const end = source.indexOf('function setupShopLandingActions(', start);
    vm.runInNewContext(source.slice(start, end) + '\ninitShopFilter();', context);
    grid.dataset.landingProductsOwner = 'true';
    finishLoad([]);
    await new Promise(setImmediate);
    assert.equal(grid.innerHTML, 'landing cards and buttons');
});
