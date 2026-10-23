/* Shared interaction contract for the customer modals explicitly migrated to V7. */
(()=>{
 if(window.__customerModalV7)return;window.__customerModalV7=true;
 const entries=new Map();let scheduled=false;
 const visible=modal=>modal.isConnected&&getComputedStyle(modal).display!=='none';
 const focusable=modal=>[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(e=>e.getClientRects().length);
 const busy=modal=>[...modal.querySelectorAll('.admin-btn-primary')].some(button=>button.disabled);
 const close=modal=>{if(busy(modal))return;const button=modal.querySelector('[data-close-modal]');if(button)button.click();else modal.style.display='none';};
 const sync=()=>{
  scheduled=false;
  document.querySelectorAll('.customer-modal-v7').forEach(modal=>{
   if(visible(modal)&&!entries.has(modal)){
    entries.set(modal,document.activeElement);
    const card=modal.querySelector('.admin-modal-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
    const title=modal.querySelector('.admin-modal-title');if(title){title.id||=modal.id+'Title';card.setAttribute('aria-labelledby',title.id);}
    modal.querySelectorAll('.form-group').forEach(group=>{const label=group.querySelector('label'),input=group.querySelector('input:not([type=hidden]),select,textarea');if(label&&input?.id)label.htmlFor=input.id;});
    (focusable(modal).find(e=>e.matches('input:not([readonly]),select,textarea'))||focusable(modal)[0])?.focus();
   }
  });
  for(const [modal,previous]of entries)if(!visible(modal)){entries.delete(modal);if(previous?.isConnected)previous.focus();}
 };
 new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(sync);}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
 document.addEventListener('keydown',event=>{
  const modal=[...entries.keys()].filter(visible).at(-1);if(!modal)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(modal);}
  if(event.key==='Tab'){const items=focusable(modal),first=items[0],last=items.at(-1);if(!items.length)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
 },true);
 document.addEventListener('click',event=>{
  const modal=event.target.closest('.customer-modal-v7');if(!modal)return;
  const closing=event.target===modal||event.target.closest('[data-close-modal]');
  if(closing&&busy(modal)){event.preventDefault();event.stopImmediatePropagation();return;}
  if(event.target===modal)close(modal);
 },true);
})();
