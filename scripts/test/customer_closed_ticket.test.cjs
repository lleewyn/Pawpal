const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('pages/admin/modules/customers/customers.js','utf8');
const context={PawpalCustomers:{}};vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('    PawpalCustomers.isTicketClosed ='),source.indexOf('    PawpalCustomers.ticketSummary =')),context);
test('completed and terminal ticket statuses never remain open in the customer warning',()=>{
    for(const status of ['completed','resolved','closed','rejected','da_giai_quyet','da_dong','tu_choi',' COMPLETED ','CLOSED']){
        assert.equal(context.PawpalCustomers.isTicketClosed({status}),true,status);
    }
});
test('active workflows remain visible until the ticket actually finishes',()=>{
    for(const status of ['new','processing','in_progress','waiting_customer','waiting_manager_approval','reprocessing','waiting_return','refunding']){
        assert.equal(context.PawpalCustomers.isTicketClosed({status}),false,status);
    }
});
