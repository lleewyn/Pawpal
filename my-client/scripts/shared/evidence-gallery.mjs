import {mediaSource,loadMediaSource} from './media-source.mjs';

export function createEvidenceGallery({root,db,fetchImpl=fetch}){
 let generation=0,releases=[];
 const clear=()=>{generation++;releases.forEach(fn=>fn());releases=[];root.replaceChildren();};
 return {clear,async render(rows){
  clear();const current=generation;
  const {data,error}=await db.auth.getSession();
  if(current!==generation)return;
  if(error||!data.session){root.textContent='Vui lòng đăng nhập để xem ảnh.';return;}
  if(!rows.length){root.textContent='Chưa có ảnh bằng chứng.';return;}
  root.style.cssText='display:flex;gap:12px;flex-wrap:wrap';
  let next=0;
  const slots=rows.map(row=>{
   const link=document.createElement('a'),image=document.createElement('img');
   link.target='_blank';link.rel='noopener noreferrer';image.alt=row.file_name||'Ảnh bằng chứng';image.style.cssText='width:90px;height:90px;object-fit:cover;border-radius:9px';
   link.append(image);root.append(link);return {row,link,image};
  });
  await Promise.all(Array.from({length:Math.min(3,slots.length)},async()=>{
   while(next<slots.length&&current===generation){
    const {row,link,image}=slots[next++];
    try{
     const loaded=await loadMediaSource(mediaSource({media_asset_id:row.media_asset_id,url:row.media_url}),data.session.access_token,{fetchImpl});
     if(current!==generation){loaded.release();return;}
     releases.push(loaded.release);image.src=loaded.url;link.href=loaded.url;
    }catch{image.remove();link.textContent='Không tải được ảnh bằng chứng';link.removeAttribute('href');}
   }
  }));
 }};
}
