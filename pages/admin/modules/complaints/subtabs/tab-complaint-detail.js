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

    function getDbClient() {
        return PawpalComplaints.getDbClient?.() || (window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient);
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

        const targetId = ticketId || PawpalComplaints.state?.currentTicketId || sessionStorage.getItem('pawpal_admin_complaint_selected_id') || null;
        const ticket = targetId ? allTickets.find(t => t.id === targetId || t.rawId === targetId) : null;
        const content = document.getElementById('complaintDetailData');
        const placeholder = document.getElementById('complaintDetailPlaceholder');
        if (!PawpalComplaints.state.isLoaded || PawpalComplaints.state.loadError || !ticket) {
            if (content) content.style.display = 'none';
            if (placeholder) {
                placeholder.style.display = '';
                placeholder.textContent = PawpalComplaints.state.loadError || (!ticket && targetId ? `Không tìm thấy hồ sơ khiếu nại mã ${targetId}.` : 'Chưa có hồ sơ khiếu nại để hiển thị.');
            }
            PawpalComplaints.updateBreadcrumb?.(null);
            return;
        }
        if(content)content.style.display='';if(placeholder)placeholder.style.display='none';
        content?.querySelectorAll('span[id^="viewTicket"]').forEach(el=>{el.textContent='—';});
        const category=document.getElementById('viewTicketCategoryBadge');if(category)category.textContent=ticket.category || ticket.serviceCategory || (ticket.orderId ? 'Đơn hàng' : 'Dịch vụ');
        const ref=document.getElementById('viewTicketRefId');if(ref)ref.textContent=ticket.bookingId || ticket.orderId || 'Chưa xác định';


        PawpalComplaints.state.currentTicketId = ticket.id;
        sessionStorage.setItem('pawpal_admin_complaint_selected_id', ticket.id);

        if (PawpalComplaints.updateBreadcrumb) {
            PawpalComplaints.updateBreadcrumb(ticket.id);
        }

        // Headline & Meta
        const codeEl = document.getElementById('viewTicketCode');
        const titleEl = document.getElementById('detailTicketTitle');
        const statusBadgeEl = document.getElementById('viewTicketStatusBadge');
        const priorityBadgeEl = document.getElementById('viewTicketPriorityBadge');

        if (codeEl) codeEl.textContent = ticket.id;
        if (titleEl) titleEl.textContent = ticket.title;

        if (statusBadgeEl) {
            let statusText = 'Đang xử lý';
            let badgeClass = 'badge-info';
            if (ticket.status === 'open') { statusText = 'Chờ tiếp nhận'; badgeClass = 'badge-warning'; }
            else if (ticket.status === 'waiting_customer') { statusText = 'Chờ phản hồi khách hàng'; badgeClass = 'badge-neutral'; }
            else if (ticket.status === 'resolved' || ticket.status === 'closed') { statusText = 'Đã giải quyết'; badgeClass = 'badge-success'; }
            statusBadgeEl.className = `admin-badge ${badgeClass}`;
            statusBadgeEl.textContent = statusText;
        }

        if (priorityBadgeEl) {
            priorityBadgeEl.className = `admin-badge ${ticket.priority === 'high' ? 'badge-danger' : (ticket.priority === 'medium' ? 'badge-warning' : 'badge-neutral')}`;
            priorityBadgeEl.textContent = ticket.priority === 'high' ? 'Khẩn cấp' : (ticket.priority === 'medium' ? 'Ưu tiên cao' : 'Bình thường');
        }

        // Thông tin khách hàng & phản ánh
        const custNameEl = document.getElementById('viewTicketCustomerName');
        const custPhoneEl = document.getElementById('viewTicketCustomerPhone');
        const relatedItemEl = document.getElementById('viewTicketRefInfo');
        const contentEl = document.getElementById('viewTicketCustomerContent');
        const timeEl = document.getElementById('detailComplaintCreatedTime');

        if (custNameEl) custNameEl.textContent = ticket.customerName;
        if (custPhoneEl) {
            const rawPhone = ticket.phone || '';
            const currentRole = (sessionStorage.getItem('pawpal_admin_system_role') || '').toUpperCase();
            if (rawPhone && currentRole !== 'ADMIN' && currentRole !== 'MANAGER') {
                const masked = rawPhone.length >= 7 
                    ? rawPhone.slice(0, 3) + '****' + rawPhone.slice(-3)
                    : rawPhone;
                custPhoneEl.textContent = masked;
            } else {
                custPhoneEl.textContent = rawPhone || '—';
            }
        }
        if (contentEl) contentEl.textContent = ticket.content || 'Không có mô tả chi tiết.';
        if (timeEl) timeEl.textContent = ticket.createdAt || '—';

        // Lazy fetch tin nhắn chi tiết của ticket nếu chưa nạp (PERF-03.K02)
        if (typeof PawpalComplaints.fetchTicketMessages === 'function' && !ticket._messagesLoaded) {
            PawpalComplaints.fetchTicketMessages(ticket.rawId || ticket.id).then(msgs => {
                ticket._messagesLoaded = true;
                ticket.messages = msgs;
                if (msgs.length > 0) {
                    const userMsg = msgs.find(m => ['user','khach_hang'].includes(m.sender_type)) || msgs[0];
                    if (userMsg?.content && contentEl) {
                        ticket.content = userMsg.content;
                        contentEl.textContent = userMsg.content;
                    }
                }
            });
        }

        const isService = (ticket.type === 'service' || !ticket.orderId);

        // Hiển thị thông tin đối tượng liên quan (Pet hoặc Sản phẩm)
        const refTypeLabel = document.getElementById('viewTicketRefTypeLabel');
        const refIdLabel = document.getElementById('viewTicketIdLabel');
        const refIdEl = document.getElementById('viewTicketRefId');
        const petNotesEl = document.getElementById('viewTicketPetNotes');

        if (refTypeLabel) refTypeLabel.textContent = isService ? 'Pet và giống' : 'Sản phẩm';
        if (refIdLabel) refIdLabel.textContent = isService ? 'Mã lịch hẹn' : 'Mã đơn hàng';
        if (relatedItemEl) {
            if (isService) {
                relatedItemEl.textContent = ticket.petName ? `${ticket.petName} (${ticket.petBreed || 'Thú cưng'})` : (ticket.serviceName || 'Dịch vụ');
            } else {
                relatedItemEl.textContent = ticket.productName || 'Sản phẩm Pawpal';
            }
        }
        if (refIdEl) {
            const code = isService ? (ticket.bookingId || '—') : (ticket.orderId || '—');
            refIdEl.innerHTML = `<a href="javascript:void(0)" class="user-name-link" id="linkToOriginalTransaction">${escapeHtml(code)}</a>`;
        }
        if (petNotesEl) {
            petNotesEl.textContent = isService ? (ticket.petNotes || 'Không có tiền sử dị ứng.') : (ticket.productSku ? `Mã SKU: ${ticket.productSku}` : '—');
        }

        // Chuyển đổi khối đối chứng hệ thống 360° giữa Dịch vụ và Đơn hàng
        const serviceBlock = document.getElementById('serviceCrossCheckBlock');
        const orderBlock = document.getElementById('orderCrossCheckBlock');
        if (serviceBlock) serviceBlock.style.display = isService ? 'block' : 'none';
        if (orderBlock) orderBlock.style.display = isService ? 'none' : 'block';

        if (isService) {
            const checkinHealthEl = document.getElementById('viewTicketCheckinHealth');
            const staffExecutedEl = document.getElementById('viewTicketStaffExecuted');
            const staffLogNoteEl = document.getElementById('viewTicketStaffLogNote');
            const safetyBadgeEl = document.getElementById('viewStaffSafetyLockBadge');
            const btnSafetyLock = document.getElementById('btnToggleStaffSafetyLock');

            if (checkinHealthEl) checkinHealthEl.textContent = ticket.checkinHealth || 'Chưa có biên bản tiếp nhận sức khỏe ban đầu.';
            if (staffExecutedEl) staffExecutedEl.textContent = ticket.staffExecuted || 'Chưa có thông tin nhân sự';
            if (staffLogNoteEl) staffLogNoteEl.textContent = ticket.staffLogNote || 'Chưa có nhật ký ca dịch vụ được ghi nhận.';

            // Trạng thái khóa an toàn của KTV
            const staffList = PawpalComplaints.state?.cachedStaff || [];
            const matchedStaff = staffList.find(s => s.full_name && ticket.staffExecuted && ticket.staffExecuted.includes(s.full_name));
            const isLocked = matchedStaff ? (matchedStaff.service_locked || matchedStaff.status === 'LOCKED') : false;

            if (safetyBadgeEl) {
                safetyBadgeEl.innerHTML = isLocked
                    ? '<span class="admin-badge badge-danger" style="font-size: 11px;">Đang tạm khóa nhận việc</span>'
                    : '<span class="admin-badge badge-success" style="font-size: 11px;">Đang nhận việc bình thường</span>';
            }
            if (btnSafetyLock) {
                btnSafetyLock.textContent = isLocked ? 'Mở khóa nhận việc' : 'Tạm khóa an toàn KTV';
                btnSafetyLock.style.color = isLocked ? '#236B48' : '#DC2626';
                btnSafetyLock.onclick = async () => {
                    // K-14: Kiểm tra quyền quản trị trước khi khóa KTV
                    const currentRole = sessionStorage.getItem('pawpal_admin_system_role') || sessionStorage.getItem('pawpal_user_role') || 'ADMIN';
                    if (currentRole !== 'ADMIN' && currentRole !== 'MANAGER') {
                        PawpalComplaints.showToast('Bạn không có quyền quản lý để thay đổi trạng thái an toàn của KTV.', 'danger');
                        return;
                    }

                    if (!matchedStaff) {
                        PawpalComplaints.showToast('Không tìm thấy thông tin KTV trong hệ thống.', 'warning');
                        return;
                    }
                    const newLockState = !isLocked;
                    const client = getDbClient();
                    if (client && matchedStaff.id) {
                        const { error } = await client.from('staff').update({ service_locked: newLockState }).eq('id', matchedStaff.id);
                        if (error) {
                            PawpalComplaints.showToast('Không thể cập nhật trạng thái an toàn: ' + error.message, 'danger');
                            return;
                        }
                    }
                    matchedStaff.service_locked = newLockState;
                    PawpalComplaints.showToast(newLockState ? `Đã tạm khóa nhận việc an toàn đối với KTV ${matchedStaff.full_name}!` : `Đã mở lại quyền nhận việc cho KTV ${matchedStaff.full_name}!`, 'success');
                    renderTicketDetail(ticket.id);
                };
            }
        }

        if (!isService) {
            const carrierEl = document.getElementById('viewTicketShippingCarrier');
            const shippingCodeEl = document.getElementById('viewTicketShippingCode');
            const deliveryStatusEl = document.getElementById('viewTicketDeliveryStatus');

            const orders = PawpalComplaints.state?.cachedOrders || [];
            const matchedOrder = orders.find(o => String(o.id) === String(ticket.orderId) || String(o.order_code) === String(ticket.orderId));

            if (carrierEl) carrierEl.textContent = matchedOrder?.shipping_carrier || ticket.carrier || 'Giao Hàng Nhanh (GHN)';
            if (shippingCodeEl) shippingCodeEl.textContent = matchedOrder?.shipping_code || ticket.trackingCode || `GHN${ticket.orderId ? String(ticket.orderId).replace(/[^0-9]/g, '') : '88291039'}VN`;
            if (deliveryStatusEl) {
                const isDelivered = matchedOrder?.order_status === 'delivered' || matchedOrder?.order_status === 'completed';
                deliveryStatusEl.textContent = isDelivered ? 'Giao thành công • Người nhận đã ký nhận kiện hàng' : (ticket.deliveryStatus || 'Giao thành công • Đang đối soát');
                deliveryStatusEl.style.color = isDelivered ? '#166534' : '#734718';
            }
        }

        // Nút chuyển trực tiếp đến giao dịch gốc
        const jumpBtn = document.getElementById('btnJumpToOriginal');
        const jumpHandler = () => {
            if (isService && ticket.bookingId) {
                sessionStorage.setItem('pawpal_admin_service_selected_booking_id', ticket.bookingId);
                sessionStorage.setItem('pawpal_admin_active_module', 'Dịch vụ');
                sessionStorage.setItem('pawpal_admin_service_active_subtab', 'tab-service-bookings');
                const svcBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Dịch vụ');
                if (svcBtn) svcBtn.click();
            } else if (!isService && ticket.orderId) {
                sessionStorage.setItem('pawpal_admin_order_selected_id', ticket.orderId);
                sessionStorage.setItem('pawpal_admin_order_id', ticket.orderId);
                sessionStorage.setItem('pawpal_admin_active_module', 'Bán hàng');
                sessionStorage.setItem('pawpal_admin_order_active_subtab', 'tab-order-detail');
                sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-detail');
                const ordBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Bán hàng');
                if (ordBtn) ordBtn.click();
            }
        };
        if (jumpBtn) jumpBtn.onclick = jumpHandler;
        const linkTx = document.getElementById('linkToOriginalTransaction');
        if (linkTx) linkTx.onclick = jumpHandler;

        // Khối hiển thị Phương án giải quyết đã chọn
        const resolutionBlock = document.getElementById('ticketResolutionBlock');
        if (resolutionBlock) {
            if (ticket.resolution || ticket.status === 'resolved' || ticket.status === 'closed') {
                resolutionBlock.style.display = 'block';
                const res = ticket.resolution || {};
                const badgeEl = document.getElementById('viewResolutionBadge');
                const timeEl = document.getElementById('viewResolutionTime');
                const noteEl = document.getElementById('viewResolutionNote');

                const optNames = {
                    'redo_service': 'Làm lại dịch vụ miễn phí',
                    'change_staff': 'Đổi kỹ thuật viên chăm sóc',
                    'reward_voucher': 'Tặng Voucher và Pawpoint bồi hoàn',
                    'refund': 'Hoàn tiền dịch vụ',
                    'rma_replace': 'Đổi sản phẩm mới (Tạo mã RMA)',
                    'rma_exchange': 'Đổi sản phẩm mới (Tạo mã RMA)',
                    'rma_refund': 'Thu hồi và hoàn tiền',
                    'explain': 'Giải thích quy trình và chăm sóc khách hàng'
                };
                const optKey = res.type || res.option || 'explain';
                if (badgeEl) badgeEl.textContent = res.typeName || optNames[optKey] || 'Đã thống nhất phương án xử lý';
                if (timeEl) timeEl.textContent = res.updatedAt ? `Cập nhật: ${res.updatedAt}` : 'Cập nhật: Vừa xong';
                if (noteEl) noteEl.textContent = `"${res.note || 'Đã gọi điện xin lỗi và thống nhất thỏa thuận với khách hàng.'}"`;

                const rmaDet = document.getElementById('resolutionRmaDetails');
                const rewDet = document.getElementById('resolutionRewardDetails');
                const redoDet = document.getElementById('resolutionRedoServiceDetails');
                const refDet = document.getElementById('resolutionRefundDetails');

                const isRma = (optKey === 'rma_replace' || optKey === 'rma_refund' || optKey === 'rma_exchange' || Boolean(res.rmaCode));
                if (rmaDet) {
                    rmaDet.style.display = isRma ? 'block' : 'none';
                    if (isRma) {
                        const rCode = document.getElementById('viewRmaCode');
                        const rPickup = document.getElementById('viewRmaPickupMethod');
                        const rWh = document.getElementById('viewRmaWarehouse');
                        const rItem = document.getElementById('viewRmaReplacementItem');
                        const btnAdvRma = document.getElementById('btnAdvanceRmaStep');

                        if (rCode) rCode.textContent = res.rmaCode || 'Chưa cấp mã';
                        if (rPickup) rPickup.textContent = res.pickupMethod || 'Chưa cập nhật hình thức gửi trả';
                        if (rWh) rWh.textContent = res.warehouse || 'Chưa chỉ định kho tiếp nhận';
                        if (rItem) rItem.textContent = res.replacementItem || ticket.productName || 'Chưa cập nhật';

                        let currentStep = res.rmaStep || (ticket.status === 'resolved' ? 4 : 2);
                        const updateStepperUI = (step) => {
                            const stepper = document.getElementById('viewRmaStepper');
                            if (stepper) {
                                const stepItems = stepper.querySelectorAll('.rma-step-item');
                                stepItems.forEach((item, idx) => {
                                    item.classList.toggle('active', idx + 1 <= step);
                                });
                            }
                        };
                        updateStepperUI(currentStep);

                        if (btnAdvRma) {
                            btnAdvRma.onclick = async () => {
                                if (currentStep < 4) {
                                    currentStep++;
                                    res.rmaStep = currentStep;
                                    updateStepperUI(currentStep);
                                    const stepNames = ['', 'Cấp mã RMA', 'Chờ gửi hàng hoàn', 'Kiểm tra tại kho', 'Đổi mới / Hoàn tất'];
                                    const staffName = (typeof PawpalComplaints !== 'undefined' && PawpalComplaints.getCurrentStaffName) ? PawpalComplaints.getCurrentStaffName() : 'Quản trị viên';
                                    if (!ticket.timeline) ticket.timeline = [];
                                    const now = new Date();
                                    ticket.timeline.unshift({
                                        time: PawpalComplaints.formatDateTime(now),
                                        author: `${staffName} (CSKH)`,
                                        title: 'Cập nhật tiến độ RMA',
                                        desc: `Chuyển tiến độ sang bước ${currentStep}: ${stepNames[currentStep]}`,
                                        isInternal: true
                                    });
                                    if (currentStep === 4) {
                                        ticket.status = 'resolved';
                                    }

                                    // Ghi vết vào CSDL
                                    const client = getDbClient();
                                    if (client && ticket.rawId) {
                                        try {
                                            await client.from('support_ticket_message').insert([{
                                                ticket_id: ticket.rawId,
                                                sender_type: 'cskh',
                                                content: `[Tiến độ RMA] Bước ${currentStep}/4: ${stepNames[currentStep]}`,
                                                agent_name: staffName
                                            }]);
                                            if (currentStep === 4) {
                                                await client.from('support_ticket').update({
                                                    status: 'resolved',
                                                    updated_at: new Date().toISOString()
                                                }).eq('id', ticket.rawId);
                                            }
                                        } catch (dbErr) {
                                            console.warn('[Complaints] Không thể lưu tiến độ RMA vào CSDL:', dbErr);
                                        }
                                    }

                                    PawpalComplaints.showToast(`Đã cập nhật tiến độ RMA sang bước: ${stepNames[currentStep]}!`, 'success');
                                    renderTicketDetail(ticket.id);
                                    PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable?.();
                                } else {
                                    PawpalComplaints.showToast('Hồ sơ RMA đã hoàn tất quy trình 4/4!', 'info');
                                }
                            };
                        }
                    }
                }
                if (rewDet) rewDet.style.display = (optKey === 'reward_voucher' || res.pawpoints) ? 'block' : 'none';
                if (redoDet) redoDet.style.display = (optKey === 'redo_service' || optKey === 'change_staff') ? 'block' : 'none';
                if (refDet) refDet.style.display = (optKey === 'refund' || optKey === 'rma_refund') ? 'block' : 'none';

                if (rewDet && (optKey === 'reward_voucher' || res.pawpoints)) {
                    const pts = document.getElementById('viewRewardPoints');
                    const vc = document.getElementById('viewRewardVoucher');
                    if (pts) pts.textContent = `+${res.pawpoints || 200} Pawpoint`;
                    if (vc) vc.textContent = res.voucherCode || 'PAWPALCARE50';
                }
            } else {
                resolutionBlock.style.display = 'none';
            }
        }

        // Bảng phê duyệt của Quản lý (Status = waiting_manager_approval)
        const managerApprovalPanel = document.getElementById('managerApprovalPanel');
        const isWaitingManager = (ticket.status === 'waiting_manager_approval');
        if (managerApprovalPanel) {
            managerApprovalPanel.style.display = isWaitingManager ? 'block' : 'none';
            if (isWaitingManager) {
                const summaryEl = document.getElementById('managerApprovalSummary');
                const timeEl = document.getElementById('managerApprovalSubmitTime');
                const res = ticket.resolution || {};
                if (summaryEl) {
                    summaryEl.innerHTML = `
                        <div style="font-size: 13px; line-height: 1.5; color: var(--text-main);">
                            <strong>Phương án đề xuất:</strong> ${escapeHtml(res.typeName || res.option || 'Bồi hoàn / Hoàn tiền')}<br>
                            <strong>Lý do và thỏa thuận:</strong> ${escapeHtml(res.note || 'Chờ quản lý xét duyệt hạn mức')}
                        </div>
                    `;
                }
                if (timeEl) {
                    timeEl.textContent = res.resolvedAt ? `Đề xuất: ${new Date(res.resolvedAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}` : 'Đề xuất: Vừa xong';
                }
            }
        }

        // Bảng thông báo mở lại Ticket khi đã đóng / giải quyết
        const isClosed = (ticket.status === 'resolved' || ticket.status === 'closed');
        const reopenBtn = document.getElementById('btnReopenTicket');
        const reopenPanel = document.getElementById('ticketReopenPanel');
        if (reopenBtn) reopenBtn.style.display = isClosed ? 'inline-block' : 'none';
        if (reopenPanel) reopenPanel.style.display = isClosed ? 'block' : 'none';

        // Cảnh báo khách hàng đánh giá < 3 sao
        const lowRatingPanel = document.getElementById('ticketLowRatingAlertPanel');
        const hasLowRating = Boolean(ticket.rating && Number(ticket.rating) <= 2 && !ticket.reprocessed);
        if (lowRatingPanel) lowRatingPanel.style.display = hasLowRating ? 'block' : 'none';

        // Danh sách tin nhắn trao đổi
        renderTicketMessages(ticket);

        // Bằng chứng bằng ảnh/video từ khách hàng
        renderTicketEvidence(ticket);

        // Ảnh check-in lúc tiếp nhận thú cưng (dịch vụ)
        renderTicketCheckinPhotos(ticket);

        // Ảnh đóng gói tại kho (đơn hàng)
        renderTicketWarehousePhotos(ticket);
    }

    function renderTicketMessages(ticket) {
        const container = document.getElementById('viewTicketTimeline');
        if (!container) return;

        // Tin nhắn từ Supabase dùng `messages`; các cập nhật nội bộ trong phiên
        // dùng `timeline`. Gộp cả hai để bản ghi vừa lưu hiển thị ngay và sau reload.
        const messages = [
            ...(ticket.messages || []),
            ...(ticket.timeline || []).map(item => ({
                content: item.desc,
                sender_type: item.isInternal ? 'nhan_vien' : 'cskh',
                is_staff: true,
                created_at: item.created_at || null
            }))
        ].filter((msg, index, list) => list.findIndex(other =>
            String(other.content || other.message_body || '') === String(msg.content || msg.message_body || '') &&
            String(other.created_at || '') === String(msg.created_at || '')
        ) === index);
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
        const container = document.getElementById('viewTicketCustomerEvidence');
        if (!container) return;

        const evidence = ticket.evidence || [];
        if (evidence.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; font-style: italic; padding: 8px 0;">Chưa có ảnh bằng chứng đính kèm từ khách hàng.</div>';
            return;
        }

        container.innerHTML = evidence.map((ev, idx) => {
            const url = typeof ev === 'string' ? ev : (ev.url || '');
            const title = typeof ev === 'object' && ev.title ? ev.title : `Ảnh bằng chứng ${idx + 1}`;
            return `
                <div class="evidence-photo-thumb" style="cursor: pointer; display: inline-block; margin-right: 8px;" title="Nhấn để phóng to ảnh">
                    <img src="${escapeHtml(url)}" alt="${escapeHtml(title)}" style="width: 60px; height: 60px; border-radius: 9px; object-fit: cover; border: 1px solid var(--border-neutral, #ECF2EE);">
                </div>
            `;
        }).join('');

        container.querySelectorAll('.evidence-photo-thumb').forEach((thumb, idx) => {
            thumb.addEventListener('click', () => {
                const ev = evidence[idx];
                const url = typeof ev === 'string' ? ev : (ev.url || '');
                const title = typeof ev === 'object' && ev.title ? ev.title : `Ảnh bằng chứng ${idx + 1}`;
                openImagePreviewModal(url, title, `Đính kèm hồ sơ khiếu nại ${ticket.id}`);
            });
        });
    }

    function renderTicketCheckinPhotos(ticket) {
        const container = document.getElementById('viewTicketCheckinPhotos');
        if (!container) return;

        const photos = ticket.checkinPhotos || [];
        if (photos.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; font-style: italic; padding: 8px 0;">Chưa có ảnh chụp tại thời điểm tiếp nhận ca dịch vụ.</div>';
            return;
        }

        container.innerHTML = photos.map((ph, idx) => {
            const url = typeof ph === 'string' ? ph : (ph.url || '');
            const title = typeof ph === 'object' && ph.title ? ph.title : `Ảnh check-in ${idx + 1}`;
            return `
                <div class="evidence-photo-thumb" style="cursor: pointer; display: inline-block; margin-right: 8px;" title="Nhấn để phóng to ảnh">
                    <img src="${escapeHtml(url)}" alt="${escapeHtml(title)}" style="width: 60px; height: 60px; border-radius: 9px; object-fit: cover; border: 1px solid var(--border-neutral, #ECF2EE);">
                </div>
            `;
        }).join('');

        container.querySelectorAll('.evidence-photo-thumb').forEach((thumb, idx) => {
            thumb.addEventListener('click', () => {
                const ph = photos[idx];
                const url = typeof ph === 'string' ? ph : (ph.url || '');
                const title = typeof ph === 'object' && ph.title ? ph.title : `Ảnh check-in ${idx + 1}`;
                openImagePreviewModal(url, title, `Ảnh đối chứng đón bé - ${ticket.id}`);
            });
        });
    }

    function renderTicketWarehousePhotos(ticket) {
        const container = document.getElementById('viewTicketOrderWarehousePhotos');
        if (!container) return;

        const photos = ticket.warehousePhotos || [];
        if (photos.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; font-style: italic; padding: 8px 0;">Chưa có ảnh chụp đóng gói xuất kho cho đơn hàng này.</div>';
            return;
        }

        container.innerHTML = photos.map((ph, idx) => {
            const url = typeof ph === 'string' ? ph : (ph.url || '');
            const title = typeof ph === 'object' && ph.title ? ph.title : `Ảnh xuất kho ${idx + 1}`;
            return `
                <div class="evidence-photo-thumb" style="cursor: pointer; display: inline-block; margin-right: 8px;" title="Nhấn để phóng to ảnh">
                    <img src="${escapeHtml(url)}" alt="${escapeHtml(title)}" style="width: 60px; height: 60px; border-radius: 9px; object-fit: cover; border: 1px solid var(--border-neutral, #ECF2EE);">
                </div>
            `;
        }).join('');

        container.querySelectorAll('.evidence-photo-thumb').forEach((thumb, idx) => {
            thumb.addEventListener('click', () => {
                const ph = photos[idx];
                const url = typeof ph === 'string' ? ph : (ph.url || '');
                const title = typeof ph === 'object' && ph.title ? ph.title : `Ảnh xuất kho ${idx + 1}`;
                openImagePreviewModal(url, title, `Ảnh kiểm tra đóng gói đơn hàng - ${ticket.orderId || ticket.id}`);
            });
        });
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

    let isDetailInitialized = false;
    function initComplaintDetailSubtab() {
        if (isDetailInitialized) return;
        isDetailInitialized = true;
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
        if (btnConfirmResolve && btnConfirmResolve.dataset.resolveBound !== 'true') {
            btnConfirmResolve.dataset.resolveBound = 'true';
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
                const currentStaffName = (typeof PawpalComplaints !== 'undefined' && PawpalComplaints.getCurrentStaffName) ? PawpalComplaints.getCurrentStaffName() : 'Quản trị viên';
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
                        author: `${currentStaffName} (CSKH)`,
                        title: needsManager ? 'Đề xuất giải quyết (Chờ duyệt)' : 'Đã giải quyết khiếu nại',
                        desc: `Phương án: ${optVal}. Lý do: ${note}`,
                        isInternal: true
                    });
                }

                // Đồng bộ cập nhật trạng thái lên Supabase trước khi xác nhận thành công.
                const clientResolve = getDbClient();
                if (!clientResolve || !ticket.rawId) {
                    PawpalComplaints.showToast('Không xác định được kết nối hoặc mã khiếu nại để lưu trạng thái.', 'error');
                    return;
                }
                const { error: resolveError } = await clientResolve.from('support_ticket').update({
                    status: needsManager ? 'processing' : 'completed',
                    updated_at: new Date().toISOString()
                }).eq('id', ticket.rawId);
                if (resolveError) {
                    console.error('[Complaints] Update resolve status error:', resolveError);
                    PawpalComplaints.showToast(`Không thể cập nhật trạng thái: ${resolveError.message || 'Lỗi CSDL'}`, 'error');
                    return;
                }

                // Lưu vết đề xuất vào nhật ký xử lý support_ticket_message
                await clientResolve.from('support_ticket_message').insert([{
                    ticket_id: ticket.rawId,
                    sender_type: 'cskh',
                    content: `[Phương án xử lý] ${optVal}: ${note}`,
                    agent_name: currentStaffName
                }]).catch(() => null);

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
        if (btnConfirmAssign && btnConfirmAssign.dataset.assignBound !== 'true') {
            btnConfirmAssign.dataset.assignBound = 'true';
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
                const currentAdminName = (typeof PawpalComplaints !== 'undefined' && PawpalComplaints.getCurrentStaffName) ? PawpalComplaints.getCurrentStaffName() : 'Quản trị viên';
                if (ticket) {
                    const oldStaff = ticket.staffAssigned || 'Chưa phân công';
                    ticket.staffAssigned = newStaff;
                    if (!ticket.timeline) ticket.timeline = [];
                    const now = new Date();
                    ticket.timeline.unshift({
                        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
                        author: `${currentAdminName} (CSKH)`,
                        title: 'Chuyển người phụ trách xử lý',
                        desc: `Chuyển giao từ ${oldStaff} sang ${newStaff}. Dặn dò: ${note}`,
                        isInternal: true
                    });
                }

                const clientAssign = getDbClient();
                if (!clientAssign || !ticket?.rawId) {
                    PawpalComplaints.showToast('Không xác định được kết nối hoặc mã khiếu nại để lưu người phụ trách.', 'error');
                    return;
                }

                // Cập nhật assigned_staff_id vào support_ticket nếu tìm thấy nhân sự tương ứng
                const staffList = PawpalComplaints.state?.cachedStaff || [];
                const matchedStaff = staffList.find(s => s.full_name === newStaff || s.id === newStaff);
                if (matchedStaff?.id) {
                    try {
                        await clientAssign.from('support_ticket').update({
                            assigned_staff_id: matchedStaff.id,
                            updated_at: new Date().toISOString()
                        }).eq('id', ticket.rawId);
                    } catch (_) {}
                }

                const { error: assignError } = await clientAssign.from('support_ticket_message').insert([{
                    ticket_id: ticket.rawId,
                    sender_type: 'cskh',
                    content: `[Phân công] ${note}`,
                    agent_name: newStaff
                }]);
                if (assignError) {
                    console.error('[Complaints] Update assigned staff error:', assignError);
                    PawpalComplaints.showToast(`Không thể lưu người phụ trách: ${assignError.message || 'Lỗi CSDL'}`, 'error');
                    return;
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

                const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
                const currentTicket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId);
                const targetDbId = currentTicket?.rawId || ticketId;

                const client = getDbClient();
                if (!client) {
                    PawpalComplaints.showToast('Không xác định được kết nối để gửi phản hồi.', 'error');
                    return;
                }
                const staffName = (typeof PawpalComplaints !== 'undefined' && PawpalComplaints.getCurrentStaffName) ? PawpalComplaints.getCurrentStaffName() : 'Quản trị viên';
                const { error: sendError } = await client.from('support_ticket_message').insert([{
                    ticket_id: targetDbId,
                    sender_type: 'cskh',
                    content: text,
                    agent_name: staffName
                }]);
                if (sendError) {
                    console.error('[Complaints] Gửi phản hồi lỗi:', sendError);
                    PawpalComplaints.showToast(`Không thể gửi phản hồi: ${sendError.message || 'Lỗi CSDL'}`, 'error');
                    return;
                }

                window.PawpalDataStore?.emitMutation?.('support_ticket_message', 'INSERT', { ticket_id: targetDbId });
                window.PawpalDataStore?.invalidate?.(`complaints:messages:${targetDbId}`);
                if (currentTicket) currentTicket._messagesLoaded = false;

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
        if (btnSendReqInfo && btnSendReqInfo.dataset.requestInfoBound !== 'true') {
            btnSendReqInfo.dataset.requestInfoBound = 'true';
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
                const clientRequest = getDbClient();
                if (!clientRequest || !ticket?.rawId) {
                    PawpalComplaints.showToast('Không xác định được kết nối hoặc mã khiếu nại để lưu yêu cầu.', 'error');
                    return;
                }
                const staffName = (typeof PawpalComplaints !== 'undefined' && PawpalComplaints.getCurrentStaffName) ? PawpalComplaints.getCurrentStaffName() : 'Quản trị viên';
                const { error: requestMessageError } = await clientRequest.from('support_ticket_message').insert([{
                    ticket_id: ticket.rawId,
                    sender_type: 'cskh',
                    content: `[${channelLabel}] ${message}`,
                    agent_name: staffName
                }]);
                if (requestMessageError) {
                    console.error('[Complaints] Lưu yêu cầu bổ sung lỗi:', requestMessageError);
                    PawpalComplaints.showToast(`Không thể lưu yêu cầu: ${requestMessageError.message || 'Lỗi CSDL'}`, 'error');
                    return;
                }
                const { error: requestStatusError } = await clientRequest.from('support_ticket').update({
                    status: 'waiting_customer',
                    updated_at: new Date().toISOString()
                }).eq('id', ticket.rawId);
                if (requestStatusError) {
                    console.error('[Complaints] Cập nhật trạng thái chờ khách lỗi:', requestStatusError);
                    PawpalComplaints.showToast(`Không thể cập nhật trạng thái: ${requestStatusError.message || 'Lỗi CSDL'}`, 'error');
                    return;
                }
                if (ticket) {
                    ticket.status = 'waiting_customer';
                    ticket.waitingCustomerSince = new Date().toISOString();
                    if (!ticket.timeline) ticket.timeline = [];
                    const now = new Date();
                    ticket.timeline.unshift({
                        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
                        author: `${staffName} (CSKH)`,
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

        // ====================================================================
        // GỬI PHẢN HỒI / GHI CHÚ NỘI BỘ VÀO NHẬT KÝ
        // ====================================================================
        const btnSubmitReply = document.getElementById('btnSubmitReply');
        if (btnSubmitReply) {
            if (btnSubmitReply.dataset.replyBound === 'true') return;
            btnSubmitReply.dataset.replyBound = 'true';
            btnSubmitReply.addEventListener('click', async () => {
                const textarea = document.getElementById('replyContentInput');
                const content = (textarea?.value || '').trim();
                if (!content) {
                    PawpalComplaints.showToast('Vui lòng nhập nội dung ghi chú hoặc phản hồi.', 'warning');
                    return;
                }

                const ticketId = PawpalComplaints.state.currentTicketId;
                const serviceComplaints = PawpalComplaints.state?.serviceComplaints || [];
                const orderComplaints = PawpalComplaints.state?.orderComplaints || [];
                const ticket = [...serviceComplaints, ...orderComplaints].find(t => t.id === ticketId || t.rawId === ticketId);
                if (!ticket) return;

                const replyTypeInput = document.querySelector('input[name="replyType"]:checked');
                const isInternal = replyTypeInput ? replyTypeInput.value === 'internal' : true;
                const activeStaff = (typeof PawpalComplaints !== 'undefined' && PawpalComplaints.getCurrentStaffName) ? PawpalComplaints.getCurrentStaffName() : 'Quản trị viên';
                const authorName = `${activeStaff} (CSKH)`;
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

                // Ghi trực tiếp vào Supabase và chỉ cập nhật giao diện sau khi insert thành công.
                const clientMsg = getDbClient();
                if (!clientMsg || !ticket.rawId) {
                    PawpalComplaints.showToast('Không xác định được kết nối hoặc mã khiếu nại để lưu nhật ký.', 'error');
                    return;
                }
                try {
                        const { error: messageError } = await clientMsg.from('support_ticket_message').insert([{
                            ticket_id: ticket.rawId,
                            sender_type: isInternal ? 'nhan_vien' : 'cskh',
                            content: content,
                            agent_name: activeStaff
                        }]);
                        if (messageError) throw messageError;
                        const { error: ticketError } = await clientMsg.from('support_ticket').update({
                            updated_at: now.toISOString()
                        }).eq('id', ticket.rawId);
                        if (ticketError) throw ticketError;
                    } catch (e) {
                        console.error('[Complaints] Lưu tin nhắn Supabase lỗi:', e);
                        PawpalComplaints.showToast(`Không thể lưu nhật ký: ${e?.message || 'Lỗi CSDL hoặc quyền truy cập'}`, 'error');
                        return;
                }

                if (!ticket.timeline) ticket.timeline = [];
                ticket.timeline.unshift({
                    time: timeStr,
                    author: authorName,
                    title: isInternal ? 'Ghi chú nội bộ' : 'Phản hồi cho khách hàng',
                    desc: content,
                    isInternal: isInternal
                });
                PawpalComplaints.saveComplaintsOverrides?.();
                renderTicketDetail(ticketId);
                if (textarea) textarea.value = '';
                PawpalComplaints.showToast('Đã lưu phản hồi vào nhật ký thành công!', 'success');
            });
        }

        // ====================================================================
        // QUẢN LÝ PHÊ DUYỆT BỒI HOÀN (WAITING_MANAGER_APPROVAL)
        // ====================================================================
        const btnApprove = document.getElementById('btnManagerApproveProposal');
        if (btnApprove && btnApprove.dataset.bound !== 'true') {
            btnApprove.dataset.bound = 'true';
            btnApprove.addEventListener('click', async () => {
                // K-07: Kiểm tra quyền quản lý / admin
                const currentRole = sessionStorage.getItem('pawpal_admin_system_role') || sessionStorage.getItem('pawpal_user_role') || 'ADMIN';
                if (currentRole !== 'ADMIN' && currentRole !== 'MANAGER') {
                    PawpalComplaints.showToast('Chỉ Quản lý hoặc Quản trị viên mới có quyền phê duyệt phương án bồi hoàn!', 'danger');
                    return;
                }

                const ticketId = PawpalComplaints.state?.currentTicketId;
                const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
                const ticket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId);
                if (!ticket) return;

                const client = getDbClient();
                const approverName = sessionStorage.getItem('pawpal_admin_user_name') || 'Quản lý';
                if (client && ticket.rawId) {
                    const { error } = await client.from('support_ticket').update({
                        status: 'completed',
                        updated_at: new Date().toISOString()
                    }).eq('id', ticket.rawId);
                    if (error) {
                        PawpalComplaints.showToast('Không thể cập nhật phê duyệt: ' + error.message, 'danger');
                        return;
                    }

                    // K-06: Ghi nhận vết phê duyệt vào tin nhắn nội bộ support_ticket_message
                    try {
                        await client.from('support_ticket_message').insert({
                            ticket_id: ticket.rawId,
                            sender_type: 'cskh',
                            agent_name: approverName,
                            message: `[PHÊ DUYỆT] Quản lý đã phê duyệt phương án bồi hoàn (${ticket.resolution?.typeName || ticket.resolution?.option || 'Bồi hoàn'}). Trạng thái chuyển thành Đã giải quyết.`,
                            is_internal: true
                        });
                    } catch (_) {}
                }
                ticket.status = 'resolved';
                if (!ticket.timeline) ticket.timeline = [];
                const now = new Date();
                ticket.timeline.unshift({
                    time: PawpalComplaints.formatDateTime ? PawpalComplaints.formatDateTime(now) : `${now.getHours()}:${now.getMinutes()} - ${now.toLocaleDateString('vi-VN')}`,
                    author: `${approverName} (Quản lý)`,
                    title: 'Phê duyệt phương án bồi hoàn',
                    desc: `Quản lý đã phê duyệt phương án: ${ticket.resolution?.typeName || 'Bồi hoàn'}. Hồ sơ chuyển sang Đã giải quyết.`,
                    isInternal: true
                });
                PawpalComplaints.saveComplaintsOverrides?.();
                PawpalComplaints.updateComplaintsKpis?.();
                PawpalComplaints.renderComplaintsAlertBar?.();
                renderTicketDetail(ticket.id);
                PawpalComplaints.subtabs.services?.renderServiceComplaintsTable?.();
                PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable?.();
                PawpalComplaints.showToast(`Đã phê duyệt phương án giải quyết cho khiếu nại ${ticket.id}!`, 'success');
            });
        }

        // Nút từ chối đề xuất bồi hoàn
        const btnReject = document.getElementById('btnManagerRejectProposal');
        if (btnReject && btnReject.dataset.bound !== 'true') {
            btnReject.dataset.bound = 'true';
            btnReject.addEventListener('click', async () => {
                // K-07: Kiểm tra quyền quản lý / admin
                const currentRole = sessionStorage.getItem('pawpal_admin_system_role') || sessionStorage.getItem('pawpal_user_role') || 'ADMIN';
                if (currentRole !== 'ADMIN' && currentRole !== 'MANAGER') {
                    PawpalComplaints.showToast('Chỉ Quản lý hoặc Quản trị viên mới có quyền từ chối phương án bồi hoàn!', 'danger');
                    return;
                }

                const ticketId = PawpalComplaints.state?.currentTicketId;
                const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
                const ticket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId);
                if (!ticket) return;

                const client = getDbClient();
                const approverName = sessionStorage.getItem('pawpal_admin_user_name') || 'Quản lý';
                if (client && ticket.rawId) {
                    const { error } = await client.from('support_ticket').update({
                        status: 'processing',
                        updated_at: new Date().toISOString()
                    }).eq('id', ticket.rawId);
                    if (error) {
                        PawpalComplaints.showToast('Không thể cập nhật từ chối: ' + error.message, 'danger');
                        return;
                    }

                    // K-06: Ghi nhận vết từ chối vào support_ticket_message
                    try {
                        await client.from('support_ticket_message').insert({
                            ticket_id: ticket.rawId,
                            sender_type: 'cskh',
                            agent_name: approverName,
                            message: `[TỪ CHỐI] Quản lý đã từ chối phương án đề xuất. Yêu cầu CSKH rà soát và đề xuất lại.`,
                            is_internal: true
                        });
                    } catch (_) {}
                }
                ticket.status = 'processing';
                if (!ticket.timeline) ticket.timeline = [];
                const now = new Date();
                ticket.timeline.unshift({
                    time: PawpalComplaints.formatDateTime ? PawpalComplaints.formatDateTime(now) : `${now.getHours()}:${now.getMinutes()} - ${now.toLocaleDateString('vi-VN')}`,
                    author: `${approverName} (Quản lý)`,
                    title: 'Từ chối đề xuất bồi hoàn',
                    desc: 'Quản lý yêu cầu nhân viên CSKH rà soát lại thỏa thuận và đề xuất phương án phù hợp hơn.',
                    isInternal: true
                });
                PawpalComplaints.saveComplaintsOverrides?.();
                PawpalComplaints.updateComplaintsKpis?.();
                PawpalComplaints.renderComplaintsAlertBar?.();
                renderTicketDetail(ticket.id);
                PawpalComplaints.subtabs.services?.renderServiceComplaintsTable?.();
                PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable?.();
                PawpalComplaints.showToast(`Đã từ chối đề xuất, chuyển khiếu nại ${ticket.id} về trạng thái Đang xử lý!`, 'info');
            });
        }

        // ====================================================================
        // MỞ LẠI TICKET KHI ĐÃ ĐÓNG / GIẢI QUYẾT
        // ====================================================================
        const handleReopenTicket = async () => {
            const ticketId = PawpalComplaints.state?.currentTicketId;
            const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
            const ticket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId);
            if (!ticket) return;

            const client = getDbClient();
            if (client && ticket.rawId) {
                const { error } = await client.from('support_ticket').update({
                    status: 'processing',
                    updated_at: new Date().toISOString()
                }).eq('id', ticket.rawId);
                if (error) {
                    PawpalComplaints.showToast('Không thể mở lại Ticket: ' + error.message, 'error');
                    return;
                }
            }
            ticket.status = 'processing';
            if (!ticket.timeline) ticket.timeline = [];
            const now = new Date();
            const staffName = (typeof PawpalComplaints !== 'undefined' && PawpalComplaints.getCurrentStaffName) ? PawpalComplaints.getCurrentStaffName() : 'Quản trị viên';
            ticket.timeline.unshift({
                time: PawpalComplaints.formatDateTime ? PawpalComplaints.formatDateTime(now) : `${now.getHours()}:${now.getMinutes()} - ${now.toLocaleDateString('vi-VN')}`,
                author: `${staffName} (CSKH)`,
                title: 'Mở lại hồ sơ khiếu nại',
                desc: 'Khách hàng có phản hồi bổ sung, hệ thống mở lại Ticket để tiếp tục theo dõi và xử lý.',
                isInternal: true
            });
            PawpalComplaints.saveComplaintsOverrides?.();
            PawpalComplaints.updateComplaintsKpis?.();
            PawpalComplaints.renderComplaintsAlertBar?.();
            renderTicketDetail(ticket.id);
            PawpalComplaints.subtabs.services?.renderServiceComplaintsTable?.();
            PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable?.();
            PawpalComplaints.showToast(`Đã mở lại hồ sơ khiếu nại ${ticket.id} để tiếp tục xử lý!`, 'success');
        };

        const btnReopenHeader = document.getElementById('btnReopenTicket');
        if (btnReopenHeader && btnReopenHeader.dataset.bound !== 'true') {
            btnReopenHeader.dataset.bound = 'true';
            btnReopenHeader.addEventListener('click', handleReopenTicket);
        }

        const btnTriggerReopen = document.getElementById('btnTriggerReopenTicket');
        if (btnTriggerReopen && btnTriggerReopen.dataset.bound !== 'true') {
            btnTriggerReopen.dataset.bound = 'true';
            btnTriggerReopen.addEventListener('click', handleReopenTicket);
        }

        // ====================================================================
        // HOÀN TẤT CAN THIỆP LẦN 2 CHO ĐÁNH GIÁ < 3 SAO
        // ====================================================================
        const btnReprocess = document.getElementById('btnResolveReprocess');
        if (btnReprocess && btnReprocess.dataset.bound !== 'true') {
            btnReprocess.dataset.bound = 'true';
            btnReprocess.addEventListener('click', async () => {
                const ticketId = PawpalComplaints.state?.currentTicketId;
                const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
                const ticket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId);
                if (!ticket) return;

                const managerName = (typeof PawpalComplaints !== 'undefined' && PawpalComplaints.getCurrentStaffName) ? PawpalComplaints.getCurrentStaffName() : 'Quản lý';
                const client = getDbClient();
                if (client && ticket.rawId) {
                    try {
                        await client.from('support_ticket_message').insert([{
                            ticket_id: ticket.rawId,
                            sender_type: 'cskh',
                            content: '[Xử lý lần 2] Đã liên hệ giải tỏa khúc mắc và hoàn tất thỏa thuận chăm sóc khách hàng.',
                            agent_name: managerName
                        }]);
                        await client.from('support_ticket').update({
                            status: 'resolved',
                            updated_at: new Date().toISOString()
                        }).eq('id', ticket.rawId);
                    } catch (dbErr) {
                        console.warn('[Complaints] Lưu xử lý lần 2 lên CSDL lỗi:', dbErr);
                    }
                }

                ticket.status = 'resolved';
                ticket.reprocessed = true;
                if (!ticket.timeline) ticket.timeline = [];
                const now = new Date();
                ticket.timeline.unshift({
                    time: PawpalComplaints.formatDateTime ? PawpalComplaints.formatDateTime(now) : `${now.getHours()}:${now.getMinutes()} - ${now.toLocaleDateString('vi-VN')}`,
                    author: `${managerName} (Quản lý)`,
                    title: 'Hoàn tất can thiệp xử lý lần 2',
                    desc: 'Quản lý đã gọi điện trực tiếp giải thích, giải tỏa khúc mắc và gửi quà tri ân tới khách hàng.',
                    isInternal: true
                });
                PawpalComplaints.saveComplaintsOverrides?.();
                renderTicketDetail(ticket.id);
                PawpalComplaints.showToast('Đã hoàn tất can thiệp xử lý lần 2 thành công!', 'success');
            });
        }

        // ====================================================================
        // TẢI ẢNH BẰNG CHỨNG TỪ KHÁCH, CHECK-IN ĐÓN BÉ VÀ XUẤT KHO
        // ====================================================================
        function validateImageFiles(fileList) {
            const valid = [];
            for (const file of fileList) {
                if (!file.type || !file.type.startsWith('image/')) {
                    PawpalComplaints.showToast(`File ${file.name} không phải định dạng ảnh hợp lệ.`, 'warning');
                    continue;
                }
                if (file.size > 5 * 1024 * 1024) {
                    PawpalComplaints.showToast(`Ảnh ${file.name} vượt quá dung lượng tối đa 5MB.`, 'warning');
                    continue;
                }
                valid.push(file);
            }
            return valid;
        }

        const btnUploadMoreEvidence = document.getElementById('btnTriggerUploadMoreEvidence');
        const inputUploadMoreEvidence = document.getElementById('inputUploadMoreEvidence');
        if (btnUploadMoreEvidence && inputUploadMoreEvidence && btnUploadMoreEvidence.dataset.bound !== 'true') {
            btnUploadMoreEvidence.dataset.bound = 'true';
            btnUploadMoreEvidence.addEventListener('click', () => inputUploadMoreEvidence.click());
            inputUploadMoreEvidence.addEventListener('change', (e) => {
                const files = validateImageFiles(Array.from(e.target.files || []));
                if (files.length === 0) return;
                const ticketId = PawpalComplaints.state?.currentTicketId;
                const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
                const ticket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId);
                if (!ticket) return;

                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        if (!ticket.evidence) ticket.evidence = [];
                        ticket.evidence.push({ url: evt.target.result, title: file.name });
                        renderTicketEvidence(ticket);
                        PawpalComplaints.saveComplaintsOverrides?.();
                    };
                    reader.readAsDataURL(file);
                });
                PawpalComplaints.showToast(`Đã tải lên ${files.length} ảnh bằng chứng thành công!`, 'success');
                inputUploadMoreEvidence.value = '';
            });
        }

        const btnUploadCheckin = document.getElementById('btnTriggerUploadCheckinPhoto');
        const inputUploadCheckin = document.getElementById('inputUploadCheckinPhoto');
        if (btnUploadCheckin && inputUploadCheckin && btnUploadCheckin.dataset.bound !== 'true') {
            btnUploadCheckin.dataset.bound = 'true';
            btnUploadCheckin.addEventListener('click', () => inputUploadCheckin.click());
            inputUploadCheckin.addEventListener('change', (e) => {
                const files = validateImageFiles(Array.from(e.target.files || []));
                if (files.length === 0) return;
                const ticketId = PawpalComplaints.state?.currentTicketId;
                const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
                const ticket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId);
                if (!ticket) return;

                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        if (!ticket.checkinPhotos) ticket.checkinPhotos = [];
                        ticket.checkinPhotos.push({ url: evt.target.result, title: file.name });
                        renderTicketCheckinPhotos(ticket);
                        PawpalComplaints.saveComplaintsOverrides?.();
                    };
                    reader.readAsDataURL(file);
                });
                PawpalComplaints.showToast(`Đã bổ sung ${files.length} ảnh đón bé thành công!`, 'success');
                inputUploadCheckin.value = '';
            });
        }

        const btnUploadWarehouse = document.getElementById('btnTriggerUploadWarehousePhoto');
        const inputUploadWarehouse = document.getElementById('inputUploadWarehousePhoto');
        if (btnUploadWarehouse && inputUploadWarehouse && btnUploadWarehouse.dataset.bound !== 'true') {
            btnUploadWarehouse.dataset.bound = 'true';
            btnUploadWarehouse.addEventListener('click', () => inputUploadWarehouse.click());
            inputUploadWarehouse.addEventListener('change', (e) => {
                const files = validateImageFiles(Array.from(e.target.files || []));
                if (files.length === 0) return;
                const ticketId = PawpalComplaints.state?.currentTicketId;
                const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
                const ticket = allTickets.find(t => t.id === ticketId || t.rawId === ticketId);
                if (!ticket) return;

                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        if (!ticket.warehousePhotos) ticket.warehousePhotos = [];
                        ticket.warehousePhotos.push({ url: evt.target.result, title: file.name });
                        renderTicketWarehousePhotos(ticket);
                        PawpalComplaints.saveComplaintsOverrides?.();
                    };
                    reader.readAsDataURL(file);
                });
                PawpalComplaints.showToast(`Đã bổ sung ${files.length} ảnh kiểm tra kho thành công!`, 'success');
                inputUploadWarehouse.value = '';
            });
        }

        const initialTicketId = sessionStorage.getItem('pawpal_admin_complaint_selected_id') || null;
        renderTicketDetail(initialTicketId);
    }

    function openAssignHandlerModal() {
        const modal = document.getElementById('assignHandlerModalOverlay');
        if (!modal) return;

        const selectStaff = document.getElementById('selectAssignStaff');
        if (selectStaff) {
            const staff = PawpalComplaints.state?.cachedStaff || [];
            selectStaff.innerHTML = staff.filter(s => s?.full_name).map(s => `<option value="${PawpalComplaints.escapeHtml(s.full_name)}">${PawpalComplaints.escapeHtml(s.full_name)}</option>`).join('');
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

