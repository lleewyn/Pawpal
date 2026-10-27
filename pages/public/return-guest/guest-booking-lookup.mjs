import {guestCommerce} from '../../../scripts/shared/guest-commerce-client.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses={pending:'Chờ xác nhận',confirmed:'Đã xác nhận',in_progress:'Đang thực hiện',completed:'Hoàn tất',cancelled:'Đã hủy',no_show:'Không đến'};
export function bookingLookupRequest(search,storage){
    const params=new URLSearchParams(search);
    if(params.has('booking'))return params.get('booking');
    try{return storage.getItem('pawpal_guest_booking_request_v1');}catch{return null;}
}
export async function loadGuestBookingReceipt(requestId,client=guestCommerce){
    if(typeof requestId!=='string'||!uuid.test(requestId))throw Error('Liên kết lịch hẹn không hợp lệ. Vui lòng kiểm tra lại.');
    const {booking}=await client.request('booking-receipt',{requestId});
    if(!booking||typeof booking.id!=='string'||booking.id.toLowerCase()!==requestId.toLowerCase()||typeof booking.code!=='string'
        ||typeof booking.start_at!=='string'||!Number.isFinite(Date.parse(booking.start_at))
        ||typeof booking.end_at!=='string'||!Number.isFinite(Date.parse(booking.end_at))
        ||booking.total==null||!Number.isFinite(Number(booking.total))||Number(booking.total)<0)throw Error('Chưa xác minh được thông tin lịch hẹn. Vui lòng thử lại.');
    return booking;
}
function node(tag,text,className=''){const element=document.createElement(tag);element.className=className;if(text!=null)element.textContent=text;return element;}
export function mountGuestBookingLookup(form){
    const requestId=bookingLookupRequest(location.search,sessionStorage);
    if(requestId==null||!form.isConnected||document.getElementById('guest-booking-lookup'))return;
    const panel=node('section',null,'rg-session-booking');panel.id='guest-booking-lookup';panel.setAttribute('aria-labelledby','guest-booking-lookup-title');
    const title=node('h2','Lịch hẹn của bạn');title.id='guest-booking-lookup-title';
    const feedback=node('p','Đang tải lịch hẹn…');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
    const details=node('dl',null,'rg-session-booking-details'),button=node('button','Cập nhật trạng thái','btn-green-outline');button.type='button';
    panel.append(title,feedback,details,button);form.before(panel);
    let busy=false,invalidated=false;
    const active=()=>panel.isConnected;
    async function refresh(){
        if(busy||invalidated||!active())return;busy=true;button.disabled=true;details.replaceChildren();feedback.textContent='Đang tải lịch hẹn…';
        try{
            const booking=await loadGuestBookingReceipt(requestId);if(!active()||invalidated)return;
            const format=value=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'});
            const entries=[['Mã lịch hẹn',booking.code],['Trạng thái',statuses[booking.status]||'Đang xử lý'],['Thời gian hẹn',format(booking.start_at)],['Kết thúc dự kiến',format(booking.end_at)],['Tổng tiền dự kiến',Number(booking.total).toLocaleString('vi-VN')+' đ']];
            for(const [label,value]of entries){const row=node('div');row.append(node('dt',label),node('dd',value));details.append(row);}
            feedback.textContent='';
        }catch(error){if(active()&&!invalidated)feedback.textContent=error.status===401||error.status===403?'Phiên hiện tại không có quyền xem lịch hẹn này. Vui lòng liên hệ PawPal để được hỗ trợ.':error.message||'Chưa tải được lịch hẹn. Vui lòng thử lại.';}
        finally{busy=false;if(active()&&!invalidated)button.disabled=false;}
    }
    button.onclick=refresh;refresh();
    const clear=()=>{invalidated=true;if(active()){details.replaceChildren();feedback.textContent='Tài khoản đã thay đổi. Vui lòng tải lại trang để kiểm tra.';button.disabled=true;}};
    document.addEventListener('auth_state_changed',clear);
    window.addEventListener('storage',event=>{if(event.key==='pawpal_current_user'||event.key===null)clear();});
}

export function mountGuestOrderLookup(form){
    const requestId=new URLSearchParams(location.search).get('order');
    if(!requestId||!form.isConnected||document.getElementById('guest-order-lookup'))return;
    const panel=node('section',null,'rg-session-booking');panel.id='guest-order-lookup';
    const title=node('h2','Đơn hàng của bạn'),feedback=node('p'),details=node('dl',null,'rg-session-booking-details'),button=node('button','Cập nhật trạng thái','btn-green-outline');button.type='button';feedback.setAttribute('role','status');panel.append(title,feedback,details,button);form.before(panel);
    let busy=false,invalidated=false;
    async function refresh(){
        if(busy||invalidated||!panel.isConnected)return;busy=true;button.disabled=true;details.replaceChildren();feedback.textContent='Đang tải đơn hàng…';
        try{
            if(!uuid.test(requestId))throw Error('Liên kết đơn hàng không hợp lệ.');
            const {order}=await guestCommerce.request('order-receipt',{requestId});if(!panel.isConnected||invalidated)return;
            if(!order||String(order.id).toLowerCase()!==requestId.toLowerCase()||typeof order.code!=='string'||order.total==null||!Number.isFinite(Number(order.total))||Number(order.total)<0)throw Error('Chưa xác minh được đơn hàng.');
            const labels={pending:'Chờ xác nhận',confirmed:'Đã xác nhận',packing:'Đang chuẩn bị',shipped:'Đang giao',shipping:'Đang giao',delivered:'Đã giao',completed:'Hoàn tất',cancelled:'Đã hủy',returned:'Đã trả hàng'};
            for(const [label,value]of [['Mã đơn hàng',order.code],['Trạng thái',labels[order.status]||'Đang xử lý'],['Tổng tiền',Number(order.total).toLocaleString('vi-VN')+' đ']]){const row=node('div');row.append(node('dt',label),node('dd',value));details.append(row);}feedback.textContent='';
        }catch(error){if(panel.isConnected&&!invalidated)feedback.textContent=[401,403].includes(error.status)?'Phiên hiện tại không có quyền xem đơn này. Bạn có thể nhập mã tra cứu riêng đã lưu bên dưới.':error.message;}
        finally{busy=false;if(panel.isConnected&&!invalidated)button.disabled=false;}
    }
    button.onclick=refresh;refresh();const clear=()=>{invalidated=true;details.replaceChildren();feedback.textContent='Tài khoản đã thay đổi. Vui lòng tải lại trang.';button.disabled=true;};document.addEventListener('auth_state_changed',clear);window.addEventListener('storage',event=>{if(event.key==='pawpal_current_user'||event.key===null)clear();});
}
