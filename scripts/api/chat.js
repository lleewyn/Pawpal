require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Quản lý API Key xoay vòng từ Supabase
const getGenAI = async () => {
    try {
        // Lấy các key có provider là 'gemini' và đang active từ bảng api_keys
        const { data, error } = await supabase
            .from('api_keys')
            .select('key_value')
            .eq('provider', 'gemini')
            .eq('is_active', true);

        if (error || !data || data.length === 0) {
            console.warn("[API Key Rotation] Không tìm thấy key trong database. Đang fallback về file .env");
            // Fallback: Lấy từ biến môi trường
            const envKeys = Object.keys(process.env)
                .filter(key => key.startsWith('GEMINI_API_KEY'))
                .map(key => process.env[key])
                .filter(Boolean);
            
            if (envKeys.length === 0) return null;

            const randomKey = envKeys[Math.floor(Math.random() * envKeys.length)];
            const keyPrefix = randomKey.substring(0, 15);
            console.log(`[API Key Rotation - Fallback] Đang dùng key bắt đầu bằng: ${keyPrefix}...`);
            return { genAI: new GoogleGenerativeAI(randomKey), keyPrefix };
        }

        // Nếu lấy thành công từ Supabase, chọn ngẫu nhiên 1 key (Round-robin/Random)
        const randomKeyObj = data[Math.floor(Math.random() * data.length)];
        const keyPrefix = randomKeyObj.key_value.substring(0, 15);
        console.log(`[API Key Rotation] Đang dùng key bắt đầu bằng: ${keyPrefix}... (tổng số: ${data.length} keys)`);
        return { genAI: new GoogleGenerativeAI(randomKeyObj.key_value), keyPrefix };
    } catch (err) {
        console.error("Lỗi khi lấy API key từ Supabase:", err);
        return null;
    }
};
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Sử dụng service role key để backend có toàn quyền truy xuất DB an toàn (vì chạy server-side)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Kiểm tra user token qua Supabase
const getUserIdFromToken = async (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    
    // Hỗ trợ local auth token (PawPal dùng custom auth, không dùng Supabase Auth)
    // Format: 'local:<userId>' - lấy từ localStorage['pawpal_current_user'].id
    if (token.startsWith('local:')) {
        const userId = token.replace('local:', '');
        if (!userId) return null;
        
        // Verify userId này có thực sự tồn tại trong bảng customer trên Supabase DB không
        // Nếu ai đó giả mạo userId, bước này sẽ loại bỏ
        const { data, error } = await supabase
            .from('customer')
            .select('id')
            .eq('id', userId)
            .single();
        
        if (error || !data) {
            console.warn('[Auth] local userId không hợp lệ hoặc không tồn tại:', userId);
            return null;
        }
        console.log('[Auth] ✅ Xác thực thành công userId từ DB:', userId);
        return userId;
    }
    
    // Gọi Supabase để verify JWT token an toàn (nếu có Supabase Auth)
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        console.error("Auth error:", error);
        return null;
    }
    return user.id;
};

