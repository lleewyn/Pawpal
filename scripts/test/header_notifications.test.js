const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(count,{fail=false}={}){
 const badge={style:{},textContent:''};let owner='owner',removed=0;const values=new Map([['pawpal_current_user',JSON.stringify({id:owner})],['pawpal_notifications',JSON.stringify([{id:'POISON'}])]]);
 const channel={on(){return this;},subscribe(){return this;}};
 const db={rpc:async()=>({data:{customer_id:owner,snapshot_at:new Date().toISOString(),rows:Array.from({length:owner==='owner'?count:1},(_,i)=>({id:owner+i,title:'Notice',content:'Body',sent_at:new Date().toISOString(),read_at:null}))},error:fail?Error('Rejected'):null}),channel:()=>channel,removeChannel(){removed++;}};
 const context={crypto:{randomUUID:()=> 'test'},CustomEvent:class{},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},document:{readyState:'loading',querySelector:()=>null,addEventListener(){},dispatchEvent(){},getElementById:id=>id==='notificationBadge'?badge:null},window:{addEventListener(){},getSupabaseClient:()=>db}};
 vm.runInNewContext(fs.readFileSync('components/header/header.js','utf8'),context);
 return {badge,async update(){context.window.updateNotificationBadge();await new Promise(setImmediate);},switch(){owner='other';values.set('pawpal_current_user',JSON.stringify({id:owner}));},removed:()=>removed};
}
for(const count of [0,3,9,10,12])test('Cloud unread badge '+count,async()=>{const f=fixture(count);await f.update();assert.equal(f.badge.textContent,count>9?'9+':String(count));assert.equal(f.badge.style.display,count?'flex':'none');});
test('failed Cloud read never imports browser notifications',async()=>{const f=fixture(3,{fail:true});await f.update();assert.equal(f.badge.style.display,'none');});
test('account change clears previous count and replaces subscription',async()=>{const f=fixture(5);await f.update();f.switch();await f.update();assert.equal(f.badge.textContent,'1');assert.equal(f.removed(),1);});

function publicNoticeFixture(){
 const elements=new Map();let result={data:[],error:null};
 const document={getElementById:id=>elements.get(id)||null,querySelector:()=>null,createElement:()=>({style:{},remove(){elements.delete(this.id);}}),body:{firstChild:null,insertBefore(el){elements.set(el.id,el);}}};
 const source=fs.readFileSync('components/header/header.js','utf8');
 const start=source.indexOf('    let noticeLoading=false,noticeAttempts=0;');
 const end=source.indexOf('\n    // -------------------------------------------------------------',start);
 const context={document,sessionStorage:{getItem:()=>null},window:{getSupabaseClient:()=>({rpc:async()=>result})},console:{warn(){}},escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),sanitizeHref:s=>s};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+'\nthis.refresh=renderDynamicTopBarNotice;',context);
 return {elements,async refresh(data,error=null){result={data,error};await context.refresh();}};
}
test('public banner uses configured text and removes stale content after error or empty response',async()=>{
 const f=publicNoticeFixture();
 await f.refresh([{type:'topbar',content:'Configured <b>notice</b>'}]);
 assert.match(f.elements.get('pawpal-public-topbar-notice').innerHTML,/Configured &lt;b&gt;notice&lt;\/b&gt;/);
 await f.refresh(null,Error('Offline'));assert.equal(f.elements.size,0);
 await f.refresh([{type:'topbar',content:'New notice'}]);await f.refresh([]);assert.equal(f.elements.size,0);
 await f.refresh([{type:'topbar',content:'New notice'}]);await f.refresh({});assert.equal(f.elements.size,0);
});
test('header template does not advertise a hardcoded promotion before Cloud loads',()=>{
 const html=fs.readFileSync('components/header/header.html','utf8');assert.equal(html.includes('PAWFIRST10'),false);assert.equal(html.includes('class="notification-bar"'),false);
 const path=require('node:path');
 const visit=dir=>{for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())visit(file);else if(file.endsWith('.html'))assert.equal(fs.readFileSync(file,'utf8').includes('PAWFIRST10'),false,file);}};
 visit('pages');assert.equal(fs.readFileSync('index.html','utf8').includes('PAWFIRST10'),false);
});
