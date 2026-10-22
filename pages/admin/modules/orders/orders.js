(function(){
 'use strict';
 const one=v=>Array.isArray(v)?v[0]:v;
 const number=v=>v==null?null:Number(v);
 async function rows(make){const all=[];for(let offset=0;;offset+=500){const {data,error}=await make().range(offset,offset+499);if(error)throw error;all.push(...data);if(data.length<500)return all;}}
 const db=()=>window.getSupabaseClient();
 const profile=c=>one(c?.customer_profile)||{};
 const phone=c=>(c?.customer_phone||[]).find(p=>p.is_primary)?.phone_number||'';
 const spec=value=>value&&typeof value==='object'?Object.entries(value).map(([k,v])=>k+': '+String(v)).join('; '):String(value||'');
 const images=list=>[...(list||[])].sort((a,b)=>Number(b.is_thumbnail)-Number(a.is_thumbnail)||a.display_order-b.display_order).map(x=>x.image_url);
 const net=p=>Number(p.amount)-(p.refunds||[]).filter(r=>r.refund_status==='succeeded').reduce((n,r)=>n+Number(r.refunded_amount),0);
 async function products(){
  const [categories,source,reviews,reservations]=await Promise.all([
   rows(()=>db().from('product_category').select('id,category_name,description').order('id')),
   rows(()=>db().from('product').select('*,category:category_id(id,category_name),media:product_media(*),variants:product_variant(*,inventory(quantity_in_stock,minimum_stock,last_updated_at),size:size_id(id,size_name),color:color_id(id,color_name,hex_code),flavor:flavor_id(id,flavor_name),media:product_variant_media(*))').order('id')),
   rows(()=>db().from('review').select('id,rating,sales_order_detail_id,line:sales_order_detail_id(product_variant:product_variant_id(product_id))').not('sales_order_detail_id','is',null).order('id')),
   rows(()=>db().from('stock_reservation').select('id,product_variant_id,quantity,expires_at').eq('status','active').gt('expires_at',new Date().toISOString()).order('id'))
  ]);
  return {categories,products:source.map(p=>{
   const variants=[...p.variants].sort((a,b)=>a.id.localeCompare(b.id)),active=variants.filter(v=>v.status==='active'),prices=active.map(v=>Number(v.sale_price));
   const mapped=variants.map(v=>{const inv=one(v.inventory);return {image:images(v.media)[0]||'',images:images(v.media),id:v.id,sku:v.sku_variant,attr1:v.flavor?.flavor_name||v.size?.size_name||v.color?.color_name||'',attr2:v.flavor?v.size?.size_name||v.color?.color_name||'':v.size?v.color?.color_name||'':'',name:[v.flavor?.flavor_name,v.size?.size_name,v.color?.color_name].filter(Boolean).join(' · ')||v.sku_variant,costPrice:Number(v.cost_price),price:Number(v.sale_price),originalPrice:number(v.compare_at_price),stock:inv?Number(inv.quantity_in_stock):null,minStock:inv?Number(inv.minimum_stock):null,status:v.status,raw:v};});
   const stock=mapped.length&&mapped.every(v=>v.stock!==null)?mapped.reduce((n,v)=>n+v.stock,0):null;
   const minima=mapped.map(v=>v.minStock).filter(v=>v!==null),minStock=minima.length?minima.reduce((n,v)=>n+v,0):null;
   const ratings=reviews.filter(r=>one(one(r.line)?.product_variant)?.product_id===p.id&&r.rating>=1&&r.rating<=5),media=images(p.media),defaultVariant=mapped[0];
   return {reserved:reservations.filter(r=>variants.some(v=>v.id===r.product_variant_id)).reduce((n,r)=>n+Number(r.quantity),0),id:p.id,updatedAt:p.updated_at,raw:p,variant_id:defaultVariant?.id||null,default_variant_id:defaultVariant?.id||null,sku:defaultVariant?.sku||'',name:p.product_name,category:p.category?.category_name||'Chưa phân loại',brand:p.brand_name||'',petType:p.target_pet||'',description:p.description||'',ingredients:p.ingredients||'',benefits:p.benefits||'',usage:p.usage_instructions||'',features:p.specs?.features||'',feedingGuide:p.specs?.feeding_guide||'',expiry:p.specs?.expiry||'',storage:p.specs?.storage||'',origin:p.origin||'',unit:p.unit,spec:p.specs?.quy_cach||spec(p.specs),badge:p.badge||'',costPrice:mapped.length?Math.min(...mapped.map(v=>v.costPrice)):null,rating:ratings.length?ratings.reduce((n,r)=>n+Number(r.rating),0)/ratings.length:null,reviewCount:ratings.length,price:prices.length?Math.min(...prices):null,originalPrice:defaultVariant?.originalPrice??defaultVariant?.price??null,memberPrice:prices.length?Math.min(...prices):null,stock,minStock,images:media.join(', '),image:media[0]||'',status:p.status!=='active'?'Tạm ngưng':stock===0?'Hết hàng':stock!==null&&minStock!==null&&stock<=minStock?'Sắp hết':'Còn hàng',hasVariants:mapped.length>1,attr1Name:variants.some(v=>v.flavor)?'Hương vị':variants.some(v=>v.size)?'Kích thước':'Màu sắc',attr2Name:variants.some(v=>v.flavor&&v.size)?'Kích thước':'Màu sắc',variants:mapped};
  })};
 }
 async function orders(){
  const [source,totals,returns,redemptions]=await Promise.all([
   rows(()=>db().from('sales_order').select('*,customer:customer_id(id,customer_profile(full_name),customer_phone(phone_number,is_primary)),provider:shipping_provider_id(provider_name),lines:sales_order_detail(*,variant:product_variant_id(id,sku_variant,product_id,product:product_id(specs),media:product_variant_media(*))),payments:payment(*,method:payment_method_config_id(name,short_name),refunds:refund_transaction(*))').order('created_at',{ascending:false}).order('id')),
   rows(()=>db().from('sales_order_totals').select('*').order('order_id')),
   rows(()=>db().from('return_request').select('*,lines:return_request_detail(*,line:sales_order_detail_id(product_name_snapshot,sku_snapshot,unit_price,discount_amount,quantity,product_variant_id))').order('created_at',{ascending:false}).order('id')),
   rows(()=>db().from('voucher_redemption').select('order_id,discount_amount_snapshot,status').not('order_id','is',null).order('id'))
  ]);
  const totalMap=new Map(totals.map(t=>[t.order_id,Number(t.total_amount)]));
  return source.map(o=>{
   const amount=totalMap.get(o.id);if(amount===undefined)throw Error('Thiếu tổng đơn hàng V1.');
   const payments=o.payments.filter(p=>p.transaction_status==='succeeded'),gross=payments.reduce((n,p)=>n+Number(p.amount),0),collected=payments.reduce((n,p)=>n+net(p),0),refunds=gross-collected;
   const status=({draft:'pending',pending:'pending',packing:'confirmed',confirmed:'confirmed',shipped:'shipping',shipping:'shipping',delivered:'completed',completed:'completed',cancelled:'cancelled',returned:'returned'})[o.order_status]||o.order_status;
   const requests=returns.filter(r=>r.sales_order_id===o.id),r=requests[0],returnsTotal=payments.reduce((n,p)=>n+(p.refunds||[]).filter(v=>v.refund_status==='succeeded').reduce((s,v)=>s+Number(v.refunded_amount),0),0);
   const paymentStatus=collected>=amount&&amount>0?'paid':collected>0?'partial':gross>0&&refunds>=gross?'refunded':'unpaid';
   const method=payments[0]?.method?.name||'',paymentMethod=/tiền mặt/i.test(method)?'cash':/chuyển khoản|VietQR/i.test(method)?'bank_transfer':/MoMo/i.test(method)?'momo':/VNPay/i.test(method)?'vnpay':'unknown';
   const items=o.lines.map(d=>({id:d.id,variant_id:d.product_variant_id,sku:d.sku_snapshot,name:d.product_name_snapshot,spec:spec(d.variant?.product?.specs),price:Number(d.unit_price),quantity:Number(d.quantity),discount:Number(d.discount_amount),total:Number(d.unit_price)*Number(d.quantity)-Number(d.discount_amount),image:images(d.variant?.media)[0]||''}));
   const rmaInfo=r?{id:r.id,requestId:r.id,solutionType:r.return_type,solutionTypeName:({refund:'Hoàn tiền',return:'Trả hàng',exchange:'Đổi hàng'})[r.return_type]||'Cần đối soát',reason:r.reason,reasonText:r.reason,restockAction:'',restockText:'Xem sổ kho để đối chiếu',refundMethod:'',refundAmount:returnsTotal,refundText:returnsTotal>0?'Đã ghi nhận hoàn tiền':'Chưa ghi nhận hoàn tiền',items:r.lines.map(v=>({sku:v.line?.sku_snapshot||'',name:v.line?.product_name_snapshot||'',quantity:v.quantity,price:v.line?.unit_price??null,variant_id:v.line?.product_variant_id,sales_order_detail_id:v.sales_order_detail_id})),note:r.description||'',createdAt:r.created_at,status:r.request_status}:null;
   const hasOpenReturn=requests.some(v=>['pending','approved'].includes(v.request_status));
   const overdue=status==='pending'&&Date.now()-Date.parse(o.created_at)>1800000;
   return {id:o.order_code,rawId:o.id,rawStatus:o.order_status,updatedAt:o.updated_at,userId:o.customer_id,customerName:profile(o.customer).full_name||o.receiver_name_snapshot||'Chưa có tên khách',phone:phone(o.customer)||o.receiver_phone_snapshot||'',receiverName:o.receiver_name_snapshot||'',receiverPhone:o.receiver_phone_snapshot||'',address:[o.street_address_snapshot,o.province_snapshot,o.postal_code_snapshot].filter(Boolean).join(', ')||'Chưa ghi nhận địa chỉ giao hàng',status,paymentStatus,paymentMethod,paymentMethodName:method||'Chưa ghi nhận',collected,refunded:refunds,remaining:Math.max(amount-collected,0),payments:o.payments,carrier:o.provider?.provider_name||'Chưa phân công',trackingNumber:o.tracking_code||'—',createdAt:o.created_at,subtotal:o.lines.reduce((n,d)=>n+Number(d.unit_price)*Number(d.quantity),0),shippingFee:Number(o.shipping_fee_snapshot),discount:o.lines.reduce((n,d)=>n+Number(d.discount_amount),0)+redemptions.filter(v=>v.order_id===o.id&&v.status==='applied').reduce((n,v)=>n+Number(v.discount_amount_snapshot),0),pawPointsUsed:null,total:amount,customerNote:o.note||'',internalNote:'',alertType:hasOpenReturn||overdue?'danger':null,alertMessage:hasOpenReturn?'Có yêu cầu đổi trả':overdue?'Chờ xác nhận quá 30 phút':null,rmaInfo,returnRequests:requests,delivery:null,products:items,timeline:[{title:'Tạo đơn hàng',time:o.created_at,desc:'Đơn được ghi nhận trong hệ thống',done:true},...(o.shipped_at?[{title:'Bàn giao vận chuyển',time:o.shipped_at,desc:o.provider?.provider_name||'Chưa ghi nhận đơn vị vận chuyển',done:true}]:[]),...(o.delivered_at?[{title:'Giao hàng',time:o.delivered_at,desc:'Đã ghi nhận thời điểm giao hàng',done:true}]:[])]};
  });
 }
 async function customers(){const [list,balances]=await Promise.all([rows(()=>db().from('customer').select('id,customer_profile(full_name),customer_phone(phone_number,is_primary),customer_address(*),customer_membership(membership_tier(tier_name,discount_percent,is_active)),pet_profile(id,pet_name)').order('id')),rows(()=>db().from('customer_point_balance').select('*').order('customer_id'))]);return list.map(c=>({id:c.id,rawName:profile(c).full_name||null,name:profile(c).full_name||'Chưa có tên khách',phone:phone(c),rank:one(one(c.customer_membership)?.membership_tier)?.tier_name||'Chưa có hạng',defaultAddress:c.customer_address.find(a=>a.is_default)||null,discountPercent:one(one(c.customer_membership)?.membership_tier)?.discount_percent??null,points:Number(balances.find(b=>b.customer_id===c.id)?.total_paw_points||0),address:[c.customer_address.find(a=>a.is_default)?.street_address,c.customer_address.find(a=>a.is_default)?.province].filter(Boolean).join(', '),pets:c.pet_profile||[]}));}
 async function stockLogs(){
  const list=await rows(()=>db().from('inventory_transaction').select('id,product_variant_id,quantity,transaction_type,note,created_at,recorded_at,idempotency_key,variant:product_variant_id(sku_variant,product:product_id(product_name)),staff:staff_id(full_name)').order('created_at').order('id'));
  // The ledger is authoritative; never derive historical balances from today's stock.
  const balance=new Map();
  return list.map(t=>{const before=balance.get(t.product_variant_id)||0,after=before+Number(t.quantity);balance.set(t.product_variant_id,after);return {id:t.id,sku:t.variant?.sku_variant||'',name:t.variant?.product?.product_name||'',date:t.recorded_at||t.created_at,type:t.quantity>0?'IN':'OUT',typeLabel:t.transaction_type,change:(t.quantity>0?'+':'')+t.quantity,beforeStock:before,afterStock:after,reason:t.note||'',refCode:t.idempotency_key,staff:t.staff?.full_name||'Chưa ghi nhận'};}).reverse();
 }
 window.PawpalOrderV1={rows,products,orders,customers,stockLogs,one,net};
})();

