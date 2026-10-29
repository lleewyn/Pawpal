import {guestCommerce} from '../../../scripts/shared/guest-commerce-client.mjs';
import {mountGuestBookingLookup,mountGuestOrderLookup} from './guest-booking-lookup.mjs';
import {verifyGuestHistoryPhone} from './guest-history-otp.mjs';

function normalizeVietnamPhone(value){
    let phone=value.trim().replace(/[\s().-]/g,'');
    if(/^(?:\+84|0084|84)\d{9}$/.test(phone))phone='0'+phone.slice(-9);
    if(!/^0\d{9}$/.test(phone))throw Error('invalid_phone');
    return phone;
}

export function mapGuestReceipts(data){
    return {
        customer:data.customer,
        bookings:(data.bookings||[]).map(receipt=>({
            id:receipt.code,_supabaseId:receipt.id,_receiptOnly:true,
            serviceName:'Lịch hẹn dịch vụ',status:receipt.status==='in_progress'?'in-progress':receipt.status,
            date:receipt.start_at?new Date(receipt.start_at).toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'}):'',
            timeStart:receipt.start_at?new Date(receipt.start_at).toLocaleTimeString('vi-VN',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'}):'',
            scheduledEndAt:receipt.end_at,price:Number(receipt.total)
        })),
        orders:(data.orders||[]).map(receipt=>({
            id:receipt.code,_supabaseId:receipt.id,_receiptOnly:true,
            status:({packing:'preparing',shipped:'shipping'})[receipt.status]||receipt.status,
            paymentStatus:receipt.paymentStatus,pricing:{total:Number(receipt.total)},
            delivery:{name:receipt.receiver?.name,address:[receipt.receiver?.address,receipt.receiver?.province].filter(Boolean).join(', ')},
            products:(receipt.lines||[]).map(line=>({name:line.name,quantity:Number(line.quantity),price:Number(line.unitPrice),image:'/assets/images/shop/products/placeholder.webp'}))
        }))
    };
}

export function mountGuestPhoneLookup(form,{loadMember,renderMember,clearMember,mapHistory}){
    const input=form.querySelector('#rg-phone'),button=form.querySelector('[type="submit"]'),error=form.querySelector('#rg-error');
    mountGuestBookingLookup(form);mountGuestOrderLookup(form);
    error.setAttribute('role','status');error.setAttribute('aria-live','polite');
    let generation=0,busy=false,verification;
    const clear=()=>{generation++;verification?.abort();clearMember();document.getElementById('rg-results')?.classList.add('d-none');error.classList.add('d-none');};
    input.addEventListener('input',clear);
    form.addEventListener('submit',async event=>{
        event.preventDefault();if(busy)return;clear();const expected=generation;
        let phone;
        try{phone=normalizeVietnamPhone(input.value);}catch{error.textContent='Vui lòng nhập số điện thoại Việt Nam hợp lệ, ví dụ 0901234567.';error.classList.remove('d-none');input.focus();return;}
        verification=new AbortController();busy=true;button.disabled=true;button.textContent='Đang tra cứu…';
        try{
            const db=window.getSupabaseClient?window.getSupabaseClient():window.SupabaseClient;
            const session=await db?.auth?.getSession();
            if(expected!==generation)return;
            if(session?.data?.session?.access_token){
                const results=await loadMember(phone);if(expected!==generation)return;
                renderMember(results.bookings,results.orders,phone,results.customer);
                document.getElementById('rg-results')?.classList.remove('d-none');
                return;
            }
            let results;
            try{const data=await guestCommerce.request('lookup',{phone});if(expected!==generation)return;results=mapGuestReceipts(data);}
            catch(failure){
                if(failure.status!==403||expected!==generation)throw failure;
                const challenge=await guestCommerce.request('phone-lookup',{phone});if(expected!==generation)return;
                if(!challenge.requiresOtp||!challenge.challengeId)throw Error('Chưa khởi tạo được xác thực. Vui lòng thử lại.');
                const rows=await verifyGuestHistoryPhone(phone,challenge,verification.signal);if(expected!==generation)return;
                results=mapHistory(rows);
            }
            if(!results.bookings.length&&!results.orders.length){error.textContent='Chưa tìm thấy đơn hàng hoặc lịch hẹn với số điện thoại này.';error.classList.remove('d-none');return;}
            renderMember(results.bookings,results.orders,phone,results.customer);
            document.getElementById('rg-results')?.classList.remove('d-none');
        }catch(failure){if(expected===generation&&failure.name!=='AbortError'){error.textContent=failure.message||'Chưa tra cứu được. Vui lòng thử lại.';error.classList.remove('d-none');}}
        finally{busy=false;button.disabled=false;button.textContent='Tìm kiếm';}
    });
    const reset=()=>{clear();input.value='';};
    document.addEventListener('auth_state_changed',reset);
    window.addEventListener('storage',event=>{if(event.key==='pawpal_current_user'||event.key===null)reset();});
}
