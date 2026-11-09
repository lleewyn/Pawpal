import { mediaSource, loadMediaSource } from './media-source.mjs';

// Attached evidence is read-only. Only unsaved drafts can be removed.
export function createIntakeMediaEditor({ root, db, fetchImpl = fetch, purpose='intake_image',labelText='Ảnh tiếp nhận',maxFiles=10,reviewKind=null }) {
    if(!['intake_image','handover_image','adjustment_image','pet_avatar','ticket_image','return_image','review_image'].includes(purpose))throw Error('invalid_record_media_purpose');
    const listRpc=purpose==='adjustment_image'?'list_adjustment_media':purpose==='handover_image'?'list_handover_media':'list_intake_media';
    root.style.cssText='display:flex;flex-direction:column;align-items:flex-start;gap:6px';
    let appointmentId,recordId, attached = [], drafts = [], releases = [], epoch = 0, busy = false, closed = false;
    const node = (tag, text, cls) => { const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n; };
    const label=node('label',labelText,'form-label-clean'),pick=node('button','Chọn ảnh','admin-btn admin-btn-secondary'),input=node('input');
    pick.type='button';input.type='file';input.hidden=true;input.multiple=true;input.accept='image/jpeg,image/png,image/webp';input.setAttribute('aria-label','Chọn '+labelText.toLowerCase());
    const hint=node('p','Tối đa '+maxFiles+' ảnh, mỗi ảnh 3 MiB · JPEG, PNG, WebP'),gallery=node('div'),message=node('p');
    hint.style.cssText='color:#4F7A65;font-size:12px;margin:4px 0';gallery.style.cssText='display:flex;gap:8px;flex-wrap:wrap';message.style.cssText='color:#DC2626;margin:4px 0';message.setAttribute('role','status');
    root.append(label,pick,input,hint,gallery,message);pick.onclick=()=>input.click();
    const release=()=>{releases.forEach(fn=>fn());releases=[];};
    async function token(){const {data,error}=await db.auth.getSession();if(error||!data.session?.access_token)throw Error('Vui lòng đăng nhập lại.');return data.session.access_token;}
    async function api(action,body,query=''){
        const multipart=body instanceof FormData;
        const response=await fetchImpl('/api/media?action='+action+query,{method:'POST',headers:{Authorization:'Bearer '+await token(),...(!multipart?{'Content-Type':'application/json'}:{})},body:multipart?body:JSON.stringify(body)});
        const result=await response.json();
        if(!response.ok||!result.ok){const error=Error(result.code==='MEDIA_INVALID_IMAGE'?'Ảnh bị lỗi hoặc nội dung không khớp định dạng. Vui lòng chọn lại ảnh.':response.status===503?'Chức năng tải ảnh chưa được bật. Nội dung và ảnh đã chọn vẫn được giữ.':'Không lưu được ảnh. Kiểm tra quyền, dung lượng và thử lại.');error.mediaMessage=true;error.status=response.status;throw error;}
        return result;
    }
    async function cancel(items){await Promise.allSettled(items.filter(x=>x.session_id).map(x=>api('cancel',{session_id:x.session_id})));}
    async function render(){
        const current=++epoch;release();gallery.replaceChildren();pick.disabled=busy;
        for(const item of [...attached,...drafts]){
            const figure=node('div');figure.style.cssText='width:90px;display:flex;flex-direction:column;gap:4px';
            const image=node('img');image.alt=labelText;image.style.cssText='width:80px;height:80px;object-fit:cover;border-radius:9px';figure.append(image);gallery.append(figure);
            if(item.file){const remove=node('button','Xóa','admin-btn');remove.type='button';remove.disabled=busy;remove.onclick=()=>{if(busy)return;drafts=drafts.filter(x=>x!==item);void cancel([item]);void render();};figure.append(remove);}
            try{
                let loaded;
                if(item.file){const url=URL.createObjectURL(item.file);loaded={url,release:()=>URL.revokeObjectURL(url)};}
                else loaded=await loadMediaSource(mediaSource({media_asset_id:item.media_asset_id,url:item.media_url}),item.media_asset_id?await token():null,{fetchImpl});
                if(current!==epoch){loaded.release();return;}releases.push(loaded.release);image.src=loaded.url;
            }catch{image.alt='Không tải được ảnh';}
        }
    }
    input.onchange=()=>{
        if(busy||closed){input.value='';return;}
        const files=[...input.files];input.value='';
        if(attached.length+drafts.length+files.length>maxFiles||files.some(x=>!['image/jpeg','image/png','image/webp'].includes(x.type)||x.size<1||x.size>3145728)){message.textContent='Chọn tối đa '+maxFiles+' ảnh JPEG, PNG hoặc WebP, mỗi ảnh không quá 3 MiB.';return;}
        drafts.push(...files.map(file=>({file,request_id:crypto.randomUUID()})));message.textContent='';void render();
    };
    return {
        async reset({ appointment, record,loadExisting=true }){
            if(busy)throw Error('Đang tải ảnh.');
            void cancel(drafts);drafts=[];attached=[];appointmentId=appointment;recordId=record;closed=false;busy=true;pick.disabled=true;
            release();gallery.replaceChildren();message.textContent='';
            const current=++epoch;
            try{if(appointment&&loadExisting){const result=await db.rpc(listRpc,{p_appointment:appointment});if(result.error||!Array.isArray(result.data))throw Error('Không tải đủ '+labelText.toLowerCase()+'.');if(current!==epoch||closed)return;attached=result.data;}message.textContent='';return attached.length;}
            finally{busy=false;if(!closed)void render();}
        },
        async prepare(){
            if(busy||closed)throw Error('Ảnh chưa sẵn sàng.');busy=true;pick.disabled=true;
            try{
                for(const item of drafts){
                    if(item.asset_id)continue;
                    message.textContent='Đang tải ảnh…';
                    if(!item.session_id){const session=await api('prepare',{request_id:item.request_id,purpose,...(['ticket_image','return_image','review_image'].includes(purpose)?{target_id:recordId,context_id:appointmentId,...(purpose==='review_image'?{review_kind:reviewKind}:{})}:purpose==='pet_avatar'?{pet_id:recordId}:{appointment_id:appointmentId,[purpose==='adjustment_image'?'adjustment_id':'record_id']:recordId}),size_bytes:item.file.size,mime_type:item.file.type,name:item.file.name});item.session_id=session.session_id;}
                    const form=new FormData();form.append('file',item.file);
                    try{const uploaded=await api('upload',form,'&session='+encodeURIComponent(item.session_id));item.asset_id=uploaded.asset_id;}
                    catch(error){if([400,409,413].includes(error.status)){void cancel([item]);delete item.session_id;item.request_id=crypto.randomUUID();}throw error;}
                    if(closed)throw Error('Đã hủy thay đổi ảnh.');
                }
                message.textContent='';return drafts.map(x=>x.asset_id);
            }catch(error){message.textContent=error.message;throw error;}
            finally{busy=false;if(closed){void cancel(drafts);drafts=[];}else void render();}
        },
        async committed(appointment,ids){if(!ids.length)return true;const {data,error}=await db.rpc(listRpc,{p_appointment:appointment});return !error&&Array.isArray(data)&&ids.every(id=>data.some(x=>x.media_asset_id===id));},
        hasDraft(){return busy||drafts.length>0;},
        saved(){drafts=[];},
        close(){closed=true;epoch++;release();if(!busy){void cancel(drafts);drafts=[];}}
    };
}
