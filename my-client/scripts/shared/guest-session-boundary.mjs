export const GUEST_RESET_PENDING='pawpal_guest_reset_pending_v1';
export const GUEST_IDENTITY_EPOCH='pawpal_guest_identity_epoch_v1';
const boundaryVersion='pawpal_guest_session_isolation_v1';
const journals=['pawpal_guest_pet_request_v1','pawpal_guest_booking_request_v1','pawpal_guest_order_request_v1','pawpal_guest_checkout_selection_v1'];

export function createGuestSessionBoundary({storage,tabStorage,fetcher,locks,publish=()=>{},timeoutMs=15000}){
 let resetting=null;
 function clearJournals(){for(const key of journals)tabStorage.removeItem(key);}
 function mark(){
  const epoch=globalThis.crypto.randomUUID();
  storage.setItem(GUEST_RESET_PENDING,epoch);storage.setItem(GUEST_IDENTITY_EPOCH,epoch);
  clearJournals();publish();return epoch;
 }
 function reset(markFirst=true){
  if(resetting)return resetting;
  const expected=markFirst?mark():storage.getItem(GUEST_RESET_PENDING);
  if(!expected)return Promise.resolve();
  clearJournals();
  const perform=async()=>{
   const controller=new AbortController();let timer;
   try{
    const operation=(async()=>{
     const response=await fetcher('/api/customer/guest/end',{method:'POST',credentials:'same-origin',cache:'no-store',keepalive:true,headers:{'Content-Type':'application/json'},body:'{}',signal:controller.signal});
     const data=await response.json();
     if(!response.ok||data?.success!==true)throw Error('Chưa dọn được phiên khách cũ. Vui lòng thử lại.');
    })();
    await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Chưa dọn được phiên khách cũ. Vui lòng kiểm tra kết nối và thử lại.'));},timeoutMs);})]);
    if(storage.getItem(GUEST_RESET_PENDING)===expected)storage.removeItem(GUEST_RESET_PENDING);
   }finally{clearTimeout(timer);}
  };
  const attempt=typeof locks?.request==='function'?locks.request('pawpal-guest-commerce-session-v1',perform):perform();
  resetting=attempt;
  attempt.finally(()=>{if(resetting===attempt)resetting=null;}).catch(()=>{});
  return attempt;
 }
 return {mark,reset,async ensure(){while(storage.getItem(GUEST_RESET_PENDING))await reset(false);}};
}

let boundary;
function browserBoundary(){
 return boundary ||= createGuestSessionBoundary({storage:window.localStorage,tabStorage:window.sessionStorage,
  fetcher:(...args)=>window.fetch(...args),locks:window.navigator.locks,
  publish:()=>document.dispatchEvent(new CustomEvent('guest_session_reset'))});
}
export function resetGuestSession(){return browserBoundary().reset();}
export function ensureGuestSessionBoundary(){return typeof window==='undefined'?Promise.resolve():browserBoundary().ensure();}
export function installGuestSessionBoundary(){
 // Cookies issued before account-boundary cleanup existed have no reliable owner continuity.
 // Rotate those browser sessions once; persisted customer/booking/order records are untouched.
 try{if(localStorage.getItem(boundaryVersion)!=='1'){browserBoundary().mark();localStorage.setItem(boundaryVersion,'1');}}catch{}
 const observe=()=>{
  try{const user=JSON.parse(localStorage.getItem('pawpal_current_user')||'null');if(user?.id&&!user.is_temporary&&!localStorage.getItem(GUEST_RESET_PENDING))browserBoundary().mark();}catch{/* Guest requests fail closed if pending state cannot be read. */}
 };
 observe();document.addEventListener('auth_state_changed',observe);
 window.addEventListener('storage',event=>{if(event.key==='pawpal_current_user'||event.key===null)observe();});
}
