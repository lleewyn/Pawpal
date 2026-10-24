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
        for(const id of ['intakeStaffSelect','newLogStepStaff','editCarelogStepStaff','accompanyingServiceItemSelect','accompanyingStaffSelect','newBookingHotelRoomType','changeStaffSelect','newBookingStaff','cashierMethod','cashierPayment']) {
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
                    button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',()=>{select.value=option.value;input.value=option.textContent;popover.style.display='none';select.dispatchEvent(new Event('change',{bubbles:true}));});popover.append(button);}
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
            confirmationStatus:r.customer_confirmation_status,safetyNote:r.safety_note_snapshot,allergy:r.allergy_note_snapshot,note:r.note,proofPhotos:[]};
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
        const {recordedAt,updatedAt,staffName,intakeRecordedAt,total,...details}=record;
        const key=booking.dbId+':'+kind,id=requestId(key,details);
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
        const key=booking.dbId+':charge',id=requestId(key,details);
        await PawpalServices.changeCharge(booking,id,c.kind==='service'?'add_service':'propose',details);requestIds.delete(key);
    };
    PawpalServices.saveCareLog=async function(booking,log,action,details) {
        const key=booking.dbId+':carelog',id=log?.id||requestId(key,details);
        await performBookingWrite(booking,async db=>{
            const {data,error}=await db.rpc('save_admin_service_care_log',{p_id:id,p_appointment_id:booking.dbId,p_expected_updated_at:booking.updatedAt,p_expected_log_updated_at:log?.updated_at||null,p_action:action,p_details:details});
            if(error)throw error;if(data!==id)throw Error('Không xác minh được nhật ký đã lưu.');
            requestIds.delete(key);
        });
    };

    // Helper: Chuyển chuỗi tiếng Việt không dấu
    function toUnaccent(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
            .toLowerCase()
            .trim();
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
    const primaryPhone = customer => (customer?.customer_phone || []).find(p => p.is_primary)?.phone_number || '';
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
    const customerFields='id,customer_status,customer_profile(full_name),customer_phone(phone_number,is_primary)';
    const petFields='id,customer_id,pet_code,pet_name,breed_id,date_of_birth,allergy,routine,safety_note,avatar_url,status,breed:breed_id(breed_name,species:species_id(species_name))';
    async function fetchBookingDirectoryRaw({force=false}={}){
        const fetcher=async()=>{
            const db=window.getSupabaseClient();
            const [weights,customers,pets,measurements,rooms]=await Promise.all([
                allRows(()=>db.from('pet_current_weight').select('pet_id,weight').order('pet_id')),
                allRows(()=>db.from('customer').select(customerFields).order('id')),
                allRows(()=>db.from('pet_profile').select(petFields).order('id')),
                allRows(()=>db.from('pet_weight_history').select('pet_id,weight,measured_at').order('id')),
                allRows(()=>db.from('hotel_room').select('id,room_number,status,type:room_type_id(id,room_type,daily_price,status)').order('id'))
            ]);
            return {weights,customers,pets,measurements,rooms};
        };
        const store=window.PawpalDataStore,key='services:directory:'+(store?.buildKey?.('booking-directory')||'session');
        return store?store.fetch(key,fetcher,{ttlMs:store.TTL_TIERS.LIST,force,backgroundRevalidate:false}):fetcher();
    }
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
            const appointments=await allRows(()=>{let query=db.from('appointment').select('*,customer:customer_id('+customerFields+'),pet_profile:pet_id('+petFields+'),staff:staff_id(id,full_name,job_title),items:appointment_item(*,service:service_id(id,service_code,service_name,estimated_duration,category:category_id(category_code))),records:appointment_record(*,recorder:recorded_by(full_name)),adjustments:appointment_adjustment(*),taxi:taxi_trip(*),hotel:hotel_booking(*,room:room_id(room_number,type:room_type_id(room_type)))').order('created_at',{ascending:false}).order('id');if(ids)query=query.in('id',ids);if(id)query=query.eq(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)?'id':'appointment_code',id);return query;});
            if(!appointments.length)return [];
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
        const fetcher=()=>allRows(()=>window.getSupabaseClient().from('staff').select('id,full_name,job_title,specialization,phone_number,staff_level_id,service_locked').eq('employment_status','active').order('id'));
        return window.PawpalDataStore ? window.PawpalDataStore.fetch('services:staff',fetcher,{ttlMs:window.PawpalDataStore.TTL_TIERS.CATALOG,force,backgroundRevalidate:false}) : fetcher();
    }

    async function fetchCatalogRaw({ force = false } = {}) {
        const fetcher=async()=>{
            const db=window.getSupabaseClient();
            const [services,prices,species,levels]=await Promise.all([
                allRows(()=>db.from('service').select('*,category:category_id(id,category_code,category_name),level:staff_level_required_id(id,level_name),supported:service_supported_species(species:species_id(id,species_name)),actions:service_care_action(display_order,estimated_duration,care_action:care_action_id(id,action_name,is_active))').order('id')),
                allRows(()=>db.from('service_price_matrix').select('*').order('id')),
                readRows(db.from('pet_species').select('id,species_name').eq('is_active',true).order('species_name')),
                readRows(db.from('staff_level').select('id,level_name').eq('is_active',true).order('rank_order'))
            ]);
            PawpalServices.state.liveSpecies=species;PawpalServices.state.liveLevels=levels;
            return {services:services.map(s=>({...s,service_category:categoryCode(s)})),prices,priceError:null};
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

    async function fetchBookingCareLogs(bookingDbId,{force=false}={}) {
        if (!bookingDbId) return [];
        const fetcher = async () => {
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!db) return [];
            const { data, error } = await withServicesQueryTimeout(
                db.from('care_log')
                  .select('id,appointment_id,care_action_id,description,observed_condition,recorded_at,created_at,updated_at,action_name_snapshot,recorded_by,staff:recorded_by(id,full_name),care_action:care_action_id(id,action_name),care_log_media(media_url)')
                  .eq('appointment_id', bookingDbId)
                  .order('recorded_at', { ascending: true })
            );
            if (error) {
                console.warn('[PawpalServices] Lỗi nạp care_log của ca:', error);
                return [];
            }
            return (data || []).map(log => {
                const author = String(log.description || '').match(/\n?Nhân viên: (.*) \(([0-9a-f-]{36})\)$/i);
                return {
                    ...log,
                    step_name: log.action_name_snapshot || log.care_action?.action_name || 'Ghi nhận chăm sóc',
                    ktv: log.staff?.full_name || '',
                    note: author ? String(log.description).slice(0, author.index).trim() : (log.description || ''),
                    images: (log.care_log_media || []).map(media => media.media_url)
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

                const svcPrices = (prices || []).filter(p => p.service_id === svc.id && p.status === 'active' && Date.parse(p.effective_from) <= Date.now() && (!p.effective_to || Date.parse(p.effective_to) > Date.now()));
                const defaultPriceLabel = priceError ? 'Lỗi tải giá' : 'Chưa có giá';
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
                    duration: svc.estimated_duration ? `${svc.estimated_duration} phút` : 'Chưa cập nhật',
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
                    image: svc.thumbnail_url || '',
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
                const phone = item.customer?.phone_main || item.pet_profile?.customer?.phone_main || '—';
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
                    staffId: item.staff?.id || null,
                    scheduledStartAt:item.scheduled_start_at,scheduledEndAt:item.scheduled_end_at,
                    rawNote: item.note,
                    petDbId: item.pet_id,
                    serviceDbId: item.service?.id,
                    serviceCategory: item.service?.service_category,
                    userId: item.customer_id || null,
                    customerName,
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
    const defaultBookingFilters={query:'',category:'ALL',status:'ALL',staff:'ALL',upcoming:false,allergy:false,sla:false};
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
            } else if (mutation.entity === 'staff') {
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
        const rows=await allRows(()=>window.getSupabaseClient().from('appointment').select('id,appointment_code,appointment_status,staff_id,scheduled_start_at,scheduled_end_at,pet:pet_id(pet_name)').not('appointment_status','in','(cancelled,no_show)').gt('scheduled_end_at',new Date(from).toISOString()).lt('scheduled_start_at',new Date(to).toISOString()).order('id'));
        return rows.map(a=>({id:a.appointment_code,dbId:a.id,status:a.appointment_status,staffId:a.staff_id,scheduledStartAt:a.scheduled_start_at,scheduledEndAt:a.scheduled_end_at,petName:one(a.pet)?.pet_name||'—'}));
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
                .on('postgres_changes', { event: '*', schema: 'public', table: 'review' }, () => triggerServiceSync('services:reviews*'))
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
                .on('postgres_changes', {event:'*',schema:'public',table:'room_type'},directoryChanged)
                .on('postgres_changes', {event:'*',schema:'public',table:'staff'},()=>{window.PawpalDataStore?.invalidate('services:staff');triggerServiceSync('services:bookings*');})
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
