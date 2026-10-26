import { API } from '/scripts/api/api.js';
import {watchCustomerTables} from '/scripts/shared/customer-realtime.mjs';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let returnLoadVersion=0;
const returnOwner=()=>{try{return JSON.parse(localStorage.getItem('pawpal_current_user')||'null')?.id || null;}catch{return null;}};

async function loadReturnRequestFromSupabase(orderId) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !orderId) return null;

    try {
        let resolvedOrderId = orderId;
        if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
            const lookup = await db.from('sales_order').select('id').eq('order_code', orderId).maybeSingle();
            if (lookup.error) throw lookup.error;
            if (!lookup.data) return null;
            resolvedOrderId = lookup.data.id;
        }
        const { data, error } = await db.from('return_request')
            .select('*, return_request_detail(*, sales_order_detail(product_name_snapshot,sku_snapshot,unit_price))')
            .eq('sales_order_id', resolvedOrderId)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();

        if (error) {
            console.warn('[ReturnDetail] Supabase lookup error:', error.message || error);
            throw error;
        }

        return data || null;
    } catch (err) {
        console.warn('[ReturnDetail] Supabase fetch exception:', err);
        throw err;
    }
}

function normalizeReturnRequestRow(row) {
    if (!row) return null;

    const products = Array.isArray(row.return_request_detail)
        ? row.return_request_detail.map((item) => {
            const product = item.sales_order_detail || {};
            let imageUrls = product.image_urls;
            if (typeof imageUrls === 'string') {
                try {
                    imageUrls = JSON.parse(imageUrls);
                } catch {
                    imageUrls = [imageUrls];
                }
            }
            const image = Array.isArray(imageUrls) && imageUrls.length
                ? imageUrls[0]
                : '/assets/images/shop/products/placeholder.webp';

            return {
                id: item.sales_order_detail_id,
                name: product.product_name_snapshot || 'Sản phẩm không có tên',
                image,
                quantity: Number(item.quantity) || 1,
                price: Number(product.unit_price) || 0,
                total: Number(item.quantity) * (Number(product.unit_price) || 0),
            };
        })
        : [];

    return {
        orderId: row.sales_order_id || '',
        rmaId: row.id || '',
        createdAt: row.created_at || new Date().toISOString(),
        status: ({pending:'reviewing',received:'received',approved:'approved',rejected:'rejected',cancelled:'cancelled'})[row.request_status] || String(row.request_status || 'placed').toLowerCase(),
        reason: row.reason || 'change_mind',
        type: ['hoan_tien', 'refund'].includes(String(row.return_type).toLowerCase()) ? 'refund' : 'exchange',
        description: row.description || '',
        resolution: row.resolution_type || '',
        refundAccount: row.refund_account || '',
        products,
        pointsDeducted: row.points_deducted || false,
    };
}

