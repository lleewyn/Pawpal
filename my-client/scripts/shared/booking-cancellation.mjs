import {mountCancellationReasons} from './order-cancellation.mjs';

export const bookingCancellationReasons = Object.freeze([
    'Bận việc đột xuất / Thay đổi lịch trình',
    'Gặp vấn đề về sức khỏe',
    'Đặt nhầm thời gian hoặc địa điểm',
    'Đã tìm được giải pháp/dịch vụ khác'
]);

export function mountBookingCancellationReasons(container, id = 'bookingCancelReason') {
    return mountCancellationReasons(container, id, {
        reasons: bookingCancellationReasons,
        otherLabel: 'Lý do cá nhân khác',
        maxLength: 2000
    });
}
