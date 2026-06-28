/**
 * RETURN HANDLER JS - Triển khai luồng đổi trả hàng (Quy trình 3.1.12)
 * - Tối giản logic JS, tập trung hiển thị UI/UX và animation
 * - Tuân thủ 100% design.md (không emoji, dùng text char •, ->)
 */

let currentRmaOrder = null;

// Khởi tạo Drawer HTML và chèn vào container
function openRMADrawer(orderId) {
    // Tìm thông tin đơn hàng từ danh sách đã load (ordersState có sẵn trong scope toàn cục ở orders.html)
    if (typeof ordersState !== 'undefined' && ordersState.allOrders) {
        currentRmaOrder = ordersState.allOrders.find(o => o.id === orderId);
    }
    
    // Safe fallback if the order list is unavailable
    if (!currentRmaOrder) {
        currentRmaOrder = {
            id: orderId,
            products: [{
                id: 'PROD-UNKNOWN',
                name: 'Sản phẩm không có dữ liệu',
                image: '/assets/images/shop/products/placeholder.webp',
                quantity: 1,
                price: 0,
                total: 0
            }]
        };
    }

    const container = document.getElementById('rma-drawer-container') || createRmaDrawerContainer();

    // Render cấu trúc Drawer
    container.innerHTML = `
        <div class="rma-drawer-overlay" id="rma-overlay"></div>
        <div class="rma-drawer" id="rma-drawer">
            <div class="rma-drawer-header">
                <h3>Yêu cầu Đổi trả</h3>
                <button class="rma-drawer-close" id="rma-close-btn">Đóng [×]</button>
            </div>
            <div class="rma-drawer-body">
                <div class="rma-form-group">
                    <span class="rma-form-label">Đơn hàng: ${currentRmaOrder.id}</span>
                    <p style="font-size: 0.85rem; color: var(--color-text-light); margin: 0;">Chọn những sản phẩm bạn muốn thực hiện đổi hoặc trả:</p>
                </div>

                <!-- Product list checklist -->
                <div class="rma-form-group" style="gap: 8px;">
                    ${currentRmaOrder.products.map(product => `
                        <div class="rma-product-item">
                            <input type="checkbox" class="rma-product-checkbox" data-product-id="${product.id}" checked>
                            <img src="${product.image}" alt="${product.name}" class="rma-product-thumb">
                            <div class="rma-product-info">
                                <h5 class="rma-product-name">${product.name}</h5>
                                <p class="rma-product-meta">Số lượng: ${product.quantity} • Đơn giá: ${new Intl.NumberFormat('vi-VN').format(product.price)}đ</p>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Return Type -->
                <div class="rma-form-group">
                    <span class="rma-form-label">Hình thức đổi trả</span>
                    <div class="rma-radio-cards">
                        <label class="rma-radio-card is-selected" id="radio-card-exchange">
                            <input type="radio" name="return_type" value="exchange" checked>
                            <span class="rma-radio-card-title">Đổi sản phẩm mới</span>
                            <span class="rma-radio-card-desc">Đổi sản phẩm cùng loại hoặc tương đương</span>
                        </label>
                        <label class="rma-radio-card" id="radio-card-refund">
                            <input type="radio" name="return_type" value="refund">
                            <span class="rma-radio-card-title">Hoàn tiền</span>
                            <span class="rma-radio-card-desc">Hoàn trả tiền mua hàng về tài khoản gốc</span>
                        </label>
                    </div>
                </div>

                <!-- Thông tin hoàn tiền COD (hiện khi chọn hoàn tiền) -->
                <div class="rma-form-group" id="rma-refund-account-group" style="display:none;">
                    <span class="rma-form-label">Số tài khoản ngân hàng / Ví MoMo <span style="font-size:0.78rem;color:var(--color-text-light)">(tuỳ chọn)</span></span>
                    <input type="text" id="rma-refund-account" placeholder="VD: 0901234567 (MoMo) hoặc số TK ngân hàng"
                        style="border:1px solid var(--color-border);border-radius:var(--card-border-radius);padding:10px;width:100%;font-family:var(--font-primary);">
                    <p style="font-size:0.75rem;color:var(--color-text-light);margin:4px 0 0;">Nếu để trống, nhân viên CSKH sẽ liên hệ trong vòng 24 giờ.</p>
                </div>

                <!-- Return Reason -->
                <div class="rma-form-group">
                    <span class="rma-form-label">Lý do đổi trả</span>
                    <select id="rma-reason" class="form-select" style="border: 1px solid var(--color-border); border-radius: var(--card-border-radius); padding: 10px;">
                        <option value="broken">Sản phẩm lỗi hỏng (do vận chuyển hoặc NSX)</option>
                        <option value="wrong_item">Giao sai mẫu mã, chủng loại</option>
                        <option value="wrong_size">Không vừa kích thước (đối với phụ kiện)</option>
                        <option value="change_mind">Không còn nhu cầu sử dụng (Đổi ý)</option>
                    </select>
                </div>

                <!-- Detailed Description -->
                <div class="rma-form-group">
                    <span class="rma-form-label">Mô tả chi tiết</span>
                    <textarea id="rma-desc" placeholder="Mô tả cụ thể tình trạng sản phẩm khi nhận..." rows="3" style="border: 1px solid var(--color-border); border-radius: var(--card-border-radius); padding: 10px; width: 100%; font-family: var(--font-primary); resize: none;"></textarea>
                </div>

                <!-- File Upload Minh chứng -->
                <div class="rma-form-group">
                    <span class="rma-form-label">Ảnh hoặc Video minh chứng</span>
                    <div class="rma-upload-zone" id="rma-upload-trigger">
                        <span class="rma-upload-text">Nhấp vào đây để tải lên hình ảnh hoặc video thực tế</span>
                        <span class="rma-upload-text" style="display: block; font-size: 0.75rem; opacity: 0.7; margin-top: 4px;">Kích thước tệp tối đa: 5MB</span>
                        <input type="file" id="rma-file-input" class="rma-upload-input" accept="image/*,video/*">
                    </div>
                    <div class="rma-upload-preview" id="rma-preview-container"></div>
                    <span id="rma-upload-warning" class="rma-alert-error" style="display: none; margin-top: 8px;"></span>
                </div>

                <!-- Submit Area -->
                <div class="rma-form-group" style="margin-top: 10px;">
                    <button class="rma-btn-submit" id="rma-submit-btn">Gửi yêu cầu đổi trả</button>
                    <p style="font-size: 0.75rem; text-align: center; color: var(--color-text-light); margin: 6px 0 0 0;">Yêu cầu sẽ được kiểm duyệt trong vòng 24 giờ làm việc</p>
                </div>
            </div>
        </div>
    `;

    // Trigger animations bằng cách thêm class sau 50ms
    setTimeout(() => {
        document.getElementById('rma-overlay').classList.add('is-open');
        document.getElementById('rma-drawer').classList.add('is-open');
    }, 50);

    // Đăng ký sự kiện điều khiển
    setupDrawerListeners();
}

window.openRMADrawer = openRMADrawer;

// Thiết lập sự kiện lắng nghe cho Drawer
function setupDrawerListeners() {
    const overlay = document.getElementById('rma-overlay');
    const drawer = document.getElementById('rma-drawer');
    const closeBtn = document.getElementById('rma-close-btn');
    const fileInput = document.getElementById('rma-file-input');
    const uploadTrigger = document.getElementById('rma-upload-trigger');
    const submitBtn = document.getElementById('rma-submit-btn');

    // Hàm đóng Drawer kèm transition mượt mà
    const closeDrawer = () => {
        overlay.classList.remove('is-open');
        drawer.classList.remove('is-open');
        setTimeout(() => {
            document.getElementById('rma-drawer-container').innerHTML = '';
        }, 400); // khớp transition CSS
    };

    overlay.addEventListener('click', closeDrawer);
    closeBtn.addEventListener('click', closeDrawer);

    // Đổi style Radio Cards khi click chọn
    const cardExchange = document.getElementById('radio-card-exchange');
    const cardRefund = document.getElementById('radio-card-refund');

    cardExchange.addEventListener('click', () => {
        cardExchange.classList.add('is-selected');
        cardRefund.classList.remove('is-selected');
        cardExchange.querySelector('input').checked = true;
        document.getElementById('rma-refund-account-group').style.display = 'none';
    });

    cardRefund.addEventListener('click', () => {
        cardRefund.classList.add('is-selected');
        cardExchange.classList.remove('is-selected');
        cardRefund.querySelector('input').checked = true;
        document.getElementById('rma-refund-account-group').style.display = 'block';
    });

    // Kích hoạt upload file
    uploadTrigger.addEventListener('click', () => {
        fileInput.click();
    });

    // Preview hình ảnh khi upload
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const warningEl = document.getElementById('rma-upload-warning');
        const previewContainer = document.getElementById('rma-preview-container');

        warningEl.style.display = 'none';
        previewContainer.innerHTML = '';

        if (!file) return;

        // Kiểm tra dung lượng (5MB)
        if (file.size > 5 * 1024 * 1024) {
            warningEl.textContent = 'Dung lượng file vượt quá giới hạn 5MB. Vui lòng chọn file nhỏ hơn.';
            warningEl.style.display = 'block';
            fileInput.value = ''; // Reset input
            return;
        }

        // Tạo preview nếu là hình ảnh
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewContainer.innerHTML = `
                    <div style="position: relative;">
                        <img src="${event.target.result}" class="rma-preview-thumb">
                        <span style="position: absolute; top: -5px; right: -5px; background: rgba(0,0,0,0.6); color: #fff; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="removeRmaFile()">×</span>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        } else {
            // Video preview đơn giản
            previewContainer.innerHTML = `
                <div style="position: relative; font-size: 0.8rem; background: var(--color-primary-light); padding: 6px; border-radius: 6px; border: 1px solid var(--color-border);">
                     ${file.name}
                    <span style="cursor: pointer; margin-left: 8px; font-weight: bold; color: var(--color-danger);" onclick="removeRmaFile()">[Xóa]</span>
                </div>
            `;
        }
    });

    // Submit Yêu cầu đổi trả
    submitBtn.addEventListener('click', () => {
        const checkedItems = document.querySelectorAll('.rma-product-checkbox:checked');
        const reason = document.getElementById('rma-reason').value;
        const file = fileInput.files[0];
        const warningEl = document.getElementById('rma-upload-warning');

        // Bắt buộc chọn ít nhất 1 sản phẩm
        if (checkedItems.length === 0) {
            alert('Vui lòng chọn ít nhất một sản phẩm cần đổi trả!');
            return;
        }

        // Bắt buộc ảnh minh chứng đối với lỗi do shop (broken hoặc wrong_item)
        if ((reason === 'broken' || reason === 'wrong_item') && !file) {
            warningEl.textContent = 'Lý do này bắt buộc phải tải lên hình ảnh hoặc video thực tế của sản phẩm làm minh chứng.';
            warningEl.style.display = 'block';
            return;
        }

        // Lưu thông tin yêu cầu đổi trả (Giả lập LocalStorage)
        const returnType = document.querySelector('input[name="return_type"]:checked').value;
        const returnData = {
            orderId: currentRmaOrder.id,
            rmaId: 'RMA-' + Math.floor(10000 + Math.random() * 90000),
            createdAt: new Date().toISOString(),
            status: 'reviewing', // Bắt đầu ở bước Chờ kiểm duyệt — điểm chỉ trừ khi status = 'completed'
            reason: reason,
            type: returnType,
            description: document.getElementById('rma-desc').value,
            // Lưu thêm thông tin TK hoàn tiền cho COD refund
            refundAccount: returnType === 'refund'
                ? (document.getElementById('rma-refund-account')?.value?.trim() || '')
                : '',
            products: Array.from(checkedItems).map(cb => {
                const prodId = cb.getAttribute('data-product-id');
                return currentRmaOrder.products.find(p => p.id === prodId);
            })
        };

        // Không trừ điểm ngay — điểm sẽ được trừ khi admin chuyển RMA sang 'completed'
        // (Logic trừ điểm đặt tại return-detail.js khi cập nhật status)

        const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
        returnsList.push(returnData);
        localStorage.setItem('pawpal_returns', JSON.stringify(returnsList));

        // Đóng Drawer và chuyển tiếp đến trang chi tiết đổi trả
        closeDrawer();
        setTimeout(() => {
            window.location.href = `/pages/user/return-detail/return-detail.html?orderId=${currentRmaOrder.id}`;
        }, 100);
    });
}

function createRmaDrawerContainer() {
        const container = document.createElement('div');
        container.id = 'rma-drawer-container';
        document.body.appendChild(container);
        return container;
    }

    // Xóa file đã tải lên
function removeRmaFile() {
    const fileInput = document.getElementById('rma-file-input');
    const previewContainer = document.getElementById('rma-preview-container');
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.innerHTML = '';
}

window.removeRmaFile = removeRmaFile;
