const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('my-client/pages/admin/modules/customers/subtabs/tab-customer-profile.js', 'utf8');
const helper = source.slice(source.indexOf('    function openRelatedHistory('), source.indexOf('    function getCust('));

for (const warm of [false, true]) {
    for (const [moduleName, tab, storageKey, stateKey, namespace] of [
        ['Bán hàng', 'tab-order-detail', 'pawpal_admin_order_selected_id', 'selectedOrderId', 'PawpalOrders'],
        ['Dịch vụ', 'tab-service-detail', 'pawpal_admin_service_selected_id', 'selectedBookingId', 'PawpalServices']
    ]) {
        test(`${moduleName} history link preserves exact record with ${warm ? 'cached' : 'unloaded'} module`, () => {
            const storage = new Map([['pawpal_admin_active_module', 'Khách hàng']]);
            const context = {
                window: {location: {hash: '#tab-profile?id=customer'}},
                sessionStorage: {setItem: (k, v) => storage.set(k, v), getItem: k => storage.get(k)}
            };
            if (warm) context.window[namespace] = {state: {[stateKey]: 'previous-record'}};
            vm.createContext(context);
            vm.runInContext(helper, context);
            const id = 'chosen-record/with?special=value';
            context.openRelatedHistory(moduleName, tab, id);
            assert.equal(storage.get('pawpal_admin_active_module'), 'Khách hàng', 'router must detect a module change');
            assert.equal(storage.get(storageKey), id);
            const [base, query] = context.window.location.hash.split('?');
            assert.equal(base, '#' + tab);
            assert.equal(new URLSearchParams(query).get('id'), id);
            if (warm) assert.equal(context.window[namespace].state[stateKey], id, 'cached selection must not override the chosen record');
        });
    }
}
