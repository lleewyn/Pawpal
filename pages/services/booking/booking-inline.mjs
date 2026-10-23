import {loadCustomerProfileSnapshot,applyProfileSnapshot,saveCustomerProfile} from '/scripts/shared/customer-profile.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(id,label,value='',type='text',required=false)=>`<div class="form-group"><label for="${id}">${label}${required?' <span class="required">*</span>':''}</label><input id="${id}" type="${type}" value="${esc(value)}" ${required?'required':''}></div>`;
function editor(host,title){
 host.innerHTML=`<div class="booking-inline-editor"><h3>${title}</h3><form id="bookingInlineForm" class="booking-form" onsubmit="return false;"><div id="bookingInlineFields"></div><p id="bookingInlineError" class="field-error" role="alert"></p><div class="booking-inline-actions"><button type="button" class="btn-green-outline" id="bookingInlineCancel">Hủy</button><button type="button" class="btn-cta" id="bookingInlineSave">Lưu thay đổi</button></div></form></div>`;
 host.scrollIntoView({block:'nearest'});
 const get=id=>host.querySelector('#'+id);
 get('bookingInlineCancel').onclick=()=>host.replaceChildren();
 get('bookingInlineForm').addEventListener('submit',e=>e.preventDefault());
 return get;
}
function bindSave(get,save){
 get('bookingInlineSave').onclick=async()=>{
  if(!get('bookingInlineForm').reportValidity())return;
  const button=get('bookingInlineSave');button.disabled=true;get('bookingInlineCancel').disabled=true;get('bookingInlineError').textContent='';
  try{await save();}catch(error){if(get('bookingInlineError'))get('bookingInlineError').textContent=error.message||'Chưa lưu được thông tin. Vui lòng thử lại.';}
  finally{if(button.isConnected){button.disabled=false;get('bookingInlineCancel').disabled=false;}}
 };
}
function ownerModal(host,onClose,title='Cập nhật thông tin chủ nuôi',pet=false){
 const previous=document.activeElement,overflow=document.body.style.overflow;
 const overlay=document.createElement('div');overlay.className='booking-owner-modal booking-live-form';
 overlay.innerHTML='<section class="booking-owner-dialog" role="dialog" aria-modal="true" aria-labelledby="bookingOwnerTitle" tabindex="-1"><header><h3 id="bookingOwnerTitle">Cập nhật thông tin chủ nuôi</h3><button type="button" class="booking-owner-close" aria-label="Đóng">Đóng</button></header><div class="booking-owner-content"></div></section>';
 document.body.append(overlay);document.body.style.overflow='hidden';
 overlay.querySelector('h3').textContent=title;
 overlay.classList.toggle('booking-pet-modal',pet);
 const content=overlay.querySelector('.booking-owner-content');
 const get=editor(content,'');content.querySelector('h3').remove();
 let closed=false;
 const close=(force=false)=>{
  if(closed||(!force&&get('bookingInlineCancel')?.disabled))return;
  closed=true;document.removeEventListener('keydown',keyboard);overlay.remove();document.body.style.overflow=overflow;observer.disconnect();onClose?.();
  if(previous?.isConnected)previous.focus();
 };
 const keyboard=event=>{
  if(event.key==='Escape'){event.preventDefault();close();}
  if(event.key==='Tab'){
   const items=[...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(item=>item.getClientRects().length);
   const first=items[0],last=items.at(-1);
   if(event.shiftKey&&(document.activeElement===first||document.activeElement===overlay.querySelector('section'))){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 };
 const observer=new MutationObserver(()=>{if(!host.isConnected)close(true);});observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('keydown',keyboard);
 overlay.onclick=event=>{if(event.target===overlay||event.target.closest('.booking-owner-close'))close();};
 get('bookingInlineCancel').onclick=()=>close();
 overlay.querySelector('section').focus();
 return {get,close,content};
}
export async function editBookingOwner(host,db,onSaved,onClose){
 const {get,close}=ownerModal(host,onClose);
 get('bookingInlineSave').disabled=true;
 try{
  const snapshot=await loadCustomerProfileSnapshot(db);
  if(!get('bookingInlineFields'))return;
  const user=applyProfileSnapshot({id:snapshot.id},snapshot);
  get('bookingInlineFields').innerHTML=field('bookingOwnerName','Họ và tên',snapshot.name,'text',true)+field('bookingOwnerEmail','Email',snapshot.email,'email')+`<p class="field-note">Số điện thoại ${esc(snapshot.phone)} được giữ theo tài khoản đã xác thực.</p>`;
  get('bookingOwnerName').maxLength=150;get('bookingOwnerEmail').maxLength=254;
  get('bookingOwnerName').focus();
  get('bookingInlineSave').disabled=false;
  bindSave(get,async()=>{
   const name=get('bookingOwnerName').value.trim();if(!name)throw Error('Vui lòng nhập họ và tên.');
   await saveCustomerProfile(db,user,{name,email:get('bookingOwnerEmail').value.trim(),addresses:user.addresses});
   await onSaved();
   close(true);
  });
 }catch(error){if(get('bookingInlineError'))get('bookingInlineError').textContent=error.message;}
}
export async function editBookingPet(host,db,pet,onSaved,onClose){
 const {get,close,content}=ownerModal(host,onClose,pet?'Cập nhật hồ sơ bé cưng':'Thêm bé cưng',true);
 get('bookingInlineSave').textContent=pet?'Lưu thay đổi':'Lưu bé cưng';
 get('bookingInlineSave').disabled=true;
 try{
  const [catalog,existing]=await Promise.all([
   db.from('pet_breed').select('id,breed_name,species_id,pet_species(id,species_name,is_active)').eq('is_active',true),
   pet?db.from('pet_profile').select('id,pet_name,breed_id,gender,date_of_birth,color,routine,allergy,safety_note,updated_at').eq('id',pet.id).single():Promise.resolve({data:null})
  ]);
  if(catalog.error)throw catalog.error;if(existing.error)throw existing.error;
  if(!get('bookingInlineFields'))return;
  const record=existing.data||{},id=pet?.id||crypto.randomUUID();
  const breeds=(catalog.data||[]).filter(b=>b.pet_species?.is_active&&b.breed_name?.trim()&&!/^\d+$|^(unknown|null|undefined|chưa rõ|chưa cập nhật)$/i.test(b.breed_name.trim()));
  const species=[...new Map(breeds.map(b=>[b.species_id,b.pet_species])).values()];
  let selectedBreed=breeds.find(b=>b.id===record.breed_id)||null,selectedSpecies=selectedBreed?.species_id||species[0]?.id;
  get('bookingInlineFields').innerHTML=field('bookingPetName','Tên bé cưng',record.pet_name,'text',true)+`<div class="form-group"><label>Loài thú cưng <span class="required">*</span></label><div class="booking-inline-species">${species.map(s=>`<button type="button" data-species="${esc(s.id)}" class="${s.id===selectedSpecies?'selected':''}">${esc(s.species_name)}</button>`).join('')}</div></div><div class="form-group booking-entity-wrapper"><label for="bookingPetBreed">Giống <span class="required">*</span></label><input id="bookingPetBreed" value="${esc(selectedBreed?.breed_name||'')}" required autocomplete="off" role="combobox" aria-expanded="false" aria-controls="bookingPetBreedOptions"><div id="bookingPetBreedOptions" class="booking-entity-options" role="listbox" hidden></div></div>`+field('bookingPetWeight','Cân nặng (kg)',pet?.weight||'','number',true)+`<div class="form-group"><label for="bookingPetGender">Giới tính <span class="required">*</span></label><select id="bookingPetGender"><option value="nam" ${record.gender==='nam'?'selected':''}>Đực</option><option value="nu" ${record.gender==='nu'?'selected':''}>Cái</option></select></div>`+field('bookingPetBorn','Ngày sinh',record.date_of_birth||'','date')+field('bookingPetColor','Màu lông',record.color)+field('bookingPetAllergy','Dị ứng',record.allergy)+field('bookingPetSafety','Lưu ý an toàn',record.safety_note)+field('bookingPetRoutine','Thói quen chăm sóc',record.routine);
  get('bookingPetName').maxLength=200;get('bookingPetWeight').min='0.01';get('bookingPetWeight').max='1000';get('bookingPetWeight').step='0.01';
  get('bookingPetBorn').max=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok'}).format(new Date());
  for(const key of ['Color','Allergy','Safety','Routine'])get('bookingPet'+key).maxLength=key==='Color'?200:2000;
  const list=get('bookingPetBreedOptions'),input=get('bookingPetBreed');
  const hide=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');};
  const render=()=>{
   list.innerHTML=breeds.filter(b=>b.species_id===selectedSpecies&&b.breed_name.toLocaleLowerCase('vi').includes(input.value.toLocaleLowerCase('vi'))).map(b=>`<button type="button" class="booking-entity-option" data-breed="${esc(b.id)}" role="option">${esc(b.breed_name)}</button>`).join('')||'<p>Chưa có giống phù hợp.</p>';
   list.hidden=false;input.setAttribute('aria-expanded','true');
   list.querySelectorAll('[data-breed]').forEach(btn=>btn.onclick=()=>{selectedBreed=breeds.find(b=>b.id===btn.dataset.breed);input.value=selectedBreed.breed_name;hide();});
  };
  input.onfocus=render;input.oninput=()=>{selectedBreed=null;render();};input.onkeydown=e=>{if(e.key==='Escape')hide();if(e.key==='ArrowDown'){e.preventDefault();list.querySelector('button')?.focus();}};
  content.addEventListener('focusout',()=>setTimeout(()=>{if(!input.parentElement.contains(document.activeElement))hide();},0));
  content.querySelectorAll('[data-species]').forEach(btn=>btn.onclick=()=>{selectedSpecies=btn.dataset.species;selectedBreed=null;input.value='';hide();content.querySelectorAll('[data-species]').forEach(b=>b.classList.toggle('selected',b===btn));});
  get('bookingPetName').focus();
  get('bookingInlineSave').disabled=false;
  bindSave(get,async()=>{
   if(!selectedBreed)throw Error('Vui lòng chọn giống từ danh sách.');
   const values={pet_name:get('bookingPetName').value.trim(),breed_id:selectedBreed.id,gender:get('bookingPetGender').value,date_of_birth:get('bookingPetBorn').value||null,color:get('bookingPetColor').value.trim(),allergy:get('bookingPetAllergy').value.trim(),safety_note:get('bookingPetSafety').value.trim(),routine:get('bookingPetRoutine').value.trim()};
   const result=await db.rpc('save_own_pet',{p_id:id,p_expected:record.updated_at||null,p_values:values,p_weight:Number(get('bookingPetWeight').value)});
   if(result.error)throw result.error;if(result.data!==id)throw Error('Chưa xác nhận được hồ sơ đã lưu.');
   await onSaved(id);
   close(true);
  });
 }catch(error){if(get('bookingInlineError'))get('bookingInlineError').textContent=error.message||'Chưa tải được hồ sơ bé cưng.';}
}
