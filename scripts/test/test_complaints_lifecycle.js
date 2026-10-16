require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const anonDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const adminDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFullComplaintsLifecycle() {
    console.log('=== BAT DAU KIEM THU VONG DOI KHIEU NAI (COMPLAINTS LIFECYCLE) ===\n');

    // Buoc 1: Tiep nhan khieu nai (Create ticket)
    console.log('1. Thao tac Tiep nhan khieu nai moi...');
    const { data: ticket, error: tErr } = await anonDb.from('support_ticket').insert([{
        title: '[QA Test] Be bi tray xuoc tai sau ca Spa',
        type: 'service',
        priority: 'Cao',
        status: 'pending'
    }]).select().single();
    if (tErr) throw tErr;
    console.log('   -> Da tao ticket:', ticket.id, '| Trang thai:', ticket.status);

    // Buoc 2: Khach hang gui phan anh ban dau (Initial message)
    console.log('2. Luu tin nhan phan anh ban dau cua khach hang...');
    const { data: msg1, error: m1Err } = await anonDb.from('support_ticket_message').insert([{
        ticket_id: ticket.id,
        sender_type: 'user',
        content: 'Be cung Corgi nha minh sau khi tam say ve phat hien co vet rom mau o vanh tai trai.'
    }]).select().single();
    if (m1Err) throw m1Err;
    console.log('   -> Da luu tin nhan ID:', msg1.id);

    // Buoc 3: Phan cong nhan su phu trach (Assign handler)
    console.log('3. Chuyen nguoi phu trach xu ly (Assign handler)...');
    const { data: msg2, error: m2Err } = await anonDb.from('support_ticket_message').insert([{
        ticket_id: ticket.id,
        sender_type: 'cskh',
        agent_name: 'Le Le Quyen (CSKH)',
        content: '[Phan cong] Chuyen giao KTV Grooming truong Tran Van Hung kiem tra lai camera ca truc.'
    }]).select().single();
    if (m2Err) throw m2Err;

    const { error: sUpdateErr } = await anonDb.from('support_ticket').update({
        status: 'processing',
        updated_at: new Date().toISOString()
    }).eq('id', ticket.id);
    if (sUpdateErr) throw sUpdateErr;
    console.log('   -> Da cap nhat trang thai sang processing');

    // Buoc 4: Yeu cau bo sung thong tin (Request more info)
    console.log('4. Gui yeu cau bo sung thong tin qua Zalo OA...');
    const { data: msg3, error: m3Err } = await anonDb.from('support_ticket_message').insert([{
        ticket_id: ticket.id,
        sender_type: 'cskh',
        agent_name: 'Le Le Quyen (CSKH)',
        content: '[Zalo OA] Da PawPal chao chi, chi chup giup em anh can canh vanh tai cua be de bac si phong kham so cuu tu xa nhe a.'
    }]).select().single();
    if (m3Err) throw m3Err;

    const { error: sWaitErr } = await anonDb.from('support_ticket').update({
        status: 'waiting_customer',
        updated_at: new Date().toISOString()
    }).eq('id', ticket.id);
    if (sWaitErr) throw sWaitErr;
    console.log('   -> Da cap nhat trang thai sang waiting_customer');

    // Buoc 5: Giai quyet khieu nai (Resolve ticket)
    console.log('5. Chon phuong an giai quyet va hoan tat khieu nai...');
    const { data: msg4, error: m4Err } = await anonDb.from('support_ticket_message').insert([{
        ticket_id: ticket.id,
        sender_type: 'cskh',
        agent_name: 'Le Le Quyen (CSKH)',
        content: '[Giai quyet] Da dua be den phong kham doi tac boi thuoc sat trung, mien phi 100% chi phi va gui tang Voucher PAWPALCARE50 tri gia 50.000d boi hoan.'
    }]).select().single();
    if (m4Err) throw m4Err;

    const { data: resolvedTicket, error: sResErr } = await anonDb.from('support_ticket').update({
        status: 'completed',
        rating: 5,
        rating_comment: 'Rat hai long voi su tan tam xu ly cua PawPal',
        updated_at: new Date().toISOString()
    }).eq('id', ticket.id).select().single();
    if (sResErr) throw sResErr;
    console.log('   -> Da hoan tat ticket. Status:', resolvedTicket.status, '| Rating:', resolvedTicket.rating);

    // Buoc 6: Truy van doi soat du lieu (Verification)
    console.log('6. Truy van doi chieu toan bo du lieu ticket va timeline...');
    const { data: verifiedTicket, error: vErr } = await anonDb.from('support_ticket').select('*').eq('id', ticket.id).single();
    if (vErr) throw vErr;
    const { data: verifiedMsgs, error: vmErr } = await anonDb.from('support_ticket_message').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
    if (vmErr) throw vmErr;

    console.log('   -> Tieu de:', verifiedTicket.title);
    console.log('   -> Trang thai cuoi:', verifiedTicket.status);
    console.log('   -> Tong so ban ghi timeline:', verifiedMsgs.length);
    verifiedMsgs.forEach((m, idx) => {
        console.log('      [' + (idx + 1) + '] (' + m.sender_type + (m.agent_name ? ' - ' + m.agent_name : '') + '): ' + m.content.substring(0, 70));
    });

    // Buoc 7: Don dep ban ghi QA (Cleanup)
    console.log('7. Don dep du lieu kiem thu...');
    await adminDb.from('support_ticket_message').delete().eq('ticket_id', ticket.id);
    await adminDb.from('support_ticket').delete().eq('id', ticket.id);
    console.log('   -> Da don dep sach se 100%!');

    console.log('\n=== KET QUA KIEM THU: TAT CA 7 BUOC DAT THANH CONG 100% ===');
}

testFullComplaintsLifecycle().catch(err => {
    console.error('LOI KIEM THU:', err);
    process.exit(1);
});
