import { resolveAuthenticatedCustomerId } from './customer-identity.mjs';

function bookingMoveError(error) {
    const messages={booking_change_window_closed:'Lịch không còn trong thời gian hoặc số lần được tự đổi. Vui lòng liên hệ cửa hàng.',
        booking_move_status_not_allowed:'Lịch hẹn ở trạng thái hiện tại không cho phép tự đổi. Vui lòng liên hệ cửa hàng.',
        booking_move_limit_reached:'Lịch hẹn đã dùng hết 2 lần đổi trực tuyến. Vui lòng liên hệ cửa hàng.',
        booking_move_original_too_close:'Lịch hẹn hiện tại đã qua giờ hoặc còn dưới 2 tiếng. Vui lòng liên hệ cửa hàng để đổi.',
        booking_move_new_time_too_close:'Giờ mới phải cách hiện tại ít nhất 2 tiếng. Vui lòng chọn giờ khác.',
        booking_move_unchanged:'Gói dịch vụ và giờ hẹn chưa thay đổi. Vui lòng chọn lịch mới.',
        no_scheduled_staff:'Không có KTV đã được phân ca và còn trống cho khung giờ này. Vui lòng chọn giờ khác.',
        staff_not_eligible:'KTV phụ trách chưa đủ điều kiện nhận gói dịch vụ mới. Vui lòng liên hệ cửa hàng.',
        invalid_slot_day:'Vui lòng chọn ngày trong khoảng từ hôm nay đến 90 ngày tới.',
        booking_hours_unconfigured:'Cửa hàng chưa cấu hình giờ phục vụ. Vui lòng liên hệ cửa hàng.',
        outside_operating_hours:'Giờ mới nằm ngoài giờ phục vụ hoặc không đủ thời gian hoàn thành dịch vụ. Vui lòng chọn giờ khác.',
        booking_requires_staff_reconciliation:'Lịch có thanh toán, ưu đãi hoặc điều chỉnh cần đối soát. Vui lòng liên hệ cửa hàng để đổi lịch.',
        booking_quote_changed_reload_required:'Lịch hoặc bảng giá đã thay đổi. Vui lòng xem lại giá trước khi xác nhận.',
        service_change_not_supported:'Chỉ có thể đổi giữa các gói cùng loại dịch vụ. Vui lòng liên hệ cửa hàng nếu muốn đổi loại hình.',
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

export async function loadCustomerBookingMoveServices(client,user,booking){
    await resolveAuthenticatedCustomerId(client,user);
    const {data,error}=await client.rpc('own_booking_move_services',{p_id:booking._supabaseId});
    if(error)throw bookingMoveError(error);
    if(!Array.isArray(data?.services))throw new Error('Chưa tải được danh sách gói dịch vụ. Vui lòng thử lại.');
    return data;
}

export async function loadCustomerBookingMoveDaySlots(client,user,booking,day,serviceId){
    await resolveAuthenticatedCustomerId(client,user);
    const {data,error}=await client.rpc('own_booking_move_day_slots',{p_id:booking._supabaseId,p_day:day,p_service:serviceId||null});
    if(error)throw bookingMoveError(error);
    if(!Array.isArray(data?.slots))throw new Error('Chưa tải được khung giờ mới. Vui lòng thử lại.');
    return {...data,slots:data.slots.map(quote=>({...quote,serviceId:serviceId||null}))};
}

export async function quoteCustomerBookingMove(client,user,booking,start,end,serviceId=null) {
    await resolveAuthenticatedCustomerId(client,user);
    const {data,error}=await client.rpc('quote_own_booking_service',{p_id:booking._supabaseId,p_start:start,p_end:end||null,p_service:serviceId});
    if(error)throw bookingMoveError(error);
    if(!data?.version||data.id!==booking._supabaseId||!Number.isFinite(Number(data.total)))throw new Error('Chưa nhận được giá mới. Vui lòng thử lại.');
    return {...data,serviceId};
}

export async function moveCustomerBooking(client,user,booking,quote,reason,requestId,end) {
    await resolveAuthenticatedCustomerId(client,user);
    if(!quote?.version||!String(reason||'').trim())throw new Error('Vui lòng xem giá mới và chọn lý do.');
    const {data,error}=await client.rpc('reschedule_own_booking_service',{p_request_id:requestId,p_id:booking._supabaseId,p_start:quote.start_at,p_expected_quote:quote.version,p_reason:reason.trim(),p_end:end||null,p_service:quote.serviceId||null});
    if(error)throw bookingMoveError(error);
    if(data!==booking._supabaseId)throw new Error('Chưa nhận được xác nhận đổi lịch.');
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
