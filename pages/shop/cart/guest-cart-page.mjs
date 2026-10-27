import {guestCart,isGuestShopper,hydrateGuestCart,GUEST_CART_KEY} from '/scripts/shared/guest-cart.mjs';
import {showCartNotice} from '/scripts/shared/cart-access.mjs';
export const SELECTION_KEY='pawpal_guest_checkout_selection_v1';
const money=value=>Number(value).toLocaleString('vi-VN')+' đ';
function element(tag,className,text){const node=document.createElement(tag);node.className=className||'';if(text!=null)node.textContent=text;return node;}
export async function initGuestCartPage(){
 const root=document.getElementById('cart-items-list');if(!root||root.dataset.guestReady)return;
 root.dataset.guestReady='true';root.dataset.cartOwner='guest';
 const abort=new AbortController(),options={signal:abort.signal},selected=new Set();let products=[],rows=[],busy=false;
 const active=()=>root.isConnected&&isGuestShopper();
 const content=document.getElementById('cart-content-row'),empty=document.getElementById('cart-empty-state'),checkout=document.getElementById('btn-proceed-checkout');
 const on=(node,name,fn)=>node?.addEventListener(name,fn,options);
 function error(message){showCartNotice(message||'Chưa cập nhật được giỏ hàng. Dữ liệu đã lưu được giữ nguyên.');}
 function render(){
  if(!active()){abort.abort();return;}
  const lines=guestCart().read(),previous=new Set(rows.map(r=>r.variant_id));
  rows=hydrateGuestCart(lines,products);for(const row of rows)if(!previous.has(row.variant_id)&&row.available)selected.add(row.variant_id);
  root.replaceChildren();document.getElementById('cart-loading-skeleton')?.classList.add('d-none');
  content.classList.toggle('d-none',!rows.length);empty.classList.toggle('d-none',!!rows.length);
  let total=0,count=0;
  for(const row of rows){
   const item=element('div','cart-item-row');item.dataset.variantId=row.variant_id;
   const wrapper=element('div','cart-item-checkbox-wrapper'),check=element('input','form-check-input item-checkbox');check.type='checkbox';check.checked=selected.has(row.variant_id);check.disabled=!row.available;check.setAttribute('aria-label','Chọn '+(row.product?.name||'sản phẩm'));wrapper.append(check);item.append(wrapper);
   const image=element('img','cart-item-img');image.alt=row.product?.name||'Sản phẩm';image.src=row.variant?.images?.[0]||row.product?.image||'/assets/images/shop/products/placeholder.webp';item.append(image);
   const info=element('div','cart-item-details'),name=element('a','cart-item-name',row.product?.name||'Sản phẩm không còn được bán');
   if(row.product)name.href='/pages/shop/product-detail/product-detail.html?id='+encodeURIComponent(row.product.id);
   info.append(name,element('div','cart-item-meta',row.variant?.name||'Bạn có thể xóa sản phẩm này khỏi giỏ.'));
   if(row.available&&row.quantity>row.variant.stock)info.append(element('p','text-danger','Chỉ còn '+row.variant.stock+' sản phẩm. Vui lòng giảm số lượng.'));
   item.append(info,element('div','cart-item-price-unit',row.available?money(row.variant.price):'—'));
   const quantity=element('div','cart-item-qty-actions');
   for(const [label,delta] of [['−',-1],['+',1]]){
    const button=element('button','cart-item-qty-btn',label);button.type='button';button.disabled=!row.available||(delta<0&&row.quantity<=1)||(delta>0&&row.quantity>=row.variant.stock);
    button.setAttribute('aria-label',delta<0?'Giảm số lượng':'Tăng số lượng');
    on(button,'click',()=>change(()=>guestCart().set(row.variant_id,row.quantity+delta)));quantity.append(button);
    if(delta<0)quantity.append(element('span','cart-item-qty-value',row.quantity));
   }
   const remove=element('button','btn-remove-cart-item','Xóa');remove.type='button';on(remove,'click',()=>change(()=>guestCart().set(row.variant_id,0)));
   item.append(quantity,element('div','cart-item-total-price',row.available?money(row.variant.price*row.quantity):'—'),remove);root.append(item);
   on(check,'change',()=>{if(check.checked)selected.add(row.variant_id);else selected.delete(row.variant_id);render();});
   if(check.checked&&row.available){total+=row.variant.price*row.quantity;count++;}
  }
  document.getElementById('cart-count-header').textContent=rows.reduce((sum,row)=>sum+row.quantity,0);
  document.getElementById('cart-select-count').textContent=count;
  document.getElementById('cart-subtotal').textContent=money(total);document.getElementById('cart-grand-total').textContent=money(total);
  document.getElementById('select-all-items').checked=!!rows.length&&rows.every(r=>r.available&&selected.has(r.variant_id));
  checkout.setAttribute('aria-disabled',String(!count||busy));
  window.updateCartBadge?.();
 }
 async function change(operation){if(busy||!active())return;busy=true;try{await operation();if(active())render();}catch(e){error(e.message);}finally{busy=false;}}
 try{
  const summary=document.getElementById('cart-grand-total').closest('.grand-total');if(summary?.firstElementChild)summary.firstElementChild.textContent='Tạm tính';
  const shipping=summary?.previousElementSibling?.lastElementChild;if(shipping)shipping.textContent='Tính khi thanh toán';
  document.querySelector('.voucher-card-sidebar')?.classList.add('d-none');
  products=await window.DataLoader.loadProducts();if(!active())return;render();
  on(document.getElementById('btn-clear-cart'),'click',()=>change(()=>guestCart().clear()));
  on(document.getElementById('select-all-items'),'change',event=>{for(const row of rows)if(event.target.checked&&row.available)selected.add(row.variant_id);else selected.delete(row.variant_id);render();});
  on(checkout,'click',event=>{
   event.preventDefault();if(busy||!active())return;
   try{
    const chosen=rows.filter(r=>r.available&&selected.has(r.variant_id));if(!chosen.length)throw Error('Vui lòng chọn sản phẩm để thanh toán.');
    if(chosen.some(r=>r.quantity>r.variant.stock))throw Error('Vui lòng điều chỉnh số lượng theo tồn kho hiện tại.');
    sessionStorage.setItem(SELECTION_KEY,JSON.stringify(chosen.map(r=>({variant_id:r.variant_id,quantity:r.quantity}))));
    window.location.assign('/checkout');
   }catch(e){error(e.message);}
  });
  on(document,'guest_cart_updated',()=>{if(active())render();});
  on(window,'storage',event=>{if(event.key===GUEST_CART_KEY&&active())try{render();}catch(e){error(e.message);}if(event.key==='pawpal_current_user'||event.key===null){abort.abort();if(root.isConnected)window.location.reload();}});
  on(document,'auth_state_changed',()=>{abort.abort();if(root.isConnected)window.location.reload();});
 }catch(e){
  document.getElementById('cart-loading-skeleton')?.classList.add('d-none');content.classList.remove('d-none');root.replaceChildren(element('p','text-danger',e.message||'Không thể tải giỏ hàng.'));
  const retry=element('button','btn btn-secondary','Thử lại');retry.type='button';on(retry,'click',()=>window.location.reload());root.append(retry);
 }
}
