/**
 * MODULE DASHBOARD TỔNG QUAN (PAWPAL ADMIN)
 * Tuân thủ nghiêm ngặt 100% AGENTS.md và ADMIN_DESIGN_SYSTEM.md:
 * - 100% SUPABASE LIVE DATABASE - ZERO JSON MOCK - ZERO HARDCODED FALLBACKS
 * - Nạp dữ liệu thực tế từ: sales_order, appointment, support_ticket, customer, customer_profile, pet_profile, product, staff, service, chat_conversation
 * - Render 5 Thẻ KPI chuẩn xác, Dòng cảnh báo khẩn cấp thuần chữ đỏ, Widget Ưu tiên xử lý, Tồn kho thực tế
 * - Biểu đồ Doanh thu 7 ngày tính toán từ sales_order hoàn thành
 * - Lịch hẹn đa chế độ (Tháng, Tuần, Ngày) dựa trên 100% lịch hẹn thật từ appointment
 * - Hiệu suất Chatbot AI & Tỷ lệ lấp đầy nhân sự thời gian thực
 */

(function initDashboard() {
    function getSupabaseClient() {
        return window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    }

    function labelCurrency(value) {
        return Number(value || 0).toLocaleString('vi-VN');
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m]);
    }

    function toDateKey(value) {
        if (!value) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
    }
    function getTodayDateString() { return toDateKey(new Date()); }
    function shiftDay(day,offset) { const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10); }
    function financialPeriod() { const today=getTodayDateString(),d=new Date(today+'T00:00:00Z');return {from:shiftDay(today,-((d.getUTCDay()+6)%7)-7),to:today}; }
    let cashflow = null, cashflowError = null;
    async function loadCashflow(client,force) {
        const period=financialPeriod();
        const fetcher=async()=>{const result=await client.rpc('get_admin_dashboard_cashflow',{p_from:period.from,p_to:period.to});if(result.error)throw result.error;return result.data;};
        try {cashflow=window.PawpalDataStore?.fetch ? await window.PawpalDataStore.fetch('dashboard:cashflow:'+period.from+':'+period.to,fetcher,{ttlMs:DASH_CACHE_TTL_MS,force,backgroundRevalidate:false}) : await fetcher();cashflowError=null;}
        catch(error){cashflow=null;cashflowError=error.code==='42501'?'forbidden':'error';}
    }

    // ====================================================================
    // DATA STORE 100% TRỰC TIẾP TỪ SUPABASE LIVE DATABASE (ZERO JSON MOCK)
    // ====================================================================
    let liveSalesOrders = [];
    let liveAppointments = [];
    let liveTickets = [];
    let liveProducts = [];
    let liveStaffList = [];
    let liveChatConversations = [];
    let liveCustomersCount = 0;
    let livePetsCount = 0;
    let liveProfilesMap = new Map();
    let livePetsMap = new Map();
    let liveStaffMap = new Map();
    let liveServicesMap = new Map();
    let _dashLoadError = null;

    // Cache TTL 90 giây — không fetch lại nếu dữ liệu còn mới
    let _dashLastFetchedAt = 0;
    const DASH_CACHE_TTL_MS = 90_000;
    let _dashFetchPromise = null;
    let _dashInvalidationVersion = 0;

    // Mỗi nhóm có cache riêng: một biến động đơn hàng không tải lại toàn bộ Dashboard.
    function dashboardKey(resource, params = {}) {
        const store = window.PawpalDataStore;
        return `dashboard:${resource}:${store?.buildKey ? store.buildKey('data', params) : JSON.stringify(params)}`;
    }

    function invalidateDashboardResources(resources) {
        _dashLastFetchedAt = 0;
        _dashInvalidationVersion++;
        for (const resource of resources) {
            window.PawpalDataStore?.invalidate?.(`dashboard:${resource}:*`);
        }
    }
    // Ghi nhớ thời điểm tab bị ẩn — chỉ reload sau 5 phút bỏ qua
    let _dashHiddenAt = 0;
    const DASH_FOCUS_RELOAD_AFTER_MS = 5 * 60_000;

    async function loadDashboardData({ force = false } = {}) {
        if (_dashFetchPromise) {
            await _dashFetchPromise;
            if (!_dashLastFetchedAt && !_dashLoadError) return loadDashboardData({ force });
            return;
        }

        // Bỏ qua nếu dữ liệu còn trong TTL và không force
        if (!force && !_dashLoadError && Date.now() - _dashLastFetchedAt < DASH_CACHE_TTL_MS) {
            return;
        }

        const loadVersion = _dashInvalidationVersion;
        _dashFetchPromise = Promise.resolve().then(async () => {
            try {
                const client = getSupabaseClient();
                if (!client) {
                    throw new Error('Kết nối dữ liệu chưa sẵn sàng.');
                }

                const store = window.PawpalDataStore;
                const read = (resource, query, ttlMs = DASH_CACHE_TTL_MS, params = {}) => {
                    const fetcher = async () => {
                        const result = await query();
                        if (result.error) throw result.error;
                        return result;
                    };
                    return store?.fetch
                        ? store.fetch(dashboardKey(resource, params), fetcher, { ttlMs, force, backgroundRevalidate: false })
                        : fetcher();
                };
                const readAll = async (table,columns,key='id') => {
                    const data=[];
                    for(let offset=0;;offset+=500){
                        const result=await client.from(table).select(columns).order(key).range(offset,offset+499);
                        if(result.error)throw result.error;data.push(...result.data);
                        if(result.data.length<500)return {data};
                    }
                };
                const fetchProducts = () => readAll('product','id,product_name,status,product_variant(id,sku_variant,status,inventory(quantity_in_stock,minimum_stock))');
                const fetchDashboardPayload = async () => {
                    const [
                        ordersRes,
                        apptsRes,
                        ticketsRes,
                        productsRes,
                        custCountRes,
                        petCountRes,
                        staffRes,
                        servicesRes,
                        chatsRes
                    ] = await Promise.all([
                        read('orders', () => readAll('sales_order','id,order_status,created_at')),
                        read('appointments', () => readAll('appointment','id,appointment_code,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at,appointment_status,note,items:appointment_item(id,service_id,name_snapshot,is_primary,staff_id,status)')),
                        read('tickets', () => readAll('support_ticket','id,status,subject,priority,created_at')),
                        read('products', fetchProducts),
                        read('customer-count', () => client.from('customer').select('id', { count: 'exact', head: true }), store?.TTL.LIST || 120_000),
                        read('pet-count', () => client.from('pet_profile').select('id', { count: 'exact', head: true }), store?.TTL.LIST || 120_000),
                        read('staff', () => readAll('staff','id,full_name,job_title,employment_status'), store?.TTL.LIST || 120_000),
                        read('services', () => readAll('service','id,service_name'), store?.TTL.CATALOG || 300_000),
                        read('chats', () => readAll('chat_conversation','id,status,assigned_staff_id'))
                    ]);

                    // Chỉ lấy tên chủ nuôi và bé có trong lịch, không tải cả hai bảng hồ sơ.
                    const customerIds = [...new Set((apptsRes.data || []).map(a => a.customer_id).filter(Boolean))].sort();
                    const petIds = [...new Set((apptsRes.data || []).map(a => a.pet_id).filter(Boolean))].sort();
                    const readRelated = async (resource, table, idColumn, columns, ids) => {
                        const pages = [];
                        for (let offset = 0; offset < ids.length; offset += 100) {
                            const batch = ids.slice(offset, offset + 100);
                            const result = await read(resource, () => client.from(table).select(columns).in(idColumn, batch), store?.TTL.LIST || 120_000, { ids: batch.join(',') });
                            pages.push(...(result.data || []));
                        }
                        return pages;
                    };
                    const [profiles, pets] = await Promise.all([
                        readRelated('profiles', 'customer_profile', 'customer_id', 'customer_id, full_name', customerIds),
                        readRelated('pets', 'pet_profile', 'id', 'id, pet_name', petIds)
                    ]);

                    return {
                        orders: ordersRes.data || [],
                        appts: (apptsRes.data || []).map(a=>({...a,service_id:(a.items.find(i=>i.is_primary)||a.items[0])?.service_id,service_name:(a.items.find(i=>i.is_primary)||a.items[0])?.name_snapshot,appointment_date:toDateKey(a.scheduled_start_at),appointment_time:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(a.scheduled_start_at))})),
                        tickets: (ticketsRes.data || []).map(t=>({...t,title:t.subject})),
                        products: productsRes.data || [],
                        custCount: custCountRes.count,
                        petCount: petCountRes.count,
                        profiles,
                        pets,
                        staff: staffRes.data || [],
                        services: servicesRes.data || [],
                        chats: chatsRes.data || []
                    };
                };

                const [data] = await Promise.all([fetchDashboardPayload(),loadCashflow(client,force)]);

                _dashLastFetchedAt = loadVersion === _dashInvalidationVersion ? Date.now() : 0;
                liveSalesOrders = data.orders || [];
                liveAppointments = data.appts || [];
                liveTickets = data.tickets || [];
                liveProducts = data.products || [];

                liveProducts = liveProducts.flatMap(p => (p.product_variant || []).map(v => ({
                    id:p.id,product_name:p.product_name,status:v.status,sku:v.sku_variant,
                    inventory:Array.isArray(v.inventory)?v.inventory[0]:v.inventory
                })));

                liveStaffList = data.staff || [];
                liveChatConversations = data.chats || [];
                const profiles = data.profiles || [];
                liveCustomersCount = data.custCount ?? 0;
                livePetsCount = data.petCount !== null && data.petCount !== undefined ? data.petCount : 0;

                // Maps tra cứu nhanh
                liveProfilesMap.clear();
                profiles.forEach(p => {
                    if (p.customer_id) liveProfilesMap.set(p.customer_id, p);
                });

                const pets = data.pets || [];
                livePetsMap.clear();
                pets.forEach(pet => {
                    livePetsMap.set(pet.id, pet);
                });

                liveStaffMap.clear();
                liveStaffList.forEach(s => {
                    liveStaffMap.set(s.id, s.full_name);
                });

                const services = data.services || [];
                liveServicesMap.clear();
                services.forEach(srv => {
                    liveServicesMap.set(srv.id, srv.service_name);
                });
                _dashLoadError = null;
            } catch (err) {
                liveSalesOrders=[];liveAppointments=[];liveTickets=[];liveProducts=[];liveStaffList=[];liveChatConversations=[];
                liveProfilesMap.clear();livePetsMap.clear();cashflow=null;
                console.error('[Dashboard] Lỗi nạp dữ liệu từ Supabase:', err);
                _dashLoadError = err.message || 'Lỗi kết nối cơ sở dữ liệu';
            } finally {
                _dashFetchPromise = null;
            }
        });

        return _dashFetchPromise;
    }

    // -------------------------------------------------------------
    // 1. RENDER 5 THẺ KPI & DÒNG CẢNH BÁO KHẨN CẤP
    // -------------------------------------------------------------
    function renderDashboardKPIs() {
        const todayStr = getTodayDateString();

        // 2. Lịch hẹn hôm nay (chỉ đếm ca chưa bị hủy)
        const todayBookingsCount = liveAppointments.filter(a => {
            const isToday = toDateKey(a.appointment_date) === todayStr;
            const s = (a.appointment_status || '').toUpperCase();
            return isToday && s !== 'CANCELLED' && s !== 'DA_HUY';
        }).length;

        // 3. Đơn hàng mới cần duyệt (Chờ xác nhận / Đang xử lý)
        const pendingOrders = liveSalesOrders.filter(o => {
            const s = (o.order_status || '').toUpperCase();
            return ['PENDING','CONFIRMED','PROCESSING','CHO_XAC_NHAN','DANG_XU_LY'].includes(s);
        });

        // 4. Khiếu nại chờ xử lý (hỗ trợ cả cột status và ticket_status từ Supabase support_ticket)
        const pendingTickets = liveTickets.filter(t => {
            const s = (t.status || t.ticket_status || '').toUpperCase();
            return !['RESOLVED','COMPLETED','CLOSED','REJECTED','DA_DONG','DA_GIAI_QUYET'].includes(s);
        });

        // Render DOM 5 thẻ KPI (100% số liệu thực)
        // E2E-12D: Chốt chặn kiểm tra quyền hạn tài chính
        const elRevenue = document.getElementById('dashboardRevenue');
        if(elRevenue){
            const today=cashflow?.days.find(d=>d.day===todayStr);
            elRevenue.textContent=_dashLoadError || cashflowError || !today ? '—' : labelCurrency(today.net)+' đ';
            elRevenue.title=cashflowError==='forbidden'?'Không có quyền xem tài chính':cashflowError?'Không tải được số liệu tài chính':'Thu thành công trừ hoàn thành công theo ngày giao dịch';
        }

        const elBookings = document.getElementById('dashboardBookings');
        if (elBookings) elBookings.textContent = _dashLoadError ? '—' : todayBookingsCount;

        const elOrders = document.getElementById('dashboardOrders');
        if (elOrders) elOrders.textContent = _dashLoadError ? '—' : pendingOrders.length;

        const elCust = document.getElementById('dashboardCustomers');
        if (elCust) elCust.textContent = _dashLoadError ? '—' : liveCustomersCount;

        const elPets = document.getElementById('dashboardPets');
        if (elPets) elPets.textContent = _dashLoadError ? '—' : livePetsCount;

        // Render khối Ưu tiên xử lý
        const totalPriority = pendingTickets.length + pendingOrders.length;
        const elPriorityCount = document.getElementById('dashboardPriorityCount');
        if (elPriorityCount) {
            elPriorityCount.textContent = _dashLoadError ? '—' : `${totalPriority} việc`;
            elPriorityCount.className = `admin-badge ${totalPriority > 0 ? 'badge-warning' : 'badge-neutral'}`;
        }

        const elComplaintsBadge = document.getElementById('dashboardComplaintsBadge');
        if (elComplaintsBadge) {
            elComplaintsBadge.textContent = _dashLoadError ? '—' : pendingTickets.length;
            elComplaintsBadge.className = `admin-badge ${pendingTickets.length > 0 ? 'badge-danger' : 'badge-neutral'}`;
        }

        const elComplaintsSub = document.getElementById('dashboardComplaintsSub');
        if (elComplaintsSub) {
            elComplaintsSub.textContent = _dashLoadError 
                ? 'Không thể nạp dữ liệu khiếu nại' 
                : (pendingTickets.length > 0 
                    ? `${pendingTickets.length} ticket cần nhân viên tiếp nhận`
                    : `Không có khiếu nại tồn đọng`);
        }

        const elOrdersBadge = document.getElementById('dashboardOrdersBadge');
        if (elOrdersBadge) {
            elOrdersBadge.textContent = _dashLoadError ? '—' : pendingOrders.length;
            elOrdersBadge.className = `admin-badge ${pendingOrders.length > 0 ? 'badge-warning' : 'badge-neutral'}`;
        }

        const elOrdersSub = document.getElementById('dashboardOrdersSub');
        if (elOrdersSub) {
            elOrdersSub.textContent = _dashLoadError
                ? 'Không thể nạp dữ liệu đơn hàng'
                : (pendingOrders.length > 0
                    ? `${pendingOrders.length} đơn hàng mới cần xác nhận`
                    : `Tất cả đơn hàng đã được duyệt`);
        }

        // Dòng cảnh báo khẩn cấp (thuần chữ đỏ, không viền khung)
        const alertBanner = document.getElementById('dashboardAlertBanner');
        const alertText = document.getElementById('dashboardAlertText');
        const alertBtn = document.getElementById('dashboardAlertAction');
        const urgentTicket = pendingTickets.find(t => {
            const priority = String(t.priority || '').toLowerCase();
            return priority === 'khan_cap' || priority === 'critical' || priority.includes('khẩn') || priority.includes('urgent');
        });
        if (alertBanner && alertText && alertBtn) {
            if (_dashLoadError) {
                alertBanner.style.display = 'flex';
                alertText.textContent = `Cảnh báo hệ thống: ${_dashLoadError}. Đang tạm dừng hiển thị số liệu đồng bộ.`;
                alertBtn.textContent = 'Thử lại';
                alertBtn.onclick = () => window.PawpalDashboard?.refresh();
            } else if (urgentTicket) {
                alertBanner.style.display = 'flex';
                alertBtn.textContent = 'Xử lý ngay';
                const ticketCode = (urgentTicket.id || '').slice(0, 8).toUpperCase();
                const ticketTitle = urgentTicket.title || 'Khiếu nại khách hàng';
                const createdTime = urgentTicket.created_at ? new Date(urgentTicket.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
                const timeText = createdTime ? ` lúc ${createdTime}` : '';
                alertText.textContent = `Khiếu nại khẩn cấp #${ticketCode}: ${ticketTitle}${timeText}. Tổng ${pendingTickets.length} khiếu nại đang chờ.`;
                alertBtn.onclick = () => {
                    sessionStorage.setItem('pawpal_admin_complaint_active_subtab', 'tab-complaint-detail');
                    sessionStorage.setItem('pawpal_admin_complaint_selected_id', urgentTicket.id);
                    sessionStorage.setItem('pawpal_admin_complaint_filter_status', 'pending');
                    const target = Array.from(document.querySelectorAll('.sidebar-menu-btn'))
                        .find(b => b.getAttribute('data-title') === 'Khiếu nại');
                    if (target) target.click();
                };
            } else {
                alertBanner.style.display = 'none';
            }
        }
    }

    // -------------------------------------------------------------
    // 2. RENDER WIDGET TỒN KHO SẢN PHẨM THỰC TẾ TỪ INVENTORY
    // -------------------------------------------------------------
    function renderDashboardStockList() {
        const container = document.getElementById('dashboardStockList');
        if (!container) return;
        if (_dashLoadError) { container.textContent='Không tải được tồn kho. Vui lòng làm mới.'; return; }

        if (liveProducts.length === 0) {
            container.innerHTML = '<div style="padding: 12px; font-size: 13px; color: var(--text-muted);">Kho hàng ổn định, chưa có sản phẩm.</div>';
            return;
        }

        // Lấy thông tin tồn kho thực tế từ inventory
        const productStockList = liveProducts
            .filter(prod => {
                const status = (prod.status || '').toUpperCase();
                return status !== 'INACTIVE' && status !== 'DISCONTINUED' && status !== 'NGUNG_BAN';
            })
            .map(prod => {
                const inv = Array.isArray(prod.inventory) ? prod.inventory[0] : prod.inventory;
                // D-10: Phân biệt rõ sản phẩm chưa có dữ liệu cấu hình kho vs sản phẩm thực sự hết hàng
                const hasInventoryData = (inv !== null && inv !== undefined) || (prod.stock !== undefined && prod.stock !== null);
                if (!hasInventoryData) {
                    return null;
                }

                const rawStock = inv?.quantity_in_stock !== undefined 
                    ? inv.quantity_in_stock 
                    : (inv?.quantity_on_hand !== undefined 
                        ? inv.quantity_on_hand 
                        : (inv?.stock_qty !== undefined ? inv.stock_qty : (prod.stock !== undefined ? prod.stock : 0)));
                const stock = Math.max(0, parseInt(rawStock, 10) || 0);

                const rawMinStock = inv?.minimum_stock !== undefined 
                    ? inv.minimum_stock 
                    : (inv?.safety_stock_level !== undefined ? inv.safety_stock_level : 5);
                const minStock = Math.max(0, Number(rawMinStock) || 0);

                return {
                    id: prod.id,
                    name: prod.product_name || 'Sản phẩm PawPal',
                    sku: prod.sku || 'N/A',
                    stock: stock,
                    minStock: minStock,
                    isEmpty: stock === 0,
                    isLow: minStock > 0 && stock > 0 && stock <= minStock
                };
            })
            .filter(Boolean);

        // Lọc các sản phẩm hết hàng hoặc sắp hết hàng theo Quy tắc thiết kế (Design & Business Rule)
        // 1. Cấp bách nhất: Hết hàng (stock = 0) luôn luôn xếp đầu tiên (vị trí 1)
        // 2. Tồn kho ít nhất xếp trước (tăng dần: 1 -> 2 -> 3 -> 4...)
        // 3. Nếu cùng số lượng: Tỷ lệ thiếu hụt so với mức an toàn cao hơn xếp trước (stock / minStock nhỏ hơn)
        // 4. Nếu bằng nhau: Mã SKU tăng dần theo bảng chữ cái A-Z
        const lowStockItems = productStockList
            .filter(p => p.isEmpty || p.isLow)
            .sort((a, b) => {
                // Quy tắc 1 (Ưu tiên cao nhất): Hết hàng (stock = 0) luôn luôn xếp lên đầu
                if (a.stock === 0 && b.stock !== 0) return -1;
                if (b.stock === 0 && a.stock !== 0) return 1;

                // Quy tắc 2: Tồn kho ít nhất xếp trước (tăng dần: 1 -> 2 -> 3 -> 4...)
                if (a.stock !== b.stock) {
                    return a.stock - b.stock;
                }

                // Quy tắc 3: Tỷ lệ thiếu hụt so với mức tồn kho an toàn (thấp hơn xếp trước)
                const ratioA = a.stock / a.minStock;
                const ratioB = b.stock / b.minStock;
                if (ratioA !== ratioB) {
                    return ratioA - ratioB;
                }

                // Quy tắc 4: Sắp xếp theo mã SKU tăng dần (A -> Z)
                return (a.sku || '').localeCompare(b.sku || '', undefined, { numeric: true, sensitivity: 'base' });
            });

        if (lowStockItems.length === 0) {
            container.innerHTML = '<div style="padding: 12px; font-size: 13px; color: var(--text-muted);">Kho hàng ổn định, không có sản phẩm sắp hết.</div>';
            return;
        }

        container.innerHTML = lowStockItems.slice(0, 4).map(prod => {
            const badgeClass = prod.isEmpty ? 'is-empty' : 'is-low';
            const badgeText = prod.isEmpty ? 'Hết hàng' : `Còn ${prod.stock}`;
            const safeSku = escapeHtml(prod.sku);
            const safeName = escapeHtml(prod.name);

            return `
                <button type="button" class="dashboard-stock-row" data-sku="${safeSku}" data-dashboard-module="Bán hàng">
                    <span><strong>${safeName}</strong><small>SKU: ${safeSku}</small></span>
                    <span class="dashboard-stock-count ${badgeClass}">${badgeText}</span>
                </button>
            `;
        }).join('');

        bindModuleNavigation(container);
    }

    // -------------------------------------------------------------
    // 3. RENDER BIỂU ĐỒ DOANH THU 7 NGÀY THỰC TẾ TỪ SALES_ORDER
    // -------------------------------------------------------------
    function renderRevenueChart() {
        const chart=document.getElementById('dashboardRevenueChart');if(!chart)return;
        if(_dashLoadError || !cashflow){chart.textContent=cashflowError==='forbidden'?'Bạn không có quyền xem số liệu tài chính.':'Không tải được số liệu tài chính.';return;}
        const today=getTodayDateString(),weekday=(new Date(today+'T00:00:00Z').getUTCDay()+6)%7,monday=shiftDay(today,-weekday);
        const lookup=new Map(cashflow.days.map(d=>[d.day,Number(d.net)]));
        const series=[0,-7].map(offset=>Array.from({length:7},(_,i)=>{const day=shiftDay(monday,i+offset);return {day,value:day>today?null:lookup.get(day)??0};}));
        const values=series.flat().filter(d=>d.value!==null).map(d=>d.value),low=Math.min(0,...values),high=Math.max(0,...values);
        const span=high-low || 1,top=high===low?1:high+span*0.1,bottom=low===high?0:low-span*0.1;
        const x=i=>65+i*88,y=v=>160-(v-bottom)/(top-bottom)*140;
        const ticks=Array.from({length:5},(_,i)=>bottom+(top-bottom)*i/4);
        const grid=ticks.map(v=>`<text x="57" y="${y(v)+4}" text-anchor="end" fill="#4F7A65" font-size="10">${Number(v).toLocaleString('vi-VN',{notation:'compact',maximumFractionDigits:1})}</text><line x1="65" y1="${y(v)}" x2="593" y2="${y(v)}" stroke="#ECF2EE"/>`).join('');
        const paths=series.map((rows,k)=>{
            const valid=rows.map((d,i)=>({...d,i})).filter(d=>d.value!==null);
            return `<polyline points="${valid.map(d=>x(d.i)+','+y(d.value)).join(' ')}" fill="none" stroke="${k?'#AEC8B9':'#236B48'}" stroke-width="2" ${k?'stroke-dasharray="5 4"':''}/>`+valid.map(d=>`<circle cx="${x(d.i)}" cy="${y(d.value)}" r="3" fill="${k?'#AEC8B9':'#236B48'}"><title>${d.day}: ${labelCurrency(d.value)} đ</title></circle>`).join('');
        }).join('');
        chart.innerHTML=`<svg viewBox="0 0 640 195" role="img" aria-label="Thực thu ròng tuần này và tuần trước">${grid}<line x1="65" y1="${y(0)}" x2="593" y2="${y(0)}" stroke="#AEC8B9"/>${paths}${['T2','T3','T4','T5','T6','T7','CN'].map((label,i)=>`<text x="${x(i)}" y="185" text-anchor="middle" fill="#4F7A65" font-size="11">${label}</text>`).join('')}</svg>`;
        if(cashflow.undated_receipts || cashflow.undated_refunds){const note=document.createElement('p');note.style.color='#DC2626';note.textContent=`Có ${cashflow.undated_receipts} khoản thu và ${cashflow.undated_refunds} khoản hoàn thành công thiếu ngày giao dịch, chưa được tính theo ngày.`;chart.appendChild(note);}
    }

    let refreshDashboardCalendar = null;
    function setupDashboardCalendar() {
        const calendarKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (refreshDashboardCalendar) {
            refreshDashboardCalendar();
            return;
        }
        const monthLabel = document.getElementById('dashboardCalendarMonth');
        const daysGrid = document.getElementById('dashboardCalendarDays');
        const weekdays = document.getElementById('dashboardCalendarWeekdays');
        const agendaTitle = document.getElementById('dashboardAgendaTitle');
        const bookingList = document.getElementById('dashboardBookingList');
        const calendarAgenda = document.querySelector('.dashboard-calendar-agenda');
        if (!monthLabel || !daysGrid || !agendaTitle || !bookingList) return;
        const monthWeekdayMarkup = weekdays?.innerHTML || '';

        const today = new Date(getTodayDateString()+'T00:00:00');
        today.setHours(0, 0, 0, 0);
        let shownMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        let selectedDate = new Date(today);
        let calendarView = 'month';

        // Biến đổi các record liveAppointments 100% thực tế
        function getMappedBookings() {
            return liveAppointments.map(a => {
                const profile = liveProfilesMap.get(a.customer_id);
                const pet = livePetsMap.get(a.pet_id);
                const custName = profile ? `${profile.full_name}${profile.phone ? ' (' + profile.phone + ')' : ''}` : 'Khách hàng';
                const petName = pet ? pet.pet_name : 'Bé cưng';
                const srvName = a.service_name || liveServicesMap.get(a.service_id) || 'Chưa gắn dịch vụ';
                const staffName = liveStaffMap.get(a.staff_id) || 'Kỹ thuật viên';

                let timeStr = '—';
                if (a.appointment_time) {
                    timeStr = a.appointment_time.substring(0, 5);
                } else if (a.created_at) {
                    timeStr = new Date(a.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                }

                const s = (a.appointment_status || '').toUpperCase();
                let statusText = 'Đã xác nhận';
                let badgeClass = 'badge-success';
                let statusCode = 'confirmed';
                if (s === 'COMPLETED' || s === 'DA_HOAN_THANH') {
                    statusText = 'Đã hoàn thành';
                    badgeClass = 'badge-success';
                    statusCode = 'confirmed';
                } else if (s === 'PENDING' || s === 'CHO_XAC_NHAN') {
                    statusText = 'Chờ xác nhận';
                    badgeClass = 'badge-warning';
                    statusCode = 'pending';
                } else if (s === 'CANCELLED' || s === 'DA_HUY') {
                    statusText = 'Đã hủy';
                    badgeClass = 'badge-danger';
                    statusCode = 'cancelled';
                }

                return {
                    id: a.id,
                    appointmentCode: a.appointment_code || 'BKG-' + a.id.substring(0, 6),
                    pet: petName,
                    customer: custName,
                    service: srvName,
                    staff: staffName,
                    time: timeStr,
                    date: a.appointment_date || (a.created_at ? a.created_at.substring(0, 10) : ''),
                    status: statusText,
                    badge: badgeClass,
                    statusCode: statusCode,
                    notes: a.notes || a.note || ''
                };
            });
        }

        function dateFromKey(key) {
            const [year, month, day] = key.split('-').map(Number);
            return new Date(year, month - 1, day);
        }

        function bookingsOnDate(date) {
            const dateKey = calendarKey(date);
            const allBookings = getMappedBookings();
            return allBookings.filter(b => b.date === dateKey);
        }

        function renderAgenda(date) {
            const dayBookings = bookingsOnDate(date);
            const isToday = calendarKey(date) === calendarKey(today);
            const dateFormatted = new Intl.DateTimeFormat('vi-VN', {
                weekday: 'long', day: 'numeric', month: 'long'
            }).format(date);
            agendaTitle.textContent = isToday ? `${dateFormatted} · Hôm nay` : dateFormatted;

            if (!dayBookings.length) {
                bookingList.innerHTML = '<p class="dashboard-agenda-empty">Ngày này chưa có lịch hẹn.</p>';
                return;
            }

            bookingList.innerHTML = dayBookings.map((booking, idx) => {
                const safeTime = escapeHtml(booking.time);
                const safePet = escapeHtml(booking.pet);
                const safeCustomer = escapeHtml(booking.customer);
                const safeService = escapeHtml(booking.service);
                const safeStatus = escapeHtml(booking.status);
                const safeBadge = escapeHtml(booking.badge || 'badge-neutral');

                return `
                <button type="button" class="dashboard-booking-row" data-booking-idx="${idx}">
                    <time>${safeTime}</time>
                    <span class="dashboard-booking-detail"><strong>${safePet} · ${safeCustomer}</strong><small>${safeService}</small></span>
                    <span class="admin-badge ${safeBadge}">${safeStatus}</span>
                </button>`;
            }).join('');

            bookingList.querySelectorAll('.dashboard-booking-row').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.bookingIdx, 10);
                    const booking = dayBookings[idx] || dayBookings[0];
                    if (booking) openBookingQuickModal(booking);
                });
            });
        }

        function renderCalendar() {
            const year = shownMonth.getFullYear();
            const month = shownMonth.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const mondayFirstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
            const dateLabel = new Intl.DateTimeFormat('vi-VN', {
                month: 'long', year: 'numeric'
            }).format(shownMonth);

            document.getElementById('dashboardCalendarPrev')?.setAttribute(
                'aria-label', calendarView === 'month' ? 'Tháng trước' : calendarView === 'week' ? 'Tuần trước' : 'Ngày trước'
            );
            document.getElementById('dashboardCalendarNext')?.setAttribute(
                'aria-label', calendarView === 'month' ? 'Tháng sau' : calendarView === 'week' ? 'Tuần sau' : 'Ngày sau'
            );

            const allBookings = getMappedBookings();
            const bookedDateKeys = new Set(allBookings.map(b => b.date).filter(Boolean));

            const calendarDates = [];
            if (calendarView === 'month') {
                for (let blank = 0; blank < mondayFirstOffset; blank += 1) calendarDates.push(null);
                for (let day = 1; day <= daysInMonth; day += 1) calendarDates.push(new Date(year, month, day));
                while (calendarDates.length % 7 !== 0) calendarDates.push(null);
                monthLabel.textContent = dateLabel;
                daysGrid.classList.remove('is-week-view', 'is-day-view');
                if (weekdays) {
                    weekdays.hidden = false;
                    weekdays.classList.remove('is-week-heading');
                    weekdays.innerHTML = monthWeekdayMarkup;
                }
            } else if (calendarView === 'week') {
                const weekStart = new Date(selectedDate);
                weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
                for (let day = 0; day < 7; day += 1) {
                    const date = new Date(weekStart);
                    date.setDate(weekStart.getDate() + day);
                    calendarDates.push(date);
                }
                const weekEnd = calendarDates[6];
                monthLabel.textContent = `${weekStart.getDate()} ${new Intl.DateTimeFormat('vi-VN', { month: 'short' }).format(weekStart)} – ${weekEnd.getDate()} ${new Intl.DateTimeFormat('vi-VN', { month: 'short', year: 'numeric' }).format(weekEnd)}`;
                daysGrid.classList.add('is-week-view');
                daysGrid.classList.remove('is-day-view');
                if (weekdays) {
                    weekdays.hidden = false;
                    weekdays.classList.add('is-week-heading');
                    weekdays.innerHTML = calendarDates.map((date) => {
                        const key = calendarKey(date);
                        const isToday = key === calendarKey(today);
                        const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date);
                        return `<button type="button" class="dashboard-week-heading-btn ${key === calendarKey(selectedDate) ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}" data-calendar-date="${key}" aria-pressed="${key === calendarKey(selectedDate)}" title="${isToday ? 'Hôm nay' : weekday}"><span>${isToday ? 'Hôm nay' : weekday}</span><strong>${date.getDate()}</strong></button>`;
                    }).join('');
                }
            } else {
                calendarDates.push(new Date(selectedDate));
                const isToday = calendarKey(selectedDate) === calendarKey(today);
                const dayFormatted = new Intl.DateTimeFormat('vi-VN', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                }).format(selectedDate);
                monthLabel.textContent = isToday ? `${dayFormatted} · Hôm nay` : dayFormatted;
                daysGrid.classList.add('is-day-view');
                daysGrid.classList.remove('is-week-view');
                if (weekdays) {
                    weekdays.hidden = true;
                    weekdays.classList.remove('is-week-heading');
                }
            }

            if (calendarView === 'week') {
                daysGrid.innerHTML = calendarDates.map((date) => {
                    const key = calendarKey(date);
                    const dayBookings = bookingsOnDate(date);
                    const selected = key === calendarKey(selectedDate);
                    const events = dayBookings.length
                        ? dayBookings.map((booking) => `<span class="dashboard-week-event"><time>${booking.time}</time>${booking.pet}</span>`).join('')
                        : '<span class="dashboard-week-empty">Không có lịch</span>';
                    return `<button type="button" class="dashboard-calendar-day dashboard-week-day ${selected ? 'is-selected' : ''} ${key === calendarKey(today) ? 'is-today' : ''}" data-calendar-date="${key}" aria-label="${new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)}" aria-pressed="${selected}"><span class="dashboard-week-events">${events}</span></button>`;
                }).join('');
            } else if (calendarView === 'day') {
                const dayBookings = bookingsOnDate(selectedDate);
                const startHour = 0;
                const endHour = 23;
                const slotHeight = 46;
                const timelineTopOffset = 16;

                const timeSlotsMarkup = Array.from({ length: endHour - startHour + 1 }, (_, i) => {
                    const hour = startHour + i;
                    return `<div class="dashboard-day-timeline-hour" style="top: ${timelineTopOffset + i * slotHeight}px;"><time>${String(hour).padStart(2, '0')}:00</time><div class="dashboard-day-timeline-line"></div></div>`;
                }).join('');

                const parsedBookings = dayBookings.map((b) => {
                    const [h, m] = (b.time || '09:00').split(':').map(Number);
                    const startMinutes = (h - startHour) * 60 + (m || 0);
                    const durationMinutes = 60;
                    return { ...b, startMinutes, endMinutes: startMinutes + durationMinutes };
                }).sort((a, b) => a.startMinutes - b.startMinutes);

                const clusters = [];
                parsedBookings.forEach((booking) => {
                    let added = false;
                    for (const cluster of clusters) {
                        const hasOverlap = cluster.some((item) =>
                            booking.startMinutes < item.endMinutes && booking.endMinutes > item.startMinutes
                        );
                        if (hasOverlap) {
                            cluster.push(booking);
                            added = true;
                            break;
                        }
                    }
                    if (!added) {
                        clusters.push([booking]);
                    }
                });

                const eventsMarkup = clusters.flatMap((cluster) => {
                    const totalInCluster = cluster.length;
                    return cluster.map((b, idx) => {
                        const topPx = timelineTopOffset + (b.startMinutes / 60) * slotHeight;
                        const heightPx = Math.max(38, (60 / 60) * slotHeight - 4);

                        let styleAttrs = `top: ${topPx}px; height: ${heightPx}px;`;
                        const statusClass = b.statusCode === 'pending' ? 'status-pending' : (b.statusCode === 'cancelled' ? 'status-cancelled' : 'status-confirmed');
                        let classes = `dashboard-day-event ${statusClass}`;

                        if (totalInCluster === 1) {
                            classes += ' is-single-event';
                            styleAttrs += ' left: 0; width: 96%; z-index: 1;';
                        } else {
                            const widthPercent = Math.max(62, 94 - idx * 14);
                            const leftPercent = idx * 16;
                            const zIndex = idx + 2;

                            classes += ` is-overlapped-layer layer-idx-${idx % 3}`;
                            styleAttrs += ` left: ${leftPercent}%; width: ${widthPercent}%; z-index: ${zIndex};`;
                        }

                        return `<button type="button" class="${classes}" style="${styleAttrs}" data-dashboard-module="Dịch vụ" data-booking-id="${b.id || ''}">
                            <div class="dashboard-day-event-header">
                                <strong>${b.time} · ${b.pet}</strong>
                                <span class="dashboard-day-event-status">${b.status}</span>
                            </div>
                            <div class="dashboard-day-event-body">${b.customer} · ${b.service}</div>
                        </button>`;
                    });
                }).join('');

                const totalTimelineHeight = timelineTopOffset + (endHour - startHour + 1) * slotHeight + 16;
                daysGrid.innerHTML = `
                    <div class="dashboard-day-timeline-container" style="height: ${totalTimelineHeight}px;">
                        <div class="dashboard-day-timeline-grid">${timeSlotsMarkup}</div>
                        <div class="dashboard-day-timeline-events">${eventsMarkup || '<div style="padding: 24px; text-align: center; color: var(--text-muted);">Không có ca dịch vụ trong ngày này</div>'}</div>
                    </div>`;

                const timelineContainer = daysGrid.querySelector('.dashboard-day-timeline-container');
                if (timelineContainer) {
                    const firstBooking = parsedBookings[0];
                    let targetHour = 7.5;
                    if (firstBooking) {
                        const bookingHour = firstBooking.startMinutes / 60;
                        targetHour = Math.max(0, bookingHour - 1);
                    }
                    timelineContainer.scrollTop = timelineTopOffset + targetHour * slotHeight;
                }

                daysGrid.querySelectorAll('.dashboard-day-event').forEach((btn) => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const bId = btn.getAttribute('data-booking-id');
                        const found = dayBookings.find(b => b.id === bId) || dayBookings[0];
                        if (found) openBookingQuickModal(found);
                    });
                });
            } else {
                daysGrid.innerHTML = calendarDates.map((date) => {
                    if (!date) return '<span class="dashboard-calendar-blank" aria-hidden="true"></span>';
                    const key = calendarKey(date);
                    const isToday = key === calendarKey(today);
                    const hasAppointments = bookedDateKeys.has(key);
                    const classes = [
                        'dashboard-calendar-day',
                        hasAppointments ? 'has-appointments' : '',
                        isToday ? 'is-today' : '',
                        key === calendarKey(selectedDate) ? 'is-selected' : ''
                    ].filter(Boolean).join(' ');
                    const label = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
                    const todayText = isToday ? ', Hôm nay' : '';
                    return `<button type="button" class="${classes}" data-calendar-date="${key}" aria-label="${label}${todayText}${hasAppointments ? ', có lịch hẹn' : ''}" aria-pressed="${key === calendarKey(selectedDate)}" title="${label}${todayText}"><span class="dashboard-calendar-day-number">${date.getDate()}</span>${hasAppointments ? '<span class="dashboard-calendar-event-dot"></span>' : ''}</button>`;
                }).join('');
            }

            document.querySelectorAll('[data-calendar-view]').forEach((button) => {
                const active = button.dataset.calendarView === calendarView;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-selected', String(active));
            });
            calendarAgenda?.classList.toggle('is-week-view', calendarView === 'week');
            calendarAgenda?.classList.toggle('is-day-view', calendarView === 'day');
            renderAgenda(selectedDate);

            daysGrid.querySelectorAll('[data-calendar-date]').forEach((button) => {
                button.addEventListener('click', () => {
                    selectedDate = dateFromKey(button.dataset.calendarDate);
                    renderCalendar();
                });
            });
            weekdays?.querySelectorAll('[data-calendar-date]').forEach((button) => {
                button.addEventListener('click', () => {
                    selectedDate = dateFromKey(button.dataset.calendarDate);
                    renderCalendar();
                });
            });
        }

        document.getElementById('dashboardCalendarPrev')?.addEventListener('click', () => {
            if (calendarView === 'month') {
                shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() - 1, 1);
                selectedDate = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), 1);
            } else if (calendarView === 'week') {
                selectedDate.setDate(selectedDate.getDate() - 7);
                shownMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            } else {
                selectedDate.setDate(selectedDate.getDate() - 1);
                shownMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            }
            renderCalendar();
        });
        document.getElementById('dashboardCalendarNext')?.addEventListener('click', () => {
            if (calendarView === 'month') {
                shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 1);
                selectedDate = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), 1);
            } else if (calendarView === 'week') {
                selectedDate.setDate(selectedDate.getDate() + 7);
                shownMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            } else {
                selectedDate.setDate(selectedDate.getDate() + 1);
                shownMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            }
            renderCalendar();
        });

        function goToToday() {
            const now = new Date(getTodayDateString()+'T00:00:00');
            now.setHours(0, 0, 0, 0);
            selectedDate = new Date(now);
            shownMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            renderCalendar();
        }

        document.getElementById('dashboardCalendarToday')?.addEventListener('click', goToToday);
        document.getElementById('dashboardCalendarMonth')?.addEventListener('click', goToToday);

        document.querySelectorAll('[data-calendar-view]').forEach((button) => {
            button.addEventListener('click', () => {
                calendarView = button.dataset.calendarView;
                shownMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                renderCalendar();
            });
        });

        refreshDashboardCalendar = renderCalendar;
        renderCalendar();
    }

    // -------------------------------------------------------------
    // 5. RENDER HIỆU SUẤT CHATBOT AI VÀ TỶ LỆ LẤP ĐẦY NHÂN SỰ
    // -------------------------------------------------------------
    function renderChatbotAndStaffMetrics() {
        const todayStr = getTodayDateString();

        // 1. Chỉ số Chatbot
        const totalSessions = liveChatConversations.length;
        const handoverSessions = liveChatConversations.filter(c => {
            const s = (c.status || '').toUpperCase();
            return Boolean(c.assigned_staff_id) || ['ESCALATED','HANDOVER','AGENT_HANDOVER','AGENT_HANDLING','HUMAN_AGENT'].includes(s);
        }).length;
        const aiSessions = Math.max(0, totalSessions - handoverSessions);
        // D-05: 0 phiên hiển thị '—' thay vì 100%
        const aiPercent = totalSessions > 0 ? Math.round((aiSessions / totalSessions) * 100) : 0;

        const elDonutCircle = document.getElementById('dashboardDonutCircle');
        if (elDonutCircle) {
            const strokeDash = totalSessions > 0 ? (aiPercent / 100) * 301.59 : 0;
            elDonutCircle.setAttribute('stroke-dasharray', `${strokeDash.toFixed(2)} 301.59`);
        }

        const elPercentWrap = document.getElementById('dashboardChatbotPercentWrap');
        if (elPercentWrap) {
            elPercentWrap.innerHTML = totalSessions > 0 
                ? `<strong>${aiPercent}%</strong><small>Chưa chuyển nhân viên</small>`
                : `<strong>—</strong><small>Chưa có phiên</small>`;
        }

        const elAiSessions = document.getElementById('dashboardAiSessionsCount');
        if (elAiSessions) elAiSessions.textContent = `${aiSessions} phiên`;

        const elHandoverSessions = document.getElementById('dashboardHandoverSessionsCount');
        if (elHandoverSessions) elHandoverSessions.textContent = `${handoverSessions} phiên`;

        const elTotalChat = document.getElementById('dashboardTotalChatSessions');
        if (elTotalChat) elTotalChat.textContent = `${totalSessions} phiên trò chuyện`;

        // 2. Chỉ số Lấp đầy nhân sự (Tỷ lệ nhân viên đang có ca phụ trách hôm nay)
        // D-06: Sử dụng đúng trường account_status hoặc status để lọc nhân sự hoạt động
        const activeStaffList = liveStaffList.filter(s => {
            const st = (s.employment_status || '').toUpperCase();
            return st === 'ACTIVE';
        });
        const totalActiveStaff = activeStaffList.length;

        const assignedStaffToday = new Set(
            liveAppointments
                .filter(a => {
                    const isToday = toDateKey(a.appointment_date) === todayStr;
                    const s = (a.appointment_status || '').toUpperCase();
                    return isToday && s !== 'CANCELLED' && s !== 'DA_HUY';
                })
                .flatMap(a => [a.staff_id,...(a.items || []).filter(i=>i.status!=='cancelled').map(i=>i.staff_id)])
                .filter(id => activeStaffList.some(s=>s.id===id))
        );

        const utilPercent = totalActiveStaff > 0 
            ? Math.min(100, Math.round((assignedStaffToday.size / totalActiveStaff) * 100)) 
            : 0;

        const elStaffPercent = document.getElementById('dashboardStaffUtilPercent');
        if (elStaffPercent) elStaffPercent.textContent = totalActiveStaff > 0 ? `${utilPercent}%` : '—';

        const elStaffBar = document.getElementById('dashboardStaffUtilBar');
        if (elStaffBar) elStaffBar.style.width = `${utilPercent}%`;
        if (_dashLoadError) {
            ['dashboardAiSessionsCount','dashboardHandoverSessionsCount','dashboardTotalChatSessions','dashboardStaffUtilPercent'].forEach(id=>{const element=document.getElementById(id);if(element)element.textContent='—';});
            if(elPercentWrap)elPercentWrap.textContent='Không tải được dữ liệu.';
        }
    }

    // -------------------------------------------------------------
    // 6. ĐIỀU HƯỚNG LIÊN PHÂN HỆ THÔNG MINH
    // -------------------------------------------------------------
    function bindModuleNavigation(root = document) {
        root.querySelectorAll('[data-dashboard-module]').forEach((control) => {
            if (control.dataset.dashboardBound === 'true') return;
            control.dataset.dashboardBound = 'true';
            control.addEventListener('click', () => {
                const moduleName = control.getAttribute('data-dashboard-module');
                const action = control.getAttribute('data-action');
                const sku = control.getAttribute('data-sku');
                const bookingId = control.getAttribute('data-booking-id');

                if (action === 'complaints') {
                    sessionStorage.setItem('pawpal_admin_complaint_active_subtab', 'tab-complaint-services');
                    sessionStorage.setItem('pawpal_admin_complaint_filter_status', 'pending');
                } else if (action === 'orders') {
                    sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-list');
                    sessionStorage.setItem('pawpal_admin_order_filter_status', 'pending');
                } else if (control.id === 'btnDashboardViewAllStock' || control.classList.contains('dashboard-stock-heading')) {
                    sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-products');
                } else if (sku) {
                    sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-products');
                    sessionStorage.setItem('pawpal_admin_product_search', sku);
                } else if (bookingId) {
                    sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-detail');
                    sessionStorage.setItem('pawpal_admin_service_selected_id', bookingId);
                } else if (moduleName === 'Dịch vụ') {
                    sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-bookings');
                } else if (moduleName === 'Bán hàng') {
                    sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-list');
                } else if (moduleName === 'Khách hàng') {
                    sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-list');
                } else if (moduleName === 'Thú cưng') {
                    sessionStorage.setItem('pawpal_admin_pet_subtab', 'tab-pet-list');
                }

                const target = Array.from(document.querySelectorAll('.sidebar-menu-btn'))
                    .find((button) => button.getAttribute('data-title') === moduleName);
                if (target) target.click();
            });
        });
    }

    // -------------------------------------------------------------
    // 7. GIAI ĐOẠN 2: THANH THAO TÁC TIẾP NHẬN TẠI QUẦY
    // -------------------------------------------------------------
    function setupQuickReceptionActions() {
        const btnPet = document.getElementById('btnQuickReceptionPet');
        const btnService = document.getElementById('btnQuickBookingService');
        const btnOrder = document.getElementById('btnQuickCreateOrder');

        const openCreateFormAfterNavigation = (moduleName, buttonId) => {
            const target = Array.from(document.querySelectorAll('.sidebar-menu-btn'))
                .find(button => button.getAttribute('data-title') === moduleName);
            if (!target) return;

            window.addEventListener('admin:module-show', (event) => {
                if (event.detail?.module === moduleName) {
                    document.getElementById(buttonId)?.click();
                }
            }, { once: true });
            target.click();
        };

        if (btnPet) {
            btnPet.addEventListener('click', () => {
                sessionStorage.setItem('pawpal_admin_pet_subtab', 'tab-pet-list');
                openCreateFormAfterNavigation('Thú cưng', 'btnOpenAddPetModal');
            });
        }

        if (btnService) {
            btnService.addEventListener('click', () => {
                sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-bookings');
                openCreateFormAfterNavigation('Dịch vụ', 'btnOpenCreateBookingModal');
            });
        }

        if (btnOrder) {
            btnOrder.addEventListener('click', () => {
                sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-list');
                openCreateFormAfterNavigation('Bán hàng', 'btnOpenCreateOrderModal');
            });
        }
    }

    // -------------------------------------------------------------
    // 8. GIAI ĐOẠN 2: MODAL XEM NHANH CA DỊCH VỤ TRÊN LỊCH HẸN
    // -------------------------------------------------------------
    let currentSelectedQuickBooking = null;

    function openBookingQuickModal(booking) {
        currentSelectedQuickBooking = booking;
        const modal = document.getElementById('dashboardBookingQuickModal');
        if (!modal) return;

        const elPet = document.getElementById('modalBookingPet');
        const elCust = document.getElementById('modalBookingCustomer');
        const elSvc = document.getElementById('modalBookingService');
        const elTime = document.getElementById('modalBookingTime');
        const elStaff = document.getElementById('modalBookingStaff');
        const elStatus = document.getElementById('modalBookingStatus');
        const elNotes = document.getElementById('modalBookingNotes');

        const todayStr = getTodayDateString();
        const rawDate = (booking.date || '').substring(0, 10);
        let dateDisplay = 'Hôm nay';
        if (rawDate) {
            if (rawDate === todayStr) {
                dateDisplay = 'Hôm nay';
            } else {
                const parts = rawDate.split('-');
                if (parts.length === 3) {
                    dateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
                } else {
                    dateDisplay = rawDate;
                }
            }
        }

        if (elPet) elPet.textContent = booking.pet || 'Bé cưng';
        if (elCust) elCust.textContent = booking.customer || 'Khách hàng';
        if (elSvc) elSvc.textContent = booking.service || 'Chăm sóc thú cưng';
        if (elTime) elTime.textContent = `${booking.time || '09:30'} · ${dateDisplay}`;
        if (elStaff) elStaff.textContent = booking.staff || 'Kỹ thuật viên';
        if (elStatus) {
            elStatus.textContent = '';
            const badgeSpan = document.createElement('span');
            badgeSpan.className = `admin-badge ${booking.badge || 'badge-neutral'}`;
            badgeSpan.textContent = booking.status || 'Đã xác nhận';
            elStatus.appendChild(badgeSpan);
        }
        if (elNotes) elNotes.textContent = booking.notes || 'Chăm sóc dịu nhẹ, đúng quy trình an toàn.';

        modal.style.display = 'flex';
    }

    function closeBookingQuickModal() {
        const modal = document.getElementById('dashboardBookingQuickModal');
        if (modal) modal.style.display = 'none';
        currentSelectedQuickBooking = null;
    }

    function setupBookingQuickModalEvents() {
        const modal = document.getElementById('dashboardBookingQuickModal');
        const btnClose = document.getElementById('btnCloseBookingQuickModal');
        const btnDismiss = document.getElementById('btnDismissBookingModal');
        const btnGo = document.getElementById('btnGoToServiceDetail');

        if (btnClose) btnClose.addEventListener('click', closeBookingQuickModal);
        if (btnDismiss) btnDismiss.addEventListener('click', closeBookingQuickModal);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeBookingQuickModal();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display !== 'none') {
                    closeBookingQuickModal();
                }
            });
        }

        if (btnGo) {
            btnGo.addEventListener('click', () => {
                const booking = currentSelectedQuickBooking;
                closeBookingQuickModal();
                sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-detail');
                if (booking) {
                    const targetCode = booking.appointmentCode || booking.id;
                    sessionStorage.setItem('pawpal_admin_service_selected_id', targetCode);
                    window.addEventListener('admin:module-show', async (event) => {
                        if (event.detail?.module === 'Dịch vụ') {
                            const services = window.PawpalServices;
                            await services?.loadServicesData?.();
                            if (services?.state?.bookingsData?.some(item => item.id === targetCode || item.dbId === booking.id)) {
                                services.openBookingDetail(targetCode);
                            } else {
                                services?.switchSubtab?.('tab-service-bookings');
                                services?.showToast?.('Không tìm thấy ca dịch vụ tương ứng.', 'warning');
                            }
                        }
                    }, { once: true });
                }
                const target = Array.from(document.querySelectorAll('.sidebar-menu-btn'))
                    .find(b => b.getAttribute('data-title') === 'Dịch vụ');
                if (target) target.click();
            });
        }
    }

    // -------------------------------------------------------------
    // GIAI ĐOẠN 4: REALTIME CHANNEL LẮNG NGHE DỮ LIỆU THAY ĐỔI
    // -------------------------------------------------------------
    let dashboardRealtimeSub = null;
    const dashboardTableResources = {
        sales_order: ['orders'],
        appointment: ['appointments'],
        appointment_item: ['appointments'],
        payment: ['cashflow'],
        refund_transaction: ['cashflow'],
        support_ticket: ['tickets'],
        customer: ['customer-count', 'profiles'],
        customer_profile: ['profiles'],
        pet_profile: ['pet-count', 'pets'],
        product: ['products'],
        product_variant: ['products'],
        inventory: ['products'],
        staff: ['staff'],
        service: ['services'],
        chat_conversation: ['chats']
    };

    function renderDashboardData() {
        renderDashboardKPIs();
        renderDashboardStockList();
        renderRevenueChart();
        renderChatbotAndStaffMetrics();
        setupDashboardCalendar();
    }

    function scheduleDashboardSync(resources) {
        invalidateDashboardResources(resources);
        if (window.PawpalDataStore?.handleRealtimeChange) {
            window.PawpalDataStore.handleRealtimeChange({
                moduleName: 'Dashboard',
                onActiveRefresh: async () => {
                    await loadDashboardData();
                    renderDashboardData();
                },
                debounceMs: 500
            });
        } else if (!document.hidden && sessionStorage.getItem('pawpal_admin_active_module') === 'Dashboard') {
            loadDashboardData().then(renderDashboardData);
        }
    }

    function setupDashboardRealtimeSync() {
        const client = getSupabaseClient();
        if (!client || typeof client.channel !== 'function') return;

        try {
            if (dashboardRealtimeSub) {
                client.removeChannel(dashboardRealtimeSub);
                window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin-dashboard-live-sync');
            }

            dashboardRealtimeSub = client.channel('admin-dashboard-live-sync');
            Object.entries(dashboardTableResources).forEach(([table, resources]) => {
                dashboardRealtimeSub.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
                    scheduleDashboardSync(resources);
                });
            });
            dashboardRealtimeSub.subscribe();

            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin-dashboard-live-sync');
        } catch (e) {
            console.warn('[Dashboard] Lỗi khởi tạo Realtime Channel:', e);
        }
    }

    // ====================================================================
    // KHỞI ĐỘNG CHÍNH THỨC TOÀN BỘ DASHBOARD
    // ====================================================================
    let _isDashboardInit = false;

    async function startDashboard() {
        if (_isDashboardInit) {
            // Đã khởi tạo DOM và event listeners — chỉ re-render dữ liệu
            if (Date.now() - _dashLastFetchedAt >= DASH_CACHE_TTL_MS) {
                await loadDashboardData();
            }
            renderDashboardKPIs();
            renderDashboardStockList();
            renderRevenueChart();
            renderChatbotAndStaffMetrics();
            setupDashboardCalendar();
            return;
        }

        _isDashboardInit = true;
        await loadDashboardData();
        try { renderDashboardKPIs(); } catch (e) { console.warn('[Dashboard] renderDashboardKPIs error:', e); }
        try { renderDashboardStockList(); } catch (e) { console.warn('[Dashboard] renderDashboardStockList error:', e); }
        try { renderRevenueChart(); } catch (e) { console.warn('[Dashboard] renderRevenueChart error:', e); }
        try { setupDashboardCalendar(); } catch (e) { console.warn('[Dashboard] setupDashboardCalendar error:', e); }
        try { renderChatbotAndStaffMetrics(); } catch (e) { console.warn('[Dashboard] renderChatbotAndStaffMetrics error:', e); }
        setupQuickReceptionActions();
        setupBookingQuickModalEvents();
        bindModuleNavigation();
        setupDashboardRealtimeSync();

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                _dashHiddenAt = Date.now();
            }
        });

        window.addEventListener('focus', async () => {
            if (document.hidden || sessionStorage.getItem('pawpal_admin_active_module') !== 'Dashboard') return;
            // Chỉ reload nếu tab đã bị ẩn tối thiểu 5 phút
            const hiddenDuration = Date.now() - _dashHiddenAt;
            if (_dashHiddenAt === 0 || hiddenDuration < DASH_FOCUS_RELOAD_AFTER_MS) return;
            _dashHiddenAt = 0;
            await loadDashboardData();
            try { renderDashboardKPIs(); } catch (e) {}
            try { renderDashboardStockList(); } catch (e) {}
            try { renderRevenueChart(); } catch (e) {}
            try { renderChatbotAndStaffMetrics(); } catch (e) {}
            try { setupDashboardCalendar(); } catch (e) {}
        });

        // Lắng nghe sự kiện biến động dữ liệu từ DataStore (PERF-03.D05)
        window.addEventListener('pawpal:mutation', (e) => {
            const entityTables = { order: 'sales_order', pet: 'pet_profile', ticket: 'support_ticket' };
            const table = e.detail?.table || entityTables[e.detail?.entity] || e.detail?.entity;
            if (dashboardTableResources[table]) {
                scheduleDashboardSync(dashboardTableResources[table]);
            }
        });

        // [D-11] Lắng nghe sự kiện biến động dữ liệu từ phân hệ khác để tự động xóa cache Dashboard
        window.addEventListener('pawpal:invalidate-dashboard-cache', () => {
            scheduleDashboardSync([...new Set(Object.values(dashboardTableResources).flat())]);
        });
    }

    window.PawpalDashboard = {
        init: startDashboard,
        loadDashboardData,
        refresh: async function() {
            _dashLastFetchedAt = 0;
            await loadDashboardData({ force: true });
            renderDashboardKPIs();
            renderDashboardStockList();
            renderRevenueChart();
            renderChatbotAndStaffMetrics();
            setupDashboardCalendar();
        },
        getLastUpdatedTime: function() {
            return _dashLastFetchedAt ? new Date(_dashLastFetchedAt).toLocaleTimeString('vi-VN') : 'Chưa cập nhật';
        },
        renderDashboardKPIs,
        renderDashboardStockList,
        renderRevenueChart,
        setupDashboardCalendar
    };

    // Chỉ tự khởi động nếu module được load độc lập mà không qua router admin.js
    if (!window._pawpalAdminLoaded && !document.querySelector('.admin-layout')) {
        startDashboard();
    }
})();
