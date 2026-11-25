// tab-settings-audit.js - Subtab Nhật ký Cấu hình và Khóa SSOT (audit_log Supabase)
(function() {
    'use strict';

    const PawpalSettings = window.PawpalSettings = window.PawpalSettings || {};
    PawpalSettings.subtabs = PawpalSettings.subtabs || {};

    let auditPage = 1;
    const SETTINGS_PAGE_SIZE = 10;
    let isAuditInitialized = false;
    let searchTimer;
    const auditLabels = {
        full_name:'Họ và tên',dob:'Ngày sinh',date_of_birth:'Ngày sinh',email:'Email',address:'Địa chỉ',phone_number:'Số điện thoại',
        hire_date:'Ngày vào làm',job_title:'Chức danh',specialization:'Chuyên môn',service_locked:'Khóa phân công dịch vụ',employment_status:'Trạng thái làm việc',
        staff_id:'Mã nhân viên',target_staff_id:'Mã nhân viên',staff_level_id:'Mã cấp bậc',auth_user_id:'Mã tài khoản',
        role:'Vai trò',role_code:'Vai trò',roles:'Vai trò',permissions:'Quyền bổ sung',reason:'Lý do',note:'Ghi chú',
        must_change_password:'Yêu cầu đổi mật khẩu',enable_login:'Cho phép đăng nhập',banned_until:'Khóa đăng nhập đến',
        changed_at:'Thời điểm thay đổi',created_at:'Thời điểm tạo',updated_at:'Thời điểm cập nhật',status:'Trạng thái',
        customer_id:'Mã khách hàng',pet_id:'Mã thú cưng',order_id:'Mã đơn hàng',ticket_id:'Mã phiếu',appointment_id:'Mã lịch hẹn',
        name:'Tên',title:'Tiêu đề',content:'Nội dung',amount:'Số tiền',quantity:'Số lượng',value:'Giá trị',setting_key:'Mục cấu hình',setting_value:'Giá trị cấu hình'
    };
    const auditValues = {ADMIN:'Quản lý',STAFF:'Nhân viên',active:'Đang làm việc',inactive:'Ngừng hoạt động',leave:'Nghỉ phép',paused:'Tạm ngưng',resigned:'Đã nghỉ việc',
        cham_soc_thu_cung:'Chăm sóc thú cưng',ky_thuat_vien:'Kỹ thuật viên',cskh:'Chăm sóc khách hàng',pending:'Chờ xử lý',processing:'Đang xử lý',completed:'Hoàn thành',cancelled:'Đã hủy',
        'Initial explicitly selected access':'Thiết lập quyền truy cập ban đầu'};
    const privateAuditKey = key => /password|token|secret|fingerprint|credential/i.test(key) && key !== 'must_change_password';
    function parseAuditDescription(value) {
        for(let i=0;i<2 && typeof value==='string';i++) { try { value=JSON.parse(value); } catch { break; } }
        return value;
    }
    function formatAuditDescription(description, context={}) {
        const data=parseAuditDescription(description),references=context.references||{},lines=[];
        if(data==null||data==='')return 'Không có nội dung bổ sung.';
        if(typeof data!=='object')return String(data);
        const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
        function valueText(value,key) {
            const decoded=parseAuditDescription(value);if(decoded!==value&&decoded&&typeof decoded==='object')return valueText(decoded,key);
            if(value==null||value==='')return 'Chưa có thông tin';
            if(Array.isArray(value))return value.length?value.map(v=>valueText(v,key)).join(', '):key.includes('role')?'Chưa có vai trò':'Không có';
            if(typeof value==='boolean')return value?'Có':'Không';
            if(references[value])return references[value];
            if(typeof value==='object')return Object.entries(value).filter(([k])=>!privateAuditKey(k)).map(([k,v])=>(auditLabels[k]||'Thông tin bổ sung')+': '+valueText(v,k)).join('; ')||'Không có thông tin';
            if(/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return value.split('-').reverse().join('/');
            if(/_at$|_until$/.test(key)&&Number.isFinite(Date.parse(value)))return new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'});
            return auditValues[value]||String(value);
        }
        function label(key,value) {return references[value]&&['staff_id','target_staff_id'].includes(key)?'Nhân viên':references[value]&&key==='staff_level_id'?'Cấp bậc':auditLabels[key]||'Thông tin bổ sung';}
        function append(object,prefix='') {
            for(const [key,value] of Object.entries(object)) {
                if(privateAuditKey(key)||['request_id','actor_auth_id'].includes(key))continue;
                if(key==='details'&&value&&typeof value==='object'){append(value);continue;}
                if(value&&typeof value==='object'&&!Array.isArray(value)&&('before' in value||'after' in value)) {
                    lines.push(`${prefix}${label(key,value)}: ${'before' in value?valueText(value.before,key):'Không được ghi nhận'} → ${'after' in value?valueText(value.after,key):'Không được ghi nhận'}.`);continue;
                }
                lines.push(`${prefix}${label(key,value)}: ${valueText(value,key)}.`);
            }
        }
        const consumed=new Set();
        for(const [beforeKey,afterKey,key] of [['before_roles','after_roles','roles'],['old_role','new_role','role'],['old_status','new_status','status']]) {
            if(beforeKey in data||afterKey in data){lines.push(`${auditLabels[key]}: ${beforeKey in data?valueText(data[beforeKey],key):'Không được ghi nhận'} → ${afterKey in data?valueText(data[afterKey],key):'Không được ghi nhận'}.`);consumed.add(beforeKey);consumed.add(afterKey);}
        }
        const beforeKey=['before','old','old_values'].find(key=>key in data),afterKey=['after','new','new_values'].find(key=>key in data);
        if(beforeKey||afterKey){
            const before=parseAuditDescription(data[beforeKey]),after=parseAuditDescription(data[afterKey]);
            if(before&&after&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after)) {
                for(const key of new Set([...Object.keys(before),...Object.keys(after)]))if(!privateAuditKey(key)&&!equal(before[key],after[key]))lines.push(`${label(key,after[key])}: ${key in before?valueText(before[key],key):'Không được ghi nhận'} → ${key in after?valueText(after[key],key):'Không được ghi nhận'}.`);
                if(!lines.length)lines.push('Không có thay đổi giá trị được ghi nhận.');
            }else{
                if(beforeKey)lines.push('Trước thay đổi: '+valueText(before,'before')+'.');
                if(afterKey)lines.push('Sau thay đổi: '+valueText(after,'after')+'.');
            }
            consumed.add(beforeKey);consumed.add(afterKey);
        }
        append(Object.fromEntries(Object.entries(data).filter(([key])=>!consumed.has(key))));
        if(!beforeKey&&!afterKey&&['STAFF_PROFILE_SAVE','STAFF_ACCESS_SAVE'].includes(context.action))lines.push('Nhật ký này không lưu giá trị trước thay đổi để đối chiếu.');
        return lines.join('\n')||'Không có nội dung bổ sung.';
    }
    function loadPage(page=1) {
        const request={page,query:(document.getElementById('searchAuditLogInput')?.value||'').trim().slice(0,200),module:document.getElementById('filterAuditTargetModule')?.value||'all'};
        PawpalSettings.state.auditRequest=request;
        if(document.hidden || sessionStorage.getItem('pawpal_admin_active_module')!=='Cấu hình' || sessionStorage.getItem('pawpal_admin_settings_subtab')!=='tab-audit-logs')return;
        return PawpalSettings.fetchAuditData(request);
    }

    function renderSettingsPager(containerId, page, totalPages, onChange) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (totalPages < 1) {
            el.innerHTML = '';
            return;
        }
        // Keep the first/last pages reachable without growing with the log count.
        const pages = new Set([1, totalPages, page]);
        const start = Math.max(2, Math.min(page - 1, totalPages - 3));
        for (let p = start; p <= Math.min(totalPages - 1, start + 2); p++) pages.add(p);
        let previous = 0;
        const numbers = [...pages].sort((a, b) => a - b).map(p => {
            const gap = previous && p - previous > 1 ? '<span class="pagination-ellipsis" aria-hidden="true">…</span>' : '';
            previous = p;
            return `${gap}<button type="button" class="pagination-btn ${p === page ? 'active' : ''}" data-p="${p}" aria-label="Trang ${p}" ${p === page ? 'aria-current="page"' : ''}>${p}</button>`;
        }).join('');
        el.innerHTML = `
            <button type="button" class="pagination-btn ${page === 1 ? 'disabled' : ''}" ${page === 1 ? 'disabled' : ''} data-p="prev" title="Trang trước">&lt;</button>
            ${numbers}
            <button type="button" class="pagination-btn ${page === totalPages ? 'disabled' : ''}" ${page === totalPages ? 'disabled' : ''} data-p="next" title="Trang sau">&gt;</button>
        `;
        el.querySelectorAll('[data-p]').forEach(btn => btn.addEventListener('click', () => {
            const p = btn.dataset.p;
            onChange(p === 'prev' ? page - 1 : p === 'next' ? page + 1 : Number(p));
        }));
    }

    function renderAuditLogs() {
        const tbody = document.getElementById('auditLogTableBody');
        if (!tbody) return;
        tbody.setAttribute('aria-busy',String(Boolean(PawpalSettings.state.auditLoading)));
        if(PawpalSettings.state.auditLoading){
            tbody.innerHTML='<tr><td colspan="5" class="settings-table-message">Đang tải nhật ký…</td></tr>';
            const pager=document.getElementById('auditPaginationControls');if(pager)pager.replaceChildren();
            return;
        }
        if (PawpalSettings.state.auditLoadError) {
            delete tbody.dataset.loadingSkeleton;
            tbody.innerHTML = '<tr><td colspan="5" class="settings-table-message settings-table-message--error">Không tải được nhật ký. <button type="button" class="admin-btn admin-btn-secondary">Thử lại</button></td></tr>';
            tbody.querySelector('button').onclick=()=>PawpalSettings.fetchAuditData({force:true});
            document.getElementById('auditPaginationControls')?.replaceChildren();
            for(const id of ['statTotalAuditLogs','statSyncedAuditLogs','statLastModule']){const node=document.getElementById(id);if(node)node.textContent='—';}
            return;
        }
        if (!PawpalSettings.state.auditMeta) return;
        delete tbody.dataset.loadingSkeleton;

        const auditLogsList = PawpalSettings.state?.auditLogsList || [];
        const isSafeModeLocked = PawpalSettings.state?.isSafeModeLocked;

        const meta=PawpalSettings.state.auditMeta;
        const totalLogs = meta.stats.total;
        const syncedLogs = meta.stats.synced;
        const lastMod = meta.stats.lastModule;

        const totalEl = document.getElementById('statTotalAuditLogs');
        const syncedEl = document.getElementById('statSyncedAuditLogs');
        const lastModEl = document.getElementById('statLastModule');
        const safeModeEl = document.getElementById('statSafeModeStatus');

        if (totalEl) totalEl.textContent = totalLogs;
        if (syncedEl) syncedEl.textContent = syncedLogs;
        if (lastModEl) lastModEl.textContent = lastMod;
        if (safeModeEl) {
            safeModeEl.textContent = isSafeModeLocked ? 'Đang bật' : 'Đã mở';
            safeModeEl.className = isSafeModeLocked ? 'kpi-val text-warning' : 'kpi-val text-success';
        }

        const filtered = auditLogsList;

        const totalPages = Math.max(1, Math.ceil(meta.total / SETTINGS_PAGE_SIZE));
        auditPage=meta.page;
        if (auditPage > totalPages) auditPage = totalPages;
        if (auditPage < 1) auditPage = 1;

        renderSettingsPager('auditPaginationControls', auditPage, totalPages, p => {
            auditPage = p;
            loadPage(p);
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="settings-table-message">Không tìm thấy nhật ký thay đổi nào phù hợp.</td></tr>`;
            return;
        }

        const pageItems = filtered;
        const esc = PawpalSettings.escapeHtml || (s => s);
        pageItems.forEach(log => {
            const rawActor = log.actor || 'Quản trị viên';
            const statusStr = log.status || 'Đã ghi nhận';
            let badgeClass = 'badge-active';
            if (statusStr.includes('Thất bại') || statusStr.includes('Lỗi')) {
                badgeClass = 'badge-danger';
            } else if (statusStr.includes('Chờ') || statusStr.includes('Chưa')) {
                badgeClass = 'badge-warning';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="settings-audit-time">${esc(log.time)}</span></td>
                <td>
                    <strong class="settings-audit-actor-name">${esc(rawActor)}</strong>
                </td>
                <td><span class="admin-badge badge-neutral">${esc(log.targetModules)}</span></td>
                <td><span class="settings-audit-action-text">${esc(log.actionText)}</span><details class="settings-audit-details"><summary class="settings-audit-detail-summary">Xem thay đổi</summary><div class="settings-audit-detail-content">Đang tải…</div></details></td>
                <td><span class="admin-badge ${badgeClass}">${esc(statusStr)}</span></td>
            `;
            tbody.appendChild(tr);
            const details=tr.querySelector('details');let loaded=false,loading=false;
            details.addEventListener('toggle',async()=>{
                if(!details.open||loaded||loading)return;loading=true;
                try{
                    const {data,error}=await PawpalSettings.getSupabaseClient().from('audit_log').select('description').eq('id',log.id).single();if(error)throw error;
                    const parsed=parseAuditDescription(data.description),references={};
                    if(parsed&&typeof parsed==='object'){
                        const staffId=parsed.target_staff_id||parsed.staff_id,levelId=parsed.details?.staff_level_id;
                        if(staffId&&parsed.details?.full_name)references[staffId]=parsed.details.full_name;
                        await Promise.all([
                            staffId&&!references[staffId]?PawpalSettings.getSupabaseClient().from('staff').select('full_name').eq('id',staffId).maybeSingle().then(({data})=>{if(data?.full_name)references[staffId]=data.full_name;}):null,
                            levelId?PawpalSettings.getSupabaseClient().from('staff_level').select('level_name').eq('id',levelId).maybeSingle().then(({data})=>{if(data?.level_name)references[levelId]=data.level_name;}):null
                        ].map(task=>Promise.resolve(task).catch(()=>{})));
                    }
                    details.querySelector('.settings-audit-detail-content').textContent=formatAuditDescription(data.description,{action:log.action,references});loaded=true;
                }catch{details.querySelector('.settings-audit-detail-content').textContent='Chưa tải được nội dung. Đóng và mở lại để thử.';}
                finally{loading=false;}
            });
        });
    }

    function initAuditSubtab() {
        if (isAuditInitialized) {
            renderAuditLogs();
            return;
        }
        isAuditInitialized = true;
        const searchInput=document.getElementById('searchAuditLogInput');if(searchInput)searchInput.maxLength=200;

        // Lọc và tìm kiếm trên Subtab 4: Nhật ký Cấu hình
        document.getElementById('searchAuditLogInput')?.addEventListener('input', () => {
            auditPage = 1;
            clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadPage(1),300);
        });
        document.getElementById('filterAuditTargetModule')?.addEventListener('change', () => {
            auditPage = 1;
            clearTimeout(searchTimer);loadPage(1);
        });

        // Render ban đầu
        renderAuditLogs();
    }

    PawpalSettings.subtabs.audit = {
        init: initAuditSubtab,
        renderAuditLogs,
        formatAuditDescription
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuditSubtab);
    } else {
        initAuditSubtab();
    }
})();
