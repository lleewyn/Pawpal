// Role-specific operations live in this domain; management initialization requires verified ADMIN.
(function () {
    'use strict';
    // Both role-specific screens share this write boundary; scoped reads stay with their callers.
    async function persist(args, client = window.getSupabaseClient()) {
        const { data, error } = await client.rpc('save_admin_service_care_log', args);
        if (error) throw error;
        if (data !== args.p_id) throw Error('Không xác minh được nhật ký đã lưu.');
        return data;
    }
    const allowed=()=>window.PawpalAdminAccess?.isStaff()&&window.PawpalAdminAccess.state.user.permissions.includes('work.service.perform');
    const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(className)n.className=className;return n;};
    async function read(kind,id,page=1){const {data,error}=await getSupabaseClient().rpc('get_staff_workspace',{p_kind:kind,p_query:'',p_id:id,p_page:page});if(error)throw error;return data.items;}
    async function findLog(appointmentId,logId){for(let page=1;page<=100;page++){const rows=await read('care_logs',appointmentId,page),row=rows.find(item=>item.id===logId);if(row)return row;if(rows.length<10)return null;}throw Error('care_log_limit');}
    function localMinute(value){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));return parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute;}
    let dialog;
    function build(){
        if(dialog)return dialog;
        const overlay=el('div',null,'admin-modal-overlay staff-workspace-modal');overlay.id='staffCareLogModal';overlay.setAttribute('aria-hidden','true');
        const card=el('div',null,'admin-modal-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','staffCareLogTitle');
        const form=el('form');form.noValidate=true;form.setAttribute('onsubmit','return false;');
        const header=el('div',null,'workspace-modal-header'),title=el('h2','Ghi nhật ký chăm sóc'),close=el('button','Đóng','btn-modal-close');title.id='staffCareLogTitle';close.type='button';close.dataset.closeModal=overlay.id;header.append(title,close);
        const summary=el('p','','workspace-care-log-summary');form.append(header,summary);const fields={};
        for(const[key,text,type,required]of[['title','Công việc','text',true],['at','Thời điểm','datetime-local',true],['staff','Người ghi nhận','text',false],['note','Ghi nhận','textarea',false]]){
            const group=el('div',null,'workspace-form-field'),label=el('label',text+(required?' ':'')),input=el(type==='textarea'?'textarea':'input',null,'admin-input');input.id='staffCareLog'+key;
            if(type!=='textarea')input.type=type;else{input.rows=4;input.maxLength=4000;}if(key==='title')input.maxLength=200;if(key==='staff')input.readOnly=true;input.required=required;label.htmlFor=input.id;if(required)label.append(el('span','*','workspace-required'));group.append(label,input);form.append(group);fields[key]=input;
        }
        const mediaRoot=el('div',null,'workspace-form-field');mediaRoot.id='staffCareLogMedia';form.append(mediaRoot);
        const mediaEditor=import('/scripts/shared/care-media.mjs').then(({createCareMediaEditor})=>createCareMediaEditor({root:mediaRoot,db:window.getSupabaseClient()}));
        const message=el('p','','workspace-error');message.setAttribute('role','alert');
        const footer=el('div',null,'workspace-modal-footer'),cancel=el('button','Hủy','admin-btn admin-btn-secondary'),save=el('button','Lưu nhật ký','admin-btn admin-btn-primary');save.id='staffCareLogSave';cancel.type=save.type='button';cancel.dataset.closeModal=overlay.id;footer.append(cancel,save);form.append(message,footer);card.append(form);overlay.append(card);document.body.append(overlay);
        const state={overlay,row:null,log:null,pending:null,loading:true,saving:false,generation:0,returnFocus:null,onSaved:null};
        Object.values(fields).forEach(input=>input.addEventListener('input',()=>{if(input.getAttribute('aria-invalid')==='true'){input.removeAttribute('aria-invalid');message.textContent='';}}));
        function closeDialog(){state.generation++;void mediaEditor.then(editor=>editor.close());overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true');if(state.returnFocus?.isConnected)state.returnFocus.focus();}
        overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-close-modal="'+overlay.id+'"]'))closeDialog();});
        overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}if(event.key!=='Tab')return;const nodes=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled])')].filter(n=>n.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
        form.addEventListener('submit',event=>event.preventDefault());
        save.onclick=async()=>{
            if(state.loading||state.saving||!state.row)return;message.textContent='';Object.values(fields).forEach(input=>input.removeAttribute('aria-invalid'));
            const invalid=(key,text)=>{fields[key].setAttribute('aria-invalid','true');message.textContent=text;fields[key].focus();},name=fields.title.value.trim(),at=state.log&&fields.at.value===localMinute(state.log.recorded_at)?new Date(state.log.recorded_at):new Date(fields.at.value+':00+07:00');
            if(!name||name.length>200)return invalid('title','Nhập tên công việc từ 1 đến 200 ký tự.');
            if(!Number.isFinite(+at)||+at>Date.now())return invalid('at','Chọn thời điểm đã thực hiện, không ở tương lai.');
            if(fields.note.value.trim().length>4000)return invalid('note','Ghi nhận không được quá 4000 ký tự.');
            if(!allowed()){message.textContent='Bạn không có quyền ghi nhật ký ca dịch vụ.';return;}
            const recordedAt=state.log&&fields.at.value===localMinute(state.log.recorded_at)?state.log.recorded_at:at.toISOString();
            const details={title:name,note:fields.note.value.trim(),recorded_at:recordedAt,staff_id:PawpalAdminAccess.state.user.id},signature=JSON.stringify(details);
            if(!state.pending||state.pending.signature!==signature)state.pending={signature,id:state.log?.id||crypto.randomUUID()};
            const args={p_id:state.pending.id,p_appointment_id:state.row.id,p_expected_updated_at:state.row.updated_at,p_expected_log_updated_at:state.log?.updated_at||null,p_action:'save',p_details:details},generation=state.generation;
            state.saving=true;save.disabled=true;save.textContent='Đang lưu';Object.values(fields).forEach(input=>input.disabled=true);
            const finish=()=>{if(generation!==state.generation)return;const callback=state.onSaved;closeDialog();form.reset();state.row=state.log=state.pending=null;if(allowed())callback?.(args.p_appointment_id);};
            let mediaIds=[],persistAttempted=false;
            try{
                const editor=await mediaEditor;mediaIds=await editor.prepare();
                if(generation!==state.generation)return;
                if(mediaIds.length)details.media_asset_ids=mediaIds;
                persistAttempted=true;await persist(args);editor.saved();finish();
            }
            catch(error){
                if(generation!==state.generation)return;
                // An edit has no server idempotency shortcut: verify its actual persisted contents after a lost response.
                if(error.mediaMessage){message.textContent=error.message;return;}
                if(persistAttempted&&state.log&&(!error.code||error.code==='PT409'||/^5/.test(String(error.status||'')))){
                    try{const current=await findLog(args.p_appointment_id,args.p_id);if(current?.recorded_by===details.staff_id&&current.action_name_snapshot===details.title&&(current.description||'')===details.note&&Date.parse(current.recorded_at)===+at&&await(await mediaEditor).committed(args.p_id,mediaIds)){(await mediaEditor).saved();finish();return;}}catch{}
                }
                if(generation!==state.generation)return;
                const messages={work_assignment_required:'Ca không còn được giao cho bạn. Đóng form và tải lại.',work_log_owner_required:'Chỉ được sửa nhật ký do chính bạn ghi.',work_log_performer_mismatch:'Người ghi nhật ký phải là nhân viên đang đăng nhập.',work_driver_assignment_required:'Ca xe chưa được giao cho bạn làm tài xế. Liên hệ Quản lý.',care_log_requires_active_service:'Chỉ ghi nhật ký khi ca đang thực hiện.',invalid_service_log:'Kiểm tra tên công việc và thời điểm thực hiện; thời điểm phải từ lúc tiếp nhận ca trở đi.'};
                message.textContent=messages[error.message]||(error.code==='PT409'?'Ca hoặc nhật ký đã thay đổi. Đóng form và mở lại để lấy dữ liệu mới; nội dung đang nhập vẫn được giữ trong form này.':error.code==='42501'?'Bạn không có quyền lưu nhật ký này.':'Chưa xác nhận lưu nhật ký thành công. Giữ nguyên thông tin và thử lại.');
            }finally{state.saving=false;save.disabled=state.loading;save.textContent=state.log?'Lưu thay đổi':'Lưu nhật ký';Object.values(fields).forEach(input=>input.disabled=false);}
        };
        state.open=async({appointmentId,logId=null,onSaved}={})=>{
            if(state.saving||!allowed())return;state.loading=true;state.row=state.log=state.pending=null;state.onSaved=onSaved;state.returnFocus=document.activeElement;form.reset();summary.textContent=message.textContent='';title.textContent=logId?'Sửa nhật ký chăm sóc':'Ghi nhật ký chăm sóc';Object.values(fields).forEach(input=>{input.disabled=true;input.removeAttribute('aria-invalid');});save.disabled=true;save.textContent='Đang tải';const generation=++state.generation;overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');close.focus();
            try{
                const rows=await read('appointments',appointmentId),row=rows.find(item=>item.id===appointmentId);if(generation!==state.generation)return;
                if(!row||row.appointment_status!=='in_progress'){message.textContent='Không tìm thấy ca đang thực hiện trong phạm vi được giao.';save.textContent='Lưu nhật ký';return;}
                const log=logId?await findLog(appointmentId,logId):null;if(generation!==state.generation)return;
                if(logId&&(!log||log.recorded_by!==PawpalAdminAccess.state.user.id)){message.textContent='Chỉ được sửa nhật ký do chính bạn ghi.';save.textContent='Lưu thay đổi';return;}
                const pets=await read('pets',row.pet_id);if(generation!==state.generation)return;const pet=pets.find(item=>item.id===row.pet_id);if(!pet)throw Error('missing_pet');
                state.row=row;state.log=log;summary.textContent=row.appointment_code+' · '+pet.pet_name;fields.title.value=log?.action_name_snapshot||'';fields.note.value=log?.description||'';fields.at.value=localMinute(log?.recorded_at||new Date());fields.staff.value=PawpalAdminAccess.state.user.name;
                await(await mediaEditor).reset({appointment:row.id,logId:log?.id});if(generation!==state.generation)return;
                state.loading=false;Object.values(fields).forEach(input=>input.disabled=false);save.disabled=false;save.textContent=log?'Lưu thay đổi':'Lưu nhật ký';fields.title.focus();
            }catch{if(generation===state.generation){message.textContent='Không tải đủ dữ liệu ca hoặc nhật ký. Đóng form và tải lại hồ sơ.';save.textContent='Lưu nhật ký';}}
        };
        state.close=closeDialog;state.clear=()=>{closeDialog();form.reset();summary.textContent=message.textContent='';state.row=state.log=state.pending=state.onSaved=null;};dialog=state;return state;
    }
    window.addEventListener('hashchange',()=>dialog?.close());
    window.PawpalCareLog=Object.freeze({save:persist,openForStaff:options=>{if(allowed())return build().open(options);},closeStaff:()=>dialog?.clear()});
})();

