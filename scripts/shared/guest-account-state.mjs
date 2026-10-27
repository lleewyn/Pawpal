// An in-memory generation; no identity, token or personal data is persisted.
let generation=0;
const listeners=new Set();
function changed(){generation++;for(const listener of listeners)listener(generation);}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
    document.addEventListener('auth_state_changed',changed);
    window.addEventListener('storage',event=>{if(event.key==='pawpal_current_user'||event.key===null)changed();});
}
export function guestAccountGeneration(){return generation;}
export function onGuestAccountChange(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
