const endpoint='/api/chat-media';
const validId=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
async function call(headers,action,body,query='',fetchImpl=fetch){
 const multipart=body instanceof FormData;
 const response=await fetchImpl(endpoint+'?action='+action+query,{method:'POST',headers:{...await headers(),...(!multipart?{'Content-Type':'application/json'}:{})},body:multipart?body:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok||!data.ok)throw Object.assign(Error(response.status===503?'Chức năng tải ảnh chưa sẵn sàng. Vui lòng thử lại sau.':'Không thể tải ảnh. Kiểm tra phiên chat, định dạng và dung lượng rồi thử lại.'),{status:response.status});
 return data;
}
export function createChatMediaDraft({root,headers,getContext,fetchImpl=fetch}){
 let items=[],busy=false,frozen=false,generation=0;
 root.style.cssText='display:flex;flex-direction:column;gap:6px;min-width:0';
 const pick=document.createElement('button');pick.type='button';pick.textContent='Chọn ảnh';
 pick.style.cssText='align-self:flex-start;border:1px solid #ECF2EE;background:#fff;color:#236B48;border-radius:9px;padding:6px 10px;cursor:pointer;font:inherit;font-size:13px';
 const files=document.createElement('input');files.type='file';files.accept='image/jpeg,image/png,image/webp';files.multiple=true;files.hidden=true;
 const gallery=document.createElement('div');gallery.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
 const status=document.createElement('span');status.style.cssText='font-size:12px;color:#4F7A65';status.setAttribute('role','status');root.append(pick,files,gallery,status);
 const release=item=>{if(item.url)URL.revokeObjectURL(item.url);};
 const cancel=item=>item.session&&!item.sent?call(headers,'cancel',{session_id:item.session},'',fetchImpl).catch(()=>{}):Promise.resolve();
 function render(){
  pick.disabled=busy||frozen;files.disabled=busy||frozen;gallery.replaceChildren();
  for(const item of items){
   const figure=document.createElement('div');figure.style.cssText='display:flex;flex-direction:column;gap:3px;width:70px';
   if(item.url){const image=document.createElement('img');image.src=item.url;image.alt='Ảnh chờ gửi';image.style.cssText='width:64px;height:64px;object-fit:cover;border-radius:9px';figure.append(image);}
   else{const label=document.createElement('span');label.textContent='Ảnh đã tải';label.style.fontSize='12px';figure.append(label);}
   const remove=document.createElement('button');remove.type='button';remove.textContent='Bỏ ảnh';remove.disabled=busy||frozen;remove.style.cssText='border:0;background:transparent;color:#236B48;font:inherit;font-size:12px;padding:2px;cursor:pointer';
   remove.onclick=()=>{if(busy||frozen)return;items=items.filter(x=>x!==item);release(item);void cancel(item);render();};figure.append(remove);gallery.append(figure);
  }
 }
 pick.onclick=()=>files.click();files.onchange=()=>{
  const chosen=[...files.files];files.value='';if(busy||frozen)return;
  if(items.length+chosen.length>3||chosen.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size<1||f.size>3145728)){status.textContent='Tối đa 3 ảnh JPEG, PNG hoặc WebP, mỗi ảnh không quá 3 MiB.';return;}
  items.push(...chosen.map(file=>({file,request:crypto.randomUUID(),url:URL.createObjectURL(file)})));status.textContent='';render();
 };
 render();
 return {
  count:()=>items.length,
  freeze(value){frozen=value;render();},
  restore(ids){if(items.length||busy)return;items=ids.filter(validId).slice(0,3).map(asset=>({asset,sent:true}));render();},
  async prepare(){
   if(busy)throw Error('Đang tải ảnh.');busy=true;render();const stamp=generation;
   try{const context=await getContext();if(stamp!==generation)throw Error('Phiên chat đã thay đổi.');
    for(const item of items){if(stamp!==generation)throw Error('Phiên chat đã thay đổi.');if(item.asset)continue;status.textContent='Đang tải ảnh…';
     if(!item.session){const prepared=await call(headers,'prepare',{request_id:item.request,conversation_id:context.conversation,message_id:context.message,size_bytes:item.file.size,mime_type:item.file.type,name:item.file.name},'',fetchImpl);item.session=prepared.session_id;}
     const body=new FormData();body.append('file',item.file);
     let data;try{data=await call(headers,'upload',body,'&session='+encodeURIComponent(item.session),fetchImpl);}catch(error){if([400,409,413].includes(error.status)){await cancel(item);item.session=null;item.request=crypto.randomUUID();}throw error;}item.asset=data.asset_id;
     if(stamp!==generation){await cancel(item);throw Error('Phiên chat đã thay đổi.');}
    }
    status.textContent='';return items.map(x=>x.asset);
   }catch(e){status.textContent=e.message;throw e;}finally{busy=false;render();}
  },
  sent(){items.forEach(x=>x.sent=true);},
  saved(){items.forEach(release);items=[];frozen=false;status.textContent='';render();},
  clear(){generation++;const old=items;items=[];frozen=false;old.forEach(release);void Promise.allSettled(old.map(cancel));status.textContent='';render();}
 };
}

// Guest token and bearer stay in request headers. Image links contain only short-lived local blob URLs.
export function createChatMediaGallery({headers,fetchImpl=fetch}){
 let generation=0,urls=[],controllers=[];
 const clear=()=>{generation++;controllers.forEach(c=>c.abort());controllers=[];urls.forEach(u=>URL.revokeObjectURL(u));urls=[];};
 return {clear,async render(slots){
  clear();const stamp=generation;let next=0;
  await Promise.all(Array.from({length:Math.min(3,slots.length)},async()=>{
   while(next<slots.length&&stamp===generation){const {root,asset}=slots[next++];if(!validId(asset))continue;
    const link=document.createElement('a');link.textContent='Đang tải ảnh…';root.append(link);const controller=new AbortController();controllers.push(controller);
    try{const response=await fetchImpl(endpoint+'?id='+encodeURIComponent(asset),{headers:await headers(),signal:controller.signal,cache:'no-store'});
     if(!response.ok||!['image/jpeg','image/png','image/webp'].includes(response.headers.get('content-type')?.split(';')[0]))throw Error('image_unavailable');
     const blob=await response.blob();if(blob.size>3145728)throw Error('image_too_large');if(stamp!==generation)return;
     const url=URL.createObjectURL(blob);urls.push(url);const image=document.createElement('img');image.src=url;image.alt='Ảnh trong cuộc trò chuyện';image.style.cssText='width:90px;height:90px;max-width:100%;object-fit:cover;border-radius:9px';
     link.replaceChildren(image);link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.style.cssText='display:inline-block;margin:4px';
    }catch{if(stamp===generation)link.textContent='Chưa tải được ảnh';}
   }
  }));
 }};
}
