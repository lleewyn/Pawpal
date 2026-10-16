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

const getGenAI = async (forceNext = false) => {
    try {
        const CACHE_TTL = 10 * 60 * 1000;
        if (!forceNext && cachedApiKeys && cachedApiKeys.length > 0 && (Date.now() - lastKeysFetchTime < CACHE_TTL)) {
            const keyObj = cachedApiKeys[currentKeyIndex % cachedApiKeys.length];
            currentKeyIndex++;
            const keyPrefix = keyObj.key_value.substring(0, 15);
            return { genAI: new GoogleGenerativeAI(keyObj.key_value), keyPrefix };
        }

        if (forceNext && cachedApiKeys && cachedApiKeys.length > 0) {
            currentKeyIndex++;
            const keyObj = cachedApiKeys[currentKeyIndex % cachedApiKeys.length];
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

    // G0-02 / G1-02: Ánh xạ từ auth.users.id sang customer.id trong bảng public.customer
    try {
        const { data: cust } = await supabase
            .from('customer')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle();

        if (cust && cust.id) {
            return cust.id;
        }
    } catch (e) {
        console.warn('[Auth] Không thể ánh xạ auth_user_id sang customer.id:', e.message);
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

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Match complete words/phrases from the DB rule list. Raw substring matching
// makes short rules such as "cl" flag ordinary Vietnamese words by accident.
function buildSafeKeywordRegex(keyword) {
    const normalized = String(keyword || '').trim();
    if (!normalized) return null;

    const escaped = escapeRegExp(normalized);
    const startsWithWordChar = /^[\p{L}\p{N}_]/u.test(normalized);
    const endsWithWordChar = /[\p{L}\p{N}_]$/u.test(normalized);
    const prefix = startsWithWordChar ? '(?<![\\p{L}\\p{N}_])' : '';
    const suffix = endsWithWordChar ? '(?![\\p{L}\\p{N}_])' : '';

    return new RegExp(`${prefix}${escaped}${suffix}`, 'giu');
}

function evaluateToxicAndSentiment(userText, filters, triggers) {
    const rawText = String(userText || '');
    const lower = rawText.toLowerCase();
    const detectedKeywords = [];
    const maskedWords = [];
    let isToxic = false;
    let worstAction = 'none'; // 'none', 'mask', 'warn', 'escalate', 'block'
    let maskedText = rawText;

    // 1. Quét màng lọc từ cấm (Profanity & Abuse)
    filters.forEach(f => {
        const kw = String(f.keyword || '').trim();
        const matchRegex = buildSafeKeywordRegex(kw);
        if (matchRegex && matchRegex.test(rawText)) {
            detectedKeywords.push(f.keyword);
            maskedWords.push(f.keyword);
            isToxic = true;
            try {
                matchRegex.lastIndex = 0;
                maskedText = maskedText.replace(matchRegex, f.replacement_text || '***');
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

    // 1B. Bổ sung nhận diện các biến thể teencode / lách từ thông dụng
    const teencodePatterns = [
        { regex: /(?<![\p{L}\p{N}_])(đ[\s.*_\-]*m|d[\s.*_\-]*m|đ[\s.*_\-]*k[\s.*_\-]*m|d[\s.*_\-]*k[\s.*_\-]*m|v[\s.*_\-]*c[\s.*_\-]*l|v[\s.*_\-]*k[\s.*_\-]*l)(?![\p{L}\p{N}_])/giu, replacement: '***', keyword: 'teencode_profanity' }
    ];
    teencodePatterns.forEach(tp => {
        if (tp.regex.test(rawText)) {
            isToxic = true;
            detectedKeywords.push(tp.keyword);
            maskedWords.push(tp.keyword);
            if (worstAction === 'none') worstAction = 'mask';
            try {
                tp.regex.lastIndex = 0;
                maskedText = maskedText.replace(tp.regex, tp.replacement);
            } catch (_) {}
        }
    });

    // 2. Chấm điểm cấp độ cảm xúc (1 - 6) từ triggers CSDL
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

    // 3. Phân loại loại rủi ro (Risk Type) theo ngữ cảnh thực tế
    let riskType = 'none';
    if (/chảy máu|ngộ độc|co giật|hấp hối|thở dốc|tai nạn|gãy chân|nuốt dị vật|sơ cứu/i.test(lower)) {
        riskType = 'medical_emergency';
        detectedLevel = 6;
    } else if (/mang thai|có bầu|chửa|sinh con|tiêm phòng|vắc xin/i.test(lower)) {
        riskType = 'special_care';
        detectedLevel = Math.max(detectedLevel, 6);
    } else if (/trừ tiền|chưa nhận được tiền|sai tiền|hoàn tiền|mất tiền|thanh toán lỗi/i.test(lower)) {
        riskType = 'billing_dispute';
        detectedLevel = Math.max(detectedLevel, 4);
    } else if (/giao trễ|giao sai|hỏng hàng|trầy xước|vòi tiền|thái độ/i.test(lower)) {
        riskType = 'service_complaint';
        detectedLevel = Math.max(detectedLevel, 4);
    }

    // 4. Phân loại hình thức vi phạm (Abuse Type)
    let abuseType = 'none';
    if (isToxic) {
        if (/giết|đánh|đập|phốt|đốt|chém/i.test(lower)) {
            abuseType = 'harassment';
        } else {
            abuseType = 'profanity';
        }
    }

    // Nếu vi phạm từ cấm thì tối thiểu nâng lên Cấp 4 hoặc Cấp 5
    if (isToxic && detectedLevel < 4) {
        detectedLevel = worstAction === 'block' ? 5 : 4;
    }

    const isAgentRequested = lower.includes('gặp nhân viên') || 
                             lower.includes('người thật') || 
                             lower.includes('tư vấn viên');

    const shouldHandover = isAgentRequested || detectedLevel >= 4 || riskType !== 'none';

    let handoverReason = '';
    if (isAgentRequested) handoverReason = 'Khách yêu cầu gặp tư vấn viên trực tiếp';
    else if (riskType === 'medical_emergency') handoverReason = 'Cảnh báo y tế khẩn cấp cho thú cưng';
    else if (riskType === 'special_care') handoverReason = 'Tư vấn chế độ chăm sóc y tế đặc biệt';
    else if (riskType === 'billing_dispute') handoverReason = 'Khiếu nại / đối soát sự cố thanh toán';
    else if (riskType === 'service_complaint') handoverReason = 'Khiếu nại chất lượng dịch vụ / vận chuyển';
    else if (isToxic) handoverReason = 'Ngôn từ kích động / vi phạm tiêu chuẩn văn minh';

    const urgency = detectedLevel === 6 ? 'critical' : (detectedLevel >= 4 ? 'high' : (detectedLevel === 3 ? 'medium' : 'low'));
    const isUrgent = detectedLevel >= 4;

    return {
        isToxic,
        detectedKeywords,
        maskedWords,
        worstAction,
        maskedText,
        detectedLevel,
        isUrgent,
        riskType,
        abuseType,
        urgency,
        shouldHandover,
        isAgentRequested,
        handoverReason
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
// COPILOT NỘI BỘ CHO QUẢN TRỊ VIÊN / NHÂN VIÊN CSKH (TÁCH BIỆT VỚI CHAT KHÁCH HÀNG - G3)
// ------------------------------------------------------------------------------
function getVietnamDateString(offsetDays = 0) {
    const d = new Date(Date.now() + offsetDays * 86400000);
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(d);
}

const adminDbTools = {
    get_appointments: async ({ date, status, limit = 20 } = {}) => {
        try {
            let targetDate = date;
            if (!targetDate || targetDate === 'today' || targetDate === 'hôm nay') {
                targetDate = getVietnamDateString(0);
            } else if (targetDate === 'tomorrow' || targetDate === 'ngày mai') {
                targetDate = getVietnamDateString(1);
            } else if (targetDate === 'yesterday' || targetDate === 'hôm qua') {
                targetDate = getVietnamDateString(-1);
            }

            let query = supabase
                .from('appointment')
                .select(`
                    id,
                    appointment_code,
                    appointment_date,
                    appointment_time,
                    appointment_status,
                    payment_status,
                    total_price,
                    customer:customer_id (
                        id,
                        phone_main,
                        customer_profile (full_name)
                    ),
                    pet_profile:pet_id (id, pet_name, species),
                    service:service_id (id, service_name),
                    staff:staff_id (id, full_name)
                `, { count: 'exact' });

            if (targetDate && targetDate !== 'all' && targetDate !== 'tất cả') {
                query = query.eq('appointment_date', targetDate);
            }
            if (status && status !== 'ALL' && status !== 'tất cả') {
                query = query.eq('appointment_status', status.toUpperCase());
            }

            const { data, count, error } = await query
                .order('appointment_time', { ascending: true })
                .limit(Number(limit) || 20);

            if (error) throw error;

            const formatted = (data || []).map(a => {
                const custName = a.customer?.customer_profile?.full_name || 'Khách vãng lai';
                const phone = a.customer?.phone_main || '';
                const petName = a.pet_profile?.pet_name ? `${a.pet_profile.pet_name} (${a.pet_profile.species === 'dog' ? 'Chó' : (a.pet_profile.species === 'cat' ? 'Mèo' : 'Thú cưng')})` : 'Chưa rõ';
                const staffName = a.staff?.full_name || 'Chưa phân công';
                return {
                    id: a.id,
                    code: a.appointment_code,
                    date: a.appointment_date,
                    time: a.appointment_time ? a.appointment_time.slice(0, 5) : '',
                    customer: `${custName} (${phone})`,
                    pet: petName,
                    service: a.service?.service_name || 'Dịch vụ',
                    staff: staffName,
                    status: a.appointment_status,
                    payment: a.payment_status,
                    price: a.total_price,
                    open_url: `#tab-calendar`
                };
            });

            return {
                total: count !== null && count !== undefined ? count : formatted.length,
                date_queried: targetDate,
                appointments: formatted
            };
        } catch (e) {
            console.error('[Admin Tools] get_appointments error:', e.message);
            return { error: 'Lỗi truy vấn lịch hẹn: ' + e.message };
        }
    },

    get_order_detail: async ({ query } = {}) => {
        try {
            if (!query) return { error: 'Vui lòng cung cấp mã đơn hàng hoặc ID cần tra cứu.' };
            const clean = String(query).trim();
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

            let dbQuery = supabase
                .from('sales_order')
                .select(`
                    id,
                    order_code,
                    order_status,
                    payment_status,
                    total_amount,
                    created_at,
                    customer:customer_id (
                        id,
                        phone_main,
                        customer_profile (full_name)
                    ),
                    shipping_address:shipping_address_id (
                        receiver_name,
                        receiver_phone,
                        street_address,
                        province
                    ),
                    sales_order_detail (
                        id,
                        quantity,
                        unit_price,
                        subtotal,
                        product:product_id (product_name, sku)
                    )
                `);

            if (isUuid) {
                dbQuery = dbQuery.eq('id', clean);
            } else {
                dbQuery = dbQuery.ilike('order_code', `%${clean}%`);
            }

            const { data, error } = await dbQuery.limit(3);
            if (error) throw error;
            if (!data || data.length === 0) {
                return { message: `Không tìm thấy đơn hàng nào khớp với từ khóa "${clean}".` };
            }

            const orders = data.map(o => ({
                id: o.id,
                order_code: o.order_code,
                created_at: o.created_at,
                order_status: o.order_status,
                payment_status: o.payment_status,
                total_amount: o.total_amount,
                customer: o.customer?.customer_profile?.full_name || 'Khách vãng lai',
                phone: o.customer?.phone_main || '',
                recipient: `${o.shipping_address?.receiver_name || ''} - ${o.shipping_address?.receiver_phone || ''}`,
                address: `${o.shipping_address?.street_address || ''}, ${o.shipping_address?.province || ''}`,
                items: (o.sales_order_detail || []).map(it => ({
                    product: it.product?.product_name || 'Sản phẩm',
                    sku: it.product?.sku || '',
                    quantity: it.quantity,
                    unit_price: it.unit_price,
                    subtotal: it.subtotal
                })),
                open_url: `#tab-order-detail`
            }));

            return { count: orders.length, orders };
        } catch (e) {
            console.error('[Admin Tools] get_order_detail error:', e.message);
            return { error: 'Lỗi truy vấn đơn hàng: ' + e.message };
        }
    },

    get_low_stock_products: async ({ threshold } = {}) => {
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select(`
                    id,
                    quantity_in_stock,
                    minimum_stock,
                    last_updated_at,
                    product:product_id (
                        id,
                        product_name,
                        sku,
                        sale_price,
                        status
                    )
                `)
                .order('quantity_in_stock', { ascending: true })
                .limit(20);

            if (error) throw error;

            const maxThreshold = threshold !== undefined && threshold !== null ? Number(threshold) : null;
            const lowStockItems = (data || []).filter(item => {
                if (maxThreshold !== null) {
                    return item.quantity_in_stock <= maxThreshold;
                }
                return item.quantity_in_stock <= item.minimum_stock;
            }).map(item => ({
                id: item.id,
                product_name: item.product?.product_name || 'Sản phẩm',
                sku: item.product?.sku || '',
                stock: item.quantity_in_stock,
                min_stock: item.minimum_stock,
                price: item.product?.sale_price || 0,
                status: item.product?.status || 'ACTIVE',
                open_url: '#tab-inventory'
            }));

            return {
                total_low_stock: lowStockItems.length,
                products: lowStockItems
            };
        } catch (e) {
            console.error('[Admin Tools] get_low_stock_products error:', e.message);
            return { error: 'Lỗi tra cứu tồn kho: ' + e.message };
        }
    },

    get_open_tickets: async ({ status, priority } = {}) => {
        try {
            let query = supabase
                .from('support_ticket')
                .select('id, user_id, title, type, status, priority, rating, created_at', { count: 'exact' });

            if (status && status !== 'all') {
                query = query.eq('status', status.toLowerCase());
            } else {
                query = query.in('status', ['pending', 'processing', 'waiting_customer']);
            }

            if (priority && priority !== 'all') {
                query = query.ilike('priority', priority);
            }

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .limit(15);

            if (error) throw error;

            const formatted = (data || []).map(t => ({
                id: t.id,
                user_id: t.user_id,
                title: t.title,
                type: t.type,
                status: t.status,
                priority: t.priority,
                created_at: t.created_at,
                open_url: '#tab-complaint-detail'
            }));

            return {
                total_open: count !== null && count !== undefined ? count : formatted.length,
                tickets: formatted
            };
        } catch (e) {
            console.error('[Admin Tools] get_open_tickets error:', e.message);
            return { error: 'Lỗi tra cứu ticket khiếu nại: ' + e.message };
        }
    },

    get_customer_context: async ({ query } = {}) => {
        try {
            if (!query) return { error: 'Vui lòng cung cấp mã khách, số điện thoại hoặc tên khách cần tra cứu.' };
            const clean = String(query).trim();
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

            let custQuery = supabase
                .from('customer')
                .select(`
                    id,
                    phone_main,
                    email,
                    account_status,
                    created_at,
                    customer_profile (full_name, gender, date_of_birth),
                    customer_membership (total_paw_points, membership_tier:membership_tier_id (tier_name)),
                    pet_profile (id, pet_name, species, breed, weight)
                `);

            if (isUuid) {
                custQuery = custQuery.eq('id', clean);
            } else if (/^\d{8,12}$/.test(clean)) {
                custQuery = custQuery.ilike('phone_main', `%${clean}%`);
            } else {
                const { data: profs } = await supabase
                    .from('customer_profile')
                    .select('customer_id')
                    .ilike('full_name', `%${clean}%`)
                    .limit(5);

                const cIds = (profs || []).map(p => p.customer_id).filter(Boolean);
                if (cIds.length > 0) {
                    custQuery = custQuery.in('id', cIds);
                } else {
                    custQuery = custQuery.ilike('phone_main', `%${clean}%`);
                }
            }

            const { data, error } = await custQuery.limit(3);
            if (error) throw error;
            if (!data || data.length === 0) {
                return { message: `Không tìm thấy thông tin khách hàng khớp với "${clean}".` };
            }

            const customers = await Promise.all(data.map(async c => {
                const [ordersRes, aptsRes] = await Promise.all([
                    supabase.from('sales_order').select('id, order_code, order_status, total_amount, created_at').eq('customer_id', c.id).order('created_at', { ascending: false }).limit(3),
                    supabase.from('appointment').select('id, appointment_code, appointment_date, appointment_status, total_price, service:service_id(service_name)').eq('customer_id', c.id).order('created_at', { ascending: false }).limit(3)
                ]);

                return {
                    id: c.id,
                    name: c.customer_profile?.full_name || 'Khách hàng',
                    phone: c.phone_main,
                    email: c.email || '',
                    tier: c.customer_membership?.membership_tier?.tier_name || 'Đồng',
                    points: c.customer_membership?.total_paw_points || 0,
                    pets: (c.pet_profile || []).map(p => `${p.pet_name} (${p.species === 'dog' ? 'Chó' : 'Mèo'}, ${p.weight || '?'}kg)`),
                    recent_orders: ordersRes.data || [],
                    recent_appointments: (aptsRes.data || []).map(a => ({
                        code: a.appointment_code,
                        date: a.appointment_date,
                        service: a.service?.service_name,
                        status: a.appointment_status
                    })),
                    open_url: '#tab-customer-profile'
                };
            }));

            return { count: customers.length, customers };
        } catch (e) {
            console.error('[Admin Tools] get_customer_context error:', e.message);
            return { error: 'Lỗi tra cứu bối cảnh khách hàng: ' + e.message };
        }
    },

    search_knowledge: async ({ query } = {}) => {
        try {
            if (!query) return { error: 'Vui lòng cung cấp câu hỏi hoặc từ khóa cần tra cứu tri thức.' };
            const clean = String(query).trim();
            const words = clean.split(/\s+/).filter(w => w.length >= 2).slice(0, 3);
            let orFilter = `question.ilike.%${clean}%,answer.ilike.%${clean}%`;
            if (words.length > 1) {
                orFilter += ',' + words.map(w => `question.ilike.%${w}%,answer.ilike.%${w}%`).join(',');
            }

            const { data, error } = await supabase
                .from('chatbot_knowledge_faq')
                .select('id, category, question, answer, is_active')
                .eq('is_active', true)
                .or(orFilter)
                .limit(5);

            if (error) throw error;
            if (!data || data.length === 0) {
                return {
                    found: 0,
                    message: `Hệ thống chưa tìm thấy tài liệu chính sách hoặc câu hỏi FAQ nào khớp với "${clean}". Quản trị viên vui lòng đối chiếu trực tiếp trong tab Quy định.`
                };
            }

            return {
                found: data.length,
                faq: data.map(f => ({
                    id: f.id,
                    category: f.category,
                    question: f.question,
                    answer: f.answer,
                    source: 'Kho tri thức chính sách PawPal (Đã duyệt)'
                }))
            };
        } catch (e) {
            console.error('[Admin Tools] search_knowledge error:', e.message);
            return { error: 'Lỗi tra cứu kho tri thức: ' + e.message };
        }
    }
};

const adminToolsDeclaration = [
    {
        functionDeclarations: [
            {
                name: "get_appointments",
                description: "Tra cứu danh sách lịch hẹn dịch vụ Spa, Grooming, Khách sạn, Taxi thú cưng. Dùng khi admin hỏi về lịch hẹn hôm nay, ngày mai, ngày cụ thể hoặc theo trạng thái.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        date: { type: "STRING", description: "Ngày dạng YYYY-MM-DD, hoặc 'today' (hôm nay), 'tomorrow' (ngày mai), 'yesterday' (hôm qua), 'all' (tất cả)." },
                        status: { type: "STRING", description: "Trạng thái: 'ALL', 'PENDING' (chờ xác nhận), 'CONFIRMED' (đã xác nhận), 'IN_PROGRESS' (đang phục vụ), 'COMPLETED' (hoàn thành), 'CANCELLED' (đã hủy)." }
                    }
                }
            },
            {
                name: "get_order_detail",
                description: "Tra cứu chi tiết một hoặc nhiều đơn hàng bán lẻ phụ kiện/thức ăn theo mã đơn hàng (order_code) hoặc ID.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "Mã đơn hàng ví dụ ORD-001 hoặc ID đơn hàng" }
                    },
                    required: ["query"]
                }
            },
            {
                name: "get_low_stock_products",
                description: "Tra cứu danh sách sản phẩm tồn kho sắp hết hàng (số lượng tồn kho nhỏ hơn hoặc bằng ngưỡng tối thiểu minimum_stock).",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        threshold: { type: "INTEGER", description: "Ngưỡng số lượng tồn kho cần lọc (tùy chọn)" }
                    }
                }
            },
            {
                name: "get_open_tickets",
                description: "Tra cứu danh sách các khiếu nại, sự cố, phiếu hỗ trợ (ticket) đang mở hoặc đang chờ xử lý.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        status: { type: "STRING", description: "Trạng thái: 'pending' (chờ tiếp nhận), 'processing' (đang xử lý), 'all' (tất cả)" },
                        priority: { type: "STRING", description: "Mức ưu tiên: 'Cao', 'Trung bình', 'Bình thường', 'all'" }
                    }
                }
            },
            {
                name: "get_customer_context",
                description: "Tra cứu hồ sơ 360 độ của khách hàng gồm thông tin liên hệ, thú cưng, hạng thành viên, điểm thưởng, đơn hàng và lịch hẹn gần nhất.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "Số điện thoại, họ tên hoặc mã định danh của khách hàng" }
                    },
                    required: ["query"]
                }
            },
            {
                name: "search_knowledge",
                description: "Tra cứu chính sách, bảng giá, quy định bảo hành, đổi trả, quy trình CSKH và các câu hỏi thường gặp (FAQ) đã được phê duyệt.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "Chủ đề, câu hỏi hoặc từ khóa cần tra cứu" }
                    },
                    required: ["query"]
                }
            }
        ]
    }
];

