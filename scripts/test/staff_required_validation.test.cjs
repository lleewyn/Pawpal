const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('my-client/pages/admin/modules/staff/subtabs/tab-staff-list.js','utf8');
const start=source.indexOf("        btnSaveStaff.addEventListener('click',async()=>{");
const handler=source.slice(start,source.indexOf('\n        });',start)+12);
for (const fullName of ['', 'Nguyễn @#$% F', 'Nguyễn 123', '<b>Test</b>', '<script>alert(1)</script>']) test('invalid name '+JSON.stringify(fullName)+' reports required fields and preserves form without writes',async()=>{
    let save,creates=0,refreshes=0;
    const errors=new Map(),nodes=new Map();
    const values={staffInputName:fullName,staffInputPhone:'0901112233',staffInputPosition:'Groomer',staffInputJoinDate:'2026-11-14',staffEmploymentStatus:'active',staffAccountEmail:'',staffAccountPassword:''};
    for(const [id,value] of Object.entries(values))nodes.set(id,{value,focus(){},scrollIntoView(){}});
    const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',checked:false,focus(){},scrollIntoView(){}});return nodes.get(id);};
    const context={btnSaveStaff:{disabled:false,addEventListener:(name,fn)=>{save=fn;}},
        document:{getElementById:get},clearStaffFieldErrors(){},
        invalidStaffField:(id,message)=>{errors.set(id,message);return Object.assign(Error(message),{staffFieldError:true});},
        PawpalStaff:{state:{profileEditSnapshot:null},createStaffAccount:async()=>{creates++;},loadStaffModuleData:async()=>{refreshes++;}}};
    vm.createContext(context);vm.runInContext(handler,context);await save();
    for(const id of ['staffInputName','staffAccountEmail','staffAccountPassword'])assert.ok(errors.has(id),id);
    if(fullName)assert.match(errors.get('staffInputName'),/ký tự đặc biệt/);
    assert.equal(get('staffInputName').value,fullName);
    assert.equal(creates,0);assert.equal(refreshes,0);
    assert.equal(get('staffInputPhone').value,'0901112233');assert.equal(get('staffInputPosition').value,'Groomer');
    assert.equal(context.btnSaveStaff.disabled,false);
});
