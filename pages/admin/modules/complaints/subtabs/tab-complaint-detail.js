// tab-complaint-detail.js - Subtab Hồ sơ khiếu nại 360° Pawpal-er
(function() {
    'use strict';

    const PawpalComplaints = window.PawpalComplaints = window.PawpalComplaints || {};
    PawpalComplaints.subtabs = PawpalComplaints.subtabs || {};

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function openTicketDetail(ticketId) {
        PawpalComplaints.state.currentTicketId = ticketId;
        sessionStorage.setItem('pawpal_admin_complaint_selected_id', ticketId);
        if (PawpalComplaints.switchSubtab) {
            PawpalComplaints.switchSubtab('tab-complaint-detail');
        }
    }

    function renderTicketDetail(ticketId) {
        const serviceComplaints = PawpalComplaints.state?.serviceComplaints || [];
        const orderComplaints = PawpalComplaints.state?.orderComplaints || [];
        const allTickets = [...serviceComplaints, ...orderComplaints];

        const ticket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId) || allTickets[0];
        if (!ticket) return;

        PawpalComplaints.state.currentTicketId = ticket.id;
        sessionStorage.setItem('pawpal_admin_complaint_selected_id', ticket.id);

        if (PawpalComplaints.updateBreadcrumb) {
            PawpalComplaints.updateBreadcrumb(ticket.id);
        }

        // Headline & Meta
        const codeEl = document.getElementById('detailTicketCode');
        const titleEl = document.getElementById('detailTicketTitle');
        const statusBadgeEl = document.getElementById('detailTicketStatusBadge');
        const priorityBadgeEl = document.getElementById('detailTicketPriorityBadge');

        if (codeEl) codeEl.textContent = ticket.id;
        if (titleEl) titleEl.textContent = ticket.title;

        if (statusBadgeEl) {
            let statusText = 'Đang xử lý';
            let badgeClass = 'badge-info';
            if (ticket.status === 'open') { statusText = 'Chờ tiếp nhận'; badgeClass = 'badge-warning'; }
            else if (ticket.status === 'resolved' || ticket.status === 'closed') { statusText = 'Đã giải quyết'; badgeClass = 'badge-success'; }
            statusBadgeEl.className = `admin-badge ${badgeClass}`;
            statusBadgeEl.textContent = statusText;
        }

        if (priorityBadgeEl) {
            priorityBadgeEl.className = `admin-badge ${ticket.priority === 'high' ? 'badge-danger' : (ticket.priority === 'medium' ? 'badge-warning' : 'badge-neutral')}`;
            priorityBadgeEl.textContent = ticket.priority === 'high' ? 'Khẩn cấp' : (ticket.priority === 'medium' ? 'Ưu tiên cao' : 'Bình thường');
        }

        // Thông tin khách hàng & phản ánh
        const custNameEl = document.getElementById('detailComplaintCustomerName');
        const custPhoneEl = document.getElementById('detailComplaintCustomerPhone');
        const relatedItemEl = document.getElementById('detailComplaintRelatedItem');
        const contentEl = document.getElementById('detailComplaintContent');
        const timeEl = document.getElementById('detailComplaintCreatedTime');

        if (custNameEl) custNameEl.textContent = ticket.customerName;
        if (custPhoneEl) custPhoneEl.textContent = ticket.phone;
        if (relatedItemEl) {
            relatedItemEl.textContent = ticket.type === 'service'
                ? `Lịch hẹn: ${ticket.bookingId || '—'} (${ticket.serviceName || 'Dịch vụ'})`
                : `Đơn hàng: ${ticket.orderId || '—'}`;
        }
        if (contentEl) contentEl.textContent = ticket.content || 'Không có mô tả chi tiết.';
        if (timeEl) timeEl.textContent = ticket.createdAt || '—';

        // Danh sách tin nhắn trao đổi
        renderTicketMessages(ticket);

        // Bằng chứng bằng ảnh/video
        renderTicketEvidence(ticket);
    }

    function renderTicketMessages(ticket) {
        const container = document.getElementById('complaintMessagesContainer');
        if (!container) return;

        const messages = ticket.messages || [];
        if (messages.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); padding: 16px; text-align: center; font-size: 13px;">Chưa có trao đổi nào trong ticket này.</div>';
            return;
        }

        container.innerHTML = messages.map(msg => {
            const isStaff = msg.sender_role === 'STAFF' || msg.is_staff;
            return `
                <div class="ticket-message-item ${isStaff ? 'from-staff' : 'from-customer'}" style="margin-bottom: 12px; display: flex; flex-direction: column; align-items: ${isStaff ? 'flex-end' : 'flex-start'};">
                    <div style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 2px;">
                        ${isStaff ? 'CSKH PawPal' : escapeHtml(ticket.customerName)} • ${msg.created_at ? msg.created_at.substring(11, 16) : ''}
                    </div>
                    <div style="padding: 10px 14px; border-radius: 9px; max-width: 80%; background: ${isStaff ? '#EEF5F1' : '#F4FAF6'}; color: var(--text-main); font-size: 13px; line-height: 1.45;">
                        ${escapeHtml(msg.message_body || msg.content || '')}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderTicketEvidence(ticket) {
        const container = document.getElementById('complaintEvidenceContainer');
        if (!container) return;

        const evidence = ticket.evidence || [];
        if (evidence.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 12.5px;">Không có hình ảnh đính kèm.</div>';
            return;
        }

        container.innerHTML = evidence.map(ev => `
            <a href="${ev.url}" target="_blank" style="display: inline-block; margin-right: 8px;">
                <img src="${ev.url}" alt="Bằng chứng" style="width: 60px; height: 60px; border-radius: 9px; object-fit: cover; border: 1px solid var(--border-neutral);">
            </a>
        `).join('');
    }

    function openResolveModal() {
        const modal = document.getElementById('modalResolveComplaint');
        if (!modal) return;
        modal.classList.add('active');
    }

    function initComplaintDetailSubtab() {
        // Nút giải quyết khiếu nại
        const btnOpenResolve = document.getElementById('btnOpenResolveModal');
        if (btnOpenResolve) {
            btnOpenResolve.addEventListener('click', () => openResolveModal());
        }

        // Gửi tin nhắn trả lời khách
        const btnSendMessage = document.getElementById('btnSendComplaintMessage');
        const messageInput = document.getElementById('complaintReplyInput');

        if (btnSendMessage && messageInput) {
            btnSendMessage.addEventListener('click', async () => {
                const text = messageInput.value.trim();
                if (!text) return;

                const ticketId = PawpalComplaints.state?.currentTicketId;
                if (!ticketId) return;

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client) {
                        await client.from('support_ticket_message').insert({
                            ticket_id: ticketId,
                            sender_role: 'STAFF',
                            message_body: text
                        });
                    }
                } catch (e) {}

                messageInput.value = '';
                PawpalComplaints.showToast('Đã gửi phản hồi tới khách hàng!');
            });
        }

        // Submit quyết định giải quyết
        const btnSubmitResolve = document.getElementById('btnSubmitResolveComplaint');
        if (btnSubmitResolve) {
            btnSubmitResolve.addEventListener('click', async () => {
                const modal = document.getElementById('modalResolveComplaint');
                const ticketId = PawpalComplaints.state?.currentTicketId;
                const resolutionText = document.getElementById('resolveSolutionText')?.value.trim();

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client && ticketId) {
                        await client.from('support_ticket').update({
                            status: 'RESOLVED',
                            resolution_note: resolutionText || 'Đã giải quyết thỏa đáng cho khách hàng.'
                        }).eq('ticket_code', ticketId);
                    }
                } catch (e) {}

                await PawpalComplaints.loadComplaintsModuleData();
                renderTicketDetail(ticketId);
                PawpalComplaints.showToast(`Đã đóng khiếu nại ${ticketId} thành công!`);
                if (modal) modal.classList.remove('active');
            });
        }

        const initialTicketId = sessionStorage.getItem('pawpal_admin_complaint_selected_id') || 'TKT-001';
        renderTicketDetail(initialTicketId);
    }

    PawpalComplaints.subtabs.detail = {
        init: initComplaintDetailSubtab,
        openTicketDetail,
        renderTicketDetail,
        openResolveModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComplaintDetailSubtab);
    } else {
        initComplaintDetailSubtab();
    }
})();
