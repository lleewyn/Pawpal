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

                function renderTable() {
                    const tickets = window.PawPalSupport.getTickets();
                const tbody = document.getElementById('ticketsListTableBody');
                tbody.innerHTML = '';

                if (tickets.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3"> Bạn chưa gửi yêu cầu hỗ trợ nào hết.</td></tr>';
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

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="font-weight: 700;">#${ticket.id}</td>
                        <td>${ticket.title}</td>
                        <td style="text-align: center;"><span class="badge-status ${statusClass}">${statusLabel}</span></td>
                        <td style="text-align: center;"><span class="badge-priority ${ticket.priority === 'Cao' ? 'badge-priority-high' : 'badge-priority-normal'}">${ticket.priority}</span></td>
                        <td style="text-align: center;">
                            <button class="btn-green-outline btn-view-ticket" data-id="${ticket.id}" style="font-size: var(--fs-small); padding: 4px 12px; border-radius: var(--border-radius-pill);">Chi tiết</button>
                        </td>
                    `;

                    row.querySelector('.btn-view-ticket').addEventListener('click', () => {
                        showTicketDetail(ticket.id);
                    });

                    tbody.appendChild(row);
                });
            }

            function showTicketDetail(ticketId) {
                const tickets = window.PawPalSupport.getTickets();
                const ticket = tickets.find(t => t.id === ticketId);
                if (!ticket) return;

                activeTicketId = ticketId;
                document.getElementById('detailTicketTitle').textContent = `#${ticket.id} - ${ticket.title}`;
                
                let statusLabel = 'Chờ xử lý';
                let statusClass = 'badge-status-pending';
                if (ticket.status === 'processing') {
                    statusLabel = 'Đang giải quyết';
                    statusClass = 'badge-status-processing';
                } else if (ticket.status === 'completed') {
                    statusLabel = 'Hoàn tất';
                    statusClass = 'badge-status-completed';
                }
                document.getElementById('detailTicketStatus').innerHTML = `Trạng thái: <span class="badge-status ${statusClass}">${statusLabel}</span>`;

                const messagesContainer = document.getElementById('ticketTimelineMessages');
                messagesContainer.innerHTML = '';

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
                        <div style="margin-bottom: 8px;">
                            <span style="font-weight: 700; color: ${isCskh ? 'var(--color-primary)' : 'var(--color-text-dark)'};">
                                ${senderName}
                            </span>
                            <span class="text-muted small" style="margin-left: 12px;">${timeStr}</span>
                        </div>
                        <p style="margin: 0; padding: 8px 12px; background: ${isCskh ? 'var(--color-bg-white)' : 'rgba(48,121,227,0.08)'}; border-radius: 6px; border-left: 3px solid ${isCskh ? 'var(--color-primary)' : 'var(--color-border)'}; color: var(--color-text-dark);">${msg.text}</p>
                    `;
                    messagesContainer.appendChild(item);
                });

                // Cập nhật trạng thái hiển thị panel
                document.getElementById('ticketDetailPanel').style.display = 'block';
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                // Ẩn/hiện editor dựa theo trạng thái
                if (ticket.status === 'completed') {
                    document.getElementById('replyEditorArea').style.display = 'none';
                    document.getElementById('ratingFeedbackArea').style.display = ticket.rating === null ? 'block' : 'none';
                    // Hiển thị rating hiện tại nếu đã có
                    if (ticket.rating) {
                        const stars = document.querySelectorAll('.star-btn');
                        stars.forEach(s => {
                            const val = parseInt(s.getAttribute('data-value'));
                            s.style.color = val <= ticket.rating ? 'var(--color-accent)' : 'var(--color-border)';
                        });
                    }
                } else {
                    document.getElementById('replyEditorArea').style.display = 'block';
                    document.getElementById('ratingFeedbackArea').style.display = 'none';
                }
            }

            // Gửi phản hồi
            document.getElementById('btnSendReply').addEventListener('click', () => {
                const textarea = document.getElementById('replyTextarea');
                const text = textarea.value;
                if (!text.trim()) return;

                window.PawPalSupport.sendTicketReply(activeTicketId, text);
                textarea.value = '';
                showTicketDetail(activeTicketId);
            });

            // Nhấn Đóng hỗ trợ
            document.getElementById('btnActionCloseTicket').addEventListener('click', () => {
                document.getElementById('replyEditorArea').style.display = 'none';
                document.getElementById('ratingFeedbackArea').style.display = 'block';
            });

            // Rating Stars click
            const stars = document.querySelectorAll('.star-btn');
            stars.forEach(star => {
                star.addEventListener('click', () => {
                    currentSelectedRating = parseInt(star.getAttribute('data-value'));
                    stars.forEach(s => {
                        const val = parseInt(s.getAttribute('data-value'));
                        s.style.color = val <= currentSelectedRating ? 'var(--color-accent)' : 'var(--color-border)';
                    });
                });
            });

            // Gửi Đánh Giá cuối
            document.getElementById('btnSubmitRating').addEventListener('click', () => {
                const comment = document.getElementById('ratingComment').value;
                window.PawPalSupport.closeAndRateTicket(activeTicketId, currentSelectedRating, comment);
                alert('PawPal cảm ơn đánh giá của bạn rất nhiều ạ!');
                document.getElementById('ticketDetailPanel').style.display = 'none';
                renderTable();
            });

            document.getElementById('btnCloseDetailPanel').addEventListener('click', () => {
                document.getElementById('ticketDetailPanel').style.display = 'none';
            });

            // Event listener để re-render
            document.addEventListener('tickets_updated', () => {
                renderTable();
                if (activeTicketId) {
                    showTicketDetail(activeTicketId);
                }
            });

            // Modal creation logic
            const form = document.getElementById('createTicketForm');
            const fileInput = document.getElementById('ticketFile');

            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();

                    const title = document.getElementById('ticketTitle').value;
                    const type = document.getElementById('ticketType').value;
                    const content = document.getElementById('ticketContent').value;
                    
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
                    form.reset();
                    renderTable();
                });
            }

            renderTable();
        });
    });