
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

    async getUserPets(userId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userId) return [];
        try {
            const { data, error } = await db
                .from('pet_profile')
                .select('*')
                .eq('customer_id', userId);
            
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

    async getUserBookings(userId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userId) return [];
        try {
            const { data, error } = await db
                .from('appointment')
                .select(`
                    id, appointment_code, appointment_date, appointment_time,
                    appointment_status, payment_status, note, change_count, total_price,
                    service ( 
                        service_name, service_category, estimated_duration,
                        service_price_matrix ( unit_price )
                    ),
                    pet_profile ( id, pet_code, pet_name, breed, species )
                `)
                .eq('customer_id', userId)
                .order('appointment_date', { ascending: false });
                
            if (error) {
                console.error('[API] Supabase getUserBookings error:', error.message);
                return [];
            }

            const mapAppointmentStatus = (status) => {
                if (!status) return 'upcoming';
                const s = status.toUpperCase();
                if (s === 'PENDING' || s === 'CONFIRMED') return 'upcoming';
                if (s === 'COMPLETED' || s === 'DONE') return 'completed';
                if (s === 'CANCELLED') return 'cancelled';
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
                    userId:          userId,
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

    async getUserOrders(userId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userId) return [];
        try {
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
                .eq('customer_id', userId)
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
                return {
                    'PENDING':   'placed',
                    'CONFIRMED': 'preparing',
                    'PACKING':   'preparing',
                    'PREPARING': 'preparing',
                    'SHIPPING':  'shipping',
                    'SHIPPED':   'shipping',
                    'DELIVERED': 'delivered',
                    'COMPLETED': 'completed',
                    'CANCELLED': 'cancelled',
                    'RETURNED':  'cancelled',
                }[status] || 'placed';
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
                    userId:      userId,
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

    async getUserReviews(userId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userId) return [];
        try {
            const { data, error } = await db.from('review').select('*').eq('customer_id', userId);
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

    async getUserVouchers(userId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !userId) return [];
        try {
            const { data, error } = await db.from('customer_voucher')
                .select(`
                    id, 
                    voucher_status, 
                    used_at,
                    voucher ( id, voucher_code, discount_value, type, minimum_order_amount, start_date, end_date, description )
                `)
                .eq('customer_id', userId);
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
        if (!userId) return { success: false };
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return { success: false };

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

            const salesOrder = {
                order_code: orderData.orderId,
                customer_id: customerId,
                shipping_address_id: shippingAddressId,
                order_status: 'PENDING',
                payment_status: (orderData.payment?.status || 'PENDING').toUpperCase(),
                total_amount: orderData.pricing?.grandTotal || 0,
            };

            const { data: newOrder, error: orderError } = await db.from('sales_order').insert(salesOrder).select('id').single();
            if (orderError) throw orderError;

            const paymentMethodStr = String(orderData.payment?.method || 'cod').toUpperCase();
            const paymentCode = 'PAY-' + Date.now();
            const paymentInsert = {
                payment_code: paymentCode,
                order_id: newOrder.id,
                payment_type: 'PRODUCT',
                payment_method_id: paymentMethodStr,
                amount: orderData.pricing?.grandTotal || orderData.pricing?.total || 0,
                transaction_status: (orderData.payment?.status || 'PENDING').toUpperCase()
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
            const normalizedStatus = String(paymentStatus || '').toUpperCase();
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
                await db.from('payment').update({
                    transaction_status: normalizedStatus,
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
            const normalizedStatus = String(orderStatus || '').toUpperCase();
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
