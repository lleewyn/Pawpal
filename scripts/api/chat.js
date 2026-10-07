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

// Caching màng lọc và quy tắc Chatbot (TTL: 5 phút)
let cachedFilters = null;
let lastFiltersFetchTime = 0;
let cachedTriggers = null;
let lastTriggersFetchTime = 0;
let cachedSystemPrompts = null;
let lastPromptsFetchTime = 0;
const CACHE_TTL_RULES = 5 * 60 * 1000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const getGenAI = async () => {
    try {
        const CACHE_TTL = 10 * 60 * 1000;
        if (cachedApiKeys && (Date.now() - lastKeysFetchTime < CACHE_TTL)) {
            const keyObj = cachedApiKeys[currentKeyIndex % cachedApiKeys.length];
            currentKeyIndex++;
            const keyPrefix = keyObj.key_value.substring(0, 15);
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
            return { genAI: new GoogleGenerativeAI(selectedKey), keyPrefix };
        }

        cachedApiKeys = data;
        lastKeysFetchTime = Date.now();

        const keyObj = data[currentKeyIndex % data.length];
        currentKeyIndex++;
        
        const keyPrefix = keyObj.key_value.substring(0, 15);
        return { genAI: new GoogleGenerativeAI(keyObj.key_value), keyPrefix };
    } catch (err) {
        console.error("Lỗi khi lấy API key từ Supabase:", err);
        return null;
    }
};

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
        
        validUsersCache.set(userId, Date.now());
        return userId;
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        console.error("Auth error:", error);
        return null;
    }
    return user.id;
};

// ------------------------------------------------------------------------------
// TOXIC SHIELD & SENTIMENT RULES GETTERS (CACHED FROM SUPABASE LIVE DB)
// ------------------------------------------------------------------------------
async function getProfanityFilters() {
    if (cachedFilters && (Date.now() - lastFiltersFetchTime < CACHE_TTL_RULES)) {
        return cachedFilters;
    }
    try {
        const { data, error } = await supabase
            .from('chatbot_profanity_filter')
            .select('keyword, severity, action, replacement_text')
            .eq('is_active', true);
        if (!error && data) {
            cachedFilters = data;
            lastFiltersFetchTime = Date.now();
            return data;
        }
    } catch (e) {
        console.error('Lỗi tải profanity filters:', e.message);
    }
    return cachedFilters || [];
}

async function getSentimentTriggers() {
    if (cachedTriggers && (Date.now() - lastTriggersFetchTime < CACHE_TTL_RULES)) {
        return cachedTriggers;
    }
    try {
        const { data, error } = await supabase
            .from('chatbot_sentiment_trigger')
            .select('tier_level, trigger_pattern, weight, context_domain')
            .eq('is_active', true);
        if (!error && data) {
            cachedTriggers = data;
            lastTriggersFetchTime = Date.now();
            return data;
        }
    } catch (e) {
        console.error('Lỗi tải sentiment triggers:', e.message);
    }
    return cachedTriggers || [];
}

async function getActiveSystemPrompts() {
    if (cachedSystemPrompts && (Date.now() - lastPromptsFetchTime < CACHE_TTL_RULES)) {
        return cachedSystemPrompts;
    }
    try {
        const { data, error } = await supabase
            .from('chatbot_system_prompt')
            .select('prompt_key, persona_name, tone_of_voice, content')
            .eq('is_active', true);
        if (!error && data) {
            cachedSystemPrompts = data;
            lastPromptsFetchTime = Date.now();
            return data;
        }
    } catch (e) {
        console.error('Lỗi tải system prompts:', e.message);
    }
    return cachedSystemPrompts || [];
}

