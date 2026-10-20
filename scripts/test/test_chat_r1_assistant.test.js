const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const { dbTools } = require('../api/chat.js');

test('R1 - GĐ-04: get_services_price trả về dữ liệu bảng giá theo khoảng cân nặng', async () => {
    const res = await dbTools.get_services_price();
    assert.ok(res, 'Phải có kết quả trả về');
    assert.ok(res.context, 'Phải có thuộc tính context');
    assert.ok(res.context.includes('Dữ liệu bảng giá hiện hành'), 'Nội dung bảng giá hiện hành');
    assert.ok(res.context.includes('kg'), 'Bảng giá có chứa khoảng cân nặng kg');
    assert.ok(res.context.includes('đ'), 'Bảng giá có chứa đơn vị tiền tệ');
});

test('R1 - GĐ-04: search_products_public tìm kiếm sản phẩm đang bán kèm giá niêm yết', async () => {
    // 1. Tìm sản phẩm có thực trong shop (ví dụ: 'Pate' hoặc 'nước')
    const res = await dbTools.search_products_public('Pate');
    assert.ok(res, 'Phải có kết quả trả về');
    if (res.products) {
        assert.ok(Array.isArray(res.products), 'products phải là mảng');
        assert.ok(res.products.length > 0, 'Tìm thấy ít nhất 1 sản phẩm');
        const first = res.products[0];
        assert.ok(first.name, 'Sản phẩm có tên');
        assert.ok(first.price, 'Sản phẩm có giá');
    } else {
        assert.ok(res.message, 'Có thông báo phản hồi');
    }

    // 2. Tìm từ khóa không tồn tại
    const notFound = await dbTools.search_products_public('san_pham_khong_he_ton_tai_xyz');
    assert.ok(notFound.message, 'Trả về thông báo không tìm thấy');
});

test('R1 - GĐ-04: get_public_vouchers trả về voucher khuyến mãi còn hạn', async () => {
    const res = await dbTools.get_public_vouchers();
    assert.ok(res, 'Phải có kết quả trả về');
    if (res.vouchers) {
        assert.ok(Array.isArray(res.vouchers));
        if (res.vouchers.length > 0) {
            const v = res.vouchers[0];
            assert.ok(v.code, 'Voucher có mã code');
            assert.ok(v.discount, 'Voucher có mức giảm');
        }
    } else {
        assert.ok(res.message, 'Có thông điệp khi chưa có voucher mới');
    }
});

test('R1 - GĐ-05: get_user_orders và get_user_bookings từ chối khi không có userId', async () => {
    const orderRes = await dbTools.get_user_orders(null);
    assert.ok(orderRes.error, 'Từ chối khách chưa đăng nhập xem đơn hàng');

    const bookingRes = await dbTools.get_user_bookings(null);
    assert.ok(bookingRes.error, 'Từ chối khách chưa đăng nhập xem lịch hẹn');

    const petRes = await dbTools.get_pet_profile(null);
    assert.ok(petRes.error, 'Từ chối khách chưa đăng nhập xem hồ sơ thú cưng');
});
