
async function resolveCustomerId(db, userOrId) {
    if (!db || !userOrId) return null;
    if (typeof userOrId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userOrId)) {
        return userOrId;
    }
    let phone = null;
    let email = null;
    if (typeof userOrId === 'object' && userOrId !== null) {
        if (userOrId.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userOrId.id)) {
            return userOrId.id;
        }
        phone = userOrId.phone || userOrId.phone_main || null;
        email = userOrId.email || null;
    } else if (typeof userOrId === 'string') {
        if (/^\d{8,12}$/.test(userOrId)) {
            phone = userOrId;
        } else {
            try {
                const cur = JSON.parse(localStorage.getItem('pawpal_current_user') || '{}');
                if (cur) {
                    if (cur.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cur.id)) {
                        return cur.id;
                    }
                    phone = cur.phone || cur.phone_main || null;
                    email = cur.email || null;
                }
            } catch (e) {}
        }
    }

    if (phone || email) {
        let query = db.from('customer').select('id').limit(1);
        if (phone) query = query.eq('phone_main', phone);
        else if (email) query = query.eq('email', email);
        const { data, error } = await query;
        if (!error && data?.length) {
            return data[0].id;
        }
    }
    return null;
}

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
                image: p.image_url || '/assets/images/placeholder.webp'
            }));
        } catch (err) {
            console.error('[API] Supabase getUserPets failed:', err);
            return [];
        }
    },

    async getUserBookings(userOrId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userOrId) return [];
        try {
            const customerId = await resolveCustomerId(db, userOrId);
            if (!customerId) return [];

            const { data, error } = await db
                .from('appointment')
                .select(`
                    id, appointment_code, appointment_date, appointment_time,
                    appointment_status, payment_status, note, change_count, total_price,
                    service ( 
                        service_name, service_category, estimated_duration,
                        service_price_matrix ( unit_price )
                    ),
                    pet_profile ( id, pet_code, pet_name, breed, species, image_url )
                `)
                .eq('customer_id', customerId)
                .order('appointment_date', { ascending: false });
                
            if (error) {
                console.error('[API] Supabase getUserBookings error:', error.message);
                return [];
            }

            const mapAppointmentStatus = (status) => {
                if (!status) return 'upcoming';
                const s = String(status).toLowerCase().trim();
                if (['dang_giu_cho', 'tam_giu'].includes(s)) return 'pending';
                if (['cho_xac_nhan', 'pending'].includes(s)) return 'pending';
                if (['da_xac_nhan', 'confirmed', 'upcoming'].includes(s)) return 'confirmed';
                if (['da_check_in', 'accepted'].includes(s)) return 'accepted';
                if (['dang_thuc_hien', 'in_progress', 'in-progress'].includes(s)) return 'in-progress';
                if (['da_hoan_tat', 'completed', 'done'].includes(s)) return 'completed';
                if (['da_huy', 'cancelled'].includes(s)) return 'cancelled';
                if (['da_het_han', 'expired'].includes(s)) return 'cancelled';
                if (['vang_mat', 'no_show'].includes(s)) return 'cancelled';
                return 'upcoming';
            };

            const getPriceFromMatrix = (matrix, species) => {
                if (!matrix || !Array.isArray(matrix)) return 0;
                if (!species) species = 'other';
                const row = matrix.find(m => m.pet_species?.toLowerCase() === species.toLowerCase());
                if (row) return row.unit_price;
                return matrix[0]?.unit_price || 0;
            };

            return (data || []).map(b => {
                const srv = Array.isArray(b.service) ? b.service[0] : b.service;
                const pet = Array.isArray(b.pet_profile) ? b.pet_profile[0] : b.pet_profile;

                return {
                    id:              b.appointment_code || b.id,
                    _supabaseId:     b.id,
                    userId:          customerId,
                    date:            b.appointment_date,
                    time:            b.appointment_time?.slice(0, 5) || '',
                    timeStart:       b.appointment_time?.slice(0, 5) || '',
                    status:          mapAppointmentStatus(b.appointment_status),
                    bookingStatus:   b.appointment_status,
                    paymentStatus:   b.payment_status,
                    service:         srv?.service_name      || '',
                    serviceName:     srv?.service_name      || '',
                    serviceCategory: srv?.service_category  || '',
                    petId:           pet?.pet_code      || pet?.id || '',
                    petName:         pet?.pet_name      || '',
                    petBreed:        pet?.breed         || '',
                    petSpecies:      pet?.species       || '',
                    petAvatar:       pet?.image_url     || '',
                    changeCount:     b.change_count     || 0,
                    note:            b.note             || '',
                    price:           b.total_price      || getPriceFromMatrix(srv?.service_price_matrix, pet?.species) || 0,
                    _source:         'supabase'
                };
            });
        } catch (err) {
            console.error('[API] Supabase getUserBookings failed:', err);
            return [];
        }
    },

    async getUserAppointments(userOrId) {
        return this.getUserBookings(userOrId);
    },

    async getUserOrders(userOrId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userOrId) return [];
        try {
            const customerId = await resolveCustomerId(db, userOrId);
            if (!customerId) return [];

            const { data, error } = await db
                .from('sales_order')
                .select(`
                    id, order_code, order_status, payment_status,
                    total_amount,
                    created_at, updated_at, note,
                    sales_order_detail (
                        id, quantity, unit_price, discount_amount, subtotal,
                        product ( id, product_name, image_urls, sku )
                    ),
                    customer_address ( receiver_name, receiver_phone, province, street_address )
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) { 
                console.error('[API] Supabase getUserOrders error:', error.message); 
                return []; 
            }

            const normalizeImageUrl = (url) => {
                if (!url) return '';
                if (!url.startsWith('http') && !url.startsWith('/')) return '/' + url;
                return url;
            };

            const mapOrderStatus = (status) => {
                if (!status) return 'placed';
                const s = String(status).toLowerCase().trim();
                const mapping = {
                    'cho_thanh_toan':      'pending_payment',
                    'cho_xac_nhan':        'placed',
                    'da_xac_nhan':         'preparing',
                    'dang_chuan_bi':       'preparing',
                    'dang_giao':           'shipping',
                    'da_giao':             'delivered',
                    'da_hoan_tat':         'completed',
                    'da_huy':              'cancelled',
                    'thanh_toan_that_bai': 'cancelled',
                    'pending':             'placed',
                    'pending_payment':     'pending_payment',
                    'confirmed':           'preparing',
                    'packing':             'preparing',
                    'preparing':           'preparing',
                    'shipping':            'shipping',
                    'shipped':             'shipping',
                    'delivered':           'delivered',
                    'completed':           'completed',
                    'cancelled':           'cancelled',
                    'returned':            'cancelled',
                };
                return mapping[s] || 'placed';
            };

            const orders = (data || []).map(o => {
                const details = o.sales_order_detail || [];
                const products = details.map(d => ({
                    id:       d.product?.id || '',
                    name:     d.product?.product_name || 'Sản phẩm',
                    sku:      d.product?.sku || '',
                    image:    normalizeImageUrl(d.product?.image_urls?.[0]),
                    quantity: d.quantity,
                    price:    d.unit_price,
                    total:    d.subtotal,
                }));
                const addr = o.customer_address;
                const calculatedSubtotal = products.reduce((sum, p) => sum + (p.total || (p.price * p.quantity)), 0);
                const discount = 0;
                const shippingFee = Math.max(0, (o.total_amount || 0) - calculatedSubtotal + discount);
                
                return {
                    id:          o.order_code || o.id,
                    _supabaseId: o.id,
                    userId:      customerId,
                    status:      mapOrderStatus(o.order_status),
                    orderStatus: o.order_status,
                    paymentStatus: (o.payment_status || '').toLowerCase(),
                    paymentMethod: 'cod',
                    products,
                    pricing: {
                        subtotal:    calculatedSubtotal,
                        shippingFee: shippingFee,
                        discount:    discount,
                        total:       o.total_amount,
                    },
                    shipping: addr ? {
                        name:    addr.receiver_name  || '',
                        phone:   addr.receiver_phone || '',
                        address: [addr.street_address, addr.province].filter(Boolean).join(', '),
                    } : {},
                    note:      o.note || '',
                    createdAt: o.created_at,
                    updatedAt: o.updated_at,
                    _source:   'supabase',
                };
            });
            return orders;
        } catch (err) {
            console.error('[API] Supabase getUserOrders failed:', err);
            return [];
        }
    },

    async getUserReviews(userOrId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userOrId) return [];
        try {
            const customerId = await resolveCustomerId(db, userOrId);
            if (!customerId) return [];

            const { data, error } = await db.from('review').select('*').eq('customer_id', customerId);
            if (error) { 
                console.error('[API] Supabase getUserReviews error:', error.message); 
                return []; 
            }
            return data || [];
        } catch (err) {
            console.error('[API] Supabase getUserReviews failed:', err);
            return [];
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
                    used_at,
                    voucher ( id, voucher_code, discount_value, type, minimum_order_amount, start_date, end_date, description )
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
                    minOrderAmount: v.minimum_order_amount,
                    validFrom: v.start_date,
                    validTo: v.end_date,
                    description: v.description,
                    isUsed: row.voucher_status === 'USED' || row.voucher_status === 'used',
                    usedAt: row.used_at
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

    async getUserCart(userId) {
        if (!userId) return [];
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return [];

        try {
            const { data: cartData, error: cartError } = await db.from('cart').select('id').eq('customer_id', userId).maybeSingle();
            if (cartError || !cartData) return [];

            const { data: items, error: itemsError } = await db.from('cart_item').select('product_id, quantity').eq('cart_id', cartData.id);
            if (!itemsError && items) {
                return items.map(item => ({ id: item.product_id, qty: item.quantity }));
            }
        } catch (err) {
            console.error('Error getUserCart:', err);
        }
        return [];
    },

    async getOrCreateCart(userId) {
        if (!userId) return null;
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return null;

        let { data: cartData } = await db.from('cart').select('id').eq('customer_id', userId).maybeSingle();
        if (!cartData) {
            const { data: newCart, error } = await db.from('cart').insert({ customer_id: userId, cart_status: 'ACTIVE' }).select('id').single();
            if (error) return null;
            cartData = newCart;
        }
        return cartData;
    },

    async saveUserCart(userId, cartItems) {
        try {
            localStorage.setItem('pawpal_cart', JSON.stringify(cartItems || []));
            document.dispatchEvent(new CustomEvent('cart_updated'));
            if (typeof window.updateCartBadge === 'function') {
                window.updateCartBadge();
            }
        } catch(e) {}

        if (!userId) return { success: true };
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return { success: true };

        try {
            const cart = await this.getOrCreateCart(userId);
            if (!cart) return { success: false };

            // First delete existing items
            await db.from('cart_item').delete().eq('cart_id', cart.id);

            // Then insert new items
            if (cartItems && cartItems.length > 0) {
                const itemsToInsert = cartItems.map(item => ({
                    cart_id: cart.id,
                    product_id: item.id,
                    quantity: item.qty || item.quantity || 1,
                    unit_price: item.price || 0,
                    subtotal: (item.price || 0) * (item.qty || item.quantity || 1)
                }));
                const { error } = await db.from('cart_item').insert(itemsToInsert);
                if (error) console.error('Error inserting cart items:', error);
                return { success: !error };
            }
            return { success: true };
        } catch (err) {
            console.error('Error saveUserCart:', err);
            return { success: false };
        }
    },

    async addToCart(userId, productId, quantity = 1) {
        if (!userId) return { success: false, error: 'User not logged in' };
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return { success: false, error: 'No DB' };

        const cart = await this.getOrCreateCart(userId);
        if (!cart) return { success: false, error: 'Cannot create cart' };

        const { data: existingItem } = await db.from('cart_item')
            .select('id, quantity').eq('cart_id', cart.id).eq('product_id', productId).maybeSingle();

        if (existingItem) {
            const { error } = await db.from('cart_item')
                .update({ quantity: existingItem.quantity + quantity })
                .eq('id', existingItem.id);
            return { success: !error, error };
        } else {
            const { error } = await db.from('cart_item')
                .insert({ cart_id: cart.id, product_id: productId, quantity, unit_price: 0, subtotal: 0 });
            return { success: !error, error };
        }
    },

    async updateCartItemQuantity(userId, productId, quantity) {
        if (!userId) return { success: false, error: 'User not logged in' };
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        const cart = await this.getOrCreateCart(userId);
        if (!cart) return { success: false };

        if (quantity <= 0) return this.removeFromCart(userId, productId);

        const { error } = await db.from('cart_item')
            .update({ quantity })
            .eq('cart_id', cart.id).eq('product_id', productId);
        return { success: !error, error };
    },

    async removeFromCart(userId, productId) {
        if (!userId) return { success: false, error: 'User not logged in' };
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        const cart = await this.getOrCreateCart(userId);
        if (!cart) return { success: false };

        const { error } = await db.from('cart_item').delete().eq('cart_id', cart.id).eq('product_id', productId);
        return { success: !error, error };
    },

    async clearCart(userId) {
        if (!userId) return { success: false };
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        const cart = await this.getOrCreateCart(userId);
        if (!cart) return { success: false };

        const { error } = await db.from('cart_item').delete().eq('cart_id', cart.id);
        return { success: !error, error };
    },

    async getUserWishlist(userId) {
        if (!userId) return { productIds: [], serviceIds: [] };
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return { productIds: [], serviceIds: [] };

        try {
            const { data: wl } = await db.from('wishlist').select('id').eq('customer_id', userId).maybeSingle();
            if (wl && wl.id) {
                const { data: items, error: itError } = await db.from('wishlist_item').select('product_id, service_id').eq('wishlist_id', wl.id);
                if (!itError && items) {
                    return {
                        productIds: items.map(i => i.product_id).filter(Boolean),
                        serviceIds: items.map(i => i.service_id).filter(Boolean)
                    };
                }
            }
        } catch (err) {
            console.warn('[API] getUserWishlist Supabase error:', err);
        }
        return { productIds: [], serviceIds: [] };
    },

    async getOrCreateWishlist(userId) {
        if (!userId) return null;
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        
        let { data: wl } = await db.from('wishlist').select('id').eq('customer_id', userId).maybeSingle();
        if (!wl) {
            const { data: newWl, error } = await db.from('wishlist').insert({ customer_id: userId }).select('id').single();
            if (error) return null;
            wl = newWl;
        }
        return wl;
    },

    async toggleWishlist(userId, itemId, isService = false) {
        if (!userId) return { success: false, error: 'User not logged in' };
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        const wl = await this.getOrCreateWishlist(userId);
        if (!wl) return { success: false };

        const column = isService ? 'service_id' : 'product_id';
        const { data: existing } = await db.from('wishlist_item')
            .select('id').eq('wishlist_id', wl.id).eq(column, itemId).maybeSingle();

        if (existing) {
            const { error } = await db.from('wishlist_item').delete().eq('id', existing.id);
            return { success: !error, action: 'removed' };
        } else {
            const insertData = { wishlist_id: wl.id };
            insertData[column] = itemId;
            const { error } = await db.from('wishlist_item').insert(insertData);
            return { success: !error, action: 'added' };
        }
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

    async submitOrder(orderData) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) {
            return { success: false, error: 'No Supabase connection' };
        }

        try {
            let customerId = orderData.userId;
            const isUuidLike = typeof customerId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
            
            if (!customerId || !isUuidLike) {
                const phone = orderData.shipping?.phone || '';
                if (phone) {
                    const { data: existingCust } = await db.from('customer').select('id').eq('phone_main', phone).limit(1);
                    if (existingCust && existingCust.length > 0) {
                        customerId = existingCust[0].id;
                    } else {
                        const { data: newCust, error: errC } = await db.from('customer').insert({
                            email: null,
                            password_hash: null,
                            phone_main: phone,
                            account_status: 'ACTIVE',
                            is_temporary: true,
                            registered_at: new Date().toISOString()
                        }).select('id').single();
                        
                        if (errC) {
                            console.error('[API] Failed to create guest customer:', errC);
                        }
                        
                        if (!errC && newCust) {
                            customerId = newCust.id;
                            const { error: profileErr } = await db.from('customer_profile').insert({
                                customer_id: customerId,
                                full_name: orderData.shipping?.name || 'Khách vãng lai'
                            });
                            if (profileErr) console.warn('Could not create profile', profileErr);
                        }
                    }
                } else {
                    customerId = null;
                }
            }

            let shippingAddressId = 'f0000000-0000-0000-2222-000000000001'; // Fallback
            if (orderData.shipping && customerId) {
                const { data: addrData, error: addrError } = await db.from('customer_address').insert({
                    customer_id: customerId,
                    receiver_name: orderData.shipping.name || 'Khách hàng',
                    receiver_phone: orderData.shipping.phone || '',
                    province: orderData.shipping.city || '',
                    street_address: (orderData.shipping.address || '') + (orderData.shipping.district ? ', ' + orderData.shipping.district : ''),
                    is_default: false
                }).select('id').single();
                
                if (addrError) {
                    console.warn('Could not insert address (maybe guest without customer_id?), using fallback', addrError);
                } else if (addrData && addrData.id) {
                    shippingAddressId = addrData.id;
                }
            }

            const paymentMethodStr = String(orderData.payment?.method || 'cod').toLowerCase();
            const isPaid = orderData.payment?.status === 'paid' || orderData.payment?.status === 'PAID';
            
            const initialOrderStatus = paymentMethodStr === 'cod' ? 'cho_xac_nhan' : (isPaid ? 'cho_xac_nhan' : 'cho_thanh_toan');
            const initialPaymentStatus = isPaid ? 'da_thanh_toan' : 'chua_thanh_toan';

            const salesOrder = {
                order_code: orderData.orderId,
                customer_id: customerId,
                shipping_address_id: shippingAddressId,
                order_status: initialOrderStatus,
                payment_status: initialPaymentStatus,
                total_amount: orderData.pricing?.grandTotal || 0,
            };

            const { data: newOrder, error: orderError } = await db.from('sales_order').insert(salesOrder).select('id').single();
            if (orderError) throw orderError;

            const paymentCode = 'PAY-' + Date.now();
            const paymentInsert = {
                payment_code: paymentCode,
                order_id: newOrder.id,
                payment_type: 'mua_hang',
                payment_method_id: paymentMethodStr,
                amount: orderData.pricing?.grandTotal || orderData.pricing?.total || 0,
                transaction_status: isPaid ? 'thanh_cong' : 'cho_xu_ly'
            };
            const { error: payError } = await db.from('payment').insert(paymentInsert);
            if (payError) console.error('[API] Failed to insert payment:', payError);

            if (orderData.items && orderData.items.length > 0) {
                const orderDetails = orderData.items.map(item => ({
                    order_id: newOrder.id,
                    product_id: item.id,
                    quantity: item.qty || item.quantity || 1,
                    unit_price: item.price || 0,
                    discount_amount: 0,
                    subtotal: (item.price || 0) * (item.qty || item.quantity || 1)
                }));
                const { error: itemsError } = await db.from('sales_order_detail').insert(orderDetails);
                if (itemsError) throw itemsError;
            }

            return { success: true, orderId: newOrder.id };
        } catch (err) {
            console.error('Submit order error:', err);
            return { success: false, error: err };
        }
    },

    async updateOrderPaymentStatus(orderId, paymentStatus) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !orderId) {
            return { success: false, error: 'No Supabase connection' };
        }

        try {
            const rawStatus = String(paymentStatus || '').toLowerCase().trim();
            const normalizedStatus = {
                'paid': 'da_thanh_toan',
                'da_thanh_toan': 'da_thanh_toan',
                'failed': 'thanh_toan_that_bai',
                'thanh_toan_that_bai': 'thanh_toan_that_bai',
                'pending': 'chua_thanh_toan',
                'chua_thanh_toan': 'chua_thanh_toan',
                'refunded': 'da_hoan_tien',
                'da_hoan_tien': 'da_hoan_tien'
            }[rawStatus] || rawStatus;

            const isUUID = typeof orderId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

            let query = db.from('sales_order').update({
                payment_status: normalizedStatus,
                updated_at: new Date().toISOString()
            });

            query = isUUID
                ? query.eq('id', orderId)
                : query.eq('order_code', orderId);

            const { data, error } = await query.select('id, order_code, payment_status').maybeSingle();
            if (error) throw error;

            if (data && data.id) {
                const transStatus = normalizedStatus === 'da_thanh_toan' ? 'thanh_cong' : (normalizedStatus === 'thanh_toan_that_bai' ? 'that_bai' : 'dang_xu_ly');
                await db.from('payment').update({
                    transaction_status: transStatus,
                    updated_at: new Date().toISOString()
                }).eq('order_id', data.id);
            }

            return { success: true, data };
        } catch (err) {
            console.error('[API] updateOrderPaymentStatus failed:', err);
            return { success: false, error: err };
        }
    },

    async updateOrderStatus(orderId, orderStatus) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !orderId) {
            return { success: false, error: 'No Supabase connection' };
        }

        try {
            const rawStatus = String(orderStatus || '').toLowerCase().trim();
            const normalizedStatus = {
                'placed': 'cho_xac_nhan',
                'confirmed': 'da_xac_nhan',
                'preparing': 'dang_chuan_bi',
                'shipping': 'dang_giao',
                'delivered': 'da_giao',
                'completed': 'da_hoan_tat',
                'cancelled': 'da_huy',
            }[rawStatus] || rawStatus;

            const isUUID = typeof orderId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

            let query = db.from('sales_order').update({
                order_status: normalizedStatus,
                updated_at: new Date().toISOString()
            });

            query = isUUID
                ? query.eq('id', orderId)
                : query.eq('order_code', orderId);

            const { data, error } = await query.select('id, order_code, order_status').maybeSingle();
            if (error) throw error;

            return { success: true, data };
        } catch (err) {
            console.error('[API] updateOrderStatus failed:', err);
            return { success: false, error: err };
        }
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
                .eq('is_active', true);
                
            if (error) throw error;
            
            const mappedVouchers = (data || []).map(v => {
                let maxDiscount = v.max_discount;
                if (maxDiscount == null && v.description) {
                    const match = v.description.match(/tối đa\s+([\d.,]+)(k|đ)/i);
                    if (match) {
                        let val = parseFloat(match[1].replace(/[.,]/g, ''));
                        if (match[2].toLowerCase() === 'k') val *= 1000;
                        maxDiscount = val;
                    }
                }
                
                return {
                    id: v.id,
                    code: v.voucher_code,
                    name: v.voucher_name || v.voucher_code,
                    type: v.type || 'percentage',
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
                    active: v.is_active
                };
            });
            
            console.log('[API] Đã tải danh sách voucher từ Supabase:', mappedVouchers);
            return mappedVouchers;
        } catch (err) {
            console.error('[API] Error fetching vouchers from Supabase:', err);
            return [];
        }
    },

    async getDeliveryOptions() {
        try {
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!db) {
                console.error('[API] Supabase Client not initialized');
                return [];
            }
            
            const { data, error } = await db.from('delivery_option_config')
                .select('*')
                .eq('available', true)
                .order('fee', { ascending: true });
                
            if (error) throw error;
            
            return (data || []).map(d => ({
                id: d.id,
                name: d.name,
                description: d.description,
                fee: Number(d.fee),
                estimatedDays: d.estimated_days,
                icon: d.icon,
                available: d.available
            }));
        } catch (err) {
            console.error('[API] getDeliveryOptions failed:', err);
            const res = await fetch('/data/delivery-options.json');
            return await res.json().catch(() => []);
        }
    },

    async getPaymentMethods() {
        try {
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!db) {
                console.warn('[API] Supabase Client not initialized, falling back to mock payment methods');
                const res = await fetch('/data/payment-methods.json');
                return await res.json();
            }
            
            const { data, error } = await db.from('payment_method_config')
                .select('*')
                .eq('available', true)
                .order('id', { ascending: true });
                
            if (error) {
                if (error.code === '42P01') {
                    const res = await fetch('/data/payment-methods.json');
                    return await res.json();
                }
                throw error;
            }
            
            return (data || []).map(p => ({
                id: p.id,
                name: p.name,
                shortName: p.short_name,
                description: p.description,
                icon: p.icon,
                fee: Number(p.fee),
                available: p.available,
                requiresInfo: p.requires_info,
                redirectUrl: p.redirect_url,
                bankInfo: p.bank_info
            }));
        } catch (err) {
            console.error('[API] getPaymentMethods failed:', err);
            const res = await fetch('/data/payment-methods.json');
            return await res.json().catch(() => []);
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 2: CƠ CHẾ GIỮ CHỖ 15 PHÚT (SLOT HOLD)
       ========================================================================== */
    async releaseExpiredHoldSlots() {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return;
        try {
            const now = new Date().toISOString();
            await db.from('appointment')
                .update({ appointment_status: 'da_het_han' })
                .eq('appointment_status', 'dang_giu_cho')
                .lt('hold_expires_at', now);
        } catch (e) {
            console.warn('[API] releaseExpiredHoldSlots error:', e);
        }
    },

    async checkSlotAvailability(serviceId, date, time, staffId = null) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return { available: true };
        try {
            await this.releaseExpiredHoldSlots();
            const now = new Date().toISOString();

            let query = db.from('appointment')
                .select('id, appointment_status, hold_expires_at')
                .eq('appointment_date', date)
                .eq('appointment_time', time.length === 5 ? time + ':00' : time)
                .not('appointment_status', 'in', '("da_huy","da_het_han")');

            if (serviceId) query = query.eq('service_id', serviceId);
            if (staffId) query = query.eq('staff_id', staffId);

            const { data, error } = await query;
            if (error) throw error;

            const activeHold = (data || []).find(row => {
                if (row.appointment_status === 'dang_giu_cho') {
                    return row.hold_expires_at && row.hold_expires_at > now;
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

            const insertPayload = {
                appointment_code: appointmentCode,
                customer_id: customerId,
                pet_id: petId,
                service_id: serviceId,
                staff_id: staffId || null,
                appointment_date: date,
                appointment_time: time.length === 5 ? time + ':00' : time,
                hold_expires_at: holdExpiresAt,
                appointment_status: 'dang_giu_cho',
                payment_status: 'chua_thanh_toan',
                total_price: totalPrice,
                note: note,
                change_count: 0
            };

            const { data, error } = await db.from('appointment').insert([insertPayload]).select('*').single();
            if (error) throw error;

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
            const payStatus = isDepositPaid ? 'da_thanh_toan_mot_phan' : 'chua_thanh_toan';

            const { data, error } = await db.from('appointment')
                .update({
                    appointment_status: newStatus,
                    payment_status: payStatus,
                    hold_expires_at: null,
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
                return providers.map(p => ({
                    id: p.provider_code || p.id,
                    name: p.provider_name,
                    price: Number(p.base_fee || 30000),
                    estimatedTime: p.estimated_days ? `${p.estimated_days} ngày` : '2-3 ngày',
                    description: p.note || 'Giao hàng tiêu chuẩn toàn quốc'
                }));
            }
        } catch (e) {}

        // Dynamic fallback from settings or standard options
        return [
            { id: 'standard', name: 'Giao hàng tiêu chuẩn', price: 30000, estimatedTime: '2-3 ngày', description: 'Giao hàng tiết kiệm toàn quốc' },
            { id: 'express', name: 'Giao hàng hỏa tốc 2H', price: 50000, estimatedTime: '2 giờ', description: 'Áp dụng nội thành TP.HCM' }
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
                .select('*, product_variant(id, sku, variant_name, price, product(id, product_name, category_id))')
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
                .select('*, return_request_detail(*, product_variant(id, sku, variant_name, price)), customer(id, phone_main, customer_profile(full_name))')
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
                .select('*, support_ticket_message(*), customer(id, phone_main, customer_profile(full_name))')
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

            // Cập nhật updated_at cho ticket
            await db.from('support_ticket').update({ updated_at: now }).eq('id', ticketId);

            return { success: true, data };
        } catch (e) {
            console.error('[API] addTicketMessage error:', e);
            return { success: false, error: e.message };
        }
    },

    /* ==========================================================================
       GIAI ĐOẠN 4: THÔNG BÁO HỆ THỐNG & TRUY VẾT NHẬT KÝ (NOTIFICATION & AUDIT_LOG)
       ========================================================================== */
    async getUserNotifications(customerId, limit = 20) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !customerId) return [];
        try {
            const { data, error } = await db.from('notification')
                .select('*')
                .eq('customer_id', customerId)
                .order('sent_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (e) {
            return [];
        }
    },

    async markNotificationAsRead(notificationId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !notificationId) return { success: false };
        try {
            const { data, error } = await db.from('notification')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('id', notificationId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async createSystemNotification({ customerId, type = 'don_hang_moi', title, content, orderId = null, appointmentId = null, ticketId = null, refundId = null }) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !customerId || !title || !content) return { success: false };
        try {
            const { data, error } = await db.from('notification').insert([{
                customer_id: customerId,
                notification_type: type,
                title,
                content,
                sales_order_id: orderId,
                appointment_id: appointmentId,
                support_ticket_id: ticketId,
                refund_transaction_id: refundId,
                is_read: false,
                sent_at: new Date().toISOString()
            }]).select().single();

            if (error) throw error;
            return { success: true, data };
        } catch (e) {
            console.warn('[API] createSystemNotification warning:', e);
            return { success: false };
        }
    },

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
