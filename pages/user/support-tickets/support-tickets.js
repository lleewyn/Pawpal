function ensureSupportReady(callback) {
            if (window.PawPalSupport) {
                callback();
                return;
            }
            document.addEventListener('support_ready', callback, { once: true });
        }

        document.addEventListener('DOMContentLoaded', () => {
            ensureSupportReady(() => {
                let activeTicketId = null;
                let currentSelectedRating = 5;

                const ticketsTableBody = document.getElementById('ticketsListTableBody');
                const detailTicketTitle = document.getElementById('detailTicketTitle');
                const detailTicketStatus = document.getElementById('detailTicketStatus');
                const ticketTimelineMessages = document.getElementById('ticketTimelineMessages');
                const replyEditorArea = document.getElementById('replyEditorArea');
                const ratingFeedbackArea = document.getElementById('ratingFeedbackArea');
                const btnSendReply = document.getElementById('btnSendReply');
                const btnActionCloseTicket = document.getElementById('btnActionCloseTicket');
                const btnCloseDetailPanel = document.getElementById('btnCloseDetailPanel');
                const btnSubmitRating = document.getElementById('btnSubmitRating');
                const createTicketForm = document.getElementById('createTicketForm');
                const fileInput = document.getElementById('ticketFile');

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
                        } else if (ticket.status === 'completed') {
                            statusLabel = 'Hoàn tất';
                            statusClass = 'badge-status-completed';
                        }

                        const isPriorityHigh = ticket.priority === 'Cao';
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td><span class="ticket-id-pill">#${ticket.id}</span></td>
                            <td class="ticket-title-cell">${ticket.title}</td>
                            <td class="text-center"><span class="badge-status ${statusClass}">${statusLabel}</span></td>
                            <td class="text-center"><span class="badge-priority ${isPriorityHigh ? 'badge-priority-high' : 'badge-priority-normal'}">${ticket.priority}</span></td>
                            <td class="text-center">
                                <button class="btn-green-outline btn-view-ticket" data-id="${ticket.id}">Chi tiết</button>
                            </td>
                        `;
                        row.querySelector('.btn-view-ticket').addEventListener('click', () => {
                            showTicketDetail(ticket.id);
                        });
                        ticketsTableBody.appendChild(row);
                    });
                }

                function showTicketDetail(ticketId) {
                    if (!detailTicketTitle || !detailTicketStatus || !ticketTimelineMessages || !replyEditorArea || !ratingFeedbackArea) {
                        return;
                    }

                    const tickets = window.PawPalSupport.getTickets();
                    const ticket = tickets.find(t => t.id === ticketId);
                    if (!ticket) return;

                    activeTicketId = ticketId;
                    detailTicketTitle.textContent = `#${ticket.id} - ${ticket.title}`;

                    let statusLabel = 'Chờ xử lý';
                    let statusClass = 'badge-status-pending';
                    if (ticket.status === 'processing') {
                        statusLabel = 'Đang giải quyết';
                        statusClass = 'badge-status-processing';
                    } else if (ticket.status === 'completed') {
                        statusLabel = 'Hoàn tất';
                        statusClass = 'badge-status-completed';
                    }
                    detailTicketStatus.innerHTML = `Trạng thái: <span class="badge-status ${statusClass}">${statusLabel}</span>`;

                    ticketTimelineMessages.innerHTML = '';

                    ticket.messages.forEach(msg => {
                        const item = document.createElement('div');
                        item.className = 'ticket-timeline-item mb-2';

                        const timeStr = new Date(msg.time).toLocaleString('vi-VN');
                        let senderName = 'Bạn';
                        let isCskh = msg.sender === 'cskh';

                        if (isCskh) {
                            senderName = `Tư vấn viên ${msg.agent}`;
                        }

                        item.innerHTML = `
                            <div class="mb-2">
                                <span class="fw-bold ${isCskh ? 'text-primary' : 'text-dark'}">
                                    ${senderName}
                                </span>
                                <span class="text-muted small ms-2">${timeStr}</span>
                            </div>
                            <p class="ticket-msg-bubble ${isCskh ? 'cskh' : 'user'}">${msg.text}</p>
                        `;
                        ticketTimelineMessages.appendChild(item);
                    });

                    const detailPanel = document.getElementById('ticketDetailPanel');
                    if (detailPanel) {
                        detailPanel.classList.remove('d-none');
                    }
                    ticketTimelineMessages.scrollTop = ticketTimelineMessages.scrollHeight;

                    if (ticket.status === 'completed') {
                        replyEditorArea.classList.add('d-none');
                        ratingFeedbackArea.style.display = ticket.rating === null ? 'block' : 'none';
                        if (ticket.rating) {
                            const stars = document.querySelectorAll('.star-btn');
                            stars.forEach(s => {
                                const val = parseInt(s.getAttribute('data-value'), 10);
                                s.style.color = val <= ticket.rating ? 'var(--color-accent)' : 'var(--color-border)';
                            });
                        }
                    } else {
                        replyEditorArea.classList.remove('d-none');
                        ratingFeedbackArea.classList.add('d-none');
                    }
                }

                if (btnSendReply) {
                    btnSendReply.addEventListener('click', () => {
                        const textarea = document.getElementById('replyTextarea');
                        if (!textarea) return;
                        const text = textarea.value;
                        if (!text.trim()) return;

                        window.PawPalSupport.sendTicketReply(activeTicketId, text);
                        textarea.value = '';
                        showTicketDetail(activeTicketId);
                    });
                }

                if (btnActionCloseTicket) {
                    btnActionCloseTicket.addEventListener('click', () => {
                        if (replyEditorArea) replyEditorArea.classList.add('d-none');
                        if (ratingFeedbackArea) ratingFeedbackArea.classList.remove('d-none');
                    });
                }

                if (btnCloseDetailPanel) {
                    btnCloseDetailPanel.addEventListener('click', () => {
                        const detailPanel = document.getElementById('ticketDetailPanel');
                        if (detailPanel) detailPanel.classList.add('d-none');
                    });
                }

                const stars = document.querySelectorAll('.star-btn');
                stars.forEach(star => {
                    star.addEventListener('click', () => {
                        currentSelectedRating = parseInt(star.getAttribute('data-value'), 10);
                        stars.forEach(s => {
                            const val = parseInt(s.getAttribute('data-value'), 10);
                            s.style.color = val <= currentSelectedRating ? 'var(--color-accent)' : 'var(--color-border)';
                        });
                    });
                });

                if (btnSubmitRating) {
                    btnSubmitRating.addEventListener('click', () => {
                        if (!activeTicketId) return;
                        const commentInput = document.getElementById('ratingComment');
                        const comment = commentInput ? commentInput.value : '';
                        window.PawPalSupport.closeAndRateTicket(activeTicketId, currentSelectedRating, comment);
                        alert('PawPal cảm ơn đánh giá của bạn rất nhiều ạ!');
                        const detailPanel = document.getElementById('ticketDetailPanel');
                        if (detailPanel) detailPanel.classList.add('d-none');
                        renderTable();
                    });
                }

                document.addEventListener('tickets_updated', () => {
                    renderTable();
                    if (activeTicketId) {
                        showTicketDetail(activeTicketId);
                    }
                });

                if (createTicketForm) {
                    createTicketForm.addEventListener('submit', (e) => {
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

                        window.PawPalSupport.createTicket(title, type, content, files);
                        alert('Phiếu hỗ trợ đã được tạo thành công!');

                        const modalEl = document.getElementById('createTicketModal');
                        if (modalEl) {
                            const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                            modalInstance.hide();
                        }

                        createTicketForm.reset();
                        window.location.href = 'support-tickets.html';
                    });
                }

                renderTable();
            });
        });