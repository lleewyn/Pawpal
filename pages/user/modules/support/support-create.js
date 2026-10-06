// support-create.js - Xử lý tạo Khiếu nại và Yêu cầu Hỗ trợ phía User (Chuẩn SPA & AGENTS.md)
import '/scripts/shared/support-handler.js';

let userBookings = [];
let userOrders = [];
let selectedFileBase64 = null;

export async function initSupportCreate() {
    if (typeof window.setUserSubBreadcrumb === 'function') {
        window.setUserSubBreadcrumb('Gửi yêu cầu mới', 'support');
    }

    const ticketTypeSelect = document.getElementById('ticketType');
    const serviceContextSection = document.getElementById('serviceContextSection');
    const orderContextSection = document.getElementById('orderContextSection');
    const serviceBookingSelect = document.getElementById('serviceBookingSelect');
    const serviceIssueType = document.getElementById('serviceIssueType');
    const orderSelect = document.getElementById('orderSelect');
    const orderIssueType = document.getElementById('orderIssueType');
    const orderCustomerDemand = document.getElementById('orderCustomerDemand');
    const ticketTitleInput = document.getElementById('ticketTitle');
    const ticketContentInput = document.getElementById('ticketContent');
    const ticketFileInput = document.getElementById('ticketFile');
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    const filePreviewImg = document.getElementById('filePreviewImg');
    const filePreviewName = document.getElementById('filePreviewName');
    const filePreviewSize = document.getElementById('filePreviewSize');
    const btnRemoveFile = document.getElementById('btnRemoveFile');
    const createComplaintForm = document.getElementById('createComplaintForm');
    const btnSubmit = document.getElementById('btnSubmitComplaint');

    if (!createComplaintForm || !ticketTypeSelect) return;

    // 1. Đọc URL Parameters / Hash search
    const hashParts = window.location.hash.split('?');
    const urlParams = new URLSearchParams(hashParts[1] || window.location.search);
    const queryType = urlParams.get('type');
    const queryBookingId = urlParams.get('bookingId');
    const queryOrderId = urlParams.get('orderId');

    // Hàm chuyển đổi giao diện khi đổi loại sự cố
    function handleTypeChange() {
        const val = ticketTypeSelect.value;
        if (val === 'service') {
            serviceContextSection?.classList.remove('d-none');
            orderContextSection?.classList.add('d-none');
        } else if (val === 'order') {
            serviceContextSection?.classList.add('d-none');
            orderContextSection?.classList.remove('d-none');
        } else {
            serviceContextSection?.classList.add('d-none');
            orderContextSection?.classList.add('d-none');
        }
    }

    // Tự động gợi ý tiêu đề theo ngữ cảnh nếu người dùng chưa nhập tiêu đề riêng
    function autoGenerateTitle() {
        if (!ticketTitleInput) return;
        const type = ticketTypeSelect.value;

        if (type === 'service') {
            const bId = serviceBookingSelect?.value;
            const booking = userBookings.find(b => String(b.id || b.code) === String(bId));
            const issueLabel = serviceIssueType?.options[serviceIssueType.selectedIndex]?.text || '';
            const pet = booking?.petName || 'Bé cưng';
            const srv = booking?.service || booking?.serviceName || 'Dịch vụ';

            ticketTitleInput.value = `[Khiếu nại Dịch vụ] ${pet} - ${srv}: ${issueLabel}`;
        } else if (type === 'order') {
            const oId = orderSelect?.value;
            const issueLabel = orderIssueType?.options[orderIssueType.selectedIndex]?.text || '';
            ticketTitleInput.value = `[Khiếu nại Đơn hàng ${oId || ''}] ${issueLabel}`;
        } else if (type === 'payment') {
            ticketTitleInput.value = '[Sự cố Thanh toán] Lỗi giao dịch / Hoàn tiền';
        }
    }

    // Cập nhật card tóm tắt ca dịch vụ
    function updateServiceSummary() {
        const serviceSummaryBox = document.getElementById('serviceSummaryBox');
        const summaryServiceName = document.getElementById('summaryServiceName');
        const summaryBookingCode = document.getElementById('summaryBookingCode');
        const summaryPetName = document.getElementById('summaryPetName');
        const summaryDateTime = document.getElementById('summaryDateTime');
        const summaryStaff = document.getElementById('summaryStaff');

        if (!serviceBookingSelect || !serviceSummaryBox) return;

        const bookingId = serviceBookingSelect.value;
        const b = userBookings.find(item => String(item.id || item.code) === String(bookingId));

        if (!b) {
            serviceSummaryBox.classList.add('d-none');
            return;
        }

        serviceSummaryBox.classList.remove('d-none');
        if (summaryServiceName) summaryServiceName.textContent = b.service || b.serviceName || 'Dịch vụ PawPal';
        if (summaryBookingCode) summaryBookingCode.textContent = `Mã: ${b.id || b.code}`;
        if (summaryPetName) summaryPetName.textContent = b.petName || b.petInfo?.petName || 'Bé cưng';
        if (summaryDateTime) summaryDateTime.textContent = b.date || b.timeStart ? `${b.date || ''} ${b.timeStart || ''}` : 'Gần đây';
        if (summaryStaff) summaryStaff.textContent = b.staff || 'Chuyên viên kỹ thuật';
    }

    // 2. Tải dữ liệu Bookings và Orders của Khách hàng
    await loadUserEntities();

    // 3. Khởi tạo trạng thái ban đầu theo URL Param
    if (queryType && ['service', 'order', 'payment', 'other'].includes(queryType)) {
        ticketTypeSelect.value = queryType;
    } else if (queryBookingId) {
        ticketTypeSelect.value = 'service';
    } else if (queryOrderId) {
        ticketTypeSelect.value = 'order';
    }

    handleTypeChange();

    if (queryBookingId && serviceBookingSelect) {
        serviceBookingSelect.value = queryBookingId;
        updateServiceSummary();
        autoGenerateTitle();
    }

    if (queryOrderId && orderSelect) {
        orderSelect.value = queryOrderId;
        autoGenerateTitle();
    }

    // 4. Lắng nghe sự kiện thay đổi Type
    ticketTypeSelect.addEventListener('change', () => {
        handleTypeChange();
        autoGenerateTitle();
    });

    if (serviceBookingSelect) {
        serviceBookingSelect.addEventListener('change', () => {
            updateServiceSummary();
            autoGenerateTitle();
        });
    }

    if (serviceIssueType) serviceIssueType.addEventListener('change', autoGenerateTitle);
    if (orderSelect) orderSelect.addEventListener('change', autoGenerateTitle);
    if (orderIssueType) orderIssueType.addEventListener('change', autoGenerateTitle);

    // 5. Xử lý tải và xem trước file minh chứng
    if (ticketFileInput) {
        ticketFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                alert('Dung lượng tệp vượt quá 5MB. Vui lòng chọn ảnh dung lượng nhẹ hơn hoặc liên hệ Hotline để hỗ trợ.');
                ticketFileInput.value = '';
                if (filePreviewContainer) filePreviewContainer.classList.add('d-none');
                selectedFileBase64 = null;
                return;
            }

            if (filePreviewName) filePreviewName.textContent = file.name;
            if (filePreviewSize) filePreviewSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    selectedFileBase64 = event.target.result;
                    if (filePreviewImg) {
                        filePreviewImg.src = selectedFileBase64;
                        filePreviewImg.style.display = 'block';
                    }
                    if (filePreviewContainer) {
                        filePreviewContainer.classList.remove('d-none');
                        filePreviewContainer.classList.add('d-flex');
                    }
                };
                reader.readAsDataURL(file);
            } else {
                if (filePreviewImg) filePreviewImg.style.display = 'none';
                if (filePreviewContainer) {
                    filePreviewContainer.classList.remove('d-none');
                    filePreviewContainer.classList.add('d-flex');
                }
            }
        });
    }

    if (btnRemoveFile) {
        btnRemoveFile.addEventListener('click', () => {
            if (ticketFileInput) ticketFileInput.value = '';
            selectedFileBase64 = null;
            if (filePreviewContainer) {
                filePreviewContainer.classList.add('d-none');
                filePreviewContainer.classList.remove('d-flex');
            }
        });
    }

    // 6. Xử lý Submit Form
    createComplaintForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const type = ticketTypeSelect.value;
        const title = ticketTitleInput.value.trim();
        const content = ticketContentInput.value.trim();

        if (!type) {
            alert('Vui lòng chọn phân loại sự cố.');
            ticketTypeSelect.focus();
            return;
        }

        if (!title) {
            alert('Vui lòng nhập chủ đề khiếu nại.');
            ticketTitleInput.focus();
            return;
        }

        if (!content) {
            alert('Vui lòng nhập nội dung chi tiết để PawPal hỗ trợ tốt nhất.');
            ticketContentInput.focus();
            return;
        }

        let contextData = {};

        if (type === 'service') {
            const bookingId = serviceBookingSelect.value;
            if (!bookingId) {
                alert('Vui lòng chọn ca dịch vụ cần phản ánh.');
                serviceBookingSelect.focus();
                return;
            }
            const selectedBooking = userBookings.find(b => String(b.id || b.code) === String(bookingId));
            contextData = {
                bookingId: bookingId,
                serviceName: selectedBooking?.service || selectedBooking?.serviceName || 'Dịch vụ PawPal',
                serviceType: selectedBooking?.serviceType || 'spa',
                petName: selectedBooking?.petName || selectedBooking?.petInfo?.petName || 'Bé cưng',
                petBreed: selectedBooking?.petBreed || selectedBooking?.petInfo?.breed || '',
                staffExecuted: selectedBooking?.staff || 'Kỹ thuật viên Chi nhánh',
                issueType: serviceIssueType.value,
                issueLabel: serviceIssueType.options[serviceIssueType.selectedIndex].text
            };
        } else if (type === 'order') {
            const orderId = orderSelect.value;
            if (!orderId) {
                alert('Vui lòng chọn đơn hàng cần phản ánh.');
                orderSelect.focus();
                return;
            }
            const selectedOrder = userOrders.find(o => String(o.id) === String(orderId));
            const firstProd = selectedOrder?.products?.[0];
            contextData = {
                orderId: orderId,
                productName: firstProd?.name || 'Sản phẩm PawPal Shop',
                productSku: firstProd?.sku || 'PROD-SKU',
                issueType: orderIssueType.value,
                issueLabel: orderIssueType.options[orderIssueType.selectedIndex].text,
                customerDemand: orderCustomerDemand.value,
                demandLabel: orderCustomerDemand.options[orderCustomerDemand.selectedIndex].text
            };
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Đang gửi...';

        try {
            const files = [];
            if (ticketFileInput && ticketFileInput.files.length > 0) {
                files.push(ticketFileInput.files[0].name);
            }

            let createdTicket = null;
            if (window.PawPalSupport && window.PawPalSupport.createTicket) {
                createdTicket = await window.PawPalSupport.createTicket(title, type, content, files, contextData);
            }

            saveComplaintToAdminSync(type, title, content, files, contextData, createdTicket);

            btnSubmit.textContent = 'Gửi thành công!';
            alert('Khiếu nại của bạn đã được tiếp nhận thành công!\nĐội ngũ CSKH PawPal sẽ xử lý và phản hồi trong thời gian sớm nhất.');
            window.location.hash = '#support';
        } catch (err) {
            console.error('Lỗi khi gửi khiếu nại:', err);
            alert('Có lỗi xảy ra khi gửi khiếu nại. Vui lòng thử lại!');
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Gửi yêu cầu';
        }
    });
}

