const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('my-client/pages/admin/modules/orders/subtabs/tab-order-list.js', 'utf8');
const select = source.slice(source.indexOf('    async function selectPosCustomer('), source.indexOf('    function renderPosCartTable('));
const handoff = source.slice(source.indexOf('    async function openCreateOrderModal('), source.indexOf('    // Khởi tạo các sự kiện giao diện cho Subtab List'));

function fixture(fail = false) {
    const storage = new Map([['pawpal_admin_active_module', 'Bán hàng'], ['pawpal_admin_order_preset', JSON.stringify({custId:'exact-customer'})]]);
    const nodes = new Map(), calls = [];
    const context = {
        window: {addEventListener() {}, PawpalOrderV1: {customers: async ({id}) => {
            calls.push(id);
            if (fail) throw Error('unavailable');
            return [{id, rawName:'Tên từ CSDL', name:'Tên từ CSDL', phone:'0901234567', rank:'Bạc', points:42, defaultAddress:{street_address:'Địa chỉ từ CSDL', province:'Hà Nội'}}];
        }}},
        document: {getElementById: id => {
            if (!nodes.has(id)) nodes.set(id, {style:{},classList:{add(){}},reset(){},value:''});
            return nodes.get(id);
        }},
        sessionStorage: {getItem: k => storage.get(k), removeItem: k => storage.delete(k)},
        crypto: {randomUUID: () => 'new-order'}, state: {}, posDeliveryErrors: {},
        setPosFieldError() {}, renderPosCartTable() {}, updatePosLiveCalculation() {},
        posPricing:{reset:async()=>{}}, clearTimeout, customerSearchTimer:null,
        customerSearchVersion:0, productSearchVersion:0, posProductChoices:[], posCartItems:[], activePosCustomer:null
    };
    vm.createContext(context);
    vm.runInContext(select + handoff, context);
    return {context, storage, nodes, calls};
}

test('profile handoff opens checkout and selects the exact customer from live reader once', async () => {
    const {context, storage, nodes, calls} = fixture();
    await Promise.all([context.consumeCustomerOrderPreset(), context.consumeCustomerOrderPreset()]);
    assert.deepEqual(calls, ['exact-customer']);
    assert.equal(context.activePosCustomer.id, 'exact-customer');
    assert.equal(nodes.get('createOrderPhone').value, '0901234567');
    assert.equal(nodes.get('createOrderName').value, 'Tên từ CSDL');
    assert.equal(nodes.get('createOrderCustomAddress').value, 'Địa chỉ từ CSDL');
    assert.equal(storage.has('pawpal_admin_order_preset'), false);
    await context.consumeCustomerOrderPreset();
    assert.equal(calls.length, 1);
});

test('failed customer lookup preserves the handoff and never selects a different customer', async () => {
    const {context, storage} = fixture(true);
    await context.consumeCustomerOrderPreset();
    assert.equal(context.activePosCustomer, null);
    assert.equal(storage.has('pawpal_admin_order_preset'), true);
});
