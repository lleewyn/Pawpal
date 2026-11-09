import {createServiceMediaReader} from './service-media-reader.mjs';
export function createAdjustmentMediaReader({db,fetchImpl=fetch}){
    const reader=createServiceMediaReader({db,fetchImpl});
    return {async hydrate(appointments){
        const selected=appointments.filter(row=>row.adjustments?.some(a=>a.adjustment_type==='surcharge'));let next=0;
        await Promise.all(Array.from({length:Math.min(3,selected.length)},async()=>{while(next<selected.length){const row=selected[next++];const {data,error}=await db.rpc('list_adjustment_media',{p_appointment:row.id});if(error||!Array.isArray(data))throw Error('Không tải đủ ảnh phụ phí.');row.adjustmentMedia=data;}}));
        await reader.hydrate(selected.map(row=>({images:row.adjustmentMedia})));
        for(const row of selected)for(const adjustment of row.adjustments)adjustment.proofPhotos=row.adjustmentMedia.filter(image=>image.adjustment_id===adjustment.id).map(image=>image.resolved_url).filter(Boolean);
    },clear:()=>reader.clear()};
}
