const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const { createHandler } = require('../../api/admin-chat.js');

(async () => {
    // Read-only handler contract: scope by actor AND session, never service role.
    const calls = [];
    const caller = {
        rpc: async (name,args) => { calls.push({name,args}); return {data:{sessions:[],total:0,page:1}}; },
        from(table) {
            const call = {table,filters:[]}; calls.push(call);
            const q = {select(){return q;},eq(k,v){call.filters.push([k,v]);return q;},order(){return q;},
                range(a,b){call.range=[a,b];return Promise.resolve({data:Array.from({length:31},(_,i)=>({id:String(i)}))});}};
            return q;
        }
    };
    const handler = createHandler({verify:async()=>({authorized:true,caller,staff:{id:'actor-staff',permissions:[]},user:{id:'actor'}})});
    const sessionId='10000000-0000-4000-8000-000000000001';
    let response,status=200;
    const res={setHeader(){},status(value){status=value;return this;},json(value){response=value;}};
    await handler({method:'GET',query:{sessionId,offset:'30'}},res);
    assert.equal(response.history.length,30);assert.equal(response.hasMore,true);
    assert.deepEqual(calls[0].filters,[['staff_id','actor-staff'],['session_id',sessionId]]);
    assert.deepEqual(calls[0].range,[30,60]);
    await handler({method:'GET',query:{sessionId:'bad'}},res);assert.equal(status,400);
    await handler({method:'GET',query:{view:'sessions',page:'2',query:'Test'}},res);
    assert.equal(calls.at(-1).name,'admin_copilot_session_page');

    const browser=await chromium.launch({channel:'chrome',headless:true});
    try {
        const page=await browser.newPage();const errors=[],requests=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('**/*',async route=>{
            const url=new URL(route.request().url());
            if(url.pathname==='/api/admin-chat'){
                const params=Object.fromEntries(url.searchParams);requests.push(params);
                let data;
                if(params.view==='sessions'){
                    const all=Array.from({length:23},(_,i)=>({id:'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),title:'Session '+i,message_count:65,updated:'2026-10-25T00:00:00Z'}))
                        .filter(row=>row.title.toLowerCase().includes((params.query||'').toLowerCase()));
                    const current=Math.min(Number(params.page),Math.max(1,Math.ceil(all.length/10)));
                    data={ok:true,sessions:all.slice((current-1)*10,current*10),page:current,total:all.length};
                } else {
                    const offset=Number(params.offset||0),end=65-offset,start=Math.max(0,end-30);
                    data={ok:true,history:Array.from({length:end-start},(_,i)=>({id:String(start+i),role:'user',content:'Message '+(start+i),created_at:'2026-10-25T00:00:00Z'})),hasMore:start>0};
                }
                return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
            }
            return route.fulfill({contentType:'text/html',body:'<body></body>'});
        });
        await page.goto('http://localhost:3001/');
        await page.setContent(fs.readFileSync('pages/admin/modules/chatbot/chatbot.html','utf8'));
        await page.evaluate(()=>{
            window.ruleReads=[];window.ruleEvents={};window.countReads=[];
            sessionStorage.setItem('pawpal_admin_user',JSON.stringify({id:'actor'}));
            window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture',user:{id:'actor'}}}})},
                rpc:async(name,args)=>{
                    if(name!=='admin_chat_rule_page')throw Error('Unexpected RPC '+name);
                    ruleReads.push(args.p_table);
                    const all=Array.from({length:23},(_,i)=>({id:'rule-'+i,question:'Question '+i,answer:'Answer '+i,
                        category:i<10?'Category A':'Category B',is_active:i%2===0,keywords:['word'+i],priority:i,
                        keyword:'Keyword '+i,severity:'high',action:'block',title:'Title '+i,shortcut:'short'+i,content:'Content '+i,
                        issue_type:'Issue '+i,description:'Description '+i,max_points:100,condition_name:'Condition '+i,
                        threshold_value:i,auto_assign_role:'ADMIN',sla_seconds:30,scenario_name:'Scenario '+i,sample_user_input:'Input '+i,benchmark_status:'passed'}));
                    const f=args.p_filters;
                    const rows=all.filter(row=>(!f.query||Object.values(row).some(value=>String(value).toLowerCase().includes(f.query)))
                        && (!f.category||f.category==='all'||row.category===f.category)
                        && (!f.status||f.status==='all'||(row.is_active?'active':'inactive')===f.status||row.benchmark_status===f.status));
                    const current=Math.min(args.p_page,Math.max(1,Math.ceil(rows.length/10)));
                    return {data:{rows:rows.slice((current-1)*10,current*10),page:current,total:rows.length,count:all.length,categories:['Category A','Category B']}};
                },
                from(table){const q={select(_columns,options){q.head=options?.head;return q;},eq(){return q;},order(){return q;},
                    then(resolve){countReads.push(table);resolve({count:0,error:null});},range:async()=>{ruleReads.push(table);return {data:[],error:null};}};return q;},
                channel(){const q={on(_event,filter,callback){ruleEvents[filter.table]=callback;return q;},subscribe(){return q;}};return q;},removeChannel(){}});
            window.PawpalChatbot={subtabs:{},showToast(){}};
        });
        await page.addScriptTag({content:fs.readFileSync('pages/admin/admin-data-store.js','utf8')});
        await page.addScriptTag({content:fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js','utf8')});
        await page.addScriptTag({content:fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js','utf8')});
        assert.equal(requests.length,0,'hidden Copilot must not fetch');
        assert.deepEqual(await page.evaluate(()=>ruleReads),[],'hidden rules must not fetch');
        await page.evaluate(()=>{document.getElementById('subtab-tab-ai-copilot').classList.add('active');PawpalChatbot.subtabs.copilot.init();});
        await page.waitForFunction(()=>document.querySelectorAll('.copilot-session-item').length===10&&document.querySelectorAll('.copilot-msg').length===30);
        assert.equal(requests.length,2,'one session page plus one transcript chunk');
        await page.getByRole('button',{name:'Tải tin nhắn cũ hơn',exact:true}).click();
        await page.waitForFunction(()=>document.querySelectorAll('.copilot-msg').length===60);
        assert.equal(requests.at(-1).offset,'30');
        await page.locator('#copilotSessionsList').getByRole('button',{name:'>',exact:true}).click();
        await page.waitForFunction(()=>document.querySelector('.copilot-session-title')?.textContent==='Session 10');
        assert.equal(requests.at(-1).page,'2');
        assert.ok(requests.every(params=>params.view==='sessions'||params.sessionId),'never request unscoped full history');
        await page.evaluate(async()=>{document.getElementById('subtab-tab-chatbot-rules').classList.add('active');await PawpalChatbot.subtabs.rules.init();});
        await page.waitForFunction(()=>ruleReads.length===1);
        assert.equal(await page.evaluate(()=>countReads.length),5,'hidden groups use body-free counts; visible group count comes with its page');
        await page.evaluate(async()=>PawpalChatbot.subtabs.rules.loadAllRulesDataFromSupabase());
        assert.equal(await page.evaluate(()=>ruleReads.length),1,'fresh rule cache must be reused');
        await page.evaluate(()=>ruleEvents.chatbot_knowledge_faq());
        await page.waitForFunction(()=>ruleReads.length===2);
        assert.equal(await page.evaluate(()=>ruleReads.at(-1)),'chatbot_knowledge_faq');
        await page.evaluate(()=>{document.getElementById('subtab-tab-chatbot-rules').classList.remove('active');ruleEvents.chatbot_profanity_filter();});
        await page.waitForTimeout(450);
        assert.equal(await page.evaluate(()=>ruleReads.length),2,'inactive rule changes defer downloads');
        await page.evaluate(async()=>{document.getElementById('subtab-tab-chatbot-rules').classList.add('active');await PawpalChatbot.subtabs.rules.init();});
        await page.locator('[data-rules-view="profanity"]').click();
        await page.waitForFunction(()=>ruleReads.length===3);
        assert.equal(await page.evaluate(()=>ruleReads.at(-1)),'chatbot_profanity_filter');
        await page.evaluate(()=>{sessionStorage.setItem('pawpal_admin_active_module','another-module');ruleEvents.chatbot_profanity_filter();});
        await page.waitForTimeout(450);
        assert.equal(await page.evaluate(()=>ruleReads.length),3,'module hiding must defer reads even if its subtab remains active');
        await page.evaluate(()=>{sessionStorage.setItem('pawpal_admin_active_module','Chatbot');PawpalChatbot.subtabs.rules.init();});
        await page.waitForFunction(()=>ruleReads.length===4);
        await page.locator('[data-rules-view="faq"]').click();
        await page.waitForFunction(()=>document.querySelectorAll('#faqTableBody tr').length===10);
        assert.equal(await page.locator('#selectFaqCategoryFilter option[value="Category B"]').count(),1,
            'categories outside page one must remain selectable');
        await page.locator('#faqPaginationWrap').getByRole('button',{name:'3',exact:true}).click();
        await page.waitForFunction(()=>document.querySelectorAll('#faqTableBody tr').length===3);
        assert.ok((await page.locator('#faqTableBody').textContent()).includes('Question 22'));
        await page.locator('#selectFaqCategoryFilter').selectOption('Category B');
        await page.waitForFunction(()=>document.querySelectorAll('#faqTableBody tr').length===10);
        await page.locator('#inputFaqSearch').fill('question 22');
        await page.waitForFunction(()=>document.querySelectorAll('#faqTableBody tr').length===1&&document.querySelector('#faqTableBody').textContent.includes('Question 22'));
        assert.equal(await page.locator('#badgeFaqCount').textContent(),'23','global badge must not shrink to filtered page');
        await page.locator('#inputFaqSearch').fill('__missing_rule__');
        await page.waitForFunction(()=>document.querySelector('#faqTableBody').textContent.includes('Không tìm thấy câu hỏi FAQ'));
        let live=fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js','utf8');
        live=live.slice(0,live.indexOf('    function formatSlaInfo'))+'PawpalChatbot.qaLoadCanned=loadLiveCannedResponses;})();';
        await page.addScriptTag({content:live});
        const before=await page.evaluate(()=>ruleReads.length);
        await page.evaluate(()=>Promise.all([PawpalChatbot.qaLoadCanned(),PawpalChatbot.qaLoadCanned()]));
        assert.equal(await page.evaluate(()=>ruleReads.length),before+1,'canned reads must coalesce');
        await page.evaluate(()=>PawpalChatbot.qaLoadCanned());
        assert.equal(await page.evaluate(()=>ruleReads.length),before+1,'canned library must reuse cache');
        assert.deepEqual(errors,[]);
        console.log('PASS actor-scoped API; lazy 10-session pages; 30-message chunks; rule cache and targeted/deferred Realtime; canned cache/coalescing. No live writes.');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
