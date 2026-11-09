const fs = require('node:fs');
const assert = require('node:assert/strict');
const { connect } = require('../database/v1/service_import_connection.cjs');

const TARGET_URL = 'https://pawpalgr3-5bph12hep-llwyns-projects.vercel.app';
const CUSTOMER_PHONE = '0834562948';
const ORDER_ID = '39a8a012-3774-4fe3-afb9-cac63a5c5d81';

(async () => {
    const db = await connect();
    try {
        const reviewQuery = await db.query(`
            SELECT r.id, r.rating, r.review_content, r.review_status, r.created_at,
                   m.id as media_id, m.media_asset_id, m.image_url,
                   a.provider, a.size_bytes, a.mime_type, a.sha256, a.mongo_file_id
            FROM review r
            JOIN sales_order_detail d ON d.id = r.sales_order_detail_id
            LEFT JOIN review_media m ON m.review_id = r.id
            LEFT JOIN media_asset a ON a.id = m.media_asset_id
            WHERE d.order_id = $1
        `, [ORDER_ID]);

        console.log('Kết quả đối soát Review:', JSON.stringify(reviewQuery.rows, null, 2));
        assert.ok(reviewQuery.rows.length > 0, 'Phải tìm thấy bản ghi review vừa tạo');

        const row = reviewQuery.rows[0];
        const createdReviewId = row.id;
        const createdMediaAssetId = row.media_asset_id;

        assert.equal(row.rating, 5, 'Rating phải là 5 sao');
        assert.equal(row.review_status, 'pending', 'Trạng thái ban đầu phải là pending (Chờ duyệt)');
        assert.equal(row.provider, 'mongodb_gridfs', 'Lưu trữ media phải là mongodb_gridfs');
        assert.ok(row.size_bytes > 0, 'Dung lượng byte phải lớn hơn 0');

        console.log('\n=== TỔNG KẾT NGHIỆM THU ĐÁNH GIÁ THÀNH CÔNG ===');
        console.log('Review ID       : ' + createdReviewId);
        console.log('Review Status   : ' + row.review_status + ' (Chờ duyệt)');
        console.log('Media Asset ID  : ' + createdMediaAssetId);
        console.log('Storage Provider: ' + row.provider);
        console.log('File Size       : ' + row.size_bytes + ' bytes');
        console.log('SHA256          : ' + row.sha256);
        console.log('Mongo File ID   : ' + row.mongo_file_id);

        const reportContent = `BIÊN BẢN NGHIỆM THU ĐÁNH GIÁ SẢN PHẨM CÓ ẢNH THẬT BẰNG TÀI KHOẢN KHÁCH HÀNG (LIVE PREVIEW)
Ngày thực hiện : ${new Date().toISOString()}
Môi trường     : Vercel Preview (${TARGET_URL})
Khách hàng     : Nguyễn Lê Thi (SĐT: ${CUSTOMER_PHONE}, ID: d0000000-0000-0000-0000-000000000006)
Đơn hàng       : ORD-20260930-506558 (ID: ${ORDER_ID})
Sản phẩm       : Thức ăn hạt dinh dưỡng cho mèo
Mức đánh giá   : 5/5 sao
Nội dung       : ${row.review_content}
Trạng thái     : ${row.review_status} (Chờ duyệt)
Ảnh đính kèm   : assets/images/publics/dogcute8.jpg (${row.size_bytes} bytes)
Review ID      : ${createdReviewId}
Media Asset ID : ${createdMediaAssetId}
Storage        : ${row.provider}
Mongo File ID  : ${row.mongo_file_id}
SHA256 Hash    : ${row.sha256}
Ảnh chụp màn hình: docs/verification/sync/customer-review-submitted-live.png
Kết luận       : ĐẠT 100% tiêu chí nghiệm thu Giai đoạn 5 (Ảnh đánh giá của khách hàng thật).
`;
        fs.writeFileSync('docs/media/phase5-review-customer-live.txt', reportContent, 'utf8');
        console.log('Đã lưu biên bản: docs/media/phase5-review-customer-live.txt');

    } finally {
        await db.end();
    }
})().catch(console.error);
