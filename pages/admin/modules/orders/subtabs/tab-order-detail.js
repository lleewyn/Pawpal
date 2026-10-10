// tab-order-detail.js - Subtab Hồ sơ đơn hàng 360° của Phân hệ Bán hàng Pawpal-er
(function() {
    'use strict';

    const PawpalOrders = window.PawpalOrders;
    if (!PawpalOrders) {
        console.error('[Orders Detail] Không tìm thấy window.PawpalOrders core!');
        return;
    }

    const { helpers, state } = PawpalOrders;
    const { formatVND, formatDateTime, formatTime, showToast, persistOrdersData } = helpers;

    // Render chi tiết đơn hàng 360°
    function renderOrderDetail(orderId) {
        const ordersList = state.orders || [];
        const order = ordersList.find(o => o.id === orderId) || ordersList[0];

        if (!order) {
            const codeEl = document.getElementById('detailOrderCode');
            const metaEl = document.getElementById('detailOrderMeta');
            const actionBtnsEl = document.getElementById('detailOrderActionButtons');
            const itemsTbody = document.getElementById('detailOrderItemsBody');
            if (codeEl) codeEl.textContent = 'Chưa có đơn hàng';
            if (metaEl) metaEl.textContent = 'Vui lòng chọn một đơn hàng từ danh sách để xem hồ sơ chi tiết.';
            if (actionBtnsEl) actionBtnsEl.innerHTML = '';
            if (itemsTbody) {
                itemsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);">Chưa có đơn hàng nào phát sinh trên hệ thống.</td></tr>';
            }
            const subtotalEl = document.getElementById('detailSummarySubtotal');
            if (subtotalEl) subtotalEl.textContent = '0 đ';
            const shipEl = document.getElementById('detailSummaryShipping');
            if (shipEl) shipEl.textContent = '0 đ';
            const voucherEl = document.getElementById('detailSummaryVoucher');
            if (voucherEl) voucherEl.textContent = '0 đ';
            const pointsEl = document.getElementById('detailSummaryPoints');
            if (pointsEl) pointsEl.textContent = '0 đ';
            const totalEl = document.getElementById('detailSummaryTotal');
            if (totalEl) totalEl.textContent = '0 đ';
            return;
        }

        state.selectedOrderId = order.id;
        sessionStorage.setItem('pawpal_admin_order_selected_id', order.id);

        // Header bar
        const codeEl = document.getElementById('detailOrderCode');
        const metaEl = document.getElementById('detailOrderMeta');
        const actionBtnsEl = document.getElementById('detailOrderActionButtons');

        if (codeEl) codeEl.textContent = order.id;
        if (metaEl) {
            const dateObj = new Date(order.createdAt);
            metaEl.textContent = `Đặt lúc: ${formatDateTime(dateObj)} | Kênh đặt: Website PawPal`;
        }

        // Nút thao tác một chạm theo trạng thái
        if (actionBtnsEl) {
            let btnsHtml = '';
            if (order.status === 'pending') {
                btnsHtml += `
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openCancelModal('${order.id}')" style="color: #DC2626;">Hủy đơn</button>
                    <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.confirmOrder('${order.id}')">Xác nhận đơn</button>
                `;
            } else if (order.status === 'confirmed') {
                btnsHtml += `
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.printPackingSlip('${order.id}')">In phiếu đóng gói</button>
                    <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.openShipModal('${order.id}')">Bàn giao vận chuyển</button>
                `;
            } else if (order.status === 'shipping') {
                btnsHtml += `
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openShipModal('${order.id}')">Cập nhật vận đơn</button>
                    <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.completeDelivery('${order.id}')">Đã giao hàng thành công</button>
                `;
            } else if (order.status === 'delivered') {
                if (order.paymentMethod !== 'cod' && order.paymentStatus === 'unpaid' && order.paymentStatus !== 'paid') {
                    btnsHtml += `
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.confirmPayment('${order.id}')">Xác nhận thu tiền</button>
                    `;
                } else if (order.paymentMethod === 'cod' && (order.paymentStatus === 'cod_pending' || order.paymentStatus === 'unpaid') && order.paymentStatus !== 'paid') {
                    btnsHtml += `
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.reconcileCod('${order.id}')" style="color: #236B48; font-weight: 600;">Đối soát tiền COD bưu cục</button>
                    `;
                }
                btnsHtml += `
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openRmaTicket('${order.id}')">Tạo khiếu nại và Đổi trả</button>
                    <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.completeOrder('${order.id}')">Hoàn tất đơn hàng</button>
                `;
            } else if (order.status === 'completed') {
                if (order.paymentMethod === 'cod' && (order.paymentStatus === 'cod_pending' || order.paymentStatus === 'unpaid') && order.paymentStatus !== 'paid') {
                    btnsHtml += `
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.reconcileCod('${order.id}')" style="color: #236B48; font-weight: 600;">Đối soát tiền COD bưu cục</button>
                    `;
                }
                btnsHtml += `
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.printInvoice('${order.id}')">In hóa đơn</button>
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openRmaTicket('${order.id}')">Tạo khiếu nại và Đổi trả</button>
                `;
            }
            actionBtnsEl.innerHTML = btnsHtml;
        }

        // Khối hồ sơ Đổi trả và Bồi hoàn RMA (nếu có)
        const rmaBannerContainer = document.getElementById('detailOrderRmaBannerContainer');
        if (rmaBannerContainer) {
            if (order.rmaInfo) {
                const rma = order.rmaInfo;
                rmaBannerContainer.innerHTML = `
                    <div class="order-rma-detail-card">
                        <div class="rma-card-left">
                            <div class="rma-card-title">
                                <span>HỒ SƠ ĐỔI TRẢ VÀ HOÀN TIỀN (RMA)</span>
                                <span class="admin-badge badge-cancelled">${rma.id}</span>
                            </div>
                            <div class="rma-card-sub">
                                Hình thức: <strong>${rma.solutionTypeName}</strong> | Lý do: <strong>${rma.reasonText}</strong> | Kiểm định kho: <strong>${rma.restockText}</strong> | Bồi hoàn: <strong style="color: #236B48;">${rma.refundText}</strong>
                            </div>
                        </div>
                        <button type="button" class="btn-rma-link-complaint" onclick="PawpalOrdersModule.openComplaintModule('${rma.id}')">Xem hồ sơ tại phân hệ Khiếu nại -></button>
                    </div>
                `;
            } else {
                rmaBannerContainer.innerHTML = '';
            }
        }

        // Danh sách sản phẩm
        const itemsTbody = document.getElementById('detailOrderItemsBody');
        if (itemsTbody) {
            itemsTbody.innerHTML = (order.products || []).map(p => `
                <tr>
                    <td>
                        <div class="prod-item-row">
                            <img src="${p.image}" alt="${p.name}" class="prod-thumb" onerror="this.src='/assets/images/shop/products/tp-hat-01.png'">
                            <div class="prod-info-cell">
                                <span class="prod-title">${p.name}</span>
                                <span class="prod-sku-tag">Quy cách: ${p.spec || 'Tiêu chuẩn'}</span>
                            </div>
                        </div>
                    </td>
                    <td style="font-family: monospace; color: var(--text-muted);">${p.sku}</td>
                    <td>${formatVND(p.price)}</td>
                    <td style="text-align: center; font-weight: 600;">${p.quantity}</td>
                    <td style="text-align: right; font-weight: 700; color: var(--text-heading);">${formatVND(p.total || (p.price * p.quantity))}</td>
                </tr>
            `).join('');
        }

        // Bảng kê thanh toán
        const subtotalEl = document.getElementById('detailSummarySubtotal');
        const shipEl = document.getElementById('detailSummaryShipping');
        const voucherEl = document.getElementById('detailSummaryVoucher');
        const pointsEl = document.getElementById('detailSummaryPoints');
        const totalEl = document.getElementById('detailSummaryTotal');

        if (subtotalEl) subtotalEl.textContent = formatVND(order.subtotal);
        if (shipEl) shipEl.textContent = formatVND(order.shippingFee);
        if (voucherEl) voucherEl.textContent = '- ' + formatVND(order.discount || 0);
        if (pointsEl) pointsEl.textContent = '- ' + formatVND((order.pawPointsUsed || 0) * 100);
        if (totalEl) totalEl.textContent = formatVND(order.total);

        // Ghi chú
        const custNoteEl = document.getElementById('detailCustomerNote');
        const intNoteEl = document.getElementById('detailInternalNote');
        if (custNoteEl) custNoteEl.textContent = order.customerNote ? `"${order.customerNote}"` : '(Không có ghi chú)';
        if (intNoteEl) intNoteEl.textContent = order.internalNote || 'Chưa có ghi chú nội bộ.';

        // Giao nhận
        const recNameEl = document.getElementById('detailReceiverName');
        const recPhoneEl = document.getElementById('detailReceiverPhone');
        const recAddrEl = document.getElementById('detailReceiverAddress');
        const payMethodEl = document.getElementById('detailPaymentMethod');
        const payBadgeEl = document.getElementById('detailPaymentBadge');
        const carrierEl = document.getElementById('detailShippingCarrier');
        const trackingEl = document.getElementById('detailTrackingNumber');

        if (recNameEl) {
            recNameEl.textContent = order.customerName;
            recNameEl.onclick = () => {
                PawpalOrdersModule.openCustomerProfile(order.userId, order.customerName);
            };
        }
        if (recPhoneEl) recPhoneEl.textContent = order.phone;
        if (recAddrEl) recAddrEl.textContent = order.address;
        if (payMethodEl) {
            let txt = 'Thanh toán tiền mặt khi nhận hàng (COD)';
            if (order.paymentMethod === 'vnpay') txt = 'Cổng thanh toán VNPay QR';
            else if (order.paymentMethod === 'momo') txt = 'Ví điện tử MoMo';
            else if (order.paymentMethod === 'bank_transfer') txt = 'Chuyển khoản trực tiếp ngân hàng Vietcombank';
            payMethodEl.textContent = txt;
        }
        if (payBadgeEl) {
            if (order.paymentStatus === 'paid') {
                payBadgeEl.className = 'admin-badge badge-paid';
                payBadgeEl.textContent = 'Đã thanh toán';
            } else if (order.paymentStatus === 'refund_pending' || order.paymentStatus === 'pending_refund') {
                payBadgeEl.className = 'admin-badge badge-warning';
                payBadgeEl.textContent = 'Chờ hoàn tiền';
            } else if (order.paymentStatus === 'refunded') {
                payBadgeEl.className = 'admin-badge badge-cancelled';
                payBadgeEl.textContent = 'Đã hoàn tiền';
            } else if (order.paymentStatus === 'cancelled') {
                payBadgeEl.className = 'admin-badge badge-cancelled';
                payBadgeEl.textContent = 'Đã hủy thanh toán';
            } else if (order.paymentStatus === 'cod_pending') {
                payBadgeEl.className = 'admin-badge badge-warning';
                payBadgeEl.textContent = 'Chờ đối soát COD';
            } else {
                payBadgeEl.className = 'admin-badge badge-unpaid';
                payBadgeEl.textContent = 'Chưa thanh toán';
            }
        }
        if (carrierEl) carrierEl.textContent = order.carrier || 'Chưa phân công';
        if (trackingEl) trackingEl.textContent = order.trackingNumber || '--';

        // Timeline lịch trình
        const timelineListEl = document.getElementById('detailOrderTimeline');
        if (timelineListEl) {
            timelineListEl.innerHTML = (order.timeline || []).map(t => `
                <div class="timeline-step-item ${t.done ? '' : 'future'}">
                    <span class="timeline-step-title">${t.title}</span>
                    <span class="timeline-step-time">${t.time}</span>
                    <span class="timeline-step-desc">${t.desc}</span>
                </div>
            `).join('');
        }
    }

    // Đăng ký controller với Core
    PawpalOrders.controllers.detail = {
        renderOrderDetail
    };

    // Khởi tạo các sự kiện giao diện cho Subtab Detail
    function initDetailEvents() {
        // Toggle hiển thị trường hoàn tiền trong modal RMA
        document.getElementById('rmaSolutionType')?.addEventListener('change', (e) => {
            const isRefund = e.target.value === 'refund';
            const refundRow = document.getElementById('rmaRefundFieldsRow');
            if (refundRow) refundRow.style.display = isRefund ? 'grid' : 'none';
        });

        // Xác nhận tạo phiếu RMA
        document.getElementById('btnSubmitRmaTicket')?.addEventListener('click', async () => {
            const ordersList = state.orders || [];
            const order = ordersList.find(o => o.id === state.selectedOrderId);
            if (!order) return;

            // 1. Kiểm tra trạng thái đơn hàng đủ điều kiện RMA
            if (order.status === 'cancelled') {
                showToast(`Đơn hàng ${order.id} đã bị hủy, không thể tạo yêu cầu đổi trả (RMA)!`, 'warning');
                PawpalOrdersModule.closeModal('modalReturnRefund');
                return;
            }
            if (order.status !== 'delivered' && order.status !== 'completed' && order.status !== 'returned') {
                showToast(`Chỉ đơn hàng đã giao thành công (Đã giao / Hoàn tất) mới có thể xử lý đổi trả (RMA)!`, 'warning');
                PawpalOrdersModule.closeModal('modalReturnRefund');
                return;
            }

            // 2. Kiểm tra sản phẩm được tích chọn
            const checkedBoxes = document.querySelectorAll('.rma-item-select-checkbox:checked');
            if (checkedBoxes.length === 0) {
                showToast('Vui lòng tích chọn ít nhất một sản phẩm cần đổi trả hoặc bồi hoàn.', 'warning');
                return;
            }

            // 3. Chặn sản phẩm ngoài đơn gốc & ràng buộc số lượng
            const validOrderSkus = new Set((order.products || []).map(p => p.sku));
            for (const cb of checkedBoxes) {
                const sku = cb.getAttribute('data-sku');
                const row = cb.closest('tr');
                const qtyInput = row?.querySelector('.rma-item-qty-input');
                const qty = parseInt(qtyInput?.value || '1', 10);

                if (!validOrderSkus.has(sku)) {
                    showToast(`Sản phẩm với mã SKU "${sku}" không thuộc đơn hàng gốc ${order.id}! Thao tác bị từ chối.`, 'danger');
                    return;
                }

                const prodInOrder = order.products.find(p => p.sku === sku);
                if (!prodInOrder) {
                    showToast(`Sản phẩm với mã SKU "${sku}" không tồn tại trong đơn hàng gốc ${order.id}!`, 'danger');
                    return;
                }

                if (isNaN(qty) || qty < 1) {
                    showToast(`Số lượng đổi trả của sản phẩm "${prodInOrder.name}" không hợp lệ.`, 'warning');
                    return;
                }

                if (qty > prodInOrder.quantity) {
                    showToast(`Số lượng đổi trả của sản phẩm "${prodInOrder.name}" (${qty}) vượt quá số lượng đã mua (${prodInOrder.quantity})!`, 'warning');
                    return;
                }
            }

            const solSelect = document.getElementById('rmaSolutionType');
            const solType = solSelect?.value || 'exchange';
            const solTypeName = solSelect?.options[solSelect.selectedIndex]?.text.split(' (')[0] || 'Đổi hàng mới';

            const reasonSelect = document.getElementById('rmaReasonSelect');
            const reasonVal = reasonSelect?.value || 'damaged';
            const reasonText = reasonSelect?.options[reasonSelect.selectedIndex]?.text || 'Hàng móp vỡ';

            const restockRadio = document.querySelector('input[name="rmaRestockAction"]:checked');
            const restockVal = restockRadio ? restockRadio.value : 'restock';

            const refundMethod = document.getElementById('rmaRefundMethod')?.value || 'bank_transfer';
            const refundAmountVal = parseInt(document.getElementById('rmaRefundAmountInput')?.value || '0', 10);
            const internalNote = document.getElementById('rmaInternalNote')?.value.trim() || '';

            const rmaCode = 'RMA-2026-' + (Math.floor(100 + Math.random() * 900));
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;

            const returnedItems = [];
            for (const cb of checkedBoxes) {
                const sku = cb.getAttribute('data-sku');
                const row = cb.closest('tr');
                const qtyInput = row?.querySelector('.rma-item-qty-input');
                const qty = parseInt(qtyInput?.value || '1', 10);

                const prodInOrder = order.products.find(p => p.sku === sku);
                if (prodInOrder) {
                    returnedItems.push({
                        sku: sku,
                        name: prodInOrder.name,
                        quantity: qty,
                        price: prodInOrder.price
                    });

                    // Nếu kiểm định đạt chuẩn -> Tự động nhập lại kho khả dụng
                    if (restockVal === 'restock') {
                        const stockItem = (state.products || []).find(p => p.sku === sku);
                        if (stockItem) {
                            stockItem.stock += qty;
                            if (stockItem.stock > 0 && stockItem.status === 'Hết hàng') {
                                stockItem.status = 'Còn hàng';
                            }

                            if (client && stockItem.id) {
                                try {
                                    const { data: invRow } = await client.from('inventory').select('id, quantity_in_stock').eq('product_id', stockItem.id).limit(1);
                                    if (invRow && invRow[0]) {
                                        await client.from('inventory').update({ quantity_in_stock: (invRow[0].quantity_in_stock || 0) + qty }).eq('id', invRow[0].id);
                                    }
                                } catch (errRmaInv) {
                                    console.warn('Lỗi nhập lại kho khi duyệt RMA:', errRmaInv);
                                }
                            }
                        }
                    }
                }
            }

            // Ghi nhận RMA vào Supabase
            if (client) {
                try {
                    let dbOrderId = order.rawId;
                    if (!dbOrderId) {
                        const { data: ordRow } = await client.from('sales_order').select('id').eq('order_code', order.id).limit(1);
                        if (ordRow && ordRow[0]) dbOrderId = ordRow[0].id;
                    }

                    if (dbOrderId) {
                        const updateOrderPayload = { order_status: 'RETURNED' };
                        if (solType === 'refund') {
                            updateOrderPayload.payment_status = 'REFUNDED';
                        }
                        await client.from('sales_order').update(updateOrderPayload).eq('id', dbOrderId);

                        const { data: rmaRow } = await client.from('return_request').insert({
                            sales_order_id: dbOrderId,
                            customer_id: (order.userId && order.userId.length > 20) ? order.userId : null,
                            reason: reasonText,
                            return_type: solType === 'refund' ? 'REFUND' : 'EXCHANGE',
                            description: internalNote || `Phiếu ${rmaCode}: ${solTypeName}`,
                            request_status: 'RESOLVED'
                        }).select().single();

                        if (rmaRow && rmaRow.id) {
                            const rmaDetails = [];
                            for (const retItem of returnedItems) {
                                const prodDb = (state.products || []).find(p => p.sku === retItem.sku);
                                if (prodDb && prodDb.id) {
                                    rmaDetails.push({
                                        return_request_id: rmaRow.id,
                                        product_id: prodDb.id,
                                        quantity: retItem.quantity,
                                        unit_price: retItem.price
                                    });
                                }
                            }
                            if (rmaDetails.length > 0) {
                                await client.from('return_request_detail').insert(rmaDetails);
                            }
                        }
                    }
                } catch (errRmaDb) {
                    console.warn('Lỗi khi ghi phiếu RMA vào Supabase:', errRmaDb);
                }
            }

            // Cập nhật trạng thái đơn hàng sang Đổi trả
            order.status = 'returned';
            if (solType === 'refund') {
                order.paymentStatus = 'refunded';
            }
            order.alertType = 'danger';
            order.alertMessage = `Phiếu RMA: ${rmaCode}`;
            order.rmaInfo = {
                id: rmaCode,
                solutionType: solType,
                solutionTypeName: solTypeName,
                reason: reasonVal,
                reasonText: reasonText,
                restockAction: restockVal,
                restockText: restockVal === 'restock' ? 'Đã nhập lại kho khả dụng (Restock)' : 'Chuyển vào kho Hủy (Write-off)',
                refundMethod: refundMethod,
                refundAmount: refundAmountVal,
                refundText: solType === 'refund' ? formatVND(refundAmountVal) : 'Không phát sinh bồi hoàn tiền mặt',
                items: returnedItems,
                note: internalNote,
                createdAt: new Date().toISOString()
            };

            // Ghi nhận vào Lịch trình (Timeline)
            order.timeline.push({
                title: 'Tiếp nhận Đổi trả và Hoàn tiền (RMA)',
                time: formatTime(new Date()) + ' - Hôm nay',
                desc: `Phê duyệt ${rmaCode}. Hình thức: ${solTypeName}. Lý do: ${reasonText}`,
                done: true
            });

            if (restockVal === 'restock') {
                order.timeline.push({
                    title: 'Kiểm định kho hàng đạt chuẩn',
                    time: formatTime(new Date()) + ' - Hôm nay',
                    desc: 'Sản phẩm còn nguyên seal hộp. Đã tự động nhập lại kho khả dụng',
                    done: true
                });
            } else {
                order.timeline.push({
                    title: 'Chuyển kho hàng lỗi và phế phẩm',
                    time: formatTime(new Date()) + ' - Hôm nay',
                    desc: 'Hàng hư hại do vận chuyển. Đã đưa vào kho hủy và ghi nhận chi phí rủi ro',
                    done: true
                });
            }

            if (solType === 'refund' && refundAmountVal > 0) {
                order.timeline.push({
                    title: 'Hoàn tất bồi hoàn tiền cho khách',
                    time: formatTime(new Date()) + ' - Hôm nay',
                    desc: `Đã xác nhận hoàn tiền ${formatVND(refundAmountVal)} qua ${refundMethod === 'bank_transfer' ? 'chuyển khoản ngân hàng' : 'điểm thưởng Pawpoint'}`,
                    done: true
                });
            }

            // Liên thông tự động sang phân hệ Khiếu nại
            try {
                const storedTickets = JSON.parse(sessionStorage.getItem('pawpal_admin_order_rma_tickets') || '[]');
                storedTickets.unshift({
                    id: rmaCode,
                    orderId: order.id,
                    customerName: order.customerName,
                    phone: order.phone,
                    reason: reasonText,
                    solution: solTypeName,
                    refundAmount: refundAmountVal,
                    refundMethod: refundMethod,
                    status: 'RESOLVED',
                    items: returnedItems,
                    createdAt: new Date().toISOString()
                });
                sessionStorage.setItem('pawpal_admin_order_rma_tickets', JSON.stringify(storedTickets));
            } catch (e) {}

            persistOrdersData();
            PawpalOrdersModule.closeModal('modalReturnRefund');
            showToast(`Đã tạo hồ sơ xử lý ${rmaCode} và cập nhật đơn hàng thành công!`, 'success');

            renderOrderDetail(order.id);
            if (typeof PawpalOrders.renderOrdersTable === 'function') {
                PawpalOrders.renderOrdersTable();
            }
        });
    }

    // Xuất ra window.PawpalOrdersModule cho inline handlers
    window.PawpalOrdersModule = window.PawpalOrdersModule || {};
    window.PawpalOrdersModule.renderOrderDetail = renderOrderDetail;

    // Khởi tạo sự kiện
    initDetailEvents();
})();
