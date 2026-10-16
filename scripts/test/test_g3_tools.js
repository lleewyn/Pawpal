const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function testCustomerContext() {
    const { data: cust, error } = await supabase
        .from('customer')
        .select(`
            id,
            phone_main,
            email,
            created_at,
            customer_profile (full_name, gender, date_of_birth),
            customer_membership (total_paw_points, membership_tier:membership_tier_id (tier_name)),
            pet_profile (id, pet_name, species, breed, weight)
        `)
        .limit(1);

    console.log('Customer context error:', error?.message);
    console.log('Customer context result:', JSON.stringify(cust, null, 2));
}

testCustomerContext();
