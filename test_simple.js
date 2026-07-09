const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function test() {
    // using one of the keys from db
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase.from('api_keys').select('key_value').eq('provider', 'gemini').limit(1);
    const validKey = data[0].key_value;

    const genAI = new GoogleGenerativeAI(validKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    try {
        const result = await model.generateContentStream("hi");
        for await (const chunk of result.stream) {
            console.log(chunk.text());
        }
    } catch(e) {
        console.error(e);
    }
}
test();
