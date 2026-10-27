const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createCustomerAuth, validPassword, runtimeMode } = require('../api/customer_auth');
const { createTestStore } = require('./auth_store_fixture');

function fixture({ simulated = true, locked = false, staff = false, temporary = false, realAccount = false, mode = simulated ? 'console' : 'supabase', allowedPhones = ['0912345678'], guestLink, unlinkedGuest = false } = {}) {
    let time = 1000, codes = [], writes = [], credentialsUsed = [], profileCalls = [], failUpdate = false, failRead = false, ready = true, failLink = false;
    const phoneData = { customer_id: 'customer-1', phone_number: '0912345678', is_primary: true };
    const customer = { id: 'customer-1', auth_user_id: 'auth-1', customer_status: locked ? 'locked' : 'active', contact_email: 'test@example.com' };
    const admin = {
        from(table) {
            const query = {
                select() { return this; }, eq() { return this; }, limit() { return this; },
                async maybeSingle() {
                    if (failRead) return { data: null, error: new Error('DB rejected') };
                    if (table === 'customer_phone') return { data: unlinkedGuest ? null : phoneData, error: null };
                    if (table === 'customer') return { data: customer, error: null };
                    if (table === 'customer_profile') return { data: { full_name: 'Khách kiểm thử' }, error: null };
                    return { data: customer, error: null };
                },
                then(resolve) {
                    return Promise.resolve({ data: staff && table === 'staff' ? [{ id: 'staff-1' }] : [], error: failRead ? new Error('DB rejected') : null }).then(resolve);
                }
            };
            return query;
        },
        async rpc(name) {
            if (name === 'complete_customer_auth') {
                if (failLink) return { error: new Error('Link rejected') };
                writes.push('link'); customer.is_temporary = false;
            }
            return { data: name === 'customer_auth_serverless_ready' ? ready : 'auth-1', error: null };
        },
        auth: {
            async getUser(token) { return token === 'valid-token' ? { data: { user: { id: 'auth-1' } } } : { data: {}, error: new Error('Invalid token') }; },
            admin: {
                async updateUserById(id, update) { writes.push(update); return { error: null }; },
                async getUserById() { return { data: { user: { email: 'customer-auth-1@demo.pawpal.invalid', app_metadata: { pawpal_test: !realAccount } } } }; }
            }
        }
    };
    const store = createTestStore(() => time);
    const createApi = () => createCustomerAuth({ admin, store, mode, allowedTestPhones: allowedPhones, guestLink, randomCode: () => '123456', deliver: (phone, code) => codes.push(code), clientFactory: token => ({
        async rpc(name, args) { profileCalls.push({name,args,token}); return failUpdate ? {error: new Error('Atomic profile rejected')} : {data: name==='reply_own_support_ticket'?args.p_id:{id: 'customer-1', revision: 'db-revision', addresses: []}}; },
        auth: {
        async signInWithPassword(credentials) { credentialsUsed.push(credentials); const { password } = credentials; if (mode === 'demo' && (!credentials.email || credentials.phone)) return { data: {}, error: new Error('Phone provider disabled') }; if (!['OldPass123!', 'NewPass123!'].includes(password)) return { data: {}, error: new Error('Wrong password') }; return { data: { user: { id: 'auth-1' }, session: { access_token: 'safe-token', refresh_token: 'refresh' } } }; },
        async signInWithOtp() { return { error: null }; },
        async verifyOtp({ token }) { return token === '123456' ? { data: { user: { id: 'auth-1' }, session: { access_token: 'safe-token' } } } : { error: new Error('Invalid OTP') }; },
        async updateUser(update) { if (failUpdate) return { error: new Error('Update rejected') }; writes.push(update); return { error: null }; }
    } }) });
    let api = createApi();
    async function call(name, body = {}, token = '') {
        const response = { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
        await api[name]({ body, headers: { authorization: token && `Bearer ${token}` }, ip: '127.0.0.1' }, response);
        return response;
    }
    const request = () => call('requestOtp', { phone: '0912345678', purpose: 'reset' });
    const complete = (id, code = '123456') => call('completeOtp', { challengeId: id, code, password: 'NewPass123!' });
    return { call, request, complete, writes, codes, credentialsUsed, profileCalls, restart: () => { api = createApi(); }, advance: ms => { time += ms; }, rejectUpdate: () => { failUpdate = true; }, rejectRead: () => { failRead = true; }, missingMigration: () => { ready = false; }, rejectLink: () => { failLink = true; } };
}

test('profile API uses one atomic RPC with the verified customer token', async () => {
    const f=fixture();
    const result=await f.call('me',{action:'profile-save',profile:{name:'Customer',email:'',addresses:[],revision:'old'}},'valid-token');
    assert.equal(result.code,200);
    assert.deepEqual(f.profileCalls,[{name:'customer_profile_save',args:{p_name:'Customer',p_email:'',p_addresses:[],p_revision:'old'},token:'valid-token'}]);
    assert.equal(f.writes.length,0);
    f.rejectUpdate();
    assert.equal((await f.call('me',{action:'profile-save',profile:{}},'valid-token')).code,400);
});

test('profile API refuses forged sessions before invoking any profile RPC', async () => {
    const f=fixture();
    assert.equal((await f.call('me',{action:'profile-snapshot'},'forged')).code,400);
    assert.equal(f.profileCalls.length,0);
});

test('support reply API forwards verified caller JWT to atomic RPC, never service-role writes',async()=>{
    const f=fixture(),ticketId='10000000-0000-4000-8000-000000000001',requestId='20000000-0000-4000-8000-000000000001';
    const result=await f.call('me',{action:'support-reply',ticketId,requestId,content:'E2E reply'},'valid-token');
    assert.equal(result.code,200);assert.equal(result.body.message.id,requestId);
    assert.deepEqual(f.profileCalls,[{name:'reply_own_support_ticket',args:{p_id:requestId,p_ticket:ticketId,p_content:'E2E reply'},token:'valid-token'}]);
    assert.equal(f.writes.length,0);
    const before=f.profileCalls.length;assert.equal((await f.call('me',{action:'support-reply',ticketId,requestId,content:'E2E reply'},'forged')).code,400);assert.equal(f.profileCalls.length,before);
});

test('demo login and password change use internal identity when phone provider is disabled', async () => {
    const f = fixture({ mode: 'demo', realAccount: true, allowedPhones: [] });
    assert.equal((await f.call('login', { phone: '0912345678', password: 'OldPass123!' })).code, 200);
    assert.equal((await f.call('changePassword', { currentPassword: 'WrongPass123!', newPassword: 'NewPass123!' }, 'valid-token')).code, 400);
    assert.ok(!f.writes.some(w => w.password));
    assert.equal((await f.call('changePassword', { currentPassword: 'OldPass123!', newPassword: 'NewPass123!' }, 'valid-token')).code, 200);
    assert.ok(f.credentialsUsed.every(c => c.email && !c.phone));
});

test('demo accepts fixed OTP for customer phones without allowlist and rejects wrong or reused codes', async () => {
    const f = fixture({ mode: 'demo', realAccount: true, allowedPhones: [] });
    const r = await f.request();
    assert.equal(r.code, 200);
    assert.equal(r.body.testCode, '555666');
    assert.equal((await f.complete(r.body.challengeId, '123456')).code, 400);
    assert.equal(f.writes.length, 0);
    assert.equal((await f.complete(r.body.challengeId, '555666')).code, 200);
    assert.equal((await f.complete(r.body.challengeId, '555666')).code, 400);
});

test('OTP is delivered locally and is never returned in the API response', async () => {
    const f = fixture(), result = await f.request();
    assert.equal(result.code, 200); assert.deepEqual(f.codes, ['123456']); assert.ok(!JSON.stringify(result.body).includes('123456'));
});
test('wrong OTP cannot update credentials', async () => {
    const f = fixture(), r = await f.request(); const result = await f.complete(r.body.challengeId, '555666');
    assert.equal(result.code, 400); assert.equal(f.writes.length, 0);
});
test('OTP locks after five failed attempts', async () => {
    const f = fixture(), r = await f.request();
    for (let i = 0; i < 5; i++) await f.complete(r.body.challengeId, '000000');
    assert.equal((await f.complete(r.body.challengeId)).code, 400); assert.equal(f.writes.length, 0);
});
test('expired OTP is rejected', async () => {
    const f = fixture(), r = await f.request(); f.advance(300001);
    assert.equal((await f.complete(r.body.challengeId)).code, 400); assert.equal(f.writes.length, 0);
});
test('successful OTP is single use and profile has no credentials', async () => {
    const f = fixture(), r = await f.request(); const result = await f.complete(r.body.challengeId);
    assert.equal(result.code, 200); assert.ok(!Object.hasOwn(result.body.user, 'password')); assert.ok(!Object.hasOwn(result.body.user, 'password_hash'));
    assert.equal((await f.complete(r.body.challengeId)).code, 400);
});
test('concurrent requests can consume OTP only once', async () => {
    const f = fixture(), r = await f.request(); const results = await Promise.all([f.complete(r.body.challengeId), f.complete(r.body.challengeId)]);
    assert.deepEqual(results.map(r => r.code).sort(), [200, 400]); assert.equal(f.writes.filter(w => w === 'link').length, 1);
});
test('SMS resend is limited and invalidates previous challenge', async () => {
    const f = fixture(), r = await f.request(); assert.equal((await f.request()).code, 400);
    f.advance(60001); assert.equal((await f.request()).code, 200); assert.equal((await f.complete(r.body.challengeId)).code, 400);
});
test('change password requires valid server-verified session', async () => {
    const f = fixture(); const r = await f.call('changePassword', { currentPassword: 'OldPass123!', newPassword: 'NewPass123!' }, 'forged-token');
    assert.equal(r.code, 400); assert.equal(f.writes.length, 0);
});
test('wrong old password does not update', async () => {
    const f = fixture(); const r = await f.call('changePassword', { currentPassword: 'WrongPass123!', newPassword: 'NewPass123!' }, 'valid-token');
    assert.equal(r.code, 400); assert.equal(f.writes.length, 0);
});
test('DB/Auth error is returned as failure rather than successful password change', async () => {
    const f = fixture(); f.rejectUpdate();
    const r = await f.call('changePassword', { currentPassword: 'OldPass123!', newPassword: 'NewPass123!' }, 'valid-token');
    assert.equal(r.code, 400); assert.equal(r.body.success, false); assert.equal(f.writes.length, 0);
});
test('valid password change returns a sanitized profile', async () => {
    const f = fixture(); const r = await f.call('changePassword', { currentPassword: 'OldPass123!', newPassword: 'NewPass123!' }, 'valid-token');
    assert.equal(r.code, 200); assert.deepEqual(f.writes, [{ password: 'NewPass123!' }]); assert.ok(!JSON.stringify(r.body).includes('NewPass123!'));
});
test('locked customer is denied before any credential write', async () => {
    const f = fixture({ locked: true }); assert.equal((await f.request()).code, 400); assert.equal(f.codes.length, 0);
});
test('staff identity is denied at the customer portal', async () => {
    const f = fixture({ staff: true }); assert.equal((await f.request()).code, 400); assert.equal(f.codes.length, 0);
});
test('failed identity query fails closed', async () => {
    const f = fixture(); f.rejectRead(); assert.equal((await f.request()).code, 400); assert.equal(f.codes.length, 0);
});
test('production OTP is checked by Supabase rather than the simulator', async () => {
    const f = fixture({ simulated: false }), r = await f.request(); assert.equal(f.codes.length, 0);
    assert.equal((await f.complete(r.body.challengeId, '555666')).code, 400);
    assert.equal((await f.complete(r.body.challengeId)).code, 200);
});
test('same password policy applies on the server', () => {
    assert.equal(validPassword('12345678'), false); assert.equal(validPassword('NoNumbers!'), false);
    assert.equal(validPassword('NewPass123!'), true); assert.equal(validPassword('x'.repeat(129) + '1!'), false);
});
test('missing security migration blocks authentication without writes or SMS', async () => {
    const f = fixture(); f.missingMigration(); assert.equal((await f.request()).code, 400); assert.equal(f.codes.length, 0); assert.equal(f.writes.length, 0);
});
test('profile linking failure cannot update the password', async () => {
    const f = fixture(), r = await f.request(); f.rejectLink(); assert.equal((await f.complete(r.body.challengeId)).code, 400); assert.equal(f.writes.length, 0);
});
test('guest record lookup never grants an authenticated session', async () => {
    const f = fixture(); const result = await f.call('guest', { phone: '0912345678', name: 'Khách thử' });
    assert.equal(result.code, 200); assert.ok(result.body.customerId); assert.equal(result.body.session, undefined); assert.equal(result.body.user, undefined); assert.equal(f.writes.length, 0);
});
test('OTP remains valid across independent server instances using a shared store', async () => {
    const f = fixture(), r = await f.request(); f.restart();
    assert.equal((await f.complete(r.body.challengeId)).code, 200);
});
test('rate limit and attempt counts remain after instance restart', async () => {
    const f = fixture(), r = await f.request(); f.restart(); assert.equal((await f.request()).code, 400);
    for (let i = 0; i < 5; i++) { await f.complete(r.body.challengeId, '000000'); f.restart(); }
    assert.equal((await f.complete(r.body.challengeId)).code, 400);
});
test('preview displays OTP only for explicitly allowed test accounts', async () => {
    const f = fixture({ mode: 'preview' }), r = await f.request();
    assert.equal(r.code, 200); assert.equal(r.body.testCode, '123456'); assert.equal(r.body.testMode, true); assert.equal(f.codes.length, 0);
});
test('preview cannot reset a real account even if its phone is allowlisted', async () => {
    const f = fixture({ mode: 'preview', realAccount: true }); assert.equal((await f.request()).code, 400); assert.equal(f.codes.length, 0); assert.equal(f.writes.length, 0);
});
test('non-allowlisted phone cannot use simulated OTP', async () => {
    const f = fixture({ mode: 'preview', allowedPhones: [] }); assert.equal((await f.request()).code, 400); assert.equal(f.writes.length, 0);
});
test('preview simulator is rejected in Vercel production', () => {
    assert.throws(() => runtimeMode({ PAWPAL_SMS_MODE: 'preview', VERCEL_ENV: 'production', PAWPAL_AUTH_TEST_PHONES: '0912345678' }));
    assert.throws(() => runtimeMode({ PAWPAL_SMS_MODE: 'console', NODE_ENV: 'production', PAWPAL_AUTH_TEST_PHONES: '0912345678' }));
    assert.throws(() => runtimeMode({ PAWPAL_SMS_MODE: 'console', NODE_ENV: 'development', VERCEL: '1', PAWPAL_AUTH_TEST_PHONES: '0912345678' }));
    assert.throws(() => runtimeMode({ PAWPAL_SMS_MODE: 'preview', VERCEL_ENV: 'preview' }));
});
test('demo deployment defaults to simulator and can explicitly switch to real SMS', () => {
    assert.equal(runtimeMode({ VERCEL_ENV: 'production' }).mode, 'demo');
    assert.equal(runtimeMode({ PAWPAL_SMS_MODE: 'supabase', VERCEL_ENV: 'production' }).mode, 'supabase');
    assert.equal(runtimeMode({ VERCEL_ENV: 'production' }).randomCode, undefined);
    assert.equal(runtimeMode({ PAWPAL_SMS_MODE: 'preview', VERCEL_ENV: 'preview', PAWPAL_AUTH_TEST_PHONES: '0912345678' }).randomCode(), '555666');
});

test('Explicit guest link follows real verifier and uses verified identity/challenge phone, never client owner',async()=>{
 const links=[],proof={hash:'a'.repeat(64)};let cleared=false,f;
 const guestLink={prepare:()=>proof,validate:async()=>{},complete:async(p,data)=>{assert.equal(f.writes.length,0);links.push({p,data});return 'customer-1';},clear:()=>{cleared=true;}};
 f=fixture({simulated:false,unlinkedGuest:true,guestLink});
 const request=await f.call('requestOtp',{phone:'+84 912 345 678',purpose:'register',linkGuest:true});assert.equal(request.code,200);
 const result=await f.call('completeOtp',{challengeId:request.body.challengeId,code:'123456',password:'NewPass123!',name:'Verified guest',linkGuest:true,authId:'forged',customerId:'forged',phone:'0999999999'});
 assert.equal(result.code,200);assert.equal(links.length,1);assert.deepEqual(links[0],{p:proof,data:{authId:'auth-1',phone:'0912345678',name:'Verified guest'}});assert.ok(!f.writes.includes('link'));assert.equal(cleared,true);assert.equal(result.body.user.id,'customer-1');
});
test('Failed real OTP cannot invoke guest link or update credentials',async()=>{
 let links=0;const guestLink={prepare:()=>({hash:'a'.repeat(64)}),validate:async()=>{},complete:async()=>{links++;},clear:()=>{throw Error('unexpected clear');}};
 const f=fixture({simulated:false,unlinkedGuest:true,guestLink});const request=await f.call('requestOtp',{phone:'0912345678',purpose:'register',linkGuest:true});
 assert.equal((await f.call('completeOtp',{challengeId:request.body.challengeId,code:'000000',password:'NewPass123!',name:'Test',linkGuest:true})).code,400);assert.equal(links,0);assert.equal(f.writes.length,0);
});
test('Demo OTP cannot link a guest, while ordinary demo behavior remains unchanged',async()=>{
 const f=fixture({mode:'demo',unlinkedGuest:true,guestLink:{prepare:()=>{throw Error('must not prepare simulated link');}}});
 const response=await f.call('requestOtp',{phone:'0912345678',purpose:'register',linkGuest:true});assert.equal(response.code,400);assert.match(response.body.message,/không dùng OTP giả lập/);assert.equal(f.writes.length,0);
});
test('Guest link conflict occurs before password writes and retains cookie',async()=>{
 let cleared=false;const guestLink={prepare:()=>({hash:'a'.repeat(64)}),validate:async()=>{},complete:async()=>{throw Error('Guest link conflict');},clear:()=>{cleared=true;}};
 const f=fixture({simulated:false,unlinkedGuest:true,guestLink});const r=await f.call('requestOtp',{phone:'0912345678',purpose:'register',linkGuest:true});
 const response=await f.call('completeOtp',{challengeId:r.body.challengeId,code:'123456',password:'NewPass123!',name:'Test',linkGuest:true});assert.equal(response.code,400);assert.equal(f.writes.length,0);assert.equal(cleared,false);
});
test('Missing guest proof cannot send OTP or invoke link',async()=>{
 const f=fixture({simulated:false,unlinkedGuest:true,guestLink:{prepare:()=>{throw Error('Missing cookie');}}});
 assert.equal((await f.call('requestOtp',{phone:'0912345678',purpose:'register',linkGuest:true})).code,400);assert.equal(f.writes.length,0);
});
test('Password setup failure after linking directs recovery without pretending the profile rolled back',async()=>{
 let linked=false,cleared=false;const f=fixture({simulated:false,unlinkedGuest:true,guestLink:{prepare:()=>({hash:'a'.repeat(64)}),validate:async()=>{},complete:async()=>{linked=true;},clear:()=>{cleared=true;}}});
 const r=await f.call('requestOtp',{phone:'0912345678',purpose:'register',linkGuest:true});f.rejectUpdate();
 const response=await f.call('completeOtp',{challengeId:r.body.challengeId,code:'123456',password:'NewPass123!',name:'Test',linkGuest:true});assert.equal(response.code,400);assert.match(response.body.message,/Quên mật khẩu/);assert.equal(linked,true);assert.equal(cleared,false);
});
