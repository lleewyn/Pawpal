const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('my-client/pages/admin/modules/complaints/complaints.js','utf8');
const start = source.indexOf('        if (presetCustomerId) {');
const block = source.slice(start, source.indexOf('        if (targetRefId && contentInput)', start));

for (const found of [true, false]) {
    test(`complaint handoff ${found ? 'selects exact live customer' : 'rejects unrelated results'}`, async () => {
        let selected=null, query=null, focused=false;
        const context = {
            presetCustomerId:'chosen-customer',
            modal:{dataset:{requestId:'request'},classList:{contains:()=>true}},
            searchRefInput:{focus:()=>{focused=true;}},
            PawpalComplaints:{
                searchCreateContext:async (...args)=>{query=args;return {customers:[{id:found?'chosen-customer':'other-customer',name:'Tên từ CSDL',phone:'0901234567'}]};},
                selectCreateCustomer:customer=>{selected=customer;},showToast(){}
            }
        };
        vm.createContext(context);
        const result=await vm.runInContext('(async()=>{'+block+'})()', context);
        assert.deepEqual(query,['customers','','chosen-customer']);
        assert.equal(result,found);
        assert.equal(selected?.id,found?'chosen-customer':undefined);
        if(found){assert.equal(selected.phone,'0901234567');assert.equal(focused,true);}
    });
}
