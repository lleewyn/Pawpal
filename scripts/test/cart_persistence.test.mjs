import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeCartItems, voucherBelongsToUser } from '../shared/cart-state.mjs';

function fixture(initial = [{ id: 'row-1', cart_id: 'cart-1', product_id: 'SP01', quantity: 33, unit_price: 100 }], stock = 1000) {
    let rows = structuredClone(initial), fail = '', nextId = 2;
    const cache = new Map([['pawpal_cart', JSON.stringify(initial.map(item => ({id:item.product_id,quantity:item.quantity,qty:item.quantity})))]]);
    cache.set('pawpal_current_user', JSON.stringify({ id: 'customer-1' }));
    cache.set('pawpal_cart_owner', 'customer-1');
    let writes = 0;
    const db = { async rpc(name, args = {}) {
        if(name==='customer_shop_catalog')return {data:[...new Set([...initial.map(r=>r.product_id),'SP01','SP02'])].map(id=>({id,product_variant:[{id:'v-'+id,available_quantity:stock}]})),error:null};
        assert.equal(name, 'own_customer_cart');
        if (fail === 'read') return {error:new Error('Read failed')};
        if (args.p_lines) {
            if (fail === 'inventory') return {error:new Error('Không thể kiểm tra tồn kho')};
            for (const line of args.p_lines) {
                if (line.quantity > stock) return {error:new Error(`Chỉ còn ${stock} sản phẩm trong kho`)};
                const exists=rows.some(r=>'v-'+r.product_id===line.variant_id);
                if (fail === (exists?'update':'insert')) return {error:new Error('Write failed')};
            }
            writes++;
            rows=args.p_lines.map(line=>({id:'row-'+nextId++,cart_id:'cart-1',product_id:line.variant_id.slice(2),quantity:line.quantity,unit_price:100}));
        }
        return {data:rows.map(r=>({...r,product_variant_id:'v-'+r.product_id,product_variant:{id:'v-'+r.product_id,sale_price:100,product:{id:r.product_id,product_name:r.product_id}}})),error:null};
    }, from(table) {
        let action = 'read', values, filters = [];
        const query = {
            select() { return this; }, eq(key, value) { filters.push(row => row[key] === value); return this; },
            in(key, values) { filters.push(row => values.includes(row[key])); return this; },
            or(condition) { return this; },
            update(value) { action = 'update'; values = value; return this; },
            insert(value) { action = 'insert'; values = value; return this; },
            delete() { action = 'delete'; return this; },
            async maybeSingle() { return { data: table === 'cart' ? { id: 'cart-1' } : null, error: fail === 'read' ? new Error('Read failed') : null }; },
            then(resolve, reject) {
                return Promise.resolve().then(() => {
                    if (table === 'product_variant') {
                        const variants=[...new Set([...initial.map(r=>r.product_id),'SP01','SP02'])].map(id=>({id:'v-'+id,product_id:id}));
                        return {data:variants.filter(row=>filters.every(filter=>filter(row))),error:null};
                    }
                    if (table === 'inventory') return { data: initial.map(item => ({product_id:item.product_id,quantity_in_stock:stock})), error: fail === 'inventory' ? new Error('Inventory failed') : null };
                    if (fail === action) return { data: null, error: new Error(`${action} failed`) };
                    let data = rows.filter(row => filters.every(filter => filter(row)));
                    if (action !== 'read') writes++;
                    if (action === 'update') data.forEach(row => Object.assign(row, values));
                    if (action === 'insert') { data = [{ id: `row-${nextId++}`, ...values }]; rows.push(...data); }
                    if (action === 'delete') rows = rows.filter(row => !data.includes(row));
                    return { data: structuredClone(data), error: null };
                }).then(resolve, reject);
            },
        };
        return query;
    } };
    const source = fs.readFileSync('scripts/api/api.js', 'utf8');
    const queue = source.slice(source.indexOf('let cartWriteQueue'), source.indexOf('const resolveCustomerId'));
    const methods = source.slice(source.indexOf('    async getUserCart('), source.indexOf('    async updateCartItemQuantity('));
    const context = {
        window: { getSupabaseClient: () => db },
        localStorage: { getItem: key => cache.get(key) || null, setItem: (key, value) => cache.set(key, value) },
        normalizeCartItems,
        // This VM extracts member API methods without their module imports.
        isGuestShopper: () => !JSON.parse(cache.get('pawpal_current_user') || 'null')?.id,
        publishCart: items => { const normalized = normalizeCartItems(items); cache.set('pawpal_cart', JSON.stringify(normalized)); return normalized; },
    };
    vm.runInNewContext(queue + '\nglobalThis.api = {' + methods + '};', context);
    return { api: context.api, cache, rows: () => rows, cached: () => JSON.parse(cache.get('pawpal_cart')), fail: action => { fail = action; }, writes: () => writes };
}

