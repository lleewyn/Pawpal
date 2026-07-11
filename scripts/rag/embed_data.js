require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const knowledgeBase = [
    {
        content: "Cửa hàng chăm sóc thú cưng PawPal mở cửa từ 8:00 sáng đến 20:00 tối các ngày trong tuần. Riêng dịch vụ Pet Hotel hoạt động 24/7 có nhân viên trực đêm.",
        metadata: { category: "hours", type: "general" }
    },
    {
        content: "PawPal cung cấp 4 dịch vụ chính: Spa & Grooming (tắm, sấy, cắt tỉa lông), Pet Hotel (trông giữ thú cưng ngày/đêm), Clinic (Khám chữa bệnh cơ bản) và Cửa hàng bán lẻ phụ kiện, thức ăn thú cưng.",
        metadata: { category: "services", type: "general" }
    },
    {
        content: "Chính sách hoàn trả: Khách hàng có thể đổi trả sản phẩm mua tại cửa hàng (thức ăn, phụ kiện) trong vòng 7 ngày nếu sản phẩm chưa qua sử dụng, còn nguyên tem mác. Không áp dụng đổi trả cho thú cưng sống và các dịch vụ đã thực hiện.",
        metadata: { category: "policy", type: "return" }
    },
    {
        content: "Bảng giá Spa cơ bản: Dưới 5kg: 150.000đ. Từ 5kg - 10kg: 250.000đ. Trên 10kg: 350.000đ. Gói tắm bao gồm: Cắt móng, vắt tuyến hôi, vệ sinh tai, tắm gội 2 lần, sấy khô chải lông tơ.",
        metadata: { category: "pricing", type: "spa" }
    },
    {
        content: "Pet Hotel (Khách sạn thú cưng): 150.000đ/ngày cho phòng tiêu chuẩn. 250.000đ/ngày cho phòng VIP (có camera 24/7). Giá đã bao gồm 2 bữa ăn chính hạt Royal Canin và 1 giờ vui chơi tại sân chung.",
        metadata: { category: "pricing", type: "hotel" }
    }
];

async function runEmbedding() {
    console.log("Starting Embedding Process...");
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

    for (const doc of knowledgeBase) {
        try {
            console.log(`Embedding text: "${doc.content.substring(0, 30)}..."`);
            
            const result = await model.embedContent(doc.content);
            const embedding = result.embedding.values;

            
            const { error } = await supabase
                .from('document_embeddings')
                .insert({
                    content: doc.content,
                    metadata: doc.metadata,
                    embedding: embedding
                });

            if (error) {
                console.error("Lỗi khi chèn vào Supabase:", error.message);
            } else {
                console.log("-> Thành công!");
            }
        } catch (err) {
            console.error("Lỗi Embedding:", err);
        }
    }
    console.log("Hoàn tất!");
}

runEmbedding();