;
(function () {
    'use strict';
    const el = (tag, text, className) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n; };
    const money = n => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
    const instant = value => value ? new Date(value + ':00+07:00').getTime() : NaN;
    let dialog;
    async function rpc(name, args) { const { data, error } = await getSupabaseClient().rpc(name, args); if (error) throw error; return data; }
    async function workspace(kind, query = '', id = null, page = 1) { return (await rpc('get_staff_workspace', { p_kind: kind, p_query: query, p_id: id, p_page: page })).items; }
    async function catalog(kind, id = null, query = '', page = 1) { return (await rpc('get_staff_booking_catalog', { p_kind: kind, p_service_id: id, p_query: query, p_page: page })).items; }
    async function all(fetchPage) { const rows = []; for (let page = 1; page <= 100; page++) { const batch = await fetchPage(page); rows.push(...batch); if (batch.length < 10) return rows; } throw Error('catalog_too_large'); }
    function build() {
        if (dialog) return dialog;
        const id = 'staffBookingModal', overlay = el('div', null, 'admin-modal-overlay staff-workspace-modal'); overlay.id = id; overlay.setAttribute('aria-hidden', 'true');
        const card = el('div', null, 'admin-modal-card workspace-pet-card'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'staffBookingTitle');
        const form = el('form'); form.noValidate = true; form.setAttribute('onsubmit', 'return false;');
        const header = el('div', null, 'workspace-modal-header'), title = el('h2', 'Tạo lịch hẹn'), close = el('button', 'Đóng', 'btn-modal-close'); title.id = 'staffBookingTitle'; close.type = 'button'; close.dataset.closeModal = id; header.append(title, close);
        const grid = el('div', null, 'workspace-pet-grid'), fields = {}, groups = {};
        function field(key, text, type = 'text', required = false, parent = grid, wide = false) {
            const group = el('div', null, 'workspace-form-field' + (wide ? ' workspace-field-wide' : '')), label = el('label', text + (required ? ' ' : ''));
            const input = el(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input', null, 'admin-input'); input.id = 'staffBooking' + key;
            if (input.tagName === 'INPUT') input.type = type; input.required = required; if (type === 'text') input.maxLength = 1000; if (type === 'textarea') { input.rows = 2; input.maxLength = 2000; }
            label.htmlFor = input.id; if (required) label.append(el('span', '*', 'workspace-required')); group.append(label, input); parent.append(group); fields[key] = input; groups[key] = group; return input;
        }
        field('customer', 'Khách hàng', 'text', true); field('phone', 'Số điện thoại', 'text').readOnly = true;
        field('pet', 'Bé cưng', 'text', true); field('weight', 'Cân nặng đã lưu (kg)', 'text', true).readOnly = true;
        field('service', 'Gói dịch vụ', 'text', true, grid, true); field('start', 'Ngày và giờ hẹn', 'datetime-local', true);
        field('health', 'Lưu ý sức khỏe', 'textarea'); field('style', 'Yêu cầu tạo kiểu', 'textarea', false, grid, true);
        const hotel = el('div', null, 'workspace-pet-grid workspace-field-wide workspace-booking-conditional'); grid.append(hotel); hotel.hidden = true;
        field('checkout', 'Ngày và giờ trả phòng', 'datetime-local', true, hotel); field('room', 'Phòng', 'text', true, hotel);
        field('diet', 'Chế độ ăn', 'textarea', false, hotel); field('care', 'Lưu ý chăm sóc', 'textarea', false, hotel);
        const taxi = el('div', null, 'workspace-pet-grid workspace-field-wide workspace-booking-conditional'); grid.append(taxi); taxi.hidden = true;
        field('pickup', 'Địa chỉ đón', 'text', true, taxi); field('dropoff', 'Địa chỉ trả', 'text', true, taxi);
        const distance = field('distance', 'Cự ly mỗi lượt (km)', 'number', true, taxi); distance.min = '.01'; distance.step = '.01';
        const trip = field('trip', 'Hành trình', 'select', true, taxi); for (const [value, text] of [['one_way', 'Một chiều'], ['round_trip', 'Khứ hồi']]) { const option = el('option', text); option.value = value; trip.append(option); }
        field('return', 'Ngày và giờ lượt về', 'datetime-local', true, taxi); field('note', 'Ghi chú', 'textarea', false, grid, true);
        const quoteText = el('p', '', 'workspace-booking-quote'), message = el('p', '', 'workspace-error'); message.setAttribute('role', 'alert');
        const success = el('p', '', 'workspace-booking-success'); success.setAttribute('role', 'status');
        const footer = el('div', null, 'workspace-modal-footer'), cancel = el('button', 'Hủy', 'admin-btn admin-btn-secondary'), save = el('button', 'Tạo lịch hẹn', 'admin-btn admin-btn-primary'); cancel.type = save.type = 'button'; cancel.dataset.closeModal = id; footer.append(cancel, save);
        form.append(header, grid, quoteText, message, success, footer); card.append(form); overlay.append(card); document.body.append(overlay);
        const state = { overlay, form, fields, generation: 0, customer: null, pet: null, service: null, room: null, prices: [], rooms: [], loading: false, saving: false, done: false, pending: null, returnFocus: null };
        const pickers = [];
        function picker(key, fetchRows, titleOf, subtitleOf, select) {
            const input = fields[key], group = groups[key], menu = el('div', null, 'autocomplete-dropdown workspace-autocomplete-menu'), summary = el('div', null, 'workspace-selected-entity');
            group.classList.add('workspace-autocomplete'); menu.id = input.id + 'Options'; menu.hidden = summary.hidden = true; menu.setAttribute('role', 'listbox'); group.append(menu, summary);
            input.autocomplete = 'off'; input.setAttribute('role', 'combobox'); input.setAttribute('aria-controls', menu.id); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-autocomplete', 'list');
            let version = 0, timer, buttons = [], active = -1;
            const hide = () => { version++; clearTimeout(timer); menu.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
            function reset(notify = true) { hide(); state[key] = null; input.readOnly = false; input.value = ''; summary.replaceChildren(); summary.hidden = true; if (notify) select?.(null); }
            function choose(row) {
                hide(); state[key] = row; input.readOnly = true; input.value = titleOf(row); input.removeAttribute('aria-invalid'); summary.replaceChildren(el('span', titleOf(row)));
                const clear = el('button', '✕ Bỏ chọn', 'workspace-text-button'); clear.type = 'button'; clear.onclick = () => { if (state.saving || state.done) return; reset(); input.focus(); }; summary.append(clear); summary.hidden = false; select?.(row);
            }
            async function search() {
                if (input.readOnly || state.saving || state.done) return;
                hide(); const turn = version; menu.hidden = false; input.setAttribute('aria-expanded', 'true'); menu.replaceChildren(el('p', 'Đang tìm...')); buttons = [];
                try {
                    const rows = await fetchRows(input.value.trim()); if (turn !== version || !overlay.classList.contains('active')) return;
                    menu.replaceChildren();
                    rows.filter(row => { const text = String(titleOf(row) || '').trim(); return text && !/^\d+$/.test(text) && !/^(unknown|null|undefined|chưa rõ|chưa cập nhật)$/i.test(text); }).slice(0,10).forEach((row, index) => {
                        const button = el('button', null, 'workspace-autocomplete-option'); button.type = 'button'; button.id = menu.id + index; button.setAttribute('role', 'option'); button.setAttribute('aria-selected', 'false'); button.append(el('strong', titleOf(row)), el('small', subtitleOf(row))); button.onclick = () => { choose(row); input.focus(); }; buttons.push(button); menu.append(button);
                    });
                    if (!buttons.length) menu.append(el('p', 'Chưa có kết quả. Nhập tên, mã hoặc số điện thoại để tìm.'));
                } catch { if (turn === version) menu.replaceChildren(el('p', 'Không tải được gợi ý. Bấm lại ô để thử.')); }
            }
            input.addEventListener('input', () => { hide(); timer = setTimeout(search, 250); }); input.addEventListener('focus', search); input.addEventListener('click', () => { if (menu.hidden) search(); });
            input.addEventListener('keydown', event => {
                if (event.key === 'Escape' && !menu.hidden) { event.preventDefault(); event.stopPropagation(); hide(); return; }
                if (event.key === 'ArrowDown' && menu.hidden) { event.preventDefault(); search(); return; }
                if (['ArrowDown','ArrowUp'].includes(event.key) && buttons.length && !menu.hidden) { event.preventDefault(); active = (active + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length; buttons.forEach((button,index) => button.setAttribute('aria-selected', String(index === active))); input.setAttribute('aria-activedescendant', buttons[active].id); buttons[active].scrollIntoView({block:'nearest'}); }
                if (event.key === 'Enter') { event.preventDefault(); if (active >= 0 && !menu.hidden) buttons[active].click(); }
            });
            group.addEventListener('focusout', () => setTimeout(() => { if (!group.contains(document.activeElement)) hide(); }, 0));
            const result = { choose, reset, hide, group }; pickers.push(result); return result;
        }
        let customerPicker, petPicker, servicePicker, roomPicker;
        let petLoadVersion = 0, customerLoadVersion = 0, serviceLoadVersion = 0;
        customerPicker = picker('customer', query => query.length < 3 ? [] : workspace('customers', query), row => row.full_name, row => row.phone_number || row.customer_code, row => {
            petLoadVersion++; petPicker.reset(false); fields.phone.value = row?.phone_number || ''; fields.weight.value = fields.health.value = ''; state.pets = []; updateQuote();
            if (!row) return;
            const turn = ++customerLoadVersion, generation = state.generation;
            all(page => workspace('pets', '', row.id, page)).then(rows => { if (turn !== customerLoadVersion || generation !== state.generation || state.customer?.id !== row.id) return; state.pets = rows; if (rows.length && !state.pet) petPicker.choose(rows[0]); }).catch(() => { if (generation === state.generation && state.customer?.id === row.id) message.textContent = 'Không tải được thú cưng của khách. Bỏ chọn khách rồi chọn lại.'; });
        });
        petPicker = picker('pet', query => state.customer ? (state.pets || []).filter(row => (row.pet_name + ' ' + row.pet_code).toLowerCase().includes(query.toLowerCase())) : query.length < 3 ? [] : workspace('pets', query), row => row.pet_name, row => row.pet_code, async row => {
            const turn = ++petLoadVersion, generation = state.generation; fields.weight.value = row?.current_weight ?? ''; fields.health.value = row ? [row.safety_note,row.allergy,row.routine].filter(Boolean).join('\n') : ''; updateQuote();
            if (row && !state.customer) {
                try { const owners = await workspace('customers', '', row.customer_id); if (turn !== petLoadVersion || generation !== state.generation) return; if (!owners[0]) throw Error('owner_missing'); customerPicker.choose(owners[0]); petPicker.choose(row); }
                catch { if (generation === state.generation) { petPicker.reset(false); fields.weight.value = fields.health.value = ''; message.textContent = 'Không tải được chủ nuôi. Chọn khách rồi chọn lại bé cưng.'; } }
            }
        });
        roomPicker = picker('room', async query => state.rooms.filter(row => (row.room_number + ' ' + row.room_type).toLowerCase().includes(query.toLowerCase())), row => row.room_number + ' · ' + row.room_type, row => money(row.daily_price) + ' / ' + row.billing_minutes + ' phút', updateQuote);
        servicePicker = picker('service', query => catalog('services', null, query), row => row.service_name, row => row.estimated_duration + ' phút' + (row.description ? ' · ' + row.description : ''), async row => {
            const turn = ++serviceLoadVersion, generation = state.generation; state.prices = []; state.rooms = []; roomPicker.reset(false);
            for (const key of ['style','checkout','diet','care','pickup','dropoff','distance','return']) fields[key].value = '';
            trip.value = row?.trip_type || 'one_way'; trip.disabled = Boolean(row?.trip_type); [...trip.options].forEach(option => option.hidden = Boolean(row?.trip_type && option.value !== row.trip_type));
            hotel.hidden = row?.category_code !== 'pet_hotel'; taxi.hidden = row?.category_code !== 'pet_taxi'; groups.style.hidden = !(row?.category_code === 'grooming_spa' && /grooming|cắt\s*tỉa|tạo\s*kiểu|style/i.test(row.service_name)); groups.return.hidden = trip.value !== 'round_trip';
            state.loading = Boolean(row); save.disabled = state.loading; updateQuote(); if (!row) return;
            try { const kind = row.category_code === 'pet_hotel' ? 'rooms' : row.category_code === 'pet_taxi' ? 'taxi_prices' : 'prices'; const rows = await all(page => catalog(kind, row.id, '', page)); if (turn !== serviceLoadVersion || generation !== state.generation) return; if (kind === 'rooms') state.rooms = rows; else state.prices = rows; state.loading = false; save.disabled = false; updateQuote(); }
            catch { if (turn === serviceLoadVersion && generation === state.generation) { quoteText.textContent = ''; message.textContent = 'Không tải đủ bảng giá. Bỏ chọn dịch vụ rồi chọn lại.'; } }
        });
        function inRange(value, from, to, inclusive) { return value >= Number(from) && (to == null || value < Number(to) || inclusive && value === Number(to)); }
        function effective(row, at) { return Date.parse(row.effective_from) <= at && (row.effective_to == null || Date.parse(row.effective_to) > at); }
        function amount() {
            const svc = state.service, at = instant(fields.start.value), weight = Number(fields.weight.value); if (!svc || !Number.isFinite(at) || !(weight > 0) || state.loading) return null;
            if (svc.category_code === 'pet_taxi' && !(Number(fields.distance.value) > 0)) return null;
            if (svc.category_code === 'pet_hotel') {
                const room = state.room, end = instant(fields.checkout.value); if (!room || !(end > at) || !effective(room,at) || !inRange(weight,room.weight_from,room.weight_to,room.weight_to_inclusive)) return null;
                return Math.ceil((end-at)/(Number(room.billing_minutes)*60000))*Number(room.daily_price);
            }
            const matches = state.prices.filter(row => effective(row,at) && inRange(weight,row.weight_from,row.weight_to,row.weight_to_inclusive) && (svc.category_code !== 'pet_taxi' || inRange(Number(fields.distance.value),row.distance_from,row.distance_to,row.distance_to_inclusive)));
            if (matches.length !== 1) return null; const row = matches[0]; if (svc.category_code !== 'pet_taxi') return Number(row.unit_price);
            let total = Number(row.base_price)+Number(row.surcharge); if (trip.value === 'round_trip' && !svc.trip_type) { const back = instant(fields.return.value), rows = state.prices.filter(row => effective(row,back) && inRange(weight,row.weight_from,row.weight_to,row.weight_to_inclusive) && inRange(Number(fields.distance.value),row.distance_from,row.distance_to,row.distance_to_inclusive)); if (rows.length !== 1) return null; total += Number(rows[0].base_price)+Number(rows[0].surcharge); } return total;
        }
        function updateQuote() { const value = amount(); quoteText.textContent = state.loading ? 'Đang tải bảng giá...' : state.service ? value == null ? 'Chọn đủ thời gian, cân nặng và thông tin dịch vụ để xác định giá.' : 'Tạm tính ' + money(value) : ''; }
        ['start','checkout','distance','return'].forEach(key => fields[key].addEventListener('input', updateQuote));
        trip.addEventListener('change', () => { groups.return.hidden = trip.value !== 'round_trip'; if (groups.return.hidden) fields.return.value = ''; updateQuote(); });
        Object.values(fields).forEach(input => input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') { input.removeAttribute('aria-invalid'); message.textContent = ''; } }));
        function closeDialog() { state.generation++; petLoadVersion++; serviceLoadVersion++; pickers.forEach(p=>p.hide()); overlay.classList.remove('active'); overlay.setAttribute('aria-hidden','true'); if (state.returnFocus?.isConnected) state.returnFocus.focus(); }
        overlay.addEventListener('click', event => { pickers.forEach(p => { if (!p.group.contains(event.target)) p.hide(); }); if (event.target === overlay || event.target.closest('[data-close-modal="'+id+'"]')) closeDialog(); });
        overlay.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDialog(); return; } if (event.key !== 'Tab') return; const nodes = [...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(n=>n.offsetParent!==null), first=nodes[0],last=nodes.at(-1); if (event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();} else if (!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();} });
        form.addEventListener('submit',event=>event.preventDefault());
        save.onclick = async () => {
            if (state.saving || state.loading || state.done) return; message.textContent=''; Object.values(fields).forEach(n=>n.removeAttribute('aria-invalid'));
            const invalid = (key,text)=>{fields[key].setAttribute('aria-invalid','true');message.textContent=text;fields[key].focus();};
            if (!state.customer) return invalid('customer','Chọn khách hàng từ danh sách gợi ý.'); if (!state.pet || state.pet.customer_id !== state.customer.id) return invalid('pet','Chọn bé cưng của đúng khách hàng.');
            if (!(Number(fields.weight.value)>0)) return invalid('weight','Cần ghi nhận cân nặng trong hồ sơ bé cưng trước khi đặt lịch.'); if (!state.service) return invalid('service','Chọn gói dịch vụ từ danh sách gợi ý.');
            const at=instant(fields.start.value); if (!(at>Date.now())) return invalid('start','Thời gian hẹn phải ở tương lai.');
            const svc=state.service, details={customer_id:state.customer.id,pet_id:state.pet.id,service_id:svc.id,staff_id:null,scheduled_start_at:new Date(at).toISOString(),note:[fields.note.value.trim(),fields.health.value.trim(),!groups.style.hidden&&fields.style.value.trim()?'Yêu cầu tạo kiểu: '+fields.style.value.trim():''].filter(Boolean).join('\n')};
            if(details.note.length>4000)return invalid('note','Tổng ghi chú và lưu ý không được quá 4000 ký tự.');
            if(svc.category_code==='pet_hotel'){const end=instant(fields.checkout.value);if(!(end>at))return invalid('checkout','Giờ trả phòng phải sau giờ nhận phòng.');if(!state.room)return invalid('room','Chọn phòng trong danh sách gợi ý.');Object.assign(details,{room_id:state.room.id,check_out_at:new Date(end).toISOString(),diet_notes:fields.diet.value.trim(),care_notes:fields.care.value.trim()});}
            if(svc.category_code==='pet_taxi'){if(!fields.pickup.value.trim())return invalid('pickup','Nhập địa chỉ đón.');if(!fields.dropoff.value.trim())return invalid('dropoff','Nhập địa chỉ trả.');const km=Number(fields.distance.value);if(!Number.isFinite(km)||km<=0)return invalid('distance','Nhập cự ly mỗi lượt lớn hơn 0.');const back=instant(fields.return.value);if(trip.value==='round_trip'&&!(back>=at+Number(svc.estimated_duration)*60000))return invalid('return','Lượt về phải sau khi hoàn thành lượt đi.');Object.assign(details,{pickup_address:fields.pickup.value.trim(),dropoff_address:fields.dropoff.value.trim(),distance_km:km,trip_type:trip.value,return_at:trip.value==='round_trip'?new Date(back).toISOString():null});}
            if(amount()==null)return invalid('service','Chưa có đúng một mức giá phù hợp. Kiểm tra ngày hẹn, cân nặng và thông tin dịch vụ.');
            if(!window.PawpalAdminAccess?.state.user?.permissions.includes('work.booking.create')){message.textContent='Bạn không có quyền tạo lịch hẹn.';return;}
            const name=['pet_hotel','pet_taxi'].includes(svc.category_code)?'create_admin_logistics_booking':'create_admin_service_booking',signature=JSON.stringify({name,details});if(!state.pending||state.pending.signature!==signature)state.pending={signature,id:crypto.randomUUID()};const requestId=state.pending.id,generation=state.generation;
            state.saving=true;save.disabled=true;save.textContent='Đang tạo';const controls=[...grid.querySelectorAll('input,select,textarea,button')],disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);
            try {const data=await rpc(name,{p_id:requestId,p_details:details});if(data!==requestId)throw Error('invalid_booking_result');if(generation===state.generation){state.done=true;success.textContent='Đã tạo lịch BKG-'+data.replaceAll('-','').toUpperCase()+'. Chờ Quản lý phân công.';save.textContent='Đã tạo lịch';state.pending=null;}}
            catch(error){if(generation===state.generation){const messages={pet_owner_mismatch:'Bé cưng không thuộc khách hàng đã chọn. Chọn lại hồ sơ.',service_species_not_supported:'Dịch vụ không hỗ trợ loài thú cưng này.',hotel_room_conflict:'Phòng đã có lịch trong khoảng thời gian này. Chọn phòng hoặc thời gian khác.',hotel_room_unavailable:'Phòng không phù hợp cân nặng hoặc không còn nhận đặt. Chọn phòng khác.',ambiguous_service_price:'Bảng giá đã thay đổi hoặc chưa có đúng một mức giá. Chọn lại dịch vụ.',ambiguous_taxi_price:'Chưa có đúng một giá xe phù hợp. Chọn lại dịch vụ và cự ly.',ambiguous_taxi_return_price:'Chưa có giá phù hợp cho lượt về.',taxi_service_trip_mismatch:'Hành trình không phù hợp gói xe đã chọn.',active_customer_required:'Khách hàng không còn hoạt động. Kiểm tra lại hồ sơ.',pet_weight_required:'Cần ghi nhận cân nặng trong hồ sơ bé cưng.',future_booking_required:'Thời gian hẹn phải ở tương lai.'};message.textContent=messages[error.message]||(error.code==='42501'?'Bạn không có quyền tạo lịch hẹn.':'Chưa xác nhận tạo lịch thành công. Giữ nguyên thông tin và thử lại.');save.textContent='Tạo lịch hẹn';}}
            finally{state.saving=false;if(!state.done){controls.forEach((n,i)=>n.disabled=disabled[i]);save.disabled=false;}}
        };
        state.open=()=>{if(state.saving)return;state.generation++;state.done=false;state.pending=null;state.service=null;state.customer=null;state.pet=null;state.room=null;state.pets=[];state.prices=[];state.rooms=[];state.loading=false;form.reset();grid.querySelectorAll('input,select,textarea,button').forEach(n=>n.disabled=false);pickers.forEach(p=>p.reset(false));fields.phone.value=fields.weight.value=fields.health.value='';hotel.hidden=taxi.hidden=groups.style.hidden=groups.return.hidden=true;state.returnFocus=document.activeElement;message.textContent=success.textContent=quoteText.textContent='';save.disabled=false;save.textContent='Tạo lịch hẹn';overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');fields.customer.focus();};
        state.close=closeDialog;state.clear=()=>{closeDialog();form.reset();state.customer=state.pet=state.service=state.room=null;state.pending=null;pickers.forEach(p=>p.reset(false));};dialog=state;return state;
    }
    window.addEventListener('hashchange',()=>dialog?.close());
    window.PawpalStaffBooking=Object.freeze({open:()=>{if(window.PawpalAdminAccess?.isStaff()&&window.PawpalAdminAccess.state.user.permissions.includes('work.booking.create'))build().open();},closeAll:()=>dialog?.clear()});
})();

;
(function () {
    'use strict';
    let dialog;
    const allowed = () => window.PawpalAdminAccess?.isStaff() && window.PawpalAdminAccess.state.user.permissions.includes('work.service.perform');
    const el = (tag, text, className) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n; };
    async function read(kind, id) {
        const { data, error } = await getSupabaseClient().rpc('get_staff_workspace', { p_kind: kind, p_query: '', p_id: id, p_page: 1 });
        if (error) throw error; return data.items;
    }
    function build() {
        if (dialog) return dialog;
        const overlay = el('div', null, 'admin-modal-overlay staff-workspace-modal'); overlay.id = 'staffIntakeModal'; overlay.setAttribute('aria-hidden', 'true');
        const card = el('div', null, 'admin-modal-card workspace-pet-card'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'staffIntakeTitle');
        const form = el('form'); form.noValidate = true; form.setAttribute('onsubmit', 'return false;');
        const header = el('div', null, 'workspace-modal-header'), title = el('h2', 'Biên bản tiếp nhận'), close = el('button', 'Đóng', 'btn-modal-close'); title.id = 'staffIntakeTitle'; close.type = 'button'; close.dataset.closeModal = overlay.id; header.append(title, close);
        const summary = el('dl', null, 'workspace-intake-summary'), grid = el('div', null, 'workspace-pet-grid'), fields = {};
        for (const [key, text, type, required] of [['weight','Cân nặng thực tế (kg)','number',true],['staff','Nhân viên tiếp nhận','text',false],['skin','Da và lông','textarea',true],['eyes','Mắt và tai','textarea',true],['wounds','Vết thương','textarea',true],['temperament','Tập tính','textarea',true],['belongings','Tư trang nhận kèm','textarea',false],['note','Ghi chú tư trang','textarea',false]]) {
            const group = el('div', null, 'workspace-form-field'), label = el('label', text + (required ? ' ' : '')), input = el(type === 'textarea' ? 'textarea' : 'input', null, 'admin-input'); input.id = 'staffIntake' + key;
            if (type !== 'textarea') input.type = type; else { input.rows = 2; input.maxLength = 1200; }
            if (type === 'number') { input.min = '.01'; input.max = '1000'; input.step = '.01'; }
            if (key === 'staff') input.readOnly = true; input.required = required; label.htmlFor = input.id; if (required) label.append(el('span', '*', 'workspace-required')); group.append(label, input); grid.append(group); fields[key] = input;
        }
        const confirmation = el('label', null, 'workspace-intake-confirmation'), checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.id = 'staffIntakeConfirmed'; confirmation.htmlFor = checkbox.id; confirmation.append(checkbox, el('span','Khách đã xác nhận thông tin tiếp nhận'));
        const prior = el('p', '', 'workspace-intake-prior'), errorText = el('p', '', 'workspace-error'); errorText.setAttribute('role','alert');
        const mediaRoot=el('div');mediaRoot.id='staffIntakeMedia';
        const footer = el('div', null, 'workspace-modal-footer'), cancel = el('button','Hủy','admin-btn admin-btn-secondary'), save = el('button','Lưu và bắt đầu ca','admin-btn admin-btn-primary'); save.id = 'staffIntakeSave'; cancel.type = save.type = 'button'; cancel.dataset.closeModal = overlay.id; footer.append(cancel,save);
        form.append(header,summary,grid,mediaRoot,confirmation,prior,errorText,footer); card.append(form); overlay.append(card); document.body.append(overlay);
        const state = { overlay, form, fields, save, row: null, loading: true, saving: false, pending: null, recordId:null, media:null, generation: 0, onSaved: null, returnFocus: null };
        Object.values(fields).forEach(input => input.addEventListener('input', () => { if(input.getAttribute('aria-invalid') === 'true') { input.removeAttribute('aria-invalid'); errorText.textContent=''; } }));
        function closeDialog() { state.generation++;state.media?.close(); overlay.classList.remove('active'); overlay.setAttribute('aria-hidden','true'); if(state.returnFocus?.isConnected)state.returnFocus.focus(); }
        overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-close-modal="'+overlay.id+'"]'))closeDialog();});
        overlay.addEventListener('keydown',event=>{
            if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}
            if(event.key!=='Tab')return;
            const nodes=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled])')].filter(n=>n.offsetParent!==null),first=nodes[0],last=nodes.at(-1);
            if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
        });
        form.addEventListener('submit',event=>event.preventDefault());
        save.onclick=async()=>{
            if(state.loading||state.saving||!state.row)return;
            errorText.textContent='';Object.values(fields).forEach(input=>input.removeAttribute('aria-invalid'));
            const invalid=(key,text)=>{fields[key].setAttribute('aria-invalid','true');errorText.textContent=text;fields[key].focus();};
            const weight=Number(fields.weight.value);
            if(!Number.isFinite(weight)||weight<=0||weight>1000||fields.weight.validity.badInput)return invalid('weight','Nhập cân nặng lớn hơn 0 và không quá 1000 kg.');
            for(const key of ['skin','eyes','wounds','temperament'])if(!fields[key].value.trim())return invalid(key,'Ghi đầy đủ tình trạng da và lông, mắt và tai, vết thương và tập tính.');
            if(!allowed()){errorText.textContent='Bạn không có quyền tiếp nhận ca dịch vụ.';return;}
            const details={actualWeight:weight,staffId:PawpalAdminAccess.state.user.id,customerConfirmed:checkbox.checked,skinCoat:fields.skin.value.trim(),eyesEars:fields.eyes.value.trim(),wounds:fields.wounds.value.trim(),temperament:fields.temperament.value.trim(),belongings:fields.belongings.value.trim(),belongingsNote:fields.note.value.trim()};
            if(JSON.stringify(details).length>10000){errorText.textContent='Nội dung tiếp nhận quá dài. Rút gọn các ghi nhận trước khi lưu.';return;}
            const generation=state.generation,appointment=state.row;
            state.saving=true;save.disabled=true;save.textContent='Đang lưu';Object.values(fields).forEach(input=>input.disabled=true);checkbox.disabled=true;
            try{
                if(!state.media)throw Error('intake_media_not_ready');
                details.media_asset_ids=await state.media.prepare();
                if(generation!==state.generation||!overlay.classList.contains('active'))return;
                if(!allowed())throw Error('work_access_forbidden');
                state.pending={signature:JSON.stringify(details),id:state.recordId};
                const args={p_id:state.pending.id,p_appointment_id:appointment.id,p_expected_updated_at:appointment.updated_at,p_type:'intake',p_details:details};
                const {data,error}=await getSupabaseClient().rpc('save_admin_service_record',args);if(error)throw error;if(data!==args.p_id)throw Error('invalid_intake_result');
                state.media.saved();
                if(generation===state.generation){const callback=state.onSaved;closeDialog();state.pending=null;form.reset();state.row=null;if(allowed())callback?.(args.p_appointment_id);}
            }catch(error){
                if(generation===state.generation){const messages={work_assignment_required:'Ca không còn được giao cho bạn. Đóng form và tải lại.',work_performer_mismatch:'Chỉ được tiếp nhận bằng tài khoản nhân viên đang đăng nhập.',work_shared_appointment_requires_lead:'Ca có hạng mục chính do nhân viên khác phụ trách. Liên hệ Quản lý.',work_driver_assignment_required:'Ca xe chưa được giao cho bạn làm tài xế. Liên hệ Quản lý.',staff_level_required:'Cấp độ chuyên môn chưa phù hợp với ca này. Liên hệ Quản lý.',staff_schedule_conflict:'Bạn có ca khác trùng thời gian. Liên hệ Quản lý.',intake_observations_required:'Ca không còn ở trạng thái có thể tiếp nhận hoặc thiếu ghi nhận. Kiểm tra lại hồ sơ.'};
                    Object.assign(messages,{hotel_checkin_time_or_room_invalid:'Chưa đến giờ nhận phòng, đã quá giờ trả hoặc phòng chưa sẵn sàng. Kiểm tra lịch lưu trú.',hotel_room_occupied:'Phòng đang có bé khác lưu trú. Liên hệ Quản lý.',taxi_trip_not_due:'Chưa đến giờ bắt đầu chuyến xe. Kiểm tra lịch trước khi tiếp nhận.'});
                    errorText.textContent=error.mediaMessage?error.message:messages[error.message]||(error.code==='PT409'?'Ca đã thay đổi. Đóng form và mở lại để lấy dữ liệu mới; nội dung đang nhập vẫn được giữ trong form này.':error.code==='42501'?'Bạn không có quyền tiếp nhận ca dịch vụ này.':'Chưa xác nhận lưu tiếp nhận thành công. Giữ nguyên thông tin và thử lại.');}
            }finally{state.saving=false;save.disabled=state.loading;save.textContent=state.row?.appointment_status==='in_progress'?'Lưu tiếp nhận':'Lưu và bắt đầu ca';Object.values(fields).forEach(input=>input.disabled=false);checkbox.disabled=false;}
        };
        state.open=async({appointmentId,onSaved}={})=>{
            if(state.saving||!allowed())return;state.media?.close();state.media=null;mediaRoot.replaceChildren();state.recordId=crypto.randomUUID();state.row=null;state.pending=null;state.loading=true;state.onSaved=onSaved;state.returnFocus=document.activeElement;form.reset();summary.replaceChildren();prior.textContent=errorText.textContent='';Object.values(fields).forEach(input=>{input.disabled=true;input.removeAttribute('aria-invalid');});checkbox.disabled=true;save.disabled=true;save.textContent='Đang tải';const generation=++state.generation;
            overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');close.focus();
            try{
                const rows=await read('appointments',appointmentId),row=rows.find(item=>item.id===appointmentId);if(generation!==state.generation)return;
                if(!row||!['confirmed','checked_in','in_progress'].includes(row.appointment_status)){errorText.textContent='Không tìm thấy ca được giao ở trạng thái có thể tiếp nhận.';save.textContent='Lưu tiếp nhận';return;}
                const [pets,customers,records]=await Promise.all([read('pets',row.pet_id),read('customers',row.customer_id),read('service_records',row.id)]);if(generation!==state.generation)return;
                const pet=pets.find(item=>item.id===row.pet_id),customer=customers.find(item=>item.id===row.customer_id);if(!pet||!customer||pet.customer_id!==customer.id)throw Error('intake_context_missing');
                for(const [name,value]of [['Mã lịch',row.appointment_code],['Khách hàng',customer.full_name],['Bé cưng',pet.pet_name],['Cảnh báo an toàn',pet.safety_note||'—'],['Dị ứng',pet.allergy||'—']])summary.append(el('dt',name),el('dd',value));
                fields.weight.value=pet.current_weight??'';fields.staff.value=PawpalAdminAccess.state.user.name;
                const previous=records.find(item=>item.record_type==='intake');if(previous)prior.textContent='Biên bản trước: '+previous.condition_note;
                const {createIntakeMediaEditor}=await import('/scripts/shared/intake-media.mjs');if(generation!==state.generation)return;
                state.media=createIntakeMediaEditor({root:mediaRoot,db:getSupabaseClient()});
                await state.media.reset({appointment:row.id,record:state.recordId});if(generation!==state.generation)return;
                state.row=row;state.loading=false;save.disabled=false;save.textContent=row.appointment_status==='in_progress'?'Lưu tiếp nhận':'Lưu và bắt đầu ca';Object.values(fields).forEach(input=>input.disabled=false);checkbox.disabled=false;fields.weight.focus();
            }catch{if(generation===state.generation){errorText.textContent='Không tải đủ dữ liệu ca dịch vụ. Đóng form và tải lại hồ sơ.';save.textContent='Lưu tiếp nhận';}}
        };
        state.close=closeDialog;state.clear=()=>{closeDialog();form.reset();state.row=null;state.pending=null;state.onSaved=null;summary.replaceChildren();prior.textContent=errorText.textContent='';};dialog=state;return state;
    }
    window.addEventListener('hashchange',()=>dialog?.close());
    window.PawpalStaffIntake=Object.freeze({open:options=>{if(allowed())return build().open(options);},closeAll:()=>dialog?.clear()});
})();

