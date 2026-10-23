
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

    let cachedTickets = [];
    let ticketsChannel = null;
    function stopRealtime() { if(ticketsChannel){client()?.removeChannel(ticketsChannel);ticketsChannel=null;} }
    window.addEventListener('hashchange',()=>{
        if (!location.hash.startsWith('#support') && ticketsChannel) { client()?.removeChannel(ticketsChannel); ticketsChannel=null; }
    });
    const requestIds = new Map();
    const client = () => window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    async function rpc(name,args) {
        const db = client();
        const auth = await db?.auth?.getUser();
        if (!auth?.data?.user || auth.error) throw Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        const result = await db.rpc(name,args);
        if (result.error) throw Error(result.error.code === 'PT409' ? 'Yêu cầu đã được lưu với thông tin khác. Vui lòng tải lại để đối soát.' : 'Không thể lưu dữ liệu hỗ trợ. Vui lòng thử lại.');
        return result.data;
    }
    async function loadTickets() {
        try {
            const rows = await rpc('own_support_tickets');
            cachedTickets = (rows || []).map(t => ({
                id:t.id,rawId:t.id,ticketCode:t.ticket_code,title:t.subject,description:t.description,
                type:t.category,status:t.status,priority:['high','urgent'].includes(t.priority)?'Cao':'Trung bình',
                rating:t.rating,ratingComment:t.rating_comment,createdAt:t.created_at,
                resolution:t.resolution_note ? {note:t.resolution_note} : null,
                context:{bookingId:t.appointment_id,orderId:t.order_id,serviceName:t.service_name,petName:t.pet_name},
                messages:t.messages || []
            }));
            if (!ticketsChannel && location.hash.startsWith('#support')) {
                ticketsChannel=client().channel('customer-support-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'support_ticket_message'},()=>{
                    loadTickets().catch(()=>{ document.dispatchEvent(new CustomEvent('support_load_error')); });
                }).subscribe();
            }
            document.dispatchEvent(new CustomEvent('tickets_updated'));
            return cachedTickets;
        } catch(error) { cachedTickets=[]; throw error; }
    }
    function sbGetTickets() { return cachedTickets; }
    async function sbCreateTicket(title,type,content,files=[],context={}) {
        if (files.length) throw Error('Ảnh và tệp chưa được hỗ trợ. Vui lòng gửi nội dung văn bản.');
        const key=JSON.stringify([title,type,content,context.bookingId,context.orderId,context.customerDemand]);
        if (!requestIds.has(key)) requestIds.set(key,context.requestId || crypto.randomUUID());
        const id=requestIds.get(key);
        const saved=await rpc('create_own_support_ticket',{
            p_id:id,p_category:type,p_subject:title,p_content:content,
            p_appointment:type==='service'?context.bookingId:null,p_order:type==='order'?context.orderId:null,
            p_resolution:context.customerDemand || null
        });
        if (saved!==id) throw Error('Chưa xác nhận được kết quả lưu. Vui lòng thử lại.');
        // The acknowledgement is authoritative even if a subsequent list refresh fails.
        return {id,rawId:id};
    }
    async function sbSendTicketReply(ticketId,text) {
        const key=JSON.stringify(['reply',ticketId,text]);
        if (!requestIds.has(key)) requestIds.set(key,crypto.randomUUID());
        const id=requestIds.get(key),saved=await rpc('reply_own_support_ticket',{p_id:id,p_ticket:ticketId,p_content:text});
        if (saved!==id) throw Error('Chưa xác nhận được phản hồi. Vui lòng thử lại.');
        await loadTickets(); return saved;
    }
    async function sbCloseAndRateTicket(ticketId,rating,comment='') {
        const saved=await rpc('rate_own_support_ticket',{p_ticket:ticketId,p_rating:rating,p_comment:comment});
        if (saved!==ticketId) throw Error('Chưa xác nhận được đánh giá. Vui lòng thử lại.');
        await loadTickets(); return saved;
    }

    window.PawPalSupport = {
        stopRealtime,
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
