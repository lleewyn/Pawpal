require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

let cachedApiKeys = null;
let lastKeysFetchTime = 0;
let currentKeyIndex = 0;
const validUsersCache = new Map();

const getGenAI = async () => {
    try {
        const CACHE_TTL = 10 * 60 * 1000;
        if (cachedApiKeys && (Date.now() - lastKeysFetchTime < CACHE_TTL)) {
            const keyObj = cachedApiKeys[currentKeyIndex % cachedApiKeys.length];
            currentKeyIndex++;
            const keyPrefix = keyObj.key_value.substring(0, 15);
            console.log(`[API Key Rotation - CACHED] Đang dùng key bắt đầu bằng: ${keyPrefix}... (thứ tự: ${(currentKeyIndex-1) % cachedApiKeys.length + 1}/${cachedApiKeys.length})`);
            return { genAI: new GoogleGenerativeAI(keyObj.key_value), keyPrefix };
        }

        const { data, error } = await supabase
            .from('api_keys')
            .select('key_value')
            .eq('provider', 'gemini')
            .eq('is_active', true);

        if (error || !data || data.length === 0) {
            console.warn("[API Key Rotation] Không tìm thấy key trong database. Đang fallback về file .env");
            const envKeys = Object.keys(process.env)
                .filter(key => key.startsWith('GEMINI_API_KEY'))
                .map(key => process.env[key])
                .filter(Boolean);
            
            if (envKeys.length === 0) return null;

            const selectedKey = envKeys[currentKeyIndex % envKeys.length];
            currentKeyIndex++;
            const keyPrefix = selectedKey.substring(0, 15);
            console.log(`[API Key Rotation - Fallback] Đang dùng key bắt đầu bằng: ${keyPrefix}...`);
            return { genAI: new GoogleGenerativeAI(selectedKey), keyPrefix };
        }

        cachedApiKeys = data;
        lastKeysFetchTime = Date.now();

        const keyObj = data[currentKeyIndex % data.length];
        currentKeyIndex++; // Tăng index cho lần sau
        
        const keyPrefix = keyObj.key_value.substring(0, 15);
        console.log(`[API Key Rotation] Đang dùng key bắt đầu bằng: ${keyPrefix}... (tổng số: ${data.length} keys, thứ tự: ${(currentKeyIndex-1) % data.length + 1}/${data.length})`);
        return { genAI: new GoogleGenerativeAI(keyObj.key_value), keyPrefix };
    } catch (err) {
        console.error("Lỗi khi lấy API key từ Supabase:", err);
        return null;
    }
};
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const getUserIdFromToken = async (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    
    if (token.startsWith('local:')) {
        const userId = token.replace('local:', '');
        if (!userId) return null;
        
        if (validUsersCache.has(userId) && (Date.now() - validUsersCache.get(userId) < 15 * 60 * 1000)) {
            return userId;
        }

        const { data, error } = await supabase
            .from('customer')
            .select('id')
            .eq('id', userId)
            .single();
        
        if (error || !data) {
            console.warn('[Auth] local userId không hợp lệ hoặc không tồn tại:', userId);
            return null;
        }
        
        validUsersCache.set(userId, Date.now()); // Lưu vào bộ nhớ đệm
        console.log('[Auth] ✅ Xác thực thành công userId từ DB:', userId);
        return userId;
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        console.error("Auth error:", error);
        return null;
    }
    return user.id;
};

