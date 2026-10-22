import { resolveAuthenticatedCustomerId } from './customer-identity.mjs';

export async function cancelCustomerBooking(client, user, booking, reason, requestId) {
    await resolveAuthenticatedCustomerId(client, user);
    if (!booking?._supabaseId || !booking.updatedAt || !requestId) throw new Error('Vui lòng tải lại lịch hẹn trước khi hủy.');
    if (!String(reason || '').trim()) throw new Error('Vui lòng nhập lý do hủy lịch.');
    const {data,error}=await client.rpc('cancel_own_service_booking',{
        p_request_id:requestId,p_id:booking._supabaseId,p_expected_updated_at:booking.updatedAt,p_reason:reason.trim()
    });
    if(error){
        const messages={booking_changed_reload_required:'Lịch hẹn đã thay đổi. Vui lòng tải lại trước khi hủy.',
            booking_cancellation_window_closed:'Lịch hẹn không còn cho phép tự hủy. Vui lòng liên hệ cửa hàng.',
            paid_booking_requires_refund_workflow:'Lịch đã có khoản thu. Vui lòng liên hệ cửa hàng để xử lý hủy và hoàn tiền.'};
        throw new Error(messages[error.message] || 'Không thể hủy lịch hẹn. Vui lòng tải lại và thử lại.');
    }
    if(data!==booking._supabaseId)throw new Error('Chưa nhận được xác nhận hủy lịch. Vui lòng tải lại.');
    return data;
}

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
