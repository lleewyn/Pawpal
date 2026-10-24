/* Presentation/accessibility wrapper around existing sales modals. No submit or persistence logic. */
(()=>{
 if(window.__ordersModalV8)return;window.__ordersModalV8=true;
 const entries=new Map();let scheduled=false;
 const visible=modal=>modal.isConnected&&getComputedStyle(modal).display!=='none'&&modal.getClientRects().length>0;
 const focusable=modal=>[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(e=>e.getClientRects().length&&!e.closest('[inert]'));
 const busy=modal=>modal.dataset.saving==='true';
 const close=modal=>{if(busy(modal))return;const button=modal.querySelector('[data-close-modal]');if(button)button.click();else modal.style.display='none';};
 const sync=()=>{
  scheduled=false;
  document.querySelectorAll('.orders-module .admin-modal-overlay').forEach(modal=>{
   if(visible(modal)&&!entries.has(modal)){
    entries.set(modal,document.activeElement);
    const card=modal.querySelector('.admin-modal-card');if(!card)return;card.tabIndex=-1;card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
    const title=modal.querySelector('.admin-modal-title,.modal-title-clean');if(title){title.id||=modal.id+'Title';card.setAttribute('aria-labelledby',title.id);}
    modal.querySelectorAll('.form-group,.form-group-item').forEach(group=>{const label=group.querySelector('label'),input=group.querySelector('input:not([type=hidden]),select,textarea');if(label&&input?.id&&!label.htmlFor)label.htmlFor=input.id;});
    (focusable(modal).find(e=>e.matches('input:not([readonly]),select,textarea'))||focusable(modal)[0])?.focus();
   }
  });
  for(const [modal,previous]of entries)if(!visible(modal)){entries.delete(modal);if(previous?.isConnected)previous.focus();}
 };
 new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(sync);}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
 document.addEventListener('keydown',event=>{
  const modal=[...entries.keys()].filter(visible).at(-1);if(!modal)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();const popovers=modal.id==='modalCreateOrder'?[...modal.querySelectorAll('.customer-autocomplete-popover')].filter(e=>getComputedStyle(e).display!=='none'&&e.getClientRects().length):[];if(popovers.length){popovers.forEach(e=>e.style.display='none');return;}close(modal);}
  if(event.key==='Tab'){const items=focusable(modal),first=items[0],last=items.at(-1);if(!items.length){event.preventDefault();modal.querySelector('.admin-modal-card')?.focus();return;}if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
 },true);
 document.addEventListener('click',event=>{
  const modal=event.target.closest('.orders-module .admin-modal-overlay');if(!modal)return;
  const closing=event.target===modal||event.target.closest('[data-close-modal]');
  if(closing&&busy(modal)){event.preventDefault();event.stopImmediatePropagation();return;}
  if(event.target===modal)close(modal);
 },true);
})();
