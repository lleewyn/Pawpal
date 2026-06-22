document.addEventListener('DOMContentLoaded', () => {
            // Lấy orderId từ query param
            const urlParams = new URLSearchParams(window.location.search);
            const orderId = urlParams.get('orderId') || 'ORD-2026-002';

            // Load từ localStorage
            const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
            let rmaData = returnsList.find(r => r.orderId === orderId);

            // Mock data fallback để test hiển thị
            if (!rmaData) {
                rmaData = {
                    orderId: orderId,
                    rmaId: 'RMA-12948',
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'approved',
                    reason: 'broken',
                    type: 'exchange',
                    description: 'Sản phẩm xương gặm bị rách bao bì và ẩm mốc khi mở hộp, nhờ shop kiểm tra lại.',
                    products: [
                        {
                            id: "PROD-010",
                            name: "Xương gặm dinh dưỡng vị bò",
                            image: "https://via.placeholder.com/100x100?text=Beef+Bone",
                            quantity: 1,
                            price: 120000,
                            total: 120000
                        }
                    ]
                };
            }

            // Render dữ liệu
            document.getElementById('rma-id-title').textContent = `Yêu cầu Đổi trả #${rmaData.rmaId}`;
            
            const dateObj = new Date(rmaData.createdAt);
            document.getElementById('rma-date').textContent = `Ngày tạo: ${dateObj.toLocaleDateString('vi-VN')} lúc ${dateObj.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}`;
            
            const badge = document.getElementById('rma-status-badge');
            badge.textContent = getStatusLabel(rmaData.status);

            // Render Products
            const prodContainer = document.getElementById('rma-products-list');
            prodContainer.innerHTML = rmaData.products.map(p => `
                <div class="rma-product-item" style="border: none; padding: 0;">
                    <img src="${p.image}" alt="${p.name}" class="rma-product-thumb" style="width: 60px; height: 60px;">
                    <div class="rma-product-info">
                        <h5 class="rma-product-name" style="font-size: 0.95rem;">${p.name}</h5>
                        <p class="rma-product-meta">Số lượng: ${p.quantity} • Đơn giá: ${new Intl.NumberFormat('vi-VN').format(p.price)}đ</p>
                    </div>
                </div>
            `).join('');

            // Render Reason và Desc
            const reasonsMap = {
                'broken': 'Sản phẩm lỗi hỏng (do vận chuyển hoặc NSX)',
                'wrong_item': 'Giao sai mẫu mã, chủng loại',
                'wrong_size': 'Không vừa kích thước',
                'change_mind': 'Không còn nhu cầu sử dụng (Đổi ý)'
            };
            document.getElementById('rma-reason-text').textContent = reasonsMap[rmaData.reason] || rmaData.reason;
            document.getElementById('rma-description-text').textContent = rmaData.description || 'Không có mô tả chi tiết.';

            // Render Timeline Stepper
            const timelineSteps = [
                { key: 'placed', title: 'Gửi yêu cầu', desc: 'Đã tiếp nhận yêu cầu đổi trả' },
                { key: 'reviewing', title: 'Đang kiểm duyệt', desc: 'Đội ngũ hỗ trợ đang xem xét thông tin' },
                { key: 'approved', title: 'Đã chấp nhận', desc: 'Yêu cầu được duyệt. Vui lòng gửi hàng về shop' },
                { key: 'shipping_return', title: 'Đang gửi hàng trả', desc: 'Đang chờ kho nhận sản phẩm' },
                { key: 'completed', title: 'Hoàn tất', desc: 'Giao dịch đổi trả đã được giải quyết' }
            ];

            const timelineContainer = document.getElementById('rma-timeline');
            
            // Xác định index hiện tại
            let activeIdx = 0;
            if (rmaData.status === 'reviewing') activeIdx = 1;
            else if (rmaData.status === 'approved') activeIdx = 2;
            else if (rmaData.status === 'shipping_return') activeIdx = 3;
            else if (rmaData.status === 'completed') activeIdx = 4;

            timelineContainer.innerHTML = timelineSteps.map((step, idx) => {
                let statusClass = '';
                if (idx < activeIdx) statusClass = 'completed';
                else if (idx === activeIdx) statusClass = 'active';

                return `
                    <div class="rma-timeline-item ${statusClass}">
                        <div class="rma-timeline-dot"></div>
                        <div class="rma-timeline-content">
                            <h4 class="rma-timeline-title">${step.title}</h4>
                            <p class="rma-timeline-desc">${step.desc}</p>
                        </div>
                    </div>
                `;
            }).join('');

            // Hiển thị khung hướng dẫn gửi hàng khi đã được chấp nhận
            if (rmaData.status === 'approved' || rmaData.status === 'shipping_return') {
                const shippingBox = document.getElementById('rma-shipping-box');
                document.getElementById('rma-code-bold').textContent = rmaData.rmaId;
                
                const policySpan = document.getElementById('rma-shipping-fee-policy');
                if (rmaData.reason === 'change_mind') {
                    policySpan.innerHTML = 'Quý khách vui lòng chịu phí ship gửi trả (do thay đổi ý định mua hàng)';
                } else {
                    policySpan.innerHTML = 'PawPal chịu 100% phí ship (do lỗi hỏng hoặc sai sót của cửa hàng)';
                }
                
                shippingBox.style.display = 'block';
            }
        });

        function getStatusLabel(status) {
            const labels = {
                'placed': 'Mới tạo',
                'reviewing': 'Đang kiểm duyệt',
                'approved': 'Đã chấp nhận',
                'shipping_return': 'Đang gửi hàng trả',
                'completed': 'Hoàn tất'
            };
            return labels[status] || 'Đang xử lý';
        }