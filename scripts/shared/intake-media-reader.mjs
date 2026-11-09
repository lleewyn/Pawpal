import {createServiceMediaReader} from './service-media-reader.mjs';

export function createIntakeMediaReader({db,fetchImpl=fetch,recordType='intake'}) {
    if(!['intake','handover'].includes(recordType))throw Error('invalid_record_type');
    const listRpc=recordType==='handover'?'list_handover_media':'list_intake_media';
    const reader=createServiceMediaReader({db,fetchImpl});
    return {
        async hydrate(appointments){
            const selected=appointments.filter(row=>row.records?.some(record=>record.record_type===recordType));
            let next=0;
            await Promise.all(Array.from({length:Math.min(3,selected.length)},async()=>{
                while(next<selected.length){
                    const row=selected[next++];
                    const {data,error}=await db.rpc(listRpc,{p_appointment:row.id});
                    if(error||!Array.isArray(data))throw Error('Không tải đủ ảnh biên bản.');
                    row.intakeMedia=data;
                }
            }));
            await reader.hydrate(selected.map(row=>({images:row.intakeMedia})));
            for(const row of selected){
                const urls=row.intakeMedia.map(image=>image.resolved_url).filter(Boolean);
                for(const record of row.records)if(record.record_type===recordType)record.proofPhotos=urls;
            }
        },clear:()=>reader.clear()
    };
}
