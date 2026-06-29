const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Pet = require('../models/Pet');
const Booking = require('../models/Booking');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Return = require('../models/Return');
const CareLog = require('../models/CareLog');
const SupportTicket = require('../models/SupportTicket');
const Voucher = require('../models/Voucher');
const Notification = require('../models/Notification');

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

function readJson(relPath) {
    const fullPath = path.join(__dirname, '..', '..', '..', relPath);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

async function seedCollection(Model, items, transform) {
    await Model.deleteMany({});
    const docs = transform ? items.map(transform) : items;
    if (docs.length) await Model.insertMany(docs);
    return docs.length;
}

async function main() {
    await connectDB();

    const users = readJson('data/users.json');
    const pets = readJson('data/pets.json');
    const bookings = readJson('data/bookings.json');
    const orders = readJson('data/orders.json');
    const returns = readJson('data/returns.json');
    const careLogs = readJson('data/care-logs.json');
    const supportTickets = readJson('data/support-tickets.json');
    const vouchers = readJson('data/vouchers.json');
    const notifications = readJson('data/notifications.json');

    await seedCollection(User, users, (item) => ({
        legacyId: item.id,
        name: item.name,
        phone: item.phone,
        email: item.email,
        password: item.password,
        role: item.role,
        is_temporary: item.is_temporary,
        points: item.points,
        accountType: item.accountType,
        tier: item.tier || item.accountType || '',
        address: item.address,
        settings: item.settings,
        notifications: item.notifications,
        socialLinks: item.socialLinks,
        avatar: item.avatar
    }));

    const savedUsers = await User.find({});
    const userMap = new Map(savedUsers.map(user => [user.legacyId, user._id]));

    await seedCollection(Pet, pets, (item) => ({
        legacyId: item.id,
        userLegacyId: item.userId,
        userId: userMap.get(item.userId) || null,
        name: item.name,
        species: item.species,
        breed: item.breed,
        gender: item.gender,
        weight: item.weight,
        dob: item.dob,
        color: item.color,
        vaccinated: item.vaccinated,
        allergies: item.allergies,
        notes: item.notes,
        avatar: item.avatar,
        isArchived: item.isArchived
    }));

    const savedPets = await Pet.find({});
    const petMap = new Map(savedPets.map(pet => [pet.legacyId, pet._id]));

    await seedCollection(Booking, bookings, (item) => ({
        legacyId: item.id,
        userLegacyId: item.userId,
        petLegacyId: item.petId,
        userId: userMap.get(item.userId) || null,
        petId: petMap.get(item.petId) || null,
        serviceName: item.serviceName,
        date: item.date,
        time: item.time,
        status: item.status,
        price: item.price,
        branch: item.branch,
        staff: item.staff || '',
        note: item.note || '',
        changeCount: item.changeCount || 0
    }));

    await seedCollection(Order, orders, (item) => ({
        legacyId: item.id,
        userLegacyId: item.userId,
        userId: userMap.get(item.userId) || null,
        status: item.status,
        paymentStatus: item.paymentStatus,
        paymentMethod: item.paymentMethod,
        createdAtLegacy: item.createdAt,
        updatedAtLegacy: item.updatedAt,
        delivery: item.delivery,
        products: item.products || [],
        pricing: item.pricing || {},
        timeline: item.timeline || [],
        allowedActions: item.allowedActions || []
    }));

    await seedCollection(Return, returns, (item) => ({
        legacyId: `${item.orderId}-${item.rmaId}`,
        orderId: item.orderId,
        rmaId: item.rmaId,
        createdAtLegacy: item.createdAt,
        status: item.status,
        reason: item.reason,
        type: item.type,
        description: item.description,
        products: item.products || []
    }));

    await seedCollection(CareLog, Object.entries(careLogs || {}).map(([petId, value]) => ({
        petId,
        currentSession: value.currentSession || {},
        history: value.history || []
    })));

    await seedCollection(SupportTicket, supportTickets, (item) => ({
        legacyId: item.id,
        title: item.title,
        type: item.type,
        priority: item.priority,
        status: item.status,
        messages: item.messages || [],
        rating: item.rating ?? null,
        ratingComment: item.ratingComment || ''
    }));

    await seedCollection(Voucher, vouchers, (item) => ({
        code: item.code,
        type: item.type,
        value: item.value,
        minOrderValue: item.minOrderValue,
        maxDiscount: item.maxDiscount,
        validFrom: item.validFrom,
        validUntil: item.validUntil,
        usageCount: item.usageCount,
        maxUsage: item.maxUsage,
        applicableFor: item.applicableFor || [],
        description: item.description,
        active: item.active
    }));

    await seedCollection(Notification, notifications, (item) => ({
        legacyId: item.id,
        type: item.type,
        title: item.title,
        content: item.content,
        timeOffsetMinutes: item.timeOffsetMinutes,
        read: item.read,
        link: item.link
    }));

    await seedCollection(Cart, [], null);
    await seedCollection(Wishlist, [], null);

    console.log(`Seeded ${users.length} users, ${pets.length} pets, ${bookings.length} bookings, ${orders.length} orders, ${returns.length} returns, ${Object.keys(careLogs || {}).length} careLogs, ${supportTickets.length} tickets, ${vouchers.length} vouchers, ${notifications.length} notifications, cart/wishlist collections ready`);
    process.exit(0);
}

main().catch((error) => {
    console.error('[seed] failed:', error);
    process.exit(1);
});
