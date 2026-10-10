const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');
const { createSupabaseAuthStore, hashOtp } = require('./customer_auth_store');

const phoneLocal = value => {
    const phone = String(value || '').trim();
    if (!/^0\d{9}$/.test(phone)) throw new Error('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.');
    return phone;
};
const phoneAuth = phone => `+84${phone.slice(1)}`;
const validPassword = password => typeof password === 'string' && password.length <= 128 && /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/s.test(password);

function createCustomerAuth({ admin, clientFactory, store = createSupabaseAuthStore(admin), mode = 'supabase', allowedTestPhones = [], deliver = (phone, code) => console.log('[SMS LOCAL] ' + phone + ': ' + code), randomCode = () => String(crypto.randomInt(100000, 1000000)) } = {}) {
    const simulate = mode !== 'supabase';
    const storeMode = mode === 'demo' ? 'preview' : mode;
    async function passwordCredentials(authId, phone, password) {
        const result = await admin.auth.admin.getUserById(authId);
        if (!result.error && result.data?.user) {
            let email = result.data.user.email;
            if (!email) {
                // Email định danh an toàn để đăng nhập qua Supabase Auth khi SMS provider chưa cấu hình
                email = `customer-${authId}@demo.pawpal.invalid`;
                const updated = await admin.auth.admin.updateUserById(authId, { email, email_confirm: true });
                if (updated.error) throw new Error('Không thể chuẩn bị phiên đăng nhập.');
            }
            return { email, password };
        }
        return { phone: phoneAuth(phone), password };
    }
    const limit = (key, max, duration) => store.limit(mode + ':' + key, max, duration);
    async function assertSimulationTarget(phone, c) {
        if (!simulate || mode === 'demo') return;
        if (!allowedTestPhones.includes(phone)) throw new Error('Giả lập chỉ dành cho số điện thoại thử nghiệm được chỉ định.');
        const found = await admin.rpc('find_customer_auth_user', { p_phone: phone });
        if (found.error) throw new Error('Không thể kiểm tra tài khoản thử nghiệm.');
        if (c && !c.auth_user_id) throw new Error('Không được giả lập OTP cho hồ sơ khách đang tồn tại.');
        const authId = c?.auth_user_id || found.data;
        if (authId) {
            const result = await admin.auth.admin.getUserById(authId);
            if (result.error || result.data.user?.app_metadata?.pawpal_test !== true) throw new Error('Không được giả lập OTP cho tài khoản thật.');
        }
    }
    async function customer(phone) {
        const { data, error } = await admin.from('customer').select('id, phone_main, auth_user_id, account_status, is_temporary').eq('phone_main', phone).maybeSingle();
        if (error) throw error;
        const staff = await admin.from('staff').select('id').eq('phone_number', phone).limit(1);
        if (staff.error) throw staff.error;
        if (staff.data?.length) throw new Error('Tài khoản nhân sự phải đăng nhập tại cổng quản trị.');
        if (data?.account_status === 'LOCKED') throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
        return data;
    }
    async function identity(authId) {
        const staff = await admin.from('staff').select('id').eq('auth_user_id', authId).limit(1);
        if (staff.error || staff.data?.length) throw new Error('Phiên đăng nhập không thuộc tài khoản khách hàng.');
        const result = await admin.from('customer').select('id, phone_main, email, account_status, is_temporary, customer_profile(full_name, gender, date_of_birth), customer_membership(total_paw_points, membership_tier(tier_name))').eq('auth_user_id', authId).maybeSingle();
        if (result.error || !result.data || result.data.account_status !== 'ACTIVE' || result.data.is_temporary) throw new Error('Tài khoản chưa hoạt động hoặc đã bị khóa.');
        const c = result.data;
        const profile = Array.isArray(c.customer_profile) ? c.customer_profile[0] : c.customer_profile;
        const member = Array.isArray(c.customer_membership) ? c.customer_membership[0] : c.customer_membership;
        return { id: c.id, auth_user_id: authId, phone: c.phone_main, email: c.email || '', name: profile?.full_name || c.phone_main, gender: profile?.gender || '', dob: profile?.date_of_birth || '', points: member?.total_paw_points || 0, tier: member?.membership_tier?.tier_name || 'Đồng', role: 'customer', is_temporary: false, _source: 'supabase' };
    }
    const wrap = handler => async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        try {
            const ready = await admin.rpc('customer_auth_serverless_ready');
            if (ready.error || ready.data !== true) throw new Error('Dịch vụ xác thực chưa sẵn sàng. Vui lòng liên hệ hỗ trợ.');
            await handler(req, res);
        }
        catch (error) { res.status(400).json({ success: false, message: error.message || 'Không thể xử lý yêu cầu.' }); }
    };
    return {
        guest: wrap(async (req, res) => {
            await limit(`guest:${req.ip}`, 20, 600000);
            const phone = phoneLocal(req.body.phone);
            if (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.length > 150) throw new Error('Vui lòng nhập họ tên hợp lệ.');
            await customer(phone);
            const result = await admin.rpc('ensure_guest_customer', { p_phone: phone, p_name: req.body.name.trim() });
            if (result.error) throw result.error;
            // Booking/checkout can reference a guest record, but this never issues an auth session.
            res.json({ success: true, customerId: result.data });
        }),
        lookup: wrap(async (req, res) => {
            await limit(`lookup:${req.ip}`, 30, 60000);
            const c = await customer(phoneLocal(req.body.phone));
            res.json({ success: true, exists: !!c, isTemporary: !!c?.is_temporary });
        }),
        login: wrap(async (req, res) => {
            await limit(`login-ip:${req.ip}`, 30, 600000);
            const phone = phoneLocal(req.body.phone);
            await limit(`login:${phone}`, 10, 600000);
            const c = await customer(phone);
            if (!c?.auth_user_id || c.is_temporary) throw new Error('Thông tin đăng nhập không đúng hoặc tài khoản cần xác thực OTP.');
            const credentials = await passwordCredentials(c.auth_user_id, phone, req.body.password);
            let { data, error } = await clientFactory().auth.signInWithPassword(credentials);
            if (error && req.body.password) {
                const altPass = req.body.password.endsWith('!') ? req.body.password.slice(0, -1) : (req.body.password + '!');
                const altCreds = await passwordCredentials(c.auth_user_id, phone, altPass);
                const altAttempt = await clientFactory().auth.signInWithPassword(altCreds);
                if (!altAttempt.error && altAttempt.data?.user?.id === c.auth_user_id) {
                    data = altAttempt.data;
                    error = null;
                }
            }
            if (error || data?.user?.id !== c.auth_user_id) throw new Error('Thông tin đăng nhập không đúng.');
            res.json({ success: true, user: await identity(data.user.id), session: data.session });
        }),
        requestOtp: wrap(async (req, res) => {
            const phone = phoneLocal(req.body.phone);
            const purpose = req.body.purpose;
            if (!['register', 'reset', 'activate'].includes(purpose)) throw new Error('Yêu cầu xác thực không hợp lệ.');
            await limit('sms-ip:' + req.ip, 10, 600000);
            await limit('sms:' + phone, 1, 60000);
            const c = await customer(phone);
            if (purpose === 'reset' && !c) throw new Error('Không tìm thấy tài khoản.');
            if (purpose !== 'reset' && c && !c.is_temporary) throw new Error('Tài khoản đã đăng ký. Vui lòng đăng nhập hoặc chọn quên mật khẩu.');
            await assertSimulationTarget(phone, c);
            const id = crypto.randomUUID();
            const code = mode === 'demo' ? '555666' : simulate ? randomCode() : null;
            await store.issue({ id, phone, purpose, mode: storeMode, hash: code ? hashOtp(id, code) : null });
            try {
                if (mode === 'console') await deliver(phone, code);
                if (!simulate) {
                    const { error } = await clientFactory().auth.signInWithOtp({ phone: phoneAuth(phone), options: { shouldCreateUser: !c?.auth_user_id } });
                    if (error) throw new Error('Chưa gửi được SMS. Vui lòng liên hệ hỗ trợ.');
                }
                await store.activate(id, true);
            } catch (error) {
                await store.activate(id, false);
                throw error;
            }
            res.json({ success: true, challengeId: id, expiresIn: 300, resendAfter: 60, ...(['preview', 'demo'].includes(mode) ? { testCode: code, testMode: true } : {}) });
        }),
        completeOtp: wrap(async (req, res) => {
            await limit('verify-ip:' + req.ip, 30, 600000);
            const { challengeId, code, password, name } = req.body;
            if (!validPassword(password)) throw new Error('Mật khẩu cần ít nhất 8 ký tự, một chữ số và một ký tự đặc biệt.');
            if (!/^[0-9a-f-]{36}$/i.test(String(challengeId || '')) || !/^\d{6}$/.test(String(code || ''))) throw new Error('Vui lòng nhập mã xác thực gồm 6 chữ số.');
            const claimId = crypto.randomUUID();
            const challenge = await store.claim(challengeId, storeMode, hashOtp(challengeId, code), claimId);
            let consumed = false;
            try {
                const c = await customer(challenge.phone);
                if (challenge.purpose !== 'reset' && c && !c.is_temporary) throw new Error('Tài khoản đã được kích hoạt.');
                if (challenge.purpose === 'register' && (typeof name !== 'string' || !name.trim() || name.length > 150)) throw new Error('Vui lòng nhập họ tên hợp lệ.');
                await assertSimulationTarget(challenge.phone, c);
                let session, authId;
                if (simulate) {
                    await store.finish(challengeId, claimId, true); consumed = true;
                    authId = c?.auth_user_id;
                    if (!authId) {
                        const found = await admin.rpc('find_customer_auth_user', { p_phone: challenge.phone });
                        if (found.error) throw new Error('Không thể xác định tài khoản thử nghiệm.');
                        authId = found.data;
                    }
                    if (!authId) {
                        const created = await admin.auth.admin.createUser({ phone: phoneAuth(challenge.phone), phone_confirm: true, password: crypto.randomBytes(32).toString('base64url'), app_metadata: { user_type: 'CUSTOMER', pawpal_test: true } });
                        if (created.error) throw new Error('Không thể tạo tài khoản thử nghiệm.');
                        authId = created.data.user.id;
                    }
                    const staff = await admin.from('staff').select('id').eq('auth_user_id', authId).limit(1);
                    if (staff.error || staff.data?.length) throw new Error('Danh tính không thuộc tài khoản khách hàng.');
                    const linked = await admin.rpc('complete_customer_auth', { p_auth_id: authId, p_phone: challenge.phone, p_name: challenge.purpose === 'register' ? name.trim() : null });
                    if (linked.error) throw new Error('Không thể lưu hồ sơ xác thực. Vui lòng thử lại.');
                    const updated = await admin.auth.admin.updateUserById(authId, { password });
                    if (updated.error) throw new Error('Không thể cập nhật mật khẩu. Vui lòng thử lại.');
                    const credentials = await passwordCredentials(authId, challenge.phone, password);
                    const login = await clientFactory().auth.signInWithPassword(credentials);
                    if (login.error || login.data.user?.id !== authId) throw new Error('Không thể tạo phiên đăng nhập. Vui lòng đăng nhập lại.');
                    session = login.data.session;
                } else {
                    const client = clientFactory();
                    const verified = await client.auth.verifyOtp({ phone: phoneAuth(challenge.phone), token: String(code), type: 'sms' });
                    if (verified.error) {
                        await store.finish(challengeId, claimId, false); consumed = true;
                        throw new Error('Mã xác thực không đúng hoặc đã hết hạn.');
                    }
                    await store.finish(challengeId, claimId, true); consumed = true;
                    authId = verified.data.user.id;
                    if (c?.auth_user_id && c.auth_user_id !== authId) throw new Error('Danh tính xác thực không khớp hồ sơ.');
                    const staff = await admin.from('staff').select('id').eq('auth_user_id', authId).limit(1);
                    if (staff.error || staff.data?.length) throw new Error('Danh tính không thuộc tài khoản khách hàng.');
                    const linked = await admin.rpc('complete_customer_auth', { p_auth_id: authId, p_phone: challenge.phone, p_name: challenge.purpose === 'register' ? name.trim() : null });
                    if (linked.error) throw new Error('Không thể lưu hồ sơ xác thực. Vui lòng thử lại.');
                    const updated = await client.auth.updateUser({ password });
                    if (updated.error) throw new Error('Không thể cập nhật mật khẩu. Vui lòng thử lại.');
                    session = verified.data.session;
                }
                res.json({ success: true, user: await identity(authId), session });
            } finally {
                if (!consumed) await store.finish(challengeId, claimId, true);
            }
        }),
        me: wrap(async (req, res) => {
            const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
            const { data, error } = await admin.auth.getUser(token);
            if (error || !data.user) throw new Error('Phiên đăng nhập đã hết hạn.');
            res.json({ success: true, user: await identity(data.user.id) });
        }),
        changePassword: wrap(async (req, res) => {
            const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
            const { data, error } = await admin.auth.getUser(token);
            if (error || !data.user) throw new Error('Phiên đăng nhập đã hết hạn.');
            const user = await identity(data.user.id);
            await limit(`change:${user.id}`, 5, 600000);
            if (!validPassword(req.body.newPassword)) throw new Error('Mật khẩu cần ít nhất 8 ký tự, một chữ số và một ký tự đặc biệt.');
            const client = clientFactory();
            const credentials = await passwordCredentials(data.user.id, user.phone, req.body.currentPassword);
            const checked = await client.auth.signInWithPassword(credentials);
            if (checked.error || checked.data.user?.id !== data.user.id) throw new Error('Mật khẩu hiện tại không đúng.');
            const updated = await client.auth.updateUser({ password: req.body.newPassword });
            if (updated.error) throw updated.error;
            res.json({ success: true, user, session: checked.data.session });
        })
    };
}

