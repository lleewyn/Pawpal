import { normalizeOrderStatus } from '/scripts/shared/order-status.mjs';
import { resolveAuthenticatedCustomerId } from '/scripts/shared/customer-identity.mjs';
import { normalizeCartItems, publishCart } from '/scripts/shared/cart-state.mjs';

const wishlistIntents = new Map();
let cartWriteQueue = Promise.resolve();
function queueCartWrite(task) {
    const result = cartWriteQueue.then(() => typeof navigator !== 'undefined' && navigator.locks
        ? navigator.locks.request('pawpal-cart-write', task)
        : task());
    cartWriteQueue = result.catch(() => {});
    return result;
}

function assertCartOwner(userId) {
    const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (!userId || user?.id !== userId) throw new Error('Tài khoản đã thay đổi. Vui lòng tải lại giỏ hàng.');
}

function matchesCartItem(item, id) {
    return [item.id,item.variantId,item.product_variant_id,item.product_id].some(value=>value!=null && String(value)===String(id));
}
function findCartItem(items,id) {
    const exact=items.find(item=>String(item.id)===String(id) || String(item.variantId)===String(id));
    if(exact)return exact;
    const matches=items.filter(item=>matchesCartItem(item,id));
    if(matches.length>1)throw new Error('Vui lòng chọn đúng phân loại sản phẩm.');
    return matches[0];
}
const resolveCustomerId = resolveAuthenticatedCustomerId;

