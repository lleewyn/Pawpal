import { resolveAuthenticatedCustomerId } from './customer-identity.mjs';

function bookingMoveError(error) {
    const messages={booking_change_window_closed:'Lịch không còn trong thời gian hoặc số lần được tự đổi. Vui lòng liên hệ cửa hàng.',
        booking_requires_staff_reconciliation:'Lịch có thanh toán, ưu đãi hoặc điều chỉnh cần đối soát. Vui lòng liên hệ cửa hàng để đổi lịch.',
        booking_quote_changed_reload_required:'Lịch hoặc bảng giá đã thay đổi. Vui lòng xem lại giá trước khi xác nhận.',
        staff_schedule_conflict:'Nhân viên đang có lịch hoặc không khả dụng ở thời gian này. Vui lòng chọn thời gian khác.',
        hotel_room_conflict:'Phòng đã có lịch ở thời gian này. Vui lòng chọn thời gian khác.',
        ambiguous_service_price:'Chưa xác định được bảng giá phù hợp. Vui lòng liên hệ cửa hàng.',
        ambiguous_taxi_price:'Chưa xác định được giá xe cho thời gian mới. Vui lòng liên hệ cửa hàng.',
        service_species_not_supported:'Gói dịch vụ chưa được cấu hình hỗ trợ loài của bé. Vui lòng liên hệ cửa hàng.',
        pet_weight_required:'Cần cập nhật cân nặng của bé trước khi xem giá mới.',
        active_pet_required:'Hồ sơ bé đang ngừng sử dụng. Vui lòng kiểm tra hồ sơ trước khi đổi lịch.',
        booking_items_require_staff:'Ca có nội dung cần nhân viên kiểm tra trước khi đổi lịch.',
        active_service_required:'Dịch vụ hoặc phần thêm hiện không còn mở. Vui lòng liên hệ cửa hàng.',
        hotel_room_unavailable:'Phòng hiện không còn khả dụng. Vui lòng liên hệ cửa hàng.',
        hotel_requires_staff:'Lịch lưu trú cần nhân viên kiểm tra trước khi đổi.',taxi_requires_staff:'Lịch xe cần nhân viên kiểm tra trước khi đổi.'};
    return new Error(messages[error?.message] || 'Không thể đổi lịch. Vui lòng tải lại hoặc liên hệ cửa hàng.');
}

export async function quoteCustomerBookingMove(client,user,booking,start,end) {
    await resolveAuthenticatedCustomerId(client,user);
    if(!booking?._supabaseId || !start)throw new Error('Vui lòng chọn thời gian mới.');
    let res = null;
    if (end) {
        res = await client.rpc('quote_own_booking_move',{p_id:booking._supabaseId,p_start:start,p_end:end});
        if (res.error && (res.error.code === 'PGRST202' || String(res.error.message || '').includes('p_end') || String(res.error.message || '').includes('Could not find the function'))) {
            res = null;
        }
    }
    if (!res) {
        res = await client.rpc('quote_own_booking_move',{p_id:booking._supabaseId,p_start:start});
    }
    const {data,error}=res;
    if(error)throw bookingMoveError(error);
    if(!data?.version || data.id!==booking._supabaseId || !Number.isFinite(Number(data.total)))throw new Error('Chưa nhận được giá mới. Vui lòng thử lại.');
    if (end && data.end_at !== end) {
        data.end_at = end;
        if (data.logistics?.kind === 'pet_hotel' && data.logistics.daily_price) {
            const startMs = new Date(data.start_at).getTime();
            const endMs = new Date(end).getTime();
            const days = Math.max(1, Math.ceil((endMs - startMs) / 86400000));
            data.total = days * Number(data.logistics.daily_price);
            data.hotel_days = days;
        }
    }
    return data;
}

export async function moveCustomerBooking(client,user,booking,quote,reason,requestId,end) {
    await resolveAuthenticatedCustomerId(client,user);
    if(!quote?.version || quote.id!==booking?._supabaseId || !requestId || !String(reason || '').trim())throw new Error('Vui lòng xem giá mới và nhập lý do đổi lịch.');
    const targetEnd = end;
    let res = null;
    if (targetEnd) {
        res = await client.rpc('reschedule_own_service_booking',{
            p_request_id:requestId,p_id:booking._supabaseId,p_start:quote.start_at,p_expected_quote:quote.version,p_reason:reason.trim(),p_end:targetEnd
        });
        if (res.error && (res.error.code === 'PGRST202' || String(res.error.message || '').includes('p_end') || String(res.error.message || '').includes('Could not find the function'))) {
            res = null;
        }
    }
    if (!res) {
        res = await client.rpc('reschedule_own_service_booking',{
            p_request_id:requestId,p_id:booking._supabaseId,p_start:quote.start_at,p_expected_quote:quote.version,p_reason:reason.trim()
        });
    }
    const {data,error}=res;
    if(error)throw bookingMoveError(error);
    if(data!==booking._supabaseId)throw new Error('Chưa nhận được xác nhận đổi lịch. Vui lòng tải lại.');
    if (targetEnd) {
        try {
            await client.from('appointment').update({ scheduled_end_at: targetEnd }).eq('id', booking._supabaseId);
            await client.from('hotel_booking').update({ check_out_at: targetEnd }).eq('appointment_id', booking._supabaseId);
        } catch (_) {}
    }
    return data;
}

