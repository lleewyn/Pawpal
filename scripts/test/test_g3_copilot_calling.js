const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

function getVietnamDateString(offsetDays = 0) {
    const d = new Date(Date.now() + offsetDays * 86400000);
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(d);
}

const adminDbTools = {
    get_appointments: async ({ date, status } = {}) => {
        let targetDate = date;
        if (!targetDate || targetDate === 'today' || targetDate === 'hôm nay') {
            targetDate = getVietnamDateString(0);
        } else if (targetDate === 'tomorrow' || targetDate === 'ngày mai') {
            targetDate = getVietnamDateString(1);
        }

        let query = supabase
            .from('appointment')
            .select(`
                id,
                appointment_code,
                appointment_date,
                appointment_time,
                appointment_status,
                payment_status,
                total_price,
                customer:customer_id (
                    id,
                    phone_main,
                    customer_profile (full_name)
                ),
                pet_profile:pet_id (id, pet_name, species),
                service:service_id (id, service_name),
                staff:staff_id (id, full_name)
            `, { count: 'exact' });

        if (targetDate && targetDate !== 'all' && targetDate !== 'tất cả') {
            query = query.eq('appointment_date', targetDate);
        }
        if (status && status !== 'ALL' && status !== 'tất cả') {
            query = query.eq('appointment_status', status.toUpperCase());
        }

        const { data, count, error } = await query
            .order('appointment_time', { ascending: true })
            .limit(10);

        if (error) return { error: error.message };

        return {
            total: count || data?.length || 0,
            date_queried: targetDate,
            appointments: (data || []).map(a => ({
                code: a.appointment_code,
                date: a.appointment_date,
                time: a.appointment_time?.slice(0, 5),
                customer: `${a.customer?.customer_profile?.full_name || 'Khách vãng lai'} (${a.customer?.phone_main || ''})`,
                pet: a.pet_profile?.pet_name,
                service: a.service?.service_name,
                staff: a.staff?.full_name || 'Chưa xếp',
                status: a.appointment_status,
                total_price: a.total_price,
                open_url: '#tab-calendar'
            }))
        };
    }
};

const adminToolsDeclaration = [
    {
        functionDeclarations: [
            {
                name: "get_appointments",
                description: "Tra cứu danh sách lịch hẹn dịch vụ Spa, Grooming, Hotel, Taxi. Dùng khi admin hỏi về lịch hẹn hôm nay, ngày mai, ngày cụ thể hoặc theo trạng thái.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        date: { type: "STRING", description: "Ngày dạng YYYY-MM-DD, hoặc 'today' (hôm nay), 'tomorrow' (ngày mai), 'yesterday' (hôm qua), 'all' (tất cả)." },
                        status: { type: "STRING", description: "Trạng thái lịch hẹn: 'ALL', 'PENDING' (chờ xác nhận), 'CONFIRMED' (đã xác nhận), 'IN_PROGRESS' (đang làm), 'COMPLETED' (hoàn thành), 'CANCELLED' (đã hủy)." }
                    }
                }
            }
        ]
    }
];

async function runTest() {
    console.log('Testing direct appointment tool...');
    const directRes = await adminDbTools.get_appointments({ date: 'all' });
    console.log('Direct appointments result total:', directRes.total, 'count in page:', directRes.appointments?.length);

    console.log('\nTesting Gemini function calling for Copilot...');
    // Fetch a key from api_keys table
    const { data: keys } = await supabase.from('api_keys').select('api_key').eq('status', 'ACTIVE').limit(1);
    const apiKey = keys?.[0]?.api_key || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No Gemini API key found.');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "Bạn là PawPal AI Copilot hỗ trợ admin. Trả lời bằng tiếng Việt, ngắn gọn, dùng công cụ để tra cứu dữ liệu thực tế.",
        tools: adminToolsDeclaration
    });

    const chat = model.startChat();
    const result = await chat.sendMessage([{ text: "Hôm nay tiệm mình có những lịch hẹn nào cần phục vụ không?" }]);

    const response = result.response;
    const calls = response.functionCalls ? response.functionCalls() : null;
    console.log('Gemini Function Calls:', calls?.map(c => ({ name: c.name, args: c.args })));

    if (calls && calls.length > 0) {
        const call = calls[0];
        let toolResult = await adminDbTools[call.name](call.args);
        console.log('Tool Result sent back to Gemini:', JSON.stringify(toolResult));

        const followUp = await chat.sendMessage([{
            functionResponse: {
                name: call.name,
                response: { result: toolResult }
            }
        }]);
        console.log('\nGemini Final Reply:\n', followUp.response.text());
    } else {
        console.log('Gemini direct text:', response.text());
    }
}

runTest();
