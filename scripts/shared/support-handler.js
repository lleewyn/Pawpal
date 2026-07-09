/**
 * support-handler.js — Quản lý nghiệp vụ hỗ trợ khách hàng, Chatbot AI và Tickets
 */

(function() {
    const TICKETS_KEY = 'pawpal_tickets';
    const TICKETS_SEED_VERSION_KEY = 'pawpal_support_seed_version';
    const TICKETS_SEED_VERSION = '2026-06-28-support-seed-v2-fix-accents';

    // Dữ liệu câu hỏi FAQ mẫu
    const faqData = [
        {
            id: 'faq-1',
            category: 'account',
            title: 'Làm thế nào để thay đổi mật khẩu của tài khoản?',
            content: 'Bạn vui lòng truy cập trang Trang cá nhân => Tab Bảo mật => Nhập mật khẩu hiện tại và Mật khẩu mới rồi bấm Cập nhật bảo mật nhé.'
        },
        {
            id: 'faq-2',
            category: 'booking',
            title: 'Tôi muốn thay đổi/hủy lịch tắm cho bé cưng phải làm thế nào?',
            content: 'Nhà mình hoàn toàn có thể tự đổi hoặc huỷ lịch trực tuyến miễn phí trước giờ hẹn ít nhất 2 tiếng tại trang Lịch hẹn của tôi. Sau 2 tiếng bạn vui lòng gọi Hotline để nhân viên trợ giúp nha.'
        },
        {
            id: 'faq-3',
            category: 'returns',
            title: 'Chính sách hoàn tiền/đổi trả của cửa hàng như thế nào?',
            content: 'PawPal hỗ trợ đổi hàng trong vòng 7 ngày đối với sản phẩm còn nguyên tem mác, chưa qua sử dụng. Phí ship gửi trả do khách tự thanh toán trừ phi lỗi từ phía tiệm ạ.'
        }
    ];

    const SUPPORT_TICKETS_URL = '/data/support-tickets.json';

    function readSupportTicketsSeed() {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', SUPPORT_TICKETS_URL, false);
            xhr.send(null);
            if (xhr.status >= 200 && xhr.status < 300) {
                return JSON.parse(xhr.responseText);
            }
        } catch (error) {
            console.warn('[support-handler] Cannot load support tickets seed:', error);
        }
        return [];
    }

    const initialTickets = readSupportTicketsSeed();

    function seedTicketsIfNeeded() {
        try {
            const raw = localStorage.getItem(TICKETS_KEY);
            const stored = raw ? JSON.parse(raw) : null;
            const hasStoredTickets = Array.isArray(stored) && stored.length > 0;
            const isOldVersion = localStorage.getItem(TICKETS_SEED_VERSION_KEY) !== TICKETS_SEED_VERSION;

            if (!hasStoredTickets || isOldVersion) {
                const merged = Array.isArray(initialTickets) ? initialTickets.map(seed => {
                    const local = Array.isArray(stored) ? stored.find(s => String(s.id) === String(seed.id)) : null;
                    return local ? { ...seed, status: local.status, rating: local.rating, ratingComment: local.ratingComment } : seed;
                }) : [];
                if (Array.isArray(stored)) {
                    stored.forEach(local => {
                        if (!merged.some(m => String(m.id) === String(local.id))) merged.push(local);
                    });
                }
                localStorage.setItem(TICKETS_KEY, JSON.stringify(merged));
                localStorage.setItem(TICKETS_SEED_VERSION_KEY, TICKETS_SEED_VERSION);
            }
        } catch (error) {
            console.warn('[support-handler] Cannot seed support tickets:', error);
        }
    }

    seedTicketsIfNeeded();

    function getTickets() {
        try {
            const stored = JSON.parse(localStorage.getItem(TICKETS_KEY));
            if (Array.isArray(stored) && stored.length > 0) {
                return stored;
            }
            localStorage.setItem(TICKETS_KEY, JSON.stringify(initialTickets));
            return initialTickets;
        } catch {
            localStorage.setItem(TICKETS_KEY, JSON.stringify(initialTickets));
            return initialTickets;
        }
    }

    function saveTickets(tickets) {
        localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
        document.dispatchEvent(new CustomEvent('tickets_updated'));
    }

    // 1. Phân loại độ ưu tiên SLAs khẩn cấp (US 15-5)
    function detectPriority(title, content) {
        const keywords = ['sức khỏe', 'hotel', 'chấn thương', 'mất tiền', 'trừ tiền', 'sự cố', 'momo', 'chuyển khoản'];
        const text = (title + ' ' + content).toLowerCase();
        const isUrgent = keywords.some(k => text.includes(k));
        return isUrgent ? 'Cao' : 'Trung bình';
    }

    // 2. Tạo ticket mới
    function createTicket(title, type, content, files = []) {
        const tickets = getTickets();
        const priority = detectPriority(title, content);
        const ticketId = 'TK-' + Math.floor(10000 + Math.random() * 90000);

        const newTicket = {
            id: ticketId,
            title: title,
            type: type,
            priority: priority,
            status: 'pending',
            messages: [
                {
                    sender: 'user',
                    text: content,
                    time: new Date().toISOString(),
                    attachments: files
                }
            ],
            rating: null,
            ratingComment: ''
        };

        tickets.push(newTicket);
        saveTickets(tickets);

        // Mô phỏng SMS link nếu là tài khoản tạm/chưa đăng nhập (US 15-7)
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
        if (!currentUser || currentUser.is_temporary) {
            console.log(`[SMS CSKH] Gui tokenized link check ticket cho sdt: "pawpal.vn/support-guest?token=${ticketId}"`);
        }

        return newTicket;
    }

    // 3. Phản hồi thêm tin nhắn trong ticket
    function sendTicketReply(ticketId, text) {
        const tickets = getTickets();
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        ticket.messages.push({
            sender: 'user',
            text: text,
            time: new Date().toISOString()
        });

        // Đổi lại status nếu đang completed thành processing
        if (ticket.status === 'completed') {
            ticket.status = 'processing';
        }

        saveTickets(tickets);

        // Giả lập bot/nhân viên rep sau 2 giây
        setTimeout(() => {
            simulateCSKHResponse(ticketId);
        }, 2000);
    }

    function simulateCSKHResponse(ticketId) {
        const tickets = getTickets();
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        ticket.status = 'processing';
        ticket.messages.push({
            sender: 'cskh',
            agent: 'Nguyễn Văn B',
            text: 'PawPal đã nhận được phản hồi từ bạn rồi ạ. Chúng tôi đang giải quyết gấp nhé!',
            time: new Date().toISOString()
        });
        saveTickets(tickets);
    }

    // 4. Đóng và đánh giá Ticket (US 15-6)
    function closeAndRateTicket(ticketId, rating, comment = '') {
        const tickets = getTickets();
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        ticket.status = 'completed';
        ticket.rating = rating;
        ticket.ratingComment = comment;

        saveTickets(tickets);
    }

    // 5. Bộ lọc chat AI và khoá chat 15 phút (US 15-2)
    let badWordsViolationCount = 0;
    let chatBlockedUntil = null;

    function checkBadWords(text) {
        const badWords = ['đm', 'dkm', 'chó', 'mèo ngu', 'lừa đảo', 'cút', 'ngu', 'fuck', 'shit'];
        const lowerText = text.toLowerCase();
        return badWords.some(w => lowerText.includes(w));
    }

    const GEMINI_API_KEY = "AIzaSyDWkR8qFUKBmpu3GZi2GP2OYQpA-TUSkcg";
    let conversationHistory = [];

    async function processChatInput(userInput, onReplyCallback) {
        if (chatBlockedUntil && Date.now() < chatBlockedUntil) {
            const minutesLeft = Math.ceil((chatBlockedUntil - Date.now()) / 60000);
            return {
                error: true,
                text: `Kênh chat tạm khóa do vi phạm tiêu chuẩn cộng đồng. Thử lại sau ${minutesLeft} phút.`
            };
        }

        if (checkBadWords(userInput)) {
            badWordsViolationCount++;
            if (badWordsViolationCount >= 3) {
                chatBlockedUntil = Date.now() + 15 * 60 * 1000; // Khóa 15 phút
                badWordsViolationCount = 0;
                return {
                    error: true,
                    text: 'Tài khoản của bạn bị khóa chat 15 phút do vi phạm quy tắc ứng xử.'
                };
            }
            return {
                error: true,
                text: 'Vui lòng sử dụng ngôn từ lịch sự khi giao tiếp với chúng tôi nha!'
            };
        }

        // Gọi Backend Vercel Serverless Function
        try {
            // Lấy Access Token từ Supabase Client để backend xác thực
            let token = "";
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (db) {
                const { data } = await db.auth.getSession();
                if (data && data.session) {
                    token = data.session.access_token;
                }
            }
            
            conversationHistory.push({
                "role": "user",
                "content": userInput
            });

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ messages: conversationHistory })
            });

            const apiKeyUsed = response.headers.get('X-API-Key-Used');
            if (apiKeyUsed) {
                console.log(`[PawPal AI] Đang sử dụng API Key bắt đầu bằng: ${apiKeyUsed}...`);
            }

            const data = await response.json();

            if (data.reply) {
                const botReply = data.reply;
                conversationHistory.push({
                    "role": "model",
                    "content": botReply
                });
                const htmlReply = botReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                if (onReplyCallback) onReplyCallback(htmlReply);
            } else {
                console.error("Backend Error:", data);
                if (onReplyCallback) onReplyCallback("Xin lỗi, hệ thống PawPal AI đang gặp sự cố. Quý khách vui lòng thử lại sau.");
            }
        } catch (error) {
            console.error("Chatbot request failed", error);
            if (onReplyCallback) onReplyCallback("Xin lỗi, không thể kết nối tới PawPal AI lúc này.");
        }

        return { error: false };
    }

    // Xuất ra toàn cục
    
    // --- BẮT ĐẦU KẾT NỐI SUPABASE ---
    let cachedTickets = []; // RAM cache to support getTickets synchronously for old UI

    async function loadTickets() {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return cachedTickets;
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
        
        let query = db.from('support_ticket').select('*').order('created_at', { ascending: false });
        if (currentUser && currentUser.id) {
            query = query.eq('user_id', currentUser.id);
        } else {
            query = query.is('user_id', null);
        }
        
        // Fetch tickets
        const { data: ticketsData, error: tErr } = await query;
            
        if (tErr) {
            console.error('[Support] Lỗi load tickets', tErr);
            return cachedTickets;
        }
        
        // Fetch messages
        const { data: msgsData, error: mErr } = await db
            .from('support_ticket_message')
            .select('*')
            .order('created_at', { ascending: true });
            
        if (mErr) console.error('[Support] Lỗi load messages', mErr);
        
        const msgsByTicket = {};
        if (msgsData) {
            msgsData.forEach(m => {
                if (!msgsByTicket[m.ticket_id]) msgsByTicket[m.ticket_id] = [];
                msgsByTicket[m.ticket_id].push({
                    sender: m.sender_type,
                    agent: m.agent_name,
                    text: m.content,
                    time: m.created_at
                });
            });
        }
        
        cachedTickets = ticketsData.map(t => ({
            id: t.id,
            title: t.title,
            type: t.type,
            status: t.status,
            priority: t.priority,
            rating: t.rating,
            ratingComment: t.rating_comment,
            messages: msgsByTicket[t.id] || []
        }));
        
        // Dispatch update
        document.dispatchEvent(new CustomEvent('tickets_updated'));
        return cachedTickets;
    }

    // Sync getter for old UI
    function sbGetTickets() {
        return cachedTickets;
    }

    async function sbCreateTicket(title, type, content, files = []) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return null;
        
        const priority = detectPriority(title, content);
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
        const userId = currentUser ? currentUser.id : null;
        
        // Insert ticket
        const { data: tData, error: tErr } = await db.from('support_ticket').insert([{
            title, type, priority, status: 'pending', user_id: userId
        }]).select();
        
        if (tErr || !tData || !tData.length) {
            console.error('Lỗi tạo ticket:', tErr);
            return null;
        }
        
        const newTicketId = tData[0].id;
        
        // Insert first message
        await db.from('support_ticket_message').insert([{
            ticket_id: newTicketId,
            sender_type: 'user',
            content: content
        }]);
        
        await loadTickets();
        
        if (!currentUser || currentUser.is_temporary) {
            console.log(`[SMS CSKH] Gui tokenized link check ticket cho sdt: "pawpal.vn/support-guest?token=${newTicketId}"`);
        }
        
        return tData[0];
    }

    async function sbSendTicketReply(ticketId, text) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return;
        
        await db.from('support_ticket_message').insert([{
            ticket_id: ticketId,
            sender_type: 'user',
            content: text
        }]);
        
        await db.from('support_ticket').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', ticketId);
        
        await loadTickets();
        
        // Simulate response
        setTimeout(async () => {
            await db.from('support_ticket_message').insert([{
                ticket_id: ticketId,
                sender_type: 'cskh',
                agent_name: 'Nguyễn Văn B',
                content: 'PawPal đã nhận được phản hồi từ bạn rồi ạ. Chúng tôi đang giải quyết gấp nhé!'
            }]);
            await loadTickets();
        }, 2000);
    }

    async function sbCloseAndRateTicket(ticketId, rating, comment = '') {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return;
        
        await db.from('support_ticket').update({
            status: 'completed',
            rating: rating,
            rating_comment: comment,
            updated_at: new Date().toISOString()
        }).eq('id', ticketId);
        
        await loadTickets();
    }
    // --- KẾT THÚC KẾT NỐI SUPABASE ---
window.PawPalSupport = {
        faq: faqData,
        getTickets: sbGetTickets,
        loadTickets: loadTickets,
        createTicket: sbCreateTicket,
        sendTicketReply: sbSendTicketReply,
        closeAndRateTicket: sbCloseAndRateTicket,
        processChatInput: processChatInput
    };
    window.PawPalSupportReady = true;
    document.dispatchEvent(new CustomEvent('support_ready'));
})();