;
(function () {
    'use strict';
    const allowed = () => window.PawpalAdminAccess?.isStaff() && PawpalAdminAccess.state.user.permissions.includes('work.service.perform');
    const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
    async function read(kind, id, page = 1) {
        const { data, error } = await getSupabaseClient().rpc('get_staff_workspace', { p_kind: kind, p_query: '', p_id: id, p_page: page });
        if (error) throw error; return data.items;
    }
    async function latestIntake(appointmentId) {
        let latest;
        for (let page = 1; page <= 100; page++) {
            const rows = await read('service_records', appointmentId, page);
            for (const row of rows) if (row.record_type === 'intake' && (!latest || row.revision_no > latest.revision_no)) latest = row;
            if (rows.length < 10) return latest;
        }
        throw Error('service_record_limit');
    }
    let dialog;
    function build() {
        if (dialog) return dialog;
        const overlay = el('div', null, 'admin-modal-overlay staff-workspace-modal'); overlay.id = 'staffHandoverModal'; overlay.setAttribute('aria-hidden', 'true');
        const card = el('div', null, 'admin-modal-card'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'staffHandoverTitle');
        const form = el('form'); form.noValidate = true; form.setAttribute('onsubmit', 'return false;');
        const header = el('div', null, 'workspace-modal-header'), title = el('h2', 'Biên bản bàn giao'), close = el('button', 'Đóng', 'btn-modal-close');
        title.id = 'staffHandoverTitle'; close.type = 'button'; close.dataset.closeModal = overlay.id; header.append(title, close);
        const summary = el('dl', null, 'workspace-intake-summary'), prior = el('p', '', 'workspace-intake-prior');
        const checks = {}, checkGroup = el('div', null, 'workspace-handover-checks');
        for (const [key, text] of [['qualityAccepted', 'Đã kiểm tra chất lượng dịch vụ'], ['belongingsReturned', 'Đã trả đủ tư trang'], ['customerConfirmed', 'Khách đã xác nhận bàn giao']]) {
            const label = el('label', null, 'workspace-intake-confirmation'), input = el('input'); input.type = 'checkbox'; input.required = true; input.id = 'staffHandover' + key;
            label.htmlFor = input.id; const caption = el('span', text + ' '); caption.append(el('span', '*', 'workspace-required')); label.append(input, caption); checkGroup.append(label); checks[key] = input;
        }
        const noteGroup = el('div', null, 'workspace-form-field'), label = el('label', 'Ghi chú bàn giao'), note = el('textarea', null, 'admin-input');
        note.id = 'staffHandoverNote'; note.rows = 3; note.maxLength = 2000; label.htmlFor = note.id; noteGroup.append(label, note);
        const mediaRoot=el('div');mediaRoot.id='staffHandoverMedia';
        const errorText = el('p', '', 'workspace-error'); errorText.setAttribute('role', 'alert');
        const footer = el('div', null, 'workspace-modal-footer'), cancel = el('button', 'Hủy', 'admin-btn admin-btn-secondary'), save = el('button', 'Xác nhận bàn giao', 'admin-btn admin-btn-primary');
        save.id = 'staffHandoverSave'; cancel.type = save.type = 'button'; cancel.dataset.closeModal = overlay.id; footer.append(cancel, save);
        form.append(header, summary, prior, checkGroup, noteGroup, mediaRoot, errorText, footer); card.append(form); overlay.append(card); document.body.append(overlay);
        const state = { row: null, pending: null, recordId:null, media:null, loading: true, saving: false, generation: 0, returnFocus: null, onSaved: null };
        function closeDialog() { state.generation++;state.media?.close(); overlay.classList.remove('active'); overlay.setAttribute('aria-hidden', 'true'); if (state.returnFocus?.isConnected) state.returnFocus.focus(); }
        overlay.addEventListener('click', event => { if (event.target === overlay || event.target.closest('[data-close-modal="' + overlay.id + '"]')) closeDialog(); });
        overlay.addEventListener('keydown', event => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDialog(); return; }
            if (event.key !== 'Tab') return;
            const nodes = [...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled])')].filter(node => node.offsetParent !== null), first = nodes[0], last = nodes.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
        form.addEventListener('submit', event => event.preventDefault());
        Object.values(checks).forEach(input => input.addEventListener('change', () => { input.removeAttribute('aria-invalid'); errorText.textContent = ''; }));
        save.onclick = async () => {
            if (state.loading || state.saving || !state.row) return;
            errorText.textContent = '';
            for (const input of Object.values(checks)) {
                input.removeAttribute('aria-invalid');
                if (!input.checked) { input.setAttribute('aria-invalid', 'true'); errorText.textContent = 'Cần xác nhận chất lượng, trả đủ tư trang và khách xác nhận trước khi bàn giao.'; input.focus(); return; }
            }
            if (!allowed()) { errorText.textContent = 'Bạn không có quyền bàn giao ca dịch vụ.'; return; }
            const details = { qualityAccepted: true, belongingsReturned: true, customerConfirmed: true, belongingsNote: note.value.trim() };
            const generation=state.generation,appointment=state.row;
            state.saving = true; save.disabled = true; save.textContent = 'Đang lưu'; Object.values(checks).forEach(input => input.disabled = true); note.disabled = true;
            try {
                if(!state.media)throw Error('handover_media_not_ready');
                details.media_asset_ids=await state.media.prepare();
                if(generation!==state.generation||!overlay.classList.contains('active'))return;
                if(!allowed())throw Error('work_access_forbidden');
                state.pending={signature:JSON.stringify(details),id:state.recordId};
                const args={p_id:state.pending.id,p_appointment_id:appointment.id,p_expected_updated_at:appointment.updated_at,p_type:'handover',p_details:details};
                const { data, error } = await getSupabaseClient().rpc('save_admin_service_record', args); if (error) throw error; if (data !== args.p_id) throw Error('invalid_handover_result');
                state.media.saved();
                if (generation === state.generation) { const callback = state.onSaved; closeDialog(); form.reset(); state.row = state.pending = null; if (allowed()) callback?.(args.p_appointment_id); }
            } catch (error) {
                if (generation === state.generation) {
                    const messages = {
                        confirmed_intake_required: 'Biên bản tiếp nhận mới nhất chưa được khách xác nhận. Kiểm tra lại trước khi bàn giao.',
                        pending_service_adjustments: 'Ca còn điều chỉnh chờ duyệt hoặc chưa có xác nhận của khách. Liên hệ Quản lý.',
                        hotel_checkout_required: 'Ca lưu trú chưa hoàn tất trả phòng. Hoàn tất trả phòng trước khi bàn giao.',
                        work_shared_appointment_requires_lead: 'Ca còn hạng mục do đồng nghiệp phụ trách đang xử lý. Liên hệ Quản lý.',
                        work_assignment_required: 'Ca không còn được giao cho bạn. Đóng form và tải lại.',
                        work_driver_assignment_required: 'Ca xe chưa được giao cho bạn làm tài xế. Liên hệ Quản lý.',
                        handover_confirmation_required: 'Ca không còn đang thực hiện hoặc chưa đủ xác nhận bàn giao. Kiểm tra lại hồ sơ.',
                        taxi_return_not_due: 'Chưa đến thời điểm lượt về của chuyến xe. Kiểm tra lịch trước khi bàn giao.'
                    };
                    errorText.textContent = error.mediaMessage?error.message:messages[error.message] || (error.code === 'PT409' ? 'Ca đã thay đổi. Đóng form và mở lại để lấy dữ liệu mới; nội dung đang nhập vẫn được giữ trong form này.' : error.code === '42501' ? 'Bạn không có quyền bàn giao ca dịch vụ này.' : 'Chưa xác nhận lưu bàn giao thành công. Giữ nguyên thông tin và thử lại.');
                }
            } finally { state.saving = false; save.disabled = state.loading; save.textContent = 'Xác nhận bàn giao'; Object.values(checks).forEach(input => input.disabled = false); note.disabled = false; }
        };
        async function open({ appointmentId, onSaved } = {}) {
            if (state.saving || !allowed()) return;
            state.media?.close();state.media=null;mediaRoot.replaceChildren();state.recordId=crypto.randomUUID();
            state.row = state.pending = null; state.loading = true; state.onSaved = onSaved; state.returnFocus = document.activeElement; form.reset(); summary.replaceChildren(); prior.textContent = errorText.textContent = '';
            Object.values(checks).forEach(input => { input.disabled = true; input.removeAttribute('aria-invalid'); }); note.disabled = true; save.disabled = true; save.textContent = 'Đang tải';
            const generation = ++state.generation; overlay.classList.add('active'); overlay.setAttribute('aria-hidden', 'false'); close.focus();
            try {
                const rows = await read('appointments', appointmentId), row = rows.find(item => item.id === appointmentId); if (generation !== state.generation) return;
                if (!row || row.appointment_status !== 'in_progress') { errorText.textContent = 'Không tìm thấy ca đang thực hiện trong phạm vi được giao.'; save.textContent = 'Xác nhận bàn giao'; return; }
                const [pets, customers, intake] = await Promise.all([read('pets', row.pet_id), read('customers', row.customer_id), latestIntake(row.id)]); if (generation !== state.generation) return;
                const pet = pets.find(item => item.id === row.pet_id), customer = customers.find(item => item.id === row.customer_id); if (!pet || !customer || pet.customer_id !== customer.id) throw Error('handover_context_missing');
                for (const [name, value] of [['Mã lịch', row.appointment_code], ['Khách hàng', customer.full_name], ['Bé cưng', pet.pet_name], ['Nhân viên bàn giao', PawpalAdminAccess.state.user.name]]) summary.append(el('dt', name), el('dd', value));
                if (intake) prior.textContent = 'Tiếp nhận đã ghi: ' + intake.condition_note + (intake.note ? '\nGhi chú tư trang: ' + intake.note : '');
                if (!intake || intake.customer_confirmation_status !== 'confirmed') { errorText.textContent = 'Biên bản tiếp nhận mới nhất chưa được khách xác nhận. Kiểm tra lại trước khi bàn giao.'; save.textContent = 'Xác nhận bàn giao'; return; }
                const {createHandoverMediaEditor}=await import('/scripts/shared/handover-media.mjs');if(generation!==state.generation)return;
                state.media=createHandoverMediaEditor({root:mediaRoot,db:getSupabaseClient()});
                await state.media.reset({appointment:row.id,record:state.recordId});if(generation!==state.generation)return;
                state.row = row; state.loading = false; Object.values(checks).forEach(input => input.disabled = false); note.disabled = false; save.disabled = false; save.textContent = 'Xác nhận bàn giao'; checks.qualityAccepted.focus();
            } catch { if (generation === state.generation) { errorText.textContent = 'Không tải đủ dữ liệu bàn giao. Đóng form và tải lại hồ sơ.'; save.textContent = 'Xác nhận bàn giao'; } }
        }
        dialog = { open, close: closeDialog, clear: () => { closeDialog(); form.reset(); summary.replaceChildren(); prior.textContent = errorText.textContent = ''; state.row = state.pending = state.onSaved = null; } }; return dialog;
    }
    window.addEventListener('hashchange', () => dialog?.close());
    window.PawpalStaffHandover = Object.freeze({ open: options => { if (allowed()) return build().open(options); }, closeAll: () => dialog?.clear() });
})();

;
(function () {
    'use strict';
    const allowed = () => window.PawpalAdminAccess?.isStaff() && PawpalAdminAccess.state.user.permissions.includes('work.service.perform');
    const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
    const date = value => new Date(value).toLocaleString('vi-VN', { timeZone:'Asia/Bangkok', dateStyle:'short', timeStyle:'short' });
    async function read(kind, id) { const { data, error } = await getSupabaseClient().rpc('get_staff_workspace', { p_kind:kind, p_query:'', p_id:id, p_page:1 }); if (error) throw error; return data.items; }
    let dialog;
    function build() {
        if (dialog) return dialog;
        const overlay = el('div', null, 'admin-modal-overlay staff-workspace-modal'); overlay.id = 'staffHotelCheckoutModal'; overlay.setAttribute('aria-hidden','true');
        const card = el('div', null, 'admin-modal-card'); card.setAttribute('role','dialog'); card.setAttribute('aria-modal','true'); card.setAttribute('aria-labelledby','staffHotelCheckoutTitle');
        const form = el('form'); form.setAttribute('onsubmit','return false;');
        const header = el('div', null, 'workspace-modal-header'), title = el('h2','Trả phòng'), close = el('button','Đóng','btn-modal-close'); title.id = 'staffHotelCheckoutTitle'; close.type = 'button'; close.dataset.closeModal = overlay.id; header.append(title,close);
        const summary = el('dl',null,'workspace-intake-summary'), explanation = el('p','Trả phòng sẽ giải phóng phòng và giữ nguyên đơn giá đã chốt. Sau đó thực hiện bàn giao.','workspace-checkout-explanation');
        const message = el('p','','workspace-error'); message.setAttribute('role','alert');
        const footer = el('div',null,'workspace-modal-footer'), cancel = el('button','Hủy','admin-btn admin-btn-secondary'), save = el('button','Xác nhận trả phòng','admin-btn admin-btn-primary'); save.id = 'staffHotelCheckoutSave'; cancel.type = save.type = 'button'; cancel.dataset.closeModal = overlay.id; footer.append(cancel,save);
        form.append(header,summary,explanation,message,footer); card.append(form); overlay.append(card); document.body.append(overlay);
        const state = { row:null, stay:null, loading:true, saving:false, generation:0, onSaved:null, returnFocus:null };
        function closeDialog() { state.generation++; overlay.classList.remove('active'); overlay.setAttribute('aria-hidden','true'); if (state.returnFocus?.isConnected) state.returnFocus.focus(); }
        overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-close-modal="'+overlay.id+'"]'))closeDialog();});
        overlay.addEventListener('keydown',event=>{
            if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}
            if(event.key!=='Tab')return;
            const nodes=[...overlay.querySelectorAll('button:not([disabled])')].filter(node=>node.offsetParent!==null),first=nodes[0],last=nodes.at(-1);
            if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
        });
        form.addEventListener('submit',event=>event.preventDefault());
        save.onclick=async()=>{
            if(state.loading||state.saving||!state.row||!state.stay)return;
            if(!allowed()){message.textContent='Bạn không có quyền trả phòng cho ca này.';return;}
            state.saving=true;save.disabled=true;save.textContent='Đang trả phòng';message.textContent='';
            const generation=state.generation,appointmentId=state.row.id,stayId=state.stay.id,roomId=state.stay.room_id;
            const finish=()=>{if(generation!==state.generation)return;const callback=state.onSaved;closeDialog();summary.replaceChildren();state.row=state.stay=null;if(allowed())callback?.(appointmentId);};
            try {
                const {data,error}=await getSupabaseClient().rpc('close_admin_hotel_stay',{p_appointment_id:appointmentId,p_expected_updated_at:state.row.updated_at});
                if(error)throw error;if(data!==stayId)throw Error('invalid_checkout_result');finish();
            }catch(error){
                if(generation!==state.generation)return;
                // Checkout has no request UUID. Resolve a lost response by reading the actual scoped stay state.
                if(error.code!=='42501'){
                    try{const stays=await read('hotel_stays',appointmentId),current=stays.find(stay=>stay.id===stayId);if(current?.status==='closed'&&current.room_id===roomId&&current.lead_staff_id===PawpalAdminAccess.state.user.id){finish();return;}}catch{}
                }
                if(generation!==state.generation)return;
                message.textContent=error.code==='42501'?'Ca không còn do bạn phụ trách. Đóng form và tải lại.':error.code==='PT409'?'Ca đã thay đổi. Đóng form và mở lại để kiểm tra phòng trước khi trả.':error.message==='hotel_not_checked_in'?'Ca hoặc phòng không còn ở trạng thái đang lưu trú. Tải lại hồ sơ.':'Chưa xác nhận trả phòng thành công. Giữ form và thử lại hoặc tải lại hồ sơ để kiểm tra.';
            }finally{state.saving=false;save.disabled=state.loading;save.textContent='Xác nhận trả phòng';}
        };
        async function open({appointmentId,onSaved}={}){
            if(state.saving||!allowed())return;state.row=state.stay=null;state.loading=true;state.onSaved=onSaved;state.returnFocus=document.activeElement;summary.replaceChildren();message.textContent='';save.disabled=true;save.textContent='Đang tải';const generation=++state.generation;
            overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');close.focus();
            try{
                const rows=await read('appointments',appointmentId),row=rows.find(item=>item.id===appointmentId);if(generation!==state.generation)return;
                if(!row||row.appointment_status!=='in_progress'){message.textContent='Không tìm thấy ca đang lưu trú trong phạm vi được giao.';save.textContent='Xác nhận trả phòng';return;}
                const [stays,pets,customers]=await Promise.all([read('hotel_stays',row.id),read('pets',row.pet_id),read('customers',row.customer_id)]);if(generation!==state.generation)return;
                if(stays.length!==1){message.textContent='Không tìm thấy đúng một lượt lưu trú cho ca này. Liên hệ Quản lý.';save.textContent='Xác nhận trả phòng';return;}
                const stay=stays[0],pet=pets.find(item=>item.id===row.pet_id),customer=customers.find(item=>item.id===row.customer_id);
                if(!pet||!customer||pet.customer_id!==customer.id||!stay.room_number||stay.daily_price==null||!Number.isFinite(Number(stay.daily_price)))throw Error('checkout_context_missing');
                for(const[name,value]of [['Mã lưu trú',stay.booking_code],['Khách hàng',customer.full_name],['Bé cưng',pet.pet_name],['Phòng',stay.room_number+(stay.room_type?' · '+stay.room_type:'')],['Nhận phòng theo lịch',date(stay.check_in_at)],['Trả phòng theo lịch',date(stay.check_out_at)],['Đơn giá đã chốt',new Intl.NumberFormat('vi-VN').format(Number(stay.daily_price))+' đ']])summary.append(el('dt',name),el('dd',value));
                if(stay.status==='closed'){message.textContent='Phòng đã được trả. Thực hiện bàn giao khi đủ điều kiện.';save.textContent='Đã trả phòng';return;}
                if(stay.status!=='checked_in'){message.textContent='Phòng chưa ở trạng thái đang lưu trú. Kiểm tra lại hồ sơ.';save.textContent='Xác nhận trả phòng';return;}
                if(stay.lead_staff_id!==PawpalAdminAccess.state.user.id){message.textContent='Chỉ nhân viên phụ trách ca được trả phòng. Liên hệ Quản lý.';save.textContent='Xác nhận trả phòng';return;}
                state.row=row;state.stay=stay;state.loading=false;save.disabled=false;save.textContent='Xác nhận trả phòng';
            }catch{if(generation===state.generation){message.textContent='Không tải đủ dữ liệu lưu trú. Đóng form và tải lại hồ sơ.';save.textContent='Xác nhận trả phòng';}}
        }
        dialog={open,close:closeDialog,clear:()=>{closeDialog();summary.replaceChildren();message.textContent='';state.row=state.stay=state.onSaved=null;}};return dialog;
    }
    window.addEventListener('hashchange',()=>dialog?.close());
    window.PawpalStaffHotelCheckout=Object.freeze({open:options=>{if(allowed())return build().open(options);},closeAll:()=>dialog?.clear()});
})();

;
(function () {
    'use strict';
    const allowed = () => window.PawpalAdminAccess?.isStaff() && PawpalAdminAccess.state.user.permissions.includes('work.service.perform');
    const el = (tag, text, cls) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node; };
    async function read(kind, id) { const { data, error } = await getSupabaseClient().rpc('get_staff_workspace', { p_kind:kind, p_query:'', p_id:id, p_page:1 }); if (error) throw error; return data.items; }
    const pending = new Map(); let dialog;
    function build() {
        if (dialog) return dialog;
        const overlay = el('div', null, 'admin-modal-overlay staff-workspace-modal'); overlay.id = 'staffPickupModal'; overlay.setAttribute('aria-hidden','true');
        const card = el('div', null, 'admin-modal-card'); card.setAttribute('role','dialog'); card.setAttribute('aria-modal','true'); card.setAttribute('aria-labelledby','staffPickupTitle');
        const form = el('form'); form.noValidate = true; form.setAttribute('onsubmit','return false;');
        const header = el('div',null,'workspace-modal-header'), title = el('h2','Mời đón bé'), close = el('button','Đóng','btn-modal-close'); title.id = 'staffPickupTitle'; close.type = 'button'; close.dataset.closeModal = overlay.id; header.append(title,close);
        const summary = el('dl',null,'workspace-intake-summary');
        const group = el('div',null,'workspace-form-field'), label = el('label','Nội dung thông báo '), content = el('textarea',null,'admin-input'); content.id = 'staffPickupContent'; content.rows = 4; content.required = true; content.maxLength = 4000; label.htmlFor = content.id; label.append(el('span','*','workspace-required')); group.append(label,content);
        const channel = el('p','Thông báo được gửi vào tài khoản PawPal của khách.','workspace-checkout-explanation');
        const confirmLabel = el('label',null,'workspace-intake-confirmation'), confirm = el('input'); confirm.id = 'staffPickupReady'; confirm.type = 'checkbox'; confirm.required = true; confirmLabel.append(confirm,el('span','Bé đã sẵn sàng để đón '),el('span','*','workspace-required'));
        const message = el('p','','workspace-error'); message.setAttribute('role','alert');
        const footer = el('div',null,'workspace-modal-footer'), cancel = el('button','Hủy','admin-btn admin-btn-secondary'), save = el('button','Gửi thông báo','admin-btn admin-btn-primary'); save.id = 'staffPickupSave'; cancel.type = save.type = 'button'; cancel.dataset.closeModal = overlay.id; footer.append(cancel,save);
        form.append(header,summary,group,channel,confirmLabel,message,footer); card.append(form); overlay.append(card); document.body.append(overlay);
        const state = { row:null, id:null, loading:true, saving:false, blocked:false, unresolved:null, generation:0, returnFocus:null, onSaved:null };
        function controls() { content.disabled = state.loading || state.saving || state.blocked || !!state.unresolved; confirm.disabled = save.disabled = state.loading || state.saving || state.blocked; save.textContent = state.saving ? 'Đang gửi' : state.unresolved ? 'Xác nhận gửi lại' : 'Gửi thông báo'; }
        content.addEventListener('input',()=>{ confirm.checked = false; message.textContent = ''; });
        function closeDialog() { state.generation++; overlay.classList.remove('active'); overlay.setAttribute('aria-hidden','true'); summary.replaceChildren(); content.value = ''; confirm.checked = false; message.textContent = ''; state.row = null; if (state.returnFocus?.isConnected) state.returnFocus.focus(); }
        overlay.addEventListener('click',event=>{ if(event.target===overlay || event.target.closest('[data-close-modal="'+overlay.id+'"]')) closeDialog(); });
        overlay.addEventListener('keydown',event=>{ if(event.key==='Escape'){ event.preventDefault(); event.stopPropagation(); closeDialog(); return; } if(event.key!=='Tab')return; const nodes=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled])')].filter(node=>node.offsetParent!==null),first=nodes[0],last=nodes.at(-1); if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();} });
        form.addEventListener('submit',event=>event.preventDefault());
        save.onclick = async () => {
            if (!allowed() || state.loading || state.saving || state.blocked) return;
            if (!content.value.trim() || content.value.trim().length > 4000) { message.textContent = 'Nhập nội dung thông báo từ 1 đến 4000 ký tự.'; content.focus(); return; }
            if (!confirm.checked) { message.textContent = 'Xác nhận bé đã sẵn sàng để đón trước khi gửi.'; confirm.focus(); return; }
            const attempt = state.unresolved || { p_id:crypto.randomUUID(), p_appointment_id:state.id, p_expected_updated_at:state.row.updated_at, p_content:content.value.trim(), p_ready:true }, key = PawpalAdminAccess.state.user.id+':'+state.id, generation = state.generation;
            pending.set(key,attempt); state.saving = true; controls(); message.textContent = '';
            try {
                const { data,error } = await getSupabaseClient().rpc('save_admin_pickup_notification',attempt); if(error)throw error; if(data!==attempt.p_id)throw Error('invalid_pickup_result'); pending.delete(key);
                if(generation!==state.generation)return; const callback=state.onSaved; closeDialog(); if(allowed())callback?.();
            } catch(error) {
                const definitive = ['42501','22023','PT409','P0002'].includes(error.code); if(definitive)pending.delete(key);
                if(generation!==state.generation)return; state.unresolved = definitive ? null : attempt; state.blocked = definitive; confirm.checked = false;
                message.textContent = error.code==='42501' ? 'Ca không còn được giao cho bạn. Đóng form và tải lại.' : error.code==='PT409' ? 'Ca đã thay đổi. Đóng form và mở lại để kiểm tra trước khi gửi.' : error.message==='confirmed_intake_required' ? 'Cần biên bản tiếp nhận được khách xác nhận trước khi mời đón bé.' : error.message==='pending_service_adjustments' ? 'Cần hoàn tất duyệt và xác nhận điều chỉnh dịch vụ trước khi mời đón bé.' : error.message==='pickup_notification_not_ready' ? 'Ca chưa ở trạng thái cho phép mời đón bé. Đóng form và tải lại.' : definitive ? 'Không thể gửi thông báo cho ca này. Đóng form và tải lại.' : 'Chưa xác nhận gửi thành công. Nội dung được giữ nguyên; xác nhận rồi thử lại cùng thông báo để tránh gửi trùng.';
            } finally { state.saving = false; if(generation===state.generation)controls(); }
        };
        async function open({appointmentId,onSaved}={}) {
            if(!allowed()||state.saving)return; state.id=appointmentId;state.row=null;state.onSaved=onSaved;state.loading=true;state.blocked=false;state.unresolved=null;state.returnFocus=document.activeElement;summary.replaceChildren();content.value='';confirm.checked=false;message.textContent='';controls();const generation=++state.generation;overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');close.focus();
            try {
                const rows=await read('appointments',appointmentId),row=rows.find(item=>item.id===appointmentId);if(generation!==state.generation)return;
                if(!row||!['in_progress','completed'].includes(row.appointment_status))throw Error('pickup_context_missing');
                const [pets,customers]=await Promise.all([read('pets',row.pet_id),read('customers',row.customer_id)]);if(generation!==state.generation)return;const pet=pets.find(item=>item.id===row.pet_id),customer=customers.find(item=>item.id===row.customer_id);if(!pet||!customer||pet.customer_id!==customer.id)throw Error('pickup_context_missing');
                for(const[name,value]of [['Mã lịch',row.appointment_code],['Khách hàng',customer.full_name],['Bé cưng',pet.pet_name]])summary.append(el('dt',name),el('dd',value));
                state.row=row;state.unresolved=pending.get(PawpalAdminAccess.state.user.id+':'+appointmentId)||null;content.value=state.unresolved?.p_content||'Bé '+pet.pet_name+' đã sẵn sàng để đón. PawPal mời bạn đến đón bé. Vui lòng liên hệ cửa hàng nếu cần hỗ trợ.';
                if(state.unresolved)message.textContent='Lần gửi trước chưa được xác nhận. Kiểm tra nội dung và xác nhận để thử lại cùng thông báo.';
                state.loading=false;controls();
            }catch{if(generation===state.generation){state.blocked=true;message.textContent='Không tải đủ thông tin ca trong phạm vi được giao. Đóng form và tải lại.';controls();}}
        }
        dialog={open,close:closeDialog};return dialog;
    }
    window.addEventListener('hashchange',()=>dialog?.close());
    window.PawpalStaffPickup=Object.freeze({open:options=>{if(allowed())return build().open(options);},closeAll:()=>dialog?.close()});
})();