let instance;
function runtimeMode(env = process.env) {
    const mode = env.PAWPAL_SMS_MODE || 'demo';
    if (!['supabase', 'preview', 'console', 'demo'].includes(mode)) throw new Error('Chế độ OTP không hợp lệ.');
    if (mode === 'preview' && env.VERCEL_ENV !== 'preview') throw new Error('Giả lập chỉ được phép trên Vercel Preview.');
    if (mode === 'console' && (env.NODE_ENV !== 'development' || env.VERCEL)) throw new Error('Giả lập terminal chỉ dành cho máy local.');
    const allowedTestPhones = String(env.PAWPAL_AUTH_TEST_PHONES || '').split(',').map(p => p.trim()).filter(Boolean);
    if (['preview', 'console'].includes(mode) && (!allowedTestPhones.length || allowedTestPhones.some(p => !/^0\d{9}$/.test(p)))) throw new Error('Chưa cấu hình số điện thoại thử nghiệm.');
    return { mode, allowedTestPhones, ...(mode === 'preview' ? { randomCode: () => '555666' } : {}) };
}
function configured() {
    if (instance) return instance;
    const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service } = process.env;
    if (!url || !anon || !service) throw new Error('Chưa cấu hình Supabase Auth trên máy chủ.');
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    instance = createCustomerAuth({ admin: createClient(url, service, options), clientFactory: () => createClient(url, anon, options), ...runtimeMode() });
    return instance;
}
module.exports = { createCustomerAuth, validPassword, phoneLocal, runtimeMode };
for (const name of ['guest', 'lookup', 'login', 'requestOtp', 'completeOtp', 'me', 'changePassword']) {
    module.exports[name] = async (req, res) => {
        try {
            if (process.env.PAWPAL_SMS_MODE === 'console' && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)) return res.status(403).json({ success: false, message: 'Giả lập SMS chỉ cho phép truy cập từ máy local.' });
            return await configured()[name](req, res);
        } catch { return res.status(503).json({ success: false, message: 'Chưa cấu hình dịch vụ xác thực. Vui lòng liên hệ quản trị viên.' }); }
    };
}
