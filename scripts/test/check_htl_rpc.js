const https = require('https');

const supabaseUrl = 'https://cpzuvaplseielhgcnqrn.supabase.co';
const supabaseKey = 'sb_publishable_dLV-5AkVgshhkaymnwTelg_fTFzyuwR';

const req = https.request(`${supabaseUrl}/rest/v1/rpc/public_service_directory`, {
    method: 'POST',
    headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
    }
}, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
        try {
            const list = JSON.parse(raw);
            const item = list.find(s => s.service_code === 'SVC-HTL-01');
            console.log('HTL item:');
            console.log(JSON.stringify(item, null, 2));
        } catch (e) {
            console.error('Parse error:', e, raw);
        }
    });
});
req.write('{}');
req.end();
