import {guestCommerce} from '../../../scripts/shared/guest-commerce-client.mjs';
import {editGuestContact} from '../../../scripts/shared/guest-contact-editor.mjs';
const pendingKey='pawpal_guest_pet_request_v1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cleanGuestBreeds(rows){return (rows||[]).filter(b=>b.pet_species?.is_active&&typeof b.breed_name==='string'&&b.breed_name.trim()&&!/^\d+$|^(unknown|null|undefined|chưa rõ|chưa cập nhật)$/i.test(b.breed_name.trim()));}
export function guestPetFromContext(pet,breeds){const breed=breeds.find(b=>b.id===pet.breedId);return {id:pet.id,name:pet.name,breed:breed?.breed_name||'',breedId:pet.breedId,species_id:breed?.species_id,species:breed?.pet_species?.species_name||'',gender:pet.gender};}
export async function loadGuestBookingContext(db){
 const [catalog,breeds,context]=await Promise.all([db.rpc('customer_service_catalog'),db.from('pet_breed').select('id,breed_name,species_id,pet_species(id,species_name,is_active)').eq('is_active',true),guestCommerce.request('context',{page:1})]);
 if(catalog.error)throw catalog.error;if(breeds.error)throw breeds.error;
 return {catalog:catalog.data,breeds:cleanGuestBreeds(breeds.data),context};
}
export function renderGuestPets({root,db,context,breeds,onChoose,onNext,onContext}){
 let pets=(context.pets||[]).map(p=>guestPetFromContext(p,breeds)),selected=null,page=context.page||1,hasMore=!!context.hasMore,busy=false;
 root.innerHTML=`<div class="step-header"><h2>Chọn bé cưng</h2></div><p class="field-note">Bạn có thể đặt lịch mà không cần tài khoản.</p>
 <div id="guestBookingContact" class="booking-owner"></div><div id="guestBookingPets" class="booking-pet-cards" role="group" aria-label="Chọn bé cưng"></div>
 <p id="guestPetFeedback" class="field-note" role="status" aria-live="polite"></p><div class="booking-inline-tools"><button type="button" class="btn-green-outline" id="guestPetMore" hidden>Xem thêm bé</button><button type="button" class="btn-green-outline" id="guestAddPet">Thêm bé cưng</button><button type="button" class="btn-green-outline" id="guestEditPet" disabled>Sửa bé đã chọn</button><button type="button" class="btn-green-outline" id="guestEditContact" ${context.contact?'':'hidden'}>Sửa liên hệ</button></div><div id="guestPetEditor"></div>
 <div class="step-actions"><button type="button" class="btn-step-next btn-cta" id="step1Next" disabled>Tiếp theo</button></div>`;
 const get=id=>root.querySelector('#'+id),feedback=get('guestPetFeedback'),editor=get('guestPetEditor');
 function contactView(){get('guestBookingContact').innerHTML=context.contact?`<span>Thông tin chủ nuôi</span><strong>${esc(context.contact.name)}</strong><span>${esc(context.contact.phone)}</span>`:'';}
 function choose(pet){selected=pet;if(sessionStorage.getItem(pendingKey)===pet.id)sessionStorage.removeItem(pendingKey);onChoose(pet);get('step1Next').disabled=false;get('guestEditPet').disabled=false;draw();}
 function draw(){
  const names=new Map(),codes=new Map(),name=p=>p.name.trim().toLocaleLowerCase('vi');
  for(const pet of pets){names.set(name(pet),(names.get(name(pet))||0)+1);const short=pet.id.slice(-8);codes.set(short,(codes.get(short)||0)+1);}
  const duplicate=p=>names.get(name(p))>1;
  const code=p=>codes.get(p.id.slice(-8))>1?p.id:p.id.slice(-8);
  get('guestBookingPets').innerHTML=pets.map(p=>`<button type="button" class="booking-pet-card ${selected?.id===p.id?'selected':''}" data-pet="${esc(p.id)}" aria-pressed="${selected?.id===p.id}"><strong>${esc(p.name)}</strong><span>${esc([p.species,p.breed].filter(Boolean).join(' · '))}</span>${duplicate(p)?`<span>Mã bé ${esc(code(p))}</span>`:''}${Number(p.weight)>0?`<span>${p.weight} kg</span>`:''}</button>`).join('');
  get('guestBookingPets').querySelectorAll('[data-pet]').forEach(button=>button.onclick=()=>{if(!busy)choose(pets.find(p=>p.id===button.dataset.pet));});
  get('guestPetMore').hidden=!hasMore;
  if(!pets.length)feedback.textContent='Hãy thêm bé cưng để chọn dịch vụ phù hợp.';
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
 get('guestEditContact').onclick=async()=>{if(busy||editor.childElementCount)return;busy=true;get('step1Next').disabled=true;try{const fresh=await editGuestContact(editor);if(fresh){context=fresh;onContext(fresh);contactView();if(selected)onChoose(selected);feedback.textContent='Đã lưu thông tin liên hệ.';}}catch(error){feedback.textContent=error.message;}finally{busy=false;get('step1Next').disabled=!selected;}};
 get('guestEditPet').onclick=()=>openPetEditor(selected?.id);
 get('guestAddPet').onclick=()=>openPetEditor();
 async function openPetEditor(petId=null){
  if(busy||editor.childElementCount)return;
  let editing=null;if(petId){busy=true;try{editing=(await guestCommerce.request('profile-read',{petId})).pet;}catch(error){feedback.textContent=error.message;return;}finally{busy=false;}if(!root.isConnected)return;}
  const requestId=editing?crypto.randomUUID():sessionStorage.getItem(pendingKey)||crypto.randomUUID();let selectedBreed=null;
  editor.innerHTML=`<div class="booking-inline-editor"><h3>Thêm bé cưng</h3><form class="booking-form" id="guestPetForm" onsubmit="return false;"><fieldset class="border-0 p-0" id="guestPetFields">
   <div class="form-group"><label for="guestOwnerName">Họ và tên chủ nuôi <span class="required">*</span></label><input id="guestOwnerName" autocomplete="name" required maxlength="150" value="${esc(context.contact?.name||'')}" ${context.contact?'readonly':''}></div>
   <div class="form-group"><label for="guestOwnerPhone">Số điện thoại <span class="required">*</span></label><input id="guestOwnerPhone" type="tel" autocomplete="tel" required maxlength="40" value="${esc(context.contact?.phone||'')}" ${context.contact?'readonly':''}></div>
   <div class="form-group"><label for="guestPetName">Tên bé cưng <span class="required">*</span></label><input id="guestPetName" required maxlength="100"></div>
   <div class="form-group booking-entity-wrapper"><label for="guestPetBreed">Giống và loài <span class="required">*</span></label><input id="guestPetBreed" required autocomplete="off" role="combobox" aria-expanded="false" aria-controls="guestPetBreedOptions"><div id="guestPetBreedOptions" class="booking-entity-options" role="listbox" hidden></div></div>
   <div class="form-group"><label for="guestPetWeight">Cân nặng (kg) <span class="required">*</span></label><input id="guestPetWeight" type="number" min="0.01" max="200" step="0.01" required></div>
   <div class="form-group"><label for="guestPetGender">Giới tính</label><select id="guestPetGender"><option value="chua_ro">Chưa rõ</option><option value="nam">Đực</option><option value="nu">Cái</option></select></div>
   <div class="form-group"><label for="guestPetAllergy">Dị ứng</label><textarea id="guestPetAllergy" rows="2" maxlength="1000"></textarea></div>
   <div class="form-group"><label for="guestPetSafety">Lưu ý an toàn</label><textarea id="guestPetSafety" rows="2" maxlength="1000"></textarea></div>
   </fieldset><p id="guestPetSaveError" class="field-error" role="alert"></p><div class="booking-inline-actions"><button type="button" class="btn-green-outline" id="guestPetCancel">Hủy</button><button type="button" class="btn-cta" id="guestPetSave">Lưu bé cưng</button></div></form></div>`;
  const input=get('guestPetBreed'),list=get('guestPetBreedOptions');
  if(editing){editor.querySelector('h3').textContent='Sửa bé cưng';selectedBreed=breeds.find(b=>b.id===editing.breedId)||null;for(const [id,value]of Object.entries({guestPetName:editing.name,guestPetBreed:selectedBreed?selectedBreed.breed_name+' · '+selectedBreed.pet_species.species_name:'',guestPetWeight:editing.weight,guestPetGender:editing.gender||'chua_ro',guestPetAllergy:editing.allergy,guestPetSafety:editing.safetyNote}))get(id).value=value??'';}
  const fieldMessages={guestOwnerName:'Vui lòng nhập họ và tên chủ nuôi.',guestOwnerPhone:'Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số hoặc dạng +84.',guestPetName:'Vui lòng nhập tên bé cưng.',guestPetBreed:'Vui lòng chọn giống từ danh sách.',guestPetWeight:'Vui lòng nhập cân nặng từ 0,01 đến 200 kg, tối đa hai chữ số thập phân.',guestPetAllergy:'Thông tin dị ứng không được vượt quá 1.000 ký tự.',guestPetSafety:'Lưu ý an toàn không được vượt quá 1.000 ký tự.'};
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
    if(id==='guestPetBreed')valid=valid&&!!selectedBreed;
    if(['guestPetAllergy','guestPetSafety'].includes(id))valid=valid&&value.length<=1000;
    fieldError(id,valid?'':message);if(!valid&&!first)first=field;
   }
   first?.focus();return !first;
  }
  const hide=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');};
  const search=()=>{
   const query=input.value.trim().toLocaleLowerCase('vi');
   const matches=breeds.filter(b=>(b.breed_name+' '+b.pet_species.species_name).toLocaleLowerCase('vi').includes(query)).slice(0,30);
   list.innerHTML=matches.map(b=>`<button type="button" class="booking-entity-option" role="option" data-breed="${esc(b.id)}">${esc(b.breed_name)} · ${esc(b.pet_species.species_name)}</button>`).join('')||'<p>Không có giống phù hợp.</p>';
   list.hidden=false;input.setAttribute('aria-expanded','true');list.querySelectorAll('[data-breed]').forEach(button=>button.onclick=()=>{selectedBreed=breeds.find(b=>b.id===button.dataset.breed);input.value=selectedBreed.breed_name+' · '+selectedBreed.pet_species.species_name;fieldError('guestPetBreed','');hide();});
  };
  input.onfocus=search;input.oninput=()=>{selectedBreed=null;search();};input.onkeydown=event=>{if(event.key==='Escape')hide();if(event.key==='ArrowDown'){event.preventDefault();list.querySelector('button')?.focus();}};
  list.onkeydown=event=>{const buttons=[...list.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);if(event.key==='Escape'){hide();input.focus();}if(buttons.length&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}};
  get('guestPetForm').addEventListener('submit',event=>event.preventDefault());
  get('guestPetCancel').onclick=()=>{if(!busy)editor.replaceChildren();};
  get('guestPetSave').onclick=async()=>{
   if(busy||!validateFields())return;
   const contact={name:get('guestOwnerName').value.trim(),phone:get('guestOwnerPhone').value},pet={name:get('guestPetName').value.trim(),breedId:selectedBreed.id,weight:Number(get('guestPetWeight').value),gender:get('guestPetGender').value,allergy:get('guestPetAllergy').value.trim(),safetyNote:get('guestPetSafety').value.trim()};
   busy=true;get('guestPetFields').disabled=true;get('guestPetSave').disabled=true;get('guestPetCancel').disabled=true;get('step1Next').disabled=true;get('guestPetSaveError').textContent='';
   try{
    if(!editing)sessionStorage.setItem(pendingKey,requestId);
    const result=editing?await guestCommerce.request('profile-update',{requestId,revision:editing.revision,pet:{id:editing.id,...pet}}):await guestCommerce.request('pets',{requestId,contact,pet});
    const savedId=editing?editing.id:result.petId;if(!editing&&savedId!==requestId)throw Error('Chưa xác nhận được hồ sơ bé cưng đã lưu.');
    const fresh=await guestCommerce.request('context',{page:1});if(!root.isConnected)return;
    context=fresh;onContext(fresh);contactView();page=1;hasMore=!!fresh.hasMore;
    pets=(fresh.pets||[]).map(p=>guestPetFromContext(p,breeds));
    const saved={...guestPetFromContext({id:savedId,name:pet.name,breedId:pet.breedId,gender:pet.gender},breeds),weight:pet.weight,allergy:pet.allergy,safety_note:pet.safetyNote};
    pets=pets.filter(p=>p.id!==saved.id);pets.unshift(saved);choose(saved);if(!editing)sessionStorage.removeItem(pendingKey);get('guestEditContact').hidden=false;editor.replaceChildren();feedback.textContent='Đã lưu và chọn '+saved.name+'.';
   }catch(error){if(get('guestPetSaveError'))get('guestPetSaveError').textContent=error.message;}
   finally{busy=false;if(get('guestPetSave')){get('guestPetFields').disabled=false;get('guestPetSave').disabled=false;get('guestPetCancel').disabled=false;}if(get('step1Next'))get('step1Next').disabled=!selected;}
  };
  get('guestOwnerName').focus();
 }
}
