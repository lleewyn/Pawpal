/**
 * modules/support/support.js - Module logic cho Trung tâm hỗ trợ PawPal (độc lập 100%)
 */
import '/scripts/shared/support-handler.js';
import {vietnamDateTimeInput} from '/scripts/shared/booking-time.mjs';
let disposeSupportView=()=>{};
export function dispose(){disposeSupportView();disposeSupportView=()=>{};}

function ensureSupportReady(callback) {
    if (window.PawPalSupport) {
        callback();
        return;
    }
    document.addEventListener('support_ready', callback, { once: true });
}

export async function copyVoucherWithFeedback(button, code, resetDelay = 2000) {
    if (!button || !code || !navigator.clipboard?.writeText) {
        throw new Error('Trình duyệt không hỗ trợ sao chép mã.');
    }
    await navigator.clipboard.writeText(code);
    button.textContent = 'Đã chép mã!';
    window.setTimeout(() => {
        button.textContent = 'Sao chép mã';
    }, resetDelay);
}

export function initSupportTickets() {
    dispose();
    ensureSupportReady(async () => {
        let activeTicketId = null;
        let viewOwnerId = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null')?.id;
        let currentSelectedRating = 5;
        let currentFilter = 'all';

        const ticketsTableBody = document.getElementById('ticketsListTableBody');
        const ticketsTableArea = document.getElementById('ticketsTableArea');
        const detailModalOverlay = document.getElementById('ticketDetailModalOverlay');
        const detailTicketTitle = document.getElementById('detailTicketTitle');
        const detailTicketIdPill = document.getElementById('detailTicketIdPill');
        const detailTicketStatusBadge = document.getElementById('detailTicketStatusBadge');
        const detailTicketPriorityBadge = document.getElementById('detailTicketPriorityBadge');
        const detailTicketSubmeta = document.getElementById('detailTicketSubmeta');
        const detailTicketContextCard = document.getElementById('detailTicketContextCard');
        const detailTicketResolutionCard = document.getElementById('detailTicketResolutionCard');
        const ticketTimelineMessages = document.getElementById('ticketTimelineMessages');
        const replyEditorArea = document.getElementById('replyEditorArea');
        const ratingFeedbackArea = document.getElementById('ratingFeedbackArea');
        const btnSendReply = document.getElementById('btnSendReply');
        const btnActionCloseTicket = document.getElementById('btnActionCloseTicket');
        const btnCloseDetailPanel = document.getElementById('btnCloseDetailPanel');
        const btnSubmitRating = document.getElementById('btnSubmitRating');
        const createTicketForm = document.getElementById('createTicketForm');
        const fileInput = document.getElementById('ticketFile');

        const countAll = document.getElementById('countAll');
        const countPending = document.getElementById('countPending');
        const countProcessing = document.getElementById('countProcessing');
        const countCompleted = document.getElementById('countCompleted');
        const filterTabs = document.querySelectorAll('.support-filter-tab');

        function renderSkeletonRows() {
            if (!ticketsTableBody) return;
            if (ticketsTableArea) {
                ticketsTableArea.setAttribute('aria-busy', 'true');
                ticketsTableArea.classList.add('support-table-loading');
                ticketsTableArea.classList.remove('support-table-ready');
            }
            ticketsTableBody.innerHTML = `
                <tr>
                    <td><span class="pawpal-skeleton" style="width: 85px; height: 22px;"></span></td>
                    <td>
                        <div class="d-flex flex-column gap-1">
                            <span class="pawpal-skeleton" style="width: 220px; height: 14px;"></span>
                            <span class="pawpal-skeleton" style="width: 130px; height: 12px;"></span>
                        </div>
                    </td>
                    <td class="text-center"><span class="pawpal-skeleton" style="width: 80px; height: 22px;"></span></td>
                    <td class="text-center"><span class="pawpal-skeleton" style="width: 60px; height: 22px;"></span></td>
                    <td class="text-center"><span class="pawpal-skeleton" style="width: 55px; height: 26px;"></span></td>
                </tr>
                <tr>
                    <td><span class="pawpal-skeleton" style="width: 85px; height: 22px;"></span></td>
                    <td>
                        <div class="d-flex flex-column gap-1">
                            <span class="pawpal-skeleton" style="width: 250px; height: 14px;"></span>
                            <span class="pawpal-skeleton" style="width: 140px; height: 12px;"></span>
                        </div>
                    </td>
                    <td class="text-center"><span class="pawpal-skeleton" style="width: 80px; height: 22px;"></span></td>
                    <td class="text-center"><span class="pawpal-skeleton" style="width: 60px; height: 22px;"></span></td>
                    <td class="text-center"><span class="pawpal-skeleton" style="width: 55px; height: 26px;"></span></td>
                </tr>
                <tr>
                    <td><span class="pawpal-skeleton" style="width: 85px; height: 22px;"></span></td>
                    <td><div class="d-flex flex-column gap-1"><span class="pawpal-skeleton" style="width: 190px; height: 14px;"></span><span class="pawpal-skeleton" style="width: 110px; height: 12px;"></span></div></td>
                    <td class="text-center"><span class="pawpal-skeleton" style="width: 80px; height: 22px;"></span></td>
                    <td class="text-center"><span class="pawpal-skeleton" style="width: 60px; height: 22px;"></span></td>
                    <td class="text-center"><span class="pawpal-skeleton" style="width: 55px; height: 26px;"></span></td>
                </tr>
            `;
        }

        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                currentFilter = tab.getAttribute('data-status') || 'all';
                renderSkeletonRows();
                setTimeout(() => {
                    renderTable();
                }, 160);
            });
        });

        function updateCounts(tickets) {
            const allCount = tickets.length;
            const pendingCount = tickets.filter(t => !t.status || t.status === 'pending').length;
            const processingCount = tickets.filter(t => ['processing','waiting_customer','waiting_manager_approval','reprocessing'].includes(t.status)).length;
            const completedCount = tickets.filter(t => t.status === 'completed' || t.status === 'resolved' || t.status === 'closed').length;

            if (countAll) countAll.textContent = `(${allCount})`;
            if (countPending) countPending.textContent = `(${pendingCount})`;
            if (countProcessing) countProcessing.textContent = `(${processingCount})`;
            if (countCompleted) countCompleted.textContent = `(${completedCount})`;
        }

        function escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        // Định dạng mã phiếu hỗ trợ không bị cắt cụt dấu gạch ngang
        function getDisplayTicketId(id) {
            const ticket=window.PawPalSupport.getTickets().find(t=>t.id===id || t.rawId===id);
            if(ticket?.ticketCode)return ticket.ticketCode;
            if (!id) return '';
            if (id.startsWith('TK-')) return id;
            if (id.length <= 10) return id;
            return id.substring(0, 8).toUpperCase();
        }

        // Tách tiêu đề khiếu nại thành phần cốt lõi và phần ngữ cảnh phụ
        function parseTicketTitle(fullTitle) {
            let clean = fullTitle || '';
            let category = '';
            let sub = '';

            const matchPrefix = clean.match(/^\[(.*?)\]\s*(.*)$/);
            if (matchPrefix) {
                category = matchPrefix[1];
                clean = matchPrefix[2];
            }

            if (clean.includes(': ')) {
                const parts = clean.split(': ');
                sub = parts[0].trim();
                clean = parts.slice(1).join(': ').trim();
            }

            return {
                category,
                sub,
                mainTitle: clean || fullTitle
            };
        }

        // Định dạng thời gian gọn gàng không hiển thị giây thô
        function formatDisplayTime(timeStr) {
            if (!timeStr) return '';
            if (timeStr.includes(' - ')) {
                const parts = timeStr.split(' - ');
                return `${parts[0]} • ${parts[1]}`;
            }
            try {
                const value = vietnamDateTimeInput(timeStr);
                if (!value) return timeStr;
                return `${value.slice(11,16)} • ${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`;
            } catch (e) {
                return timeStr;
            }
        }

        function closeTicketModal() {
            const reply = document.getElementById('replyTextarea');
            const comment = document.getElementById('ratingComment');
            if (reply) reply.value = '';
            if (comment) comment.value = '';
            if (detailModalOverlay) {
                detailModalOverlay.classList.add('d-none');
            }
            document.body.classList.remove('ticket-modal-open');
            activeTicketId = null;
        }

        function renderTable() {
            if (!ticketsTableBody) return;
            const allTickets = window.PawPalSupport.getTickets();
            updateCounts(allTickets);

            let tickets = allTickets;
            if (currentFilter === 'pending') {
                tickets = allTickets.filter(t => !t.status || t.status === 'pending');
            } else if (currentFilter === 'processing') {
                tickets = allTickets.filter(t => ['processing','waiting_customer','waiting_manager_approval','reprocessing'].includes(t.status));
            } else if (currentFilter === 'completed') {
                tickets = allTickets.filter(t => t.status === 'completed' || t.status === 'resolved' || t.status === 'closed');
            }

            ticketsTableBody.innerHTML = '';

            if (tickets.length === 0) {
                const emptyMsg = currentFilter === 'all' 
                    ? 'Bạn chưa gửi yêu cầu hỗ trợ nào.' 
                    : `Không có phiếu hỗ trợ nào ở trạng thái "${currentFilter === 'pending' ? 'Chờ xử lý' : (currentFilter === 'processing' ? 'Đang giải quyết' : 'Hoàn tất')}".`;
                ticketsTableBody.innerHTML = `
                    <tr><td colspan="5" class="tickets-empty-cell">
                        <p class="mb-0 text-muted">${emptyMsg}</p>
                    </td></tr>`;
                if (ticketsTableArea) {
                    ticketsTableArea.setAttribute('aria-busy', 'false');
                    ticketsTableArea.classList.remove('support-table-loading');
                    ticketsTableArea.classList.add('support-table-ready');
                }
                return;
            }

            tickets.forEach(ticket => {
                let statusLabel = 'Chờ xử lý';
                let statusClass = 'badge-status-pending';
                if (ticket.status === 'processing' || ticket.status === 'waiting_manager_approval') {
                    statusLabel = 'Đang giải quyết';
                    statusClass = 'badge-status-processing';
                } else if (ticket.status === 'waiting_customer') {
                    statusLabel = 'Chờ bạn phản hồi';
                    statusClass = 'badge-status-waiting';
                } else if (ticket.status === 'reprocessing') {
                    statusLabel = 'Đang can thiệp lần 2';
                    statusClass = 'badge-status-reprocessing';
                } else if (ticket.status === 'resolved') {
                    statusLabel = 'Đã giải quyết';
                    statusClass = 'badge-status-completed';
                } else if (ticket.status === 'completed' || ticket.status === 'closed') {
                    statusLabel = 'Hoàn tất';
                    statusClass = 'badge-status-completed';
                }

                const displayId = getDisplayTicketId(ticket.id);
                const parsed = parseTicketTitle(ticket.title);
                const hasResolution = !!ticket.resolution;
                const isPriorityHigh = ticket.priority === 'Cao';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span class="ticket-id-pill">#${escapeHtml(displayId)}</span></td>
                    <td>
                        <div class="ticket-title-col">
                            <div class="ticket-title-main">${escapeHtml(parsed.mainTitle)}</div>
                            <div class="ticket-title-sub">
                                ${parsed.category ? `<span>${escapeHtml(parsed.category)}</span>` : ''}
                                ${parsed.category && parsed.sub ? `<span class="dot-sep">•</span>` : ''}
                                ${parsed.sub ? `<span>${escapeHtml(parsed.sub)}</span>` : ''}
                                ${hasResolution ? `<span class="badge ms-1" style="background: #DCEEE2; color: #165335; font-size: 11px; padding: 2px 6px; border-radius: 6px; font-weight: 600;">Có phương án</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td class="text-center"><span class="badge-status ${statusClass}">${statusLabel}</span></td>
                    <td class="text-center"><span class="badge-priority ${isPriorityHigh ? 'badge-priority-high' : 'badge-priority-normal'}">${ticket.priority || 'Trung bình'}</span></td>
                    <td class="text-center">
                        <button type="button" class="btn-view-ticket" data-id="${ticket.id}">Chi tiết</button>
                    </td>
                `;

                row.querySelector('.btn-view-ticket').addEventListener('click', () => {
                    showTicketDetail(ticket.id);
                });
                ticketsTableBody.appendChild(row);
            });
            if (ticketsTableArea) {
                ticketsTableArea.setAttribute('aria-busy', 'false');
                ticketsTableArea.classList.remove('support-table-loading');
                ticketsTableArea.classList.remove('support-table-ready');
                void ticketsTableArea.offsetWidth;
                ticketsTableArea.classList.add('support-table-ready');
            }
        }

        disposeSupportView=()=>{
            closeTicketModal(); detailModalOverlay?.remove(); window.PawPalSupport?.stopRealtime?.();
            document.removeEventListener('tickets_updated',onTicketsUpdated);
            document.removeEventListener('support_load_error',onSupportLoadError);
            document.removeEventListener('keydown',onSupportEscape);
            document.getElementById('supportSyncError')?.remove();
        };

        function renderTimelineMessages(ticket) {
            if (!ticketTimelineMessages) return;
            ticketTimelineMessages.innerHTML = '';

            const messages = ticket?.messages || [];
            if (messages.length === 0) {
                ticketTimelineMessages.innerHTML = `
                    <div class="text-center text-muted small py-3">Chưa có tin nhắn trao đổi nào.</div>
                `;
            } else {
                messages.forEach(msg => {
                    const item = document.createElement('div');
                    const isCskh = msg.sender === 'cskh';
                    item.className = `thread-message ${isCskh ? 'message-cskh' : 'message-user'}`;

                    let senderLabel = 'Bạn (Khách hàng)';
                    if (isCskh) {
                        senderLabel = msg.agent ? `Tư vấn viên ${msg.agent}` : 'CSKH PawPal';
                    }

                    const timeStr = formatDisplayTime(msg.time);

                    item.innerHTML = `
                        <div class="thread-message-meta">
                            <span class="sender-tag ${isCskh ? 'sender-cskh' : 'sender-user'}">${escapeHtml(senderLabel)}</span>
                            <span class="thread-time">${escapeHtml(timeStr)}</span>
                        </div>
                        <div class="thread-bubble ${isCskh ? 'bubble-cskh' : 'bubble-user'}">
                            ${escapeHtml(msg.text)}
                        </div>
                    `;
                    ticketTimelineMessages.appendChild(item);
                });
            }
            ticketTimelineMessages.scrollTop = ticketTimelineMessages.scrollHeight;
        }

        function showTicketDetail(ticketId) {
            if (!detailTicketTitle || !ticketTimelineMessages || !replyEditorArea || !ratingFeedbackArea || !detailModalOverlay) {
                return;
            }

            const tickets = window.PawPalSupport.getTickets();
            const ticket = tickets.find(t => t.id === ticketId);
            if (!ticket) return;

            if (activeTicketId !== ticketId) {
                const reply = document.getElementById('replyTextarea');
                if (reply) reply.value = '';
                currentSelectedRating = 5;
            }
            activeTicketId = ticketId;

            const displayId = getDisplayTicketId(ticket.id);
            const parsed = parseTicketTitle(ticket.title);

            let statusLabel = 'Chờ xử lý';
            let statusClass = 'badge-status-pending';
            if (ticket.status === 'processing' || ticket.status === 'waiting_manager_approval') {
                statusLabel = 'Đang giải quyết';
                statusClass = 'badge-status-processing';
            } else if (ticket.status === 'waiting_customer') {
                statusLabel = 'Chờ bạn phản hồi';
                statusClass = 'badge-status-waiting';
            } else if (ticket.status === 'reprocessing') {
                statusLabel = 'Đang can thiệp lần 2';
                statusClass = 'badge-status-reprocessing';
            } else if (ticket.status === 'resolved') {
                statusLabel = 'Đã giải quyết';
                statusClass = 'badge-status-completed';
            } else if (ticket.status === 'completed' || ticket.status === 'closed') {
                statusLabel = 'Hoàn tất';
                statusClass = 'badge-status-completed';
            }

            // Hiển thị banner nhắc nhở khi chờ phản hồi
            const waitingAlertEl = document.getElementById('detailWaitingCustomerAlert');
            if (waitingAlertEl) {
                if (ticket.status === 'waiting_customer') {
                    waitingAlertEl.classList.remove('d-none');
                } else {
                    waitingAlertEl.classList.add('d-none');
                }
            }

            const isPriorityHigh = ticket.priority === 'Cao';

            // 1. Cập nhật Tiêu đề và Badges ở Header
            if (detailTicketIdPill) {
                detailTicketIdPill.textContent = '#' + displayId;
            }
            if (detailTicketStatusBadge) {
                detailTicketStatusBadge.innerHTML = `<span class="badge-status ${statusClass}">${statusLabel}</span>`;
            }
            if (detailTicketPriorityBadge) {
                detailTicketPriorityBadge.innerHTML = `<span class="badge-priority ${isPriorityHigh ? 'badge-priority-high' : 'badge-priority-normal'}">Ưu tiên: ${ticket.priority || 'Trung bình'}</span>`;
            }
            if (detailTicketTitle) {
                detailTicketTitle.textContent = parsed.mainTitle;
            }
            if (detailTicketSubmeta) {
                const createdTime = ticket.createdAt || (ticket.messages?.[0]?.time) || '';
                const timeStr = formatDisplayTime(createdTime);
                detailTicketSubmeta.innerHTML = `${parsed.sub ? escapeHtml(parsed.sub) + ' &bull; ' : ''}${timeStr ? 'Gửi lúc: ' + escapeHtml(timeStr) : ''}`;
            }

            // 2. Render Thẻ Ngữ cảnh Dịch vụ / Đơn hàng
            if (detailTicketContextCard) {
                if (ticket.context && (ticket.context.bookingId || ticket.context.orderId || ticket.context.serviceName)) {
                    detailTicketContextCard.classList.remove('d-none');
                    const isService = !!ticket.context.bookingId || ticket.type === 'service';
                    if (isService) {
                        detailTicketContextCard.innerHTML = `
                            <div class="ticket-context-card">
                                <div class="context-card-header">
                                    <span class="context-type-badge">Ca Dịch vụ liên quan</span>
                                    ${ticket.context.bookingId ? `<a href="#booking-detail?id=${encodeURIComponent(ticket.context.bookingId)}" class="context-link-btn">Xem chi tiết ca này &rarr;</a>` : ''}
                                </div>
                                <div class="context-specs">
                                    <div class="context-spec-item">
                                        <span class="context-spec-label">Gói dịch vụ</span>
                                        <span class="context-spec-val">${escapeHtml(ticket.context.serviceName || 'Dịch vụ Spa/Hotel')}</span>
                                    </div>
                                    ${ticket.context.petName ? `
                                    <div class="context-spec-item">
                                        <span class="context-spec-label">Thú cưng</span>
                                        <span class="context-spec-val">${escapeHtml(ticket.context.petName)}</span>
                                    </div>
                                    ` : ''}
                                    ${ticket.context.bookingId ? `
                                    <div class="context-spec-item">
                                        <span class="context-spec-label">Mã đặt lịch</span>
                                        <span class="context-spec-val mono">#${escapeHtml(ticket.context.bookingId)}</span>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    } else {
                        detailTicketContextCard.innerHTML = `
                            <div class="ticket-context-card">
                                <div class="context-card-header">
                                    <span class="context-type-badge">Đơn hàng Shop liên quan</span>
                                    ${ticket.context.orderId ? `<a href="#order-detail?id=${encodeURIComponent(ticket.context.orderId)}" class="context-link-btn">Xem chi tiết đơn này &rarr;</a>` : ''}
                                </div>
                                <div class="context-specs">
                                    ${ticket.context.orderId ? `
                                    <div class="context-spec-item">
                                        <span class="context-spec-label">Mã đơn hàng</span>
                                        <span class="context-spec-val mono">#${escapeHtml(ticket.context.orderId)}</span>
                                    </div>
                                    ` : ''}
                                    ${ticket.context.productName ? `
                                    <div class="context-spec-item">
                                        <span class="context-spec-label">Sản phẩm phản ánh</span>
                                        <span class="context-spec-val">${escapeHtml(ticket.context.productName)}</span>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }
                } else {
                    detailTicketContextCard.classList.add('d-none');
                    detailTicketContextCard.innerHTML = '';
                }
            }

            // 3. Render Thẻ Phương án giải quyết & Bồi hoàn từ CSKH PawPal
            if (detailTicketResolutionCard) {
                if (ticket.resolution) {
                    detailTicketResolutionCard.classList.remove('d-none');
                    detailTicketResolutionCard.innerHTML = `
                        <div class="ticket-resolution-card">
                            <div class="resolution-header">
                                <h5 class="resolution-title">Phương án giải quyết từ CSKH PawPal</h5>
                                <span class="badge-status badge-status-completed" style="font-size: 11px;">Đã giải quyết</span>
                            </div>
                            <p class="resolution-text">
                                ${escapeHtml(ticket.resolution.note || 'PawPal chân thành xin lỗi vì sự bất tiện của quý khách và đã kích hoạt phương án bồi hoàn trọn vẹn.')}
                            </p>

                            ${ticket.resolution.voucherCode ? `
                            <div class="voucher-comp-card">
                                <div>
                                    <div class="fw-bold mb-1" style="color: #236B48; font-size: 13.5px;">
                                        Mã ưu đãi bồi hoàn: <span class="voucher-code-text">${escapeHtml(ticket.resolution.voucherCode)}</span>
                                    </div>
                                    <div class="text-muted small">Giảm 50% chi phí cho lần trải nghiệm dịch vụ hoặc đơn hàng kế tiếp.</div>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <button type="button" class="btn-copy-voucher" data-code="${escapeHtml(ticket.resolution.voucherCode)}">Sao chép mã</button>
                                    <a href="/pages/shop/shop.html" class="btn-cta text-decoration-none" style="font-size: 12px; padding: 5px 12px; border-radius: 9px;">Dùng ngay</a>
                                </div>
                            </div>
                            ` : ''}

                            ${ticket.resolution.pawpoints ? `
                            <div class="pawpoints-comp-card">
                                <span>Đã cộng bồi hoàn: <strong>+${ticket.resolution.pawpoints} Pawpoints</strong> vào tài khoản của bạn.</span>
                                <a href="#/loyalty" class="text-decoration-none fw-bold" style="color: #236B48; font-size: 12px;">Xem điểm thưởng &rarr;</a>
                            </div>
                            ` : ''}

                            ${ticket.resolution.rmaStatus === 'approved' || ticket.resolution.actionType === 'refund' || ticket.resolution.actionType === 'replacement' ? `
                            <div class="rma-comp-card">
                                <span>PawPal đã duyệt <strong>${ticket.resolution.actionType === 'refund' ? 'Hoàn tiền 100%' : 'Gửi sản phẩm đổi mới'}</strong> cho đơn hàng này. Shipper sẽ liên hệ bạn trong vòng 24h.</span>
                            </div>
                            ` : ''}
                        </div>
                    `;

                    const btnCopy = detailTicketResolutionCard.querySelector('.btn-copy-voucher');
                    if (btnCopy) {
                        btnCopy.addEventListener('click', async (e) => {
                            const code = e.currentTarget.getAttribute('data-code');
                            try {
                                await copyVoucherWithFeedback(btnCopy, code);
                            } catch (error) {
                                console.error('[Support] Không thể sao chép mã bồi hoàn:', error);
                            }
                        });
                    }
                } else {
                    detailTicketResolutionCard.classList.add('d-none');
                    detailTicketResolutionCard.innerHTML = '';
                }
            }

            // 4. Render Luồng hội thoại trao đổi (Conversational Thread)
            renderTimelineMessages(ticket);

            // 5. Quản lý trạng thái Reply và Đánh giá CSKH
            const isCompleted = ticket.status === 'completed' || ticket.status === 'resolved' || ticket.status === 'closed';
            const ratingScoreLabel = document.getElementById('ratingScoreLabel');
            const btnCancelRating = document.getElementById('btnCancelRating');
            const btnCancelRatingAction = document.getElementById('btnCancelRatingAction');

            const ratingLabels = {
                1: '1 / 5 sao (Rất không hài lòng)',
                2: '2 / 5 sao (Chưa hài lòng)',
                3: '3 / 5 sao (Bình thường / Tạm được)',
                4: '4 / 5 sao (Hài lòng)',
                5: '5 / 5 sao (Rất hài lòng)'
            };

            function updateStarDisplay(score, readOnly = false) {
                currentSelectedRating = score;
                const stars = document.querySelectorAll('.star-btn');
                stars.forEach(s => {
                    const val = parseInt(s.getAttribute('data-value'), 10);
                    s.style.color = val <= score ? '#D97706' : '#C3DEC7';
                    s.disabled = readOnly;
                });
                if (ratingScoreLabel) {
                    ratingScoreLabel.textContent = ratingLabels[score] || `${score} / 5 sao`;
                }
            }

            if (isCompleted) {
                replyEditorArea.classList.add('d-none');
                ratingFeedbackArea.classList.remove('d-none');
                if (btnCancelRating) btnCancelRating.classList.toggle('d-none',Boolean(ticket.rating));
                if (btnCancelRatingAction) btnCancelRatingAction.classList.toggle('d-none',Boolean(ticket.rating));

                if (ticket.rating) {
                    updateStarDisplay(ticket.rating, true);
                    const commentInput = document.getElementById('ratingComment');
                    if (commentInput) {
                        commentInput.value = ticket.ratingComment || '';
                        commentInput.disabled = true;
                    }
                    if (btnSubmitRating) {
                        btnSubmitRating.disabled = true;
                        btnSubmitRating.textContent = 'Bạn đã đánh giá';
                        btnSubmitRating.style.opacity = '0.7';
                    }
                } else {
                    updateStarDisplay(currentSelectedRating || 5, false);
                    const commentInput = document.getElementById('ratingComment');
                    if (commentInput) {
                        commentInput.value = '';
                        commentInput.disabled = false;
                    }
                    if (btnSubmitRating) {
                        btnSubmitRating.disabled = false;
                        btnSubmitRating.textContent = 'Gửi đánh giá';
                        btnSubmitRating.style.opacity = '1';
                    }
                }
            } else {
                replyEditorArea.classList.remove('d-none');
                ratingFeedbackArea.classList.add('d-none');
                if (btnCancelRating) btnCancelRating.classList.remove('d-none');
                if (btnCancelRatingAction) btnCancelRatingAction.classList.remove('d-none');
                updateStarDisplay(currentSelectedRating || 5, false);
            }

            // Đảm bảo Modal Overlay được gắn trực tiếp vào document.body để hiển thị chính giữa toàn màn hình
            if (detailModalOverlay.parentNode !== document.body) {
                document.body.appendChild(detailModalOverlay);
            }

            // Hiển thị Popup Modal và khóa cuộn nền trang
            detailModalOverlay.classList.remove('d-none');
            document.body.classList.add('ticket-modal-open');
            ticketTimelineMessages.scrollTop = ticketTimelineMessages.scrollHeight;

            // The shared support channel owns invalidation for list and open detail.
        }

        // Lắng nghe sự kiện đóng Popup Modal
        if (btnCloseDetailPanel) {
            btnCloseDetailPanel.addEventListener('click', closeTicketModal);
        }

        if (detailModalOverlay) {
            detailModalOverlay.addEventListener('click', (e) => {
                if (e.target === detailModalOverlay) {
                    closeTicketModal();
                }
            });
        }

        function onSupportEscape(e) {
            if (e.key === 'Escape' && detailModalOverlay && !detailModalOverlay.classList.contains('d-none')) {
                closeTicketModal();
            }
        }
        document.addEventListener('keydown',onSupportEscape);

        if (btnSendReply) {
            btnSendReply.addEventListener('click', async () => {
                if (btnSendReply.disabled) return;
                const textarea = document.getElementById('replyTextarea');
                if (!textarea) return;
                const text = textarea.value.trim();
                if (!text) return;

                btnSendReply.disabled = true;
                btnSendReply.textContent = 'Đang gửi...';

                const finalContent = text;
                const targetTicketId = activeTicketId;

                try {
                    await window.PawPalSupport.sendTicketReply(targetTicketId, finalContent);
                    if (activeTicketId !== targetTicketId || !textarea.isConnected) return;
                    textarea.value = '';
                    showTicketDetail(activeTicketId);
                    renderTable();
                } catch (error) {
                    if (activeTicketId !== targetTicketId || !textarea.isConnected) return;
                    console.error('[Support] Không thể gửi phản hồi:', error);
                    window.alert(error.message || 'Không thể gửi phản hồi. Vui lòng thử lại.');
                } finally {
                    btnSendReply.disabled = false;
                    btnSendReply.textContent = 'Gửi phản hồi';
                }
            });
        }

        // Chuyển sang chế độ Đóng hỗ trợ và Đánh giá
        if (btnActionCloseTicket) {
            btnActionCloseTicket.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (replyEditorArea) replyEditorArea.classList.add('d-none');
                if (ratingFeedbackArea) {
                    ratingFeedbackArea.classList.remove('d-none');
                    if (btnSubmitRating) {
                        btnSubmitRating.textContent = 'Xác nhận hoàn tất và Đánh giá';
                    }
                    ratingFeedbackArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }

        // Hủy đánh giá / Quay lại khung gửi phản hồi
        const cancelRatingHandler = (e) => {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            closeTicketModal();
        };
        const btnCancelRating = document.getElementById('btnCancelRating');
        const btnCancelRatingAction = document.getElementById('btnCancelRatingAction');
        if (btnCancelRating) btnCancelRating.addEventListener('click', cancelRatingHandler);
        if (btnCancelRatingAction) btnCancelRatingAction.addEventListener('click', cancelRatingHandler);

        const stars = document.querySelectorAll('.star-btn');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.getAttribute('data-value'), 10);
                currentSelectedRating = val;
                stars.forEach(s => {
                    const sVal = parseInt(s.getAttribute('data-value'), 10);
                    s.style.color = sVal <= currentSelectedRating ? '#D97706' : '#C3DEC7';
                });
                const lbl = document.getElementById('ratingScoreLabel');
                const ratingLabels = {
                    1: '1 / 5 sao (Rất không hài lòng)',
                    2: '2 / 5 sao (Chưa hài lòng)',
                    3: '3 / 5 sao (Bình thường / Tạm được)',
                    4: '4 / 5 sao (Hài lòng)',
                    5: '5 / 5 sao (Rất hài lòng)'
                };
                if (lbl) lbl.textContent = ratingLabels[val] || `${val} / 5 sao`;
            });
        });

        if (btnSubmitRating) {
            btnSubmitRating.addEventListener('click', async () => {
                if (!activeTicketId || btnSubmitRating.disabled) return;
                const commentInput = document.getElementById('ratingComment');
                const comment = commentInput ? commentInput.value.trim() : '';

                btnSubmitRating.disabled = true;
                btnSubmitRating.textContent = 'Đang lưu...';
                const targetTicketId = activeTicketId;

                try {
                    await window.PawPalSupport.closeAndRateTicket(targetTicketId, currentSelectedRating, comment);
                    if (activeTicketId !== targetTicketId || !btnSubmitRating.isConnected) return;
                    renderTable();showTicketDetail(activeTicketId);
                } catch(error) { alert(error.message || 'Không thể lưu đánh giá. Vui lòng thử lại.'); }
                finally {const saved=window.PawPalSupport.getTickets().find(t=>t.id===activeTicketId);btnSubmitRating.disabled=Boolean(saved?.rating);btnSubmitRating.textContent=saved?.rating?'Đã đánh giá':'Gửi đánh giá';}
            });
        }

        // Cập nhật bảng dữ liệu khi có thay đổi (triệt tiêu vòng lặp gọi lại loadTickets)
        function onTicketsUpdated(){
            document.getElementById('supportSyncError')?.remove();
            const owner = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null')?.id;
            if (owner !== viewOwnerId) {
                viewOwnerId = owner; closeTicketModal();
                for (const node of [ticketTimelineMessages,detailTicketTitle,detailTicketSubmeta,detailTicketIdPill,detailTicketContextCard,detailTicketResolutionCard]) node?.replaceChildren();
            }
            renderTable();
            if (activeTicketId && !detailModalOverlay?.classList.contains('d-none')) {
                const ticket = window.PawPalSupport.getTickets().find(t => t.id === activeTicketId);
                if (!ticket) { closeTicketModal(); return; }
                const comment = document.getElementById('ratingComment');
                const draft = comment?.value || '';
                showTicketDetail(activeTicketId);
                if (!ticket.rating && comment?.isConnected) comment.value = draft;
            }
        }
        function onSupportLoadError(){
            if (document.getElementById('supportSyncError') || !ticketsTableArea?.isConnected) return;
            const message = document.createElement('p');
            message.id = 'supportSyncError'; message.className = 'text-danger small'; message.setAttribute('role','alert');
            message.textContent = 'Chưa tải được cập nhật mới. Dữ liệu đang hiển thị có thể chưa đầy đủ. Vui lòng tải lại để kiểm tra.';
            ticketsTableArea.before(message);
        }
        document.addEventListener('tickets_updated',onTicketsUpdated);
        document.addEventListener('support_load_error',onSupportLoadError);

        // Lắng nghe sự kiện lưu trữ giữa các Tab (Admin và User)
        renderSkeletonRows();
        try { await window.PawPalSupport.loadTickets(); }
        catch(error) {
            ticketsTableBody.replaceChildren();const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=5;cell.textContent='Không thể tải phiếu hỗ trợ. Vui lòng tải lại trang.';row.appendChild(cell);ticketsTableBody.appendChild(row);ticketsTableArea?.classList.remove('support-table-loading');ticketsTableArea?.setAttribute('aria-busy','false');return;
        }
        if(!ticketsTableBody?.isConnected)return;
        renderTable();

        // Kiểm tra xem có yêu cầu mở trực tiếp mã ticket từ URL / Hash không (?id=...)
        const hashParts = window.location.hash.split('?');
        const urlParams = new URLSearchParams(hashParts[1] || window.location.search);
        const queryTicketId = urlParams.get('id');
        if (queryTicketId) {
            setTimeout(() => {
                showTicketDetail(queryTicketId);
            }, 150);
        }
    });
}
window.initSupportTickets = initSupportTickets;
export const init = initSupportTickets;

