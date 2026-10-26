// Offline browser checks: all network intercepted, no Supabase or customer writes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async () => {
    const browser = await chromium.launch({channel: 'chrome', headless: true});
    try {
        const page = await browser.newPage({viewport: {width: 1366, height: 900}});
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'http://pawpal.test') throw Error('Unexpected external request');
            if (url.pathname === '/') return route.fulfill({contentType: 'text/html', body: '<!doctype html><body><div id="profileName"></div><div id="upcomingBookingCardContainer"></div><div id="recentOrdersContainer"></div><div id="myPetsContainerHorizontal"></div></body>'});
            if (url.pathname === '/scripts/api/api.js') return route.fulfill({contentType: 'text/javascript', body: 'export const API={};'});
            if (url.pathname === '/scripts/api/petService.js') return route.fulfill({contentType: 'text/javascript', body: 'export async function getPets(id){ window.calls.push({table:"pets",id}); return []; }'});
            const filename = path.join(process.cwd(), decodeURIComponent(url.pathname));
            let body = fs.readFileSync(filename, 'utf8');
            if (url.pathname.endsWith('/profile/profile.js')) body += '\nexport {watchProfile,loadUpcomingBooking,syncUserProfileFromSupabase};';
            return route.fulfill({contentType: 'text/javascript', body});
        });
        await page.goto('http://pawpal.test/');
        await page.clock.install();
        await page.evaluate(async () => {
            window.calls = [];
            window.channels = [];
            window.actor = {id: '10000000-0000-4000-8000-000000000001', name: 'E2E fixture', phone: '0000000000'};
            localStorage.setItem('pawpal_current_user', JSON.stringify(actor));
            window.blockAppointment = false;
            const client = {
                from(table) {
                    const info = {table, filters: []};
                    const q = {
                        select(columns) {info.columns = columns; return q;},
                        eq(k,v) {info.filters.push([k,v]); return q;},
                        in(k,v) {info.status = v; return q;}, gte() {return q;}, order() {return q;},
                        limit(n) {info.limit = n; return q;}, maybeSingle() {return q;},
                        async then(resolve) {
                            calls.push(info);
                            if (table === 'appointment' && blockAppointment) await new Promise(r => {window.releaseAppointment = r;});
                            let data = [];
                            if (table === 'customer') data = {id: actor.id, customer_status: 'active', contact_email: null};
                            if (table === 'customer_profile') data = {full_name: 'E2E profile'};
                            if (table === 'customer_membership') data = null;
                            if (table === 'customer_point_balance') data = {total_paw_points: 7};
                            if (table === 'appointment') data = [{id:'a',appointment_code:'E2E-BOOKING',appointment_status:'confirmed',scheduled_start_at:'2031-04-01T17:30:00Z',items:[{name_snapshot:'E2E Spa',is_primary:true}]}];
                            resolve({data, error: null});
                        }
                    };
                    return q;
                },
                async rpc(name) {
                    calls.push({rpc:name});
                    return {data: {id:actor.id,name:'E2E profile',phone:actor.phone,email:'',addresses:[],revision:'test'}};
                },
                channel(name) {
                    const channel = {name, handlers: [], removed: false,
                        on(type, filter, fn) {this.handlers.push({filter,fn}); return this;},
                        subscribe(callback) {this.statusHandler=callback; return this;}};
                    channels.push(channel); return channel;
                },
                removeChannel(channel) {channel.removed = true;}
            };
            window.getSupabaseClient = () => client;
            window.profileTest = await import('/pages/user/modules/profile/profile.js');
            profileTest.watchProfile(actor);
        });
        await page.clock.runFor(60000);
        assert.equal(await page.evaluate(() => calls.length), 0, 'Idle 60 seconds must not poll');
        await page.evaluate(() => channels.at(-1).statusHandler('SUBSCRIBED'));
        await page.clock.runFor(250);
        assert.equal(await page.evaluate(() => calls.length),0,'Initial subscription must not duplicate initial reads');
        await page.evaluate(() => {const h=channels.at(-1).handlers.find(x=>x.filter.table==='sales_order');for(let i=0;i<10;i++)h.fn();});
        await page.clock.runFor(250);
        await page.waitForFunction(() => calls.length === 1);
        assert.deepEqual(await page.evaluate(() => calls.map(x=>x.table)), ['sales_order'], 'Order burst refreshes orders once only');
        await page.evaluate(() => {
            for(let i=0;i<10;i++)profileTest.watchProfile(actor);
            Object.defineProperty(document,'hidden',{configurable:true,value:true});
            channels.at(-1).handlers.find(x=>x.filter.table==='appointment').fn();
        });
        await page.clock.runFor(60000);
        assert.equal(await page.evaluate(() => calls.length), 1, 'Hidden tab defers query');
        assert.equal(await page.evaluate(() => channels.filter(c=>!c.removed).length), 1, 'Repeated watch cleans previous channel');
        await page.evaluate(() => {Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
        await page.clock.runFor(250);
        await page.waitForFunction(() => calls.length === 2);
        assert.deepEqual(await page.evaluate(() => calls.at(-1).status), ['pending','confirmed','checked_in','in_progress']);
        assert.equal(await page.evaluate(() => calls.at(-1).limit), 5);
        assert.ok((await page.locator('#upcomingBookingCardContainer').innerText()).includes('00:30'));
        const bookingText=await page.locator('#upcomingBookingCardContainer').innerText();
        assert.match(bookingText,/02[/-]04/);
        await page.evaluate(async () => {await profileTest.syncUserProfileFromSupabase(actor,false);});
        assert.equal(await page.evaluate(() => calls.filter(x=>x.table==='paw_point_transaction').length), 0, 'Never download whole point ledger');
        assert.equal(await page.evaluate(() => calls.filter(x=>x.table==='customer_point_balance').length), 1);
        await page.evaluate(() => {
            const cb=channels.at(-1).statusHandler;
            cb('SUBSCRIBED');cb('SUBSCRIBED');cb('SUBSCRIBED');
        });
        await page.clock.runFor(250);
        await page.waitForFunction(() => calls.filter(x=>x.table==='sales_order').length===2);
        assert.equal(await page.evaluate(() => calls.filter(x=>x.rpc==='customer_profile_snapshot').length),2,'Reconnect burst refreshes profile once');
        await page.evaluate(() => {blockAppointment=true;window.pending=profileTest.loadUpcomingBooking(actor);});
        await page.waitForFunction(() => !!window.releaseAppointment);
        await page.evaluate(() => {
            document.getElementById('upcomingBookingCardContainer').textContent='User B';
            localStorage.setItem('pawpal_current_user', JSON.stringify({id:'user-B'}));
            document.dispatchEvent(new Event('auth_state_changed'));
            releaseAppointment();
        });
        await page.evaluate(() => pending);
        assert.equal(await page.locator('#upcomingBookingCardContainer').innerText(), 'User B', 'Late A response must not render into B');
        assert.equal(await page.evaluate(() => channels.filter(c=>!c.removed).length), 0);
        const count = await page.evaluate(() => calls.length);
        await page.clock.runFor(60000);
        assert.equal(await page.evaluate(() => calls.length), count);
        assert.deepEqual(errors, []);
        console.log('PASS offline: idle/hidden 60s zero reads, event burst coalescing, targeted refresh, scoped channels/cleanup, bounded queries, canonical statuses/VN time, balance read, stale actor response blocked. No Cloud calls.');
    } finally {await browser.close();}
})().catch(e => {console.error(e);process.exitCode = 1;});
