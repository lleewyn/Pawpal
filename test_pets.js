require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPets() {
    const { data, error } = await supabase.from('pet').select('*').limit(1);
    console.log("pet:", error ? error.message : Object.keys(data[0] || {}));
}
checkPets();
