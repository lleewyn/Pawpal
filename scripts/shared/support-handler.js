
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

    async function authenticatedCustomerRequest(body) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db?.auth?.getSession) throw new Error('Không tìm thấy phiên đăng nhập.');
        const { data, error } = await db.auth.getSession();
        if (error || !data?.session?.access_token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        const response = await fetch('/api/customer/auth/me', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.session.access_token}`
            },
            body: JSON.stringify(body)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể gửi phản hồi. Vui lòng thử lại.');
        return result;
    }

    async function loadTickets() {
        let localList = getLocalTickets();
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        
        if (db) {
            try {
                const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || {};
                const customerId = currentUser.id || currentUser.custId;
                if (!customerId || currentUser.is_temporary) {
                    tickets = [];
                    return [];
                }
                const query = db.from('support_ticket')
                    .select('id, ticket_code, customer_id, subject, description, category, type, priority, status, rating, rating_comment, resolution_type, resolution_note, created_at, updated_at')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false });
                const { data: ticketsData, error: tErr } = await query;
                if (!tErr && ticketsData) {
                    const ticketIds = ticketsData.map(t => t.id);
                    let msgsByTicket = {};
                    if (ticketIds.length > 0) {
                        const { data: msgsData } = await db
                            .from('support_ticket_message')
                            .select('id, ticket_id, sender_type, content, is_internal, created_at')
                            .in('ticket_id', ticketIds)
                            .order('created_at', { ascending: true });
                            
                        if (msgsData) {
                            msgsData.forEach(m => {
                                if (!msgsByTicket[m.ticket_id]) msgsByTicket[m.ticket_id] = [];
                                if (!m.is_internal && m.sender_type !== 'system' && m.sender_type !== 'internal_note') {
                                    msgsByTicket[m.ticket_id].push({
                                        sender: m.sender_type,
                                        text: m.content,
                                        time: m.created_at
                                    });
                                }
                            });
                        }
                    }

                    const supabaseTickets = ticketsData.map(t => ({
                        id: t.id,
                        ticketCode: t.ticket_code,
                        title: t.subject || 'Hỗ trợ khách hàng',
                        subject: t.subject,
                        description: t.description,
                        type: t.type || t.category || 'other',
                        status: t.status || 'open',
                        priority: t.priority || 'Trung bình',
                        rating: t.rating,
                        ratingComment: t.rating_comment,
                        createdAt: t.created_at,
                        resolution: t.resolution_note || null,
                        messages: msgsByTicket[t.id] || []
                    }));

                    const merged = [...supabaseTickets];
                    localList.forEach(loc => {
                        if (!merged.some(m => m.id === loc.id)) {
                            merged.push(loc);
                        }
                    });
                    localList = merged;
                    saveLocalTickets(localList);
                }
            } catch (err) {
                console.warn('[Support] Kết nối Supabase tickets:', err);
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
        const customerId = currentUser ? (currentUser.id || currentUser.custId) : null;
        const now = new Date();

        const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        const ticketCode = 'TK-' + Date.now().toString(36).toUpperCase().slice(-6);

        let createdId = null;
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (db && isUuid(customerId)) {
            try {
                const insertPayload = {
                    ticket_code: ticketCode,
                    customer_id: customerId,
                    subject: title,
                    description: content,
                    category: type || 'other',
                    type: type || 'support',
                    priority: priority === 'Cao' ? 'high' : (priority === 'Khẩn cấp' ? 'urgent' : 'medium'),
                    status: 'open',
                    channel: 'web',
                    order_id: isUuid(context.orderId) ? context.orderId : null,
                    appointment_id: isUuid(context.bookingId) ? context.bookingId : null,
                    requested_resolution: context.customerDemand || null,
                    requested_amount: parseFloat(context.requestedAmount) || 0
                };
                const { data: tData, error: tErr } = await db.from('support_ticket').insert([insertPayload]).select('id').single();
                if (!tErr && tData?.id) {
                    createdId = tData.id;
                    await db.from('support_ticket_message').insert([{
                        ticket_id: createdId,
                        sender_type: 'customer',
                        content: content,
                        is_internal: false
                    }]);
                }
            } catch (e) {
                console.warn('[Support] Lưu Supabase không thành công, dùng fallback local:', e);
            }
        }

        const finalTicketId = createdId || ticketCode || ('TK-2026-' + Math.floor(100 + Math.random() * 900));

        const localTicket = {
            id: finalTicketId,
            rawId: createdId || finalTicketId,
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

        // Đồng bộ Ticket khiếu nại sang Phân hệ Khách hàng Admin (pawpal_admin_customers_data)
        try {
            const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()}`;
            const cleanPhone = (currentUser?.phone || '').replace(/[^0-9]/g, '');
            const syncCustomerComplaint = (storage) => {
                const raw = storage.getItem('pawpal_admin_customers_data');
                if (raw) {
                    const data = JSON.parse(raw);
                    let matched = null;
                    if (cleanPhone) {
                        matched = Object.values(data).find(c => c.phone && c.phone.replace(/[^0-9]/g, '') === cleanPhone);
                    }
                    if (!matched && currentUser?.name) {
                        matched = Object.values(data).find(c => c.name && c.name.toLowerCase() === currentUser.name.toLowerCase());
                    }
                    if (!matched) {
                        matched = data['CUST-001'];
                    }

                    if (matched) {
                        if (!matched.complaints) matched.complaints = [];
                        matched.complaints.unshift({
                            id: localTicket.id,
                            date: dateStr,
                            issue: title,
                            level: priority === 'Cao' ? 'Khẩn cấp' : 'Trung bình',
                            status: 'Đang xử lý',
                            statusClass: 'badge-danger'
                        });
                        matched.emergencyAlert = title;
                        matched.has_complaint = true;
                        matched.complaint_note = content;
                        storage.setItem('pawpal_admin_customers_data', JSON.stringify(data));
                    }
                }
            };
            syncCustomerComplaint(sessionStorage);
            syncCustomerComplaint(localStorage);
        } catch (err) {
            console.warn('[Support] Sync ticket to customer DB error:', err);
        }

        await loadTickets();
        return localTicket;
    }

    async function sbSendTicketReply(ticketId, text) {
        const now = new Date();
        const localList = getLocalTickets();
        const ticket = localList.find(t => t.id === ticketId || t.rawId === ticketId);
        const targetDbId = ticket?.rawId || ticketId;

        const result = await authenticatedCustomerRequest({
            action: 'support-reply',
            ticketId: targetDbId,
            content: text
        });

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
                    const idx = arr.findIndex(item => item.id === targetDbId || item.id === ticketId || (ticket?.context?.bookingId && item.bookingId === ticket.context.bookingId) || (ticket?.context?.orderId && item.orderId === ticket.context.orderId));
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

        await loadTickets();
        document.dispatchEvent(new CustomEvent('tickets_updated'));
        return result.message;
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
                        arr[idx].status = rating < 3 ? 'reprocessing' : 'resolved';
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
