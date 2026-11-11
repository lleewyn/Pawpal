import {guestCommerce} from '../../../scripts/shared/guest-commerce-client.mjs';
import {mountGuestBookingLookup,mountGuestOrderLookup} from './guest-booking-lookup.mjs';
import {verifyGuestHistoryPhone} from './guest-history-otp.mjs';

function normalizeVietnamPhone(value){
    let phone=value.trim().replace(/[\s().-]/g,'');
    if(/^(?:\+84|0084|84)\d{9}$/.test(phone))phone='0'+phone.slice(-9);
    if(!/^0\d{9}$/.test(phone))throw Error('invalid_phone');
    return phone;
}

function resolveProductThumbnail(name, rawImage) {
    if (rawImage && rawImage !== '/assets/images/shop/products/placeholder.webp' && !rawImage.includes('undefined')) {
        return rawImage;
    }
    const n = String(name || '').toLowerCase();
    if (n.includes('royal canin') || n.includes('babycat')) return '/assets/images/shop/products/tp-hat-01.png';
    if (n.includes('churu') || n.includes('ciao')) return '/assets/images/shop/products/tp-sup-03.png';
    if (n.includes('orijen') || n.includes('fit & trim') || n.includes('fit và trim')) return '/assets/images/shop/products/TP-HAT-05.png';
    if (n.includes('king') && n.includes('pet')) return '/assets/images/shop/products/TP-PATE-02.png';
    if (n.includes('whiskas')) return '/assets/images/shop/products/TP-HAT-04.png';
    if (n.includes('taste of the wild')) return '/assets/images/shop/products/TP-HAT-06.png';
    if (n.includes('intense beauty')) return '/assets/images/shop/products/TP-PATE-08.png';
    if (n.includes('pate') || n.includes('home-cooked')) return '/assets/images/shop/products/TP-PATE-07.png';
    if (n.includes('wanpy')) return '/assets/images/shop/products/TP-SUP-09.png';
    if (n.includes('cá hồi') || n.includes('dầu cá')) return '/assets/images/shop/products/TP-SUP-10.png';
    if (n.includes('virbac') || n.includes('gel')) return '/assets/images/shop/products/TP-SUP-11.png';
    if (n.includes('bene-bac') || n.includes('men vi sinh')) return '/assets/images/shop/products/TP-SUP-12.png';
    if (n.includes('jolly') || n.includes('fullvit')) return '/assets/images/shop/products/TP-HAT-13.png';
    if (n.includes('timothy') || n.includes('cỏ khô')) return '/assets/images/shop/products/TP-CO-14.png';
    if (n.includes('bánh mài răng')) return '/assets/images/shop/products/TP-SUP-15.png';
    if (n.includes('bát ăn') || n.includes('cà rốt')) return '/assets/images/shop/products/DD-BAT-18.png';
    if (n.includes('bình nước')) return '/assets/images/shop/products/DD-BINH-02.png';
    if (n.includes('nệm') || n.includes('lông cừu')) return '/assets/images/shop/products/PK-NEM-06.png';
    if (n.includes('vòng cổ') || n.includes('chuông')) return '/assets/images/shop/products/PK-VONG-10.png';
    return '/assets/images/shop/products/TP-HAT-05.png';
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
            products:(receipt.lines||[]).map(line=>({name:line.name,quantity:Number(line.quantity),price:Number(line.unitPrice),image:resolveProductThumbnail(line.name,line.image||line.image_url)}))
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
                if(expected!==generation)return;
                const challenge=await guestCommerce.request('phone-lookup',{phone});
                if(expected!==generation)return;
                if(!challenge?.requiresOtp||!challenge?.challengeId)throw Error('Chưa khởi tạo được xác thực. Vui lòng thử lại.');
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
