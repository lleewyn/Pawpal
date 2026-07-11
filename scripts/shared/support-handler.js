
(function() {


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



    function detectPriority(title, content) {
        const keywords = ['sức khỏe', 'hotel', 'chấn thương', 'mất tiền', 'trừ tiền', 'sự cố', 'momo', 'chuyển khoản'];
        const text = (title + ' ' + content).toLowerCase();
        const isUrgent = keywords.some(k => text.includes(k));
        return isUrgent ? 'Cao' : 'Trung bình';
    }



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

        try {
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

    
    let cachedTickets = []; 

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
        
        const { data: ticketsData, error: tErr } = await query;
            
        if (tErr) {
            console.error('[Support] Lỗi load tickets', tErr);
            return cachedTickets;
        }
        
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
        
        document.dispatchEvent(new CustomEvent('tickets_updated'));
        return cachedTickets;
    }

    function sbGetTickets() {
        return cachedTickets;
    }

    async function sbCreateTicket(title, type, content, files = []) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return null;
        
        const priority = detectPriority(title, content);
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
        const userId = currentUser ? currentUser.id : null;
        
        const { data: tData, error: tErr } = await db.from('support_ticket').insert([{
            title, type, priority, status: 'pending', user_id: userId
        }]).select();
        
        if (tErr || !tData || !tData.length) {
            console.error('Lỗi tạo ticket:', tErr);
            return null;
        }
        
        const newTicketId = tData[0].id;
        
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
