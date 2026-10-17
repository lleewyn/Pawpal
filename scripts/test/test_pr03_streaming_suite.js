const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);
const chatHandler = require('../api/chat.js');

// Mock SSE response collector
function mockSSEResponse() {
    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.headersSent = false;
    res.writableEnded = false;
    res.writtenChunks = [];
    res.writtenData = '';

    res.status = function(code) {
        if (this.headersSent) throw new Error('ERR_HTTP_HEADERS_SENT: Cannot set status after headers sent');
        this.statusCode = code;
        return this;
    };

    res.setHeader = function(key, val) {
        if (this.headersSent) throw new Error('ERR_HTTP_HEADERS_SENT: Cannot set header after sent');
        this.headers[key.toLowerCase()] = val;
        return this;
    };

    res.write = function(chunk) {
        this.headersSent = true;
        this.writtenChunks.push(chunk);
        this.writtenData += chunk;
        return true;
    };

    res.json = function(payload) {
        if (this.headersSent) throw new Error('ERR_HTTP_HEADERS_SENT: Cannot call json after headers sent');
        this.headersSent = true;
        this.writableEnded = true;
        this.jsonPayload = payload;
        this.emit('finish');
        return this;
    };

    res.end = function(chunk) {
        if (chunk) {
            this.writtenChunks.push(chunk);
            this.writtenData += chunk;
        }
        this.headersSent = true;
        this.writableEnded = true;
        this.emit('finish');
        return this;
    };

    return res;
}

// Mock HTTP Request
function mockSSERequest(body, headers = {}) {
    const req = new EventEmitter();
    req.method = 'POST';
    req.headers = {
        'content-type': 'application/json',
        ...headers
    };
    req.body = body;
    return req;
}