// Định nghĩa các Tools (Function Calling)
const dbTools = {
    get_user_orders: async (user_id) => {
        if (!user_id) return { error: "Yêu cầu đăng nhập để xem đơn hàng" };
        const { data, error } = await supabase
            .from('sales_order')
            .select('*')
            .eq('customer_id', user_id)
            .order('created_at', { ascending: false })
            .limit(3);
        if (error) return { error: error.message };
        return data && data.length ? data : { message: "Không tìm thấy đơn hàng nào" };
    },
    get_user_bookings: async (user_id) => {
        if (!user_id) return { error: "Yêu cầu đăng nhập để xem lịch hẹn" };
        const { data, error } = await supabase
            .from('appointment')
            .select('*')
            .eq('customer_id', user_id)
            .order('created_at', { ascending: false })
            .limit(3);
        if (error) return { error: error.message };
        return data && data.length ? data : { message: "Không có lịch hẹn nào sắp tới" };
    },
    get_services_price: async () => {
        try {
            const { data, error } = await supabase.from('service_price_matrix').select('*').limit(30);
            if (error) throw error;
            if (data && data.length > 0) {
                return { context: "Dữ liệu bảng giá:\n" + JSON.stringify(data) };
            }
            return { error: "Không tìm thấy dữ liệu giá dịch vụ" };
        } catch (e) {
            return { error: "Lỗi đọc dữ liệu giá dịch vụ từ Supabase" };
        }
    },
    get_pet_profile: async (user_id) => {
        if (!user_id) return { error: "Yêu cầu đăng nhập để xem hồ sơ thú cưng" };
        try {
            const { data, error } = await supabase.from('pet_profile').select('*').eq('customer_id', user_id);
            if (error) throw error;
            return data && data.length ? data : { message: "Bạn chưa có hồ sơ thú cưng nào trên hệ thống" };
        } catch (e) {
            return { error: "Lỗi đọc dữ liệu thú cưng từ Supabase" };
        }
    },
    cancel_booking: async (user_id, appointment_id) => {
        if (!user_id) return { error: "Yêu cầu đăng nhập để thao tác" };
        const { data, error } = await supabase
            .from('appointment')
            .update({ status: 'CANCELLED' })
            .eq('id', appointment_id)
            .eq('customer_id', user_id)
            .select();
        if (error) return { error: error.message };
        return data && data.length ? { success: true, message: `Đã hủy thành công lịch hẹn ${appointment_id}` } : { error: "Không tìm thấy lịch hẹn hoặc bạn không có quyền hủy" };
    },
    search_store_info: async (query, genAI_instance) => {
        // Thực hiện RAG: Nhúng câu hỏi thành vector, so khớp trong DB
        try {
            // Lấy mô hình text-embedding của Google
            const embeddingModel = genAI_instance.getGenerativeModel({ model: "gemini-embedding-2" });
            const result = await embeddingModel.embedContent(query);
            const embedding = result.embedding.values;
            
            // Tìm kiếm vector trên bảng document_embeddings (yêu cầu hàm match_documents trong SQL)
            // Nếu chưa có hàm match_documents, tạm fallback về tìm full-text cơ bản hoặc trả về câu rỗng.
            const { data, error } = await supabase.rpc('match_documents', {
                query_embedding: embedding,
                match_threshold: 0.7,
                match_count: 2
            });
            
            if (error || !data || data.length === 0) {
                return { context: "PawPal cung cấp Spa, Pet Hotel, và Bán lẻ. Mở cửa 8h-20h. Vui lòng liên hệ hotline để biết chi tiết." };
            }
            return { context: data.map(d => d.content).join("\n") };
        } catch (e) {
            console.error("RAG Error:", e);
            return { context: "Dữ liệu kiến thức không khả dụng." };
        }
    }
};