;
(function () {
    'use strict';
    const allowed=()=>window.PawpalAdminAccess?.isStaff()&&PawpalAdminAccess.state.user.permissions.includes('work.cashier.collect');
    const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;};
    const money=value=>new Intl.NumberFormat('vi-VN').format(Number(value))+' đ';
    async function rpc(name,args){const{data,error}=await getSupabaseClient().rpc(name,args);if(error)throw error;return data;}
    const pending=new Map();let dialog;
    function build(){
        if(dialog)return dialog;
        const overlay=el('div',null,'admin-modal-overlay staff-workspace-modal');overlay.id='staffServiceCashierModal';overlay.setAttribute('aria-hidden','true');
        const card=el('div',null,'admin-modal-card workspace-cashier-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','staffServiceCashierTitle');
        const form=el('form');form.noValidate=true;form.setAttribute('onsubmit','return false;');
        const header=el('div',null,'workspace-modal-header'),title=el('h2','Thu tiền ca dịch vụ'),close=el('button','Đóng','btn-modal-close');title.id='staffServiceCashierTitle';close.type='button';close.dataset.closeModal=overlay.id;header.append(title,close);
        const summary=el('dl',null,'workspace-intake-summary');summary.id='staffServiceCashierSummary';
        const grid=el('div',null,'workspace-pet-grid'),fields={},groups={};
        function field(key,label,type='text',required=false,wide=false){const group=el('div',null,'workspace-form-field'+(wide?' workspace-field-wide':'')),caption=el('label',label+(required?' ':'')),input=el(type==='textarea'?'textarea':'input',null,'admin-input');input.id='staffServiceCashier'+key;caption.htmlFor=input.id;if(required)caption.append(el('span','*','workspace-required'));input.required=required;if(type==='textarea'){input.rows=2;input.maxLength=2000;}else input.type=type;group.append(caption,input);grid.append(group);fields[key]=input;groups[key]=group;return input;}
        field('method','Phương thức thanh toán','text',true);const amount=field('amount','Số tiền ghi nhận','number',true);amount.min=1;amount.max=100000000000;amount.step=1;
        field('reference','Mã giao dịch đã đối soát','text',true,true).maxLength=200;field('reason','Nội dung thu tiền','textarea',true,true);
        const confirmation=el('label',null,'workspace-intake-confirmation'),confirmed=el('input');confirmed.id='staffServiceCashierConfirmed';confirmed.type='checkbox';confirmed.required=true;confirmation.htmlFor=confirmed.id;confirmation.append(confirmed,el('span','Đã nhận từ khách đúng số tiền ghi ở trên '),el('span','*','workspace-required'));
        const history=el('div',null,'workspace-cashier-history');history.id='staffServiceCashierHistory';
        const message=el('p','','workspace-error');message.setAttribute('role','alert');
        const footer=el('div',null,'workspace-modal-footer'),cancel=el('button','Hủy','admin-btn admin-btn-secondary'),save=el('button','Ghi nhận thu tiền','admin-btn admin-btn-primary');save.id='staffServiceCashierSave';cancel.type=save.type='button';cancel.dataset.closeModal=overlay.id;footer.append(cancel,save);
        form.append(header,summary,grid,confirmation,history,message,footer);card.append(form);overlay.append(card);document.body.append(overlay);
        const menu=el('div',null,'autocomplete-dropdown workspace-autocomplete-menu'),selected=el('div',null,'workspace-selected-entity');menu.id='staffServiceCashierMethodOptions';menu.setAttribute('role','listbox');menu.hidden=selected.hidden=true;groups.method.classList.add('workspace-autocomplete');groups.method.append(menu,selected);fields.method.autocomplete='off';fields.method.setAttribute('role','combobox');fields.method.setAttribute('aria-controls',menu.id);fields.method.setAttribute('aria-expanded','false');
        const state={context:null,method:null,appointmentId:null,generation:0,saving:false,loading:true,blocked:false,unresolved:null,onSaved:null,returnFocus:null};
        const key=()=>PawpalAdminAccess.state.user.id+':'+state.appointmentId;
        function hideMenu(){menu.hidden=true;fields.method.setAttribute('aria-expanded','false');fields.method.removeAttribute('aria-activedescendant');}
        function setMethod(method){state.method=method;fields.method.value=method?.name||'';fields.method.readOnly=!!method;selected.replaceChildren();selected.hidden=!method;groups.reference.hidden=!method?.requires_reference;fields.reference.required=!!method?.requires_reference;confirmed.checked=false;hideMenu();if(method){selected.append(el('span',method.name));const clear=el('button','✕ Bỏ chọn','workspace-text-button');clear.type='button';clear.onclick=event=>{event.stopPropagation();if(state.saving||state.unresolved)return;setMethod(null);fields.reference.value='';fields.method.focus();};selected.append(clear);}}
        let active=-1,options=[];
        function showMenu(){if(state.loading||state.blocked||state.saving||state.unresolved||fields.method.readOnly)return;menu.replaceChildren();active=-1;options=[];for(const method of state.context?.methods||[]){if(!method.name.toLocaleLowerCase('vi').includes(fields.method.value.trim().toLocaleLowerCase('vi')))continue;const button=el('button',method.name,'workspace-autocomplete-option');button.type='button';button.id=menu.id+options.length;button.setAttribute('role','option');button.setAttribute('aria-selected','false');button.onclick=()=>{setMethod(method);fields.amount.focus();};menu.append(button);options.push(button);}if(!options.length)menu.append(el('p','Không có phương thức phù hợp.'));menu.hidden=false;fields.method.setAttribute('aria-expanded','true');}
        fields.method.addEventListener('focus',showMenu);fields.method.addEventListener('click',showMenu);fields.method.addEventListener('input',()=>{state.method=null;confirmed.checked=false;showMenu();});
        fields.method.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){event.preventDefault();event.stopPropagation();hideMenu();}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if(menu.hidden){showMenu();return;}if(!options.length)return;active=(active+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options.forEach((button,index)=>button.setAttribute('aria-selected',String(index===active)));fields.method.setAttribute('aria-activedescendant',options[active].id);}else if(event.key==='Enter'){event.preventDefault();options[active]?.click();}});
        for(const name of ['amount','reference','reason'])fields[name].addEventListener('input',()=>{confirmed.checked=false;message.textContent='';});
        function controls(){for(const input of Object.values(fields))input.disabled=state.loading||state.blocked||state.saving||!!state.unresolved;selected.querySelectorAll('button').forEach(button=>button.disabled=state.saving||!!state.unresolved);confirmed.disabled=state.loading||state.blocked||state.saving;save.disabled=state.loading||state.blocked||state.saving;save.textContent=state.saving?'Đang ghi nhận':state.unresolved?'Thử lại khoản thu':'Ghi nhận thu tiền';}
        function paint(context){
            summary.replaceChildren();for(const[label,value]of [['Mã ca',context.appointment_code],['Tổng tiền',money(context.total)],['Đã thu sau hoàn',money(context.collected)],['Còn phải thu',money(context.remaining)]])summary.append(el('dt',label),el('dd',value));
            const statuses={succeeded:'Thành công',pending:'Chờ xử lý',failed:'Thất bại',cancelled:'Đã hủy'};
            function historyPage(page){
                history.replaceChildren(el('h3','Lịch sử thanh toán'));if(!context.payments.length)history.append(el('p','Chưa có khoản thu.'));
                for(const payment of context.payments.slice(page*10,page*10+10)){const entry=el('div',null,'workspace-cashier-entry');entry.append(el('strong',money(payment.amount)+' · '+(statuses[payment.transaction_status]||'Cần đối soát')),el('p',[payment.method_name,payment.payment_code,payment.succeeded_at?new Date(payment.succeeded_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'}):null].filter(Boolean).join(' · ')));for(const refund of payment.refunds||[])entry.append(el('p','Hoàn '+money(refund.refunded_amount)+' · '+(statuses[refund.refund_status]||'Cần đối soát')));history.append(entry);}
                if(context.payments.length>10){const pager=el('nav',null,'workspace-pager');pager.setAttribute('aria-label','Trang lịch sử thanh toán');for(const[label,next]of [['<',page-1],[String(page+1),page],['>',page+1]]){const button=el('button',label,next===page?'active':'');button.type='button';button.disabled=next<0||next*10>=context.payments.length;button.onclick=()=>historyPage(next);pager.append(button);}history.append(pager);}
            }
            historyPage(0);
        }
        const matches=(context,attempt)=>context.payments.some(payment=>payment.id===attempt.args.p_request_id&&payment.appointment_id===attempt.args.p_appointment_id&&payment.transaction_status==='succeeded'&&Number(payment.amount)===attempt.args.p_details.amount&&payment.payment_method_config_id===attempt.args.p_details.method_id);
        function closeDialog(){state.generation++;hideMenu();overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true');if(state.returnFocus?.isConnected)state.returnFocus.focus();}
        overlay.addEventListener('click',event=>{if(!groups.method.contains(event.target))hideMenu();if(event.target===overlay||event.target.closest('[data-close-modal="'+overlay.id+'"]'))closeDialog();});
        overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}if(event.key!=='Tab')return;const nodes=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled])')].filter(node=>node.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
        form.addEventListener('submit',event=>event.preventDefault());
        const errorText=error=>({service_cashier_changed:'Số dư hoặc ca dịch vụ đã thay đổi. Đóng và mở lại để đối chiếu.',pending_service_adjustments:'Ca còn điều chỉnh chờ duyệt hoặc chưa có xác nhận của khách. Liên hệ Quản lý.',service_money_exceeds_balance:'Số tiền vượt số còn phải thu. Đóng và mở lại để kiểm tra.',service_money_method_invalid:'Phương thức không còn được phép. Đóng và mở lại để chọn lại.',service_money_reference_duplicate:'Mã giao dịch này đã được ghi nhận. Đối chiếu trước khi thu thêm.',service_money_booking_closed:'Ca đã hủy hoặc khách vắng mặt, không thể thu thêm.',service_money_reference_required:'Nhập mã giao dịch ngân hàng đã đối soát.',service_request_conflict:'Yêu cầu đã được ghi với nội dung khác. Đóng và mở lại để đối chiếu.'}[error.message]||(error.code==='42501'?'Ca không còn được giao cho bạn hoặc bạn không còn quyền thu tiền. Đóng và tải lại.':'Chưa xác nhận ghi nhận thành công. Thử lại cùng khoản thu để đối chiếu.'));
        save.onclick=async()=>{
            if(!allowed()||state.loading||state.blocked||state.saving||!state.context)return;
            const value=Number(fields.amount.value),reason=fields.reason.value.trim(),reference=fields.reference.value.trim();
            if(!state.unresolved){if(!state.method){message.textContent='Chọn phương thức từ danh sách.';fields.method.focus();return;}if(!Number.isInteger(value)||value<=0||value>Number(state.context.remaining)||value>100000000000){message.textContent='Nhập số tiền nguyên dương không vượt số còn phải thu.';fields.amount.focus();return;}if(reason.length<2||reason.length>2000){message.textContent='Nhập nội dung thu tiền từ 2 đến 2000 ký tự.';fields.reason.focus();return;}if(state.method.requires_reference&&!reference){message.textContent='Nhập mã giao dịch ngân hàng đã đối soát.';fields.reference.focus();return;}}
            if(!confirmed.checked){message.textContent='Xác nhận đã nhận đúng số tiền từ khách trước khi ghi nhận.';confirmed.focus();return;}
            const attempt=state.unresolved||{args:{p_request_id:crypto.randomUUID(),p_appointment_id:state.appointmentId,p_expected_state:state.context.version,p_action:'collect',p_details:{method_id:state.method.id,amount:value,reason,reference:state.method.requires_reference?reference:'',confirmed:true}}};
            const generation=state.generation,attemptKey=key();pending.set(attemptKey,attempt);state.saving=true;controls();hideMenu();message.textContent='';
            const finish=()=>{pending.delete(attemptKey);if(generation!==state.generation)return;const callback=state.onSaved;closeDialog();if(allowed())callback?.(attempt.args.p_appointment_id);};
            try{const result=await rpc('post_admin_service_money',attempt.args);if(result!==attempt.args.p_request_id)throw Error('invalid_collection_result');finish();}
            catch(error){
                // SQL validation errors prove this attempt rolled back. An uncertain transport result keeps its UUID and immutable payload.
                const definitive=['42501','22023','23514','PT409','P0002'].includes(error.code);
                if(definitive)pending.delete(attemptKey);
                if(!definitive){try{const latest=await rpc('get_admin_service_cashier',{p_appointment_id:attempt.args.p_appointment_id});if(matches(latest,attempt)){finish();return;}}catch{}}
                if(generation!==state.generation)return;
                state.unresolved=definitive?null:attempt;state.blocked=definitive;confirmed.checked=false;message.textContent=errorText(error);
            }finally{state.saving=false;if(generation===state.generation)controls();}
        };
        async function open({appointmentId,onSaved}={}){
            if(state.saving||!allowed())return;state.appointmentId=appointmentId;state.context=state.method=state.unresolved=null;state.loading=true;state.blocked=false;state.onSaved=onSaved;state.returnFocus=document.activeElement;const generation=++state.generation;
            form.reset();summary.replaceChildren();history.replaceChildren();selected.hidden=true;groups.reference.hidden=true;message.textContent='';controls();overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');close.focus();
            try{const context=await rpc('get_admin_service_cashier',{p_appointment_id:appointmentId});if(generation!==state.generation)return;
                if(context?.appointment_id!==appointmentId||!context.version||!Array.isArray(context.methods)||!Array.isArray(context.payments)||!['total','collected','remaining'].every(name=>Number.isFinite(Number(context[name]))))throw Error('invalid_cashier_context');
                state.context=context;paint(context);const previous=pending.get(key());if(previous&&matches(context,previous)){pending.delete(key());message.textContent='Khoản thu trước đã được ghi nhận. Kiểm tra lịch sử bên dưới.';}
                if(['cancelled','no_show'].includes(context.status)){state.blocked=true;message.textContent='Ca đã hủy hoặc khách vắng mặt, không thể thu thêm.';}else if(Number(context.remaining)<=0){state.blocked=true;message.textContent='Ca đã thu đủ, không có số tiền cần thu thêm.';}else if(!context.methods.length){state.blocked=true;message.textContent='Chưa có phương thức thu tiền được phép. Liên hệ Quản lý.';}
                const unresolved=pending.get(key());if(unresolved&&!state.blocked){state.unresolved=unresolved;const details=unresolved.args.p_details;setMethod(context.methods.find(method=>method.id===details.method_id)||{id:details.method_id,name:'Phương thức của khoản thu đang đối chiếu',requires_reference:!!details.reference});fields.amount.value=details.amount;fields.reason.value=details.reason;fields.reference.value=details.reference;message.textContent='Khoản thu trước chưa được xác nhận. Thử lại đúng khoản thu này trước khi tạo khoản mới.';}else{setMethod(context.methods.find(method=>method.name==='Tiền mặt')||null);fields.amount.value=Number(context.remaining)>0?context.remaining:'';}
                state.loading=false;controls();
            }catch{if(generation===state.generation){state.blocked=true;message.textContent='Không tải đủ dữ liệu thu tiền. Đóng và mở lại để kiểm tra.';controls();}}
        }
        dialog={open,close:closeDialog,clear:()=>{closeDialog();pending.clear();state.context=state.method=state.unresolved=state.onSaved=null;form.reset();summary.replaceChildren();history.replaceChildren();selected.replaceChildren();message.textContent='';}};return dialog;
    }
    window.addEventListener('hashchange',()=>dialog?.close());
    window.PawpalStaffServiceCashier=Object.freeze({open:options=>{if(allowed())return build().open(options);},closeAll:()=>{pending.clear();dialog?.clear();}});
})();

;
(function(){
    'use strict';
    const allowed=()=>window.PawpalAdminAccess?.isStaff()&&PawpalAdminAccess.state.user.permissions.includes('work.cashier.collect');
    const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;};
    const money=value=>new Intl.NumberFormat('vi-VN').format(Number(value))+' đ';
    const statuses={pending:'Chờ xác nhận',confirmed:'Đã xác nhận',checked_in:'Đã đón bé',in_progress:'Đang thực hiện',completed:'Hoàn thành',cancelled:'Đã hủy',no_show:'Khách không đến'};
    const frames=new Set();let dialog;
    async function read(appointmentId){const{data,error}=await getSupabaseClient().rpc('get_staff_service_receipt',{p_appointment_id:appointmentId});if(error)throw error;if(data?.appointment_id!==appointmentId||!data.appointment_code||!Array.isArray(data.lines)||!['subtotal','line_discount','voucher_discount','adjustment','total','collected','refunded','remaining'].every(key=>data[key]!=null&&Number.isFinite(Number(data[key])))||data.lines.some(line=>!line.id||!['quantity','unit_price','discount','total'].every(key=>line[key]!=null&&Number.isFinite(Number(line[key])))))throw Error('invalid_receipt');return data;}
    function sheet(data,lines){
        const root=el('section',null,'workspace-receipt-sheet'),heading=el('h3','PawPal · '+data.appointment_code);root.append(heading);
        const details=el('dl',null,'workspace-intake-summary');for(const[name,value]of [['Lịch bắt đầu',new Date(data.scheduled_start_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})],['Khách hàng',data.customer_name||'Chưa có thông tin'],['Số điện thoại',data.phone||'—'],['Bé cưng',data.pet_name||'Chưa có thông tin'],['Trạng thái',statuses[data.status]||'Cần kiểm tra']])details.append(el('dt',name),el('dd',value));root.append(details);
        const wrapper=el('div',null,'workspace-receipt-table-wrap');wrapper.tabIndex=0;wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','Hạng mục trên phiếu');const table=el('table',null,'admin-table'),head=el('thead'),tr=el('tr');for(const name of ['Hạng mục','Số lượng','Đơn giá','Giảm giá','Thành tiền'])tr.append(el('th',name));head.append(tr);const body=el('tbody');for(const line of lines){const row=el('tr'),name=el('td');name.append(el('strong',line.name));row.append(name,el('td',new Intl.NumberFormat('vi-VN').format(Number(line.quantity))),el('td',money(line.unit_price)),el('td',money(line.discount)),el('td',money(line.total)));body.append(row);}if(!lines.length){const row=el('tr'),cell=el('td','Chưa có hạng mục.');cell.colSpan=5;row.append(cell);body.append(row);}table.append(head,body);wrapper.append(table);root.append(wrapper);
        const amounts=el('dl',null,'workspace-intake-summary');for(const[name,value]of [['Tiền dịch vụ',data.subtotal],['Giảm trên hạng mục',data.line_discount],['Điều chỉnh đã xác nhận',data.adjustment],['Giảm theo ưu đãi',data.voucher_discount],['Tổng tiền ca',data.total],['Đã thu sau hoàn',data.collected],['Đã hoàn',data.refunded],['Còn phải thu',data.remaining]])amounts.append(el('dt',name),el('dd',money(value)));root.append(amounts,el('p','Phiếu ca dịch vụ dùng để đối chiếu ca và thu tiền.','workspace-checkout-explanation'));return root;
    }
    function clearFrames(){for(const frame of frames)frame.remove();frames.clear();}
    function build(){
        if(dialog)return dialog;const overlay=el('div',null,'admin-modal-overlay staff-workspace-modal');overlay.id='staffServiceReceiptModal';overlay.setAttribute('aria-hidden','true');const card=el('div',null,'admin-modal-card workspace-receipt-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','staffServiceReceiptTitle');
        const form=el('form');form.setAttribute('onsubmit','return false;');const header=el('div',null,'workspace-modal-header'),title=el('h2','Phiếu ca dịch vụ'),close=el('button','Đóng','btn-modal-close');title.id='staffServiceReceiptTitle';close.type='button';close.dataset.closeModal=overlay.id;header.append(title,close);
        const content=el('div');content.id='staffServiceReceiptContent';const pager=el('nav',null,'workspace-pager');pager.setAttribute('aria-label','Trang hạng mục trên phiếu');const message=el('p','','workspace-error');message.setAttribute('role','alert');const footer=el('div',null,'workspace-modal-footer'),cancel=el('button','Hủy','admin-btn admin-btn-secondary'),print=el('button','In phiếu','admin-btn admin-btn-primary');print.id='staffServiceReceiptPrint';cancel.type=print.type='button';cancel.dataset.closeModal=overlay.id;footer.append(cancel,print);form.append(header,content,pager,message,footer);card.append(form);overlay.append(card);document.body.append(overlay);
        const state={id:null,data:null,generation:0,busy:false,returnFocus:null};
        function closeDialog(){state.generation++;overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true');state.data=null;content.replaceChildren();pager.replaceChildren();message.textContent='';print.disabled=true;clearFrames();if(state.returnFocus?.isConnected)state.returnFocus.focus();}
        function paint(page=0){const data=state.data;content.replaceChildren(sheet(data,data.lines.slice(page*10,page*10+10)));pager.replaceChildren();if(data.lines.length<=10)return;const prev=el('button','<'),active=el('button',String(page+1),'active'),next=el('button','>');for(const button of [prev,active,next])button.type='button';prev.disabled=page===0;next.disabled=(page+1)*10>=data.lines.length;active.setAttribute('aria-current','page');prev.onclick=()=>paint(page-1);next.onclick=()=>paint(page+1);pager.append(prev,active,next);}
        overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-close-modal="'+overlay.id+'"]'))closeDialog();});overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}if(event.key!=='Tab')return;const nodes=[...overlay.querySelectorAll('button:not([disabled]),[tabindex="0"]')].filter(node=>node.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});form.addEventListener('submit',event=>event.preventDefault());
        print.onclick=async()=>{
            if(!allowed()||state.busy||!state.data)return;state.busy=true;print.disabled=true;message.textContent='';const generation=state.generation;
            try{const data=await read(state.id);if(generation!==state.generation||!allowed())return;state.data=data;paint();clearFrames();const frame=el('iframe');frame.title='Bản in phiếu ca dịch vụ';frame.className='workspace-receipt-print-frame workspace-service-receipt-print-frame';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');document.body.append(frame);frames.add(frame);const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu ca dịch vụ</title><style>body{font:13px Arial,sans-serif;color:#203A2C;padding:20px}h2,h3,th{color:#236B48}dl{display:grid;grid-template-columns:180px 1fr;gap:8px 16px}dd{margin:0;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin:16px 0;table-layout:fixed}th,td{text-align:left;padding:8px 4px;overflow-wrap:anywhere;vertical-align:top}th:first-child{width:30%}small{display:block;color:#4F7A65}tr{break-inside:avoid}@page{margin:14mm}</style></head><body><h2>Phiếu ca dịch vụ</h2></body></html>');doc.close();doc.body.append(sheet(data,data.lines));const cleanup=()=>{const connected=frame.isConnected;frame.remove();frames.delete(frame);if(connected&&generation===state.generation&&overlay.classList.contains('active')&&allowed())print.focus();};frame.contentWindow.addEventListener('afterprint',cleanup,{once:true});frame.contentWindow.focus();frame.contentWindow.print();setTimeout(cleanup,60000);
            }catch{if(generation===state.generation){clearFrames();state.data=null;content.replaceChildren();pager.replaceChildren();message.textContent='Không thể xác minh dữ liệu để in. Đóng phiếu và tải lại; chưa gửi lệnh in.';}}
            finally{state.busy=false;if(generation===state.generation)print.disabled=!state.data;}
        };
        async function open({appointmentId}={}){if(!allowed()||state.busy)return;state.id=appointmentId;state.data=null;state.returnFocus=document.activeElement;content.replaceChildren();pager.replaceChildren();message.textContent='';print.disabled=true;const generation=++state.generation;overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');close.focus();try{const data=await read(appointmentId);if(generation!==state.generation||!allowed())return;state.data=data;paint();print.disabled=false;}catch{if(generation===state.generation)message.textContent='Không tải được phiếu ca dịch vụ trong phạm vi được xem. Đóng phiếu và tải lại.';}}
        dialog={open,close:closeDialog};return dialog;
    }
    window.addEventListener('hashchange',()=>dialog?.close());
    window.PawpalStaffServiceReceipt=Object.freeze({open:options=>{if(allowed())return build().open(options);},closeAll:()=>{clearFrames();dialog?.close();}});
})();

