// staff.js - Phân hệ Quản trị Nhân sự Pawpal-er (Core Orchestrator)
(function() {
    'use strict';

    // Khởi tạo Namespace đồng bộ chuẩn
    const PawpalStaff = window.PawpalStaff = window.PawpalStaff || {};
    window.PawpalStaffModule = PawpalStaff;
    PawpalStaff.subtabs = PawpalStaff.subtabs || {};

    // State dùng chung
    PawpalStaff.state = {
        staff: [],
        assessments: [],
        roster: {},
        shiftRequests: [],
        workstations: [],
        selectedStaffId: sessionStorage.getItem('pawpal_admin_staff_selected_id') || null
    };

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m]);
    }
    PawpalStaff.escapeHtml = escapeHtml;

    // Helper định dạng ngày giờ chuẩn Việt Nam
    function formatDateVN(dateInput) {
        if (!dateInput) return '—';
        if (typeof dateInput === 'string') {
            const s = dateInput.trim();
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
            const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) return `${match[3]}/${match[2]}/${match[1]}`;
        }
        const dateObj = new Date(dateInput);
        if (isNaN(dateObj.getTime())) return String(dateInput);
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    function toUnaccent(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
            .toLowerCase()
            .trim();
    }

    function matchSearch(sourceText, searchTerm) {
        if (!searchTerm) return true;
        if (!sourceText) return false;
        const src = String(sourceText).toLowerCase();
        const query = String(searchTerm).toLowerCase().trim();
        if (src.includes(query)) return true;
        return toUnaccent(sourceText).includes(toUnaccent(searchTerm));
    }

    function showToast(message, type = 'info') {
        let container = document.getElementById('adminToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'adminToastContainer';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const bgColors = {
            success: '#DCEEE2',
            warning: '#F5E8D3',
            danger: '#F7DCDC',
            info: '#DCEAF2'
        };
        const textColors = {
            success: '#165335',
            warning: '#734718',
            danger: '#8F2424',
            info: '#20495E'
        };

        const bg = bgColors[type] || bgColors.info;
        const color = textColors[type] || textColors.info;

        toast.style.cssText = `
            background: ${bg};
            color: ${color};
            padding: 10px 16px;
            border-radius: 9px;
            font-size: 13px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            pointer-events: auto;
            transition: opacity 0.25s ease, transform 0.25s ease;
            opacity: 0;
            transform: translateY(-8px);
            max-width: 360px;
            line-height: 1.45;
        `;
        toast.textContent = message;

        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-8px)';
            setTimeout(() => toast.remove(), 250);
        }, 3500);
    }

    function showStaffConfirmModal({ title = 'Xác nhận thao tác', message, onConfirm, onCancel, confirmText = 'Đồng ý', isDanger = false }) {
        const modal = document.getElementById('modalConfirmStaffAction');
        const titleEl = document.getElementById('confirmStaffActionTitle');
        const msgEl = document.getElementById('confirmStaffActionMessage');
        const btnAccept = document.getElementById('btnAcceptStaffConfirm');
        const btnCancel = document.getElementById('btnCancelStaffConfirm');
        const btnClose = document.getElementById('btnCloseConfirmStaffModal');

        if (!modal) {
            if (window.confirm(message)) {
                if (typeof onConfirm === 'function') onConfirm();
            } else {
                if (typeof onCancel === 'function') onCancel();
            }
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btnAccept) {
            btnAccept.textContent = confirmText;
            if (isDanger) {
                btnAccept.style.backgroundColor = '#DC2626';
                btnAccept.style.color = '#FFFFFF';
            } else {
                btnAccept.style.backgroundColor = '';
                btnAccept.style.color = '';
            }
        }

        const cleanup = () => {
            modal.classList.remove('active');
            if (btnAccept) btnAccept.onclick = null;
            if (btnCancel) btnCancel.onclick = null;
            if (btnClose) btnClose.onclick = null;
        };

        if (btnAccept) {
            btnAccept.onclick = () => {
                cleanup();
                if (typeof onConfirm === 'function') onConfirm();
            };
        }

        if (btnCancel) {
            btnCancel.onclick = () => {
                cleanup();
                if (typeof onCancel === 'function') onCancel();
            };
        }

        if (btnClose) {
            btnClose.onclick = () => {
                cleanup();
                if (typeof onCancel === 'function') onCancel();
            };
        }

        modal.classList.add('active');
    }

    // Export helpers
    PawpalStaff.formatDateVN = formatDateVN;
    PawpalStaff.toUnaccent = toUnaccent;
    PawpalStaff.matchSearch = matchSearch;
    PawpalStaff.showToast = showToast;
    PawpalStaff.showStaffConfirmModal = showStaffConfirmModal;

    function mapDbRoleToStaffRole(dbRole, specialization = '') {
        const r = (dbRole || '').toUpperCase();
        const s = (specialization || '').toLowerCase();
        if (r === 'ADMIN' || r === 'QUAN_TRI_VIEN') return 'Admin';
        if (r === 'MANAGER' || r === 'QUAN_LY') return 'Manager';
        if (r === 'VET' || s.includes('bác sĩ') || s.includes('thú y')) return 'Veterinarian';
        if (r === 'DRIVER' || s.includes('tài xế') || s.includes('taxi')) return 'Driver';
        if (r === 'RECEPTIONIST' || r === 'LE_TAN' || s.includes('lễ tân')) return 'Receptionist';
        if (r === 'CSKH' || r === 'CHAM_SOC_KHACH_HANG' || s.includes('cskh') || s.includes('chăm sóc khách')) return 'CSKH';
        if (r === 'CAREGIVER' || s.includes('bảo mẫu') || s.includes('hotel') || s.includes('lưu trú')) return 'Caregiver';
        if (r === 'GROOMER' || r === 'CHAM_SOC_THU_CUNG' || s.includes('groom') || s.includes('cắt tỉa') || s.includes('spa')) return 'Groomer';
        if (!r && !s) return 'Chưa phân loại';
        return r || 'Chưa phân loại';
    }

    function mapPositionToDbRole(pos) {
        const p = (pos || '').toLowerCase();
        if (p.includes('quản trị') || p.includes('admin')) return 'quan_tri_vien';
        if (p.includes('quản lý') || p.includes('manager')) return 'quan_ly';
        if (p.includes('lễ tân') || p.includes('receptionist')) return 'le_tan';
        if (p.includes('chăm sóc khách') || p.includes('cskh')) return 'cham_soc_khach_hang';
        if (p.includes('chủ') || p.includes('owner')) return 'chu_he_thong';
        return 'cham_soc_thu_cung';
    }
    PawpalStaff.mapPositionToDbRole = mapPositionToDbRole;

    function mapDbRoleToPosition(dbRole, specialization) {
        if (specialization) return specialization;
        const role = mapDbRoleToStaffRole(dbRole, specialization);
        if (role === 'Admin') return 'Quản trị viên';
        if (role === 'Groomer') return 'Kỹ thuật viên Grooming';
        if (role === 'Veterinarian') return 'Bác sĩ thú y';
        if (role === 'Driver') return 'Tài xế Taxi Pet';
        if (role === 'Caregiver') return 'Bảo mẫu Pet Hotel';
        if (role === 'Receptionist') return 'Lễ tân tiếp đón';
        if (role === 'CSKH') return 'Chuyên viên CSKH';
        if (role === 'Chưa phân loại') return 'Chưa phân loại';
        return role;
    }

    // Đồng bộ Supabase Live Database qua PawpalDataStore
    async function fetchStaffRaw({ force = false } = {}) {
        const fetcher = async () => {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu');
            const { data, error } = await client
                .rpc('get_admin_staff_directory');
            if (error) throw error;
            return data || [];
        };

        if (window.PawpalDataStore) {
            return window.PawpalDataStore.fetch('staff:list', fetcher, {
                ttlMs: window.PawpalDataStore.TTL_TIERS.CATALOG,
                backgroundRevalidate: false,
                force
            });
        }
        return fetcher();
    }

    async function readRows(make){
        const result=[];for(let offset=0;;offset+=500){const {data,error}=await make().range(offset,offset+499);if(error)throw error;result.push(...data);if(data.length<500)return result;}
    }
    const client=()=>window.getSupabaseClient();
    PawpalStaff.readRows=readRows;
    PawpalStaff.getStaffWorkingSchedules=id=>(PawpalStaff.state.schedules||[]).filter(s=>s.staff_id===id&&s.schedule_status==='active'&&s.availability_status==='available').sort((a,b)=>Date.parse(a.start_at)-Date.parse(b.start_at));
    PawpalStaff.getNearestStaffSchedule=id=>{const rows=PawpalStaff.getStaffWorkingSchedules(id);return rows.find(s=>Date.parse(s.end_at)>Date.now())||rows[rows.length-1]||null;};
    PawpalStaff.formatStaffSchedule=schedule=>schedule?new Date(schedule.start_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})+' – '+new Date(schedule.end_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}):'Chưa có lịch';
    PawpalStaff.enhanceEntitySelect=function(select){
        if(select._entityInput)return;
        const wrapper=document.createElement('div');wrapper.style.cssText='position:relative;width:100%';select.before(wrapper);
        const input=document.createElement('input');input.className='admin-input';input.autocomplete='off';input.placeholder='Tìm và chọn nhân viên';input.setAttribute('aria-label','Chọn nhân viên');
        const popover=document.createElement('div');popover.className='customer-autocomplete-popover';popover.style.cssText='display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;max-height:240px;overflow:auto;overscroll-behavior:contain;z-index:2500;background:#fff;border:1px solid #ECF2EE;border-radius:9px;box-shadow:0 10px 28px rgba(35,107,72,.14)';
        wrapper.append(select,input,popover);const host=select.closest('.admin-modal-card');if(host){host.style.position='relative';host.append(popover);}select._entityPopover=popover;select.hidden=true;select.style.display='none';select._entityInput=input;
        const render=()=>{if(host){const a=input.getBoundingClientRect(),b=host.getBoundingClientRect(),height=Math.min(240,Math.max(a.top-b.top,b.bottom-a.bottom)-8);popover.style.left=(a.left-b.left)+'px';popover.style.right='auto';popover.style.width=a.width+'px';popover.style.maxHeight=height+'px';popover.style.top=(b.bottom-a.bottom<160?a.top-b.top-height-4:a.bottom-b.top+4)+'px';}popover.replaceChildren();for(const option of [...select.options].filter(o=>o.value&&!o.disabled&&PawpalStaff.matchSearch(o.textContent,input.value))){const button=document.createElement('button');button.type='button';button.className='admin-btn';button.style.cssText='display:block;width:100%;text-align:left;border:none;background:transparent';button.textContent=option.textContent;button.dataset.value=option.value;button.onclick=()=>{select.value=option.value;input.value=option.textContent;popover.style.display='none';select.dispatchEvent(new Event('change',{bubbles:true}));};popover.append(button);}popover.style.display=popover.childElementCount?'block':'none';};
        input.onfocus=render;input.oninput=()=>{select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));render();};input.onblur=()=>setTimeout(()=>popover.style.display='none',120);input.onkeydown=e=>{if(e.key==='Escape')popover.style.display='none';};
        select.addEventListener('change',()=>{if(document.activeElement!==input)input.value=select.value?select.selectedOptions[0]?.textContent||'':'';});input.value=select.value?select.selectedOptions[0]?.textContent||'':'';
    };
    function readStaffResource(name, fetcher, { force = false } = {}) {
        const store = window.PawpalDataStore;
        return store ? store.fetch('staff:' + name + ':' + store.buildKey(name), fetcher, {
            force, ttlMs: store.TTL.OPERATIONAL, backgroundRevalidate: false
        }) : fetcher();
    }
    function staffMonthRange() {
        const local = new Date(Date.now() + 7 * 3600000);
        const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - 7 * 3600000;
        const end = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - 7 * 3600000;
        return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
    }
    let staffLoadSequence = 0;
    const scheduleRangeReads = new Map();
    const scheduleColumns = 'id,staff_id,start_at,end_at,schedule_status,availability_status,reason,updated_at,created_at';
    function readScheduleRange(start, end, options) {
        return readStaffResource('schedules:range:' + start + ':' + end, () => readRows(() => client().from('staff_schedule')
            .select(scheduleColumns).lt('start_at', end).gt('end_at', start).order('start_at').order('id')), options);
    }
    async function fetchSchedulesRaw(options, people = PawpalStaff.state.staff || []) {
        const range = staffMonthRange();
        return readStaffResource('schedules:summary', async () => {
            const now = new Date().toISOString();
            const month = await readScheduleRange(range.start, range.end, options);
            const rows = [...month];
            // Two bounded summaries per person preserve nearest/last shift and assigned filters.
            // Limit concurrency so a large directory does not flood the connection pool.
            for (let index = 0; index < people.length; index += 5) {
                const summaries = await Promise.all(people.slice(index, index + 5).map(async person => {
                    const base = () => client().from('staff_schedule').select(scheduleColumns).eq('staff_id', person.rawId)
                        .eq('schedule_status', 'active').eq('availability_status', 'available');
                    const [next, last] = await Promise.all([
                        base().gt('end_at', now).order('start_at').order('id').limit(1),
                        base().lte('end_at', now).order('start_at', { ascending: false }).order('id', { ascending: false }).limit(1)
                    ]);
                    if (next.error) throw next.error;
                    if (last.error) throw last.error;
                    return [...(next.data || []), ...(last.data || [])];
                }));
                rows.push(...summaries.flat());
            }
            return [...new Map(rows.map(row => [row.id, row])).values()];
        }, options);
    }
    PawpalStaff.ensureScheduleRange = async function(start, end) {
        const key = window.PawpalDataStore?.buildKey('schedule-view', { start, end }) || start + ':' + end;
        const previous = scheduleRangeReads.get(key);
        if (previous?.promise) return previous.promise;
        if (previous?.loadedAt && Date.now() - previous.loadedAt < 30000) return;
        const version = staffLoadSequence;
        const promise = readScheduleRange(start, end).then(rows => {
            if (version !== staffLoadSequence) {
                if (scheduleRangeReads.get(key)?.promise === promise) scheduleRangeReads.delete(key);
                return;
            }
            const retained = (PawpalStaff.state.schedules || []).filter(row => !(Date.parse(row.start_at) < Date.parse(end) && Date.parse(row.end_at) > Date.parse(start)));
            PawpalStaff.state.schedules = [...new Map([...retained, ...rows].map(row => [row.id, row])).values()];
            scheduleRangeReads.set(key, { loadedAt: Date.now() });
        }).catch(error => { scheduleRangeReads.delete(key); throw error; });
        scheduleRangeReads.set(key, { promise });
        return promise;
    };
    PawpalStaff.hasScheduleRange = (start, end) => {
        const entry = scheduleRangeReads.get(window.PawpalDataStore?.buildKey('schedule-view', { start, end }) || start + ':' + end);
        return Boolean(entry?.loadedAt && Date.now() - entry.loadedAt < 30000);
    };
    async function fetchShiftRequestsRaw(options) {
        const count = await readStaffResource('shift_requests:pending-count', async () => {
            const { count, error } = await client().from('staff_shift_request').select('id', { count: 'exact', head: true }).eq('status', 'pending');
            if (error) throw error;
            return count || 0;
        }, options);
        PawpalStaff.state.pendingShiftRequestCount = count;
        return [];
    }
    PawpalStaff.getShiftRequestPage = function(filter = 'ALL', page = 1, { force = false } = {}) {
        const status = ({ PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' })[filter];
        const requested = Math.max(1, Number(page) || 1);
        return readStaffResource('shift_requests:page:' + filter + ':' + requested, async () => {
            const make = () => {
                let query = client().from('staff_shift_request').select('*', { count: 'exact' });
                if (status) query = query.eq('status', status);
                return query.order('created_at', { ascending: false }).order('id');
            };
            const { data, count, error } = await make().range((requested - 1) * 10, requested * 10 - 1);
            if (error) throw error;
            const actual = Math.min(requested, Math.max(1, Math.ceil((count || 0) / 10)));
            if (actual !== requested) return PawpalStaff.getShiftRequestPage(filter, actual, { force });
            const rows = data || [];
            const ids = [...new Set(rows.flatMap(row => [row.shift, row.target_shift]).filter(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))];
            const linked = ids.length ? await readRows(() => client().from('staff_schedule').select(scheduleColumns).in('id', ids).order('id')) : [];
            const person = id => PawpalStaff.state.staff.find(staff => staff.rawId === id);
            const label = id => {
                const row = linked.find(schedule => schedule.id === id);
                return row ? PawpalStaff.formatStaffSchedule(row) : ({ ALL: 'Cả ngày', MORNING: 'Ca sáng', AFTERNOON: 'Ca chiều', EVENING: 'Ca tối' })[id] || 'Ca không còn trong danh sách';
            };
            return { page: actual, total: count || 0, rows: rows.map(row => ({
                ...row, type: row.request_type, staffName: person(row.staff_id)?.name || 'Chưa tải được tên nhân viên',
                swapWithName: person(row.target_staff_id)?.name || '',
                date: row.request_type === 'SWAP' ? formatDateVN(row.start_date) + ' ? ' + formatDateVN(row.target_date)
                    : row.start_date === row.end_date ? formatDateVN(row.start_date) : formatDateVN(row.start_date) + ' ? ' + formatDateVN(row.end_date),
                shiftLabel: row.request_type === 'SWAP' ? label(row.shift) + ' ? ' + label(row.target_shift) : label(row.shift)
            })) };
        }, { force });
    };
    const assessmentHistoryReads = new Map();
    const assessmentBase = () => client().from('staff_assessment').select('*,assessor:assessed_by(full_name)')
        .order('assessment_date', { ascending: false }).order('created_at', { ascending: false }).order('id');
    function assessmentScopeKey(staffId) {
        return window.PawpalDataStore?.buildKey('assessment-history', { staffId: staffId || 'ALL' }) || staffId || 'ALL';
    }
    async function fetchAssessmentsRaw(options, people = []) {
        if (PawpalStaff.state.assessmentsFullLoaded) return readStaffResource('assessments:all', () => readRows(assessmentBase), options);
        return readStaffResource('assessments:summary', async () => {
            const range = staffMonthRange();
            const date = instant => new Date(Date.parse(instant) + 7 * 3600000).toISOString().slice(0, 10);
            const rows = await readRows(() => assessmentBase().gte('assessment_date', date(range.start)).lt('assessment_date', date(range.end)));
            for (let index = 0; index < people.length; index += 5) {
                const latest = await Promise.all(people.slice(index, index + 5).map(async person => {
                    const { data, error } = await assessmentBase().eq('staff_id', person.rawId).limit(1);
                    if (error) throw error;
                    return data || [];
                }));
                rows.push(...latest.flat());
            }
            return [...new Map(rows.map(row => [row.id, row])).values()].sort((a, b) => b.assessment_date.localeCompare(a.assessment_date) || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
        }, options);
    }
    function mapStaffAssessments(rows) {
        return rows.map(a => {
            const staff = PawpalStaff.state.staff.find(s => s.rawId === a.staff_id);
            return { id: a.id, raw: a, date: formatDateVN(a.assessment_date), staff_id: staff?.id || a.staff_id,
                name: staff?.name || '?', position: staff?.position || '?', type: a.assessment_type, score: a.score,
                result: a.result, evaluator: (Array.isArray(a.assessor) ? a.assessor[0] : a.assessor)?.full_name || '?', note: a.note || '' };
        });
    }
    PawpalStaff.hasAssessmentHistory = staffId => {
        const entry = assessmentHistoryReads.get(assessmentScopeKey(staffId));
        return Boolean(entry?.loadedAt && Date.now() - entry.loadedAt < 30000);
    };
    PawpalStaff.ensureAssessmentHistory = async function(staffId = null) {
        const key = assessmentScopeKey(staffId), previous = assessmentHistoryReads.get(key);
        if (previous?.promise) return previous.promise;
        if (PawpalStaff.hasAssessmentHistory(staffId)) return;
        const version = staffLoadSequence;
        const promise = readStaffResource('assessments:history:' + (staffId || 'ALL'), () => readRows(() => staffId ? assessmentBase().eq('staff_id', staffId) : assessmentBase())).then(rows => {
            if (version !== staffLoadSequence) {
                if (assessmentHistoryReads.get(key)?.promise === promise) assessmentHistoryReads.delete(key);
                return;
            }
            const retained = staffId ? (PawpalStaff.state.assessments || []).filter(a => a.raw.staff_id !== staffId) : [];
            PawpalStaff.state.assessments = [...retained, ...mapStaffAssessments(rows)].sort((a, b) => b.raw.assessment_date.localeCompare(a.raw.assessment_date) || b.raw.created_at.localeCompare(a.raw.created_at));
            if (!staffId) PawpalStaff.state.assessmentsFullLoaded = true;
            assessmentHistoryReads.set(key, { loadedAt: Date.now() });
        }).catch(error => { assessmentHistoryReads.delete(key); throw error; });
        assessmentHistoryReads.set(key, { promise });
        return promise;
    };

    async function loadStaffModuleData({ force = false, resources = null } = {}) {
        const sequence = ++staffLoadSequence;
        const refresh = name => ({ force: force && (!resources || resources.includes(name)) });
        if (refresh('shift_requests').force) window.PawpalDataStore?.invalidate('staff:shift_requests*');
        if (refresh('assessments').force) {
            assessmentHistoryReads.clear();
            window.PawpalDataStore?.invalidate('staff:assessments*');
        }
        if (refresh('schedules').force) {
            scheduleRangeReads.clear();
            window.PawpalDataStore?.invalidate('staff:schedules*');
        }
        try {
            const staffData = await fetchStaffRaw(refresh('list'));
            const [schedules, requests, assessments] = await Promise.all([
                fetchSchedulesRaw(refresh('schedules'), staffData.map(entry => ({ rawId: entry.staff_record.id }))),
                fetchShiftRequestsRaw(refresh('shift_requests')),
                fetchAssessmentsRaw(refresh('assessments'), staffData.map(entry => ({ rawId: entry.staff_record.id })))
            ]);

            const referenced = [...new Set(requests.flatMap(request => [request.shift, request.target_shift]).filter(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id) && !schedules.some(row => row.id === id)))];
            for (let offset = 0; offset < referenced.length; offset += 100) {
                const ids = referenced.slice(offset, offset + 100);
                schedules.push(...await readStaffResource('schedules:request-links:' + ids.slice().sort().join(','), () => readRows(() => client().from('staff_schedule').select(scheduleColumns).in('id', ids).order('id')), refresh('schedules')));
            }
            if (sequence !== staffLoadSequence) return;
            const state=PawpalStaff.state;
            state.staff=staffData.map(entry=>{
                const s=entry.staff_record,latest=assessments.find(a=>a.staff_id===s.id);
                const roles=entry.roles||[],primary=roles.find(r=>r.code==='ADMIN')||roles[0];
                return {id:s.id,rawId:s.id,raw:s,name:s.full_name||'—',position:s.job_title||'—',
                    role:mapDbRoleToStaffRole('',s.job_title||s.specialization||''),phone:s.phone_number||'—',email:s.email||'—',shift:'',
                    status:({active:'ACTIVE',leave:'LEAVE',paused:'PAUSE',resigned:'RESIGNED',terminated:'RESIGNED'})[s.employment_status]||s.employment_status,
                    accountStatus:!entry.auth_linked?'unlinked':entry.login_blocked?'da_khoa':'dang_hoat_dong',
                    join_date:s.hire_date?formatDateVN(s.hire_date):'—',dob:s.dob?formatDateVN(s.dob):'—',address:s.address||'—',
                    branch_name:'',avatar:'',skillScore:latest?.score??null,skillResult:latest?.result??null,skillExam:latest?String(latest.score)+'/100':'—',
                    serviceLocked:s.service_locked,note:s.specialization||'',requested_count:null,customer_reviews:[],authUserId:s.auth_user_id,
                    systemRole:primary?.code||'',roles,permissions:entry.permissions||[],lastLoginAt:entry.last_sign_in_at};
            });
            state.assessments = mapStaffAssessments(assessments);
            assessmentHistoryReads.clear();
            if (state.assessmentsFullLoaded) assessmentHistoryReads.set(assessmentScopeKey(null), { loadedAt: Date.now() });
            PawpalStaff.state.workstations = [];

            const requestStaff = id => PawpalStaff.state.staff.find(staff => staff.rawId === id);
            const requestShiftLabel = { ALL: 'Cả ngày', MORNING: 'Ca sáng', AFTERNOON: 'Ca chiều', EVENING: 'Ca tối' };
            const requestScheduleLabel=id=>{const row=schedules.find(s=>s.id===id);return row?new Date(row.start_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})+' – '+new Date(row.end_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'}):requestShiftLabel[id]||'Ca không còn trong danh sách';};
            PawpalStaff.state.shiftRequests = (requests || []).map(row => ({
                ...row,
                type: row.request_type,
                staffName: requestStaff(row.staff_id)?.name || 'Chưa tải được tên nhân viên',
                swapWithName: requestStaff(row.target_staff_id)?.name || '',
                date: row.request_type === 'SWAP' ? PawpalStaff.formatDateVN(row.start_date) + ' → ' + PawpalStaff.formatDateVN(row.target_date)
                    : row.start_date === row.end_date ? PawpalStaff.formatDateVN(row.start_date)
                    : PawpalStaff.formatDateVN(row.start_date) + ' – ' + PawpalStaff.formatDateVN(row.end_date),
                shiftLabel: row.request_type === 'SWAP' ? requestScheduleLabel(row.shift) + ' → ' + requestScheduleLabel(row.target_shift)
                    : requestScheduleLabel(row.shift)
            }));

            PawpalStaff.state.scheduleError = false;
            scheduleRangeReads.clear();
            PawpalStaff.state.schedules = schedules || [];
            PawpalStaff.state.roster = {};
            PawpalStaff.state.isLoaded = true;
            PawpalStaff.state.loadError = null;

            if (PawpalStaff.state.staff.length > 0 && !PawpalStaff.state.staff.some(s => s.id === PawpalStaff.state.selectedStaffId)) {
                PawpalStaff.state.selectedStaffId = PawpalStaff.state.staff[0].id;
            }

            if (PawpalStaff.subtabs?.list?.updateStaffKpis) {
                PawpalStaff.subtabs.list.updateStaffKpis();
            }
            if (PawpalStaff.subtabs?.assessment?.updateAssessmentKPIs) {
                PawpalStaff.subtabs.assessment.updateAssessmentKPIs();
            }

            window.dispatchEvent(new CustomEvent('pawpal:staff-data-loaded', { detail: { count: PawpalStaff.state.staff.length } }));
        } catch (err) {
            if (sequence !== staffLoadSequence) return;
            Object.assign(PawpalStaff.state,{staff:[],assessments:[],schedules:[],shiftRequests:[],isLoaded:false});
            PawpalStaff.state.loadError = 'Không thể tải dữ liệu nhân sự.';
            window.dispatchEvent(new CustomEvent('pawpal:staff-data-loaded'));
            console.error('[PawpalStaff] Lỗi kết nối CSDL Supabase:', err);
        }
    }
    PawpalStaff.loadStaffModuleData = loadStaffModuleData;

    // Lắng nghe mutation liên phân hệ
    if (window.PawpalDataStore) {
        window.PawpalDataStore.subscribeMutations((mutation) => {
            if (mutation.entity === 'staff') {
                window.PawpalDataStore.invalidate('staff:list*');
                window.PawpalDataStore.invalidate('services:staff*');
            } else if (mutation.entity === 'staff_schedule') {
                window.PawpalDataStore.invalidate('staff:schedules*');
                window.PawpalDataStore.invalidate('dashboard:*');
            } else if (mutation.entity === 'staff_shift_request') {
                window.PawpalDataStore.invalidate('staff:shift_requests*');
            }
        });
    }

    PawpalStaff.invalidateCache = function() {
        if (window.PawpalDataStore) {
            window.PawpalDataStore.invalidate('staff:*');
        }
    };

    function updateBreadcrumb(staffName) {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (staffName) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${escapeHtml(staffName)}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }
    PawpalStaff.updateBreadcrumb = updateBreadcrumb;

    function switchSubtab(targetSubtab, updateHistory = true) {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');

        if (subtabsContainer) {
            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
            });
        }

        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Nhân sự') return;
        document.getElementById('subtab-tab-staff-list')?.closest('.admin-module-wrapper')?.querySelectorAll('.subtab-content').forEach(section => {
            section.classList.toggle('active', section.id === `subtab-${targetSubtab}`);
        });

        sessionStorage.setItem('pawpal_admin_staff_active_subtab', targetSubtab);
        if (updateHistory) {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.pushState(null, '', '#' + targetSubtab);
                } catch (e) {
                    window.location.hash = '#' + targetSubtab;
                }
            }
        } else {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.replaceState(null, '', '#' + targetSubtab);
                } catch (e) {}
            }
        }

        if (targetSubtab === 'tab-staff-profile') {
            const currentStaff = (PawpalStaff.state?.staff || []).find(s => s.id === PawpalStaff.state?.selectedStaffId);
            updateBreadcrumb(currentStaff ? currentStaff.name : 'Nhân viên');
            if (PawpalStaff.subtabs.profile?.renderStaffProfile) {
                PawpalStaff.subtabs.profile.renderStaffProfile(PawpalStaff.state?.selectedStaffId);
            }
        } else {
            updateBreadcrumb(null);
        }

        if (targetSubtab === 'tab-staff-list' && PawpalStaff.subtabs.list) {
            PawpalStaff.subtabs.list.renderStaffList();
            PawpalStaff.subtabs.list.renderStaffAlertBar();
        } else if (targetSubtab === 'tab-staff-schedule' && PawpalStaff.subtabs.schedule) {
            PawpalStaff.subtabs.schedule.renderScheduleTable();
        } else if (targetSubtab === 'tab-staff-assessment' && PawpalStaff.subtabs.assessment) {
            PawpalStaff.subtabs.assessment.renderAssessmentList();
        }

        if (window.lucide) lucide.createIcons();
    }
    PawpalStaff.switchSubtab = switchSubtab;

    function openStaffProfile(staffId) {
        PawpalStaff.state.selectedStaffId = staffId;
        sessionStorage.setItem('pawpal_admin_staff_selected_id', staffId);
        switchSubtab('tab-staff-profile');
    }
    PawpalStaff.openStaffProfile = openStaffProfile;
    let _isStaffListenersInitialized = false;

    async function initStaffModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        await loadStaffModuleData();

        if (PawpalStaff.subtabs.list?.renderStaffList) {
            PawpalStaff.subtabs.list.renderStaffList();
            PawpalStaff.subtabs.list.renderStaffAlertBar();
        }
        if (PawpalStaff.subtabs.schedule?.renderScheduleTable) {
            PawpalStaff.subtabs.schedule.renderScheduleTable();
        }
        if (PawpalStaff.subtabs.assessment?.renderAssessmentList) {
            PawpalStaff.subtabs.assessment.renderAssessmentList();
        }

        const savedSubtab = sessionStorage.getItem('pawpal_admin_staff_active_subtab');
        const hashSubtab = window.location.hash ? window.location.hash.substring(1) : '';
        const validTabs = ['tab-staff-list', 'tab-staff-profile', 'tab-staff-schedule', 'tab-staff-assessment'];

        if (validTabs.includes(hashSubtab)) {
            switchSubtab(hashSubtab, false);
        } else if (savedSubtab && validTabs.includes(savedSubtab)) {
            switchSubtab(savedSubtab, false);
        } else {
            switchSubtab('tab-staff-list', false);
        }

        if (!_isStaffListenersInitialized) {
            _isStaffListenersInitialized = true;

            setupStaffRealtimeSync();

            window.addEventListener('admin:subtab-change', (e) => {
                if (e.detail?.module === 'Nhân sự' && validTabs.includes(e.detail.tabId)) {
                    switchSubtab(e.detail.tabId, false);
                }
            });

            // Đóng modalConfirmStaffAction qua data-close-modal, backdrop click, Escape key
            document.querySelectorAll('[data-close-modal="modalConfirmStaffAction"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const modal = document.getElementById('modalConfirmStaffAction');
                    if (modal) modal.classList.remove('active');
                });
            });

            const modalConfirmStaff = document.getElementById('modalConfirmStaffAction');
            if (modalConfirmStaff) {
                modalConfirmStaff.addEventListener('click', (e) => {
                    if (e.target === modalConfirmStaff) {
                        modalConfirmStaff.classList.remove('active');
                    }
                });
            }

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('modalConfirmStaffAction');
                    if (modal && modal.classList.contains('active')) {
                        modal.classList.remove('active');
                    }
                }
            });
        }

        // URL Auto-open v=modal8 hoặc modal=8 hoặc modal=confirm
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('v') === 'modal8' || urlParams.get('modal') === '8' || urlParams.get('modal') === 'confirm') {
            setTimeout(() => {
                showStaffConfirmModal({
                    title: 'Xác nhận khóa an toàn tay nghề',
                    message: 'Khóa an toàn sẽ tạm ngừng gán ca mới cho nhân sự cho đến khi hoàn thành sát hạch nghiệp vụ. Bạn có đồng ý?',
                    confirmText: 'Xác nhận khóa',
                    isDanger: true
                });
            }, 300);
        }
    }

    let _staffRealtimeChannel = null;
    function setupStaffRealtimeSync() {
        if (_staffRealtimeChannel) return;
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client || typeof client.channel !== 'function') return;

        try {
            const triggerStaffSync = (pattern) => {
                const resources = pattern === 'staff:*' ? null : [pattern.replace('staff:', '').replace('*', '')];
                if (window.PawpalDataStore?.handleRealtimeChange) {
                    window.PawpalDataStore.handleRealtimeChange({
                        moduleName: 'Nhân sự',
                        invalidatePattern: pattern || 'staff:*',
                        onActiveRefresh: async () => {
                            await loadStaffModuleData({ force: true, resources });
                            PawpalStaff.subtabs?.list?.renderStaffTable?.();
                            PawpalStaff.subtabs?.list?.updateStaffKPIs?.();
                        },
                        debounceMs: 300
                    });
                } else if (sessionStorage.getItem('pawpal_admin_active_module') === 'Nhân sự') {
                    loadStaffModuleData({ force: true, resources }).then(() => {
                        PawpalStaff.subtabs?.list?.renderStaffTable?.();
                        PawpalStaff.subtabs?.list?.updateStaffKPIs?.();
                    });
                }
            };

            _staffRealtimeChannel = client.channel('admin-staff-live-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => triggerStaffSync('staff:list*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_schedule' }, () => triggerStaffSync('staff:schedules*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_shift_request' }, () => triggerStaffSync('staff:shift_requests*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_assessment' }, () => triggerStaffSync('staff:assessments*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_role' }, () => triggerStaffSync('staff:list*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_permission' }, () => triggerStaffSync('staff:list*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'access_role' }, () => triggerStaffSync('staff:list*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permission' }, () => triggerStaffSync('staff:list*'))
                .subscribe();

            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin-staff-live-sync');

            window.addEventListener('beforeunload', () => {
                if (_staffRealtimeChannel) {
                    client.removeChannel(_staffRealtimeChannel);
                    window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin-staff-live-sync');
                }
            });
        } catch (e) {
            console.warn('[Staff] Lỗi mở kênh realtime:', e);
        }
    }

    PawpalStaff.init = initStaffModule;
    window.initStaffModule = initStaffModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffModule);
    } else {
        initStaffModule();
    }
})();
