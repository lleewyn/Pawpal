function ensureSupportReady(callback) {
    if (window.PawPalSupport) {
        callback();
        return;
    }
    document.addEventListener('support_ready', callback, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
    ensureSupportReady(async () => {
        let activeTicketId = null;
        let currentSelectedRating = 5;

        const ticketsTableBody = document.getElementById('ticketsListTableBody');
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
                const d = new Date(timeStr);
                if (isNaN(d.getTime())) return timeStr;
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const mo = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${hh}:${mm} • ${dd}/${mo}/${yyyy}`;
            } catch (e) {
                return timeStr;
            }
        }

        function closeTicketModal() {
            if (detailModalOverlay) {
                detailModalOverlay.classList.add('d-none');
            }
            document.body.classList.remove('ticket-modal-open');
            activeTicketId = null;
        }

        function renderTable() {
            if (!ticketsTableBody) return;
            const tickets = window.PawPalSupport.getTickets();
            ticketsTableBody.innerHTML = '';

            if (tickets.length === 0) {
                ticketsTableBody.innerHTML = `
                    <tr><td colspan="5" class="tickets-empty-cell">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <p>Bạn chưa gửi yêu cầu hỗ trợ nào.</p>
                    </td></tr>`;
                return;
            }

            tickets.forEach(ticket => {
                let statusLabel = 'Chờ xử lý';
                let statusClass = 'badge-status-pending';
                if (ticket.status === 'processing') {
                    statusLabel = 'Đang giải quyết';
                    statusClass = 'badge-status-processing';
                } else if (ticket.status === 'completed' || ticket.status === 'resolved' || ticket.status === 'closed') {
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
        }

        function showTicketDetail(ticketId) {
            if (!detailTicketTitle || !ticketTimelineMessages || !replyEditorArea || !ratingFeedbackArea || !detailModalOverlay) {
                return;
            }

            const tickets = window.PawPalSupport.getTickets();
            const ticket = tickets.find(t => t.id === ticketId);
            if (!ticket) return;

            activeTicketId = ticketId;

            const displayId = getDisplayTicketId(ticket.id);
            const parsed = parseTicketTitle(ticket.title);

            let statusLabel = 'Chờ xử lý';
            let statusClass = 'badge-status-pending';
            if (ticket.status === 'processing') {
                statusLabel = 'Đang giải quyết';
                statusClass = 'badge-status-processing';
            } else if (ticket.status === 'completed' || ticket.status === 'resolved' || ticket.status === 'closed') {
                statusLabel = 'Hoàn tất';
                statusClass = 'badge-status-completed';
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
                detailTicketSubmeta.innerHTML = `${parsed.sub ? parsed.sub + ' &bull; ' : ''}${timeStr ? 'Gửi lúc: ' + timeStr : ''}`;
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
                                    ${ticket.context.bookingId ? `<a href="../booking-detail/booking-detail.html?id=${encodeURIComponent(ticket.context.bookingId)}" class="context-link-btn">Xem chi tiết ca này &rarr;</a>` : ''}
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
                                    ${ticket.context.orderId ? `<a href="../order-detail/order-detail.html?orderId=${encodeURIComponent(ticket.context.orderId)}" class="context-link-btn">Xem chi tiết đơn này &rarr;</a>` : ''}
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
                                    <a href="../../shop/catalog/shop.html" class="btn-cta text-decoration-none" style="font-size: 12px; padding: 5px 12px; border-radius: 9px;">Dùng ngay</a>
                                </div>
                            </div>
                            ` : ''}

                            ${ticket.resolution.pawpoints ? `
                            <div class="pawpoints-comp-card">
                                <span>Đã cộng bồi hoàn: <strong>+${ticket.resolution.pawpoints} Pawpoints</strong> vào tài khoản của bạn.</span>
                                <a href="../pawpoint/pawpoint.html" class="text-decoration-none fw-bold" style="color: #236B48; font-size: 12px;">Xem điểm thưởng &rarr;</a>
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
                        btnCopy.addEventListener('click', (e) => {
                            const code = e.currentTarget.getAttribute('data-code');
                            if (code && navigator.clipboard) {
                                navigator.clipboard.writeText(code).then(() => {
                                    btnCopy.textContent = 'Đã chép mã!';
                                    setTimeout(() => {
                                        btnCopy.textContent = 'Sao chép mã';
                                    }, 2000);
                                });
                            }
                        });
                    }
                } else {
                    detailTicketResolutionCard.classList.add('d-none');
                    detailTicketResolutionCard.innerHTML = '';
                }
            }

            // 4. Render Luồng hội thoại trao đổi (Conversational Thread)
            ticketTimelineMessages.innerHTML = '';

            const messages = ticket.messages || [];
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

            // 5. Quản lý trạng thái Reply và Đánh giá CSKH
            const isCompleted = ticket.status === 'completed' || ticket.status === 'resolved' || ticket.status === 'closed';
            if (isCompleted) {
                replyEditorArea.classList.add('d-none');
                ratingFeedbackArea.classList.remove('d-none');

                if (ticket.rating) {
                    const stars = document.querySelectorAll('.star-btn');
                    stars.forEach(s => {
                        const val = parseInt(s.getAttribute('data-value'), 10);
                        s.style.color = val <= ticket.rating ? '#D97706' : '#C3DEC7';
                        s.disabled = true;
                    });
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
                    const stars = document.querySelectorAll('.star-btn');
                    stars.forEach(s => {
                        const val = parseInt(s.getAttribute('data-value'), 10);
                        s.style.color = val <= currentSelectedRating ? '#D97706' : '#C3DEC7';
                        s.disabled = false;
                    });
                    const commentInput = document.getElementById('ratingComment');
                    if (commentInput) {
                        commentInput.value = '';
                        commentInput.disabled = false;
                    }
                    if (btnSubmitRating) {
                        btnSubmitRating.disabled = false;
                        btnSubmitRating.textContent = 'Chấp nhận giải pháp và Đánh giá';
                        btnSubmitRating.style.opacity = '1';
                    }
                }
            } else {
                replyEditorArea.classList.remove('d-none');
                ratingFeedbackArea.classList.add('d-none');
            }

            // Hiển thị Popup Modal và khóa cuộn nền trang
            detailModalOverlay.classList.remove('d-none');
            document.body.classList.add('ticket-modal-open');
            ticketTimelineMessages.scrollTop = ticketTimelineMessages.scrollHeight;
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

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && detailModalOverlay && !detailModalOverlay.classList.contains('d-none')) {
                closeTicketModal();
            }
        });

        if (btnSendReply) {
            btnSendReply.addEventListener('click', async () => {
                const textarea = document.getElementById('replyTextarea');
                if (!textarea) return;
                const text = textarea.value;
                if (!text.trim()) return;

                btnSendReply.disabled = true;
                btnSendReply.textContent = 'Đang gửi...';

                await window.PawPalSupport.sendTicketReply(activeTicketId, text);
                textarea.value = '';
                btnSendReply.disabled = false;
                btnSendReply.textContent = 'Gửi phản hồi';

                showTicketDetail(activeTicketId);
                renderTable();
            });
        }

        if (btnActionCloseTicket) {
            btnActionCloseTicket.addEventListener('click', () => {
                if (replyEditorArea) replyEditorArea.classList.add('d-none');
                if (ratingFeedbackArea) {
                    ratingFeedbackArea.classList.remove('d-none');
                    if (btnSubmitRating) {
                        btnSubmitRating.textContent = 'Đóng hỗ trợ và Đánh giá';
                    }
                }
            });
        }

        const stars = document.querySelectorAll('.star-btn');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                currentSelectedRating = parseInt(star.getAttribute('data-value'), 10);
                stars.forEach(s => {
                    const val = parseInt(s.getAttribute('data-value'), 10);
                    s.style.color = val <= currentSelectedRating ? '#D97706' : '#C3DEC7';
                });
            });
        });

        if (btnSubmitRating) {
            btnSubmitRating.addEventListener('click', async () => {
                if (!activeTicketId) return;
                const commentInput = document.getElementById('ratingComment');
                const comment = commentInput ? commentInput.value : '';

                btnSubmitRating.disabled = true;
                btnSubmitRating.textContent = 'Đang lưu...';

                await window.PawPalSupport.closeAndRateTicket(activeTicketId, currentSelectedRating, comment);
                alert('PawPal chân thành cảm ơn phản hồi của bạn! Ý kiến của bạn giúp chúng tôi ngày một hoàn thiện hơn.');
                
                renderTable();
                showTicketDetail(activeTicketId);
            });
        }

        document.addEventListener('tickets_updated', async () => {
            await window.PawPalSupport.loadTickets();
            renderTable();
            if (activeTicketId && detailModalOverlay && !detailModalOverlay.classList.contains('d-none')) {
                showTicketDetail(activeTicketId);
            }
        });

        // Lắng nghe sự kiện lưu trữ giữa các Tab (Admin và User)
        window.addEventListener('storage', async (e) => {
            if (e.key === 'pawpal_support_tickets' || e.key === 'pawpal_service_complaints' || e.key === 'pawpal_order_complaints') {
                await window.PawPalSupport.loadTickets();
                renderTable();
                if (activeTicketId && detailModalOverlay && !detailModalOverlay.classList.contains('d-none')) {
                    showTicketDetail(activeTicketId);
                }
            }
        });

        if (createTicketForm) {
            createTicketForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('ticketTitle').value.trim();
                const type = document.getElementById('ticketType').value;
                const content = document.getElementById('ticketContent').value.trim();
                
                if (!title || !type || !content) {
                    alert('Vui lòng điền đầy đủ các trường bắt buộc.');
                    return;
                }

                let files = [];
                if (fileInput && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    if (file.size > 5 * 1024 * 1024) {
                        alert('Dung lượng tệp vượt quá 5MB. Vui lòng gởi minh chứng qua link Zalo hỗ trợ nhé!');
                        return;
                    }
                    files.push(file.name);
                }

                const btn = createTicketForm.querySelector('button[type="submit"]');
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = 'Đang gửi...';
                }

                await window.PawPalSupport.createTicket(title, type, content, files);
                
                if (btn) {
                    btn.innerHTML = 'Gửi thành công!';
                }
                
                alert('Phiếu hỗ trợ đã được tạo thành công! Bạn sẽ được chuyển về trang quản lý.');

                const modalEl = document.getElementById('createTicketModal');
                if (modalEl) {
                    const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                    modalInstance.hide();
                }

                createTicketForm.reset();
                window.location.href = '../support-tickets/support-tickets.html';
            });
        }

        await window.PawPalSupport.loadTickets();
        renderTable();

        // Kiểm tra xem có yêu cầu mở trực tiếp mã ticket từ URL không (?id=...)
        const urlParams = new URLSearchParams(window.location.search);
        const queryTicketId = urlParams.get('id');
        if (queryTicketId) {
            setTimeout(() => {
                showTicketDetail(queryTicketId);
            }, 100);
        }
    });
});