;

// Role-scoped screens belong to this domain.
(function registerRoleViews(){
 const views=window.PawpalAdminViews;if(!views)return;const {date,money,status}=views.helpers;
 views.register("Dịch vụ",{columns:{appointments:[['Mã lịch', 'appointment_code'], ['Bắt đầu', r => date(r.scheduled_start_at)], ['Kết thúc', r => date(r.scheduled_end_at)], ['Trạng thái', r => status(r.appointment_status)]],services:[['Mã dịch vụ', 'service_code'], ['Tên dịch vụ', 'service_name'], ['Thời lượng', r => r.estimated_duration + ' phút']],service_records:[['Biên bản', r => r.record_type === 'intake' ? 'Tiếp nhận' : 'Bàn giao'], ['Thời gian', r => date(r.recorded_at)], ['Tình trạng', 'condition_note'], ['Xác nhận', r => r.customer_confirmation_status === 'confirmed' ? 'Khách đã xác nhận' : 'Chờ khách xác nhận']],care_logs:[['Thời gian', r => date(r.recorded_at)], ['Công việc', 'action_name_snapshot'], ['Ghi nhận', 'description'], ['Tình trạng', 'observed_condition']],service_items:[['Hạng mục', 'name_snapshot'], ['Trạng thái', r => status(r.status)]]},
targets:{"appointments":"tab-service-detail"},
profiles:{"service-profile":{read:"appointments",render:async(ctx)=>{const {el,date,money,status,read,table,card,facts,go,root,kind,id,row,target,turn}=ctx;
            const details = facts(root, row.appointment_code, [['Trạng thái', status(row.appointment_status)], ['Bắt đầu', date(row.scheduled_start_at)], ['Kết thúc', date(row.scheduled_end_at)]]);
            if(PawpalAdminAccess.state.user.permissions.includes('work.complaint.handle')){const complaint=el('button','Tạo khiếu nại','admin-btn admin-btn-secondary');complaint.type='button';complaint.onclick=()=>PawpalStaffComplaintCreate.open({appointmentId:id});details.append(complaint);}
            if (window.PawpalAdminAccess.state.user.permissions.includes('work.cashier.collect')) {
                const receipt=el('button','Phiếu ca dịch vụ','admin-btn admin-btn-secondary');receipt.type='button';receipt.onclick=()=>window.PawpalStaffServiceReceipt.open({appointmentId:id});details.append(receipt);
            }
            if (['in_progress','completed'].includes(row.appointment_status) && window.PawpalAdminAccess.state.user.permissions.includes('work.service.perform')) {
                const pickup = el('button', 'Mời đón bé', 'admin-btn admin-btn-secondary'); pickup.type = 'button';
                pickup.onclick = () => window.PawpalStaffPickup.open({ appointmentId:id, onSaved:()=>ctx.refresh() }); details.append(pickup);
            }
            if (!['cancelled','no_show'].includes(row.appointment_status) && window.PawpalAdminAccess.state.user.permissions.includes('work.cashier.collect')) {
                const collect = el('button', 'Thu tiền', 'admin-btn admin-btn-primary'); collect.type = 'button';
                collect.onclick = () => window.PawpalStaffServiceCashier.open({ appointmentId: id, onSaved: () => ctx.refresh() }); details.append(collect);
            }
            if (['confirmed','checked_in','in_progress'].includes(row.appointment_status) && window.PawpalAdminAccess.state.user.permissions.includes('work.service.perform')) {
                const intake = el('button', 'Lập biên bản tiếp nhận', 'admin-btn admin-btn-primary'); intake.type = 'button';
                intake.onclick = () => window.PawpalStaffIntake.open({ appointmentId: id, onSaved: () => ctx.refresh() }); details.append(intake);
            }
            if (row.appointment_status === 'in_progress' && window.PawpalAdminAccess.state.user.permissions.includes('work.service.perform')) {
                const handover = el('button', 'Bàn giao', 'admin-btn admin-btn-primary'); handover.type = 'button';
                handover.onclick = () => window.PawpalStaffHandover.open({ appointmentId: id, onSaved: () => ctx.refresh() }); details.append(handover);
            }
            const stays = await read('hotel_stays', { id }); if (!ctx.isCurrent()) return;
            for (const stay of stays) {
                const stayBlock = facts(root, 'Lưu trú', [['Phòng', stay.room_number || 'Chưa tải được tên phòng'], ['Trạng thái', stay.status === 'closed' ? 'Đã trả phòng' : stay.status === 'checked_in' ? 'Đang lưu trú' : status(stay.status)]]);
                if (row.appointment_status === 'in_progress' && stay.status === 'checked_in' && stay.lead_staff_id === window.PawpalAdminAccess.state.user.id && window.PawpalAdminAccess.state.user.permissions.includes('work.service.perform')) {
                    const checkout = el('button', 'Trả phòng', 'admin-btn admin-btn-primary'); checkout.type = 'button';
                    checkout.onclick = () => window.PawpalStaffHotelCheckout.open({ appointmentId:id, onSaved:()=>ctx.refresh() }); stayBlock.append(checkout);
                }
            }
            for (const [dataKind, title] of [['service_items', 'Hạng mục của tôi'], ['service_records', 'Biên bản'], ['care_logs', 'Nhật ký chăm sóc']]) {
                const block = card(root, title), active = row.appointment_status === 'in_progress', onChange = () => ctx.refresh();
                block.dataset.workspaceKind = dataKind;
                if (dataKind === 'care_logs' && active && window.PawpalAdminAccess.state.user.permissions.includes('work.service.perform')) {
                    const toolbar = el('div',null,'workspace-toolbar'), create = el('button','Ghi nhật ký','admin-btn admin-btn-primary'); create.type = 'button';
                    create.onclick = () => window.PawpalCareLog.openForStaff({ appointmentId: id, onSaved: onChange }); toolbar.append(block.firstElementChild, create); block.append(toolbar);
                }
                const content = el('div'), pager = el('nav', null, 'workspace-pager');
                pager.setAttribute('aria-label', 'Trang ' + title.toLocaleLowerCase('vi'));
                block.append(content); root.append(pager); let pageTurn = 0;
                async function loadPage(page = 1) {
                    const request = ++pageTurn; content.replaceChildren(el('p', 'Đang tải')); pager.replaceChildren();
                    try {
                        const rows = await read(dataKind, { id, page });
                        if (!ctx.isCurrent() || request !== pageTurn) return;
                        content.replaceChildren(); table(dataKind, rows, content, { appointmentId: id, active, onChange });
                        for (const [label, next] of [['<', page - 1], [String(page), page], ['>', page + 1]]) {
                            const button = el('button', label, next === page ? 'active' : ''); button.type = 'button';
                            button.disabled = next < 1 || next > page && rows.length < 10;
                            if (next === page) button.setAttribute('aria-current', 'page');
                            button.onclick = () => loadPage(next); pager.append(button);
                        }
                    } catch (error) {
                        if (ctx.isCurrent() && request === pageTurn) { content.replaceChildren(el('p', error.message, 'workspace-error')); pager.replaceChildren(); }
                    }
                }
                await loadPage(); if (!ctx.isCurrent()) return;
            }
}}},
toolbars:{"appointments":(ctx)=>{const {el,go,tools}=ctx;
                const create = el('button', 'Tạo lịch hẹn', 'admin-btn admin-btn-primary'); create.type = 'button'; create.onclick = () => window.PawpalStaffBooking.open(); tools.append(create);}},
rowActions:Object.fromEntries(['service_items','care_logs'].map(kind=>[kind,{enabled:options=>options.active&&PawpalAdminAccess.state.user.permissions.includes('work.service.perform'),render:(ctx)=>{const {el,go,read,kind,row,options}=ctx;
                const cell = el('td'), actor = window.PawpalAdminAccess.state.user.id;
                const targetStatus = kind === 'service_items' ? row.status === 'pending' ? 'in_progress' : row.status === 'in_progress' ? 'completed' : null : null;
                if (targetStatus || kind === 'care_logs' && row.recorded_by === actor) {
                    const menu = el('details', null, 'workspace-item-menu'), toggle = el('summary', '•••'), action = el('button', kind === 'care_logs' ? 'Sửa nhật ký' : targetStatus === 'in_progress' ? 'Bắt đầu' : 'Hoàn thành', 'workspace-item-action'), errorText = el('p', '', 'workspace-error');
                    toggle.setAttribute('aria-label', 'Tác vụ ' + (row.name_snapshot || row.action_name_snapshot)); action.type = 'button'; errorText.setAttribute('role','alert');
                    action.onclick = async () => {
                        if (action.disabled) return;
                        menu.open = false;
                        if (kind === 'care_logs') { window.PawpalCareLog.openForStaff({ appointmentId: options.appointmentId, logId: row.id, onSaved: options.onChange }); return; }
                        action.disabled = true; errorText.textContent = '';
                        try {
                            const { data, error } = await getSupabaseClient().rpc('perform_staff_service_item', { p_item: row.id, p_expected_updated_at: row.updated_at, p_status: targetStatus, p_note: '' });
                            if (error) throw error; if (data !== row.id) throw Error('invalid_item_result'); options.onChange?.();
                        } catch (error) {
                            // A network failure can follow a committed transition. Read its scoped current state before offering another write.
                            try {
                                for (let page = 1; ; page++) {
                                    const latest = await read('service_items', { id: options.appointmentId, page });
                                    const item = latest.find(item => item.id === row.id);
                                    if (item) { if (item.status === targetStatus) { options.onChange?.(); return; } break; }
                                    if (latest.length < 10) break;
                                }
                            } catch {}
                            errorText.textContent = error.code === '42501' ? 'Hạng mục không còn được giao cho bạn. Tải lại hồ sơ.' : error.code === 'PT409' ? 'Hạng mục đã thay đổi. Tải lại hồ sơ trước khi tiếp tục.' : 'Chưa xác nhận cập nhật thành công. Tải lại hồ sơ để kiểm tra.';
                        } finally { action.disabled = false; }
                    };
                    menu.append(toggle,action); cell.append(menu,errorText);
                } else cell.append(el('span','—'));
                return cell;}}]))});
})();

