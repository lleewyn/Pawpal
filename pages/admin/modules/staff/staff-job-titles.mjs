let dialog;
const node=(tag,text,cls)=>{const element=document.createElement(tag);if(text)element.textContent=text;if(cls)element.className=cls;return element;};
export async function openJobTitleRename({staffApi,client,onSaved,selectedTitle=''}) {
 if(!window.PawpalAdminAccess?.isAdmin())return;
 if(!dialog){
  const overlay=node('div',null,'admin-modal-overlay staff-workspace-modal');overlay.id='staffJobTitleRenameModal';overlay.style.zIndex='2800';overlay.setAttribute('aria-hidden','true');
  const card=node('div',null,'admin-modal-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','staffJobTitleRenameTitle');
  const form=node('form');form.setAttribute('onsubmit','return false;');const header=node('div',null,'workspace-modal-header'),title=node('h2','Đổi tên chức vụ'),close=node('button','Đóng','btn-modal-close');title.id='staffJobTitleRenameTitle';close.type='button';close.dataset.closeModal=overlay.id;header.append(title,close);
  const select=node('select',null,'admin-select'),name=node('input',null,'admin-input');select.id='renameJobTitleSelect';name.id='renameJobTitleName';name.type='text';name.maxLength=200;name.required=select.required=true;
  const groups=[['Chức vụ',select],['Tên mới',name]].map(([caption,input])=>{const group=node('div',null,'workspace-form-field'),label=node('label',caption+' ');label.htmlFor=input.id;label.append(node('span','*','workspace-required'));group.append(label,input);return group;});
  const message=node('p',null,'workspace-error');message.setAttribute('role','alert');const footer=node('div',null,'workspace-modal-footer'),cancel=node('button','Hủy','admin-btn admin-btn-secondary'),save=node('button','Lưu tên chức vụ','admin-btn admin-btn-primary');cancel.type=save.type='button';cancel.dataset.closeModal=overlay.id;footer.append(cancel,save);form.append(header,...groups,message,footer);card.append(form);overlay.append(card);document.body.append(overlay);
  const state={overlay,form,select,name,message,save,busy:false,rows:[],request:null,generation:0};
  const dismiss=()=>{if(state.busy)return;state.generation++;overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true');select._entityPopover.style.display='none';state.returnFocus?.focus();};
  overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-close-modal="'+overlay.id+'"]')){event.stopPropagation();dismiss();}});
  overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismiss();}else if(event.key==='Tab'){const elements=[...overlay.querySelectorAll('button,input,select')].filter(input=>!input.disabled&&input.offsetParent!==null),first=elements[0],last=elements.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  form.addEventListener('submit',event=>event.preventDefault());
  staffApi.enhanceEntitySelect(select);select._entityInput.placeholder='Tìm và chọn chức vụ';select._entityInput.setAttribute('aria-label','Chọn chức vụ cần đổi tên');
  select.onchange=()=>{name.value=state.rows.find(row=>row.code===select.value)?.title||'';message.textContent='';};
  save.onclick=async()=>{
   if(state.busy)return;message.textContent='';const row=state.rows.find(row=>row.code===select.value),title=name.value.trim().replace(/\s+/g,' ');
   if(!row){message.textContent='Chọn chức vụ cần đổi tên.';select._entityInput.focus();return;}
   if(title.length<2||title.length>200||!/[\p{L}]/u.test(title)){message.textContent='Nhập tên chức vụ từ 2 đến 200 ký tự, có chữ cái.';name.focus();return;}
   const signature=JSON.stringify([row.code,row.title,title]);if(state.request?.signature!==signature)state.request={signature,id:crypto.randomUUID()};
   state.busy=true;save.disabled=name.disabled=select._entityInput.disabled=true;save.textContent='Đang lưu';
   try{
    const {data,error}=await state.client.rpc('rename_admin_staff_job_title',{p_request_id:state.request.id,p_code:row.code,p_expected_title:row.title,p_title:title});if(error)throw error;if(data!==row.code)throw Error('unexpected_rename_result');
    await state.staffApi.loadJobTitleOptions({force:true});await state.onSaved?.();state.busy=false;dismiss();state.form.reset();state.request=null;
   }catch(error){message.textContent=({staff_job_title_changed:'Tên chức vụ đã thay đổi. Đóng và mở lại để cập nhật.',staff_job_title_exists:'Tên này đã thuộc một chức vụ khác.',staff_job_title_forbidden:'Bạn không có quyền đổi tên chức vụ.'})[error.message]||'Chưa xác nhận đổi tên thành công. Giữ nội dung và thử lại.';}
   finally{state.busy=false;save.disabled=name.disabled=select._entityInput.disabled=false;save.textContent='Lưu tên chức vụ';}
  };
  dialog=state;
 }
 if(dialog.busy)return;const rows=await staffApi.loadJobTitleOptions();Object.assign(dialog,{rows,staffApi,client,onSaved,request:null,returnFocus:document.activeElement});dialog.form.reset();dialog.message.textContent='';
 dialog.select.replaceChildren(new Option('Chọn chức vụ',''),...rows.map(row=>new Option(row.title,row.code)));
 const selected=rows.find(row=>row.title===staffApi.formatJobTitle(selectedTitle));dialog.select.value=selected?.code||'';dialog.select.dispatchEvent(new Event('change'));dialog.overlay.classList.add('active');dialog.overlay.setAttribute('aria-hidden','false');dialog.select._entityInput.focus();
}
