require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkServiceMatrix() {
    const { data, error } = await supabase.from('service_matrix').select('*').limit(5);
    console.log("service_matrix:", error ? error.message : data);
}
checkServiceMatrix();
