// services.js - Phân hệ Quản lý Dịch vụ Pawpal-er
(function() {
    // Dữ liệu mẫu lịch hẹn khởi tạo từ bookings.json kết hợp chi tiết dịch vụ
    const initialBookings = [
        {
            id: 'BKG-1001',
            userId: 'USER-001',
            customerName: 'Lê Lệ Quyên',
            phone: '0901234567',
            petId: 'PET-001',
            petName: 'Miu Con',
            petBreed: 'Mèo Anh Lông Ngắn',
            petWeight: '4.2 kg',
            petAge: '2 tuổi',
            serviceCode: 'SPA01',
            category: 'Spa',
            categoryName: 'Spa và Grooming',
            serviceName: 'Gói Tắm Vệ Sinh Cơ Bản',
            date: '2026-06-25',
            time: '14:00',
            duration: '60 phút',
            staff: 'Ngọc Anh',
            branch: 'PawPal Chi nhánh Quận 1',
            price: 250000,
            addonPrice: 0,
            discount: 0,
            total: 250000,
            paymentStatus: 'Chưa thanh toán (Tại quầy)',
            status: 'confirmed',
            alertType: 'upcoming',
            petAlert: 'Dị ứng phấn hoa và các loại dầu tắm chứa hương liệu đậm đặc.',
            customerNote: 'Bé hơi nhát nước, xin hãy massage nhẹ nhàng trước khi xả nước.',
            timeline: [
                { time: '13:50', title: 'Tiếp nhận Pet', desc: 'Đã đón bé tại quầy tiếp tân cơ sở Quận 1', done: true, staff: 'Ngọc Anh' },
                { time: '14:00', title: 'Kiểm tra da lông sơ bộ', desc: 'Kiểm tra vết nấm, ve rận và độ dài móng', done: true, staff: 'Ngọc Anh' },
                { time: '14:15', title: 'Tắm và Sấy khô', desc: 'Sử dụng dầu tắm thảo dược Hypoallergenic dịu nhẹ', done: false, staff: 'Ngọc Anh' },
                { time: '14:45', title: 'Cắt móng và Vệ sinh tai', desc: 'Mài dũa móng và vệ sinh vành tai', done: false, staff: 'Ngọc Anh' },
                { time: '15:00', title: 'Hoàn tất và Bàn giao', desc: 'Chụp ảnh gửi chủ và xuất phiếu hoàn tất ca', done: false, staff: 'Ngọc Anh' }
            ]
        },
        {
            id: 'BKG-1002',
            userId: 'USER-001',
            customerName: 'Lê Lệ Quyên',
            phone: '0901234567',
            petId: 'PET-002',
            petName: 'Miu Miu',
            petBreed: 'Chó Poodle Tiny',
            petWeight: '3.1 kg',
            petAge: '1.5 tuổi',
            serviceCode: 'SPA07',
            category: 'Spa',
            categoryName: 'Spa và Grooming',
            serviceName: 'Grooming Tạo Kiểu Cơ Bản',
            date: '2026-06-10',
            time: '09:30',
            duration: '150 phút',
            staff: 'Hoàng Nam',
            branch: 'PawPal Chi nhánh Quận 10',
            price: 400000,
            addonPrice: 0,
            discount: 0,
            total: 400000,
            paymentStatus: 'Đã thanh toán (VNPay)',
            status: 'completed',
            alertType: null,
            petAlert: null,
            customerNote: 'Tỉa tròn mặt kiểu Boo xinh xắn.',
            timeline: [
                { time: '09:30', title: 'Tiếp nhận và Tạo kiểu', desc: 'Tiếp nhận bé Poodle và kiểm tra dáng lông', done: true, staff: 'Hoàng Nam' },
                { time: '10:15', title: 'Tắm xả dưỡng phồng lông', desc: 'Sấy khô và đánh tơi lông chuyên nghiệp', done: true, staff: 'Hoàng Nam' },
                { time: '11:30', title: 'Cắt tỉa tạo kiểu Boo', desc: 'Cắt tỉa mặt tròn Boo và bo tròn 4 chân', done: true, staff: 'Hoàng Nam' },
                { time: '12:00', title: 'Bàn giao cho chủ', desc: 'Bé đã được chủ đón về trong tình trạng vui vẻ', done: true, staff: 'Hoàng Nam' }
            ]
        },
        {
            id: 'BKG-1003',
            userId: 'USER-ADMIN',
            customerName: 'Trần Minh Quân',
            phone: '0912345678',
            petId: 'PET-003',
            petName: 'Bông Xù',
            petBreed: 'Chó Samoyed',
            petWeight: '18.5 kg',
            petAge: '3 tuổi',
            serviceCode: 'HTL03',
            category: 'Hotel',
            categoryName: 'Pet Hotel',
            serviceName: 'Phòng Deluxe (3 ngày)',
            date: '2026-07-01',
            time: '08:00',
            duration: '3 ngày',
            staff: 'Thu Thảo',
            branch: 'PawPal Chi nhánh Quận 1',
            price: 1200000,
            addonPrice: 150000,
            discount: 50000,
            total: 1300000,
            paymentStatus: 'Đã thanh toán (MoMo)',
            status: 'confirmed',
            alertType: null,
            petAlert: 'Thích ăn thịt bò luộc, không ăn thức ăn hạt vị cá ngừ.',
            customerNote: 'Bật điều hòa 24/24 và mở link camera cho mình theo dõi nhé.',
            timeline: [
                { time: '08:00', title: 'Check-in tiếp nhận', desc: 'Đã đón bé và nhận hướng dẫn chăm sóc riêng', done: true, staff: 'Thu Thảo' },
                { time: '12:00', title: 'Bữa trưa dinh dưỡng', desc: 'Cho bé ăn thịt bò áp chảo trộn rau củ luộc', done: false, staff: 'Thu Thảo' },
                { time: '16:00', title: 'Vận động sân cỏ', desc: 'Dắt đi dạo và vui chơi sân cỏ nhân tạo', done: false, staff: 'Thu Thảo' }
            ]
        },
        {
            id: 'BKG-1004',
            userId: 'USER-001',
            customerName: 'Lê Lệ Quyên',
            phone: '0901234567',
            petId: 'PET-001',
            petName: 'Miu Con',
            petBreed: 'Mèo Anh Lông Ngắn',
            petWeight: '4.2 kg',
            petAge: '2 tuổi',
            serviceCode: 'SPA01',
            category: 'Spa',
            categoryName: 'Spa và Grooming',
            serviceName: 'Tắm sấy trọn gói',
            date: '2026-06-24',
            time: '10:00',
            duration: '60 phút',
            staff: 'Ngọc Anh',
            branch: 'PawPal Chi nhánh Quận 1',
            price: 280000,
            addonPrice: 0,
            discount: 0,
            total: 280000,
            paymentStatus: 'Đã thanh toán (Tiền mặt)',
            status: 'completed',
            alertType: null,
            petAlert: null,
            customerNote: 'Cần uốn tóc sau khi tắm.',
            timeline: [
                { time: '10:00', title: 'Tiếp nhận', desc: 'Đã tiếp nhận bé', done: true, staff: 'Ngọc Anh' },
                { time: '10:45', title: 'Tắm sấy', desc: 'Hoàn tất tắm sấy', done: true, staff: 'Ngọc Anh' },
                { time: '11:00', title: 'Hoàn thành ca', desc: 'Khách hàng ký nhận', done: true, staff: 'Ngọc Anh' }
            ]
        },
        {
            id: 'BKG-1005',
            userId: 'USER-001',
            customerName: 'Lê Lệ Quyên',
            phone: '0901234567',
            petId: 'PET-002',
            petName: 'Miu Miu',
            petBreed: 'Chó Poodle Tiny',
            petWeight: '3.1 kg',
            petAge: '1.5 tuổi',
            serviceCode: 'SPA05',
            category: 'Spa',
            categoryName: 'Spa và Grooming',
            serviceName: 'Cắt tỉa vệ sinh',
            date: '2026-06-24',
            time: '16:30',
            duration: '30 phút',
            staff: 'Thu Thảo',
            branch: 'PawPal Chi nhánh Quận 10',
            price: 180000,
            addonPrice: 0,
            discount: 0,
            total: 180000,
            paymentStatus: 'Đã hoàn tiền',
            status: 'cancelled',
            alertType: null,
            petAlert: null,
            customerNote: 'Khách đã hủy vì bận đột xuất.',
            timeline: [
                { time: '16:00', title: 'Khách báo hủy', desc: 'Khách gọi điện xin hủy vì lịch trình bận đột xuất', done: true, staff: 'Thu Thảo' }
            ]
        },
        {
            id: 'BKG-1006',
            userId: 'USER-003',
            customerName: 'Hoàng Hải Yến',
            phone: '0987654321',
            petId: 'PET-004',
            petName: 'Lucky',
            petBreed: 'Chó Corgi Pembroke',
            petWeight: '11.2 kg',
            petAge: '2.5 tuổi',
            serviceCode: 'SPA02',
            category: 'Spa',
            categoryName: 'Spa và Grooming',
            serviceName: 'Gói Tắm Dưỡng Premium',
            date: '2026-06-27',
            time: '09:00',
            duration: '90 phút',
            staff: '',
            branch: 'PawPal Chi nhánh Quận 1',
            price: 350000,
            addonPrice: 50000,
            discount: 0,
            total: 400000,
            paymentStatus: 'Chưa thanh toán (Chờ xác nhận)',
            status: 'pending',
            alertType: 'urgent',
            petAlert: 'Chưa phân công kỹ thuật viên phụ trách.',
            customerNote: 'Mong xếp bạn nhân viên khéo tay vì bé Corgi rất hiếu động.',
            timeline: [
                { time: '08:30', title: 'Tạo lịch Online', desc: 'Khách hàng đặt lịch hẹn qua Website PawPal', done: true, staff: 'Hệ thống' }
            ]
        },
        {
            id: 'BKG-1007',
            userId: 'USER-004',
            customerName: 'Phạm Đức Trọng',
            phone: '0978112233',
            petId: 'PET-005',
            petName: 'Bơ Béo',
            petBreed: 'Mèo Ba Tư Mặt Tịt',
            petWeight: '5.0 kg',
            petAge: '4 tuổi',
            serviceCode: 'TXI01',
            category: 'Taxi',
            categoryName: 'Pet Taxi',
            serviceName: 'Dịch Vụ Xe Đưa Đón Tận Nơi',
            date: '2026-06-27',
            time: '10:30',
            duration: 'Theo chuyến',
            staff: 'Hữu Phúc',
            branch: 'PawPal Chi nhánh Quận 1',
            price: 150000,
            addonPrice: 0,
            discount: 0,
            total: 150000,
            paymentStatus: 'Chưa thanh toán (Tại quầy)',
            status: 'in_progress',
            alertType: 'upcoming',
            petAlert: 'Dễ bị say xe, cần lót khăn êm và giữ khoang cabin mát mẻ.',
            customerNote: 'Đón tại số 45 Lê Duẩn, P. Bến Nghé, Q.1.',
            timeline: [
                { time: '10:15', title: 'Xuất phát đón bé', desc: 'Tài xế Hữu Phúc xuất phát đến điểm hẹn', done: true, staff: 'Hữu Phúc' },
                { time: '10:30', title: 'Tiếp nhận bé lên xe', desc: 'Đã đưa bé Bơ Béo vào lồng vận chuyển an toàn', done: true, staff: 'Hữu Phúc' },
                { time: '10:45', title: 'Đang di chuyển', desc: 'Xe đang trên đường về PawPal Chi nhánh Quận 1', done: false, staff: 'Hữu Phúc' }
            ]
        },
        {
            id: 'BKG-1008',
            userId: 'USER-002',
            customerName: 'Trần Minh Quân',
            phone: '0912345678',
            petId: 'PET-003',
            petName: 'Bông Xù',
            petBreed: 'Chó Samoyed',
            petWeight: '18.5 kg',
            petAge: '3 tuổi',
            serviceCode: 'SPA10',
            category: 'Spa',
            categoryName: 'Spa và Grooming',
            serviceName: 'Tắm Thuốc Trị Liệu Da Liễu',
            date: '2026-06-27',
            time: '14:30',
            duration: '90 phút',
            staff: 'Ngọc Anh',
            branch: 'PawPal Chi nhánh Quận 1',
            price: 400000,
            addonPrice: 0,
            discount: 0,
            total: 400000,
            paymentStatus: 'Đã thanh toán (VNPay)',
            status: 'confirmed',
            alertType: 'upcoming',
            petAlert: 'Da lưng đang có mảng viêm đỏ nhẹ, cần thoa dầu tắm y tế cẩn thận.',
            customerNote: 'Nhờ tắm thuốc kỹ vùng bả vai cho bé.',
            timeline: [
                { time: '14:00', title: 'Chuẩn bị phòng thuốc', desc: 'Đã chuẩn bị bồn ngâm thảo dược đông y', done: true, staff: 'Ngọc Anh' }
            ]
        }
    ];

    // Dữ liệu danh mục dịch vụ mẫu lấy từ dichvu.csv
    const initialServices = [
        {
            code: 'SPA01',
            group: 'spa',
            categoryName: 'Spa và Grooming – Chăm sóc cơ bản',
            name: 'Gói Tắm Vệ Sinh Cơ Bản',
            petType: 'Chó / Mèo',
            duration: '60 phút',
            rating: 4.8,
            reviews: 154,
            priceFrom: '120.000',
            prices: { under5: '120.000', to10: '150.000', to20: '200.000', over20: '250.000' },
            desc: 'Liệu trình tắm làm sạch và khử mùi hôi cơ bản dành cho các bé chó mèo có sức khỏe da lông bình thường.',
            staffLevel: 'Junior Groomer',
            status: 'Đang phục vụ',
            image: '/assets/images/services/spa/process/spa01.webp'
        },
        {
            code: 'SPA02',
            group: 'spa',
            categoryName: 'Spa và Grooming – Chăm sóc cơ bản',
            name: 'Gói Tắm Dưỡng Premium',
            petType: 'Chó / Mèo',
            duration: '90 phút',
            rating: 4.9,
            reviews: 92,
            priceFrom: '220.000',
            prices: { under5: '220.000', to10: '270.000', to20: '350.000', over20: '450.000' },
            desc: 'Liệu trình tắm dưỡng chuyên sâu kết hợp massage thư giãn, phục hồi lông hư tổn.',
            staffLevel: 'Senior Groomer',
            status: 'Đang phục vụ',
            image: '/assets/images/services/spa/process/tam_cho5.jpg'
        },
        {
            code: 'SPA07',
            group: 'spa',
            categoryName: 'Spa và Grooming – Tạo kiểu',
            name: 'Grooming Tạo Kiểu Cơ Bản',
            petType: 'Chó',
            duration: '150 phút',
            rating: 4.9,
            reviews: 210,
            priceFrom: '350.000',
            prices: { under5: '350.000', to10: '400.000', to20: '500.000', over20: '650.000' },
            desc: 'Gói làm đẹp toàn diện bao gồm tắm vệ sinh kỹ lưỡng kết hợp cắt tỉa lông tạo kiểu cơ bản.',
            staffLevel: 'Senior Groomer',
            status: 'Đang phục vụ',
            image: '/assets/images/services/spa/process/cat_long1.jpg'
        },
        {
            code: 'SPA08',
            group: 'spa',
            categoryName: 'Spa và Grooming – Tạo kiểu',
            name: 'Grooming Theo Yêu Cầu',
            petType: 'Chó',
            duration: '180 phút',
            rating: 4.9,
            reviews: 74,
            priceFrom: '450.000',
            prices: { under5: '450.000', to10: '500.000', to20: '600.000', over20: '750.000' },
            desc: 'Dịch vụ tạo mẫu tóc cao cấp thiết kế kiểu dáng lông theo hình ảnh mẫu yêu cầu riêng của chủ nuôi.',
            staffLevel: 'Master Groomer',
            status: 'Đang phục vụ',
            image: '/assets/images/services/spa/process/cao_long.jpg'
        },
        {
            code: 'SPA10',
            group: 'spa',
            categoryName: 'Spa và Grooming – Đặc trị',
            name: 'Tắm Thuốc Trị Liệu Da Liễu',
            petType: 'Chó / Mèo',
            duration: '90 phút',
            rating: 4.7,
            reviews: 53,
            priceFrom: '280.000',
            prices: { under5: '280.000', to10: '320.000', to20: '400.000', over20: '500.000' },
            desc: 'Dịch vụ tắm trị liệu viêm da, nấm, ghẻ, ký sinh trùng bằng các loại dầu tắm y khoa.',
            staffLevel: 'Senior Groomer',
            status: 'Đang phục vụ',
            image: '/assets/images/services/spa/process/tam_cho4.jpg'
        },
        {
            code: 'HTL01',
            group: 'hotel',
            categoryName: 'Pet Hotel – Standard',
            name: 'Phòng Standard',
            petType: 'Chó / Mèo',
            duration: 'Theo ngày',
            rating: 4.7,
            reviews: 115,
            priceFrom: '180.000',
            prices: { under5: '180.000 / đêm', to10: '200.000 / đêm', to20: '-', over20: '-' },
            desc: 'Không gian phòng lưu trú cơ bản tiêu chuẩn sạch sẽ, thoáng mát, thích hợp cho chó mèo nhỏ.',
            staffLevel: 'Nhân viên chăm sóc lưu trú',
            status: 'Đang phục vụ',
            image: '/assets/images/services/hotel/htl01.webp'
        },
        {
            code: 'HTL03',
            group: 'hotel',
            categoryName: 'Pet Hotel – Deluxe',
            name: 'Phòng Deluxe',
            petType: 'Chó / Mèo',
            duration: 'Theo ngày',
            rating: 4.9,
            reviews: 102,
            priceFrom: '380.000',
            prices: { under5: '380.000 / đêm', to10: '380.000 / đêm', to20: '450.000 / đêm', over20: '-' },
            desc: 'Hạng phòng cao cấp có camera IP giám sát 24/7 trực tiếp cho từng phòng.',
            staffLevel: 'Nhân viên chăm sóc lưu trú',
            status: 'Đang phục vụ',
            image: '/assets/images/services/hotel/htl03.jpg'
        },
        {
            code: 'HTL05',
            group: 'hotel',
            categoryName: 'Pet Hotel – Luxury Suite',
            name: 'Luxury Suite',
            petType: 'Chó / Mèo',
            duration: 'Theo ngày',
            rating: 4.9,
            reviews: 89,
            priceFrom: '520.000',
            prices: { under5: '520.000 / đêm', to10: '520.000 / đêm', to20: '650.000 / đêm', over20: '800.000 / đêm' },
            desc: 'Biệt thự lưu trú hoàng gia siêu rộng rãi có sân chơi riêng biệt và chế độ chăm sóc 1:1.',
            staffLevel: 'Chuyên gia chăm sóc thú cưng',
            status: 'Đang phục vụ',
            image: '/assets/images/services/hotel/htl05.webp'
        },
        {
            code: 'TXI01',
            group: 'taxi',
            categoryName: 'Pet Taxi – Vận chuyển',
            name: 'Dịch Vụ Xe Đưa Đón Tận Nơi',
            petType: 'Chó / Mèo / Thú nhỏ',
            duration: 'Tính theo chuyến',
            rating: 4.7,
            reviews: 64,
            priceFrom: '150.000',
            prices: { under5: '150.000', to10: '150.000', to20: '200.000', over20: '250.000' },
            desc: 'Dịch vụ đưa đón thú cưng an toàn tận nhà bằng xe ô tô chuyên dụng có điều hòa mát mẻ.',
            staffLevel: 'Tài xế kiêm cứu hộ thú cưng',
            status: 'Đang phục vụ',
            image: '/assets/images/services/txi01.webp'
        }
    ];

    // Trạng thái vận hành của module
    let bookingsData = JSON.parse(sessionStorage.getItem('pawpal_admin_services_bookings')) || initialBookings;
    let servicesData = JSON.parse(sessionStorage.getItem('pawpal_admin_services_catalog')) || initialServices;
    let selectedBookingId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
    let currentCatalogGroup = 'spa';
    let activeDropdownBookingId = null;

    // Bộ lọc
    let currentSearchTerm = '';
    let currentFilterCategory = 'ALL';
    let currentFilterStatus = 'ALL';
    let currentFilterStaff = 'ALL';
    let isUpcomingFilterActive = false;
    let isAllergyFilterActive = false;

    // Lưu dữ liệu vào SessionStorage
    function persistData() {
        sessionStorage.setItem('pawpal_admin_services_bookings', JSON.stringify(bookingsData));
        sessionStorage.setItem('pawpal_admin_services_catalog', JSON.stringify(servicesData));
        sessionStorage.setItem('pawpal_admin_service_selected_id', selectedBookingId);
    }

    // Helper: Định dạng tiền tệ
    function formatCurrency(num) {
        if (!num && num !== 0) return '0 đ';
        return Number(num).toLocaleString('vi-VN') + ' đ';
    }

    // Helper: Trạng thái badge
    function getStatusBadge(status) {
        switch (status) {
            case 'pending':
                return '<span class="admin-badge badge-warning">Chờ xác nhận</span>';
            case 'confirmed':
                return '<span class="admin-badge badge-success">Đã xác nhận</span>';
            case 'in_progress':
                return '<span class="admin-badge badge-info">Đang thực hiện</span>';
            case 'completed':
                return '<span class="admin-badge badge-success">Hoàn thành</span>';
            case 'cancelled':
                return '<span class="admin-badge badge-danger">Đã hủy</span>';
            default:
                return `<span class="admin-badge">${status}</span>`;
        }
    }

    // Helper: Nhãn cảnh báo
    function getAlertBadge(item) {
        const badges = [];
        if (item.petAlert) {
            badges.push('<span class="alert-pill-mini alert-red">Pet có lưu ý</span>');
        }
        if (item.alertType === 'urgent' || (!item.staff && item.status !== 'cancelled')) {
            badges.push('<span class="alert-pill-mini alert-orange">Chưa phân công</span>');
        }
        if (item.alertType === 'upcoming') {
            badges.push('<span class="alert-pill-mini alert-blue">Sắp tới giờ</span>');
        }
        return badges.join(' ') || '<span style="color: var(--text-muted); font-size: 12px;">Bình thường</span>';
    }

    // ==========================================================================
    // 1. QUẢN LÝ SUB-TABS TRÊN HEADER BAR
    // ==========================================================================
    function setupHeaderSubtabs() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');

        if (!subtabsContainer) return;

        // Ẩn tiêu đề module thừa
        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // Tạo 3 subtab dạng text thuần phân tách bởi |
        subtabsContainer.innerHTML = `
            <button type="button" class="header-subtab-btn active" data-subtab="tab-service-bookings">Lịch hẹn</button>
            <span class="header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn" data-subtab="tab-service-detail">Hồ sơ</button>
            <span class="header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn" data-subtab="tab-service-catalog">Danh mục và Bảng giá</button>
        `;

        const subtabBtns = subtabsContainer.querySelectorAll('.header-subtab-btn');
        subtabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const subtabId = btn.getAttribute('data-subtab');
                switchSubtab(subtabId);
            });
        });

        // Kiểm tra hash để mở subtab mong muốn
        const hash = window.location.hash || '';
        if (hash === '#tab-service-detail') {
            switchSubtab('tab-service-detail');
        } else if (hash === '#tab-service-catalog') {
            switchSubtab('tab-service-catalog');
        } else {
            switchSubtab('tab-service-bookings');
        }
    }

    function switchSubtab(subtabId) {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');

        // Cập nhật nút active trên Header
        if (subtabsContainer) {
            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                if (btn.getAttribute('data-subtab') === subtabId) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Ẩn hiện nội dung subtab
        document.querySelectorAll('.subtab-content').forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById('subtab-' + subtabId);
        if (targetSection) targetSection.classList.add('active');

        // Đồng bộ URL Hash
        window.location.hash = subtabId;
        sessionStorage.setItem('pawpal_admin_services_active_subtab', subtabId);

        // Quản lý Deep Breadcrumb
        if (deepBreadcrumbEl) {
            if (subtabId === 'tab-service-detail') {
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                const code = booking ? booking.id : selectedBookingId;
                deepBreadcrumbEl.innerHTML = `<span class="breadcrumb-separator">/</span> <span class="breadcrumb-detail-name">${code}</span>`;
                renderBookingDetail(selectedBookingId);
            } else {
                deepBreadcrumbEl.innerHTML = '';
            }
        }

        if (subtabId === 'tab-service-bookings') {
            renderBookingsTable();
            renderUpcomingBar();
            updateKPIs();
        } else if (subtabId === 'tab-service-catalog') {
            renderCatalogTable();
        }
    }

    // ==========================================================================
    // 2. RENDER VÀ TÍNH TOÁN KPI
    // ==========================================================================
    function updateKPIs() {
        const total = bookingsData.length;
        const pending = bookingsData.filter(b => b.status === 'pending').length;
        const upcoming = bookingsData.filter(b => b.alertType === 'upcoming' || b.status === 'in_progress').length;
        const inProgress = bookingsData.filter(b => b.status === 'in_progress').length;
        const completed = bookingsData.filter(b => b.status === 'completed').length;
        const cancelled = bookingsData.filter(b => b.status === 'cancelled').length;

        const statTotal = document.getElementById('statTotalBookings');
        const statPending = document.getElementById('statPendingBookings');
        const statUpcoming = document.getElementById('statUpcomingBookings');
        const statInProgress = document.getElementById('statInProgressBookings');
        const statCompleted = document.getElementById('statCompletedBookings');
        const statCancelled = document.getElementById('statCancelledBookings');

        if (statTotal) statTotal.textContent = total;
        if (statPending) statPending.textContent = pending;
        if (statUpcoming) statUpcoming.textContent = upcoming;
        if (statInProgress) statInProgress.textContent = inProgress;
        if (statCompleted) statCompleted.textContent = completed;
        if (statCancelled) statCancelled.textContent = cancelled;
    }

    // ==========================================================================
    // 3. THANH THÔNG BÁO LỊCH HẸN TRONG 60 PHÚT (MỎNG, GỌN, KHÔNG ICON)
    // ==========================================================================
    function renderUpcomingBar() {
        const container = document.getElementById('upcomingItemsContainer');
        const bar = document.getElementById('upcomingAlertBar');
        if (!container) return;

        const upcomingList = bookingsData.filter(b => b.alertType === 'upcoming' || b.status === 'in_progress');

        if (upcomingList.length === 0) {
            if (bar) bar.style.display = 'none';
            return;
        }

        if (bar) bar.style.display = 'flex';

        container.innerHTML = upcomingList.map(item => `
            <div class="upcoming-item-tag ${item.status === 'pending' || !item.staff ? 'urgent' : ''}" data-booking-id="${item.id}" title="Xem chi tiết ${item.customerName}">
                <span class="tag-time">${item.time}</span>
                <span class="tag-cust">${item.customerName}</span>
                <span class="tag-pet">(${item.petName})</span>
            </div>
        `).join('');

        container.querySelectorAll('.upcoming-item-tag').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const bkgId = el.getAttribute('data-booking-id');
                if (bkgId) openBookingDetail(bkgId);
            });
        });
    }

    // ==========================================================================
    // 4. RENDER BẢNG DỮ LIỆU LỊCH HẸN
    // ==========================================================================
    function renderBookingsTable() {
        const tbody = document.getElementById('servicesBookingTableBody');
        if (!tbody) return;

        // Lọc dữ liệu
        let filtered = bookingsData.filter(item => {
            // Tìm kiếm
            if (currentSearchTerm) {
                const term = currentSearchTerm.toLowerCase();
                const matchCode = item.id.toLowerCase().includes(term);
                const matchCustomer = item.customerName.toLowerCase().includes(term);
                const matchPhone = item.phone.includes(term);
                const matchPet = item.petName.toLowerCase().includes(term);
                if (!matchCode && !matchCustomer && !matchPhone && !matchPet) return false;
            }

            // Nhóm dịch vụ
            if (currentFilterCategory !== 'ALL' && item.category !== currentFilterCategory) return false;

            // Trạng thái
            if (currentFilterStatus !== 'ALL' && item.status !== currentFilterStatus) return false;

            // Kỹ thuật viên
            if (currentFilterStaff !== 'ALL') {
                if (currentFilterStaff === 'UNASSIGNED') {
                    if (item.staff) return false;
                } else if (item.staff !== currentFilterStaff) {
                    return false;
                }
            }

            // Toggle lịch sắp tới
            if (isUpcomingFilterActive && item.alertType !== 'upcoming') return false;

            // Toggle pet có dị ứng / lưu ý
            if (isAllergyFilterActive && !item.petAlert) return false;

            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state-cell">
                        Không tìm thấy lịch hẹn phù hợp với điều kiện tìm kiếm.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(item => {
            // Xác định class alert mép trái thẳng
            let alertClass = '';
            if (item.petAlert) {
                alertClass = 'row-alert-red';
            } else if (item.alertType === 'urgent' || (!item.staff && item.status !== 'cancelled')) {
                alertClass = 'row-alert-orange';
            }

            const isLocked = item.status === 'cancelled' ? 'row-locked' : '';

            return `
                <tr class="${alertClass} ${isLocked}" data-booking-id="${item.id}">
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-view-booking" data-booking-id="${item.id}">
                            ${item.id}
                        </a>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${item.customerName}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.phone}</div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${item.petName}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.petBreed}</div>
                    </td>
                    <td>
                        <span style="font-size: 13px; color: var(--text-main);">${item.categoryName}</span>
                    </td>
                    <td>
                        <div style="font-weight: 500; color: var(--text-main);">${item.serviceName}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.duration}</div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${item.time}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.date}</div>
                    </td>
                    <td>
                        ${item.staff ? `<span style="font-size: 13px; font-weight: 500;">${item.staff}</span>` : '<span class="text-danger" style="font-size: 12px; font-weight: 600;">Chưa phân công</span>'}
                    </td>
                    <td>
                        <div style="font-weight: 700; color: var(--text-heading);">${formatCurrency(item.total)}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.paymentStatus.includes('Đã') ? 'Đã thu' : 'Chưa thu'}</div>
                    </td>
                    <td>
                        ${getStatusBadge(item.status)}
                    </td>
                    <td>
                        ${getAlertBadge(item)}
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger" data-booking-id="${item.id}">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Gắn sự kiện click xem chi tiết
        tbody.querySelectorAll('.btn-view-booking').forEach(link => {
            link.addEventListener('click', () => {
                const bkgId = link.getAttribute('data-booking-id');
                openBookingDetail(bkgId);
            });
        });

        // Gắn sự kiện mở dropdown thao tác 3 chấm
        tbody.querySelectorAll('.btn-action-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bkgId = btn.getAttribute('data-booking-id');
                toggleActionDropdown(bkgId, btn);
            });
        });
    }

    // Mở hồ sơ chi tiết một lịch hẹn
    function openBookingDetail(bookingId) {
        selectedBookingId = bookingId;
        persistData();
        switchSubtab('tab-service-detail');
    }

    // ==========================================================================
    // 5. RENDER HỒ SƠ CHI TIẾT 360° (SUB-TAB 2)
    // ==========================================================================
    function renderBookingDetail(bookingId) {
        const booking = bookingsData.find(b => b.id === bookingId) || bookingsData[0];
        if (!booking) return;

        // Headline và Meta
        const codeEl = document.getElementById('detailBookingCode');
        const metaEl = document.getElementById('detailBookingMeta');
        if (codeEl) codeEl.textContent = booking.id;
        if (metaEl) metaEl.textContent = `Thời gian hẹn: ${booking.time} - ${booking.date} | Cơ sở: ${booking.branch}`;

        // Cảnh báo an toàn Pet (Thuần chữ đỏ, không viền, không nền)
        const petAlertBanner = document.getElementById('detailPetAlertBanner');
        if (petAlertBanner) {
            if (booking.petAlert) {
                petAlertBanner.style.display = 'block';
                petAlertBanner.textContent = `CẢNH BÁO AN TOÀN CHO BÉ: ${booking.petAlert}`;
            } else {
                petAlertBanner.style.display = 'none';
            }
        }

        // Nút thao tác một chạm theo trạng thái
        const actionButtonsContainer = document.getElementById('detailBookingActionButtons');
        if (actionButtonsContainer) {
            actionButtonsContainer.innerHTML = '';
            if (booking.status === 'pending') {
                actionButtonsContainer.innerHTML = `
                    <button type="button" class="admin-btn admin-btn-primary btn-action-confirm" data-booking-id="${booking.id}">Xác nhận lịch</button>
                    <button type="button" class="admin-btn admin-btn-danger btn-action-cancel" data-booking-id="${booking.id}">Hủy lịch hẹn</button>
                `;
            } else if (booking.status === 'confirmed') {
                actionButtonsContainer.innerHTML = `
                    <button type="button" class="admin-btn admin-btn-primary btn-action-start" data-booking-id="${booking.id}">Bắt đầu dịch vụ</button>
                    <button type="button" class="admin-btn admin-btn-secondary btn-action-change" data-booking-id="${booking.id}">Đổi KTV</button>
                    <button type="button" class="admin-btn admin-btn-danger btn-action-cancel" data-booking-id="${booking.id}">Hủy lịch</button>
                `;
            } else if (booking.status === 'in_progress') {
                actionButtonsContainer.innerHTML = `
                    <button type="button" class="admin-btn admin-btn-primary btn-action-complete" data-booking-id="${booking.id}">Hoàn thành dịch vụ</button>
                    <button type="button" class="admin-btn admin-btn-secondary btn-action-complaint" data-booking-id="${booking.id}">Tạo khiếu nại</button>
                `;
            } else if (booking.status === 'completed') {
                actionButtonsContainer.innerHTML = `
                    <button type="button" class="admin-btn admin-btn-secondary btn-action-complaint" data-booking-id="${booking.id}">Tạo khiếu nại</button>
                `;
            }

            // Gắn sự kiện các nút 1 chạm
            const btnConfirm = actionButtonsContainer.querySelector('.btn-action-confirm');
            const btnStart = actionButtonsContainer.querySelector('.btn-action-start');
            const btnComplete = actionButtonsContainer.querySelector('.btn-action-complete');
            const btnCancel = actionButtonsContainer.querySelector('.btn-action-cancel');
            const btnChange = actionButtonsContainer.querySelector('.btn-action-change');

            if (btnConfirm) {
                btnConfirm.addEventListener('click', () => {
                    updateBookingStatus(booking.id, 'confirmed');
                });
            }
            if (btnStart) {
                btnStart.addEventListener('click', () => {
                    updateBookingStatus(booking.id, 'in_progress');
                });
            }
            if (btnComplete) {
                btnComplete.addEventListener('click', () => {
                    updateBookingStatus(booking.id, 'completed');
                });
            }
            if (btnCancel) {
                btnCancel.addEventListener('click', () => {
                    openCancelModal(booking.id);
                });
            }
            if (btnChange) {
                btnChange.addEventListener('click', () => {
                    const newStaff = prompt('Nhập tên Kỹ thuật viên mới:', booking.staff || 'Ngọc Anh');
                    if (newStaff && newStaff.trim()) {
                        booking.staff = newStaff.trim();
                        persistData();
                        renderBookingDetail(booking.id);
                    }
                });
            }
        }

        // Cập nhật thông tin dịch vụ
        const statusText = document.getElementById('detailBookingStatusText');
        const staffText = document.getElementById('detailBookingStaffText');
        const serviceText = document.getElementById('detailBookingServiceText');
        const durationText = document.getElementById('detailBookingDurationText');
        const categoryText = document.getElementById('detailBookingCategoryText');
        const addonsText = document.getElementById('detailBookingAddonsText');
        const customerNote = document.getElementById('detailBookingCustomerNote');

        if (statusText) statusText.innerHTML = getStatusBadge(booking.status);
        if (staffText) staffText.textContent = booking.staff || 'Chưa phân công';
        if (serviceText) serviceText.textContent = booking.serviceName;
        if (durationText) durationText.textContent = booking.duration;
        if (categoryText) categoryText.textContent = booking.categoryName;
        if (addonsText) addonsText.textContent = booking.addonPrice > 0 ? `Gói chăm sóc mở rộng (${formatCurrency(booking.addonPrice)})` : 'Không có';
        if (customerNote) customerNote.textContent = booking.customerNote || 'Không có';

        // Cập nhật khách hàng và Pet
        const customerName = document.getElementById('detailCustomerName');
        const customerPhone = document.getElementById('detailCustomerPhone');
        const petName = document.getElementById('detailPetName');
        const petBreed = document.getElementById('detailPetBreed');
        const petWeight = document.getElementById('detailPetWeight');
        const petAge = document.getElementById('detailPetAge');

        if (customerName) {
            customerName.textContent = booking.customerName;
            customerName.onclick = () => {
                sessionStorage.setItem('pawpal_admin_customer_selected_id', booking.userId || 'USER-001');
                window.location.hash = '#tab-profile';
            };
        }
        if (customerPhone) customerPhone.textContent = booking.phone;
        if (petName) petName.textContent = booking.petName;
        if (petBreed) petBreed.textContent = booking.petBreed;
        if (petWeight) petWeight.textContent = booking.petWeight;
        if (petAge) petAge.textContent = booking.petAge;

        // Cập nhật tài chính
        const costBase = document.getElementById('detailCostBase');
        const costAddon = document.getElementById('detailCostAddon');
        const costDiscount = document.getElementById('detailCostDiscount');
        const costTotal = document.getElementById('detailCostTotal');
        const paymentStatus = document.getElementById('detailPaymentStatus');

        if (costBase) costBase.textContent = formatCurrency(booking.price);
        if (costAddon) costAddon.textContent = formatCurrency(booking.addonPrice);
        if (costDiscount) costDiscount.textContent = '-' + formatCurrency(booking.discount);
        if (costTotal) costTotal.textContent = formatCurrency(booking.total);
        if (paymentStatus) paymentStatus.textContent = booking.paymentStatus;

        // Cập nhật Care-Log Timeline
        const carelogContainer = document.getElementById('detailCarelogList');
        if (carelogContainer) {
            carelogContainer.innerHTML = (booking.timeline || []).map(step => `
                <div class="timeline-step-item ${step.done ? '' : 'future'}">
                    <div class="timeline-step-title">${step.title} ${step.done ? '<span style="color: #236B48; font-size: 11.5px; font-weight: 500;">(Đã xong)</span>' : '<span style="color: var(--text-muted); font-size: 11.5px; font-weight: 400;">(Đang chờ)</span>'}</div>
                    <div class="timeline-step-time">${step.time} • KTV: ${step.staff || booking.staff || 'PawPal Team'}</div>
                    <div class="timeline-step-desc">${step.desc}</div>
                </div>
            `).join('');
        }
    }

    // Cập nhật trạng thái lịch hẹn
    function updateBookingStatus(bookingId, newStatus) {
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!booking) return;

        booking.status = newStatus;
        if (newStatus === 'in_progress') {
            booking.alertType = null;
        } else if (newStatus === 'completed') {
            booking.alertType = null;
            booking.paymentStatus = 'Đã thanh toán (Tại quầy)';
        }

        persistData();
        renderBookingDetail(bookingId);
        renderBookingsTable();
        renderUpcomingBar();
        updateKPIs();
    }

    // ==========================================================================
    // 6. RENDER DANH MỤC VÀ BẢNG GIÁ DỊCH VỤ (SUB-TAB 3)
    // ==========================================================================
    function renderCatalogTable() {
        const tbody = document.getElementById('servicesCatalogTableBody');
        if (!tbody) return;

        const filtered = servicesData.filter(item => item.group === currentCatalogGroup);

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state-cell">
                        Chưa có dịch vụ nào trong danh mục này.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(item => `
            <tr>
                <td>
                    <img src="${item.image}" alt="${item.name}" class="service-thumb" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">
                </td>
                <td style="font-weight: 600; color: #236B48;">${item.code}</td>
                <td>
                    <div style="font-weight: 600; color: var(--text-main);">${item.name}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${item.desc ? item.desc.substring(0, 50) + '...' : ''}</div>
                </td>
                <td><span style="font-size: 13px; color: var(--text-muted);">${item.categoryName}</span></td>
                <td><span style="font-size: 13px; font-weight: 500;">${item.petType}</span></td>
                <td><span style="font-size: 13px;">${item.duration}</span></td>
                <td><span style="font-weight: 700; color: var(--text-heading);">${item.priceFrom} đ</span></td>
                <td><span style="font-size: 12.5px; font-weight: 600; color: #B45309;">★ ${item.rating}</span> <span style="font-size: 11.5px; color: var(--text-muted);">(${item.reviews})</span></td>
                <td>
                    ${item.status === 'Đang phục vụ' ? '<span class="admin-badge badge-success">Đang phục vụ</span>' : '<span class="admin-badge badge-warning">Tạm ẩn</span>'}
                </td>
                <td style="text-align: center;">
                    <button type="button" class="btn-action-trigger btn-edit-service" data-service-code="${item.code}">•••</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-edit-service').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-service-code');
                openEditServiceModal(code);
            });
        });
    }

    // ==========================================================================
    // 7. QUẢN LÝ CÁC MODAL DIALOG
    // ==========================================================================
    function setupModals() {
        // Modal 1: Tạo lịch hẹn
        const modalCreate = document.getElementById('modalCreateBooking');
        const btnOpenCreate = document.getElementById('btnOpenCreateBookingModal');
        const btnCloseCreate = document.getElementById('btnCloseCreateBooking');
        const btnCancelCreate = document.getElementById('btnCancelCreateBooking');
        const formCreate = document.getElementById('formCreateBooking');

        if (btnOpenCreate) {
            btnOpenCreate.addEventListener('click', () => {
                const todayStr = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('newBookingDate');
                if (dateInput) dateInput.value = todayStr;
                if (modalCreate) modalCreate.classList.add('active');
            });
        }

        const closeCreateModal = () => {
            if (modalCreate) modalCreate.classList.remove('active');
        };
        if (btnCloseCreate) btnCloseCreate.addEventListener('click', closeCreateModal);
        if (btnCancelCreate) btnCancelCreate.addEventListener('click', closeCreateModal);

        if (formCreate) {
            formCreate.addEventListener('submit', (e) => {
                e.preventDefault();
                const newId = 'BKG-' + (1000 + bookingsData.length + 1);
                const customer = document.getElementById('newBookingCustomer').value;
                const phone = document.getElementById('newBookingPhone').value;
                const petName = document.getElementById('newBookingPetName').value;
                const category = document.getElementById('newBookingCategory').value;
                const serviceName = document.getElementById('newBookingServiceSelect').value;
                const date = document.getElementById('newBookingDate').value;
                const time = document.getElementById('newBookingTime').value;
                const staff = document.getElementById('newBookingStaff').value;
                const branch = document.getElementById('newBookingBranch').value;
                const petAlert = document.getElementById('newBookingPetAlert').value;
                const note = document.getElementById('newBookingNotes').value;

                let categoryName = 'Spa và Grooming';
                if (category === 'Hotel') categoryName = 'Pet Hotel';
                if (category === 'Taxi') categoryName = 'Pet Taxi';

                const newBooking = {
                    id: newId,
                    userId: 'USER-001',
                    customerName: customer,
                    phone: phone,
                    petId: 'PET-NEW',
                    petName: petName,
                    petBreed: 'Thú cưng',
                    petWeight: '5.0 kg',
                    petAge: '2 tuổi',
                    serviceCode: 'SPA01',
                    category: category,
                    categoryName: categoryName,
                    serviceName: serviceName,
                    date: date,
                    time: time,
                    duration: '60 phút',
                    staff: staff,
                    branch: branch,
                    price: 250000,
                    addonPrice: 0,
                    discount: 0,
                    total: 250000,
                    paymentStatus: 'Chưa thanh toán (Tại quầy)',
                    status: 'pending',
                    alertType: !staff ? 'urgent' : null,
                    petAlert: petAlert.trim() || null,
                    customerNote: note,
                    timeline: [
                        { time: time, title: 'Tiếp nhận ca mới', desc: 'Đã tạo lịch hẹn thành công', done: true, staff: staff || 'PawPal' }
                    ]
                };

                bookingsData.unshift(newBooking);
                persistData();
                closeCreateModal();
                renderBookingsTable();
                renderUpcomingBar();
                updateKPIs();
                formCreate.reset();
            });
        }

        // Modal 2: Thêm / Sửa dịch vụ
        const modalService = document.getElementById('modalServiceForm');
        const btnOpenCreateService = document.getElementById('btnOpenCreateServiceModal');
        const btnCloseService = document.getElementById('btnCloseServiceForm');
        const btnCancelService = document.getElementById('btnCancelServiceForm');
        const formService = document.getElementById('formServiceItem');

        if (btnOpenCreateService) {
            btnOpenCreateService.addEventListener('click', () => {
                document.getElementById('serviceFormModalTitle').textContent = 'Thêm dịch vụ mới';
                document.getElementById('editServiceCodeHidden').value = '';
                formService.reset();
                modalService.classList.add('active');
            });
        }

        const closeServiceModal = () => {
            if (modalService) modalService.classList.remove('active');
        };
        if (btnCloseService) btnCloseService.addEventListener('click', closeServiceModal);
        if (btnCancelService) btnCancelService.addEventListener('click', closeServiceModal);

        if (formService) {
            formService.addEventListener('submit', (e) => {
                e.preventDefault();
                const hiddenCode = document.getElementById('editServiceCodeHidden').value;
                const id = document.getElementById('formServiceId').value;
                const group = document.getElementById('formServiceGroup').value.toLowerCase();
                const name = document.getElementById('formServiceName').value;
                const petType = document.getElementById('formServicePetType').value;
                const duration = document.getElementById('formServiceDuration').value;
                const desc = document.getElementById('formServiceDesc').value;
                const staffLevel = document.getElementById('formServiceStaffLevel').value;
                const status = document.getElementById('formServiceStatus').value;
                const pUnder5 = document.getElementById('formPriceUnder5').value || '150.000';
                const p5To10 = document.getElementById('formPrice5To10').value || '200.000';
                const p10To20 = document.getElementById('formPrice10To20').value || '250.000';
                const pOver20 = document.getElementById('formPriceOver20').value || '300.000';

                if (hiddenCode) {
                    // Chỉnh sửa
                    const existing = servicesData.find(s => s.code === hiddenCode);
                    if (existing) {
                        existing.name = name;
                        existing.petType = petType;
                        existing.duration = duration;
                        existing.desc = desc;
                        existing.staffLevel = staffLevel;
                        existing.status = status;
                        existing.priceFrom = pUnder5;
                        existing.prices = { under5: pUnder5, to10: p5To10, to20: p10To20, over20: pOver20 };
                    }
                } else {
                    // Thêm mới
                    const newSvc = {
                        code: id,
                        group: group,
                        categoryName: group === 'spa' ? 'Spa và Grooming' : (group === 'hotel' ? 'Pet Hotel' : 'Pet Taxi'),
                        name: name,
                        petType: petType,
                        duration: duration,
                        rating: 5.0,
                        reviews: 1,
                        priceFrom: pUnder5,
                        prices: { under5: pUnder5, to10: p5To10, to20: p10To20, over20: pOver20 },
                        desc: desc,
                        staffLevel: staffLevel,
                        status: status,
                        image: '/assets/images/services/spa/process/spa01.webp'
                    };
                    servicesData.unshift(newSvc);
                }

                persistData();
                closeServiceModal();
                renderCatalogTable();
            });
        }

        // Modal 3: Hủy lịch hẹn
        const modalCancel = document.getElementById('modalCancelBooking');
        const btnCloseCancel = document.getElementById('btnCloseCancelBooking');
        const btnDismissCancel = document.getElementById('btnDismissCancelBooking');
        const btnConfirmCancel = document.getElementById('btnConfirmCancelBooking');

        const closeCancelModal = () => {
            if (modalCancel) modalCancel.classList.remove('active');
        };
        if (btnCloseCancel) btnCloseCancel.addEventListener('click', closeCancelModal);
        if (btnDismissCancel) btnDismissCancel.addEventListener('click', closeCancelModal);

        if (btnConfirmCancel) {
            btnConfirmCancel.addEventListener('click', () => {
                const bkgId = btnConfirmCancel.getAttribute('data-booking-id');
                const reasonSelect = document.getElementById('cancelBookingReasonSelect').value;
                const reasonDetail = document.getElementById('cancelBookingReasonDetail').value;
                const booking = bookingsData.find(b => b.id === bkgId);
                if (booking) {
                    booking.status = 'cancelled';
                    booking.alertType = null;
                    booking.customerNote = `[Đã hủy]: ${reasonSelect} - ${reasonDetail}`;
                    booking.timeline.push({
                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        title: 'Đã hủy ca',
                        desc: `Lý do: ${reasonSelect} (${reasonDetail})`,
                        done: true,
                        staff: 'Admin'
                    });
                }
                persistData();
                closeCancelModal();
                renderBookingsTable();
                renderUpcomingBar();
                updateKPIs();
                if (window.location.hash === '#tab-service-detail') {
                    renderBookingDetail(bkgId);
                }
            });
        }

        // Thêm bước Care-Log nhanh trong chi tiết
        const btnSubmitCarelog = document.getElementById('btnSubmitCarelogStep');
        if (btnSubmitCarelog) {
            btnSubmitCarelog.addEventListener('click', () => {
                const titleInput = document.getElementById('newLogStepTitle');
                const staffInput = document.getElementById('newLogStepStaff');
                const noteInput = document.getElementById('newLogStepNote');

                if (!titleInput.value.trim()) {
                    alert('Vui lòng nhập tên bước chăm sóc.');
                    return;
                }

                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (booking) {
                    booking.timeline = booking.timeline || [];
                    booking.timeline.push({
                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        title: titleInput.value.trim(),
                        desc: noteInput.value.trim() || 'Đã hoàn thành bước chăm sóc',
                        done: true,
                        staff: staffInput.value.trim() || booking.staff || 'KTV'
                    });
                    persistData();
                    renderBookingDetail(booking.id);
                    titleInput.value = '';
                    staffInput.value = '';
                    noteInput.value = '';
                }
            });
        }
    }

    function openCancelModal(bookingId) {
        const modal = document.getElementById('modalCancelBooking');
        const codeDisplay = document.getElementById('cancelBookingCodeDisplay');
        const confirmBtn = document.getElementById('btnConfirmCancelBooking');
        if (codeDisplay) codeDisplay.textContent = bookingId;
        if (confirmBtn) confirmBtn.setAttribute('data-booking-id', bookingId);
        if (modal) modal.classList.add('active');
    }

    function openEditServiceModal(serviceCode) {
        const modal = document.getElementById('modalServiceForm');
        const service = servicesData.find(s => s.code === serviceCode);
        if (!service || !modal) return;

        document.getElementById('serviceFormModalTitle').textContent = `Chỉnh sửa dịch vụ ${service.code}`;
        document.getElementById('editServiceCodeHidden').value = service.code;
        document.getElementById('formServiceId').value = service.code;
        document.getElementById('formServiceId').readOnly = true;
        document.getElementById('formServiceGroup').value = service.group === 'spa' ? 'Spa' : (service.group === 'hotel' ? 'Hotel' : 'Taxi');
        document.getElementById('formServiceName').value = service.name;
        document.getElementById('formServicePetType').value = service.petType;
        document.getElementById('formServiceDuration').value = service.duration;
        document.getElementById('formServiceDesc').value = service.desc || '';
        document.getElementById('formServiceStaffLevel').value = service.staffLevel;
        document.getElementById('formServiceStatus').value = service.status;

        if (service.prices) {
            document.getElementById('formPriceUnder5').value = service.prices.under5 || '';
            document.getElementById('formPrice5To10').value = service.prices.to10 || '';
            document.getElementById('formPrice10To20').value = service.prices.to20 || '';
            document.getElementById('formPriceOver20').value = service.prices.over20 || '';
        }

        modal.classList.add('active');
    }

    // ==========================================================================
    // 8. DROPDOWN THAO TÁC 3 CHẤM (TEXT-ONLY)
    // ==========================================================================
    function toggleActionDropdown(bookingId, triggerBtn) {
        const dropdown = document.getElementById('servicesActionDropdown');
        if (!dropdown) return;

        if (dropdown.style.display === 'block' && activeDropdownBookingId === bookingId) {
            dropdown.style.display = 'none';
            activeDropdownBookingId = null;
            return;
        }

        activeDropdownBookingId = bookingId;
        const rect = triggerBtn.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
        dropdown.style.left = `${rect.right - 180 + window.scrollX}px`;
        dropdown.style.display = 'block';

        const booking = bookingsData.find(b => b.id === bookingId);
        const btnConfirm = document.getElementById('menuActionConfirm');
        const btnStart = document.getElementById('menuActionStart');
        const btnComplete = document.getElementById('menuActionComplete');
        const btnCancel = document.getElementById('menuActionCancel');

        if (booking) {
            btnConfirm.style.display = booking.status === 'pending' ? 'block' : 'none';
            btnStart.style.display = booking.status === 'confirmed' ? 'block' : 'none';
            btnComplete.style.display = booking.status === 'in_progress' ? 'block' : 'none';
            btnCancel.style.display = (booking.status !== 'completed' && booking.status !== 'cancelled') ? 'block' : 'none';
        }
    }

    function setupActionDropdownEvents() {
        const dropdown = document.getElementById('servicesActionDropdown');
        if (!dropdown) return;

        document.getElementById('menuActionViewDetail').onclick = () => {
            if (activeDropdownBookingId) openBookingDetail(activeDropdownBookingId);
            dropdown.style.display = 'none';
        };

        document.getElementById('menuActionConfirm').onclick = () => {
            if (activeDropdownBookingId) updateBookingStatus(activeDropdownBookingId, 'confirmed');
            dropdown.style.display = 'none';
        };

        document.getElementById('menuActionStart').onclick = () => {
            if (activeDropdownBookingId) updateBookingStatus(activeDropdownBookingId, 'in_progress');
            dropdown.style.display = 'none';
        };

        document.getElementById('menuActionComplete').onclick = () => {
            if (activeDropdownBookingId) updateBookingStatus(activeDropdownBookingId, 'completed');
            dropdown.style.display = 'none';
        };

        document.getElementById('menuActionCancel').onclick = () => {
            if (activeDropdownBookingId) openCancelModal(activeDropdownBookingId);
            dropdown.style.display = 'none';
        };

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !e.target.classList.contains('btn-action-trigger')) {
                dropdown.style.display = 'none';
                activeDropdownBookingId = null;
            }
        });
    }

    // ==========================================================================
    // 9. GẮN SỰ KIỆN TÌM KIẾM VÀ BỘ LỌC
    // ==========================================================================
    function setupFilterEvents() {
        const searchInput = document.getElementById('serviceSearchInput');
        const selectCategory = document.getElementById('serviceFilterCategory');
        const selectStatus = document.getElementById('serviceFilterStatus');
        const selectStaff = document.getElementById('serviceFilterStaff');
        const btnUpcoming = document.getElementById('btnToggleUpcomingOnly');
        const btnAllergy = document.getElementById('btnToggleAllergyOnly');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearchTerm = e.target.value.trim();
                renderBookingsTable();
            });
        }

        if (selectCategory) {
            selectCategory.addEventListener('change', (e) => {
                currentFilterCategory = e.target.value;
                renderBookingsTable();
            });
        }

        if (selectStatus) {
            selectStatus.addEventListener('change', (e) => {
                currentFilterStatus = e.target.value;
                renderBookingsTable();
            });
        }

        if (selectStaff) {
            selectStaff.addEventListener('change', (e) => {
                currentFilterStaff = e.target.value;
                renderBookingsTable();
            });
        }

        if (btnUpcoming) {
            btnUpcoming.addEventListener('click', () => {
                isUpcomingFilterActive = !isUpcomingFilterActive;
                btnUpcoming.classList.toggle('active', isUpcomingFilterActive);
                renderBookingsTable();
            });
        }

        if (btnAllergy) {
            btnAllergy.addEventListener('click', () => {
                isAllergyFilterActive = !isAllergyFilterActive;
                btnAllergy.classList.toggle('active', isAllergyFilterActive);
                renderBookingsTable();
            });
        }

        // Nút lọc nhanh trên dải ruy-băng thông báo 60 phút
        const btnStripFilter = document.getElementById('btnFilterUpcomingQuick');
        if (btnStripFilter) {
            btnStripFilter.addEventListener('click', () => {
                isUpcomingFilterActive = true;
                if (btnUpcoming) btnUpcoming.classList.add('active');
                renderBookingsTable();
            });
        }

        // Tương tác click trực tiếp trên các thẻ KPI để lọc 1 chạm
        document.querySelectorAll('.kpi-card-clickable').forEach(card => {
            card.addEventListener('click', () => {
                const kpiFilter = card.getAttribute('data-kpi-filter');
                document.querySelectorAll('.kpi-card-clickable').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                if (kpiFilter === 'ALL') {
                    currentFilterStatus = 'ALL';
                    isUpcomingFilterActive = false;
                    if (selectStatus) selectStatus.value = 'ALL';
                    if (btnUpcoming) btnUpcoming.classList.remove('active');
                } else if (kpiFilter === 'upcoming') {
                    currentFilterStatus = 'ALL';
                    isUpcomingFilterActive = true;
                    if (selectStatus) selectStatus.value = 'ALL';
                    if (btnUpcoming) btnUpcoming.classList.add('active');
                } else {
                    currentFilterStatus = kpiFilter;
                    isUpcomingFilterActive = false;
                    if (selectStatus) selectStatus.value = kpiFilter;
                    if (btnUpcoming) btnUpcoming.classList.remove('active');
                }
                renderBookingsTable();
            });
        });

        // Tabs 3 nhóm trong Sub-tab 3 (Danh mục và Bảng giá)
        document.querySelectorAll('.catalog-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.catalog-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCatalogGroup = btn.getAttribute('data-group');
                renderCatalogTable();
            });
        });
    }

    // ==========================================================================
    // 10. KHỞI CHẠY PHÂN HỆ
    // ==========================================================================
    function init() {
        setupHeaderSubtabs();
        renderUpcomingBar();
        updateKPIs();
        renderBookingsTable();
        renderCatalogTable();
        setupFilterEvents();
        setupModals();
        setupActionDropdownEvents();
    }

    // Chạy khởi tạo
    init();

    // Xuất API toàn cục
    window.PawpalServicesModule = {
        init: init,
        switchSubtab: switchSubtab,
        openBookingDetail: openBookingDetail
    };
})();
