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
            addons: [],
            intakeSafety: {
                actualWeight: '4.2 kg',
                weightEval: 'Đúng khung giá đăng ký',
                skinCoat: 'Da lông sạch sẽ, có lưu ý dị ứng hương liệu',
                eyesEarsNose: 'Mắt sáng, vành tai sạch sẽ',
                wounds: 'Không có vết thương cũ',
                temperament: 'Nhút nhát / Hơi sợ nước',
                belongings: '01 Dây dắt đỏ bản to',
                proofImages: ['/assets/images/services/spa/process/spa01.webp'],
                intakeStaff: 'Ngọc Anh',
                intakeTime: '13:50'
            },
            timeline: [
                { time: '13:50', title: 'Tiếp nhận Pet', desc: 'Đã đón bé tại quầy tiếp tân cơ sở Quận 1', done: true, staff: 'Ngọc Anh', images: ['/assets/images/services/spa/process/spa01.webp'] },
                { time: '14:00', title: 'Kiểm tra da lông sơ bộ', desc: 'Kiểm tra vết nấm, ve rận và độ dài móng', done: true, staff: 'Ngọc Anh', images: ['/assets/images/services/spa/process/tam_cho5.jpg'] },
                { time: '14:15', title: 'Tắm và Sấy khô', desc: 'Sử dụng dầu tắm thảo dược Hypoallergenic dịu nhẹ', done: false, staff: 'Ngọc Anh', images: [] },
                { time: '14:45', title: 'Cắt móng và Vệ sinh tai', desc: 'Mài dũa móng và vệ sinh vành tai', done: false, staff: 'Ngọc Anh', images: [] },
                { time: '15:00', title: 'Hoàn tất và Bàn giao', desc: 'Chụp ảnh gửi chủ và xuất phiếu hoàn tất ca', done: false, staff: 'Ngọc Anh', images: [] }
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
            addons: [],
            timeline: [
                { time: '09:30', title: 'Tiếp nhận và Tạo kiểu', desc: 'Tiếp nhận bé Poodle và kiểm tra dáng lông', done: true, staff: 'Hoàng Nam', images: [] },
                { time: '10:15', title: 'Tắm xả dưỡng phồng lông', desc: 'Sấy khô và đánh tơi lông chuyên nghiệp', done: true, staff: 'Hoàng Nam', images: ['/assets/images/services/spa/process/tam_cho4.jpg'] },
                { time: '11:30', title: 'Cắt tỉa tạo kiểu Boo', desc: 'Cắt tỉa mặt tròn Boo và bo tròn 4 chân', done: true, staff: 'Hoàng Nam', images: ['/assets/images/services/spa/process/cat_long1.jpg'] },
                { time: '12:00', title: 'Bàn giao cho chủ', desc: 'Bé đã được chủ đón về trong tình trạng vui vẻ', done: true, staff: 'Hoàng Nam', images: [] }
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
            addons: [
                {
                    id: 'ADD-1001',
                    name: 'Vệ sinh tai nấm và viêm chuyên sâu',
                    amount: 50000,
                    reason: 'Vành tai có mảng sáp nâu, cần nhỏ dung dịch sát khuẩn y tế',
                    consent: 'Đã gửi ảnh và video qua Zalo cho khách',
                    time: '08:45'
                },
                {
                    id: 'ADD-1002',
                    name: 'Tắm bùn khoáng phục hồi da lông',
                    amount: 100000,
                    reason: 'Chủ yêu cầu bổ sung gói ủ bùn dưỡng lông dày mượt trước khi nhận phòng',
                    consent: 'Khách hàng yêu cầu trực tiếp tại quầy',
                    time: '09:15'
                }
            ],
            timeline: [
                { time: '08:00', title: 'Check-in tiếp nhận', desc: 'Đã đón bé và nhận hướng dẫn chăm sóc riêng', done: true, staff: 'Thu Thảo' },
                { time: '08:45', title: 'Phát sinh: Vệ sinh tai nấm và viêm chuyên sâu (+50.000 đ)', desc: '[Đã gửi ảnh và video qua Zalo cho khách] Vành tai có mảng sáp nâu, cần nhỏ dung dịch sát khuẩn y tế', done: true, staff: 'Thu Thảo' },
                { time: '09:15', title: 'Phát sinh: Tắm bùn khoáng phục hồi da lông (+100.000 đ)', desc: '[Khách hàng yêu cầu trực tiếp tại quầy] Chủ yêu cầu bổ sung gói ủ bùn dưỡng lông dày mượt', done: true, staff: 'Thu Thảo' },
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
            addons: [],
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
            addons: [],
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
            addonPrice: 0,
            discount: 0,
            total: 350000,
            paymentStatus: 'Chưa thanh toán (Tại quầy)',
            status: 'pending',
            alertType: 'urgent',
            petAlert: null,
            customerNote: 'Mong xếp bạn nhân viên khéo tay vì bé Corgi rất hiếu động.',
            addons: [],
            timeline: [
                { time: '08:30', title: 'Tạo lịch Online', desc: 'Khách hàng đặt lịch hẹn qua Website PawPal', done: true, staff: 'Hệ thống', images: [] }
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
            addons: [],
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
            addons: [],
            timeline: [
                { time: '14:00', title: 'Chuẩn bị phòng thuốc', desc: 'Đã chuẩn bị bồn ngâm thảo dược đông y', done: true, staff: 'Ngọc Anh' }
            ]
        },
        {
            id: 'BKG-1009',
            userId: 'USER-001',
            customerName: 'Trần Thị Mai',
            phone: '0933445566',
            petId: 'PET-006',
            petName: 'Bông Gòn',
            petBreed: 'Chó Bichon Frise',
            petWeight: '5.2 kg',
            petAge: '2 tuổi',
            serviceCode: 'SPA07',
            category: 'Spa',
            categoryName: 'Spa và Grooming',
            serviceName: 'Grooming Tạo Kiểu Cơ Bản',
            date: '2026-06-25',
            time: '13:00',
            duration: '90 phút',
            staff: 'Hoàng Nam',
            branch: 'PawPal Chi nhánh Quận 1',
            price: 450000,
            addonPrice: 0,
            discount: 0,
            total: 450000,
            paymentStatus: 'Chưa thanh toán (Tại quầy)',
            status: 'in_progress',
            alertType: 'urgent',
            petAlert: 'Lông bị rối bết nhiều vùng háng và nách chân trước.',
            customerNote: 'Xin hãy kiên nhẫn gỡ rối, đừng cạo sát da bé.',
            addons: [],
            intakeSafety: {
                actualWeight: '5.2 kg',
                weightEval: 'Đúng khung giá đăng ký',
                skinCoat: 'Lông bết rối nhiều mảng háng và bụng',
                eyesEarsNose: 'Mắt tai sạch sẽ bình thường',
                wounds: 'Có vết xước nhỏ ở đệm chân trước',
                temperament: 'Ngoan hiền / Thân thiện',
                belongings: '01 Chuồng vận chuyển nhựa xám',
                proofImages: ['/assets/images/services/spa/process/cat_long1.jpg'],
                intakeStaff: 'Hoàng Nam',
                intakeTime: '13:00'
            },
            timeline: [
                { time: '13:00', title: 'Tiếp nhận bé và Kiểm tra an toàn', desc: 'Đã kiểm tra cân nặng 5.2kg, ghi nhận lông bết rối, có vết xước nhẹ đệm chân trước', done: true, staff: 'Hoàng Nam', images: ['/assets/images/services/spa/process/cat_long1.jpg'] },
                { time: '13:15', title: 'Tắm xả và sấy bông lông', desc: 'Hoàn tất tắm dưỡng phục hồi', done: true, staff: 'Hoàng Nam' },
                { time: '14:30', title: 'Gỡ rối và Cắt tỉa tạo kiểu', desc: 'Đang gỡ rối lông dày và cắt tỉa form chuẩn', done: false, staff: 'Hoàng Nam' }
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
            image: '/assets/images/services/spa/process/spa01.webp',
            steps: [
                'Tiếp nhận bé và kiểm tra da lông sơ bộ',
                'Tắm sạch sâu và xả thơm thảo dược dịu nhẹ',
                'Sấy khô và đánh tơi phồng lông',
                'Vệ sinh tai, tuyến hôi và mài dũa móng',
                'Chụp ảnh hoàn tất và bàn giao cho chủ'
            ]
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
            image: '/assets/images/services/spa/process/tam_cho5.jpg',
            steps: [
                'Tiếp nhận và mát-xa bấm huyệt thư giãn',
                'Tắm dưỡng phục hồi chuyên sâu',
                'Ủ dầu xả tinh chất mượt lông',
                'Sấy ion âm chống tĩnh điện',
                'Vệ sinh tai mắt và dũa móng',
                'Bàn giao và gửi ảnh kỷ niệm'
            ]
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
            image: '/assets/images/services/spa/process/cat_long1.jpg',
            steps: [
                'Tiếp nhận và tư vấn form dáng cắt tỉa',
                'Tắm xả dưỡng phồng và sấy tơi lông',
                'Cắt tỉa mặt tròn Boo / Poodle',
                'Bo tròn 4 chân và cắt gọn móng',
                'Xịt nước hoa dưỡng lông hữu cơ',
                'Bàn giao cho chủ'
            ]
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
            image: '/assets/images/services/spa/process/cao_long.jpg',
            steps: [
                'Xem ảnh mẫu và phác thảo kiểu dáng',
                'Tắm xả cao cấp và sấy chuyên sâu',
                'Tỉa dáng thủ công Master Groomer',
                'Hoàn thiện chi tiết và kiểm tra da lông',
                'Bàn giao và chụp ảnh studio'
            ]
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
            image: '/assets/images/services/spa/process/tam_cho4.jpg',
            steps: [
                'Kiểm tra và khoanh vùng mảng nấm/viêm da',
                'Ngâm bồn dầu tắm thảo dược đông y y tế',
                'Thoa thuốc đặc trị vùng tổn thương',
                'Sấy khô dịu mát và khử trùng tia UV',
                'Ghi đơn thuốc và dặn dò chủ nuôi'
            ]
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
            image: '/assets/images/services/hotel/htl01.webp',
            steps: [
                'Check-in tiếp nhận và nhận thức ăn riêng',
                'Bữa ăn dinh dưỡng trưa và chiều',
                'Vận động vui chơi sân trong nhà',
                'Dọn phòng vệ sinh và đo thân nhiệt',
                'Check-out bàn giao'
            ]
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
            image: '/assets/images/services/hotel/htl03.jpg',
            steps: [
                'Check-in nhận phòng và mở link camera IP cho chủ',
                'Bữa ăn thượng hạng theo lịch riêng',
                'Dắt dạo vận động sân cỏ nhân tạo',
                'Dọn phòng khử khuẩn tia UV',
                'Chải lông massage tối trước khi ngủ',
                'Check-out bàn giao'
            ]
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
            image: '/assets/images/services/hotel/htl05.webp',
            steps: [
                'Đón bé và nhận chế độ chăm sóc riêng 1:1',
                'Bữa ăn dinh dưỡng cao cấp tự chọn',
                'Vui chơi sân cỏ và bể bơi thủy trị liệu',
                'Massage tinh dầu thư giãn',
                'Chụp ảnh video 4K gửi chủ mỗi ngày',
                'Check-out kèm quà tặng tri ân'
            ]
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
            image: '/assets/images/services/txi01.webp',
            steps: [
                'Tài xế xuất phát đến điểm đón đúng giờ',
                'Tiếp nhận bé vào lồng vận chuyển an toàn',
                'Di chuyển cabin máy lạnh êm ái',
                'Bàn giao bé an toàn tại điểm đến'
            ]
        }
    ];

    // Dữ liệu đánh giá từ khách hàng
    const initialReviews = [
        {
            id: 'REV-101',
            bookingId: 'BKG-1002',
            customerName: 'Lê Lệ Quyên',
            phone: '0901234567',
            petName: 'Miu Miu',
            serviceName: 'Grooming Tạo Kiểu Cơ Bản',
            category: 'Spa',
            staff: 'Hoàng Nam',
            rating: 5,
            comment: 'Tỉa tròn mặt Boo cực kỳ xinh xắn, nhân viên Hoàng Nam rất kiên nhẫn với bé.',
            date: '2026-06-10',
            status: 'replied',
            replyText: 'PawPal cảm ơn chị Quyên ạ! Rất hân hạnh được phục vụ bé Miu Miu.',
            replyDate: '2026-06-10',
            voucherSent: null
        },
        {
            id: 'REV-102',
            bookingId: 'BKG-1004',
            customerName: 'Lê Lệ Quyên',
            phone: '0901234567',
            petName: 'Miu Con',
            serviceName: 'Gói Tắm Vệ Sinh Cơ Bản',
            category: 'Spa',
            staff: 'Ngọc Anh',
            rating: 5,
            comment: 'Bé tắm xong thơm nức, lông mềm mượt màng. Sẽ ghé lại lần sau.',
            date: '2026-06-24',
            status: 'replied',
            replyText: 'Cảm ơn chị Quyên đã luôn tin tưởng dịch vụ Spa của PawPal ạ!',
            replyDate: '2026-06-24',
            voucherSent: null
        },
        {
            id: 'REV-103',
            bookingId: 'BKG-1008',
            customerName: 'Trần Minh Quân',
            phone: '0912345678',
            petName: 'Bông Xù',
            serviceName: 'Tắm Thuốc Trị Liệu Da Liễu',
            category: 'Spa',
            staff: 'Ngọc Anh',
            rating: 4,
            comment: 'Dịch vụ tốt, bé bớt ngứa hẳn nhưng khung giờ chiều hơi đông nên phải chờ 15 phút.',
            date: '2026-06-27',
            status: 'pending',
            replyText: null,
            replyDate: null,
            voucherSent: null
        },
        {
            id: 'REV-104',
            bookingId: 'BKG-1006',
            customerName: 'Hoàng Hải Yến',
            phone: '0987654321',
            petName: 'Lucky',
            serviceName: 'Gói Tắm Dưỡng Premium',
            category: 'Spa',
            staff: 'Thu Thảo',
            rating: 2,
            comment: 'Móng bé bị cắt hơi sát làm bé giật mình nhẹ. Cần cẩn thận hơn khi thao tác.',
            date: '2026-06-27',
            status: 'pending',
            replyText: null,
            replyDate: null,
            voucherSent: null
        }
    ];

    // Trạng thái vận hành của module
    let bookingsData = JSON.parse(sessionStorage.getItem('pawpal_admin_services_bookings')) || initialBookings;
    let servicesData = JSON.parse(sessionStorage.getItem('pawpal_admin_services_catalog')) || initialServices;
    let reviewsData = JSON.parse(sessionStorage.getItem('pawpal_admin_services_reviews')) || initialReviews;
    let selectedBookingId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
    let currentCatalogGroup = 'spa';
    let activeDropdownBookingId = null;
    let currentEditingServiceSteps = [];
    let currentCarelogStepImages = [];

    // Bộ lọc Lịch hẹn
    let currentSearchTerm = '';
    let currentFilterCategory = 'ALL';
    let currentFilterStatus = 'ALL';
    let currentFilterStaff = 'ALL';
    let isUpcomingFilterActive = false;
    let isAllergyFilterActive = false;
    let isSlaFilterActive = false;
    let intakeProofImagesTemp = [];

    // Bộ lọc Danh mục
    let catalogSearchTerm = '';
    let catalogFilterStatus = 'ALL';

    // Bộ lọc Đánh giá
    let reviewSearchTerm = '';
    let reviewFilterStar = 'ALL';
    let reviewFilterCategory = 'ALL';
    let reviewFilterStatus = 'ALL';

    // Lưu dữ liệu vào SessionStorage
    function persistData() {
        sessionStorage.setItem('pawpal_admin_services_bookings', JSON.stringify(bookingsData));
        sessionStorage.setItem('pawpal_admin_services_catalog', JSON.stringify(servicesData));
        sessionStorage.setItem('pawpal_admin_services_reviews', JSON.stringify(reviewsData));
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

    // Helper: Tính toán giám sát SLA tiến trình dịch vụ và Aging
    function getServiceSlaInfo(booking) {
        if (!booking || booking.status === 'cancelled') {
            return { level: 'ok', label: 'Đã hủy', minutesLate: 0 };
        }
        if (booking.status === 'completed') {
            return { level: 'ok', label: 'Hoàn thành', minutesLate: 0 };
        }

        // 1. Chờ xác nhận (pending)
        if (booking.status === 'pending') {
            if (booking.alertType === 'urgent' || booking.id === 'BKG-1006') {
                return { level: 'danger', label: 'Quá hạn duyệt (>30p)', minutesLate: 35 };
            }
            return { level: 'warning', label: 'Chờ duyệt (>15p)', minutesLate: 15 };
        }

        // 2. Đã xác nhận (confirmed - chờ khách tới tiếp nhận)
        if (booking.status === 'confirmed') {
            if (booking.alertType === 'urgent' || (!booking.staff)) {
                return { level: 'warning', label: 'Chờ KTV (+15p)', minutesLate: 15 };
            }
            if (booking.alertType === 'upcoming' || booking.id === 'BKG-1008') {
                return { level: 'info', label: 'Sắp tới giờ', minutesLate: 0 };
            }
            return { level: 'ok', label: 'Chờ đón bé', minutesLate: 0 };
        }

        // 3. Đang thực hiện (in_progress)
        if (booking.status === 'in_progress') {
            if (booking.id === 'BKG-1009') {
                return { level: 'danger', label: 'Quá hạn SLA (>30p)', minutesLate: 35 };
            }
            if (booking.alertType === 'urgent') {
                return { level: 'warning', label: 'Trễ ca (+15p)', minutesLate: 18 };
            }
            return { level: 'ok', label: 'Đúng tiến độ', minutesLate: 0 };
        }

        return { level: 'ok', label: 'Bình thường', minutesLate: 0 };
    }

    // Helper: Nhãn cảnh báo (Tích hợp Pet Alert, SLA Alert, và Phân công KTV)
    function getAlertBadge(item) {
        const badges = [];
        const sla = getServiceSlaInfo(item);

        if (item.petAlert) {
            badges.push('<span class="alert-pill-mini alert-red">Pet có lưu ý</span>');
        }
        if (!item.staff && item.status !== 'cancelled') {
            badges.push('<span class="alert-pill-mini alert-orange">Chưa phân công</span>');
        }

        if (sla.level === 'danger') {
            badges.push(`<span class="alert-pill-mini alert-red">${sla.label}</span>`);
        } else if (sla.level === 'warning') {
            badges.push(`<span class="alert-pill-mini alert-orange">${sla.label}</span>`);
        } else if (sla.level === 'info') {
            badges.push(`<span class="alert-pill-mini alert-blue">${sla.label}</span>`);
        } else if (item.status === 'in_progress') {
            badges.push('<span class="alert-pill-mini alert-green">Đúng tiến độ</span>');
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

        // Tạo 4 subtab dạng text thuần phân tách bởi |
        subtabsContainer.innerHTML = `
            <button type="button" class="header-subtab-btn active" data-subtab="tab-service-bookings">Lịch hẹn</button>
            <span class="header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn" data-subtab="tab-service-detail">Hồ sơ</button>
            <span class="header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn" data-subtab="tab-service-catalog">Danh mục và Bảng giá</button>
            <span class="header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn" data-subtab="tab-service-reviews">Đánh giá</button>
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
        } else if (hash === '#tab-service-reviews') {
            switchSubtab('tab-service-reviews');
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
        } else if (subtabId === 'tab-service-reviews') {
            renderReviewsTable();
            updateReviewKPIs();
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

            // Toggle quá hạn SLA và Trễ ca
            if (isSlaFilterActive) {
                const sla = getServiceSlaInfo(item);
                if (sla.level !== 'danger' && sla.level !== 'warning') return false;
            }

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
            const sla = getServiceSlaInfo(item);
            let alertClass = '';
            if (item.petAlert || sla.level === 'danger') {
                alertClass = 'row-alert-danger';
            } else if ((!item.staff && item.status !== 'cancelled') || sla.level === 'warning') {
                alertClass = 'row-alert-warning';
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
                    <button type="button" class="admin-btn admin-btn-primary btn-action-intake" data-booking-id="${booking.id}">Tiếp nhận bé</button>
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
            const btnIntake = actionButtonsContainer.querySelector('.btn-action-intake');
            const btnComplete = actionButtonsContainer.querySelector('.btn-action-complete');
            const btnCancel = actionButtonsContainer.querySelector('.btn-action-cancel');
            const btnChange = actionButtonsContainer.querySelector('.btn-action-change');

            if (btnConfirm) {
                btnConfirm.addEventListener('click', () => {
                    updateBookingStatus(booking.id, 'confirmed');
                });
            }
            if (btnIntake) {
                btnIntake.addEventListener('click', () => {
                    openIntakeModal(booking.id, 'intake');
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
                    openChangeStaffModal(booking.id);
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

        // Cập nhật khách hàng, Pet và Thông tin tiếp nhận
        const customerName = document.getElementById('detailCustomerName');
        const customerPhone = document.getElementById('detailCustomerPhone');
        const petName = document.getElementById('detailPetName');
        const petBreed = document.getElementById('detailPetBreed');
        const petWeight = document.getElementById('detailPetWeight');
        const petAge = document.getElementById('detailPetAge');
        const belongingsText = document.getElementById('detailBelongingsText');
        const btnEditIntakeInfo = document.getElementById('btnEditIntakeInfo');

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
        if (petWeight) petWeight.textContent = booking.petWeight || '4.0 kg';
        if (petAge) petAge.textContent = booking.petAge || 'Chưa rõ';
        if (belongingsText) belongingsText.textContent = booking.belongings || 'Không có';

        if (btnEditIntakeInfo) {
            // Chỉ hiện nút Sửa thông tin tiếp nhận khi ca đã xác nhận trở đi (không hiện khi đang chờ xác nhận)
            const showEditIntake = (booking.status === 'confirmed' || booking.status === 'in_progress');
            btnEditIntakeInfo.style.display = showEditIntake ? 'inline-block' : 'none';
        }

        // Cập nhật Khối Biên bản tiếp nhận an toàn (Zero-Claim)
        const intakeSection = document.getElementById('detailIntakeSafetySection');
        const intakeEmptyNotice = document.getElementById('detailIntakeEmptyNotice');
        const intakeContent = document.getElementById('detailIntakeContentContainer');
        const btnEditSafety = document.getElementById('btnEditIntakeSafety');

        if (intakeSection) {
            const hasIntake = !!booking.intakeSafety;
            if (!hasIntake) {
                if (intakeEmptyNotice) intakeEmptyNotice.style.display = 'block';
                if (intakeContent) intakeContent.style.display = 'none';
                if (btnEditSafety) {
                    btnEditSafety.textContent = 'Tiếp nhận bé';
                    btnEditSafety.style.display = (booking.status === 'confirmed' || booking.status === 'pending') ? 'inline-block' : 'none';
                    btnEditSafety.onclick = () => openIntakeModal(booking.id, 'intake');
                }
            } else {
                if (intakeEmptyNotice) intakeEmptyNotice.style.display = 'none';
                if (intakeContent) intakeContent.style.display = 'block';
                if (btnEditSafety) {
                    btnEditSafety.textContent = 'Sửa biên bản tiếp nhận';
                    btnEditSafety.style.display = (booking.status !== 'cancelled') ? 'inline-block' : 'none';
                    btnEditSafety.onclick = () => openIntakeModal(booking.id, 'edit');
                }

                const s = booking.intakeSafety;
                const actWeight = document.getElementById('detailIntakeActualWeight');
                const weightEval = document.getElementById('detailIntakeWeightEval');
                const skinCoat = document.getElementById('detailIntakeSkinCoat');
                const eyesEars = document.getElementById('detailIntakeEyesEarsNose');
                const wounds = document.getElementById('detailIntakeWounds');
                const tempEl = document.getElementById('detailIntakeTemperament');
                const staffEl = document.getElementById('detailIntakeStaff');
                const belongEl = document.getElementById('detailIntakeBelongings');
                const proofGrid = document.getElementById('detailIntakeProofGrid');

                if (actWeight) actWeight.textContent = s.actualWeight || booking.petWeight || 'Chưa cân';
                if (weightEval) weightEval.textContent = s.weightEval || 'Đúng khung giá';
                if (skinCoat) skinCoat.textContent = s.skinCoat || 'Sạch sẽ';
                if (eyesEars) eyesEars.textContent = s.eyesEarsNose || 'Bình thường';
                if (wounds) wounds.textContent = s.wounds || 'Không có vết thương cũ';
                if (tempEl) tempEl.textContent = s.temperament || 'Ngoan hiền';
                if (staffEl) staffEl.textContent = `${s.intakeStaff || booking.staff || 'KTV'} (${s.intakeTime || 'Tiếp nhận'})`;
                if (belongEl) belongEl.textContent = s.belongings || booking.belongings || 'Không có';

                if (proofGrid) {
                    const imgs = s.proofImages || [];
                    if (imgs.length === 0) {
                        proofGrid.innerHTML = '<span style="font-size: 12px; color: var(--text-muted);">Chưa có ảnh đính kèm lúc đón bé</span>';
                    } else {
                        proofGrid.innerHTML = imgs.map(img => `
                            <img src="${img}" class="intake-proof-thumb" alt="Ảnh đối chứng Zero-Claim" onclick="window.open('${img}', '_blank')" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">
                        `).join('');
                    }
                }
            }
        }

        // Cập nhật tài chính và Bảng kê chi phí / Dịch vụ đi cùng / Phụ phí phát sinh
        const costBase = document.getElementById('detailCostBase');
        const costAddon = document.getElementById('detailCostAddon');
        const costDiscount = document.getElementById('detailCostDiscount');
        const costTotal = document.getElementById('detailCostTotal');
        const paymentStatus = document.getElementById('detailPaymentStatus');

        const addons = booking.addons || [];
        const accompanyingServices = booking.accompanyingServices || [];
        const accompanyingTotal = accompanyingServices.reduce((sum, item) => sum + Number(item.price || 0), 0);
        booking.addonPrice = addons.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        booking.total = Math.max(0, Number(booking.price || 0) + accompanyingTotal + booking.addonPrice - Number(booking.discount || 0));

        if (costBase) costBase.textContent = formatCurrency(booking.price);
        if (costAddon) costAddon.textContent = formatCurrency(booking.addonPrice);
        if (costDiscount) costDiscount.textContent = '-' + formatCurrency(booking.discount);
        if (costTotal) costTotal.textContent = formatCurrency(booking.total);
        if (paymentStatus) paymentStatus.textContent = booking.paymentStatus;
        if (addonsText) addonsText.textContent = booking.addonPrice > 0 ? `Gói chăm sóc mở rộng (${formatCurrency(booking.addonPrice)})` : 'Không có';

        // Thêm dịch vụ đi cùng và phụ phí chỉ mở khi đang thực hiện ca (in_progress)
        // Trước khi vào ca chưa nên ghi phụ phí và thêm dịch vụ
        const btnOpenAddAccompanying = document.getElementById('btnOpenAddAccompanyingServiceModal');
        const btnOpenAddSurchargeModal = document.getElementById('btnOpenAddSurchargeModal');
        const isEditableState = (booking.status === 'in_progress');

        if (btnOpenAddAccompanying) {
            btnOpenAddAccompanying.style.display = isEditableState ? 'inline-block' : 'none';
        }
        if (btnOpenAddSurchargeModal) {
            btnOpenAddSurchargeModal.style.display = isEditableState ? 'inline-block' : 'none';
        }

        // Render Danh sách Dịch vụ đi cùng (Accompanying Services)
        const accompanyingListContainer = document.getElementById('detailAccompanyingServicesList');
        if (accompanyingListContainer) {
            if (accompanyingServices.length === 0) {
                accompanyingListContainer.innerHTML = '';
            } else {
                accompanyingListContainer.innerHTML = accompanyingServices.map(item => `
                    <div class="accompanying-item-row" data-acc-id="${item.id}">
                        <div class="accompanying-item-title-row">
                            <span class="accompanying-item-name">+ ${item.name}</span>
                            <span class="accompanying-item-price">+${formatCurrency(item.price)}</span>
                        </div>
                        <div class="accompanying-item-meta">
                            <span>KTV: ${item.staff || booking.staff || 'PawPal Team'}</span>
                            ${item.note ? `<span>• ${item.note}</span>` : ''}
                            ${isEditableState ? `<button type="button" class="btn-del-surcharge btn-del-accompanying" data-acc-id="${item.id}">Xóa</button>` : ''}
                        </div>
                    </div>
                `).join('');

                if (isEditableState) {
                    accompanyingListContainer.querySelectorAll('.btn-del-accompanying').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const accId = btn.getAttribute('data-acc-id');
                            const targetAcc = booking.accompanyingServices.find(a => a.id === accId);
                            if (!targetAcc) return;

                            if (confirm(`Bạn có chắc chắn muốn xóa dịch vụ đi cùng "${targetAcc.name}" (${formatCurrency(targetAcc.price)}) khỏi ca?`)) {
                                booking.accompanyingServices = booking.accompanyingServices.filter(a => a.id !== accId);
                                const newAccTotal = booking.accompanyingServices.reduce((sum, a) => sum + Number(a.price || 0), 0);
                                booking.total = Math.max(0, Number(booking.price || 0) + newAccTotal + booking.addonPrice - Number(booking.discount || 0));

                                // Ghi nhật ký hủy dịch vụ đi cùng
                                booking.timeline = booking.timeline || [];
                                booking.timeline.push({
                                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                                    title: `Đã hủy dịch vụ đi cùng: ${targetAcc.name}`,
                                    desc: `Đã loại bỏ gói ${targetAcc.name} (${formatCurrency(targetAcc.price)}) khỏi ca`,
                                    done: true,
                                    staff: 'Admin'
                                });

                                persistData();
                                renderBookingDetail(booking.id);
                                renderBookingsTable();
                            }
                        });
                    });
                }
            }
        }

        // Render Bóc tách chi tiết từng phụ phí / Add-on phát sinh
        const surchargeListContainer = document.getElementById('detailSurchargeBreakdownList');
        if (surchargeListContainer) {
            if (addons.length === 0) {
                surchargeListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12.5px; font-style: italic; padding: 4px 0;">Không có phụ phí hoặc dịch vụ phát sinh trong ca này.</div>';
            } else {
                surchargeListContainer.innerHTML = addons.map(item => `
                    <div class="surcharge-item-row" data-addon-id="${item.id}">
                        <div class="surcharge-item-main">
                            <div class="surcharge-item-title-row">
                                <span class="surcharge-item-name">${item.name}</span>
                                <span class="surcharge-item-amount">+${formatCurrency(item.amount)}</span>
                            </div>
                            <div class="surcharge-item-desc">${item.reason}</div>
                            <div class="surcharge-item-meta">
                                <span class="surcharge-tag-consent">${item.consent}</span>
                                <span class="surcharge-time-text">${item.time || ''}</span>
                                ${isEditableState ? `<button type="button" class="btn-del-surcharge" data-addon-id="${item.id}">Xóa</button>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('');

                if (isEditableState) {
                    surchargeListContainer.querySelectorAll('.btn-del-surcharge').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const addonId = btn.getAttribute('data-addon-id');
                            const targetAddon = booking.addons.find(a => a.id === addonId);
                            if (!targetAddon) return;

                            if (confirm(`Bạn có chắc chắn muốn xóa phụ phí "${targetAddon.name}" (${formatCurrency(targetAddon.amount)})?`)) {
                                booking.addons = booking.addons.filter(a => a.id !== addonId);
                                booking.addonPrice = booking.addons.reduce((sum, a) => sum + Number(a.amount || 0), 0);
                                const currentAccTotal = (booking.accompanyingServices || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
                                booking.total = Math.max(0, Number(booking.price || 0) + currentAccTotal + booking.addonPrice - Number(booking.discount || 0));

                                // Ghi lại nhật ký xóa phụ phí
                                booking.timeline = booking.timeline || [];
                                booking.timeline.push({
                                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                                    title: `Đã xóa phụ phí: ${targetAddon.name}`,
                                    desc: `Đã loại bỏ khoản phụ thu ${formatCurrency(targetAddon.amount)} khỏi ca dịch vụ`,
                                    done: true,
                                    staff: 'Admin'
                                });

                                persistData();
                                renderBookingDetail(booking.id);
                                renderBookingsTable();
                            }
                        });
                    });
                }
            }
        }

        // Cập nhật Care-Log Timeline
        const carelogContainer = document.getElementById('detailCarelogList');
        if (carelogContainer) {
            carelogContainer.innerHTML = (booking.timeline || []).map((step, idx) => {
                const imagesHtml = (step.images && step.images.length > 0)
                    ? `<div class="step-gallery-strip">
                        ${step.images.map(imgUrl => `
                            <img src="${imgUrl}" alt="${step.title}" class="step-photo-thumb" data-full-src="${imgUrl}" data-title="${step.title}" data-time="${step.time}" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">
                        `).join('')}
                       </div>`
                    : '';

                const actionsHtml = (booking.status === 'in_progress')
                    ? `<div class="step-action-bar">
                        ${!step.done ? `<button type="button" class="btn-step-action complete-action btn-mark-step-done" data-step-index="${idx}">Đánh dấu xong</button>` : ''}
                        <button type="button" class="btn-step-action btn-add-step-photo" data-step-index="${idx}">+ Thêm ảnh</button>
                       </div>`
                    : '';

                return `
                    <div class="timeline-step-item ${step.done ? '' : 'future'}">
                        <div class="timeline-step-title">${step.title} ${step.done ? '<span style="color: #236B48; font-size: 11.5px; font-weight: 500;">(Đã xong)</span>' : '<span style="color: var(--text-muted); font-size: 11.5px; font-weight: 400;">(Đang chờ)</span>'}</div>
                        <div class="timeline-step-time">${step.time} • KTV: ${step.staff || booking.staff || 'PawPal Team'}</div>
                        <div class="timeline-step-desc">${step.desc}</div>
                        ${imagesHtml}
                        ${actionsHtml}
                    </div>
                `;
            }).join('');

            // Gắn sự kiện click xem ảnh phóng to (Lightbox)
            carelogContainer.querySelectorAll('.step-photo-thumb').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    const src = thumb.getAttribute('data-full-src');
                    const title = thumb.getAttribute('data-title');
                    const time = thumb.getAttribute('data-time');
                    openPhotoLightbox(src, title, time);
                });
            });

            // Gắn sự kiện Đánh dấu hoàn tất bước (1-chạm)
            carelogContainer.querySelectorAll('.btn-mark-step-done').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-step-index'));
                    if (booking.timeline && booking.timeline[idx]) {
                        booking.timeline[idx].done = true;
                        booking.timeline[idx].time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                        booking.timeline[idx].staff = booking.staff || 'Ngọc Anh';
                        persistData();
                        renderBookingDetail(booking.id);
                    }
                });
            });

            // Gắn sự kiện Thêm ảnh vào bước có sẵn
            carelogContainer.querySelectorAll('.btn-add-step-photo').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-step-index'));
                    const tempInput = document.createElement('input');
                    tempInput.type = 'file';
                    tempInput.accept = 'image/*';
                    tempInput.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                                booking.timeline[idx].images = booking.timeline[idx].images || [];
                                booking.timeline[idx].images.push(evt.target.result);
                                persistData();
                                renderBookingDetail(booking.id);
                            };
                            reader.readAsDataURL(file);
                        }
                    };
                    tempInput.click();
                });
            });
        }

        // QUY TẮC NGHIỆP VỤ: Khóa/Mở form ghi nhật ký Care-Log theo trạng thái ca
        const carelogQuickAddBox = document.getElementById('carelogQuickAddBox');
        const carelogLockNotice = document.getElementById('carelogLockNotice');

        if (carelogQuickAddBox && carelogLockNotice) {
            if (booking.status === 'in_progress') {
                carelogQuickAddBox.style.display = 'flex';
                carelogLockNotice.style.display = 'none';
            } else {
                carelogQuickAddBox.style.display = 'none';
                carelogLockNotice.style.display = 'block';

                if (booking.status === 'pending') {
                    carelogLockNotice.innerHTML = '<strong>Khóa ghi nhật ký:</strong> Lịch hẹn đang chờ xác nhận. Vui lòng bấm <em>"Xác nhận lịch"</em> trước, sau đó bấm <em>"Tiếp nhận bé"</em> khi khách đến quầy để cập nhật nhật ký.';
                } else if (booking.status === 'confirmed') {
                    carelogLockNotice.innerHTML = '<strong>Chờ tiếp nhận:</strong> Lịch hẹn đã được xác nhận. Vui lòng bấm nút <em>"Tiếp nhận bé"</em> ở trên khi khách đến quầy để kiểm tra thông tin, xác nhận đồ gửi lại và bắt đầu ca dịch vụ.';
                } else if (booking.status === 'completed') {
                    carelogLockNotice.innerHTML = '<strong>Đã hoàn thành và chốt ca:</strong> Tiến trình chăm sóc đã hoàn tất. Toàn bộ hồ sơ và nhật ký đã được lưu trữ an toàn.';
                } else if (booking.status === 'cancelled') {
                    carelogLockNotice.innerHTML = '<strong>Ca đã hủy:</strong> Lịch hẹn này đã bị hủy bỏ.';
                }
            }
        }
    }

    // Cập nhật trạng thái lịch hẹn theo Quy tắc Nghiệp vụ (State Machine)
    function updateBookingStatus(bookingId, newStatus) {
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!booking) return;

        const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        booking.status = newStatus;

        if (newStatus === 'confirmed') {
            if (!booking.staff) booking.staff = 'Ngọc Anh';
        } else if (newStatus === 'in_progress') {
            booking.alertType = null;
            if (!booking.staff) booking.staff = 'Ngọc Anh';
            
            // Tự động ghi nhận mốc bắt đầu vào Timeline
            booking.timeline = booking.timeline || [];
            if (booking.timeline.length > 0) booking.timeline[0].done = true;
            booking.timeline.push({
                time: timeNow,
                title: 'Bắt đầu thực hiện ca dịch vụ',
                desc: `Kỹ thuật viên ${booking.staff} đã tiếp nhận bé và bắt đầu liệu trình chăm sóc`,
                done: true,
                staff: booking.staff
            });
        } else if (newStatus === 'completed') {
            booking.alertType = null;
            if (!booking.paymentStatus || booking.paymentStatus.includes('Chưa')) {
                booking.paymentStatus = 'Đã thanh toán (Tại quầy)';
            }

            // Tự động đánh dấu hoàn tất toàn bộ các bước và ghi mốc kết thúc
            booking.timeline = booking.timeline || [];
            booking.timeline.forEach(st => st.done = true);
            booking.timeline.push({
                time: timeNow,
                title: 'Hoàn tất dịch vụ và bàn giao bé',
                desc: 'Đã hoàn thành toàn bộ quy trình chăm sóc, kiểm tra an toàn cho bé cưng và xuất phiếu thanh toán',
                done: true,
                staff: booking.staff || 'KTV'
            });
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

        let filtered = servicesData.filter(item => item.group === currentCatalogGroup);

        if (catalogSearchTerm) {
            const term = catalogSearchTerm.toLowerCase();
            filtered = filtered.filter(s => s.code.toLowerCase().includes(term) || s.name.toLowerCase().includes(term));
        }

        if (catalogFilterStatus !== 'ALL') {
            filtered = filtered.filter(s => s.status === catalogFilterStatus);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state-cell">
                        Chưa có dịch vụ nào phù hợp với điều kiện tìm kiếm.
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
                <td>
                    <a href="javascript:void(0)" class="catalog-rating-link btn-view-service-reviews" data-service-name="${item.name}" data-service-group="${item.group}" title="Bấm để xem tất cả đánh giá của ${item.name}">
                        <span class="star-rating-pill">★ ${item.rating}</span> <span class="reviews-count-text">(${item.reviews})</span>
                    </a>
                </td>
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

        // Bấm vào điểm đánh giá để lọc xem toàn bộ đánh giá của dịch vụ đó
        tbody.querySelectorAll('.btn-view-service-reviews').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                const svcName = link.getAttribute('data-service-name');
                const svcGroup = link.getAttribute('data-service-group');
                filterAndShowReviewsForService(svcName, svcGroup);
            });
        });
    }

    // Chuyển sang tab Đánh giá và lọc sẵn đúng dịch vụ
    function filterAndShowReviewsForService(serviceName, group) {
        switchSubtab('tab-service-reviews');
        reviewSearchTerm = serviceName;
        const searchInput = document.getElementById('reviewSearchInput');
        if (searchInput) searchInput.value = serviceName;

        const catSelect = document.getElementById('reviewFilterCategory');
        if (catSelect) {
            catSelect.value = group === 'spa' ? 'Spa' : (group === 'hotel' ? 'Hotel' : (group === 'taxi' ? 'Taxi' : 'ALL'));
            reviewFilterCategory = catSelect.value;
        }

        renderReviewsTable();
        updateReviewKPIs();
    }

    // ==========================================================================
    // 6B. QUẢN LÝ ĐÁNH GIÁ VÀ PHẢN HỒI (SUB-TAB 4)
    // ==========================================================================
    function updateReviewKPIs() {
        const total = reviewsData.length;
        const avg = total > 0 ? (reviewsData.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : '5.0';
        const pending = reviewsData.filter(r => r.status === 'pending').length;
        const low = reviewsData.filter(r => r.rating <= 3).length;

        const elAvg = document.getElementById('statAvgRating');
        const elTotal = document.getElementById('statTotalReviews');
        const elPending = document.getElementById('statPendingReviews');
        const elLow = document.getElementById('statLowRatingReviews');

        if (elAvg) elAvg.textContent = `${avg} ★`;
        if (elTotal) elTotal.textContent = total;
        if (elPending) elPending.textContent = pending;
        if (elLow) elLow.textContent = low;
    }

    function renderReviewsTable() {
        const tbody = document.getElementById('servicesReviewTableBody');
        if (!tbody) return;

        let filtered = reviewsData.filter(r => {
            if (reviewSearchTerm) {
                const term = reviewSearchTerm.toLowerCase();
                const matchCust = r.customerName.toLowerCase().includes(term);
                const matchPhone = r.phone.includes(term);
                const matchBooking = r.bookingId.toLowerCase().includes(term);
                const matchComment = r.comment.toLowerCase().includes(term);
                if (!matchCust && !matchPhone && !matchBooking && !matchComment) return false;
            }

            if (reviewFilterStar !== 'ALL') {
                if (reviewFilterStar === 'LOW') {
                    if (r.rating > 3) return false;
                } else if (r.rating !== parseInt(reviewFilterStar)) {
                    return false;
                }
            }

            if (reviewFilterCategory !== 'ALL' && r.category !== reviewFilterCategory) return false;
            if (reviewFilterStatus !== 'ALL' && r.status !== reviewFilterStatus) return false;

            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state-cell">
                        Không tìm thấy đánh giá nào phù hợp với điều kiện tìm kiếm.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(item => {
            const starsText = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
            const alertClass = item.rating <= 3 ? 'row-alert-red' : '';

            return `
                <tr class="${alertClass}" data-review-id="${item.id}">
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-view-review-booking" data-booking-id="${item.bookingId}">
                            ${item.bookingId}
                        </a>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${item.customerName}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.phone} • Bé ${item.petName}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500; color: var(--text-main);">${item.serviceName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.date}</div>
                    </td>
                    <td>
                        <span class="star-rating-text">${starsText}</span>
                    </td>
                    <td>
                        <div class="review-comment-box">
                            <div class="review-comment-text">"${item.comment}"</div>
                            ${item.replyText ? `
                                <div class="review-reply-preview">
                                    <strong>PawPal Admin (${item.replyDate || ''}):</strong> "${item.replyText}"
                                    ${item.voucherSent ? `<div style="font-weight: 600; color: #B45309; margin-top: 2px;">🎁 Đã gửi: ${item.voucherSent}</div>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </td>
                    <td><span style="font-weight: 500;">${item.staff || 'PawPal Team'}</span></td>
                    <td>
                        ${item.status === 'replied' ? '<span class="admin-badge badge-success">Đã phản hồi</span>' : '<span class="admin-badge badge-warning">Chờ phản hồi</span>'}
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-reply-review-table btn-open-reply-modal" data-review-id="${item.id}">
                            ${item.status === 'replied' ? 'Sửa bài' : 'Phản hồi'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-view-review-booking').forEach(link => {
            link.addEventListener('click', () => {
                const bkgId = link.getAttribute('data-booking-id');
                openBookingDetail(bkgId);
            });
        });

        tbody.querySelectorAll('.btn-open-reply-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                const revId = btn.getAttribute('data-review-id');
                openReplyReviewModal(revId);
            });
        });
    }

    function openReplyReviewModal(reviewId) {
        const modal = document.getElementById('modalReplyReview');
        const review = reviewsData.find(r => r.id === reviewId);
        if (!review || !modal) return;

        document.getElementById('replyReviewIdHidden').value = review.id;
        document.getElementById('reviewModalHeaderMeta').textContent = `${review.customerName} • ${review.bookingId} • ${'★'.repeat(review.rating)} (${review.rating}/5)`;
        document.getElementById('reviewModalCustomerComment').textContent = `"${review.comment}"`;
        document.getElementById('replyContentText').value = review.replyText || '';
        document.getElementById('replyVoucherSelect').value = 'NONE';

        modal.classList.add('active');
    }

    // Render danh sách các bước quy trình chuẩn trong Modal Dịch vụ
    function renderServiceStepsEditor() {
        const container = document.getElementById('serviceStepsListContainer');
        if (!container) return;

        if (!currentEditingServiceSteps || currentEditingServiceSteps.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 12.5px; font-style: italic; padding: 4px;">Chưa có bước chăm sóc nào. Hãy nhập tên bước bên dưới để thêm vào quy trình chuẩn.</div>';
            return;
        }

        container.innerHTML = currentEditingServiceSteps.map((step, idx) => `
            <div class="service-step-item-tag">
                <span class="step-num">Bước ${idx + 1}:</span>
                <span class="step-text">${step}</span>
                <button type="button" class="btn-remove-step" data-step-index="${idx}" title="Xóa bước này">✕</button>
            </div>
        `).join('');

        container.querySelectorAll('.btn-remove-step').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-step-index'));
                currentEditingServiceSteps.splice(index, 1);
                renderServiceStepsEditor();
            });
        });
    }

    // ==========================================================================
    // Render danh sách ảnh preview trong modal tiếp nhận
    function renderIntakeProofPreviewList() {
        const listEl = document.getElementById('intakeProofPreviewList');
        if (!listEl) return;
        if (intakeProofImagesTemp.length === 0) {
            listEl.innerHTML = '<span style="font-size: 12px; color: var(--text-muted);">Chưa có ảnh nào được chọn (nhấn nút tải ảnh ở trên)</span>';
            return;
        }
        listEl.innerHTML = intakeProofImagesTemp.map((img, idx) => `
            <div class="intake-proof-preview-item">
                <img src="${img}" alt="Ảnh bằng chứng ${idx + 1}" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">
                <button type="button" class="btn-remove-proof" data-proof-idx="${idx}" title="Gỡ ảnh">×</button>
            </div>
        `).join('');

        listEl.querySelectorAll('.btn-remove-proof').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-proof-idx'));
                intakeProofImagesTemp.splice(idx, 1);
                renderIntakeProofPreviewList();
            });
        });
    }

    // ==========================================================================
    // 6b. MỞ BIÊN BẢN TIẾP NHẬN BÉ VÀ KIỂM TRA AN TOÀN (ZERO-CLAIM INTAKE)
    // ==========================================================================
    function openIntakeModal(bookingId, mode) {
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!booking) return;

        selectedBookingId = bookingId;

        const modalIntake = document.getElementById('modalEditIntakeInfo');
        const modalTitleEl = document.getElementById('intakeModalTitle');
        const petSummaryEl = document.getElementById('intakePetSummary');
        const submitBtnEl = document.getElementById('intakeModalSubmitBtn');
        const modeInput = document.getElementById('intakeModalMode');
        const intakeWeightInput = document.getElementById('intakePetWeightInput');
        const origWeightLabel = document.getElementById('intakeOriginalWeightLabel');
        const staffSelect = document.getElementById('intakeStaffSelect');
        const weightAlertBox = document.getElementById('intakeWeightAlertBox');
        const intakeBelongingsInput = document.getElementById('intakeBelongingsInput');
        const woundNoteInput = document.getElementById('intakeExistingWoundNote');

        // Subtitle tóm tắt
        if (petSummaryEl) {
            petSummaryEl.textContent = `Mã ca: ${booking.id} | Bé: ${booking.petName} (${booking.petBreed}) | Chủ nuôi: ${booking.customerName} - ${booking.phone}`;
        }

        // Cân nặng
        const originalWeightNum = parseFloat(booking.petWeight) || 4.0;
        if (origWeightLabel) {
            origWeightLabel.textContent = `(Đăng ký online: ${booking.petWeight || '4.0 kg'})`;
        }
        if (intakeWeightInput) {
            const currentActual = booking.intakeSafety ? parseFloat(booking.intakeSafety.actualWeight) : originalWeightNum;
            intakeWeightInput.value = currentActual || originalWeightNum;
        }

        // Kỹ thuật viên
        if (staffSelect) {
            staffSelect.value = booking.staff || '';
        }

        // Hàm kiểm tra lệch cân nặng
        const checkWeightDiff = () => {
            if (!intakeWeightInput || !weightAlertBox) return;
            const actualVal = parseFloat(intakeWeightInput.value);
            if (isNaN(actualVal)) {
                weightAlertBox.style.display = 'none';
                return;
            }
            const diff = Math.abs(actualVal - originalWeightNum);
            if (diff >= 1.0) {
                weightAlertBox.style.display = 'block';
                weightAlertBox.innerHTML = `<strong>Lưu ý lệch khung cân nặng:</strong> Đo tại quầy ${actualVal} kg (chênh lệch ${diff.toFixed(1)} kg so với đăng ký ban đầu ${originalWeightNum} kg). Hệ thống sẽ tự động cập nhật phụ phí khung cân nặng nếu vượt bậc.`;
            } else {
                weightAlertBox.style.display = 'none';
            }
        };
        checkWeightDiff();
        if (intakeWeightInput) {
            intakeWeightInput.oninput = checkWeightDiff;
        }

        // Checklist
        const s = booking.intakeSafety;
        if (s) {
            // Khôi phục từ dữ liệu đã có
            const checkSkinNorm = document.getElementById('checkSkinNormal');
            const checkSkinFlea = document.getElementById('checkSkinFleas');
            const checkSkinFung = document.getElementById('checkSkinFungus');
            const checkSkinMatt = document.getElementById('checkSkinMatted');
            if (checkSkinNorm) checkSkinNorm.checked = (s.skinCoat && s.skinCoat.includes('Sạch sẽ'));
            if (checkSkinFlea) checkSkinFlea.checked = (s.skinCoat && s.skinCoat.includes('ve rận'));
            if (checkSkinFung) checkSkinFung.checked = (s.skinCoat && s.skinCoat.includes('nấm'));
            if (checkSkinMatt) checkSkinMatt.checked = (s.skinCoat && s.skinCoat.includes('bết'));

            const checkEyesNorm = document.getElementById('checkEyesEarsNormal');
            const checkEyesDisc = document.getElementById('checkEyesDischarge');
            const checkEarsInf = document.getElementById('checkEarsInfection');
            const checkNoseRun = document.getElementById('checkNoseRunny');
            if (checkEyesNorm) checkEyesNorm.checked = (s.eyesEarsNose && s.eyesEarsNose.includes('Bình thường'));
            if (checkEyesDisc) checkEyesDisc.checked = (s.eyesEarsNose && s.eyesEarsNose.includes('Đỏ mắt'));
            if (checkEarsInf) checkEarsInf.checked = (s.eyesEarsNose && s.eyesEarsNose.includes('tai'));
            if (checkNoseRun) checkNoseRun.checked = (s.eyesEarsNose && s.eyesEarsNose.includes('mũi'));

            const checkWoundNo = document.getElementById('checkWoundNone');
            const checkWoundExist = document.getElementById('checkWoundExisting');
            if (checkWoundNo) checkWoundNo.checked = (s.wounds && s.wounds.includes('Không có'));
            if (checkWoundExist) checkWoundExist.checked = (s.wounds && !s.wounds.includes('Không có'));
            if (woundNoteInput) woundNoteInput.value = (s.wounds && !s.wounds.includes('Không có')) ? s.wounds : '';

            // Radios tâm lý
            const radioTemperament = document.querySelectorAll('input[name="intakeTemperamentRadio"]');
            radioTemperament.forEach(r => {
                if (s.temperament && s.temperament.includes(r.value)) r.checked = true;
            });

            if (intakeBelongingsInput) intakeBelongingsInput.value = s.belongings || booking.belongings || '';
            intakeProofImagesTemp = [...(s.proofImages || [])];
        } else {
            // Mặc định ban đầu
            const checkSkinNorm = document.getElementById('checkSkinNormal');
            const checkSkinFlea = document.getElementById('checkSkinFleas');
            const checkSkinFung = document.getElementById('checkSkinFungus');
            const checkSkinMatt = document.getElementById('checkSkinMatted');
            if (checkSkinNorm) checkSkinNorm.checked = true;
            if (checkSkinFlea) checkSkinFlea.checked = false;
            if (checkSkinFung) checkSkinFung.checked = false;
            if (checkSkinMatt) checkSkinMatt.checked = false;

            const checkEyesNorm = document.getElementById('checkEyesEarsNormal');
            const checkEyesDisc = document.getElementById('checkEyesDischarge');
            const checkEarsInf = document.getElementById('checkEarsInfection');
            const checkNoseRun = document.getElementById('checkNoseRunny');
            if (checkEyesNorm) checkEyesNorm.checked = true;
            if (checkEyesDisc) checkEyesDisc.checked = false;
            if (checkEarsInf) checkEarsInf.checked = false;
            if (checkNoseRun) checkNoseRun.checked = false;

            const checkWoundNo = document.getElementById('checkWoundNone');
            const checkWoundExist = document.getElementById('checkWoundExisting');
            if (checkWoundNo) checkWoundNo.checked = true;
            if (checkWoundExist) checkWoundExist.checked = false;
            if (woundNoteInput) woundNoteInput.value = '';

            const radioTemperament = document.querySelectorAll('input[name="intakeTemperamentRadio"]');
            if (radioTemperament.length > 0) radioTemperament[0].checked = true;

            if (intakeBelongingsInput) intakeBelongingsInput.value = booking.belongings || '';
            intakeProofImagesTemp = [];
        }

        renderIntakeProofPreviewList();

        // Nút gắn ảnh bằng chứng
        const btnAddProof = document.getElementById('btnAddProofPhotoBtn');
        const fileInput = document.getElementById('intakeProofFileInput');
        if (btnAddProof && fileInput) {
            btnAddProof.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        intakeProofImagesTemp.push(evt.target.result);
                        renderIntakeProofPreviewList();
                    };
                    reader.readAsDataURL(file);
                });
                fileInput.value = '';
            };
        }

        // Checkbox đồ dùng
        const belongingCheckboxes = document.querySelectorAll('.check-belonging-item');
        belongingCheckboxes.forEach(cb => {
            cb.onchange = () => {
                const checkedVals = Array.from(belongingCheckboxes).filter(c => c.checked).map(c => c.value);
                if (intakeBelongingsInput) {
                    let currentTxt = intakeBelongingsInput.value;
                    checkedVals.forEach(v => {
                        if (!currentTxt.includes(v)) {
                            currentTxt = currentTxt ? `${currentTxt}, ${v}` : v;
                        }
                    });
                    intakeBelongingsInput.value = currentTxt;
                }
            };
        });

        if (mode === 'intake') {
            if (modalTitleEl) modalTitleEl.textContent = 'Biên bản tiếp nhận bé và Kiểm tra an toàn (Zero-Claim)';
            if (submitBtnEl) submitBtnEl.textContent = 'Xác nhận tiếp nhận và Bắt đầu ca';
            if (modeInput) modeInput.value = 'intake';
        } else {
            if (modalTitleEl) modalTitleEl.textContent = 'Cập nhật biên bản tiếp nhận an toàn';
            if (submitBtnEl) submitBtnEl.textContent = 'Lưu biên bản';
            if (modeInput) modeInput.value = 'edit';
        }

        if (modalIntake) modalIntake.classList.add('active');
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

        // Tự động kiểm tra nếu chuyển từ phân hệ Thú cưng sang với thông tin bé cưng điền sẵn
        const checkPresetBooking = () => {
            const rawPreset = sessionStorage.getItem('pawpal_admin_booking_preset');
            if (rawPreset) {
                try {
                    const preset = JSON.parse(rawPreset);
                    const custEl = document.getElementById('newBookingCustomer');
                    const phoneEl = document.getElementById('newBookingPhone');
                    const petEl = document.getElementById('newBookingPetName');
                    const dateInput = document.getElementById('newBookingDate');

                    if (custEl && preset.ownerName) custEl.value = preset.ownerName;
                    if (phoneEl && preset.ownerPhone) phoneEl.value = preset.ownerPhone;
                    if (petEl && preset.petName) petEl.value = preset.petName;
                    if (dateInput) {
                        const todayStr = new Date().toISOString().split('T')[0];
                        dateInput.value = todayStr;
                    }

                    if (modalCreate) modalCreate.classList.add('active');
                    sessionStorage.removeItem('pawpal_admin_booking_preset');
                    showToast(`Đã tự động điền thông tin bé ${preset.petName} vào phiếu tạo lịch hẹn!`);
                } catch (e) {}
            }
        };
        setTimeout(checkPresetBooking, 150);

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

                // Tự động sinh danh sách bước Care-log từ Quy trình chuẩn của Dịch vụ được chọn
                const matchedSvc = servicesData.find(s => s.name === serviceName);
                const initialTimeline = (matchedSvc && matchedSvc.steps && matchedSvc.steps.length > 0)
                    ? matchedSvc.steps.map((st, i) => ({
                        time: i === 0 ? time : '--:--',
                        title: st,
                        desc: i === 0 ? 'Đã tiếp nhận và chuẩn bị ca dịch vụ' : 'Đang chờ thực hiện theo quy trình',
                        done: i === 0,
                        staff: staff || 'KTV'
                    }))
                    : [ { time: time, title: 'Tiếp nhận ca mới', desc: 'Đã tạo lịch hẹn thành công', done: true, staff: staff || 'PawPal' } ];

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
                    serviceCode: matchedSvc ? matchedSvc.code : 'SPA01',
                    category: category,
                    categoryName: categoryName,
                    serviceName: serviceName,
                    date: date,
                    time: time,
                    duration: matchedSvc ? matchedSvc.duration : '60 phút',
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
                    timeline: initialTimeline
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
        const btnAddStep = document.getElementById('btnAddStepToService');
        const inputNewStep = document.getElementById('newServiceStepInput');

        if (btnAddStep) {
            btnAddStep.addEventListener('click', () => {
                if (inputNewStep && inputNewStep.value.trim()) {
                    currentEditingServiceSteps.push(inputNewStep.value.trim());
                    inputNewStep.value = '';
                    renderServiceStepsEditor();
                }
            });
        }

        if (inputNewStep) {
            inputNewStep.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (btnAddStep) btnAddStep.click();
                }
            });
        }

        if (btnOpenCreateService) {
            btnOpenCreateService.addEventListener('click', () => {
                document.getElementById('serviceFormModalTitle').textContent = 'Thêm dịch vụ mới';
                document.getElementById('editServiceCodeHidden').value = '';
                formService.reset();
                currentEditingServiceSteps = [
                    'Tiếp nhận bé và kiểm tra da lông sơ bộ',
                    'Thực hiện liệu trình dịch vụ chuyên nghiệp',
                    'Vệ sinh tai móng và khử khuẩn',
                    'Chụp ảnh hoàn tất và bàn giao cho chủ'
                ];
                renderServiceStepsEditor();
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
                        existing.steps = [...currentEditingServiceSteps];
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
                        steps: [...currentEditingServiceSteps],
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

        // Upload và quản lý ảnh trong form thêm bước Care-Log
        const btnTriggerUpload = document.getElementById('btnTriggerCarelogImageUpload');
        const fileInput = document.getElementById('carelogImageFileInput');
        const previewStrip = document.getElementById('carelogImagePreviewStrip');
        const countText = document.getElementById('carelogImageCountText');

        function renderCarelogPreviewStrip() {
            if (!previewStrip || !countText) return;
            if (currentCarelogStepImages.length === 0) {
                previewStrip.style.display = 'none';
                previewStrip.innerHTML = '';
                countText.textContent = '0 ảnh đã chọn';
                return;
            }
            previewStrip.style.display = 'flex';
            countText.textContent = `${currentCarelogStepImages.length} ảnh đã chọn`;
            previewStrip.innerHTML = currentCarelogStepImages.map((src, i) => `
                <div class="carelog-preview-thumb-wrap">
                    <img src="${src}" class="carelog-preview-thumb" alt="Ảnh đính kèm">
                    <button type="button" class="carelog-thumb-del-btn" data-img-index="${i}">✕</button>
                </div>
            `).join('');

            previewStrip.querySelectorAll('.carelog-thumb-del-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const i = parseInt(btn.getAttribute('data-img-index'));
                    currentCarelogStepImages.splice(i, 1);
                    renderCarelogPreviewStrip();
                });
            });
        }

        if (btnTriggerUpload && fileInput) {
            btnTriggerUpload.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length === 0) return;
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        currentCarelogStepImages.push(evt.target.result);
                        renderCarelogPreviewStrip();
                    };
                    reader.readAsDataURL(file);
                });
                fileInput.value = '';
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
                        staff: staffInput.value.trim() || booking.staff || 'KTV',
                        images: [...currentCarelogStepImages]
                    });
                    persistData();
                    renderBookingDetail(booking.id);
                    titleInput.value = '';
                    staffInput.value = '';
                    noteInput.value = '';
                    currentCarelogStepImages = [];
                    renderCarelogPreviewStrip();
                }
            });
        }

        // Modal 6: Xem ảnh phóng to (Lightbox)
        const modalPhoto = document.getElementById('modalCarelogPhotoPreview');
        const btnClosePhoto = document.getElementById('btnClosePhotoPreview');
        if (btnClosePhoto && modalPhoto) {
            btnClosePhoto.addEventListener('click', () => modalPhoto.classList.remove('active'));
            modalPhoto.addEventListener('click', (e) => {
                if (e.target === modalPhoto) modalPhoto.classList.remove('active');
            });
        }

        // Nút chia sẻ link nhật ký cho khách
        const btnShareCarelog = document.getElementById('btnShareCarelogLink');
        if (btnShareCarelog) {
            btnShareCarelog.addEventListener('click', () => {
                const url = window.location.origin + `/pages/carelog.html?booking=${selectedBookingId}`;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(() => {
                        alert(`Đã sao chép liên kết Nhật ký chăm sóc thời gian thực gửi cho khách hàng:\n${url}`);
                    });
                } else {
                    alert(`Liên kết Nhật ký chăm sóc cho khách hàng:\n${url}`);
                }
            });
        }

        // Modal 4: Phản hồi đánh giá
        const modalReply = document.getElementById('modalReplyReview');
        const btnCloseReply = document.getElementById('btnCloseReplyReview');
        const btnCancelReply = document.getElementById('btnCancelReplyReview');
        const formReply = document.getElementById('formReplyReview');

        const closeReplyModal = () => {
            if (modalReply) modalReply.classList.remove('active');
        };

        if (btnCloseReply) btnCloseReply.addEventListener('click', closeReplyModal);
        if (btnCancelReply) btnCancelReply.addEventListener('click', closeReplyModal);

        if (formReply) {
            formReply.addEventListener('submit', (e) => {
                e.preventDefault();
                const reviewId = document.getElementById('replyReviewIdHidden').value;
                const replyText = document.getElementById('replyContentText').value.trim();
                const voucherVal = document.getElementById('replyVoucherSelect').value;

                const review = reviewsData.find(r => r.id === reviewId);
                if (review) {
                    review.status = 'replied';
                    review.replyText = replyText;
                    review.replyDate = new Date().toLocaleDateString('vi-VN');

                    if (voucherVal === 'VOUCHER_50K') review.voucherSent = 'Voucher 50.000 đ';
                    else if (voucherVal === 'VOUCHER_100K') review.voucherSent = 'Voucher 100.000 đ';
                    else if (voucherVal === 'VOUCHER_FREE_BATH') review.voucherSent = '01 Lượt Tắm Miễn Phí';
                    else review.voucherSent = null;

                    persistData();
                    closeReplyModal();
                    renderReviewsTable();
                    updateReviewKPIs();
                }
            });
        }

        // Modal 5: Thêm phụ phí và Dịch vụ phát sinh
        const modalAddSurcharge = document.getElementById('modalAddSurcharge');
        const btnOpenAddSurcharge = document.getElementById('btnOpenAddSurchargeModal');
        const btnCloseAddSurcharge = document.getElementById('btnCloseAddSurcharge');
        const btnCancelAddSurcharge = document.getElementById('btnCancelAddSurcharge');
        const formAddSurcharge = document.getElementById('formAddSurcharge');
        const surchargePresetSelect = document.getElementById('surchargePresetSelect');
        const surchargeNameInput = document.getElementById('surchargeNameInput');
        const surchargeAmountInput = document.getElementById('surchargeAmountInput');
        const surchargeReasonInput = document.getElementById('surchargeReasonInput');
        const surchargeConsentSelect = document.getElementById('surchargeConsentSelect');

        if (btnOpenAddSurcharge) {
            btnOpenAddSurcharge.addEventListener('click', () => {
                if (formAddSurcharge) formAddSurcharge.reset();
                if (surchargePresetSelect) surchargePresetSelect.value = 'CUSTOM';
                if (modalAddSurcharge) modalAddSurcharge.classList.add('active');
            });
        }

        const closeAddSurchargeModal = () => {
            if (modalAddSurcharge) modalAddSurcharge.classList.remove('active');
        };

        if (btnCloseAddSurcharge) btnCloseAddSurcharge.addEventListener('click', closeAddSurchargeModal);
        if (btnCancelAddSurcharge) btnCancelAddSurcharge.addEventListener('click', closeAddSurchargeModal);

        if (surchargePresetSelect) {
            surchargePresetSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val && val !== 'CUSTOM') {
                    const [presetName, presetPrice] = val.split('|');
                    if (surchargeNameInput) surchargeNameInput.value = presetName || '';
                    if (surchargeAmountInput) surchargeAmountInput.value = presetPrice || '';
                }
            });
        }

        if (formAddSurcharge) {
            formAddSurcharge.addEventListener('submit', (e) => {
                e.preventDefault();
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (!booking) return;

                const name = surchargeNameInput.value.trim();
                const amount = parseInt(surchargeAmountInput.value) || 0;
                const reason = surchargeReasonInput.value.trim();
                const consent = surchargeConsentSelect.value;
                const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                booking.addons = booking.addons || [];
                const newAddon = {
                    id: 'ADD-' + Date.now(),
                    name: name,
                    amount: amount,
                    reason: reason,
                    consent: consent,
                    time: currentTime
                };
                booking.addons.push(newAddon);
                booking.addonPrice = booking.addons.reduce((sum, a) => sum + Number(a.amount || 0), 0);
                booking.total = Math.max(0, Number(booking.price || 0) + booking.addonPrice - Number(booking.discount || 0));

                // Tự động ghi nhật ký vào Timeline Care-Log
                booking.timeline = booking.timeline || [];
                booking.timeline.push({
                    time: currentTime,
                    title: `Phát sinh: ${name} (+${formatCurrency(amount)})`,
                    desc: `[${consent}] ${reason}`,
                    done: true,
                    staff: booking.staff || 'KTV'
                });

                persistData();
                closeAddSurchargeModal();
                renderBookingDetail(booking.id);
                renderBookingsTable();
            });
        }

        // Modal 7: Thêm Dịch vụ đi cùng vào ca
        const modalAddAccompanying = document.getElementById('modalAddAccompanyingService');
        const btnOpenAddAccompanying = document.getElementById('btnOpenAddAccompanyingServiceModal');
        const btnCloseAddAccompanying = document.getElementById('btnCloseAddAccompanying');
        const btnCancelAddAccompanying = document.getElementById('btnCancelAddAccompanying');
        const formAddAccompanying = document.getElementById('formAddAccompanyingService');
        const accCatSelect = document.getElementById('accompanyingCategorySelect');
        const accItemSelect = document.getElementById('accompanyingServiceItemSelect');
        const accPriceInput = document.getElementById('accompanyingPriceInput');
        const accStaffInput = document.getElementById('accompanyingStaffInput');
        const accNoteInput = document.getElementById('accompanyingNoteInput');

        function populateAccompanyingServicesDropdown(filterGroup) {
            if (!accItemSelect) return;
            let list = servicesData;
            if (filterGroup && filterGroup !== 'ALL') {
                list = list.filter(s => s.group === filterGroup);
            }
            accItemSelect.innerHTML = list.map(s => `
                <option value="${s.code}" data-price="${s.priceFrom.replace(/\./g, '')}">${s.name} (${s.code} - ${s.priceFrom} đ)</option>
            `).join('');

            if (list.length > 0 && accPriceInput) {
                const initialPrice = list[0].priceFrom.replace(/\./g, '');
                accPriceInput.value = initialPrice;
            }
        }

        if (accCatSelect) {
            accCatSelect.addEventListener('change', (e) => {
                populateAccompanyingServicesDropdown(e.target.value);
            });
        }

        if (accItemSelect) {
            accItemSelect.addEventListener('change', (e) => {
                const selectedOpt = accItemSelect.options[accItemSelect.selectedIndex];
                if (selectedOpt && accPriceInput) {
                    accPriceInput.value = selectedOpt.getAttribute('data-price') || '200000';
                }
            });
        }

        if (btnOpenAddAccompanying) {
            btnOpenAddAccompanying.addEventListener('click', () => {
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (formAddAccompanying) formAddAccompanying.reset();
                if (accCatSelect) accCatSelect.value = 'ALL';
                populateAccompanyingServicesDropdown('ALL');
                if (accStaffInput && booking) accStaffInput.value = booking.staff || 'Hoàng Nam';
                if (modalAddAccompanying) modalAddAccompanying.classList.add('active');
            });
        }

        const closeAddAccompanyingModal = () => {
            if (modalAddAccompanying) modalAddAccompanying.classList.remove('active');
        };

        if (btnCloseAddAccompanying) btnCloseAddAccompanying.addEventListener('click', closeAddAccompanyingModal);
        if (btnCancelAddAccompanying) btnCancelAddAccompanying.addEventListener('click', closeAddAccompanyingModal);

        if (formAddAccompanying) {
            formAddAccompanying.addEventListener('submit', (e) => {
                e.preventDefault();
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (!booking) return;

                const svcCode = accItemSelect.value;
                const matchedSvc = servicesData.find(s => s.code === svcCode);
                const price = parseInt(accPriceInput.value) || 200000;
                const staff = accStaffInput.value.trim() || booking.staff || 'KTV';
                const note = accNoteInput.value.trim();

                booking.accompanyingServices = booking.accompanyingServices || [];
                const newAcc = {
                    id: 'ACC-' + Date.now(),
                    code: svcCode,
                    name: matchedSvc ? matchedSvc.name : 'Dịch vụ đi cùng',
                    price: price,
                    staff: staff,
                    note: note
                };
                booking.accompanyingServices.push(newAcc);

                // Tự động ghép thêm các bước của dịch vụ đi cùng vào Care-Log Timeline
                booking.timeline = booking.timeline || [];
                if (matchedSvc && matchedSvc.steps && matchedSvc.steps.length > 0) {
                    matchedSvc.steps.forEach(st => {
                        booking.timeline.push({
                            time: '--:--',
                            title: `[${matchedSvc.name}] ${st}`,
                            desc: note || 'Bước theo gói dịch vụ đi cùng đã thêm',
                            done: false,
                            staff: staff,
                            images: []
                        });
                    });
                } else {
                    booking.timeline.push({
                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        title: `Bổ sung: ${newAcc.name}`,
                        desc: note || 'Đã thêm gói dịch vụ đi cùng vào ca',
                        done: false,
                        staff: staff,
                        images: []
                    });
                }

                const accompanyingTotal = booking.accompanyingServices.reduce((sum, a) => sum + Number(a.price || 0), 0);
                booking.addonPrice = (booking.addons || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
                booking.total = Math.max(0, Number(booking.price || 0) + accompanyingTotal + booking.addonPrice - Number(booking.discount || 0));

                persistData();
                closeAddAccompanyingModal();
                renderBookingDetail(booking.id);
                renderBookingsTable();
            });
        }

        // Modal 8: Sửa thông tin tiếp nhận tại quầy
        const modalIntake = document.getElementById('modalEditIntakeInfo');
        const btnOpenIntake = document.getElementById('btnEditIntakeInfo');
        const btnCloseIntake = document.getElementById('btnCloseEditIntakeInfo');
        const btnCancelIntake = document.getElementById('btnCancelEditIntakeInfo');
        const formIntake = document.getElementById('formEditIntakeInfo');
        const intakeWeightInput = document.getElementById('intakePetWeightInput');
        const intakeAgeInput = document.getElementById('intakePetAgeInput');
        const intakeBelongingsInput = document.getElementById('intakeBelongingsInput');
        const intakeAlertInput = document.getElementById('intakePetAlertInput');

        // Hàm mở Modal 8 đã được định nghĩa bên ngoài setupModals (openIntakeModal)

        if (btnOpenIntake) {
            btnOpenIntake.addEventListener('click', () => {
                openIntakeModal(selectedBookingId, 'edit');
            });
        }

        const closeIntakeModal = () => {
            if (modalIntake) modalIntake.classList.remove('active');
        };

        if (btnCloseIntake) btnCloseIntake.addEventListener('click', closeIntakeModal);
        if (btnCancelIntake) btnCancelIntake.addEventListener('click', closeIntakeModal);

        if (formIntake) {
            formIntake.addEventListener('submit', (e) => {
                e.preventDefault();
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (!booking) return;

                const intakeWeightInput = document.getElementById('intakePetWeightInput');
                const staffSelect = document.getElementById('intakeStaffSelect');
                const intakeBelongingsInput = document.getElementById('intakeBelongingsInput');
                const woundNoteInput = document.getElementById('intakeExistingWoundNote');

                const checkSkinNorm = document.getElementById('checkSkinNormal');
                const checkSkinFlea = document.getElementById('checkSkinFleas');
                const checkSkinFung = document.getElementById('checkSkinFungus');
                const checkSkinMatt = document.getElementById('checkSkinMatted');

                const checkEyesNorm = document.getElementById('checkEyesEarsNormal');
                const checkEyesDisc = document.getElementById('checkEyesDischarge');
                const checkEarsInf = document.getElementById('checkEarsInfection');
                const checkNoseRun = document.getElementById('checkNoseRunny');

                const checkWoundNo = document.getElementById('checkWoundNone');

                const actualWeightNum = parseFloat(intakeWeightInput ? intakeWeightInput.value : booking.petWeight) || 4.0;
                const actualWeightStr = actualWeightNum.toFixed(1) + ' kg';
                const staffVal = (staffSelect && staffSelect.value) ? staffSelect.value : (booking.staff || 'Ngọc Anh');

                // Da lông
                const skinParts = [];
                if (checkSkinNorm && checkSkinNorm.checked) skinParts.push('Sạch sẽ');
                if (checkSkinFlea && checkSkinFlea.checked) skinParts.push('Có ve rận/bọ chét');
                if (checkSkinFung && checkSkinFung.checked) skinParts.push('Có mảng nấm/viêm đỏ');
                if (checkSkinMatt && checkSkinMatt.checked) skinParts.push('Lông bết rối nhiều');

                // Mắt tai mũi
                const eyesParts = [];
                if (checkEyesNorm && checkEyesNorm.checked) eyesParts.push('Bình thường');
                if (checkEyesDisc && checkEyesDisc.checked) eyesParts.push('Đỏ mắt/nhiều rỉ ghèn');
                if (checkEarsInf && checkEarsInf.checked) eyesParts.push('Sáp tai đen/viêm tai');
                if (checkNoseRun && checkNoseRun.checked) eyesParts.push('Chảy nước mũi/hắt hơi');

                // Vết thương cũ
                const woundsVal = (checkWoundNo && checkWoundNo.checked)
                    ? 'Không có vết thương cũ'
                    : ((woundNoteInput && woundNoteInput.value.trim()) ? woundNoteInput.value.trim() : 'Có vết trầy xước/sẹo cũ từ trước');

                // Tính khí
                const selectedTempRadio = document.querySelector('input[name="intakeTemperamentRadio"]:checked');
                const selectedTemp = selectedTempRadio ? selectedTempRadio.value : 'Ngoan hiền';

                // Đồ dùng gửi lại
                const belongingsVal = (intakeBelongingsInput && intakeBelongingsInput.value.trim()) ? intakeBelongingsInput.value.trim() : 'Không có';

                // Đánh giá cân nặng
                const origNum = parseFloat(booking.petWeight) || 4.0;
                const diff = actualWeightNum - origNum;
                const weightEval = Math.abs(diff) >= 1.0 ? `Lệch khung cân (${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg)` : 'Đúng khung giá đăng ký';

                const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                // Lưu hồ sơ Intake Safety
                booking.intakeSafety = {
                    actualWeight: actualWeightStr,
                    weightEval: weightEval,
                    skinCoat: skinParts.join(', ') || 'Sạch sẽ',
                    eyesEarsNose: eyesParts.join(', ') || 'Bình thường',
                    wounds: woundsVal,
                    temperament: selectedTemp,
                    belongings: belongingsVal,
                    proofImages: [...intakeProofImagesTemp],
                    intakeStaff: staffVal,
                    intakeTime: timeNow
                };

                booking.petWeight = actualWeightStr;
                booking.staff = staffVal;
                booking.belongings = belongingsVal;

                const modeInput = document.getElementById('intakeModalMode');
                const mode = modeInput ? modeInput.value : 'edit';

                if (mode === 'intake') {
                    // Chuyển trạng thái sang in_progress
                    booking.status = 'in_progress';
                    booking.alertType = null;

                    booking.timeline = booking.timeline || [];
                    if (booking.timeline.length > 0) booking.timeline[0].done = true;
                    booking.timeline.push({
                        time: timeNow,
                        title: 'Tiếp nhận bé và Kiểm tra an toàn (Zero-Claim)',
                        desc: `Cân nặng: ${actualWeightStr} (${weightEval}). Da lông: ${booking.intakeSafety.skinCoat}. Vết thương: ${woundsVal}. Tính khí: ${selectedTemp}. Đồ gửi lại: ${belongingsVal}. KTV phụ trách: ${staffVal}.`,
                        done: true,
                        staff: staffVal,
                        images: [...intakeProofImagesTemp]
                    });

                    // Tự động nạp các bước quy trình chuẩn từ danh mục dịch vụ vào Care-Log
                    const serviceEntry = servicesData.find(s => s.code === booking.serviceCode);
                    if (serviceEntry && serviceEntry.steps && serviceEntry.steps.length > 0) {
                        serviceEntry.steps.forEach((stepName, idx) => {
                            booking.timeline.push({
                                time: '',
                                title: stepName,
                                desc: `Bước ${idx + 1} trong quy trình ${serviceEntry.name}`,
                                done: false,
                                staff: staffVal,
                                images: []
                            });
                        });
                    }

                    persistData();
                    closeIntakeModal();
                    renderBookingDetail(booking.id);
                    renderBookingsTable();
                    renderUpcomingBar();
                    updateKPIs();
                    showToast(`Đã hoàn tất tiếp nhận bé ${booking.petName} và bắt đầu ca dịch vụ!`);
                } else {
                    // Chế độ Sửa thông tin: chỉ lưu hồ sơ an toàn
                    persistData();
                    closeIntakeModal();
                    renderBookingDetail(booking.id);
                    renderBookingsTable();
                    showToast(`Đã cập nhật biên bản tiếp nhận an toàn bé ${booking.petName}!`);
                }
            });
        }
    }

    // ==========================================================================
    // 6c. MỞ MODAL ĐỔI KTV (STANDALONE)
    // ==========================================================================
    function openChangeStaffModal(bookingId) {
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!booking) return;

        const modal = document.getElementById('modalChangeStaff');
        const staffSelect = document.getElementById('changeStaffSelect');
        const reasonInput = document.getElementById('changeStaffReasonInput');

        // Pre-select KTV hiện tại nếu có
        if (staffSelect) {
            staffSelect.value = booking.staff || '';
        }
        if (reasonInput) reasonInput.value = '';

        // Lưu bookingId để submit biết cần cập nhật ca nào
        if (modal) {
            modal.setAttribute('data-booking-id', bookingId);
            modal.classList.add('active');
        }
    }

    function setupChangeStaffModal() {
        const modal = document.getElementById('modalChangeStaff');
        const form = document.getElementById('formChangeStaff');
        const btnClose = document.getElementById('btnCloseChangeStaff');
        const btnCancel = document.getElementById('btnCancelChangeStaff');

        const closeModal = () => { if (modal) modal.classList.remove('active'); };
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const bookingId = modal ? modal.getAttribute('data-booking-id') : null;
                const booking = bookingsData.find(b => b.id === bookingId);
                if (!booking) return;

                const staffSelect = document.getElementById('changeStaffSelect');
                const reasonInput = document.getElementById('changeStaffReasonInput');
                const newStaff = staffSelect ? staffSelect.value.trim() : '';
                const reason = reasonInput ? reasonInput.value.trim() : '';

                if (!newStaff) return;

                const oldStaff = booking.staff || 'Chưa phân công';
                booking.staff = newStaff;

                // Ghi mốc timeline
                const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                booking.timeline = booking.timeline || [];
                booking.timeline.push({
                    time: timeNow,
                    title: `Đổi Kỹ thuật viên: ${oldStaff} → ${newStaff}`,
                    desc: reason || `Điều phối lại KTV phụ trách ca dịch vụ`,
                    done: true,
                    staff: newStaff,
                    images: []
                });

                persistData();
                closeModal();
                renderBookingDetail(booking.id);
                renderBookingsTable();
            });
        }
    }

    function openPhotoLightbox(src, title, time) {
        const modal = document.getElementById('modalCarelogPhotoPreview');
        const imgEl = document.getElementById('previewPhotoModalImg');
        const titleEl = document.getElementById('previewPhotoModalTitle');
        const captionEl = document.getElementById('previewPhotoModalCaption');

        if (!modal || !imgEl) return;
        imgEl.src = src;
        if (titleEl) titleEl.textContent = title || 'Ảnh nhật ký chăm sóc';
        if (captionEl) captionEl.textContent = `Ghi nhận lúc: ${time || ''} • Hồ sơ ca ${selectedBookingId}`;
        modal.classList.add('active');
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

        // Khởi tạo các bước chuẩn vào trình chỉnh sửa
        currentEditingServiceSteps = [...(service.steps || [
            'Tiếp nhận bé và kiểm tra da lông sơ bộ',
            'Thực hiện liệu trình dịch vụ chuyên nghiệp',
            'Vệ sinh và kiểm tra hoàn thiện',
            'Bàn giao cho chủ nuôi'
        ])];
        renderServiceStepsEditor();

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
        const btnIntake = document.getElementById('menuActionIntake');
        const btnComplete = document.getElementById('menuActionComplete');
        const btnCancel = document.getElementById('menuActionCancel');

        if (booking) {
            btnConfirm.style.display = booking.status === 'pending' ? 'block' : 'none';
            btnIntake.style.display = booking.status === 'confirmed' ? 'block' : 'none';
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

        document.getElementById('menuActionIntake').onclick = () => {
            if (activeDropdownBookingId) {
                openIntakeModal(activeDropdownBookingId, 'intake');
            }
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

        const btnSla = document.getElementById('btnToggleSlaOverdue');
        if (btnSla) {
            btnSla.addEventListener('click', () => {
                isSlaFilterActive = !isSlaFilterActive;
                btnSla.classList.toggle('active', isSlaFilterActive);
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

        // Bộ lọc cho Subtab 3: Danh mục và Bảng giá
        const catalogSearchInput = document.getElementById('catalogSearchInput');
        const catalogFilterStatusSelect = document.getElementById('catalogFilterStatus');

        if (catalogSearchInput) {
            catalogSearchInput.addEventListener('input', (e) => {
                catalogSearchTerm = e.target.value.trim();
                renderCatalogTable();
            });
        }

        if (catalogFilterStatusSelect) {
            catalogFilterStatusSelect.addEventListener('change', (e) => {
                catalogFilterStatus = e.target.value;
                renderCatalogTable();
            });
        }

        // Bộ lọc cho Subtab 4: Đánh giá
        const reviewSearchInput = document.getElementById('reviewSearchInput');
        const reviewFilterStarSelect = document.getElementById('reviewFilterStar');
        const reviewFilterCatSelect = document.getElementById('reviewFilterCategory');
        const reviewFilterStatusSelect = document.getElementById('reviewFilterStatus');

        if (reviewSearchInput) {
            reviewSearchInput.addEventListener('input', (e) => {
                reviewSearchTerm = e.target.value.trim();
                renderReviewsTable();
            });
        }

        if (reviewFilterStarSelect) {
            reviewFilterStarSelect.addEventListener('change', (e) => {
                reviewFilterStar = e.target.value;
                renderReviewsTable();
            });
        }

        if (reviewFilterCatSelect) {
            reviewFilterCatSelect.addEventListener('change', (e) => {
                reviewFilterCategory = e.target.value;
                renderReviewsTable();
            });
        }

        if (reviewFilterStatusSelect) {
            reviewFilterStatusSelect.addEventListener('change', (e) => {
                reviewFilterStatus = e.target.value;
                renderReviewsTable();
            });
        }

        // Click KPI Card Đánh giá
        document.querySelectorAll('[data-review-filter]').forEach(card => {
            card.addEventListener('click', () => {
                const filter = card.getAttribute('data-review-filter');
                if (filter === 'pending') {
                    reviewFilterStatus = 'pending';
                    if (reviewFilterStatusSelect) reviewFilterStatusSelect.value = 'pending';
                } else if (filter === 'low_rating') {
                    reviewFilterStar = 'LOW';
                    if (reviewFilterStarSelect) reviewFilterStarSelect.value = 'LOW';
                } else {
                    reviewFilterStatus = 'ALL';
                    reviewFilterStar = 'ALL';
                    if (reviewFilterStatusSelect) reviewFilterStatusSelect.value = 'ALL';
                    if (reviewFilterStarSelect) reviewFilterStarSelect.value = 'ALL';
                }
                renderReviewsTable();
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
        renderReviewsTable();
        updateReviewKPIs();
        setupFilterEvents();
        setupModals();
        setupChangeStaffModal();
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
