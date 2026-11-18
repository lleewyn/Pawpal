const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('pages/admin/modules/services/subtabs/tab-service-bookings.js', 'utf8');
const loader = source.slice(source.indexOf('        let bookingCatalogRequest ='), source.indexOf('        // Modal Thêm lịch hẹn mới'));
const filter = source.slice(source.indexOf('        function getServicesForCategory('), source.indexOf('        function renderServiceAutocomplete('));

test('booking catalog loads on demand, coalesces reads and exposes only active services in the selected group', async () => {
    let resolve, reads=0, renders=0;
    const input = {value:''};
    const context = {
        document:{activeElement:input,getElementById:()=>input},
        renderServiceAutocomplete:()=>renders++,
        PawpalServices:{state:{servicesData:[],auxiliaryErrors:{}},loadCatalogData:(options)=>{
            assert.equal(options.force,true,'opening the modal refreshes the live catalog');
            reads++;
            return new Promise(done=>{resolve=()=>{
                context.PawpalServices.state.servicesData=[
                    {dbId:'spa-active',name:'Tắm',group:'spa',status:'Đang phục vụ'},
                    {dbId:'spa-paused',name:'Tạm ngưng',group:'spa',status:'Tạm ngưng'},
                    {dbId:'hotel-active',name:'Phòng',group:'hotel',status:'Đang phục vụ'}
                ];done();
            };});
        }}
    };
    vm.createContext(context);vm.runInContext(loader+filter,context);
    const request=context.loadBookingCatalog();
    assert.equal(context.loadBookingCatalog(),request);
    assert.equal(reads,1);
    resolve();await request;
    assert.equal(context.getServicesForCategory('Spa').length,1);
    assert.equal(context.getServicesForCategory('Spa')[0].dbId,'spa-active');
    assert.equal(context.getServicesForCategory('Hotel')[0].dbId,'hotel-active');
    assert.equal(context.getServicesForCategory('').length,0);
    assert.equal(context.getServicesForCategory('grooming_spa')[0].dbId,'spa-active');
    assert.equal(renders,1,'focused dropdown refreshes when the catalog arrives');
});

test('one filtered result renders only page one; no results hide pagination', () => {
    const container={style:{},innerHTML:'',querySelectorAll:()=>[]};
    const context={document:{getElementById:()=>container},currentBookingPage:1};
    vm.createContext(context);
    const pagination=source.slice(source.indexOf('    function renderBookingsPagination('),source.indexOf('    function clearBookingSearchAndFilters('));
    vm.runInContext(pagination,context);
    context.renderBookingsPagination(1);
    assert.deepEqual([...container.innerHTML.matchAll(/data-page="(\d+)"/g)].map(m=>m[1]),['1']);
    assert.equal((container.innerHTML.match(/title="Trang (?:trước|sau)" disabled/g)||[]).length,2);
    context.renderBookingsPagination(0);
    assert.equal(container.style.display,'none');
    assert.equal(container.innerHTML,'');
});

test('catalog errors remain distinguishable from an empty catalog and allow retry', async () => {
    const context={document:{activeElement:null,getElementById:()=>({})},renderServiceAutocomplete(){},
        PawpalServices:{state:{auxiliaryErrors:{catalog:'read failed'}},loadCatalogData:async()=>[]}};
    vm.createContext(context);vm.runInContext(loader,context);
    await context.loadBookingCatalog();
    assert.equal(vm.runInContext('bookingCatalogFailed && !bookingCatalogReady',context),true);
    context.PawpalServices.loadCatalogData=async()=>{context.PawpalServices.state.auxiliaryErrors.catalog=null;};
    await context.loadBookingCatalog();
    assert.equal(vm.runInContext('bookingCatalogReady && !bookingCatalogFailed',context),true);
});