test('remote quantity is returned in both quantity and qty', async () => {
    const f = fixture();
    const items = await f.api.getUserCart('customer-1');
    assert.equal(items[0].quantity, 33); assert.equal(items[0].qty, 33);
});
test('saving quantity 34 overrides stale legacy qty 33', async () => {
    const f = fixture();
    await f.api.saveUserCart('customer-1', [{ id: 'SP01', quantity: 34, qty: 33, price: 100 }]);
    assert.equal(f.rows()[0].quantity, 34);
    assert.equal(f.cached()[0].quantity, 34); assert.equal(f.cached()[0].qty, 34);
});
test('twenty concurrent adds retain every unit and a single product row', async () => {
    const f = fixture();
    await Promise.all(Array.from({ length: 20 }, () => f.api.addToCart('customer-1', 'SP01', 1)));
    assert.equal(f.rows().length, 1); assert.equal(f.rows()[0].quantity, 53);
    assert.equal(f.cached()[0].quantity, 53);
});
test('read failure never replaces a saved cart with an empty cart', async () => {
    const f = fixture(); f.fail('read');
    await assert.rejects(f.api.getUserCart('customer-1'));
    assert.equal(f.cached()[0].quantity, 33); assert.equal(f.writes(), 0);
});
test('failed save leaves cached badge count and existing product intact', async () => {
    const f = fixture(); f.fail('update');
    await assert.rejects(f.api.saveUserCart('customer-1', [{ id: 'SP01', quantity: 34 }]));
    assert.equal(f.rows()[0].quantity, 33); assert.equal(f.cached()[0].quantity, 33);
});
test('invalid quantities are rejected before writing or deleting', async () => {
    const f = fixture();
    for (const quantity of [0, -1, 1.5, 'invalid']) {
        await assert.rejects(f.api.saveUserCart('customer-1', [{ id: 'SP01', quantity }]));
    }
    assert.equal(f.writes(), 0);
});
test('normalization merges duplicate product entries and synchronizes aliases', () => {
    const items = normalizeCartItems([{ id: 'SP01', qty: 3 }, { id: 'SP01', quantity: 30 }]);
    assert.deepEqual(items.map(({ id, quantity, qty }) => ({ id, quantity, qty })), [{ id: 'SP01', quantity: 33, qty: 33 }]);
});

