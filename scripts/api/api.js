/**
 * Mock API layer for PawPal.
 * JSON files in /data are the source of demo data. localStorage is only a writable cache
 * so user actions such as editing pets or cancelling orders can still work without a backend.
 */

export const API = {
    DATA_VERSION: '2026-06-25-v2-add-4-users-data',

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
        if (shouldRefreshMockData || localOrders.length === 0 || !localOrders.some(order => order.userId)) {
            const orders = await this.getJSON('/data/orders.json');
            if (orders) {
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
            const returns = await this.getJSON('/data/returns.json');
            if (returns) localStorage.setItem('pawpal_returns', JSON.stringify(mergeById(returns, localReturns)));
        }

        const localCareLogs = safeReadObject('pawpal_pet_tracker_logs') || {};
        if (shouldRefreshMockData || Object.keys(localCareLogs).length === 0) {
            const careLogs = await this.getJSON('/data/care-logs.json');
            if (careLogs) {
                localStorage.setItem('pawpal_pet_tracker_logs', JSON.stringify(mergeCareLogs(careLogs, localCareLogs)));
            }
        }

        localStorage.setItem('pawpal_mock_data_version', this.DATA_VERSION);
    },

    async getUserPets(userId) {
        await this.initData();
        const pets = safeReadArray('pawpal_pets');
        return pets.filter(pet => sameUserId(pet.userId, userId));
    },

    async getUserBookings(userId) {
        await this.initData();
        const bookings = safeReadArray('pawpal_bookings');
        return bookings.filter(booking => sameUserId(booking.userId, userId));
    },

    async getUserOrders(userId) {
        await this.initData();
        const orders = safeReadArray('pawpal_orders');
        return orders.filter(order => sameUserId(order.userId, userId));
    },

    async getCareLogs() {
        await this.initData();
        return safeReadObject('pawpal_pet_tracker_logs') || {};
    },

    async updateUserProfile(userId, newData) {
        await this.initData();

        return new Promise((resolve) => {
            setTimeout(() => {
                const users = safeReadArray('pawpal_users_db');
                const idx = users.findIndex(user => sameUserId(user.id, userId));

                if (idx === -1) {
                    resolve({ success: false, message: 'Khong tim thay user' });
                    return;
                }

                users[idx] = { ...users[idx], ...newData };
                localStorage.setItem('pawpal_users_db', JSON.stringify(users));

                const currentUser = safeReadObject('pawpal_current_user');
                if (currentUser && sameUser(currentUser, users[idx])) {
                    localStorage.setItem('pawpal_current_user', JSON.stringify(users[idx]));
                }

                resolve({ success: true, data: users[idx] });
            }, 300);
        });
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
    (Array.isArray(seedItems) ? seedItems : []).forEach(item => {
        if (item && item.id) merged.set(String(item.id), item);
    });
    (Array.isArray(localItems) ? localItems : []).forEach(item => {
        if (item && item.id) merged.set(String(item.id), { ...(merged.get(String(item.id)) || {}), ...item });
    });
    return Array.from(merged.values());
}

function mergeCareLogs(seedLogs, localLogs) {
    return {
        ...(seedLogs && typeof seedLogs === 'object' ? seedLogs : {}),
        ...(localLogs && typeof localLogs === 'object' ? localLogs : {})
    };
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