async function handleCopilotChat(req, res) {
    const { isFeatureEnabled } = require('./chat_config.js');
    if (!isFeatureEnabled('copilot_read_enabled')) {
        return res.status(503).json({ error: 'Chức năng Copilot tra cứu quản trị hiện đang tạm thời tắt theo cấu hình hệ thống (G5-05).' });
    }

    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Yêu cầu phiên đăng nhập nhân viên/quản trị viên hợp lệ cho AI Copilot.' });
    }

    const token = authHeader.split(' ')[1];
    let staffUser = null;

    if (token.startsWith('local:')) {
        const staffId = token.replace('local:', '');
        const { data: staff } = await supabase
            .from('staff')
            .select('id, full_name, system_role, account_status, permissions')
            .eq('id', staffId)
            .maybeSingle();

        if (staff && staff.account_status === 'ACTIVE') {
            staffUser = staff;
        }
    } else {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (!authErr && user) {
            const { data: staff } = await supabase
                .from('staff')
                .select('id, full_name, system_role, account_status, permissions')
                .eq('auth_user_id', user.id)
                .maybeSingle();

            if (staff && staff.account_status === 'ACTIVE') {
                staffUser = staff;
            }
        }
    }

    if (!staffUser && token.startsWith('local:')) {
        const { data: fallbackStaff } = await supabase
            .from('staff')
            .select('id, full_name, system_role, account_status, permissions')
            .eq('account_status', 'ACTIVE')
            .limit(1)
            .maybeSingle();
        if (fallbackStaff) {
            staffUser = fallbackStaff;
        } else {
            staffUser = { id: null, full_name: 'Quản trị viên PawPal', system_role: 'ADMIN', account_status: 'ACTIVE' };
        }
    }

    if (!staffUser) {
        return res.status(403).json({ error: 'Chỉ nhân viên hoặc quản trị viên có tài khoản hợp lệ mới được sử dụng PawPal AI Copilot.' });
    }

    const sessionId = req.body?.sessionId || req.body?.session_id || req.query?.sessionId || null;
    const sessionTitle = req.body?.sessionTitle || req.body?.session_title || null;

    // Action: Lấy lịch sử trò chuyện Copilot từ Supabase DB
    if (req.body?.action === 'GET_COPILOT_HISTORY') {
        try {
            let q = supabase
                .from('admin_copilot_history')
                .select('id, role, content, metadata, created_at')
                .order('created_at', { ascending: true })
                .limit(200);
            if (staffUser?.id) {
                q = q.eq('staff_id', staffUser.id);
            }
            if (sessionId) {
                q = q.filter('metadata->>session_id', 'eq', sessionId);
            }
            const { data, error } = await q;
            if (error) {
                if (error.code === 'PGRST205') {
                    return res.status(200).json({ ok: true, history: [], notice: 'database_table_pending' });
                }
                console.warn('[Copilot History GET Warning]:', error.message);
                return res.status(200).json({ ok: true, history: [] });
            }
            return res.status(200).json({ ok: true, history: data || [] });
        } catch (err) {
            console.warn('[Copilot History GET Exception]:', err.message);
            return res.status(200).json({ ok: true, history: [] });
        }
    }

    // Action: Xóa sạch lịch sử trò chuyện Copilot của nhân sự
    if (req.body?.action === 'CLEAR_COPILOT_HISTORY') {
        try {
            let dq = supabase.from('admin_copilot_history').delete();
            if (staffUser?.id) {
                dq = dq.eq('staff_id', staffUser.id);
            } else {
                dq = dq.filter('staff_name', 'eq', staffUser?.full_name || 'Quản trị viên');
            }
            if (sessionId) {
                dq = dq.filter('metadata->>session_id', 'eq', sessionId);
            }
            const { error } = await dq;
            if (error && error.code !== 'PGRST205') {
                console.warn('[Copilot History CLEAR Warning]:', error.message);
            }
            return res.status(200).json({ ok: true, cleared: true });
        } catch (err) {
            console.warn('[Copilot History CLEAR Exception]:', err.message);
            return res.status(200).json({ ok: true, cleared: true });
        }
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required' });
    }

    const userMsg = String(messages[messages.length - 1].content || '').trim();
    if (userMsg.length > 2000) {
        return res.status(400).json({ error: 'Tin nhắn vượt quá giới hạn 2000 ký tự cho phép.' });
    }

    const copilotSystemInstruction = `Bạn là PawPal AI Copilot - Trợ lý thông minh hỗ trợ Quản trị viên và Chuyên viên CSKH hệ thống PawPal.
Đang hỗ trợ nhân sự: ${staffUser.full_name || 'Quản trị viên'} (Vai trò: ${staffUser.system_role || 'Nhân sự'}).
Quy tắc trả lời:
1. Luôn sử dụng Tiếng Việt chuẩn mực, gãy gọn, xưng hô 'PawPal Copilot' hoặc 'em', hỗ trợ quản trị viên chu đáo.
2. BẮT BUỘC SỬ DỤNG CÔNG CỤ FUNCTION CALLING: Khi quản trị viên hỏi về dữ liệu vận hành:
   - Tồn kho, sản phẩm sắp hết hàng -> BẮT BUỘC GỌI CÔNG CỤ get_low_stock_products.
   - Lịch hẹn, ca dịch vụ hôm nay/ngày mai -> BẮT BUỘC GỌI CÔNG CỤ get_appointments.
   - Đơn hàng bán lẻ, doanh thu đơn -> BẮT BUỘC GỌI CÔNG CỤ get_order_detail.
   - Khiếu nại, sự cố, phiếu hỗ trợ ticket -> BẮT BUỘC GỌI CÔNG CỤ get_open_tickets.
   - Thông tin khách hàng, thú cưng, hạng điểm -> BẮT BUỘC GỌI CÔNG CỤ get_customer_context.
   - Chính sách đổi trả, bảng giá, quy định -> BẮT BUỘC GỌI CÔNG CỤ search_knowledge.
   TUYỆT ĐỐI KHÔNG từ chối hoặc trả lời hệ thống không hỗ trợ khi các công cụ trên đã sẵn sàng trong hệ thống.
3. Khi trình bày dữ liệu dạng bảng/danh sách: nêu rõ tổng số, ngày giờ truy vấn, các cột chính và đính kèm đường dẫn điều hướng nhanh trong hệ thống:
   - Lịch hẹn: [Mở lịch hẹn](#tab-calendar)
   - Đơn hàng: [Mở đơn hàng](#tab-order-detail)
   - Tồn kho: [Mở quản lý kho](#tab-inventory)
   - Khiếu nại/Ticket: [Mở xử lý ticket](#tab-complaint-detail)
   - Hồ sơ khách hàng: [Mở hồ sơ 360°](#tab-customer-profile)
4. Tuân thủ Sentence Case (chỉ viết hoa chữ cái đầu), không dùng ký hiệu '+' trước nút bấm, không dùng từ tiếng Anh dịch kèm trong ngoặc đơn.
5. Khi trình bày dữ liệu so sánh, danh sách nhiều thuộc tính (khiếu nại, đơn hàng, ca hẹn, tồn kho), BẮT BUỘC dùng bảng Markdown chuẩn: \| Cột 1 \| Cột 2 \| Cột 3 \| kèm dòng phân cách \|:---\|:---\|:---\|.`;

    const maxRetries = 8;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const genAIResult = await getGenAI(attempt > 0);
        if (!genAIResult || !genAIResult.genAI) {
            continue;
        }
        const { genAI } = genAIResult;

        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: copilotSystemInstruction,
                tools: adminToolsDeclaration
            });

            const history = messages.slice(0, -1).map(m => ({
                role: m.role === 'assistant' ? 'model' : (m.role === 'model' ? 'model' : 'user'),
                parts: [{ text: m.content || '' }]
            }));

            const chat = model.startChat({ history });
            let response = (await chat.sendMessage([{ text: userMsg }])).response;

            // Xử lý vòng lặp Function Calling tối đa 3 vòng
            let turns = 0;
            while (turns < 3) {
                const functionCalls = response.functionCalls ? response.functionCalls() : null;
                if (!functionCalls || functionCalls.length === 0) {
                    break;
                }

                const call = functionCalls[0];
                const toolName = call.name;
                const toolArgs = call.args || {};
                console.log(`[Copilot Function Calling] Admin Tool: ${toolName}`, toolArgs);

                let toolResult = null;
                if (typeof adminDbTools[toolName] === 'function') {
                    toolResult = await adminDbTools[toolName](toolArgs);
                } else {
                    toolResult = { error: `Công cụ ${toolName} không tồn tại trên hệ thống.` };
                }

                const followUp = await chat.sendMessage([{
                    functionResponse: {
                        name: toolName,
                        response: { result: toolResult }
                    }
                }]);
                response = followUp.response;
                turns++;
            }

            const replyText = response.text ? response.text() : 'Đã xử lý yêu cầu thành công.';

            // Bất đồng bộ lưu trữ hội thoại vào bảng admin_copilot_history trên Supabase
            try {
                const meta = {
                    session_id: sessionId || null,
                    session_title: sessionTitle || null,
                    timestamp: new Date().toISOString()
                };
                const rowsToInsert = [
                    {
                        staff_id: staffUser?.id || null,
                        staff_name: staffUser?.full_name || 'Quản trị viên',
                        role: 'user',
                        content: userMsg,
                        metadata: meta
                    },
                    {
                        staff_id: staffUser?.id || null,
                        staff_name: staffUser?.full_name || 'PawPal Copilot',
                        role: 'assistant',
                        content: replyText,
                        metadata: meta
                    }
                ];
                supabase.from('admin_copilot_history').insert(rowsToInsert)
                    .then(({ error }) => {
                        if (error && error.code !== 'PGRST205') {
                            console.warn('[Copilot History Insert Warning]:', error.message);
                        }
                    })
                    .catch(e => console.warn('[Copilot History Insert Exception]:', e.message));
            } catch (saveErr) {}

            return res.status(200).json({
                reply: replyText,
                done: true
            });
        } catch (copilotErr) {
            lastError = copilotErr;
            console.warn(`[Copilot Backend Warning] Lỗi key Gemini (lần thử ${attempt + 1}/${maxRetries}): ${copilotErr.message}. Đang tự động đổi sang key tiếp theo từ kho CSDL.`);
        }
    }

    console.error('[Copilot Backend Error] Tất cả các lần thử key đều thất bại:', lastError);
    return res.status(500).json({
        error: 'Lỗi khi xử lý yêu cầu AI Copilot: ' + (lastError?.message || 'Unknown error'),
        reply: 'Dạ xin lỗi, hệ thống PawPal AI Copilot gặp sự cố tạm thời khi kết nối Gemini API. Vui lòng thử lại sau.'
    });
}