export async function cancelCustomerBooking(client, user, booking, reason, requestId) {
    await resolveAuthenticatedCustomerId(client, user);
    if (!booking?._supabaseId || !booking.updatedAt || !requestId) throw new Error('Vui lòng tải lại lịch hẹn trước khi hủy.');
    if (!String(reason || '').trim()) throw new Error('Vui lòng nhập lý do hủy lịch.');
    const status = String(booking.bookingStatus || booking.status || '').toLowerCase().trim();
    if (['da_check_in', 'checked_in', 'accepted', 'da_tiep_nhan'].includes(status)) {
        throw new Error('Lịch hẹn đã được tiếp nhận tại cửa hàng, không thể thực hiện hủy.');
    }
    if (['dang_thuc_hien', 'in_progress', 'in-progress'].includes(status)) {
        throw new Error('Lịch hẹn đang thực hiện dịch vụ, không thể hủy.');
    }
    if (['da_hoan_tat', 'completed', 'done'].includes(status)) {
        throw new Error('Lịch hẹn đã hoàn thành, không thể hủy.');
    }
    try {
        const { data: fresh } = await client.from('appointment')
            .select('appointment_status')
            .eq('id', booking._supabaseId)
            .single();
        if (fresh) {
            const cur = String(fresh.appointment_status).toLowerCase().trim();
            if (['da_check_in', 'checked_in', 'accepted', 'da_tiep_nhan'].includes(cur)) {
                throw new Error('Lịch hẹn đã được tiếp nhận tại cửa hàng, không thể thực hiện hủy.');
            }
            if (['dang_thuc_hien', 'in_progress', 'in-progress'].includes(cur)) {
                throw new Error('Lịch hẹn đang thực hiện dịch vụ, không thể hủy.');
            }
            if (['da_hoan_tat', 'completed', 'done'].includes(cur)) {
                throw new Error('Lịch hẹn đã hoàn thành, không thể hủy.');
            }
        }
    } catch (checkErr) {
        if (checkErr.message?.includes('không thể thực hiện hủy') || checkErr.message?.includes('không thể hủy')) {
            throw checkErr;
        }
    }
    const {data,error}=await client.rpc('cancel_own_service_booking',{
        p_request_id:requestId,p_id:booking._supabaseId,p_expected_updated_at:booking.updatedAt,p_reason:reason.trim()
    });
    if(error){
        let customMsg = null;
        try {
            const { data: fresh } = await client.from('appointment').select('appointment_status').eq('id', booking._supabaseId).single();
            if (fresh && ['da_check_in', 'checked_in', 'accepted', 'da_tiep_nhan'].includes(String(fresh.appointment_status).toLowerCase().trim())) {
                customMsg = 'Lịch hẹn đã được tiếp nhận tại cửa hàng, không thể thực hiện hủy.';
            }
        } catch (_) {}
        if (customMsg) throw new Error(customMsg);
        const messages={
            booking_changed_reload_required:'Lịch hẹn đã thay đổi. Vui lòng tải lại trước khi hủy.',
            booking_cancellation_window_closed:'Lịch hẹn không còn cho phép tự hủy. Vui lòng liên hệ cửa hàng.',
            booking_already_received:'Lịch hẹn đã được tiếp nhận tại cửa hàng, không thể thực hiện hủy.',
            booking_in_progress_or_completed:'Lịch hẹn đang thực hiện hoặc đã hoàn thành, không thể hủy.',
            paid_booking_requires_refund_workflow:'Lịch đã có khoản thu. Vui lòng liên hệ cửa hàng để xử lý hủy và hoàn tiền.'
        };
        throw new Error(messages[error.message] || 'Không thể hủy lịch hẹn. Vui lòng tải lại và thử lại.');
    }
    if(data!==booking._supabaseId)throw new Error('Chưa nhận được xác nhận hủy lịch. Vui lòng tải lại.');
    try {
        const localBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const idx = localBookings.findIndex(b => String(b.id || b._id) === String(booking.id || booking._supabaseId));
        if (idx !== -1) {
            localBookings[idx].status = 'cancelled';
            localStorage.setItem('pawpal_bookings', JSON.stringify(localBookings));
        }
    } catch (_) {}
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
