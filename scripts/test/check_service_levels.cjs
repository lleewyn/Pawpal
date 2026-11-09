// Check service staff level requirements
const fs = require('node:fs');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

const TARGET_URL = process.env.TEST_BASE_URL || 'https://pawpalgr3.vercel.app';
const credentials = fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt', 'utf8');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(TARGET_URL + '/admin/login', { waitUntil: 'networkidle' });
        await page.fill('#inputAdminEmail', credentials.match(/^Email: (.+)$/m)[1].trim());
        await page.fill('#inputAdminPassword', credentials.match(/^Password: (.+)$/m)[1].trim());
        await page.click('#btnSubmitAdminLogin');
        await page.waitForURL(url => !url.pathname.includes('/login'));

        const data = await page.evaluate(async () => {
            const client = window.getSupabaseClient();
            const { data: services } = await client
                .from('service')
                .select('id, service_code, service_name, staff_level_required_id')
                .limit(20);

            const { data: levels } = await client
                .from('staff_level')
                .select('id, level_code, level_name, rank_order');

            const { data: d52Booking } = await client
                .from('appointment')
                .select('id, appointment_code, appointment_status, staff_id, items:appointment_item(id, name_snapshot, service:service_id(service_name, staff_level_required_id))')
                .eq('id', 'd52e2ad8-b38f-417a-af12-a1e68236b71f')
                .single();

            return { services, levels, d52Booking };
        });

        console.log('Services:', JSON.stringify(data.services, null, 2));
        console.log('Levels:', JSON.stringify(data.levels, null, 2));
        console.log('D52 Booking:', JSON.stringify(data.d52Booking, null, 2));
    } finally {
        await browser.close();
    }
})();