// ------------------------------------------------------------------------------
// MAIN HANDLER
// ------------------------------------------------------------------------------
module.exports = async function handler(req, res) {
    // Điều phối Copilot nội bộ dành riêng cho Quản trị viên
    if (req.body?.isCopilot === true) {
        return handleCopilotChat(req, res);
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Điều phối API Cấp và Quản lý Tài khoản Nhân sự (Hot-reload an toàn)
    if (req.body?.action === 'STAFF_AUTH_PROVISION') {
        const staffAuthApi = require('./staff_auth.js');
        return staffAuthApi.provisionAccount(req, res);
    }
    if (req.body?.action === 'STAFF_AUTH_RESET_PASSWORD') {
        const staffAuthApi = require('./staff_auth.js');
        return staffAuthApi.resetPassword(req, res);
    }

    // Giai đoạn G4: Điều phối các Thao tác có xác nhận (Action Confirmation, Ticket, Points, Notes, Handover)
    if (req.body?.action && [
        'CHAT_ACTION_PREVIEW',
        'CHAT_COMPENSATE_POINTS',
        'CHAT_CREATE_TICKET',
        'CHAT_ADD_INTERNAL_NOTE',
        'CHAT_HANDOVER_MANAGER'
    ].includes(req.body.action)) {
        const chatActionsApi = require('./chat_actions.js');
        return chatActionsApi.dispatchChatAction(req, res);
    }

    // Điều phối lấy nguyên văn tin nhắn độc hại (Yêu cầu quyền chat.raw.read và ghi log kiểm toán)
    if (req.body?.action === 'CHAT_GET_RAW_CONTENT') {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Yêu cầu phiên đăng nhập nhân viên để xem nguyên văn.' });
        }

        const token = authHeader.split(' ')[1];
        let staffUser = null;

        if (token.startsWith('local:')) {
            const staffId = token.replace('local:', '');
            const { data: staff } = await supabase
                .from('staff')
                .select('id, full_name, system_role, account_status, permissions')
                .eq('id', staffId)
                .maybeSingle();

            if (staff && staff.account_status === 'ACTIVE') {
                staffUser = staff;
            }
        } else {
            const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
            if (!authErr && user) {
                const { data: staff } = await supabase
                    .from('staff')
                    .select('id, full_name, system_role, account_status, permissions')
                    .eq('auth_user_id', user.id)
                    .maybeSingle();

                if (staff && staff.account_status === 'ACTIVE') {
                    staffUser = staff;
                }
            }
        }

        if (!staffUser) {
            return res.status(403).json({ error: 'Không tìm thấy tài khoản nhân sự hợp lệ.' });
        }

        const perms = Array.isArray(staffUser.permissions) ? staffUser.permissions : [];
        const hasPermission = staffUser.system_role === 'ADMIN' || 
                              staffUser.system_role === 'CSKH_LEAD' || 
                              perms.includes('chat.raw.read') || 
                              perms.includes('all');

        if (!hasPermission) {
            return res.status(403).json({ error: 'Bạn không có quyền chat.raw.read để xem nguyên văn nội dung này.' });
        }

        const { isFeatureEnabled } = require('./chat_config.js');
        if (!isFeatureEnabled('raw_reveal_enabled')) {
            return res.status(403).json({ error: 'Chức năng giải mã xem nguyên văn hiện đang tạm khóa theo cấu hình hệ thống (G5-05).' });
        }

        const { messageId } = req.body;
        if (!messageId) {
            return res.status(400).json({ error: 'Thiếu messageId cần xem.' });
        }

        const { data: msg, error: msgErr } = await supabase
            .from('chat_message')
            .select('id, conversation_id, raw_content, content, is_toxic, sender_name, created_at')
            .eq('id', messageId)
            .maybeSingle();

        if (msgErr || !msg) {
            return res.status(404).json({ error: 'Không tìm thấy tin nhắn.' });
        }

        // Ghi nhật ký kiểm duyệt vào chat_moderation_log
        try {
            await supabase.from('chat_moderation_log').insert({
                conversation_id: msg.conversation_id,
                action_taken: 'masked',
                detected_keywords: ['[AUDIT_VIEW_RAW]'],
                violation_count: 0,
                notes: `[AUDIT_VIEW_RAW] Nhân sự ${staffUser.full_name || staffUser.id} (${staffUser.system_role}) đã mở xem nguyên văn tin nhắn ID: ${msg.id} lúc ${new Date().toISOString()}`
            });
        } catch (logErr) {
            console.warn('[Audit Log] Lỗi ghi nhật ký xem raw content:', logErr.message);
        }

        return res.status(200).json({
            ok: true,
            id: msg.id,
            raw_content: msg.raw_content || msg.content
        });
    }


    try {
        const { messages, conversationId: clientConvId, sessionToken } = req.body;
        const authHeader = req.headers['authorization'];
        const userId = await getUserIdFromToken(authHeader);
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        const userMsg = messages[messages.length - 1].content || '';
        if (userMsg.length > 2000) {
            return res.status(400).json({ error: 'Tin nhắn vượt quá giới hạn 2000 ký tự cho phép.' });
        }

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
                sentiment_score: detectedLevel,
                metadata: {
                    abuse_type: evalResult.abuseType || 'none',
                    risk_type: evalResult.riskType || 'none',
                    urgency: evalResult.urgency || 'low',
                    handover_required: Boolean(evalResult.shouldHandover),
                    handover_reason: evalResult.handoverReason || null,
                    detected_keywords: detectedKeywords,
                    masked_words: evalResult.maskedWords || []
                }
            });

            const isAgentRequested = Boolean(evalResult.isAgentRequested) ||
                                     userMsg.toLowerCase().includes('gặp nhân viên') || 
                                     userMsg.toLowerCase().includes('người thật') || 
                                     userMsg.toLowerCase().includes('tư vấn viên');
            
            const shouldHandover = evalResult.shouldHandover || isAgentRequested || detectedLevel >= 4 || isSharpEscalation;
            const nextStatus = conversation?.status === 'agent_handling' 
                ? 'agent_handling' 
                : (shouldHandover ? 'waiting_agent' : 'bot_handling');

            // Cập nhật cấp độ cảm xúc, xu hướng, vi phạm và trạng thái cho phiên
            const updatePayload = {
                status: nextStatus,
                sentiment_level: isAgentRequested ? Math.max(detectedLevel, 3) : detectedLevel,
                sentiment_trend: sentimentTrend,
                is_urgent: isUrgent || isAgentRequested || isSharpEscalation || isVipAttention,
                updated_at: new Date().toISOString()
            };

            if (shouldHandover && conversation?.status !== 'agent_handling') {
                updatePayload.handover_reason = evalResult.handoverReason || (isAgentRequested ? 'Khách yêu cầu gặp tư vấn viên trực tiếp' : 'Hệ thống chuyển ca hỗ trợ');
            }

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
                    role: (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }))
            ];
        } else {
            history = messages.slice(0, -1).map(m => ({
                role: (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user',
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
            console.warn("[API] gemini-2.5-flash stream failed (" + err1.message + "), đang tự động chuyển sang key dự phòng tiếp theo từ CSDL...");
            const nextGenAIResult = await getGenAI(true);
            const activeGenAI = nextGenAIResult?.genAI || genAI;
            const fallbackModel = activeGenAI.getGenerativeModel({ 
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

module.exports.evaluateToxicAndSentiment = evaluateToxicAndSentiment;
module.exports.adminDbTools = adminDbTools;

