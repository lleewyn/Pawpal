(function () {
    'use strict';
    const inbox = document.getElementById('complaintNotices');
    if (!inbox) return;
    const toggle = document.getElementById('complaintNoticeToggle');
    const status = document.getElementById('complaintNoticeStatus');
    const list = document.getElementById('complaintNoticeList');
    const currentOwner = () => window.PawpalAdminAccess?.state.user?.id;
    let owner, revision = 0, inFlight = null, inFlightOwner, lastRefresh = 0, refreshTimer, cooldownTimer, refreshQueued = false;

    async function refresh(force = false) {
        const recipient = currentOwner();
        if (!recipient) return;
        if (inFlight && inFlightOwner === recipient) {
            if (!force) refreshQueued = true;
            return inFlight;
        }
        if (!force && lastRefresh && Date.now() - lastRefresh < 30000) {
            if (!cooldownTimer) cooldownTimer = setTimeout(() => {
                cooldownTimer = undefined;
                void refresh();
            }, 30000 - (Date.now() - lastRefresh));
            return;
        }
        clearTimeout(cooldownTimer);
        cooldownTimer = undefined;
        lastRefresh = Date.now();
        const pending = refreshOnce(recipient);
        inFlight = pending;
        inFlightOwner = recipient;
        try { await pending; } finally {
            if (inFlight === pending) {
                inFlight = null;
                if (refreshQueued && recipient === currentOwner()) {
                    refreshQueued = false;
                    void refresh();
                }
            }
        }
    }

    async function refreshOnce(recipient) {
        const version = ++revision;
        try {
            const { data, error } = await window.getSupabaseClient().rpc('own_complaint_reply_notices');
            if (version !== revision || recipient !== currentOwner()) return;
            if (error) throw error;
            toggle.textContent = data.unread ? 'Thông báo (' + data.unread + ')' : 'Thông báo';
            status.textContent = data.items.length ? '' : 'Chưa có thông báo.';
            const rows = data.items.map(notice => {
                const row = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'btn-header-refresh';
                const message = notice.kind === 'resolution_reply' ? 'Khách phản hồi về phương án của phiếu ' : 'Khách đã bổ sung cho phiếu ';
                button.textContent = (notice.read_at ? '' : 'Mới · ') + message + notice.ticket_code;
                button.onclick = async () => {
                    button.disabled = true;
                    try {
                        if (!notice.read_at) {
                            const { error } = await window.getSupabaseClient().rpc('read_own_complaint_reply_notice', { p_message: notice.message_id });
                            if (error) throw error;
                        }
                        if (recipient !== currentOwner()) return;
                        inbox.open = false;
                        location.hash = 'tab-complaint-detail?id=' + encodeURIComponent(notice.ticket_id);
                        void refresh(true);
                    } catch {
                        if (recipient === currentOwner()) status.textContent = 'Không cập nhật được thông báo. Vui lòng thử lại.';
                    } finally {
                        button.disabled = false;
                    }
                };
                row.append(button);
                return row;
            });
            list.replaceChildren(...rows);
        } catch {
            if (version === revision && recipient === currentOwner()) status.textContent = 'Không tải được thông báo.';
        }
    }

    function syncOwner() {
        const next = currentOwner();
        if (next === owner) return;
        owner = next;
        revision++;
        inFlight = null;
        inFlightOwner = undefined;
        refreshQueued = false;
        lastRefresh = 0;
        clearTimeout(refreshTimer);
        clearTimeout(cooldownTimer);
        cooldownTimer = undefined;
        inbox.hidden = !owner;
        inbox.open = false;
        toggle.textContent = 'Thông báo';
        status.textContent = '';
        list.replaceChildren();
        if (owner) void refresh();
    }

    inbox.addEventListener('toggle', () => { if (inbox.open) void refresh(true); });
    document.addEventListener('click', event => { if (!inbox.contains(event.target)) inbox.open = false; });
    inbox.addEventListener('keydown', event => {
        if (event.key === 'Escape' && inbox.open) { inbox.open = false; toggle.focus(); }
    });
    window.addEventListener('pawpal:access-verified', syncOwner);
    window.addEventListener('pawpal:access-invalidated', syncOwner);
    window.addEventListener('pawpal:workspace-invalidated', event => {
        if (event.detail?.domain && !['support', 'customer'].includes(event.detail.domain)) return;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => { void refresh(); }, 300);
    });
    window.addEventListener('focus', () => { if (inbox.open) void refresh(); });
    syncOwner();
})();
