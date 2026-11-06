(function () {
    'use strict';
    const knownRoles = new Set(['ADMIN', 'STAFF']);
    const staffModules = new Set(['Dashboard', 'Khách hàng', 'Thú cưng', 'Dịch vụ', 'Bán hàng', 'Nhân sự', 'Khiếu nại', 'Chatbot']);
    let state = Object.freeze({ role: null, user: null, error: null });
    let pending, revision = 0, lastVerified;
    let signalChannel,signalOwner,signalTimer;
    function stopSignals(){clearTimeout(signalTimer);if(signalChannel){try{window.getSupabaseClient?.()?.removeChannel(signalChannel);}catch{}}signalChannel=null;signalOwner=null;}
    function startSignals(context,user){
        if(context.workspace_signals!==true){stopSignals();return;}
        if(signalChannel&&signalOwner===user.auth_user_id)return;stopSignals();signalOwner=user.auth_user_id;
        let subscribed=false;const owner=signalOwner;
        const refresh=()=>{if(signalOwner!==owner||state.user?.auth_user_id!==owner)return;window.PawpalDataStore?.clear();window.dispatchEvent(new CustomEvent('pawpal:workspace-invalidated'));verify().catch(()=>{});};
        signalChannel=window.getSupabaseClient().channel('workspace-'+owner).on('postgres_changes',{event:'*',schema:'public',table:'workspace_signal',filter:'auth_user_id=eq.'+owner},payload=>{
            const row=payload.new;if(signalOwner!==owner||state.user?.auth_user_id!==owner||row?.auth_user_id!==owner||typeof row.revision!=='string')return;
            clearTimeout(signalTimer);signalTimer=setTimeout(()=>{if(signalOwner!==owner)return;window.PawpalDataStore?.clear();window.dispatchEvent(new CustomEvent('pawpal:workspace-invalidated',{detail:{domain:row.domain}}));verify().catch(()=>{});},180);
        }).subscribe(status=>{if(status==='SUBSCRIBED'){if(subscribed)refresh();subscribed=true;}});
    }

    function clearDisplayIdentity() {
        for (const storage of [localStorage, sessionStorage]) storage.removeItem('pawpal_admin_user');
    }
    function invalidate(error) {
        stopSignals();
        revision++;
        state = Object.freeze({ role: null, user: null, error });
        delete document.documentElement.dataset.adminRole;
        clearDisplayIdentity();
        for (const storage of [localStorage, sessionStorage]) {
            for (const key of Object.keys(storage)) {
                if (/^pawpal_(?:admin_(?!supabase_auth$)|staff_workspace:|copilot_|chatbot_)/.test(key)) storage.removeItem(key);
            }
        }
        window.PawpalDataStore?.clear();
        const db = window.getSupabaseClient?.();
        try { Promise.resolve(db?.removeAllChannels?.()).catch(() => {}); } catch {}
        window.dispatchEvent(new CustomEvent('pawpal:access-invalidated'));
        showError(error);
    }
    async function verify() {
        if (pending) return pending;
        pending = (async () => {
            const turn = revision;
            const db = window.getSupabaseClient?.();
            if (!db) throw Error('Không thể kết nối hệ thống. Vui lòng thử lại.');
            const { data: sessionData, error: sessionError } = await db.auth.getSession();
            if (sessionError || !sessionData?.session) throw Error('Vui lòng đăng nhập lại.');
            const { data: context, error } = await db.rpc('get_staff_login_context');
            const staff = context?.staff, roles = staff?.access_roles;
            if (error) throw Error('Không thể xác minh quyền truy cập. Vui lòng thử lại.');
            const { data: latestSession, error: latestError } = await db.auth.getSession();
            if (turn !== revision || latestError || latestSession?.session?.user?.id !== sessionData.session.user?.id) {
                throw Error('Phiên đăng nhập đã thay đổi. Vui lòng tải lại.');
            }
            if (context?.is_staff !== true || context.is_active !== true || staff?.must_change_password !== false ||
                staff.auth_user_id !== sessionData.session.user?.id || !Array.isArray(roles) || roles.length !== 1 ||
                !knownRoles.has(roles[0]) || !Array.isArray(staff.permission_codes) || !staff.permission_codes.length) {
                throw Error('Tài khoản chưa có quyền sử dụng. Vui lòng đăng nhập lại hoặc liên hệ Quản lý.');
            }
            const previousRole = lastVerified?.role, previousUser = lastVerified?.user;
            const user = Object.freeze({ id: staff.id, rawId: staff.id, auth_user_id: staff.auth_user_id,
                name: staff.full_name, full_name: staff.full_name, phone: staff.phone_number || '', email: staff.email || '',
                role: roles[0].toLowerCase(), system_role: roles[0], access_roles: [...roles],
                position: staff.job_title || '', permissions: [...staff.permission_codes], _source: 'supabase_auth' });
            if (previousRole && (previousRole !== roles[0] || previousUser.id !== user.id || previousUser.auth_user_id !== user.auth_user_id)) {
                const changed = Error('Quyền hoặc tài khoản đã thay đổi. Đang tải lại.');
                invalidate(changed);
                // Destroy old module objects as well as the visible state before using the new identity.
                window.location.reload();
                throw changed;
            }
            state = Object.freeze({ role: roles[0], user, error: null });
            lastVerified = { role: state.role, user: { id: user.id, auth_user_id: user.auth_user_id } };
            for (const storage of [localStorage, sessionStorage]) storage.setItem('pawpal_admin_user', JSON.stringify(user));
            document.documentElement.dataset.adminRole = state.role;
            startSignals(context,user);
            window.dispatchEvent(new CustomEvent('pawpal:access-verified'));
            return state;
        })().catch(error => {
            if (state.error !== error) invalidate(error);
            throw error;
        }).finally(() => { pending = null; });
        return pending;
    }
    function canModule(moduleName) {
        return state.role === 'ADMIN' || state.role === 'STAFF' && staffModules.has(moduleName);
    }
    function applyNavigation() {
        const passwordButton=document.getElementById('btnOwnPassword');if(passwordButton){passwordButton.hidden=!knownRoles.has(state.role);passwordButton.disabled=passwordButton.hidden;}
        document.querySelectorAll('.sidebar-menu-btn').forEach(button => {
            const allowed = canModule(button.dataset.title);
            button.hidden = !allowed;
            button.disabled = !allowed;
            button.setAttribute('aria-hidden', String(!allowed));
        });
    }
    function closeWorkForms() {
        window.PawpalStaffForms?.closeAll();
        window.PawpalStaffBooking?.closeAll();
        window.PawpalStaffIntake?.closeAll();
        window.PawpalCareLog?.closeStaff();
        window.PawpalStaffHandover?.closeAll();
        window.PawpalStaffHotelCheckout?.closeAll();
        window.PawpalStaffSales?.closeAll();
        window.PawpalStaffCashier?.closeAll();
        window.PawpalStaffServiceCashier?.closeAll();
        window.PawpalStaffComplaintMessage?.closeAll();
        window.PawpalStaffComplaintProposal?.closeAll();
        window.PawpalStaffComplaintCreate?.closeAll();
        window.PawpalOwnPassword?.closeAll();
        window.PawpalStaffChatResolution?.closeAll();
        window.PawpalStaffPickup?.closeAll();
        window.PawpalStaffCustomerNote?.closeAll();
        window.PawpalStaffSalesReceipt?.closeAll();
        window.PawpalStaffServiceReceipt?.closeAll();
    }
    function showError(error) {
        closeWorkForms();
        const content = document.querySelector('.admin-preview-content');
        if (!content) return;
        const userTag = document.querySelector('.header-user-tag'); if (userTag) userTag.textContent = 'Chưa xác minh';
        for (const id of ['headerModuleTitle', 'headerSubtabsGroup', 'headerDeepBreadcrumb']) document.getElementById(id)?.replaceChildren();
        const refresh = document.getElementById('btnHeaderRefresh'); if (refresh) refresh.disabled = true;
        document.querySelectorAll('.action-dropdown-menu').forEach(menu => { menu.hidden = true; menu.style.display = 'none'; });
        const wrapper = document.createElement('section'), message = document.createElement('p'), retry = document.createElement('button');
        wrapper.className = 'admin-card'; message.textContent = error?.message || 'Không thể xác minh quyền truy cập.';
        message.style.color = '#DC2626'; retry.className = 'admin-btn admin-btn-secondary'; retry.textContent = 'Thử lại';
        const login = document.createElement('a'); login.href = '/admin/login'; login.textContent = 'Đăng nhập lại'; login.className = 'admin-btn admin-btn-secondary';
        retry.type = 'button'; retry.onclick = () => window.location.reload(); wrapper.append(message, retry, login); content.replaceChildren(wrapper);
        applyNavigation();
    }
    const ready = verify().catch(() => null);
    window.PawpalAdminAccess = Object.freeze({ get state() { return state; }, ready, verify, canModule, applyNavigation, showError, closeWorkForms,
        isAdmin: () => state.role === 'ADMIN', isStaff: () => state.role === 'STAFF' });
    function recheck() {
        if (document.hidden) return;
        verify().catch(showError);
    }
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) recheck(); });
    window.addEventListener('storage', event => {
        if (event.key !== null && !['pawpal_admin_supabase_auth', 'pawpal_admin_access_signal'].includes(event.key)) return;
        if (event.key === 'pawpal_admin_access_signal') { recheck(); return; }
        if (event.key === 'pawpal_admin_supabase_auth' && event.newValue) {
            try {
                const next = JSON.parse(event.newValue), currentId = state.user?.auth_user_id || lastVerified?.user.auth_user_id;
                // This is only a scheduling hint. The RPC still decides whether the session has access.
                if (currentId && next?.user?.id === currentId) { recheck(); return; }
            } catch {}
        }
        invalidate(Error('Phiên đăng nhập đã thay đổi. Đang tải lại.'));
        window.location.reload();
    });
    window.addEventListener('pawpal:auth-logout', () => invalidate(Error('Vui lòng đăng nhập lại.')));
    window.addEventListener('pageshow', event => { if (event.persisted) { invalidate(Error('Đang xác minh lại phiên đăng nhập.')); window.location.reload(); } });
    window.setInterval(() => { if (!document.hidden && document.hasFocus()) recheck(); }, 60000);
})();