export const API = {
    DATA_VERSION: '2026-07-04-v14-guest-data',

    async getJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`[API] Cannot load ${url}:`, error);
            return null;
        }
    },

    async request(path, options = {}) {
        if (!this.USE_BACKEND) return null;
        try {
            const response = await fetch(`${this.getBaseUrl()}${path}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[API] request failed: ${path}`, error);
            return null;
        }
    },

    async initData() {
    },

    async getUserPets(userOrId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userOrId) return [];
        try {
            const customerId = await resolveCustomerId(db, userOrId);
            if (!customerId) return [];

            const { data, error } = await db
                .from('pet_profile')
                .select('*')
                .eq('customer_id', customerId);
            
            if (error) {
                console.error('[API] Supabase getUserPets error:', error.message);
                return [];
            }
            return (data || []).map(p => ({
                id: p.id,
                name: p.pet_name,
                type: p.pet_type,
                breed: p.breed,
                age: p.age,
                weight: p.weight,
                gender: p.gender,
                note: p.note,
                image: p.avatar_url || '/assets/images/placeholder.webp'
            }));
        } catch (err) {
            console.error('[API] Supabase getUserPets failed:', err);
            return [];
        }
    },

    async getUserBookings(userOrId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userOrId) throw new Error('Vui lòng đăng nhập để tải dữ liệu.');
        try {
            const customerId = await resolveCustomerId(db, userOrId);
            if (!customerId) return [];

            const { data, error } = await db
                .from('appointment')
                .select(`
                    id, appointment_code, scheduled_start_at, scheduled_end_at, check_in_time, check_out_time,
                    appointment_status, note, change_count, updated_at,
                    appointment_item (
                        id, service_id, name_snapshot, quantity, unit_price, discount_amount, duration_minutes, is_primary, status,
                        service ( service_name, category_id, estimated_duration )
                    ),
                    pet_profile (
                        id, pet_code, pet_name, avatar_url,
                        pet_breed ( breed_name, pet_species ( species_name ) )
                    ),
                    payment (
                        id, amount, transaction_status, payment_type
                    )
                `)
                .eq('customer_id', customerId)
                .order('scheduled_start_at', { ascending: false });
                
            if (error) {
                console.error('[API] Supabase getUserBookings error:', error.message);
                throw error;
            }

            const summaryResult = await db.rpc('own_service_booking_summary');
            if (summaryResult.error) throw summaryResult.error;
            const summaries = new Map((summaryResult.data || []).map(row => [row.id, row]));

            const mapAppointmentStatus = (status) => {
                if (!status) return 'upcoming';
                const s = String(status).toLowerCase().trim();
                if (['dang_giu_cho', 'tam_giu', 'cho_xac_nhan', 'pending'].includes(s)) return 'pending';
                if (['da_xac_nhan', 'confirmed', 'upcoming'].includes(s)) return 'confirmed';
                if (['da_check_in', 'accepted', 'checked_in'].includes(s)) return 'accepted';
                if (['dang_thuc_hien', 'in_progress', 'in-progress', 'ready_for_pickup'].includes(s)) return 'in-progress';
                if (['da_hoan_tat', 'completed', 'done'].includes(s)) return 'completed';
                if (['da_huy', 'cancelled', 'da_het_han', 'expired', 'vang_mat', 'no_show'].includes(s)) return 'cancelled';
                return 'upcoming';
            };

            return (data || []).map(b => {
                const items = Array.isArray(b.appointment_item) ? b.appointment_item : [];
                const primaryItem = items.find(i => i.is_primary) || items[0];
                const pet = b.pet_profile;
                const petBreed = pet?.pet_breed?.breed_name || '';
                const petSpecies = pet?.pet_breed?.pet_species?.species_name || '';

                const summary = summaries.get(b.id);
                if (!summary || !Number.isFinite(Number(summary.total)) || !Number.isFinite(Number(summary.net_paid))) {
                    throw new Error('Không thể đối soát số tiền lịch hẹn. Vui lòng tải lại.');
                }
                const total = Number(summary.total), netPaid = Number(summary.net_paid);
                const paymentStatus = total > 0 && netPaid >= total ? 'paid' : netPaid > 0 ? 'partial' :
                    (b.appointment_status === 'cancelled' ? 'cancelled' : 'pending');

                const localStart = b.scheduled_start_at ? new Date(b.scheduled_start_at) : null;
                const dateStr = localStart && !Number.isNaN(localStart.getTime()) ?
                    `${localStart.getFullYear()}-${String(localStart.getMonth()+1).padStart(2,'0')}-${String(localStart.getDate()).padStart(2,'0')}` : '';
                let timeStr = '';
                if (b.scheduled_start_at) {
                    try {
                        const d = new Date(b.scheduled_start_at);
                        timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                    } catch (_) {}
                }

                return {
                    id:              b.appointment_code || b.id,
                    _supabaseId:     b.id,
                    userId:          customerId,
                    date:            dateStr,
                    time:            timeStr,
                    timeStart:       timeStr,
                    scheduledStartAt: b.scheduled_start_at,
                    scheduledEndAt:  b.scheduled_end_at,
                    updatedAt:       b.updated_at,
                    netPaid,
                    reviewedItemIds: summary.reviewed_item_ids || [],
                    status:          mapAppointmentStatus(b.appointment_status),
                    bookingStatus:   b.appointment_status,
                    paymentStatus:   paymentStatus,
                    service:         primaryItem?.name_snapshot || primaryItem?.service?.service_name || 'Dịch vụ PawPal',
                    serviceName:     primaryItem?.name_snapshot || primaryItem?.service?.service_name || 'Dịch vụ PawPal',
                    serviceCategory: primaryItem?.service?.category_id || '',
                    items:           items.map(itm => ({
                        id: itm.id,
                        status: itm.status,
                        serviceId: itm.service_id,
                        name: itm.name_snapshot || itm.service?.service_name || '',
                        quantity: itm.quantity,
                        unitPrice: itm.unit_price,
                        discount: itm.discount_amount || 0,
                        durationMinutes: itm.duration_minutes
                    })),
                    petId:           pet?.pet_code || pet?.id || '',
                    petName:         pet?.pet_name || '',
                    petBreed:        petBreed,
                    petSpecies:      petSpecies,
                    petAvatar:       pet?.avatar_url || '',
                    changeCount:     b.change_count || 0,
                    note:            b.note || '',
                    price:           total,
                    _source:         'supabase'
                };
            });
        } catch (err) {
            console.error('[API] Supabase getUserBookings failed:', err);
            throw err;
        }
    },

    async getUserAppointments(userOrId) {
        return this.getUserBookings(userOrId);
    },

    async getUserOrders(userOrId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userOrId) throw new Error('Vui lòng đăng nhập để tải dữ liệu.');
        try {
            const customerId = await resolveCustomerId(db, userOrId);
            if (!customerId) return [];

            const { data, error } = await db
                .from('sales_order')
                .select(`
                    id, order_code, order_status, note, created_at, updated_at,
                    shipping_fee_snapshot, receiver_name_snapshot, receiver_phone_snapshot,
                    province_snapshot, street_address_snapshot, postal_code_snapshot,
                    delivery_option_id, shipping_provider_id, tracking_code, shipped_at, delivered_at, shipping_status,
                    sales_order_detail (
                        id, product_variant_id, quantity, unit_price, discount_amount,
                        product_name_snapshot, sku_snapshot
                    ),
                    payment (
                        id, payment_code, amount, transaction_status, payment_type, succeeded_at, payment_method_config_id
                    )
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) { 
                console.error('[API] Supabase getUserOrders error:', error.message);
                throw error;
            }

            const mapOrderStatus = normalizeOrderStatus;

            const totalsResult=await db.rpc('own_sales_order_totals');
            if(totalsResult.error)throw totalsResult.error;
            const totalsById=new Map((totalsResult.data||[]).map(row=>[row.id,row]));
            const methodResponse=await db.rpc('customer_shop_options');
            if(methodResponse.error)throw methodResponse.error;
            const paymentMethods=new Map((methodResponse.data?.payment_methods||[]).map(m=>[m.id,m]));
            const orders = (data || []).map(o => {
                const details = o.sales_order_detail || [];
                const products = details.map(d => {
                    const unitPrice = Number(d.unit_price) || 0;
                    const qty = Number(d.quantity) || 1;
                    const discount = Number(d.discount_amount) || 0;
                    const lineTotal = Math.max(0, (unitPrice * qty) - discount);

                    return {
                        id:          d.product_variant_id || d.id,
                        lineId:      d.id,
                        variantId:   d.product_variant_id,
                        variant_id:  d.product_variant_id,
                        name:        d.product_name_snapshot || 'Sản phẩm',
                        sku:         d.sku_snapshot || '',
                        image:       '/assets/images/publics/feed.jpg',
                        quantity:    qty,
                        price:       unitPrice,
                        discount:    discount,
                        total:       lineTotal
                    };
                });

                const calculatedSubtotal = products.reduce((sum, p) => sum + p.total, 0);
                const shippingFee = Number(o.shipping_fee_snapshot) || 0;
                const authoritative=totalsById.get(o.id);
                if(!authoritative)throw new Error('Không thể xác nhận tổng tiền đơn hàng.');
                const grandTotal = Number(authoritative.total);

                const paid=Number(authoritative.paid)||0;
                const paymentStatus = paid>=grandTotal ? 'paid' : paid>0 ? 'partial' : (o.order_status === 'cancelled' ? 'cancelled' : 'pending_payment');

                const fullAddress = [o.street_address_snapshot, o.province_snapshot].filter(Boolean).join(', ');

                return {
                    id:          o.order_code || o.id,
                    _supabaseId: o.id,
                    userId:      customerId,
                    status:      mapOrderStatus(o.order_status),
                    orderStatus: o.order_status,
                    paymentStatus: paymentStatus,
                    paymentMethod: paymentMethods.get(o.payment?.find(p=>p.payment_type==='collection')?.payment_method_config_id)?.short_name?.toLowerCase() || '',
                    paymentMethodName: paymentMethods.get(o.payment?.find(p=>p.payment_type==='collection')?.payment_method_config_id)?.name || 'Chưa xác định',
                    netPaid: paid,
                    products,
                    pricing: {
                        subtotal:    calculatedSubtotal,
                        shippingFee: shippingFee,
                        discount:    Math.max(0,calculatedSubtotal+shippingFee-grandTotal),
                        total:       grandTotal,
                        grandTotal:  grandTotal
                    },
                    shipping: {
                        name:    o.receiver_name_snapshot || '',
                        phone:   o.receiver_phone_snapshot || '',
                        address: fullAddress
                    },
                    trackingCode:   o.tracking_code || '',
                    shippingStatus: o.shipping_status || '',
                    shippedAt:      o.shipped_at || null,
                    deliveredAt:    o.delivered_at || null,
                    note:           o.note || '',
                    createdAt:      o.created_at,
                    updatedAt:      o.updated_at,
                    _source:        'supabase'
                };
            });
            return orders;
        } catch (err) {
            console.error('[API] Supabase getUserOrders failed:', err);
            throw err;
        }
    },

    async getUserReviews(userOrId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userOrId) return [];
        try {
            const customerId = await resolveCustomerId(db, userOrId);
            if (!customerId) return [];

            const { data, error } = await db.from('review')
                .select('*,line:sales_order_detail!inner(order_id,order:sales_order!inner(customer_id,order_code))')
                .eq('line.order.customer_id', customerId);
            if (error) { 
                console.error('[API] Supabase getUserReviews error:', error.message); 
                throw error;
            }
            return (data||[]).map(r=>({...r,sales_order_id:r.line.order_id,sales_order_code:r.line.order.order_code}));
        } catch (err) {
            console.error('[API] Supabase getUserReviews failed:', err);
            throw err;
        }
    },

    async getUserVouchers(userOrId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userOrId) return [];
        try {
            const customerId = await resolveCustomerId(db, userOrId);
            if (!customerId) return [];

            const { data, error } = await db.from('customer_voucher')
                .select(`
                    id, 
                    voucher_status, 
                    expired_at,
                    voucher ( id, voucher_code, discount_value, type, minimum_order_amount, start_date, end_date, description, required_points, is_active, applicable_for, max_usage )
                `)
                .eq('customer_id', customerId);
            if (error) { 
                console.error('[API] Supabase getUserVouchers error:', error.message); 
                return []; 
            }
            
            return (data || []).map(row => {
                const v = row.voucher || {};
                return {
                    id: row.id,
                    voucherId: v.id,
                    code: v.voucher_code,
                    discountAmount: v.discount_value,
                    discountType: v.type,
                    type: String(v.type || 'percentage').toLowerCase() === 'percent' ? 'percentage' : String(v.type || 'percentage').toLowerCase(),
                    value: Number(v.discount_value || 0),
                    maxDiscount: v.max_discount || null,
                    minOrderValue: Number(v.minimum_order_amount || 0),
                    minOrderAmount: v.minimum_order_amount,
                    validFrom: v.start_date,
                    validUntil: v.end_date,
                    validTo: v.end_date,
                    usageCount: Number(v.usage_count || 0),
                    maxUsage: v.max_usage,
                    applicableFor: v.applicable_for || ['all'],
                    active: row.voucher_status==='available'&&v.is_active===true&&(!row.expired_at||new Date(row.expired_at)>new Date()),
                    description: v.description,
                    isUsed: row.voucher_status === 'USED' || row.voucher_status === 'used',
                    usedAt: null
                };
            });
        } catch (err) {
            console.error('[API] Supabase getUserVouchers failed:', err);
            return [];
        }
    },

    async getCareLogs() {
        const careLogs = await this.request('/api/care-logs');
        if (careLogs && typeof careLogs === 'object') return careLogs;
        return safeReadObject('pawpal_pet_tracker_logs') || {};
    },

    async getUserCart(userId, { waitForWrites = true } = {}) {
        if (!userId) return [];
        assertCartOwner(userId);
        if (waitForWrites) await cartWriteQueue;
        assertCartOwner(userId);
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) throw new Error('Chưa kết nối được giỏ hàng.');

        try {
            const { data: items, error: itemsError } = await db.rpc('own_customer_cart');
            if (itemsError) throw itemsError;
            let cached = [];
            try { if (localStorage.getItem('pawpal_cart_owner') === String(userId)) cached = JSON.parse(localStorage.getItem('pawpal_cart') || '[]'); } catch {}
            return publishCart((items || []).map(item => {
                const prod = item.product_variant?.product || {};
                const prodId = prod.id || item.product_variant_id || item.product_id || item.id;
                const cachedItem = Array.isArray(cached) ? cached.find(c => String(c.id) === String(prodId) || String(c.id) === String(item.product_variant_id) || String(c.variantId) === String(item.product_variant_id)) : null;
                return {
                    ...(cachedItem || {}),
                    id: prodId,
                    variantId: item.product_variant_id || prodId,
                    product_variant_id: item.product_variant_id || prodId,
                    name: prod.product_name || cachedItem?.name || 'Sản phẩm',
                    sku: item.product_variant?.sku_variant || cachedItem?.sku || '',
                    quantity: Number(item.quantity),
                    qty: Number(item.quantity),
                    price: Number(item.product_variant?.sale_price ?? item.unit_price ?? 0),
                    subtotal: Number(item.subtotal) || ((Number(item.unit_price) || 0) * Number(item.quantity))
                };
            }), userId);
        } catch (err) {
            throw err;
        }
    },

    async getOrCreateCart(userId) {
        if (!userId) return null;
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) throw new Error('Chưa kết nối được giỏ hàng.');

        let { data: cartData, error: readError } = await db.from('cart').select('id').eq('customer_id', userId).maybeSingle();
        if (readError) throw readError;
        if (!cartData) {
            const { data: newCart, error } = await db.from('cart').insert({ customer_id: userId, cart_status: 'ACTIVE' }).select('id').single();
            if (error) throw error;
            cartData = newCart;
        }
        return cartData;
    },

    async saveUserCart(userId, cartItems) {
        const snapshot = normalizeCartItems(cartItems);
        return queueCartWrite(() => this.persistUserCart(userId, snapshot));
    },

    async validateCartStock(cartItems) {
        const items=normalizeCartItems(cartItems);if(!items.length)return {valid:true};
        const db=window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if(!db)throw new Error('Không thể kiểm tra tồn kho.');
        const {data,error}=await db.rpc('customer_shop_catalog');if(error)throw error;
        const variants=(data||[]).flatMap(p=>(p.product_variant||[]).map(v=>({...v,product_id:p.id})));
        for(const item of items){
            const id=item.variantId||item.product_variant_id||item.id;
            const variant=variants.find(v=>String(v.id)===String(id));
            if(!variant)throw new Error('Phân loại sản phẩm không còn được bán.');
            if(item.quantity>Number(variant.available_quantity))throw new Error('Sản phẩm không đủ tồn kho khả dụng.');
        }
        return {valid:true};
    },

    async prepareCartCheckout(userId, selectedItems) {
        const requested = normalizeCartItems(selectedItems);
        return queueCartWrite(async () => {
            const current = await this.getUserCart(userId, { waitForWrites: false });
            const selected = current.filter(item => requested.some(entry => matchesCartItem(item,entry.id)));
            if (!selected.length || selected.length !== requested.length) throw new Error('Giỏ hàng đã thay đổi. Vui lòng chọn lại sản phẩm.');
            await this.validateCartStock(selected);
            return selected;
        });
    },

    async restoreCartBackup(userId, backupItems, { mode = 'add', token = JSON.stringify(backupItems) } = {}) {
        const backup = normalizeCartItems(backupItems);
        return queueCartWrite(async () => {
            const current = await this.getUserCart(userId, { waitForWrites: false });
            const key = `pawpal_cart_restore_${userId}`;
            const payload = JSON.stringify(backup);
            const previous = JSON.parse(localStorage.getItem(key) || 'null');
            if (previous?.token === token && previous.payload === payload && previous.status === 'applied') return current;
            let merged;
            if (previous?.token === token && previous.payload === payload && previous.status === 'prepared') {
                // A prior request may have committed before its response was lost.
                merged = normalizeCartItems([...current]);
                for (const target of previous.target) {
                    const item = findCartItem(merged,target.id);
                    if (item) { item.quantity = Math.max(item.quantity, target.quantity); item.qty = item.quantity; }
                    else merged.push(target);
                }
            } else {
                const additions = mode === 'included'
                    ? backup.filter(item => !findCartItem(current,item.id))
                    : backup;
                const resolved=additions.map(item=>{const old=findCartItem(current,item.id);return old?{...item,id:old.id,variantId:old.variantId,product_id:old.product_id}:item;});
                merged = normalizeCartItems([...current, ...resolved]);
            }
            const journal = { token, payload, target: merged, status: 'prepared' };
            localStorage.setItem(key, JSON.stringify(journal));
            // Restoring a saved cart does not purchase items or reserve stock.
            if (JSON.stringify(merged) !== JSON.stringify(current)) await this.persistUserCart(userId, merged, { checkStock: false });
            journal.status = 'applied';
            localStorage.setItem(key, JSON.stringify(journal));
            return merged;
        });
    },

    async removePurchasedCartItems(userId, purchasedItems) {
        const purchased = normalizeCartItems(purchasedItems);
        return queueCartWrite(async () => {
            const current = await this.getUserCart(userId, { waitForWrites: false });
            const remaining = current.map(item => {
                const quantity = item.quantity - (purchased.find(entry => matchesCartItem(item,entry.id))?.quantity || 0);
                return { ...item, quantity, qty: quantity };
            }).filter(item => item.quantity > 0);
            await this.persistUserCart(userId, remaining, { checkStock: false });
            return { success: true };
        });
    },

    async persistUserCart(userId, items) {
        assertCartOwner(userId);
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) throw new Error('Chưa kết nối được giỏ hàng.');
        const lines=[];
        for (const item of items) {
            let id=item.variantId || item.product_variant_id;
            if (!id) {
                const {data,error}=await db.from('product_variant').select('id').eq('product_id',item.id);
                if(error)throw error;
                if(data?.length!==1)throw new Error('Vui lòng chọn đúng phân loại sản phẩm.');
                id=data[0].id;
            }
            lines.push({variant_id:id,quantity:item.quantity});
        }
        const {error}=await db.rpc('own_customer_cart',{p_lines:lines});
        if(error)throw error;
        await this.getUserCart(userId,{waitForWrites:false});
        return {success:true};
    },

    async addToCart(userId, productId, quantity = 1, details = {}) {
        if (!userId) return { success: false, error: 'User not logged in' };
        if (!Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1) throw new Error('Invalid quantity');
        return queueCartWrite(async () => {
            const items = await this.getUserCart(userId, { waitForWrites: false });
            const existing = findCartItem(items,details.variantId || details.product_variant_id || productId);
            if (existing) {
                const nextQuantity = existing.quantity + Number(quantity);
                Object.assign(existing, details, { id: String(productId), quantity: nextQuantity, qty: nextQuantity });
            }
            else items.push({ ...details, id: String(productId), quantity: Number(quantity), qty: Number(quantity) });
            return this.persistUserCart(userId, normalizeCartItems(items));
        });
    },

    async adjustCartQuantity(userId, productId, delta) {
        if (!Number.isSafeInteger(delta) || !delta) throw new Error('Số lượng không hợp lệ.');
        return queueCartWrite(async () => {
            const items = await this.getUserCart(userId, { waitForWrites: false });
            const item = findCartItem(items,productId);
            if (!item) throw new Error('Sản phẩm đã được xóa khỏi giỏ hàng.');
            item.quantity += delta;
            item.qty = item.quantity;
            return this.persistUserCart(userId, normalizeCartItems(items));
        });
    },

    async removeCartProduct(userId, productId) {
        return queueCartWrite(async () => {
            const items = await this.getUserCart(userId, { waitForWrites: false });
            const target=findCartItem(items,productId);
            return this.persistUserCart(userId, items.filter(item=>item!==target), {checkStock:false});
        });
    },

    async updateCartItemQuantity(userId, id, quantity) {
        if(Number(quantity)<=0)return this.removeCartProduct(userId,id);
        return queueCartWrite(async()=>{
            const items=await this.getUserCart(userId,{waitForWrites:false});const item=findCartItem(items,id);
            if(!item)throw new Error('Sản phẩm không còn trong giỏ.');
            item.quantity=Number(quantity);item.qty=item.quantity;return this.persistUserCart(userId,normalizeCartItems(items));
        });
    },
    async removeFromCart(userId,id) { return this.removeCartProduct(userId,id); },
    async clearCart(userId) { return queueCartWrite(()=>this.persistUserCart(userId,[])); },

    async getUserWishlist(userId) {
        const db=window.getSupabaseClient?.() || window.SupabaseClient;
        if(!db?.auth?.getUser)throw Error('Vui lòng đăng nhập để tải yêu thích.');
        const owner=await resolveCustomerId(db,userId),result=await db.rpc('own_wishlist_snapshot');
        if(result.error || result.data?.customer_id!==owner)throw Error('Không thể tải danh sách yêu thích của phiên hiện tại.');
        return result.data;
    },
    async setWishlistItem(userId,itemId,isService,saved) {
        const db=window.getSupabaseClient?.() || window.SupabaseClient;
        if(!db?.auth?.getUser)throw Error('Vui lòng đăng nhập để lưu yêu thích.');
        const owner=await resolveCustomerId(db,userId);
        const result=await db.rpc('set_own_wishlist_item',{p_kind:isService?'service':'product',p_item:itemId,p_saved:Boolean(saved),p_expected_owner:owner});
        if(result.error || result.data!==Boolean(saved))throw Error('Chưa lưu được yêu thích. Vui lòng thử lại hoặc tải lại trang.');
        document.dispatchEvent(new CustomEvent('wishlist_updated'));
        return {success:true,action:saved?'added':'removed'};
    },
    async toggleWishlist(userId,itemId,isService=false) {
        const key=String(userId)+':'+(isService?'service':'product')+':'+itemId;
        if(!wishlistIntents.has(key)){
            const state=await this.getUserWishlist(userId);
            wishlistIntents.set(key,!(isService?state.serviceIds:state.productIds).includes(String(itemId)));
        }
        const result=await this.setWishlistItem(userId,itemId,isService,wishlistIntents.get(key));wishlistIntents.delete(key);return result;
    },

    async getUserById(userId) {
        const users = await this.request('/api/users');
        if (Array.isArray(users)) {
            return users.find(user => sameUserId(user._id || user.id, userId) || sameUserId(user.legacyId, userId)) || null;
        }
        const localUsers = safeReadArray('pawpal_users_db');
        return localUsers.find(user => sameUserId(user.id, userId)) || null;
    },

    async updateUserProfile(userId, newData) {
        const updated = await this.request(`/api/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(newData)
        });

        if (updated) {
            const currentUser = safeReadObject('pawpal_current_user');
            if (currentUser && sameUserId(currentUser.id, userId)) {
                safeWrite('pawpal_current_user', updated);
            }
            return { success: true, data: updated };
        }

        await this.initData();
        const users = safeReadArray('pawpal_users_db');
        const idx = users.findIndex(user => sameUserId(user.id, userId));
        if (idx === -1) {
            return { success: false, message: 'Khong tim thay user' };
        }
        users[idx] = { ...users[idx], ...newData };
        safeWrite('pawpal_users_db', users);
        const currentUser = safeReadObject('pawpal_current_user');
        if (currentUser && sameUser(currentUser, users[idx])) {
            safeWrite('pawpal_current_user', users[idx]);
        }
        return { success: true, data: users[idx] };
    },

    async prepareOwnOrder(orderData) {
        const db=window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if(!db)throw new Error('Chưa kết nối CSDL.');
        if(orderData.voucherCode && Number(orderData.pointsUsed)>0)throw new Error('Vui lòng chọn dùng mã ưu đãi hoặc đổi điểm cho đơn này.');
        const details={delivery:true,delivery_option_id:orderData.shipping.deliveryMethod,
            receiver_name:orderData.shipping.name,receiver_phone:orderData.shipping.phone,
            province:orderData.shipping.city,street_address:[orderData.shipping.address,orderData.shipping.district].filter(Boolean).join(', '),
            note:orderData.shipping.note||'',discount_mode:orderData.voucherCode?'voucher':Number(orderData.pointsUsed)>0?'points':'none',
            voucher_code:orderData.voucherCode||'',points:Number(orderData.pointsUsed)||0};
        const lines=orderData.items.map(item=>({variant_id:item.variantId||item.product_variant_id,quantity:Number(item.quantity??item.qty)}));
        if(lines.some(l=>!l.variant_id))throw new Error('Vui lòng chọn đúng phân loại sản phẩm.');
        const {data,error}=await db.rpc('quote_own_sales_order',{p_details:details,p_lines:lines});if(error)throw error;
        return {quote:data,details,lines};
    },
    async submitOrder(orderData) {
        try {
            const db=window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            const prepared=orderData._prepared;
            if(!prepared?.quote?.version)throw new Error('Vui lòng kiểm tra lại báo giá trước khi đặt hàng.');
            const {data,error}=await db.rpc('create_own_sales_order',{p_id:orderData.requestId,p_expected_quote:prepared.quote.version,
                p_details:prepared.details,p_lines:prepared.lines,p_payment_method:orderData.payment.configId});
            if(error)throw error;
            return {success:true,orderId:data};
        } catch(error){return {success:false,error};}
    },

    async updateOrderPaymentStatus() {
        throw new Error('Thanh toán cần nhân viên xác nhận; khách hàng không tự đánh dấu đã trả tiền.');
    },

    async updateOrderStatus() {
        return {success:false,error:new Error('Vui lòng dùng thao tác hủy hoặc nhận hàng có kiểm tra phiên bản đơn.')};
    },

    async getVouchers() {
        try {
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!db) {
                console.error('[API] Supabase Client not initialized');
                return [];
            }
            
            const { data, error } = await db.from('voucher')
                .select('*')
                
            if (error) throw error;
            
            const mappedVouchers = (data || []).map(v => {
                const maxDiscount = null;
                return {
                    id: v.id,
                    code: v.voucher_code,
                    name: v.voucher_name || v.voucher_code,
                    type: (String(v.type || 'percentage').toLowerCase() === 'percent' ? 'percentage' : String(v.type || 'percentage').toLowerCase()),
                    value: v.discount_value || 0,
                    minOrderValue: v.minimum_order_amount || 0,
                    maxDiscount: maxDiscount,
                    pointsCost: v.required_points || 0,
                    validFrom: v.start_date,
                    validUntil: v.end_date,
                    usageCount: v.usage_count || 0,
                    maxUsage: v.max_usage,
                    applicableFor: v.applicable_for || ['all'],
                    description: v.description,
                    is_active: v.is_active,
                    active: v.is_active === true,

                };
            });
            
            return mappedVouchers;
        } catch (err) {
            console.error('[API] Error fetching vouchers from Supabase:', err);
            return [];
        }
    },

    async getDeliveryOptions() {
        const db=window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if(!db)throw new Error('Chưa kết nối cấu hình giao hàng.');
        const {data,error}=await db.rpc('customer_shop_options');if(error)throw error;
        return (data.delivery_options||[]).map(d=>({...d,fee:Number(d.fee),estimatedDays:d.estimated_days}));
    },
    async getPaymentMethods() {
        const db=window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if(!db)throw new Error('Chưa kết nối cấu hình thanh toán.');
        const {data,error}=await db.rpc('customer_shop_options');if(error)throw error;
        return (data.payment_methods||[]).map(m=>({...m,configId:m.id,shortName:m.short_name,bankInfo:m.bank_info}));
    },

    async releaseExpiredHoldSlots() {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return;
        try {
            const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            await db.from('appointment')
                .update({ appointment_status: 'da_het_han' })
                .eq('appointment_status', 'dang_giu_cho')
                .lt('created_at', fifteenMinsAgo);
        } catch (e) {
            console.warn('[API] releaseExpiredHoldSlots error:', e);
        }
    },

    async checkSlotAvailability(serviceId, date, time, staffId = null) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return { available: true };
        try {
            await this.releaseExpiredHoldSlots();
            const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            const cleanTime = time.length === 5 ? time : time.slice(0, 5);
            const slotStart = new Date(`${date}T${cleanTime}:00+07:00`).toISOString();

            let query = db.from('appointment')
                .select('id, appointment_status, created_at, scheduled_start_at')
                .eq('scheduled_start_at', slotStart)
                .not('appointment_status', 'in', '("da_huy","da_het_han")');

            if (staffId) query = query.eq('staff_id', staffId);

            const { data, error } = await query;
            if (error) throw error;

            const activeHold = (data || []).find(row => {
                if (row.appointment_status === 'dang_giu_cho') {
                    return row.created_at && row.created_at > fifteenMinsAgo;
                }
                return ['cho_xac_nhan', 'da_xac_nhan', 'da_check_in', 'dang_thuc_hien'].includes(row.appointment_status);
            });

            return { available: !activeHold, conflictBooking: activeHold || null };
        } catch (err) {
            console.warn('[API] checkSlotAvailability failed:', err);
            return { available: true };
        }
    },

    async holdAppointmentSlot({ customerId, petId, serviceId, staffId, date, time, totalPrice = 0, note = '' }) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return { success: false, error: 'No DB connection' };
        try {
            const check = await this.checkSlotAvailability(serviceId, date, time, staffId);
            if (!check.available) {
                return { success: false, error: 'Khung giờ này vừa có người giữ chỗ hoặc đã được đặt. Vui lòng chọn giờ khác.' };
            }

            const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            const appointmentCode = 'APT-' + Math.floor(100000 + Math.random() * 900000);
            const cleanTime = time.length === 5 ? time : time.slice(0, 5);
            const startIso = new Date(`${date}T${cleanTime}:00+07:00`).toISOString();
            const endIso = new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();

            const insertPayload = {
                appointment_code: appointmentCode,
                customer_id: customerId,
                pet_id: petId,
                staff_id: staffId || null,
                scheduled_start_at: startIso,
                scheduled_end_at: endIso,
                appointment_status: 'dang_giu_cho',
                note: note
            };

            const { data, error } = await db.from('appointment').insert([insertPayload]).select('*').single();
            if (error) throw error;

            if (serviceId && data?.id) {
                await db.from('appointment_item').insert([{
                    appointment_id: data.id,
                    service_id: serviceId,
                    name_snapshot: 'Dịch vụ PawPal',
                    unit_price: totalPrice,
                    quantity: 1,
                    duration_minutes: 60,
                    is_primary: true
                }]);
            }

            return { success: true, booking: data, expiresAt: holdExpiresAt };
        } catch (err) {
            console.error('[API] holdAppointmentSlot failed:', err);
            return { success: false, error: err.message };
        }
    },

    async confirmHeldSlot(appointmentId, isDepositPaid = false) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return { success: false };
        try {
            const newStatus = isDepositPaid ? 'da_xac_nhan' : 'cho_xac_nhan';

            const { data, error } = await db.from('appointment')
                .update({
                    appointment_status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', appointmentId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error('[API] confirmHeldSlot failed:', err);
            return { success: false, error: err.message };
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 2: CƠ CHẾ GIỮ TỒN KHO 15 PHÚT (STOCK RESERVATION)
       ========================================================================== */
    async releaseExpiredStockReservations() {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return;
        try {
            const now = new Date().toISOString();
            await db.from('stock_reservation')
                .update({ status: 'da_het_han', updated_at: now })
                .eq('status', 'dang_giu')
                .lt('expires_at', now);
        } catch (e) {
            // bỏ qua nếu bảng chưa tạo
        }
    },

    async getAvailableStock(productVariantId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return 99;
        try {
            await this.releaseExpiredStockReservations();
            const { data: inv } = await db.from('inventory').select('quantity_in_stock').eq('product_variant_id', productVariantId).maybeSingle();
            const totalStock = inv?.quantity_in_stock || 0;

            const now = new Date().toISOString();
            const { data: res } = await db.from('stock_reservation')
                .select('quantity')
                .eq('product_variant_id', productVariantId)
                .eq('status', 'dang_giu')
                .gt('expires_at', now);

            const reservedQty = (res || []).reduce((sum, r) => sum + Number(r.quantity || 0), 0);
            return Math.max(0, totalStock - reservedQty);
        } catch (err) {
            return 99;
        }
    },

    async reserveStock(cartId, customerId, items) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !items?.length) return { success: true };
        try {
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            const rows = items.map(it => ({
                product_variant_id: it.variantId || it.id,
                customer_id: customerId,
                cart_id: cartId,
                quantity: it.quantity || it.qty || 1,
                reserved_at: new Date().toISOString(),
                expires_at: expiresAt,
                status: 'dang_giu'
            }));

            await db.from('stock_reservation').insert(rows);
            return { success: true, expiresAt };
        } catch (err) {
            console.warn('[API] reserveStock skipped or failed:', err.message);
            return { success: true };
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 2: CARE LOG & CARE LOG MEDIA
       ========================================================================== */
    async getPetCareLogs(petId, appointmentId = null) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !petId) return [];
        try {
            let query = db.from('care_log')
                .select(`
                    id, description, health_status, recorded_at, created_at,
                    care_log_media ( id, media_type, media_url, file_name ),
                    care_action ( action_name, service_category )
                `)
                .eq('pet_id', petId)
                .order('recorded_at', { ascending: false });

            if (appointmentId) query = query.eq('appointment_id', appointmentId);

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.warn('[API] getPetCareLogs failed:', err.message);
            return [];
        }
    },

    async addCareLogEntry({ appointmentId, petId, careActionId, description, healthStatus, mediaUrls = [], staffId = null }) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return { success: false };
        try {
            const logPayload = {
                appointment_id: appointmentId,
                pet_id: petId,
                care_action_id: careActionId || null,
                description,
                health_status: healthStatus || 'bình thường',
                recorded_at: new Date().toISOString()
            };

            const { data: newLog, error } = await db.from('care_log').insert([logPayload]).select().single();
            if (error) throw error;

            if (mediaUrls.length > 0 && newLog?.id) {
                const mediaRows = mediaUrls.map(url => ({
                    care_log_id: newLog.id,
                    media_type: url.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'hinh_anh',
                    media_url: url,
                    staff_id: staffId,
                    uploaded_at: new Date().toISOString()
                }));
                await db.from('care_log_media').insert(mediaRows);
            }

            return { success: true, data: newLog };
        } catch (err) {
            console.error('[API] addCareLogEntry error:', err);
            return { success: false, error: err.message };
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 2: REVIEW RESPONSE (PHẢN HỒI ĐÁNH GIÁ CỦA ADMIN)
       ========================================================================== */
    async getReviewResponses(reviewId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !reviewId) return [];
        try {
            const { data, error } = await db.from('review_response')
                .select('*, staff(full_name)')
                .eq('review_id', reviewId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (e) {
            return [];
        }
    },

    async addReviewResponse(reviewId, staffId, responseContent) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return { success: false };
        try {
            const payload = {
                review_id: reviewId,
                staff_id: staffId,
                response_content: responseContent,
                created_at: new Date().toISOString()
            };
            const { data, error } = await db.from('review_response').insert([payload]).select().single();
            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error('[API] addReviewResponse failed:', err);
            return { success: false, error: err.message };
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 3: CẤU HÌNH HỆ THỐNG ĐỘNG (PAWPAL_SETTING)
       ========================================================================== */
    async getSetting(key, fallback = null) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !key) return fallback;
        try {
            const { data, error } = await db.from('pawpal_setting')
                .select('setting_value, setting_type')
                .eq('setting_key', key)
                .maybeSingle();

            if (error || !data) return fallback;
            const val = data.setting_value;
            if (data.setting_type === 'json') {
                try { return JSON.parse(val); } catch { return val; }
            }
            if (data.setting_type === 'so' || data.setting_type === 'number') return Number(val);
            if (data.setting_type === 'boolean') return val === 'true' || val === '1';
            return val;
        } catch (e) {
            return fallback;
        }
    },

    async getAllSettings() {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return {};
        try {
            const { data, error } = await db.from('pawpal_setting').select('*');
            if (error) throw error;
            const map = {};
            (data || []).forEach(row => {
                let val = row.setting_value;
                if (row.setting_type === 'json') {
                    try { val = JSON.parse(val); } catch {}
                } else if (row.setting_type === 'so' || row.setting_type === 'number') {
                    val = Number(val);
                } else if (row.setting_type === 'boolean') {
                    val = val === 'true' || val === '1';
                }
                map[row.setting_key] = val;
            });
            return map;
        } catch (e) {
            return {};
        }
    },

    async updateSetting(key, value, type = 'chuoi', description = '') {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !key) return { success: false };
        try {
            const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
            const payload = {
                setting_key: key,
                setting_value: strVal,
                setting_type: type,
                description,
                updated_at: new Date().toISOString()
            };
            const { data, error } = await db.from('pawpal_setting')
                .upsert(payload, { onConflict: 'setting_key' })
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (e) {
            console.error('[API] updateSetting error:', e);
            return { success: false, error: e.message };
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 3: QUẢN LÝ PHÒNG VẬT LÝ HOTEL (HOTEL_ROOM & HOTEL_ROOM_TYPE)
       ========================================================================== */
    async getHotelRooms(status = null) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return [];
        try {
            let query = db.from('hotel_room')
                .select('*, hotel_room_type(room_type, capacity, daily_price, amenities)')
                .order('room_number', { ascending: true });

            if (status) query = query.eq('status', status);
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('[API] getHotelRooms error:', e);
            return [];
        }
    },

    async updateHotelRoomStatus(roomId, status, description = null) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !roomId) return { success: false };
        try {
            const payload = {
                status,
                updated_at: new Date().toISOString()
            };
            if (description !== null) payload.description = description;

            const { data, error } = await db.from('hotel_room').update(payload).eq('id', roomId).select().single();
            if (error) throw error;
            return { success: true, data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 3: BẢNG GIÁ VÀ TÍNH CƯỚC PET TAXI (TAXI_PRICE_RULE)
       ========================================================================== */
    async getTaxiPriceRules() {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return [];
        try {
            const { data, error } = await db.from('taxi_price_rule')
                .select('*')
                .eq('status', 'dang_ap_dung')
                .order('distance_from', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (e) {
            return [];
        }
    },

    async calculateTaxiFare(distanceKm, petWeightKg = 5) {
        try {
            const rules = await this.getTaxiPriceRules();
            if (!rules.length) {
                // Fallback default formula: 50,000đ base (0-3km) + 12,000đ/km tiếp theo
                const base = 50000;
                const extraKm = Math.max(0, distanceKm - 3);
                const surchargeWeight = petWeightKg > 10 ? (petWeightKg - 10) * 5000 : 0;
                return base + (extraKm * 12000) + surchargeWeight;
            }

            const match = rules.find(r => 
                distanceKm >= Number(r.distance_from) && 
                (r.distance_to === null || distanceKm <= Number(r.distance_to)) &&
                petWeightKg >= Number(r.weight_from || 0) &&
                (r.weight_to === null || petWeightKg <= Number(r.weight_to))
            );

            if (match) {
                return Number(match.base_price || 0) + Number(match.surcharge || 0);
            }

            return Number(rules[0].base_price || 60000);
        } catch (e) {
            return 50000;
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 3: ĐỐI TÁC GIAO VẬN VÀ PHƯƠNG THỨC THANH TOÁN (LIVE SUPABASE)
       ========================================================================== */
    async getShippingProviders() {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return [];
        try {
            const { data, error } = await db.from('shipping_provider')
                .select('*')
                .eq('status', 'dang_hoat_dong')
                .order('provider_name', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (e) {
            return [];
        }
    },

    async getDeliveryOptions() {
        try {
            const providers = await this.getShippingProviders();
            if (providers && providers.length > 0) {
                return providers.map(p => {
                    const feeVal = Number(p.base_fee !== undefined ? p.base_fee : 30000);
                    return {
                        id: p.provider_code || p.id,
                        name: p.provider_name,
                        fee: isNaN(feeVal) ? 30000 : feeVal,
                        price: isNaN(feeVal) ? 30000 : feeVal,
                        estimatedDays: p.estimated_days ? [p.estimated_days, p.estimated_days] : [2, 3],
                        estimatedTime: p.estimated_days ? `${p.estimated_days} ngày` : '2-3 ngày',
                        description: p.note || 'Giao hàng tiêu chuẩn toàn quốc',
                        available: true,
                        icon: 'truck'
                    };
                });
            }
        } catch (e) {}

        // Dynamic fallback from settings or standard options
        return [
            { id: 'standard', name: 'Giao hàng tiêu chuẩn', fee: 30000, price: 30000, estimatedDays: [2, 3], estimatedTime: '2-3 ngày', description: 'Giao hàng tiết kiệm toàn quốc', available: true, icon: 'truck' },
            { id: 'express', name: 'Giao hàng hỏa tốc 2H', fee: 50000, price: 50000, estimatedDays: [1, 1], estimatedTime: '2 giờ', description: 'Áp dụng nội thành TP.HCM', available: true, icon: 'truck' }
        ];
    },

    async getPaymentMethods() {
        try {
            const config = await this.getSetting('payment_gateways', null);
            if (config && typeof config === 'object') {
                const methods = [];
                if (config.cod_enabled !== false) {
                    methods.push({ id: 'cod', name: 'Thanh toán khi nhận hàng (COD)', description: 'Thanh toán bằng tiền mặt khi shipper giao hàng', icon: 'cash' });
                }
                if (config.vnpay_enabled !== false) {
                    methods.push({ id: 'vnpay', name: 'Thanh toán qua VNPAY-QR', description: 'Thẻ ATM, Visa/Mastercard hoặc ứng dụng Ngân hàng', icon: 'vnpay' });
                }
                if (config.bank_transfer_enabled) {
                    methods.push({ id: 'bank_transfer', name: 'Chuyển khoản Ngân hàng', description: 'Chuyển khoản trực tiếp vào tài khoản ngân hàng Pawpal', icon: 'bank' });
                }
                if (methods.length > 0) return methods;
            }
        } catch (e) {}

        return [
            { id: 'cod', name: 'Thanh toán khi nhận hàng (COD)', description: 'Thanh toán tiền mặt khi nhận hàng', icon: 'cash' },
            { id: 'vnpay', name: 'Cổng thanh toán VNPAY-QR / Thẻ', description: 'Hỗ trợ thẻ ATM, Visa, Mastercard, VNPAY-QR', icon: 'vnpay' }
        ];
    },

    /* ==========================================================================
       GIAI ĐOẠN 4: QUẢN LÝ KHO VẬN 2 LỚP & BIẾN ĐỘNG KHO (INVENTORY_TRANSACTION)
       ========================================================================== */
    async getInventoryLevels() {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return [];
        try {
            const { data, error } = await db.from('inventory')
                .select('*, product_variant(id, sku_variant, sale_price, product(id, product_name, category_id))')
                .order('last_updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('[API] getInventoryLevels error:', e);
            return [];
        }
    },

    async recordInventoryTransaction({ productVariantId, purchaseOrderId = null, transactionType, quantity, staffId = null, note = '' }) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !productVariantId || !transactionType || !quantity) return { success: false, message: 'Thiếu dữ liệu kho' };

        try {
            // 1. Lấy tồn kho hiện tại
            const { data: currentInv, error: invErr } = await db.from('inventory')
                .select('*')
                .eq('product_variant_id', productVariantId)
                .maybeSingle();

            if (invErr) throw invErr;

            const stockBefore = currentInv ? Number(currentInv.quantity_in_stock || 0) : 0;
            let stockAfter = stockBefore;

            if (transactionType === 'nhap_kho' || transactionType === 'dieu_chinh_tang' || transactionType === 'hoan_kho') {
                stockAfter = stockBefore + Number(quantity);
            } else if (transactionType === 'xuat_kho' || transactionType === 'dieu_chinh_giam') {
                stockAfter = Math.max(0, stockBefore - Number(quantity));
            }

            // 2. Cập nhật bảng inventory
            const now = new Date().toISOString();
            if (currentInv) {
                await db.from('inventory').update({
                    quantity_in_stock: stockAfter,
                    last_updated_at: now
                }).eq('id', currentInv.id);
            } else {
                await db.from('inventory').insert([{
                    product_variant_id: productVariantId,
                    quantity_in_stock: stockAfter,
                    minimum_stock: 5,
                    quantity_reserved: 0,
                    last_updated_at: now
                }]);
            }

            // 3. Ghi log lịch sử biến động kho
            const { data: txData, error: txErr } = await db.from('inventory_transaction').insert([{
                product_variant_id: productVariantId,
                purchase_order_id: purchaseOrderId,
                transaction_type: transactionType,
                quantity: Number(quantity),
                stock_before: stockBefore,
                stock_after: stockAfter,
                note,
                staff_id: staffId,
                created_at: now
            }]).select().single();

            if (txErr) throw txErr;
            return { success: true, data: txData, stockBefore, stockAfter };
        } catch (e) {
            console.error('[API] recordInventoryTransaction error:', e);
            return { success: false, error: e.message };
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 4: ĐỔI TRẢ HÀNG & HẬU MÃI RMA (RETURN_REQUEST & RETURN_DETAIL)
       ========================================================================== */
    async getReturnRequests({ customerId = null, orderId = null, status = null } = {}) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return [];
        try {
            let query = db.from('return_request')
                .select('*, return_request_detail(*, product_variant(id, sku_variant, sale_price)), sales_order(id, order_code, customer(id, customer_profile(full_name), customer_phone(phone_number, is_primary)))')
                .order('created_at', { ascending: false });

            if (customerId) query = query.eq('customer_id', customerId);
            if (orderId) query = query.eq('sales_order_id', orderId);
            if (status) query = query.eq('request_status', status);

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('[API] getReturnRequests error:', e);
            return [];
        }
    },

    async createReturnRequest({ salesOrderId, customerId, returnType = 'doi_san_pham', reason, description = '', evidenceImages = [], items = [] }) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !salesOrderId || !customerId || !reason) return { success: false, message: 'Thiếu thông tin yêu cầu đổi trả' };

        try {
            const now = new Date().toISOString();
            // 1. Tạo bản ghi return_request
            const { data: request, error: reqErr } = await db.from('return_request').insert([{
                sales_order_id: salesOrderId,
                customer_id: customerId,
                return_type: returnType,
                reason,
                description,
                evidence_images: evidenceImages,
                request_status: 'cho_xu_ly',
                created_at: now,
                updated_at: now
            }]).select().single();

            if (reqErr) throw reqErr;

            // 2. Tạo các dòng chi tiết return_request_detail nếu có
            if (items && items.length > 0) {
                const details = items.map(item => ({
                    return_request_id: request.id,
                    product_variant_id: item.productVariantId,
                    quantity: Number(item.quantity || 1),
                    unit_price: Number(item.unitPrice || 0)
                }));
                const { error: detErr } = await db.from('return_request_detail').insert(details);
                if (detErr) console.warn('[API] return_request_detail insert warning:', detErr);
            }

            // 3. Tự động gửi thông báo hệ thống cho khách hàng
            await this.createSystemNotification({
                customerId,
                type: 'cap_nhat_yeu_cau_ho_tro',
                title: 'Yêu cầu đổi trả đã được tiếp nhận',
                content: `Yêu cầu ${returnType === 'doi_san_pham' ? 'đổi sản phẩm' : 'trả hàng/hoàn tiền'} cho đơn hàng đã được gửi thành công và đang chờ chuyên viên xử lý.`,
                orderId: salesOrderId
            });

            return { success: true, data: request };
        } catch (e) {
            console.error('[API] createReturnRequest error:', e);
            return { success: false, error: e.message };
        }
    },

    async updateReturnRequestStatus(requestId, { requestStatus, resolutionType = null, refundAmount = 0, resolvedBy = null, restockItems = false }) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !requestId) return { success: false };

        try {
            const now = new Date().toISOString();
            const payload = {
                request_status: requestStatus,
                updated_at: now
            };
            if (resolutionType) payload.resolution_type = resolutionType;
            if (refundAmount > 0) payload.refund_amount = refundAmount;
            if (resolvedBy) payload.resolved_by = resolvedBy;

            const { data: updatedReq, error } = await db.from('return_request')
                .update(payload)
                .eq('id', requestId)
                .select('*, return_request_detail(*)')
                .single();

            if (error) throw error;

            // Nếu chấp nhận hoàn kho (restock), tự động ghi nhận inventory_transaction
            if (restockItems && updatedReq.return_request_detail?.length > 0) {
                for (const item of updatedReq.return_request_detail) {
                    if (item.product_variant_id && item.quantity > 0) {
                        await this.recordInventoryTransaction({
                            productVariantId: item.product_variant_id,
                            transactionType: 'hoan_kho',
                            quantity: item.quantity,
                            staffId: resolvedBy,
                            note: `Hoàn kho từ yêu cầu đổi trả RMA #${requestId.substring(0, 8)}`
                        });
                    }
                }
            }

            if (updatedReq?.customer_id) {
                try {
                    const isApproved = requestStatus === 'da_duyet' || requestStatus === 'approved';
                    const isCompleted = requestStatus === 'da_hoan_tat' || requestStatus === 'completed';
                    const isRejected = requestStatus === 'da_tu_choi' || requestStatus === 'rejected';
                    let notiTitle = 'Cập nhật yêu cầu đổi trả';
                    let notiContent = `Yêu cầu đổi trả #${requestId.slice(0, 8)} đã được cập nhật trạng thái: ${requestStatus}.`;
                    if (isApproved) {
                        notiTitle = 'Yêu cầu đổi trả đã được duyệt';
                        notiContent = `Yêu cầu đổi trả #${requestId.slice(0, 8)} của bạn đã được chấp thuận.`;
                    } else if (isCompleted) {
                        notiTitle = 'Yêu cầu đổi trả đã hoàn tất';
                        notiContent = `Yêu cầu đổi trả #${requestId.slice(0, 8)} đã hoàn tất xử lý.`;
                    } else if (isRejected) {
                        notiTitle = 'Yêu cầu đổi trả bị từ chối';
                        notiContent = `Yêu cầu đổi trả #${requestId.slice(0, 8)} không được chấp thuận. Vui lòng liên hệ CSKH để biết thêm chi tiết.`;
                    }
                    await this.createSystemNotification({
                        customerId: updatedReq.customer_id,
                        type: 'cap_nhat_yeu_cau_ho_tro',
                        title: notiTitle,
                        content: notiContent,
                        orderId: updatedReq.sales_order_id
                    });
                } catch (notiErr) {
                    console.warn('[API] Return status notification warning:', notiErr);
                }
            }

            return { success: true, data: updatedReq };
        } catch (e) {
            console.error('[API] updateReturnRequestStatus error:', e);
            return { success: false, error: e.message };
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 4: HỖ TRỢ KHÁCH HÀNG & KHIẾU NẠI (SUPPORT_TICKET & TICKET_MESSAGE)
       ========================================================================== */
    async getSupportTickets({ customerId = null, status = null, priority = null } = {}) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return [];
        try {
            let query = db.from('support_ticket')
                .select('*, support_ticket_message(*), customer(id, contact_email, customer_profile(full_name), customer_phone(phone_number, is_primary))')
                .order('created_at', { ascending: false });

            if (customerId) query = query.eq('customer_id', customerId);
            if (status) query = query.eq('status', status);
            if (priority) query = query.eq('priority', priority);

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('[API] getSupportTickets error:', e);
            return [];
        }
    },

    async createSupportTicket({ customerId, orderId = null, appointmentId = null, channel = 'web', category = 'khac', subject, description, priority = 'trung_binh', requestedResolution = null, requestedAmount = null }) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !customerId || !subject || !description) return { success: false, message: 'Thiếu thông tin ticket' };

        try {
            const ticketCode = `TK-${Date.now().toString(36).toUpperCase().slice(-6)}`;
            const now = new Date().toISOString();

            const { data, error } = await db.from('support_ticket').insert([{
                ticket_code: ticketCode,
                customer_id: customerId,
                order_id: orderId,
                appointment_id: appointmentId,
                channel,
                category,
                subject,
                description,
                priority,
                status: 'mo',
                requested_resolution: requestedResolution,
                requested_amount: requestedAmount,
                created_at: now,
                updated_at: now
            }]).select().single();

            if (error) throw error;
            return { success: true, data };
        } catch (e) {
            console.error('[API] createSupportTicket error:', e);
            return { success: false, error: e.message };
        }
    },

    async addTicketMessage({ ticketId, senderType = 'khach_hang', senderId = null, content, attachmentUrls = [], isInternal = false }) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !ticketId || !content) return { success: false };

        try {
            const now = new Date().toISOString();
            const { data, error } = await db.from('support_ticket_message').insert([{
                ticket_id: ticketId,
                sender_type: senderType,
                sender_id: senderId,
                content,
                attachment_urls: attachmentUrls,
                is_internal: isInternal,
                created_at: now
            }]).select().single();

            if (error) throw error;

            // Cập nhật updated_at cho ticket và ghi nhận first_response_at nếu nhân viên phản hồi lần đầu
            const isStaffReply = ['cskh', 'nhan_vien', 'admin', 'staff'].includes(senderType) && !isInternal;
            if (isStaffReply) {
                await db.from('support_ticket').update({
                    updated_at: now,
                    first_response_at: now
                }).eq('id', ticketId).is('first_response_at', null);
            } else {
                await db.from('support_ticket').update({ updated_at: now }).eq('id', ticketId);
            }

            return { success: true, data };
        } catch (e) {
            console.error('[API] addTicketMessage error:', e);
            return { success: false, error: e.message };
        }
    },

    async resolveSupportTicket(ticketId, {
        status = 'completed',
        resolutionType = null,
        resolutionNote = null,
        investigationNote = null,
        approvedAmount = 0,
        resolvedBy = null,
        closedAt = null
    } = {}) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !ticketId) return { success: false };

        try {
            const now = new Date().toISOString();
            const payload = {
                status,
                updated_at: now
            };
            if (resolutionType) payload.resolution_type = resolutionType;
            if (resolutionNote) payload.resolution_note = resolutionNote;
            if (investigationNote) payload.investigation_note = investigationNote;
            if (approvedAmount > 0) payload.approved_amount = approvedAmount;
            if (resolvedBy) payload.resolved_by = resolvedBy;
            if (status === 'completed' || status === 'resolved') {
                payload.resolved_at = now;
                payload.closed_at = closedAt || now;
            }

            const { data, error } = await db.from('support_ticket')
                .update(payload)
                .eq('id', ticketId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (e) {
            console.error('[API] resolveSupportTicket error:', e);
            return { success: false, error: e.message };
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 4: THÔNG BÁO HỆ THỐNG & TRUY VẾT NHẬT KÝ (NOTIFICATION & AUDIT_LOG)
       ========================================================================== */
    async getUserNotifications(customerId,limit=20){
        const db=window.getSupabaseClient?.() || window.SupabaseClient,owner=await resolveCustomerId(db,customerId);
        const result=await db.rpc('own_notifications_snapshot');if(result.error || result.data?.customer_id!==owner)throw Error('Không thể tải thông báo.');return result.data.rows.slice(0,Math.max(1,Math.min(500,limit)));
    },
    async markNotificationAsRead(id){
        const db=window.getSupabaseClient?.() || window.SupabaseClient,result=await db.rpc('mark_own_notifications_read',{p_id:id});
        if(result.error)throw Error('Chưa đánh dấu được thông báo.');document.dispatchEvent(new CustomEvent('notifications_updated'));return {success:true};
    },
    async markAllNotificationsAsRead(customerId){
        const db=window.getSupabaseClient?.() || window.SupabaseClient,owner=await resolveCustomerId(db,customerId),snapshot=await db.rpc('own_notifications_snapshot');if(snapshot.error || snapshot.data?.customer_id!==owner)throw Error('Không thể tải thông báo.');
        const result=await db.rpc('mark_own_notifications_read',{p_id:null,p_before:snapshot.data.snapshot_at,p_expected_owner:owner});if(result.error)throw Error('Chưa đánh dấu được thông báo.');document.dispatchEvent(new CustomEvent('notifications_updated'));return {success:true};
    },
    async createSystemNotification(){return {success:false,error:'Thông báo được tạo qua nghiệp vụ trên máy chủ.'};},

    async recordAuditLog({ staffId, action, entityName, entityId, description = '' }) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !action || !entityName || !entityId) return { success: false };
        try {
            const { data, error } = await db.from('audit_log').insert([{
                staff_id: staffId,
                action,
                entity_name: entityName,
                entity_id: entityId,
                description,
                created_at: new Date().toISOString()
            }]).select().single();

            if (error) throw error;
            return { success: true, data };
        } catch (e) {
            console.warn('[API] recordAuditLog warning:', e);
            return { success: false };
        }
    }
};

function safeReadArray(key) {
    if (window.PawpalStorage) {
        return window.PawpalStorage.get(key, []);
    }
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
    } catch (error) {
        return [];
    }
}

function safeReadObject(key) {
    if (window.PawpalStorage) {
        return window.PawpalStorage.get(key, null);
    }
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        return value && typeof value === 'object' ? value : null;
    } catch (error) {
        return null;
    }
}

