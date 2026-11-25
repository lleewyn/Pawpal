import {uploadCustomerPetImage} from './customer-pet-media.mjs';
import {loadMediaSource,mediaSource} from './media-source.mjs';
let generation=0,currentImage=null,account=null;
export async function refreshCustomerAvatar(){
 const turn=++generation,db=window.getSupabaseClient?.()||window.SupabaseClient;
 const session=(await db?.auth?.getSession())?.data?.session;
 if(turn!==generation)return;
 currentImage?.release();currentImage=null;account=session?.user?.id||null;
 document.querySelectorAll('img[data-account-avatar]').forEach(e=>e.remove());
 if(!session)return;
 const {data,error}=await db.rpc('own_customer_avatar');if(error||turn!==generation)return;
 document.dispatchEvent(new CustomEvent('pawpal:avatar-state',{detail:data}));
 if(!data?.asset_id)return;
 const loaded=await loadMediaSource(mediaSource({media_asset_id:data.asset_id}),session.access_token);
 if(turn!==generation){loaded.release();return;}currentImage=loaded;
 for(const root of document.querySelectorAll('.user-avatar,.user-avatar-large,#accountAvatarPreview')){
  const img=document.createElement('img');img.dataset.accountAvatar='';img.alt='Ảnh đại diện tài khoản';img.src=loaded.url;
  img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%';
  root.style.position='relative';root.style.overflow='hidden';root.append(img);
 }
}
export function mountCustomerAvatarEditor(root){
 const db=window.getSupabaseClient?.()||window.SupabaseClient;let state=null,busy=false,closed=false;
 const input=root.querySelector('input'),error=root.querySelector('[role=status]'),remove=root.querySelector('[data-remove-avatar]');
 const onState=e=>{if(!closed){state=e.detail;remove.disabled=!state?.asset_id;}};document.addEventListener('pawpal:avatar-state',onState);
 const clearState=()=>{state=null;remove.disabled=true;};document.addEventListener('auth_state_changed',clearState);
 const save=async(file)=>{
  if(busy||!state)return;busy=true;input.disabled=remove.disabled=true;error.textContent='Đang lưu ảnh…';
  const owner=account,expected=state.asset_id;
  try{
   const asset=file?await uploadCustomerPetImage(db,file,state.customer_id,'account'):null;
   if(closed||account!==owner)throw Error('Phiên tài khoản đã thay đổi.');
   const {data,error:failure}=await db.rpc('save_own_customer_avatar',{p_asset:asset,p_expected:expected});
   if(failure)throw Error(failure.code==='PT409'?'Ảnh đã thay đổi. Vui lòng tải lại hồ sơ.':'Không lưu được ảnh. Vui lòng thử lại.');
   if(closed||account!==owner)return;if(data!==state.customer_id)throw Error('Chưa xác nhận được kết quả lưu.');
   await refreshCustomerAvatar();error.textContent=file?'Đã lưu ảnh đại diện.':'Đã xóa ảnh đại diện.';
  }catch(e){if(!closed)error.textContent=e.message||'Không thể lưu ảnh.';}
  finally{busy=false;if(!closed){input.disabled=false;remove.disabled=!state?.asset_id;input.value='';}}
 };
 input.onchange=()=>{if(input.files[0])void save(input.files[0]);};remove.onclick=()=>void save(null);
 void refreshCustomerAvatar().catch(()=>{error.textContent='Không tải được ảnh đại diện. Vui lòng tải lại trang.';});
 return ()=>{closed=true;document.removeEventListener('pawpal:avatar-state',onState);document.removeEventListener('auth_state_changed',clearState);};
}
if(typeof document!=='undefined')document.addEventListener('auth_state_changed',()=>{++generation;account=null;currentImage?.release();currentImage=null;document.querySelectorAll('img[data-account-avatar]').forEach(e=>e.remove());void refreshCustomerAvatar().catch(()=>{});});
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key==='pawpal_current_user'||event.key===null)document.dispatchEvent(new CustomEvent('auth_state_changed'));});
