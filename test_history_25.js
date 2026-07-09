const chatApi = require('./scripts/api/chat.js');
require('dotenv').config();

async function test() {
    const req = {
        method: 'POST',
        headers: {
            'authorization': 'Bearer local:d0000000-0000-0000-0000-000000000002'
        },
        body: {
            messages: [
                { role: "user", content: "bé cưng của tôi tên gì" },
                { role: "model", content: "Bạn có hai bé cưng là: - Cún cưng Milu (giống Corgi) - Mèo cưng Mimi (giống Anh lông ngắn)" },
                { role: "user", content: "ê" }
            ]
        }
    };

    let result = '';
    const res = {
        setHeader: () => {},
        write: (chunk) => { result += chunk; },
        end: () => { console.log("FINISHED. Output:", result); },
        status: (code) => {
            return {
                json: (data) => console.log("STATUS", code, data)
            }
        }
    };

    try {
        await chatApi(req, res);
    } catch(e) {
        console.error("Uncaught API Error:", e);
    }
}

test();
