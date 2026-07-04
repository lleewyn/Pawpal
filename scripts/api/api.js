/**
 * Mock API layer for PawPal.
 * JSON files in /data are the source of demo data. localStorage is only a writable cache
 * so user actions such as editing pets or cancelling orders can still work without a backend.
 */

export const API = {
    DATA_VERSION: '2026-07-04-v10-force-refresh',
    USE_BACKEND: false, // Thiết lập false để ngắt kết nối backend MongoDB, chuyển hoàn toàn sang Mock offline bằng LocalStorage và tệp tin JSON tĩnh.

    getBaseUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return window.PAWPAL_API_BASE_URL || 'http://localhost:4000';
        }
        return '';
    },

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
        const shouldRefreshMockData = (window.PawpalStorage ? window.PawpalStorage.get('pawpal_mock_data_version') : localStorage.getItem('pawpal_mock_data_version')) !== this.DATA_VERSION;

        const localUsers = safeReadArray('pawpal_users_db');
        if (shouldRefreshMockData || localUsers.length === 0 || localUsers.length <= 3) {
            const users = await this.getJSON('/data/users.json');
            if (users) {
                const mergedUsers = mergeById(users, localUsers);
                safeWrite('pawpal_users_db', mergedUsers);

                const currentUser = safeReadObject('pawpal_current_user');
                if (currentUser) {
                    const richUser = mergedUsers.find(user => sameUser(user, currentUser));
                    if (richUser) {
                        // Bảo vệ các field user-action: không để seed ghi đè trạng thái đã kích hoạt
                        const safeUser = {
                            ...richUser,
                            is_temporary: currentUser.is_temporary,
                            password:     currentUser.password     !== undefined ? currentUser.password     : richUser.password,
                            points:       currentUser.points       !== undefined ? currentUser.points       : richUser.points,
                        };
                        safeWrite('pawpal_current_user', safeUser);
                    }
                }
            }
        }

        const localPets = safeReadArray('pawpal_pets');
        if (shouldRefreshMockData || localPets.length === 0 || !localPets.some(pet => pet.userId)) {
            const pets = await this.getJSON('/data/pets.json');
            if (pets) safeWrite('pawpal_pets', mergeById(pets, localPets));
        }

        const localBookings = safeReadArray('pawpal_bookings');
        if (shouldRefreshMockData || localBookings.length === 0 || !localBookings.some(booking => booking.userId)) {
            const bookings = await this.getJSON('/data/bookings.json');
            if (bookings) safeWrite('pawpal_bookings', mergeById(bookings, localBookings));
        }

        const localOrders = safeReadArray('pawpal_orders');
        const orders = await this.getJSON('/data/orders.json');
        if (orders) {
            const hasNewSeedOrders = orders.some(seed => !localOrders.some(l => String(l.id) === String(seed.id)));
            if (shouldRefreshMockData || localOrders.length === 0 || !localOrders.some(order => order.userId) || hasNewSeedOrders) {
                // When refreshing, seed data wins for product fields (image, name, price),
                // but preserve user-modified fields like status (e.g. cancelled orders)
                const mergedOrders = orders.map(seedOrder => {
                    const local = localOrders.find(o => String(o.id) === String(seedOrder.id));
                    if (!local) return seedOrder;
                    // Keep seed product data fresh, only preserve user-action fields
                    return {
                        ...seedOrder,
                        status:        local.status,
                        paymentStatus: local.paymentStatus,
                        updatedAt:     local.updatedAt,
                        // Giữ lại field tích điểm loyalty đã xử lý
                        pointsAwarded: local.pointsAwarded,
                        pointsEarned:  local.pointsEarned,
                        // Giữ lại userId/userPhone để filter đúng
                        userId:        local.userId    || seedOrder.userId,
                        userPhone:     local.userPhone || seedOrder.userPhone,
                        timeline:      local.timeline  || seedOrder.timeline,
                    };
                });
                localOrders.forEach(local => {
                    if (!mergedOrders.some(o => String(o.id) === String(local.id))) {
                        mergedOrders.push(local);
                    }
                });
                safeWrite('pawpal_orders', mergedOrders);
                safeWrite('pawpal_orders_seeded', 'true');
            }
        }

        // Normalize orders on every startup so older cached records keep working.
        const normalizedOrders = normalizeOrders(safeReadArray('pawpal_orders'));
        
        // Tự động hoàn thành đơn hàng đã giao (delivered) quá 3 ngày (72 giờ)
        let updatedOrders = false;
        const finalOrders = normalizedOrders.map(order => {
            if (order.status === 'delivered') {
                const deliveredEntry = Array.isArray(order.timeline)
                    ? order.timeline.slice().reverse().find(t => t.status === 'delivered')
                    : null;
                const deliveredAt = deliveredEntry ? new Date(deliveredEntry.timestamp) : new Date(order.updatedAt || order.createdAt || 0);
                const daysPassed = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
                
                if (daysPassed >= 3) {
                    order.status = 'completed';
                    order.updatedAt = new Date().toISOString().slice(0, 19);
                    
                    if (!Array.isArray(order.timeline)) {
                        order.timeline = [];
                    }
                    order.timeline.push({
                        status: 'completed',
                        timestamp: order.updatedAt,
                        title: 'Đã hoàn thành (Tự động)',
                        description: 'Hệ thống tự động hoàn thành đơn hàng sau 3 ngày kể từ khi giao hàng thành công.'
                    });
                    updatedOrders = true;
                }
            }
            return order;
        });

        if (updatedOrders) {
            safeWrite('pawpal_orders', finalOrders);
        } else if (normalizedOrders.length) {
            safeWrite('pawpal_orders', normalizedOrders);
        }

        const localReturns = safeReadArray('pawpal_returns');
        if (shouldRefreshMockData || localReturns.length === 0) {
            const returns = await this.getJSON(`/data/returns.json?v=${this.DATA_VERSION}`);
            if (returns) safeWrite('pawpal_returns', mergeById(returns, localReturns));
        }

        const localCareLogs = safeReadObject('pawpal_pet_tracker_logs') || {};
        if (shouldRefreshMockData || Object.keys(localCareLogs).length === 0) {
            const careLogs = await this.getJSON(`/data/care-logs.json?v=${this.DATA_VERSION}`);
            if (careLogs) {
                safeWrite('pawpal_pet_tracker_logs', mergeCareLogs(careLogs, localCareLogs));
            }
        }

        safeWrite('pawpal_mock_data_version', this.DATA_VERSION);
    },

    async getUserPets(userId) {
        const pets = await this.request(`/api/pets`);
        const currentUser = safeReadObject('pawpal_current_user');
        const dbUsers = safeReadArray('pawpal_users_db');
        const dbUser = dbUsers.find(u =>
            sameUserId(u.id, userId) ||
            (currentUser && sameUserId(u.phone, currentUser.phone))
        );
        const effectiveUserId = dbUser ? dbUser.id : userId;

        // Tập hợp tất cả id có thể của user
        const knownIds = new Set(
            [userId, effectiveUserId, currentUser?.id, dbUser?.id]
                .filter(Boolean)
                .map(String)
        );
        const currentPhone = currentUser?.phone ? String(currentUser.phone) : null;

        const matchPet = (pet) => {
            const petUserId = pet.userId?._id || pet.userId;
            if (petUserId && knownIds.has(String(petUserId))) return true;
            if (pet.userLegacyId && knownIds.has(String(pet.userLegacyId))) return true;
            if (!currentPhone) return false;
            if (pet.ownerPhone && String(pet.ownerPhone) === currentPhone) return true;
            if (pet.phone && String(pet.phone) === currentPhone) return true;
            return false;
        };

        if (Array.isArray(pets)) {
            return pets.filter(matchPet);
        }

        // Offline path — không gọi lại initData()
        const localPets = safeReadArray('pawpal_pets');
        return localPets.filter(matchPet);
    },

    async getUserBookings(userId) {
        const bookings = await this.request(`/api/bookings`);
        const currentUser = safeReadObject('pawpal_current_user');
        const dbUsers = safeReadArray('pawpal_users_db');
        const dbUser = dbUsers.find(u =>
            sameUserId(u.id, userId) ||
            (currentUser && sameUserId(u.phone, currentUser.phone))
        );
        const effectiveUserId = dbUser ? dbUser.id : userId;

        // Tập hợp tất cả id có thể của user
        const knownIds = new Set(
            [userId, effectiveUserId, currentUser?.id, dbUser?.id]
                .filter(Boolean)
                .map(String)
        );
        const currentPhone = currentUser?.phone ? String(currentUser.phone) : null;

        const matchBooking = (booking) => {
            const bookingUserId = booking.userId?._id || booking.userId;
            if (bookingUserId && knownIds.has(String(bookingUserId))) return true;
            if (booking.userLegacyId && knownIds.has(String(booking.userLegacyId))) return true;
            if (!currentPhone) return false;
            if (booking.phone && String(booking.phone) === currentPhone) return true;
            if (booking.userPhone && String(booking.userPhone) === currentPhone) return true;
            if (booking.delivery?.phone && String(booking.delivery.phone) === currentPhone) return true;
            return false;
        };

        if (Array.isArray(bookings)) {
            return bookings.filter(matchBooking);
        }

        // Offline path — không gọi lại initData()
        const localBookings = safeReadArray('pawpal_bookings');
        return localBookings.filter(matchBooking);
    },

    async getUserOrders(userId) {
        const orders = await this.request(`/api/orders`);
        const currentUser = safeReadObject('pawpal_current_user');
        const dbUsers = safeReadArray('pawpal_users_db');
        const dbUser = dbUsers.find(u =>
            sameUserId(u.id, userId) ||
            (currentUser && sameUserId(u.phone, currentUser.phone))
        );
        const effectiveUserId = dbUser ? dbUser.id : userId;

        // Tập hợp tất cả id có thể của user hiện tại để match rộng nhất
        const knownIds = new Set(
            [userId, effectiveUserId, currentUser?.id, dbUser?.id]
                .filter(Boolean)
                .map(String)
        );
        const currentPhone = currentUser?.phone ? String(currentUser.phone) : null;

        const matchOrder = (order) => {
            // Match theo userId (bất kỳ variant nào)
            const orderUserId = order.userId?._id || order.userId;
            if (orderUserId && knownIds.has(String(orderUserId))) return true;
            if (order.userLegacyId && knownIds.has(String(order.userLegacyId))) return true;

            // Match theo phone (ưu tiên nhất vì orders.js lưu userPhone)
            if (!currentPhone) return false;
            if (order.userPhone && String(order.userPhone) === currentPhone) return true;
            if (order.delivery?.phone && String(order.delivery.phone) === currentPhone) return true;
            if (order.shipping?.phone && String(order.shipping.phone) === currentPhone) return true;

            return false;
        };

        if (Array.isArray(orders)) {
            return orders.filter(matchOrder);
        }

        // Offline path — không gọi lại initData(), dùng localStorage trực tiếp
        const localOrders = safeReadArray('pawpal_orders');
        return localOrders.filter(matchOrder);
    },

    async getCareLogs() {
        const careLogs = await this.request('/api/care-logs');
        if (careLogs && typeof careLogs === 'object') return careLogs;
        // Offline path — không gọi lại initData()
        return safeReadObject('pawpal_pet_tracker_logs') || {};
    },

    async getUserCart(userId) {
        if (!userId) return safeReadArray('pawpal_cart');
        const cart = await this.request(`/api/cart/${encodeURIComponent(userId)}`);
        if (cart && typeof cart === 'object' && Array.isArray(cart.items)) {
            return cart.items;
        }
        return safeReadArray('pawpal_cart');
    },

    async saveUserCart(userId, items) {
        if (!userId) {
            localStorage.setItem('pawpal_cart', JSON.stringify(Array.isArray(items) ? items : []));
            return { success: true, data: items };
        }
        // Luôn lưu localStorage (offline-first)
        localStorage.setItem('pawpal_cart', JSON.stringify(Array.isArray(items) ? items : []));
        // Sync lên server nếu backend bật
        if (this.USE_BACKEND) {
            const saved = await this.request(`/api/cart/${encodeURIComponent(userId)}`, {
                method: 'PUT',
                body: JSON.stringify({ items: Array.isArray(items) ? items : [] })
            });
            return { success: true, data: saved || items };
        }
        return { success: true, data: items };
    },

    async getUserWishlist(userId) {
        if (!userId) {
            return {
                productIds: safeReadArray('pawpal_wishlist_guest'),
                serviceIds: safeReadArray('pawpal_wishlist_services_guest')
            };
        }

        // Thử server trước
        const wishlist = await this.request(`/api/wishlist/${encodeURIComponent(userId)}`);
        if (wishlist && typeof wishlist === 'object') {
            return {
                productIds: Array.isArray(wishlist.productIds) ? wishlist.productIds : [],
                serviceIds: Array.isArray(wishlist.serviceIds) ? wishlist.serviceIds : []
            };
        }

        // Offline: đọc từ localStorage theo key của user (dùng phone để match với shop.js)
        const currentUser = safeReadObject('pawpal_current_user');
        const userPhone = currentUser?.phone ? String(currentUser.phone) : null;
        const productKey  = userPhone ? `pawpal_wishlist_${userPhone}` : 'pawpal_wishlist_guest';
        const serviceKey  = userPhone ? `pawpal_wishlist_services_${userPhone}` : 'pawpal_wishlist_services_guest';
        return {
            productIds: safeReadArray(productKey),
            serviceIds: safeReadArray(serviceKey)
        };
    },

    async saveUserWishlist(userId, wishlist) {
        const payload = {
            productIds: Array.isArray(wishlist?.productIds) ? wishlist.productIds.map(String) : [],
            serviceIds: Array.isArray(wishlist?.serviceIds) ? wishlist.serviceIds.map(String) : []
        };
        if (!userId) {
            safeWrite('pawpal_wishlist_guest', payload.productIds);
            safeWrite('pawpal_wishlist_services_guest', payload.serviceIds);
            return { success: true, data: payload };
        }

        // Thử sync lên server
        const saved = await this.request(`/api/wishlist/${encodeURIComponent(userId)}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        // Dù server thành công hay không, luôn lưu localStorage theo key của user
        const currentUser = safeReadObject('pawpal_current_user');
        const userPhone = currentUser?.phone ? String(currentUser.phone) : null;
        if (userPhone) {
            safeWrite(`pawpal_wishlist_${userPhone}`, payload.productIds);
            safeWrite(`pawpal_wishlist_services_${userPhone}`, payload.serviceIds);
        } else {
            safeWrite('pawpal_wishlist_guest', payload.productIds);
            safeWrite('pawpal_wishlist_services_guest', payload.serviceIds);
        }
        return { success: true, data: saved || payload };
    },

    async getUserById(userId) {
        const users = await this.request('/api/users');
        if (Array.isArray(users)) {
            return users.find(user => sameUserId(user._id || user.id, userId) || sameUserId(user.legacyId, userId)) || null;
        }
        // Offline path — không gọi lại initData()
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
                // Local (user-modified) wins cho các field action — seed chỉ cung cấp metadata tĩnh
                merged.set(String(item.id), {
                    ...item,
                    // Booking user-action fields
                    status:      local.status      ?? item.status,
                    date:        local.date        ?? item.date,
                    time:        local.time        ?? item.time,
                    timeStart:   local.timeStart   ?? item.timeStart,
                    timeEnd:     local.timeEnd     ?? item.timeEnd,
                    staff:       local.staff       ?? item.staff,
                    changeCount: local.changeCount ?? item.changeCount,
                    cancelCount: local.cancelCount ?? item.cancelCount,
                    note:        local.note        ?? item.note,
                    // Loyalty
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

// Expose ra window để các script non-module (cart.js, wishlist.js, landing.js...) dùng được
window.API = API;
