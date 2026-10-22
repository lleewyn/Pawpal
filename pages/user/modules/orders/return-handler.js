import { API } from '/scripts/api/api.js';

let currentRmaOrder = null;
let returnRequestId = null;
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function openRMADrawer(orderId) {
    try {
        let stylesheet = document.getElementById('return-drawer-styles');
        if (!stylesheet) {
            stylesheet = document.createElement('link');
            stylesheet.id = 'return-drawer-styles';
            stylesheet.rel = 'stylesheet';
            stylesheet.href = '/pages/user/modules/orders/return-detail.css';
            await new Promise((resolve, reject) => {
                stylesheet.onload = resolve;
                stylesheet.onerror = reject;
                document.head.appendChild(stylesheet);
            });
        } else if (!stylesheet.sheet) {
            await new Promise((resolve, reject) => {
                stylesheet.addEventListener('load', resolve, {once:true});
                stylesheet.addEventListener('error', reject, {once:true});
            });
        }
    } catch (error) {
        document.getElementById('return-drawer-styles')?.remove();
        console.error('[ReturnHandler] Không thể tải giao diện:', error);
        return;
    }
    try {
        const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        const orders = await API.getUserOrders(user);
        currentRmaOrder = orders.find(order => [order.id, order._supabaseId]
            .some(id => id != null && String(id) === String(orderId)));
        if (!currentRmaOrder) throw new Error('Không tìm thấy đơn hàng để đổi trả.');
        if (!['completed','delivered','returned'].includes(currentRmaOrder.status)) throw new Error('Chỉ có thể yêu cầu đổi trả sau khi nhận hàng.');
        const db=window.getSupabaseClient?.()||window.SupabaseClient;
        if(!db)throw new Error('Không thể kết nối dữ liệu.');
        const prior=await db.from('return_request').select('request_status,return_request_detail(sales_order_detail_id,quantity)').eq('sales_order_id',currentRmaOrder._supabaseId);
        if(prior.error)throw prior.error;
        const requested=new Map();
        for(const request of prior.data||[])if(!['cancelled','rejected'].includes(request.request_status))for(const line of request.return_request_detail||[])requested.set(line.sales_order_detail_id,(requested.get(line.sales_order_detail_id)||0)+Number(line.quantity));
        currentRmaOrder.products=currentRmaOrder.products.map(p=>({...p,returnableQuantity:Number(p.quantity)-(requested.get(p.lineId)||0)})).filter(p=>p.returnableQuantity>0);
        if(!currentRmaOrder.products.length)throw new Error('Các sản phẩm đã có yêu cầu đổi trả đủ số lượng.');
        returnRequestId=crypto.randomUUID();
    } catch (error) {
        console.error('[ReturnHandler] Unable to load order:', error);
        alert(error.message || 'Không thể tải đơn hàng. Vui lòng thử lại.');
        return;
    }

    let container = document.getElementById('rma-drawer-container') || createRmaDrawerContainer();
    if (!(container instanceof HTMLDialogElement)) {
        const dialog=document.createElement('dialog');dialog.id=container.id;
        container.replaceWith(dialog);container=dialog;
    }

    container.innerHTML = `
        <div class="rma-drawer-overlay" id="rma-overlay"></div>
        <div class="rma-drawer" id="rma-drawer" role="dialog" aria-modal="true" aria-labelledby="rma-drawer-title" tabindex="-1">
            <div class="rma-drawer-header">
                <h3 id="rma-drawer-title">Yêu cầu đổi trả</h3>
                <button type="button" class="rma-drawer-close" id="rma-close-btn">Đóng</button>
            </div>
            <div class="rma-drawer-body">
                <div class="rma-form-group">
                    <span class="rma-form-label">Đơn hàng ${escapeHtml(currentRmaOrder.id)}</span>
                    <p style="font-size: 0.85rem; color: var(--color-text-light); margin: 0;">Chọn những sản phẩm bạn muốn thực hiện đổi hoặc trả:</p>
                </div>

                <!-- Product list checklist -->
                <div class="rma-form-group" style="gap: 8px;">
                    ${currentRmaOrder.products.map(product => `
                        <div class="rma-product-item">
                            <input type="checkbox" class="rma-product-checkbox" data-line-id="${product.lineId}" checked>
                            <div class="rma-product-info">
                                <h5 class="rma-product-name">${escapeHtml(product.name)}</h5>
                                <p class="rma-product-meta">Số lượng: ${product.quantity} • Đơn giá: ${new Intl.NumberFormat('vi-VN').format(product.price)}đ</p>
                                <label>Số lượng đổi trả <input class="rma-quantity form-control" type="number" min="1" max="${product.returnableQuantity}" value="1" data-line-id="${product.lineId}"></label>
                                <p>Còn có thể yêu cầu ${product.returnableQuantity} sản phẩm</p>
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
                <div class="rma-form-group" id="rma-refund-account-group" style="display:none;" hidden>
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
                <div class="rma-form-group" hidden>
                    <span class="rma-form-label">Ảnh hoặc video minh chứng</span>
                    <div class="rma-upload-zone" id="rma-upload-trigger">
                        <span class="rma-upload-text">Nhấp vào đây để tải lên hình ảnh hoặc video thực tế</span>
                        <span class="rma-upload-text" style="display: block; font-size: 0.75rem; opacity: 0.7; margin-top: 4px;">Kích thước tệp tối đa: 5MB</span>
                        <input type="file" id="rma-file-input" class="rma-upload-input" accept="image/*,video/*">
                    </div>
                    <div class="rma-upload-preview" id="rma-preview-container"></div>
                </div>
                <span id="rma-upload-warning" role="alert" class="rma-alert-error" style="display:none;color:#DC2626"></span>

                <!-- Submit Area -->
                <div class="rma-form-group" style="margin-top: 10px;">
                    <button type="button" class="rma-btn-submit" id="rma-submit-btn">Gửi yêu cầu đổi trả</button>
                    <p style="font-size: 0.75rem; text-align: center; color: var(--color-text-light); margin: 6px 0 0 0;">Yêu cầu cần được kiểm duyệt theo chính sách đổi trả trước khi thực hiện</p>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        document.getElementById('rma-overlay').classList.add('is-open');
        const drawer = document.getElementById('rma-drawer');
        drawer.classList.add('is-open');
        drawer.querySelector('.rma-drawer-body').scrollTop = 0;
        drawer.focus({ preventScroll: true });
    }, 50);

    setupDrawerListeners();
    if(!container.open)container.showModal();
}

