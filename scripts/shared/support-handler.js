
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



    function detectPriority(title, content, context = {}) {
        const keywords = ['hotel', 'chấn thương', 'mất tiền', 'trừ tiền', 'sự cố', 'momo', 'chuyển khoản', 'đau', 'xước', 'máu', 'bể', 'vỡ', 'hỏng', 'tai nạn'];
        const text = (title + ' ' + content + ' ' + (context.issueType || '')).toLowerCase();
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

    const LOCAL_TICKETS_KEY = 'pawpal_support_tickets';
    let cachedTickets = []; 

    function getLocalTickets() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_TICKETS_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveLocalTickets(tickets) {
        localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(tickets));
    }

    async function loadTickets() {
        let localList = getLocalTickets();
        
        // Dữ liệu mẫu ban đầu nếu hoàn toàn trống
        if (localList.length === 0) {
            localList = [
                {
                    id: 'TK-2026-001',
                    title: '[Khiếu nại Dịch vụ] Miu Con - Gói Tắm Vệ Sinh Cơ Bản: Bé bị trầy xước nhẹ ở tai',
                    type: 'service',
                    status: 'processing',
                    priority: 'Cao',
                    rating: null,
                    ratingComment: '',
                    context: { bookingId: 'BKG-1001', petName: 'Miu Con', serviceName: 'Gói Tắm Vệ Sinh Cơ Bản' },
                    messages: [
                        { sender: 'user', text: 'Bé Miu sau khi tắm và sấy về có vết trầy nhẹ ở vành tai phải và hơi sợ nước.', time: '2026-09-28T14:30:00.000Z' },
                        { sender: 'cskh', agent: 'Lê Lệ Quyên (CSKH)', text: 'PawPal chào bạn, chúng tôi đã tiếp nhận và đang tiến hành trích xuất camera phòng sấy của cơ sở Quận 1 để kiểm tra thao tác kỹ thuật viên nhé.', time: '2026-09-28T14:45:00.000Z' }
                    ]
                }
            ];
            saveLocalTickets(localList);
        }

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (db) {
            try {
                const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
                let query = db.from('support_ticket').select('*').order('created_at', { ascending: false });
                if (currentUser && currentUser.id) {
                    query = query.eq('user_id', currentUser.id);
                }
                const { data: ticketsData, error: tErr } = await query;
                if (!tErr && ticketsData && ticketsData.length > 0) {
                    const { data: msgsData } = await db.from('support_ticket_message').select('*').order('created_at', { ascending: true });
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
                    ticketsData.forEach(t => {
                        const exists = localList.some(item => item.id === t.id);
                        if (!exists) {
                            localList.unshift({
                                id: t.id,
                                title: t.title,
                                type: t.type,
                                status: t.status,
                                priority: t.priority,
                                rating: t.rating,
                                ratingComment: t.rating_comment,
                                messages: msgsByTicket[t.id] || []
                            });
                        }
                    });
                }
            } catch (err) {
                console.warn('[Support] Dùng local tickets fallback do không kết nối được Supabase:', err);
            }
        }

        cachedTickets = localList;
        document.dispatchEvent(new CustomEvent('tickets_updated'));
        return cachedTickets;
    }

    function sbGetTickets() {
        return cachedTickets;
    }

    async function sbCreateTicket(title, type, content, files = [], context = {}) {
        const priority = detectPriority(title, content, context);
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
        const userId = currentUser ? currentUser.id : null;
        const now = new Date();

        const localTicket = {
            id: 'TK-2026-' + Math.floor(100 + Math.random() * 900),
            title: title,
            type: type,
            priority: priority,
            status: 'pending',
            rating: null,
            ratingComment: '',
            files: files || [],
            context: context || {},
            messages: [
                {
                    sender: 'user',
                    text: content,
                    time: now.toISOString()
                }
            ]
        };

        const localList = getLocalTickets();
        localList.unshift(localTicket);
        saveLocalTickets(localList);

        // Thử đồng bộ lên Supabase nếu có
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (db) {
            try {
                const { data: tData } = await db.from('support_ticket').insert([{
                    title, type, priority, status: 'pending', user_id: userId
                }]).select();
                if (tData && tData.length > 0) {
                    const newId = tData[0].id;
                    await db.from('support_ticket_message').insert([{
                        ticket_id: newId,
                        sender_type: 'user',
                        content: content
                    }]);
                }
            } catch (e) {
                console.warn('[Support] Lưu Supabase không thành công, đã lưu LocalStorage an toàn:', e);
            }
        }

        await loadTickets();
        return localTicket;
    }

    async function sbSendTicketReply(ticketId, text) {
        const now = new Date();
        const localList = getLocalTickets();
        const ticket = localList.find(t => t.id === ticketId);
        if (ticket) {
            if (!ticket.messages) ticket.messages = [];
            ticket.messages.push({
                sender: 'user',
                text: text,
                time: now.toISOString()
            });
            ticket.status = 'processing';
            saveLocalTickets(localList);

            // Đồng bộ tin nhắn khách gửi sang Bảng Khiếu nại Admin
            try {
                const nowHeader = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || {};
                const senderName = currentUser.name || 'Khách hàng';

                const syncToAdminCollection = (storageKey) => {
                    const arr = JSON.parse(localStorage.getItem(storageKey)) || [];
                    const idx = arr.findIndex(item => item.id === ticketId || (ticket?.context?.bookingId && item.bookingId === ticket.context.bookingId) || (ticket?.context?.orderId && item.orderId === ticket.context.orderId));
                    if (idx >= 0) {
                        if (!arr[idx].timeline) arr[idx].timeline = [];
                        arr[idx].timeline.unshift({
                            time: nowHeader,
                            author: `${senderName} (Khách hàng)`,
                            title: 'Phản hồi từ Khách hàng',
                            desc: text,
                            isInternal: false
                        });
                        if (arr[idx].status === 'waiting_customer') {
                            arr[idx].status = 'processing';
                        }
                        localStorage.setItem(storageKey, JSON.stringify(arr));
                    }
                };

                syncToAdminCollection('pawpal_service_complaints');
                syncToAdminCollection('pawpal_order_complaints');
            } catch (e) {
                console.warn('[Support] Sync user reply to admin complaints error:', e);
            }
        }

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (db) {
            try {
                await db.from('support_ticket_message').insert([{
                    ticket_id: ticketId,
                    sender_type: 'user',
                    content: text
                }]);
                await db.from('support_ticket').update({ status: 'processing', updated_at: now.toISOString() }).eq('id', ticketId);
            } catch (e) {}
        }

        await loadTickets();

        // Tự động mô phỏng CSKH phản hồi tiếp nhận sau 2s
        setTimeout(async () => {
            const list = getLocalTickets();
            const t = list.find(item => item.id === ticketId);
            if (t) {
                t.messages.push({
                    sender: 'cskh',
                    agent: 'Nguyễn Văn B (CSKH)',
                    text: 'PawPal đã nhận được phản hồi bổ sung từ bạn rồi ạ. Chúng tôi đang kiểm tra gấp và sẽ cập nhật phương án giải quyết sớm nhất nhé!',
                    time: new Date().toISOString()
                });
                saveLocalTickets(list);
                await loadTickets();
            }
        }, 2000);
    }

    async function sbCloseAndRateTicket(ticketId, rating, comment = '') {
        const localList = getLocalTickets();
        const ticket = localList.find(t => t.id === ticketId);
        if (ticket) {
            ticket.status = 'completed';
            ticket.rating = rating;
            ticket.ratingComment = comment;
            saveLocalTickets(localList);

            // Đồng bộ đánh giá của khách hàng sang Bảng Khiếu nại Admin
            try {
                const now = new Date();
                const nowHeader = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || {};
                const senderName = currentUser.name || 'Khách hàng';

                const syncRatingToAdmin = (storageKey) => {
                    const arr = JSON.parse(localStorage.getItem(storageKey)) || [];
                    const idx = arr.findIndex(item => item.id === ticketId || (ticket?.context?.bookingId && item.bookingId === ticket.context.bookingId) || (ticket?.context?.orderId && item.orderId === ticket.context.orderId));
                    if (idx >= 0) {
                        if (!arr[idx].timeline) arr[idx].timeline = [];
                        arr[idx].timeline.unshift({
                            time: nowHeader,
                            author: `${senderName} (Khách hàng)`,
                            title: `Khách hàng đánh giá CSKH: ${rating} sao`,
                            desc: comment ? `"${comment}"` : 'Khách hàng đã chấp thuận phương án bồi hoàn và hoàn tất phản ánh.',
                            isInternal: false
                        });
                        arr[idx].customerRating = rating;
                        arr[idx].customerRatingComment = comment;
                        arr[idx].status = 'resolved';
                        localStorage.setItem(storageKey, JSON.stringify(arr));
                    }
                };
                syncRatingToAdmin('pawpal_service_complaints');
                syncRatingToAdmin('pawpal_order_complaints');
            } catch (e) {
                console.warn('[Support] Sync rating to admin complaints error:', e);
            }
        }

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (db) {
            try {
                await db.from('support_ticket').update({
                    status: 'completed',
                    rating: rating,
                    rating_comment: comment,
                    updated_at: new Date().toISOString()
                }).eq('id', ticketId);
            } catch (e) {}
        }

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
