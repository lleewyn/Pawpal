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

    function processChatInput(userInput, onReplyCallback) {
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

        // Tạo câu trả lời AI giả lập
        setTimeout(() => {
            let replyText = 'PawPal nghe đây ạ. Hiện tại câu hỏi này chúng tôi sẽ gửi cho CSKH giải đáp ngay nhé!';
            const query = userInput.toLowerCase();

            if (query.includes('lịch hẹn') || query.includes('bông')) {
                replyText = 'Lịch hẹn tắm của bé Bông lúc 14:00 hôm nay đã được xác nhận thành công rồi đó ạ.';
            } else if (query.includes('đơn hàng') || query.includes('2026')) {
                replyText = 'Đơn hàng #ORD-2026 của bạn đang được đơn vị giao hàng vận chuyển rồi ạ.';
            }

            onReplyCallback(replyText);
        }, 1000);

        return { error: false };
    }

    // Xuất ra toàn cục
    window.PawPalSupport = {
        faq: faqData,
        getTickets: getTickets,
        createTicket: createTicket,
        sendTicketReply: sendTicketReply,
        closeAndRateTicket: closeAndRateTicket,
        processChatInput: processChatInput
    };
    window.PawPalSupportReady = true;
    document.dispatchEvent(new CustomEvent('support_ready'));
})();
