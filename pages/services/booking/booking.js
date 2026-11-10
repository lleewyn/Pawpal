import {editBookingOwner,editBookingPet} from './booking-inline.mjs';
import {vietnamDateTimeInput,parseVietnamDateTimeInput} from '/scripts/shared/booking-time.mjs';
import {guestCommerce,GuestCommerceError} from '/scripts/shared/guest-commerce-client.mjs';
import {isGuestShopper} from '/scripts/shared/guest-cart.mjs';
import {renderGuestPets,loadGuestBookingContext} from './booking-guest-pets.mjs';
import {renderTransactionReceipt} from '/scripts/shared/transaction-receipt.mjs';
import {GUEST_IDENTITY_EPOCH} from '/scripts/shared/guest-session-boundary.mjs';
import {verifyCustomerSession} from '/scripts/shared/customer-session.mjs';
import {renderStaffSlots} from './booking-staff-slots.mjs?v=2.5';
import {staffRequestLabel,renderBookingStaffRequest} from '/scripts/shared/booking-staff-request.mjs';
const state={step:1,pet:null,service:null,room:null,quote:null,details:null,busy:false,pets:[],profile:null,preferredStaff:null,availability:null,catalog:{services:[],rooms:[]}};
let db,requestId,journalKey;
let holdTimer,bookingChannel,availabilityPollTimer;
const invalidTimeError=error=>['booking_lead_time_required','future_booking_required','Vui lòng chọn giờ cách hiện tại hơn 2 tiếng.','Vui lòng chọn thời gian trong tương lai.','Thời gian không hợp lệ'].includes(error?.message);
function rejectInvalidBookingTime(){
 clearHold();state.quote=null;state.details=null;state.preferredStaff=null;state.availability=null;
 el('bookingQuoteError').textContent='Thời gian không hợp lệ';
 el('step3Next').disabled=true;
 show(3);
 el('bookingScheduleForm').dispatchEvent(new Event('booking-time-expired'));
}
function clearHold(){
 const hold=state.hold;state.hold=null;clearInterval(holdTimer);
 if(hold)(state.guest?guestCommerce.request('booking-release',{requestId:hold.id}):rpc('release_own_booking_hold',{p_id:hold.id})).catch(()=>{});
 document.querySelectorAll('[data-booking-hold]').forEach(node=>node.remove());
}
function placeHoldBanner(banner){
 (state.step===3?el('bookingDaySlots')||el('bookingStepper'):el('bookingStepper')).after(banner);
}
function renderHold(){
 clearInterval(holdTimer);
 document.querySelectorAll('[data-booking-hold]').forEach(node=>node.remove());
 if(!state.hold)return;
 const banner=document.createElement('p');banner.dataset.bookingHold='';banner.className='booking-hold-banner';banner.setAttribute('role','status');
 placeHoldBanner(banner);
 const tick=()=>{
  const seconds=Math.max(0,Math.ceil((state.hold.deadline-Date.now())/1000));
  banner.textContent=seconds?`${state.preferredStaff?.requires_confirmation?'Giữ yêu cầu':'Giữ chỗ'} còn ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:'Đã hết 15 phút giữ chỗ. Vui lòng quay lại chọn giờ và nhân viên.';
  if(!seconds){
   clearInterval(holdTimer);state.hold=null;state.quote=null;state.details=null;
   if(el('confirmBookingBtn'))el('confirmBookingBtn').disabled=true;if(el('step3Next'))el('step3Next').disabled=true;
   el('bookingScheduleForm')?.dispatchEvent(new Event('booking-hold-expired'));
   placeHoldBanner(banner);
  }
 };
 tick();if(state.hold)holdTimer=setInterval(tick,1000);
}
const el=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>Number(value).toLocaleString('vi-VN')+' đ';
const date=value=>{
 const parsed=typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)?parseVietnamDateTimeInput(value):new Date(value);
 return parsed?.toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})||'Chưa có thời gian';
};
const categories={grooming_spa:'Tắm và cắt tỉa',pet_hotel:'Khách sạn thú cưng',pet_taxi:'Đưa đón thú cưng'};
async function rpc(name,args){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data;}
function message(error){if(state.guest && error instanceof GuestCommerceError)return error.message;return ({outside_operating_hours:'Giờ đã chọn nằm ngoài giờ phục vụ hoặc không đủ thời gian hoàn thành dịch vụ.',booking_slot_full:'Khung giờ này đã đủ lịch. Vui lòng chọn giờ khác.',no_scheduled_staff:'Chưa có nhân viên đủ điều kiện được phân ca trống trong thời gian này. Vui lòng chọn giờ khác.',preferred_staff_unavailable:'Nhân viên ưu tiên không còn trống. Vui lòng kiểm tra lại giờ.',booking_hours_unconfigured:'Cửa hàng chưa cấu hình giờ phục vụ. Vui lòng liên hệ hỗ trợ.',booking_capacity_unconfigured:'Chưa cấu hình số lịch có thể tiếp nhận. Vui lòng liên hệ hỗ trợ.',service_species_not_supported:'Gói dịch vụ chưa được cấu hình hỗ trợ loài của bé. Vui lòng liên hệ cửa hàng.',
 pet_weight_required:'Vui lòng cập nhật cân nặng trong hồ sơ bé cưng trước khi xem giá.',pet_owner_mismatch:'Hồ sơ bé cưng không thuộc tài khoản đang đăng nhập.',
 invalid_booking_contact_phone:'Số điện thoại liên hệ không hợp lệ.',booking_hold_expired:'Đã hết thời gian giữ chỗ. Vui lòng quay lại chọn giờ và nhân viên.',booking_lead_time_required:'Thời gian không hợp lệ',booking_staff_required:'Vui lòng chọn nhân viên chăm sóc.',
 active_service_required:'Gói dịch vụ hoặc phần thêm hiện không còn mở.',future_booking_required:'Thời gian không hợp lệ',
 ambiguous_service_price:'Chưa xác định được bảng giá phù hợp cho cân nặng và thời gian đã chọn.',ambiguous_taxi_price:'Chưa xác định được giá xe cho lịch đã chọn.',
 hotel_room_unavailable:'Phòng không còn khả dụng. Vui lòng chọn phòng khác.',hotel_room_conflict:'Phòng đã có lịch trong thời gian này. Vui lòng chọn lại phòng hoặc thời gian.',
 invalid_hotel_stay:'Thời gian trả phòng phải sau thời gian nhận phòng.',invalid_taxi_details:'Vui lòng kiểm tra địa chỉ và quãng đường dự kiến.',
 invalid_taxi_return:'Thời gian lượt về phải sau khi hoàn thành lượt đi.',required_addon_missing:'Vui lòng chọn đủ phần thêm bắt buộc của gói.',
 booking_quote_changed_reload_required:'Lịch hoặc giá đã thay đổi. Vui lòng xem lại báo giá trước khi xác nhận.',
 booking_request_conflict:'Yêu cầu này đã được xử lý với thông tin khác. Vui lòng tải lại để đối soát.',
 customer_session_required:'Vui lòng đăng nhập bằng tài khoản khách hàng đang hoạt động.'})[error?.message] || 'Không thể xử lý yêu cầu. Vui lòng thử lại hoặc liên hệ cửa hàng.';}
function heading(title){return `<div class="step-header"><h2>${title}</h2></div>`;}
function field(id,label,type='text',extra=''){return `<div class="form-group"><label for="${id}">${label} <span class="required">*</span></label><input id="${id}" type="${type}" required ${extra}><span class="field-error" id="${id}Error" role="alert"></span></div>`;}
function navigation(step,nextLabel='Tiếp theo'){return `<div class="step-actions">${step>1?`<button type="button" class="btn-step-back btn-green-outline" id="step${step}Back">Quay lại</button>`:''}<button type="button" class="btn-step-next btn-cta" id="step${step}Next">${nextLabel}</button></div>`;}
function show(step){
 if(state.disposed)return;
 state.step=step;document.documentElement.className=document.documentElement.className.replace(/booking-pre-step-\d/g,'').trim();
 for(let n=1;n<=4;n++){el('step'+n).classList.toggle('active',n===step);el('step'+n).style.display=n===step?'block':'none';}
 document.querySelectorAll('[data-booking-hold]').forEach(placeHoldBanner);
 document.querySelectorAll('#bookingStepper .step').forEach(node=>{const n=Number(node.dataset.step);node.classList.toggle('active',n===step);node.classList.toggle('completed',n<step);node.setAttribute('aria-current',n===step?'step':'false');});summary();
}
function bindStepper(){document.querySelectorAll('#bookingStepper .step').forEach(node=>{const navigate=()=>{const n=Number(node.dataset.step);if(n<state.step&&!state.busy)show(n);};node.onclick=navigate;node.onkeydown=event=>{if(event.key==='Enter')navigate();};});}
function summary(){
 if(state.disposed)return;
 const selectedStart=state.quote?.start_at || (state.step>=3?el('bookingStart')?.value:null);
 const row=(label,value,empty=false)=>`<div class="booking-recap-row"><dt>${label}</dt><dd${empty?' class="recap-placeholder"':''}>${escape(value)}</dd></div>`;
 el('bookingSummary').innerHTML=`<div class="summary-card booking-recap"><h4 class="summary-title">Tóm tắt đặt lịch</h4><div class="summary-content">
 <dl class="booking-recap-list">
 ${row('Bé cưng',state.pet?.name || 'Chưa chọn',!state.pet)}
 ${state.pet?row('Thông tin bé',[state.pet.species,Number(state.pet.weight)>0?state.pet.weight+' kg':null].filter(Boolean).join(' · ')):''}
 ${row('Dịch vụ',state.service?.name || 'Chưa chọn',!state.service)}
 ${selectedStart?row('Lịch hẹn',date(selectedStart)):''}
 ${state.quote?row('Kết thúc dự kiến',date(state.quote.end_at)):''}
 ${state.service?.category==='grooming_spa'?row('Nhân viên',state.preferredStaff?.name||'PawPal tự sắp xếp'):''}
 </dl><div class="booking-recap-total"><span>Tổng tiền dự kiến</span><strong>${state.quote?money(state.quote.total):'Chưa có báo giá'}</strong>${!state.quote?'<small>Chọn ngày giờ để xem giá chính xác.</small>':''}</div>
 <p class="booking-recap-notice">Chưa thu tiền khi gửi yêu cầu. Cửa hàng sẽ xác nhận lịch${state.preferredStaff?' và nhân viên phụ trách':''}.</p></div></div>`;
}
function autocomplete(id,rows,label,onSelect){
 const input=el(id),list=el(id+'Options');let matches=[];
 const hide=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');};
 const render=()=>{
  const search=input.value.trim().toLocaleLowerCase('vi');matches=rows().filter(row=>label(row).toLocaleLowerCase('vi').includes(search));
  list.innerHTML=matches.length?matches.map((row,i)=>`<button type="button" class="booking-entity-option" role="option" data-index="${i}">${escape(label(row))}</button>`).join(''):'<p class="p-3 m-0">Không có lựa chọn phù hợp.</p>';
  list.hidden=false;input.setAttribute('aria-expanded','true');
  list.querySelectorAll('[data-index]').forEach(button=>button.addEventListener('click',()=>{const row=matches[Number(button.dataset.index)];input.value=label(row);hide();onSelect(row);}));
 };
 input.addEventListener('focus',render);input.addEventListener('input',()=>{onSelect(null);render();});
 input.addEventListener('keydown',e=>{if(e.key==='Escape')hide();if(e.key==='ArrowDown'){e.preventDefault();list.querySelector('button')?.focus();}if(e.key==='Enter'&&!list.hidden&&matches.length===1){e.preventDefault();input.value=label(matches[0]);hide();onSelect(matches[0]);}});
 list.addEventListener('keydown',e=>{if(e.key==='Escape')hide();const options=[...list.querySelectorAll('button')],i=options.indexOf(document.activeElement);if(options.length&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();options[(i+(e.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus();}});
 document.addEventListener('click',e=>{if(!input.parentElement.contains(e.target))hide();});
}
function picker(id,label){return `<div class="form-group booking-entity-wrapper"><label for="${id}">${label} <span class="required">*</span></label><input id="${id}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="${id}Options" aria-expanded="false"><div id="${id}Options" class="booking-entity-options" role="listbox" hidden></div><span class="field-error" id="${id}Error" role="alert"></span></div>`;}
function bookingContactPhone(){return String(state.contactPhone??state.profile?.phone??'').trim();}
function validateBookingContactPhone(){
 const valid=/^[+]?[0-9]{8,15}$/.test(bookingContactPhone());
 const input=el('bookingContactPhone'),error=el('bookingContactPhoneError');
 input?.setAttribute('aria-invalid',String(!valid));if(error)error.textContent=valid?'':'Vui lòng nhập số điện thoại liên hệ hợp lệ, từ 8 đến 15 chữ số.';
 if(!valid)input?.focus();return valid;
}
function renderPets(){
 if(state.disposed)return;
 if(state.guest)return renderGuestPets({root:el('step1'),db,context:state.guestContext,breeds:state.breeds,species:state.species,
  onChoose:pet=>{state.pet=pet;state.service=null;state.room=null;state.quote=null;summary();},
  onNext:()=>{renderServices();show(2);},onContext:context=>{state.guestContext=context;state.profile=context.contact;}});
 el('step1').innerHTML=heading('Chọn bé cưng')+`<div class="booking-owner"><span>Thông tin chủ nuôi</span><strong>${escape(state.profile?.name || 'Chưa cập nhật tên')}</strong><span>${escape(state.profile?.phone || '')}${state.profile?.email?' · '+escape(state.profile.email):''}</span><a href="/user#profile">Cập nhật thông tin</a></div><div class="booking-pet-cards" role="group" aria-label="Chọn bé cưng">${state.pets.map(p=>`<button type="button" class="booking-pet-card" data-pet="${escape(p.id)}" aria-pressed="false"><strong>${escape(p.name)}</strong><span>${escape([p.species,p.breed].filter(Boolean).join(' · '))}</span><span>${Number(p.weight)>0?escape(p.weight)+' kg':'Chưa có cân nặng'}</span>${p.allergy?`<small>Dị ứng: ${escape(p.allergy)}</small>`:''}${p.safety_note?`<small>${escape(p.safety_note)}</small>`:''}</button>`).join('')}</div><p id="bookingPetSelected" class="field-note"></p><p><a href="/user#pets">Thêm hoặc cập nhật hồ sơ bé cưng</a></p>`+navigation(1);
 el('step1').querySelectorAll('[data-pet]').forEach(btn=>btn.onclick=()=>{
  state.pet=state.pets.find(p=>p.id===btn.dataset.pet);state.service=null;state.quote=null;state.room=null;
  el('step1').querySelectorAll('[data-pet]').forEach(b=>{b.classList.toggle('selected',b===btn);b.setAttribute('aria-pressed',String(b===btn));});
  el('bookingPetSelected').textContent=Number(state.pet.weight)>0?'':'Bé chưa có cân nặng. Cần cập nhật hồ sơ trước khi chọn dịch vụ tắm, cắt tỉa hoặc đưa đón.';
  el('step1Next').disabled=false;summary();
 });
 const contact=document.createElement('div');contact.className='booking-form';contact.innerHTML=field('bookingContactPhone','Số điện thoại liên hệ','tel',`inputmode="tel" autocomplete="tel" maxlength="16" value="${escape(bookingContactPhone())}"`)+ '<p class="field-note">Có thể dùng số của người đưa bé đi. Số này chỉ áp dụng cho lịch hẹn đang đặt.</p>';
 el('step1').querySelector('.booking-owner').after(contact);
 el('bookingContactPhone').oninput=event=>{state.contactPhone=event.target.value;state.quote=null;validateBookingContactPhone();};
 el('step1Next').disabled=!state.pet;el('step1Next').onclick=()=>{if(state.pet&&validateBookingContactPhone()){renderServices();show(2);}};
 const ownerLink=el('step1').querySelector('.booking-owner a');
 ownerLink.href='#';ownerLink.onclick=event=>{event.preventDefault();openInline('owner');};
 const oldLink=el('step1').querySelector('a[href="/user#pets"]');
 oldLink.parentElement.innerHTML='<div class="booking-inline-tools"><button type="button" class="btn-green-outline" id="bookingAddPet">Thêm bé cưng</button><button type="button" class="btn-green-outline" id="bookingEditPet" disabled>Cập nhật bé đã chọn</button></div>';
 const host=document.createElement('div');host.id='bookingInlineHost';el('step1').querySelector('.step-actions').before(host);
 host.addEventListener('click',event=>{if(event.target.closest('#bookingInlineCancel'))el('step1Next').disabled=!state.pet;});
 el('bookingAddPet').onclick=()=>openInline('new');el('bookingEditPet').onclick=()=>openInline('pet');
 async function refreshed(selectedId){
  const [profile,pets]=await Promise.all([rpc('customer_profile_snapshot'),rpc('own_booking_pets')]);
  state.profile=profile;state.pets=pets;state.pet=pets.find(p=>p.id===selectedId)||null;state.quote=null;state.service=null;
  renderPets();if(state.pet)el('step1').querySelector(`[data-pet="${state.pet.id}"]`)?.click();summary();
 }
 function openInline(kind){
  if(document.querySelector('.booking-owner-modal'))return;
  if(host.querySelector('#bookingInlineSave:disabled'))return;
  if(kind==='pet'&&!state.pet)return;
  el('step1Next').disabled=true;
  const onClose=()=>{el('step1Next').disabled=!state.pet;};
  const task=kind==='owner'?editBookingOwner(host,db,()=>refreshed(state.pet?.id),onClose):editBookingPet(host,db,kind==='pet'?state.pet:null,id=>refreshed(id),onClose);
  task.catch(error=>{host.textContent=message(error);});
 }
 el('step1').querySelectorAll('[data-pet]').forEach(btn=>btn.addEventListener('click',()=>{el('bookingEditPet').disabled=false;}));
 if(state.pet)el('step1').querySelector(`[data-pet="${state.pet.id}"]`)?.click();
}
function renderServices(){
 clearHold();
 state.service=null;state.quote=null;
 el('step2').innerHTML=heading('Chọn dịch vụ')+`<div class="booking-form"><label for="bookingServiceSearch">Tìm dịch vụ cho ${escape(state.pet.name)}</label><input id="bookingServiceSearch" type="search" placeholder="Tên gói hoặc nhu cầu chăm sóc"><div class="booking-service-filters"><button type="button" data-category="all" class="active">Tất cả</button>${Object.entries(categories).map(([key,label])=>`<button type="button" data-category="${key}">${label}</button>`).join('')}</div><div id="bookingServiceCards" class="booking-service-cards"></div><div id="bookingAddons"></div><p id="bookingServiceSelected" class="field-note"></p></div>`+navigation(2);
 const choose=service=>{
  state.service=service;state.quote=null;state.room=null;el('step2Next').disabled=!service;el('bookingServiceSelected').textContent=service?`${categories[service.category] || ''} · ${service.duration_label || service.duration+' phút'} · ${service.description || ''}`:'';
  el('bookingAddons').innerHTML=(service?.addons || []).map(a=>`<label class="d-block my-3"><input type="checkbox" class="booking-addon" value="${escape(a.id)}" ${a.required?'checked disabled':''}> ${escape(a.name)} · ${money(a.price)}${a.required?' <span class="required">*</span>':''}</label>`).join('');summary();
 };
 const supported=()=>state.catalog.services.filter(s=>(s.species_ids || []).includes(state.pet.species_id));
 let category='all';
 const renderCards=()=>{
  const search=el('bookingServiceSearch').value.trim().toLocaleLowerCase('vi');
  const list=supported().filter(s=>(category==='all'||s.category===category)&&[s.name,s.description].join(' ').toLocaleLowerCase('vi').includes(search));
  el('bookingServiceCards').innerHTML=list.map(s=>{const missing=!state.guest&&s.category!=='pet_hotel'&&!(Number(state.pet.weight)>0);return `<button type="button" class="booking-service-card ${state.service?.id===s.id?'selected':''}" data-service="${escape(s.id)}" ${missing?'disabled':''} aria-pressed="${state.service?.id===s.id}"><span>${escape(categories[s.category] || '')} · ${s.duration} phút</span><strong>${escape(s.name)}</strong><small>${escape(s.description || '')}</small>${missing?'<span class="field-error">Cần cập nhật cân nặng cho bé</span>':''}</button>`;}).join('') || '<p>Không có dịch vụ phù hợp với loài của bé và bộ lọc này.</p>';
  el('bookingServiceCards').querySelectorAll('[data-service]').forEach(btn=>btn.onclick=()=>{choose(supported().find(s=>s.id===btn.dataset.service));renderCards();});
 };
 el('bookingServiceSearch').oninput=renderCards;
 el('step2').querySelectorAll('[data-category]').forEach(btn=>btn.onclick=()=>{category=btn.dataset.category;el('step2').querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b===btn));renderCards();});
 const params=new URLSearchParams(location.search),preferred=params.get('service') || params.get('serviceId') || params.get('id');
 const preset=supported().find(s=>[s.id,s.code,s.code.replace(/^SVC-/,'').replaceAll('-','').replace(/^TAX/,'TXI')].includes(preferred));
 if(preset && (state.guest||preset.category==='pet_hotel'||Number(state.pet.weight)>0))choose(preset);
 renderCards();
 el('step2Back').onclick=()=>show(1);el('step2Next').disabled=!state.service;el('step2Next').onclick=()=>{if(state.service){renderSchedule();show(3);}};
}
function renderSchedule(){
 clearInterval(availabilityPollTimer);
 clearHold();
 const kind=state.service.category;state.quote=null;state.room=null;state.preferredStaff=null;state.availability=null;
 el('step3').innerHTML=heading(kind==='grooming_spa'?'Chọn lịch và nhân viên':'Chọn lịch hẹn')+`<form class="booking-form" id="bookingScheduleForm" onsubmit="return false;">${field('bookingStart','Thời gian bắt đầu','datetime-local')}
 ${kind==='pet_hotel'?`${field('bookingEnd','Thời gian trả phòng','datetime-local')}${picker('bookingRoom','Phòng')}<div class="form-group"><label for="bookingDiet">Chế độ ăn</label><textarea id="bookingDiet" rows="2" maxlength="4000"></textarea></div><div class="form-group"><label for="bookingCare">Lưu ý lưu trú</label><textarea id="bookingCare" rows="2" maxlength="4000"></textarea></div>`:''}
 ${kind==='pet_taxi'?`${field('bookingPickup','Địa chỉ đón','text','maxlength="1000"')}${field('bookingDropoff','Địa chỉ trả','text','maxlength="1000"')}${field('bookingDistance','Quãng đường dự kiến mỗi lượt (km)','number','min="0.01" step="0.01"')}<div class="form-group"><label for="bookingTrip">Hành trình</label><select id="bookingTrip"><option value="one_way">Một chiều</option><option value="round_trip">Khứ hồi</option></select></div><div id="bookingReturnGroup" hidden>${field('bookingReturn','Thời gian lượt về','datetime-local')}</div>`:''}
 <div class="form-group"><label for="bookingNote">Ghi chú cho cửa hàng</label><textarea id="bookingNote" rows="3" maxlength="4000"></textarea></div><p class="field-error" role="alert" id="bookingQuoteError"></p></form>`+navigation(3,'Xem giá và xác nhận');
 const scheduleForm=el('bookingScheduleForm');
 const spaSlots=kind==='grooming_spa';
 if(spaSlots){
  el('step3Next').disabled=true;
  el('bookingStart').closest('.form-group').hidden=true;
  scheduleForm.insertAdjacentHTML('afterbegin',field('bookingDay','Ngày hẹn','date'));
  el('bookingDay').min=vietnamDateTimeInput(Date.now()).slice(0,10);
  el('bookingDay').value=el('bookingDay').min;
 }
 for(const input of scheduleForm.querySelectorAll('input,textarea')){
  let error=el(input.id+'Error');if(!error){error=document.createElement('span');error.id=input.id+'Error';error.className='field-error';error.setAttribute('aria-live','polite');input.after(error);}
  input.setAttribute('aria-describedby',error.id);input.setAttribute('aria-invalid','false');
 }
 scheduleForm.addEventListener('submit',e=>e.preventDefault());scheduleForm.addEventListener('input',event=>{state.quote=null;el('bookingQuoteError').textContent='';const input=event.target,error=el(input.id+'Error');if(error){error.textContent='';input.setAttribute('aria-invalid','false');}});
 if(kind==='pet_hotel')autocomplete('bookingRoom',()=>state.catalog.rooms.filter(r=>r.service_id===state.service.id),r=>`${r.name} · ${r.type} · ${money(r.daily_price)}/${r.billing_minutes===60?'giờ':'ngày'}`,room=>{state.room=room;state.quote=null;if(room){el('bookingRoom').setAttribute('aria-invalid','false');el('bookingRoomError').textContent='';}});
 if(kind==='pet_taxi')el('bookingTrip').onchange=()=>{const back=el('bookingTrip').value==='round_trip';el('bookingReturnGroup').hidden=!back;el('bookingReturn').required=back;if(!back){el('bookingReturn').value='';el('bookingReturn').setAttribute('aria-invalid','false');el('bookingReturnError').textContent='';}state.quote=null;};
 if(kind==='pet_taxi'&&state.service.trip_type){el('bookingTrip').value=state.service.trip_type;el('bookingTrip').disabled=true;el('bookingTrip').onchange();}
 el('step3Back').onclick=()=>show(2);el('step3Next').onclick=loadQuote;
 el('bookingStart').min=vietnamDateTimeInput(Date.now());
 const availability=document.createElement('div');availability.className='booking-availability';
 availability.innerHTML='<button type="button" class="btn-green-outline" id="bookingCheckSlots">Xem giờ có thể đặt</button><p id="bookingAvailabilityMessage" class="field-note" aria-live="polite">Bạn có thể gửi yêu cầu trước; cửa hàng sẽ duyệt lịch và phân nhân viên sau.</p><div id="bookingDaySlots" class="booking-day-slots"></div><p id="bookingHoldFeedback" class="field-note" role="status"></p><div id="bookingStaffPreferences"></div>';
 el('bookingNote').closest('.form-group').before(availability);
 let version=0;
 const resetAvailability=()=>{++version;clearHold();state.preferredStaff=null;state.availability=null;state.quote=null;state.details=null;el('bookingDaySlots').replaceChildren();el('bookingStaffPreferences').replaceChildren();if(spaSlots){el('bookingStart').value='';el('step3Next').disabled=true;}summary();};
 el('bookingScheduleForm').addEventListener('booking-time-expired',()=>{resetAvailability();el('bookingCheckSlots').onclick();});
 el('bookingScheduleForm').addEventListener('booking-hold-expired',()=>{resetAvailability();el('bookingCheckSlots').onclick();});
 el('bookingScheduleForm').addEventListener('input',event=>{if(!['bookingNote'].includes(event.target.id))resetAvailability();});
 el('bookingCheckSlots').onclick=async()=>{
  const payload=details(true);if(!payload)return;
  const request=++version,button=el('bookingCheckSlots');button.disabled=true;
  el('bookingAvailabilityMessage').textContent='Đang kiểm tra giờ làm việc và lịch đã đặt…';
  try{
   const day=spaSlots?el('bookingDay').value:el('bookingStart').value.slice(0,10);
   const result=state.guest?(await guestCommerce.request('booking-slots',{details:payload,day})).availability:await rpc('own_booking_day_slots',{p_details:payload,p_day:day});
   if(request!==version)return;
   if(spaSlots)result.slots=(result.slots||[]).filter(slot=>new Date(slot.start_at).getTime()>Date.now()+7200000).map(slot=>({...slot,available:slot.available&&Boolean(slot.staff?.length)}));
   const slots=result.slots||[],availableCount=slots.filter(slot=>slot.available).length;
   const noStaff=slots.some(slot=>slot.reason==='no_scheduled_staff'),hasRequests=slots.some(slot=>slot.staff?.some(person=>person.requires_confirmation));
   el('bookingAvailabilityMessage').textContent=availableCount
    ?`Giờ phục vụ ${result.open}–${result.close}. ${hasRequests?'Có giờ nhận yêu cầu; các giờ chưa phân ca cần cửa hàng xác nhận nhân viên.':`Có ${availableCount} khung giờ khả dụng; lịch sẽ được kiểm tra lại khi xác nhận.`}`
    :noStaff?'Ngày này chưa có nhân viên được phân ca phù hợp với dịch vụ. Vui lòng chọn ngày khác hoặc liên hệ cửa hàng để được sắp xếp.':`Ngày này không còn khung giờ phù hợp với thời lượng dịch vụ trong giờ phục vụ ${result.open}–${result.close}. Vui lòng chọn ngày khác.`;
   if(spaSlots){
    const staffRoot=el('bookingStaffPreferences'),slotsRoot=el('bookingDaySlots');
    slotsRoot.classList.remove('booking-day-slots');
    slotsRoot.before(staffRoot);
    renderStaffSlots({staffRoot,slotsRoot,slots,isCurrent:()=>request===version,onInvalidTime:rejectInvalidBookingTime,
     onClear:({staff,slot})=>{clearHold();state.preferredStaff=staff;state.availability=slot;state.quote=null;el('bookingStart').value=slot?vietnamDateTimeInput(slot.start_at):'';el('bookingHoldFeedback').textContent='';el('bookingQuoteError').textContent='';el('step3Next').disabled=true;summary();},
     onSelect:async({staff,slot})=>{
      const payload=details(),id=crypto.randomUUID();if(!payload)return false;
      el('bookingHoldFeedback').textContent='Đang giữ chỗ trong 15 phút…';
      try{
       const held=state.guest?(await guestCommerce.request('booking-hold',{requestId:id,details:payload})).hold:await rpc('hold_own_service_booking',{p_id:id,p_details:payload});
       if(request!==version||state.preferredStaff!==staff||state.availability!==slot){
        if(state.guest)await guestCommerce.request('booking-release',{requestId:id});else await rpc('release_own_booking_hold',{p_id:id});return false;
       }
       state.hold={id:held.id,deadline:Date.now()+new Date(held.expires_at).getTime()-new Date(held.server_now).getTime()};renderHold();el('bookingQuoteError').textContent='';el('bookingHoldFeedback').textContent='';
       return true;
      }catch(error){if(request!==version)return false;el('bookingHoldFeedback').textContent='';if(invalidTimeError(error))rejectInvalidBookingTime();else{el('bookingQuoteError').textContent=message(error);el('bookingHoldFeedback').textContent='Chưa giữ được chỗ. '+message(error);}return false;}
      finally{if(request===version)el('step3Next').disabled=!state.hold;}
     }
    });
    return;
   }
   el('bookingDaySlots').innerHTML=(result.slots||[]).map((slot,index)=>`<button type="button" data-slot="${index}" ${slot.available?'':'disabled'} title="${slot.available?'Còn khả dụng':escape(message({message:slot.reason}))}">${new Date(slot.start_at).toLocaleTimeString('vi-VN',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'})}</button>`).join('') || '<p>Không còn giờ khả dụng trong ngày này.</p>';
   el('bookingDaySlots').querySelectorAll('[data-slot]').forEach(btn=>btn.onclick=()=>{
    if(new Date(result.slots[Number(btn.dataset.slot)].start_at).getTime()<=Date.now()){rejectInvalidBookingTime();return;}
    clearHold();
    if(spaSlots)el('step3Next').disabled=true;
    const slot=result.slots[Number(btn.dataset.slot)];el('bookingStart').value=vietnamDateTimeInput(slot.start_at);
    state.availability=slot;state.preferredStaff=null;state.quote=null;
    el('bookingDaySlots').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===btn));
    const staff=slot.staff||[];
    el('bookingStaffPreferences').innerHTML=kind==='grooming_spa'?`<p class="booking-staff-label">Chọn nhân viên</p><p class="field-note">Các nhân viên dưới đây đủ điều kiện và còn trống trong giờ đã chọn. Cửa hàng xác nhận phân công cuối cùng.</p><div class="booking-staff-options"><button type="button" data-staff="" class="selected" aria-pressed="true">PawPal tự sắp xếp</button><button type="button" data-random-staff>Chọn ngẫu nhiên</button>${staff.map(s=>`<button type="button" data-staff="${escape(s.id)}" aria-pressed="false">${escape(s.name)}</button>`).join('')}</div><p id="bookingStaffChoice" class="field-note" aria-live="polite">Bạn không cần chọn nhân viên; PawPal sẽ sắp xếp người phù hợp.</p>`:'<p class="field-note">Cửa hàng sắp xếp nhân viên phù hợp cho dịch vụ này.</p>';
    const chooseStaff=async id=>{
     clearHold();
     state.preferredStaff=staff.find(s=>s.id===id)||null;state.quote=null;
     el('bookingStaffPreferences').querySelectorAll('[data-staff]').forEach(b=>{const selected=b.dataset.staff===(id||'');b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
     el('bookingStaffChoice').textContent=state.preferredStaff?`Nhân viên ưu tiên: ${state.preferredStaff.name}.`:'Bạn có thể đặt lịch trước. PawPal sẽ duyệt lịch và phân nhân viên sau.';
     summary();
     if(spaSlots&&state.preferredStaff){
      const chosen=state.preferredStaff,payload=details(),id=crypto.randomUUID();if(!payload)return;
      el('step3Next').disabled=true;
      el('bookingStaffPreferences').querySelectorAll('button').forEach(button=>button.disabled=true);
      try{
       const held=state.guest?(await guestCommerce.request('booking-hold',{requestId:id,details:payload})).hold:await rpc('hold_own_service_booking',{p_id:id,p_details:payload});
       if(request!==version||state.preferredStaff!==chosen||el('bookingStart').value!==vietnamDateTimeInput(slot.start_at)){
        if(state.guest)await guestCommerce.request('booking-release',{requestId:id});else await rpc('release_own_booking_hold',{p_id:id});return;
       }
       state.hold={id:held.id,deadline:Date.now()+new Date(held.expires_at).getTime()-new Date(held.server_now).getTime()};renderHold();
      }catch(error){el('bookingStaffChoice').textContent=message(error);}
      finally{el('step3Next').disabled=!state.hold;el('bookingStaffPreferences').querySelectorAll('button').forEach(button=>button.disabled=false);}
     }
    };
    el('bookingStaffPreferences').querySelectorAll('[data-staff]').forEach(b=>b.onclick=()=>chooseStaff(b.dataset.staff));
    const random=el('bookingStaffPreferences').querySelector('[data-random-staff]');
    if(spaSlots){
     const automatic=el('bookingStaffPreferences').querySelector('[data-staff=""]');automatic?.remove();
     el('bookingStaffChoice').textContent=staff.length?'Chọn nhân viên để giữ chỗ trong 15 phút.':'Không còn nhân viên trống. Vui lòng chọn giờ khác.';
    }
    if(random){random.disabled=!staff.length;random.onclick=()=>{const chosen=staff[Math.floor(Math.random()*staff.length)];if(chosen)chooseStaff(chosen.id);};if(!staff.length)el('bookingStaffChoice').textContent='Chưa có nhân viên được phân ca cho giờ này. Bạn vẫn có thể gửi yêu cầu; PawPal sẽ duyệt và phân nhân viên sau.';}
    summary();
   });
  }catch(error){if(request===version)el('bookingAvailabilityMessage').textContent=message(error);}finally{button.disabled=false;}
 };
 if(spaSlots){
  el('bookingDay').addEventListener('change',()=>el('bookingCheckSlots').click());el('bookingCheckSlots').click();
  availabilityPollTimer=setInterval(()=>{
   // Do not replace a selection or a lease while its owner is interacting with it.
   if(!document.hidden&&!state.disposed&&state.step===3&&!state.busy&&!state.hold&&!state.availability&&!state.preferredStaff&&!el('bookingCheckSlots')?.disabled)el('bookingCheckSlots')?.click();
  },15000);
 }
}
function details(forSlots=false){
 if(!state.guest&&!validateBookingContactPhone())return null;
 let valid=true;
 const messages={bookingStart:'Vui lòng chọn thời gian bắt đầu trong tương lai.',bookingEnd:'Vui lòng chọn thời gian trả phòng sau khi nhận phòng.',bookingPickup:'Vui lòng nhập địa chỉ đón, tối đa 1.000 ký tự.',bookingDropoff:'Vui lòng nhập địa chỉ trả, tối đa 1.000 ký tự.',bookingDistance:'Vui lòng nhập quãng đường từ 0,01 km, tối đa hai chữ số thập phân.',bookingReturn:'Vui lòng chọn thời gian lượt về sau lượt đi.'};
 const fail=(id,text)=>{el(id).setAttribute('aria-invalid','true');el(id+'Error').textContent=text;valid=false;};
 for(const input of el('bookingScheduleForm').querySelectorAll('input,textarea')){
  const hidden=Boolean(input.closest('[hidden]')),value=input.value.trim(),okay=hidden||Boolean(input.checkValidity()&&(!input.required||value)&&(input.maxLength<0||input.value.length<=input.maxLength));
  input.setAttribute('aria-invalid',okay?'false':'true');el(input.id+'Error').textContent=okay?'':messages[input.id]||'Nội dung không được vượt quá 4.000 ký tự.';if(!okay)valid=false;
 }
 if(state.service.category==='pet_hotel'&&!state.room)fail('bookingRoom','Vui lòng chọn phòng từ danh sách.');
 const times={bookingStart:parseVietnamDateTimeInput(forSlots?(el('bookingDay')?.value||el('bookingStart').value.slice(0,10))+'T12:00':el('bookingStart').value)};
 if(state.service.category==='pet_hotel')times.bookingEnd=parseVietnamDateTimeInput(el('bookingEnd').value);
 if(state.service.category==='pet_taxi'&&el('bookingTrip').value==='round_trip')times.bookingReturn=parseVietnamDateTimeInput(el('bookingReturn').value);
 for(const [id,value]of Object.entries(times))if(!value)fail(id,'Vui lòng nhập ngày giờ hợp lệ theo giờ Việt Nam.');
 if(!forSlots&&times.bookingStart&&times.bookingStart.getTime()<=Date.now()+(state.service.category==='grooming_spa'?7200000:0)){rejectInvalidBookingTime();return null;}
 if(times.bookingEnd&&times.bookingStart&&times.bookingEnd<=times.bookingStart)fail('bookingEnd',messages.bookingEnd);
 if(times.bookingReturn&&times.bookingStart&&times.bookingReturn<=times.bookingStart)fail('bookingReturn',messages.bookingReturn);
 if(!valid){el('bookingScheduleForm').querySelector('[aria-invalid="true"]:not([hidden])')?.focus();return null;}
 const payload={pet_id:state.pet.id,service_id:state.service.id,scheduled_start_at:times.bookingStart.toISOString(),note:el('bookingNote').value.trim(),addon_ids:[...el('step2').querySelectorAll('.booking-addon:checked')].map(a=>a.value).sort(),preferred_staff_id:state.preferredStaff?.id||null};
 if(!state.guest)payload.contact_phone=bookingContactPhone();
 if(state.service.category==='pet_hotel')Object.assign(payload,{check_out_at:times.bookingEnd.toISOString(),room_id:state.room.id,diet_notes:el('bookingDiet').value.trim(),care_notes:el('bookingCare').value.trim()});
 if(state.service.category==='pet_taxi')Object.assign(payload,{pickup_address:el('bookingPickup').value.trim(),dropoff_address:el('bookingDropoff').value.trim(),distance_km:Number(el('bookingDistance').value),trip_type:el('bookingTrip').value,return_at:times.bookingReturn?.toISOString()||null});return payload;
}
async function loadQuote(){
 if(state.busy)return;const payload=details();if(!payload)return;state.busy=true;el('step3Next').disabled=true;
 if(state.service.category==='grooming_spa'){
  if(!state.hold||state.hold.deadline<=Date.now()){el('bookingQuoteError').textContent='Vui lòng chọn giờ và nhân viên để giữ chỗ trong 15 phút.';state.busy=false;el('step3Next').disabled=false;return;}
  payload.hold_id=state.hold.id;
 }
 try{const quote=state.guest?(await guestCommerce.request('booking-quote',{details:payload})).quote:await rpc('quote_own_service_booking',{p_details:payload});if(!quote?.version || !Number.isFinite(Number(quote.total)))throw Error('invalid_quote');state.quote=quote;if(state.guest&&Number(quote.weight)>0)state.pet.weight=Number(quote.weight);state.details=payload;renderConfirmation();show(4);}
 catch(error){if(invalidTimeError(error)){rejectInvalidBookingTime();return;}el('bookingQuoteError').textContent=message(error);const targets={scheduled_start_at:'bookingStart',check_out_at:'bookingEnd',room_id:'bookingRoom',return_at:'bookingReturn'};let first;for(const [key,text]of Object.entries(error.fields||{})){const input=el(targets[key]),feedback=el(targets[key]+'Error');if(input&&feedback&&typeof text==='string'){input.setAttribute('aria-invalid','true');feedback.textContent=text;if(!first)first=input;}}first?.focus();}finally{state.busy=false;el('step3Next').disabled=state.service.category==='grooming_spa'&&!state.hold;}
}
function renderConfirmation(){
 const q=state.quote,p=state.pet,d=state.details||{};
 const instant=Boolean(d.hold_id&&!state.preferredStaff?.requires_confirmation);
 const info=(label,value)=>`<div><dt>${label}</dt><dd>${escape(value||'Chưa cập nhật')}</dd></div>`;
 el('step4').innerHTML=heading('Xác nhận đặt lịch')+`<div class="booking-confirmation">
 <div class="booking-confirm-intro"><span>Đặt lịch cho</span><h3>${escape(p.name)}</h3><p>${escape([p.species,p.breed,Number(p.weight)>0?p.weight+' kg':null].filter(Boolean).join(' · '))}</p></div>
 <dl class="booking-confirm-info">
 ${info('Dịch vụ',state.service.name)}${info('Bắt đầu',date(q.start_at))}${info('Kết thúc dự kiến',date(q.end_at))}${info('Nhân viên',state.preferredStaff?.name||'PawPal phân công sau khi duyệt')}
 ${info('Chủ nuôi',state.profile?.name)}${info('Số điện thoại liên hệ',d.contact_phone||state.profile?.phone)}
 ${p.allergy?info('Dị ứng',p.allergy):''}${p.safety_note?info('Lưu ý về bé',p.safety_note):''}${d.note?info('Ghi chú của bạn',d.note):''}
 </dl>
 ${state.preferredStaff?.requires_confirmation?'<p class="field-note"><strong>Chờ xác nhận nhân viên</strong> · Đây là yêu cầu đặt trước. Cửa hàng chưa cam kết nhân viên và giờ hẹn cho đến khi phân ca cụ thể.</p>':''}
 <div class="booking-confirm-cost"><h4>Chi phí dự kiến</h4><div class="booking-confirm-price"><span>${escape(state.service.name)}<small>${escape(q.quantity)} × ${money(q.unit_price)}</small></span><strong>${money(Number(q.quantity)*Number(q.unit_price))}</strong></div>${q.addons.map(a=>`<div class="booking-confirm-price"><span>${escape(a.name)}</span><strong>${money(a.price)}</strong></div>`).join('')}<div class="booking-confirm-price"><span>Đặt cọc</span><strong>0 VNĐ</strong></div><div class="booking-confirm-total"><span>Tổng dự kiến</span><strong>${money(q.total)}</strong></div></div>
 <div class="booking-confirm-notice"><h4>Lưu ý về giá và tình trạng bé</h4><p>Giá dự kiến được tính theo dịch vụ, cân nặng và thông tin hồ sơ hiện tại. Khi tiếp nhận, cửa hàng sẽ cân và kiểm tra trực tiếp tình trạng lông, da, sức khỏe, tập tính cùng các đặc điểm cần chăm sóc của bé.</p><p>Nếu có chênh lệch cân nặng hoặc cần xử lý thêm, cửa hàng sẽ thông báo chi phí để bạn xác nhận trước khi thực hiện.</p><p>${instant?'Không thu tiền đặt cọc. Lịch hẹn và nhân viên được xác nhận khi bạn hoàn tất đặt lịch.':'Gửi yêu cầu chưa thu tiền và chưa phải lịch đã được duyệt. Cửa hàng sẽ liên hệ xác nhận lịch và phân nhân viên.'}</p></div>
 <label class="policy-checkbox"><input id="policyCheck" type="checkbox"><span>Tôi đã kiểm tra thông tin đặt lịch và đọc lưu ý về giá dự kiến.</span></label><p class="field-error" role="alert" id="bookingSubmitError"></p></div><div class="step-actions booking-confirm-actions"><button type="button" class="btn-step-back btn-green-outline" id="step4Back">Quay lại</button><button type="button" class="btn-cta" id="confirmBookingBtn" disabled>${instant?'Xác nhận đặt lịch':'Gửi yêu cầu đặt lịch'}</button></div>`;
 el('policyCheck').onchange=()=>{el('confirmBookingBtn').disabled=!el('policyCheck').checked||!state.quote||(d.hold_id&&(!state.hold||state.hold.deadline<=Date.now()));};el('step4Back').onclick=()=>show(3);el('confirmBookingBtn').onclick=submit;
}
async function submit(){
 if(state.busy||!state.quote||!el('policyCheck').checked)return;
 if(state.details?.hold_id&&(!state.hold||state.hold.deadline<=Date.now())){el('bookingSubmitError').textContent='Đã hết thời gian giữ chỗ. Vui lòng quay lại chọn giờ và nhân viên.';return;}
 state.busy=true;
 const btn=el('confirmBookingBtn');
 const originalLabel=btn.textContent;
 btn.disabled=true;
 el('step4Back').disabled=true;
 btn.textContent='Đang đặt lịch...';
 try{
  if(state.guest){
   sessionStorage.setItem(journalKey,requestId);
   try{const prior=await guestCommerce.request('booking-receipt',{requestId});await renderBookingReceipt(document.querySelector('.booking-main'),prior.booking.id);return;}catch(error){if(error.status!==404)throw error;}
   const result=await guestCommerce.request('booking-create',{requestId,expectedQuote:state.quote.version,details:state.details});
   if(result.bookingId!==requestId)throw Error('missing_acknowledgement');
   await renderBookingReceipt(document.querySelector('.booking-main'),requestId);return;
  }
  const id=await rpc('create_own_service_booking',{p_id:requestId,p_expected_quote:state.quote.version,p_details:state.details});if(id!==requestId)throw Error('missing_acknowledgement');sessionStorage.removeItem(journalKey);location.assign(location.pathname+'?bookingSuccess='+encodeURIComponent(id));
 }
 catch(error){if(invalidTimeError(error))rejectInvalidBookingTime();else el('bookingSubmitError').textContent=message(error);btn.disabled=false;el('step4Back').disabled=false;btn.textContent=originalLabel;}finally{state.busy=false;}
}
async function renderBookingReceipt(root,id){
 if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('invalid_receipt');
 if(state.guest){
  const {booking,recoveryCode}=await guestCommerce.request('booking-receipt',{requestId:id});
  if(state.disposed||!root.isConnected)return;
  document.title='PawPal - Lịch hẹn của bạn';
  const statusLabel={pending:'Chờ xác nhận',confirmed:'Đã xác nhận',in_progress:'Đang thực hiện',completed:'Hoàn tất',cancelled:'Đã hủy',no_show:'Không đến'}[booking.status]||'Đang xử lý';
  renderTransactionReceipt(root,{
   title:booking.status==='cancelled'?'Lịch hẹn đã được hủy':booking.status==='confirmed'?'Đặt lịch thành công!':'PawPal đã nhận yêu cầu đặt lịch!',status:staffRequestLabel(booking.staff_request,statusLabel),
   code:booking.code,codeLabel:'Mã lịch hẹn',
   details:[['Thời gian hẹn',date(booking.start_at)],['Kết thúc dự kiến',date(booking.end_at)],['Tổng tiền dự kiến',money(booking.total)],['Đặt cọc','0 VNĐ']],
   notice:booking.status==='cancelled'?'Bạn có thể đặt lịch mới khi đã sẵn sàng.':booking.status==='confirmed'?'Lịch hẹn đã được xác nhận. Cửa hàng sẽ cân lại bé và xác nhận chi phí trước khi thực hiện.':'Bạn chưa cần thanh toán lúc này. Cửa hàng sẽ liên hệ để xác nhận lịch và chuẩn bị đón bé.',
   lookupHref:'/return-guest?'+new URLSearchParams({booking:id}),lookupLabel:'Theo dõi lịch hẹn',
   againLabel:'Đặt lịch cho bé khác',onAgain:()=>{sessionStorage.removeItem(journalKey);location.assign('/booking');},
   activationTarget:'/user#bookings',recoveryCode,activationCreatedAt:booking.created_at,activationMessage:'Đã tạo hồ sơ tài khoản tạm cho thông tin liên hệ của bạn. Thiết lập mật khẩu và xác thực số điện thoại để nhận 50 Paw Points chào mừng, theo dõi lịch hẹn và lưu hồ sơ bé.'
  });
  if(booking.staff_request?.requested_staff_id){const panel=document.createElement('section');root.querySelector('.receipt-content').prepend(panel);renderBookingStaffRequest(panel,booking.staff_request,{onRespond:async(accept,revision)=>{await guestCommerce.request('booking-staff-response',{requestId:crypto.randomUUID(),bookingId:id,revision,accept});await renderBookingReceipt(root,id);}});}
  el('bookingReceiptTitle').focus();return;
 }
 const profile=await rpc('customer_profile_snapshot');
 if(state.disposed||!root.isConnected)return;
 const result=await db.from('appointment').select('id,appointment_status,scheduled_start_at,scheduled_end_at,booking_contact_phone').eq('id',id).eq('customer_id',profile.id).single();
 if(state.disposed||!root.isConnected)return;
 if(result.error||!result.data)throw Error('unverified_receipt');
 const booking=result.data,confirmed=booking.appointment_status==='confirmed',cancelled=['cancelled','da_huy'].includes(booking.appointment_status);
 const staffRequest=await rpc('own_booking_staff_request',{p_id:id});
 if(state.disposed||!root.isConnected)return;
 document.title='PawPal - Đã tiếp nhận lịch hẹn';
 root.innerHTML=`<section class="booking-receipt"><span class="booking-receipt-label">${cancelled?'Đã hủy':confirmed?'Đã xác nhận':'Đã tiếp nhận'}</span><h1 tabindex="-1" id="bookingReceiptTitle">${cancelled?'Lịch hẹn này đã được hủy':confirmed?'Chúc mừng bạn đã đặt lịch thành công!':'PawPal đã nhận yêu cầu đặt lịch!'}</h1><p>${cancelled?'Bạn có thể tạo yêu cầu đặt lịch mới.':confirmed?'Lịch hẹn đã được xác nhận và đồng bộ tới lịch vận hành của cửa hàng.':'Yêu cầu của bạn đã được lưu thành công. Cửa hàng sẽ duyệt lịch và phân công nhân viên.'}</p><dl><div><dt>Mã lịch hẹn</dt><dd>${escape(id)}</dd></div><div><dt>Thời gian hẹn</dt><dd>${date(booking.scheduled_start_at)}</dd></div><div><dt>Kết thúc dự kiến</dt><dd>${date(booking.scheduled_end_at)}</dd></div></dl><p class="booking-receipt-note">${confirmed?'Đặt cọc 0 VNĐ. Cửa hàng sẽ cân lại bé và xác nhận chi phí trước khi thực hiện.':'Đây là xác nhận đã tiếp nhận yêu cầu, chưa phải xác nhận thanh toán. Bạn có thể theo dõi trạng thái duyệt trong chi tiết lịch hẹn.'}</p><div class="booking-receipt-actions"><a class="btn-cta" href="/user#booking-detail?id=${encodeURIComponent(id)}">Xem chi tiết lịch hẹn</a><a class="btn-green-outline" href="/user#bookings">Lịch hẹn của bé</a></div></section>`;
 const contactRow=document.createElement('div'),contactLabel=document.createElement('dt'),contactValue=document.createElement('dd');contactLabel.textContent='Số điện thoại liên hệ';contactValue.textContent=booking.booking_contact_phone||profile.phone||'Chưa có thông tin';contactRow.append(contactLabel,contactValue);root.querySelector('.booking-receipt dl').append(contactRow);
 if(staffRequest?.requested_staff_id){const panel=document.createElement('section');root.querySelector('.booking-receipt').append(panel);renderBookingStaffRequest(panel,staffRequest,{onRespond:async(accept,revision)=>{await rpc('respond_own_booking_staff_request',{p_id:id,p_revision:revision,p_accept:accept});await renderBookingReceipt(root,id);}});}
 el('bookingReceiptTitle').focus();
}
async function init(){
 const root=document.querySelector('.booking-main');if(!root)return;
 root.classList.add('booking-live-form');
 const identity=()=>{
  try{const user=JSON.parse(localStorage.getItem('pawpal_current_user')||'null');return JSON.stringify([user?.id&&!user.is_temporary?user.id:null,localStorage.getItem(GUEST_IDENTITY_EPOCH)]);}
  catch{return 'unavailable';}
 };
 const initialIdentity=identity();
 const discard=(reload=true)=>{
  if(!root.isConnected)return;
  if(!state.disposed){
   clearInterval(holdTimer);clearInterval(availabilityPollTimer);if(bookingChannel)db.removeChannel(bookingChannel);state.disposed=true;state.pet=null;state.pets=[];state.profile=null;state.contactPhone=null;state.guestContext=null;state.service=null;state.quote=null;state.details=null;
   root.replaceChildren();const note=document.createElement('p');note.setAttribute('role','status');note.textContent='Đang cập nhật phiên đăng nhập…';root.append(note);
  }
  if(reload)location.reload();
 };
 const accountChanged=()=>{if(identity()!==initialIdentity)discard();};
 document.addEventListener('auth_state_changed',accountChanged);document.addEventListener('guest_session_reset',()=>{if(identity()!==initialIdentity)discard(false);});
 window.addEventListener('storage',event=>{if(event.key===GUEST_IDENTITY_EPOCH)discard(false);else if(event.key==='pawpal_current_user'||event.key===null)accountChanged();});
 window.addEventListener('pageshow',event=>{if(event.persisted)accountChanged();});
 try{
  db=window.getSupabaseClient?.() || window.SupabaseClient;if(!db)throw Error('no_database');
  const auth={data:{user:await verifyCustomerSession(db)}};
  // Notify the header after verification, without treating stale display data as an account switch.
  document.dispatchEvent(new CustomEvent('customer_session_verified'));
  if(state.disposed)return;state.authId=auth.data?.user?.id||null;
  if(state.authId&&db.channel){
   bookingChannel=db.channel('member-booking-availability').on('postgres_changes',{event:'*',schema:'public',table:'appointment'},()=>{
    if(!state.disposed&&state.step===3&&!state.hold)el('bookingCheckSlots')?.click();
   }).subscribe();
  }
  window.addEventListener('pagehide',()=>{clearInterval(holdTimer);clearInterval(availabilityPollTimer);if(bookingChannel)db.removeChannel(bookingChannel);},{once:true});
  db.auth.onAuthStateChange?.((event,session)=>{if((event==='SIGNED_OUT'&&state.authId)||(event==='SIGNED_IN'&&session?.user?.id!==state.authId))discard(false);});
  if((auth.error||!auth.data?.user)&&isGuestShopper()){
   state.guest=true;const firstStepLabel=document.querySelector('#bookingStepper [data-step="1"] .step-label');if(firstStepLabel)firstStepLabel.textContent='Thông tin đặt lịch';journalKey='pawpal_guest_booking_request_v1';const saved=sessionStorage.getItem(journalKey);requestId=/^[0-9a-f-]{36}$/i.test(saved||'')?saved:crypto.randomUUID();
   const receiptId=new URLSearchParams(location.search).get('bookingSuccess')||saved;
   if(receiptId){try{await renderBookingReceipt(root,receiptId);return;}catch(error){if(error.status!==404)throw error;}}
   const data=await loadGuestBookingContext(db);if(state.disposed)return;state.catalog=data.catalog;state.breeds=data.breeds;state.species=data.species;state.guestContext=data.context;state.profile=data.context.contact;
   renderPets();show(1);bindStepper();return;
  }
  if(auth.error||!auth.data?.user){el('step1').innerHTML=heading('Đăng nhập để đặt lịch')+'<p>Phiên đăng nhập chưa có hoặc đã hết hiệu lực. Vui lòng đăng nhập để chọn bé cưng của bạn.</p><a class="btn-cta" href="/login?redirect=%2Fbooking&reason=session-expired">Đăng nhập</a>';show(1);return;}
  journalKey='pawpal_booking_request:'+auth.data.user.id;const saved=sessionStorage.getItem(journalKey);requestId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved || '')?saved:crypto.randomUUID();sessionStorage.setItem(journalKey,requestId);
  const receiptId=new URLSearchParams(location.search).get('bookingSuccess');
  if(receiptId){try{await renderBookingReceipt(root,receiptId);}catch(error){root.innerHTML='<section class="booking-receipt"><h1>Chưa xác minh được lịch hẹn</h1><p>Vui lòng kiểm tra danh sách lịch hẹn trước khi gửi lại yêu cầu.</p><div class="booking-receipt-actions"><button type="button" class="btn-cta" id="bookingReceiptRetry">Thử lại</button><a class="btn-green-outline" href="/user#bookings">Lịch hẹn của bé</a></div></section>';el('bookingReceiptRetry').onclick=()=>location.reload();}return;}
  const prior=await db.from('appointment').select('id').eq('id',requestId).maybeSingle();if(state.disposed)return;if(prior.error)throw prior.error;
  if(prior.data){sessionStorage.removeItem(journalKey);el('step1').innerHTML=heading('Yêu cầu đã được tiếp nhận')+'<p>Lịch hẹn đã có trên hệ thống. Bạn không cần gửi lại yêu cầu.</p><a class="btn-cta" id="bookingRecovered" href="/user#booking-detail?id='+encodeURIComponent(prior.data.id)+'">Xem lịch hẹn</a>';show(1);return;}
  const [catalog,pets,profile]=await Promise.all([rpc('customer_service_catalog'),rpc('own_booking_pets'),rpc('customer_profile_snapshot')]);if(state.disposed)return;state.catalog=catalog;state.pets=pets;state.profile=profile;

  const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
  let cancelCount = Number(profile?.cancel_count || currentUser?.cancelCount || 0);
  try {
      const { count } = await db.from('appointment')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', profile.id)
          .in('appointment_status', ['cancelled', 'da_huy']);
      if (typeof count === 'number') cancelCount = Math.max(cancelCount, count);
  } catch (_) {}
  try {
      const localCancels = (JSON.parse(localStorage.getItem('pawpal_bookings') || '[]'))
          .filter(b => ['cancelled', 'da_huy'].includes(b.status || b.appointment_status)).length;
      cancelCount = Math.max(cancelCount, localCancels, Number(currentUser?.cancelCount || 0));
  } catch (_) {}

  if (cancelCount > 3) {
      el('step1').innerHTML = heading('Tài khoản tạm khóa đặt lịch trực tuyến') + 
          '<div class="booking-lock-notice p-4 my-3" style="background:#FFF5F5;border:1px solid #FED7D7;border-radius:9px;color:#C53030;">' +
          '<p style="margin:0 0 8px;font-weight:600;font-size:16px;">Tài khoản của bạn đã vượt quá ngưỡng hủy lịch cho phép (> 3 lần).</p>' +
          '<p style="margin:0;">Chức năng đặt lịch trực tuyến của bạn đã bị tạm khóa. Vui lòng liên hệ trực tiếp cửa hàng qua Hotline <strong>1900 1234</strong> để được nhân viên hỗ trợ sắp xếp lịch hẹn.</p>' +
          '</div>' +
          '<div class="step-actions"><a class="btn-cta" href="/user#bookings">Xem lịch hẹn của bé</a><a class="btn-green-outline" href="/contact">Liên hệ cửa hàng</a></div>';
      show(1);
      const stepper = el('bookingStepper');
      if (stepper) stepper.style.display = 'none';
      return;
  }

  renderPets();show(1);
  if(!pets.length)el('bookingPetSelected').textContent='Bạn chưa có hồ sơ bé cưng đang hoạt động. Hãy thêm hồ sơ trước khi đặt lịch.';
  document.querySelectorAll('#bookingStepper .step').forEach(node=>{const navigate=()=>{const n=Number(node.dataset.step);if(n<state.step&&!state.busy)show(n);};node.onclick=navigate;node.onkeydown=e=>{if(e.key==='Enter')navigate();};});
 }catch(error){if(state.disposed)return;el('step1').innerHTML=heading('Chưa tải được thông tin đặt lịch')+'<p role="alert" class="field-error">'+escape(message(error))+'</p><button type="button" class="btn-green-outline" id="bookingReload">Thử lại</button>';el('bookingReload').onclick=()=>location.reload();show(1);}
 finally{root.classList.remove('booking-loading');root.setAttribute('aria-busy','false');root.querySelector('.booking-skeleton')?.remove();}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