window.openRMADrawer = openRMADrawer;

function setupDrawerListeners() {
    const previousFocus = document.activeElement;
    const overlay = document.getElementById('rma-overlay');
    const drawer = document.getElementById('rma-drawer');
    const closeBtn = document.getElementById('rma-close-btn');
    const fileInput = document.getElementById('rma-file-input');
    const uploadTrigger = document.getElementById('rma-upload-trigger');
    const submitBtn = document.getElementById('rma-submit-btn');

    const closeDrawer = () => {
        if (submitBtn.disabled) return;
        document.removeEventListener('keydown', handleEscape);
        overlay.classList.remove('is-open');
        drawer.classList.remove('is-open');
        document.getElementById('rma-drawer-container')?.close();
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        setTimeout(() => {
            document.getElementById('rma-drawer-container').innerHTML = '';
        }, 400); // khớp transition CSS
    };

    const handleEscape = event => {
        if (event.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', handleEscape);
    document.getElementById('rma-drawer-container').oncancel=event=>{event.preventDefault();closeDrawer();};

    overlay.addEventListener('click', closeDrawer);
    closeBtn.addEventListener('click', closeDrawer);

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

    uploadTrigger.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const warningEl = document.getElementById('rma-upload-warning');
        const previewContainer = document.getElementById('rma-preview-container');

        warningEl.style.display = 'none';
        previewContainer.innerHTML = '';

        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            warningEl.textContent = 'Dung lượng file vượt quá giới hạn 5MB. Vui lòng chọn file nhỏ hơn.';
            warningEl.style.display = 'block';
            fileInput.value = ''; // Reset input
            return;
        }

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
            previewContainer.innerHTML = `
                <div style="position: relative; font-size: 0.8rem; background: var(--color-primary-light); padding: 6px; border-radius: 6px; border: 1px solid var(--color-border);">
                     ${file.name}
                    <span style="cursor: pointer; margin-left: 8px; font-weight: bold; color: var(--color-danger);" onclick="removeRmaFile()">[Xóa]</span>
                </div>
            `;
        }
    });

    submitBtn.addEventListener('click', async () => {
        if (submitBtn.disabled) return;
        const checkedItems = document.querySelectorAll('.rma-product-checkbox:checked');
        const reason = document.getElementById('rma-reason').value;
        const file = fileInput.files[0];
        const warningEl = document.getElementById('rma-upload-warning');

        if (checkedItems.length === 0) {
            alert('Vui lòng chọn ít nhất một sản phẩm cần đổi trả!');
            return;
        }


        const returnType = document.querySelector('input[name="return_type"]:checked').value;
        const returnData = {
            orderId: currentRmaOrder.id,
            rmaId: 'RMA-' + Math.floor(10000 + Math.random() * 90000),
            createdAt: new Date().toISOString(),
            status: 'reviewing', // Bắt đầu ở bước Chờ kiểm duyệt — điểm chỉ trừ khi status = 'completed'
            reason: reason,
            type: returnType,
            description: document.getElementById('rma-desc').value,
            refundAccount: returnType === 'refund'
                ? (document.getElementById('rma-refund-account')?.value?.trim() || '')
                : '',
            products: Array.from(checkedItems).map(cb => {
                const lineId = cb.getAttribute('data-line-id');
                const product=currentRmaOrder.products.find(p => String(p.lineId) === String(lineId));
                return {...product,returnQuantity:Number(document.querySelector(`.rma-quantity[data-line-id="${lineId}"]`).value)};
            })
        };

        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Đang gửi...';
        submitBtn.disabled = true;

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
        const customerId = currentUser ? currentUser.id : null;

        try {
            if (!db || !customerId) throw new Error('Vui lòng đăng nhập và thử lại.');
            const orderUuid = currentRmaOrder._supabaseId;
            if (!orderUuid) throw new Error('Không tìm thấy đơn hàng.');
            const details = returnData.products.map(product => {
                if (!product.lineId||!Number.isInteger(product.returnQuantity)||product.returnQuantity<1||product.returnQuantity>product.returnableQuantity) throw new Error('Số lượng đổi trả không hợp lệ.');
                return { line_id: product.lineId, quantity: product.returnQuantity };
            });
            const { error } = await db.rpc('request_own_sales_return',{
                p_request:returnRequestId,p_order:orderUuid,p_expected:currentRmaOrder.updatedAt,
                p_details:{reason,type:returnType,note:returnData.description,lines:details}
            });
            if (error) throw error;
        } catch (error) {
            console.error('[ReturnHandler] Không thể gửi yêu cầu:', error);
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            warningEl.textContent = error.code==='PT409'?'Đơn hàng đã thay đổi. Vui lòng đóng và mở lại yêu cầu.':
                error.code==='23514'?'Số lượng yêu cầu vượt số lượng còn có thể đổi trả. Vui lòng đóng và mở lại yêu cầu.':
                error.code==='42501'?'Bạn không có quyền gửi yêu cầu cho đơn hàng này.':
                error.code==='22023'?'Thông tin đổi trả không hợp lệ. Vui lòng kiểm tra sản phẩm và số lượng.':
                error.message||'Không thể gửi yêu cầu đổi trả. Vui lòng thử lại sau.';
            warningEl.style.display = 'block';
            return;
        }


        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        closeDrawer();

        const isGuestLookup = window.location.pathname.includes('return-guest');
        if (isGuestLookup) {
            setTimeout(() => {
                const searchForm = document.getElementById('rg-form');
                if (searchForm) searchForm.dispatchEvent(new Event('submit'));
                if (typeof showToast === 'function') {
                    showToast('Yêu cầu đổi trả đã được ghi nhận thành công!', 'success');
                }
            }, 200);
        } else {
            setTimeout(() => {
                window.location.hash = '#orders';
                window.dispatchEvent(new CustomEvent('sales_orders_updated'));
            }, 100);
        }
    });
}

function createRmaDrawerContainer() {
        const container = document.createElement('dialog');
        container.id = 'rma-drawer-container';
        document.body.appendChild(container);
        return container;
    }

function removeRmaFile() {
    const fileInput = document.getElementById('rma-file-input');
    const previewContainer = document.getElementById('rma-preview-container');
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.innerHTML = '';
}

window.removeRmaFile = removeRmaFile;
