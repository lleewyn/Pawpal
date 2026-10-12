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
        const modal = document.getElementById('resolveTicketModalOverlay');
        if (!modal) return;

        const selectOpt = document.getElementById('selectResolveOption');
        if (selectOpt) {
            selectOpt.value = 'explain';
        }
        updateResolveOptionVisibility('explain');

        const rmaCode = document.getElementById('inputResolveRmaCode');
        if (rmaCode) {
            rmaCode.value = 'RMA-' + String(Math.floor(1000 + Math.random() * 9000));
        }

        const noteInput = document.getElementById('inputResolveNote');
        if (noteInput) noteInput.value = '';

        const replacementInput = document.getElementById('inputResolveRmaReplacement');
        if (replacementInput) replacementInput.value = '';
        const rmaProdCard = document.getElementById('resolveRmaProductSelectedCard');
        if (rmaProdCard) rmaProdCard.style.display = 'none';
        const rmaProdDropdown = document.getElementById('resolveRmaProductDropdown');
        if (rmaProdDropdown) rmaProdDropdown.style.display = 'none';

        modal.classList.add('active');
    }

    function initResolveRmaProductAutocomplete() {
        const inputProduct = document.getElementById('inputResolveRmaReplacement');
        const popover = document.getElementById('resolveRmaProductDropdown');
        const card = document.getElementById('resolveRmaProductSelectedCard');
        const cardInfo = document.getElementById('resolveRmaProductSelectedInfo');
        const btnClear = document.getElementById('btnClearResolveRmaProduct');

        if (!inputProduct || !popover) return;

        function renderProductDropdown(query) {
            const q = (query || '').toLowerCase().trim();
            let products = PawpalComplaints.state?.cachedProducts || [];
            
            if (!products || products.length === 0) {
                products = [
                    { id: 'p1', product_name: 'Áo Ấm Mùa Đông Lót Lông Poodle (Size L)', sku: 'CLOTH-001', sale_price: 185000 },
                    { id: 'p2', product_name: 'Thức Ăn Hạt Royal Canin Puppy 800g', sku: 'FOOD-RC-01', sale_price: 165000 },
                    { id: 'p3', product_name: 'Pate Cho Mèo Vị Cá Hồi Ciao Chuuru (Gói 4 thanh)', sku: 'TREAT-CIAO-02', sale_price: 45000 },
                    { id: 'p4', product_name: 'Cát Đậu Nành Vệ Sinh Hữu Cơ Cature 6L', sku: 'LITTER-CAT-01', sale_price: 135000 },
                    { id: 'p5', product_name: 'Sữa Tắm Khử Mùi Dưỡng Lông Joyce & Dolls 400ml', sku: 'SPA-SHAMP-01', sale_price: 210000 },
                    { id: 'p6', product_name: 'Bình Nước Du Lịch Kháng Khuẩn Cho Chó Mèo 350ml', sku: 'ACC-BTL-01', sale_price: 95000 }
                ];
            }

            const matches = products.filter(p => {
                if (!q) return true;
                const name = (p.product_name || '').toLowerCase();
                const sku = (p.sku || '').toLowerCase();
                return name.includes(q) || sku.includes(q);
            }).slice(0, 6);

            if (matches.length === 0) {
                popover.innerHTML = `<div class="customer-autocomplete-empty">Không tìm thấy sản phẩm trong danh mục</div>`;
                popover.style.display = 'block';
                return;
            }

            popover.innerHTML = matches.map(p => {
                const name = p.product_name || 'Sản phẩm Pawpal';
                const sku = p.sku ? `SKU: ${p.sku}` : 'Sản phẩm có sẵn';
                const price = p.sale_price ? Number(p.sale_price).toLocaleString('vi-VN') + ' đ' : 'Liên hệ';
                return `
                    <div class="customer-autocomplete-item" data-product-name="${name}" data-product-sku="${p.sku || ''}">
                        <div class="customer-autocomplete-meta">
                            <div class="customer-autocomplete-name">${name}</div>
                            <div class="customer-autocomplete-phone">${sku}</div>
                        </div>
                        <span class="customer-autocomplete-badge">${price}</span>
                    </div>
                `;
            }).join('');
            popover.style.display = 'block';

            popover.querySelectorAll('.customer-autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                    const pName = item.dataset.productName;
                    const pSku = item.dataset.productSku;
                    inputProduct.value = pSku ? `${pName} (${pSku})` : pName;
                    popover.style.display = 'none';

                    if (card && cardInfo) {
                        cardInfo.textContent = `Đã chọn: ${pName} (${pSku || ''})`;
                        card.style.display = 'flex';
                    }
                });
            });
        }

        inputProduct.addEventListener('input', () => renderProductDropdown(inputProduct.value));
        inputProduct.addEventListener('focus', () => renderProductDropdown(inputProduct.value));

        if (btnClear) {
            btnClear.addEventListener('click', (e) => {
                e.stopPropagation();
                inputProduct.value = '';
                if (card) card.style.display = 'none';
                popover.style.display = 'none';
            });
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#resolveRmaExchangeField')) {
                popover.style.display = 'none';
            }
        });
    }

    function updateResolveOptionVisibility(optionVal) {
        const groupRma = document.getElementById('groupResolveRma');
        const groupRedo = document.getElementById('groupResolveRedo');
        const groupReward = document.getElementById('groupResolveReward');
        const groupRefund = document.getElementById('groupResolveRefund');
        const rmaExchangeField = document.getElementById('resolveRmaExchangeField');
        const rmaRefundField = document.getElementById('resolveRmaRefundField');
        const managerNotice = document.getElementById('resolveManagerApprovalNotice');

        if (groupRma) groupRma.style.display = (optionVal === 'rma_exchange' || optionVal === 'rma_refund') ? 'block' : 'none';
        if (rmaExchangeField) rmaExchangeField.style.display = optionVal === 'rma_exchange' ? 'block' : 'none';
        if (rmaRefundField) rmaRefundField.style.display = optionVal === 'rma_refund' ? 'block' : 'none';

        if (groupRedo) groupRedo.style.display = optionVal === 'redo_service' ? 'block' : 'none';
        if (groupReward) groupReward.style.display = optionVal === 'reward_voucher' ? 'block' : 'none';
        if (groupRefund) groupRefund.style.display = optionVal === 'refund' ? 'block' : 'none';

        if (managerNotice) {
            const isHighAuth = (optionVal === 'refund' || optionVal === 'rma_refund' || optionVal === 'reward_voucher');
            managerNotice.style.display = isHighAuth ? 'block' : 'none';
        }
    }

    function initComplaintDetailSubtab() {
        initResolveRmaProductAutocomplete();

        // Nút mở modal giải quyết khiếu nại
        const btnOpenResolve = document.getElementById('btnOpenResolveModal');
        if (btnOpenResolve) {
            btnOpenResolve.addEventListener('click', () => openResolveModal());
        }

        // Dropdown thay đổi phương án giải quyết
        const selectOpt = document.getElementById('selectResolveOption');
        if (selectOpt) {
            selectOpt.addEventListener('change', (e) => {
                updateResolveOptionVisibility(e.target.value);
            });
        }

        // Nút xác nhận giải quyết trong Modal 2
        const btnConfirmResolve = document.getElementById('btnConfirmResolveTicket');
        if (btnConfirmResolve) {
            btnConfirmResolve.addEventListener('click', async () => {
                const modal = document.getElementById('resolveTicketModalOverlay');
                const ticketId = PawpalComplaints.state?.currentTicketId;
                const optVal = document.getElementById('selectResolveOption')?.value || 'explain';
                const note = (document.getElementById('inputResolveNote')?.value || '').trim();

                if (!note) {
                    PawpalComplaints.showToast('Vui lòng nhập ghi chú và lý do thực hiện phương án.', 'warning');
                    return;
                }

                const needsManager = (optVal === 'refund' || optVal === 'rma_refund');
                const newStatus = needsManager ? 'waiting_manager_approval' : 'resolved';

                const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
                const ticket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId);
                if (ticket) {
                    ticket.status = newStatus;
                    ticket.resolution = {
                        option: optVal,
                        note: note,
                        resolvedAt: new Date().toISOString()
                    };
                    if (!ticket.timeline) ticket.timeline = [];
                    const now = new Date();
                    ticket.timeline.unshift({
                        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
                        author: 'Lê Lệ Quyên (CSKH)',
                        title: needsManager ? 'Đề xuất giải quyết (Chờ duyệt)' : 'Đã giải quyết khiếu nại',
                        desc: `Phương án: ${optVal}. Lý do: ${note}`,
                        isInternal: true
                    });
                }

                PawpalComplaints.saveComplaintsOverrides?.();
                PawpalComplaints.updateComplaintsKpis?.();
                PawpalComplaints.renderComplaintsAlertBar?.();

                renderTicketDetail(ticketId);
                PawpalComplaints.subtabs.services?.renderServiceComplaintsTable?.();
                PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable?.();

                if (modal) modal.classList.remove('active');
                PawpalComplaints.showToast(needsManager ? `Đã chuyển khiếu nại ${ticketId} sang chờ quản lý duyệt!` : `Đã giải quyết xong khiếu nại ${ticketId}!`, 'success');
            });
        }

        // Đóng Modal 2 qua data-close-modal, click backdrop, và Escape key
        const modalResolve = document.getElementById('resolveTicketModalOverlay');
        if (modalResolve) {
            document.querySelectorAll('[data-close-modal="resolveTicketModalOverlay"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    modalResolve.classList.remove('active');
                });
            });

            modalResolve.addEventListener('click', (e) => {
                if (e.target === modalResolve) {
                    modalResolve.classList.remove('active');
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modalResolve.classList.contains('active')) {
                    modalResolve.classList.remove('active');
                }
            });
        }

        // ====================================================================
        // MODAL 3: CHUYỂN NGƯỜI PHỤ TRÁCH XỬ LÝ (540px)
        // ====================================================================
        const btnOpenAssign = document.getElementById('btnAssignHandler');
        if (btnOpenAssign) {
            btnOpenAssign.addEventListener('click', () => openAssignHandlerModal());
        }

        const btnConfirmAssign = document.getElementById('btnConfirmAssignHandler');
        if (btnConfirmAssign) {
            btnConfirmAssign.addEventListener('click', async () => {
                const modal = document.getElementById('assignHandlerModalOverlay');
                const ticketId = PawpalComplaints.state?.currentTicketId;
                const newStaff = document.getElementById('selectAssignStaff')?.value;
                const note = (document.getElementById('inputAssignNote')?.value || '').trim();

                if (!note) {
                    PawpalComplaints.showToast('Vui lòng nhập lý do chuyển giao và dặn dò chuyên môn.', 'warning');
                    return;
                }

                const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
                const ticket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId);
                if (ticket) {
                    const oldStaff = ticket.staffAssigned || 'Chưa phân công';
                    ticket.staffAssigned = newStaff;
                    if (!ticket.timeline) ticket.timeline = [];
                    const now = new Date();
                    ticket.timeline.unshift({
                        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
                        author: 'Lê Lệ Quyên (CSKH)',
                        title: 'Chuyển người phụ trách xử lý',
                        desc: `Chuyển giao từ ${oldStaff} sang ${newStaff}. Dặn dò: ${note}`,
                        isInternal: true
                    });
                }

                PawpalComplaints.saveComplaintsOverrides?.();
                PawpalComplaints.updateComplaintsKpis?.();
                PawpalComplaints.renderComplaintsAlertBar?.();

                renderTicketDetail(ticketId);
                PawpalComplaints.subtabs.services?.renderServiceComplaintsTable?.();
                PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable?.();

                if (modal) modal.classList.remove('active');
                PawpalComplaints.showToast(`Đã chuyển giao khiếu nại cho ${newStaff}!`, 'success');
            });
        }

        // Đóng Modal 3 qua data-close-modal, click backdrop, và Escape key
        const modalAssign = document.getElementById('assignHandlerModalOverlay');
        if (modalAssign) {
            document.querySelectorAll('[data-close-modal="assignHandlerModalOverlay"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    modalAssign.classList.remove('active');
                });
            });

            modalAssign.addEventListener('click', (e) => {
                if (e.target === modalAssign) {
                    modalAssign.classList.remove('active');
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modalAssign.classList.contains('active')) {
                    modalAssign.classList.remove('active');
                }
            });
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

        // ====================================================================
        // MODAL 4: GỬI YÊU CẦU BỔ SUNG THÔNG TIN (560px)
        // ====================================================================
        const btnOpenReqInfo = document.getElementById('btnRequestMoreInfo');
        if (btnOpenReqInfo) {
            btnOpenReqInfo.addEventListener('click', () => openRequestMoreInfoModal());
        }

        const btnSendReqInfo = document.getElementById('btnSendRequestInfo');
        if (btnSendReqInfo) {
            btnSendReqInfo.addEventListener('click', async () => {
                const modal = document.getElementById('requestMoreInfoModalOverlay');
                const ticketId = PawpalComplaints.state?.currentTicketId;
                const channel = document.getElementById('selectRequestChannel')?.value || 'zalo';
                const message = (document.getElementById('inputRequestMessage')?.value || '').trim();

                if (!message) {
                    PawpalComplaints.showToast('Vui lòng nhập nội dung tin nhắn yêu cầu gửi cho khách.', 'warning');
                    return;
                }

                const channelNames = {
                    zalo: 'Zalo OA',
                    sms: 'SMS Brandname',
                    call: 'Cuộc gọi tư vấn',
                    email: 'Email'
                };
                const channelLabel = channelNames[channel] || channel;

                const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
                const ticket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId);
                if (ticket) {
                    ticket.status = 'waiting_customer';
                    ticket.waitingCustomerSince = new Date().toISOString();
                    if (!ticket.timeline) ticket.timeline = [];
                    const now = new Date();
                    ticket.timeline.unshift({
                        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
                        author: 'Lê Lệ Quyên (CSKH)',
                        title: `Gửi yêu cầu bổ sung thông tin qua ${channelLabel}`,
                        desc: message,
                        isInternal: false
                    });
                }

                PawpalComplaints.saveComplaintsOverrides?.();
                PawpalComplaints.updateComplaintsKpis?.();
                PawpalComplaints.renderComplaintsAlertBar?.();

                renderTicketDetail(ticketId);
                PawpalComplaints.subtabs.services?.renderServiceComplaintsTable?.();
                PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable?.();

                if (modal) modal.classList.remove('active');
                PawpalComplaints.showToast(`Đã gửi yêu cầu bổ sung thông tin tới khách hàng qua ${channelLabel}!`, 'success');
            });
        }

        // Đóng Modal 4 qua data-close-modal, click backdrop, và Escape key
        const modalReqInfo = document.getElementById('requestMoreInfoModalOverlay');
        if (modalReqInfo) {
            document.querySelectorAll('[data-close-modal="requestMoreInfoModalOverlay"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    modalReqInfo.classList.remove('active');
                });
            });

            modalReqInfo.addEventListener('click', (e) => {
                if (e.target === modalReqInfo) {
                    modalReqInfo.classList.remove('active');
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modalReqInfo.classList.contains('active')) {
                    modalReqInfo.classList.remove('active');
                }
            });
        }

        // ====================================================================
        // MODAL 5: XEM ẢNH BẰNG CHỨNG PHÓNG TO (LIGHTBOX - 680px)
        // ====================================================================
        const modalImgPreview = document.getElementById('imagePreviewModalOverlay');
        if (modalImgPreview) {
            document.querySelectorAll('[data-close-modal="imagePreviewModalOverlay"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    modalImgPreview.classList.remove('active');
                });
            });

            modalImgPreview.addEventListener('click', (e) => {
                if (e.target === modalImgPreview) {
                    modalImgPreview.classList.remove('active');
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modalImgPreview.classList.contains('active')) {
                    modalImgPreview.classList.remove('active');
                }
            });
        }

        const initialTicketId = sessionStorage.getItem('pawpal_admin_complaint_selected_id') || 'TKT-001';
        renderTicketDetail(initialTicketId);
    }

    function openAssignHandlerModal() {
        const modal = document.getElementById('assignHandlerModalOverlay');
        if (!modal) return;

        const selectStaff = document.getElementById('selectAssignStaff');
        if (selectStaff) {
            selectStaff.innerHTML = `
                <option value="Trần Văn Hùng (Groomer trưởng)">Trần Văn Hùng (Groomer trưởng)</option>
                <option value="Lê Lệ Quyên (Quản lý chi nhánh)">Lê Lệ Quyên (Quản lý chi nhánh)</option>
                <option value="Nguyễn Văn A (Kỹ thuật viên cao cấp)">Nguyễn Văn A (Kỹ thuật viên cao cấp)</option>
                <option value="Trần Thị C (Chuyên viên chăm sóc)">Trần Thị C (Chuyên viên chăm sóc)</option>
                <option value="Lê Hoàng Nam (Bác sĩ thú y)">Lê Hoàng Nam (Bác sĩ thú y)</option>
                <option value="Nguyễn Thùy Trang (Tư vấn viên CSKH)">Nguyễn Thùy Trang (Tư vấn viên CSKH)</option>
            `;
        }

        const noteInput = document.getElementById('inputAssignNote');
        if (noteInput) noteInput.value = '';

        modal.classList.add('active');
    }
    PawpalComplaints.openAssignHandlerModal = openAssignHandlerModal;

    function openRequestMoreInfoModal() {
        const modal = document.getElementById('requestMoreInfoModalOverlay');
        if (!modal) return;

        const msgInput = document.getElementById('inputRequestMessage');
        if (msgInput) msgInput.value = '';

        const channelSelect = document.getElementById('selectRequestChannel');
        if (channelSelect) channelSelect.value = 'zalo';

        modal.classList.add('active');
    }
    PawpalComplaints.openRequestMoreInfoModal = openRequestMoreInfoModal;

    function openImagePreviewModal(src, title, meta) {
        const modal = document.getElementById('imagePreviewModalOverlay');
        if (!modal) return;

        const defaultSample = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80';
        const imgEl = document.getElementById('imagePreviewImg');
        const titleEl = document.getElementById('imagePreviewTitle');
        const metaEl = document.getElementById('imagePreviewMeta');

        if (imgEl) {
            imgEl.src = src || defaultSample;
        }
        if (titleEl && title) {
            titleEl.textContent = title;
        }
        if (metaEl && meta) {
            metaEl.textContent = meta;
        }

        modal.classList.add('active');
    }
    PawpalComplaints.openImagePreviewModal = openImagePreviewModal;

    PawpalComplaints.subtabs.detail = {
        init: initComplaintDetailSubtab,
        openTicketDetail,
        renderTicketDetail,
        openResolveModal,
        openAssignHandlerModal,
        openRequestMoreInfoModal,
        openImagePreviewModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComplaintDetailSubtab);
    } else {
        initComplaintDetailSubtab();
    }
})();

