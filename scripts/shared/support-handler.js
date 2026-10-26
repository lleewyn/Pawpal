
(function() {


    let cachedTickets = [];
    const paged=()=>window.PAWPAL_SUPPORT_PAGING_ENABLED!==false;
    let pageInfo={page:1,total:0,counts:null,filter:'all'},pinnedTicket=null,ticketDetailVersion=0;
    const mapTicket=t=>({id:t.id,rawId:t.id,ticketCode:t.ticket_code,title:t.subject,description:t.description,type:t.category,status:t.status,priority:['high','urgent'].includes(t.priority)?'Cao':'Trung bình',rating:t.rating,ratingComment:t.rating_comment,createdAt:t.created_at,resolution:t.resolution_note?{note:t.resolution_note}:null,context:{bookingId:t.appointment_id,orderId:t.order_id,serviceName:t.service_name,petName:t.pet_name},messages:t.messages||[],messageTotal:t.message_total??(t.messages||[]).length,messagePage:t.message_page||1});
    let ticketsChannel = null;
    let activeOwner = null, epoch = 0, ticketLoad = null, refreshTimer = null;
    let dirty = false, waitingForLoad = false;
    const currentOwner = () => { try { return JSON.parse(localStorage.getItem('pawpal_current_user') || 'null')?.id || null; } catch { return null; } };
    const supportView = () => location.hash.split('?')[0] === '#support';
    function stopRealtime() {
        ++epoch; clearTimeout(refreshTimer); refreshTimer = null; dirty = false; ticketLoad = null; waitingForLoad = false;
        if(ticketsChannel){client()?.removeChannel(ticketsChannel);ticketsChannel=null;}
    }
    function adoptOwner() {
        const owner = currentOwner();
        if (owner !== activeOwner) {
            stopRealtime(); cachedTickets = [];pinnedTicket=null;++ticketDetailVersion;pageInfo={page:1,total:0,counts:null,filter:'all'}; requestIds.clear(); ticketLoad = null; activeOwner = owner;
        }
        return owner;
    }
    function loadError() { document.dispatchEvent(new CustomEvent('support_load_error')); }
    function scheduleRefresh() {
        if (!dirty || refreshTimer || document.hidden || !supportView() || !currentOwner()) return;
        if (ticketLoad) {
            if (!waitingForLoad) {
                waitingForLoad = true;
                ticketLoad.promise.finally(() => { waitingForLoad = false; scheduleRefresh(); }).catch(() => {});
            }
            return;
        }
        refreshTimer = setTimeout(() => {
            refreshTimer = null;
            if (document.hidden || !supportView() || !dirty) return;
            dirty = false;
            loadTickets().catch(loadError);
        }, 200);
    }
    function requestRefresh() { dirty = true; scheduleRefresh(); }
    window.addEventListener('hashchange',()=>{
        if (!supportView()) stopRealtime();
    });
    document.addEventListener('visibilitychange',scheduleRefresh);
    const onActorChange = () => {
        adoptOwner();
        document.dispatchEvent(new CustomEvent('tickets_updated'));
    };
    document.addEventListener('auth_state_changed',onActorChange);
    window.addEventListener('storage',event=>{if(!event.key || event.key==='pawpal_current_user')onActorChange();});
    const requestIds = new Map();
    const client = () => window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    async function rpc(name,args) {
        const owner = adoptOwner(), version = epoch;
        const db = client();
        const auth = await db?.auth?.getUser();
        if (!auth?.data?.user || auth.error) throw Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        const expectedAuth = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null')?.auth_user_id;
        if (expectedAuth && expectedAuth !== auth.data.user.id) throw Error('Hồ sơ không thuộc phiên đăng nhập hiện tại. Vui lòng tải lại.');
        if (!owner || currentOwner() !== owner || version !== epoch) throw Error('Phiên đăng nhập đã thay đổi. Vui lòng tải lại.');
        const result = await db.rpc(name,args);
        if (currentOwner() !== owner || version !== epoch) throw Error('Phiên đăng nhập đã thay đổi. Vui lòng tải lại.');
        if (result.error) throw Error(result.error.code === 'PT409' ? 'Yêu cầu đã được lưu với thông tin khác. Vui lòng tải lại để đối soát.' : 'Không thể lưu dữ liệu hỗ trợ. Vui lòng thử lại.');
        return result.data;
    }
    function loadTickets() {
        const owner = adoptOwner(), version = epoch;
        if (ticketLoad?.owner === owner) return ticketLoad.promise;
        const request = {owner, promise: null};
        request.promise = fetchTickets(owner, version).finally(() => { if (ticketLoad === request) ticketLoad = null; });
        ticketLoad = request;
        return request.promise;
    }
    async function fetchTickets(owner, version) {
        try {
            const result = await rpc('own_support_tickets',paged()?{p_page:pageInfo.page,p_filter:pageInfo.filter,p_ticket:null,p_message_page:1}:undefined);
            const rows=Array.isArray(result)?result:result.rows;
            if (owner !== currentOwner() || version !== epoch) throw Error('Phiên hỗ trợ đã thay đổi.');
            cachedTickets = (rows || []).map(mapTicket);
            pageInfo={...pageInfo,page:result.page||1,total:result.total??rows.length,counts:result.counts||null};
            if(paged() && pinnedTicket)await fetchTicket(pinnedTicket.id,pinnedTicket.messagePage,false);
            if (!ticketsChannel && supportView()) {
                ticketsChannel=client().channel('customer-support-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'support_ticket_message'},requestRefresh).subscribe();
            }
            document.dispatchEvent(new CustomEvent('tickets_updated'));
            return cachedTickets;
        } catch(error) { throw error; }
    }
    function sbGetTickets() { adoptOwner(); return pinnedTicket?[pinnedTicket,...cachedTickets.filter(t=>t.id!==pinnedTicket.id)]:cachedTickets; }
    async function fetchTicket(id,messagePage=1,notify=false){
        if(!paged())return sbGetTickets().find(t=>t.id===id);
        const detailVersion=++ticketDetailVersion;
        const result=await rpc('own_support_tickets',{p_page:1,p_filter:'all',p_ticket:id,p_message_page:messagePage});
        if(detailVersion!==ticketDetailVersion)return null;
        pinnedTicket=result.rows?.[0]?mapTicket(result.rows[0]):null;
        if(notify)document.dispatchEvent(new CustomEvent('tickets_updated'));
        return pinnedTicket;
    }
    async function setPage(page,filter=pageInfo.filter){if(ticketLoad)return;pageInfo={...pageInfo,page,filter};return loadTickets();}
    async function sbCreateTicket(title,type,content,files=[],context={}) {
        if (files.length) throw Error('Ảnh và tệp chưa được hỗ trợ. Vui lòng gửi nội dung văn bản.');
        const key=JSON.stringify([adoptOwner(),'create',context.requestId,title,type,content,context.bookingId,context.orderId,context.customerDemand]);
        if (!requestIds.has(key)) requestIds.set(key,context.requestId || crypto.randomUUID());
        const id=requestIds.get(key);
        const saved=await rpc('create_own_support_ticket',{
            p_id:id,p_category:type,p_subject:title,p_content:content,
            p_appointment:type==='service'?context.bookingId:null,p_order:type==='order'?context.orderId:null,
            p_resolution:context.customerDemand || null
        });
        if (saved!==id) throw Error('Chưa xác nhận được kết quả lưu. Vui lòng thử lại.');
        if (requestIds.get(key) === id) requestIds.delete(key);
        // The acknowledgement is authoritative even if a subsequent list refresh fails.
        return {id,rawId:id};
    }
    async function sbSendTicketReply(ticketId,text) {
        const owner=adoptOwner(),version=epoch;
        const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
        if(owner!==currentOwner() || version!==epoch)throw Error('Phiên đăng nhập đã thay đổi. Vui lòng tải lại.');
        const key=JSON.stringify([owner,'reply',ticketId,digest]);
        const storageKey=`pawpal_support_reply:${owner}:${ticketId}:${digest}`;
        if (!requestIds.has(key)) {
            const stored=sessionStorage.getItem(storageKey);
            requestIds.set(key,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stored||'')?stored:crypto.randomUUID());
        }
        sessionStorage.setItem(storageKey,requestIds.get(key));
        if(sessionStorage.getItem(storageKey)!==requestIds.get(key))throw Error('Không thể giữ mã phản hồi để thử lại an toàn.');
        const id=requestIds.get(key),saved=await rpc('reply_own_support_ticket',{p_id:id,p_ticket:ticketId,p_content:text});
        if (saved!==id) throw Error('Chưa xác nhận được phản hồi. Vui lòng thử lại.');
        if (requestIds.get(key) === id) requestIds.delete(key);
        if(sessionStorage.getItem(storageKey)===id)sessionStorage.removeItem(storageKey);
        await loadTickets().catch(loadError); return saved;
    }
    async function sbCloseAndRateTicket(ticketId,rating,comment='') {
        const saved=await rpc('rate_own_support_ticket',{p_ticket:ticketId,p_rating:rating,p_comment:comment});
        if (saved!==ticketId) throw Error('Chưa xác nhận được đánh giá. Vui lòng thử lại.');
        await loadTickets().catch(loadError); return saved;
    }

    window.PawPalSupport = {
        isPaged:paged,getPageInfo:()=>pageInfo,getPageTickets:()=>cachedTickets,setPage,
        releaseTicket:()=>{pinnedTicket=null;++ticketDetailVersion;},
        ensureTicket:async id=>sbGetTickets().find(t=>t.id===id)||await fetchTicket(id),
        messagePage:(id,page)=>fetchTicket(id,page,true),
        stopRealtime,
        requestRefresh,
        getTickets: sbGetTickets,
        loadTickets: loadTickets,
        createTicket: sbCreateTicket,
        sendTicketReply: sbSendTicketReply,
        closeAndRateTicket: sbCloseAndRateTicket
    };
    window.PawPalSupportReady = true;
    document.dispatchEvent(new CustomEvent('support_ready'));
})();
