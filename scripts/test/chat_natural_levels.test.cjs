const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createHandler } = require('../../api/admin-chat.js');

const DEFAULT_FAQ = [
 { question: 'Chính sách đổi trả', answer: 'Hàng lỗi do nhà sản xuất hoặc vận chuyển được hỗ trợ đổi trả theo quy định hiện hành.', complete: true },
 { question: 'Khi bé không hợp tác khi sử dụng dịch vụ', answer: 'Nhân viên sẽ kiểm tra tình trạng thực tế và trao đổi với bạn phương án an toàn phù hợp.', complete: true }
];

function createConversationHarness({ isMember = false, faq = DEFAULT_FAQ, adviceItems = [], profanity = [], sentiment = [] } = {}) {
 const convId = randomUUID();
 const guestId = randomUUID();
 const customerId = isMember ? randomUUID() : null;
 const history = [];
 const saved = [];
 const modelCalls = [];
 const adviceCalls = [];

 const service = {
  auth: {
   getUser: async () => ({ data: { user: { id: 'auth-test-user' } } })
  },
  from(table) {
   const q = {
    select: () => q,
    eq: () => q,
    is: () => q,
    gt: () => q,
    maybeSingle: async () => {
     if (table === 'customer') return { data: isMember ? { id: customerId } : null };
     if (table === 'guest_session') return { data: { id: guestId } };
     if (table === 'chat_conversation') {
      return {
       data: {
        id: convId,
        customer_id: isMember ? customerId : null,
        guest_session_id: isMember ? null : guestId,
        status: 'bot_handling',
        updated_at: new Date().toISOString()
       }
      };
     }
     return { data: null };
    }
   };
   return q;
  },
  rpc: async (name, args) => {
   if (name === 'public_chat_membership') return { data: isMember };
   if (name === 'read_public_chat_rules') return { data: { profanity, sentiment } };
   if (name === 'read_public_guest_seed') {
    const recent_questions = history.filter(m => m.sender_type !== 'bot').slice(0, 4).map(m => m.raw_content);
    return { data: { profanity, sentiment, recent_questions } };
   }
   if (name === 'search_public_chat_context') {
    return { data: { faq, recent: history.slice(0, 8), incomplete: false } };
   }
   if (name === 'read_public_guest_advice') {
    adviceCalls.push(args.p_request);
    return {
     data: {
      kind: args.p_request.kind,
      as_of: '2026-11-27T08:00:00Z',
      has_more: false,
      items: adviceItems
     }
    };
   }
   if (name === 'post_public_chat_message_media') {
    saved.push(args);
    history.unshift(
     { sender_type: 'bot', content: args.p_reply },
     { sender_type: isMember ? 'customer' : 'guest', content: args.p_content, raw_content: args.p_raw }
    );
    return { data: args.p_id };
   }
   assert.fail('Unexpected RPC: ' + name);
  }
 };

 const handler = createHandler({
  serviceClient: service,
  generateReply: async (question, context, turnHistory) => {
   modelCalls.push({ question, context, turnHistory });
   const count = modelCalls.length;
   return JSON.stringify({
    reply: `PawPal hiểu nhu cầu về "${question.slice(0, 40)}" và sẽ hỗ trợ sát ý bạn nhé (lượt ${count}).`,
    understood: true
   });
  }
 });

 async function send(question) {
  const res = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } };
  await handler({
   method: 'POST',
   headers: { ...(isMember ? { authorization: 'Bearer test-member' } : {}), 'x-real-ip': randomUUID() },
   body: {
    action: 'public_send',
    conversationId: convId,
    requestId: randomUUID(),
    sessionToken: isMember ? undefined : 'g'.repeat(32),
    question,
    mediaAssetIds: []
   }
  }, res);
  return { res, record: saved.at(-1), modelCount: modelCalls.length, adviceCount: adviceCalls.length };
 }

 return { send, saved, modelCalls, adviceCalls };
}

test('natural tier 1: greetings, casual thanks, and compliments stay warm at level 1 without price dumps', async () => {
 const bot = createConversationHarness();
 const g = await bot.send('hello shop ơi');
 assert.equal(g.res.statusCode, 200);
 assert.equal(g.record.p_level, 1);
 assert.equal(g.record.p_handover, false);
 assert.equal(g.modelCount, 0);

 const t = await bot.send('oki cảm ơn shop nhiều nha');
 assert.equal(t.record.p_level, 1);
 assert.match(t.record.p_reply, /^PawPal vui vì được giúp bạn/);

 const p = await bot.send('dịch vụ cắt tỉa rất tuyệt vời, sẽ quay lại!');
 assert.equal(p.record.p_level, 1);
 assert.equal(p.adviceCount, 0);
 assert.doesNotMatch(p.record.p_reply, /\/booking/);
});

