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

    const initialTickets = [
        {
            id: 'TK-82910',
            title: 'Lỗi trừ tiền Momo nhưng đơn hàng báo thất bại',
            type: 'payment',
            priority: 'Cao',
            status: 'processing',
            messages: [
                {
                    sender: 'user',
                    text: 'Tôi đã thanh toán Momo thành công và bị trừ 250k nhưng hệ thống vẫn báo đơn hàng chưa được thanh toán.',
                    time: new Date(Date.now() - 1200000).toISOString()
                },
                {
                    sender: 'cskh',
                    agent: 'Nguyễn Văn B',
                    text: 'PawPal xin lỗi bạn vì sự cố này ạ. Chúng tôi đã chuyển thông tin giao dịch sang bộ phận Kỹ thuật kiểm soát đối chiếu dòng tiền. Bạn đợi chúng tôi 5 phút ạ!',
                    time: new Date(Date.now() - 600000).toISOString()
                }
            ],
            rating: null,
            ratingComment: ''
        },
        {
            id: 'TK-82911',
            title: 'Yêu cầu thay đổi lịch tắm cho bé',
            type: 'booking',
            priority: 'Trung bình',
            status: 'completed',
            messages: [
                {
                    sender: 'user',
                    text: 'Em muốn dời lịch tắm Bông từ thứ 5 sang thứ 6 tuần này. Dạo này bé bận việc nhập học nên không có thời gian.',
                    time: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    sender: 'cskh',
                    agent: 'Trần Thị C',
                    text: 'Được ạ! PawPal vừa dời lịch Bông từ thứ 5 sang thứ 6 lúc 14:00 rồi. Bạn kiểm tra email xác nhận nhé ạ!',
                    time: new Date(Date.now() - 3000000).toISOString()
                }
            ],
            rating: 5,
            ratingComment: 'Dịch vụ cực tuyệt vời, giải quyết nhanh!'
        },
        {
            id: 'TK-82912',
            title: 'Sản phẩm thú cưng bị hỏng khi nhận hàng',
            type: 'returns',
            priority: 'Cao',
            status: 'pending',
            messages: [
                {
                    sender: 'user',
                    text: 'Hôm qua em nhận hàng nhưng chiếc giường cho bé bị nước lọc và mùi mốc. Mong PawPal giải quyết sớm ạ.',
                    time: new Date(Date.now() - 7200000).toISOString()
                }
            ],
            rating: null,
            ratingComment: ''
        },
        {
            id: 'TK-82913',
            title: 'Hỏi về dịch vụ spa cho chó lông dài',
            type: 'inquiry',
            priority: 'Trung bình',
            status: 'completed',
            messages: [
                {
                    sender: 'user',
                    text: 'Bé tôi là chó Golden Retriever, lông dài. Có dịch vụ spa chuyên biệt nào cho lông dài không ạ? Giá bao nhiêu?',
                    time: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    sender: 'cskh',
                    agent: 'Lê Văn D',
                    text: 'Được ạ! PawPal có gói Spa Premium cho chó lông dài: gồm tắm, sấy (tốn thời gian), cắt tỉa, xoa dầu chuyên biệt. Giá 450k/lần. Bạn có muốn đặt lịch không?',
                    time: new Date(Date.now() - 82800000).toISOString()
                }
            ],
            rating: 4,
            ratingComment: 'Chính xác, tư vấn rất tốt'
        },
        {
            id: 'TK-82914',
            title: 'Đăng ký Paw Points bị lỗi',
            type: 'account',
            priority: 'Trung bình',
            status: 'processing',
            messages: [
                {
                    sender: 'user',
                    text: 'Tôi muốn tham gia chương trình Paw Points nhưng nút đăng ký không hoạt động. Có vấn đề gì không ạ?',
                    time: new Date(Date.now() - 900000).toISOString()
                },
                {
                    sender: 'cskh',
                    agent: 'Phạm Văn E',
                    text: 'Xin lỗi bạn! Chúng tôi đang kiểm tra vấn đề kỹ thuật này. Bạn thử đăng xuất rồi đăng nhập lại xem nhé.',
                    time: new Date(Date.now() - 300000).toISOString()
                }
            ],
            rating: null,
            ratingComment: ''
        },
        {
            id: 'TK-82915',
            title: 'Tôi muốn nhượng quyền mở chi nhánh PawPal',
            type: 'business',
            priority: 'Trung bình',
            status: 'pending',
            messages: [
                {
                    sender: 'user',
                    text: 'Xin chào! Tôi rất yêu thích PawPal và muốn mở chi nhánh tại quận 1, TP.HCM. Có chương trình hợp tác nào không ạ?',
                    time: new Date(Date.now() - 432000000).toISOString()
                }
            ],
            rating: null,
            ratingComment: ''
        }
    ];

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
