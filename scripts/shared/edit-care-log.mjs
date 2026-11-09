import { createCareMediaEditor } from './care-media.mjs';

// A versioned snapshot keeps a reloaded/reordered timeline from changing the log being edited.
export function bindEditCareLog({ modal, services, db, fetchImpl = fetch, confirmDelete = text => window.confirm(text) }) {
    const el=id=>modal.querySelector('#'+id);
    const save=el('btnSubmitEditCarelogStep'),remove=el('btnDeleteCarelogStep');
    const fields=['editCarelogStepTitle','editCarelogStepStaff','editCarelogStepTime','editCarelogStepDesc'].map(el);
    const editor=createCareMediaEditor({root:el('editCarelogMedia'),db,fetchImpl});
    let context=null,generation=0,busy=false,loading=false,ready=false;
    const toast=(text,type='warning')=>services.showToast(text,type);
    const current=epoch=>epoch===generation&&modal.classList.contains('active');
    const lock=value=>{fields.forEach(field=>field.disabled=value);save.disabled=value||!ready;remove.disabled=value||!ready||!!context?.hasMedia;};
    function close(){generation++;ready=false;modal.classList.remove('active');editor.close();lock(busy);}
    modal.addEventListener('click',event=>{if(event.target===modal||event.target.closest('[data-close-modal="'+modal.id+'"]'))close();});
    modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
    new MutationObserver(()=>{if(!modal.classList.contains('active')&&ready){generation++;ready=false;editor.close();}}).observe(modal,{attributes:true,attributeFilter:['class']});
    window.addEventListener('hashchange',close);
    el('formEditCarelogStep').addEventListener('submit',event=>event.preventDefault());
    async function open(booking,log){
        if(busy||loading){toast('Đợi thao tác hiện tại hoàn tất rồi mở lại nhật ký.');return;}
        const epoch=++generation;ready=false;context={booking:structuredClone(booking),log:structuredClone(log),hasMedia:true};lock(true);
        el('editCarelogModalMeta').textContent=booking.id+' · '+(booking.petName||'Bé cưng');
        el('editCarelogStepTitle').value=log.step_name||log.action_name_snapshot||'';
        el('editCarelogStepDesc').value=log.note??log.description??'';
        const list=services.state.liveStaffList||[],picker=el('editCarelogStepStaff');
        picker.replaceChildren(new Option('Chọn kỹ thuật viên',''),...list.map(staff=>new Option(staff.full_name,staff.id)));
        picker.value=log.recorded_by||log.staff?.id||list.find(staff=>staff.full_name===log.ktv)?.id||'';
        el('editCarelogStepTime').value=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'}).format(new Date(log.recorded_at));
        el('editCarelogStepDone').checked=true;el('editCarelogStepDone').disabled=true;
        modal.classList.add('active');
        loading=true;
        try{
            const count=await editor.reset({appointment:booking.dbId,logId:log.id});
            if(!current(epoch)){editor.close();return;}
            context.hasMedia=count>0;
            ready=booking.status==='in_progress';lock(!ready);
            remove.title=context.hasMedia?'Nhật ký có ảnh bằng chứng, không thể xóa.':'';
            if(!ready)toast('Chỉ sửa nhật ký khi ca đang thực hiện.');
        }catch(error){if(current(epoch))toast(error.message,'danger');}
        finally{loading=false;}
    }
    save.addEventListener('click',async()=>{
        if(busy||!ready||!context)return;
        const {booking,log}=context,epoch=generation,title=fields[0].value.trim(),staffId=fields[1].value,time=fields[2].value,note=fields[3].value.trim();
        if(!title||title.length>200||note.length>4000||!(services.state.liveStaffList||[]).some(staff=>staff.id===staffId)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){toast('Kiểm tra tên bước, nhân viên, giờ ghi nhận và nội dung.');return;}
        const originalTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'}).format(new Date(log.recorded_at));
        const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(log.recorded_at));
        const at=time===originalTime?log.recorded_at:new Date(day+'T'+time+':00+07:00').toISOString();
        busy=true;lock(true);
        let ids=[],persistAttempted=false;
        try{
            ids=await editor.prepare();if(!current(epoch))return;
            persistAttempted=true;
            await services.saveCareLog(booking,log,'save',{title,note,staff_id:staffId,recorded_at:at,...(ids.length?{media_asset_ids:ids}:{})});
            editor.saved();if(current(epoch)){toast('Đã lưu thay đổi nhật ký chăm sóc.','success');close();}
        }catch(error){
            // Lost responses on edits require checking both text and newly attached evidence.
            if(persistAttempted&&current(epoch)){
                try{
                    const {data,error:readError}=await db.from('care_log').select('id,appointment_id,action_name_snapshot,description,recorded_by,recorded_at').eq('id',log.id).eq('appointment_id',booking.dbId).single();
                    if(!readError&&data?.action_name_snapshot===title&&(data.description||'')===note&&data.recorded_by===staffId&&Date.parse(data.recorded_at)===Date.parse(at)&&await editor.committed(log.id,ids)){
                        editor.saved();if(current(epoch)){toast('Nhật ký đã được lưu. Tải lại hồ sơ để cập nhật danh sách.','success');close();}return;
                    }
                }catch{}
            }
            if(current(epoch))toast('Chưa xác nhận lưu thành công. Nội dung và ảnh nháp vẫn được giữ. '+(error.mediaMessage?error.message:''),'danger');
        }finally{busy=false;lock(!ready);}
    });
    remove.addEventListener('click',async()=>{
        if(busy||!ready||!context||context.hasMedia)return;
        if(!confirmDelete('Xóa vĩnh viễn nhật ký này? Thao tác không thể hoàn tác.'))return;
        const epoch=generation,{booking,log}=context;busy=true;lock(true);
        try{await services.saveCareLog(booking,log,'delete',{});if(current(epoch)){toast('Đã xóa nhật ký chăm sóc.','success');close();}}
        catch{if(current(epoch))toast('Không thể xóa nhật ký. Tải lại hồ sơ để kiểm tra trạng thái.','danger');}
        finally{busy=false;lock(!ready);}
    });
    return {open,close};
}