// Tải dữ liệu thực thể người dùng (Bookings & Orders) từ Supabase Live Database
async function loadUserEntities() {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || { id: null, name: 'Khách hàng', phone: '0901234567' };
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    
    // 1. Tải Bookings từ Supabase
    try {
        if (db && currentUser.id) {
            const { data, error } = await db
                .from('appointment')
                .select(`
                    id,
                    appointment_code,
                    appointment_date,
                    appointment_time,
                    appointment_status,
                    service:service_id ( service_name, service_category ),
                    pet:pet_id ( pet_name, breed ),
                    staff:staff_id ( full_name )
                `)
                .eq('customer_id', currentUser.id)
                .order('appointment_date', { ascending: false });

            if (!error && data && data.length > 0) {
                userBookings = data.map(b => ({
                    id: b.appointment_code || b.id,
                    code: b.appointment_code || b.id,
                    service: b.service?.service_name || 'Dịch vụ PawPal',
                    serviceName: b.service?.service_name || 'Dịch vụ PawPal',
                    serviceType: b.service?.service_category || 'spa',
                    petName: b.pet?.pet_name || 'Bé cưng',
                    petBreed: b.pet?.breed || '',
                    date: b.appointment_date,
                    timeStart: b.appointment_time,
                    staff: b.staff?.full_name || 'Kỹ thuật viên PawPal',
                    status: b.appointment_status
                }));
            }
        }
    } catch (e) {
        console.warn('[SupportCreate] Lỗi tải lịch hẹn từ Supabase:', e);
    }

    if (!userBookings || userBookings.length === 0) {
        try {
            if (window.API && window.API.getUserBookings) {
                userBookings = await window.API.getUserBookings(currentUser.id);
            }
        } catch (e) {}
    }

    if (!userBookings || userBookings.length === 0) {
        try {
            userBookings = JSON.parse(localStorage.getItem('pawpal_bookings')) || [];
        } catch (e) {}
    }

    // Đổ dữ liệu vào select Lịch hẹn
    const serviceBookingSelect = document.getElementById('serviceBookingSelect');
    if (serviceBookingSelect) {
        if (userBookings.length === 0) {
            serviceBookingSelect.innerHTML = '<option value="">-- Chưa có ca dịch vụ nào --</option>';
        } else {
            serviceBookingSelect.innerHTML = '<option value="">-- Chọn ca dịch vụ cần khiếu nại --</option>' +
                userBookings.map(b => {
                    const pet = b.petName || b.petInfo?.petName || 'Bé cưng';
                    const srv = b.service || b.serviceName || 'Dịch vụ';
                    const date = b.date || '';
                    return `<option value="${b.id || b.code}">${b.id || b.code} - ${srv} (${pet}) ${date ? '• ' + date : ''}</option>`;
                }).join('');
        }
    }

    // 2. Tải Orders từ Supabase
    try {
        if (db && currentUser.id) {
            const { data, error } = await db
                .from('sales_order')
                .select(`
                    id,
                    order_code,
                    created_at,
                    order_status,
                    sales_order_detail (
                        quantity,
                        unit_price,
                        product:product_id ( name, sku )
                    )
                `)
                .eq('customer_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                userOrders = data.map(o => ({
                    id: o.order_code || o.id,
                    createdAt: o.created_at ? o.created_at.substring(0, 10) : '',
                    status: o.order_status,
                    products: (o.sales_order_detail || []).map(d => ({
                        id: d.product?.sku || 'P-01',
                        name: d.product?.name || 'Sản phẩm PawPal',
                        sku: d.product?.sku || 'SKU',
                        quantity: d.quantity || 1,
                        price: d.unit_price || 0
                    }))
                }));
            }
        }
    } catch (e) {
        console.warn('[SupportCreate] Lỗi tải đơn hàng từ Supabase:', e);
    }

    if (!userOrders || userOrders.length === 0) {
        try {
            if (window.API && window.API.getUserOrders) {
                userOrders = await window.API.getUserOrders(currentUser.id);
            }
        } catch (e) {}
    }

    if (!userOrders || userOrders.length === 0) {
        try {
            userOrders = JSON.parse(localStorage.getItem('pawpal_orders')) || [];
        } catch (e) {}
    }

    // Đổ dữ liệu vào select Đơn hàng
    const orderSelect = document.getElementById('orderSelect');
    if (orderSelect) {
        if (userOrders.length === 0) {
            orderSelect.innerHTML = '<option value="">-- Chưa có đơn hàng nào --</option>';
        } else {
            orderSelect.innerHTML = '<option value="">-- Chọn đơn hàng cần khiếu nại --</option>' +
                userOrders.map(o => {
                    const prodName = o.products?.[0]?.name || 'Sản phẩm';
                    return `<option value="${o.id}">${o.id} - ${prodName} (${o.createdAt || 'Gần đây'})</option>`;
                }).join('');
        }
    }
}

