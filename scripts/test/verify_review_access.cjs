const fs = require('node:fs');
const assert = require('node:assert/strict');
const { settings } = require('../database/v1/cloud_connection.cjs');
const { createClient } = require('@supabase/supabase-js');

const TARGET_URL = 'https://pawpalgr3-5bph12hep-llwyns-projects.vercel.app';
const ASSET_ID = '8c5f54e0-ab66-4915-9408-03af3abfed88';
const REVIEW_ID = '62e676a2-3a6f-4f32-a12a-349775c47a56';

(async () => {
    const { config } = settings();
    const admin = createClient(config.DESTINATION_SUPABASE_URL, config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY);
    const anon = createClient(config.DESTINATION_SUPABASE_URL, config.DESTINATION_SUPABASE_ANON_KEY);
    const bypassCookie = JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-evidence-browser.private.json'));

    const baseHeaders = { Cookie: '_vercel_jwt=' + bypassCookie.value };

    console.log('=== KIỂM TRA PHÂN QUYỀN VÀ BẢO MẬT ẢNH ĐÁNH GIÁ (ACCESS CONTROL) ===');

    // 1. Đặt lại trạng thái pending ban đầu
    await admin.from('review').update({ review_status: 'pending' }).eq('id', REVIEW_ID);
    console.log('0. Đã đặt trạng thái review về pending.');

    // 2. Khách hàng đăng nhập lấy access token
    const customerLogin = await anon.auth.signInWithPassword({
        email: 'customer-cccd1bba-3a48-4c82-9ec9-0435fadd8222@demo.pawpal.invalid',
        password: 'Customer@Pawpal2026!'
    });
    assert.equal(customerLogin.error, null, 'Customer login must succeed');
    const customerToken = customerLogin.data.session.access_token;
    console.log('1. Khách hàng đăng nhập lấy Bearer token thành công.');

    // 3. Tải ảnh bằng Bearer token của chính chủ (pending review)
    const ownerRes = await fetch(`${TARGET_URL}/api/media?id=${ASSET_ID}`, {
        headers: { ...baseHeaders, Authorization: `Bearer ${customerToken}` }
    });
    console.log('2. Chủ sở hữu tải ảnh khi đang Chờ duyệt (pending):', ownerRes.status);
    assert.equal(ownerRes.status, 200, 'Chủ sở hữu phải tải được ảnh của chính mình');
    const bytes = await ownerRes.arrayBuffer();
    assert.equal(bytes.byteLength, 16768, 'Dung lượng byte tải về phải khớp đúng 16768 bytes');
    console.log('   Kích thước tải về:', bytes.byteLength, 'bytes khớp 100%!');

    // 4. Truy cập anonymous không có token (pending review)
    const anonRes = await fetch(`${TARGET_URL}/api/media?id=${ASSET_ID}`, {
        headers: baseHeaders
    });
    console.log('3. Khách vãng lai (không có token) tải ảnh khi đang Chờ duyệt:', anonRes.status);
    assert.ok([401, 403, 404].includes(anonRes.status), 'Khách vãng lai không được phép xem ảnh chờ duyệt');
    console.log('   Bảo mật đạt: Anonymous bị chặn thành công (' + anonRes.status + ')!');

    // 5. Admin duyệt công bố (published)
    console.log('\n4. Admin duyệt công bố bài đánh giá (status -> published)...');
    const approve = await admin.from('review').update({ review_status: 'published' }).eq('id', REVIEW_ID);
    assert.equal(approve.error, null);

    // 6. Kiểm tra khách vãng lai (anonymous) tải ảnh sau khi công bố
    const anonPublicRes = await fetch(`${TARGET_URL}/api/media?id=${ASSET_ID}`, {
        headers: baseHeaders
    });
    console.log('5. Khách vãng lai tải ảnh sau khi công bố (published):', anonPublicRes.status);
    assert.equal(anonPublicRes.status, 200, 'Sau khi công bố, ảnh mở quyền đọc public');
    const publicBytes = await anonPublicRes.arrayBuffer();
    assert.equal(publicBytes.byteLength, 16768);
    console.log('   Công bố đạt: Public truy cập thành công 200 OK (' + publicBytes.byteLength + ' bytes)!');

    // 7. Admin ẩn bài đánh giá (hidden)
    console.log('\n6. Admin ẩn bài đánh giá (status -> hidden)...');
    const hide = await admin.from('review').update({ review_status: 'hidden' }).eq('id', REVIEW_ID);
    assert.equal(hide.error, null);

    // 8. Kiểm tra khách vãng lai sau khi bị ẩn
    const anonHiddenRes = await fetch(`${TARGET_URL}/api/media?id=${ASSET_ID}`, {
        headers: baseHeaders
    });
    console.log('7. Khách vãng lai tải ảnh sau khi bài bị ẩn (hidden):', anonHiddenRes.status);
    assert.ok([401, 403, 404].includes(anonHiddenRes.status), 'Khi bị ẩn, thu hồi quyền đọc public');
    console.log('   Thu hồi đạt: Bị chặn thành công sau khi ẩn (' + anonHiddenRes.status + ')!');

    // 9. Đưa về trạng thái published chuẩn nghiệp vụ
    await admin.from('review').update({ review_status: 'published' }).eq('id', REVIEW_ID);
    console.log('\n8. Đã đặt lại trạng thái published cho bài đánh giá chuẩn.');

    console.log('\n=== TẤT CẢ KIỂM TRA PHÂN QUYỀN VÀ TRẠNG THÁI REVIEW PASS 100% ===');
})().catch(console.error);
