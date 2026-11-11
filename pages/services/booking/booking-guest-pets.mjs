import {guestCommerce} from '/scripts/shared/guest-commerce-client.mjs';
import {editGuestContact} from '../../../scripts/shared/guest-contact-editor.mjs';
const pendingKey='pawpal_guest_pet_request_v1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cleanGuestBreeds(rows){return (rows||[]).filter(b=>b.pet_species?.is_active&&typeof b.breed_name==='string'&&b.breed_name.trim()&&!/^\d+$|^(unknown|null|undefined|chưa rõ|chưa cập nhật)$/i.test(b.breed_name.trim()));}
export function guestPetFromContext(pet,breeds){const breed=breeds.find(b=>b.id===pet.breedId);return {id:pet.id,name:pet.name,breed:pet.breedName||breed?.breed_name||'',breedId:pet.breedId,species_id:pet.speciesId||breed?.species_id,species:pet.speciesName||breed?.pet_species?.species_name||'',gender:pet.gender};}
export async function loadGuestBookingContext(db){
 const [catalog,breeds,species,context]=await Promise.all([db.rpc('customer_service_catalog'),db.from('pet_breed').select('id,breed_name,species_id,pet_species(id,species_name,is_active)').eq('is_active',true),db.from('pet_species').select('id,species_name').eq('is_active',true).order('species_name'),guestCommerce.request('context',{page:1})]);
 if(catalog.error)throw catalog.error;if(breeds.error)throw breeds.error;
 if(species.error)throw species.error;
 return {catalog:catalog.data,breeds:cleanGuestBreeds(breeds.data),species:species.data,context};
}
export function renderGuestPets({root,db,context,breeds,species=[],onChoose,onNext,onContext}){
 let pets=(context.pets||[]).map(p=>guestPetFromContext(p,breeds)),selected=null,page=context.page||1,hasMore=!!context.hasMore,busy=false;
 const firstVisit=!pets.length&&!context.contact;
 root.innerHTML=`<div class="step-header"><h2>${firstVisit?'Thông tin đặt lịch':'Chọn bé cưng'}</h2><p class="step-subtitle">Bạn có thể đặt lịch mà không cần tài khoản.</p></div>
 <div id="guestBookingContact" class="booking-owner"></div><div id="guestBookingPets" class="booking-pet-cards" role="group" aria-label="Chọn bé cưng"></div>
 <p id="guestPetFeedback" class="field-note" role="status" aria-live="polite"></p><div class="booking-inline-tools"><button type="button" class="btn-green-outline" id="guestAddPet">Thêm bé cưng</button><button type="button" class="btn-green-outline" id="guestPetMore" hidden>Xem thêm bé</button></div><div id="guestPetEditor"></div>
 <div class="step-actions"><button type="button" class="btn-step-next btn-cta" id="step1Next" disabled>Tiếp theo</button></div>`;
 const get=id=>root.querySelector('#'+id),feedback=get('guestPetFeedback'),editor=get('guestPetEditor');
 function contactView(){
  const contactEl=get('guestBookingContact');
  if(!contactEl)return;
  contactEl.hidden=!context.contact;
  contactEl.innerHTML=context.contact?`<div class="booking-owner-top"><span>Thông tin chủ nuôi</span><button type="button" class="btn-owner-edit" id="guestEditContact">Sửa liên hệ</button></div><strong>${esc(context.contact.name)}</strong><span>${esc(context.contact.phone)}</span>`:'';
 }
 function choose(pet){selected=pet;if(sessionStorage.getItem(pendingKey)===pet.id)sessionStorage.removeItem(pendingKey);onChoose(pet);get('step1Next').disabled=false;draw();}
 function draw(){
  const names=new Map(),codes=new Map(),name=p=>p.name.trim().toLocaleLowerCase('vi');
  for(const pet of pets){names.set(name(pet),(names.get(name(pet))||0)+1);const short=pet.id.slice(-8);codes.set(short,(codes.get(short)||0)+1);}
  const duplicate=p=>names.get(name(p))>1;
  const code=p=>codes.get(p.id.slice(-8))>1?p.id:p.id.slice(-8);
  get('guestBookingPets').innerHTML=pets.map(p=>{
   const isSelected=selected?.id===p.id||(!selected&&p===pets[0]);
   return `<div class="booking-pet-card ${selected?.id===p.id?'selected':''}" data-pet="${esc(p.id)}" role="button" tabindex="0" aria-pressed="${selected?.id===p.id}">
    <div class="booking-pet-card-header">
     <strong>${esc(p.name)}</strong>
     <button type="button" class="btn-card-edit" ${isSelected?'id="guestEditPet"':''} data-edit-pet="${esc(p.id)}" aria-label="Sửa thông tin ${esc(p.name)}">Sửa</button>
    </div>
    <span>${esc([p.species,p.breed].filter(Boolean).join(' · '))}</span>
    ${duplicate(p)?`<span>Mã bé ${esc(code(p))}</span>`:''}
    ${Number(p.weight)>0?`<span>${p.weight} kg</span>`:''}
   </div>`;
  }).join('');
  get('guestBookingPets').querySelectorAll('.booking-pet-card').forEach(card=>{
   const pet=pets.find(p=>p.id===card.dataset.pet);
   card.onclick=event=>{
    if(busy)return;
    const editBtn=event.target.closest('.btn-card-edit');
    if(editBtn){
     event.stopPropagation();
     openPetEditor(editBtn.dataset.editPet||pet?.id);
     return;
    }
    if(pet)choose(pet);
   };
   card.onkeydown=event=>{
    if((event.key==='Enter'||event.key===' ')&&!event.target.closest('.btn-card-edit')){
     event.preventDefault();
     if(!busy&&pet)choose(pet);
    }
   };
  });
  get('guestPetMore').hidden=!hasMore;
  if(!pets.length&&!firstVisit)feedback.textContent='Điền thông tin bé cưng để chọn dịch vụ phù hợp.';
 }
 contactView();draw();
 const pending=sessionStorage.getItem(pendingKey),recovered=pets.find(p=>p.id===pending);if(recovered){sessionStorage.removeItem(pendingKey);choose(recovered);}
 get('step1Next').onclick=()=>{if(selected&&!busy)onNext();};
 get('guestPetMore').onclick=async()=>{
  if(busy)return;busy=true;get('guestPetMore').disabled=true;
  try{const next=await guestCommerce.request('context',{page:page+1});if(!root.isConnected)return;page=next.page;hasMore=!!next.hasMore;
   for(const p of next.pets||[])if(!pets.some(old=>old.id===p.id))pets.push(guestPetFromContext(p,breeds));draw();
  }catch(error){feedback.textContent=error.message;}finally{busy=false;if(get('guestPetMore'))get('guestPetMore').disabled=false;}
 };
 root.addEventListener('click',async event=>{
  const editBtn=event.target.closest('#guestEditContact');
  if(!editBtn||busy||editor.childElementCount)return;
  busy=true;get('step1Next').disabled=true;
  try{
   const fresh=await editGuestContact(editor);
   if(fresh){context=fresh;onContext(fresh);contactView();if(selected)onChoose(selected);feedback.textContent='Đã lưu thông tin liên hệ.';}
  }catch(error){feedback.textContent=error.message;}
  finally{busy=false;get('step1Next').disabled=!selected;}
 });
 get('guestAddPet').onclick=()=>openPetEditor();
 async function openPetEditor(petId=null,directEntry=false){
  if(busy||editor.childElementCount)return;
  let editing=null;if(petId){busy=true;try{editing=(await guestCommerce.request('profile-read',{petId})).pet;}catch(error){feedback.textContent=error.message;return;}finally{busy=false;}if(!root.isConnected)return;}
  const requestId=editing?crypto.randomUUID():sessionStorage.getItem(pendingKey)||crypto.randomUUID();
  const prevOverflow=document.body.style.overflow;
  if(!directEntry)document.body.style.overflow='hidden';

  const formHtml=`<form class="booking-form" id="guestPetForm" onsubmit="return false;"><fieldset class="border-0 p-0" id="guestPetFields">
   <div class="form-group" ${!directEntry&&context.contact?'style="display:none;"':''}>
    <label for="guestOwnerName">Họ và tên chủ nuôi <span class="required">*</span></label>
    <input id="guestOwnerName" autocomplete="name" required maxlength="150" value="${esc(context.contact?.name||'')}" ${context.contact?'readonly':''}>
   </div>
   <div class="form-group" ${!directEntry&&context.contact?'style="display:none;"':''}>
    <label for="guestOwnerPhone">Số điện thoại <span class="required">*</span></label>
    <input id="guestOwnerPhone" type="tel" autocomplete="tel" required maxlength="40" value="${esc(context.contact?.phone||'')}" ${context.contact?'readonly':''}>
   </div>
   <div class="form-group"><label for="guestPetName">Tên bé cưng <span class="required">*</span></label><input id="guestPetName" required maxlength="100" placeholder="Ví dụ: Bông, Lu, Miu..."></div>
   <div class="form-group"><label for="guestPetSpecies">Loài <span class="required">*</span></label><select id="guestPetSpecies" required><option value="">Chọn loài</option>${species.map(s=>`<option value="${esc(s.id)}">${esc(s.species_name)}</option>`).join('')}</select></div>
   <div class="form-group"><label for="guestPetBreed">Giống cụ thể <span class="required">*</span></label><input id="guestPetBreed" required maxlength="160" placeholder="Nhập giống của bé, ví dụ Poodle"></div>
   <div class="form-group"><label for="guestPetWeight">Cân nặng (kg) <span class="required">*</span></label><input id="guestPetWeight" type="number" min="0.01" max="200" step="0.01" required placeholder="0.00"></div>
   <div class="form-group"><label for="guestPetGender">Giới tính</label><select id="guestPetGender"><option value="chua_ro">Chưa rõ</option><option value="nam">Đực</option><option value="nu">Cái</option></select></div>
   <div class="form-group full-width"><label for="guestPetAllergy">Dị ứng</label><textarea id="guestPetAllergy" rows="2" maxlength="1000" placeholder="Tiền sử dị ứng thức ăn, thuốc lá, sữa tắm..."></textarea></div>
   <div class="form-group full-width"><label for="guestPetSafety">Lưu ý an toàn</label><textarea id="guestPetSafety" rows="2" maxlength="1000" placeholder="Tính cách nhút nhát, sợ sấy, cắn người lạ..."></textarea></div>
  </fieldset><p id="guestPetSaveError" class="field-error" role="alert"></p><div class="booking-inline-actions"><button type="button" class="btn-green-outline" id="guestPetCancel" ${directEntry?'hidden':''}>Hủy</button><button type="button" class="btn-cta" id="guestPetSave">${directEntry?'Tiếp theo':(editing?'Lưu thay đổi':'Lưu bé cưng')}</button></div></form>`;

  if(directEntry){
   editor.innerHTML=`<div class="booking-inline-editor guest-booking-entry">${formHtml}</div>`;
   get('guestAddPet').parentElement.hidden=true;get('step1Next').parentElement.hidden=true;
  }else{
   editor.innerHTML=`<div class="booking-owner-modal booking-pet-modal" id="guestPetModalOverlay" data-lenis-prevent>
    <div class="booking-owner-dialog" role="dialog" aria-modal="true" aria-labelledby="guestModalTitle" tabindex="-1" data-lenis-prevent>
     <header>
      <h3 id="guestModalTitle">${editing?'Sửa thông tin bé cưng':'Thêm bé cưng'}</h3>
      <button type="button" class="booking-owner-close" id="guestPetModalClose" aria-label="Đóng">Đóng</button>
     </header>
     <div class="booking-owner-content">
      ${formHtml}
     </div>
    </div>
   </div>`;
   const dialog=editor.querySelector('.booking-owner-dialog');
   if(dialog)dialog.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});
  }

  const closeModal=()=>{
   if(busy)return;
   if(!directEntry){
    document.removeEventListener('keydown',onModalKey);
    document.body.style.overflow=prevOverflow;
   }
   editor.replaceChildren();
  };
  const onModalKey=e=>{if(e.key==='Escape')closeModal();};
  if(!directEntry){
   document.addEventListener('keydown',onModalKey);
   const overlay=get('guestPetModalOverlay');
   if(overlay)overlay.onclick=e=>{if(e.target===overlay||e.target.closest('#guestPetModalClose'))closeModal();};
  }

  if(editing){
   const mapped=guestPetFromContext(editing,breeds);
   for(const [id,value]of Object.entries({guestPetName:editing.name,guestPetSpecies:mapped.species_id,guestPetBreed:mapped.breed,guestPetWeight:editing.weight,guestPetGender:editing.gender||'chua_ro',guestPetAllergy:editing.allergy,guestPetSafety:editing.safetyNote}))get(id).value=value??'';
  }
  const fieldMessages={guestOwnerName:'Vui lòng nhập họ và tên chủ nuôi.',guestOwnerPhone:'Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số hoặc dạng +84.',guestPetName:'Vui lòng nhập tên bé cưng.',guestPetSpecies:'Vui lòng chọn loài của bé.',guestPetBreed:'Vui lòng nhập giống cụ thể của bé, tối đa 160 ký tự.',guestPetWeight:'Vui lòng nhập cân nặng từ 0,01 đến 200 kg, tối đa hai chữ số thập phân.',guestPetAllergy:'Thông tin dị ứng không được vượt quá 1.000 ký tự.',guestPetSafety:'Lưu ý an toàn không được vượt quá 1.000 ký tự.'};
  function fieldError(id,message){const field=get(id);field.setAttribute('aria-invalid',String(!!message));get(id+'Error').textContent=message;}
  for(const id of Object.keys(fieldMessages)){
   const field=get(id),error=document.createElement('p');error.id=id+'Error';error.className='field-error';error.setAttribute('aria-live','polite');
   field.setAttribute('aria-describedby',error.id);field.setAttribute('aria-invalid','false');field.parentElement.append(error);
   field.addEventListener('input',()=>{fieldError(id,'');get('guestPetSaveError').textContent='';});
  }
  function validateFields(){
   let first=null;
   for(const [id,message] of Object.entries(fieldMessages)){
    const field=get(id),value=field.value.trim();let valid=field.checkValidity();
    if(['guestOwnerName','guestPetName'].includes(id))valid=valid&&!!value;
    if(id==='guestOwnerPhone')valid=valid&&/^(?:0\d{9}|(?:\+84|0084|84)\d{9})$/.test(value.replace(/[\s().-]/g,''));
    if(id==='guestPetSpecies')valid=valid&&species.some(s=>s.id===value);
    if(id==='guestPetBreed')valid=valid&&!!value&&value.length<=160&&!/^\d+$|^(unknown|null|undefined|chưa rõ|chưa cập nhật)$/i.test(value);
    if(['guestPetAllergy','guestPetSafety'].includes(id))valid=valid&&value.length<=1000;
    fieldError(id,valid?'':message);if(!valid&&!first)first=field;
   }
   first?.focus();return !first;
  }
  get('guestPetForm').addEventListener('submit',event=>event.preventDefault());
  get('guestPetCancel').onclick=closeModal;
  get('guestPetSave').onclick=async()=>{
   if(busy||!validateFields())return;
   const contact={name:get('guestOwnerName').value.trim(),phone:get('guestOwnerPhone').value},pet={name:get('guestPetName').value.trim(),speciesName:species.find(s=>s.id===get('guestPetSpecies').value).species_name,breedName:get('guestPetBreed').value.trim(),weight:Number(get('guestPetWeight').value),gender:get('guestPetGender').value,allergy:get('guestPetAllergy').value.trim(),safetyNote:get('guestPetSafety').value.trim()};
   busy=true;get('guestPetFields').disabled=true;get('guestPetSave').disabled=true;get('guestPetCancel').disabled=true;get('step1Next').disabled=true;get('guestPetSaveError').textContent='';
   try{
    if(!editing)sessionStorage.setItem(pendingKey,requestId);
    const result=editing?await guestCommerce.request('profile-update',{requestId,revision:editing.revision,pet:{id:editing.id,...pet}}):await guestCommerce.request('pets',{requestId,contact,pet});
    const savedId=editing?editing.id:result.petId;if(!editing&&savedId!==requestId)throw Error('Chưa xác nhận được hồ sơ bé cưng đã lưu.');
    const fresh=await guestCommerce.request('context',{page:1});if(!root.isConnected)return;
    context=fresh;onContext(fresh);contactView();page=1;hasMore=!!fresh.hasMore;
    pets=(fresh.pets||[]).map(p=>guestPetFromContext(p,breeds));
    const saved={...guestPetFromContext(fresh.pets?.find(p=>p.id===savedId)||{id:savedId,name:pet.name,breedName:pet.breedName,speciesName:pet.speciesName,speciesId:species.find(s=>s.species_name===pet.speciesName)?.id,gender:pet.gender},breeds),weight:pet.weight,allergy:pet.allergy,safety_note:pet.safetyNote};
    pets=pets.filter(p=>p.id!==saved.id);pets.unshift(saved);choose(saved);if(!editing)sessionStorage.removeItem(pendingKey);
    if(!directEntry){
     document.removeEventListener('keydown',onModalKey);
     document.body.style.overflow=prevOverflow;
    }
    editor.replaceChildren();feedback.textContent='Đã lưu và chọn '+saved.name+'.';
    get('guestAddPet').parentElement.hidden=false;get('step1Next').parentElement.hidden=false;
    root.querySelector('.step-header h2').textContent='Chọn bé cưng';
    if(directEntry)onNext();
   }catch(error){if(get('guestPetSaveError'))get('guestPetSaveError').textContent=error.message;}
   finally{busy=false;if(get('guestPetSave')){get('guestPetFields').disabled=false;get('guestPetSave').disabled=false;get('guestPetCancel').disabled=false;}if(get('step1Next'))get('step1Next').disabled=!selected;}
  };
  if(!directEntry){
   const focusTarget=(!context.contact)?get('guestOwnerName'):get('guestPetName');
   focusTarget?.focus();
  }
 }
 if(!pets.length)openPetEditor(null,firstVisit);
}
