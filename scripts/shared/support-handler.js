
(function() {


    let cachedTickets = [];
    let ticketsChannel = null;
    function stopRealtime() { if(ticketsChannel){client()?.removeChannel(ticketsChannel);ticketsChannel=null;} }
    window.addEventListener('hashchange',()=>{
        if (!location.hash.startsWith('#support') && ticketsChannel) { client()?.removeChannel(ticketsChannel); ticketsChannel=null; }
    });
    const requestIds = new Map();
    const client = () => window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    async function rpc(name,args) {
        const db = client();
        const auth = await db?.auth?.getUser();
        if (!auth?.data?.user || auth.error) throw Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        const result = await db.rpc(name,args);
        if (result.error) throw Error(result.error.code === 'PT409' ? 'Yêu cầu đã được lưu với thông tin khác. Vui lòng tải lại để đối soát.' : 'Không thể lưu dữ liệu hỗ trợ. Vui lòng thử lại.');
        return result.data;
    }
    async function loadTickets() {
        try {
            const rows = await rpc('own_support_tickets');
            cachedTickets = (rows || []).map(t => ({
                id:t.id,rawId:t.id,ticketCode:t.ticket_code,title:t.subject,description:t.description,
                type:t.category,status:t.status,priority:['high','urgent'].includes(t.priority)?'Cao':'Trung bình',
                rating:t.rating,ratingComment:t.rating_comment,createdAt:t.created_at,
                resolution:t.resolution_note ? {note:t.resolution_note} : null,
                context:{bookingId:t.appointment_id,orderId:t.order_id,serviceName:t.service_name,petName:t.pet_name},
                messages:t.messages || []
            }));
            if (!ticketsChannel && location.hash.startsWith('#support')) {
                ticketsChannel=client().channel('customer-support-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'support_ticket_message'},()=>{
                    loadTickets().catch(()=>{ document.dispatchEvent(new CustomEvent('support_load_error')); });
                }).subscribe();
            }
            document.dispatchEvent(new CustomEvent('tickets_updated'));
            return cachedTickets;
        } catch(error) { cachedTickets=[]; throw error; }
    }
    function sbGetTickets() { return cachedTickets; }
    async function sbCreateTicket(title,type,content,files=[],context={}) {
        if (files.length) throw Error('Ảnh và tệp chưa được hỗ trợ. Vui lòng gửi nội dung văn bản.');
        const key=JSON.stringify([title,type,content,context.bookingId,context.orderId,context.customerDemand]);
        if (!requestIds.has(key)) requestIds.set(key,context.requestId || crypto.randomUUID());
        const id=requestIds.get(key);
        const saved=await rpc('create_own_support_ticket',{
            p_id:id,p_category:type,p_subject:title,p_content:content,
            p_appointment:type==='service'?context.bookingId:null,p_order:type==='order'?context.orderId:null,
            p_resolution:context.customerDemand || null
        });
        if (saved!==id) throw Error('Chưa xác nhận được kết quả lưu. Vui lòng thử lại.');
        // The acknowledgement is authoritative even if a subsequent list refresh fails.
        return {id,rawId:id};
    }
    async function sbSendTicketReply(ticketId,text) {
        const key=JSON.stringify(['reply',ticketId,text]);
        if (!requestIds.has(key)) requestIds.set(key,crypto.randomUUID());
        const id=requestIds.get(key),saved=await rpc('reply_own_support_ticket',{p_id:id,p_ticket:ticketId,p_content:text});
        if (saved!==id) throw Error('Chưa xác nhận được phản hồi. Vui lòng thử lại.');
        await loadTickets(); return saved;
    }
    async function sbCloseAndRateTicket(ticketId,rating,comment='') {
        const saved=await rpc('rate_own_support_ticket',{p_ticket:ticketId,p_rating:rating,p_comment:comment});
        if (saved!==ticketId) throw Error('Chưa xác nhận được đánh giá. Vui lòng thử lại.');
        await loadTickets(); return saved;
    }

    window.PawPalSupport = {
        stopRealtime,
        getTickets: sbGetTickets,
        loadTickets: loadTickets,
        createTicket: sbCreateTicket,
        sendTicketReply: sbSendTicketReply,
        closeAndRateTicket: sbCloseAndRateTicket
    };
    window.PawPalSupportReady = true;
    document.dispatchEvent(new CustomEvent('support_ready'));
})();