(function initializeManagementDomain(){
    if (!window.PawpalAdminAccess?.isAdmin()) return;
// services.js - Phân hệ Quản lý Dịch vụ Pawpal-er (Core Orchestrator)
(function() {
    'use strict';

    // Khởi tạo Namespace đồng bộ chuẩn
    const PawpalServices = window.PawpalServices = window.PawpalServices || {};
    window.PawpalServicesModule = PawpalServices;
    PawpalServices.subtabs = PawpalServices.subtabs || {};

    // State dùng chung
    PawpalServices.state = {
        bookingsData: [],
        servicesData: [],
        reviewsData: [],
        liveStaffList: [],
        liveCustomerDirectory: [],
        livePetDirectory: [],
        selectedBookingId: sessionStorage.getItem('pawpal_admin_service_selected_id') || null
    };

    PawpalServices.escapeHtml = function(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    PawpalServices.errorMessage = function(error) {
        const messages = {
            service_ticket_forbidden:'Bạn chưa có quyền tạo phiếu phản ánh dịch vụ.',
            requested_staff_schedule_required:'Cần phân ca cụ thể cho đúng nhân viên khách yêu cầu trước khi xác nhận.',
            requested_staff_customer_consent_required:'Khách đã chọn nhân viên yêu thích. Mở hồ sơ để gửi đề xuất và chờ khách đồng ý thay đổi.',
            booking_price_changed_requires_review:'Giá hoặc thời lượng đã thay đổi. Cần đối soát trước khi đề xuất giờ mới.',
            invalid_service_ticket:'Nhập nội dung phản ánh từ 2 đến 4.000 ký tự.',
            service_ticket_review_mismatch:'Đánh giá không thuộc ca dịch vụ đã chọn.',
            service_cashier_forbidden:'Bạn chưa có quyền xem hoặc ghi thu/hoàn tiền dịch vụ.',
            staff_not_available:'Nhân viên có lịch nghỉ hoặc không khả dụng trong thời gian đã chọn.',
            invalid_service_money:'Nhập số tiền nguyên dương, lý do và xác nhận đã thực nhận hoặc thực hoàn.',
            service_money_method_invalid:'Phương thức không còn khả dụng hoặc chưa được hỗ trợ tại quầy.',
            service_money_reference_required:'Cần mã giao dịch ngân hàng đã đối soát.',
            service_money_reference_duplicate:'Mã giao dịch ngân hàng này đã được ghi nhận.',
            service_cashier_changed:'Số dư hoặc hồ sơ đã thay đổi. Đóng và mở lại thu ngân để đối chiếu.',
            service_money_exceeds_balance:'Số tiền vượt số còn phải thu hoặc số còn được hoàn của lần thu gốc.',
            service_refund_source_invalid:'Chọn khoản thu thành công thuộc đúng ca dịch vụ.',
        refund_reward_points_insufficient:'Khách không đủ điểm để thu hồi. Cần đối soát trước khi hoàn tiền.',
        refund_loyalty_history_conflict:'Lịch sử hoàn tiền và điểm chưa khớp. Cần đối soát.',
        refund_loyalty_confirmation_required:'Kiểm tra và xác nhận số điểm cần thu hồi trước khi hoàn.',
        refund_loyalty_exceeds_balance:'Số tiền vượt số còn được hoàn.',
            service_refund_ledger_review_required:'Khoản thu cũ đã liên kết chi tiêu xét hạng hoặc điểm; cần đối soát sổ trước khi hoàn.',
            service_money_booking_closed:'Không thu thêm tiền cho ca đã hủy hoặc khách vắng mặt.',
            pickup_notification_forbidden:'Bạn chưa có quyền lưu thông báo đón bé.',
            pickup_notification_invalid:'Nhập nội dung tối đa 4.000 ký tự và xác nhận bé đã sẵn sàng để đón.',
            pickup_notification_not_ready:'Chỉ lưu lời mời đón bé cho ca đang thực hiện hoặc đã hoàn tất.',
            invalid_logistics_category:'Vui lòng chọn đúng nhóm khách sạn hoặc xe đưa đón.',
            logistics_write_forbidden:'Bạn chưa có quyền xử lý lưu trú hoặc chuyến xe.',
            invalid_hotel_stay:'Vui lòng kiểm tra phòng, thời gian nhận/trả và ghi chú lưu trú.',
            hotel_room_unavailable:'Phòng đã tạm ngừng sử dụng. Vui lòng chọn phòng khác.',
            hotel_room_conflict:'Phòng đã được giữ trong khoảng thời gian này.',
            hotel_checkin_time_or_room_invalid:'Chưa đến giờ nhận phòng, đã quá giờ trả dự kiến hoặc phòng đang ngừng sử dụng.',
            hotel_room_occupied:'Phòng vẫn còn bé đang lưu trú; cần hoàn tất trả phòng trước.',
            hotel_not_checked_in:'Chỉ trả phòng cho ca đang lưu trú và đã nhận phòng.',
            invalid_taxi_return:'Giờ về phải sau khi kết thúc lượt đi; chuyến một chiều không có giờ về.',
            ambiguous_taxi_return_price:'Chưa có đúng một bảng giá cho lượt về tại thời điểm đã chọn.',
            taxi_trip_not_due:'Chưa đến giờ khởi hành của chuyến xe.',
            taxi_return_not_due:'Chưa đến giờ lượt về, không thể hoàn tất chuyến khứ hồi.',
            legacy_logistics_missing:'Lịch cũ chưa có thông tin phòng hoặc chuyến xe. Cần đối soát trước khi tiếp nhận hay bàn giao.',
            service_record_forbidden:'Bạn chưa có quyền lập biên bản và ghi nhận cân nặng.',
            invalid_service_record:'Vui lòng kiểm tra nội dung biên bản.',
            intake_observations_required:'Vui lòng ghi nhận đủ cân nặng, da lông, mắt tai, vết thương và tập tính.',
            handover_confirmation_required:'Cần kiểm tra chất lượng, trả tư trang và ghi nhận xác nhận của khách trước khi bàn giao.',
            confirmed_intake_required:'Biên bản tiếp nhận mới nhất chưa được khách xác nhận.',
            pending_service_adjustments:'Cần xử lý các đề xuất phụ phí còn chờ trước khi hoàn tất ca.',
            hotel_checkout_required:'Ca lưu trú cần hoàn tất thủ tục trả phòng trước khi bàn giao.',
            service_request_conflict:'Yêu cầu này đã được lưu với nội dung khác. Vui lòng tải lại hồ sơ.',
            service_log_forbidden:'Bạn chưa có quyền thay đổi nhật ký chăm sóc.',
            invalid_service_log:'Vui lòng kiểm tra tên bước, người thực hiện và thời gian ghi nhận.',
            care_log_requires_active_service:'Chỉ thay đổi nhật ký khi ca đang thực hiện.',
            care_log_changed:'Nhật ký đã thay đổi. Vui lòng tải lại trước khi lưu.',
            care_log_has_media:'Cần xử lý ảnh đính kèm trước khi xóa nhật ký.',
            service_charge_forbidden:'Bạn chưa có quyền xử lý chi phí phát sinh.',
            invalid_service_charge:'Vui lòng kiểm tra số tiền, tên phụ phí, lý do và xác nhận của khách.',
            service_charges_locked:'Ca đã kết thúc hoặc đã có khoản thu; cần xử lý qua thu ngân.',
            service_adjustment_not_active:'Điều chỉnh này đã được xử lý. Vui lòng tải lại hồ sơ.',
            charge_consent_required:'Cần ghi nhận khách đã đồng ý trước khi duyệt phụ phí hoặc thêm dịch vụ.',
            service_quote_changed:'Giá nhập chưa khớp bảng giá của bé tại ngày hẹn. Vui lòng kiểm tra lại.',
            booking_write_forbidden:'Bạn chưa có quyền thay đổi lịch hẹn.',
            active_customer_required:'Khách hàng cần ở trạng thái hoạt động.',
            pet_owner_mismatch:'Bé cưng không thuộc khách hàng đã chọn hoặc đã ngừng hoạt động.',
            service_species_not_supported:'Dịch vụ chưa khai báo hỗ trợ loài của bé. Vui lòng kiểm tra danh mục dịch vụ.',
            active_service_required:'Vui lòng chọn dịch vụ đang phục vụ và có thời lượng hợp lệ.',
            pet_weight_required:'Cần cập nhật cân nặng của bé trước khi tính giá.',
            future_booking_required:'Thời gian hẹn phải ở tương lai.',
            ambiguous_service_price:'Chưa xác định được đúng một mức giá cho cân nặng và ngày hẹn.',
            ambiguous_taxi_price:'Chưa xác định được đúng một mức giá đưa đón cho cự ly, cân nặng và ngày hẹn.',
            invalid_taxi_details:'Vui lòng kiểm tra địa chỉ, khoảng cách và hình thức đưa đón.',
            hotel_requires_room_reservation:'Đặt khách sạn cần bổ sung việc chọn phòng và giữ phòng trước khi lưu.',
            staff_not_eligible:'Nhân viên chưa đáp ứng điều kiện phụ trách dịch vụ.',
            staff_level_required:'Cấp độ nhân viên chưa đáp ứng yêu cầu dịch vụ.',
            staff_schedule_conflict:'Nhân viên đã có lịch trùng thời gian này.',
            booking_changed_reload_required:'Lịch hẹn đã thay đổi. Vui lòng tải lại trước khi lưu.',
            booking_request_conflict:'Yêu cầu này đã được sử dụng với nội dung khác. Vui lòng tải lại danh sách.',
            booking_has_not_started:'Chưa đến giờ hẹn để ghi nhận vắng mặt.',
            invalid_booking_transition:'Trạng thái hiện tại không cho phép thao tác này.',
            cancellation_reason_required:'Vui lòng nhập lý do hủy lịch.',
            paid_booking_requires_refund_workflow:'Lịch hẹn có khoản thu đã ghi nhận; cần xử lý hoàn tiền trước khi hủy.',
            invalid_staff_assignment:'Vui lòng kiểm tra trạng thái lịch hẹn và lý do đổi nhân viên.',
            service_catalog_forbidden:'Bạn chưa có quyền cập nhật danh mục dịch vụ.',
            service_catalog_changed:'Dịch vụ đã thay đổi. Vui lòng tải lại trước khi lưu.',
            invalid_service_catalog:'Vui lòng kiểm tra mã, tên, thời lượng, hoa hồng và loài hỗ trợ.',
            invalid_service_catalog_reference:'Nhóm dịch vụ hoặc cấp độ nhân viên không còn hợp lệ.',
            invalid_service_species:'Vui lòng chọn loài đang hoạt động trong danh mục.',
            invalid_service_step:'Tên bước chăm sóc phải có từ 1 đến 200 ký tự và không trùng nhau.',
            invalid_service_price_ranges:'Các khoảng giá phải liên tiếp từ 0 kg và không chồng lấn.',
            scheduled_service_price_requires_review:'Dịch vụ có bảng giá đặt trước; cần đối soát trước khi thay giá.',
            review_reply_changed:'Phản hồi đã thay đổi. Vui lòng tải lại đánh giá.',
            review_reply_forbidden:'Bạn chưa có quyền phản hồi đánh giá.',
            invalid_review_reply:'Nội dung phản hồi phải có từ 1 đến 5.000 ký tự.'
        };
        return messages[error?.message] || (error?.code==='23505'?'Mã hoặc nội dung đã tồn tại. Vui lòng kiểm tra lại.':error?.message||'Không thể lưu dữ liệu.');
    };

    // Keep the native value store for existing event handlers; expose a text-only live popover.
    PawpalServices.enhanceEntitySelects = function() {
        for(const id of ['futureBookingStaff','intakeStaffSelect','newLogStepStaff','editCarelogStepStaff','accompanyingServiceItemSelect','accompanyingStaffSelect','newBookingHotelRoomType','changeStaffSelect','newBookingStaff','cashierMethod','cashierPayment']) {
            const select=document.getElementById(id);if(!select)continue;
            if(select._entityInput){select._entityInput.disabled=select.disabled;if(document.activeElement!==select._entityInput)select._entityInput.value=select.value?select.selectedOptions[0]?.textContent||'':'';continue;}
            const wrapper=document.createElement('div');wrapper.style.cssText='position:relative;width:100%;';
            const input=document.createElement('input');input.type='text';input.className='admin-input';input.autocomplete='off';input.id=id+'Search';input.placeholder='Tìm và chọn từ danh sách';input.setAttribute('aria-label',select.closest('.form-group-item')?.querySelector('label')?.textContent||'Chọn thông tin');
            const popover=document.createElement('div');popover.className='customer-autocomplete-popover';popover.style.cssText='display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;max-height:240px;overflow-y:auto;overscroll-behavior:contain;z-index:2500;border:1px solid #ECF2EE;border-radius:9px;background:#FFF;box-shadow:0 10px 28px rgba(35,107,72,.14);';
            select.before(wrapper);wrapper.append(select,input,popover);select.hidden=true;select.style.display='none';input.disabled=select.disabled;select._entityInput=input;
            const render=()=>{
                popover.replaceChildren();const q=input.value.trim().toLocaleLowerCase('vi');
                const options=[...select.options].filter(o=>o.value&&!o.disabled&&o.textContent.trim().toLocaleLowerCase('vi').includes(q));
                for(const option of options){const button=document.createElement('button');button.type='button';button.className='customer-autocomplete-item';button.style.cssText='display:block;width:100%;text-align:left;padding:9px 12px;border:none;background:transparent;color:#203A2C;font-weight:600;';button.textContent=option.textContent;
                    button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',()=>{if(select.disabled||!select.contains(option)||option.disabled)return;select.value=option.value;input.value=option.textContent;popover.style.display='none';select.dispatchEvent(new Event('change',{bubbles:true}));});popover.append(button);}
                if(!options.length){const text=document.createElement('div');text.style.padding='10px 12px';text.textContent='Không có lựa chọn phù hợp.';popover.append(text);}
                popover.style.display='block';
            };
            input.addEventListener('focus',render);input.addEventListener('input',()=>{select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));render();});input.addEventListener('keydown',e=>{if(e.key==='Escape')popover.style.display='none';if(e.key==='Enter'){e.preventDefault();popover.querySelector('button')?.click();}});
            document.addEventListener('click',e=>{if(!wrapper.contains(e.target))popover.style.display='none';});
        }
    };
    document.addEventListener('click',()=>queueMicrotask(()=>PawpalServices.enhanceEntitySelects()));

    function assertHandoverReady(booking) {
        if(booking?.status!=='in_progress') throw new Error('Chỉ hoàn tất ca đang thực hiện.');
        const intake=booking.intakeRecord;
        if(!intake || !Number.isFinite(Date.parse(intake.recordedAt)) || !/^[0-9a-f-]{36}$/i.test(intake.staffId||'') || !(intake.actualWeight>0)) throw new Error('Ca chưa có biên bản tiếp nhận hợp lệ đã lưu.');
    }
    PawpalServices.assertHandoverReady=assertHandoverReady;
    function mapRecord(records,kind,petId) {
        const r=[...(records||[])].filter(r=>r.record_type===kind).sort((a,b)=>b.revision_no-a.revision_no)[0];
        if(!r)return null;
        const lines=Object.fromEntries(String(r.condition_note||'').split('\n').map(line=>{const n=line.indexOf(': ');return n<0?['','']:[line.slice(0,n),line.slice(n+2)];}));
        const weight=(PawpalServices.state.weightMeasurements||[]).find(w=>w.pet_id===petId&&w.measured_at===r.recorded_at);
        return {id:r.id,recordedAt:r.recorded_at,staffId:r.recorded_by,recordedByName:r.recorder?.full_name||'',conditionNote:r.condition_note,
            actualWeight:weight?Number(weight.weight):null,skinCoat:lines['Da và lông']||'',eyesEars:lines['Mắt và tai']||'',wounds:lines['Vết thương']||'',temperament:lines['Tập tính']||'',belongings:(lines['Tư trang']||'').split(', ').filter(Boolean),belongingsNote:r.note||'',
            confirmationStatus:r.customer_confirmation_status,safetyNote:r.safety_note_snapshot,allergy:r.allergy_note_snapshot,note:r.note,proofPhotos:r.proofPhotos||[]};
    }
    async function refreshBooking(booking) {
        window.PawpalDataStore?.invalidate('services:bookings*');
        window.PawpalDataStore?.invalidate('services:carelogs:'+booking.dbId);
        window.PawpalDataStore?.invalidate('dashboard:*');
        window.PawpalDataStore?.emitMutation({entity:'appointment',type:'UPDATE',id:booking.dbId});
        await PawpalServices.loadServicesData({force:true,forceStaff:false,prefetch:false});
        const current=await PawpalServices.ensureBooking(booking.dbId,{force:true});
        if(current){const logs=await PawpalServices.fetchBookingCareLogs(current.dbId,{force:true});current.careLogs=logs;current.carelogs=logs;current._careLogsLoaded=true;}
        PawpalServices.subtabs.bookings?.renderBookingsTable();PawpalServices.subtabs.bookings?.updateKPIs();
        PawpalServices.subtabs.detail?.renderBookingDetail(booking.id);
    }
    PawpalServices.closeHotelStay=async function(booking){
        await performBookingWrite(booking,async db=>{
            const {data,error}=await db.rpc('close_admin_hotel_stay',{p_appointment_id:booking.dbId,p_expected_updated_at:booking.updatedAt});
            if(error)throw error;if(!data)throw Error('Không xác minh được việc trả phòng.');
        });
    };
    const pendingWrites=new Set();
    async function performBookingWrite(booking,operation) {
        if(pendingWrites.has(booking.dbId))throw Error('Đang lưu hồ sơ, vui lòng chờ.');
        pendingWrites.add(booking.dbId);
        try{await operation(window.getSupabaseClient());await refreshBooking(booking);}finally{pendingWrites.delete(booking.dbId);}
    }
    const requestIds=new Map();
    function requestId(key,payload) {
        const signature=JSON.stringify(payload),prior=requestIds.get(key);
        if(prior?.signature===signature)return prior.id;
        const id=crypto.randomUUID();requestIds.set(key,{signature,id});return id;
    }
    PawpalServices.savePickupNotification=async function(booking,content,ready) {
        const details={content:content.trim(),ready},key=booking.dbId+':pickup',id=requestId(key,details);
        await performBookingWrite(booking,async db=>{
            const {data,error}=await db.rpc('save_admin_pickup_notification',{p_id:id,p_appointment_id:booking.dbId,p_expected_updated_at:booking.updatedAt,p_content:details.content,p_ready:ready});
            if(error)throw error;if(data!==id)throw Error('Không xác minh được thông báo đã lưu.');
        });
        requestIds.delete(key);
    };
    PawpalServices.saveServiceMoney=async function(booking,context,action,details){
        const key=booking.dbId+':money',id=requestId(key,{action,details});
        await performBookingWrite(booking,async db=>{
            const {data,error}=await db.rpc('post_admin_service_money',{p_request_id:id,p_appointment_id:booking.dbId,p_expected_state:context.version,p_action:action,p_details:details});
            if(error)throw error;if(data!==id)throw Error('Không xác minh được giao dịch đã ghi.');
        });requestIds.delete(key);return id;
    };
    PawpalServices.saveServiceTicket=async function(booking,reviewId,description){
        const key=booking.dbId+':ticket',id=requestId(key,{reviewId,description});
        const {data,error}=await window.getSupabaseClient().rpc('create_admin_service_ticket',{p_id:id,p_appointment_id:booking.dbId,p_review_id:reviewId||null,p_description:description.trim()});
        if(error)throw error;if(data!==id)throw Error('Không xác minh được phiếu đã lưu.');
        await PawpalServices.loadReviewsData({force:true});requestIds.delete(key);return id;
    };
    PawpalServices.saveBookingRecord=async function(booking,kind,record) {
        const {recordedAt,updatedAt,staffName,intakeRecordedAt,total,mediaRecordId,...details}=record;
        const key=booking.dbId+':'+kind,id=mediaRecordId||requestId(key,details);
        await performBookingWrite(booking,async db=>{
            const {data,error}=await db.rpc('save_admin_service_record',{p_id:id,p_appointment_id:booking.dbId,p_expected_updated_at:booking.updatedAt,p_type:kind,p_details:details});
            if(error)throw error;if(data!==id)throw Error('Không xác minh được biên bản đã lưu.');
            requestIds.delete(key);
        });
    };
    PawpalServices.changeCharge=async function(booking,id,action,details={}) {
        await performBookingWrite(booking,async db=>{
            const {data,error}=await db.rpc('change_admin_service_charge',{p_id:id,p_appointment_id:booking.dbId,p_expected_updated_at:booking.updatedAt,p_action:action,p_details:details});
            if(error)throw error;if(data!==id)throw Error('Không xác minh được điều chỉnh đã lưu.');
        });
    };
    // Preserve rows and audit history. One click proposes/adds/cancels one entity.
    PawpalServices.saveCharges=async function(booking,charges) {
        const before=booking.charges||[],added=charges.filter(c=>!before.some(old=>old.id===c.id)),removed=before.filter(c=>!charges.some(next=>next.id===c.id));
        if(added.length+removed.length!==1)throw Error('Vui lòng xử lý từng điều chỉnh một.');
        if(removed.length){const c=removed[0];return PawpalServices.changeCharge(booking,c.id,c.kind==='service'?'cancel_service':'cancel_adjustment');}
        const c=added[0];
        const details={name:c.name,amount:c.amount,reason:c.reason,service_id:c.serviceId||null,consent:c.consent||'pending'};
        if(c.media_asset_ids)details.media_asset_ids=c.media_asset_ids;
        const key=booking.dbId+':charge',id=c.mediaAdjustmentId||requestId(key,details);
        await PawpalServices.changeCharge(booking,id,c.kind==='service'?'add_service':'propose',details);requestIds.delete(key);
    };
    PawpalServices.saveCareLog=async function(booking,log,action,details) {
        const key=booking.dbId+':carelog',id=log?.id||requestId(key,details);
        await performBookingWrite(booking,async db=>{
            await window.PawpalCareLog.save({p_id:id,p_appointment_id:booking.dbId,p_expected_updated_at:booking.updatedAt,p_expected_log_updated_at:log?.updated_at||null,p_action:action,p_details:details},db);
        });
        requestIds.delete(key);
    };

    // Helper: Chuyển chuỗi tiếng Việt không dấu
    function toUnaccent(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
            .toLowerCase()
            .trim().replace(/\s+/g, ' ');
    }

    function matchSearch(sourceText, searchTerm) {
        if (!searchTerm) return true;
        if (!sourceText) return false;
        const src = String(sourceText).toLowerCase();
        const query = String(searchTerm).toLowerCase().trim();
        if (src.includes(query)) return true;
        return toUnaccent(sourceText).includes(toUnaccent(searchTerm));
    }

    function formatCurrency(num) {
        if (!num && num !== 0) return '0 đ';
        return Number(num).toLocaleString('vi-VN') + ' đ';
    }

    function showToast(msg, type = 'success') {
        let toast = document.getElementById('adminGlobalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'adminGlobalToast';
            document.body.appendChild(toast);
        }
        const isAlert = type === 'warning' || type === 'error' || type === 'danger';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background-color: ${isAlert ? '#8F2424' : '#236B48'};
            color: #FFFFFF;
            padding: 12px 20px;
            border-radius: 9px;
            font-size: 13.5px;
            font-weight: 500;
            box-shadow: 0 8px 24px rgba(26, 43, 35, 0.2);
            z-index: 99999;
            display: block;
        `;
        toast.textContent = msg;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.display = 'none';
        }, 2500);
    }

    function showServiceConfirmModal({ title = 'Xác nhận thao tác', message = 'Bạn có chắc chắn muốn thực hiện thao tác này?', acceptText = 'Đồng ý', onAccept }) {
        const modal = document.getElementById('modalConfirmServiceAction');
        const titleEl = document.getElementById('confirmServiceActionTitle');
        const msgEl = document.getElementById('confirmServiceActionMessage');
        const btnAccept = document.getElementById('btnAcceptServiceConfirm');
        const btnCancel = document.getElementById('btnCancelServiceConfirm');
        const btnClose = document.getElementById('btnCloseConfirmServiceAction');

        if (!modal) {
            if (typeof onAccept === 'function') onAccept();
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btnAccept) btnAccept.textContent = acceptText;

        const closeModal = () => {
            modal.classList.remove('active');
            if (btnAccept) btnAccept.onclick = null;
            if (btnCancel) btnCancel.onclick = null;
            if (btnClose) btnClose.onclick = null;
        };

        if (btnCancel) btnCancel.onclick = closeModal;
        if (btnClose) btnClose.onclick = closeModal;

        if (btnAccept) {
            btnAccept.onclick = () => {
                closeModal();
                if (typeof onAccept === 'function') onAccept();
            };
        }

        modal.classList.add('active');
    }

    PawpalServices.showConfirmModal = showServiceConfirmModal;

    function getStatusBadge(status) {
        if (window.PawpalEnum && window.PawpalEnum.appointmentStatus) {
            const mapped = window.PawpalEnum.appointmentStatus(status);
            return `<span class="admin-badge ${mapped.badgeClass}">${mapped.label}</span>`;
        }
        switch (String(status || '').toLowerCase()) {
            case 'pending':
            case 'cho_xac_nhan':
                return '<span class="admin-badge badge-warning">Chờ xác nhận</span>';
            case 'confirmed':
            case 'da_xac_nhan':
                return '<span class="admin-badge badge-info">Đã xác nhận</span>';
            case 'checked_in':
            case 'da_check_in':
                return '<span class="admin-badge badge-primary">Đã check-in</span>';
            case 'in_progress':
            case 'dang_thuc_hien':
                return '<span class="admin-badge badge-info">Đang thực hiện</span>';
            case 'completed':
            case 'da_hoan_tat':
                return '<span class="admin-badge badge-success">Đã hoàn tất</span>';
            case 'cancelled':
            case 'da_huy':
                return '<span class="admin-badge badge-neutral">Đã hủy</span>';
            case 'no_show':
            case 'vang_mat':
                return '<span class="admin-badge badge-danger">Vắng mặt</span>';
            default:
                return `<span class="admin-badge badge-neutral">${status || 'Chưa rõ'}</span>`;
        }
    }

    function isBookingUpcoming(booking) {
        if (!booking || !['pending','confirmed'].includes(String(booking.status || '').toLowerCase())) return false;
        const date = booking.date || booking.appointment_date;
        const time = booking.time || booking.appointment_time;
        if (!date || !time) return false;
        const scheduledAt = Date.parse(`${String(date).slice(0,10)}T${String(time).slice(0,5)}:00+07:00`);
        const remaining = scheduledAt - Date.now();
        return Number.isFinite(scheduledAt) && remaining >= 0 && remaining <= 3600000;
    }

    function getServiceSlaInfo(booking) {
        if (!booking || booking.status === 'cancelled') {
            return { level: 'ok', label: 'Đã hủy', minutesLate: 0 };
        }
        if (booking.status === 'completed') {
            return { level: 'ok', label: 'Hoàn thành', minutesLate: 0 };
        }

        const now = Date.now();
        const createdAt = booking.created_at ? Date.parse(booking.created_at) : null;
        const waitingMinutes = createdAt ? Math.max(0, Math.floor((now - createdAt) / 60000)) : 0;

        if (booking.status === 'pending') {
            if (waitingMinutes > 30) {
                return { level: 'danger', label: `Quá hạn duyệt (${waitingMinutes}p)`, minutesLate: waitingMinutes };
            }
            if (waitingMinutes > 15) {
                return { level: 'warning', label: `Chờ duyệt (${waitingMinutes}p)`, minutesLate: waitingMinutes };
            }
            return { level: 'info', label: 'Mới tiếp nhận', minutesLate: 0 };
        }

        if (booking.status === 'confirmed') {
            if (!booking.staff) {
                return { level: 'warning', label: 'Chờ KTV tiếp nhận', minutesLate: 0 };
            }
            if (isBookingUpcoming(booking)) {
                return { level: 'info', label: 'Sắp tới giờ', minutesLate: 0 };
            }
            return { level: 'ok', label: 'Chờ đón bé', minutesLate: 0 };
        }

        if (booking.status === 'in_progress') {
            const date = booking.date || booking.appointment_date;
            const time = booking.time || booking.appointment_time;
            if (date && time) {
                const scheduledStart = Date.parse(`${String(date).slice(0, 10)}T${String(time).slice(0, 5)}:00+07:00`);
                const durationMinutes = Number.parseFloat(booking.duration) || 60;
                const expectedEnd = scheduledStart + (durationMinutes * 60000);
                if (Number.isFinite(expectedEnd) && now > expectedEnd) {
                    const lateMin = Math.floor((now - expectedEnd) / 60000);
                    return { level: 'danger', label: `Quá hạn SLA (${lateMin}p)`, minutesLate: lateMin };
                }
            }
            return { level: 'ok', label: 'Đúng tiến độ', minutesLate: 0 };
        }
        return { level: 'ok', label: 'Bình thường', minutesLate: 0 };
    }

    function getAlertBadge(item) {
        if (item.status === 'cancelled') {
            return '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
        }
        const alerts = [];
        const sla = getServiceSlaInfo(item);

        if (item.petAlert) {
            alerts.push('<span class="alert-indicator text-danger">• Pet có lưu ý</span>');
        }
        if (sla.level === 'danger') {
            alerts.push(`<span class="alert-indicator text-danger">• ${sla.label}</span>`);
        } else if (sla.level === 'warning') {
            alerts.push(`<span class="alert-indicator text-warning">• ${sla.label}</span>`);
        } else if (sla.level === 'info') {
            alerts.push(`<span class="alert-indicator text-info">• ${sla.label}</span>`);
        }

        if (alerts.length === 0) {
            return '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
        }

        return `<div class="alert-text-stack">${alerts.join('')}</div>`;
    }

    // Export helpers sang namespace
    PawpalServices.toUnaccent = toUnaccent;
    PawpalServices.matchSearch = matchSearch;
    PawpalServices.formatCurrency = formatCurrency;
    PawpalServices.showToast = showToast;
    PawpalServices.showServiceConfirmModal = showServiceConfirmModal;
    PawpalServices.getStatusBadge = getStatusBadge;
    PawpalServices.isBookingUpcoming = isBookingUpcoming;
    PawpalServices.getServiceSlaInfo = getServiceSlaInfo;
    PawpalServices.getAlertBadge = getAlertBadge;

    // Nạp dữ liệu qua PawpalDataStore và Supabase Live Database
    const SERVICES_QUERY_TIMEOUT_MS = 12_000;

    function withServicesQueryTimeout(query) {
        let timeoutId;
        const timeout = new Promise((_, reject) => {
            timeoutId = window.setTimeout(() => reject(new Error('Truy vấn dữ liệu dịch vụ quá thời gian chờ.')), SERVICES_QUERY_TIMEOUT_MS);
        });
        return Promise.race([query, timeout]).finally(() => window.clearTimeout(timeoutId));
    }

    const one = value => Array.isArray(value) ? value[0] : value;
    const primaryPhone = customer => window.PawpalCustomerIdentity.contact(customer).phone;
    const categoryCode = service => one(service?.category)?.category_code || '';
    async function readRows(query) {
        const {data,error} = await withServicesQueryTimeout(query);
        if (error) throw error;
        return data || [];
    }
    // Fetch every page explicitly; PostgREST's row limit must not truncate a directory silently.
    async function allRows(makeQuery) {
        const rows=[];
        for(let offset=0;;offset+=500){const page=await readRows(makeQuery().range(offset,offset+499));rows.push(...page);if(page.length<500)return rows;}
    }
    const customerFields='id,auth_user_id,customer_status,unverified_contact_phone,customer_profile(full_name),customer_phone(phone_number,is_primary)';
    const petFields='id,customer_id,pet_code,pet_name,breed_id,date_of_birth,allergy,routine,safety_note,avatar_url,status,updated_at,breed:breed_id(breed_name,species:species_id(species_name))';
    async function fetchBookingDirectoryRaw({force=false}={}){
        const fetcher=async()=>{
            const db=window.getSupabaseClient();
            const [weights,customers,pets,measurements,rooms]=await Promise.all([
                allRows(()=>db.from('pet_current_weight').select('pet_id,weight').order('pet_id')),
                allRows(()=>db.from('customer').select(customerFields).order('id')),
                allRows(()=>db.from('pet_profile').select(petFields).order('id')),
                allRows(()=>db.from('pet_weight_history').select('pet_id,weight,measured_at').order('id')),
                allRows(()=>db.from('hotel_room').select('id,room_number,status,type:room_type_id(id,room_type,daily_price,status,service_id,billing_minutes)').order('id'))
            ]);
            return {weights,customers,pets,measurements,rooms};
        };
        const store=window.PawpalDataStore,key='services:directory:'+(store?.buildKey?.('booking-directory')||'session');
        return store?store.fetch(key,fetcher,{ttlMs:store.TTL_TIERS.LIST,force,backgroundRevalidate:false}):fetcher();
    }
    let intakeMediaReader,handoverMediaReader,adjustmentMediaReader;
    async function fetchBookingsRaw({ force = false, forceDirectory = force, ids, id } = {}) {
        const {weights,customers,pets,measurements,rooms}=await fetchBookingDirectoryRaw({force:forceDirectory});
        PawpalServices.state.liveRooms=rooms;
        PawpalServices.state.weightMeasurements=measurements;
        const weightMap=new Map(weights.map(w=>[w.pet_id,Number(w.weight)]));
        const adaptPet=p=>({...p,breed:one(p.breed)?.breed_name||'',species:one(one(p.breed)?.species)?.species_name||'',weight:weightMap.get(p.id)??null});
        const petDirectory=pets.map(p=>{
            const c=customers.find(c=>c.id===p.customer_id);
            return {...adaptPet(p),customer:{id:c?.id,phone_main:primaryPhone(c),customer_profile:one(c?.customer_profile)}};
        });
        PawpalServices.state.livePetDirectory=petDirectory;
        PawpalServices.state.liveCustomerDirectory=customers.filter(c=>c.customer_status==='active').map(c=>({...c,phone_main:primaryPhone(c),pet_profile:petDirectory.filter(p=>p.customer_id===c.id&&p.status==='active')}));
        const fetcher=async()=>{
            const db=window.getSupabaseClient();
            if(ids&&!ids.length)return [];
            const appointments=await allRows(()=>{let query=db.from('appointment').select('*,customer:customer_id('+customerFields+'),pet_profile:pet_id('+petFields+'),staff:staff_id(id,full_name,job_title),requestedStaff:requested_staff_id(id,full_name),items:appointment_item(*,service:service_id(id,service_code,service_name,estimated_duration,category:category_id(category_code))),records:appointment_record(*,recorder:recorded_by(full_name)),adjustments:appointment_adjustment(*),taxi:taxi_trip(*),hotel:hotel_booking(*,room:room_id(room_number,type:room_type_id(room_type)))').order('created_at',{ascending:false}).order('id');if(ids)query=query.in('id',ids);if(id)query=query.eq(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)?'id':'appointment_code',id);return query;});
            if(!appointments.length)return [];
            if(!intakeMediaReader){const {createIntakeMediaReader}=await import('/scripts/shared/intake-media-reader.mjs');intakeMediaReader=createIntakeMediaReader({db});}
            await intakeMediaReader.hydrate(appointments);
            if(!handoverMediaReader){const {createIntakeMediaReader}=await import('/scripts/shared/intake-media-reader.mjs');handoverMediaReader=createIntakeMediaReader({db,recordType:'handover'});}
            await handoverMediaReader.hydrate(appointments);
            if(!adjustmentMediaReader){const {createAdjustmentMediaReader}=await import('/scripts/shared/adjustment-media-reader.mjs');adjustmentMediaReader=createAdjustmentMediaReader({db});}
            await adjustmentMediaReader.hydrate(appointments);
            const selectedIds=appointments.map(a=>a.id),scoped=query=>(ids||id)?query.in('appointment_id',selectedIds):query;
            const [totals,payments]=await Promise.all([
                allRows(()=>scoped(db.from('appointment_totals').select('appointment_id,total_price').order('appointment_id'))),
                allRows(()=>scoped(db.from('payment').select('id,appointment_id,amount,transaction_status,refund_transaction(refund_status,refunded_amount)').not('appointment_id','is',null).order('id')))
            ]);
            const totalsMap=new Map(totals.map(t=>[t.appointment_id,Number(t.total_price)]));
            return appointments.map(a=>{
                const item=a.items.find(i=>i.is_primary&&i.status!=='cancelled')||a.items.find(i=>i.is_primary);
                const at=new Date(a.scheduled_start_at);
                const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at).map(p=>[p.type,p.value]));
                const service=item?.service ? {...item.service,service_name:item.name_snapshot,estimated_duration:item.duration_minutes,service_category:categoryCode(item.service)} : null;
                const collected=payments.filter(p=>p.appointment_id===a.id&&p.transaction_status==='succeeded').reduce((sum,p)=>sum+Number(p.amount)-(p.refund_transaction||[]).filter(r=>r.refund_status==='succeeded').reduce((n,r)=>n+Number(r.refunded_amount),0),0);
                return {...a,service,customer:{...a.customer,phone_main:primaryPhone(a.customer)},pet_profile:adaptPet(a.pet_profile||{}),
                    appointment_date:parts.year+'-'+parts.month+'-'+parts.day,appointment_time:parts.hour+':'+parts.minute,
                    total_price:totalsMap.get(a.id)??0,collected,payment_status:collected>0&&collected>=(totalsMap.get(a.id)??0)?'paid':collected>0?'partial':'unpaid'};
            });
        };
        return window.PawpalDataStore ? window.PawpalDataStore.fetch('services:bookings:raw:'+JSON.stringify({ids,id})+':'+window.PawpalDataStore.buildKey('booking-raw'),fetcher,{ttlMs:window.PawpalDataStore.TTL_TIERS.OPERATIONAL,force,backgroundRevalidate:false}) : fetcher();
    }

    async function fetchStaffRaw({ force = false } = {}) {
        const fetcher=async()=>{const {data,error}=await window.getSupabaseClient().rpc('admin_service_staff_candidates');if(error)throw error;return data||[];};
        return window.PawpalDataStore ? window.PawpalDataStore.fetch('services:staff',fetcher,{ttlMs:window.PawpalDataStore.TTL_TIERS.CATALOG,force,backgroundRevalidate:false}) : fetcher();
    }

    let serviceMediaReader;
    async function fetchCatalogRaw({ force = false } = {}) {
        const fetcher=async()=>{
            const db=window.getSupabaseClient();
            const [services,prices,species,levels,hotelPrices,taxiPrices]=await Promise.all([
                allRows(()=>db.from('service').select('*,images:service_image(image_url,media_asset_id,display_order,is_thumbnail),category:category_id(id,category_code,category_name),level:staff_level_required_id(id,level_name),supported:service_supported_species(species:species_id(id,species_name)),actions:service_care_action(display_order,estimated_duration,care_action:care_action_id(id,action_name,is_active))').order('id')),
                allRows(()=>db.from('service_price_matrix').select('*').order('id')),
                readRows(db.from('pet_species').select('id,species_name').eq('is_active',true).order('species_name')),
                readRows(db.from('staff_level').select('id,level_name').eq('is_active',true).order('rank_order')),
                allRows(()=>db.from('hotel_room_type').select('*').order('id')),
                allRows(()=>db.from('taxi_price_rule').select('*').order('id'))
            ]);
            if(!serviceMediaReader){const {createServiceMediaReader}=await import('/scripts/shared/service-media-reader.mjs');serviceMediaReader=createServiceMediaReader({db});}
            await serviceMediaReader.hydrate(services);
            PawpalServices.state.liveSpecies=species;PawpalServices.state.liveLevels=levels;
            return {services:services.map(s=>({...s,service_category:categoryCode(s)})),prices:[...prices,...hotelPrices.map(p=>({...p,unit_price:p.daily_price})),...taxiPrices.map(p=>({...p,unit_price:Number(p.base_price)+Number(p.surcharge)}))],priceError:null};
        };
        return window.PawpalDataStore ? window.PawpalDataStore.fetch('services:catalog',fetcher,{ttlMs:window.PawpalDataStore.TTL_TIERS.CATALOG,force,backgroundRevalidate:false}) : fetcher();
    }

    async function fetchReviewsRaw({ force = false } = {}) {
        const fetcher=async()=>{
            const tickets=await allRows(()=>window.getSupabaseClient().from('support_ticket').select('id,appointment_id').not('appointment_id','is',null).order('id'));
            const rows=await allRows(()=>window.getSupabaseClient().from('review').select('*,responses:review_response(*),item:appointment_item_id(id,service_id,name_snapshot,service:service_id(id,service_code,service_name,category:category_id(category_code)),appointment:appointment_id(id,appointment_code,customer:customer_id('+customerFields+'),staff:staff_id(full_name)))').not('appointment_item_id','is',null).order('created_at',{ascending:false}).order('id'));
            return rows.map(r=>{
                const item=one(r.item),appointment=one(item?.appointment),response=[...r.responses].sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at))[0];
                return {...r,hasServiceTicket:tickets.some(t=>t.appointment_id===appointment?.id),service_id:item?.service_id,service:{...item?.service,service_name:item?.name_snapshot,service_category:categoryCode(item?.service)},appointment_id:appointment?.id,appointment,
                    customer:{...appointment?.customer,phone_main:primaryPhone(appointment?.customer)},shop_reply:response?.response_content||'',responseId:response?.id||null,responseUpdatedAt:response?.updated_at||null};
            });
        };
        return window.PawpalDataStore ? window.PawpalDataStore.fetch('services:reviews',fetcher,{ttlMs:window.PawpalDataStore.TTL_TIERS.LIST,force,backgroundRevalidate:false}) : fetcher();
    }

    const careMediaReaders=new Map();
    window.addEventListener('pagehide',()=>{for(const reader of careMediaReaders.values())reader.clear();careMediaReaders.clear();});
    async function fetchBookingCareLogs(bookingDbId,{force=false}={}) {
        if (!bookingDbId) return [];
        const fetcher = async () => {
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!db) return [];
            const { data, error } = await withServicesQueryTimeout(
                db.from('care_log')
                  .select('id,appointment_id,care_action_id,description,observed_condition,recorded_at,created_at,updated_at,action_name_snapshot,recorded_by,staff:recorded_by(id,full_name),care_action:care_action_id(id,action_name),care_log_media(id,media_url,media_asset_id)')
                  .eq('appointment_id', bookingDbId)
                  .order('recorded_at', { ascending: true })
            );
            if (error) {
                console.warn('[PawpalServices] Lỗi nạp care_log của ca:', error);
                return [];
            }
            const {createCareMediaReader}=await import('/scripts/shared/care-media-reader.mjs');
            if(!careMediaReaders.has(bookingDbId))careMediaReaders.set(bookingDbId,createCareMediaReader(db));
            const resolved=await careMediaReaders.get(bookingDbId).read((data||[]).flatMap(log=>log.care_log_media||[]));
            const byId=new Map(resolved.map(media=>[media.id,media]));
            while(careMediaReaders.size>5){const [key,reader]=careMediaReaders.entries().next().value;reader.clear();careMediaReaders.delete(key);}
            return (data || []).map(log => {
                const author = String(log.description || '').match(/\n?Nhân viên: (.*) \(([0-9a-f-]{36})\)$/i);
                return {
                    ...log,
                    step_name: log.action_name_snapshot || log.care_action?.action_name || 'Ghi nhận chăm sóc',
                    ktv: log.staff?.full_name || '',
                    note: author ? String(log.description).slice(0, author.index).trim() : (log.description || ''),
                    images: (log.care_log_media || []).map(media => byId.get(media.id)?.resolved_url||'').filter(Boolean)
                };
            });
        };

        if (window.PawpalDataStore) {
            return window.PawpalDataStore.fetch(`services:carelogs:${bookingDbId}`, fetcher, {
                ttlMs: window.PawpalDataStore.TTL_TIERS.OPERATIONAL,
                force
            });
        }
        return fetcher();
    }
    PawpalServices.fetchBookingCareLogs = fetchBookingCareLogs;

    async function loadCatalogData({ force = false } = {}) {
        try {
            const { services, prices, priceError } = await fetchCatalogRaw({ force });
            PawpalServices.state.auxiliaryErrors = PawpalServices.state.auxiliaryErrors || {};
            PawpalServices.state.auxiliaryErrors.price = priceError;
            PawpalServices.state.auxiliaryErrors.catalog = null;

            PawpalServices.state.servicesData = (services || []).map(svc => {
                let group = 'spa';
                const codeUpper = String(svc.service_code || '').toUpperCase();
                const catUpper = String(svc.service_category || '').toUpperCase();
                const nameUpper = String(svc.service_name || '').toUpperCase();

                if (codeUpper.startsWith('HTL') || catUpper === 'PET_HOTEL' || catUpper.includes('HOTEL') || nameUpper.includes('PHÒNG') || nameUpper.includes('SUITE') || nameUpper.includes('DAYCARE')) {
                    group = 'hotel';
                } else if (codeUpper.startsWith('TXI') || catUpper === 'PET_TAXI' || catUpper.includes('TAXI') || nameUpper.includes('ĐƯA ĐÓN') || nameUpper.includes('PET TAXI')) {
                    group = 'taxi';
                }

                const svcPrices = (prices || []).filter(p => p.service_id === svc.id && p.status === 'active' && Date.parse(p.effective_from) <= Date.now() && (!p.effective_to || Date.parse(p.effective_to) > Date.now())).sort((a,b)=>Number(a.weight_from)-Number(b.weight_from)||Number(a.distance_from||0)-Number(b.distance_from||0));
                const defaultPriceLabel = priceError ? 'Lỗi tải giá' : 'Chưa có giá';
                const durations=svcPrices.map(p=>Number(p.duration_minutes)).filter(n=>Number.isFinite(n)&&n>0);
                const durationLabel=durations.length?`${Math.min(...durations)}${Math.max(...durations)!==Math.min(...durations)?'–'+Math.max(...durations):''} phút`:svc.duration_label;
                const pricesObj = {
                    under5: defaultPriceLabel,
                    to10: defaultPriceLabel,
                    to20: defaultPriceLabel,
                    over20: defaultPriceLabel
                };

                let minPriceVal = null;
                if (svcPrices.length > 0) {
                    const validPrices = svcPrices.map(p => Number(p.unit_price)).filter(p => Number.isFinite(p) && p >= 0);
                    if (validPrices.length > 0) minPriceVal = Math.min(...validPrices);
                    svcPrices.forEach(p => {
                        const formatted = (Number(p.unit_price) || 0).toLocaleString('vi-VN');
                        if (p.weight_to != null && p.weight_to <= 5) pricesObj.under5 = formatted;
                        else if (p.weight_from >= 5 && p.weight_to != null && p.weight_to <= 10) pricesObj.to10 = formatted;
                        else if (p.weight_from >= 10 && p.weight_to != null && p.weight_to <= 20) pricesObj.to20 = formatted;
                        else if (p.weight_from >= 20) pricesObj.over20 = formatted;
                    });
                }

                return {
                    id: svc.service_code,
                    code: svc.service_code,
                    dbId: svc.id,
                    group: group,
                    category: group,
                    name: svc.service_name,
                    duration: durationLabel || (svc.estimated_duration ? `${svc.estimated_duration} phút` : 'Chưa cập nhật'),
                    durationMinutes:svc.estimated_duration,tripType:svc.trip_type,packageName:svc.package_name,
                    benefits:svc.benefits||'',amenities:svc.amenities||'',
                    updatedAt: svc.updated_at,
                    categoryId: svc.category_id,
                    staffLevelId: svc.staff_level_required_id,
                    staffLevel: one(svc.level)?.level_name || '',
                    commission: svc.commission_rate,
                    petType: svc.supported.map(p=>one(p.species)?.species_name).filter(Boolean).join(', '),
                    steps: [...svc.actions].sort((a,b)=>a.display_order-b.display_order).map(a=>a.care_action.action_name),
                    prices: pricesObj,
                    priceRows: svcPrices,
                    minPrice: minPriceVal,
                    desc: svc.description || '',
                    status: (svc.status === 'active') ? 'Đang phục vụ' : 'Tạm ẩn',
                    media:[...(svc.images||[])].sort((a,b)=>Number(b.is_thumbnail)-Number(a.is_thumbnail)||a.display_order-b.display_order),
                    image: (()=>{const image=[...(svc.images||[])].sort((a,b)=>Number(b.is_thumbnail)-Number(a.is_thumbnail)||a.display_order-b.display_order)[0];return image?.resolved_url||image?.image_url||'';})(),
                    reviewCount: 0,
                    averageRating: null
                };
            });

            // Nếu reviewsData chưa được nạp, nạp ngầm để tính ratings
            if (!PawpalServices.state.reviewsData || PawpalServices.state.reviewsData.length === 0) {
                loadReviewsData({ force: false }).catch(() => {});
            } else {
                computeServiceRatings();
            }

            return PawpalServices.state.servicesData;
        } catch (err) {
            PawpalServices.state.auxiliaryErrors={...PawpalServices.state.auxiliaryErrors,catalog:'Không thể tải danh mục dịch vụ.'};
            PawpalServices.state.servicesData=[];
            console.error('[PawpalServices] Lỗi nạp danh mục dịch vụ:', err);
            return [];
        }
    }
    PawpalServices.loadCatalogData = loadCatalogData;

    function computeServiceRatings() {
        const reviews = PawpalServices.state.reviewsData || [];
        const ratingsMap = new Map();

        for (const r of reviews) {
            const svcId = r.serviceId || r.serviceDbId;
            const star = Number(r.rating);
            if (!svcId || !Number.isInteger(star) || star < 1 || star > 5) continue;

            const acc = ratingsMap.get(svcId) || { sum: 0, count: 0 };
            acc.sum += star;
            acc.count++;
            ratingsMap.set(svcId, acc);
        }

        for (const svc of PawpalServices.state.servicesData || []) {
            const stat = ratingsMap.get(svc.dbId);
            svc.reviewCount = stat ? stat.count : 0;
            svc.averageRating = stat && stat.count > 0 ? (stat.sum / stat.count) : null;
        }

        if (PawpalServices.subtabs?.catalog?.renderCatalogTable) {
            PawpalServices.subtabs.catalog.renderCatalogTable();
        }
    }
    PawpalServices.computeServiceRatings = computeServiceRatings;

    async function loadReviewsData({ force = false } = {}) {
        try {
            const rawReviews = await fetchReviewsRaw({ force });
            PawpalServices.state.auxiliaryErrors={...PawpalServices.state.auxiliaryErrors,reviews:null};
            const getCustomerProfileName = (customer) => {
                const profile = customer?.customer_profile;
                if (Array.isArray(profile)) return profile.find(p => p?.full_name)?.full_name || '';
                return profile?.full_name || '';
            };

            PawpalServices.state.reviewsData = (rawReviews || []).map(r => {
                let cat = 'Spa';
                const sName = r.service?.service_name || '';
                const serviceCategory = String(r.service?.service_category || '').toUpperCase();
                if (serviceCategory === 'PET_HOTEL' || sName.includes('Hotel') || sName.includes('Phòng')) cat = 'Hotel';
                else if (serviceCategory === 'PET_TAXI' || sName.includes('Taxi') || sName.includes('Đón')) cat = 'Taxi';

                const rawStar = Number(r.rating);
                const rating = Number.isInteger(rawStar) && rawStar >= 1 && rawStar <= 5 ? rawStar : null;

                return {
                    id: r.id,
                    reviewCode: `ĐG-${String(r.id || '').slice(0, 8).toUpperCase()}`,
                    dbId: r.id,
                    responseId: r.responseId,
                    responseUpdatedAt: r.responseUpdatedAt,
                    publicationStatus: r.review_status || 'pending',
                    reviewUpdatedAt: r.updated_at,
                    serviceId: r.service_id || r.service?.id || null,
                    serviceDbId: r.service_id || r.service?.id || null,
                    serviceCode: r.service?.service_code || '',
                    bookingId: r.appointment?.appointment_code || '—',
                    appointmentId: r.appointment_id || null,
                    customerName: getCustomerProfileName(r.customer) || 'Khách hàng PawPal',
                    phone: r.customer?.phone_main || '—',
                    serviceName: sName || 'Chưa có thông tin dịch vụ',
                    category: cat,
                    staff: r.appointment?.staff?.full_name || 'Chưa có thông tin',
                    rating,
                    comment: r.review_content || '—',
                    status: r.shop_reply ? 'replied' : 'pending',
                    replyText: r.shop_reply || '',
                    hasServiceTicket:r.hasServiceTicket,
                    createdAt: r.created_at
                };
            });

            computeServiceRatings();
            return PawpalServices.state.reviewsData;
        } catch (err) {
            PawpalServices.state.auxiliaryErrors={...PawpalServices.state.auxiliaryErrors,reviews:'Không thể tải đánh giá dịch vụ.'};
            PawpalServices.state.reviewsData=[];
            console.error('[PawpalServices] Lỗi nạp đánh giá:', err);
            return [];
        }
    }
    PawpalServices.loadReviewsData = loadReviewsData;

    function mapBookings(rawBookings){
            const getCustomerProfileName = (customer) => {
                const profile = customer?.customer_profile;
                if (Array.isArray(profile)) return profile.find(p => p?.full_name)?.full_name || '';
                return profile?.full_name || '';
            };

            return (rawBookings || []).map((item, idx) => {
                let cat = 'Spa';
                const catRaw = String(item.service?.service_category || '').toUpperCase();
                const serviceLabel = item.service?.service_name || '';
                if (catRaw.includes('HOTEL') || /phòng|hotel|suite/i.test(serviceLabel)) cat = 'Hotel';
                else if (catRaw.includes('TAXI') || /taxi|đưa đón/i.test(serviceLabel)) cat = 'Taxi';

                const status = item.appointment_status;

                const paymentStatusText=item.payment_status==='paid'?'Đã thanh toán':item.payment_status==='partial'?'Thu một phần':'Chưa thu';
                const paymentBadgeClass=item.payment_status==='paid'?'badge-success':'badge-warning';

                const customerName = getCustomerProfileName(item.customer) || getCustomerProfileName(item.pet_profile?.customer) || 'Chưa cập nhật tên khách hàng';
                const phone = item.booking_contact_phone || item.customer?.phone_main || item.pet_profile?.customer?.phone_main || '—';
                const petName = item.pet_profile?.pet_name || 'Pet cưng';
                const petBreed = item.pet_profile?.breed || 'Thú cưng';
                const serviceName = item.service?.service_name || 'Chưa có thông tin dịch vụ';
                const rawStaffName = item.staff?.full_name || '';
                const staff = rawStaffName && !rawStaffName.includes('@') ? rawStaffName : null;
                const petWeight = Number(item.pet_profile?.weight) > 0 ? `${item.pet_profile.weight} kg` : 'Chưa cập nhật';
                const rawAllergy = item.pet_profile?.allergy && !/^(không|none)$/i.test(item.pet_profile.allergy.trim()) ? item.pet_profile.allergy.trim() : null;
                const rawRoutine = item.pet_profile?.routine && !/^(không|none)$/i.test(item.pet_profile.routine.trim()) ? item.pet_profile.routine.trim() : null;
                const petAlertParts = [rawAllergy ? `Dị ứng: ${rawAllergy}` : null, rawRoutine ? `Lưu ý: ${rawRoutine}` : null].filter(Boolean);
                const petAllergy = petAlertParts.length > 0 ? petAlertParts.join(' • ') : (item.note && item.note.toLowerCase().includes('dị ứng') ? item.note : null);

                const intake = mapRecord(item.records, 'intake',item.pet_id);
                const intakeRecord = intake;
                const charges = [
                    ...item.adjustments.filter(a=>!['cancelled','rejected'].includes(a.approval_status)).map(a=>({id:a.id,kind:'surcharge',name:a.reason.split(String.fromCharCode(10))[0],reason:a.reason,amount:Number(a.amount_delta),approvalStatus:a.approval_status,consent:a.customer_consent_status,effective:a.approval_status==='approved'&&a.customer_consent_status==='confirmed'})),
                    ...item.items.filter(i=>!i.is_primary&&i.status!=='cancelled').map(i=>({id:i.id,kind:'service',name:i.name_snapshot,amount:Number(i.quantity)*Number(i.unit_price)-Number(i.discount_amount),serviceId:i.service_id,effective:true}))
                ];

                return {
                    id: item.appointment_code || (item.id ? `BKG-${item.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : `BKG-${1000 + idx}`),
                    dbId: item.id,
                    rawStatus: item.appointment_status,
                    created_at: item.created_at,
                    updatedAt: item.updated_at,
                    primaryItem: item.items.find(i=>i.is_primary),
                    collected: item.collected,
                    allItems: item.items,
                    staffId: item.staff_id || item.staff?.id || null,
                    requestedStaffId:item.requested_staff_id,requestedStaffName:one(item.requestedStaff)?.full_name||'',staffConfirmationStatus:item.staff_confirmation_status,
                    proposalStaffId:item.proposal_staff_id,proposalStartAt:item.proposal_start_at,proposalEndAt:item.proposal_end_at,proposalRevision:item.proposal_created_at,
                    scheduledStartAt:item.scheduled_start_at,scheduledEndAt:item.scheduled_end_at,
                    rawNote: item.note,
                    petDbId: item.pet_id,
                    serviceDbId: item.service?.id,
                    serviceCategory: item.service?.service_category,
                    userId: item.customer_id || null,
                    customerName,
                    customerType: window.PawpalCustomerIdentity.classify(item.customer),
                    phoneUnverified: !item.booking_contact_phone&&window.PawpalCustomerIdentity.contact(item.customer).unverified,
                    phone,
                    hotelStay: one(item.hotel)||null,
                    roomCode: one(item.hotel)?.room?.room_number||'',
                    dietPlan: one(item.hotel)?.special_diet_notes||'',
                    billableDays: one(item.hotel) ? item.items.find(i=>i.is_primary)?.quantity : null,
                    checkInDate: one(item.hotel) ? new Date(one(item.hotel).check_in_at).toLocaleDateString('vi-VN',{timeZone:'Asia/Bangkok'}) : '',
                    checkOutDate: one(item.hotel) ? new Date(one(item.hotel).check_out_at).toLocaleDateString('vi-VN',{timeZone:'Asia/Bangkok'}) : '',
                    checkInTime: one(item.hotel) ? new Date(one(item.hotel).check_in_at).toLocaleTimeString('vi-VN',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'}) : '',
                    taxiTrip: one(item.taxi)||null,
                    pickupAddress: one(item.taxi)?.pickup_address || '',
                    dropoffAddress: one(item.taxi)?.dropoff_address || '',
                    tripType: one(item.taxi)?.trip_type || '',
                    distanceKm: one(item.taxi)?.distance_km ?? null,
                    customerNote: item.note || '',
                    petName,
                    petBreed,
                    petId: item.pet_profile?.pet_code || '—',
                    petWeight: intakeRecord ? `${intakeRecord.actualWeight} kg` : petWeight,
                    petAge: item.pet_profile?.date_of_birth ? (() => { const months = Math.floor((Date.now()-Date.parse(item.pet_profile.date_of_birth))/2629800000); return months >= 12 ? `${Math.floor(months/12)} tuổi` : months >= 0 ? `${months} tháng` : 'Chưa cập nhật'; })() : 'Chưa cập nhật',
                    petAlert: petAllergy,
                    category: cat,
                    categoryName: cat === 'Hotel' ? 'Pet Hotel' : (cat === 'Taxi' ? 'Pet Taxi' : 'Spa và Grooming'),
                    serviceName,
                    duration: item.service?.estimated_duration ? `${item.service.estimated_duration} phút` : 'Chưa cập nhật',
                    date: item.appointment_date || '',
                    time: item.appointment_time ? item.appointment_time.substring(0, 5) : '',
                    staff,
                    intakeRecord,
                    handoverRecord: mapRecord(item.records, 'handover',item.pet_id),
                    originalWeight: item.items.find(i=>i.is_primary)?.weight_snapshot != null ? String(item.items.find(i=>i.is_primary).weight_snapshot)+' kg' : 'Chưa ghi nhận',
                    charges,
                    surcharges: charges.filter(c => c.kind === 'surcharge'),
                    adjustmentProofPhotos:item.adjustments.flatMap(a=>a.proofPhotos||[]),
                    accompanyingServices: charges.filter(c => c.kind === 'service').map(c => ({ ...c, price: c.amount, note: c.reason })),
                    price: Number(item.total_price || 0) - charges.filter(c=>c.effective).reduce((sum, c) => sum + c.amount, 0),
                    total: item.total_price || 0,
                    paymentStatus: paymentStatusText,
                    paymentBadgeClass,
                    rawPaymentStatus: item.payment_status,
                    status,
                    alertType: isBookingUpcoming({ status, date: item.appointment_date, time: item.appointment_time }) ? 'upcoming' : null,
                    careLogs: [],
                    _careLogsLoaded: false
                };
            });

    }
    let bookingReadVersion=0;
    PawpalServices.state.serverBookingPagination=true;
    const defaultBookingFilters={query:'',category:'ALL',status:'ALL',staff:'ALL',today:false,upcoming:false,allergy:false,sla:false};
    async function ensureBooking(id,{force=false}={}){
        if(!id)return null;
        const state=PawpalServices.state,found=state.bookingsData.find(b=>b.id===id||b.dbId===id);
        if(found&&!force&&state.pageBookings?.some(b=>b.dbId===found.dbId))return found;
        const rows=mapBookings(await fetchBookingsRaw({id,force,forceDirectory:false}));
        const booking=rows[0];
        state.bookingsData=state.bookingsData.filter(b=>b.id!==id&&b.dbId!==id);
        if(booking)state.bookingsData=[...state.bookingsData.filter(b=>b.dbId!==booking.dbId),booking];
        return booking||null;
    }
    PawpalServices.ensureBooking=ensureBooking;
    PawpalServices.exportFilteredBookings=async filters=>{
        const {data,error}=await window.getSupabaseClient().rpc('get_admin_service_booking_page',{p_filters:{...defaultBookingFilters,...filters},p_page:1,p_export:true});
        if(error)throw error;
        if(!Array.isArray(data?.exportRows))throw Error('invalid_booking_export');
        return data.exportRows;
    };
    async function loadServicesData({force=false,forceDirectory=force,forceStaff=force,prefetch=true,filters,page,render=true}={}){
        const db=window.getSupabaseClient?.()||window.SupabaseClient,state=PawpalServices.state;
        if(!db){state.loadError='Không thể kết nối cơ sở dữ liệu.';return false;}
        if(force)window.PawpalDataStore?.invalidate('services:bookings*');
        const version=++bookingReadVersion;
        filters={...defaultBookingFilters,...(filters||state.bookingFilters||{})};page=page||state.bookingPageMeta?.page||1;state.bookingFilters=filters;
        try{
            state.loadError=null;
            const fetcher=async()=>{
                const {data,error}=await db.rpc('get_admin_service_booking_page',{p_filters:filters,p_page:page,p_export:false});
                if(error)throw error;
                if(!data||!Array.isArray(data.ids)||data.ids.length>10)throw Error('invalid_booking_page');
                return {meta:data,rows:await fetchBookingsRaw({ids:data.ids,force,forceDirectory})};
            };
            const store=window.PawpalDataStore,key='services:bookings:page:'+(store?.buildKey?.('booking-page',{filters:JSON.stringify(filters),page})||JSON.stringify({filters,page}));
            const [result,staff]=await Promise.all([store?store.fetch(key,fetcher,{force,ttlMs:store.TTL_TIERS.OPERATIONAL,backgroundRevalidate:false}):fetcher(),fetchStaffRaw({force:forceStaff})]);
            if(version!==bookingReadVersion)return null;
            state.liveStaffList=staff;
            const mapped=mapBookings(result.rows),pageIds=new Set(mapped.map(b=>b.dbId));
            state.bookingsData=[...state.bookingsData.filter(b=>(b.id===state.selectedBookingId||b.dbId===state.selectedBookingId)&&!pageIds.has(b.dbId)),...mapped];
            state.pageBookings=mapped;state.bookingPageMeta=result.meta;state.isLoaded=true;
            if(state.selectedBookingId&&!mapped.some(b=>b.id===state.selectedBookingId||b.dbId===state.selectedBookingId))await ensureBooking(state.selectedBookingId,{force});
            if(version!==bookingReadVersion)return null;
            if(prefetch&&!state.servicesData.length)loadCatalogData().catch(()=>{});
            if(prefetch&&!state.reviewsData.length)loadReviewsData().catch(()=>{});
        }catch(error){if(version!==bookingReadVersion)return null;state.loadError='Không thể tải dữ liệu dịch vụ. Vui lòng thử lại.';state.pageBookings=[];console.error('[PawpalServices] Booking page:',error);}
        if(render){PawpalServices.subtabs.bookings?.renderBookingsTable({skipFetch:true});PawpalServices.subtabs.bookings?.renderUpcomingBar();PawpalServices.subtabs.bookings?.updateKPIs();}
        return !state.loadError;
    }
    PawpalServices.loadServicesData = loadServicesData;

    // Lắng nghe mutation liên phân hệ
    if (window.PawpalDataStore) {
        window.PawpalDataStore.subscribeMutations((mutation) => {
            if (mutation.entity === 'appointment') {
                window.PawpalDataStore.invalidate('services:bookings*');
                if (mutation.id) {
                    window.PawpalDataStore.invalidate(`services:carelogs:${mutation.id}`);
                }
            } else if (mutation.entity === 'service' || mutation.entity === 'service_price_matrix') {
                window.PawpalDataStore.invalidate('services:catalog*');
            } else if (['customer','customer_profile','customer_phone','pet_profile','pet_weight_history','hotel_room','room_type'].includes(mutation.entity)) {
                window.PawpalDataStore.invalidate('services:directory*');
                window.PawpalDataStore.invalidate('services:bookings*');
            } else if (['staff','staff_assessment'].includes(mutation.entity)) {
                window.PawpalDataStore.invalidate('services:staff*');
            }
        });
    }

    // Quản lý Header Subtabs & Breadcrumb
    function updateBreadcrumb(bookingCode) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Dịch vụ') return;
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (bookingCode) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${PawpalServices.escapeHtml(bookingCode)}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }
    PawpalServices.updateBreadcrumb = updateBreadcrumb;

    function switchSubtab(subtabId, updateHistory = true) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Dịch vụ') return;
        const subtabsContainer = document.getElementById('headerSubtabsGroup');

        if (subtabsContainer) {
            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-subtab') === subtabId);
            });
        }

        const root = document.getElementById('subtab-tab-service-bookings')?.closest('.admin-module-wrapper');
        if (!root || sessionStorage.getItem('pawpal_admin_active_module') !== 'Dịch vụ') return;
        root.querySelectorAll('.subtab-content').forEach(section => {
            section.classList.toggle('active', section.id === 'subtab-' + subtabId);
        });

        sessionStorage.setItem('pawpal_admin_services_active_subtab', subtabId);
        if (updateHistory) {
            if (window.location.hash !== '#' + subtabId) {
                try {
                    history.pushState(null, '', '#' + subtabId);
                } catch (e) {
                    window.location.hash = '#' + subtabId;
                }
            }
        } else {
            if (window.location.hash !== '#' + subtabId) {
                try {
                    history.replaceState(null, '', '#' + subtabId);
                } catch (e) {}
            }
        }

        if (subtabId === 'tab-service-detail') {
            const bId = PawpalServices.state.selectedBookingId || null;
            updateBreadcrumb(bId);
            if (PawpalServices.subtabs.detail?.renderBookingDetail) {
                PawpalServices.state.detailError=false;
                if(PawpalServices.state.bookingsData.some(b=>b.id===bId||b.dbId===bId))PawpalServices.subtabs.detail.renderBookingDetail(bId);
                else{const card=document.querySelector('#subtab-tab-service-detail .service-detail-card'),state=document.getElementById('serviceDetailState');if(card)card.style.display='none';if(state){state.style.display='block';state.textContent='Đang tải hồ sơ lịch hẹn…';}}
                ensureBooking(bId).then(()=>{if(PawpalServices.state.selectedBookingId===bId)PawpalServices.subtabs.detail.renderBookingDetail(bId);}).catch(()=>{if(PawpalServices.state.selectedBookingId!==bId)return;PawpalServices.state.detailError=true;PawpalServices.subtabs.detail.renderBookingDetail(bId);});
            }
        } else {
            updateBreadcrumb(null);
        }

        if (subtabId === 'tab-service-bookings' && PawpalServices.subtabs.bookings) {
            PawpalServices.subtabs.bookings.renderBookingsTable();
            PawpalServices.subtabs.bookings.renderUpcomingBar();
            PawpalServices.subtabs.bookings.updateKPIs();
        } else if (subtabId === 'tab-service-catalog' && PawpalServices.subtabs.catalog) {
            if (!PawpalServices.state.servicesData || PawpalServices.state.servicesData.length === 0) {
                loadCatalogData().then(() => {
                    PawpalServices.subtabs.catalog?.renderCatalogTable();
                });
            } else {
                PawpalServices.subtabs.catalog.renderCatalogTable();
            }
        } else if (subtabId === 'tab-service-reviews' && PawpalServices.subtabs.reviews) {
            if (!PawpalServices.state.reviewsData || PawpalServices.state.reviewsData.length === 0) {
                loadReviewsData().then(() => {
                    PawpalServices.subtabs.reviews?.renderReviewsTable();
                    PawpalServices.subtabs.reviews?.updateReviewKPIs();
                });
            } else {
                PawpalServices.subtabs.reviews.renderReviewsTable();
                PawpalServices.subtabs.reviews.updateReviewKPIs();
            }
        }

        if (window.lucide) lucide.createIcons();
    }
    PawpalServices.switchSubtab = switchSubtab;

    function openBookingDetail(bookingId) {
        PawpalServices.state.selectedBookingId = bookingId;
        sessionStorage.setItem('pawpal_admin_service_selected_id', bookingId);
        switchSubtab('tab-service-detail');
    }
    PawpalServices.openBookingDetail = openBookingDetail;

    PawpalServices.fetchStaffScheduleBookings=async(from,to)=>{
        const rows=await allRows(()=>window.getSupabaseClient().from('appointment').select('id,appointment_code,appointment_status,staff_id,requested_staff_id,staff_confirmation_status,scheduled_start_at,scheduled_end_at,pet:pet_id(pet_name)').not('appointment_status','in','(cancelled,no_show)').gt('scheduled_end_at',new Date(from).toISOString()).lt('scheduled_start_at',new Date(to).toISOString()).order('id'));
        return rows.map(a=>({id:a.appointment_code,dbId:a.id,status:a.appointment_status,staffId:a.staff_id||a.requested_staff_id,awaitingStaff:['pending','awaiting_customer'].includes(a.staff_confirmation_status),scheduledStartAt:a.scheduled_start_at,scheduledEndAt:a.scheduled_end_at,petName:one(a.pet)?.pet_name||'—'}));
    };

    let _isServicesInit = false;
    async function initServicesModule() {
        if (_isServicesInit) {
            if (PawpalServices.subtabs.bookings?.renderBookingsTable) {
                PawpalServices.subtabs.bookings.renderBookingsTable();
                PawpalServices.subtabs.bookings.renderUpcomingBar();
                PawpalServices.subtabs.bookings.updateKPIs();
            }
            return;
        }
        _isServicesInit = true;

        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        const validTabs = ['tab-service-bookings', 'tab-service-detail', 'tab-service-catalog', 'tab-service-reviews'];

        // Tải dữ liệu ban đầu từ Supabase
        await loadServicesData();

        if (sessionStorage.getItem('pawpal_admin_services_open_booking_modal') === 'true') {
            const petCode = sessionStorage.getItem('pawpal_admin_selected_pet_code');
            const pet = window.PawpalPets?.state?.petsData?.[petCode];
            if (pet && PawpalServices.subtabs.bookings?.openForPet) {
                switchSubtab('tab-service-bookings', false);
                PawpalServices.subtabs.bookings.openForPet(pet);
                sessionStorage.removeItem('pawpal_admin_services_open_booking_modal');
            }
        }

        // Khởi tạo các subtab con
        if (PawpalServices.subtabs.bookings?.renderBookingsTable) {
            PawpalServices.subtabs.bookings.renderBookingsTable();
            PawpalServices.subtabs.bookings.renderUpcomingBar();
            PawpalServices.subtabs.bookings.updateKPIs();
        }
        if (PawpalServices.subtabs.catalog?.renderCatalogTable) {
            PawpalServices.subtabs.catalog.renderCatalogTable();
        }
        if (PawpalServices.subtabs.reviews?.renderReviewsTable) {
            PawpalServices.subtabs.reviews.renderReviewsTable();
            PawpalServices.subtabs.reviews.updateReviewKPIs();
        }
        if (PawpalServices.subtabs.detail?.renderBookingDetail) {
            const bId = sessionStorage.getItem('pawpal_admin_service_selected_id') || PawpalServices.state.selectedBookingId;
            PawpalServices.subtabs.detail.renderBookingDetail(bId);
        }

        // Khôi phục subtab active từ URL hash hoặc sessionStorage
        const savedSubtab = sessionStorage.getItem('pawpal_admin_services_active_subtab');
        const hashSubtab = window.location.hash ? window.location.hash.substring(1) : '';

        if (validTabs.includes(hashSubtab)) {
            switchSubtab(hashSubtab, false);
        } else if (savedSubtab && validTabs.includes(savedSubtab)) {
            switchSubtab(savedSubtab, false);
        } else {
            switchSubtab('tab-service-bookings', false);
        }

        window.addEventListener('admin:subtab-change', (e) => {
            if (e.detail?.module === 'Dịch vụ' && validTabs.includes(e.detail.tabId)) {
                switchSubtab(e.detail.tabId, false);
            }
        });

        setupServicesRealtimeSync();

        document.querySelectorAll('.services-module form').forEach(form=>form.addEventListener('submit',event=>event.preventDefault()));
        // BỘ LẮNG NGHE ĐÓNG MODAL 4 CHIỀU TOÀN CỤC CHUẨN RULE AGENTS.MD
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-close-modal]');
            if (closeBtn) {
                const modalId = closeBtn.getAttribute('data-close-modal');
                const modalEl = document.getElementById(modalId);
                if (modalEl) {
                    modalEl.classList.remove('active');
                    if (modalEl.style) modalEl.style.display = 'none';
                }
            }
            if (e.target.classList.contains('admin-modal-overlay')) {
                e.target.classList.remove('active');
                if (e.target.style) e.target.style.display = 'none';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.admin-modal-overlay.active').forEach(m => {
                    m.classList.remove('active');
                    if (m.style) m.style.display = 'none';
                });
            }
        });
    }

    let _servicesRealtimeChannel = null;
    function setupServicesRealtimeSync() {
        if (_servicesRealtimeChannel) return;
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client || typeof client.channel !== 'function') return;

        try {
            const dirty=new Set();let fallbackTimer,refreshRunning=false;
            const flush=async()=>{
                if(refreshRunning||!dirty.size||sessionStorage.getItem('pawpal_admin_active_module')!=='Dịch vụ'||document.hidden)return;refreshRunning=true;
                try{
                const groups=new Set(dirty);dirty.clear();
                await Promise.all([
                    groups.has('bookings')?loadServicesData({force:true,forceDirectory:false,forceStaff:false,prefetch:false}):null,
                    groups.has('catalog')?loadCatalogData({force:true}):null,
                    groups.has('reviews')?loadReviewsData({force:true}):null
                ]);
                if(groups.has('catalog'))PawpalServices.subtabs.catalog?.renderCatalogTable?.();
                if(groups.has('reviews')){PawpalServices.subtabs.reviews?.renderReviewsTable?.();PawpalServices.subtabs.reviews?.updateReviewKPIs?.();}
                if(groups.has('bookings')){PawpalServices.refreshStaffSchedule?.();PawpalServices.subtabs?.bookings?.renderBookingsTable?.();PawpalServices.subtabs?.bookings?.updateKPIs?.();}
                }finally{refreshRunning=false;if(dirty.size){clearTimeout(fallbackTimer);fallbackTimer=setTimeout(flush,400);}}
            };
            const triggerServiceSync=pattern=>{
                for(const group of ['bookings','catalog','reviews'])if(pattern==='services:*'||pattern.startsWith('services:'+group))dirty.add(group);
                if(window.PawpalDataStore?.handleRealtimeChange)window.PawpalDataStore.handleRealtimeChange({moduleName:'Dịch vụ',invalidatePattern:pattern,onActiveRefresh:flush,debounceMs:400});
                else if(sessionStorage.getItem('pawpal_admin_active_module')==='Dịch vụ'&&!document.hidden){clearTimeout(fallbackTimer);fallbackTimer=setTimeout(flush,400);}
            };
            const directoryChanged=()=>{window.PawpalDataStore?.invalidate('services:directory*');triggerServiceSync('services:bookings*');};

            _servicesRealtimeChannel = client.channel('admin-services-live-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment' }, () => triggerServiceSync('services:bookings*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'service' }, () => triggerServiceSync('services:catalog*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'service_price_matrix' }, () => triggerServiceSync('services:catalog*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_room_type' }, () => triggerServiceSync('services:catalog*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'taxi_price_rule' }, () => triggerServiceSync('services:catalog*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'service_image' }, () => triggerServiceSync('services:catalog*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'review' }, () => triggerServiceSync('services:reviews*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'review_media' }, () => triggerServiceSync('services:reviews*'))
                .on('postgres_changes', {event:'*',schema:'public',table:'appointment_item'},()=>{triggerServiceSync('services:bookings*');triggerServiceSync('services:reviews*');})
                .on('postgres_changes', {event:'*',schema:'public',table:'appointment_record'},()=>triggerServiceSync('services:bookings*'))
                .on('postgres_changes', {event:'*',schema:'public',table:'appointment_adjustment'},()=>triggerServiceSync('services:bookings*'))
                .on('postgres_changes', {event:'*',schema:'public',table:'payment'},()=>triggerServiceSync('services:bookings*'))
                .on('postgres_changes', {event:'*',schema:'public',table:'refund_transaction'},()=>triggerServiceSync('services:bookings*'))
                .on('postgres_changes', {event:'*',schema:'public',table:'taxi_trip'},()=>triggerServiceSync('services:bookings*'))
                .on('postgres_changes', {event:'*',schema:'public',table:'hotel_booking'},()=>triggerServiceSync('services:bookings*'))
                .on('postgres_changes', {event:'*',schema:'public',table:'care_log'},()=>{window.PawpalDataStore?.invalidate('services:carelogs*');triggerServiceSync('services:bookings*');})
                .on('postgres_changes', {event:'*',schema:'public',table:'review_response'},()=>triggerServiceSync('services:reviews*'))
                .on('postgres_changes', {event:'*',schema:'public',table:'service_care_action'},()=>triggerServiceSync('services:catalog*'))
                .on('postgres_changes', {event:'*',schema:'public',table:'service_supported_species'},()=>triggerServiceSync('services:catalog*'))
                .on('postgres_changes', {event:'*',schema:'public',table:'pet_weight_history'},directoryChanged)
                .on('postgres_changes', {event:'*',schema:'public',table:'customer_phone'},()=>{directoryChanged();triggerServiceSync('services:reviews*');})
                .on('postgres_changes', {event:'*',schema:'public',table:'customer'},directoryChanged)
                .on('postgres_changes', {event:'*',schema:'public',table:'customer_profile'},()=>{directoryChanged();triggerServiceSync('services:reviews*');})
                .on('postgres_changes', {event:'*',schema:'public',table:'pet_profile'},directoryChanged)
                .on('postgres_changes', {event:'*',schema:'public',table:'hotel_room'},directoryChanged)
                .on('postgres_changes', {event:'*',schema:'public',table:'staff'},()=>{window.PawpalDataStore?.invalidate('services:staff');triggerServiceSync('services:bookings*');})
                .on('postgres_changes', {event:'*',schema:'public',table:'staff_assessment'},()=>{window.PawpalDataStore?.invalidate('services:staff');triggerServiceSync('services:bookings*');})
                .on('postgres_changes', {event:'*',schema:'public',table:'staff_schedule'},()=>PawpalServices.refreshStaffSchedule?.())
                .on('postgres_changes', {event:'*',schema:'public',table:'support_ticket'},()=>triggerServiceSync('services:reviews*'))
                .subscribe();

            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin-services-live-sync');

            window.addEventListener('beforeunload', () => {
                if (_servicesRealtimeChannel) {
                    client.removeChannel(_servicesRealtimeChannel);
                    window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin-services-live-sync');
                }
            });
        } catch (e) {
            console.warn('[Services] Lỗi mở kênh realtime:', e);
        }
    }

    PawpalServices.init = initServicesModule;
    window.initServicesModule = initServicesModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initServicesModule);
    } else {
        initServicesModule();
    }
})();

