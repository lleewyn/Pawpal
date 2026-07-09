const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ralnsebcwdqelikykxic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbG5zZWJjd2RxZWxpa3lreGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjU4ODIsImV4cCI6MjA5ODUwMTg4Mn0.mWT7MhkNCA_ICJr2-ggapFrE4Tknpg_ycDTjjRdQDT4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestBookings() {
    const phone = '0834562948';
    
    // 1. Lấy thông tin customer
    let { data: customers } = await supabase.from('user_profile').select('id').eq('phone', phone);
    if (!customers || customers.length === 0) {
        console.error('Không tìm thấy khách hàng với SĐT:', phone);
        return;
    }
    const customerId = customers[0].id;

    // 2. Lấy danh sách thú cưng của khách
    let { data: pets } = await supabase.from('pet_profile').select('id, species').eq('customer_id', customerId);
    if (!pets || pets.length === 0) {
        console.error('Khách hàng này chưa có thú cưng nào trên hệ thống.');
        return;
    }
    const pet1 = pets[0];
    const pet2 = pets.length > 1 ? pets[1] : pets[0];

    // 3. Lấy một vài dịch vụ
    let { data: services } = await supabase.from('service').select('id, service_name').limit(3);
    if (!services || services.length < 3) {
        console.error('Không đủ dịch vụ để tạo test');
        return;
    }

    // 4. Tạo các lịch hẹn (PENDING, CONFIRMED)
    const newAppointments = [
        {
            customer_id: customerId,
            pet_id: pet1.id,
            service_id: services[0].id,
            appointment_date: '2026-08-10',
            appointment_time: '09:00:00',
            appointment_status: 'PENDING',
            total_price: 150000,
            appointment_code: `APP-TEST-${Date.now()}-1`
        },
        {
            customer_id: customerId,
            pet_id: pet2.id,
            service_id: services[1].id,
            appointment_date: '2026-08-12',
            appointment_time: '14:30:00',
            appointment_status: 'CONFIRMED',
            total_price: 250000,
            appointment_code: `APP-TEST-${Date.now()}-2`
        },
        {
            customer_id: customerId,
            pet_id: pet1.id,
            service_id: services[2].id,
            appointment_date: '2026-08-15',
            appointment_time: '10:00:00',
            appointment_status: 'PENDING',
            total_price: 450000,
            appointment_code: `APP-TEST-${Date.now()}-3`
        }
    ];

    const { data, error } = await supabase.from('appointment').insert(newAppointments).select();

    if (error) {
        console.error('Lỗi khi thêm lịch hẹn:', error);
    } else {
        console.log('✅ Đã thêm thành công 3 lịch hẹn test cho SĐT', phone);
        console.log(data.map(d => `${d.appointment_date} ${d.appointment_time} - Trạng thái: ${d.appointment_status}`));
    }
}

addTestBookings();