async function initReturnDetail() {
    const version=++returnLoadVersion;
    const owner=returnOwner();
    const root=document.querySelector('.return-detail-module-container');
    if(!root)return;
    await API.initData();
    if(version!==returnLoadVersion||!root.isConnected||owner!==returnOwner())return;

    const urlParams = new URLSearchParams(window.location.search);
    let orderId = urlParams.get('orderId') || urlParams.get('id');
    if (!orderId && window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        orderId = hashParams.get('orderId') || hashParams.get('id');
    }

    if (!orderId) {
        showReturnLoadError('Không tìm thấy mã đơn hàng.');
        return;
    }

    let rmaData = null;

    if (window.getSupabaseClient || window.SupabaseClient) {
        const supabaseRow = await loadReturnRequestFromSupabase(orderId);
        if (supabaseRow) {
            rmaData = normalizeReturnRequestRow(supabaseRow);
        }
    }

    if(version!==returnLoadVersion||!root.isConnected||owner!==returnOwner())return;
    if (!rmaData) {
        showReturnLoadError('Không tìm thấy yêu cầu đổi trả cho đơn hàng này.');
        return;
    }

    if(version!==returnLoadVersion||!root.isConnected)return;


    document.getElementById('rma-id-title').textContent = `Yêu cầu đổi trả #${rmaData.rmaId}`;

    const dateObj = new Date(rmaData.createdAt);
    document.getElementById('rma-date').textContent =
        `Ngày tạo: ${dateObj.toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} lúc ${dateObj.toLocaleTimeString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}`;

    const badge = document.getElementById('rma-status-badge');
    badge.textContent = getStatusLabel(rmaData.status);

    const prodContainer = document.getElementById('rma-products-list');
    prodContainer.innerHTML = (rmaData.products || []).map((product) => `
        <div class="rma-product-item border-0 p-0">
            <div class="rma-product-info">
                <h5 class="rma-product-name">${escapeHtml(product.name)}</h5>
                <p class="rma-product-meta">Số lượng: ${product.quantity} • Đơn giá: ${new Intl.NumberFormat('vi-VN').format(product.price)}đ</p>
            </div>
        </div>
    `).join('') || `
        <div class="rma-product-item border-0 p-0">
            <img src="/assets/images/shop/products/placeholder.webp" alt="Sản phẩm" class="rma-product-thumb">
            <div class="rma-product-info">
                <h5 class="rma-product-name">Sản phẩm không có dữ liệu</h5>
                <p class="rma-product-meta">Đơn hàng đang được cập nhật</p>
            </div>
        </div>
    `;

    const reasonsMap = {
        broken:      'Sản phẩm lỗi hỏng (do vận chuyển hoặc NSX)',
        wrong_item:  'Giao sai mẫu mã, chủng loại',
        wrong_size:  'Không vừa kích thước',
        change_mind: 'Không còn nhu cầu sử dụng'
    };

    document.getElementById('rma-reason-text').textContent = reasonsMap[rmaData.reason] || rmaData.reason;
    document.getElementById('rma-description-text').textContent = rmaData.description || 'Không có mô tả chi tiết.';

    const refundWrapper = document.getElementById('rma-refund-wrapper');
    const refundAccountEl = document.getElementById('rma-refund-account-display');
    if (refundWrapper && refundAccountEl && rmaData.type === 'refund') {
        refundWrapper.classList.remove('d-none');
        refundAccountEl.textContent = 'Yêu cầu hoàn tiền cần nhân viên xem xét và xác nhận giao dịch riêng.';
    }

    const shippingBox = document.getElementById('rma-shipping-box');
    if (shippingBox) {
        if (rmaData.status === 'approved' || rmaData.status === 'shipping_return') {
            shippingBox.classList.remove('d-none');
            const codeBold = document.getElementById('rma-code-bold');
            if (codeBold) codeBold.textContent = rmaData.rmaId;
        } else {
            shippingBox.classList.add('d-none');
        }
    }

    const timelineSteps = [
        { key: 'placed',          title: 'Gửi yêu cầu',        desc: 'Đã tiếp nhận yêu cầu đổi trả' },
        { key: 'reviewing',       title: 'Đang kiểm duyệt',    desc: 'Đội ngũ hỗ trợ đang xem xét thông tin' },
        { key: 'approved',        title: 'Đã chấp nhận',        desc: 'Yêu cầu được duyệt. Vui lòng gửi hàng về shop' },
        { key: 'received', title: 'Đã nhận hàng trả', desc: 'Nhân viên đã xác nhận nhận hàng; trạng thái này không xác nhận đã hoàn tiền.' }
    ];
    if(['rejected','cancelled'].includes(rmaData.status))timelineSteps.splice(1,timelineSteps.length-1,
        {key:rmaData.status,title:getStatusLabel(rmaData.status),desc:getReturnResolutionMessage(rmaData)});

    const statusOrder = timelineSteps.map(s => s.key);
    let activeIdx = statusOrder.indexOf(rmaData.status);
    if (activeIdx === -1) activeIdx = 0; // fallback

    const timelineContainer = document.getElementById('rma-timeline');
    timelineContainer.innerHTML = timelineSteps.map((step, idx) => {
        let statusClass = 'pending';
        if (idx < activeIdx) statusClass = 'completed';
        else if (idx === activeIdx) statusClass = 'active';

        return `
            <div class="rma-timeline-item ${statusClass}">
                <div class="rma-timeline-dot"></div>
                <div class="rma-timeline-content">
                    <div class="rma-timeline-title">${step.title}</div>
                    <div class="rma-timeline-desc">${escapeHtml(step.desc)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getReturnResolutionMessage(data) {
    if(data.status==='rejected' && data.resolution)return data.resolution;
    return 'Yêu cầu không được tiếp tục xử lý.';
}

function showReturnLoadError(message) {
    const container = document.querySelector('.return-detail-module-container');
    if (!container) return;
    container.classList.remove('return-detail-loading');
    container.setAttribute('aria-busy','false');
    container.innerHTML = '<div class="text-center py-5" role="status"><p class="text-muted"></p><a href="#orders">Quay lại danh sách đơn hàng</a></div>';
    container.querySelector('p').textContent = message;
}

let isInitRunning = false;
let stopRealtime;
let stopAuth;
export function dispose(){++returnLoadVersion;stopRealtime?.();stopRealtime=null;stopAuth?.();stopAuth=null;isInitRunning=false;}

export async function init() {
    if (isInitRunning) return;
    isInitRunning = true;
    const owner=returnOwner();
    const onAuth=()=>{dispose();showReturnLoadError('Phiên tài khoản đã thay đổi. Vui lòng mở lại yêu cầu đổi trả.');};
    const onStorage=event=>{if(event.key==='pawpal_current_user')onAuth();};
    stopAuth?.();document.addEventListener('auth_state_changed',onAuth);window.addEventListener('storage',onStorage);
    stopAuth=()=>{document.removeEventListener('auth_state_changed',onAuth);window.removeEventListener('storage',onStorage);};
    const mountVersion=returnLoadVersion+1;
    const loadingContainer = document.querySelector('.return-detail-module-container');
    try {
        await initReturnDetail();
        if(!loadingContainer?.isConnected || mountVersion!==returnLoadVersion || owner!==returnOwner())return;
        stopRealtime?.();
        const user=JSON.parse(localStorage.getItem('pawpal_current_user')||'null');
        const client=window.getSupabaseClient?.()||window.SupabaseClient;
        stopRealtime=watchCustomerTables(client,user?.id,['return_request','return_request_detail'],()=>initReturnDetail().catch(()=>{if(loadingContainer.isConnected)showReturnLoadError('Không thể cập nhật yêu cầu đổi trả. Vui lòng tải lại trang.');}));
    } catch (error) {
        console.error('[ReturnDetail] Không thể tải yêu cầu:', error);
        if(loadingContainer?.isConnected && mountVersion===returnLoadVersion && owner===returnOwner())showReturnLoadError('Không thể tải yêu cầu đổi trả. Vui lòng tải lại trang.');
    } finally {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if(mountVersion!==returnLoadVersion || owner!==returnOwner())return;
            loadingContainer?.classList.remove('return-detail-loading');
            loadingContainer?.setAttribute('aria-busy', 'false');
            setTimeout(() => loadingContainer?.querySelector('.return-detail-skeleton')?.remove(), 260);
        }));
        isInitRunning = false;
    }
}

export const initReturnDetailExport = init;
window.initReturnDetail = init;

function getStatusLabel(status) {
    const statusMap = {
        placed:          'Đã gửi yêu cầu',
        reviewing:       'Đang kiểm duyệt',
        approved:        'Đã chấp nhận',
        shipping_return: 'Đang gửi hàng trả',
        completed:       'Hoàn tất',
        received:        'Đã nhận hàng trả',
        cancelled:       'Đã hủy',
        rejected:        'Từ chối'
    };
    return statusMap[status] || status;
}

