/**
 * Mock API layer for PawPal.
 * JSON files in /data are the source of demo data. localStorage is only a writable cache
 * so user actions such as editing pets or cancelling orders can still work without a backend.
 */

export const API = {
    DATA_VERSION: '2026-06-28-v6-fix-accents',

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
        const shouldRefreshMockData = localStorage.getItem('pawpal_mock_data_version') !== this.DATA_VERSION;

        const localUsers = safeReadArray('pawpal_users_db');
        if (shouldRefreshMockData || localUsers.length === 0 || localUsers.length <= 3) {
            const users = await this.getJSON('/data/users.json');
            if (users) {
                const mergedUsers = mergeById(users, localUsers);
                localStorage.setItem('pawpal_users_db', JSON.stringify(mergedUsers));

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
                        localStorage.setItem('pawpal_current_user', JSON.stringify(safeUser));
                    }
                }
            }
        }

        const localPets = safeReadArray('pawpal_pets');
        if (shouldRefreshMockData || localPets.length === 0 || !localPets.some(pet => pet.userId)) {
            const pets = await this.getJSON('/data/pets.json');
            if (pets) localStorage.setItem('pawpal_pets', JSON.stringify(mergeById(pets, localPets)));
        }

        const localBookings = safeReadArray('pawpal_bookings');
        if (shouldRefreshMockData || localBookings.length === 0 || !localBookings.some(booking => booking.userId)) {
            const bookings = await this.getJSON('/data/bookings.json');
            if (bookings) localStorage.setItem('pawpal_bookings', JSON.stringify(mergeById(bookings, localBookings)));
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
                        status: local.status,
                        paymentStatus: local.paymentStatus,
                        updatedAt: local.updatedAt
                    };
                });
                localOrders.forEach(local => {
                    if (!mergedOrders.some(o => String(o.id) === String(local.id))) {
                        mergedOrders.push(local);
                    }
                });
                localStorage.setItem('pawpal_orders', JSON.stringify(mergedOrders));
                localStorage.setItem('pawpal_orders_seeded', 'true');
            }
        }

        // Normalize orders on every startup so older cached records keep working.
        const normalizedOrders = normalizeOrders(safeReadArray('pawpal_orders'));
        if (normalizedOrders.length) {
            localStorage.setItem('pawpal_orders', JSON.stringify(normalizedOrders));
        }

        const localReturns = safeReadArray('pawpal_returns');
        if (shouldRefreshMockData || localReturns.length === 0) {
            const returns = await this.getJSON(`/data/returns.json?v=${this.DATA_VERSION}`);
            if (returns) localStorage.setItem('pawpal_returns', JSON.stringify(mergeById(returns, localReturns)));
        }

        const localCareLogs = safeReadObject('pawpal_pet_tracker_logs') || {};
        if (shouldRefreshMockData || Object.keys(localCareLogs).length === 0) {
            const careLogs = await this.getJSON(`/data/care-logs.json?v=${this.DATA_VERSION}`);
            if (careLogs) {
                localStorage.setItem('pawpal_pet_tracker_logs', JSON.stringify(mergeCareLogs(careLogs, localCareLogs)));
            }
        }

        localStorage.setItem('pawpal_mock_data_version', this.DATA_VERSION);
    },

    async getUserPets(userId) {
        const pets = await this.request(`/api/pets`);
        if (Array.isArray(pets)) {
            const currentUser = safeReadObject('pawpal_current_user');
            return pets.filter(pet =>
                sameUserId(pet.userId?._id || pet.userId, userId) ||
                sameUserId(pet.userLegacyId, userId) ||
                sameUserId(pet.userLegacyId, currentUser?.id) ||
                sameUserId(pet.userId?._id || pet.userId, currentUser?._id) ||
                sameUserId(pet.userLegacyId, currentUser?.legacyId) ||
                sameUserId(currentUser?.phone, pet.ownerPhone) ||
                sameUserId(currentUser?.phone, pet.phone)
            );
        }
        await this.initData();
        const localPets = safeReadArray('pawpal_pets');
        const currentUser = safeReadObject('pawpal_current_user');
        return localPets.filter(pet =>
            sameUserId(pet.userId, userId) ||
            sameUserId(pet.userLegacyId, userId) ||
            sameUserId(pet.userLegacyId, currentUser?.id) ||
            sameUserId(pet.userId, currentUser?._id) ||
            sameUserId(currentUser?.phone, pet.ownerPhone) ||
            sameUserId(currentUser?.phone, pet.phone)
        );
    },

    async getUserBookings(userId) {
        const bookings = await this.request(`/api/bookings`);
        if (Array.isArray(bookings)) {
            return bookings.filter(booking => sameUserId(booking.userId?._id || booking.userId, userId) || sameUserId(booking.userLegacyId, userId));
        }
        await this.initData();
        const localBookings = safeReadArray('pawpal_bookings');
        return localBookings.filter(booking => sameUserId(booking.userId, userId));
    },

    async getUserOrders(userId) {
        const orders = await this.request(`/api/orders`);
        if (Array.isArray(orders)) {
            return orders.filter(order => sameUserId(order.userId?._id || order.userId, userId) || sameUserId(order.userLegacyId, userId));
        }
        await this.initData();
        const localOrders = safeReadArray('pawpal_orders');
        const currentUser = safeReadObject('pawpal_current_user');
        return localOrders.filter(order => {
            if (sameUserId(order.userId, userId)) {
                return true;
            }

            if (!currentUser) {
                return false;
            }

            return Boolean(
                order.userPhone && currentUser.phone && String(order.userPhone) === String(currentUser.phone)
            );
        });
    },

    async getCareLogs() {
        const careLogs = await this.request('/api/care-logs');
        if (careLogs && typeof careLogs === 'object') return careLogs;
        await this.initData();
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
        const saved = await this.request(`/api/cart/${encodeURIComponent(userId)}`, {
            method: 'PUT',
            body: JSON.stringify({ items: Array.isArray(items) ? items : [] })
        });
        if (saved) {
            localStorage.setItem('pawpal_cart', JSON.stringify(Array.isArray(items) ? items : []));
            return { success: true, data: saved };
        }
        return { success: false };
    },

    async getUserWishlist(userId) {
        if (!userId) {
            const product = safeReadArray('pawpal_wishlist_guest');
            return { productIds: product, serviceIds: safeReadArray('pawpal_wishlist_services_guest') };
        }
        const wishlist = await this.request(`/api/wishlist/${encodeURIComponent(userId)}`);
        if (wishlist && typeof wishlist === 'object') {
            return {
                productIds: Array.isArray(wishlist.productIds) ? wishlist.productIds : [],
                serviceIds: Array.isArray(wishlist.serviceIds) ? wishlist.serviceIds : []
            };
        }
        return { productIds: [], serviceIds: [] };
    },

    async saveUserWishlist(userId, wishlist) {
        const payload = {
            productIds: Array.isArray(wishlist?.productIds) ? wishlist.productIds.map(String) : [],
            serviceIds: Array.isArray(wishlist?.serviceIds) ? wishlist.serviceIds.map(String) : []
        };
        if (!userId) {
            localStorage.setItem('pawpal_wishlist_guest', JSON.stringify(payload.productIds));
            localStorage.setItem('pawpal_wishlist_services_guest', JSON.stringify(payload.serviceIds));
            return { success: true, data: payload };
        }
        const saved = await this.request(`/api/wishlist/${encodeURIComponent(userId)}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        if (saved) {
            localStorage.setItem('pawpal_wishlist_guest', JSON.stringify(payload.productIds));
            localStorage.setItem('pawpal_wishlist_services_guest', JSON.stringify(payload.serviceIds));
            return { success: true, data: saved };
        }
        return { success: false };
    },

    async getUserById(userId) {
        const users = await this.request('/api/users');
        if (Array.isArray(users)) {
            return users.find(user => sameUserId(user._id || user.id, userId) || sameUserId(user.legacyId, userId)) || null;
        }
        await this.initData();
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
                localStorage.setItem('pawpal_current_user', JSON.stringify(updated));
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
        localStorage.setItem('pawpal_users_db', JSON.stringify(users));
        const currentUser = safeReadObject('pawpal_current_user');
        if (currentUser && sameUser(currentUser, users[idx])) {
            localStorage.setItem('pawpal_current_user', JSON.stringify(users[idx]));
        }
        return { success: true, data: users[idx] };
    }
};

function safeReadArray(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
    } catch (error) {
        return [];
    }
}

function safeReadObject(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        return value && typeof value === 'object' ? value : null;
    } catch (error) {
        return null;
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
            merged.set(String(item.id), local ? { ...item, status: local.status || item.status } : item);
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