test('stock 10 rejects adding or saving 13 before any cart writes', async () => {
    const f = fixture([{id:'row-1',cart_id:'cart-1',product_id:'SP01',quantity:5,unit_price:100}],10);
    await assert.rejects(f.api.saveUserCart('customer-1',[{id:'SP01',quantity:13}]),/Chỉ còn 10 sản phẩm trong kho/);
    await assert.rejects(f.api.addToCart('customer-1','SP01',8),/Chỉ còn 10 sản phẩm trong kho/);
    assert.equal(f.rows()[0].quantity,5); assert.equal(f.cached()[0].quantity,5); assert.equal(f.writes(),0);
});
test('quantity equal to stock remains 10 after save and reload', async () => {
    const f = fixture([{id:'row-1',cart_id:'cart-1',product_id:'SP01',quantity:5,unit_price:100}],10);
    await f.api.saveUserCart('customer-1',[{id:'SP01',quantity:10,qty:1}]);
    const items = await f.api.getUserCart('customer-1');
    assert.equal(items[0].quantity,10); assert.equal(items[0].qty,10);
});
test('inventory read failure prevents saving instead of assuming unlimited stock', async () => {
    const f = fixture();f.fail('inventory');
    await assert.rejects(f.api.saveUserCart('customer-1',[{id:'SP01',quantity:34}]),/Không thể kiểm tra tồn kho/);
    assert.equal(f.writes(),0);assert.equal(f.cached()[0].quantity,33);
});

test('preparing selected checkout items keeps all products in the main cart', async () => {
    const f = fixture([
        {id:'row-1',cart_id:'cart-1',product_id:'SP01',quantity:2,unit_price:100},
        {id:'row-2',cart_id:'cart-1',product_id:'SP02',quantity:3,unit_price:200},
    ]);
    const selected = await f.api.prepareCartCheckout('customer-1',[{id:'SP01',quantity:2}]);
    assert.equal(selected.length,1);assert.equal(selected[0].quantity,2);
    assert.equal(f.rows().length,2);assert.equal(f.cached().length,2);assert.equal(f.writes(),0);
});
test('legacy backup restores a missing product exactly once, even on concurrent retries', async () => {
    const f = fixture([{id:'row-1',cart_id:'cart-1',product_id:'SP01',quantity:2,unit_price:100}]);
    const backup=[{id:'SP02',quantity:3,qty:3,price:200}];
    await Promise.all([f.api.restoreCartBackup('customer-1',backup),f.api.restoreCartBackup('customer-1',backup)]);
    assert.equal(f.rows().length,2);
    assert.equal(f.rows().find(row=>row.product_id==='SP02').quantity,3);
    assert.equal(f.cached().reduce((sum,item)=>sum+item.quantity,0),5);
});
test('included checkout backup does not duplicate products already present', async () => {
    const f = fixture();
    await f.api.restoreCartBackup('customer-1',[{id:'SP01',quantity:33}], { mode: 'included' });
    assert.equal(f.rows()[0].quantity,33);assert.equal(f.writes(),0);
});
test('failed backup insert preserves existing products for a later retry', async () => {
    const f = fixture();f.fail('insert');
    await assert.rejects(f.api.restoreCartBackup('customer-1',[{id:'SP02',quantity:3}]));
    assert.equal(f.rows().length,1);assert.equal(f.rows()[0].quantity,33);
});
test('completing an order removes only purchased quantities and retains unselected products', async () => {
    const f = fixture([
        {id:'row-1',cart_id:'cart-1',product_id:'SP01',quantity:2,unit_price:100},
        {id:'row-2',cart_id:'cart-1',product_id:'SP02',quantity:3,unit_price:200},
    ]);
    await f.api.removePurchasedCartItems('customer-1',[{id:'SP01',quantity:2}]);
    assert.equal(f.rows().length,1);assert.equal(f.rows()[0].product_id,'SP02');assert.equal(f.rows()[0].quantity,3);
});