test('natural tier 2: shy spa worries, dryer fear, meta-chat, tone feedback, and return policy route naturally', async () => {
 const bot = createConversationHarness();

 const shy = await bot.send('bé nhà mình nhút nhát lắm, lần đầu đi spa sợ bị stress');
 assert.equal(shy.record.p_level, 2);
 assert.equal(shy.adviceCount, 0);
 assert.equal(shy.modelCount, 1);

 const dryer = await bot.send('bé mèo nhà mình hay sợ tiếng máy sấy thì bên bạn làm thế nào');
 assert.equal(dryer.record.p_level, 2);
 assert.doesNotMatch(dryer.record.p_reply, /Bạn đang hỏi tắm\/cắt tỉa, Hotel, Taxi/);
 assert.equal(dryer.modelCount, 2);

 const past = await bot.send('bữa tôi hỏi sao bạn không trả lời cho tôi biết');
 assert.equal(past.record.p_level, 2);
 assert.equal(past.modelCount, 3);

 const stiff = await bot.send('sao bạn nói chuyện nghe cứng nhắc giống cái máy vậy');
 assert.equal(stiff.record.p_level, 2);
 assert.doesNotMatch(stiff.record.p_reply, /hủy lịch/i);
 assert.equal(stiff.modelCount, 4);

 const policy = await bot.send('đổi trả hàng bị lỗi như thế nào?');
 assert.equal(policy.record.p_level, 2);
 assert.doesNotMatch(policy.record.p_reply, /\/user#support-create/);
});

test('natural tier 3: impatience, mild disappointment, and special care health follow-up stay at level 3', async () => {
 const bot = createConversationHarness();

 const impatient = await bot.send('sao lâu vậy?? không ai trả lời à');
 assert.equal(impatient.record.p_level, 3);
 assert.equal(impatient.record.p_handover, false);
 assert.match(impatient.record.p_reply, /chờ lâu/);

 const mildBot = createConversationHarness();
 const mild = await mildBot.send('bạn làm gì kì vậy');
 assert.equal(mild.record.p_level, 3);
 assert.equal(mild.record.p_handover, false);
 assert.match(mild.record.p_reply, /PawPal rất tiếc/);

 const care = await mildBot.send('bé sau khi tắm về bị mệt mỏi biếng ăn');
 assert.equal(care.record.p_level, 3);
 assert.match(care.record.p_reply, /bác sĩ thú y/);

 const vomit = await mildBot.send('bé vừa nôn 2 lần');
 assert.equal(vomit.record.p_level, 3);
 assert.match(vomit.record.p_reply, /nôn 2 lần/);
});

test('natural tier 4: damaged delivery complaints and double billing trigger level 4 handover for members', async () => {
 const memberBot = createConversationHarness({ isMember: true });

 const damaged = await memberBot.send('Đơn hàng của tôi bị giao trễ quá hẹn và hộp bánh thưởng bị móp méo vỡ nát, quá thất vọng!');
 assert.equal(damaged.record.p_level, 4);
 assert.equal(damaged.record.p_handover, true);
 assert.match(damaged.record.p_reply, /\/user#support-create/);

 const billing = await memberBot.send('bị trừ tiền 2 lần khi thanh toán');
 assert.equal(billing.record.p_level, 4);
 assert.equal(billing.record.p_handover, true);
 assert.match(billing.record.p_reply, /đối soát/);

 const follow = await memberBot.send('tôi đã gửi yêu cầu hỗ trợ rồi');
 assert.match(follow.record.p_reply, /\/user#support/);
});

test('natural tier 5 & 6: multi-turn de-escalation, toxic shield masking, severe anger, emergency, and late pregnancy', async () => {
 const guestBot = createConversationHarness({
  profanity: [{ keyword: 'dm', action: 'mask' }, { keyword: 'cc', action: 'mask' }],
  sentiment: [{ trigger_pattern: 'lừa đảo, mất dạy, bóc phốt', tier_level: 5 }]
 });

 const t1 = await guestBot.send('làm ăn gì kì v');
 assert.equal(t1.record.p_level, 3);
 assert.match(t1.record.p_reply, /PawPal rất tiếc/);

 const t2 = await guestBot.send('h sao');
 assert.doesNotMatch(t2.record.p_reply, /rất tiếc/i);

 const t3 = await guestBot.send('bực');
 assert.doesNotMatch(t3.record.p_reply, /rất tiếc/i);
 assert.notEqual(t2.record.p_reply, t3.record.p_reply);

 const t4 = await guestBot.send('nghĩ sao mà làm con chó tôi ra nông nỗi v');
 assert.equal(t4.record.p_level, 5);
 assert.match(t4.record.p_reply, /\/user#support-create/);

 const toxic = await guestBot.send('dm shop làm ăn như cc');
 assert.equal(toxic.record.p_level, 5);
 assert.equal(toxic.record.p_toxic, true);
 assert.equal(toxic.record.p_understood, false);
 assert.ok(!toxic.record.p_content.includes('dm'));
 assert.doesNotMatch(toxic.record.p_reply, /^PawPal hiểu bạn cần được hỗ trợ sớm/);

 const memberBot = createConversationHarness({
  isMember: true,
  sentiment: [{ trigger_pattern: 'lừa đảo, mất dạy, bóc phốt', tier_level: 5 }]
 });

 const rage = await memberBot.send('Dịch vụ như lừa đảo, lũ chúng mày làm ăn mất dạy tao sẽ bóc phốt!');
 assert.equal(rage.record.p_level, 5);
 assert.equal(rage.record.p_handover, true);

 const pregnancy = await memberBot.send('Bé mèo nhà mình đang mang thai tháng cuối thì có tắm spa được không shop?');
 assert.equal(pregnancy.record.p_level, 6);
 assert.equal(pregnancy.record.p_handover, true);
 assert.doesNotMatch(pregnancy.record.p_reply, /^Bạn hãy liên hệ ngay bác sĩ thú y/);

 const emergency = await memberBot.send('bé khó thở quá, thở gấp');
 assert.equal(emergency.record.p_level, 6);
 assert.equal(emergency.record.p_handover, true);
 assert.match(emergency.record.p_reply, /liên hệ ngay bác sĩ thú y/);
});
