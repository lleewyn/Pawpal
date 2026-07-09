require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables'); // Or try querying information_schema
    if (error) {
        // Fallback to postgrest directly
        const { data: schema, error: err2 } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
        console.log("Tables:", err2 ? err2.message : schema);
    } else {
        console.log("Tables:", data);
    }
}
listTables();
