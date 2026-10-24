// Danh sách nhật ký chăm sóc đã lưu trong Supabase.
(function () {
    'use strict';
    const PawpalPets = window.PawpalPets = window.PawpalPets || {};
    PawpalPets.subtabs = PawpalPets.subtabs || {};
    let currentPage = 1;
    const pageSize = 10;
    const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function renderCarelogsTable() {
        const tbody = document.getElementById('petCarelogsListTbody');
        const pager = document.getElementById('petCarelogsPagination');
        if (!tbody) return;
        if (PawpalPets.state.loadError || !PawpalPets.state.isLoaded) {
            if (pager) pager.innerHTML = '';
            if (PawpalPets.state.loadError) {
                delete tbody.dataset.loadingSkeleton;
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-muted);">Không thể tải nhật ký chăm sóc. Vui lòng tải lại trang.</td></tr>';
            } else if (!tbody.querySelector('.skeleton-row')) window.PawpalAdmin?.renderTableSkeleton?.(tbody, {columns:5});
            return;
        }

        // Lazy fetch care logs nếu chưa có
        if (PawpalPets.state.careLogsLoadStatus === 'error') {
            delete tbody.dataset.loadingSkeleton;
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-muted);">Không thể tải nhật ký chăm sóc. Vui lòng tải lại trang.</td></tr>';
            if (pager) pager.innerHTML = '';
            return;
        }
        if (PawpalPets.state.careLogsLoadStatus !== 'loaded' && typeof PawpalPets.fetchCareLogsTab === 'function' && !PawpalPets.state._careLogsFetching) {
            PawpalPets.state._careLogsFetching = true;
            if (!tbody.querySelector('.skeleton-row')) window.PawpalAdmin?.renderTableSkeleton?.(tbody, {columns:5});
            PawpalPets.fetchCareLogsTab().then(() => {
                PawpalPets.state._careLogsFetching = false;
                renderCarelogsTable();
            }).catch(() => {
                PawpalPets.state._careLogsFetching = false;
                renderCarelogsTable();
            });
            return;
        }
        delete tbody.dataset.loadingSkeleton;
        // Nhật ký cũ có thể tham chiếu pet_code (PET-001), còn dữ liệu mới dùng
        // UUID rawId; lập chỉ mục cả hai để luôn nối được bé và chủ nuôi.
        const pets = new Map();
        Object.values(PawpalPets.state.petsData || {}).forEach(pet => {
            if (pet.rawId) pets.set(String(pet.rawId), pet);
            if (pet.code) pets.set(String(pet.code), pet);
        });
        const customers = PawpalPets.state.customersData || {};
        const appointments = new Map((PawpalPets.state.careLogAppointments || []).map(a => [a.id, a]));
        const query = document.getElementById('petCarelogSearch')?.value.trim() || '';
        const logs = (PawpalPets.state.careLogs || []).map(log => {
            const appointment = appointments.get(log.appointment_id);
            const petRef = log.pet_id || appointment?.pet_id;
            const pet = pets.get(String(petRef || ''));
            const owner = customers[pet?.custId || appointment?.customer_id];
            return {log, pet, owner};
        }).filter(({log,pet,owner}) => !query || [pet?.name,pet?.code,owner?.name,owner?.phone,log.description,log.observed_condition,log.health_status].some(value => PawpalPets.matchSearch(value || '', query)))
          .sort((a,b) => (Date.parse(b.log.recorded_at || b.log.created_at) || 0) - (Date.parse(a.log.recorded_at || a.log.created_at) || 0));
        const pages = Math.max(1, Math.ceil(logs.length / pageSize));
        currentPage = Math.min(currentPage, pages);
        if (!logs.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--text-muted);">${query ? 'Không tìm thấy nhật ký phù hợp.' : 'Chưa có nhật ký chăm sóc được lưu.'}</td></tr>`;
            if (pager) pager.innerHTML = '';
            return;
        }
        tbody.innerHTML = logs.slice((currentPage-1)*pageSize, currentPage*pageSize).map(({log,pet,owner}) => `<tr>
            <td>${escapeText(log.recorded_at || log.created_at ? PawpalPets.formatDateTime(log.recorded_at || log.created_at) : '—')}</td>
            <td>${escapeText(pet?.name || 'Chưa có thông tin bé cưng')}<div style="font-size:11.5px;color:var(--text-muted);">${escapeText(pet?.code || '')}</div></td>
            <td>${escapeText(owner?.name || pet?.ownerName || 'Chưa có thông tin chủ nuôi')}</td>
            <td style="white-space:pre-wrap;overflow-wrap:anywhere;">${escapeText(log.description || '—')}</td>
            <td style="white-space:pre-wrap;overflow-wrap:anywhere;">${escapeText(log.observed_condition || log.health_status || '—')}</td>
        </tr>`).join('');
        if (pager) {
            pager.innerHTML = `<button type="button" class="btn-pagination" data-page="${currentPage-1}" ${currentPage===1?'disabled':''}>&lt;</button>` + Array.from({length:pages},(_,i)=>`<button type="button" class="btn-pagination ${i+1===currentPage?'active':''}" data-page="${i+1}">${i+1}</button>`).join('') + `<button type="button" class="btn-pagination" data-page="${currentPage+1}" ${currentPage===pages?'disabled':''}>&gt;</button>`;
            pager.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click',()=>{currentPage=Number(button.dataset.page);renderCarelogsTable();}));
        }
    }
    function initCarelogTab() {
        document.getElementById('petCarelogSearch')?.addEventListener('input',()=>{currentPage=1;renderCarelogsTable();});
        renderCarelogsTable();
    }
    window.addEventListener('pawpal:pets-data-loaded', renderCarelogsTable);
    PawpalPets.subtabs.carelog = {init:initCarelogTab,renderCarelogsTable};
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initCarelogTab);
    else initCarelogTab();
})();