test('overlapping backup adds 1 + 2 = 3 in a single row exactly once', async () => {
    const f = fixture([{id:'row-1',cart_id:'cart-1',product_id:'SP01',quantity:1,unit_price:100}]);
    const backup=[{id:'SP01',quantity:2}];
    await Promise.all([f.api.restoreCartBackup('customer-1',backup,{token:'restore-1'}),f.api.restoreCartBackup('customer-1',backup,{token:'restore-1'})]);
    assert.equal(f.rows().length,1);assert.equal(f.rows()[0].quantity,3);
    await f.api.restoreCartBackup('customer-1',backup,{token:'restore-1'});
    assert.equal(f.rows()[0].quantity,3);
});
test('retry after a lost restore response does not add the backup a second time', async () => {
    const f=fixture([{id:'row-1',cart_id:'cart-1',product_id:'SP01',quantity:3,unit_price:100}]);
    const backup=normalizeCartItems([{id:'SP01',quantity:2}]);
    f.cache.set('pawpal_cart_restore_customer-1',JSON.stringify({token:'lost-response',payload:JSON.stringify(backup),status:'prepared',target:[{id:'SP01',quantity:3,qty:3,price:100}]}));
    await f.api.restoreCartBackup('customer-1',backup,{token:'lost-response'});
    assert.equal(f.rows()[0].quantity,3);
});
test('queued writes for a logged-out account do not write another account cart', async () => {
    const f=fixture();const pending=f.api.saveUserCart('customer-1',[{id:'SP01',quantity:34}]);
    f.cache.set('pawpal_current_user',JSON.stringify({id:'customer-2'}));
    await assert.rejects(pending,/Tài khoản đã thay đổi/);
    assert.equal(f.rows()[0].quantity,33);assert.equal(f.writes(),0);
});
test('personal vouchers match ownerPhone only for the active member', () => {
    const a={id:'A',phone:'0901234567'},b={id:'B',phone:'0987654321'};
    assert.equal(voucherBelongsToUser({ownerPhone:'0901234567'},a),true);
    assert.equal(voucherBelongsToUser({ownerPhone:'+84 901234567'},a),true);
    assert.equal(voucherBelongsToUser({ownerPhone:'0901234567'},b),false);
    assert.equal(voucherBelongsToUser({},b),false);
    assert.equal(voucherBelongsToUser({ownerPhone:b.phone},{...b,is_temporary:true}),false);
});
test('publishing a committed cart emits cart_updated once for its owner and ignores stale account responses', () => {
    const values=new Map([['pawpal_current_user',JSON.stringify({id:'B'})]]),events=[];
    const context={localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},document:{dispatchEvent:event=>events.push(event)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}}};
    vm.runInNewContext(fs.readFileSync('scripts/shared/cart-state.mjs','utf8').replaceAll('export function','function'),context);
    context.publishCart([{id:'SP01',quantity:9}],'A');
    assert.equal(events.length,0);assert.equal(values.has('pawpal_cart'),false);
    context.publishCart([{id:'SP02',quantity:3,qty:1}],'B');
    assert.equal(events.length,1);assert.equal(events[0].type,'cart_updated');assert.equal(events[0].detail.ownerId,'B');
    assert.equal(values.get('pawpal_cart_owner'),'B');assert.equal(JSON.parse(values.get('pawpal_cart'))[0].quantity,3);
});

test('interleaved add, increment and decrement operations preserve the newest cart quantities', async () => {
    const f=fixture([{id:'row-1',cart_id:'cart-1',product_id:'SP01',quantity:3,unit_price:100}]);
    await Promise.all([
        f.api.adjustCartQuantity('customer-1','SP01',1),
        f.api.addToCart('customer-1','SP01',2),
        f.api.adjustCartQuantity('customer-1','SP01',-1),
        f.api.adjustCartQuantity('customer-1','SP01',1),
    ]);
    assert.equal(f.rows()[0].quantity,6);assert.equal(f.cached()[0].quantity,6);
});
test('removing one product keeps other products added before the deletion', async () => {
    const f=fixture([
        {id:'row-1',cart_id:'cart-1',product_id:'SP01',quantity:2,unit_price:100},
        {id:'row-2',cart_id:'cart-1',product_id:'SP02',quantity:3,unit_price:200},
    ]);
    await Promise.all([f.api.addToCart('customer-1','SP02',2),f.api.removeCartProduct('customer-1','SP01')]);
    assert.equal(f.rows().length,1);assert.equal(f.rows()[0].product_id,'SP02');assert.equal(f.rows()[0].quantity,5);
});
