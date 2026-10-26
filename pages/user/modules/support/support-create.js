import '/scripts/shared/support-handler.js';
import { API } from '/scripts/api/api.js';

export async function initSupportCreate() {
    window.setUserSubBreadcrumb?.('Gửi yêu cầu mới','support');
    const form=document.getElementById('createComplaintForm');if(!form)return;
    const get=id=>form.querySelector('#'+id),type=get('ticketType'),button=get('btnSubmitComplaint'),error=get('supportCreateError');
    form.addEventListener('submit',e=>e.preventDefault());
    const user=window.getCurrentUser?.() || JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const db=window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    const native=await db?.auth?.getUser();if(native?.error || !native?.data?.user){error.textContent='Vui lòng đăng nhập để gửi yêu cầu.';button.disabled=true;button.textContent='Gửi yêu cầu';return;}
    const key='pawpal_support_request:'+native.data.user.id;
    let requestId=sessionStorage.getItem(key);if(!/^[0-9a-f-]{36}$/i.test(requestId || '')){requestId=crypto.randomUUID();sessionStorage.setItem(key,requestId);}
    const results=await Promise.allSettled([API.getUserBookings(user),API.getUserOrders(user)]);
    if(!form.isConnected)return;
    const bookings=results[0].status==='fulfilled'?results[0].value:[],orders=results[1].status==='fulfilled'?results[1].value:[];
    const showType=()=>{get('serviceContextSection').classList.toggle('d-none',type.value!=='service');get('orderContextSection').classList.toggle('d-none',type.value!=='order');error.textContent='';};
    type.addEventListener('change',showType);
    function autocomplete(searchId,valueId,optionsId,rows,label,onSelect=()=>{}) {
        const input=get(searchId),value=get(valueId),options=get(optionsId);
        const close=()=>{options.hidden=true;input.setAttribute('aria-expanded','false');};
        const select=row=>{input.value=label(row);value.value=row._supabaseId;close();onSelect(row);};
        const render=()=>{options.replaceChildren();const matches=rows.filter(row=>label(row).toLocaleLowerCase('vi').includes(input.value.trim().toLocaleLowerCase('vi')));
            for(const row of matches){const choice=document.createElement('button');choice.type='button';choice.className='btn text-start w-100';choice.setAttribute('role','option');choice.textContent=label(row);choice.onclick=()=>select(row);options.appendChild(choice);}
            if(!matches.length){const empty=document.createElement('p');empty.className='p-3 m-0';empty.textContent='Không có lựa chọn phù hợp.';options.appendChild(empty);}options.hidden=false;input.setAttribute('aria-expanded','true');};
        input.onfocus=render;input.oninput=()=>{value.value='';onSelect(null);render();};
        input.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='ArrowDown'){e.preventDefault();options.querySelector('button')?.focus();}if(e.key==='Enter'){e.preventDefault();options.querySelector('button')?.click();}};
        form.addEventListener('click',e=>{if(!input.parentElement.contains(e.target))close();});return select;
    }
    const selectBooking=autocomplete('serviceBookingSearch','serviceBookingSelect','serviceBookingOptions',bookings,b=>`${b.id} — ${b.serviceName} — ${b.petName}`,b=>{get('serviceSummaryBox').textContent=b?`${b.date} ${b.timeStart || ''}`:'';});
    const selectOrder=autocomplete('orderSearch','orderSelect','orderOptions',orders,o=>`${o.id} — ${o.products?.[0]?.name || ''}`);
    const params=new URLSearchParams(location.hash.split('?')[1] || '');
    if(['service','order','payment','other'].includes(params.get('type')))type.value=params.get('type');showType();
    const booking=bookings.find(b=>[b.id,b._supabaseId].includes(params.get('bookingId')));if(booking)selectBooking(booking);
    const order=orders.find(o=>[o.id,o._supabaseId].includes(params.get('orderId')));if(order)selectOrder(order);
    form.addEventListener('input',()=>{error.textContent='';});
    button.onclick=async()=>{
        if(button.disabled)return;error.textContent='';
        const title=get('ticketTitle').value.trim(),content=get('ticketContent').value.trim();
        if(!type.value || title.length<2 || content.length<2){error.textContent='Vui lòng chọn phân loại và nhập chủ đề, nội dung từ 2 ký tự.';return;}
        if(type.value==='service'&&!get('serviceBookingSelect').value || type.value==='order'&&!get('orderSelect').value){error.textContent='Vui lòng chọn đúng lịch hẹn hoặc đơn hàng liên quan.';return;}
        button.disabled=true;button.textContent='Đang gửi…';
        try{
            const saved=await window.PawPalSupport.createTicket(title,type.value,content,[],{requestId,bookingId:get('serviceBookingSelect').value,orderId:get('orderSelect').value});
            if(saved?.id!==requestId)throw Error('Chưa xác nhận được kết quả lưu. Vui lòng thử lại.');
            sessionStorage.removeItem(key);location.hash='support';
        }catch(e){error.textContent=e.message;button.disabled=false;button.textContent='Gửi yêu cầu';}
    };
    button.disabled=false;button.textContent='Gửi yêu cầu';
}
export const init=initSupportCreate;
