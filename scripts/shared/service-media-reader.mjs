import {mediaSource,loadMediaSource} from './media-source.mjs';

// Admin thumbnails also cover hidden services, whose assets require a bearer token.
export function createServiceMediaReader({db,fetchImpl=fetch}) {
    let actor=null;const entries=new Map();
    function clear(){for(const entry of entries.values())entry.then(item=>item.release()).catch(()=>{});entries.clear();}
    return {
        async hydrate(services){
            const {data,error}=await db.auth.getSession();
            if(error||!data.session){clear();actor=null;return;}
            if(actor!==data.session.user.id){clear();actor=data.session.user.id;}
            const pending=services.flatMap(service=>service.images||[]).filter(image=>image.media_asset_id);
            let next=0;
            await Promise.all(Array.from({length:Math.min(3,pending.length)},async()=>{
                while(next<pending.length){
                    const image=pending[next++],id=image.media_asset_id;
                    if(!entries.has(id))entries.set(id,loadMediaSource(mediaSource({media_asset_id:id}),data.session.access_token,{fetchImpl}).catch(error=>{entries.delete(id);throw error;}));
                    try{image.resolved_url=(await entries.get(id)).url;}catch{image.resolved_url='';}
                }
            }));
            while(entries.size>100){const [id,entry]=entries.entries().next().value;entries.delete(id);entry.then(item=>item.release()).catch(()=>{});}
        },clear
    };
}