function evaluateToxicAndSentiment(userText, filters, triggers) {
    const lower = userText.toLowerCase();
    const detectedKeywords = [];
    let isToxic = false;
    let worstAction = 'none'; // 'none', 'mask', 'warn', 'escalate', 'block'
    let maskedText = userText;

    // 1. Quét màng lọc từ cấm
    filters.forEach(f => {
        const kw = (f.keyword || '').toLowerCase().trim();
        if (kw && lower.includes(kw)) {
            detectedKeywords.push(f.keyword);
            isToxic = true;
            try {
                const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                maskedText = maskedText.replace(regex, f.replacement_text || '***');
            } catch (_) {}

            if (f.action === 'block') {
                worstAction = 'block';
            } else if (f.action === 'escalate' && worstAction !== 'block') {
                worstAction = 'escalate';
            } else if (f.action === 'warn' && !['block', 'escalate'].includes(worstAction)) {
                worstAction = 'warn';
            } else if (f.action === 'mask' && worstAction === 'none') {
                worstAction = 'mask';
            }
        }
    });

    // 2. Chấm điểm cấp độ cảm xúc (1 - 6)
    let detectedLevel = 2; // Mặc định: Cấp 2 (Bình thường, trung lập)
    triggers.forEach(tr => {
        const patterns = (tr.trigger_pattern || '').split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
        for (const p of patterns) {
            if (lower.includes(p)) {
                if (tr.tier_level === 6 || tr.tier_level > detectedLevel) {
                    detectedLevel = tr.tier_level;
                }
            }
        }
    });

    // Nếu vi phạm từ cấm thì tối thiểu nâng lên Cấp 4 hoặc Cấp 5
    if (isToxic && detectedLevel < 4) {
        detectedLevel = worstAction === 'block' ? 5 : 4;
    }

    const isUrgent = detectedLevel >= 4;

    return {
        isToxic,
        detectedKeywords,
        worstAction,
        maskedText,
        detectedLevel,
        isUrgent
    };
}

async function checkCustomerVipAttention(customerId) {
    if (!customerId) return { isVip: false, reason: '' };
    try {
        const [ticketsRes, pointsRes] = await Promise.all([
            supabase.from('support_ticket').select('id', { count: 'exact', head: true }).eq('user_id', customerId),
            supabase.from('paw_point_transaction').select('points').eq('customer_id', customerId)
        ]);
        const ticketCount = ticketsRes.count || 0;
        let totalPoints = 0;
        if (pointsRes.data) {
            totalPoints = pointsRes.data.reduce((sum, p) => sum + (p.points || 0), 0);
        }

        if (ticketCount >= 2) {
            return {
                isVip: true,
                reason: `Khách từng có ${ticketCount} khiếu nại cũ (Cần chú ý cao độ)`
            };
        }
        if (totalPoints >= 500) {
            return {
                isVip: true,
                reason: `Khách hàng VIP Hạng ${totalPoints >= 1000 ? 'Kim Cương' : 'Vàng'} (${totalPoints} điểm)`
            };
        }
    } catch (e) {
        console.warn('Lỗi kiểm tra VIP Attention:', e.message);
    }
    return { isVip: false, reason: '' };
}

async function getPreviousCustomerSentiment(conversationId) {
    if (!conversationId) return null;
    try {
        const { data } = await supabase
            .from('chat_message')
            .select('sentiment_score')
            .eq('conversation_id', conversationId)
            .eq('sender_type', 'customer')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (data && data.sentiment_score !== null && data.sentiment_score !== undefined) {
            return Number(data.sentiment_score);
        }
    } catch (e) {
        console.warn('Lỗi lấy previous sentiment:', e.message);
    }
    return null;
}

async function getOrCreateConversation({ conversationId, customerId, sessionToken, sentimentLevel, isUrgent }) {
    try {
        if (conversationId) {
            const { data } = await supabase
                .from('chat_conversation')
                .select('*')
                .eq('id', conversationId)
                .maybeSingle();
            if (data) return data;
        }

        // Tìm phiên đang mở của khách hàng
        if (customerId) {
            const { data } = await supabase
                .from('chat_conversation')
                .select('*')
                .eq('customer_id', customerId)
                .in('status', ['bot_handling', 'waiting_agent'])
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (data) return data;
        } else if (sessionToken) {
            const { data } = await supabase
                .from('chat_conversation')
                .select('*')
                .eq('session_token', sessionToken)
                .in('status', ['bot_handling', 'waiting_agent'])
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (data) return data;
        }

        // Tạo phiên mới
        const { data, error } = await supabase
            .from('chat_conversation')
            .insert({
                customer_id: customerId || null,
                session_token: sessionToken || null,
                status: 'bot_handling',
                sentiment_level: sentimentLevel || 2,
                is_urgent: isUrgent || false,
                channel: 'web'
            })
            .select()
            .single();

        if (error) {
            console.error('Lỗi tạo phiên chat:', error.message);
            return null;
        }
        return data;
    } catch (e) {
        console.error('Exception khi tạo conversation:', e.message);
        return null;
    }
}