// Khai báo tool schema cho Gemini
const toolsDeclaration = [
    {
        functionDeclarations: [
            {
                name: "get_user_orders",
                description: "Lấy 3 đơn hàng mua sắm gần nhất của khách hàng (chỉ dùng khi khách hỏi về đơn hàng của họ).",
            },
            {
                name: "get_user_bookings",
                description: "Lấy 3 lịch hẹn Spa/Grooming/Hotel gần nhất của khách hàng (chỉ dùng khi khách hỏi về lịch hẹn của họ).",
            },
            {
                name: "get_services_price",
                description: "Lấy bảng giá các dịch vụ Spa, Grooming, Hotel của PawPal (Sử dụng khi khách hỏi về giá cả, bảng giá, bao nhiêu tiền).",
            },
            {
                name: "get_pet_profile",
                description: "Lấy hồ sơ thú cưng của khách hàng đang đăng nhập.",
            },
            {
                name: "cancel_booking",
                description: "Hủy một lịch hẹn cụ thể. BẮT BUỘC phải hỏi lại người dùng để xác nhận trước khi gọi hàm này.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        appointment_id: { type: "STRING", description: "Mã lịch hẹn cần hủy" }
                    },
                    required: ["appointment_id"]
                }
            },
            {
                name: "search_store_info",
                description: "Tìm kiếm thông tin chung về cửa hàng PawPal, ví dụ: bảng giá, giờ mở cửa, chính sách hoàn tiền, loại dịch vụ.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "Từ khóa hoặc câu hỏi tóm tắt để tìm kiếm trong cơ sở dữ liệu kiến thức" }
                    },
                    required: ["query"]
                }
            }
        ]
    }
];

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages } = req.body;
        const authHeader = req.headers['authorization'];
        
        const userId = await getUserIdFromToken(authHeader);
        
        let systemInstruction = "Bạn là Trợ lý AI của cửa hàng chăm sóc thú cưng PawPal. Nhiệm vụ của bạn là tư vấn nhiệt tình, thân thiện bằng tiếng Việt. Tuyệt đối không dùng markdown phức tạp ngoài in đậm (**text**).\n";
        
        systemInstruction += "QUY TẮC QUAN TRỌNG NHẤT (GUARDRAILS):\n";
        systemInstruction += "- XÁC NHẬN TRƯỚC KHI THỰC THI: Mọi thao tác hủy lịch hẹn (cancel_booking) BẮT BUỘC phải hỏi lại khách: 'Bạn có chắc chắn muốn hủy lịch hẹn [Mã] không?'. Chỉ gọi Tool khi khách nói đồng ý.\n";
        systemInstruction += "- KHÔNG ẢO GIÁC: Chỉ trả lời dựa trên dữ liệu thật do Tools trả về. Nếu Tool báo lỗi hoặc trống, phải nói thật là không tìm thấy, tuyệt đối không bịa dữ liệu.\n";
        systemInstruction += "- NGOÀI PHẠM VI (OUT-OF-SCOPE): Nếu khách hỏi vấn đề không liên quan đến thú cưng hoặc PawPal, hãy từ chối lịch sự.\n\n";

        if (userId) {
            systemInstruction += `Trạng thái: Đã đăng nhập (ID: ${userId}). Khi khách hỏi thông tin cá nhân (đơn hàng, lịch hẹn, thú cưng), HÃY ƯU TIÊN GỌI TOOL tương ứng.\n`;
        } else {
            systemInstruction += `Trạng thái: Khách Vãng Lai. Nếu khách yêu cầu lấy dữ liệu cá nhân, HÃY TỪ CHỐI gọi Tool và yêu cầu họ đăng nhập.\n`;
        }

        const genAIResult = await getGenAI();
        if (!genAIResult) return res.status(500).json({ error: 'System AI Error: No API Keys available' });
        
        const { genAI, keyPrefix } = genAIResult;
        
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction,
            tools: toolsDeclaration
        });

        // Gemini SDK requires history in a specific format
        const history = messages.slice(0, -1).map(m => ({
            role: m.role, // 'user' or 'model'
            parts: [{ text: m.content }]
        }));

        const chat = model.startChat({
            history: history
        });

        // 2. Bắt đầu Stream request
        const userMsg = messages[messages.length - 1].content;
        const streamResult = await chat.sendMessageStream(userMsg);
        
        // Chuẩn bị header cho SSE streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // Trả Header Key Prefix về Frontend
        res.setHeader('X-API-Key-Used', keyPrefix);

        for await (const chunk of streamResult.stream) {
            const calls = typeof chunk.functionCalls === 'function' ? chunk.functionCalls() : chunk.functionCalls;
            if (calls && calls.length > 0) {
                const call = calls[0];
                const toolName = call.name;
                const toolArgs = call.args;
                
                console.log(`[Function Calling] Gemini wants to call: ${toolName}`, toolArgs);
                let toolResult;

                if (toolName === 'get_user_orders') {
                    toolResult = await dbTools.get_user_orders(userId);
                } else if (toolName === 'get_user_bookings') {
                    toolResult = await dbTools.get_user_bookings(userId);
                } else if (toolName === 'get_services_price') {
                    toolResult = await dbTools.get_services_price();
                } else if (toolName === 'get_pet_profile') {
                    toolResult = await dbTools.get_pet_profile(userId);
                } else if (toolName === 'cancel_booking') {
                    toolResult = await dbTools.cancel_booking(userId, toolArgs.appointment_id);
                } else if (toolName === 'search_store_info') {
                    toolResult = await dbTools.search_store_info(toolArgs.query, genAI);
                }

                // Có function call -> Gọi lại Gemini bằng streaming và trả thẳng về client
                const secondStream = await chat.sendMessageStream([{
                    functionResponse: {
                        name: toolName,
                        response: { result: toolResult }
                    }
                }]);
                
                for await (const secondChunk of secondStream.stream) {
                    const text = typeof secondChunk.text === 'function' ? secondChunk.text() : '';
                    if (text) {
                        res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
                    }
                }
                break; // Xử lý xong function call thì thoát vòng lặp ngoài
            }
            
            // Nếu không phải function call, stream thẳng text về client
            const text = typeof chunk.text === 'function' ? chunk.text() : '';
            if (text) {
                res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
            }
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

    } catch (error) {
        console.error("Backend Error:", error);
        
        const msg = error.message || '';
        
        // Tất cả lỗi đều trả về SSE format để frontend streaming reader xử lý được
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        
        // Xử lý lỗi rate limit của Gemini API (429 / RESOURCE_EXHAUSTED)
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('retryDelay') || msg.includes('quota')) {
            res.write(`data: ${JSON.stringify({ reply: 'PawPal AI đang bận xử lý nhiều yêu cầu cùng lúc. Bạn vui lòng thử lại sau vài giây nhé! 🐾' })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ reply: 'Xin lỗi, hệ thống PawPal AI đang gặp sự cố. Quý khách vui lòng thử lại sau.' })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    }
};
