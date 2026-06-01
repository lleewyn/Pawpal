/* ==========================================================================
   seed-data.js — Giả lập dữ liệu demo cho PawPal Dashboard
   Inject vào localStorage: pawpal_pets, pawpal_bookings, pawpal_user
   Chỉ chạy một lần (kiểm tra flag "pawpal_seeded")
   ========================================================================== */

(function seedPawPalData() {
    // Không seed lại nếu đã có dữ liệu thật
    if (localStorage.getItem('pawpal_seeded') === 'v5') return;

    /* ──────────────────────────────────────────────────────────────────────
       1. USER INFO
    ────────────────────────────────────────────────────────────────────── */
    const user = {
        name:      'Nguyễn Phương Anh',
        phone:     '0901 234 567',
        points:    820,
        rank:      'Vàng',
        createdAt: '2025-01-15T08:00:00.000Z',
    };
    localStorage.setItem('pawpal_user', JSON.stringify(user));

    /* ──────────────────────────────────────────────────────────────────────
       2. PETS
    ────────────────────────────────────────────────────────────────────── */
    const pets = [
        {
            id:        'PP-1001',
            name:      'Bông',
            species:   'Chó',
            breed:     'Poodle',
            weight:    4.2,
            birthday:  '2022-03-10',
            allergies: 'Dị ứng lúa mì, tránh thức ăn có gluten',
            notes:     'Thích được vuốt ve, sợ tiếng ồn lớn. Ăn hạt Royal Canin Poodle Adult.',
            photo:     '',
            deleted:   false,
            createdAt: '2025-01-15T08:00:00.000Z',
            updatedAt: '2025-01-15T08:00:00.000Z',
        },
        {
            id:        'PP-1002',
            name:      'Miu',
            species:   'Mèo',
            breed:     'Mèo Anh lông ngắn',
            weight:    3.8,
            birthday:  '2021-07-22',
            allergies: '',
            notes:     'Tính cách độc lập, không thích bị bế lâu. Thích đồ chơi có lông vũ.',
            photo:     '',
            deleted:   false,
            createdAt: '2025-02-01T09:00:00.000Z',
            updatedAt: '2025-02-01T09:00:00.000Z',
        },
    ];
    localStorage.setItem('pawpal_pets', JSON.stringify(pets));

    /* ──────────────────────────────────────────────────────────────────────
       3. BOOKINGS
       Bao gồm đủ các trạng thái để test mọi luồng:
       - Hoàn thành (Spa) → Nhật ký đầy đủ 6 bước
       - Đang thực hiện (Hotel) → Nhật ký 3/7 bước + Live banner
       - Đã đặt (Spa) → Nhật ký chưa bắt đầu (empty log)
       - Chờ xác nhận → Hiện trong tab Lịch hẹn
       - Đã hủy → Hiện trong tab Lịch hẹn (filter Đã hủy)
    ────────────────────────────────────────────────────────────────────── */
    const today   = new Date();
    const fmt     = d => d.toISOString().slice(0, 10);
    const daysAgo = n => { const d = new Date(today); d.setDate(d.getDate() - n); return fmt(d); };
    const daysFwd = n => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };

    const bookings = [

        /* ── Booking 1: Bông — Spa Toàn Diện — HOÀN THÀNH ── */
        {
            code:   'PP-100101',
            status: 'Hoàn thành',
            selectedService: {
                id:       'SPA03',
                name:     'Spa Toàn Diện Premium',
                category: 'Spa & Grooming',
                price:    '350.000đ',
            },
            petInfo: {
                ownerName: 'Nguyễn Phương Anh',
                phone:     '0901 234 567',
                petName:   'Bông',
                petType:   'Chó',
                breed:     'Poodle',
                weight:    '4.2',
                notes:     'Dị ứng lúa mì, cắt kiểu Teddy Bear',
            },
            schedule: {
                date: daysAgo(5),
                slot: '09:00',
            },
            createdAt:   new Date(today.getTime() - 6 * 86400000).toISOString(),
            completedAt: new Date(today.getTime() - 5 * 86400000 + 4 * 3600000).toISOString(),
        },

        /* ── Booking 2: Bông — Spa Cơ Bản — HOÀN THÀNH ── */
        {
            code:   'PP-100102',
            status: 'Hoàn thành',
            selectedService: {
                id:       'SPA01',
                name:     'Tắm & Sấy Cơ Bản',
                category: 'Spa & Grooming',
                price:    '180.000đ',
            },
            petInfo: {
                ownerName: 'Nguyễn Phương Anh',
                phone:     '0901 234 567',
                petName:   'Bông',
                petType:   'Chó',
                breed:     'Poodle',
                weight:    '4.2',
                notes:     '',
            },
            schedule: {
                date: daysAgo(15),
                slot: '14:00',
            },
            createdAt:   new Date(today.getTime() - 16 * 86400000).toISOString(),
            completedAt: new Date(today.getTime() - 15 * 86400000 + 2 * 3600000).toISOString(),
        },

        /* ── Booking 3: Bông — Pet Hotel — ĐANG THỰC HIỆN ── */
        {
            code:   'PP-100103',
            status: 'Đang thực hiện',
            selectedService: {
                id:       'HTL01',
                name:     'Pet Hotel Standard',
                category: 'Pet Hotel',
                price:    '350.000đ/đêm × 3 đêm = 1.050.000đ',
            },
            petInfo: {
                ownerName: 'Nguyễn Phương Anh',
                phone:     '0901 234 567',
                petName:   'Bông',
                petType:   'Chó',
                breed:     'Poodle',
                weight:    '4.2',
                notes:     'Ăn hạt Royal Canin, không cho ăn đồ lạ',
            },
            schedule: {
                checkIn:  daysAgo(1),
                checkOut: daysFwd(2),
                nights:   3,
            },
            createdAt: new Date(today.getTime() - 2 * 86400000).toISOString(),
        },

        /* ── Booking 4: Miu — Spa Mèo — HOÀN THÀNH ── */
        {
            code:   'PP-100201',
            status: 'Hoàn thành',
            selectedService: {
                id:       'SPA07',
                name:     'Spa Chuyên Biệt Mèo',
                category: 'Spa & Grooming',
                price:    '280.000đ',
            },
            petInfo: {
                ownerName: 'Nguyễn Phương Anh',
                phone:     '0901 234 567',
                petName:   'Miu',
                petType:   'Mèo',
                breed:     'Mèo Anh lông ngắn',
                weight:    '3.8',
                notes:     'Không thích bị bế, cần nhẹ nhàng',
            },
            schedule: {
                date: daysAgo(8),
                slot: '10:30',
            },
            createdAt:   new Date(today.getTime() - 9 * 86400000).toISOString(),
            completedAt: new Date(today.getTime() - 8 * 86400000 + 3 * 3600000).toISOString(),
        },

        /* ── Booking 5: Miu — Spa — ĐÃ ĐẶT (sắp tới) ── */
        {
            code:   'PP-100202',
            status: 'Đã đặt',
            selectedService: {
                id:       'SPA02',
                name:     'Tắm & Cắt Tỉa Cơ Bản',
                category: 'Spa & Grooming',
                price:    '220.000đ',
            },
            petInfo: {
                ownerName: 'Nguyễn Phương Anh',
                phone:     '0901 234 567',
                petName:   'Miu',
                petType:   'Mèo',
                breed:     'Mèo Anh lông ngắn',
                weight:    '3.8',
                notes:     '',
            },
            schedule: {
                date: daysFwd(3),
                slot: '09:00',
            },
            createdAt: new Date(today.getTime() - 1 * 86400000).toISOString(),
        },

        /* ── Booking 6: Bông — Chờ xác nhận ── */
        {
            code:   'PP-100104',
            status: 'Chờ xác nhận',
            selectedService: {
                id:       'SPA05',
                name:     'Gói Spa VIP Toàn Diện',
                category: 'Spa & Grooming',
                price:    '480.000đ',
            },
            petInfo: {
                ownerName: 'Nguyễn Phương Anh',
                phone:     '0901 234 567',
                petName:   'Bông',
                petType:   'Chó',
                breed:     'Poodle',
                weight:    '4.2',
                notes:     'Cắt kiểu Puppy Cut',
            },
            schedule: {
                date: daysFwd(7),
                slot: '08:00',
            },
            createdAt: new Date().toISOString(),
        },

        /* ── Booking 7: Bông — Đã hủy ── */
        {
            code:   'PP-100105',
            status: 'Đã hủy',
            selectedService: {
                id:       'HTL02',
                name:     'Pet Hotel Premium',
                category: 'Pet Hotel',
                price:    '500.000đ/đêm',
            },
            petInfo: {
                ownerName: 'Nguyễn Phương Anh',
                phone:     '0901 234 567',
                petName:   'Bông',
                petType:   'Chó',
                breed:     'Poodle',
                weight:    '4.2',
                notes:     '',
            },
            schedule: {
                checkIn:  daysAgo(20),
                checkOut: daysAgo(17),
                nights:   3,
            },
            createdAt:   new Date(today.getTime() - 22 * 86400000).toISOString(),
            cancelledAt: new Date(today.getTime() - 21 * 86400000).toISOString(),
        },

        /* ── Booking 8: Bông — Hotel Premium — HOÀN THÀNH (30 ngày trước) ── */
        {
            code:   'PP-100106',
            status: 'Hoàn thành',
            selectedService: {
                id:       'HTL02',
                name:     'Pet Hotel Premium',
                category: 'Pet Hotel',
                price:    '500.000đ/đêm × 2 đêm = 1.000.000đ',
            },
            petInfo: {
                ownerName: 'Nguyễn Phương Anh',
                phone:     '0901 234 567',
                petName:   'Bông',
                petType:   'Chó',
                breed:     'Poodle',
                weight:    '4.2',
                notes:     'Ăn hạt Royal Canin, không cho ăn đồ lạ. Thích đồ chơi bóng.',
            },
            schedule: {
                checkIn:  daysAgo(32),
                checkOut: daysAgo(30),
                nights:   2,
            },
            createdAt:   new Date(today.getTime() - 33 * 86400000).toISOString(),
            completedAt: new Date(today.getTime() - 30 * 86400000).toISOString(),
        },

        /* ── Booking 9: Miu — Spa Mèo Cơ Bản — HOÀN THÀNH (45 ngày trước) ── */
        {
            code:   'PP-100203',
            status: 'Hoàn thành',
            selectedService: {
                id:       'SPA06',
                name:     'Tắm & Vệ Sinh Mèo Cơ Bản',
                category: 'Spa & Grooming',
                price:    '180.000đ',
            },
            petInfo: {
                ownerName: 'Nguyễn Phương Anh',
                phone:     '0901 234 567',
                petName:   'Miu',
                petType:   'Mèo',
                breed:     'Mèo Anh lông ngắn',
                weight:    '3.8',
                notes:     'Lần đầu đến PawPal, cần tiếp cận nhẹ nhàng.',
            },
            schedule: {
                date: daysAgo(45),
                slot: '10:00',
            },
            createdAt:   new Date(today.getTime() - 46 * 86400000).toISOString(),
            completedAt: new Date(today.getTime() - 45 * 86400000 + 2 * 3600000).toISOString(),
        },

    ]; // end bookings array

    localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));

    /* ──────────────────────────────────────────────────────────────────────
       4. TRACKER LOGS — Nhật ký chi tiết từng bước cho mỗi booking
       Key: pawpal_tracker_logs  →  { [bookingCode]: [ ...logItems ] }
    ────────────────────────────────────────────────────────────────────── */

    // Helper tính thời gian từ ngày + offset phút
    function makeTime(dateStr, offsetMin) {
        const d = new Date(dateStr + 'T08:00:00');
        d.setMinutes(d.getMinutes() + offsetMin);
        return {
            time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        };
    }

    const trackerLogs = {};

    /* ── PP-100101: Bông — Spa Toàn Diện Premium — HOÀN THÀNH ── */
    trackerLogs['PP-100101'] = [
        {
            key: 'checkin', icon: '🏠', label: 'Tiếp nhận & kiểm tra sức khỏe',
            ...makeTime(daysAgo(5), 0),
            isDone: true, isLive: false, isPending: false,
            staff: 'Minh Anh',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Bông đã được tiếp nhận lúc 08:00. Kiểm tra tổng quát: mắt sáng, lông sạch, nhiệt độ 38.4°C. Cân nặng ghi nhận: 4.2 kg. <em>Đã lưu ý dị ứng lúa mì — tránh sản phẩm có gluten.</em>',
            image: '../assets/images/tracker/belu-1.png',
        },
        {
            key: 'bath', icon: '🛁', label: 'Tắm & vệ sinh',
            ...makeTime(daysAgo(5), 45),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thanh Hà',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Bông được tắm bằng sữa tắm chuyên dụng cho Poodle, pH cân bằng, không gây kích ứng da. Nước ấm 37°C, thời gian tắm ~20 phút. Lông và da sạch hoàn toàn.',
            image: '../assets/images/tracker/belu-2.png',
        },
        {
            key: 'dry', icon: '💨', label: 'Sấy khô & chải lông',
            ...makeTime(daysAgo(5), 90),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thanh Hà',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Sấy khô bằng máy sấy chuyên nghiệp nhiệt độ thấp, an toàn cho da nhạy cảm. Chải lông kỹ từng lớp — lông Bông mềm mượt, bồng bềnh và thơm tho.',
            image: null,
        },
        {
            key: 'groom', icon: '✂️', label: 'Cắt tỉa & tạo kiểu',
            ...makeTime(daysAgo(5), 135),
            isDone: true, isLive: false, isPending: false,
            staff: 'Quốc Bảo',
            mood: { key: 'active', label: '⚡ Năng động', cls: 'mood-active' },
            note: 'Cắt kiểu <strong>Teddy Bear</strong> theo yêu cầu. Tỉa móng, vệ sinh tai, làm sạch vùng mắt. Bông rất ngoan, không giãy giụa. Kết quả: trông dễ thương hơn hẳn!',
            image: '../assets/images/tracker/belu-3.png',
        },
        {
            key: 'finish', icon: '✨', label: 'Hoàn thiện & chụp ảnh kỷ niệm',
            ...makeTime(daysAgo(5), 180),
            isDone: true, isLive: false, isPending: false,
            staff: 'Minh Anh',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Xịt nước hoa thú cưng nhẹ nhàng, đeo nơ hồng theo yêu cầu của chủ. Chụp ảnh kỷ niệm cho Bông. Nhân viên đánh giá: bé rất hợp tác và đáng yêu trong suốt buổi.',
            image: null,
        },
        {
            key: 'checkout', icon: '🎀', label: 'Bàn giao & tổng kết',
            ...makeTime(daysAgo(5), 225),
            isDone: true, isLive: false, isPending: false,
            staff: 'Minh Anh',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Bông đã được bàn giao cho chủ nuôi lúc 11:45. Nhân viên tổng kết buổi chăm sóc, hướng dẫn chải lông tại nhà 2 lần/tuần. Hẹn gặp lại lần sau! 🐾',
            image: null,
        },
    ];

    /* ── PP-100102: Bông — Tắm & Sấy Cơ Bản — HOÀN THÀNH ── */
    trackerLogs['PP-100102'] = [
        {
            key: 'checkin', icon: '🏠', label: 'Tiếp nhận & kiểm tra sức khỏe',
            ...makeTime(daysAgo(15), 0),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Bông đến lúc 08:00, tình trạng sức khỏe tốt. Nhiệt độ 38.3°C, cân nặng 4.2 kg. Bé có vẻ quen thuộc với không gian PawPal, không tỏ ra lo lắng.',
            image: '../assets/images/tracker/belu-1.png',
        },
        {
            key: 'bath', icon: '🛁', label: 'Tắm & vệ sinh',
            ...makeTime(daysAgo(15), 40),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Tắm cơ bản với sữa tắm dịu nhẹ. Bông khá ngoan, chỉ vẫy đuôi liên tục trong lúc tắm. Lông sạch, không có dấu hiệu kích ứng da.',
            image: '../assets/images/tracker/belu-2.png',
        },
        {
            key: 'dry', icon: '💨', label: 'Sấy khô & chải lông',
            ...makeTime(daysAgo(15), 80),
            isDone: true, isLive: false, isPending: false,
            staff: 'Hải Đăng',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Sấy khô hoàn toàn trong ~25 phút. Chải lông nhẹ nhàng, lông Bông bồng bềnh và thơm. Bé tỏ ra thích thú khi được chải.',
            image: null,
        },
        {
            key: 'groom', icon: '✂️', label: 'Cắt tỉa & tạo kiểu',
            ...makeTime(daysAgo(15), 120),
            isDone: true, isLive: false, isPending: false,
            staff: 'Quốc Bảo',
            mood: { key: 'active', label: '⚡ Năng động', cls: 'mood-active' },
            note: 'Tỉa gọn lông vùng mắt, tai và chân. Cắt móng. Không cắt kiểu đặc biệt theo gói cơ bản. Bông rất ngoan trong suốt quá trình.',
            image: '../assets/images/tracker/belu-3.png',
        },
        {
            key: 'finish', icon: '✨', label: 'Hoàn thiện & chụp ảnh kỷ niệm',
            ...makeTime(daysAgo(15), 155),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Hoàn thiện buổi tắm cơ bản. Bông trông sạch sẽ và tươi tắn. Chụp ảnh kỷ niệm nhanh trước khi bàn giao.',
            image: null,
        },
        {
            key: 'checkout', icon: '🎀', label: 'Bàn giao & tổng kết',
            ...makeTime(daysAgo(15), 175),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Bàn giao lúc 10:55. Buổi tắm cơ bản hoàn thành suôn sẻ. Nhân viên nhắc chủ nuôi tắm lại sau 2 tuần để duy trì vệ sinh tốt nhất.',
            image: null,
        },
    ];

    /* ── PP-100103: Bông — Pet Hotel Standard — ĐANG THỰC HIỆN ── */
    trackerLogs['PP-100103'] = [
        {
            key: 'checkin', icon: '🏠', label: 'Check-in & kiểm tra sức khỏe',
            ...makeTime(daysAgo(1), 0),
            isDone: true, isLive: false, isPending: false,
            staff: 'Minh Anh',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Bông check-in lúc 08:00. Kiểm tra sức khỏe đầu vào: nhiệt độ 38.5°C, nhịp tim bình thường. Xác nhận đã tiêm vaccine đầy đủ. <em>Đã ghi nhận: ăn hạt Royal Canin, không cho ăn đồ lạ.</em>',
            image: '../assets/images/tracker/belu-1.png',
        },
        {
            key: 'settle', icon: '🛏️', label: 'Ổn định phòng & làm quen',
            ...makeTime(daysAgo(1), 45),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thanh Hà',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Bông được dẫn vào phòng Standard. Bé tỏ ra tò mò, khám phá xung quanh trong ~10 phút rồi nằm xuống đệm. Đã đặt đồ chơi quen thuộc và chăn mềm theo yêu cầu.',
            image: '../assets/images/tracker/belu-2.png',
        },
        {
            key: 'meal', icon: '🍖', label: 'Bữa ăn & uống nước',
            ...makeTime(daysAgo(1), 120),
            isDone: true, isLive: false, isPending: false,
            staff: 'Quốc Bảo',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Bữa sáng: 80g hạt Royal Canin Poodle Adult + nước sạch. Bông ăn hết sạch trong 5 phút, uống đủ nước. Không có dấu hiệu bất thường về tiêu hóa.',
            image: '../assets/images/tracker/belu-3.png',
        },
        {
            key: 'play', icon: '🎾', label: 'Vui chơi & vận động',
            ...makeTime(daysAgo(1), 180),
            isDone: false, isLive: true, isPending: false,
            staff: 'Hải Đăng',
            mood: null,
            note: 'Bông đang được ra khu vui chơi ngoài trời. Bé chạy nhảy năng động và tương tác tốt với nhân viên. Đang theo dõi sát sao.',
            image: null,
        },
        {
            key: 'rest', icon: '😴', label: 'Nghỉ ngơi & ngủ trưa',
            ...makeTime(daysAgo(1), 225),
            isDone: false, isLive: false, isPending: true,
            staff: null, mood: null, note: null, image: null,
        },
        {
            key: 'health', icon: '💊', label: 'Kiểm tra sức khỏe định kỳ',
            ...makeTime(daysAgo(1), 270),
            isDone: false, isLive: false, isPending: true,
            staff: null, mood: null, note: null, image: null,
        },
        {
            key: 'checkout', icon: '🎀', label: 'Check-out & tổng kết',
            ...makeTime(daysFwd(2), 0),
            isDone: false, isLive: false, isPending: true,
            staff: null, mood: null, note: null, image: null,
        },
    ];

    /* ── PP-100201: Miu — Spa Chuyên Biệt Mèo — HOÀN THÀNH ── */
    trackerLogs['PP-100201'] = [
        {
            key: 'checkin', icon: '🏠', label: 'Tiếp nhận & kiểm tra sức khỏe',
            ...makeTime(daysAgo(8), 0),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Miu đến lúc 10:30. Kiểm tra tổng quát: nhiệt độ 38.6°C, lông sạch, mắt sáng. Cân nặng 3.8 kg. <em>Lưu ý: Miu không thích bị bế lâu — nhân viên sẽ tiếp cận nhẹ nhàng.</em>',
            image: '../assets/images/tracker/belu-1.png',
        },
        {
            key: 'bath', icon: '🛁', label: 'Tắm & vệ sinh',
            ...makeTime(daysAgo(8), 45),
            isDone: true, isLive: false, isPending: false,
            staff: 'Minh Anh',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Tắm bằng sữa tắm chuyên biệt cho mèo lông ngắn, không gây kích ứng. Miu khá hợp tác — chỉ kêu nhẹ một lần khi gội đầu. Lông sạch và bóng mượt.',
            image: '../assets/images/tracker/belu-2.png',
        },
        {
            key: 'dry', icon: '💨', label: 'Sấy khô & chải lông',
            ...makeTime(daysAgo(8), 85),
            isDone: true, isLive: false, isPending: false,
            staff: 'Minh Anh',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Sấy khô ở nhiệt độ thấp, giữ khoảng cách an toàn. Miu dần quen và nằm yên. Lông mèo Anh lông ngắn sau khi sấy trông rất bóng và mịn.',
            image: null,
        },
        {
            key: 'groom', icon: '✂️', label: 'Cắt tỉa & tạo kiểu',
            ...makeTime(daysAgo(8), 120),
            isDone: true, isLive: false, isPending: false,
            staff: 'Quốc Bảo',
            mood: { key: 'active', label: '⚡ Năng động', cls: 'mood-active' },
            note: 'Tỉa lông vùng bụng và chân, cắt móng cẩn thận. Vệ sinh tai và mắt. Miu tỏ ra không thích phần cắt móng nhưng nhân viên xử lý nhanh và nhẹ nhàng.',
            image: '../assets/images/tracker/belu-3.png',
        },
        {
            key: 'finish', icon: '✨', label: 'Hoàn thiện & chụp ảnh kỷ niệm',
            ...makeTime(daysAgo(8), 155),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Hoàn thiện: xịt nước hoa nhẹ dành riêng cho mèo. Miu trông sạch sẽ và sang trọng. Chụp ảnh kỷ niệm — bé nhìn thẳng vào camera rất đáng yêu!',
            image: null,
        },
        {
            key: 'checkout', icon: '🎀', label: 'Bàn giao & tổng kết',
            ...makeTime(daysAgo(8), 180),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Miu được bàn giao lúc 13:30. Nhân viên tổng kết: bé hợp tác tốt hơn so với lần đầu. Khuyến nghị tắm định kỳ mỗi 4–6 tuần. Hẹn gặp lại! 🐱',
            image: null,
        },
    ];

    /* ── PP-100104: Bông — Spa VIP — CHỜ XÁC NHẬN (chưa bắt đầu) ── */
    trackerLogs['PP-100104'] = [
        {
            key: 'checkin', icon: '🏠', label: 'Tiếp nhận & kiểm tra sức khỏe',
            ...makeTime(daysFwd(7), 0),
            isDone: false, isLive: false, isPending: true,
            staff: null, mood: null, note: null, image: null,
        },
        {
            key: 'bath', icon: '🛁', label: 'Tắm & vệ sinh',
            ...makeTime(daysFwd(7), 45),
            isDone: false, isLive: false, isPending: true,
            staff: null, mood: null, note: null, image: null,
        },
        {
            key: 'dry', icon: '💨', label: 'Sấy khô & chải lông',
            ...makeTime(daysFwd(7), 90),
            isDone: false, isLive: false, isPending: true,
            staff: null, mood: null, note: null, image: null,
        },
        {
            key: 'groom', icon: '✂️', label: 'Cắt tỉa & tạo kiểu',
            ...makeTime(daysFwd(7), 135),
            isDone: false, isLive: false, isPending: true,
            staff: null, mood: null, note: null, image: null,
        },
        {
            key: 'finish', icon: '✨', label: 'Hoàn thiện & chụp ảnh kỷ niệm',
            ...makeTime(daysFwd(7), 180),
            isDone: false, isLive: false, isPending: true,
            staff: null, mood: null, note: null, image: null,
        },
        {
            key: 'checkout', icon: '🎀', label: 'Bàn giao & tổng kết',
            ...makeTime(daysFwd(7), 225),
            isDone: false, isLive: false, isPending: true,
            staff: null, mood: null, note: null, image: null,
        },
    ];

    /* ── PP-100106: Bông — Pet Hotel Premium — HOÀN THÀNH (30 ngày trước) ── */
    trackerLogs['PP-100106'] = [
        {
            key: 'checkin', icon: '🏠', label: 'Check-in & kiểm tra sức khỏe',
            ...makeTime(daysAgo(32), 0),
            isDone: true, isLive: false, isPending: false,
            staff: 'Minh Anh',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Bông check-in lúc 08:00. Kiểm tra đầu vào: nhiệt độ 38.4°C, cân nặng 4.2 kg, vaccine đầy đủ. <em>Ghi nhận: thích đồ chơi bóng, ăn hạt Royal Canin.</em> Bé tỏ ra hơi lo lắng ban đầu nhưng nhanh chóng bình tĩnh lại.',
            image: '../assets/images/tracker/belu-1.png',
        },
        {
            key: 'settle', icon: '🛏️', label: 'Ổn định phòng & làm quen',
            ...makeTime(daysAgo(32), 50),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thanh Hà',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Bông được dẫn vào phòng Premium — rộng rãi, có cửa sổ nhìn ra vườn. Bé khám phá phòng trong 15 phút, sau đó nằm xuống đệm êm. Đã đặt đồ chơi bóng quen thuộc.',
            image: '../assets/images/tracker/belu-2.png',
        },
        {
            key: 'meal', icon: '🍖', label: 'Bữa ăn & uống nước',
            ...makeTime(daysAgo(32), 120),
            isDone: true, isLive: false, isPending: false,
            staff: 'Quốc Bảo',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Bữa sáng: 80g hạt Royal Canin Poodle Adult + nước sạch. Bông ăn ngon miệng, ăn hết sạch trong 4 phút. Uống đủ nước. Không có dấu hiệu bất thường.',
            image: null,
        },
        {
            key: 'play', icon: '🎾', label: 'Vui chơi & vận động',
            ...makeTime(daysAgo(32), 180),
            isDone: true, isLive: false, isPending: false,
            staff: 'Hải Đăng',
            mood: { key: 'active', label: '⚡ Năng động', cls: 'mood-active' },
            note: 'Bông được ra khu vui chơi ngoài trời 45 phút. Bé chạy nhảy rất năng động, đặc biệt thích trò ném bóng. Tương tác tốt với nhân viên và các bé khác trong khu vui chơi.',
            image: '../assets/images/tracker/belu-3.png',
        },
        {
            key: 'rest', icon: '😴', label: 'Nghỉ ngơi & ngủ trưa',
            ...makeTime(daysAgo(32), 240),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thanh Hà',
            mood: { key: 'tired', label: '😴 Mệt mỏi', cls: 'mood-tired' },
            note: 'Sau buổi chơi năng động, Bông về phòng và ngủ trưa ngon lành. Điều hòa duy trì 26°C. Bé nằm cuộn tròn trên đệm — trông rất bình yên và thoải mái.',
            image: null,
        },
        {
            key: 'health', icon: '💊', label: 'Kiểm tra sức khỏe định kỳ',
            ...makeTime(daysAgo(31), 60),
            isDone: true, isLive: false, isPending: false,
            staff: 'Minh Anh',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Kiểm tra sức khỏe ngày 2: nhiệt độ 38.3°C, nhịp tim 90 lần/phút (bình thường), mắt và mũi sạch. Bông ăn uống đều đặn, không có dấu hiệu bất thường. Tình trạng sức khỏe xuất sắc.',
            image: null,
        },
        {
            key: 'checkout', icon: '🎀', label: 'Check-out & tổng kết',
            ...makeTime(daysAgo(30), 0),
            isDone: true, isLive: false, isPending: false,
            staff: 'Minh Anh',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Bông check-out lúc 08:00 sau 2 đêm lưu trú. Tổng kết: bé ăn uống tốt, vui chơi năng động, sức khỏe ổn định. Nhân viên nhắc lịch tắm định kỳ sau 2 tuần. Hẹn gặp lại! 🐾',
            image: null,
        },
    ];

    /* ── PP-100202: Miu — Tắm & Cắt Tỉa — ĐÃ ĐẶT (chưa bắt đầu) ── */
    trackerLogs['PP-100202'] = [
        { key: 'checkin',  icon: '🏠', label: 'Tiếp nhận & kiểm tra sức khỏe', ...makeTime(daysFwd(3), 0),   isDone: false, isLive: false, isPending: true, staff: null, mood: null, note: null, image: null },
        { key: 'bath',     icon: '🛁', label: 'Tắm & vệ sinh',                  ...makeTime(daysFwd(3), 40),  isDone: false, isLive: false, isPending: true, staff: null, mood: null, note: null, image: null },
        { key: 'dry',      icon: '💨', label: 'Sấy khô & chải lông',            ...makeTime(daysFwd(3), 80),  isDone: false, isLive: false, isPending: true, staff: null, mood: null, note: null, image: null },
        { key: 'groom',    icon: '✂️', label: 'Cắt tỉa & tạo kiểu',            ...makeTime(daysFwd(3), 115), isDone: false, isLive: false, isPending: true, staff: null, mood: null, note: null, image: null },
        { key: 'finish',   icon: '✨', label: 'Hoàn thiện & chụp ảnh kỷ niệm', ...makeTime(daysFwd(3), 150), isDone: false, isLive: false, isPending: true, staff: null, mood: null, note: null, image: null },
        { key: 'checkout', icon: '🎀', label: 'Bàn giao & tổng kết',            ...makeTime(daysFwd(3), 175), isDone: false, isLive: false, isPending: true, staff: null, mood: null, note: null, image: null },
    ];

    /* ── PP-100203: Miu — Spa Mèo Cơ Bản — HOÀN THÀNH (45 ngày trước) ── */
    trackerLogs['PP-100203'] = [
        {
            key: 'checkin', icon: '🏠', label: 'Tiếp nhận & kiểm tra sức khỏe',
            ...makeTime(daysAgo(45), 0),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Miu đến lúc 10:00, tình trạng sức khỏe tốt, lông hơi rối. Bé có vẻ rụt rè trong lần đầu đến PawPal. Cân nặng 3.8 kg.',
            image: '../assets/images/tracker/belu-1.png',
        },
        {
            key: 'bath', icon: '🛁', label: 'Tắm & vệ sinh',
            ...makeTime(daysAgo(45), 45),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'calm', label: '😌 Bình tĩnh', cls: 'mood-calm' },
            note: 'Tắm nhanh với sữa tắm dịu nhẹ để bé không bị hoảng. Vệ sinh tai, cắt móng. Bé Miu khá ngoan ngoãn.',
            image: '../assets/images/tracker/belu-2.png',
        },
        {
            key: 'dry', icon: '💨', label: 'Sấy khô & chải lông',
            ...makeTime(daysAgo(45), 85),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Sấy khô lông, dùng lồng sấy chuyên dụng cho mèo. Chải lại lông rụng. Bé đã thư giãn hơn.',
            image: null,
        },
        {
            key: 'groom', icon: '✂️', label: 'Cắt tỉa & tạo kiểu',
            ...makeTime(daysAgo(45), 120),
            isDone: true, isLive: false, isPending: false,
            staff: 'Quốc Bảo',
            mood: { key: 'active', label: '⚡ Năng động', cls: 'mood-active' },
            note: 'Không có cắt tỉa theo gói cơ bản. Chỉ làm gọn lông bàn chân và mông cho sạch sẽ.',
            image: '../assets/images/tracker/belu-3.png',
        },
        {
            key: 'finish', icon: '✨', label: 'Hoàn thiện & chụp ảnh kỷ niệm',
            ...makeTime(daysAgo(45), 155),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Hoàn thiện, xịt dưỡng lông. Miu thơm tho và rạng rỡ. Đã chụp ảnh bé với nơ nhỏ xinh xắn.',
            image: null,
        },
        {
            key: 'checkout', icon: '🎀', label: 'Bàn giao & tổng kết',
            ...makeTime(daysAgo(45), 180),
            isDone: true, isLive: false, isPending: false,
            staff: 'Thu Trang',
            mood: { key: 'happy', label: '😊 Vui vẻ', cls: 'mood-happy' },
            note: 'Bàn giao Miu cho chủ lúc 13:00. Dặn dò cách chăm sóc lông tại nhà. Lần đầu trải nghiệm suôn sẻ.',
            image: null,
        },
    ];

    localStorage.setItem('pawpal_tracker_logs', JSON.stringify(trackerLogs));

    /* ──────────────────────────────────────────────────────────────────────
       5. ORDERS — Đơn hàng mua sắm từ cửa hàng
       Key: pawpal_orders  →  [ ...orderObjects ]
    ────────────────────────────────────────────────────────────────────── */
    const orders = [

        /* ── Đơn 1: Hoàn thành — đã thanh toán ── */
        {
            code:          'DH-20260001',
            orderStatus:   'Hoàn thành',
            paymentStatus: 'Đã thanh toán',
            method:        'COD',
            createdAt:     new Date(today.getTime() - 10 * 86400000).toISOString(),
            updatedAt:     new Date(today.getTime() - 8  * 86400000).toISOString(),
            form: {
                name:     'Nguyễn Phương Anh',
                phone:    '0901 234 567',
                address:  '123 Nguyễn Trãi',
                ward:     'Phường Bến Thành',
                district: 'Quận 1',
                province: 'TP. Hồ Chí Minh',
                note:     'Giao giờ hành chính',
            },
            cart: [
                { sku: 'RC-POODLE-A', name: 'Royal Canin Poodle Adult 3kg', brand: 'Royal Canin', price: 420000, qty: 1, img: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=80&h=80&fit=crop' },
                { sku: 'KONG-BALL-M', name: 'Đồ chơi bóng KONG Classic M', brand: 'KONG',        price: 185000, qty: 2, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop' },
            ],
            subtotal:     790000,
            shippingCost: 0,
            discount:     0,
            total:        790000,
            coupon:       null,
            statusHistory: [
                { status: 'Chờ xác nhận',       timestamp: new Date(today.getTime() - 10 * 86400000).toISOString(), note: 'Đơn hàng đã được đặt thành công.' },
                { status: 'Đang chuẩn bị hàng', timestamp: new Date(today.getTime() -  9 * 86400000).toISOString(), note: 'Kho hàng đang đóng gói sản phẩm.' },
                { status: 'Đang giao',           timestamp: new Date(today.getTime() -  8 * 86400000).toISOString(), note: 'Đơn hàng đã được bàn giao cho đơn vị vận chuyển.' },
                { status: 'Hoàn thành',          timestamp: new Date(today.getTime() -  7 * 86400000).toISOString(), note: 'Giao hàng thành công. Cảm ơn bạn đã mua sắm tại PawPal! 🐾' },
            ],
        },

        /* ── Đơn 2: Đang giao — chưa thanh toán (COD) ── */
        {
            code:          'DH-20260002',
            orderStatus:   'Đang giao',
            paymentStatus: 'Chưa thanh toán',
            method:        'COD',
            createdAt:     new Date(today.getTime() - 2 * 86400000).toISOString(),
            updatedAt:     new Date(today.getTime() - 1 * 86400000).toISOString(),
            form: {
                name:     'Nguyễn Phương Anh',
                phone:    '0901 234 567',
                address:  '123 Nguyễn Trãi',
                ward:     'Phường Bến Thành',
                district: 'Quận 1',
                province: 'TP. Hồ Chí Minh',
                note:     '',
            },
            cart: [
                { sku: 'SHAMPOO-POODLE', name: 'Sữa tắm Poodle Pro 500ml', brand: 'PawPal Care', price: 145000, qty: 2, img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=80&h=80&fit=crop' },
                { sku: 'COMB-FINE',      name: 'Lược chải lông mịn',       brand: 'Trixie',      price:  89000, qty: 1, img: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=80&h=80&fit=crop' },
            ],
            subtotal:     379000,
            shippingCost: 30000,
            discount:     0,
            total:        409000,
            coupon:       null,
            statusHistory: [
                { status: 'Chờ xác nhận',       timestamp: new Date(today.getTime() - 2 * 86400000).toISOString(), note: 'Đơn hàng đã được đặt thành công.' },
                { status: 'Đang chuẩn bị hàng', timestamp: new Date(today.getTime() - 1 * 86400000 - 3600000).toISOString(), note: 'Kho hàng đang đóng gói sản phẩm.' },
                { status: 'Đang giao',           timestamp: new Date(today.getTime() - 1 * 86400000).toISOString(), note: 'Đơn hàng đang trên đường giao đến bạn.' },
            ],
        },

        /* ── Đơn 3: Chờ xác nhận — thanh toán online ── */
        {
            code:          'DH-20260003',
            orderStatus:   'Chờ xác nhận',
            paymentStatus: 'Đã thanh toán',
            method:        'online',
            onlineMethod:  'Thẻ ATM nội địa',
            createdAt:     new Date(today.getTime() - 3600000).toISOString(),
            updatedAt:     new Date(today.getTime() - 3600000).toISOString(),
            form: {
                name:     'Nguyễn Phương Anh',
                phone:    '0901 234 567',
                address:  '123 Nguyễn Trãi',
                ward:     'Phường Bến Thành',
                district: 'Quận 1',
                province: 'TP. Hồ Chí Minh',
                note:     'Để trước cửa nếu không có người nhận',
            },
            cart: [
                { sku: 'RC-KITTEN-2KG', name: 'Royal Canin Kitten 2kg',       brand: 'Royal Canin', price: 380000, qty: 1, img: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=80&h=80&fit=crop' },
                { sku: 'SNACK-CAT-50G', name: 'Snack thưởng mèo Ciao 50g x3', brand: 'Ciao',        price:  75000, qty: 3, img: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=80&h=80&fit=crop' },
            ],
            subtotal:     605000,
            shippingCost: 0,
            discount:     50000,
            total:        555000,
            coupon:       { code: 'PAWPAL10' },
            statusHistory: [
                { status: 'Chờ xác nhận', timestamp: new Date(today.getTime() - 3600000).toISOString(), note: 'Đơn hàng đã được đặt thành công. Đang chờ xác nhận từ cửa hàng.' },
            ],
        },

        /* ── Đơn 4: Đã hủy ── */
        {
            code:          'DH-20260004',
            orderStatus:   'Đã hủy',
            paymentStatus: 'Chưa thanh toán',
            method:        'COD',
            createdAt:     new Date(today.getTime() - 20 * 86400000).toISOString(),
            updatedAt:     new Date(today.getTime() - 19 * 86400000).toISOString(),
            form: {
                name:     'Nguyễn Phương Anh',
                phone:    '0901 234 567',
                address:  '123 Nguyễn Trãi',
                ward:     'Phường Bến Thành',
                district: 'Quận 1',
                province: 'TP. Hồ Chí Minh',
                note:     '',
            },
            cart: [
                { sku: 'HARNESS-S', name: 'Dây dắt chó có yếm size S', brand: 'Ruffwear', price: 320000, qty: 1, img: 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=80&h=80&fit=crop' },
            ],
            subtotal:     320000,
            shippingCost: 30000,
            discount:     0,
            total:        350000,
            coupon:       null,
            statusHistory: [
                { status: 'Chờ xác nhận', timestamp: new Date(today.getTime() - 20 * 86400000).toISOString(), note: 'Đơn hàng đã được đặt thành công.' },
                { status: 'Đã hủy',       timestamp: new Date(today.getTime() - 19 * 86400000).toISOString(), note: 'Khách hàng yêu cầu hủy đơn hàng.' },
            ],
        },

    ];

    localStorage.setItem('pawpal_orders', JSON.stringify(orders));

    /* ──────────────────────────────────────────────────────────────────────
       6. Đánh dấu đã seed
    ────────────────────────────────────────────────────────────────────── */
    localStorage.setItem('pawpal_seeded', 'v5');

    console.log('%c[PawPal Seed] ✅ Dữ liệu demo đã được inject vào localStorage.', 'color:#2A5944;font-weight:bold;');
    console.log('  → pawpal_pets:',          JSON.parse(localStorage.getItem('pawpal_pets')).length, 'bé');
    console.log('  → pawpal_bookings:',      JSON.parse(localStorage.getItem('pawpal_bookings')).length, 'lịch hẹn');
    console.log('  → pawpal_tracker_logs:',  Object.keys(JSON.parse(localStorage.getItem('pawpal_tracker_logs'))).length, 'nhật ký');
    console.log('  → pawpal_orders:',        JSON.parse(localStorage.getItem('pawpal_orders')).length, 'đơn hàng');

})();