const dbTools = {
    get_user_orders: async (user_id) => {
        if (!user_id) return { error: "Yêu cầu đăng nhập để xem đơn hàng" };
        const { data, error } = await supabase
            .from('sales_order')
            .select('*')
            .eq('customer_id', user_id)
            .order('created_at', { ascending: false })
            .limit(10);
        if (error) return { error: error.message };
        return data && data.length ? data : { message: "Không tìm thấy đơn hàng nào" };
    },
    get_user_bookings: async (user_id) => {
        if (!user_id) return { error: "Yêu cầu đăng nhập để xem lịch hẹn" };
        const { data, error } = await supabase
            .from('appointment')
            .select('*, service(service_name)')
            .eq('customer_id', user_id)
            .order('created_at', { ascending: false })
            .limit(5);
        if (error) return { error: error.message };
        return data && data.length ? data : { message: "Không có lịch hẹn nào sắp tới" };
    },
    get_services_price: async () => {
        try {
            const { data, error } = await supabase.from('service_price_matrix').select('*, service(service_name)').limit(30);
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
    search_store_info: async (query, genAI_instance) => {
        try {
            const embeddingModel = genAI_instance.getGenerativeModel({ model: "gemini-embedding-2" });
            const result = await embeddingModel.embedContent(query);
            const embedding = result.embedding.values;
            
            const { data, error } = await supabase.rpc('match_documents', {
                query_embedding: embedding,
                match_threshold: 0.7,
                match_count: 2
            });
            
            if (error || !data || data.length === 0) {
                return { context: "PawPal cung cấp dịch vụ chăm sóc cho chó, mèo, THỎ, và các thú cưng nhỏ khác. Các dịch vụ bao gồm: Spa, Grooming, Pet Hotel, Pet Taxi (đưa đón tận nhà), và cửa hàng Bán lẻ đồ dùng. Mở cửa 8h-20h. Vui lòng liên hệ hotline để biết chi tiết." };
            }
            return { context: data.map(d => d.content).join("\n") };
        } catch (e) {
            console.error("RAG Error:", e);
            return { context: "PawPal cung cấp dịch vụ chăm sóc cho chó, mèo, THỎ, và các thú cưng nhỏ khác. Các dịch vụ bao gồm: Spa, Grooming, Pet Hotel, Pet Taxi (đưa đón tận nhà), và cửa hàng Bán lẻ đồ dùng. Mở cửa 8h-20h. Vui lòng liên hệ hotline để biết chi tiết." };
        }
    }
};

const toolsDeclaration = [
    {
        functionDeclarations: [
            {
                name: "get_user_orders",
                description: "Lấy lên đến 10 đơn hàng mua sắm gần nhất của khách (dùng khi khách hỏi về đơn hàng của họ, bao gồm cả đơn thành công và đã hủy).",
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
        
        let systemInstruction = "Bạn là Trợ lý AI siêu cấp đáng yêu của cửa hàng chăm sóc thú cưng PawPal. Xưng hô với khách hàng là 'sen' (hoặc 'sen' kèm tên nếu khách xưng tên), xưng mình là 'PawPal', gọi thú cưng là 'bé cưng' hoặc 'boss'. Hãy tư vấn thật nhiệt tình, thân thiện, dễ thương và đáng yêu bằng tiếng Việt. KHÔNG SỬ DỤNG EMOJI. Chỉ dùng định dạng in đậm (**text**) để làm nổi bật các thông tin quan trọng.\n";
        
        systemInstruction += "QUY TẮC QUAN TRỌNG NHẤT (GUARDRAILS):\n";
        systemInstruction += "- ĐỐI TƯỢNG PHỤC VỤ: PawPal nhận chăm sóc tất cả thú cưng bao gồm Chó, Mèo, Thỏ, Hamster, v.v. Không bao giờ nói PawPal chỉ nhận chó mèo.\n";
        systemInstruction += "- ĐỊNH DẠNG ĐẸP MẮT: Khi liệt kê đơn hàng, lịch hẹn, hoặc thú cưng, TUYỆT ĐỐI KHÔNG DÙNG EMOJI. Hãy viết đậm (**text**) các thông tin quan trọng như Tên dịch vụ, Mã, Trạng thái, Tổng tiền để dễ đọc.\n";
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
        
        const history = messages.slice(0, -1).map(m => ({
            role: m.role, // 'user' or 'model'
            parts: [{ text: m.content }]
        }));

        const userMsg = messages[messages.length - 1].content;
        let streamResult;
        let chat;

        try {
            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction: systemInstruction,
                tools: toolsDeclaration
            });
            chat = model.startChat({ history: history });
            streamResult = await chat.sendMessageStream([{text: userMsg}]);
        } catch (err1) {
            console.warn("[API] gemini-1.5-flash failed (" + err1.message + "), falling back to gemini-1.5-pro");
            const fallbackModel = genAI.getGenerativeModel({ 
                model: "gemini-1.5-pro",
                systemInstruction: systemInstruction,
                tools: toolsDeclaration
            });
            chat = fallbackModel.startChat({ history: history });
            streamResult = await chat.sendMessageStream([{text: userMsg}]);
        }
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
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
                } else if (toolName === 'search_store_info') {
                    toolResult = await dbTools.search_store_info(toolArgs.query, genAI);
                }

                try {
                    const secondStream = await chat.sendMessageStream([{
                        functionResponse: {
                            name: toolName,
                            response: { result: toolResult }
                        }
                    }]);
                    
                    for await (const secondChunk of secondStream.stream) {
                        try {
                            const text = typeof secondChunk.text === 'function' ? secondChunk.text() : (secondChunk.text || '');
                            if (text) {
                                res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
                            }
                        } catch (textErr) {
                            // Ignore text extraction errors (e.g. if model returns another function call)
                            console.warn("Could not extract text from second chunk:", textErr.message);
                        }
                    }
                } catch (toolErr) {
                    console.error("[API] Function calling second stream failed:", toolErr.message);
                    res.write(`data: ${JSON.stringify({ error: toolErr.message, reply: 'PawPal đã tìm thấy thông tin nhưng gặp lỗi khi đọc dữ liệu. Quý khách vui lòng thử lại sau.' })}\n\n`);
                }
                break; // Xử lý xong function call thì thoát vòng lặp ngoài
            }
            
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
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('retryDelay') || msg.includes('quota')) {
            res.write(`data: ${JSON.stringify({ error: msg, reply: 'PawPal AI đang bận xử lý nhiều yêu cầu cùng lúc. Bạn vui lòng thử lại sau vài giây nhé! 🐾' })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ error: msg, reply: 'Xin lỗi, hệ thống PawPal AI đang gặp sự cố. Quý khách vui lòng thử lại sau.' })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    }
};