;

// orders.js - Core Orchestrator cho Phân hệ Quản lý Bán hàng Pawpal-er
(function() {
    'use strict';

    // ====================================================================
    // CHUẨN HÓA HÀM THỜI GIAN VÀ TIỀN TỆ TOÀN PHÂN HỆ
    // ====================================================================
    const formatDateTime = window.formatDateTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    const formatDate = window.formatDate || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    const formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    function formatVND(amount) {
        return (amount || 0).toLocaleString('vi-VN') + ' đ';
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toUnaccent(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
            .toLowerCase()
            .trim();
    }

    function matchSearch(sourceText, searchTerm) {
        if (!searchTerm) return true;
        if (!sourceText) return false;
        const src = String(sourceText).toLowerCase();
        const query = String(searchTerm).toLowerCase().trim();
        if (src.includes(query)) return true;
        return toUnaccent(sourceText).includes(toUnaccent(searchTerm));
    }

    // ====================================================================
    // DATA STORE 100% TRỰC TIẾP TỪ SUPABASE LIVE DATABASE (RULE 6)
    // ====================================================================
    function getSharedVouchersList() {
        return window.PawpalOrders?.state?.vouchers || [];
    }

    function persistSharedVouchersData(vouchers) {
        if (window.PawpalOrders?.state) window.PawpalOrders.state.vouchers = vouchers || [];

    }

    let currentProductsList = [];
    function persistProductsData() { /* Business state is reloaded from Supabase. */ }

    let currentStockLogsList = [];
    function persistStockLogsData() { /* Business state is reloaded from Supabase. */ }

    let currentOrdersList = [];
    function persistOrdersData() { /* Business state is reloaded from Supabase. */ }

    // Toast thông báo chuẩn hệ thống
    function showToast(msg, type = 'success') {
        let toast = document.getElementById('adminGlobalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'adminGlobalToast';
            document.body.appendChild(toast);
        }
        const isAlert = type === 'warning' || type === 'error' || type === 'danger';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background-color: ${isAlert ? '#8F2424' : '#236B48'};
            color: #FFFFFF;
            padding: 12px 20px;
            border-radius: var(--admin-radius);
            font-size: 13.5px;
            font-weight: 500;
            box-shadow: 0 8px 24px rgba(26, 43, 35, 0.2);
            z-index: 99999;
            display: block;
        `;
        toast.textContent = msg;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.display = 'none';
        }, 2500);
    }

    // Modal xác nhận thao tác
    function showOrderConfirmModal({ title = 'Xác nhận thao tác', message = 'Bạn có chắc chắn muốn thực hiện thao tác này?', acceptText = 'Đồng ý', onAccept }) {
        const modal = document.getElementById('modalConfirmOrderAction');
        const titleEl = document.getElementById('confirmOrderActionTitle');
        const msgEl = document.getElementById('confirmOrderActionMessage');
        const btnAccept = document.getElementById('btnAcceptOrderConfirm');

        if (!modal) {
            if (typeof onAccept === 'function') onAccept();
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btnAccept) btnAccept.textContent = acceptText;

        const closeModal = () => {
            modal.classList.remove('active');
            if (btnAccept) btnAccept.onclick = null;
        };

        if (btnAccept) {
            btnAccept.onclick = () => {
                closeModal();
                if (typeof onAccept === 'function') onAccept();
            };
        }

        modal.classList.add('active');
    }

    // Tạo HTML phiếu đóng gói và bảng kê vận chuyển
    function getOrderSlaInfo(order) {
        if (!order || !order.createdAt) {
            return { level: 'normal', badgeClass: '', label: '--', isSlaOverdue: false };
        }
        const createdMs = new Date(order.createdAt).getTime();
        const nowMs = Date.now();
        const diffMinutes = Math.floor((nowMs - createdMs) / 60000);

        if (order.status === 'pending') {
            if (diffMinutes > 30) {
                return {
                    level: 'danger',
                    badgeClass: 'badge-danger',
                    label: `Quá hạn tiếp nhận (${diffMinutes}p)`,
                    isSlaOverdue: true
                };
            }
            if (diffMinutes >= 15) {
                return {
                    level: 'warning',
                    badgeClass: 'badge-warning',
                    label: `Cần tiếp nhận gấp (${diffMinutes}p)`,
                    isSlaOverdue: false
                };
            }
            return {
                level: 'normal',
                badgeClass: 'badge-neutral',
                label: `Mới đặt (${diffMinutes}p)`,
                isSlaOverdue: false
            };
        }

        if (order.status === 'confirmed') {
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours >= 4) {
                return {
                    level: 'warning',
                    badgeClass: 'badge-warning',
                    label: `Chờ đóng gói (${diffHours}h)`,
                    isSlaOverdue: false
                };
            }
        }

        if (order.status === 'returned' || order.alertType === 'danger') {
            return {
                level: 'danger',
                badgeClass: 'badge-danger',
                label: 'Có khiếu nại / Đổi trả',
                isSlaOverdue: false
            };
        }

        return {
            level: 'normal',
            badgeClass: '',
            label: '--',
            isSlaOverdue: false
        };
    }

    // ====================================================================
    // GLOBAL NAMESPACE: WINDOW.PAWPALORDERS
    // ====================================================================
    window.PawpalOrders = {
        state: {
            orders: currentOrdersList,
            products: currentProductsList,
            stockLogs: currentStockLogsList,
            selectedOrderId: sessionStorage.getItem('pawpal_admin_order_selected_id') || sessionStorage.getItem('pawpal_admin_order_id') || null,
            selectedBatchOrderIds: [],
            activeActionOrderId: null,
            activeAdjustProductSku: null,
            activeStockActionSku: null,
            activeGrnItems: [],
            activeActionVoucherCode: null
        },
        helpers: {
            formatVND,
            formatDateTime,
            formatDate,
            formatTime,
            toUnaccent,
            matchSearch,
            showToast,
            showOrderConfirmModal,


            getOrderSlaInfo,
            getSharedVouchersList,
            persistSharedVouchersData,
            persistProductsData,
            persistStockLogsData,
            persistOrdersData,
            syncOrdersAndProductsFromSupabase
        },
        controllers: {
            list: null,
            detail: null,
            products: null,
            promos: null
        },
        renderOrdersTable: function() {
            if (this.controllers.list?.renderOrdersTable) {
                this.controllers.list.renderOrdersTable();
            }
        },
        renderOrderDetail: function(id) {
            if (this.controllers.detail?.renderOrderDetail) {
                this.controllers.detail.renderOrderDetail(id);
            }
        },
        renderProductsTable: function() {
            if (this.controllers.products?.renderProductsTable) {
                this.controllers.products.renderProductsTable();
            }
        },
        renderVouchersTable: function() {
            if (this.controllers.promos?.renderVouchersTable) {
                this.controllers.promos.renderVouchersTable();
            }
        },
        updateCategoryFilterDropdown: function(cats) {
            if (this.controllers.products?.updateCategoryFilterDropdown) {
                this.controllers.products.updateCategoryFilterDropdown(cats);
            }
        },
        switchSubtab: function(targetSubtab, updateHistory = true) {
            switchSubtab(targetSubtab, updateHistory);
        }
    };

    // Đồng bộ Supabase Live Database qua PawpalDataStore
    async function fetchProductsData() {
        try {
            const [result, logs] = await Promise.all([window.PawpalOrderV1.products(), window.PawpalOrderV1.stockLogs()]);
            currentStockLogsList = logs;
            window.PawpalOrders.state.stockLogs = logs;
            currentProductsList = result.products;
            window.PawpalOrders.state.categories = result.categories;
            Object.assign(window.PawpalOrders.state, {products: currentProductsList, productsLoaded: true, productsError: false});
            window.PawpalOrders.updateCategoryFilterDropdown(result.categories);
        } catch (err) {
            currentProductsList = [];
            Object.assign(window.PawpalOrders.state, {products: [], productsError: true});
            console.warn('[Orders V1] Products:', err);
        }
        window.PawpalOrders.renderProductsTable();
        return currentProductsList;
    }

    async function fetchVouchersData({ force = false } = {}) {
        const fetcher = async () => {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu');
            const [data, usage] = await Promise.all([
                window.PawpalOrderV1.rows(() => client.from('voucher').select('*').order('id')),
                window.PawpalOrderV1.rows(() => client.from('voucher_redemption').select('id,voucher_id,status').eq('status','applied').order('id'))
            ]);
            return data.map(v => ({...v, used:usage.filter(r => r.voucher_id===v.id).length}));
        };

        try {
            let voucherData;
            if (window.PawpalDataStore) {
                voucherData = await window.PawpalDataStore.fetch('orders:vouchers', fetcher, {
                    ttlMs: window.PawpalDataStore.TTL_TIERS.CATALOG,
                    force
                });
            } else {
                voucherData = await fetcher();
            }

            const vouchersList = (voucherData || []).map(v => {
                const isPct = String(v.type || '').toLowerCase().includes('phan_tram') || v.type === 'percentage' || v.type === 'percent';
                const rawDiscount = Number(v.discount_value) || 0;
                const safeDiscount = isPct ? Math.min(100, Math.max(0, rawDiscount)) : Math.max(0, rawDiscount);
                const discountVal = isPct ? `${safeDiscount}%` : formatVND(safeDiscount);
                let expFormatted = 'Không giới hạn';
                if (v.end_date) {
                    const expD = new Date(v.end_date);
                    if (!isNaN(expD.getTime())) {
                        expFormatted = `${String(expD.getDate()).padStart(2, '0')}/${String(expD.getMonth() + 1).padStart(2, '0')}/${expD.getFullYear()}`;
                    }
                }
                return {
                    code: String(v.voucher_code || '').trim().replace(/[^A-Za-z0-9_-]/g, ''),
                    dbCode: v.voucher_code,
                    name: v.voucher_name || v.description,
                    title: v.voucher_name || v.description,
                    type: isPct ? 'percent' : 'fixed',
                    target: v.applicable_for,
                    value: safeDiscount,
                    discount: discountVal,
                    minOrder: Math.max(0, Number(v.minimum_order_amount) || 0),
                    points: Math.max(0, Number(v.required_points) || 0),
                    startsAt: v.start_date,
                    endsAt: v.end_date,
                    validDate: expFormatted,
                    expiry: expFormatted,
                    limit: (v.max_usage !== null && v.max_usage !== undefined) ? Number(v.max_usage) : null,
                    used: v.used,
                    id: v.id, updatedAt: v.updated_at, raw:v,
                    status: v.end_date && v.end_date < new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Ho_Chi_Minh'}) ? 'expired' : (v.is_active ? 'active' : 'paused')
                };
            });
            window.PawpalOrders.state.vouchersLoaded = true;
            window.PawpalOrders.state.vouchersError = false;
            persistSharedVouchersData(vouchersList);
            window.PawpalOrders.renderVouchersTable();
            return vouchersList;
        } catch (err) {
            console.warn('[Orders Core] Lỗi khi nạp voucher:', err);
            window.PawpalOrders.state.vouchersError = true;
            window.PawpalOrders.renderVouchersTable();
            return [];
        }
    }

    async function fetchOrdersData() {
        try {
            currentOrdersList = await window.PawpalOrderV1.orders();
            Object.assign(window.PawpalOrders.state, {orders: currentOrdersList, ordersLoaded: true, ordersError: false});
        } catch (err) {
            currentOrdersList = [];
            Object.assign(window.PawpalOrders.state, {orders: [], ordersError: true});
            console.warn('[Orders V1] Orders:', err);
        }
        window.PawpalOrders.renderOrdersTable();
        if (window.PawpalOrders.state.selectedOrderId) window.PawpalOrders.renderOrderDetail(window.PawpalOrders.state.selectedOrderId);
        await window.PawpalOrders.controllers.list?.loadPosCustomerDirectory?.();
        return currentOrdersList;
    }

    window.PawpalOrders.fetchProductsData = fetchProductsData;
    window.PawpalOrders.fetchVouchersData = fetchVouchersData;
    window.PawpalOrders.fetchOrdersData = fetchOrdersData;

    async function syncOrdersAndProductsFromSupabase({ force = false } = {}) {
        if (force && window.PawpalDataStore) {
            window.PawpalDataStore.invalidate('orders:*');
        }
        await Promise.allSettled([
            fetchOrdersData({ force }),
            fetchProductsData({ force }),
            fetchVouchersData({ force })
        ]);
        console.log(`[Orders Core] Đã đồng bộ từ Supabase: ${currentOrdersList.length} đơn hàng, ${currentProductsList.length} sản phẩm.`);
    }

    // Lắng nghe mutation liên phân hệ
    if (window.PawpalDataStore) {
        window.PawpalDataStore.subscribeMutations((mutation) => {
            if (mutation.entity === 'sales_order') {
                window.PawpalDataStore.invalidate('orders:list*');
            } else if (mutation.entity === 'product' || mutation.entity === 'inventory' || mutation.entity === 'inventory_log') {
                window.PawpalDataStore.invalidate('orders:products*');
            } else if (mutation.entity === 'voucher') {
                window.PawpalDataStore.invalidate('orders:vouchers*');
            }
        });
    }

    // Điều hướng Subtab
    function updateBreadcrumb(orderId) {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (orderId) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${escapeHtml(orderId)}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }

    function switchSubtab(targetSubtab, updateHistory = true) {
        const validTabs = ['tab-order-list', 'tab-order-detail', 'tab-order-products', 'tab-order-promos'];
        if (!validTabs.includes(targetSubtab)) {
            targetSubtab = 'tab-order-list';
        }

        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Bán hàng') return;
        const root = document.getElementById('subtab-tab-order-list')?.closest('.admin-module-wrapper');
        const subtabPanels = root?.querySelectorAll('.subtab-content') || [];

        headerSubtabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
        });

        let matched = false;
        subtabPanels.forEach(panel => {
            const isMatch = panel.id === `subtab-${targetSubtab}`;
            panel.classList.toggle('active', isMatch);
            if (isMatch) matched = true;
        });

        if (!matched && subtabPanels.length > 0) {
            subtabPanels[0].classList.add('active');
            targetSubtab = validTabs[0];
        }

        if (targetSubtab === 'tab-order-detail') {
            const targetId = window.PawpalOrders.state.selectedOrderId || sessionStorage.getItem('pawpal_admin_order_selected_id') || null;
            window.PawpalOrders.state.selectedOrderId = targetId;
            window.PawpalOrders.renderOrderDetail(targetId);
            updateBreadcrumb(targetId || '');
        } else {
            updateBreadcrumb('');
            if (targetSubtab === 'tab-order-list') {
                if (!window.PawpalOrders.state.ordersLoaded) {
                    fetchOrdersData().then(() => window.PawpalOrders.renderOrdersTable());
                } else {
                    window.PawpalOrders.renderOrdersTable();
                }
            } else if (targetSubtab === 'tab-order-products') {
                const needsFresh = !window.PawpalOrders.state.productsLoaded;
                if (needsFresh) {
                    fetchProductsData({ force: true }).then(() => window.PawpalOrders.renderProductsTable());
                } else {
                    window.PawpalOrders.renderProductsTable();
                }
            } else if (targetSubtab === 'tab-order-promos') {
                if (!window.PawpalOrders.state.vouchersLoaded) {
                    fetchVouchersData().then(() => window.PawpalOrders.renderVouchersTable());
                } else {
                    window.PawpalOrders.renderVouchersTable();
                }
            }
        }

        sessionStorage.setItem('pawpal_admin_order_subtab', targetSubtab);
        if (updateHistory) {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.pushState(null, '', '#' + targetSubtab);
                } catch (e) {
                    window.location.hash = targetSubtab;
                }
            }
        } else {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.replaceState(null, '', '#' + targetSubtab);
                } catch (e) {}
            }
        }
    }

    function initOrdersModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        const validTabs = ['tab-order-list', 'tab-order-detail', 'tab-order-products', 'tab-order-promos'];

        // Khôi phục subtab từ hash hoặc sessionStorage
        const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
        const savedTab = sessionStorage.getItem('pawpal_admin_order_subtab') || 'tab-order-list';
        const targetTab = validTabs.includes(currentHash) ? currentHash : (validTabs.includes(savedTab) ? savedTab : 'tab-order-list');

        switchSubtab(targetTab, false);

        // Lắng nghe sự kiện chuyển subtab từ router cha
        window.addEventListener('admin:subtab-change', (e) => {
            if (e.detail?.module === 'Bán hàng' && validTabs.includes(e.detail.tabId)) {
                switchSubtab(e.detail.tabId, false);
            }
        });

        setupOrdersRealtimeSync();
        syncOrdersAndProductsFromSupabase();

        // Hỗ trợ kiểm thử tự động cho modal17
        if (window.location.search.includes('v=modal17')) {
            setTimeout(() => {
                showOrderConfirmModal({
                    title: 'Xác nhận thao tác',
                    message: 'Bạn có chắc chắn muốn thực hiện thao tác này không? Hành động này sẽ được ghi nhận vào nhật ký hệ thống.',
                    acceptText: 'Đồng ý'
                });
            }, 600);
        }
    }

    let _ordersRealtimeChannel = null;
    function setupOrdersRealtimeSync() {
        if (_ordersRealtimeChannel) return;
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client || typeof client.channel !== 'function') return;

        try {
            const triggerOrderSync = (pattern) => {
                if (window.PawpalDataStore?.handleRealtimeChange) {
                    window.PawpalDataStore.handleRealtimeChange({
                        moduleName: 'Bán hàng',
                        invalidatePattern: pattern || 'orders:*',
                        onActiveRefresh: async () => {
                            await syncOrdersAndProductsFromSupabase({ force: true });
                        },
                        debounceMs: 300
                    });
                } else if (sessionStorage.getItem('pawpal_admin_active_module') === 'Bán hàng') {
                    syncOrdersAndProductsFromSupabase({ force: true });
                }
            };

            _ordersRealtimeChannel = client.channel('admin-orders-live-sync');
            for (const table of ['sales_order','sales_order_detail','product','product_variant','product_media','product_variant_media','product_category','inventory','inventory_transaction','stock_reservation','voucher','voucher_redemption','payment','refund_transaction','return_request','return_request_detail','review','review_response','customer_profile','customer_phone','customer_address','customer_membership','membership_tier','variant_color','variant_size','variant_flavor','shipping_provider','delivery_option_config']) {
                _ordersRealtimeChannel.on('postgres_changes', {event:'*',schema:'public',table}, () => triggerOrderSync('orders:*'));
            }
            _ordersRealtimeChannel.subscribe();

            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin-orders-live-sync');

            window.addEventListener('beforeunload', () => {
                if (_ordersRealtimeChannel) {
                    client.removeChannel(_ordersRealtimeChannel);
                    window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin-orders-live-sync');
                }
            });
        } catch (e) {
            console.warn('[Orders] Lỗi mở kênh realtime:', e);
        }
    }

    // Export bridge cho window.PawpalOrdersModule
    window.PawpalOrdersModule = window.PawpalOrdersModule || {};
    window.PawpalOrdersModule.switchSubtab = switchSubtab;
    window.PawpalOrdersModule.syncOrdersAndProductsFromSupabase = syncOrdersAndProductsFromSupabase;
    window.PawpalOrdersModule.loadOrdersData = syncOrdersAndProductsFromSupabase;
    window.PawpalOrdersModule.showOrderConfirmModal = showOrderConfirmModal;
    window.PawpalOrdersModule.escapeHtml = escapeHtml;

    // Tự động khởi tạo sau khi tất cả script subtab nạp xong
    setTimeout(() => {
        initOrdersModule();
    }, 50);
})();
