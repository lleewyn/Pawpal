// Offline regression of the real unlock handler and configuration persistence guard.
// No live policy, notice or database changes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const system=fs.readFileSync('pages/admin/modules/settings/subtabs/tab-settings-system.js','utf8');
 const core=fs.readFileSync('pages/admin/modules/settings/settings.js','utf8');
 const a=system.indexOf('        const handleSafeModeToggle = () => {'),b=system.indexOf('        // Render ban đầu',a);
 const c=core.indexOf('    async function persistSystemConfig(newCfg)'),d=core.indexOf('    function updateSafeModeUI()',c);
 const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),clear:()=>values.clear()};};
 const sessionStorage=storage(),localStorage=storage(),listeners={},toasts=[],writes=[];
 const PawpalSettings={state:{isSafeModeLocked:true},updateSafeModeUI(){},saveRecord:async(...args)=>writes.push(args)};
 const context={PawpalSettings,sessionStorage,localStorage,structuredClone,console,Set,JSON,
  showToast:(...args)=>toasts.push(args),getSupabaseClient:()=>({}),records:new Map(),
  document:{getElementById:id=>({addEventListener:(event,fn)=>listeners[id]=fn})},window:{dispatchEvent(){}}};
 vm.createContext(context);vm.runInContext(system.slice(a,b)+core.slice(c,d),context);
 const permissions=['pawpal_setting.read','pawpal_setting.write','audit_log.write'];
 const admin={id:'admin',system_role:'ADMIN',role:'admin',access_roles:['ADMIN'],permissions};
 const tryUnlock=(actor,expected,{local=false,legacy=false}={})=>{
  sessionStorage.clear();localStorage.clear();PawpalSettings.state.isSafeModeLocked=true;
  if(actor)(local?localStorage:sessionStorage).setItem('pawpal_admin_user',typeof actor==='string'?actor:JSON.stringify(actor));
  if(legacy)sessionStorage.setItem('pawpal_admin_system_role','ADMIN');
  listeners.btnToggleSafeMode();assert.equal(PawpalSettings.state.isSafeModeLocked,!expected);
 };
 tryUnlock(admin,true);
 tryUnlock({...admin,system_role:'STAFF',role:'staff',access_roles:['STAFF','MANAGER']},true);
 tryUnlock({...admin,system_role:'STAFF',role:'staff',access_roles:['STAFF']},false);
 tryUnlock({...admin,permissions:['pawpal_setting.read']},false);
 tryUnlock('{broken',false);tryUnlock(null,false,{legacy:true});tryUnlock(admin,true,{local:true});
 // Both visible unlock controls must use the same session-aware handler.
 assert.equal(listeners.btnToggleSafeMode,listeners.btnToggleSafeModeAudit);
 await PawpalSettings.persistSystemConfig({pawpointsPolicy:{pointValueVnd:150,registerPoints:60},websiteNotices:[{id:'notice',content:'QA',type:'topbar',isActive:true}]});
 assert.equal(writes.length,1);assert.equal(PawpalSettings.state.systemConfig.pawpointsPolicy.pointValueVnd,150);
 assert.equal(JSON.parse(writes[0][2].setting_value).websiteNotices[0].type,'topbar');
 listeners.btnToggleSafeModeAudit();assert.equal(PawpalSettings.state.isSafeModeLocked,true);
 await assert.rejects(()=>PawpalSettings.persistSystemConfig({}),/mở khóa/);assert.equal(writes.length,1);
 console.log('PASS actual login-session roles/permissions, both unlock controls, valid policy/notice save after unlock, rejected staff/malformed/legacy sessions, relock blocks writes. Offline only.');
})().catch(e=>{console.error(e);process.exitCode=1;});
