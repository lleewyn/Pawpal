document.addEventListener('DOMContentLoaded', () => {
            const container = document.getElementById('faqAccordionContainer');
            const searchInput = document.getElementById('faqSearchInput');
            const drawer = document.getElementById('chatDrawer');

            // Render FAQ
            function renderFaq(filterText = '', topic = '') {
                container.innerHTML = '';
                const faqList = window.PawPalSupport.faq;

                const filtered = faqList.filter(item => {
                    const matchText = item.title.toLowerCase().includes(filterText.toLowerCase()) ||
                        item.content.toLowerCase().includes(filterText.toLowerCase());
                    const matchTopic = topic ? item.category === topic : true;
                    return matchText && matchTopic;
                });

                if (filtered.length === 0) {
                    container.innerHTML = '<p class="text-muted text-center py-3">Không tìm thấy câu hỏi phù hợp cho bạn.</p>';
                    return;
                }

                filtered.forEach(item => {
                    const accItem = document.createElement('div');
                    accItem.className = 'faq-accordion-item';
                    accItem.innerHTML = `
                        <button class="faq-accordion-header">
                            <span>${item.title}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        <div class="faq-accordion-content">
                            <div class="faq-accordion-body">${item.content}</div>
                        </div>
                    `;

                    const header = accItem.querySelector('.faq-accordion-header');
                    const content = accItem.querySelector('.faq-accordion-content');

                    header.addEventListener('click', () => {
                        const isActive = accItem.classList.contains('active');
                        // Close all
                        document.querySelectorAll('.faq-accordion-item').forEach(i => {
                            i.classList.remove('active');
                            i.querySelector('.faq-accordion-content').style.maxHeight = null;
                        });

                        if (!isActive) {
                            accItem.classList.add('active');
                            content.style.maxHeight = content.scrollHeight + 'px';
                        }
                    });

                    container.appendChild(accItem);
                });
            }

            // Search input handler
            searchInput.addEventListener('input', (e) => {
                renderFaq(e.target.value);
            });

            // Topic cards handler
            document.querySelectorAll('.bento-card-topic').forEach(card => {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    const topic = card.getAttribute('data-topic');
                    renderFaq('', topic);
                });
            });

            // Drawer control
            document.getElementById('btnOpenChatDrawer').addEventListener('click', () => {
                drawer.classList.add('open');
            });
            document.getElementById('btnCloseChatDrawer').addEventListener('click', () => {
                drawer.classList.remove('open');
            });

            // Send Chat handler
            const chatInput = document.getElementById('chatInputText');
            const messagesArea = document.getElementById('chatMessagesArea');

            function appendChatBubble(text, sender = 'user') {
                const bubble = document.createElement('div');
                bubble.className = `chat-bubble ${sender}`;
                bubble.textContent = text;
                messagesArea.appendChild(bubble);
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }

            function triggerChatSend(text) {
                if (!text.trim()) return;
                appendChatBubble(text, 'user');
                chatInput.value = '';

                // Gọi handler
                const res = window.PawPalSupport.processChatInput(text, (reply) => {
                    appendChatBubble(reply, 'bot');
                });

                if (res.error) {
                    // Hiển thị bong bóng lỗi hệ thống
                    appendChatBubble(res.text, 'system-error');
                }
            }

            document.getElementById('btnSendChatMessage').addEventListener('click', () => {
                triggerChatSend(chatInput.value);
            });

            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    triggerChatSend(chatInput.value);
                }
            });

            // Quick replies click
            document.querySelectorAll('.btn-quick-reply').forEach(btn => {
                btn.addEventListener('click', () => {
                    const text = btn.getAttribute('data-val');
                    triggerChatSend(text);
                });
            });

            renderFaq();
        });