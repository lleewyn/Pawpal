import {guestAccountGeneration} from './guest-account-state.mjs';
export const GUEST_CART_KEY = 'pawpal_guest_cart_v1';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isGuestShopper() {
    const user = typeof window.getCurrentUser === 'function' ? window.getCurrentUser()
        : JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    return !user?.id || user.is_temporary === true;
}
export function normalizeGuestLines(lines) {
    if (!Array.isArray(lines) || lines.length > 100) throw Error('Giỏ hàng không hợp lệ. Dữ liệu đã lưu được giữ nguyên.');
    const grouped = new Map();
    for (const line of lines) {
        if (typeof line?.variant_id !== 'string' || !uuid.test(line.variant_id) || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 1000000) throw Error('Phân loại hoặc số lượng trong giỏ hàng không hợp lệ.');
        const id = line.variant_id.toLowerCase(),quantity=(grouped.get(id)||0)+line.quantity;
        if (quantity > 1000000) throw Error('Số lượng sản phẩm vượt giới hạn.');
        grouped.set(id,quantity);
    }
    return [...grouped].map(([variant_id,quantity])=>({variant_id,quantity}));
}
export function createGuestCart({storage,locks,mayUse=()=>true,publish=()=>{},generation=guestAccountGeneration}) {
    const guard=()=>{if(!mayUse())throw Error('Tài khoản đã thay đổi. Vui lòng tải lại giỏ hàng.');};
    function read(){guard();const raw=storage.getItem(GUEST_CART_KEY);return raw===null?[]:normalizeGuestLines(JSON.parse(raw));}
    async function mutate(change){
        guard();const expectedGeneration=generation();if(!locks?.request)throw Error('Trình duyệt chưa hỗ trợ lưu giỏ hàng an toàn.');
        return locks.request('pawpal-guest-cart-write-v1',()=>{
            guard();if(expectedGeneration!==generation())throw Error('Tài khoản đã thay đổi trong lúc chờ. Vui lòng kiểm tra lại giỏ hàng.');
            const lines=normalizeGuestLines(change(read())),raw=JSON.stringify(lines);
            storage.setItem(GUEST_CART_KEY,raw);
            if(storage.getItem(GUEST_CART_KEY)!==raw)throw Error('Chưa lưu được giỏ hàng. Vui lòng thử lại.');
            publish(lines);return lines;
        });
    }
    return {read,add:(id,quantity)=>mutate(lines=>[...lines,{variant_id:id,quantity}]),
        switchVariant:(from,to,stock)=>{
            if(typeof from!=='string'||typeof to!=='string'||!uuid.test(from)||!uuid.test(to)||!Number.isSafeInteger(stock)||stock<0)return Promise.reject(Error('Phân loại hoặc tồn kho không hợp lệ.'));
            from=from.toLowerCase();to=to.toLowerCase();
            return mutate(lines=>{
                const source=lines.find(line=>line.variant_id===from);if(!source)throw Error('Giỏ hàng đã thay đổi. Vui lòng chọn lại phân loại.');
                if(from===to)return lines;
                const quantity=source.quantity+(lines.find(line=>line.variant_id===to)?.quantity||0);
                if(quantity>stock||quantity>1000000)throw Error('Phân loại đã chọn không đủ tồn kho cho tổng số lượng trong giỏ.');
                return lines.filter(line=>line.variant_id!==from&&line.variant_id!==to).concat({variant_id:to,quantity});
            });
        },
        set:(id,quantity)=>mutate(lines=>quantity===0?lines.filter(l=>l.variant_id!==id):lines.map(l=>l.variant_id===id?{...l,quantity}:l)),
        clear:()=>mutate(()=>[]),replace:lines=>mutate(()=>lines),
        consume:purchased=>mutate(lines=>{const bought=normalizeGuestLines(purchased);return lines.map(line=>({...line,quantity:Math.max(0,line.quantity-(bought.find(p=>p.variant_id===line.variant_id)?.quantity||0))})).filter(line=>line.quantity>0);})};
}
let store;
export function guestCart(){
    return store ||= createGuestCart({storage:localStorage,locks:navigator.locks,mayUse:isGuestShopper,
        publish:lines=>document.dispatchEvent(new CustomEvent('guest_cart_updated',{detail:{lines}}))});
}
export function hydrateGuestCart(lines,products){
    const byVariant=new Map();
    for(const product of products)for(const variant of product.variants||[])byVariant.set(variant.id.toLowerCase(),{product,variant});
    return normalizeGuestLines(lines).map(line=>({...line,...(byVariant.get(line.variant_id)||{}),available:byVariant.has(line.variant_id)}));
}
