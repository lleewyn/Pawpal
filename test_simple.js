const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function test() {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase.from('api_keys').select('key_value').eq('provider', 'gemini').limit(1);
    const validKey = data[0].key_value;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${validKey}`);
    const json = await response.json();
    console.log(json.models.map(m => m.name).join('\n'));
}
test();
