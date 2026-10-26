(function(){
    'use strict';
    const m=window.PawpalServices,el=id=>document.getElementById(id),esc=m.escapeHtml;
    let context=null,booking=null,session=0,busy=false;
    let refundPreview;
    function previewRefund(){
        let row=el('cashierLoyaltyPreview');
        if(!row){row=document.createElement('p');row.id='cashierLoyaltyPreview';row.style.cssText='color:#4F7A65;margin:8px 0;';row.setAttribute('aria-live','polite');el('cashierConfirmationText').parentElement.before(row);}
        const refund=el('cashierAction').value==='refund';
        row.hidden=!refund;
        const payment=context?.payments.find(p=>p.id===el('cashierPayment').value);
        const plan=refund&&payment?refundPreview?.(payment,el('cashierAmount').value):null;
        row.textContent=refund?(plan?.error||(plan?'Thu hồi '+plan.points+' điểm thưởng. Chi tiêu xét hạng giảm '+m.formatCurrency(plan.eligible)+'. Điểm còn lại '+plan.balance+'.':'Chọn khoản thu gốc để đối soát điểm.')):'';
        row.style.color=plan?.error?'#DC2626':'#4F7A65';
        el('btnSaveServiceMoney').disabled=busy||!context||(refund&&(!plan||!!plan.error));
        return plan;
    }

    const refundable=p=>Number(p.amount)-(p.refunds||[]).filter(r=>r.refund_status==='succeeded').reduce((sum,r)=>sum+Number(r.refunded_amount),0);
    function syncFields(){
        const refund=el('cashierAction').value==='refund';
        el('cashierPaymentField').style.display=refund?'block':'none';
        const method=context?.methods.find(v=>v.id===el('cashierMethod').value);
        el('cashierReferenceField').style.display=method?.requires_reference?'block':'none';
        el('cashierReference').required=!!method?.requires_reference;
        el('cashierConfirmationText').textContent=refund?'Đã hoàn trả đúng số tiền cho khách và đồng ý thu hồi điểm theo đối soát ở trên':'Đã nhận từ khách đúng số tiền ghi ở trên';
        el('cashierConfirmed').checked=false;
        const payment=context?.payments.find(p=>p.id===el('cashierPayment').value);
        const maximum=refund?(payment?refundable(payment):0):Number(context?.remaining||0);
        el('cashierAmount').value=maximum>0?String(maximum):'';el('cashierAmount').max=String(maximum);
        m.enhanceEntitySelects();
        previewRefund();
    }
    async function load(current){
        ({refundLoyaltyPreview:refundPreview}=await import('/scripts/shared/refund-loyalty.mjs'));
        const {data,error}=await window.getSupabaseClient().rpc('get_admin_service_cashier',{p_appointment_id:booking.dbId});
        if(error)throw error;if(current!==session)return;
        context=data;
        el('cashierTotal').textContent=m.formatCurrency(data.total);el('cashierCollected').textContent=m.formatCurrency(data.collected);el('cashierRemaining').textContent=m.formatCurrency(data.remaining);
        el('cashierMethod').replaceChildren(new Option('Chọn phương thức',''),...data.methods.map(v=>new Option(v.name,v.id)));
        el('cashierMethod').value=data.methods.find(v=>v.name==='Tiền mặt')?.id||'';
        el('cashierPayment').replaceChildren(new Option('Chọn khoản thu gốc',''),...data.payments.filter(p=>p.transaction_status==='succeeded'&&refundable(p)>0).map(p=>new Option(p.payment_code+' · Còn được hoàn '+m.formatCurrency(refundable(p)),p.id)));
        const statuses={succeeded:'Thành công',pending:'Chờ xử lý',failed:'Thất bại',cancelled:'Đã hủy'};
        const at=value=>value?new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Bangkok',dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'Chưa ghi nhận';
        el('cashierHistory').innerHTML=data.payments.length?data.payments.map(p=>'<div style="padding:6px 0;overflow-wrap:anywhere;"><strong>'+esc(p.payment_code)+'</strong> · '+esc(m.formatCurrency(p.amount))+' · '+esc(statuses[p.transaction_status]||'Cần đối soát')+'<div style="color:#4F7A65;font-size:12px;">'+esc(p.method_name||'Chưa ghi nhận')+' · '+esc(at(p.succeeded_at))+(p.gateway_transaction_id?' · '+esc(p.gateway_transaction_id.replace(/^manual-bank:/,'')):'')+'</div>'+(p.refunds||[]).map(r=>'<div style="color:#4F7A65;font-size:12px;">Hoàn '+esc(m.formatCurrency(r.refunded_amount))+' · '+esc(statuses[r.refund_status]||'Cần đối soát')+' · '+esc(r.refund_method)+' · '+esc(at(r.completed_at))+' · '+esc(r.note||'')+'</div>').join('')+'</div>').join(''):'Chưa có giao dịch thu tiền.';
        syncFields();
    }
    m.openCashier=async selected=>{
        if(busy){m.showToast('Đang ghi giao dịch, vui lòng chờ.','warning');return;}
        booking=selected;const current=++session;context=null;el('formServiceCashier').reset();
        el('cashierMeta').textContent=selected.id+' · '+(selected.customerName||selected.customer||'Chưa có tên khách')+' · '+selected.petName;
        el('cashierError').textContent='';el('cashierHistory').textContent='Đang tải giao dịch…';
        for(const id of ['cashierTotal','cashierCollected','cashierRemaining'])el(id).textContent='—';
        el('btnSaveServiceMoney').disabled=true;
        el('modalServiceCashier').style.removeProperty('display');el('modalServiceCashier').classList.add('active');
        try{await load(current);}catch(error){if(current===session)el('cashierError').textContent=m.errorMessage(error);}
        finally{if(current===session)previewRefund();}
    };
    el('formServiceCashier').addEventListener('submit',event=>event.preventDefault());
    for(const id of ['cashierAction','cashierMethod','cashierPayment'])el(id).addEventListener('change',()=>{el('cashierError').textContent='';syncFields();});
    el('cashierAmount').addEventListener('input',()=>{el('cashierConfirmed').checked=false;previewRefund();});
    el('btnSaveServiceMoney').onclick=async()=>{
        if(busy||!context)return;el('cashierError').textContent='';
        const amount=Number(el('cashierAmount').value),reason=el('cashierReason').value.trim(),method=context.methods.find(v=>v.id===el('cashierMethod').value),action=el('cashierAction').value;
        if(!Number.isSafeInteger(amount)||amount<=0||reason.length<2||!method||!el('cashierConfirmed').checked){el('cashierError').textContent='Điền số tiền nguyên dương, phương thức, lý do và xác nhận giao dịch thực tế.';return;}
        const reference=el('cashierReference').value.trim();if(method.requires_reference&&!reference){el('cashierError').textContent='Nhập mã giao dịch ngân hàng đã đối soát.';el('cashierReference').focus();return;}
        const details={amount,reason,method_id:method.id,reference:method.requires_reference?reference:'',confirmed:true};
        if(action==='refund'){details.payment_id=el('cashierPayment').value;if(!details.payment_id){el('cashierError').textContent='Chọn khoản thu gốc cần hoàn.';return;}}
        if(action==='refund'){const plan=previewRefund();if(!plan||plan.error){el('cashierError').textContent=plan?.error||'Chọn khoản thu để đối soát.';return;}details.loyalty_confirmed=true;}
        busy=true;el('btnSaveServiceMoney').disabled=true;const current=session;
        try{
            await m.saveServiceMoney(booking,context,action,details);
            m.showToast(action==='refund'?'Đã ghi nhận hoàn tiền thực tế.':'Đã ghi nhận tiền thực nhận.','success');
            booking=m.state.bookingsData.find(b=>b.dbId===booking.dbId)||booking;
            await load(current);el('cashierReason').value='';el('cashierReference').value='';
        }catch(error){el('cashierError').textContent=m.errorMessage(error);}
        finally{busy=false;previewRefund();}
    };
})();
