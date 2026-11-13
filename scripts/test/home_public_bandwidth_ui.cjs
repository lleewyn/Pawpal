// Read-only browser verification; no Cloud Logs or business data mutations.
const assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try {
        const page=await browser.newPage({viewport:{width:390,height:800}});
        const reads=[],errors=[];
        page.on('request',r=>{if(r.url().includes('/rest/v1/'))reads.push(r.url());});
        page.on('pageerror',e=>errors.push(e.message));
        const count=part=>reads.filter(url=>url.includes(part)).length;
        const visit=async()=>{
            await page.goto('http://localhost:4000/',{waitUntil:'networkidle'});
            await page.waitForFunction(()=>{const i=document.querySelector('#campaignImg');return i.complete&&i.naturalWidth>0&&!i.src.startsWith('data:');});
            await page.locator('#home-services').scrollIntoViewIfNeeded();
            await page.waitForFunction(()=>document.querySelectorAll('#home-services article').length>0);
            await page.locator('#home-tiers').scrollIntoViewIfNeeded();
            await page.waitForFunction(()=>document.querySelectorAll('#home-tiers article').length>0);
        };
        await visit();
        const first={services:count('public_service_directory'),banners:count('/banner?'),tiers:count('/membership_tier?')};
        assert.deepEqual(first,{services:1,banners:1,tiers:1});
        assert.equal(count('/review_media?'),0,'text-only home quotes must not load image metadata');
        await visit();
        assert.deepEqual({services:count('public_service_directory'),banners:count('/banner?'),tiers:count('/membership_tier?')},first,'reload uses fresh public snapshots');
        await page.locator('#reviews').scrollIntoViewIfNeeded();
        await page.waitForFunction(()=>!document.querySelector('#v4-quote').textContent.includes('Đang tải'));
        assert.equal(count('/review_media?'),0);
        assert.deepEqual(errors,[]);
        console.log('PASS: initial public reads 3; additional reads after reload 0; home review media reads 0.');
    } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
