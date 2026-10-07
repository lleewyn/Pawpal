
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

    let currentSessionToken = sessionStorage.getItem('pawpal_fab_session_token');
    if (!currentSessionToken) {
        currentSessionToken = 'st_' + Math.random().toString(36).substring(2, 12);
        sessionStorage.setItem('pawpal_fab_session_token', currentSessionToken);
    }
    let activeConversationId = sessionStorage.getItem('pawpal_fab_conv_id') || null;

    function saveChatHistory() {
        if (conversationHistory.length > 50) {
            conversationHistory = conversationHistory.slice(-50); 
        }
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversationHistory));
    }

    function appendStaffMessage(text, staffName) {
        const bubble = document.createElement('div');
        bubble.className = 'fab-chat-bubble fab-chat-bubble--staff';
        bubble.innerHTML = `<span class="staff-sender-title">${staffName || 'Chuyên viên CSKH'}</span>${text.replace(/\n/g, '<br>')}`;
        if (messages) {
            messages.appendChild(bubble);
            scrollToBottom();
        }
    }

    const toxicBanner = document.getElementById('fabToxicBanner');
    const toxicCountdown = document.getElementById('fabToxicCountdown');
    let blockTimerInterval = null;

    function handleToxicWarning(warn) {
        if (!warn) return;
        if (warn.level === 3 || warn.blocked_until) {
            startBlockCountdown(warn.blocked_until);
        } else if (toxicBanner) {
            toxicBanner.textContent = warn.message || 'Vui lòng giữ ngôn từ lịch thiệp để chuyên viên hỗ trợ tốt nhất nhé ạ!';
            toxicBanner.className = 'fab-toxic-banner' + (warn.level === 2 ? ' danger' : '');
            toxicBanner.style.display = 'flex';
            setTimeout(() => {
                if (toxicBanner) toxicBanner.style.display = 'none';
            }, 12000);
        }
    }

    function startBlockCountdown(blockedUntil) {
        if (!blockedUntil) return;
        const targetTime = new Date(blockedUntil).getTime();
        if (blockTimerInterval) clearInterval(blockTimerInterval);

        function updateCountdown() {
            const now = Date.now();
            const diffSec = Math.max(0, Math.ceil((targetTime - now) / 1000));
            if (diffSec <= 0) {
                clearInterval(blockTimerInterval);
                if (toxicCountdown) toxicCountdown.style.display = 'none';
                if (input) {
                    input.disabled = false;
                    input.placeholder = 'Nhập câu hỏi...';
                }
                if (sendBtn) sendBtn.disabled = false;
                return;
            }

            const m = Math.floor(diffSec / 60);
            const s = diffSec % 60;
            const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
            if (toxicCountdown) {
                toxicCountdown.innerHTML = `Khung chat tạm khóa do vi phạm tiêu chuẩn: Còn <strong>${timeStr}</strong>`;
                toxicCountdown.style.display = 'block';
            }
            if (input) {
                input.disabled = true;
                input.placeholder = `Tạm khóa: Còn ${timeStr}`;
            }
            if (sendBtn) sendBtn.disabled = true;
        }

        updateCountdown();
        blockTimerInterval = setInterval(updateCountdown, 1000);
    }

    function appendSystemNotice(html) {
        const bubble = document.createElement('div');
        bubble.className = 'fab-chat-bubble fab-chat-bubble--system-notice';
        bubble.innerHTML = html;
        if (messages) {
            messages.appendChild(bubble);
            scrollToBottom();
        }
    }

    function subscribeToStaffRealtime(convId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || typeof db.channel !== 'function' || !convId) return;
        if (window.__pawpalFabRealtimeChannel) {
            try { db.removeChannel(window.__pawpalFabRealtimeChannel); } catch(e) {}
        }
        window.__pawpalFabRealtimeChannel = db.channel('fab-customer-' + convId)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'chat_message', 
                filter: `conversation_id=eq.${convId}` 
            }, (payload) => {
                const newM = payload.new;
                if (newM && newM.sender_type === 'staff') {
                    const exists = conversationHistory.some(h => h._msgId === newM.id);
                    if (!exists) {
                        conversationHistory.push({
                            role: 'model',
                            content: newM.content,
                            _msgId: newM.id,
                            isStaff: true,
                            senderName: newM.sender_name || 'Chuyên viên CSKH'
                        });
                        saveChatHistory();
                        appendStaffMessage(newM.content, newM.sender_name || 'Chuyên viên CSKH');
                    }
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_conversation',
                filter: `id=eq.${convId}`
            }, (payload) => {
                const updated = payload.new;
                if (updated && updated.status === 'agent_handling') {
                    appendSystemNotice('<strong>Chuyên viên CSKH</strong> đã tiếp nhận ca chat để hỗ trợ trực tiếp cho sen!');
                }
                if (updated && updated.blocked_until && new Date(updated.blocked_until) > new Date()) {
                    startBlockCountdown(updated.blocked_until);
                }
            })
            .subscribe();
    }

    if (activeConversationId) {
        subscribeToStaffRealtime(activeConversationId);
    }

    // Tự động khôi phục lịch sử chat từ Supabase Live DB nếu local storage đang rỗng
    async function restoreRemoteHistoryIfAvailable() {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || conversationHistory.length > 0) return;

        try {
            let conv = null;
            if (activeConversationId) {
                const { data } = await db.from('chat_conversation').select('id, status').eq('id', activeConversationId).maybeSingle();
                conv = data;
            } else if (currentUserId && currentUserId !== 'guest') {
                const { data } = await db.from('chat_conversation')
                    .select('id, status')
                    .eq('customer_id', currentUserId)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                conv = data;
            }

            if (conv && conv.id) {
                activeConversationId = conv.id;
                sessionStorage.setItem('pawpal_fab_conv_id', activeConversationId);
                subscribeToStaffRealtime(activeConversationId);

                const { data: dbMsgs } = await db.from('chat_message')
                    .select('*')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: true })
                    .limit(30);

                if (dbMsgs && dbMsgs.length > 0) {
                    conversationHistory = dbMsgs.map(m => ({
                        role: m.sender_type === 'customer' ? 'user' : 'model',
                        content: m.content,
                        _msgId: m.id,
                        isStaff: m.sender_type === 'staff',
                        senderName: m.sender_name
                    }));
                    saveChatHistory();
                    renderLoadedHistory();
                }
            }
        } catch(e) {
            console.warn('[FAB] Không thể khôi phục lịch sử chat từ Supabase:', e.message);
        }
    }

    function renderLoadedHistory() {
        if (!messages) return;
        messages.innerHTML = '';
        conversationHistory.forEach(msg => {
            const bubble = document.createElement('div');
            if (msg.isStaff) {
                bubble.className = 'fab-chat-bubble fab-chat-bubble--staff';
                bubble.innerHTML = `<span class="staff-sender-title">${msg.senderName || 'Chuyên viên CSKH'}</span>${msg.content.replace(/\n/g, '<br>')}`;
            } else {
                bubble.className = `fab-chat-bubble fab-chat-bubble--${msg.role === 'user' ? 'user' : 'bot'}`;
                bubble.innerHTML = msg.role === 'model' ? msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') : msg.content;
            }
            messages.appendChild(bubble);
        });
        setTimeout(() => scrollToBottom(), 100);
    }

    if (conversationHistory.length > 0) {
        renderLoadedHistory();
    } else {
        restoreRemoteHistoryIfAvailable();
    }

    const clearBtn = document.getElementById('fabChatClear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này?')) {
                conversationHistory = [];
                localStorage.removeItem(CHAT_HISTORY_KEY);
                sessionStorage.removeItem('pawpal_fab_conv_id');
                activeConversationId = null;
                if (messages) {
                    messages.innerHTML = `
                        <div class="fab-chat-bubble fab-chat-bubble--bot">
                            Xin chào! Tôi là trợ lý AI của PawPal <br>
                            Bạn cần tư vấn về dịch vụ nào?
                        </div>
                        <div class="fab-chat-suggestions">
                            <button class="fab-chat-suggest">Dịch vụ Spa và Grooming</button>
                            <button class="fab-chat-suggest">Pet Hotel giá bao nhiêu?</button>
                            <button class="fab-chat-suggest">Cần chuẩn bị gì khi gửi bé?</button>
                            <button class="fab-chat-suggest fab-chat-suggest--agent">Gặp nhân viên tư vấn</button>
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

            const bodyPayload = {
                messages: conversationHistory,
                conversationId: activeConversationId || undefined,
                sessionToken: currentSessionToken,
                stream: true
            };

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream, application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(bodyPayload)
            });

            removeTyping();

            const apiKeyUsed = response.headers.get('X-API-Key-Used');
            if (apiKeyUsed) {
                console.log(`[PawPal AI] Đang sử dụng API Key bắt đầu bằng: ${apiKeyUsed}...`);
            }

            let botBubble = null;
            let fullReply = '';
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                // Xử lý JSON response tiêu chuẩn
                const data = await response.json();
                if (data.conversationId && data.conversationId !== activeConversationId) {
                    activeConversationId = data.conversationId;
                    sessionStorage.setItem('pawpal_fab_conv_id', activeConversationId);
                    subscribeToStaffRealtime(activeConversationId);
                }

                fullReply = data.reply || data.text || '';
                if (fullReply) {
                    botBubble = document.createElement('div');
                    botBubble.className = 'fab-chat-bubble fab-chat-bubble--bot';
                    botBubble.innerHTML = fullReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                    messages.appendChild(botBubble);
                    scrollToBottom();
                    conversationHistory.push({ "role": "model", "content": fullReply });
                    saveChatHistory();
                }
            } else {
                // Xử lý SSE Event Stream
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    
                    const text = decoder.decode(value, { stream: true });
                    const lines = text.split('\n');
                    
                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const parsed = JSON.parse(line.slice(6));
                            
                            if (parsed.conversationId && parsed.conversationId !== activeConversationId) {
                                activeConversationId = parsed.conversationId;
                                sessionStorage.setItem('pawpal_fab_conv_id', activeConversationId);
                                subscribeToStaffRealtime(activeConversationId);
                            }

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

    if (messages) {
        messages.addEventListener('click', (e) => {
            const btn = e.target.closest('.fab-chat-suggest');
            if (btn) {
                if (!input) return;
                input.value = btn.innerText || btn.textContent;
                sendMessage();
            }
        });
    }

    window.__pawpalFabInitialized = true;

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