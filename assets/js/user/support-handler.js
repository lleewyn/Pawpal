/**
 * support-handler.js — Quản lý nghiệp vụ hỗ trợ khách hàng, Chatbot AI và Tickets
 */

(function() {
    const TICKETS_KEY = 'pawpal_tickets';

    // Dữ liệu câu hỏi FAQ mẫu
    const faqData = [
        {
            id: 'faq-1',
            category: 'account',
            title: 'Làm thế nào để thay đổi mật khẩu của tài khoản?',
            content: 'Chồng iu vui lòng truy cập trang Trang cá nhân => Tab Bảo mật => Nhập mật khẩu hiện tại và Mật khẩu mới rồi bấm Cập nhật bảo mật nhé.'
        },
        {
            id: 'faq-2',
            category: 'booking',
            title: 'Tôi muốn thay đổi/hủy lịch tắm cho bé cưng phải làm thế nào?',
            content: 'Nhà mình hoàn toàn có thể tự đổi hoặc huỷ lịch trực tuyến miễn phí trước giờ hẹn ít nhất 2 tiếng tại trang Lịch hẹn của tôi. Sau 2 tiếng chồng iu vui lòng gọi Hotline để nhân viên trợ giúp nha.'
        },
        {
            id: 'faq-3',
            category: 'returns',
            title: 'Chính sách hoàn tiền/đổi trả của cửa hàng như thế nào?',
            content: 'PawPal hỗ trợ đổi hàng trong vòng 7 ngày đối với sản phẩm còn nguyên tem mác, chưa qua sử dụng. Phí ship gửi trả do khách tự thanh toán trừ phi lỗi từ phía tiệm ạ.'
        }
    ];

    const initialTickets = [
        {
            id: 'TK-82910',
            title: 'Lỗi trừ tiền Momo nhưng đơn hàng báo thất bại',
            type: 'payment',
            priority: 'Cao', // Cao / Trung bình / Thấp
            status: 'processing', // pending / processing / completed
            messages: [
                {
                    sender: 'user',
                    text: 'Tôi đã thanh toán Momo thành công và bị trừ 250k nhưng hệ thống vẫn báo đơn hàng chưa được thanh toán.',
                    time: new Date(Date.now() - 1200000).toISOString()
                },
                {
                    sender: 'cskh',
                    agent: 'Nguyễn Văn B',
                    text: 'PawPal xin lỗi chồng iu vì sự cố này ạ. Em đã chuyển thông tin giao dịch sang bộ phận Kỹ thuật kiểm soát đối chiếu dòng tiền. Chồng iu đợi em 5 phút ạ!',
                    time: new Date(Date.now() - 600000).toISOString()
                }
            ],
            rating: null,
            ratingComment: ''
        }
    ];

    function getTickets() {
        try {
            return JSON.parse(localStorage.getItem(TICKETS_KEY)) || initialTickets;
        } catch {
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
            text: 'Em đã nhận được phản hồi từ chồng iu rồi ạ. Em đang giải quyết gấp nhé!',
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

    // 5. Bộ lọc chat AI & khoá chat 15 phút (US 15-2)
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
                    text: 'Tài khoản của chồng iu bị khóa chat 15 phút do vi phạm quy tắc ứng xử.'
                };
            }
            return {
                error: true,
                text: 'Vui lòng sử dụng ngôn từ lịch sự khi giao tiếp với em nha chồng iu!'
            };
        }

        // Tạo câu trả lời AI giả lập
        setTimeout(() => {
            let replyText = 'Em nghe đây chồng iu. Hiện tại câu hỏi này em sẽ gửi cho CSKH giải đáp ngay nhé!';
            const query = userInput.toLowerCase();

            if (query.includes('lịch hẹn') || query.includes('bông')) {
                replyText = 'Lịch hẹn tắm của bé Bông lúc 14:00 hôm nay đã được xác nhận thành công rồi đó chồng iu.';
            } else if (query.includes('đơn hàng') || query.includes('2026')) {
                replyText = 'Đơn hàng #ORD-2026 của chồng iu đang được đơn vị giao hàng vận chuyển rồi ạ.';
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
})();
