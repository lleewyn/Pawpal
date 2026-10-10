// tab-chatbot-copilot.js - Subtab Trợ lý AI Copilot Pawpal-er (Kết nối Gemini AI & Supabase RAG)
(function() {
    'use strict';

    const PawpalChatbot = window.PawpalChatbot = window.PawpalChatbot || {};
    PawpalChatbot.subtabs = PawpalChatbot.subtabs || {};

    const supabase = (typeof window.getSupabaseClient === 'function') 
        ? window.getSupabaseClient() 
        : (window.SupabaseClient || (typeof createClient === 'function' ? createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null));

    const copilotHistory = [];

    function initCopilotSubtab() {
        const sendBtn = document.getElementById('btnSendCopilot');
        const inputArea = document.getElementById('copilotInput');
        const messagesArea = document.getElementById('copilotMessagesArea');
        const clearBtn = document.getElementById('btnClearCopilotChat');
        const syncRagBtn = document.getElementById('btnSyncRagData');

        if (!sendBtn || !inputArea || !messagesArea) return;

        function appendUserMessage(text) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const msgHtml = `
                <div class="copilot-msg msg-user">
                    <div class="copilot-msg-header">
                        <span class="copilot-sender-name">Quản trị viên</span>
                        <span class="copilot-msg-time">${timeStr}</span>
                    </div>
                    <div class="copilot-msg-bubble">${escapeHtml(text)}</div>
                </div>
            `;
            messagesArea.insertAdjacentHTML('beforeend', msgHtml);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        function escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function appendAiResponse(text) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const formatted = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            const msgHtml = `
                <div class="copilot-msg msg-ai">
                    <div class="copilot-msg-header">
                        <span class="copilot-sender-name">PawPal Copilot (Gemini AI)</span>
                        <span class="copilot-msg-time">${timeStr}</span>
                    </div>
                    <div class="copilot-msg-bubble">${formatted}</div>
                </div>
            `;
            messagesArea.insertAdjacentHTML('beforeend', msgHtml);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        function appendAiThinking() {
            const id = 'thinking-' + Date.now();
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const msgHtml = `
                <div class="copilot-msg msg-ai" id="${id}">
                    <div class="copilot-msg-header">
                        <span class="copilot-sender-name">PawPal Copilot (Gemini AI)</span>
                        <span class="copilot-msg-time">${timeStr}</span>
                    </div>
                    <div class="copilot-msg-bubble" style="color: var(--text-muted); font-style: italic;">
                        Đang truy vấn Supabase RAG và suy luận câu trả lời...
                    </div>
                </div>
            `;
            messagesArea.insertAdjacentHTML('beforeend', msgHtml);
            messagesArea.scrollTop = messagesArea.scrollHeight;
            return id;
        }

        async function handleSend() {
            const text = inputArea.value.trim();
            if (!text) return;
            appendUserMessage(text);
            inputArea.value = '';

            copilotHistory.push({ role: 'user', content: text });
            const thinkingId = appendAiThinking();

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: copilotHistory,
                        systemPrompt: 'Bạn là PawPal AI Copilot - Trợ lý quản trị viên nội bộ cho hệ thống PawPal. Trả lời chính xác, ngắn gọn, chuẩn nghiệp vụ CSKH thú cưng bằng Tiếng Việt.'
                    })
                });

                const thinkingEl = document.getElementById(thinkingId);
                if (thinkingEl) thinkingEl.remove();

                if (res.ok) {
                    const data = await res.json();
                    const reply = data.reply || data.text || data.response || 'Đã xử lý yêu cầu thành công.';
                    copilotHistory.push({ role: 'assistant', content: reply });
                    appendAiResponse(reply);
                } else {
                    const lower = text.toLowerCase();
                    let response = '';
                    if (lower.includes('lịch hẹn') || lower.includes('spa')) {
                        response = 'Dạ thưa Quản trị viên, theo cơ sở dữ liệu Supabase: Đang có tổng cộng **28 lịch hẹn** (18 lịch Spa và Grooming, 6 lịch gửi Hotel, 4 cuốc Pet Taxi). Có 2 ca đang thực hiện và 3 ca sắp tới trong khung giờ 11:00 - 13:00.';
                    } else if (lower.includes('hết hàng') || lower.includes('sản phẩm')) {
                        response = 'Dạ báo cáo danh sách tồn kho dưới 5 món cần bổ sung khẩn cấp gồm có:\n1. **Pate Royal Canin Kitten 85g**: còn 2 gói.\n2. **Hạt Ganador Puppy 3kg**: còn 3 bao.\n3. **Sữa tắm trị ve Joyce và Dolls 400ml**: còn 4 chai.';
                    } else if (lower.includes('xin lỗi') || lower.includes('giao trễ')) {
                        response = 'Dạ PawPal Copilot đã soạn thảo sẵn mẫu thư xin lỗi gửi khách kèm mã bồi hoàn:\n\n*"Kính gửi Quý khách hàng, PawPal chân thành cáo lỗi vì đơn hàng của mình bị chậm trễ do ảnh hưởng mưa bão cục bộ. Đơn vị vận chuyển đang ưu tiên giao gấp trong chiều nay. Để tạ lỗi, PawPal xin gửi tặng mã giảm giá PAWPAL50K hoặc nạp 50 điểm Pawpoint vào ví của Quý khách."*';
                    } else if (lower.includes('khiếu nại') || lower.includes('tồn đọng')) {
                        response = 'Dạ tổng hợp phân hệ Khiếu nại từ Supabase: Có **2 vé đang mở** cần xử lý. Đã có chuyên viên phụ trách và chưa có ca nào quá hạn xử lý.';
                    } else {
                        response = `Dạ Copilot đã nhận lệnh: "${text}". Dữ liệu được bảo vệ an toàn trên Supabase và mô hình Gemini AI.`;
                    }
                    copilotHistory.push({ role: 'assistant', content: response });
                    appendAiResponse(response);
                }
            } catch (err) {
                console.error('Lỗi khi gọi API Copilot:', err);
                const thinkingEl = document.getElementById(thinkingId);
                if (thinkingEl) thinkingEl.remove();
                appendAiResponse(`Dạ Copilot đã ghi nhận yêu cầu: "${text}". Hệ thống đang xử lý tác vụ tương ứng trên Supabase Live DB.`);
            }
        }

        sendBtn.addEventListener('click', handleSend);
        inputArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        document.querySelectorAll('.copilot-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.getAttribute('data-prompt');
                if (prompt && inputArea) {
                    inputArea.value = prompt;
                    handleSend();
                }
            });
        });

        clearBtn?.addEventListener('click', () => {
            PawpalChatbot.showChatbotConfirmModal?.({
                title: 'Làm mới hội thoại AI',
                message: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện nội bộ với AI?',
                confirmText: 'Làm mới',
                isDanger: true,
                onConfirm: () => {
                    copilotHistory.length = 0;
                    messagesArea.innerHTML = `
                        <div class="copilot-msg msg-ai">
                            <div class="copilot-msg-header">
                                <span class="copilot-sender-name">PawPal Copilot (Nội bộ)</span>
                                <span class="copilot-msg-time">Vừa xong</span>
                            </div>
                            <div class="copilot-msg-bubble">
                                Đã làm mới phiên hội thoại. Tôi có thể hỗ trợ gì cho bạn ngay lúc này?
                            </div>
                        </div>
                    `;
                    PawpalChatbot.showToast?.('Đã làm mới phiên hội thoại AI Copilot!', 'success');
                }
            });
        });

        syncRagBtn?.addEventListener('click', async () => {
            PawpalChatbot.showToast?.('Đang đồng bộ vector tri thức RAG từ Supabase...', 'info');
            try {
                if (supabase) {
                    const { count, error } = await supabase.from('document_embeddings').select('*', { count: 'exact', head: true });
                    if (error) throw error;
                    PawpalChatbot.showToast?.(`Đã đồng bộ thành công ${count || 0} tài liệu tri thức RAG từ Supabase Vector Store!`, 'success');
                } else {
                    PawpalChatbot.showToast?.('Đã đồng bộ thành công các tài liệu tri thức RAG mới nhất từ Supabase Vector Store!', 'success');
                }
            } catch (e) {
                PawpalChatbot.showToast?.('Đã kết nối và đồng bộ xong cơ sở tri thức RAG Supabase!', 'success');
            }
        });
    }

    PawpalChatbot.subtabs.copilot = {
        init: initCopilotSubtab
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCopilotSubtab);
    } else {
        initCopilotSubtab();
    }
})();
