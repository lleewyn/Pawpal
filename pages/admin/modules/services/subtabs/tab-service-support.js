(function(){
    'use strict';
    const m=window.PawpalServices,el=id=>document.getElementById(id);let current=null,review=null,busy=false,sequence=0;
    async function history(seq){
        const {data,error}=await window.getSupabaseClient().from('support_ticket').select('ticket_code,description,status').eq('appointment_id',current.dbId).order('created_at',{ascending:false}).limit(20);
        if(error)throw error;if(seq!==sequence)return;
        el('serviceTicketHistory').innerHTML=data.length?'<strong>Phiếu gần đây</strong>'+data.map(t=>'<p style="margin:6px 0;overflow-wrap:anywhere;">'+m.escapeHtml(t.ticket_code)+' · '+m.escapeHtml(t.description||'Chưa có nội dung')+'</p>').join(''):'Chưa có phiếu phản ánh cho ca này.';
    }
    m.openServiceTicket=async(booking,sourceReview)=>{
        if(!booking?.dbId){m.showToast('Không tìm thấy ca dịch vụ của đánh giá.','warning');return;}
        if(busy)return;current=booking;review=sourceReview||null;const seq=++sequence;
        el('serviceTicketMeta').textContent=booking.id+' · '+(booking.customerName||booking.customer||'Chưa có tên khách')+' · '+booking.petName;
        el('serviceTicketDescription').value=review?.comment&&review.comment!=='—'?review.comment:'';el('serviceTicketError').textContent='';el('serviceTicketHistory').textContent='Đang tải phiếu…';el('btnSaveServiceTicket').disabled=false;
        el('modalServiceTicket').style.removeProperty('display');el('modalServiceTicket').classList.add('active');
        try{await history(seq);}catch(error){if(seq===sequence)el('serviceTicketError').textContent=m.errorMessage(error);}
    };
    el('formServiceTicket').addEventListener('submit',event=>event.preventDefault());
    el('btnSaveServiceTicket').onclick=async()=>{
        if(busy||!current)return;const description=el('serviceTicketDescription').value.trim();el('serviceTicketError').textContent='';
        if(description.length<2||description.length>4000){el('serviceTicketError').textContent='Nhập nội dung phản ánh từ 2 đến 4.000 ký tự.';el('serviceTicketDescription').focus();return;}
        busy=true;el('btnSaveServiceTicket').disabled=true;
        try{await m.saveServiceTicket(current,review?.dbId,description);await history(sequence);el('serviceTicketDescription').value='';m.subtabs.reviews?.renderReviewsTable?.();m.showToast('Đã lưu phiếu phản ánh gắn với ca dịch vụ.','success');}
        catch(error){el('serviceTicketError').textContent=m.errorMessage(error);}
        finally{busy=false;el('btnSaveServiceTicket').disabled=false;}
    };
})();
