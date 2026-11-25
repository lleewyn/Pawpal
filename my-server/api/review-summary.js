// api/review-summary.js - API tóm tắt và rút ra kết luận đánh giá bằng AI hoặc thuật toán phân tích
const { GoogleGenerativeAI } = require('@google/generative-ai');

function getApiKey() {
    const direct = process.env.GEMINI_API_KEY;
    if (direct) return direct;
    for (const key of Object.keys(process.env)) {
        if (key.startsWith('GEMINI_API_KEY') && process.env[key]) return process.env[key];
    }
    return null;
}

function generateHeuristicSummary(itemType, itemName, reviews) {
    const count = reviews.length;
    if (!count) {
        return {
            verdict: 'Chưa có đủ đánh giá để rút ra kết luận.',
            strengths: [],
            concerns: [],
            recommendation: 'Khuyến khích khách hàng để lại phản hồi sau khi hoàn tất trải nghiệm.',
            source: 'heuristic'
        };
    }

    const ratings = reviews.map(r => Number(r.rating) || 5);
    const avg = ratings.reduce((a, b) => a + b, 0) / count;
    const positive = reviews.filter(r => (Number(r.rating) || 5) >= 4);
    const negative = reviews.filter(r => (Number(r.rating) || 5) <= 2);
    const neutral = reviews.filter(r => Number(r.rating) === 3);

    const isProduct = itemType === 'product';
    const typeLabel = isProduct ? 'sản phẩm' : 'dịch vụ';

    let verdict = '';
    if (avg >= 4.5) {
        verdict = `Khách hàng có mức độ hài lòng rất cao với ${typeLabel} "${itemName}" (điểm trung bình đạt ${avg.toFixed(1)}/5 sao, với ${Math.round((positive.length / count) * 100)}% đánh giá tích cực). Chất lượng thực tế đáp ứng vượt kỳ vọng của chủ nuôi.`;
    } else if (avg >= 4.0) {
        verdict = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} "${itemName}" duy trì chất lượng ổn định ở mức tốt (điểm trung bình ${avg.toFixed(1)}/5 sao). Phần lớn phản hồi ghi nhận trải nghiệm tích cực và đáng tin cậy.`;
    } else if (avg >= 3.0) {
        verdict = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} "${itemName}" có chất lượng ở mức trung bình (${avg.toFixed(1)}/5 sao), trải nghiệm của khách hàng còn phân hóa và cần được theo dõi cải thiện thêm.`;
    } else {
        verdict = `Cảnh báo: ${typeLabel} "${itemName}" ghi nhận tỷ lệ đánh giá tiêu cực đáng kể (${negative.length}/${count} lượt, điểm trung bình ${avg.toFixed(1)}/5 sao), cần sự can thiệp và rà soát ngay từ phía quản lý.`;
    }

    // Trích xuất ưu điểm và vấn đề nổi bật
    const strengths = [];
    const concerns = [];

    const texts = reviews.map(r => String(r.content || '').toLowerCase()).join(' ');

    if (isProduct) {
        if (/chất lượng|tốt|đẹp|bền|ưng ý|xịn|thích|chính hãng/.test(texts)) strengths.push('Chất lượng hoàn thiện tốt, đúng với mô tả trên gian hàng');
        if (/đóng gói|kỹ|chắc chắn|cẩn thận/.test(texts)) strengths.push('Khâu đóng gói cẩn thận, sản phẩm nguyên vẹn khi đến tay');
        if (/giao nhanh|nhanh chóng|đúng hẹn/.test(texts)) strengths.push('Thời gian xử lý và giao hàng nhanh chóng');
        if (/mùi|dễ ăn|bé thích|thơm/.test(texts)) strengths.push('Phù hợp với khẩu vị và tập tính của thú cưng');

        if (/rách|hỏng|móp|vỡ|bể/.test(texts) || negative.length > 0) concerns.push('Một số phản hồi về tình trạng bao bì hoặc đóng gói khi vận chuyển');
        if (/chậm|lâu|trễ/.test(texts)) concerns.push('Thời gian vận chuyển ở một số đơn hàng còn chậm');
        if (/hạn dùng|hết hạn|date/.test(texts)) concerns.push('Khách hàng đặc biệt quan tâm đến thời hạn sử dụng sản phẩm');
    } else {
        if (/tay nghề|chuyên nghiệp|khéo|đẹp|kỹ/.test(texts)) strengths.push('Tay nghề kỹ thuật viên tốt, tạo hình và chăm sóc chu đáo');
        if (/nhiệt tình|nhẹ nhàng|yêu thương|chu đáo/.test(texts)) strengths.push('Thái độ phục vụ nhẹ nhàng, kiên nhẫn với các bé cưng');
        if (/sạch sẽ|thơm|vệ sinh/.test(texts)) strengths.push('Không gian dịch vụ và bé sau khi làm rất sạch sẽ, thơm tho');

        if (/chờ|lâu|trễ|chậm/.test(texts) || negative.length > 0) concerns.push('Khách phản ánh thời gian chờ đợi hoặc bàn giao bé chưa đúng hẹn');
        if (/giá|đắt|phụ phí/.test(texts)) concerns.push('Khách hàng có băn khoăn về phụ phí hoặc mức giá');
    }

    if (!strengths.length && positive.length) strengths.push('Khách hàng đánh giá cao mức độ tiện lợi và hài lòng chung');
    if (!concerns.length && negative.length) concerns.push('Có đánh giá điểm thấp nhưng khách không để lại nhận xét chi tiết');

    let recommendation = '';
    if (negative.length > 0) {
        recommendation = isProduct
            ? 'Khuyến nghị chủ động liên hệ hỗ trợ các khách hàng có đánh giá thấp và kiểm tra lại khâu đóng gói vận chuyển.'
            : 'Khuyến nghị quản lý kiểm tra biên bản ca trực, nhắc nhở kỹ thuật viên và liên hệ chăm sóc khách hàng nếu có phản ánh bất thường.';
    } else {
        recommendation = isProduct
            ? 'Duy trì nguồn hàng ổn định và có thể xem xét đẩy mạnh quảng bá sản phẩm này trên gian hàng.'
            : 'Chất lượng dịch vụ đang rất tốt, khuyến khích ghi nhận và khen thưởng kỹ thuật viên phụ trách.';
    }

    return {
        verdict,
        strengths: strengths.slice(0, 3),
        concerns: concerns.slice(0, 3),
        recommendation,
        source: 'heuristic'
    };
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ.' });
    }

    let body = req.body || {};
    try {
        if (typeof body === 'string') body = JSON.parse(body);
    } catch {
        return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ.' });
    }

    const itemName = String(body.name || '').trim();
    const itemType = body.type === 'service' ? 'service' : 'product';
    const reviews = Array.isArray(body.reviews) ? body.reviews.slice(0, 35) : [];

    if (!itemName) {
        return res.status(400).json({ success: false, message: 'Thiếu tên sản phẩm hoặc dịch vụ.' });
    }

    // Nếu không có đánh giá
    if (reviews.length === 0) {
        return res.status(200).json({
            success: true,
            data: generateHeuristicSummary(itemType, itemName, [])
        });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        // Fallback thuật toán nếu chưa có Gemini Key
        return res.status(200).json({
            success: true,
            data: generateHeuristicSummary(itemType, itemName, reviews)
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = process.env.PAWPAL_COPILOT_MODEL || 'gemini-2.5-flash';
        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: `Bạn là trợ lý phân tích chất lượng của hệ thống quản trị Pawpal. Hãy phân tích các đánh giá thực tế của khách hàng về ${itemType === 'product' ? 'sản phẩm' : 'dịch vụ'} và rút ra kết luận xúc tích, khách quan, trung thực cho người quản lý.
BẮT BUỘC trả về duy nhất chuỗi JSON hợp lệ không bọc dấu \`\`\`json, cấu trúc:
{
  "verdict": "Đoạn nhận định tổng thể 2-3 câu ngắn gọn",
  "strengths": ["Điểm được khen nhiều nhất (tối đa 3 mục, mỗi mục dưới 15 chữ)"],
  "concerns": ["Vấn đề khách còn phàn nàn hoặc cần lưu ý (tối đa 3 mục, nếu không có để mảng rỗng)"],
  "recommendation": "1 câu đề xuất hành động nghiệp vụ cụ thể cho người quản lý"
}`,
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.2,
                responseMimeType: 'application/json'
            }
        });

        const reviewTextList = reviews.map((r, i) => {
            const star = Number(r.rating) || 5;
            const text = String(r.content || r.comment || '').trim() || '(Không có nhận xét chi tiết)';
            return `${i + 1}. [${star}/5 sao]: ${text}`;
        }).join('\n');

        const prompt = `Tổng hợp và rút ra kết luận đánh giá cho ${itemType === 'product' ? 'sản phẩm' : 'dịch vụ'} "${itemName}":\n${reviewTextList}`;

        // Timeout sau 9 giây để tránh treo UI
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), 9000));
        const callPromise = model.generateContent(prompt);

        const result = await Promise.race([callPromise, timeoutPromise]);
        const responseText = (await result.response).text().trim();
        const parsed = JSON.parse(responseText);

        return res.status(200).json({
            success: true,
            data: {
                verdict: String(parsed.verdict || '').trim(),
                strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
                concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 3) : [],
                recommendation: String(parsed.recommendation || '').trim(),
                source: 'gemini'
            }
        });
    } catch (e) {
        // Fallback an toàn nếu AI lỗi hoặc timeout
        return res.status(200).json({
            success: true,
            data: generateHeuristicSummary(itemType, itemName, reviews)
        });
    }
};