function safeWrite(key, value) {
    if (window.PawpalStorage) {
        return window.PawpalStorage.set(key, value);
    }
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (error) {
        console.error(error);
    }
}

function mergeById(seedItems, localItems) {
    const merged = new Map();
    (Array.isArray(localItems) ? localItems : []).forEach(item => {
        if (item && item.id) merged.set(String(item.id), item);
    });
    (Array.isArray(seedItems) ? seedItems : []).forEach(item => {
        if (item && item.id) {
            const local = merged.get(String(item.id));
            if (local) {
                merged.set(String(item.id), {
                    ...item,
                    status:      local.status      ?? item.status,
                    date:        local.date        ?? item.date,
                    time:        local.time        ?? item.time,
                    timeStart:   local.timeStart   ?? item.timeStart,
                    timeEnd:     local.timeEnd     ?? item.timeEnd,
                    staff:       local.staff       ?? item.staff,
                    changeCount: local.changeCount ?? item.changeCount,
                    cancelCount: local.cancelCount ?? item.cancelCount,
                    note:        local.note        ?? item.note,
                    pointsAwarded: local.pointsAwarded ?? item.pointsAwarded,
                    pointsEarned:  local.pointsEarned  ?? item.pointsEarned,
                });
            } else {
                merged.set(String(item.id), item);
            }
        }
    });
    return Array.from(merged.values());
}

