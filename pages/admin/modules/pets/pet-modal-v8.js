/* Accessibility wrapper for existing pet modals; does not handle submit or persistence. */
(()=>{
 if(window.__petModalV8)return;window.__petModalV8=true;
 const entries=new Map();let scheduled=false;
 const visible=modal=>modal.isConnected&&getComputedStyle(modal).display!=='none'&&modal.getClientRects().length>0;
 const focusable=modal=>[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(e=>e.getClientRects().length);
 const busy=modal=>modal.dataset.saving==='true';
 const close=modal=>{if(busy(modal))return;const button=modal.querySelector('[data-close-modal]');if(button)button.click();else modal.style.display='none';};
 const sync=()=>{
  scheduled=false;
  document.querySelectorAll('.pets-module .admin-modal-backdrop').forEach(modal=>{
   if(visible(modal)&&!entries.has(modal)){
    entries.set(modal,document.activeElement);
    if(modal.id==='modalPreviewAppDiary'){
        const body=document.getElementById('petDiaryPreviewContent'),pet=window.PawpalPets?.state?.petsData?.[sessionStorage.getItem('pawpal_admin_pet_id')];
        if(body){body.replaceChildren();const title=document.createElement('strong');title.textContent=pet?.name||'Ch\u01b0a ch\u1ecdn b\u00e9 c\u01b0ng';body.append(title);
        const logs=pet?.carelogs||[];
        if(!logs.length){const empty=document.createElement('p');empty.textContent='Ch\u01b0a c\u00f3 nh\u1eadt k\u00fd \u0111\u01b0\u1ee3c t\u1ea3i cho b\u00e9.';body.append(empty);}
        logs.forEach(log=>{const row=document.createElement('p');row.textContent=[log.time,log.ktv,log.service,log.checkText].filter(Boolean).join(' ? ');body.append(row);});}
    }

    const card=modal.querySelector('.admin-modal-card');if(!card)return;card.tabIndex=-1;card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
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
  if(event.key==='Tab'){const items=focusable(modal),first=items[0],last=items.at(-1);if(!items.length){event.preventDefault();modal.querySelector('.admin-modal-card')?.focus();return;}if(event.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){event.preventDefault();first.focus();}}
 },true);
 document.addEventListener('click',event=>{
  const modal=event.target.closest('.pets-module .admin-modal-backdrop');if(!modal)return;
  const closing=event.target===modal||event.target.closest('[data-close-modal]');
  if(closing&&busy(modal)){event.preventDefault();event.stopImmediatePropagation();return;}
  if(event.target===modal)close(modal);
 },true);
})();
