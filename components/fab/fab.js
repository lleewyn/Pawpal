
function initFab() {
    if (window.__pawpalFabInitialized) return;

    const bookingBtn = document.getElementById('fabBookingBtn');
    if (bookingBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                bookingBtn.classList.add('visible');
            } else {
                bookingBtn.classList.remove('visible');
            }
        }, { passive: true });
    }

    const aiBtn    = document.getElementById('fabAiBtn');
    const chatPanel = document.getElementById('fabChatPanel');
    const closeBtn = document.getElementById('fabChatClose');
    const input    = document.getElementById('fabChatInput');
    const sendBtn  = document.getElementById('fabChatSend');
    const messages = document.getElementById('fabChatMessages');

    if (!aiBtn || !chatPanel) return;

    aiBtn.addEventListener('click', () => {
        chatPanel.classList.toggle('open');
        if (chatPanel.classList.contains('open') && input) {
            setTimeout(() => input.focus(), 300);
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => chatPanel.classList.remove('open'));
    }

    if (messages) {
        messages.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });
    }

    const GEMINI_API_KEY = "AIzaSyDWkR8qFUKBmpu3GZi2GP2OYQpA-TUSkcg";
    
    let currentUserId = 'guest';
    try {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (currentUser && (currentUser.id || currentUser._supabaseId)) {
            currentUserId = currentUser._supabaseId || currentUser.id;
        }
    } catch(e) {}
    
    const CHAT_HISTORY_KEY = `pawpal_chat_history_${currentUserId}`;
    let conversationHistory = [];
    try {
        const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        if (savedHistory) {
            conversationHistory = JSON.parse(savedHistory);
        }
    } catch(e) {}

    function saveChatHistory() {
        if (conversationHistory.length > 50) {
            conversationHistory = conversationHistory.slice(-50); 
        }
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversationHistory));
    }

    if (conversationHistory.length > 0 && messages) {
        messages.innerHTML = ''; 
        conversationHistory.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = `fab-chat-bubble fab-chat-bubble--${msg.role === 'user' ? 'user' : 'bot'}`;
            bubble.innerHTML = msg.role === 'model' ? msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') : msg.content;
            messages.appendChild(bubble);
        });
        setTimeout(() => scrollToBottom(), 100);
    }

    const clearBtn = document.getElementById('fabChatClear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này?')) {
                conversationHistory = [];
                localStorage.removeItem(CHAT_HISTORY_KEY);
                if (messages) {
                    messages.innerHTML = `
                        <div class="fab-chat-bubble fab-chat-bubble--bot">
                            Xin chào! Tôi là trợ lý AI của PawPal <br>
                            Bạn cần tư vấn về dịch vụ nào?
                        </div>
                        <div class="fab-chat-suggestions">
                            <button class="fab-chat-suggest" onclick="pawpalAIAsk(this)">Dịch vụ Spa và Grooming</button>
                            <button class="fab-chat-suggest" onclick="pawpalAIAsk(this)">Pet Hotel giá bao nhiêu?</button>
                            <button class="fab-chat-suggest" onclick="pawpalAIAsk(this)">Cần chuẩn bị gì khi gửi bé?</button>
                        </div>
                    `;
                }
            }
        });
    }

    async function sendMessage() {
        if (!input || !input.value.trim()) return;
        const text = input.value.trim();
        input.value = '';
        appendMessage(text, 'user');
        showTyping();
        
        let aiTimerSeconds = 0;
        let aiTimerInterval = null;
        let finalReplyForConsole = '';
        
        try {
            aiTimerInterval = setInterval(() => {
                aiTimerSeconds++;
                console.log(`[PawPal AI] Đang xử lý... ${aiTimerSeconds} giây`);
            }, 1000);

            let token = "";
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (db) {
                const { data } = await db.auth.getSession();
                if (data && data.session) {
                    token = data.session.access_token;
                }
            }
            if (!token) {
                try {
                    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                    if (currentUser && (currentUser.id || currentUser._supabaseId)) {
                        token = 'local:' + (currentUser._supabaseId || currentUser.id);
                        console.log('[Chat] Dùng local auth, userId:', currentUser._supabaseId || currentUser.id);
                    }
                } catch(e) {}
            }
            
            if (conversationHistory.length === 0) {
            }
            
            conversationHistory.push({
                "role": "user",
                "content": text
            });
            saveChatHistory();

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ messages: conversationHistory })
            });

            removeTyping();

            const apiKeyUsed = response.headers.get('X-API-Key-Used');
            if (apiKeyUsed) {
                console.log(`[PawPal AI] Đang sử dụng API Key bắt đầu bằng: ${apiKeyUsed}...`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            let botBubble = null;
            let fullReply = '';
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const text = decoder.decode(value, { stream: true });
                const lines = text.split('\n');
                
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const parsed = JSON.parse(line.slice(6));
                        
                        if (parsed.done) {
                            if (fullReply) {
                                conversationHistory.push({ "role": "model", "content": fullReply });
                                saveChatHistory();
                            }
                            break;
                        }

                        if (parsed.error) {
                            console.error("[PawPal AI Error]", parsed.error);
                        }
                        
                        if (parsed.reply) {
                            fullReply = parsed.reply;
                            if (!botBubble) {
                                botBubble = document.createElement('div');
                                botBubble.className = 'fab-chat-bubble fab-chat-bubble--bot';
                                messages.appendChild(botBubble);
                            }
                            botBubble.innerHTML = fullReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                            scrollToBottom();
                        } else if (parsed.chunk) {
                            fullReply += parsed.chunk;
                            if (!botBubble) {
                                botBubble = document.createElement('div');
                                botBubble.className = 'fab-chat-bubble fab-chat-bubble--bot';
                                messages.appendChild(botBubble);
                            }
                            botBubble.innerHTML = fullReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                            scrollToBottom();
                        }
                    } catch(e) { }
                }
            }
            
            if (!fullReply && !botBubble) {
                appendMessage('Xin lỗi, hệ thống PawPal AI đang gặp sự cố kết nối. Quý khách vui lòng thử lại sau.', 'bot');
            }
            finalReplyForConsole = fullReply;
        } catch (error) {
            console.error("Chatbot request failed", error);
            removeTyping();
            appendMessage("Xin lỗi, không thể kết nối tới PawPal AI lúc này.", 'bot');
        } finally {
            if (aiTimerInterval) clearInterval(aiTimerInterval);
            if (aiTimerSeconds > 0) {
                console.log(`[PawPal AI] Xử lý xong sau ${aiTimerSeconds} giây. Phản hồi:`, finalReplyForConsole || "Không có phản hồi (hoặc lỗi)");
            }
        }
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    window.__pawpalFabInitialized = true;

    window.pawpalAIAsk = function(btn) {
        if (!input) return;
        input.value = btn.innerText;
        sendMessage();
    };
    function scrollToBottom() {
        if (messages) {
            requestAnimationFrame(() => {
                messages.scrollTop = messages.scrollHeight;
            });
        }
    }

    function appendMessage(text, type) {
        const bubble = document.createElement('div');
        bubble.className = `fab-chat-bubble fab-chat-bubble--${type}`;
        bubble.innerHTML = text;
        if (type === 'user') {
            const sug = messages && messages.querySelector('.fab-chat-suggestions');
            if (sug) sug.remove();
        }
        if (messages) {
            messages.appendChild(bubble);
            scrollToBottom();
        }
    }

    function showTyping() {
        const typing = document.createElement('div');
        typing.className = 'fab-chat-bubble fab-chat-bubble--typing';
        typing.id = 'fabTyping';
        typing.innerHTML = '<span></span><span></span><span></span>';
        if (messages) {
            messages.appendChild(typing);
            scrollToBottom();
        }
    }

    function removeTyping() {
        const t = document.getElementById('fabTyping');
        if (t) t.remove();
    }
}


document.addEventListener('footerInjected', function () {
    setTimeout(initFab, 100);
});

if (document.readyState !== 'loading') {
    setTimeout(initFab, 0);
} else {
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(initFab, 0);
    });
}