/* ========================================================================
   MODAL PRESENTATION & ACCESSIBILITY
   Hợp nhất từ service-modal-v8.js; không thay đổi logic lưu dữ liệu/nghiệp vụ.
   ======================================================================== */
(function installServiceModalAccessibility() {
    'use strict';

    if (window.__serviceModalV8) return;
    window.__serviceModalV8 = true;

    const entries = new Map();
    let scheduled = false;

    const isVisible = (modal) => (
        modal.isConnected &&
        getComputedStyle(modal).display !== 'none' &&
        modal.getClientRects().length > 0
    );

    const getFocusableElements = (modal) => [
        ...modal.querySelectorAll(
            'button:not(:disabled), input:not(:disabled):not([type="hidden"]), ' +
            'select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'
        )
    ].filter((element) => element.getClientRects().length > 0);

    const isBusy = (modal) => modal.dataset.saving === 'true';

    const closeModal = (modal) => {
        if (isBusy(modal)) return;

        const closeButton = modal.querySelector('[data-close-modal]');
        if (closeButton) {
            closeButton.click();
        } else {
            modal.style.display = 'none';
        }
    };

    const syncModalAccessibility = () => {
        scheduled = false;

        document.querySelectorAll('.services-module .admin-modal-overlay').forEach((modal) => {
            if (!isVisible(modal) || entries.has(modal)) return;

            entries.set(modal, document.activeElement);

            const card = modal.querySelector('.admin-modal-card');
            if (!card) return;

            card.tabIndex = -1;
            card.setAttribute('role', 'dialog');
            card.setAttribute('aria-modal', 'true');

            const title = modal.querySelector('.admin-modal-title, .modal-title-clean');
            if (title) {
                title.id ||= `${modal.id}Title`;
                card.setAttribute('aria-labelledby', title.id);
            }

            modal.querySelectorAll('.form-group, .form-group-item').forEach((group) => {
                const label = group.querySelector('label');
                const input = group.querySelector('input:not([type="hidden"]), select, textarea');

                if (label && input?.id) {
                    label.htmlFor = input.id;
                }
            });

            const focusableElements = getFocusableElements(modal);
            const preferredInput = focusableElements.find((element) => (
                element.matches('input:not([readonly]), select, textarea')
            ));
            (preferredInput || focusableElements[0])?.focus();
        });

        for (const [modal, previousFocus] of entries) {
            if (isVisible(modal)) continue;

            entries.delete(modal);
            if (previousFocus?.isConnected) previousFocus.focus();
        }
    };

    const scheduleSync = () => {
        if (scheduled) return;

        scheduled = true;
        requestAnimationFrame(syncModalAccessibility);
    };

    new MutationObserver(scheduleSync).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });

    document.addEventListener('keydown', (event) => {
        const visibleModals = [...entries.keys()].filter(isVisible);
        const modal = visibleModals.at(-1);
        if (!modal) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
            closeModal(modal);
            return;
        }

        if (event.key !== 'Tab') return;

        const focusableElements = getFocusableElements(modal);
        const first = focusableElements[0];
        const last = focusableElements.at(-1);
        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }, true);

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const modal = target.closest('.services-module .admin-modal-overlay');
        if (!modal) return;

        const closing = target === modal || target.closest('[data-close-modal]');
        if (closing && isBusy(modal)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }

        if (target === modal) closeModal(modal);
    }, true);
})();

})();
