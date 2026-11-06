(function(){
    'use strict';
    const allowed=()=>['ADMIN','STAFF'].includes(window.PawpalAdminAccess?.state.role);
    const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;};let dialog;
    function build(){
        if(dialog)return dialog;
        const overlay=el('div',null,'admin-modal-overlay staff-workspace-modal');overlay.id='adminOwnPasswordModal';overlay.setAttribute('aria-hidden','true');
        const card=el('div',null,'admin-modal-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','adminOwnPasswordTitle');
        const form=el('form');form.noValidate=true;form.setAttribute('onsubmit','return false;');const header=el('div',null,'workspace-modal-header'),title=el('h2','Đổi mật khẩu cá nhân'),close=el('button','Đóng','btn-modal-close');title.id='adminOwnPasswordTitle';close.type='button';close.dataset.closeModal=overlay.id;header.append(title,close);
        const identity=el('p','','workspace-care-log-summary'),fields={};
        function field(key,label,autocomplete){const group=el('div',null,'workspace-form-field'),caption=el('label',label+' '),input=el('input',null,'admin-input');input.id='adminOwnPassword'+key;input.type='password';input.required=true;input.maxLength=128;input.autocomplete=autocomplete;caption.htmlFor=input.id;caption.append(el('span','*','workspace-required'));group.append(caption,input);fields[key]=input;return group;}
        const current=field('current','Mật khẩu hiện tại','current-password'),next=field('next','Mật khẩu mới','new-password'),repeat=field('repeat','Nhập lại mật khẩu mới','new-password');
        const hint=el('p','Mật khẩu mới từ 6 đến 128 ký tự. Sau khi đổi, đăng nhập lại bằng mật khẩu mới.','workspace-checkout-explanation'),message=el('p','','workspace-error');message.setAttribute('role','alert');const login=el('a','Đăng nhập lại','admin-btn admin-btn-secondary');login.href='/admin/login';login.hidden=true;
        const footer=el('div',null,'workspace-modal-footer'),cancel=el('button','Hủy','admin-btn admin-btn-secondary'),save=el('button','Lưu mật khẩu','admin-btn admin-btn-primary');save.id='adminOwnPasswordSave';cancel.type=save.type='button';cancel.dataset.closeModal=overlay.id;footer.append(cancel,save);form.append(header,identity,current,next,repeat,hint,message,login,footer);card.append(form);overlay.append(card);document.body.append(overlay);
        const state={saving:false,generation:0,returnFocus:null,uncertain:false};
        for(const input of Object.values(fields))input.addEventListener('input',()=>{if(!state.uncertain)message.textContent='';});
        function clear(){form.reset();for(const input of Object.values(fields))input.value='';}
        function closeDialog(){state.generation++;clear();overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true');if(state.returnFocus?.isConnected)state.returnFocus.focus();}
        overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-close-modal="'+overlay.id+'"]'))closeDialog();});overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}if(event.key!=='Tab')return;const nodes=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')].filter(node=>node.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});form.addEventListener('submit',event=>event.preventDefault());
        save.onclick=async()=>{
            if(state.saving||state.uncertain||!allowed())return;message.textContent='';const currentPassword=fields.current.value,newPassword=fields.next.value;
            if(!currentPassword){message.textContent='Nhập mật khẩu hiện tại.';fields.current.focus();return;}if(newPassword.length<6||newPassword.length>128){message.textContent='Mật khẩu mới cần từ 6 đến 128 ký tự.';fields.next.focus();return;}if(newPassword===currentPassword){message.textContent='Mật khẩu mới phải khác mật khẩu hiện tại.';fields.next.focus();return;}if(fields.repeat.value!==newPassword){message.textContent='Mật khẩu nhập lại chưa khớp.';fields.repeat.focus();return;}
            const generation=state.generation;state.saving=true;save.disabled=true;for(const input of Object.values(fields))input.disabled=true;
            try{const db=getSupabaseClient(),{data,error}=await db.auth.getSession();if(error||!data.session?.access_token)throw Object.assign(Error('session_invalid'),{known:true});
                const response=await fetch('/api/admin/staff/change-own-password',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({currentPassword,newPassword})});
                const result=await response.json();if(!response.ok||result.success!==true){const known=result.code&&result.code!=='outcome_unknown';throw Object.assign(Error(result.message||'Chưa xác nhận đổi mật khẩu thành công.'),{known,code:result.code});}
                clear();for(const storage of [localStorage,sessionStorage])storage.removeItem('pawpal_admin_user');try{await db.auth.signOut({scope:'local'});}catch{}localStorage.removeItem('pawpal_admin_supabase_auth');window.location.assign('/admin/login');
            }catch(error){clear();if(!error.known){state.uncertain=true;}if(generation===state.generation){message.textContent=error.message==='session_invalid'?'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.':error.known?error.message:'Chưa xác nhận đổi mật khẩu thành công. Đăng nhập lại để kiểm tra trước khi thử tiếp.';login.hidden=!state.uncertain&&error.code!=='staff_forbidden'&&error.message!=='session_invalid';}}
            finally{state.saving=false;if(generation===state.generation){save.disabled=state.uncertain;for(const input of Object.values(fields))input.disabled=state.uncertain;}}
        };
        dialog={open:()=>{if(state.saving||!allowed())return;state.generation++;state.returnFocus=document.activeElement;clear();identity.textContent=PawpalAdminAccess.state.user.name+' · '+PawpalAdminAccess.state.user.email;message.textContent=state.uncertain?'Lần đổi trước chưa rõ kết quả. Đăng nhập lại để kiểm tra.':'';login.hidden=!state.uncertain;save.disabled=state.uncertain;for(const input of Object.values(fields))input.disabled=state.uncertain;overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');close.focus();},close:closeDialog,clear:()=>{closeDialog();identity.textContent=message.textContent='';}};return dialog;
    }
    window.addEventListener('hashchange',()=>dialog?.close());
    window.PawpalOwnPassword=Object.freeze({open:()=>{if(allowed())build().open();},closeAll:()=>dialog?.clear()});
    const trigger=document.getElementById('btnOwnPassword');if(trigger)trigger.onclick=()=>window.PawpalOwnPassword.open();
})();
