import { resolveAuthenticatedCustomerId } from './customer-identity.mjs';

export async function updateCustomerBooking(client, user, booking, changes) {
    const customerId = await resolveAuthenticatedCustomerId(client, user);
    if (!booking?._supabaseId || !booking.bookingStatus) throw new Error('Vui lòng tải lại lịch hẹn trước khi thay đổi.');
    const allowed = ['PENDING', 'CONFIRMED', 'CHO_XAC_NHAN', 'DA_XAC_NHAN'];
    if (!allowed.includes(String(booking.bookingStatus).toUpperCase())) throw new Error('Lịch hẹn không còn cho phép thay đổi.');
    const result = await client.from('appointment').update(changes)
        .eq('id', booking._supabaseId).eq('customer_id', customerId)
        .eq('appointment_status', booking.bookingStatus).select('id').single();
    if (result.error || !result.data?.id) throw new Error('Không thể cập nhật lịch hẹn. Vui lòng tải lại và thử lại.');
    return result.data;
}
