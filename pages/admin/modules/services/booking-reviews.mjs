const mounted=new WeakMap();
function element(tag,text,className=''){const el=document.createElement(tag);if(text!=null)el.textContent=text;el.className=className;if(tag==='h3')el.style.cssText='font-size:18px;margin:0 0 16px;color:#236B48';return el;}
export function mountBookingReviews(root,booking,{db}={}){
 const previous=mounted.get(root);if(previous?.id===booking.dbId)return;previous?.dispose();
 let disposed=false,epoch=0,page=1;
 const valid=()=>!disposed&&root.isConnected;
 async function load(){
  const version=++epoch;root.replaceChildren(element('h3','Đánh giá dịch vụ','admin-card-title'),element('p','Đang tải đánh giá…'));
  try{
   const {data,error}=await db.rpc('admin_service_review_page',{p_filters:{appointmentId:booking.dbId},p_page:page,p_size:10});if(error)throw error;if(!valid()||version!==epoch)return;
   root.replaceChildren(element('h3','Đánh giá dịch vụ','admin-card-title'));
   if(!data.rows?.length){root.append(element('p','Chưa có đánh giá cho lịch hẹn này.'));return;}
   for(const row of data.rows){
    const article=element('article');article.style.cssText='display:grid;gap:10px;margin:16px 0;background:transparent;border:none';
    article.append(element('strong',row.serviceName),element('p',`${row.customerName} · ${row.rating}/5 sao · ${new Date(row.createdAt).toLocaleString('vi-VN')}`),element('p',row.comment));
    article.append(element('p',['published','approved','da_duyet'].includes(row.publicationStatus)?'Đang công khai':'Chưa công khai'));
    if(row.replyText)article.append(element('p','Phản hồi cửa hàng: '+row.replyText));
    const input=element('textarea',null,'admin-input');input.rows=3;input.maxLength=5000;input.value=row.replyText||'';input.id='booking-review-reply-'+row.dbId;input.style.width='100%';
    const label=element('label','Nội dung phản hồi');label.htmlFor=input.id;
    const feedback=element('p');feedback.setAttribute('role','status');
    const save=element('button','Lưu phản hồi','admin-btn admin-btn-primary');save.type='button';save.style.justifySelf='start';
    save.onclick=async()=>{
     const text=input.value.trim();if(!text){feedback.textContent='Vui lòng nhập nội dung phản hồi.';feedback.style.color='#DC2626';input.focus();return;}
     save.disabled=true;input.disabled=true;save.textContent='Đang lưu…';
     try{const result=await db.rpc('reply_admin_service_review',{p_review_id:row.dbId,p_response_id:row.responseId,p_expected_updated_at:row.responseUpdatedAt,p_text:text});if(result.error)throw result.error;if(!result.data)throw Error('missing_confirmation');await load();}
     catch{feedback.textContent='Chưa lưu được phản hồi. Vui lòng tải lại đánh giá và thử lại.';feedback.style.color='#DC2626';}
     finally{save.disabled=false;input.disabled=false;save.textContent='Lưu phản hồi';}
    };
    article.append(label,input,feedback,save);root.append(article);
   }
   if(data.total>10){const pager=element('nav');pager.style.cssText='display:flex;justify-content:center;gap:12px';for(const [text,delta,disabled]of [['<',-1,page<=1],['>',1,page*10>=data.total]]){const b=element('button',text,'admin-btn');b.type='button';b.disabled=disabled;b.onclick=()=>{page+=delta;void load();};pager.append(b);}root.append(pager);}
  }catch{if(valid()&&version===epoch){root.replaceChildren(element('h3','Đánh giá dịch vụ','admin-card-title'),element('p','Không thể tải đánh giá.'));const retry=element('button','Thử lại','admin-btn');retry.type='button';retry.onclick=load;root.append(retry);}}
 }
 const refresh=()=>{if(valid()&&!(root.contains(document.activeElement)&&document.activeElement.tagName==='TEXTAREA'))void load();};
 document.addEventListener('service-reviews-updated',refresh);
 const dispose=()=>{disposed=true;epoch++;document.removeEventListener('service-reviews-updated',refresh);window.removeEventListener('hashchange',leave);mounted.delete(root);};
 const leave=()=>{if(location.hash!=='#tab-service-detail')dispose();};window.addEventListener('hashchange',leave);
 mounted.set(root,{id:booking.dbId,dispose});void load();
}
