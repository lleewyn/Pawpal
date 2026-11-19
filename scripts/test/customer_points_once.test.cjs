const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js','utf8');
const handler=source.slice(source.indexOf('    async function handleAdjustPointsSubmit('),source.indexOf('    let _hasAttachedPawpointDelegates'));
function fixture(){
    const storage=new Map(),calls=[],toasts=[];
    const nodes={adjustPointsVal:{value:'50'},adjustType:{value:'ADD'},btnSubmitAdjustPoints:{disabled:false},formAdjustPoints:{reset(){}}};
    const modal={style:{display:'flex'}};let serial=0;
    const c={adjustmentSaving:false,adjustmentCompleted:false,selectedAdjustCustomer:{dbId:'customer'},
        document:{getElementById:id=>nodes[id]},getAdjustModal:()=>modal,getComputedStyle:n=>n.style,
        getAdjustReasonInput:()=>({value:'Bù sự cố dịch vụ'}),adjustError(){},
        crypto:{randomUUID:()=>`request-${++serial}`},
        sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
        window:{getSupabaseClient:()=>({rpc:async(name,args)=>{calls.push(args);return {data:{id:'transaction',balance:150}};}})},
        closeAdjustModal:()=>{modal.style.display='none';},clearAdjustCustomerSelection(){},renderPawpointHistory(){},
        PawpalCustomers:{refreshCustomerData:async()=>{},showToast:(...args)=>toasts.push(args)}};
    vm.createContext(c);vm.runInContext(handler,c);return {c,calls,nodes,toasts};
}
test('rapid clicks and clicks after successful save produce one adjustment',async()=>{
    const {c,calls,nodes}=fixture();
    await Promise.all(Array.from({length:20},()=>c.handleAdjustPointsSubmit()));
    await c.handleAdjustPointsSubmit();
    assert.equal(calls.length,1);assert.equal(calls[0].p_points,50);assert.equal(nodes.btnSubmitAdjustPoints.disabled,true);
});
test('retry after uncertain network result reuses the request id',async()=>{
    const {c,calls}=fixture();let fail=true;
    c.window.getSupabaseClient=()=>({rpc:async(name,args)=>{calls.push(args);if(fail){fail=false;throw Error('network');}return {data:{id:'transaction',balance:150}};}});
    await c.handleAdjustPointsSubmit();await c.handleAdjustPointsSubmit();
    assert.equal(calls.length,2);assert.equal(calls[0].p_request_id,calls[1].p_request_id);
});
test('history refresh failure does not turn a successful adjustment into a retry',async()=>{
    const {c,calls,toasts}=fixture();c.PawpalCustomers.refreshCustomerData=async()=>{throw Error('refresh');};
    await c.handleAdjustPointsSubmit();await c.handleAdjustPointsSubmit();
    assert.equal(calls.length,1);assert.equal(c.adjustmentCompleted,true);assert.ok(toasts.some(t=>t[1]==='success'));
});
