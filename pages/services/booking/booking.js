const state={step:1,pet:null,service:null,room:null,quote:null,details:null,busy:false,pets:[],catalog:{services:[],rooms:[]}};
let db,requestId,journalKey;
const el=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>Number(value).toLocaleString('vi-VN')+' đ';
const date=value=>new Date(value).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const categories={grooming_spa:'Tắm và cắt tỉa',pet_hotel:'Khách sạn thú cưng',pet_taxi:'Đưa đón thú cưng'};
async function rpc(name,args){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data;}
function message(error){return ({service_species_not_supported:'Gói dịch vụ chưa được cấu hình hỗ trợ loài của bé. Vui lòng liên hệ cửa hàng.',
 pet_weight_required:'Vui lòng cập nhật cân nặng trong hồ sơ bé cưng trước khi xem giá.',pet_owner_mismatch:'Hồ sơ bé cưng không thuộc tài khoản đang đăng nhập.',
 active_service_required:'Gói dịch vụ hoặc phần thêm hiện không còn mở.',future_booking_required:'Vui lòng chọn thời gian trong tương lai.',
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
 state.step=step;document.documentElement.className=document.documentElement.className.replace(/booking-pre-step-\d/g,'').trim();
 for(let n=1;n<=4;n++){el('step'+n).classList.toggle('active',n===step);el('step'+n).style.display=n===step?'block':'none';}
 document.querySelectorAll('#bookingStepper .step').forEach(node=>{const n=Number(node.dataset.step);node.classList.toggle('active',n===step);node.classList.toggle('completed',n<step);node.setAttribute('aria-current',n===step?'step':'false');});summary();
}
function summary(){
 el('bookingSummary').innerHTML=`<div class="summary-card"><h4 class="summary-title">Tóm tắt đặt lịch</h4><div class="summary-content"><p>${escape(state.pet?.name || 'Chưa chọn bé cưng')}</p><p>${escape(state.service?.name || 'Chưa chọn dịch vụ')}</p>
 ${state.quote?`<p>${date(state.quote.start_at)} – ${date(state.quote.end_at)}</p><div class="summary-row price-row"><span>Tổng tiền</span><strong>${money(state.quote.total)}</strong></div>`:'<p>Giá được xác định sau khi chọn lịch.</p>'}
 <p class="field-note">Lịch mới chờ cửa hàng xác nhận. Chưa thu tiền khi gửi yêu cầu.</p></div></div>`;
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
function renderPets(){
 el('step1').innerHTML=heading('Chọn bé cưng')+`<div class="booking-form">${picker('bookingPet','Bé cưng')}<p id="bookingPetSelected" class="field-note"></p><p><a href="/user#pets">Thêm hoặc cập nhật hồ sơ bé cưng</a></p></div>`+navigation(1);
 autocomplete('bookingPet',()=>state.pets,p=>`${p.name} · ${p.species}${p.weight?' · '+p.weight+' kg':''}`,pet=>{
  state.pet=pet;state.service=null;state.quote=null;state.room=null;el('bookingPetSelected').textContent=pet?[pet.breed,pet.allergy&&'Dị ứng: '+pet.allergy,pet.safety_note].filter(Boolean).join(' · '):'';
  el('step1Next').disabled=!pet;summary();
 });
 el('step1Next').disabled=true;el('step1Next').onclick=()=>{if(state.pet){renderServices();show(2);}};
}
function renderServices(){
 state.service=null;state.quote=null;
 el('step2').innerHTML=heading('Chọn dịch vụ')+`<div class="booking-form">${picker('bookingService','Gói dịch vụ')}<div id="bookingAddons"></div><p id="bookingServiceSelected" class="field-note"></p></div>`+navigation(2);
 const choose=service=>{
  state.service=service;state.quote=null;state.room=null;el('step2Next').disabled=!service;el('bookingServiceSelected').textContent=service?`${categories[service.category] || ''} · ${service.duration} phút · ${service.description || ''}`:'';
  el('bookingAddons').innerHTML=(service?.addons || []).map(a=>`<label class="d-block my-3"><input type="checkbox" class="booking-addon" value="${escape(a.id)}" ${a.required?'checked disabled':''}> ${escape(a.name)} · ${money(a.price)}${a.required?' <span class="required">*</span>':''}</label>`).join('');summary();
 };
 const supported=()=>state.catalog.services.filter(s=>(s.species_ids || []).includes(state.pet.species_id));
 autocomplete('bookingService',supported,s=>s.name,choose);
 const params=new URLSearchParams(location.search),preferred=params.get('service') || params.get('serviceId') || params.get('id');
 const preset=supported().find(s=>[s.id,s.code].includes(preferred));
 if(preset){el('bookingService').value=preset.name;choose(preset);}
 el('step2Back').onclick=()=>show(1);el('step2Next').disabled=!state.service;el('step2Next').onclick=()=>{if(state.service){renderSchedule();show(3);}};
}
function renderSchedule(){
 const kind=state.service.category;state.quote=null;state.room=null;
 el('step3').innerHTML=heading('Chọn lịch hẹn')+`<form class="booking-form" id="bookingScheduleForm" onsubmit="return false;">${field('bookingStart','Thời gian bắt đầu','datetime-local')}
 ${kind==='pet_hotel'?`${field('bookingEnd','Thời gian trả phòng','datetime-local')}${picker('bookingRoom','Phòng')}<div class="form-group"><label for="bookingDiet">Chế độ ăn</label><textarea id="bookingDiet" rows="2" maxlength="4000"></textarea></div><div class="form-group"><label for="bookingCare">Lưu ý lưu trú</label><textarea id="bookingCare" rows="2" maxlength="4000"></textarea></div>`:''}
 ${kind==='pet_taxi'?`${field('bookingPickup','Địa chỉ đón','text','maxlength="1000"')}${field('bookingDropoff','Địa chỉ trả','text','maxlength="1000"')}${field('bookingDistance','Quãng đường dự kiến mỗi lượt (km)','number','min="0.01" step="0.01"')}<div class="form-group"><label for="bookingTrip">Hành trình</label><select id="bookingTrip"><option value="one_way">Một chiều</option><option value="round_trip">Khứ hồi</option></select></div><div id="bookingReturnGroup" hidden>${field('bookingReturn','Thời gian lượt về','datetime-local')}</div>`:''}
 <div class="form-group"><label for="bookingNote">Ghi chú cho cửa hàng</label><textarea id="bookingNote" rows="3" maxlength="4000"></textarea></div><p class="field-error" role="alert" id="bookingQuoteError"></p></form>`+navigation(3,'Xem giá và xác nhận');
 el('bookingScheduleForm').addEventListener('submit',e=>e.preventDefault());el('bookingScheduleForm').addEventListener('input',()=>{state.quote=null;el('bookingQuoteError').textContent='';});
 if(kind==='pet_hotel')autocomplete('bookingRoom',()=>state.catalog.rooms,r=>`${r.name} · ${r.type} · ${money(r.daily_price)}/ngày`,room=>{state.room=room;state.quote=null;});
 if(kind==='pet_taxi')el('bookingTrip').onchange=()=>{const back=el('bookingTrip').value==='round_trip';el('bookingReturnGroup').hidden=!back;el('bookingReturn').required=back;if(!back)el('bookingReturn').value='';state.quote=null;};
 el('step3Back').onclick=()=>show(2);el('step3Next').onclick=loadQuote;
}
function details(){
 let valid=true;
 for(const input of el('bookingScheduleForm').querySelectorAll('input[required]')){
  const error=el(input.id+'Error'),hidden=Boolean(input.closest('[hidden]')),okay=hidden || Boolean(input.checkValidity()&&input.value.trim());input.setAttribute('aria-invalid',okay?'false':'true');if(error)error.textContent=okay?'':'Vui lòng nhập thông tin hợp lệ.';if(!okay)valid=false;
 }
 if(state.service.category==='pet_hotel'&&!state.room){el('bookingRoomError').textContent='Vui lòng chọn phòng từ danh sách.';valid=false;}if(!valid)return null;
 const payload={pet_id:state.pet.id,service_id:state.service.id,scheduled_start_at:new Date(el('bookingStart').value).toISOString(),note:el('bookingNote').value.trim(),addon_ids:[...el('step2').querySelectorAll('.booking-addon:checked')].map(a=>a.value).sort()};
 if(state.service.category==='pet_hotel')Object.assign(payload,{check_out_at:new Date(el('bookingEnd').value).toISOString(),room_id:state.room.id,diet_notes:el('bookingDiet').value.trim(),care_notes:el('bookingCare').value.trim()});
 if(state.service.category==='pet_taxi')Object.assign(payload,{pickup_address:el('bookingPickup').value.trim(),dropoff_address:el('bookingDropoff').value.trim(),distance_km:Number(el('bookingDistance').value),trip_type:el('bookingTrip').value,return_at:el('bookingTrip').value==='round_trip'?new Date(el('bookingReturn').value).toISOString():null});return payload;
}
async function loadQuote(){
 if(state.busy)return;const payload=details();if(!payload)return;state.busy=true;el('step3Next').disabled=true;
 try{const quote=await rpc('quote_own_service_booking',{p_details:payload});if(!quote?.version || !Number.isFinite(Number(quote.total)))throw Error('invalid_quote');state.quote=quote;state.details=payload;renderConfirmation();show(4);}
 catch(error){el('bookingQuoteError').textContent=message(error);}finally{state.busy=false;el('step3Next').disabled=false;}
}
function renderConfirmation(){
 const q=state.quote;el('step4').innerHTML=heading('Xác nhận đặt lịch')+`<div class="booking-form"><p><strong>${escape(state.pet.name)}</strong> · ${escape(state.service.name)}</p><p>${date(q.start_at)} – ${date(q.end_at)}</p><p>Dịch vụ chính: ${q.quantity} × ${money(q.unit_price)}</p>${q.addons.map(a=>`<p>${escape(a.name)}: ${money(a.price)}</p>`).join('')}<p><strong>Tổng tiền: ${money(q.total)}</strong></p><p>Yêu cầu chờ cửa hàng xác nhận. Chưa thu tiền khi đặt lịch.</p><label class="policy-checkbox"><input id="policyCheck" type="checkbox"> Tôi xác nhận thông tin đặt lịch.</label><p class="field-error" role="alert" id="bookingSubmitError"></p></div><div class="step-actions"><button type="button" class="btn-step-back btn-green-outline" id="step4Back">Quay lại</button><button type="button" class="btn-cta" id="confirmBookingBtn" disabled>Xác nhận đặt lịch</button></div>`;
 el('policyCheck').onchange=()=>{el('confirmBookingBtn').disabled=!el('policyCheck').checked;};el('step4Back').onclick=()=>show(3);el('confirmBookingBtn').onclick=submit;
}
async function submit(){
 if(state.busy||!state.quote||!el('policyCheck').checked)return;state.busy=true;el('confirmBookingBtn').disabled=true;el('step4Back').disabled=true;
 try{const id=await rpc('create_own_service_booking',{p_id:requestId,p_expected_quote:state.quote.version,p_details:state.details});if(id!==requestId)throw Error('missing_acknowledgement');sessionStorage.removeItem(journalKey);location.assign('/user#booking-detail?id='+encodeURIComponent(id));}
 catch(error){el('bookingSubmitError').textContent=message(error);el('confirmBookingBtn').disabled=false;el('step4Back').disabled=false;}finally{state.busy=false;}
}
async function init(){
 const root=document.querySelector('.booking-main');if(!root)return;
 root.classList.add('booking-live-form');
 try{
  db=window.getSupabaseClient?.() || window.SupabaseClient;if(!db)throw Error('no_database');const auth=await db.auth.getUser();
  if(auth.error||!auth.data?.user){el('step1').innerHTML=heading('Đăng nhập để đặt lịch')+'<p>Chọn bé cưng từ hồ sơ của bạn sau khi đăng nhập.</p><a class="btn-cta" href="/login">Đăng nhập</a>';show(1);return;}
  journalKey='pawpal_booking_request:'+auth.data.user.id;const saved=sessionStorage.getItem(journalKey);requestId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved || '')?saved:crypto.randomUUID();sessionStorage.setItem(journalKey,requestId);
  const prior=await db.from('appointment').select('id').eq('id',requestId).maybeSingle();if(prior.error)throw prior.error;
  if(prior.data){sessionStorage.removeItem(journalKey);el('step1').innerHTML=heading('Yêu cầu đã được tiếp nhận')+'<p>Lịch hẹn đã có trên hệ thống. Bạn không cần gửi lại yêu cầu.</p><a class="btn-cta" id="bookingRecovered" href="/user#booking-detail?id='+encodeURIComponent(prior.data.id)+'">Xem lịch hẹn</a>';show(1);return;}
  const [catalog,pets]=await Promise.all([rpc('customer_service_catalog'),rpc('own_booking_pets')]);state.catalog=catalog;state.pets=pets;renderPets();show(1);
  if(!pets.length)el('bookingPetSelected').textContent='Bạn chưa có hồ sơ bé cưng đang hoạt động. Hãy thêm hồ sơ trước khi đặt lịch.';
  document.querySelectorAll('#bookingStepper .step').forEach(node=>{const navigate=()=>{const n=Number(node.dataset.step);if(n<state.step&&!state.busy)show(n);};node.onclick=navigate;node.onkeydown=e=>{if(e.key==='Enter')navigate();};});
 }catch(error){el('step1').innerHTML=heading('Chưa tải được thông tin đặt lịch')+'<p role="alert" class="field-error">'+escape(message(error))+'</p><button type="button" class="btn-green-outline" id="bookingReload">Thử lại</button>';el('bookingReload').onclick=()=>location.reload();show(1);}
 finally{root.classList.remove('booking-loading');root.setAttribute('aria-busy','false');root.querySelector('.booking-skeleton')?.remove();}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