async function runPR03StreamingSuite() {
    console.log('=== BẮT ĐẦU BỘ KIỂM THỬ PR-03: STREAMING, ERROR CONTRACT VÀ DEDUP (P0/P1) ===\n');
    let passedTests = 0;
    const totalTests = 6;

    // Cài đặt mockGenAI để kiểm thử streaming đa chunk ổn định, không phụ thuộc rate limit Google
    const mockModel = {
        startChat: () => ({
            sendMessageStream: async () => ({
                stream: (async function*() {
                    yield { text: () => 'Dạ chào bạn! ' };
                    yield { text: () => 'Tiệm PawPal ' };
                    yield { text: () => 'rất vui được hỗ trợ ạ! 🐾' };
                })()
            })
        })
    };
    global.__mockGenAI = {
        getGenerativeModel: () => mockModel
    };

    // 1. Tạo một hội thoại tạm để chạy test
    const testSessionToken = 'test_guest_pr03_' + Date.now();
    const { data: convData, error: convErr } = await supabase
        .from('chat_conversation')
        .insert({
            session_token: testSessionToken,
            channel: 'web',
            status: 'bot_handling'
        })
        .select('id')
        .single();

    if (convErr || !convData) {
        console.error('Không thể tạo phiên chat test:', convErr);
        process.exit(1);
    }
    const testConvId = convData.id;

    try {
        // -------------------------------------------------------------
        // TEST 1: Stream chunk accumulation & bot message persistence (CB-06)
        // -------------------------------------------------------------
        console.log('[Test 1] Kiểm tra tích lũy fullResponseText khi streaming và lưu vào CSDL (CB-06)...');
        const req1 = mockSSERequest({
            messages: [{ role: 'user', content: 'Xin chào tiệm thú cưng!' }],
            conversationId: testConvId,
            sessionToken: testSessionToken,
            stream: true,
            client_message_id: 'clmsg_test1_' + Date.now()
        }, {
            'accept': 'text/event-stream'
        });
        const res1 = mockSSEResponse();

        const p1 = new Promise((resolve) => res1.on('finish', resolve));
        chatHandler(req1, res1);
        await p1;

        // Kiểm tra xem đã nhận các SSE chunks và event done
        const lines1 = res1.writtenData.split('\n');
        const dataLines = lines1.filter(l => l.startsWith('data: ')).map(l => {
            try { return JSON.parse(l.slice(6)); } catch(e) { return null; }
        }).filter(Boolean);

        const chunks = dataLines.filter(d => d.chunk).map(d => d.chunk);
        const doneEvent = dataLines.find(d => d.done === true);

        // Kiểm tra trong CSDL chat_message
        const { data: botMessages } = await supabase
            .from('chat_message')
            .select('id, content, sender_type')
            .eq('conversation_id', testConvId)
            .eq('sender_type', 'bot')
            .order('created_at', { ascending: false })
            .limit(1);

        const latestBotMsg = botMessages && botMessages[0];
        const persistedSuccess = latestBotMsg && latestBotMsg.content === 'Dạ chào bạn! Tiệm PawPal rất vui được hỗ trợ ạ! 🐾';
        const doneConfirmedPersisted = doneEvent && doneEvent.persisted === true && doneEvent.botMessageId === latestBotMsg?.id;

        if (chunks.length === 3 && persistedSuccess && doneConfirmedPersisted) {
            console.log(`  -> ĐẠT: Nhận đúng ${chunks.length} chunks streaming.`);
            console.log(`  -> Bot message đã tích lũy và lưu DB trọn vẹn: "${latestBotMsg.content}"`);
            console.log(`  -> Payload hoàn tất: persisted=${doneEvent.persisted}, botMessageId=${doneEvent.botMessageId}`);
            passedTests++;
        } else {
            console.error('  -> THẤT BẠI: Bot message không được lưu hoặc streaming trống!', { chunks: chunks.length, latestBotMsg, doneEvent });
        }

        // -------------------------------------------------------------
        // TEST 2: Kiểm tra { error } khi khởi tạo / lưu phiên thất bại (CB-18)
        // -------------------------------------------------------------
        console.log('\n[Test 2] Kiểm tra bắt lỗi { error } khi khởi tạo/ghi phiên thất bại (CB-18)...');
        // Gửi conversationId giả mạo không thuộc session để ép từ chối và chặn gọi AI vô tội vạ
        const fakeConvId = '00000000-0000-0000-0000-000000000000';
        const req2 = mockSSERequest({
            messages: [{ role: 'user', content: 'Tin nhắn test lỗi DB' }],
            conversationId: fakeConvId,
            sessionToken: testSessionToken,
            stream: false,
            client_message_id: 'clmsg_test2_' + Date.now()
        });
        const res2 = mockSSEResponse();

        const p2 = new Promise((resolve) => res2.on('finish', resolve));
        chatHandler(req2, res2);
        await p2;

        if (res2.statusCode === 500 && res2.jsonPayload && res2.jsonPayload.ok === false && res2.jsonPayload.done === false) {
            console.log(`  -> ĐẠT: Server trả HTTP ${res2.statusCode}, payload { ok: false, done: false, error: "${res2.jsonPayload.error}", code: "${res2.jsonPayload.code}" }`);
            console.log('  -> Không lãng phí token gọi AI khi phiên không hợp lệ hoặc lỗi CSDL.');
            passedTests++;
        } else {
            console.error('  -> THẤT BẠI: Server không chặn hoặc trả nhầm mã thành công khi lỗi CSDL:', { status: res2.statusCode, payload: res2.jsonPayload });
        }

        // -------------------------------------------------------------
        // TEST 3: Chống gửi trùng lặp với client_message_id (CB-20)
        // -------------------------------------------------------------
        console.log('\n[Test 3] Kiểm tra khử trùng lặp tin nhắn client_message_id (CB-20)...');
        const dedupMsgId = 'clmsg_dedup_suite_' + Date.now();
        
        // Gửi lần 1
        const req3a = mockSSERequest({
            messages: [{ role: 'user', content: 'Dịch vụ tắm chó giá bao nhiêu?' }],
            conversationId: testConvId,
            sessionToken: testSessionToken,
            stream: false,
            client_message_id: dedupMsgId
        });
        const res3a = mockSSEResponse();
        const p3a = new Promise((resolve) => res3a.on('finish', resolve));
        chatHandler(req3a, res3a);
        await p3a;

        // Gửi lần 2 với cùng client_message_id (Mô phỏng retry do mạng chập chờn)
        const req3b = mockSSERequest({
            messages: [{ role: 'user', content: 'Dịch vụ tắm chó giá bao nhiêu?' }],
            conversationId: testConvId,
            sessionToken: testSessionToken,
            stream: false,
            client_message_id: dedupMsgId
        });
        const res3b = mockSSEResponse();
        const p3b = new Promise((resolve) => res3b.on('finish', resolve));
        chatHandler(req3b, res3b);
        await p3b;

        // Đếm số tin nhắn khách có cùng client_message_id trong DB
        const { data: dedupCount } = await supabase
            .from('chat_message')
            .select('id, metadata')
            .eq('conversation_id', testConvId)
            .eq('metadata->>client_message_id', dedupMsgId);

        if (res3b.jsonPayload && (res3b.jsonPayload.deduplicated === true || res3b.jsonPayload.duplicate === true) && dedupCount && dedupCount.length === 1) {
            console.log(`  -> ĐẠT: Server phát hiện trùng lặp client_message_id="${dedupMsgId}".`);
            console.log(`  -> Trả lại kết quả cũ, số bản ghi tin nhắn trong DB đúng bằng 1: duplicate=true, deduplicated=true`);
            passedTests++;
        } else {
            console.error('  -> THẤT BẠI: Khử trùng lặp không hoạt động:', { payload: res3b.jsonPayload, dedupCount: dedupCount?.length });
        }

        // -------------------------------------------------------------
        // TEST 4: Chuẩn hóa mã lỗi và không trả 200/done:true cho thất bại (CB-07)
        // -------------------------------------------------------------
        console.log('\n[Test 4] Kiểm tra Error Contract: HTTP Status & event: error (CB-07)...');
        // Tạo request vượt quá hạn mức độ dài (payload quá lớn)
        const longText = 'A'.repeat(2500);
        const req4 = mockSSERequest({
            messages: [{ role: 'user', content: longText }],
            conversationId: testConvId,
            sessionToken: testSessionToken,
            stream: false
        });
        const res4 = mockSSEResponse();
        const p4 = new Promise((resolve) => res4.on('finish', resolve));
        chatHandler(req4, res4);
        await p4;

        const errorReturned = res4.jsonPayload;
        const validStatus = res4.statusCode === 400 || res4.statusCode === 429 || res4.statusCode === 500;
        const doneIsFalse = errorReturned && errorReturned.done === false;
        const okIsFalse = errorReturned && errorReturned.ok === false;

        if (validStatus && doneIsFalse && okIsFalse) {
            console.log(`  -> ĐẠT: Lỗi trả HTTP ${res4.statusCode} (không trả 200!).`);
            console.log(`  -> Payload: ok=${errorReturned.ok}, done=${errorReturned.done}, code=${errorReturned.code}`);
            passedTests++;
        } else {
            console.error('  -> THẤT BẠI: Lỗi vẫn trả 200 hoặc done:true:', { status: res4.statusCode, payload: errorReturned });
        }

        // -------------------------------------------------------------
        // TEST 5: SSE Event Error & Protection res.headersSent (CB-22)
        // -------------------------------------------------------------
        console.log('\n[Test 5] Kiểm tra SSE Event Error và bảo vệ res.headersSent (CB-22)...');
        const req5 = mockSSERequest({
            messages: [{ role: 'user', content: 'A'.repeat(2500) }],
            conversationId: testConvId,
            sessionToken: testSessionToken,
            stream: true
        }, {
            'accept': 'text/event-stream'
        });
        const res5 = mockSSEResponse();
        const p5 = new Promise((resolve) => res5.on('finish', resolve));
        chatHandler(req5, res5);
        await p5;

        const hasErrorEvent = res5.writtenData.includes('event: error');
        const sseLines = res5.writtenData.split('\n');
        const sseErrData = sseLines.find(l => l.startsWith('data: ') && l.includes('"ok":false'));

        if (hasErrorEvent && sseErrData && !sseErrData.includes('"done":true')) {
            console.log('  -> ĐẠT: SSE phát sự kiện "event: error", dữ liệu chứa ok: false, không chứa done: true.');
            console.log('  -> Không ném ngoại lệ ERR_HTTP_HEADERS_SENT.');
            passedTests++;
        } else {
            console.error('  -> THẤT BẠI: SSE error stream không chuẩn format:', { raw: res5.writtenData });
        }

        // -------------------------------------------------------------
        // TEST 6: Phía giao diện Widget: Khóa nút khi gửi và giữ draft (CB-20 / CB-07)
        // -------------------------------------------------------------
        console.log('\n[Test 6] Kiểm tra kiểm soát giao diện phía khách: fab.js...');
        const fabCode = fs.readFileSync(path.join(__dirname, '../../components/fab/fab.js'), 'utf8');

        const hasSendingGuard = fabCode.includes('isSendingCustomerMsg') && fabCode.includes('sendBtn.disabled = true');
        const hasDraftPreservation = fabCode.includes('savedDraft') && fabCode.includes('input.value = savedDraft');
        const hasClientMessageId = fabCode.includes('client_message_id');
        const handlesSseErrorEvent = fabCode.includes("line.startsWith('event: ')") || fabCode.includes("currentEvent === 'error'");

        if (hasSendingGuard && hasDraftPreservation && hasClientMessageId && handlesSseErrorEvent) {
            console.log('  -> ĐẠT: fab.js đã tích hợp đầy đủ:');
            console.log('     * Chốt chặn chống gửi đúp: isSendingCustomerMsg + sendBtn.disabled');
            console.log('     * Tạo định danh client_message_id cho mỗi lần gửi');
            console.log('     * Giữ lại nội dung nháp trong ô nhập khi gặp lỗi');
            console.log('     * Lắng nghe và phân tách sự kiện SSE event: error');
            passedTests++;
        } else {
            console.error('  -> THẤT BẠI: fab.js thiếu các chốt chặn an toàn:', {
                hasSendingGuard, hasDraftPreservation, hasClientMessageId, handlesSseErrorEvent
            });
        }

    } finally {
        // Dọn dẹp hội thoại test
        await supabase.from('chat_message').delete().eq('conversation_id', testConvId);
        await supabase.from('chat_conversation').delete().eq('id', testConvId);
        delete global.__mockGenAI;
    }

    console.log(`\n=============================================================`);
    console.log(`KẾT QUẢ BỘ KIỂM THỬ PR-03: ${passedTests}/${totalTests} BÀI KIỂM THỬ ĐẠT (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`=============================================================`);

    if (passedTests === totalTests) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

runPR03StreamingSuite().catch(err => {
    console.error('Lỗi thực thi test suite PR-03:', err);
    process.exit(1);
});
