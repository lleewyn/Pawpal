(function () {
    'use strict';
    const inbox = document.getElementById('complaintNotices');
    if (!inbox) return;
    const toggle = document.getElementById('complaintNoticeToggle');
    const status = document.getElementById('complaintNoticeStatus');
    const list = document.getElementById('complaintNoticeList');
    const currentOwner = () => window.PawpalAdminAccess?.state.user?.id;
    let owner, revision = 0;

    async function refresh() {
        const recipient = currentOwner();
        if (!recipient) return;
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
                        void refresh();
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
        inbox.hidden = !owner;
        inbox.open = false;
        toggle.textContent = 'Thông báo';
        status.textContent = '';
        list.replaceChildren();
        if (owner) void refresh();
    }

    inbox.addEventListener('toggle', () => { if (inbox.open) void refresh(); });
    document.addEventListener('click', event => { if (!inbox.contains(event.target)) inbox.open = false; });
    inbox.addEventListener('keydown', event => {
        if (event.key === 'Escape' && inbox.open) { inbox.open = false; toggle.focus(); }
    });
    window.addEventListener('pawpal:access-verified', syncOwner);
    window.addEventListener('pawpal:access-invalidated', syncOwner);
    window.addEventListener('pawpal:workspace-invalidated', () => { void refresh(); });
    window.addEventListener('focus', () => { void refresh(); });
    syncOwner();
})();
