import {createIntakeMediaEditor} from './intake-media.mjs';
export async function openPetAvatarDialog({pet,db,onSaved}){
    if(document.getElementById('petAvatarModal'))return;
    const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
    const overlay=node('div',null,'admin-modal-overlay active');overlay.id='petAvatarModal';
    const card=node('div',null,'admin-modal-card');card.style.cssText='width:540px;max-width:92vw;padding:26px 30px;max-height:90vh;overflow:auto;overscroll-behavior:contain;border-radius:9px';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
    const header=node('div');header.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:16px';const title=node('h2','Ảnh hồ sơ thú cưng');title.id='petAvatarTitle';title.style.cssText='font-size:18px;color:#236B48;margin:0';card.setAttribute('aria-labelledby',title.id);
    const close=node('button','Đóng','btn-modal-close');close.type='button';close.dataset.closeModal=overlay.id;header.append(title,close);
    const form=node('form');form.setAttribute('onsubmit','return false;');form.style.cssText='display:flex;flex-direction:column;gap:16px;margin-top:16px';form.addEventListener('submit',event=>event.preventDefault());
    const current=node('img');current.alt='Ảnh hồ sơ hiện tại';current.src=pet.avatar||'';current.hidden=!pet.avatar;current.style.cssText='width:80px;height:80px;border-radius:50%;object-fit:cover';
    const modes=node('div');modes.style.cssText='display:flex;flex-direction:column;gap:8px';
    for(const [value,text]of [['keep','Giữ ảnh hiện tại'],['upload','Tải ảnh mới'],['remove','Bỏ ảnh hiện tại']]){const label=node('label'),radio=node('input');radio.type='radio';radio.name='petAvatarMode';radio.value=value;radio.checked=value==='keep';label.append(radio,document.createTextNode(' '+text));modes.append(label);}
    const root=node('div');root.hidden=true;const errorText=node('p');errorText.setAttribute('role','alert');errorText.style.cssText='color:#DC2626;margin:0';
    const footer=node('div');footer.style.cssText='display:flex;justify-content:flex-end;gap:12px';const cancel=node('button','Hủy','admin-btn admin-btn-secondary'),save=node('button','Lưu ảnh','admin-btn admin-btn-primary');cancel.type=save.type='button';cancel.dataset.closeModal=overlay.id;footer.append(cancel,save);form.append(current,modes,root,errorText,footer);card.append(header,form);overlay.append(card);document.body.append(overlay);
    const editor=createIntakeMediaEditor({root,db,purpose:'pet_avatar',labelText:'Ảnh mới',maxFiles:1});await editor.reset({record:pet.rawId,loadExisting:false});root.hidden=true;root.style.display='none';
    let closed=false,busy=false;const focus=document.activeElement;
    const mode=()=>modes.querySelector('input:checked').value;
    modes.addEventListener('change',()=>{root.hidden=mode()!=='upload';root.style.display=mode()==='upload'?'flex':'none';});
    function dismiss(){if(closed)return;closed=true;editor.close();overlay.remove();focus?.focus();}
    overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-close-modal="petAvatarModal"]'))dismiss();});
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismiss();}});
    save.onclick=async()=>{
        if(busy||closed)return;if(mode()==='keep'){dismiss();return;}busy=true;save.disabled=true;errorText.textContent='';modes.querySelectorAll('input').forEach(input=>input.disabled=true);
        try{
            const assets=mode()==='upload'?await editor.prepare():[];if(closed)return;
            if(mode()==='upload'&&assets.length!==1)throw Error('Chọn đúng một ảnh mới.');
            const {data,error}=await db.rpc('save_admin_pet_avatar',{p_pet:pet.rawId,p_expected:pet.updatedAt,p_asset:assets[0]||null});if(error)throw error;if(data!==pet.rawId)throw Error('Không xác minh được ảnh đã lưu.');
            if(mode()==='upload')editor.saved();dismiss();await onSaved?.();
        }catch(error){if(!closed)errorText.textContent=error.code==='PT409'?'Hồ sơ đã thay đổi. Đóng biểu mẫu và tải lại hồ sơ.':error.message||'Không lưu được ảnh. Vui lòng thử lại.';}
        finally{busy=false;save.disabled=false;modes.querySelectorAll('input').forEach(input=>input.disabled=false);}
    };
    close.focus();
}
