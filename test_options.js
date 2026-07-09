require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOptions() {
    const { data, error } = await supabase.from('service_option').select('*').limit(1);
    console.log("service_option:", error ? error.message : data);
}
checkOptions();
