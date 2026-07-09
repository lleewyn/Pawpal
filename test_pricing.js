require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPricing() {
    // Check if there is a service_pricing table
    const { data: data1, error: err1 } = await supabase.from('service_pricing').select('*').limit(1);
    console.log("service_pricing:", err1 ? err1.message : data1);

    // Or a pricing table?
    const { data: data2, error: err2 } = await supabase.from('pricing').select('*').limit(1);
    console.log("pricing:", err2 ? err2.message : data2);
}
checkPricing();
