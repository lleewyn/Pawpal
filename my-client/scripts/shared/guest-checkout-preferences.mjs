import {normalizeGuestLines} from './guest-cart.mjs';
export const GUEST_CHECKOUT_PREFERENCES='pawpal_guest_checkout_preferences_v1';
function snapshot({mode,lines}){
    if(!['cart','buynow'].includes(mode))throw Error('Hình thức đặt hàng không hợp lệ.');
    return {mode,lines:normalizeGuestLines(lines).sort((a,b)=>a.variant_id.localeCompare(b.variant_id))};
}
export function readGuestCheckoutPreferences(storage,scope){
    try{
        const value=JSON.parse(storage.getItem(GUEST_CHECKOUT_PREFERENCES)||'null');
        if(!value||value.version!==1||typeof value.voucherCode!=='string'||value.voucherCode.length>100)return null;
        if(JSON.stringify(snapshot(value))!==JSON.stringify(snapshot(scope)))return null;
        return {voucherCode:value.voucherCode};
    }catch{return null;}
}
export function writeGuestCheckoutPreferences(storage,scope,voucherCode){
    if(typeof voucherCode!=='string'||voucherCode.trim().length>100)throw Error('Mã giảm giá không hợp lệ.');
    const value={version:1,...snapshot(scope),voucherCode:voucherCode.trim()};
    try{storage.setItem(GUEST_CHECKOUT_PREFERENCES,JSON.stringify(value));}
    catch{throw Error('Chưa lưu được mã giảm giá. Vui lòng thử lại.');}
}
export function clearGuestCheckoutPreferences(storage,scope){
    if(readGuestCheckoutPreferences(storage,scope))storage.removeItem(GUEST_CHECKOUT_PREFERENCES);
}
