import {loadMediaSource,mediaSource} from './media-source.mjs';
const drafts=new WeakMap(),images=new Map();
let account=null;
export function validatePetImage(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Ảnh phải là JPG, PNG hoặc WEBP.');
 if(!file.size||file.size>5*1024*1024)throw Error('Ảnh không được lớn hơn 5MB.');
}
async function token(db){const {data,error}=await db.auth.getSession();if(error||!data.session?.access_token)throw Error('Vui lòng đăng nhập lại để lưu ảnh.');return data.session.access_token;}
async function api(db,action,body,query=''){
 const multipart=body instanceof FormData;
 const response=await fetch('/api/media?action='+action+query,{method:'POST',headers:{Authorization:'Bearer '+await token(db),...(!multipart?{'Content-Type':'application/json'}:{})},body:multipart?body:JSON.stringify(body)});
 const result=await response.json();
 if(!response.ok||!result.ok){
  const messages={MEDIA_DISABLED:'Máy chủ đang tắt tải ảnh. Vui lòng liên hệ PawPal.',MEDIA_NOT_CONFIGURED:'Máy chủ chưa được cấu hình lưu ảnh. Vui lòng liên hệ PawPal.',MEDIA_UNAUTHORIZED:'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',MEDIA_MONGODB_UNAVAILABLE:'Kho ảnh tạm thời chưa kết nối được. Vui lòng thử lại.'};
  throw Error(messages[result.code]||(response.status===503?'Chưa kết nối được dịch vụ lưu ảnh. Vui lòng thử lại.':'Không thể lưu ảnh. Vui lòng kiểm tra ảnh và thử lại.'));
 }
 return result;
}
async function imageForUpload(file){
 validatePetImage(file);
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>20000000)throw Error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 20 triệu điểm ảnh.');
  if(file.size<=3145728&&Math.max(bitmap.width,bitmap.height)<=8192)return file;
  const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.92));
  if(!blob||blob.size>3145728)throw Error('Không thể xử lý ảnh. Vui lòng chọn ảnh nhỏ hơn.');
  return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:blob.type});
 }finally{bitmap.close();}
}
export async function uploadCustomerPetImage(db,file,petId,kind){
 const purpose=kind==='account'?'customer_avatar':kind==='avatar'?'customer_pet_avatar':'customer_pet_vaccine';
 let slots=drafts.get(file);if(!slots){slots=new Map();drafts.set(file,slots);}
 const key=(await token(db))+':'+petId+':'+purpose;
 let item=slots.get(key);if(!item){item={request:crypto.randomUUID()};slots.set(key,item);}
 if(item.asset)return item.asset;
 const prepared=await imageForUpload(file);
 if(!item.session){const session=await api(db,'prepare',{request_id:item.request,purpose,pet_id:petId,size_bytes:prepared.size,mime_type:prepared.type,name:prepared.name.slice(0,200)});item.session=session.session_id;}
 const form=new FormData();form.append('file',prepared);
 const result=await api(db,'upload',form,'&session='+encodeURIComponent(item.session));item.asset=result.asset_id;return item.asset;
}
export function clearPetImageCache(){for(const item of images.values())item.release();images.clear();account=null;}
if(typeof document!=='undefined')document.addEventListener('auth_state_changed',clearPetImageCache);
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key==='pawpal_current_user'||event.key===null)clearPetImageCache();});
export async function resolveCustomerPetImages(db,rows,userId){
 if(account!==userId){clearPetImageCache();account=userId;}
 const bearer=rows.some(row=>row.avatar_media_asset_id||row.vaccine_media_asset_id)?await token(db):null;
 await Promise.all(rows.map(async row=>{
  for(const [field,target]of [['avatar_media_asset_id','resolved_avatar_url'],['vaccine_media_asset_id','resolved_vaccine_url']]){
   const id=row[field];if(!id)continue;
   try{let image=images.get(id);if(!image){image=await loadMediaSource(mediaSource({media_asset_id:id}),bearer);if(account!==userId){image.release();continue;}images.set(id,image);}row[target]=image.url;}
   catch{row[target]='';}
  }
 }));
}
