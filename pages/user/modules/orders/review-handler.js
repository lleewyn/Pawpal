(function(global){
 'use strict';
 const reviewedOrders=new Set();
 const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const db=()=>global.getSupabaseClient?.()||global.SupabaseClient;
 let generation=0,editors=new Map(),galleries=[];
 function hasDraft(){const form=document.getElementById('sales-review-form');return [...editors.values()].some(editor=>editor.hasDraft())||Boolean(form?.querySelector('#sales-review-submit:disabled'))||[...form?.querySelectorAll('select,textarea')||[]].some(el=>el.value.trim());}
 function dispose(){generation++;editors.forEach(e=>e.close());editors.clear();galleries.forEach(g=>g.clear());galleries=[];}
 async function init(orderId,products,force=false){
  let section=document.getElementById('order-review-container');
  if(section?.dataset.orderId===orderId&&!force&&section.querySelector('#sales-review-submit')&&hasDraft())return;
  dispose();const version=generation;
  if(!section){section=document.createElement('section');section.id='order-review-container';section.className='order-detail-card mb-4';document.getElementById('products-list')?.closest('.order-detail-card')?.after(section);}
  section.dataset.orderId=orderId;
  section.innerHTML='<h3 class="card-section-title">Đánh giá sản phẩm</h3><p role="status">Đang tải đánh giá…</p>';
  try{
   const response=await db().from('review').select('id,sales_order_detail_id,rating,review_content,review_status').in('sales_order_detail_id',products.map(p=>p.lineId));
   if(response.error)throw response.error;
   if(version!==generation||!section.isConnected||section.dataset.orderId!==orderId)return;
   const byLine=new Map((response.data||[]).map(r=>[r.sales_order_detail_id,r]));
   const pending=products.filter(p=>!byLine.has(p.lineId));
   if(!pending.length)reviewedOrders.add(orderId);
   const ids=new Map(pending.map(p=>[p.lineId,crypto.randomUUID()]));
   section.innerHTML=`<h3 class="card-section-title">Đánh giá sản phẩm</h3>
    <form id="sales-review-form" onsubmit="return false;">${products.map((p,index)=>{
     const prior=byLine.get(p.lineId);
     return `<fieldset style="border:none;padding:0;margin:16px 0"><legend style="font-size:16px;color:#236B48">${escapeHtml(p.name)} — ${escapeHtml(p.sku||'')}</legend>${prior?
      `<p>${prior.rating}/5 — ${escapeHtml(({pending:'Chờ duyệt',published:'Đã công bố',approved:'Đã duyệt',hidden:'Đã ẩn',rejected:'Không được duyệt'})[prior.review_status]||'Đã tiếp nhận')}</p><p>${escapeHtml(prior.review_content)}</p><div data-review-gallery="${prior.id}"></div>`:
      `<label for="review-rating-${index}">Mức đánh giá <span style="color:#DC2626">*</span></label><select class="form-select" id="review-rating-${index}" data-review-rating="${p.lineId}" required><option value="">Chọn mức đánh giá</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n}/5</option>`).join('')}</select>
      <label for="review-content-${index}" style="margin-top:12px">Nhận xét <span style="color:#DC2626">*</span></label><textarea class="form-control" id="review-content-${index}" data-review-content="${p.lineId}" maxlength="3000" required></textarea><div data-review-media="${p.lineId}"></div>`}</fieldset>`;
    }).join('')}<p id="sales-review-error" role="alert" style="color:#DC2626"></p>${pending.length?'<p>Đánh giá sẽ được kiểm duyệt trước khi công bố.</p><button type="button" class="btn-cta" id="sales-review-submit">Gửi đánh giá</button>':''}</form>`;
   section.querySelector('form').addEventListener('submit',e=>e.preventDefault());
   const [{createReviewMediaEditor},{createEvidenceGallery}]=await Promise.all([import('/scripts/shared/review-media.mjs'),import('/scripts/shared/evidence-gallery.mjs')]);
   if(version!==generation||!section.isConnected)return;
   for(const product of pending){
    const root=section.querySelector(`[data-review-media="${product.lineId}"]`),editor=createReviewMediaEditor({root,db:db(),kind:'sales'});editors.set(product.lineId,editor);await editor.reset({review:ids.get(product.lineId),line:product.lineId});
    if(version!==generation||!section.isConnected)return;
   }
   if(response.data?.length){
    const media=await db().from('review_media').select('review_id,image_url,media_asset_id').in('review_id',response.data.map(r=>r.id));if(media.error)throw media.error;
    if(version!==generation||!section.isConnected)return;
    await Promise.all([...section.querySelectorAll('[data-review-gallery]')].map(root=>{const gallery=createEvidenceGallery({root,db:db()});galleries.push(gallery);return gallery.render((media.data||[]).filter(r=>r.review_id===root.dataset.reviewGallery).map(r=>({...r,media_url:r.image_url})));}));
   }
   section.querySelector('form').addEventListener('input',()=>{section.querySelector('#sales-review-error').textContent='';});
   const button=section.querySelector('#sales-review-submit');
   if(button)button.onclick=async()=>{
    if(button.disabled||version!==generation)return;
    const errorElement=section.querySelector('#sales-review-error');
    let locked=[];
    try{
     const reviews=pending.map(p=>{
      const rating=Number(section.querySelector(`[data-review-rating="${p.lineId}"]`).value);
      const content=section.querySelector(`[data-review-content="${p.lineId}"]`).value.trim();
      if(!Number.isInteger(rating)||rating<1||rating>5||!content)throw Error('Vui lòng chọn mức đánh giá và nhập nhận xét cho từng sản phẩm.');
      return {id:ids.get(p.lineId),line_id:p.lineId,rating,content};
     });
     errorElement.textContent='';button.disabled=true;button.textContent='Đang gửi…';
     locked=[...section.querySelectorAll('input,select,textarea')].map(el=>[el,el.disabled]);locked.forEach(([el])=>el.disabled=true);section.querySelectorAll('[data-review-media]').forEach(root=>root.inert=true);
     for(const review of reviews)review.media_asset_ids=await editors.get(review.line_id).prepare();
     if(version!==generation||!section.isConnected)return;
     const result=await db().rpc('submit_own_sales_reviews',{p_order:orderId,p_reviews:reviews});
     if(result.error)throw result.error;
     if(!Array.isArray(result.data)||reviews.some(r=>!result.data.includes(r.id)))throw Error('Chưa xác nhận được kết quả lưu. Vui lòng thử lại.');
     if(version!==generation||!section.isConnected)return;editors.forEach(editor=>editor.saved());
     await init(orderId,products,true);
     global.dispatchEvent(new CustomEvent('pawpal:reviewSubmitted',{detail:{orderId}}));
    }catch(error){errorElement.textContent=error.code==='PT409'?'Đánh giá đã được gửi hoặc thông tin đã thay đổi. Vui lòng tải lại trang.':error.message||'Không thể gửi đánh giá. Vui lòng thử lại.';button.disabled=false;button.textContent='Gửi đánh giá';}
    finally{locked.forEach(([el,disabled])=>el.disabled=disabled);if(version===generation)section.querySelectorAll('[data-review-media]').forEach(root=>root.inert=false);}
   };
  }catch(error){section.innerHTML='<h3 class="card-section-title">Đánh giá sản phẩm</h3><p role="alert">Không thể tải đánh giá. Vui lòng tải lại trang.</p>';}
 }
 global.ReviewHandler={init,dispose,hasDraft,hasOrderReviewed:id=>reviewedOrders.has(id)};
})(window);
