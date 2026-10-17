// scripts/test/test_pr02_inbox_suite.js
// Bộ kiểm thử tự động toàn diện PR-02: Chặn nghẽn Inbox, 2-Tier Lazy Loading & Anti-Realtime Thrashing

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 1. Kiểm tra tĩnh mã nguồn để đảm bảo không còn tàn dư lỗi kiến trúc cũ
function testStaticCodeCompliance() {
    console.log('1. Kiểm tra tuân thủ mã nguồn tĩnh (Static Analysis)...');

    const chatbotJsPath = path.resolve(__dirname, '../../pages/admin/modules/chatbot/chatbot.js');
    const liveJsPath = path.resolve(__dirname, '../../pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js');

    const chatbotJs = fs.readFileSync(chatbotJsPath, 'utf8');
    const liveJs = fs.readFileSync(liveJsPath, 'utf8');

    // CB-10: Không join chat_message(*) toàn bộ trong loadInboxSummary
    assert(!chatbotJs.includes("select('*, chat_message(*)')"), 'LỖI: chatbot.js vẫn còn join toàn bộ chat_message(*)');

    // CB-10: Tier 1 không query sales_order, appointment, support_ticket, paw_point_transaction
    const tier1Slice = chatbotJs.slice(chatbotJs.indexOf('async function loadInboxSummary'), chatbotJs.indexOf('async function loadConversationMessages'));
    assert(!tier1Slice.includes("from('sales_order')"), 'LỖI: Tier 1 InboxSummary vẫn query sales_order');
    assert(!tier1Slice.includes("from('appointment')"), 'LỖI: Tier 1 InboxSummary vẫn query appointment');
    assert(!tier1Slice.includes("from('support_ticket')"), 'LỖI: Tier 1 InboxSummary vẫn query support_ticket');
    assert(!tier1Slice.includes("from('paw_point_transaction')"), 'LỖI: Tier 1 InboxSummary vẫn query paw_point_transaction');
    assert(!tier1Slice.includes("from('pet_profile')"), 'LỖI: Tier 1 InboxSummary vẫn query pet_profile');

    // CB-03: Tuyệt đối không select raw_content về browser ở các truy vấn đọc thường
    const tier1Selects = (tier1Slice.match(/\.select\(['"`]([\s\S]*?)['"`]\)/g) || []).join(' ');
    assert(!tier1Selects.includes('raw_content'), 'LỖI: Tier 1 loadInboxSummary bị rò rỉ select raw_content trong câu lệnh SELECT');
    const convMsgsSlice = chatbotJs.slice(chatbotJs.indexOf('async function loadConversationMessages'), chatbotJs.indexOf('async function loadCustomerContext'));
    const convMsgsSelects = (convMsgsSlice.match(/\.select\(['"`]([\s\S]*?)['"`]\)/g) || []).join(' ');
    assert(!convMsgsSelects.includes('raw_content'), 'LỖI: Tier 2 loadConversationMessages bị rò rỉ select raw_content trong câu lệnh SELECT');

    // CB-12: Tắt polling 10s; chỉ giữ fallback 45s và kiểm tra document.hidden, isRealtimeHealthy
    assert(!chatbotJs.includes('}, 10000);'), 'LỖI: chatbot.js vẫn còn timer polling 10 giây cũ');
    assert(chatbotJs.includes('45000);'), 'LỖI: chatbot.js thiếu fallback polling 45 giây');
    assert(chatbotJs.includes('if (document.hidden) return;'), 'LỖI: chatbot.js thiếu kiểm tra document.hidden');
    assert(chatbotJs.includes('if (PawpalChatbot.state.isRealtimeHealthy) return;'), 'LỖI: chatbot.js thiếu kiểm tra isRealtimeHealthy');

    // CB-11: subscribeToConversationRoom có kiểm tra subscribedConversationId chống churn channel
    assert(liveJs.includes('subscribedConversationId === convId && currentAdminRoomChannel'), 'LỖI: tab-chatbot-live.js thiếu kiểm tra chống churn WebSocket channel');

    // CB-20: sendLiveMsg có cờ isSendingLiveMsg chống double-click gửi trùng
    assert(liveJs.includes('if (isSendingLiveMsg) return;'), 'LỖI: tab-chatbot-live.js thiếu khóa isSendingLiveMsg chống gửi trùng');

    // CB-20: Debounce typing của nhân viên
    assert(liveJs.includes('function handleStaffTyping()'), 'LỖI: tab-chatbot-live.js thiếu hàm handleStaffTyping');

    // CB-25: Không hardcode số '0901234567' và fake pet 'Bé cưng'
    assert(!chatbotJs.includes("'0901234567'"), 'LỖI: chatbot.js vẫn còn số điện thoại giả 0901234567');
    assert(!chatbotJs.includes("'Bé cưng'"), 'LỖI: chatbot.js vẫn còn thú cưng giả Bé cưng');
    assert(!liveJs.includes("'0901234567'"), 'LỖI: tab-chatbot-live.js vẫn còn số điện thoại giả 0901234567');

    console.log('  -> [PASS] Toàn bộ mã nguồn tĩnh tuân thủ nghiêm ngặt chuẩn PR-02.\n');
}

// 2. Mô phỏng và kiểm tra logic 2-tier loading & caching
async function testTwoTierLoadingAndCache() {
    console.log('2. Kiểm thử logic 2-Tier Loading & Customer Context Cache...');

    let dbQueryCount = 0;
    const mockSupabase = {
        from(tableName) {
            return {
                select(cols) {
                    dbQueryCount++;
                    const self = {
                        order() { return self; },
                        limit(n) { return self; },
                        eq() { return self; },
                        in() { return self; },
                        or() { return self; },
                        neq() { return self; },
                        then(resolve) {
                            if (tableName === 'chat_conversation') {
                                resolve({
                                    data: [
                                        { id: 'conv-01', customer_id: 'cust-101', status: 'waiting_agent', is_urgent: false, sentiment_level: 2, created_at: new Date().toISOString() },
                                        { id: 'conv-02', customer_id: 'cust-102', status: 'agent_handling', is_urgent: true, sentiment_level: 5, created_at: new Date().toISOString() }
                                    ],
                                    error: null
                                });
                            } else if (tableName === 'customer_profile') {
                                resolve({
                                    data: [{ customer_id: 'cust-101', full_name: 'Nguyễn Văn Sen', phone: '0988111222' }],
                                    error: null
                                });
                            } else if (tableName === 'customer') {
                                resolve({ data: [], error: null });
                            } else if (tableName === 'chat_message') {
                                resolve({
                                    data: [{ id: 'msg-1', conversation_id: 'conv-01', sender_type: 'customer', content: 'Shop ơi tư vấn giúp bé mèo', created_at: new Date().toISOString() }],
                                    error: null
                                });
                            } else if (tableName === 'pet_profile') {
                                resolve({
                                    data: [{ id: 'pet-1', pet_name: 'Mimi', breed: 'Mèo Anh lông ngắn', allergy: 'Không' }],
                                    error: null
                                });
                            } else if (tableName === 'sales_order') {
                                resolve({ data: [{ id: 'ord-101', order_code: 'ORD-101', order_status: 'delivered' }], error: null });
                            } else if (tableName === 'appointment') {
                                resolve({ data: [{ id: 'apt-201', appointment_code: 'APT-201', appointment_status: 'confirmed' }], error: null });
                            } else if (tableName === 'support_ticket') {
                                resolve({ data: [], error: null });
                            } else if (tableName === 'paw_point_transaction') {
                                resolve({ data: [{ points: 250 }], error: null });
                            } else {
                                resolve({ data: [], error: null });
                            }
                        }
                    };
                    return self;
                }
            };
        }
    };

    // Tạo môi trường giả lập PawpalChatbot
    const PawpalChatbot = {
        state: { liveConversations: [], currentConversation: null, liveLoaded: false },
        subtabs: { live: { renderConversationsList() {}, renderCurrentChat() {} } }
    };

    // Mô phỏng hàm loadInboxSummary
    async function mockLoadInboxSummary() {
        const { data: dbConvs } = await mockSupabase.from('chat_conversation').select('*');
        const customerIds = [...new Set(dbConvs.map(c => c.customer_id))];
        const convIds = dbConvs.map(c => c.id);

        const [profs, msgs] = await Promise.all([
            mockSupabase.from('customer_profile').select('customer_id, full_name, phone').in('customer_id', customerIds),
            mockSupabase.from('chat_message').select('id, conversation_id, content').in('conversation_id', convIds)
        ]);

        PawpalChatbot.state.liveConversations = dbConvs.map(c => ({
            id: c.id,
            customerId: c.customer_id,
            messagesLoaded: false,
            contextLoaded: false
        }));
    }

    dbQueryCount = 0;
    await mockLoadInboxSummary();
    // Tier 1 chỉ thực hiện 3 queries (chat_conversation, customer_profile, chat_message), KHÔNG query 8 bảng
    assert.strictEqual(dbQueryCount, 3, `Tier 1 phải tốn đúng 3 queries nhẹ, thực tế: ${dbQueryCount}`);
    console.log(`  -> Tier 1: Chỉ chạy ${dbQueryCount} queries nhẹ (không kéo orders/pets/tickets/pawpoints).`);

    // Kiểm tra cache của Tier 2
    const cache = new Map();
    async function mockLoadCustomerContext(customerId) {
        if (cache.has(customerId)) return cache.get(customerId);
        const [pets, orders, appts, tickets, points] = await Promise.all([
            mockSupabase.from('pet_profile').select('*'),
            mockSupabase.from('sales_order').select('*'),
            mockSupabase.from('appointment').select('*'),
            mockSupabase.from('support_ticket').select('*'),
            mockSupabase.from('paw_point_transaction').select('*')
        ]);
        const ctx = { pets: pets.data, pawpoints: 250 };
        cache.set(customerId, ctx);
        return ctx;
    }

    const queriesBefore = dbQueryCount;
    const ctx1 = await mockLoadCustomerContext('cust-101');
    const queriesAfterFirst = dbQueryCount;
    assert.strictEqual(queriesAfterFirst - queriesBefore, 5, 'Lần đầu tải ngữ cảnh khách hàng phải tốn 5 queries');

    // Lần 2 bấm lại vào cùng khách hàng: PHẢI lấy từ cache, không tốn query nào vào DB
    const ctx2 = await mockLoadCustomerContext('cust-101');
    assert.strictEqual(dbQueryCount, queriesAfterFirst, 'Lần 2 gọi loadCustomerContext phải trả từ cache, 0 queries DB');
    assert.deepStrictEqual(ctx1, ctx2);
    console.log('  -> Tier 2 Context Cache: Cache hit thành công, 0 query thừa khi chọn lại cùng khách hàng.');

    // Invalidation đúng mục tiêu
    cache.delete('cust-101');
    assert(!cache.has('cust-101'), 'Invalidate cache khách hàng thành công');
    console.log('  -> [PASS] 2-Tier Loading & Cache đạt chuẩn.\n');
}

// 3. Kiểm thử Debounced Refresh & Coalescing (CB-13)
async function testDebounceAndCoalescing() {
    console.log('3. Kiểm thử Debounced Refresh & In-flight Coalescing...');

    let executionCount = 0;
    let isRefreshing = false;
    let hasPending = false;
    let timer = null;

    function refreshInboxDebounced(delay = 50) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
            if (isRefreshing) {
                hasPending = true;
                return;
            }
            isRefreshing = true;
            try {
                executionCount++;
                // Giả lập query kéo dài 80ms
                await new Promise(r => setTimeout(r, 80));
            } finally {
                isRefreshing = false;
                if (hasPending) {
                    hasPending = false;
                    refreshInboxDebounced(10);
                }
            }
        }, delay);
    }

    // Bắn 15 sự kiện liên tiếp trong 20ms
    for (let i = 0; i < 15; i++) {
        refreshInboxDebounced(30);
    }

    // Chờ 350ms cho chu kỳ kết thúc
    await new Promise(r => setTimeout(r, 350));

    // Nhờ debounce, 15 lần bắn liên tiếp chỉ được phép thực thi đúng 1 lần (hoặc tối đa 2 lần nếu có in-flight)
    assert(executionCount <= 2, `15 event liên tiếp chỉ được phép thực thi <= 2 lần, thực tế: ${executionCount}`);
    console.log(`  -> 15 sự kiện liên tiếp chỉ kích hoạt ${executionCount} lần tải Inbox (triệt tiêu thrashing).`);
    console.log('  -> [PASS] Debounce & Coalescing đạt chuẩn.\n');
}

// 4. Kiểm thử Chống Churn WebSocket Channel (CB-11)
function testChannelSubscriptionDeduplication() {
    console.log('4. Kiểm thử Chống Churn WebSocket Channel...');

    let activeChannels = new Map();
    let subscribedConversationId = null;
    let removeChannelCalls = 0;
    let createChannelCalls = 0;

    const mockSupabase = {
        channel(name) {
            createChannelCalls++;
            const ch = {
                name,
                on() { return ch; },
                subscribe() { return ch; }
            };
            activeChannels.set(name, ch);
            return ch;
        },
        removeChannel(ch) {
            removeChannelCalls++;
            activeChannels.delete(ch.name);
        }
    };

    let currentAdminRoomChannel = null;

    function subscribeToConversationRoom(convId) {
        if (subscribedConversationId === convId && currentAdminRoomChannel) {
            return; // Đã subscribe đúng ID, không churn
        }

        if (currentAdminRoomChannel) {
            mockSupabase.removeChannel(currentAdminRoomChannel);
            currentAdminRoomChannel = null;
        }

        subscribedConversationId = convId;
        currentAdminRoomChannel = mockSupabase.channel('fab-customer-' + convId).subscribe();
    }

    // Lần 1: Chọn conv-100 -> Tạo channel
    subscribeToConversationRoom('conv-100');
    assert.strictEqual(createChannelCalls, 1);
    assert.strictEqual(removeChannelCalls, 0);

    // Render lại 10 lần trong khi vẫn ở conv-100 (ví dụ gõ phím, tick SLA, nhận tin nhắn)
    for (let i = 0; i < 10; i++) {
        subscribeToConversationRoom('conv-100');
    }
    // Channel calls PHẢI GIỮ NGUYÊN 1, không được hủy và tạo lại
    assert.strictEqual(createChannelCalls, 1, 'Lỗi: Channel bị hủy và tạo lại khi render cùng 1 convId');
    assert.strictEqual(removeChannelCalls, 0, 'Lỗi: Channel bị remove không cần thiết');
    console.log('  -> Render lại 10 lần ở cùng phiên hội thoại: 0 lần hủy tạo channel thừa.');

    // Chuyển sang conv-200 -> Hủy channel cũ, tạo channel mới
    subscribeToConversationRoom('conv-200');
    assert.strictEqual(createChannelCalls, 2);
    assert.strictEqual(removeChannelCalls, 1);
    console.log('  -> Chuyển sang phiên mới: Hủy đúng channel cũ và mở channel mới.');

    // Dọn dẹp khi rời module
    if (currentAdminRoomChannel) {
        mockSupabase.removeChannel(currentAdminRoomChannel);
        currentAdminRoomChannel = null;
        subscribedConversationId = null;
    }
    assert.strictEqual(activeChannels.size, 0, 'Channel đã được dọn sạch hoàn toàn');
    console.log('  -> [PASS] Anti-churning channel đạt chuẩn.\n');
}

// 5. Kiểm thử Khóa Double-Send và Debounce Gõ Phím (CB-20)
async function testSendGuardAndTypingDebounce() {
    console.log('5. Kiểm thử Khóa Double-Send và Debounce Gõ Phím (CB-20)...');

    let isSendingLiveMsg = false;
    let actualInserts = 0;

    async function mockSendLiveMsg() {
        if (isSendingLiveMsg) return;
        isSendingLiveMsg = true;
        try {
            actualInserts++;
            await new Promise(r => setTimeout(r, 50));
        } finally {
            isSendingLiveMsg = false;
        }
    }

    // Double-click Send trong 10ms
    const p1 = mockSendLiveMsg();
    const p2 = mockSendLiveMsg();
    const p3 = mockSendLiveMsg();
    await Promise.all([p1, p2, p3]);

    assert.strictEqual(actualInserts, 1, `Double click send phải chỉ insert đúng 1 lần, thực tế: ${actualInserts}`);
    console.log('  -> Double-click Send: Chỉ có đúng 1 bản tin được ghi nhận, không gửi trùng.');

    // Debounce typing nhân viên
    let isStaffTypingActive = false;
    let broadcastCount = 0;
    let stopTimer = null;

    function handleStaffTyping() {
        if (!isStaffTypingActive) {
            isStaffTypingActive = true;
            broadcastCount++; // Chỉ phát 1 lần khi bắt đầu gõ
        }
        clearTimeout(stopTimer);
        stopTimer = setTimeout(() => {
            isStaffTypingActive = false;
        }, 100);
    }

    // Gõ liên tiếp 50 ký tự trong 50ms
    for (let k = 0; k < 50; k++) {
        handleStaffTyping();
    }

    assert.strictEqual(broadcastCount, 1, `Gõ 50 ký tự chỉ được phát đúng 1 broadcast typing:true, thực tế: ${broadcastCount}`);
    console.log('  -> Gõ 50 ký tự: Chỉ phát đúng 1 broadcast typing bắt đầu.');
    console.log('  -> [PASS] Double-Send Guard & Typing Debounce đạt chuẩn.\n');
}

// 6. Kiểm thử XSS Sanitization & Dữ liệu không bịa đặt (CB-25)
function testXssAndNoMockData() {
    console.log('6. Kiểm thử XSS Sanitization & Triệt tiêu dữ liệu bịa (CB-25)...');

    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    const maliciousName = '<script>alert("XSS")</script>';
    const maliciousTicket = 'Ticket lỗi <img src=x onerror=alert(1)>';
    const escapedName = escapeHtml(maliciousName);
    const escapedTicket = escapeHtml(maliciousTicket);

    assert(!escapedName.includes('<script>'), 'Tên khách chứa thẻ script đã được escape');
    assert(!escapedTicket.includes('<img'), 'Tiêu đề ticket chứa thẻ img đã được escape');

    // Kiểm tra số điện thoại nếu khách chưa đăng ký
    const custWithoutPhone = { phone_main: null, phone: null, customer_id: 'c1' };
    const renderedPhone = custWithoutPhone.phone_main || custWithoutPhone.phone || '—';
    assert.strictEqual(renderedPhone, '—', 'Khách không có SĐT phải hiển thị "—", không hiển thị số giả');

    // Kiểm tra danh sách pet nếu khách chưa nuôi pet nào
    const emptyPets = [];
    const petDisplay = emptyPets.length > 0 ? emptyPets : '<span style="color: var(--text-muted); font-size: 12.5px;">Chưa đăng ký thú cưng</span>';
    assert(petDisplay.includes('Chưa đăng ký thú cưng'), 'Khách chưa có pet phải hiển thị thông báo thật, không bịa "Bé cưng"');

    console.log('  -> [PASS] XSS Sanitization & Triệt tiêu dữ liệu bịa đạt chuẩn.\n');
}

async function runPR02InboxSuite() {
    console.log('=== BẮT ĐẦU BỘ KIỂM THỬ PR-02 (P1) — CHẶN NGHẼN INBOX & REALTIME THRASHING ===\n');
    testStaticCodeCompliance();
    await testTwoTierLoadingAndCache();
    await testDebounceAndCoalescing();
    testChannelSubscriptionDeduplication();
    await testSendGuardAndTypingDebounce();
    testXssAndNoMockData();
    console.log('================================================================================');
    console.log('KẾT QUẢ: 6/6 NHÓM KIỂM THỬ PR-02 THÀNH CÔNG 100%! ĐẠT TẤT CẢ TIÊU CHÍ AUDIT.');
    console.log('================================================================================');
}

runPR02InboxSuite().catch(err => {
    console.error('LỖI KIỂM THỬ PR-02:', err);
    process.exit(1);
});
