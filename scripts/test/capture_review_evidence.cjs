const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    console.log('Khởi chạy trình duyệt headless để chụp ảnh minh chứng có lọc phân loại...');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });

    try {
        const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });

        // Tải CSS và JS dùng chung
        const adminCss = fs.readFileSync('pages/admin/admin.css', 'utf8');
        const adminShellCss = fs.readFileSync('pages/admin/admin-shell-v7.css', 'utf8');
        const reviewInsightsJs = fs.readFileSync('scripts/shared/review-insights.js', 'utf8');

        // =========================================================================
        // 1. CHỤP MINH CHỨNG: Modal Quản lý đánh giá sản phẩm (Admin)
        // =========================================================================
        console.log('1. Đang chụp Modal Đánh giá sản phẩm (Admin)...');
        const productModalHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <style>
        ${adminCss}
        ${adminShellCss}
        body { background: #F8FAF9; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .admin-modal-overlay { display: flex; position: static; background: transparent; }
        .admin-modal-card { width: 780px; margin: 0 auto; box-shadow: 0 14px 40px rgba(35, 107, 72, 0.12); }
    </style>
</head>
<body>
    <div class="admin-modal-overlay active" id="modalProductReviews">
        <div class="admin-modal-card">
            <div class="modal-header-clean" style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 12px;">
                <div class="modal-title-clean" id="productReviewsModalTitle" style="font-size: 18px; font-weight: 700; color: #236B48;">Đánh giá sản phẩm · Pate Mèo Whiskas Vị Cá Thu 85g</div>
                <button type="button" class="modal-btn-close-text" style="background: none; border: none; color: #4F7A65; font-size: 13px; font-weight: 600; cursor: pointer;">Đóng</button>
            </div>

            <div class="modal-body-clean" style="padding: 12px 24px 20px;">
                <!-- TỔNG QUAN ĐIỂM ĐÁNH GIÁ -->
                <div class="reviews-summary-bar" style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid #ECF2EE;">
                    <div style="display: flex; align-items: baseline; gap: 10px;">
                        <span id="prodReviewsScoreBig" style="font-size:26px;font-weight:700;color:#236B48;line-height:1">4.8/5</span>
                        <span style="font-weight:600;color:#203A2C;font-size:14px" id="prodReviewsScoreDesc">Điểm đánh giá</span>
                        <span style="font-size:12.5px;color:#4F7A65" id="prodReviewsCountTotal">24 nhận xét</span>
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="prodReviewsStarFilterRow">
                        <button type="button" class="admin-btn" style="background:#DCEEE2;color:#165335;border:none;padding:4px 10px;border-radius:9px;font-size:12px;font-weight:600;">Tất cả</button>
                        <button type="button" class="admin-btn" style="background:transparent;color:#4F7A65;border:none;padding:4px 10px;border-radius:9px;font-size:12px;">5 điểm</button>
                        <button type="button" class="admin-btn" style="background:transparent;color:#4F7A65;border:none;padding:4px 10px;border-radius:9px;font-size:12px;">4 điểm</button>
                        <button type="button" class="admin-btn" style="background:transparent;color:#4F7A65;border:none;padding:4px 10px;border-radius:9px;font-size:12px;">Có ảnh</button>
                    </div>
                </div>

                <!-- KHỐI TỔNG HỢP VÀ KẾT LUẬN CHẤT LƯỢNG SẢN PHẨM -->
                <div id="productReviewInsightsContainer"></div>

                <!-- DANH SÁCH NHẬN XÉT -->
                <div class="product-reviews-list-container" id="productReviewsListContainer" style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="padding: 12px 0; border-bottom: 1px solid #ECF2EE;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <strong style="color: #203A2C;">Nguyễn Hoàng Kim · 5/5 ⭐</strong>
                            <span style="color: #4F7A65; font-size: 12px;">12/11/2026 · Gói 85g</span>
                        </div>
                        <p style="margin: 0; font-size: 13.5px; color: #203A2C;">Bé mèo nhà mình kén ăn mà loại này hít một cái là ăn sạch đĩa luôn. Đóng gói rất kỹ, hạn sử dụng còn xa.</p>
                    </div>
                    <div style="padding: 12px 0; border-bottom: 1px solid #ECF2EE;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <strong style="color: #203A2C;">Trần Minh Tuấn · 4/5 ⭐</strong>
                            <span style="color: #4F7A65; font-size: 12px;">10/11/2026 · Thùng 24 gói</span>
                        </div>
                        <p style="margin: 0; font-size: 13.5px; color: #203A2C;">Chất lượng pate ngon, giao nhanh. Có một gói hơi bị móp góc xíu nhưng không ảnh hưởng bên trong.</p>
                    </div>
                </div>
            </div>

            <div class="modal-footer-clean" style="display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; border-top: 1px solid #ECF2EE;">
                <button type="button" class="admin-btn" style="background: #F4FAF6; border: 1px solid #C3DEC7; color: #236B48; padding: 8px 16px; border-radius: 9px; font-weight: 600; cursor: pointer;">Đóng</button>
                <button type="button" class="admin-btn" style="background: #236B48; color: #FFFFFF; border: none; padding: 8px 16px; border-radius: 9px; font-weight: 600; cursor: pointer;">Xem trên gian hàng trực tuyến</button>
            </div>
        </div>
    </div>
    <script>${reviewInsightsJs}</script>
    <script>
        window.ReviewInsights.renderInsights({
            container: document.getElementById('productReviewInsightsContainer'),
            reviews: [
                { rating: 5, content: 'Bé mèo nhà mình kén ăn mà loại này hít một cái là ăn sạch đĩa luôn. Đóng gói rất kỹ, hạn sử dụng còn xa.', hasMedia: true },
                { rating: 5, content: 'Giao nhanh, chính hãng, giá tốt khi áp mã giảm giá.', hasMedia: true },
                { rating: 4, content: 'Chất lượng pate ngon, giao nhanh. Có một gói hơi bị móp góc xíu nhưng không ảnh hưởng bên trong.' },
                { rating: 5, content: 'Pate thơm, nhiều thịt cá thật, mèo con ăn rất mê.' }
            ],
            itemName: 'Pate Mèo Whiskas Vị Cá Thu 85g',
            itemType: 'product',
            itemId: 'prod-001'
        });
    </script>
</body>
</html>
        `;
        await page.setContent(productModalHtml, { waitUntil: 'load' });
        await page.waitForTimeout(300);
        await page.locator('#modalProductReviews .admin-modal-card').screenshot({
            path: 'artifacts/admin-product-review-insights.png'
        });

        // =========================================================================
        // 2. CHỤP MINH CHỨNG: Subtab Đánh giá dịch vụ khi lọc gói (Admin)
        // =========================================================================
        console.log('2. Đang chụp Subtab Đánh giá dịch vụ (Admin)...');
        const serviceAdminHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <style>
        ${adminCss}
        ${adminShellCss}
        body { background: #F8FAF9; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .service-master-card { background: rgba(255, 255, 255, 0.70); backdrop-filter: blur(10px); border-radius: 9px; border: 1px solid #ECF2EE; padding: 20px; box-shadow: 0 10px 30px rgba(35, 107, 72, 0.08); }
    </style>
</head>
<body>
    <div style="max-width: 1100px; margin: 0 auto;">
        <!-- BANNER ĐANG LỌC GÓI -->
        <div id="serviceReviewFilterBanner" style="display: flex; align-items: center; justify-content: space-between; background: #EEF5F1; border-radius: 9px; padding: 12px 18px; margin-bottom: 14px; font-size: 13.5px; color: #236B48; border: 1px solid #C3DEC7;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>Đang hiển thị đánh giá cho gói: <strong style="font-weight: 700; color: #236B48;">Spa Tắm Thảo Mộc và Tạo Kiểu Toàn Diện</strong></span>
            </div>
            <button type="button" style="background: none; border: none; color: #DC2626; font-size: 12.5px; cursor: pointer; font-weight: 600; padding: 2px 6px;">✕ Bỏ lọc gói</button>
        </div>

        <!-- KHỐI TỔNG HỢP VÀ KẾT LUẬN CHẤT LƯỢNG DỊCH VỤ -->
        <div id="serviceReviewInsightsContainer"></div>

        <!-- THẺ MASTER CARD BẢNG DỮ LIỆU -->
        <div class="service-master-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #236B48;">Danh sách phản hồi ca dịch vụ</h3>
                <span style="font-size: 12.5px; color: #4F7A65;">Tự động công bố sau khi hoàn thành</span>
            </div>
            <table class="admin-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: rgba(238, 245, 241, 0.75); color: #236B48; text-align: left;">
                        <th style="padding: 10px 12px; border-radius: 9px 0 0 9px;">Mã lịch & Khách</th>
                        <th style="padding: 10px 12px;">Kỹ thuật viên</th>
                        <th style="padding: 10px 12px;">Đánh giá</th>
                        <th style="padding: 10px 12px;">Nhận xét khách hàng</th>
                        <th style="padding: 10px 12px; text-align: center; border-radius: 0 9px 9px 0;">Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #ECF2EE;">
                        <td style="padding: 12px;">
                            <div style="font-weight: 600; color: #236B48;">BKG-202611-008</div>
                            <div style="color: #4F7A65; font-size: 12px;">Lê Thanh Thảo (Bé Mochi)</div>
                        </td>
                        <td style="padding: 12px; font-weight: 600; color: #203A2C;">KTV Nguyễn Văn Hùng</td>
                        <td style="padding: 12px; color: #D97706; font-weight: 700;">5.0 ★</td>
                        <td style="padding: 12px; color: #203A2C;">Kỹ thuật viên cắt tỉa rất khéo, bé rất hợp tác và thơm tho suốt 3 ngày liền. Cảm ơn tiệm!</td>
                        <td style="padding: 12px; text-align: center;"><span class="admin-badge badge-paid" style="background: #EAF8EE; color: #165335; padding: 4px 10px; border-radius: 9px; font-size: 12px; font-weight: 600;">Đã công bố</span></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ECF2EE;">
                        <td style="padding: 12px;">
                            <div style="font-weight: 600; color: #236B48;">BKG-202611-002</div>
                            <div style="color: #4F7A65; font-size: 12px;">Phạm Quốc Bảo (Bé Lu)</div>
                        </td>
                        <td style="padding: 12px; font-weight: 600; color: #203A2C;">KTV Trần Thu Trang</td>
                        <td style="padding: 12px; color: #D97706; font-weight: 700;">5.0 ★</td>
                        <td style="padding: 12px; color: #203A2C;">Dịch vụ chu đáo, bạn kỹ thuật viên rất yêu động vật, kiên nhẫn vỗ về bé. Sẽ ghé lại đều đặn.</td>
                        <td style="padding: 12px; text-align: center;"><span class="admin-badge badge-paid" style="background: #EAF8EE; color: #165335; padding: 4px 10px; border-radius: 9px; font-size: 12px; font-weight: 600;">Đã công bố</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    <script>${reviewInsightsJs}</script>
    <script>
        window.ReviewInsights.renderInsights({
            container: document.getElementById('serviceReviewInsightsContainer'),
            reviews: [
                { rating: 5, content: 'Kỹ thuật viên cắt tỉa rất khéo, bé rất hợp tác và thơm tho suốt 3 ngày liền. Cảm ơn tiệm!', hasMedia: true },
                { rating: 5, content: 'Dịch vụ chu đáo, bạn kỹ thuật viên rất yêu động vật, kiên nhẫn vỗ về bé. Sẽ ghé lại đều đặn.', hasMedia: true },
                { rating: 4, content: 'Gói spa làm kỹ, bé cưng sạch sẽ, chỉ có lúc đón phải đợi thêm 10 phút vì đông khách.' },
                { rating: 5, content: 'Nhẹ nhàng và chuyên nghiệp, tạo kiểu tròn xoe đáng yêu.' }
            ],
            itemName: 'Spa Tắm Thảo Mộc và Tạo Kiểu Toàn Diện',
            itemType: 'service',
            itemId: 'svc-001'
        });
    </script>
</body>
</html>
        `;
        await page.setContent(serviceAdminHtml, { waitUntil: 'load' });
        await page.waitForTimeout(300);
        await page.screenshot({
            path: 'artifacts/admin-service-review-insights.png',
            fullPage: true
        });

        // =========================================================================
        // 3. CHỤP MINH CHỨNG: Trang Chi tiết sản phẩm phía khách hàng (CÓ LỌC PHÂN LOẠI)
        // =========================================================================
        console.log('3. Đang chụp Chi tiết sản phẩm phía Khách hàng (có lọc phân loại)...');
        const productStorefrontHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <style>
        body { background: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; }
        .pd-reviews-card { max-width: 900px; margin: 0 auto; background: #FFFFFF; border: 1px solid #ECF2EE; border-radius: 9px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
        .pd-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .section-title { font-size: 20px; font-weight: 700; color: #236B48; margin: 0; }
        .pd-review-overview { display: flex; gap: 30px; align-items: center; padding-bottom: 20px; border-bottom: 1px solid #ECF2EE; margin-bottom: 16px; }
        .review-item { padding: 16px 0; border-bottom: 1px solid #F0F4F2; font-size: 13.5px; }
        .pd-review-chip { background:#f1f5ed; color:#526d5b; border:0; border-radius:9px; padding:8px 14px; font-size:12.5px; cursor:pointer; font-weight:500; }
        .pd-review-chip.active { background:#236B48; color:#FFFFFF; font-weight:600; }
    </style>
</head>
<body>
    <div class="pd-reviews-card">
        <div class="pd-section-header">
            <h2 class="section-title">Đánh giá sản phẩm</h2>
            <button style="border: 1px solid #236B48; color: #236B48; background: transparent; padding: 6px 14px; border-radius: 9px; font-weight: 600; cursor: pointer;">Đánh giá đơn đã nhận</button>
        </div>

        <div class="pd-review-overview">
            <div style="text-align: center;">
                <strong style="font-size: 36px; font-weight: 700; color: #236B48; line-height: 1;">4.9 / 5</strong>
                <p style="margin: 6px 0 0; color: #4F7A65; font-size: 13px;">Dựa trên 36 đánh giá thực tế</p>
            </div>
            <!-- BỘ LỌC THEO SỐ SAO -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="pd-review-chip active">Tất cả (36)</button>
                <button type="button" class="pd-review-chip">5 sao (32)</button>
                <button type="button" class="pd-review-chip">4 sao (4)</button>
                <button type="button" class="pd-review-chip">Có ảnh (18)</button>
            </div>
        </div>

        <!-- HÀNG CHIP LỌC THEO PHÂN LOẠI SẢN PHẨM (MỚI) -->
        <div id="productReviewVariantFilterRow" style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
            <span style="font-size: 12.5px; font-weight: 700; color: #236B48;">Phân loại:</span>
            <div style="display: inline-flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="pd-review-chip active">Tất cả (36)</button>
                <button type="button" class="pd-review-chip">Túi 1.5kg (Vị Bò & Rau Củ) (22)</button>
                <button type="button" class="pd-review-chip">Túi 3kg (14)</button>
            </div>
        </div>

        <!-- KHỐI TÓM TẮT CẢM NHẬN KHÁCH HÀNG -->
        <div id="productCustomerReviewHighlights"></div>

        <!-- DANH SÁCH REVIEW KHÁCH -->
        <div class="review-item">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #203A2C;">Khách đã mua hàng · 5 / 5 ⭐</span>
                <span style="color: #4F7A65; font-size: 12px;">Hôm qua</span>
            </div>
            <p style="margin: 0; color: #203A2C;">Bé cún nhà mình mê tít loại hạt này, hạt giòn rụm vừa miệng không bị ngấy dầu, đóng gói hút chân không rất kỹ.</p>
            <div style="color: #236B48; font-size: 12.5px; margin-top: 6px;">Phân loại: <strong>Túi 1.5kg (Vị Bò & Rau Củ)</strong></div>
        </div>

        <div class="review-item">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #203A2C;">Khách đã mua hàng · 5 / 5 ⭐</span>
                <span style="color: #4F7A65; font-size: 12px;">3 ngày trước</span>
            </div>
            <p style="margin: 0; color: #203A2C;">Giao hàng siêu nhanh trong 2 tiếng tại nội thành. Thức ăn chính hãng, tem niêm phong đầy đủ.</p>
            <div style="color: #236B48; font-size: 12.5px; margin-top: 6px;">Phân loại: <strong>Túi 3kg</strong></div>
        </div>
    </div>
    <script>${reviewInsightsJs}</script>
    <script>
        window.ReviewInsights.renderCustomerHighlights({
            container: document.getElementById('productCustomerReviewHighlights'),
            reviews: [
                { rating: 5, content: 'Bé cún nhà mình mê tít loại hạt này, hạt giòn rụm vừa miệng không bị ngấy dầu, đóng gói hút chân không rất kỹ.' },
                { rating: 5, content: 'Giao hàng siêu nhanh trong 2 tiếng tại nội thành. Thức ăn chính hãng, tem niêm phong đầy đủ.' },
                { rating: 4, content: 'Chất lượng tốt, cún ăn phân khuôn đẹp, giá thành hợp lý.' }
            ],
            itemName: 'Thức Ăn Hạt Cho Chó Trưởng Thành Royal Canin Maxi Adult 3kg',
            itemType: 'product'
        });
    </script>
</body>
</html>
        `;
        await page.setContent(productStorefrontHtml, { waitUntil: 'load' });
        await page.waitForTimeout(300);
        await page.locator('.pd-reviews-card').screenshot({
            path: 'artifacts/storefront-product-review-highlights.png'
        });

        // =========================================================================
        // 4. CHỤP MINH CHỨNG: Trang Chi tiết dịch vụ phía khách hàng (CÓ LỌC PHÂN LOẠI)
        // =========================================================================
        console.log('4. Đang chụp Chi tiết dịch vụ phía Khách hàng (có lọc phân loại)...');
        const serviceStorefrontHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <style>
        body { background: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; }
        .service-reviews-section { max-width: 900px; margin: 0 auto; background: #FFFFFF; border: 1px solid #ECF2EE; border-radius: 9px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
        .reviews-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .reviews-title { font-size: 20px; font-weight: 700; color: #236B48; margin: 0; }
        .review-card { padding: 16px 0; border-bottom: 1px solid #F0F4F2; font-size: 13.5px; }
        .variant-filter-chip { background:#f1f5ed; color:#526d5b; border:0; border-radius:9px; padding:7px 13px; font-size:12.5px; cursor:pointer; font-weight:500; }
        .variant-filter-chip.active { background:#236B48; color:#FFFFFF; font-weight:600; }
    </style>
</head>
<body>
    <div class="service-reviews-section">
        <div class="reviews-header-bar">
            <h2 class="reviews-title">Đánh giá dịch vụ</h2>
            <span style="background: #EEF5F1; color: #236B48; padding: 4px 10px; border-radius: 9px; font-size: 12.5px; font-weight: 600;">48 nhận xét</span>
        </div>

        <div style="display: flex; gap: 30px; align-items: center; padding-bottom: 20px; border-bottom: 1px solid #ECF2EE;">
            <div style="text-align: center;">
                <div style="font-size: 38px; font-weight: 700; color: #236B48; line-height: 1;">5.0</div>
                <div style="color: #D97706; margin-top: 4px;">★★★★★</div>
                <div style="color: #4F7A65; font-size: 12.5px; margin-top: 4px;">Dựa trên 48 đánh giá thực tế</div>
            </div>
            <!-- BỘ LỌC THEO SAO -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="variant-filter-chip active">Tất cả</button>
                <button type="button" class="variant-filter-chip">5 sao (46)</button>
                <button type="button" class="variant-filter-chip">4 sao (2)</button>
                <button type="button" class="variant-filter-chip">Có hình ảnh (24)</button>
            </div>
        </div>

        <!-- HÀNG CHIP LỌC THEO PHÂN LOẠI DỊCH VỤ (MỚI) -->
        <div class="review-variant-filter-row" style="display: flex; align-items: center; gap: 10px; margin: 16px 0 8px; flex-wrap: wrap;">
            <span style="font-size: 12.5px; font-weight: 700; color: #236B48;">Phân loại:</span>
            <div style="display: inline-flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="variant-filter-chip active">Tất cả (48)</button>
                <button type="button" class="variant-filter-chip">Chó • Dưới 5kg (26)</button>
                <button type="button" class="variant-filter-chip">Chó • 5 - 10kg (14)</button>
                <button type="button" class="variant-filter-chip">Mèo • Tiêu chuẩn (8)</button>
            </div>
        </div>

        <!-- KHỐI TÓM TẮT CẢM NHẬN KHÁCH HÀNG -->
        <div id="serviceCustomerReviewHighlights"></div>

        <!-- DANH SÁCH BÌNH LUẬN -->
        <div class="review-card">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #203A2C;">Khách đã sử dụng dịch vụ · 5 / 5 ⭐</span>
                <span style="color: #4F7A65; font-size: 12px;">2 ngày trước</span>
            </div>
            <p style="margin: 0; color: #203A2C;">Bé cưng nhà mình nhát người lạ mà tới tiệm bạn KTV dỗ dành cưng nựng một lúc là quen ngay. Cắt tỉa lông sạch đẹp, thơm nức.</p>
            <div style="color: #236B48; font-size: 12.5px; margin-top: 6px;">Phân loại: <strong>Chó • Dưới 5kg</strong></div>
        </div>

        <div class="review-card">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #203A2C;">Khách đã sử dụng dịch vụ · 5 / 5 ⭐</span>
                <span style="color: #4F7A65; font-size: 12px;">5 ngày trước</span>
            </div>
            <p style="margin: 0; color: #203A2C;">Tay nghề kỹ thuật viên rất khéo léo, cắt móng và vệ sinh tai không làm bé đau. 10 điểm cho chất lượng!</p>
            <div style="color: #236B48; font-size: 12.5px; margin-top: 6px;">Phân loại: <strong>Chó • 5 - 10kg</strong></div>
        </div>
    </div>
    <script>${reviewInsightsJs}</script>
    <script>
        window.ReviewInsights.renderCustomerHighlights({
            container: document.getElementById('serviceCustomerReviewHighlights'),
            reviews: [
                { rating: 5, content: 'Bé cưng nhà mình nhát người lạ mà tới tiệm bạn KTV dỗ dành cưng nựng một lúc là quen ngay. Cắt tỉa lông sạch đẹp, thơm nức.' },
                { rating: 5, content: 'Tay nghề kỹ thuật viên rất khéo léo, cắt móng và vệ sinh tai không làm bé đau. 10 điểm cho chất lượng!' },
                { rating: 5, content: 'Nhẹ nhàng và chu đáo, không gian dịch vụ sạch sẽ thơm tho.' }
            ],
            itemName: 'Gói Spa Chăm Sóc Toàn Diện Thú Cưng',
            itemType: 'service'
        });
    </script>
</body>
</html>
        `;
        await page.setContent(serviceStorefrontHtml, { waitUntil: 'load' });
        await page.waitForTimeout(300);
        await page.locator('.service-reviews-section').screenshot({
            path: 'artifacts/storefront-service-review-highlights.png'
        });

        console.log('HOÀN THÀNH: Đã chụp và lưu thành công cả 4 ảnh minh chứng!');
    } finally {
        await browser.close();
    }
})().catch(err => {
    console.error('Lỗi khi chụp ảnh minh chứng:', err);
    process.exitCode = 1;
});
