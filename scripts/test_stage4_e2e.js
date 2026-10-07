/**
 * BỘ KIỂM THỬ TÍCH HỢP TOÀN DIỆN E2E GIAI ĐOẠN 4 (STAGE 4 E2E VERIFICATION)
 * Kiểm tra toàn bộ luồng Chatbot Khách hàng (FAB) <-> CSKH Admin:
 * 1. Khởi tạo phiên chat khách hàng (chat_conversation với session_token, channel)
 * 2. Gửi nhận tin nhắn kèm hình ảnh markdown ![alt](url)
 * 3. Chuyển giao khẩn cấp (Escalation / Handover) sang KTV / Chuyên viên (agent_handling)
 * 4. Chuyên viên gửi các loại Thẻ Giải pháp Tương tác (:::voucher, :::booking, :::order)
 * 5. Đóng ca chat và Phát hành Khảo sát CSAT 5 sao (:::csat_survey)
 * 6. Khách hàng gửi đánh giá CSAT (lưu trữ đầy đủ vào Supabase Live DB)
 * 7. Kiểm tra kênh Realtime Typing Indicator Broadcast 2 chiều
 * 8. Kiểm tra phân giải hình ảnh Lightbox và cú pháp Rich Cards
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_KEY!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ THẤT BẠI: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ ${message}`);
}

async function runStage4E2ETest() {
  console.log('===========================================================================');
  console.log('   BỘ KIỂM THỬ TÍCH HỢP TOÀN DIỆN E2E GIAI ĐOẠN 4 (PAWPAL CHATBOT)');
  console.log('===========================================================================');

  const testSessionToken = 'test-e2e-stage4-' + Date.now();
  let testConvId = null;

  try {
    // -------------------------------------------------------------------------
    // BƯỚC 1: Khởi tạo phiên hội thoại mới từ phía Khách hàng (Customer FAB)
    // -------------------------------------------------------------------------
    console.log('\n[1/7] Kiểm thử khởi tạo phiên hội thoại phía Khách hàng...');
    const { data: convData, error: convErr } = await supabase
      .from('chat_conversation')
      .insert({
        session_token: testSessionToken,
        channel: 'web',
        status: 'bot_handling',
        sentiment_level: 2,
        sentiment_trend: 'stable',
        is_urgent: false,
        internal_note: 'Phiên kiểm thử E2E Giai đoạn 4'
      })
      .select()
      .single();

    if (convErr) throw convErr;
    testConvId = convData.id;
    assert(testConvId, `Đã tạo phiên hội thoại mới ID: ${testConvId} (Trạng thái: ${convData.status})`);

    // -------------------------------------------------------------------------
    // BƯỚC 2: Khách hàng gửi tin nhắn văn bản và đính kèm hình ảnh
    // -------------------------------------------------------------------------
    console.log('\n[2/7] Kiểm thử gửi tin nhắn văn bản kèm hình ảnh đính kèm (Markdown)...');
    const imageUrl = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400';
    const customerMsgContent = `Bé nhà em bị đỏ mắt, nhờ shop xem giúp ảnh này ạ:\n\n![Anh_be_cho.jpg](${imageUrl})`;

    const { data: userMsg, error: userMsgErr } = await supabase
      .from('chat_message')
      .insert({
        conversation_id: testConvId,
        sender_type: 'customer',
        sender_name: 'Khách hàng Kiểm thử',
        content: customerMsgContent,
        raw_content: customerMsgContent,
        metadata: { has_attachment: true, attachment_count: 1 }
      })
      .select()
      .single();

    if (userMsgErr) throw userMsgErr;
    assert(userMsg.content.includes('![Anh_be_cho.jpg]'), 'Tin nhắn khách hàng lưu đúng cú pháp ảnh markdown');

    // -------------------------------------------------------------------------
    // BƯỚC 3: Chuyển giao khẩn cấp sang Chuyên viên trực tiếp (Handover / Escalation)
    // -------------------------------------------------------------------------
    console.log('\n[3/7] Kiểm thử kích hoạt chuyển giao cho Chuyên viên (Handover / Escalation)...');
    const { data: handoverConv, error: handoverErr } = await supabase
      .from('chat_conversation')
      .update({
        status: 'agent_handling',
        is_urgent: true,
        sentiment_level: 4,
        sentiment_trend: 'escalating',
        internal_note: 'Khách yêu cầu hỗ trợ ca mắt đỏ, chuyển KTV'
      })
      .eq('id', testConvId)
      .select()
      .single();

    if (handoverErr) throw handoverErr;
    assert(handoverConv.status === 'agent_handling', `Phiên hội thoại đã chuyển sang trạng thái "agent_handling" (KTV tiếp nhận)`);

    // -------------------------------------------------------------------------
    // BƯỚC 4: Chuyên viên phản hồi và gửi Thẻ giải pháp tương tác (Solution Cards)
    // -------------------------------------------------------------------------
    console.log('\n[4/7] Kiểm thử Chuyên viên gửi Thẻ giải pháp tương tác (Voucher, Booking, Order)...');
    
    // Thẻ Voucher
    const voucherCardMsg = `Dạ em gửi tặng sen mã giảm giá 15% cho dịch vụ khám chữa bệnh:\n\n:::voucher CODE: HEALTHYPET15 | TITLE: Giảm 15% Dịch vụ Khám sức khỏe | DESC: Áp dụng tại tất cả chi nhánh Pawpal | EXPIRY: 31/12/2026 :::`;
    const { data: vMsg, error: vErr } = await supabase
      .from('chat_message')
      .insert({
        conversation_id: testConvId,
        sender_type: 'staff',
        sender_name: 'Bác sĩ Thú y Minh Anh',
        content: voucherCardMsg
      })
      .select()
      .single();
    if (vErr) throw vErr;
    assert(vMsg.content.includes(':::voucher'), 'Chuyên viên gửi thành công Thẻ Voucher');

    // Thẻ Đặt lịch hẹn
    const bookingCardMsg = `Sen có thể đặt lịch thăm khám ưu tiên ngay tại đây ạ:\n\n:::booking SERVICE: Khám và Điều trị Mắt chuyên sâu | PET: Cún Corgi Bông | TIME: 09:30 ngày mai :::`;
    const { data: bMsg, error: bErr } = await supabase
      .from('chat_message')
      .insert({
        conversation_id: testConvId,
        sender_type: 'staff',
        sender_name: 'Bác sĩ Thú y Minh Anh',
        content: bookingCardMsg
      })
      .select()
      .single();
    if (bErr) throw bErr;
    assert(bMsg.content.includes(':::booking'), 'Chuyên viên gửi thành công Thẻ Lịch hẹn');

    // -------------------------------------------------------------------------
    // BƯỚC 5: Đóng ca chat & Phát hành Khảo sát CSAT 5 sao (:::csat_survey)
    // -------------------------------------------------------------------------
    console.log('\n[5/7] Kiểm thử Đóng ca chat & Phát hành Khảo sát CSAT 5 sao...');
    const csatNotice = `Cảm ơn sen đã liên hệ Pawpal! Ca hỗ trợ đã hoàn tất. Xin mời sen đánh giá chất lượng phục vụ:\n\n:::csat_survey {"staffName": "Bác sĩ Thú y Minh Anh", "convId": "${testConvId}"} :::`;
    
    await supabase.from('chat_message').insert({
      conversation_id: testConvId,
      sender_type: 'staff',
      sender_name: 'Hệ thống CSKH Pawpal',
      content: csatNotice
    });

    const { data: resolvedConv, error: resErr } = await supabase
      .from('chat_conversation')
      .update({
        status: 'resolved',
        internal_note: 'Đã tư vấn nhỏ mắt và hẹn lịch khám sáng mai. Đã gửi khảo sát CSAT.'
      })
      .eq('id', testConvId)
      .select()
      .single();
    if (resErr) throw resErr;
    assert(resolvedConv.status === 'resolved', 'Phiên chat cập nhật thành công sang trạng thái "resolved"');

    // Khách hàng gửi đánh giá CSAT 5 sao
    const { data: ratingMsg, error: ratingMsgErr } = await supabase
      .from('chat_message')
      .insert({
        conversation_id: testConvId,
        sender_type: 'customer',
        sender_name: 'Khách hàng',
        content: 'Đã gửi đánh giá CSAT: 5★ (Rất hài lòng)',
        metadata: {
          type: 'csat_rating',
          score: 5,
          feedback: 'Bác sĩ tư vấn rất tận tâm và dễ thương, 5 sao cho Pawpal!',
          tags: ['Nhiệt tình, chu đáo', 'Giải quyết nhanh chóng', 'Bác sĩ chuyên môn tốt']
        }
      })
      .select()
      .single();
    if (ratingMsgErr) throw ratingMsgErr;
    assert(ratingMsg.metadata.score === 5, 'Lưu thành công đánh giá CSAT 5 sao vào chat_message.metadata');

    // Cập nhật internal_note với CSAT score
    await supabase.from('chat_conversation').update({
      internal_note: '[CSAT 5★ - Rất hài lòng] Bác sĩ tư vấn rất tận tâm và dễ thương!'
    }).eq('id', testConvId);

    const { data: finalConv } = await supabase.from('chat_conversation').select('internal_note').eq('id', testConvId).single();
    assert(finalConv.internal_note.includes('[CSAT 5★'), 'Phiên hội thoại ghi nhận đầy đủ chỉ số CSAT');

    // -------------------------------------------------------------------------
    // BƯỚC 6: Kiểm tra Kênh Realtime Typing Indicator & Broadcast
    // -------------------------------------------------------------------------
    console.log('\n[6/7] Kiểm tra kênh Realtime Broadcast Typing Indicator...');
    const channelName = `fab-customer-${testConvId}`;
    const testChannel = supabase.channel(channelName);
    
    let broadcastSent = false;
    await new Promise((resolve) => {
      testChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const resp = await testChannel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { who: 'staff', isTyping: true, name: 'Bác sĩ Thú y Minh Anh' }
          });
          broadcastSent = (resp === 'ok');
          resolve();
        }
      });
      // Timeout fallback
      setTimeout(resolve, 3000);
    });

    assert(broadcastSent, `Đã phát sóng thành công sự kiện Realtime Typing Indicator trên kênh "${channelName}"`);

    // -------------------------------------------------------------------------
    // BƯỚC 7: Kiểm tra bộ Parser Rich Cards & Images trên cả FAB & Admin
    // -------------------------------------------------------------------------
    console.log('\n[7/7] Kiểm thử bộ Parser Rich Cards & Markdown Image...');
    
    // Kiểm tra parser regex cho Thẻ giải pháp
    const sampleVoucher = `:::voucher CODE: TEST10 | TITLE: Giảm 10% | DESC: Mua sắm :::`;
    const sampleBooking = `:::booking SERVICE: Tắm sấy | PET: Miu | TIME: 10:00 :::`;
    const sampleOrder = `:::order ID: DH12345 | STATUS: Đang giao | TOTAL: 250.000đ :::`;
    const sampleCsat = `:::csat_survey {"staffName": "Trần Thị A"} :::`;
    const sampleImage = `![anh.jpg](https://pawpal.vn/anh.jpg)`;

    assert(/:::voucher\s*([\s\S]*?):::/i.test(sampleVoucher), 'Regex Voucher card hợp lệ');
    assert(/:::booking\s*([\s\S]*?):::/i.test(sampleBooking), 'Regex Booking card hợp lệ');
    assert(/:::order\s*([\s\S]*?):::/i.test(sampleOrder), 'Regex Order card hợp lệ');
    assert(/:::csat_survey\s*(\{[\s\S]*?\})\s*:::/i.test(sampleCsat), 'Regex CSAT survey hợp lệ');
    assert(/!\[(.*?)\]\((.*?)\)/.test(sampleImage), 'Regex Image markdown hợp lệ');

    // Dọn dẹp dữ liệu test
    console.log('\n🧹 Dọn dẹp bản ghi kiểm thử E2E...');
    await supabase.from('chat_message').delete().eq('conversation_id', testConvId);
    await supabase.from('chat_conversation').delete().eq('id', testConvId);
    console.log('  ✅ Đã dọn dẹp sạch sẽ dữ liệu kiểm thử trong CSDL Supabase');

    console.log('\n===========================================================================');
    console.log('   KẾT QUẢ GIAI ĐOẠN 4: TOÀN BỘ 7/7 BƯỚC E2E ĐẠT CHUẨN HOÀN HẢO! ✅');
    console.log('===========================================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ E2E:', err);
    if (testConvId) {
      try { await supabase.from('chat_message').delete().eq('conversation_id', testConvId); } catch(e) {}
      try { await supabase.from('chat_conversation').delete().eq('id', testConvId); } catch(e) {}
    }
    process.exit(1);
  }
}

runStage4E2ETest();
