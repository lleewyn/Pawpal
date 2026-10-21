// tab-chatbot-copilot.js - Subtab Trợ lý AI Copilot Pawpal-er (Kết nối Gemini AI & Supabase RAG)
(function() {
    'use strict';

    const PawpalChatbot = window.PawpalChatbot = window.PawpalChatbot || {};
    PawpalChatbot.subtabs = PawpalChatbot.subtabs || {};
    PawpalChatbot.subtabs.copilot = PawpalChatbot.subtabs.copilot || {};

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
        const btnNewCopilotSession = document.getElementById('btnNewCopilotSession');
        const inputCopilotSessionSearch = document.getElementById('inputCopilotSessionSearch');
        const copilotSessionsList = document.getElementById('copilotSessionsList');
        const currentCopilotSessionTitle = document.getElementById('currentCopilotSessionTitle');

        if (!sendBtn || !inputArea || !messagesArea) return;
        if (sendBtn.dataset.copilotBound === 'true') return;
        sendBtn.dataset.copilotBound = 'true';
        let isSending = false;

        let copilotSessions = [];
        let activeSessionId = null;

        function formatMsgTime(timestamp) {
            if (!timestamp) {
                return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            try {
                const d = new Date(timestamp);
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                return '';
            }
        }

        function smartScrollToBottom(container, force = false) {
            if (!container) return;
            const threshold = 140; // px từ mép đáy
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
            if (force || isNearBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }

        function appendUserMessage(text, timestamp) {
            const timeStr = formatMsgTime(timestamp);
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
            smartScrollToBottom(messagesArea, true);
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

        function formatMarkdownForCopilot(rawText) {
            if (!rawText) return '';

            function formatInline(str) {
                if (!str) return '';
                let s = escapeHtml(str);

                // Markdown links: [label](url)
                s = s.replace(/\[(.*?)\]\((#tab-[a-z0-9_?&=%-]+|\/admin#tab-[a-z0-9_?&=%-]+|[a-zA-Z0-9_\/.:#?&=%-]+)\)/gi, (match, label, url) => {
                    const cleanUrl = url.trim();
                    const isTab = cleanUrl.includes('#tab-');
                    return `<a href="${cleanUrl}" class="user-name-link copilot-deep-link" ${isTab ? '' : 'target="_blank" rel="noopener"'} style="color: #236B48; font-weight: 600; text-decoration: underline;">${label}</a>`;
                });

                // Plain hashtag tab references like #tab-calendar, #tab-inventory
                s = s.replace(/(^|\s)(#tab-[a-z0-9_?&=%-]+)/g, '$1<a href="$2" class="user-name-link copilot-deep-link" style="color: #236B48; font-weight: 600; text-decoration: underline;">$2</a>');

                // Auto-link navigation phrases if not already linked
                const navLinks = [
                    { phrase: 'Mở xử lý ticket', hash: '#tab-complaint-detail' },
                    { phrase: 'Mở khiếu nại', hash: '#tab-complaint-services' },
                    { phrase: 'Mở lịch hẹn', hash: '#tab-service-bookings' },
                    { phrase: 'Mở quản lý kho', hash: '#tab-order-products' },
                    { phrase: 'Mở đơn hàng', hash: '#tab-order-detail' },
                    { phrase: 'Mở hồ sơ 360°', hash: '#tab-profile' }
                ];
                navLinks.forEach(({ phrase, hash }) => {
                    const regex = new RegExp(`(?<!href="[^"]*">${phrase}|>${phrase})\\b${phrase}\\b(?!<\\/a>)`, 'g');
                    s = s.replace(regex, `<a href="${hash}" class="user-name-link copilot-deep-link" style="color: #236B48; font-weight: 600; text-decoration: underline;">${phrase}</a>`);
                });

                // Bold **text**
                s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

                // Italic *text* tuân thủ CommonMark (không cho phép khoảng trắng sát dấu sao)
                s = s.replace(/(?<!\*)\*(?!\s)([^*]+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>');

                // Inline code `code`
                s = s.replace(/`([^`]+)`/g, (m, code) => {
                    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
                    if (isUuid) {
                        return `<a href="#tab-complaint-detail" onclick="sessionStorage.setItem('pawpal_admin_complaint_selected_id', '${code}');" title="Xem chi tiết ticket ${code}" style="font-family: monospace; font-size: 11.5px; background: rgba(35, 107, 72, 0.08); padding: 1px 5px; border-radius: 4px; color: #236B48; text-decoration: underline; font-weight: 600;">#${code.slice(0, 8)}...</a>`;
                    }
                    return `<code style="background: rgba(35, 107, 72, 0.08); padding: 1px 5px; border-radius: 4px; font-size: 11.5px; color: #236B48; font-family: monospace;">${code}</code>`;
                });

                return s;
            }

            const lines = rawText.split('\n');
            const outputBlocks = [];
            let i = 0;

            while (i < lines.length) {
                const line = lines[i];
                const trimmed = line.trim();

                // Markdown Table detection: dòng hiện tại chứa '|' và dòng tiếp theo là separator '|:---|'
                if (trimmed.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|?\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1].trim())) {
                    const headerLine = trimmed;
                    const sepLine = lines[i + 1].trim();
                    const rowLines = [];
                    i += 2;
                    while (i < lines.length && lines[i].trim().includes('|')) {
                        rowLines.push(lines[i].trim());
                        i++;
                    }

                    const parseCells = (l) => {
                        let c = l;
                        if (c.startsWith('|')) c = c.substring(1);
                        if (c.endsWith('|')) c = c.substring(0, c.length - 1);
                        return c.split('|').map(s => s.trim());
                    };

                    const headers = parseCells(headerLine);
                    const alignments = parseCells(sepLine).map(s => {
                        if (s.startsWith(':') && s.endsWith(':')) return 'center';
                        if (s.endsWith(':')) return 'right';
                        return 'left';
                    });

                    let thead = '<tr>';
                    headers.forEach((h, idx) => {
                        const align = alignments[idx] || 'left';
                        thead += `<th style="text-align: ${align};">${formatInline(h)}</th>`;
                    });
                    thead += '</tr>';

                    let tbody = '';
                    rowLines.forEach(r => {
                        const cells = parseCells(r);
                        tbody += '<tr>';
                        cells.forEach((cell, idx) => {
                            const align = alignments[idx] || 'left';
                            let formattedCell = formatInline(cell);
                            const raw = cell.replace(/`/g, '').trim();

                            // Tự động gán badge trực quan cho mức độ và trạng thái
                            if (raw === 'Cao' || raw === 'Khẩn cấp') {
                                formattedCell = `<span class="admin-badge badge-danger" style="font-size: 11px;">${raw}</span>`;
                            } else if (raw === 'Trung bình') {
                                formattedCell = `<span class="admin-badge badge-warning" style="font-size: 11px;">${raw}</span>`;
                            } else if (raw === 'Thấp') {
                                formattedCell = `<span class="admin-badge badge-neutral" style="font-size: 11px;">${raw}</span>`;
                            } else if (raw === 'Chờ tiếp nhận' || raw === 'Chờ xử lý') {
                                formattedCell = `<span class="admin-badge badge-warning" style="font-size: 11px;">${raw}</span>`;
                            } else if (raw === 'Đang xử lý') {
                                formattedCell = `<span class="admin-badge badge-active" style="font-size: 11px;">${raw}</span>`;
                            } else if (raw === 'Hoàn thành' || raw === 'Đã đóng' || raw === 'ACTIVE') {
                                formattedCell = `<span class="admin-badge badge-active" style="font-size: 11px;">${raw}</span>`;
                            }

                            tbody += `<td style="text-align: ${align};">${formattedCell}</td>`;
                        });
                        tbody += '</tr>';
                    });

                    outputBlocks.push(`
                        <div class="copilot-table-wrapper">
                            <table class="admin-table copilot-table">
                                <thead>${thead}</thead>
                                <tbody>${tbody}</tbody>
                            </table>
                        </div>
                    `);
                    continue;
                }

                // Tiêu đề Headings: ###, ##, #
                if (trimmed.startsWith('### ')) {
                    outputBlocks.push(`<h4 style="margin: 12px 0 6px; color: var(--text-heading, #236B48); font-size: 13.5px; font-weight: 700;">${formatInline(trimmed.replace(/^###\s+/, ''))}</h4>`);
                    i++;
                    continue;
                }
                if (trimmed.startsWith('## ')) {
                    outputBlocks.push(`<h3 style="margin: 14px 0 8px; color: var(--text-heading, #236B48); font-size: 14.5px; font-weight: 700;">${formatInline(trimmed.replace(/^##\s+/, ''))}</h3>`);
                    i++;
                    continue;
                }
                if (trimmed.startsWith('# ')) {
                    outputBlocks.push(`<h2 style="margin: 16px 0 10px; color: var(--text-heading, #236B48); font-size: 15.5px; font-weight: 700;">${formatInline(trimmed.replace(/^#\s+/, ''))}</h2>`);
                    i++;
                    continue;
                }

                // Danh sách không thứ tự (Unordered List: * item hoặc - item)
                if (/^[\*\-]\s+/.test(trimmed)) {
                    let listHtml = '<ul style="margin: 6px 0 10px 18px; padding: 0;">';
                    while (i < lines.length && /^[\*\-]\s+/.test(lines[i].trim())) {
                        const itemText = lines[i].trim().replace(/^[\*\-]\s+/, '');
                        listHtml += `<li style="margin-bottom: 4px;">${formatInline(itemText)}</li>`;
                        i++;
                    }
                    listHtml += '</ul>';
                    outputBlocks.push(listHtml);
                    continue;
                }

                // Danh sách có thứ tự (Ordered List: 1. item)
                if (/^\d+\.\s+/.test(trimmed)) {
                    let listHtml = '<ol style="margin: 6px 0 10px 18px; padding: 0;">';
                    while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
                        const itemText = lines[i].trim().replace(/^\d+\.\s+/, '');
                        listHtml += `<li style="margin-bottom: 4px;">${formatInline(itemText)}</li>`;
                        i++;
                    }
                    listHtml += '</ol>';
                    outputBlocks.push(listHtml);
                    continue;
                }

                // Dòng trống
                if (!trimmed) {
                    i++;
                    continue;
                }

                // Đoạn văn bản thông thường
                outputBlocks.push(`<p style="margin: 0 0 8px 0; line-height: 1.55;">${formatInline(trimmed)}</p>`);
                i++;
            }

            return outputBlocks.join('');
        }

        function appendAiResponse(text, timestamp) {
            const timeStr = formatMsgTime(timestamp);
            const formatted = formatMarkdownForCopilot(text || '');
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
            smartScrollToBottom(messagesArea, false);
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
<div role="status" aria-label="Đang chuẩn bị câu trả lời"><span class="skeleton-text" style="width:180px;"></span><span class="skeleton-text" style="display:block;width:260px;margin-top:10px;"></span></div>
                    </div>
                </div>
            `;
            messagesArea.insertAdjacentHTML('beforeend', msgHtml);
            smartScrollToBottom(messagesArea, false);
            return id;
        }

        async function getAdminAuthToken() {
            try {
                if (window.getSupabaseClient) {
                    const client = window.getSupabaseClient();
                    const session = (await client.auth.getSession())?.data?.session;
                    if (session?.access_token) return session.access_token;
                } else if (window.supabase) {
                    const session = (await window.supabase.auth.getSession())?.data?.session;
                    if (session?.access_token) return session.access_token;
                }
            } catch (e) {}

            try {
                const storedAuth = JSON.parse(localStorage.getItem('pawpal_admin_supabase_auth') || '{}');
                if (storedAuth?.access_token) return storedAuth.access_token;
            } catch (e) {}

            try {
                const staffToken = sessionStorage.getItem('pawpal_staff_token') || localStorage.getItem('pawpal_staff_token');
                if (staffToken && !staffToken.startsWith('local:')) return staffToken;
            } catch (e) {}

            return null;
        }

        function formatSessionTime(dateInput) {
            if (!dateInput) return '';
            try {
                const d = new Date(dateInput);
                const now = new Date();
                const diffMs = now - d;
                const diffMins = Math.floor(diffMs / (60 * 1000));
                if (diffMins < 1) return 'Vừa xong';
                if (diffMins < 60) return `${diffMins} phút trước`;
                const diffHours = Math.floor(diffMins / 60);
                if (diffHours < 24 && d.getDate() === now.getDate()) {
                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                return `${dd}/${mm}`;
            } catch (e) {
                return '';
            }
        }

        function saveSessionsToStorage() {
            try {
                localStorage.setItem('pawpal_copilot_sessions', JSON.stringify(copilotSessions));
                sessionStorage.setItem('pawpal_copilot_active_session_id', activeSessionId || '');
            } catch (e) {}
        }

        const defaultGreetingHtml = `
            <div class="copilot-msg msg-ai">
                <div class="copilot-msg-header">
                    <span class="copilot-sender-name">PawPal Copilot (Nội bộ)</span>
                    <span class="copilot-msg-time">Vừa xong</span>
                </div>
                <div class="copilot-msg-bubble">
                    Xin chào! Em là <strong>PawPal AI Copilot</strong> dành cho Quản trị viên và Chuyên viên Vận hành. Em có thể hỗ trợ tra cứu lịch hẹn, sản phẩm sắp hết hàng, đơn hàng, khách hàng hoặc tóm tắt khiếu nại. Anh/Chị cần kiểm tra thông tin gì hôm nay ạ?
                </div>
            </div>
        `;

        function renderSessionsList(filterText = '') {
            if (!copilotSessionsList) return;
            const term = (filterText || '').trim().toLowerCase();
            const filtered = copilotSessions.filter(s => {
                if (!term) return true;
                const inTitle = (s.title || '').toLowerCase().includes(term);
                const inMsgs = (s.messages || []).some(m => (m.content || '').toLowerCase().includes(term));
                return inTitle || inMsgs;
            });

            if (filtered.length === 0) {
                copilotSessionsList.innerHTML = `
                    <div class="copilot-session-empty">
                        ${term ? 'Không tìm thấy phiên chat phù hợp.' : 'Chưa có phiên chat nào.<br>Bắt đầu ngay bằng câu hỏi đầu tiên!'}
                    </div>
                `;
                return;
            }

            copilotSessionsList.innerHTML = filtered.map(s => {
                const isActive = s.id === activeSessionId;
                const timeLabel = formatSessionTime(s.updated_at || s.created_at);
                const count = Array.isArray(s.messages) ? s.messages.length : 0;
                return `
                    <div class="copilot-session-item ${isActive ? 'active' : ''}" data-session-id="${s.id}">
                        <div class="copilot-session-row-top">
                            <span class="copilot-session-title" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
                            <button type="button" class="btn-del-session" data-delete-session-id="${s.id}" title="Xóa phiên này">Xóa</button>
                        </div>
                        <div class="copilot-session-meta">
                            <span>${count} tin nhắn</span>
                            <span>${timeLabel}</span>
                        </div>
                    </div>
                `;
            }).join('');

            copilotSessionsList.querySelectorAll('.copilot-session-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-del-session')) return;
                    const sId = item.getAttribute('data-session-id');
                    if (sId) switchSession(sId);
                });
            });

            copilotSessionsList.querySelectorAll('.btn-del-session').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sId = btn.getAttribute('data-delete-session-id');
                    if (sId) deleteSession(sId);
                });
            });
        }

        function switchSession(sessionId) {
            const s = copilotSessions.find(item => item.id === sessionId);
            if (!s) return;
            activeSessionId = s.id;
            if (currentCopilotSessionTitle) {
                currentCopilotSessionTitle.textContent = s.title || 'Trợ lý AI Gemini';
            }
            copilotHistory.length = 0;
            messagesArea.innerHTML = defaultGreetingHtml;

            if (Array.isArray(s.messages)) {
                s.messages.forEach(m => {
                    copilotHistory.push({ role: m.role, content: m.content, created_at: m.created_at });
                    if (m.role === 'user') {
                        appendUserMessage(m.content, m.created_at);
                    } else {
                        appendAiResponse(m.content, m.created_at);
                    }
                });
            }

            smartScrollToBottom(messagesArea, true);
            saveSessionsToStorage();
            renderSessionsList(inputCopilotSessionSearch?.value || '');
        }

        function createNewSession() {
            activeSessionId = null;
            copilotHistory.length = 0;
            messagesArea.innerHTML = defaultGreetingHtml;
            if (currentCopilotSessionTitle) {
                currentCopilotSessionTitle.textContent = 'Đoạn chat mới';
            }
            saveSessionsToStorage();
            renderSessionsList(inputCopilotSessionSearch?.value || '');
            if (inputArea) {
                inputArea.value = '';
                inputArea.focus();
            }
        }

        function deleteSession(sessionId) {
            const s = copilotSessions.find(item => item.id === sessionId);
            const title = s ? s.title : 'này';
            PawpalChatbot.showChatbotConfirmModal?.({
                title: 'Xóa phiên trò chuyện',
                message: `Bạn có chắc chắn muốn xóa phiên chat "${title}"? Dữ liệu trò chuyện của phiên này sẽ được dọn dẹp sạch sẽ.`,
                confirmText: 'Xóa phiên',
                isDanger: true,
                onConfirm: async () => {
                    copilotSessions = copilotSessions.filter(item => item.id !== sessionId);
                    saveSessionsToStorage();

                    try {
                        const token = await getAdminAuthToken();
                        const headers = { 'Content-Type': 'application/json' };
                        if (token) headers['Authorization'] = 'Bearer ' + token;
                        fetch('/api/admin/copilot/history', {
                            method: 'DELETE',
                            headers: headers,
                            body: JSON.stringify({ session_id: sessionId })
                        }).catch(e => console.warn('Lỗi xóa session server:', e));
                    } catch (e) {}

                    if (activeSessionId === sessionId) {
                        if (copilotSessions.length > 0) {
                            switchSession(copilotSessions[0].id);
                        } else {
                            createNewSession();
                        }
                    } else {
                        renderSessionsList(inputCopilotSessionSearch?.value || '');
                    }
                    PawpalChatbot.showToast?.('Đã xóa phiên trò chuyện!', 'success');
                }
            });
        }

        async function loadCopilotHistory() {
            // 1. Tải tức thì từ localStorage/sessionStorage
            try {
                const rawSessions = localStorage.getItem('pawpal_copilot_sessions') || sessionStorage.getItem('pawpal_copilot_sessions');
                if (rawSessions) {
                    const parsed = JSON.parse(rawSessions);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        copilotSessions = parsed;
                    }
                }
                const savedActiveId = sessionStorage.getItem('pawpal_copilot_active_session_id');
                if (savedActiveId && copilotSessions.some(s => s.id === savedActiveId)) {
                    activeSessionId = savedActiveId;
                } else if (copilotSessions.length > 0) {
                    activeSessionId = copilotSessions[0].id;
                }
            } catch (e) {}

            renderSessionsList();
            if (activeSessionId) {
                switchSession(activeSessionId);
            } else {
                createNewSession();
            }

            // 2. Đồng bộ tải lịch sử trò chuyện vĩnh viễn từ CSDL Supabase
            try {
                const token = await getAdminAuthToken();
                const headers = {};
                if (token) headers['Authorization'] = 'Bearer ' + token;
                const res = await fetch('/api/admin/copilot/history', { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data.history) && data.history.length > 0) {
                        const sessionMap = new Map();
                        data.history.forEach(row => {
                            const sId = row.metadata?.session_id || 'sess_default';
                            const sTitle = row.metadata?.session_title || (row.content ? (row.content.slice(0, 35) + '...') : 'Phiên trò chuyện');
                            if (!sessionMap.has(sId)) {
                                sessionMap.set(sId, {
                                    id: sId,
                                    title: sTitle,
                                    created_at: row.created_at,
                                    updated_at: row.created_at,
                                    messages: []
                                });
                            }
                            const cur = sessionMap.get(sId);
                            cur.messages.push({ role: row.role, content: row.content, created_at: row.created_at });
                            cur.updated_at = row.created_at;
                        });

                        sessionMap.forEach((dbSess, id) => {
                            const existing = copilotSessions.find(s => s.id === id);
                            if (!existing) {
                                copilotSessions.push(dbSess);
                            } else if (dbSess.messages.length > existing.messages.length) {
                                existing.messages = dbSess.messages;
                                existing.updated_at = dbSess.updated_at;
                            }
                        });

                        copilotSessions.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                        saveSessionsToStorage();
                        renderSessionsList(inputCopilotSessionSearch?.value || '');

                        if (activeSessionId && copilotSessions.some(s => s.id === activeSessionId)) {
                            switchSession(activeSessionId);
                        } else if (copilotSessions.length > 0) {
                            switchSession(copilotSessions[0].id);
                        }
                    }
                }
            } catch (err) {
                console.warn('[Copilot Frontend] Không thể tải lịch sử từ máy chủ:', err);
            }
        }

        async function handleSend() {
            if (isSending) return;
            const text = inputArea.value.trim();
            if (!text) return;
            isSending = true;
            sendBtn.disabled = true;
            const nowIso = new Date().toISOString();

            // Khởi tạo phiên mới nếu chưa có phiên active
            let curSession = copilotSessions.find(s => s.id === activeSessionId);
            if (!curSession) {
                const sessionTitle = text.length > 36 ? text.slice(0, 36) + '...' : text;
                const newId = 'sess_' + Date.now();
                curSession = {
                    id: newId,
                    title: sessionTitle,
                    created_at: nowIso,
                    updated_at: nowIso,
                    messages: []
                };
                copilotSessions.unshift(curSession);
                activeSessionId = newId;
                if (currentCopilotSessionTitle) {
                    currentCopilotSessionTitle.textContent = sessionTitle;
                }
            }

            appendUserMessage(text, nowIso);
            inputArea.value = '';

            curSession.messages.push({ role: 'user', content: text, created_at: nowIso });
            curSession.updated_at = nowIso;
            copilotHistory.push({ role: 'user', content: text, created_at: nowIso });
            saveSessionsToStorage();
            renderSessionsList(inputCopilotSessionSearch?.value || '');

            const thinkingId = appendAiThinking();
            const token = await getAdminAuthToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = 'Bearer ' + token;

            try {
                // G2-07: Cắt gọn copilotHistory trước khi gửi (tối đa 10 tin nhắn gần nhất và trần byte)
                const payloadMessages = (copilotHistory || []).slice(-10).map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: typeof m.content === 'string' ? m.content.slice(0, 2000) : ''
                }));

                const res = await fetch('/api/admin/copilot', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        isCopilot: true,
                        sessionId: curSession.id,
                        sessionTitle: curSession.title,
                        messages: payloadMessages
                    })
                });

                const thinkingEl = document.getElementById(thinkingId);
                if (thinkingEl) thinkingEl.remove();

                if (res.ok) {
                    const data = await res.json();
                    const reply = data.reply || data.text || data.response || 'Đã xử lý yêu cầu thành công.';
                    const replyIso = new Date().toISOString();
                    curSession.messages.push({ role: 'assistant', content: reply, created_at: replyIso });
                    curSession.updated_at = replyIso;
                    copilotHistory.push({ role: 'assistant', content: reply, created_at: replyIso });
                    saveSessionsToStorage();
                    renderSessionsList(inputCopilotSessionSearch?.value || '');
                    appendAiResponse(reply, replyIso);
                } else {
                    const errData = await res.json().catch(() => ({}));
                    const errMsg = errData.error || errData.message || 'Không thể kết nối đến máy chủ AI Copilot.';
                    inputArea.value = text;
                    curSession.messages.pop();
                    copilotHistory.pop();
                    saveSessionsToStorage();
                    renderSessionsList(inputCopilotSessionSearch?.value || '');
                    appendAiResponse(`[Lỗi] ${errMsg}`);
                    PawpalChatbot.showToast?.(errMsg, 'error');
                }
            } catch (err) {
                console.error('Lỗi khi gọi API Copilot:', err);
                const thinkingEl = document.getElementById(thinkingId);
                if (thinkingEl) thinkingEl.remove();
                inputArea.value = text;
                curSession.messages.pop();
                copilotHistory.pop();
                saveSessionsToStorage();
                renderSessionsList(inputCopilotSessionSearch?.value || '');
                appendAiResponse('Không thể kết nối tới máy chủ AI Copilot. Vui lòng kiểm tra lại kết nối mạng và thử lại.');
                PawpalChatbot.showToast?.('Lỗi kết nối tới AI Copilot', 'error');
            } finally {
                isSending = false;
                sendBtn.disabled = false;
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

        btnNewCopilotSession?.addEventListener('click', () => {
            createNewSession();
        });

        inputCopilotSessionSearch?.addEventListener('input', (e) => {
            renderSessionsList(e.target.value);
        });

        clearBtn?.addEventListener('click', () => {
            if (!activeSessionId) {
                PawpalChatbot.showToast?.('Phiên chat hiện tại đang trống.', 'info');
                return;
            }
            deleteSession(activeSessionId);
        });

        syncRagBtn?.addEventListener('click', async () => {
            PawpalChatbot.showToast?.('Đang kiểm tra kho tri thức RAG từ Supabase...', 'info');
            try {
                if (supabase) {
                    const { count, error } = await supabase.from('document_embeddings').select('*', { count: 'exact', head: true });
                    if (error) throw error;
                    PawpalChatbot.showToast?.(`Kho tri thức hiện có ${count || 0} tài liệu vector trên Supabase!`, 'success');
                } else {
                    PawpalChatbot.showToast?.('Chưa khởi tạo kết nối Supabase Client.', 'error');
                }
            } catch (e) {
                console.error('[Chatbot] Lỗi kiểm tra kho tri thức:', e);
                PawpalChatbot.showToast?.('Không thể kết nối kho tri thức RAG: ' + (e.message || 'Lỗi mạng'), 'error');
            }
        });

        // Bộ trích xuất ngữ cảnh thực thể và điều hướng chi tiết 360°
        function extractEntityContextFromMessage(msgElement, extraText = '') {
            const fullText = ((msgElement ? (msgElement.innerText || msgElement.textContent) : '') + ' ' + extraText).trim();
            const res = {};
            if (!fullText) return res;

            // 1. Tên khách hàng:
            const custMatch = fullText.match(/(?:khách hàng|chủ nuôi|hồ sơ của|thông tin của|cho khách)\s+([A-ZÀ-Ỹ][a-zà-ỹA-ZÀ-Ỹ0-9\s]+?)(?:\s+(?:như|có|với|đã|số|sđt|tại|mã|\(|\.|\,|\:|\n|$))/i);
            if (custMatch && custMatch[1]) {
                res.customerName = custMatch[1].trim();
            }

            // SĐT khách hàng
            const phoneMatch = fullText.match(/\b(0\d{9}|\+84\d{9})\b/);
            if (phoneMatch) res.customerPhone = phoneMatch[1];

            // Mã khách hàng: CUST-xxx
            const custCodeMatch = fullText.match(/\b(CUST-[A-Z0-9-]+)\b/i);
            if (custCodeMatch) res.customerId = custCodeMatch[1];

            // 2. Ticket khiếu nại: UUID, #f1a50343, hoặc TKT-xxx
            const uuidMatch = fullText.match(/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
            const ticketShortMatch = fullText.match(/#([0-9a-f]{8})\b/i);
            const ticketCodeMatch = fullText.match(/\b(TKT-[A-Z0-9-]+)\b/i);
            if (uuidMatch) res.ticketId = uuidMatch[1];
            else if (ticketCodeMatch) res.ticketId = ticketCodeMatch[1];
            else if (ticketShortMatch) res.ticketId = ticketShortMatch[1];

            // 3. Đơn hàng: ORD-xxx
            const orderMatch = fullText.match(/\b(ORD-[A-Z0-9-]+)\b/i);
            if (orderMatch) res.orderId = orderMatch[1];

            // 4. Thú cưng: PET-xxx
            const petMatch = fullText.match(/\b(PET-[A-Z0-9-]+)\b/i);
            if (petMatch) res.petId = petMatch[1];

            // 5. Lịch hẹn: APT-xxx
            const aptMatch = fullText.match(/\b(APT-[A-Z0-9-]+)\b/i);
            if (aptMatch) res.bookingId = aptMatch[1];

            return res;
        }

        async function jumpToCustomerProfile({ id, name, phone } = {}) {
            if (window.PawpalCustomers?.loadCustomersModuleData && !window.PawpalCustomers.state?.hasLoadedCustomers) {
                try { await window.PawpalCustomers.loadCustomersModuleData(); } catch (e) {}
            }

            let resolvedCust = null;
            if (window.PawpalCustomers?.getCustomer) {
                if (id) resolvedCust = window.PawpalCustomers.getCustomer(id);
                if (!resolvedCust && name) resolvedCust = window.PawpalCustomers.getCustomer(name);
                if (!resolvedCust && phone) resolvedCust = window.PawpalCustomers.getCustomer(phone);
            }

            const targetId = resolvedCust ? resolvedCust.id : (id || name || null);
            const targetName = resolvedCust ? resolvedCust.name : (name || id || 'Khách hàng');

            if (targetId) sessionStorage.setItem('pawpal_admin_customer_id', targetId);
            if (targetName) sessionStorage.setItem('pawpal_admin_customer_name', targetName);
            sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-profile');
            sessionStorage.setItem('pawpal_admin_active_module', 'Khách hàng');

            if (window.PawpalChatbot?.showToast) {
                window.PawpalChatbot.showToast(`Đang mở hồ sơ 360° của ${targetName}...`, 'info');
            }

            const sidebarBtn = document.querySelector('.sidebar-menu-btn[data-title="Khách hàng"]');
            if (sidebarBtn) {
                sidebarBtn.click();
            } else {
                window.location.hash = '#tab-profile';
            }

            setTimeout(() => {
                if (window.PawpalCustomers?.subtabs?.profile?.renderDrawerCustomerProfile) {
                    const finalId = sessionStorage.getItem('pawpal_admin_customer_id') || targetId;
                    if (finalId) window.PawpalCustomers.subtabs.profile.renderDrawerCustomerProfile(finalId);
                }
                if (window.PawpalCustomers?.switchSubtab) {
                    window.PawpalCustomers.switchSubtab('tab-profile');
                }
            }, 200);
        }

        function jumpToTicketDetail(ticketId) {
            if (ticketId) {
                const cleanId = String(ticketId).replace(/^#/, '').trim();
                sessionStorage.setItem('pawpal_admin_complaint_selected_id', cleanId);
            }
            sessionStorage.setItem('pawpal_admin_complaint_active_subtab', 'tab-complaint-detail');
            sessionStorage.setItem('pawpal_admin_active_module', 'Khiếu nại');

            if (window.PawpalChatbot?.showToast) {
                window.PawpalChatbot.showToast(`Đang mở chi tiết Ticket khiếu nại ${ticketId || ''}...`, 'info');
            }

            const sidebarBtn = document.querySelector('.sidebar-menu-btn[data-title="Khiếu nại"]');
            if (sidebarBtn) {
                sidebarBtn.click();
            } else {
                window.location.hash = '#tab-complaint-detail';
            }

            setTimeout(() => {
                if (ticketId && window.PawpalComplaints?.openTicketDetail) {
                    window.PawpalComplaints.openTicketDetail(ticketId);
                }
                if (window.PawpalComplaints?.switchSubtab) {
                    window.PawpalComplaints.switchSubtab('tab-complaint-detail');
                }
            }, 200);
        }

        function jumpToOrderDetail(orderId) {
            if (orderId) {
                const cleanId = String(orderId).replace(/^#/, '').trim();
                sessionStorage.setItem('pawpal_admin_order_selected_id', cleanId);
                sessionStorage.setItem('pawpal_admin_order_id', cleanId);
            }
            sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-detail');
            sessionStorage.setItem('pawpal_admin_active_module', 'Bán hàng');

            if (window.PawpalChatbot?.showToast) {
                window.PawpalChatbot.showToast(`Đang mở chi tiết đơn hàng ${orderId || ''}...`, 'info');
            }

            const sidebarBtn = document.querySelector('.sidebar-menu-btn[data-title="Bán hàng"]');
            if (sidebarBtn) {
                sidebarBtn.click();
            } else {
                window.location.hash = '#tab-order-detail';
            }

            setTimeout(() => {
                if (window.PawpalOrders?.switchSubtab) {
                    window.PawpalOrders.switchSubtab('tab-order-detail');
                }
            }, 200);
        }

        function jumpToPetProfile(petId) {
            if (petId) {
                const cleanId = String(petId).replace(/^#/, '').trim();
                sessionStorage.setItem('pawpal_admin_pet_id', cleanId);
            }
            sessionStorage.setItem('pawpal_admin_pet_subtab', 'tab-pet-profile');
            sessionStorage.setItem('pawpal_admin_active_module', 'Thú cưng');

            if (window.PawpalChatbot?.showToast) {
                window.PawpalChatbot.showToast(`Đang mở hồ sơ thú cưng ${petId || ''}...`, 'info');
            }

            const sidebarBtn = document.querySelector('.sidebar-menu-btn[data-title="Thú cưng"]');
            if (sidebarBtn) {
                sidebarBtn.click();
            } else {
                window.location.hash = '#tab-pet-profile';
            }

            setTimeout(() => {
                if (petId && window.openPetProfile) {
                    window.openPetProfile(petId);
                }
                if (window.PawpalPets?.switchSubtab) {
                    window.PawpalPets.switchSubtab('tab-pet-profile');
                }
            }, 200);
        }

        function jumpToBookingDetail(bookingId, targetSubtab = 'tab-service-detail') {
            if (bookingId) {
                const cleanId = String(bookingId).replace(/^#/, '').trim();
                sessionStorage.setItem('pawpal_admin_service_selected_id', cleanId);
            }
            sessionStorage.setItem('pawpal_admin_services_active_subtab', targetSubtab);
            sessionStorage.setItem('pawpal_admin_active_module', 'Dịch vụ');

            if (window.PawpalChatbot?.showToast) {
                window.PawpalChatbot.showToast(`Đang mở thông tin ca dịch vụ / lịch hẹn...`, 'info');
            }

            const sidebarBtn = document.querySelector('.sidebar-menu-btn[data-title="Dịch vụ"]');
            if (sidebarBtn) {
                sidebarBtn.click();
            } else {
                window.location.hash = '#' + targetSubtab;
            }

            setTimeout(() => {
                if (window.PawpalServices?.switchSubtab) {
                    window.PawpalServices.switchSubtab(targetSubtab);
                }
            }, 200);
        }

        // Ủy quyền sự kiện click trên khung tin nhắn Copilot để điều hướng sâu vào đúng hồ sơ chi tiết
        messagesArea.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href || (!href.startsWith('#tab-') && !href.includes('#tab-'))) return;

            e.preventDefault();
            e.stopPropagation();

            const [hashBase, queryString] = href.split('?');
            const rawCleanHash = (hashBase || '').replace(/^.*#/, '');
            const aliases = {
                'tab-customer-profile': 'tab-profile',
                'tab-customer': 'tab-list',
                'tab-customers': 'tab-list',
                'tab-complaints': 'tab-complaint-services',
                'tab-calendar': 'tab-service-bookings',
                'tab-inventory': 'tab-order-products',
                'tab-orders': 'tab-order-list',
                'tab-pets': 'tab-pet-list',
                'tab-services': 'tab-service-bookings'
            };
            const cleanHash = aliases[rawCleanHash] || rawCleanHash;
            const params = new URLSearchParams(queryString || '');

            const msgEl = link.closest('.copilot-message') || link.closest('.copilot-bubble-ai') || link.parentElement;
            let prevUserText = '';
            if (msgEl) {
                const prevMsg = msgEl.previousElementSibling;
                if (prevMsg) prevUserText = prevMsg.innerText || '';
            }
            const context = extractEntityContextFromMessage(msgEl, prevUserText);

            if (cleanHash === 'tab-profile') {
                const custId = params.get('id') || params.get('customerId') || link.getAttribute('data-customer-id') || context.customerId;
                const custName = params.get('name') || params.get('customerName') || link.getAttribute('data-customer-name') || context.customerName;
                const custPhone = params.get('phone') || link.getAttribute('data-customer-phone') || context.customerPhone;
                jumpToCustomerProfile({ id: custId, name: custName, phone: custPhone });
            } else if (cleanHash === 'tab-complaint-detail') {
                const ticketId = params.get('id') || params.get('ticketId') || link.getAttribute('data-ticket-id') || context.ticketId;
                jumpToTicketDetail(ticketId);
            } else if (cleanHash === 'tab-order-detail') {
                const orderId = params.get('id') || params.get('orderId') || link.getAttribute('data-order-id') || context.orderId;
                jumpToOrderDetail(orderId);
            } else if (cleanHash === 'tab-pet-profile') {
                const petId = params.get('id') || params.get('petId') || link.getAttribute('data-pet-id') || context.petId;
                jumpToPetProfile(petId);
            } else if (cleanHash === 'tab-service-detail' || cleanHash === 'tab-service-bookings') {
                const bookingId = params.get('id') || params.get('bookingId') || link.getAttribute('data-booking-id') || context.bookingId;
                jumpToBookingDetail(bookingId, cleanHash);
            } else {
                window.location.hash = '#' + cleanHash;
            }
        });

        // Khởi động nạp lịch sử trò chuyện
        loadCopilotHistory();
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
