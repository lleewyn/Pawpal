(function(global){
 'use strict';
 const reviewedOrders=new Set();
 const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const db=()=>global.getSupabaseClient?.()||global.SupabaseClient;
 async function init(orderId,products,force=false){
  let section=document.getElementById('order-review-container');
  if(section?.dataset.orderId===orderId&&!force&&section.querySelector('#sales-review-submit'))return;
  if(!section){section=document.createElement('section');section.id='order-review-container';section.className='order-detail-card mb-4';document.getElementById('products-list')?.closest('.order-detail-card')?.after(section);}
  section.dataset.orderId=orderId;
  section.innerHTML='<h3 class="card-section-title">Đánh giá sản phẩm</h3><p role="status">Đang tải đánh giá…</p>';
  try{
   const response=await db().from('review').select('id,sales_order_detail_id,rating,review_content,review_status').in('sales_order_detail_id',products.map(p=>p.lineId));
   if(response.error)throw response.error;
   if(!section.isConnected||section.dataset.orderId!==orderId)return;
   const byLine=new Map((response.data||[]).map(r=>[r.sales_order_detail_id,r]));
   const pending=products.filter(p=>!byLine.has(p.lineId));
   if(!pending.length)reviewedOrders.add(orderId);
   const ids=new Map(pending.map(p=>[p.lineId,crypto.randomUUID()]));
   section.innerHTML=`<h3 class="card-section-title">Đánh giá sản phẩm</h3>
    <form id="sales-review-form" onsubmit="return false;">${products.map((p,index)=>{
     const prior=byLine.get(p.lineId);
     return `<fieldset style="border:none;padding:0;margin:16px 0"><legend style="font-size:16px;color:#236B48">${escapeHtml(p.name)} — ${escapeHtml(p.sku||'')}</legend>${prior?
      `<p>${prior.rating}/5 — ${escapeHtml(({pending:'Chờ duyệt',published:'Đã công bố',approved:'Đã duyệt',hidden:'Đã ẩn',rejected:'Không được duyệt'})[prior.review_status]||'Đã tiếp nhận')}</p><p>${escapeHtml(prior.review_content)}</p>`:
      `<label for="review-rating-${index}">Mức đánh giá <span style="color:#DC2626">*</span></label><select class="form-select" id="review-rating-${index}" data-review-rating="${p.lineId}" required><option value="">Chọn mức đánh giá</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n}/5</option>`).join('')}</select>
      <label for="review-content-${index}" style="margin-top:12px">Nhận xét <span style="color:#DC2626">*</span></label><textarea class="form-control" id="review-content-${index}" data-review-content="${p.lineId}" maxlength="3000" required></textarea>`}</fieldset>`;
    }).join('')}<p id="sales-review-error" role="alert" style="color:#DC2626"></p>${pending.length?'<p>Đánh giá sẽ được kiểm duyệt trước khi công bố.</p><button type="button" class="btn-cta" id="sales-review-submit">Gửi đánh giá</button>':''}</form>`;
   section.querySelector('form').addEventListener('submit',e=>e.preventDefault());
   section.querySelector('form').addEventListener('input',()=>{section.querySelector('#sales-review-error').textContent='';});
   const button=section.querySelector('#sales-review-submit');
   if(button)button.onclick=async()=>{
    if(button.disabled)return;
    const errorElement=section.querySelector('#sales-review-error');
    try{
     const reviews=pending.map(p=>{
      const rating=Number(section.querySelector(`[data-review-rating="${p.lineId}"]`).value);
      const content=section.querySelector(`[data-review-content="${p.lineId}"]`).value.trim();
      if(!Number.isInteger(rating)||rating<1||rating>5||!content)throw Error('Vui lòng chọn mức đánh giá và nhập nhận xét cho từng sản phẩm.');
      return {id:ids.get(p.lineId),line_id:p.lineId,rating,content};
     });
     errorElement.textContent='';button.disabled=true;button.textContent='Đang gửi…';
     const result=await db().rpc('submit_own_sales_reviews',{p_order:orderId,p_reviews:reviews});
     if(result.error)throw result.error;
     await init(orderId,products,true);
     global.dispatchEvent(new CustomEvent('pawpal:reviewSubmitted',{detail:{orderId}}));
    }catch(error){errorElement.textContent=error.code==='PT409'?'Đánh giá đã được gửi hoặc thông tin đã thay đổi. Vui lòng tải lại trang.':error.message||'Không thể gửi đánh giá. Vui lòng thử lại.';button.disabled=false;button.textContent='Gửi đánh giá';}
   };
  }catch(error){section.innerHTML='<h3 class="card-section-title">Đánh giá sản phẩm</h3><p role="alert">Không thể tải đánh giá. Vui lòng tải lại trang.</p>';}
 }
 global.ReviewHandler={init,hasOrderReviewed:id=>reviewedOrders.has(id)};
})(window);