// Lưu khiếu nại vào kho dữ liệu đồng bộ Admin
function saveComplaintToAdminSync(type, title, content, files, context, createdTicket) {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || {
        name: 'Lê Lệ Quyên',
        phone: '0901234567'
    };

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const timeHeader = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    if (type === 'service') {
        const syncKey = 'pawpal_service_complaints';
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem(syncKey)) || [];
        } catch (e) {
            list = [];
        }

        const newId = createdTicket?.id 
            ? (createdTicket.id.startsWith('TK-') ? createdTicket.id : `TK-${createdTicket.id.substring(0, 8)}`) 
            : `TK-2026-${String(Math.floor(100 + Math.random() * 900))}`;
        const isUrgent = context.issueType === 'injury' || title.toLowerCase().includes('đau') || title.toLowerCase().includes('xước') || title.toLowerCase().includes('máu');

        const item = {
            id: newId,
            customerName: currentUser.name || 'Khách hàng PawPal',
            phone: currentUser.phone || '0901234567',
            petName: context.petName || 'Bé cưng',
            petBreed: context.petBreed || 'Thú cưng',
            petNotes: 'Gửi từ giao diện khách hàng',
            bookingId: context.bookingId || 'BKG-NEW',
            serviceType: context.serviceType || 'spa',
            serviceName: context.serviceName || 'Dịch vụ PawPal',
            staffExecuted: context.staffExecuted || 'Chi nhánh tiếp nhận',
            title: title,
            content: content,
            priority: isUrgent ? 'high' : 'medium',
            slaStatus: isUrgent ? 'URGENT' : 'NORMAL',
            slaRemainingText: isUrgent ? 'Còn 2 giờ' : 'Còn 4 giờ',
            staffAssigned: 'Chưa phân công',
            createdAt: dateStr,
            status: 'new',
            evidence: files && files.length > 0 ? files : ['minh-chung-khach-hang.jpg'],
            checkinHealth: 'Ghi nhận ban đầu: Khách phản ánh sau khi hoàn tất ca dịch vụ.',
            checkinPhotos: [],
            staffLogNote: 'Đang chờ quản lý ca đối soát và trích xuất camera theo quy trình.',
            timeline: [
                {
                    time: timeHeader,
                    author: `${currentUser.name || 'Khách hàng'} (Khách hàng)`,
                    title: 'Gửi khiếu nại qua Website',
                    desc: content,
                    isInternal: false
                }
            ]
        };

        list.unshift(item);
        localStorage.setItem(syncKey, JSON.stringify(list));
        console.log('[SupportSync] Đã lưu khiếu nại dịch vụ vào pawpal_service_complaints:', item);

    } else if (type === 'order') {
        const syncKey = 'pawpal_order_complaints';
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem(syncKey)) || [];
        } catch (e) {
            list = [];
        }

        const newId = createdTicket?.id 
            ? (createdTicket.id.startsWith('TK-') ? createdTicket.id : `TK-${createdTicket.id.substring(0, 8)}`) 
            : `TK-ORD-${String(Math.floor(100 + Math.random() * 900))}`;
        const item = {
            id: newId,
            customerName: currentUser.name || 'Khách hàng PawPal',
            phone: currentUser.phone || '0901234567',
            orderId: context.orderId || 'ORD-NEW',
            productName: context.productName || 'Sản phẩm mua sắm',
            productSku: context.productSku || 'SKU-01',
            issueType: context.issueType || 'wrong_item',
            customerDemand: context.demandLabel || 'Đổi sản phẩm mới nguyên vẹn',
            priority: context.issueType === 'damaged' ? 'high' : 'medium',
            slaStatus: 'NORMAL',
            slaRemainingText: 'Còn 4 giờ',
            staffAssigned: 'Chưa phân công',
            createdAt: dateStr,
            status: 'new',
            content: content,
            evidence: files && files.length > 0 ? files : ['minh-chung-don-hang.jpg'],
            warehousePhotos: [],
            carrier: 'Giao Hàng Nhanh (GHN)',
            trackingCode: 'GHN' + Math.floor(10000000 + Math.random() * 90000000) + 'VN',
            deliveryStatus: 'Giao thành công',
            timeline: [
                {
                    time: timeHeader,
                    author: `${currentUser.name || 'Khách hàng'} (Khách hàng)`,
                    title: 'Phản ánh sự cố đơn hàng',
                    desc: content,
                    isInternal: false
                }
            ]
        };

        list.unshift(item);
        localStorage.setItem(syncKey, JSON.stringify(list));
        console.log('[SupportSync] Đã lưu khiếu nại đơn hàng vào pawpal_order_complaints:', item);
    }
}

export const init = initSupportCreate;
