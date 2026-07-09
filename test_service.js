require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testService() {
    const { data, error } = await supabase.from('service').select('*').limit(1);
    console.log(error ? error : data);
}
testService();