// ------------------------------------------------------------------------------
// DATABASE TOOLS CHO GEMINI FUNCTION CALLING
// ------------------------------------------------------------------------------
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
            // 1. Ưu tiên tra cứu trực tiếp trong kho tri thức 91 câu hỏi FAQ (Bảng 2: chatbot_knowledge_faq)
            const cleanQuery = (query || '').trim();
            let faqContext = '';
            if (cleanQuery) {
                const words = cleanQuery.split(/\s+/).filter(w => w.length > 2).slice(0, 3);
                const orClauses = words.map(w => `question.ilike.%${w}%,answer.ilike.%${w}%`).join(',');
                const { data: faqData } = await supabase
                    .from('chatbot_knowledge_faq')
                    .select('category, question, answer')
                    .or(orClauses || `question.ilike.%${cleanQuery}%`)
                    .limit(3);

                if (faqData && faqData.length > 0) {
                    faqContext = faqData.map(f => `[${f.category}] Hỏi: ${f.question} -> Đáp: ${f.answer}`).join("\n");
                }
            }

            // 2. Tra cứu vector match_documents nếu có
            let vectorContext = '';
            try {
                const embeddingModel = genAI_instance.getGenerativeModel({ model: "gemini-embedding-2" });
                const result = await embeddingModel.embedContent(cleanQuery);
                const embedding = result.embedding.values;
                
                const { data, error } = await supabase.rpc('match_documents', {
                    query_embedding: embedding,
                    match_threshold: 0.7,
                    match_count: 2
                });
                if (!error && data && data.length > 0) {
                    vectorContext = data.map(d => d.content).join("\n");
                }
            } catch (vErr) {
                // Vector search fallback silently
            }

            const combinedContext = [faqContext, vectorContext].filter(Boolean).join("\n\n");
            if (combinedContext) {
                return { context: combinedContext };
            }

            return { context: "PawPal cung cấp dịch vụ chăm sóc cho chó, mèo và các thú cưng. Các dịch vụ bao gồm: Pet Spa/Grooming, Pet Hotel (lưu trú qua đêm), Pet Taxi (đưa đón tận nhà), và sản phẩm bán lẻ. Vui lòng liên hệ hotline 1900 1234 để biết thêm chi tiết." };
        } catch (e) {
            console.error("Knowledge search error:", e);
            return { context: "PawPal cung cấp dịch vụ chăm sóc cho chó, mèo và các thú cưng. Vui lòng liên hệ hotline để được hỗ trợ." };
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

// ------------------------------------------------------------------------------
// MAIN HANDLER
// ------------------------------------------------------------------------------
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, conversationId: clientConvId, sessionToken } = req.body;
        const authHeader = req.headers['authorization'];
        const userId = await getUserIdFromToken(authHeader);
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        const userMsg = messages[messages.length - 1].content || '';

        // 1. NẠP MÀNG LỌC TOXIC SHIELD & SENTIMENT RULES TỪ DB
        const [filters, triggers, systemPrompts] = await Promise.all([
            getProfanityFilters(),
            getSentimentTriggers(),
            getActiveSystemPrompts()
        ]);

        // 2. ĐÁNH GIÁ NGÔN TỪ & ĐO LƯỜNG CẢM XÚC
        const evalResult = evaluateToxicAndSentiment(userMsg, filters, triggers);
        const { isToxic, detectedKeywords, worstAction, maskedText, detectedLevel, isUrgent } = evalResult;

        // 3. QUẢN LÝ PHIÊN HỘI THOẠI TRÊN SUPABASE (LIVE PERSISTENCE)
        const conversation = await getOrCreateConversation({
            conversationId: clientConvId,
            customerId: userId,
            sessionToken: sessionToken,
            sentimentLevel: detectedLevel,
            isUrgent: isUrgent
        });

        const activeConvId = conversation ? conversation.id : null;

        // 3B. KIỂM TRA KHÓA CHAT 15 PHÚT (NẾU ĐANG TRONG THỜI GIAN PHẠT)
        if (conversation && conversation.blocked_until && new Date(conversation.blocked_until) > new Date()) {
            const remainingSeconds = Math.max(0, Math.ceil((new Date(conversation.blocked_until) - Date.now()) / 1000));
            const blockMsg = `Khung chat đang tạm khóa do vi phạm ngôn từ. Vui lòng thử lại sau ${Math.ceil(remainingSeconds / 60)} phút nữa nhé.`;
            const wantsStream = (req.headers['accept'] && req.headers['accept'].includes('text/event-stream')) || req.body?.stream === true;
            if (wantsStream) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.write(`data: ${JSON.stringify({ error: 'blocked', blocked_until: conversation.blocked_until, remaining_seconds: remainingSeconds, message: blockMsg })}\n\n`);
                return res.end();
            } else {
                return res.status(403).json({
                    error: 'blocked',
                    blocked_until: conversation.blocked_until,
                    remaining_seconds: remainingSeconds,
                    message: blockMsg
                });
            }
        }

        // 3C. TÍNH TOÁN VI PHẠM TOXIC SHIELD & CẢNH BÁO
        let violationCount = conversation?.violation_count || 0;
        let blockedUntilTime = null;
        let warningPayload = null;

        if (isToxic) {
            violationCount += 1;
            if (violationCount >= 3 || worstAction === 'block') {
                blockedUntilTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                warningPayload = {
                    level: 3,
                    blocked_until: blockedUntilTime,
                    message: 'Phiên chat đã bị tạm khóa 15 phút do vi phạm tiêu chuẩn cộng đồng văn minh của PawPal.'
                };
            } else if (violationCount === 2) {
                warningPayload = {
                    level: 2,
                    message: 'Hệ thống ghi nhận ngôn từ chưa phù hợp. Nếu tiếp tục vi phạm, phiên chat sẽ tạm khóa 15 phút.'
                };
            } else {
                warningPayload = {
                    level: 1,
                    message: 'PawPal luôn sẵn sàng hỗ trợ hết mình. Sen vui lòng giữ ngôn từ lịch thiệp để chuyên viên hỗ trợ nhanh nhất nhé ạ!'
                };
            }
        }

        // 4. LƯU TIN NHẮN KHÁCH HÀNG VÀO CHAT_MESSAGE
        if (activeConvId) {
            // Lấy cảm xúc câu trước đó để đo lường biến thiên xu hướng (sentiment_trend)
            const prevSentiment = await getPreviousCustomerSentiment(activeConvId);
            let sentimentTrend = 'stable';
            let isSharpEscalation = false;

            if (prevSentiment !== null) {
                if (detectedLevel > prevSentiment) {
                    sentimentTrend = 'escalating';
                    if (detectedLevel - prevSentiment >= 2) {
                        isSharpEscalation = true;
                    }
                } else if (detectedLevel < prevSentiment) {
                    sentimentTrend = 'de_escalating';
                }
            }

            // Kiểm tra khách hàng VIP / Tiền sử khiếu nại (VIP Attention)
            const vipInfo = await checkCustomerVipAttention(userId);
            const isVipAttention = vipInfo.isVip;

            await supabase.from('chat_message').insert({
                conversation_id: activeConvId,
                sender_type: 'customer',
                sender_id: userId || null,
                sender_name: userId ? 'Khách hàng' : 'Khách vãng lai',
                content: maskedText,
                raw_content: userMsg,
                is_toxic: isToxic,
                sentiment_score: detectedLevel
            });

            const isAgentRequested = userMsg.toLowerCase().includes('gặp nhân viên') || 
                                     userMsg.toLowerCase().includes('người thật') || 
                                     userMsg.toLowerCase().includes('tư vấn viên');
            
            const nextStatus = conversation?.status === 'agent_handling' 
                ? 'agent_handling' 
                : (isAgentRequested || detectedLevel >= 4 || isSharpEscalation ? 'waiting_agent' : 'bot_handling');

            // Cập nhật cấp độ cảm xúc, xu hướng, vi phạm và trạng thái cho phiên
            const updatePayload = {
                status: nextStatus,
                sentiment_level: isAgentRequested ? Math.max(detectedLevel, 3) : detectedLevel,
                sentiment_trend: sentimentTrend,
                is_urgent: isUrgent || isAgentRequested || isSharpEscalation || isVipAttention,
                updated_at: new Date().toISOString()
            };

            if (isVipAttention && !conversation?.ai_summary) {
                updatePayload.ai_summary = `[VIP Attention] ${vipInfo.reason}. Cần ưu tiên phục vụ ân cần.`;
            }

            if (isToxic) {
                updatePayload.violation_count = violationCount;
                if (blockedUntilTime) {
                    updatePayload.blocked_until = blockedUntilTime;
                }
            }

            await supabase.from('chat_conversation').update(updatePayload).eq('id', activeConvId);

            // Ghi nhật ký nếu phát hiện vi phạm màng lọc
            if (isToxic && detectedKeywords.length > 0) {
                await supabase.from('chat_moderation_log').insert({
                    conversation_id: activeConvId,
                    customer_id: userId || null,
                    detected_keywords: detectedKeywords,
                    violation_count: violationCount,
                    action_taken: blockedUntilTime ? 'blocked_15m' : (worstAction === 'warn' ? 'warned' : 'masked'),
                    notes: `Từ ngữ vi phạm: ${detectedKeywords.join(', ')} | Lần vi phạm: ${violationCount}`
                });
            }
        }

        // 4B. NẾU CHUYÊN VIÊN CSKH ĐANG TRỰC TIẾP TIẾP QUẢN (HANDOVER ACTIVE):
        // PawPal Bot tạm ngưng trả lời tự động để nhường quyền cho nhân viên
        if (conversation && conversation.status === 'agent_handling') {
            const wantsStream = (req.headers['accept'] && req.headers['accept'].includes('text/event-stream')) || req.body?.stream === true;
            if (wantsStream) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.write(`data: ${JSON.stringify({ done: true, conversationId: activeConvId, is_handover: true, warning: warningPayload })}\n\n`);
                return res.end();
            } else {
                return res.status(200).json({
                    conversationId: activeConvId,
                    is_handover: true,
                    status: 'agent_handling',
                    warning: warningPayload
                });
            }
        }

        // 5. NẾU BỊ KHÓA 15 PHÚT DO VI PHẠM LẦN 3 HOẶC MỨC BLOCK: NGẮT NGAY VÀ PHẢN HỒI LỊCH SỰ (FAST-EXIT)
        if (blockedUntilTime || worstAction === 'block') {
            const blockReply = "Nội dung tin nhắn vi phạm tiêu chuẩn cộng đồng văn minh của PawPal. Khung chat tạm thời ngừng kết nối trong 15 phút. Mọi thắc mắc cần hỗ trợ, bạn vui lòng liên hệ hotline 1900 1234.";
            
            if (activeConvId) {
                await supabase.from('chat_message').insert({
                    conversation_id: activeConvId,
                    sender_type: 'bot',
                    sender_name: 'PawPal Bot',
                    content: blockReply
                });
            }

            const wantsStream = (req.headers['accept'] && req.headers['accept'].includes('text/event-stream')) || req.body?.stream === true;
            if (wantsStream) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.write(`data: ${JSON.stringify({ chunk: blockReply })}\n\n`);
                res.write(`data: ${JSON.stringify({ done: true, conversationId: activeConvId, is_toxic: true, sentiment_level: detectedLevel, warning: warningPayload })}\n\n`);
                return res.end();
            } else {
                return res.status(200).json({
                    reply: blockReply,
                    conversationId: activeConvId,
                    sentiment_level: detectedLevel,
                    is_toxic: true,
                    warning: warningPayload
                });
            }
        }

        // 6. THIẾT LẬP SYSTEM PROMPT CHO GEMINI
        let systemInstruction = req.body?.systemPrompt;
        if (!systemInstruction) {
            systemInstruction = "Bạn là Trợ lý AI chăm sóc thú cưng của hệ thống PawPal. Hãy tư vấn chu đáo, chuẩn mực, thân thiện bằng tiếng Việt. KHÔNG SỬ DỤNG EMOJI. Chỉ dùng in đậm (**text**) để làm nổi bật thông tin quan trọng.\n";
            systemInstruction += "- ĐỐI TƯỢNG PHỤC VỤ: PawPal nhận chăm sóc Chó, Mèo, Thỏ và thú cưng nhỏ. Không nói chỉ nhận chó mèo.\n";
            systemInstruction += "- KHÔNG ẢO GIÁC: Chỉ trả lời dựa trên dữ liệu do Tools trả về. Nếu không có dữ liệu, hãy nhận lỗi chân thành và chuyển nhân viên trong 15 phút.\n";
            systemInstruction += "- AN TOÀN Y TẾ: Tuyệt đối không tự ý chẩn đoán bệnh thú y, không kê đơn thuốc, không hứa bồi thường tiền mặt.\n";
            systemInstruction += "- ĐỊNH DẠNG THẺ TƯƠNG TÁC (RICH CARDS): Khi người dùng hỏi hoặc khi tra cứu thông tin đơn hàng, lịch hẹn, ưu đãi, hãy chèn khối thẻ trực quan:\n";
            systemInstruction += "  + Đơn hàng: :::order {\"code\": \"Mã_Đơn\", \"status\": \"Trạng_Thái\", \"total\": \"Tổng_Tiền\", \"items\": \"Tóm_Tắt_Món\"} :::\n";
            systemInstruction += "  + Lịch hẹn: :::booking {\"service\": \"Tên_Dịch_Vụ\", \"pet\": \"Tên_Bé\", \"time\": \"Giờ_Hẹn\", \"status\": \"Trạng_Thái\"} :::\n";
            systemInstruction += "  + Ưu đãi: :::voucher {\"code\": \"MÃ_VOUCHER\", \"discount\": \"Mức_Giảm\", \"minOrder\": \"Điều_Kiện\", \"expiry\": \"Hạn_Dùng\"} :::\n";

            // Bổ sung các chỉ thị cấu hình từ database
            if (systemPrompts && systemPrompts.length > 0) {
                systemInstruction += "\n--- QUY TẮC BỔ SUNG TỪ HỆ THỐNG ---\n";
                systemPrompts.slice(0, 5).forEach(p => {
                    systemInstruction += `${p.content}\n`;
                });
            }
        }

        // Bổ sung chỉ thị đặc thù theo cảm xúc
        if (detectedLevel === 6) {
            systemInstruction += "\n⚠️ [CHỈ THỊ KHẨN CẤP Y TẾ]: Khách hàng đang rất lo âu/hoảng sợ về sức khỏe thú cưng (dấu hiệu co giật, nôn mửa, sốc nhiệt, chảy máu). Hãy ưu tiên trấn an ngắn gọn, hướng dẫn sơ cứu an toàn cơ bản và khuyên đưa bé đến cơ sở thú y gần nhất hoặc gọi hotline 1900 1234. TUYỆT ĐỐI không chẩn đoán bừa bãi hay kê đơn thuốc.\n";
        } else if (detectedLevel >= 4) {
            systemInstruction += "\n⚠️ [CHỈ THỊ XOA DỊU KHÁCH HÀNG]: Khách hàng đang có dấu hiệu bức xúc hoặc không hài lòng. Hãy lắng nghe, nhận lỗi chân thành về trải nghiệm, không tranh luận hoặc đổ lỗi, và thông báo chuyên viên quản lý sẽ liên hệ hỗ trợ dứt điểm.\n";
        }

        if (userId) {
            systemInstruction += `\nTrạng thái: Đã đăng nhập (ID: ${userId}). Khi khách hỏi thông tin cá nhân (đơn hàng, lịch hẹn, thú cưng), HÃY ƯU TIÊN GỌI TOOL tương ứng.\n`;
        } else {
            systemInstruction += `\nTrạng thái: Khách Vãng Lai. Nếu khách yêu cầu lấy dữ liệu cá nhân, HÃY TỪ CHỐI gọi Tool và yêu cầu họ đăng nhập.\n`;
        }

        // 7. GỌI GEMINI MODEL (ÁP DỤNG SLIDING WINDOW & CONTEXT COMPACTION NẾU > 15 TIN NHẮN)
        const genAIResult = await getGenAI();
        if (!genAIResult) return res.status(500).json({ error: 'System AI Error: No API Keys available' });
        
        const { genAI, keyPrefix } = genAIResult;
        
        let history = [];
        if (messages.length > 15) {
            // Kỹ thuật Sliding Window & Context Compaction:
            // Tóm tắt ngắn gọn các tin nhắn cũ, chỉ giữ 6 tin nhắn trao đổi gần nhất
            const oldMessages = messages.slice(0, messages.length - 7);
            const recentMessages = messages.slice(messages.length - 7, -1);
            
            const oldSummaryLines = oldMessages
                .filter(m => m.content && m.content.length > 0)
                .slice(-4)
                .map(m => `${m.role === 'user' ? 'Khách' : 'Bot'}: ${m.content.slice(0, 80)}`)
                .join(' | ');

            history = [
                {
                    role: 'user',
                    parts: [{ text: `[Tóm tắt bối cảnh các câu trao đổi trước đó: ${oldSummaryLines}]` }]
                },
                {
                    role: 'model',
                    parts: [{ text: 'Dạ PawPal đã nắm toàn bộ bối cảnh trên, em đang tiếp tục hỗ trợ sen chu đáo ạ.' }]
                },
                ...recentMessages.map(m => ({
                    role: m.role,
                    parts: [{ text: m.content }]
                }))
            ];
        } else {
            history = messages.slice(0, -1).map(m => ({
                role: m.role,
                parts: [{ text: m.content }]
            }));
        }

        let streamResult;
        let chat;

        try {
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash",
                systemInstruction: systemInstruction,
                tools: toolsDeclaration
            });
            chat = model.startChat({ history: history });
            streamResult = await chat.sendMessageStream([{ text: maskedText }]);
        } catch (err1) {
            console.warn("[API] gemini-2.5-flash stream failed (" + err1.message + "), retrying...");
            const fallbackModel = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash",
                systemInstruction: systemInstruction,
                tools: toolsDeclaration
            });
            chat = fallbackModel.startChat({ history: history });
            streamResult = await chat.sendMessageStream([{ text: maskedText }]);
        }
        
        const wantsStream = (req.headers['accept'] && req.headers['accept'].includes('text/event-stream')) || req.body?.stream === true;
        let fullResponseText = '';

        if (wantsStream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-API-Key-Used', keyPrefix);
        }

        // 8. ĐỌC KẾT QUẢ VÀ XỬ LÝ TOOL CALLS
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
                                if (wantsStream) {
                                    res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
                                } else {
                                    fullResponseText += text;
                                }
                            }
                        } catch (textErr) {
                            console.warn('Could not extract text from second chunk:', textErr.message);
                        }
                    }
                } catch (toolErr) {
                    console.error('[API] Function calling second stream failed:', toolErr.message);
                    const errMsg = 'PawPal đã tìm thấy thông tin nhưng gặp lỗi khi đọc dữ liệu. Quý khách vui lòng thử lại sau.';
                    if (wantsStream) {
                        res.write(`data: ${JSON.stringify({ error: toolErr.message, reply: errMsg })}\n\n`);
                    } else {
                        fullResponseText += errMsg;
                    }
                }
                break;
            }
            
            const text = typeof chunk.text === 'function' ? chunk.text() : '';
            if (text) {
                if (wantsStream) {
                    res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
                } else {
                    fullResponseText += text;
                }
            }
        }

        // 9. LƯU TIN NHẮN PHẢN HỒI CỦA BOT VÀO CHAT_MESSAGE
        if (activeConvId && fullResponseText) {
            await supabase.from('chat_message').insert({
                conversation_id: activeConvId,
                sender_type: 'bot',
                sender_name: 'PawPal Bot',
                content: fullResponseText
            });
        }

        if (wantsStream) {
            res.write(`data: ${JSON.stringify({
                done: true,
                conversationId: activeConvId,
                sentiment_level: detectedLevel,
                is_toxic: isToxic,
                is_urgent: isUrgent,
                warning: warningPayload
            })}\n\n`);
            res.end();
        } else {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('X-API-Key-Used', keyPrefix);
            return res.status(200).json({
                reply: fullResponseText,
                conversationId: activeConvId,
                sentiment_level: detectedLevel,
                is_toxic: isToxic,
                is_urgent: isUrgent,
                warning: warningPayload,
                done: true
            });
        }

    } catch (error) {
        console.error('Backend Error:', error);
        
        const msg = error.message || '';
        let replyMsg = 'Xin lỗi, hệ thống PawPal AI đang gặp sự cố. Quý khách vui lòng thử lại sau.';
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('retryDelay') || msg.includes('quota')) {
            replyMsg = 'PawPal AI đang bận xử lý nhiều yêu cầu cùng lúc. Bạn vui lòng thử lại sau vài giây nhé! 🐾';
        }

        const wantsStream = (req.headers['accept'] && req.headers['accept'].includes('text/event-stream')) || req.body?.stream === true;
        if (wantsStream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.write(`data: ${JSON.stringify({ error: msg, reply: replyMsg })}\n\n`);
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        } else {
            return res.status(200).json({ error: msg, reply: replyMsg, done: true });
        }
    }
};
