// scripts/shared/review-insights.js - Engine tổng hợp và kết luận chất lượng đánh giá Pawpal
(function(global) {
    'use strict';

    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    function analyzeReviews(reviews, itemType, itemName) {
        const count = reviews.length;
        if (!count) {
            return {
                count: 0,
                average: 0,
                positivePercent: 0,
                neutralPercent: 0,
                negativePercent: 0,
                mediaPercent: 0,
                verdictClass: 'badge-neutral',
                verdictTitle: 'Chưa có dữ liệu đánh giá',
                verdictDesc: 'Chưa ghi nhận đánh giá nào cho mục này.',
                takeaways: ['Chưa có phản hồi thực tế từ khách hàng.'],
                actionRecommendation: 'Khuyến khích khách hàng đánh giá sau khi trải nghiệm.'
            };
        }

        const ratings = reviews.map(r => Number(r.rating) || 5);
        const sum = ratings.reduce((a, b) => a + b, 0);
        const avg = sum / count;

        const posCount = reviews.filter(r => (Number(r.rating) || 5) >= 4).length;
        const neuCount = reviews.filter(r => Number(r.rating) === 3).length;
        const negCount = reviews.filter(r => (Number(r.rating) || 5) <= 2).length;
        const mediaCount = reviews.filter(r => (r.media && r.media.length > 0) || r.hasMedia || r.has_media).length;

        const positivePercent = Math.round((posCount / count) * 100);
        const neutralPercent = Math.round((neuCount / count) * 100);
        const negativePercent = Math.round((negCount / count) * 100);
        const mediaPercent = Math.round((mediaCount / count) * 100);

        let verdictClass = 'badge-success';
        let verdictTitle = 'Đạt chuẩn xuất sắc';
        let verdictDesc = '';

        const typeLabel = itemType === 'service' ? 'dịch vụ' : 'sản phẩm';

        if (avg >= 4.5 && negativePercent <= 5) {
            verdictClass = 'badge-paid';
            verdictTitle = 'Đạt chuẩn xuất sắc';
            verdictDesc = `Khách hàng đánh giá rất cao chất lượng ${typeLabel} này với ${positivePercent}% phản hồi tích cực.`;
        } else if (avg >= 4.0 && negativePercent <= 10) {
            verdictClass = 'badge-paid';
            verdictTitle = 'Chất lượng ổn định';
            verdictDesc = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} giữ vững phong độ ổn định, phần lớn khách hàng hài lòng và sẵn sàng sử dụng lại.`;
        } else if (avg >= 3.0) {
            verdictClass = 'badge-warning';
            verdictTitle = 'Cần theo dõi và cải thiện';
            verdictDesc = `Mức độ hài lòng đạt mức trung bình, có một số điểm khách hàng chưa thực sự ưng ý cần được rà soát.`;
        } else {
            verdictClass = 'badge-cancelled';
            verdictTitle = 'Cảnh báo tỷ lệ không hài lòng cao';
            verdictDesc = `Ghi nhận tỷ lệ đánh giá tiêu cực chiếm ${negativePercent}%, cần quản lý trực tiếp kiểm tra và xử lý nguyên nhân.`;
        }

        // Trích xuất trọng tâm nhận xét
        const allText = reviews.map(r => String(r.content || r.comment || r.review_content || '').toLowerCase()).join(' ');
        const takeaways = [];

        if (itemType === 'service') {
            if (/tay nghề|chuyên nghiệp|khéo|đẹp|kỹ/.test(allText)) takeaways.push('Tay nghề kỹ thuật viên được khen ngợi chu đáo và tạo kiểu đẹp');
            if (/nhiệt tình|nhẹ nhàng|yêu thương|cưng|ân cần/.test(allText)) takeaways.push('Thái độ phục vụ kiên nhẫn, tạo cảm giác an tâm cho thú cưng');
            if (/sạch sẽ|thơm|vệ sinh|gọn/.test(allText)) takeaways.push('Vệ sinh sạch sẽ, mùi hương dễ chịu sau dịch vụ');
            if (/chờ|lâu|trễ|chậm/.test(allText) || negCount > 0) takeaways.push('Có phản ánh về thời gian chờ đợi hoặc tiến độ trả bé');
            if (/giá|đắt|phụ phí/.test(allText)) takeaways.push('Khách hàng quan tâm đến mức phụ phí phát sinh');
        } else {
            if (/chất lượng|tốt|đẹp|bền|ưng ý|xịn|chính hãng/.test(allText)) takeaways.push('Chất lượng sản phẩm đúng mô tả, dùng tốt và bền');
            if (/đóng gói|kỹ|chắc chắn|cẩn thận/.test(allText)) takeaways.push('Bao bì đóng gói chắc chắn, bảo quản tốt');
            if (/giao nhanh|nhanh chóng|đúng hẹn/.test(allText)) takeaways.push('Thời gian xử lý đơn và giao hàng nhanh');
            if (/mùi|dễ ăn|bé thích|thơm/.test(allText)) takeaways.push('Thú cưng thích thú và hợp khẩu vị');
            if (/rách|hỏng|móp|vỡ|bể/.test(allText) || negCount > 0) takeaways.push('Cần lưu ý kiểm tra khâu vận chuyển tránh móp méo bao bì');
            if (/chậm|lâu|trễ/.test(allText)) takeaways.push('Một số phản hồi về thời gian vận chuyển chưa nhanh');
        }

        if (takeaways.length === 0) {
            takeaways.push(`Đa số khách hàng đánh giá điểm số cao (${positivePercent}% hài lòng) nhưng không ghi nhận xét chi tiết.`);
        }

        // Đề xuất hành động nghiệp vụ
        let actionRecommendation = '';
        if (negCount > 0) {
            actionRecommendation = itemType === 'service'
                ? 'Khuyến nghị rà soát biên bản ca trực có điểm thấp, trao đổi với kỹ thuật viên và chủ động liên hệ chăm sóc khách hàng.'
                : 'Khuyến nghị kiểm tra chất lượng lô hàng hiện tại, rà soát đối tác vận chuyển và gửi phản hồi giải thích đến khách hàng.';
        } else if (avg >= 4.5) {
            actionRecommendation = itemType === 'service'
                ? 'Chất lượng dịch vụ hoàn hảo, đề xuất biểu dương kỹ thuật viên phụ trách và giữ vững quy trình chuẩn.'
                : 'Sản phẩm có mức độ tín nhiệm cao, có thể xem xét tăng tồn kho và hiển thị nổi bật trên trang chủ.';
        } else {
            actionRecommendation = 'Tiếp tục theo dõi các đánh giá mới để có đánh giá đa chiều hơn.';
        }

        return {
            count,
            average: avg,
            positivePercent,
            neutralPercent,
            negativePercent,
            mediaPercent,
            verdictClass,
            verdictTitle,
            verdictDesc,
            takeaways: takeaways.slice(0, 3),
            actionRecommendation
        };
    }

    function renderInsights({ container, reviews, itemName, itemType, itemId }) {
        if (!container) return;
        const stats = analyzeReviews(reviews, itemType, itemName);

        const cacheKey = `pawpal_ai_summary:${itemType}:${itemId || itemName}:${reviews.length}`;
        let cachedAi = null;
        try {
            const raw = sessionStorage.getItem(cacheKey);
            if (raw) cachedAi = JSON.parse(raw);
        } catch {}

        container.style.display = 'block';
        container.innerHTML = `
            <div class="review-insights-card" style="background: rgba(238, 245, 241, 0.70); border: 1px solid var(--border-neutral, #ECF2EE); border-radius: var(--admin-radius, 9px); padding: 14px 16px; margin-bottom: 14px; backdrop-filter: blur(8px);">
                <!-- TIÊU ĐỀ KHỐI KẾT LUẬN -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; color: var(--text-heading, #236B48); font-size: 13.5px;">Kết luận chất lượng và khuyến nghị hành động</span>
                        <span class="admin-badge ${stats.verdictClass}">${esc(stats.verdictTitle)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" class="btn-ai-summary-toggle admin-btn" style="background: #236B48; color: #FFFFFF; font-size: 12px; padding: 4px 10px; border-radius: var(--admin-radius, 9px); cursor: pointer; border: none;">
                            ${cachedAi ? 'Xem nhận định tóm tắt' : 'Tóm tắt chuyên sâu bằng AI'}
                        </button>
                    </div>
                </div>

                <!-- TÓM TẮT ĐỊNH LƯỢNG CHỈ SỐ -->
                <div style="font-size: 13px; color: #203A2C; margin-bottom: 8px; line-height: 1.5;">
                    ${esc(stats.verdictDesc)}
                </div>

                <div style="display: flex; gap: 16px; margin-bottom: 10px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted, #4F7A65);">
                    <span>Hài lòng: <strong style="color: #236B48;">${stats.positivePercent}%</strong></span>
                    <span>Trung lập: <strong style="color: #D97706;">${stats.neutralPercent}%</strong></span>
                    <span>Không hài lòng: <strong style="color: ${stats.negativePercent > 0 ? '#DC2626' : '#4F7A65'};">${stats.negativePercent}%</strong></span>
                    ${stats.mediaPercent > 0 ? `<span>Có ảnh thực tế: <strong style="color: #236B48;">${stats.mediaPercent}%</strong></span>` : ''}
                </div>

                <!-- TRỌNG TÂM NHẬN XÉT -->
                <div style="margin-bottom: 8px;">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-heading, #236B48); margin-bottom: 4px;">Trọng tâm khách hàng phản hồi:</div>
                    <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; color: #203A2C; line-height: 1.5;">
                        ${stats.takeaways.map(t => `<li>${esc(t)}</li>`).join('')}
                    </ul>
                </div>

                <!-- ĐỀ XUẤT HÀNH ĐỘNG NGHIỆP VỤ -->
                <div style="background: rgba(255, 255, 255, 0.75); border: 1px solid #C3DEC7; border-radius: var(--admin-radius, 9px); padding: 8px 12px; font-size: 12.5px; color: #236B48;">
                    <strong>Đề xuất quản trị:</strong> ${esc(stats.actionRecommendation)}
                </div>

                <!-- KHU VỰC HIỂN THỊ TÓM TẮT AI (ON-DEMAND) -->
                <div class="ai-summary-result-box" style="display: ${cachedAi ? 'block' : 'none'}; margin-top: 10px; background: #FFFFFF; border: 1px solid #C3DEC7; border-radius: var(--admin-radius, 9px); padding: 12px 14px;">
                    ${cachedAi ? renderAiSummaryContent(cachedAi) : ''}
                </div>
            </div>
        `;

        const btnAi = container.querySelector('.btn-ai-summary-toggle');
        const boxAi = container.querySelector('.ai-summary-result-box');

        if (btnAi && boxAi) {
            btnAi.onclick = async () => {
                if (boxAi.style.display === 'block' && boxAi.innerHTML.trim() && !boxAi.dataset.loading) {
                    boxAi.style.display = 'none';
                    btnAi.textContent = 'Xem nhận định tóm tắt';
                    return;
                }

                if (cachedAi) {
                    boxAi.style.display = 'block';
                    btnAi.textContent = 'Thu gọn nhận định';
                    return;
                }

                // Gọi backend AI summarize
                boxAi.style.display = 'block';
                boxAi.dataset.loading = 'true';
                boxAi.innerHTML = '<div style="font-size: 12.5px; color: var(--text-muted, #4F7A65); padding: 4px 0;">Đang tổng hợp nhận định bằng AI…</div>';
                btnAi.disabled = true;

                try {
                    const response = await fetch('/api/review-summary', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: itemName,
                            type: itemType,
                            reviews: reviews.map(r => ({
                                rating: Number(r.rating) || 5,
                                content: r.content || r.comment || r.review_content || ''
                            }))
                        })
                    });

                    const json = await response.json();
                    if (!response.ok || !json.success || !json.data) throw new Error(json.message || 'Lỗi xử lý');

                    cachedAi = json.data;
                    try { sessionStorage.setItem(cacheKey, JSON.stringify(cachedAi)); } catch {}

                    delete boxAi.dataset.loading;
                    boxAi.innerHTML = renderAiSummaryContent(cachedAi);
                    btnAi.textContent = 'Thu gọn nhận định';
                } catch (err) {
                    delete boxAi.dataset.loading;
                    boxAi.innerHTML = '<div style="font-size: 12.5px; color: #DC2626;">Chưa thể tạo tóm tắt chuyên sâu lúc này. Vui lòng thử lại sau.</div>';
                    btnAi.textContent = 'Thử lại tóm tắt';
                } finally {
                    btnAi.disabled = false;
                }
            };
        }
    }

    function renderAiSummaryContent(data) {
        const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        return `
            <div style="font-size: 12px; font-weight: 700; color: #236B48; margin-bottom: 6px; text-transform: none;">Nhận định tổng quan chuyên sâu:</div>
            <p style="font-size: 13px; color: #203A2C; margin: 0 0 8px 0; line-height: 1.5;">${esc(data.verdict)}</p>
            ${data.strengths && data.strengths.length ? `
                <div style="font-size: 12px; font-weight: 600; color: #236B48; margin-bottom: 4px;">Ưu điểm nổi bật nhất:</div>
                <ul style="margin: 0 0 8px 0; padding-left: 18px; font-size: 12.5px; color: #203A2C; line-height: 1.4;">
                    ${data.strengths.map(s => `<li>${esc(s)}</li>`).join('')}
                </ul>
            ` : ''}
            ${data.concerns && data.concerns.length ? `
                <div style="font-size: 12px; font-weight: 600; color: #D97706; margin-bottom: 4px;">Vấn đề cần lưu ý:</div>
                <ul style="margin: 0 0 8px 0; padding-left: 18px; font-size: 12.5px; color: #203A2C; line-height: 1.4;">
                    ${data.concerns.map(c => `<li>${esc(c)}</li>`).join('')}
                </ul>
            ` : ''}
            ${data.recommendation ? `
                <div style="font-size: 12.5px; color: #236B48; border-top: 1px dashed #C3DEC7; padding-top: 6px; margin-top: 6px;">
                    <strong>Khuyến nghị trọng tâm:</strong> ${esc(data.recommendation)}
                </div>
            ` : ''}
        `;
    }

    function renderCustomerHighlights({ container, reviews, itemName, itemType }) {
        if (!container) return;
        if (!Array.isArray(reviews) || reviews.length < 2) {
            container.style.display = 'none';
            return;
        }

        const stats = analyzeReviews(reviews, itemType, itemName);
        const typeLabel = itemType === 'service' ? 'dịch vụ' : 'sản phẩm';

        let customerSummary = '';
        if (stats.average >= 4.5) {
            customerSummary = `Khách hàng rất hài lòng với ${typeLabel} này (trung bình ${stats.average.toFixed(1)}/5 sao từ ${stats.count} lượt đánh giá), đánh giá cao độ hoàn thiện và chất lượng thực tế.`;
        } else if (stats.average >= 4.0) {
            customerSummary = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} nhận được phản hồi tốt (trung bình ${stats.average.toFixed(1)}/5 sao), là lựa chọn đáng tin cậy cho thú cưng.`;
        } else {
            customerSummary = `Có ${stats.positivePercent}% khách hàng đánh giá hài lòng về ${typeLabel} này.`;
        }

        container.style.display = 'block';
        container.innerHTML = `
            <div class="customer-highlights-card" style="background: rgba(238, 245, 241, 0.75); border: 1px solid #C3DEC7; border-radius: 9px; padding: 14px 18px; margin: 16px 0; backdrop-filter: blur(8px);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                    <span style="font-weight: 700; color: #236B48; font-size: 13.5px;">Tóm tắt cảm nhận từ khách hàng</span>
                    <span style="font-size: 11.5px; color: #4F7A65; background: #FFFFFF; padding: 2px 8px; border-radius: 9px; border: 1px solid #C3DEC7;">Dựa trên ${stats.count} đánh giá thực tế</span>
                </div>
                <p style="font-size: 13px; color: #203A2C; margin: 0 0 10px 0; line-height: 1.5;">${esc(customerSummary)}</p>
                <div style="font-size: 12.5px; font-weight: 600; color: #236B48; margin-bottom: 4px;">Điểm nổi bật được yêu thích nhất:</div>
                <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; color: #203A2C; line-height: 1.5;">
                    ${stats.takeaways.map(t => `<li>${esc(t)}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    global.ReviewInsights = {
        analyzeReviews,
        renderInsights,
        renderCustomerHighlights
    };
})(typeof window !== 'undefined' ? window : this);