function mergeCareLogs(seedLogs, localLogs) {
    const result = { ...(localLogs && typeof localLogs === 'object' ? localLogs : {}) };
    if (seedLogs && typeof seedLogs === 'object') {
        Object.keys(seedLogs).forEach(petId => {
            result[petId] = seedLogs[petId];
        });
    }
    return result;
}

function normalizeOrders(orders) {
    return (Array.isArray(orders) ? orders : []).map(order => {
        const subtotal = toNumber(order?.pricing?.subtotal);
        const shippingFee = toNumber(order?.pricing?.shippingFee);
        const discount = toNumber(order?.pricing?.discount);
        const itemTotals = Array.isArray(order?.products)
            ? order.products.reduce((sum, item) => sum + toNumber(item?.total, toNumber(item?.price) * toNumber(item?.quantity, 1)), 0)
            : 0;
        const resolvedSubtotal = subtotal > 0 ? subtotal : itemTotals;
        const resolvedTotal = toNumber(order?.pricing?.total, resolvedSubtotal + shippingFee - discount);

        return {
            ...order,
            products: Array.isArray(order?.products)
                ? order.products.map(item => ({
                    ...item,
                    quantity: toNumber(item?.quantity, 1),
                    price: toNumber(item?.price),
                    total: toNumber(item?.total, toNumber(item?.price) * toNumber(item?.quantity, 1))
                }))
                : [],
            pricing: {
                ...(order?.pricing || {}),
                subtotal: resolvedSubtotal,
                shippingFee,
                discount,
                total: resolvedTotal > 0 ? resolvedTotal : Math.max(0, resolvedSubtotal + shippingFee - discount)
            }
        };
    });
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function sameUser(user, currentUser) {
    return sameUserId(user.id, currentUser.id)
        || (user.phone && currentUser.phone && String(user.phone) === String(currentUser.phone));
}

function sameUserId(a, b) {
    return a != null && b != null && String(a) === String(b);
}

API.initData();

window.API = API;
