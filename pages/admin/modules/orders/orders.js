// Role-specific operations live in this domain; management initialization requires verified ADMIN.
(function () {
    'use strict';
    const allowed = () => window.PawpalAdminAccess?.isStaff() && PawpalAdminAccess.state.user.permissions.includes('work.sales.create');
    const el = (tag, text, cls) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node; };
    const money = value => new Intl.NumberFormat('vi-VN').format(Number(value)) + ' đ';
    async function rpc(name, args) { const {data,error} = await getSupabaseClient().rpc(name,args); if (error) throw error; return data; }
    let dialog;
    function build() {
        if (dialog) return dialog;
        const overlay = el('div',null,'admin-modal-overlay staff-workspace-modal'); overlay.id = 'staffSalesModal'; overlay.setAttribute('aria-hidden','true');
        const card = el('div',null,'admin-modal-card workspace-pet-card'); card.setAttribute('role','dialog'); card.setAttribute('aria-modal','true'); card.setAttribute('aria-labelledby','staffSalesTitle');
        const form = el('form'); form.setAttribute('onsubmit','return false;');
        const header = el('div',null,'workspace-modal-header'), title = el('h2','Tạo đơn tại quầy'), close = el('button','Đóng','btn-modal-close'); title.id = 'staffSalesTitle'; close.type = 'button'; close.dataset.closeModal = overlay.id; header.append(title,close);
        const grid = el('div',null,'workspace-pet-grid'), fields = {}, groups = {};
        function field(key,label,type='text',required=false,wide=false) {
            const group = el('div',null,'workspace-form-field'+(wide?' workspace-field-wide':'')), caption = el('label',label+(required?' ':'')), input = el(type==='select'?'select':type==='textarea'?'textarea':'input',null,'admin-input');
            input.id = 'staffSales'+key; caption.htmlFor = input.id; if(required)caption.append(el('span','*','workspace-required')); input.required = required;
            if(input.tagName==='INPUT')input.type=type; if(type==='text')input.maxLength=120; if(type==='textarea'){input.rows=2;input.maxLength=2000;}
            group.append(caption,input);grid.append(group);fields[key]=input;groups[key]=group;return input;
        }
        field('customer','Khách hàng','text',true);field('phone','Số điện thoại').readOnly=true;
        field('product','Tìm sản phẩm hoặc mã SKU','text',false,true);
        const lines = el('div',null,'workspace-sales-lines workspace-field-wide'); lines.id='staffSalesLines';grid.append(lines);
        field('mode','Ưu đãi','select'); for(const[value,text]of [['none','Không áp dụng'],['tier','Theo hạng thành viên'],['voucher','Mã ưu đãi'],['points','Quy đổi điểm']]){const option=el('option',text);option.value=value;fields.mode.append(option);}
        field('voucher','Mã ưu đãi'); const points=field('points','Số điểm quy đổi','number');points.min=0;points.max=100000000;points.step=1;
        field('note','Ghi chú','textarea',false,true);
        const total = el('p','','workspace-booking-quote'), message = el('p','','workspace-error'), hint = el('p','Tạo đơn giữ hàng tại quầy. Thu tiền thực hiện sau khi tạo đơn.','workspace-checkout-explanation'); total.id='staffSalesQuote';total.setAttribute('role','status');message.setAttribute('role','alert');
        const footer=el('div',null,'workspace-modal-footer'),cancel=el('button','Hủy','admin-btn admin-btn-secondary'),save=el('button','Tạo đơn','admin-btn admin-btn-primary');save.id='staffSalesSave';cancel.type=save.type='button';cancel.dataset.closeModal=overlay.id;footer.append(cancel,save);
        form.append(header,grid,total,hint,message,footer);card.append(form);overlay.append(card);document.body.append(overlay);
        const state={customer:null,cart:[],quote:null,quoteSignature:'',generation:0,quoteTurn:0,saving:false,pending:null,onSaved:null,returnFocus:null};
        const pickers=[];
        function request(){return {p_customer_id:state.customer?.id,p_details:{delivery:false,discount_mode:fields.mode.value,voucher_code:fields.voucher.value.trim(),points:Number(fields.points.value||0),note:fields.note.value.trim()},p_lines:state.cart.map(item=>({variant_id:item.id,quantity:Number(item.quantity)}))};}
        const signature=()=>JSON.stringify(request());
        function valid(){return state.customer&&state.cart.length>0&&state.cart.every(item=>Number.isInteger(Number(item.quantity))&&Number(item.quantity)>=1&&Number(item.quantity)<=1000000)&&(!fields.points.value||Number.isInteger(Number(fields.points.value))&&Number(fields.points.value)>=0&&Number(fields.points.value)<=100000000);}
        let quoteTimer;
        function resetQuote(){state.quote=null;state.quoteSignature='';state.quoteTurn++;clearTimeout(quoteTimer);total.textContent='';save.disabled=true;}
        const errorText=error=>({sales_available_stock_insufficient:'Số lượng vượt tồn còn có thể bán sau khi giữ hàng.',sales_variant_not_sellable:'Sản phẩm đã ngừng bán hoặc giá cần được kiểm tra.',sales_quote_changed:'Giá, ưu đãi hoặc tồn đã thay đổi. Tính lại đơn và kiểm tra trước khi tạo.',sales_voucher_not_applicable:'Mã ưu đãi không áp dụng cho đơn này.',sales_voucher_exhausted:'Mã ưu đãi đã hết lượt sử dụng.',sales_owned_voucher_required:'Khách chưa có mã ưu đãi khả dụng.',sales_points_insufficient:'Khách không đủ điểm để quy đổi.',sales_points_exceed_total:'Số điểm quy đổi vượt giá trị hàng hóa.',invalid_sales_checkout:'Chọn khách đang hoạt động và kiểm tra đơn.',sales_request_conflict:'Yêu cầu đã được ghi với nội dung khác. Tải lại để đối chiếu.'}[error.message]||(error.code==='42501'?'Bạn không có quyền tạo đơn. Tải lại để kiểm tra.':'Chưa xác nhận tạo đơn thành công. Giữ nguyên nội dung và thử lại.'));
        function update(){
            if(state.saving)return;resetQuote();message.textContent='';groups.voucher.hidden=fields.mode.value!=='voucher';groups.points.hidden=fields.mode.value!=='points';
            if(!valid()){total.textContent=state.cart.some(item=>!Number.isInteger(Number(item.quantity))||Number(item.quantity)<1||Number(item.quantity)>1000000)?'Số lượng phải là số nguyên từ 1 đến 1.000.000.':'Chọn khách và sản phẩm để tính tiền.';return;}
            const turn=state.quoteTurn,generation=state.generation,body=request(),sig=JSON.stringify(body);total.textContent='Đang tính tiền';
            quoteTimer=setTimeout(async()=>{try{const quote=await rpc('quote_admin_sales_order',body);if(turn!==state.quoteTurn||generation!==state.generation)return;
                if(!quote?.version||!Array.isArray(quote.lines)||!Number.isFinite(Number(quote.total)))throw Error('invalid_quote');
                state.quote=quote;state.quoteSignature=sig;total.textContent='Tiền hàng '+money(quote.subtotal)+' · Giảm giá '+money(Number(quote.line_discount)+Number(quote.voucher_discount))+' · Tổng tiền '+money(quote.total);
                if(quote.warning)message.textContent=quote.warning==='sales_tier_not_configured'?'Khách chưa có hạng được áp dụng ưu đãi.':quote.warning==='sales_points_not_configured'?'Chưa cấu hình quy đổi điểm, đơn chưa áp dụng điểm.':'Kiểm tra lại ưu đãi trước khi tạo đơn.';
                paintLines();save.disabled=false;
            }catch(error){if(turn===state.quoteTurn&&generation===state.generation){resetQuote();message.textContent=errorText(error);}}},250);
        }
        function paintLines(){
            lines.replaceChildren();if(!state.cart.length){lines.append(el('p','Chưa chọn sản phẩm.','workspace-care-log-summary'));return;}
            for(const item of state.cart){const row=el('div',null,'workspace-sales-line'),name=el('div'),quantity=el('input',null,'admin-input'),remove=el('button','Xóa','workspace-text-button');
                const priced=state.quote?.lines.find(line=>line.variant_id===item.id);name.append(el('strong',item.product_name),el('small',item.sku_variant+' · '+money(priced?.unit_price??item.sale_price)+(priced?' · Có thể bán '+priced.available:'')));
                quantity.type='number';quantity.min=1;quantity.max=1000000;quantity.step=1;quantity.value=item.quantity;quantity.setAttribute('aria-label','Số lượng '+item.sku_variant);quantity.disabled=state.saving;
                const quantityField=el('div',null,'workspace-form-field'),label=el('label','Số lượng');quantity.id='staffSalesQuantity'+item.id;label.htmlFor=quantity.id;quantityField.append(label,quantity);
                quantity.oninput=()=>{item.quantity=quantity.value;update();};remove.type='button';remove.disabled=state.saving;remove.onclick=()=>{state.cart=state.cart.filter(line=>line!==item);paintLines();update();};row.append(name,quantityField,remove);lines.append(row);
            }
        }
        function picker(key,kind,titleOf,subtitleOf,onChoose,minimum=0){
            const input=fields[key],group=groups[key],menu=el('div',null,'autocomplete-dropdown workspace-autocomplete-menu'),selected=el('div',null,'workspace-selected-entity');menu.id=input.id+'Options';menu.hidden=selected.hidden=true;menu.setAttribute('role','listbox');group.classList.add('workspace-autocomplete');group.append(menu,selected);
            input.autocomplete='off';input.setAttribute('role','combobox');input.setAttribute('aria-controls',menu.id);input.setAttribute('aria-expanded','false');
            let turn=0,timer,active=-1,buttons=[],page=1;
            function hide(){turn++;clearTimeout(timer);menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
            async function search(nextPage=1){
                if(state.saving||input.readOnly)return;hide();page=nextPage;const current=turn,generation=state.generation,query=input.value.trim();if(query.length<minimum)return;
                menu.replaceChildren(el('p','Đang tìm'));menu.hidden=false;input.setAttribute('aria-expanded','true');buttons=[];
                try{const data=await rpc('get_staff_workspace',{p_kind:kind,p_query:query,p_id:null,p_page:page});if(current!==turn||generation!==state.generation)return;menu.replaceChildren();
                    for(const row of data.items){const text=String(titleOf(row)||'').trim();if(!text||/^\d+$/.test(text)||/^(unknown|null|undefined|chưa rõ|chưa cập nhật)$/i.test(text))continue;
                        const button=el('button',null,'workspace-autocomplete-option');button.type='button';button.id=menu.id+buttons.length;button.setAttribute('role','option');button.setAttribute('aria-selected','false');button.append(el('strong',text),el('small',subtitleOf(row)));button.onclick=()=>{hide();onChoose(row);if(key==='customer'){input.readOnly=true;input.value=text;selected.replaceChildren(el('span',text));const clear=el('button','✕ Bỏ chọn','workspace-text-button');clear.type='button';clear.onclick=()=>{if(state.saving)return;reset();state.customer=null;fields.phone.value='';update();input.focus();};selected.append(clear);selected.hidden=false;}else input.value='';input.focus();};menu.append(button);buttons.push(button);
                    }
                    if(!buttons.length)menu.append(el('p','Chưa có kết quả.'));
                    for(const[label,next]of [['Trang trước',page-1],['Trang sau',page+1]]){if(next<1||next>page&&data.items.length<10)continue;const button=el('button',label,'workspace-autocomplete-option');button.type='button';button.onclick=()=>search(next);menu.append(button);}
                }catch{if(current===turn)menu.replaceChildren(el('p','Không tải được gợi ý. Bấm lại ô để thử.'));}
            }
            function reset(){hide();input.value='';input.readOnly=false;selected.hidden=true;selected.replaceChildren();}
            input.addEventListener('focus',()=>search());input.addEventListener('click',()=>search());input.addEventListener('input',()=>{hide();timer=setTimeout(()=>search(),200);});
            input.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){event.preventDefault();event.stopPropagation();hide();}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if(menu.hidden){search();return;}active=(active+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons.forEach((button,index)=>button.setAttribute('aria-selected',String(index===active)));if(buttons[active]){input.setAttribute('aria-activedescendant',buttons[active].id);buttons[active].scrollIntoView({block:'nearest'});}}else if(event.key==='Enter'){event.preventDefault();buttons[active]?.click();}});
            overlay.addEventListener('click',event=>{if(!group.contains(event.target))hide();});pickers.push({hide,reset});
        }
        picker('customer','customers',row=>row.full_name,row=>[row.phone_number,row.customer_code].filter(Boolean).join(' · '),row=>{state.customer=row;fields.phone.value=row.phone_number||'';update();},3);
        picker('product','stock',row=>row.product_name,row=>row.sku_variant+' · '+money(row.sale_price),row=>{const existing=state.cart.find(item=>item.id===row.id);if(existing)existing.quantity=Number(existing.quantity)+1;else if(state.cart.length<100)state.cart.push({...row,quantity:1});paintLines();update();});
        function closeDialog(){state.generation++;resetQuote();pickers.forEach(picker=>picker.hide());overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true');if(state.returnFocus?.isConnected)state.returnFocus.focus();}
        overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-close-modal="'+overlay.id+'"]'))closeDialog();});
        overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}if(event.key!=='Tab')return;const nodes=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])')].filter(node=>node.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
        form.addEventListener('submit',event=>event.preventDefault());
        for(const key of ['mode','voucher','points','note'])fields[key].addEventListener('input',update);
        save.onclick=async()=>{
            if(state.saving||!allowed()||!state.quote||state.quoteSignature!==signature())return;
            const body=request(),sig=JSON.stringify(body),generation=state.generation;if(!state.pending||state.pending.signature!==sig)state.pending={signature:sig,id:crypto.randomUUID()};
            const orderId=state.pending.id,quote=state.quote;state.saving=true;pickers.forEach(picker=>picker.hide());const controls=[...grid.querySelectorAll('input,select,textarea,button')];controls.forEach(node=>node.disabled=true);save.disabled=true;save.textContent='Đang tạo đơn';message.textContent='';
            try{const saved=await rpc('create_admin_sales_order',{p_order_id:orderId,...body,p_expected_quote:quote.version});if(saved!==orderId)throw Error('invalid_sales_result');if(generation!==state.generation)return;const callback=state.onSaved;closeDialog();if(allowed())callback?.(saved);
            }catch(error){if(generation===state.generation){if(error.code==='PT409'){resetQuote();message.textContent=errorText(error)+' Đóng và mở lại để lập bản tính mới.';}else message.textContent=errorText(error);}}
            finally{state.saving=false;controls.forEach(node=>node.disabled=false);save.textContent='Tạo đơn';save.disabled=!state.quote||state.quoteSignature!==signature();}
        };
        dialog={open:({onSaved}={})=>{if(state.saving)return;state.generation++;state.customer=null;state.cart=[];state.pending=null;state.onSaved=onSaved;state.returnFocus=document.activeElement;form.reset();pickers.forEach(picker=>picker.reset());paintLines();update();overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');fields.customer.focus();},close:closeDialog,clear:()=>{closeDialog();form.reset();state.cart=[];state.customer=state.pending=state.onSaved=null;lines.replaceChildren();fields.phone.value='';pickers.forEach(picker=>picker.reset());}};return dialog;
    }
    window.addEventListener('hashchange',()=>dialog?.close());
    window.PawpalStaffSales=Object.freeze({open:options=>{if(allowed())build().open(options);},closeAll:()=>dialog?.clear()});
})();

;
(function () {
    'use strict';
    const allowed=()=>window.PawpalAdminAccess?.isStaff()&&PawpalAdminAccess.state.user.permissions.includes('work.cashier.collect');
    const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;};
    const money=value=>new Intl.NumberFormat('vi-VN').format(Number(value))+' đ';
    async function rpc(name,args){const{data,error}=await getSupabaseClient().rpc(name,args);if(error)throw error;return data;}
    const pending=new Map();let dialog;
    function build(){
        if(dialog)return dialog;
        const overlay=el('div',null,'admin-modal-overlay staff-workspace-modal');overlay.id='staffCashierModal';overlay.setAttribute('aria-hidden','true');
        const card=el('div',null,'admin-modal-card workspace-cashier-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','staffCashierTitle');
        const form=el('form');form.noValidate=true;form.setAttribute('onsubmit','return false;');
        const header=el('div',null,'workspace-modal-header'),title=el('h2','Thu tiền đơn hàng'),close=el('button','Đóng','btn-modal-close');title.id='staffCashierTitle';close.type='button';close.dataset.closeModal=overlay.id;header.append(title,close);
        const summary=el('dl',null,'workspace-intake-summary');summary.id='staffCashierSummary';
        const grid=el('div',null,'workspace-pet-grid'),fields={},groups={};
        function field(key,label,type='text',required=false,wide=false){const group=el('div',null,'workspace-form-field'+(wide?' workspace-field-wide':'')),caption=el('label',label+(required?' ':'')),input=el(type==='textarea'?'textarea':'input',null,'admin-input');input.id='staffCashier'+key;caption.htmlFor=input.id;if(required)caption.append(el('span','*','workspace-required'));input.required=required;if(type==='textarea'){input.rows=2;input.maxLength=2000;}else input.type=type;group.append(caption,input);grid.append(group);fields[key]=input;groups[key]=group;return input;}
        field('method','Phương thức thanh toán','text',true);const amount=field('amount','Số tiền ghi nhận','number',true);amount.min=1;amount.max=100000000000;amount.step=1;
        field('reference','Mã giao dịch đã đối soát','text',true,true).maxLength=200;field('reason','Nội dung thu tiền','textarea',true,true);
        const confirmation=el('label',null,'workspace-intake-confirmation'),confirmed=el('input');confirmed.id='staffCashierConfirmed';confirmed.type='checkbox';confirmed.required=true;confirmation.htmlFor=confirmed.id;confirmation.append(confirmed,el('span','Đã nhận từ khách đúng số tiền ghi ở trên '),el('span','*','workspace-required'));
        const history=el('div',null,'workspace-cashier-history');history.id='staffCashierHistory';
        const message=el('p','','workspace-error');message.setAttribute('role','alert');
        const footer=el('div',null,'workspace-modal-footer'),cancel=el('button','Hủy','admin-btn admin-btn-secondary'),save=el('button','Ghi nhận thu tiền','admin-btn admin-btn-primary');save.id='staffCashierSave';cancel.type=save.type='button';cancel.dataset.closeModal=overlay.id;footer.append(cancel,save);
        form.append(header,summary,grid,confirmation,history,message,footer);card.append(form);overlay.append(card);document.body.append(overlay);
        const menu=el('div',null,'autocomplete-dropdown workspace-autocomplete-menu'),selected=el('div',null,'workspace-selected-entity');menu.id='staffCashierMethodOptions';menu.setAttribute('role','listbox');menu.hidden=selected.hidden=true;groups.method.classList.add('workspace-autocomplete');groups.method.append(menu,selected);fields.method.autocomplete='off';fields.method.setAttribute('role','combobox');fields.method.setAttribute('aria-controls',menu.id);fields.method.setAttribute('aria-expanded','false');
        const state={context:null,method:null,orderId:null,generation:0,saving:false,loading:true,blocked:false,unresolved:null,onSaved:null,returnFocus:null};
        const key=()=>PawpalAdminAccess.state.user.id+':'+state.orderId;
        function hideMenu(){menu.hidden=true;fields.method.setAttribute('aria-expanded','false');fields.method.removeAttribute('aria-activedescendant');}
        function setMethod(method){state.method=method;fields.method.value=method?.name||'';fields.method.readOnly=!!method;selected.replaceChildren();selected.hidden=!method;groups.reference.hidden=!method?.requires_reference;fields.reference.required=!!method?.requires_reference;confirmed.checked=false;hideMenu();if(method){selected.append(el('span',method.name));const clear=el('button','✕ Bỏ chọn','workspace-text-button');clear.type='button';clear.onclick=event=>{event.stopPropagation();if(state.saving||state.unresolved)return;setMethod(null);fields.reference.value='';fields.method.focus();};selected.append(clear);}}
        let active=-1,options=[];
        function showMenu(){if(state.loading||state.blocked||state.saving||state.unresolved||fields.method.readOnly)return;menu.replaceChildren();active=-1;options=[];for(const method of state.context?.methods||[]){if(!method.name.toLocaleLowerCase('vi').includes(fields.method.value.trim().toLocaleLowerCase('vi')))continue;const button=el('button',method.name,'workspace-autocomplete-option');button.type='button';button.id=menu.id+options.length;button.setAttribute('role','option');button.setAttribute('aria-selected','false');button.onclick=()=>{setMethod(method);fields.amount.focus();};menu.append(button);options.push(button);}if(!options.length)menu.append(el('p','Không có phương thức phù hợp.'));menu.hidden=false;fields.method.setAttribute('aria-expanded','true');}
        fields.method.addEventListener('focus',showMenu);fields.method.addEventListener('click',showMenu);fields.method.addEventListener('input',()=>{state.method=null;confirmed.checked=false;showMenu();});
        fields.method.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){event.preventDefault();event.stopPropagation();hideMenu();}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if(menu.hidden){showMenu();return;}if(!options.length)return;active=(active+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options.forEach((button,index)=>button.setAttribute('aria-selected',String(index===active)));fields.method.setAttribute('aria-activedescendant',options[active].id);}else if(event.key==='Enter'){event.preventDefault();options[active]?.click();}});
        for(const name of ['amount','reference','reason'])fields[name].addEventListener('input',()=>{confirmed.checked=false;message.textContent='';});
        function controls(){for(const input of Object.values(fields))input.disabled=state.loading||state.blocked||state.saving||!!state.unresolved;selected.querySelectorAll('button').forEach(button=>button.disabled=state.saving||!!state.unresolved);confirmed.disabled=state.loading||state.blocked||state.saving;save.disabled=state.loading||state.blocked||state.saving;save.textContent=state.saving?'Đang ghi nhận':state.unresolved?'Thử lại khoản thu':'Ghi nhận thu tiền';}
        function paint(context){
            summary.replaceChildren();for(const[label,value]of [['Mã đơn',context.order_code],['Tổng tiền',money(context.total)],['Đã thu sau hoàn',money(context.collected)],['Còn phải thu',money(context.remaining)]])summary.append(el('dt',label),el('dd',value));
            const statuses={succeeded:'Thành công',pending:'Chờ xử lý',failed:'Thất bại',cancelled:'Đã hủy'};
            function historyPage(page){
                history.replaceChildren(el('h3','Lịch sử thanh toán'));if(!context.payments.length)history.append(el('p','Chưa có khoản thu.'));
                for(const payment of context.payments.slice(page*10,page*10+10)){const entry=el('div',null,'workspace-cashier-entry');entry.append(el('strong',money(payment.amount)+' · '+(statuses[payment.transaction_status]||'Cần đối soát')),el('p',[payment.method_name,payment.payment_code,payment.succeeded_at?new Date(payment.succeeded_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'}):null].filter(Boolean).join(' · ')));for(const refund of payment.refunds||[])entry.append(el('p','Hoàn '+money(refund.refunded_amount)+' · '+(statuses[refund.refund_status]||'Cần đối soát')));history.append(entry);}
                if(context.payments.length>10){const pager=el('nav',null,'workspace-pager');pager.setAttribute('aria-label','Trang lịch sử thanh toán');for(const[label,next]of [['<',page-1],[String(page+1),page],['>',page+1]]){const button=el('button',label,next===page?'active':'');button.type='button';button.disabled=next<0||next*10>=context.payments.length;button.onclick=()=>historyPage(next);pager.append(button);}history.append(pager);}
            }
            historyPage(0);
        }
        const matches=(context,attempt)=>context.payments.some(payment=>payment.id===attempt.args.p_request_id&&payment.order_id===attempt.args.p_order_id&&payment.transaction_status==='succeeded'&&Number(payment.amount)===attempt.args.p_details.amount&&payment.payment_method_config_id===attempt.args.p_details.method_id);
        function closeDialog(){state.generation++;hideMenu();overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true');if(state.returnFocus?.isConnected)state.returnFocus.focus();}
        overlay.addEventListener('click',event=>{if(!groups.method.contains(event.target))hideMenu();if(event.target===overlay||event.target.closest('[data-close-modal="'+overlay.id+'"]'))closeDialog();});
        overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}if(event.key!=='Tab')return;const nodes=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled])')].filter(node=>node.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
        form.addEventListener('submit',event=>event.preventDefault());
        const errorText=error=>({sales_cashier_changed:'Số dư hoặc đơn hàng đã thay đổi. Đóng và mở lại để đối chiếu.',sales_money_exceeds_balance:'Số tiền vượt số còn phải thu. Đóng và mở lại để kiểm tra.',sales_money_method_invalid:'Phương thức không còn được phép. Đóng và mở lại để chọn lại.',sales_money_reference_duplicate:'Mã giao dịch này đã được ghi nhận. Đối chiếu trước khi thu thêm.',sales_money_booking_closed:'Đơn đã hủy hoặc trả hàng, không thể thu thêm.',sales_money_reference_required:'Nhập mã giao dịch ngân hàng đã đối soát.',sales_request_conflict:'Yêu cầu đã được ghi với nội dung khác. Đóng và mở lại để đối chiếu.'}[error.message]||(error.code==='42501'?'Bạn không còn quyền thu tiền. Đóng và tải lại.':'Chưa xác nhận ghi nhận thành công. Thử lại cùng khoản thu để đối chiếu.'));
        save.onclick=async()=>{
            if(!allowed()||state.loading||state.blocked||state.saving||!state.context)return;
            const value=Number(fields.amount.value),reason=fields.reason.value.trim(),reference=fields.reference.value.trim();
            if(!state.unresolved){if(!state.method){message.textContent='Chọn phương thức từ danh sách.';fields.method.focus();return;}if(!Number.isInteger(value)||value<=0||value>Number(state.context.remaining)||value>100000000000){message.textContent='Nhập số tiền nguyên dương không vượt số còn phải thu.';fields.amount.focus();return;}if(reason.length<2||reason.length>2000){message.textContent='Nhập nội dung thu tiền từ 2 đến 2000 ký tự.';fields.reason.focus();return;}if(state.method.requires_reference&&!reference){message.textContent='Nhập mã giao dịch ngân hàng đã đối soát.';fields.reference.focus();return;}}
            if(!confirmed.checked){message.textContent='Xác nhận đã nhận đúng số tiền từ khách trước khi ghi nhận.';confirmed.focus();return;}
            const attempt=state.unresolved||{args:{p_request_id:crypto.randomUUID(),p_order_id:state.orderId,p_expected_state:state.context.version,p_action:'collect',p_details:{method_id:state.method.id,amount:value,reason,reference:state.method.requires_reference?reference:'',confirmed:true}}};
            const generation=state.generation,attemptKey=key();pending.set(attemptKey,attempt);state.saving=true;controls();hideMenu();message.textContent='';
            const finish=()=>{pending.delete(attemptKey);if(generation!==state.generation)return;const callback=state.onSaved;closeDialog();if(allowed())callback?.(attempt.args.p_order_id);};
            try{const result=await rpc('post_admin_sales_money',attempt.args);if(result!==attempt.args.p_request_id)throw Error('invalid_collection_result');finish();}
            catch(error){
                // SQL validation errors prove this attempt rolled back. An uncertain transport result keeps its UUID and immutable payload.
                const definitive=['42501','22023','23514','PT409','P0002'].includes(error.code);
                if(definitive)pending.delete(attemptKey);
                if(!definitive){try{const latest=await rpc('get_admin_sales_cashier',{p_order_id:attempt.args.p_order_id});if(matches(latest,attempt)){finish();return;}}catch{}}
                if(generation!==state.generation)return;
                state.unresolved=definitive?null:attempt;state.blocked=definitive;confirmed.checked=false;message.textContent=errorText(error);
            }finally{state.saving=false;if(generation===state.generation)controls();}
        };
        async function open({orderId,onSaved}={}){
            if(state.saving||!allowed())return;state.orderId=orderId;state.context=state.method=state.unresolved=null;state.loading=true;state.blocked=false;state.onSaved=onSaved;state.returnFocus=document.activeElement;const generation=++state.generation;
            form.reset();summary.replaceChildren();history.replaceChildren();selected.hidden=true;groups.reference.hidden=true;message.textContent='';controls();overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');close.focus();
            try{const context=await rpc('get_admin_sales_cashier',{p_order_id:orderId});if(generation!==state.generation)return;
                if(context?.order_id!==orderId||!context.version||!Array.isArray(context.methods)||!Array.isArray(context.payments)||!['total','collected','remaining'].every(name=>Number.isFinite(Number(context[name]))))throw Error('invalid_cashier_context');
                state.context=context;paint(context);const previous=pending.get(key());if(previous&&matches(context,previous)){pending.delete(key());message.textContent='Khoản thu trước đã được ghi nhận. Kiểm tra lịch sử bên dưới.';}
                if(['cancelled','returned'].includes(context.status)){state.blocked=true;message.textContent='Đơn đã hủy hoặc trả hàng, không thể thu thêm.';}else if(Number(context.remaining)<=0){state.blocked=true;message.textContent='Đơn đã thu đủ, không có số tiền cần thu thêm.';}else if(!context.methods.length){state.blocked=true;message.textContent='Chưa có phương thức thu tiền được phép. Liên hệ Quản lý.';}
                const unresolved=pending.get(key());if(unresolved&&!state.blocked){state.unresolved=unresolved;const details=unresolved.args.p_details;setMethod(context.methods.find(method=>method.id===details.method_id)||{id:details.method_id,name:'Phương thức của khoản thu đang đối chiếu',requires_reference:!!details.reference});fields.amount.value=details.amount;fields.reason.value=details.reason;fields.reference.value=details.reference;message.textContent='Khoản thu trước chưa được xác nhận. Thử lại đúng khoản thu này trước khi tạo khoản mới.';}else{setMethod(context.methods.find(method=>method.name==='Tiền mặt')||null);fields.amount.value=Number(context.remaining)>0?context.remaining:'';}
                state.loading=false;controls();
            }catch{if(generation===state.generation){state.blocked=true;message.textContent='Không tải đủ dữ liệu thu tiền. Đóng và mở lại để kiểm tra.';controls();}}
        }
        dialog={open,close:closeDialog,clear:()=>{closeDialog();pending.clear();state.context=state.method=state.unresolved=state.onSaved=null;form.reset();summary.replaceChildren();history.replaceChildren();selected.replaceChildren();message.textContent='';}};return dialog;
    }
    window.addEventListener('hashchange',()=>dialog?.close());
    window.PawpalStaffCashier=Object.freeze({open:options=>{if(allowed())return build().open(options);},closeAll:()=>{pending.clear();dialog?.clear();}});
})();

;
(function(){
    'use strict';
    const allowed=()=>window.PawpalAdminAccess?.isStaff()&&PawpalAdminAccess.state.user.permissions.includes('work.cashier.collect');
    const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;};
    const money=value=>new Intl.NumberFormat('vi-VN').format(Number(value))+' đ';
    const statuses={pending:'Chờ xử lý',confirmed:'Đã xác nhận',processing:'Đang xử lý',shipping:'Đang giao',completed:'Hoàn thành',delivered:'Đã giao',cancelled:'Đã hủy',returned:'Đã trả hàng'};
    const frames=new Set();let dialog;
    async function read(orderId){const{data,error}=await getSupabaseClient().rpc('get_staff_sales_receipt',{p_order_id:orderId});if(error)throw error;if(data?.order_id!==orderId||!data.order_code||!Array.isArray(data.lines)||!['subtotal','line_discount','voucher_discount','shipping','total','collected','refunded','remaining'].every(key=>data[key]!=null&&Number.isFinite(Number(data[key])))||data.lines.some(line=>!line.id||!['quantity','unit_price','discount','total'].every(key=>line[key]!=null&&Number.isFinite(Number(line[key])))))throw Error('invalid_receipt');return data;}
    function sheet(data,lines){
        const root=el('section',null,'workspace-receipt-sheet'),heading=el('h3','PawPal · '+data.order_code);root.append(heading);
        const details=el('dl',null,'workspace-intake-summary');for(const[name,value]of [['Ngày lập',new Date(data.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})],['Khách hàng',data.customer_name||'Chưa có thông tin'],['Số điện thoại',data.phone||'—'],['Trạng thái',statuses[data.status]||'Cần kiểm tra']])details.append(el('dt',name),el('dd',value));root.append(details);
        const wrapper=el('div',null,'workspace-receipt-table-wrap');wrapper.tabIndex=0;wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','Sản phẩm trên phiếu');const table=el('table',null,'admin-table'),head=el('thead'),tr=el('tr');for(const name of ['Sản phẩm','Số lượng','Đơn giá','Giảm giá','Thành tiền'])tr.append(el('th',name));head.append(tr);const body=el('tbody');for(const line of lines){const row=el('tr'),name=el('td');name.append(el('strong',line.name),el('small',line.sku));row.append(name,el('td',new Intl.NumberFormat('vi-VN').format(Number(line.quantity))),el('td',money(line.unit_price)),el('td',money(line.discount)),el('td',money(line.total)));body.append(row);}if(!lines.length){const row=el('tr'),cell=el('td','Chưa có sản phẩm.');cell.colSpan=5;row.append(cell);body.append(row);}table.append(head,body);wrapper.append(table);root.append(wrapper);
        const amounts=el('dl',null,'workspace-intake-summary');for(const[name,value]of [['Tiền hàng',data.subtotal],['Giảm trên sản phẩm',data.line_discount],['Giảm theo ưu đãi',data.voucher_discount],['Phí giao hàng',data.shipping],['Tổng đơn',data.total],['Đã thu sau hoàn',data.collected],['Đã hoàn',data.refunded],['Còn phải thu',data.remaining]])amounts.append(el('dt',name),el('dd',money(value)));root.append(amounts,el('p','Phiếu bán hàng dùng để đối chiếu đơn và thu tiền.','workspace-checkout-explanation'));return root;
    }
    function clearFrames(){for(const frame of frames)frame.remove();frames.clear();}
    function build(){
        if(dialog)return dialog;const overlay=el('div',null,'admin-modal-overlay staff-workspace-modal');overlay.id='staffSalesReceiptModal';overlay.setAttribute('aria-hidden','true');const card=el('div',null,'admin-modal-card workspace-receipt-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','staffSalesReceiptTitle');
        const form=el('form');form.setAttribute('onsubmit','return false;');const header=el('div',null,'workspace-modal-header'),title=el('h2','Phiếu bán hàng'),close=el('button','Đóng','btn-modal-close');title.id='staffSalesReceiptTitle';close.type='button';close.dataset.closeModal=overlay.id;header.append(title,close);
        const content=el('div');content.id='staffSalesReceiptContent';const pager=el('nav',null,'workspace-pager');pager.setAttribute('aria-label','Trang sản phẩm trên phiếu');const message=el('p','','workspace-error');message.setAttribute('role','alert');const footer=el('div',null,'workspace-modal-footer'),cancel=el('button','Hủy','admin-btn admin-btn-secondary'),print=el('button','In phiếu','admin-btn admin-btn-primary');print.id='staffSalesReceiptPrint';cancel.type=print.type='button';cancel.dataset.closeModal=overlay.id;footer.append(cancel,print);form.append(header,content,pager,message,footer);card.append(form);overlay.append(card);document.body.append(overlay);
        const state={id:null,data:null,generation:0,busy:false,returnFocus:null};
        function closeDialog(){state.generation++;overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true');state.data=null;content.replaceChildren();pager.replaceChildren();message.textContent='';print.disabled=true;clearFrames();if(state.returnFocus?.isConnected)state.returnFocus.focus();}
        function paint(page=0){const data=state.data;content.replaceChildren(sheet(data,data.lines.slice(page*10,page*10+10)));pager.replaceChildren();if(data.lines.length<=10)return;const prev=el('button','<'),active=el('button',String(page+1),'active'),next=el('button','>');for(const button of [prev,active,next])button.type='button';prev.disabled=page===0;next.disabled=(page+1)*10>=data.lines.length;active.setAttribute('aria-current','page');prev.onclick=()=>paint(page-1);next.onclick=()=>paint(page+1);pager.append(prev,active,next);}
        overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-close-modal="'+overlay.id+'"]'))closeDialog();});overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}if(event.key!=='Tab')return;const nodes=[...overlay.querySelectorAll('button:not([disabled]),[tabindex="0"]')].filter(node=>node.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});form.addEventListener('submit',event=>event.preventDefault());
        print.onclick=async()=>{
            if(!allowed()||state.busy||!state.data)return;state.busy=true;print.disabled=true;message.textContent='';const generation=state.generation;
            try{const data=await read(state.id);if(generation!==state.generation||!allowed())return;state.data=data;paint();clearFrames();const frame=el('iframe');frame.title='Bản in phiếu bán hàng';frame.className='workspace-receipt-print-frame';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');document.body.append(frame);frames.add(frame);const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu bán hàng</title><style>body{font:13px Arial,sans-serif;color:#203A2C;padding:20px}h2,h3,th{color:#236B48}dl{display:grid;grid-template-columns:180px 1fr;gap:8px 16px}dd{margin:0;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin:16px 0;table-layout:fixed}th,td{text-align:left;padding:8px 4px;overflow-wrap:anywhere;vertical-align:top}th:first-child{width:30%}small{display:block;color:#4F7A65}tr{break-inside:avoid}@page{margin:14mm}</style></head><body><h2>Phiếu bán hàng</h2></body></html>');doc.close();doc.body.append(sheet(data,data.lines));const cleanup=()=>{frame.remove();frames.delete(frame);if(generation===state.generation&&overlay.classList.contains('active')&&allowed())print.focus();};frame.contentWindow.addEventListener('afterprint',cleanup,{once:true});frame.contentWindow.focus();frame.contentWindow.print();setTimeout(cleanup,60000);
            }catch{if(generation===state.generation){state.data=null;content.replaceChildren();pager.replaceChildren();message.textContent='Không thể xác minh dữ liệu để in. Đóng phiếu và tải lại; chưa gửi lệnh in.';}}
            finally{state.busy=false;if(generation===state.generation)print.disabled=!state.data;}
        };
        async function open({orderId}={}){if(!allowed()||state.busy)return;state.id=orderId;state.data=null;state.returnFocus=document.activeElement;content.replaceChildren();pager.replaceChildren();message.textContent='';print.disabled=true;const generation=++state.generation;overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');close.focus();try{const data=await read(orderId);if(generation!==state.generation||!allowed())return;state.data=data;paint();print.disabled=false;}catch{if(generation===state.generation)message.textContent='Không tải được phiếu bán hàng trong phạm vi được xem. Đóng phiếu và tải lại.';}}
        dialog={open,close:closeDialog};return dialog;
    }
    window.addEventListener('hashchange',()=>dialog?.close());
    window.PawpalStaffSalesReceipt=Object.freeze({open:options=>{if(allowed())return build().open(options);},closeAll:()=>{clearFrames();dialog?.close();}});
})();

;

// Role-scoped screens belong to this domain.
(function registerRoleViews(){
 const views=window.PawpalAdminViews;if(!views)return;const {date,money,status}=views.helpers;
 views.register("Bán hàng",{columns:{orders:[['Mã đơn', 'order_code'], ['Trạng thái', r => status(r.order_status)], ['Cập nhật', r => date(r.updated_at)]],stock:[['SKU', 'sku_variant'], ['Sản phẩm', 'product_name'], ['Giá bán', r => money(r.sale_price)], ['Tồn kho', 'quantity_in_stock']],offers:[['Mã ưu đãi', 'voucher_code'], ['Giá trị', r => r.type === 'percentage' ? r.discount_value + '%' : money(r.discount_value)], ['Đơn tối thiểu', r => money(r.minimum_order_amount)], ['Kết thúc', r => date(r.end_date)]],order_lines:[['Sản phẩm', 'product_name_snapshot'], ['SKU', 'sku_snapshot'], ['Số lượng', 'quantity'], ['Đơn giá', r => money(r.unit_price)], ['Giảm giá', r => money(r.discount_amount)]]},
targets:{"orders":"tab-order-detail"},
profiles:{"order-profile":{read:"orders",render:async(ctx)=>{const {el,date,money,status,read,table,card,facts,go,root,kind,id,row,target,turn}=ctx;
            const details = facts(root, row.order_code, [['Trạng thái', status(row.order_status)]]);
            if(PawpalAdminAccess.state.user.permissions.includes('work.complaint.handle')){const complaint=el('button','Tạo khiếu nại','admin-btn admin-btn-secondary');complaint.type='button';complaint.onclick=()=>PawpalStaffComplaintCreate.open({orderId:id});details.append(complaint);}
            if (window.PawpalAdminAccess.state.user.permissions.includes('work.cashier.collect')) {
                const receipt=el('button','Phiếu bán hàng','admin-btn admin-btn-secondary');receipt.type='button';receipt.onclick=()=>window.PawpalStaffSalesReceipt.open({orderId:id});details.append(receipt);
            }
            if (!['cancelled','returned'].includes(row.order_status) && window.PawpalAdminAccess.state.user.permissions.includes('work.cashier.collect')) {
                const collect = el('button', 'Thu tiền', 'admin-btn admin-btn-primary'); collect.type = 'button';
                collect.onclick = () => window.PawpalStaffCashier.open({ orderId: id, onSaved: () => ctx.refresh() }); details.append(collect);
            }
            const rows = await read('order_lines', { id }); if (ctx.isCurrent()) table('order_lines', rows, card(root, 'Sản phẩm trong đơn'));
}}},
toolbars:{"orders":(ctx)=>{const {el,go,tools}=ctx;
                const create = el('button', 'Tạo đơn tại quầy', 'admin-btn admin-btn-primary'); create.type = 'button';
                create.onclick = () => window.PawpalStaffSales.open({ onSaved: orderId => go('tab-order-detail', orderId) }); tools.append(create);}}});
})();

(function initializeManagementDomain(){
    if (!window.PawpalAdminAccess?.isAdmin()) return;
(function(){
 'use strict';
 const one=v=>Array.isArray(v)?v[0]:v;
 const number=v=>v==null?null:Number(v);
 async function rows(make){const all=[];for(let offset=0;;offset+=500){const {data,error}=await make().range(offset,offset+499);if(error)throw error;all.push(...data);if(data.length<500)return all;}}
 const db=()=>window.getSupabaseClient();
 // Actor-scoped, single-flight reads. Stale business data is never returned while revalidating.
 const cacheKey=resource=>'orders:'+resource+':'+(window.PawpalDataStore?.buildKey?.(resource)||'session');
 const cached=(resource,fetcher,{force=false,ttlMs=30000}={})=>{
  const store=window.PawpalDataStore;
  return store?store.fetch(cacheKey(resource),fetcher,{force,ttlMs,backgroundRevalidate:false}):fetcher();
 };

 const profile=c=>one(c?.customer_profile)||{};
 const phone=c=>window.PawpalCustomerIdentity.contact(c).phone;
 const spec=value=>value&&typeof value==='object'?Object.entries(value).map(([k,v])=>k+': '+String(v)).join('; '):String(value||'');
 const images=list=>[...(list||[])].sort((a,b)=>Number(b.is_thumbnail)-Number(a.is_thumbnail)||a.display_order-b.display_order).map(x=>x.resolved_url||x.image_url||(x.media_asset_id?'/api/media?action=read&id='+encodeURIComponent(x.media_asset_id):'')).filter(Boolean);
 const mediaReaders=new Map();let mediaActor=null;
 function clearMediaReaders(){for(const item of mediaReaders.values())item.then(value=>value.release()).catch(()=>{});mediaReaders.clear();}
 window.addEventListener?.('pagehide',clearMediaReaders);
 async function hydrateProductMedia(products){
  const assets=products.flatMap(p=>[...(p.media||[]),...(p.variants||[]).flatMap(v=>v.media||[])]).filter(m=>m.media_asset_id);if(!assets.length)return;
  const {data}=await db().auth.getSession();const actor=data.session?.user.id||null;
  if(actor!==mediaActor){clearMediaReaders();mediaActor=actor;}
  const {mediaSource,loadMediaSource}=await import('/scripts/shared/media-source.mjs');
  const load=async item=>{
   const id=item.media_asset_id;
   if(!mediaReaders.has(id))mediaReaders.set(id,loadMediaSource(mediaSource({media_asset_id:id}),data.session?.access_token).catch(error=>{mediaReaders.delete(id);throw error;}));
   try{item.resolved_url=(await mediaReaders.get(id)).url;}catch{item.resolved_url='';}
  };
  for(let index=0;index<assets.length;index+=3)await Promise.all(assets.slice(index,index+3).map(load));
  while(mediaReaders.size>100){const [key,value]=mediaReaders.entries().next().value;mediaReaders.delete(key);value.then(item=>item.release()).catch(()=>{});}
 }
 const net=p=>Number(p.amount)-(p.refunds||[]).filter(r=>r.refund_status==='succeeded').reduce((n,r)=>n+Number(r.refunded_amount),0);
 async function history(orderId){
  const {data,error}=await db().rpc('get_admin_sales_order_history',{p_order_id:orderId});
  if(error)throw error;if(!Array.isArray(data))throw Error('invalid_sales_history');return data;
 }
 async function products({ids,ratings=[],detail=false}={}){
  const categories=await cached('categories',()=>rows(()=>db().from('product_category').select('id,category_name,description').order('id')),{ttlMs:600000});
  if(ids&&!ids.length)return {categories,products:[]};
  const summaryOnly=Boolean(ids&&!detail);
  const source=await rows(()=>{let query=summaryOnly?db().from('product').select('id,product_name,status,brand_name,updated_at,category:category_id(id,category_name),media:product_media(image_url,media_asset_id,is_thumbnail,display_order),variants:product_variant(id,sku_variant,variant_name,catalog_retired,cost_price,sale_price,compare_at_price,status,updated_at,inventory(quantity_in_stock,minimum_stock,last_updated_at))').order('id').order('is_thumbnail',{foreignTable:'media',ascending:false}).limit(1,{foreignTable:'media'}):db().from('product').select('*,category:category_id(id,category_name),media:product_media(*),variants:product_variant(*,inventory(quantity_in_stock,minimum_stock,last_updated_at),size:size_id(id,size_name),color:color_id(id,color_name,hex_code),flavor:flavor_id(id,flavor_name),media:product_variant_media(*))').order('id');return ids?query.in('id',ids):query;});
  if(ids)await hydrateProductMedia(source);
  const variantIds=source.flatMap(p=>p.variants.map(v=>v.id));
  const reservations=ids&&variantIds.length?await rows(()=>db().from('stock_reservation').select('product_variant_id,quantity').in('product_variant_id',variantIds).eq('status','active').gt('expires_at',new Date().toISOString()).order('id')):[];
  return {categories,products:source.map(p=>{
   const variants=[...p.variants].filter(v=>!v.catalog_retired).sort((a,b)=>a.sku_variant.localeCompare(b.sku_variant)),active=variants.filter(v=>v.status==='active'),prices=active.map(v=>Number(v.sale_price));
   const mapped=variants.map(v=>{const inv=one(v.inventory);return {image:images(v.media)[0]||'',images:images(v.media),id:v.id,sku:v.sku_variant,attr1:v.variant_name||v.flavor?.flavor_name||v.size?.size_name||v.color?.color_name||'',attr2:v.variant_name?'':v.flavor?v.size?.size_name||v.color?.color_name||'':v.size?v.color?.color_name||'':'',name:v.variant_name||[v.flavor?.flavor_name,v.size?.size_name,v.color?.color_name].filter(Boolean).join(' · ')||v.sku_variant,costPrice:Number(v.cost_price),price:Number(v.sale_price),originalPrice:number(v.compare_at_price),stock:inv?Number(inv.quantity_in_stock):null,minStock:inv?Number(inv.minimum_stock):null,status:v.status,raw:v};});
   const stock=mapped.length&&mapped.every(v=>v.stock!==null)?mapped.reduce((n,v)=>n+v.stock,0):null;
   const minima=mapped.map(v=>v.minStock).filter(v=>v!==null),minStock=minima.length?minima.reduce((n,v)=>n+v,0):null;
   const summary=ratings.find(r=>r.id===p.id),media=images(p.media),defaultVariant=mapped[0];
   return {summary:summaryOnly,reserved:reservations.filter(r=>variants.some(v=>v.id===r.product_variant_id)).reduce((n,r)=>n+Number(r.quantity),0),id:p.id,updatedAt:p.updated_at,raw:p,variant_id:defaultVariant?.id||null,default_variant_id:defaultVariant?.id||null,sku:defaultVariant?.sku||'',name:p.product_name,category:p.category?.category_name||'Chưa phân loại',brand:p.brand_name||'',petType:p.target_pet||'',description:p.description||'',ingredients:p.ingredients||'',benefits:p.benefits||'',usage:p.usage_instructions||'',features:p.specs?.features||'',feedingGuide:p.specs?.feeding_guide||'',expiry:p.specs?.expiry||'',storage:p.specs?.storage||'',origin:p.origin||'',unit:p.unit,spec:p.specs?.quy_cach||spec(p.specs),badge:p.badge||'',costPrice:mapped.length?Math.min(...mapped.map(v=>v.costPrice)):null,rating:summary?Number(summary.rating):null,reviewCount:summary?Number(summary.count):0,price:prices.length?Math.min(...prices):null,originalPrice:defaultVariant?.originalPrice??defaultVariant?.price??null,memberPrice:prices.length?Math.min(...prices):null,stock,minStock,images:media.join(', '),image:media[0]||'',status:p.status!=='active'?'Tạm ngưng':stock===0?'Hết hàng':stock!==null&&minStock!==null&&stock<=minStock?'Sắp hết':'Còn hàng',hasVariants:mapped.length>1,attr1Name:variants.some(v=>v.variant_name)?'Ph\u00e2n lo\u1ea1i':variants.some(v=>v.flavor)?'Hương vị':variants.some(v=>v.size)?'Kích thước':'Màu sắc',attr2Name:variants.some(v=>v.flavor&&v.size)?'Kích thước':'Màu sắc',variants:mapped};
  })};
 }
 async function orders({ids,id}={}){
  if(ids && !ids.length)return [];
  const source=await rows(()=>{
   let query=db().from('sales_order').select('*,customer:customer_id(id,auth_user_id,unverified_contact_phone,customer_profile(full_name),customer_phone(phone_number,is_primary)),provider:shipping_provider_id(provider_name),lines:sales_order_detail(*,variant:product_variant_id(id,sku_variant,product_id,product:product_id(specs),media:product_variant_media(image_url,media_asset_id,is_thumbnail,display_order))),payments:payment(id,amount,transaction_status,payment_type,payment_method_config_id,method:payment_method_config_id(name,short_name),refunds:refund_transaction(refund_status,refunded_amount))').order('created_at',{ascending:false}).order('id');
   if(ids)query=query.in('id',ids);
   if(id)query=query.eq(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)?'id':'order_code',id);
   return query;
  });
  if(!source.length)return [];
  const selectedIds=source.map(o=>o.id);
  const scoped=query=>(ids||id)?query.in('order_id',selectedIds):query;
  const [totals,returns,redemptions]=await Promise.all([
   rows(()=>scoped(db().from('sales_order_totals').select('order_id,total_amount').order('order_id'))),
   rows(()=>{let query=db().from('return_request').select('id,sales_order_id,resolution_type,reason,return_type,description,request_status,created_at,updated_at,'+(window.PAWPAL_SALES_REPLACEMENTS_ENABLED===true?'replacement:sales_replacement(order_id,kind,order:order_id(id,order_code,order_status,tracking_code,shipping_status)),':'')+'lines:return_request_detail(id,quantity,sales_order_detail_id,line:sales_order_detail_id(product_name_snapshot,sku_snapshot,unit_price,discount_amount,quantity,product_variant_id))').order('created_at',{ascending:false}).order('id');return (ids||id)?query.in('sales_order_id',selectedIds):query;}),
   rows(()=>scoped(db().from('voucher_redemption').select('order_id,discount_amount_snapshot,status').not('order_id','is',null).order('id')))
  ]);
  const totalMap=new Map(totals.map(t=>[t.order_id,Number(t.total_amount)]));
  return source.map(o=>{
   const amount=totalMap.get(o.id);if(amount===undefined)throw Error('Thiếu tổng đơn hàng V1.');
   const allPayments=o.payments||[];
   const payments=allPayments.filter(p=>p.transaction_status==='succeeded').sort((a,b)=>a.id.localeCompare(b.id)),gross=payments.reduce((n,p)=>n+Number(p.amount),0),collected=payments.reduce((n,p)=>n+net(p),0),refunds=gross-collected;
   const status=({draft:'pending',pending:'pending',packing:'confirmed',confirmed:'confirmed',shipped:'shipping',shipping:'shipping',delivered:'completed',completed:'completed',cancelled:'cancelled',returned:'returned'})[o.order_status]||o.order_status;
   const requests=returns.filter(r=>r.sales_order_id===o.id),r=requests[0],returnsTotal=payments.reduce((n,p)=>n+(p.refunds||[]).filter(v=>v.refund_status==='succeeded').reduce((s,v)=>s+Number(v.refunded_amount),0),0);
   const paymentStatus=collected>=amount&&amount>0?'paid':collected>0?'partial':gross>0&&refunds>=gross?'refunded':'unpaid';
   const activePayments=payments.length>0?payments:allPayments;
   let methods=[...new Set(activePayments.map(p=>one(p.method)?.name||one(p.method)?.short_name).filter(Boolean))];
   let method=methods.join(' và ');
   if(!method){
    try{
     const localOrders=JSON.parse(localStorage.getItem('pawpal_orders')||'[]');
     const matched=localOrders.find(lo=>lo.id===o.order_code||lo.orderId===o.order_code||lo.id===o.id||lo.orderId===o.id);
     if(matched?.payment?.method || matched?.paymentMethod){
      const mCode=String(matched.payment?.method || matched.paymentMethod).toLowerCase();
      const map={cod:'Tiền mặt khi nhận hàng (COD)',cash:'Tiền mặt khi nhận hàng (COD)',vnpay:'Cổng thanh toán VNPay QR',momo:'Ví điện tử MoMo',bank:'Chuyển khoản trực tiếp ngân hàng Vietcombank',bank_transfer:'Chuyển khoản trực tiếp ngân hàng Vietcombank',vietqr:'Chuyển khoản VietQR'};
      method=map[mCode]||mCode;
     }
    }catch(_){}
   }
   const paymentMethod=methods.length>1?'mixed':/tiền mặt|cod/i.test(method)?'cash':/chuyển khoản|VietQR|bank/i.test(method)?'bank_transfer':/MoMo/i.test(method)?'momo':/VNPay/i.test(method)?'vnpay':'cash';
   if(!method)method='Tiền mặt khi nhận hàng (COD)';
   const items=o.lines.map(d=>({id:d.id,lineId:d.id,variant_id:d.product_variant_id,sku:d.sku_snapshot,name:d.product_name_snapshot,spec:spec(d.variant?.product?.specs),price:Number(d.unit_price),quantity:Number(d.quantity),discount:Number(d.discount_amount),total:Number(d.unit_price)*Number(d.quantity)-Number(d.discount_amount),image:images(d.variant?.media)[0]||''}));
   const rmaInfo=r?{id:r.id,requestId:r.id,solutionType:r.return_type,solutionTypeName:({refund:'Hoàn tiền',return:'Trả hàng',exchange:'Đổi hàng'})[r.return_type]||'Cần đối soát',reason:r.reason,reasonText:r.reason,restockAction:'',restockText:'Xem sổ kho để đối chiếu',refundMethod:'',refundAmount:returnsTotal,refundText:returnsTotal>0?'Đã ghi nhận hoàn tiền':'Chưa ghi nhận hoàn tiền',items:r.lines.map(v=>({sku:v.line?.sku_snapshot||'',name:v.line?.product_name_snapshot||'',quantity:v.quantity,price:v.line?.unit_price??null,variant_id:v.line?.product_variant_id,sales_order_detail_id:v.sales_order_detail_id})),note:r.description||'',createdAt:r.created_at,status:r.request_status}:null;
   const hasOpenReturn=requests.some(v=>['pending','approved'].includes(v.request_status));
   const overdue=status==='pending'&&Date.now()-Date.parse(o.created_at)>1800000;
   return {id:o.order_code,rawId:o.id,rawStatus:o.order_status,shippingReceiver:{name:o.receiver_name_snapshot||'',phone:o.receiver_phone_snapshot||'',province:o.province_snapshot||'',street:o.street_address_snapshot||''},providerId:o.shipping_provider_id,shippedAt:o.shipped_at,deliveryOptionId:o.delivery_option_id,updatedAt:o.updated_at,userId:o.customer_id,customerType:window.PawpalCustomerIdentity.classify(o.customer),phoneUnverified:window.PawpalCustomerIdentity.contact(o.customer).unverified,customerName:profile(o.customer).full_name||o.receiver_name_snapshot||'Chưa có tên khách',phone:phone(o.customer)||o.receiver_phone_snapshot||'',receiverName:o.receiver_name_snapshot||'',receiverPhone:o.receiver_phone_snapshot||'',address:[o.street_address_snapshot,o.province_snapshot,o.postal_code_snapshot].filter(Boolean).join(', ')||'Chưa ghi nhận địa chỉ giao hàng',status,paymentStatus,paymentMethod,paymentMethodName:method||'Chưa ghi nhận',collected,refunded:refunds,remaining:Math.max(amount-collected,0),payments:o.payments,carrier:o.provider?.provider_name||'Chưa phân công',trackingNumber:o.tracking_code||'—',createdAt:o.created_at,subtotal:o.lines.reduce((n,d)=>n+Number(d.unit_price)*Number(d.quantity),0),shippingFee:Number(o.shipping_fee_snapshot),discount:o.lines.reduce((n,d)=>n+Number(d.discount_amount),0)+redemptions.filter(v=>v.order_id===o.id&&v.status==='applied').reduce((n,v)=>n+Number(v.discount_amount_snapshot),0),pawPointsUsed:null,total:amount,cancelReason:o.cancel_reason||'',customerNote:o.note||'',internalNote:'',alertType:hasOpenReturn||overdue?'danger':null,alertMessage:hasOpenReturn?'Có yêu cầu đổi trả':overdue?'Chờ xác nhận quá 30 phút':null,rmaInfo,returnRequests:requests,delivery:null,products:items,timeline:[{title:'Tạo đơn hàng',time:o.created_at,desc:'Đơn được ghi nhận trong hệ thống',done:true},...(o.shipped_at?[{title:'Bàn giao vận chuyển',time:o.shipped_at,desc:o.provider?.provider_name||'Chưa ghi nhận đơn vị vận chuyển',done:true}]:[]),...(o.delivered_at?[{title:'Giao hàng',time:o.delivered_at,desc:'Đã ghi nhận thời điểm giao hàng',done:true}]:[])]};
  });
 }
 async function customers({id}={}){if(!id)throw Error('sales_customer_id_required');const [list,balances]=await Promise.all([rows(()=>db().from('customer').select('id,auth_user_id,unverified_contact_phone,customer_profile(full_name),customer_phone(phone_number,is_primary),customer_address(*),customer_membership(membership_tier(tier_name,discount_percent,is_active)),pet_profile(id,pet_name)').eq('id',id).eq('customer_status','active').order('id')),rows(()=>db().from('customer_point_balance').select('customer_id,total_paw_points').eq('customer_id',id).order('customer_id'))]);return list.map(c=>({id:c.id,rawName:profile(c).full_name||null,name:profile(c).full_name||'Chưa có tên khách',phone:phone(c),phoneUnverified:window.PawpalCustomerIdentity.contact(c).unverified,customerType:window.PawpalCustomerIdentity.classify(c),rank:one(one(c.customer_membership)?.membership_tier)?.tier_name||'Chưa có hạng',defaultAddress:c.customer_address.find(a=>a.is_default)||null,discountPercent:one(one(c.customer_membership)?.membership_tier)?.discount_percent??null,points:Number(balances.find(b=>b.customer_id===c.id)?.total_paw_points||0),address:[c.customer_address.find(a=>a.is_default)?.street_address,c.customer_address.find(a=>a.is_default)?.province].filter(Boolean).join(', '),pets:c.pet_profile||[]}));}
 window.PawpalOrderV1={history,rows,products,orders,cached,cacheKey,
  customers:(options={})=>cached('customers:detail:'+options.id,()=>customers(options),{ttlMs:30000,...options}),
  searchCustomers:query=>cached('customers:search:'+query,async()=>{const {data,error}=await db().rpc('search_admin_sales_customers',{p_query:query});if(error)throw error;return data;},{ttlMs:30000}),
  searchVariants:query=>cached('products:search:'+query,async()=>{const {data,error}=await db().rpc('search_admin_sales_variants',{p_query:query});if(error)throw error;return data;},{ttlMs:30000}),
  inventoryChoices:()=>cached('products:inventory',async()=>{const {data,error}=await db().rpc('get_admin_sales_inventory_choices');if(error)throw error;return data;}),
  stockLogPage:(productId,page=1,options)=>cached('stock-logs:'+productId+':'+page,async()=>{const {data,error}=await db().rpc('get_admin_sales_stock_history_page',{p_product_id:productId,p_page:page});if(error)throw error;if(!data||!Array.isArray(data.rows)||data.rows.length>10)throw Error('invalid_stock_history_page');return data;},options),one,net};
})();

;

// orders.js - Core Orchestrator cho Phân hệ Quản lý Bán hàng Pawpal-er
(function() {
    'use strict';

    // ====================================================================
    // CHUẨN HÓA HÀM THỜI GIAN VÀ TIỀN TỆ TOÀN PHÂN HỆ
    // ====================================================================
    const formatDateTime = window.formatDateTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    const formatDate = window.formatDate || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    const formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    function formatVND(amount) {
        return (amount || 0).toLocaleString('vi-VN') + ' đ';
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toUnaccent(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
            .toLowerCase()
            .trim();
    }

    function matchSearch(sourceText, searchTerm) {
        if (!searchTerm) return true;
        if (!sourceText) return false;
        const src = String(sourceText).toLowerCase();
        const query = String(searchTerm).toLowerCase().trim();
        if (src.includes(query)) return true;
        return toUnaccent(sourceText).includes(toUnaccent(searchTerm));
    }

    // ====================================================================
    // DATA STORE 100% TRỰC TIẾP TỪ SUPABASE LIVE DATABASE (RULE 6)
    // ====================================================================
    function getSharedVouchersList() {
        return window.PawpalOrders?.state?.vouchers || [];
    }

    function persistSharedVouchersData(vouchers) {
        if (window.PawpalOrders?.state) window.PawpalOrders.state.vouchers = vouchers || [];

    }

    let currentProductsList = [];
    function persistProductsData() { /* Business state is reloaded from Supabase. */ }

    let currentStockLogsList = [];
    function persistStockLogsData() { /* Business state is reloaded from Supabase. */ }

    let currentOrdersList = [];
    function persistOrdersData() { /* Business state is reloaded from Supabase. */ }

    // Toast thông báo chuẩn hệ thống
    function showToast(msg, type = 'success') {
        let toast = document.getElementById('adminGlobalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'adminGlobalToast';
            document.body.appendChild(toast);
        }
        const isAlert = type === 'warning' || type === 'error' || type === 'danger';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background-color: ${isAlert ? '#8F2424' : '#236B48'};
            color: #FFFFFF;
            padding: 12px 20px;
            border-radius: var(--admin-radius);
            font-size: 13.5px;
            font-weight: 500;
            box-shadow: 0 8px 24px rgba(26, 43, 35, 0.2);
            z-index: 99999;
            display: block;
        `;
        toast.textContent = msg;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.display = 'none';
        }, 2500);
    }

    // Modal xác nhận thao tác
    function showOrderConfirmModal({ title = 'Xác nhận thao tác', message = 'Bạn có chắc chắn muốn thực hiện thao tác này?', acceptText = 'Đồng ý', onAccept }) {
        const modal = document.getElementById('modalConfirmOrderAction');
        const titleEl = document.getElementById('confirmOrderActionTitle');
        const msgEl = document.getElementById('confirmOrderActionMessage');
        const btnAccept = document.getElementById('btnAcceptOrderConfirm');

        if (!modal) {
            if (typeof onAccept === 'function') onAccept();
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btnAccept) btnAccept.textContent = acceptText;

        const closeModal = () => {
            modal.classList.remove('active');
            if (btnAccept) btnAccept.onclick = null;
        };

        if (btnAccept) {
            btnAccept.onclick = () => {
                closeModal();
                if (typeof onAccept === 'function') onAccept();
            };
        }

        modal.classList.add('active');
    }

    // Tạo HTML phiếu đóng gói và bảng kê vận chuyển
    function getOrderSlaInfo(order) {
        if (!order || !order.createdAt) {
            return { level: 'normal', badgeClass: '', label: '--', isSlaOverdue: false };
        }
        const createdMs = new Date(order.createdAt).getTime();
        const nowMs = Date.now();
        const diffMinutes = Math.floor((nowMs - createdMs) / 60000);

        if (order.status === 'pending') {
            if (diffMinutes > 30) {
                return {
                    level: 'danger',
                    badgeClass: 'badge-danger',
                    label: `Quá hạn tiếp nhận (${diffMinutes}p)`,
                    isSlaOverdue: true
                };
            }
            if (diffMinutes >= 15) {
                return {
                    level: 'warning',
                    badgeClass: 'badge-warning',
                    label: `Cần tiếp nhận gấp (${diffMinutes}p)`,
                    isSlaOverdue: false
                };
            }
            return {
                level: 'normal',
                badgeClass: 'badge-neutral',
                label: `Mới đặt (${diffMinutes}p)`,
                isSlaOverdue: false
            };
        }

        if (order.status === 'confirmed') {
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours >= 4) {
                return {
                    level: 'warning',
                    badgeClass: 'badge-warning',
                    label: `Chờ đóng gói (${diffHours}h)`,
                    isSlaOverdue: false
                };
            }
        }

        if (order.status === 'returned' || order.alertType === 'danger') {
            return {
                level: 'danger',
                badgeClass: 'badge-danger',
                label: 'Có khiếu nại / Đổi trả',
                isSlaOverdue: false
            };
        }

        return {
            level: 'normal',
            badgeClass: '',
            label: '--',
            isSlaOverdue: false
        };
    }

    // ====================================================================
    // GLOBAL NAMESPACE: WINDOW.PAWPALORDERS
    // ====================================================================
    window.PawpalOrders = {
        state: {
            orders: currentOrdersList,
            products: currentProductsList,
            stockLogs: currentStockLogsList,
            selectedOrderId: sessionStorage.getItem('pawpal_admin_order_selected_id') || sessionStorage.getItem('pawpal_admin_order_id') || null,
            selectedBatchOrderIds: [],
            activeActionOrderId: null,
            activeAdjustProductSku: null,
            activeStockActionSku: null,
            activeGrnItems: [],
            activeActionVoucherCode: null
        },
        helpers: {
            formatVND,
            formatDateTime,
            formatDate,
            formatTime,
            toUnaccent,
            matchSearch,
            showToast,
            showOrderConfirmModal,


            getOrderSlaInfo,
            getSharedVouchersList,
            persistSharedVouchersData,
            persistProductsData,
            persistStockLogsData,
            persistOrdersData,
            syncOrdersAndProductsFromSupabase
        },
        controllers: {
            list: null,
            detail: null,
            products: null,
            promos: null
        },
        renderOrdersTable: function() {
            if (this.controllers.list?.renderOrdersTable) {
                this.controllers.list.renderOrdersTable();
            }
        },
        renderOrderDetail: function(id) {
            if (this.controllers.detail?.renderOrderDetail) {
                this.controllers.detail.renderOrderDetail(id);
            }
        },
        renderProductsTable: function() {
            if (this.controllers.products?.renderProductsTable) {
                this.controllers.products.renderProductsTable();
            }
        },
        renderVouchersTable: function() {
            if (this.controllers.promos?.renderVouchersTable) {
                this.controllers.promos.renderVouchersTable();
            }
        },
        updateCategoryFilterDropdown: function(cats) {
            if (this.controllers.products?.updateCategoryFilterDropdown) {
                this.controllers.products.updateCategoryFilterDropdown(cats);
            }
        },
        switchSubtab: function(targetSubtab, updateHistory = true) {
            switchSubtab(targetSubtab, updateHistory);
        }
    };

    // Đồng bộ Supabase Live Database qua PawpalDataStore
    let productsReadVersion=0;
    window.PawpalOrders.state.serverProductPagination=true;
    async function fetchProductsData({force=false,filters,page,render=true}={}){
        const state=window.PawpalOrders.state;
        if(force){window.PawpalDataStore?.invalidate('orders:products*');window.PawpalDataStore?.invalidate('orders:stock-logs*');}
        filters=filters||state.productFilters||{query:'',category:'ALL',stock:'ALL'};
        page=page||state.productPageMeta?.page||Number(sessionStorage.getItem('pawpal_admin_products_page'))||1;
        state.productFilters=filters;const version=++productsReadVersion;
        try{
            const result=await window.PawpalOrderV1.cached('products:page:'+JSON.stringify({filters,page}),async()=>{
                const {data,error}=await window.getSupabaseClient().rpc('get_admin_sales_product_page',{p_query:filters.query,p_category:filters.category,p_stock:filters.stock,p_page:page});
                if(error)throw error;
                if(!data||!Array.isArray(data.ids)||data.ids.length>10)throw Error('invalid_catalog_page');
                return {...await window.PawpalOrderV1.products({ids:data.ids,ratings:data.ratings}),meta:data};
            },{force});
            if(version!==productsReadVersion)return null;
            currentProductsList=result.products;
            Object.assign(state,{products:result.products,categories:result.categories,productPageMeta:result.meta,productsLoaded:true,productsError:false});
            window.PawpalOrders.updateCategoryFilterDropdown(result.categories);
        }catch(error){if(version!==productsReadVersion)return null;state.productsError=true;console.warn('[Orders V1] Products:',error);}
        if(render)window.PawpalOrders.controllers.products?.renderProductsTable({skipFetch:true});
        return !state.productsError;
    }

    window.PawpalOrders.ensureProduct=async sku=>{
        const state=window.PawpalOrders.state,product=state.products.find(p=>p.sku===sku);
        if(!product)return null;
        const result=await window.PawpalOrderV1.cached('products:detail:'+product.id,()=>window.PawpalOrderV1.products({ids:[product.id],detail:true,ratings:[{id:product.id,rating:product.rating,count:product.reviewCount}]}));
        const full=result.products[0];
        if(full)state.products=state.products.map(p=>p.id===full.id?full:p);
        return full||null;
    };

    async function fetchVouchersData({ force = false } = {}) {
        const fetcher = async () => {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu');
            const [data, usage] = await Promise.all([
                window.PawpalOrderV1.rows(() => client.from('voucher').select('*').order('id')),
                window.PawpalOrderV1.rows(() => client.from('voucher_redemption').select('id,voucher_id,status').eq('status','applied').order('id'))
            ]);
            return data.map(v => ({...v, used:usage.filter(r => r.voucher_id===v.id).length}));
        };

        try {
            let voucherData;
            if (window.PawpalDataStore) {
                voucherData = await window.PawpalDataStore.fetch('orders:vouchers', fetcher, {
                    ttlMs: window.PawpalDataStore.TTL_TIERS.CATALOG,
                    force
                });
            } else {
                voucherData = await fetcher();
            }

            const vouchersList = (voucherData || []).map(v => {
                const isPct = String(v.type || '').toLowerCase().includes('phan_tram') || v.type === 'percentage' || v.type === 'percent';
                const rawDiscount = Number(v.discount_value) || 0;
                const safeDiscount = isPct ? Math.min(100, Math.max(0, rawDiscount)) : Math.max(0, rawDiscount);
                const discountVal = isPct ? `${safeDiscount}%` : formatVND(safeDiscount);
                let expFormatted = 'Không giới hạn';
                if (v.end_date) {
                    const expD = new Date(v.end_date);
                    if (!isNaN(expD.getTime())) {
                        expFormatted = `${String(expD.getDate()).padStart(2, '0')}/${String(expD.getMonth() + 1).padStart(2, '0')}/${expD.getFullYear()}`;
                    }
                }
                return {
                    code: String(v.voucher_code || '').trim().replace(/[^A-Za-z0-9_-]/g, ''),
                    dbCode: v.voucher_code,
                    name: v.voucher_name || v.description,
                    title: v.voucher_name || v.description,
                    type: isPct ? 'percent' : 'fixed',
                    target: v.applicable_for,
                    value: safeDiscount,
                    discount: discountVal,
                    minOrder: Math.max(0, Number(v.minimum_order_amount) || 0),
                    points: Math.max(0, Number(v.required_points) || 0),
                    startsAt: v.start_date,
                    endsAt: v.end_date,
                    validDate: expFormatted,
                    expiry: expFormatted,
                    limit: (v.max_usage !== null && v.max_usage !== undefined) ? Number(v.max_usage) : null,
                    used: v.used,
                    id: v.id, updatedAt: v.updated_at, raw:v,
                    status: v.end_date && v.end_date < new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Ho_Chi_Minh'}) ? 'expired' : (v.is_active ? 'active' : 'paused')
                };
            });
            window.PawpalOrders.state.vouchersLoaded = true;
            window.PawpalOrders.state.vouchersError = false;
            persistSharedVouchersData(vouchersList);
            window.PawpalOrders.renderVouchersTable();
            return vouchersList;
        } catch (err) {
            console.warn('[Orders Core] Lỗi khi nạp voucher:', err);
            window.PawpalOrders.state.vouchersError = true;
            window.PawpalOrders.renderVouchersTable();
            return [];
        }
    }

    let ordersReadVersion = 0;
    const defaultOrderFilters = {query:'',status:'ALL',payment:'ALL',payStatus:'ALL',complaint:false,urgent:false,overdue:false};
    window.PawpalOrders.state.serverPagination = true;
    async function ensureOrder(id,{force=false}={}) {
        if(!id)return null;
        const found=window.PawpalOrders.state.orders.find(o=>o.id===id||o.rawId===id);
        if(found&&window.PawpalOrders.state.pageOrders?.some(o=>o.rawId===found.rawId)){
            if(force||!found.historyLoaded){found.timeline=await window.PawpalOrderV1.history(found.rawId);found.historyLoaded=true;}
            return found;
        }
        const rows=await window.PawpalOrderV1.cached('list:detail:'+id,()=>window.PawpalOrderV1.orders({id}),{force});
        const order=rows[0];
        if(order){order.timeline=await window.PawpalOrderV1.history(order.rawId);order.historyLoaded=true;}
        if(order)window.PawpalOrders.state.orders=[...window.PawpalOrders.state.orders.filter(o=>o.rawId!==order.rawId),order];
        else window.PawpalOrders.state.orders=window.PawpalOrders.state.orders.filter(o=>o.id!==id&&o.rawId!==id);
        return order||null;
    }
    window.PawpalOrders.ensureOrder=ensureOrder;
    window.PawpalOrders.refreshSelectedOrders=async selected=>{
        const state=window.PawpalOrders.state;
        const wanted=new Set(selected||state.selectedBatchOrderIds||[]);
        const ids=state.orders.filter(o=>wanted.has(o.id)).map(o=>o.rawId);
        if(ids.length!==wanted.size||ids.length>100)throw Error('sales_order_not_found');
        const rows=await window.PawpalOrderV1.orders({ids});
        if(rows.length!==ids.length)throw Error('sales_order_not_found');
        state.orders=[...state.orders.filter(o=>!wanted.has(o.id)),...rows];
        return rows;
    };
    async function fetchOrdersData({ force = false, filters, page, render = true } = {}) {
        if (force) {
            window.PawpalDataStore?.invalidate('orders:list*');
            window.PawpalDataStore?.invalidate('orders:customers*');
        }
        const state=window.PawpalOrders.state;
        filters={...defaultOrderFilters,...(filters||state.orderFilters||{})};
        page=page||state.orderPageMeta?.page||Number(sessionStorage.getItem('pawpal_admin_orders_page'))||1;
        const version=++ordersReadVersion;
        state.orderFilters=filters;
        try {
            const result=await window.PawpalOrderV1.cached('list:page:'+JSON.stringify({filters,page}),async()=>{
                const {data,error}=await window.getSupabaseClient().rpc('get_admin_sales_order_page',{p_filters:filters,p_page:page});
                if(error)throw error;
                if(!data||!Array.isArray(data.ids)||data.ids.length>10)throw Error('invalid_sales_page');
                const rows=await window.PawpalOrderV1.orders({ids:data.ids});
                const byId=new Map(rows.map(row=>[row.rawId,row]));
                return {meta:data,rows:data.ids.map(id=>byId.get(id)).filter(Boolean)};
            },{force});
            if(version!==ordersReadVersion)return false;
            const retained=new Set([...(state.selectedBatchOrderIds||[]),state.selectedOrderId].filter(Boolean));
            const pageIds=new Set(result.rows.map(o=>o.id));
            currentOrdersList=[...state.orders.filter(o=>retained.has(o.id)&&!pageIds.has(o.id)),...result.rows];
            Object.assign(state,{orders:currentOrdersList,pageOrders:result.rows,orderPageMeta:result.meta,ordersLoaded:true,ordersError:false});
            if(state.selectedOrderId)await ensureOrder(state.selectedOrderId,{force});
            if(version!==ordersReadVersion)return false;
        } catch (err) {
            if(version!==ordersReadVersion)return false;
            Object.assign(state,{pageOrders:[],ordersError:true});
            console.warn('[Orders V1] Orders:', err);
        }
        if(render)window.PawpalOrders.controllers.list?.renderOrdersTable({skipFetch:true});
        if(state.selectedOrderId)window.PawpalOrders.renderOrderDetail(state.selectedOrderId);
        return !state.ordersError;
    }

    window.PawpalOrders.fetchProductsData = fetchProductsData;
    window.PawpalOrders.fetchVouchersData = fetchVouchersData;
    window.PawpalOrders.fetchOrdersData = fetchOrdersData;

    async function syncOrdersAndProductsFromSupabase({ force = false, resources = ['list', 'products', 'vouchers'] } = {}) {
        const selected = new Set(resources);
        if (force) {
            window.PawpalDataStore?.invalidate('orders:stock-logs*');
            window.PawpalDataStore?.invalidate('orders:customers*');
        }
        await Promise.allSettled([
            selected.has('list') ? fetchOrdersData({ force }) : null,
            selected.has('products') ? fetchProductsData({ force }) : null,
            selected.has('vouchers') ? fetchVouchersData({ force }) : null
        ]);
        console.log(`[Orders Core] Đã đồng bộ từ Supabase: ${currentOrdersList.length} đơn hàng, ${currentProductsList.length} sản phẩm.`);
    }

    // Lắng nghe mutation liên phân hệ
    if (window.PawpalDataStore) {
        window.PawpalDataStore.subscribeMutations((mutation) => {
            if (mutation.entity === 'sales_order') {
                window.PawpalDataStore.invalidate('orders:list*');
            } else if (mutation.entity === 'product' || mutation.entity === 'inventory' || mutation.entity === 'inventory_log') {
                window.PawpalDataStore.invalidate('orders:products*');
                window.PawpalDataStore.invalidate('orders:stock-logs*');
            } else if (['customer','customer_profile','customer_phone','customer_address','customer_membership','customer_point_balance'].includes(mutation.entity)) {
                window.PawpalDataStore.invalidate('orders:customers*');
            } else if (mutation.entity === 'voucher') {
                window.PawpalDataStore.invalidate('orders:vouchers*');
            }
        });
    }

    // Điều hướng Subtab
    function updateBreadcrumb(orderId) {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (orderId) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${escapeHtml(orderId)}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }

    function switchSubtab(targetSubtab, updateHistory = true) {
        const validTabs = ['tab-order-list', 'tab-order-detail', 'tab-order-products', 'tab-order-promos'];
        if (!validTabs.includes(targetSubtab)) {
            targetSubtab = 'tab-order-list';
        }

        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Bán hàng') return;
        const root = document.getElementById('subtab-tab-order-list')?.closest('.admin-module-wrapper');
        const subtabPanels = root?.querySelectorAll('.subtab-content') || [];

        headerSubtabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
        });

        let matched = false;
        subtabPanels.forEach(panel => {
            const isMatch = panel.id === `subtab-${targetSubtab}`;
            panel.classList.toggle('active', isMatch);
            if (isMatch) matched = true;
        });

        if (!matched && subtabPanels.length > 0) {
            subtabPanels[0].classList.add('active');
            targetSubtab = validTabs[0];
        }

        if (targetSubtab === 'tab-order-detail') {
            const targetId = window.PawpalOrders.state.selectedOrderId || sessionStorage.getItem('pawpal_admin_order_selected_id') || null;
            window.PawpalOrders.state.selectedOrderId = targetId;
            ensureOrder(targetId).then(()=>{if(window.PawpalOrders.state.selectedOrderId!==targetId)return;window.PawpalOrders.state.ordersLoaded=true;window.PawpalOrders.renderOrderDetail(targetId);}).catch(()=>{window.PawpalOrders.state.ordersError=true;window.PawpalOrders.renderOrderDetail(targetId);});
            updateBreadcrumb(targetId || '');
        } else {
            updateBreadcrumb('');
            if (targetSubtab === 'tab-order-list') {
                fetchOrdersData();
            } else if (targetSubtab === 'tab-order-products') {
                fetchProductsData();
            } else if (targetSubtab === 'tab-order-promos') {
                fetchVouchersData();
            }
        }

        sessionStorage.setItem('pawpal_admin_order_subtab', targetSubtab);
        if (updateHistory) {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.pushState(null, '', '#' + targetSubtab);
                } catch (e) {
                    window.location.hash = targetSubtab;
                }
            }
        } else {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.replaceState(null, '', '#' + targetSubtab);
                } catch (e) {}
            }
        }
    }

    function initOrdersModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        const validTabs = ['tab-order-list', 'tab-order-detail', 'tab-order-products', 'tab-order-promos'];

        // Khôi phục subtab từ hash hoặc sessionStorage
        const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
        const savedTab = sessionStorage.getItem('pawpal_admin_order_subtab') || 'tab-order-list';
        const targetTab = validTabs.includes(currentHash) ? currentHash : (validTabs.includes(savedTab) ? savedTab : 'tab-order-list');

        switchSubtab(targetTab, false);

        // Lắng nghe sự kiện chuyển subtab từ router cha
        window.addEventListener('admin:subtab-change', (e) => {
            if (e.detail?.module === 'Bán hàng' && validTabs.includes(e.detail.tabId)) {
                switchSubtab(e.detail.tabId, false);
            }
        });

        setupOrdersRealtimeSync();
        // Only hydrate the restored workspace; POS loads its own catalog on demand.
        const resource = targetTab === 'tab-order-products' ? 'products' : targetTab === 'tab-order-promos' ? 'vouchers' : 'list';
        syncOrdersAndProductsFromSupabase({resources:[resource]});

        // Hỗ trợ kiểm thử tự động cho modal17
        if (window.location.search.includes('v=modal17')) {
            setTimeout(() => {
                showOrderConfirmModal({
                    title: 'Xác nhận thao tác',
                    message: 'Bạn có chắc chắn muốn thực hiện thao tác này không? Hành động này sẽ được ghi nhận vào nhật ký hệ thống.',
                    acceptText: 'Đồng ý'
                });
            }, 600);
        }
    }

    let _ordersRealtimeChannel = null;
    function setupOrdersRealtimeSync() {
        if (_ordersRealtimeChannel) return;
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client || typeof client.channel !== 'function') return;

        try {
            const dirty = new Set();
            let fallbackTimer;
            const flush = async () => {
                const resources = [...dirty].filter(resource => window.PawpalOrders.state[resource === 'list' ? 'ordersLoaded' : resource+'Loaded']);
                dirty.clear();
                if (resources.length) await syncOrdersAndProductsFromSupabase({resources});
            };
            const triggerOrderSync = table => {
                const groups = new Set();
                if (['sales_order','sales_order_detail','payment','refund_transaction','return_request','return_request_detail','shipping_provider','customer_profile','customer_phone'].includes(table)) groups.add('list');
                if (['product','product_variant','product_media','product_variant_media','product_category','inventory','inventory_transaction','stock_reservation','review','review_response','review_media','variant_color','variant_size','variant_flavor'].includes(table)) groups.add('products');
                if (['voucher','voucher_redemption'].includes(table)) groups.add('vouchers');
                if (table === 'voucher_redemption') groups.add('list');
                if (['customer','pet_profile','customer_profile','customer_phone','customer_address','customer_membership','membership_tier','paw_point_transaction'].includes(table)) window.PawpalDataStore?.invalidate('orders:customers*');
                if (['review','review_response','review_media'].includes(table)) window.PawpalDataStore?.invalidate('orders:reviews*');
                if (table === 'inventory_transaction') window.PawpalDataStore?.invalidate('orders:stock-logs*');
                if (table === 'product_category') window.PawpalDataStore?.invalidate('orders:categories*');
                for (const resource of groups) {
                    dirty.add(resource);
                    window.PawpalDataStore?.invalidate('orders:'+resource+'*');
                }
                if (!groups.size) return;
                if (window.PawpalDataStore?.handleRealtimeChange) {
                    window.PawpalDataStore.handleRealtimeChange({
                        moduleName: 'Bán hàng', onActiveRefresh: flush, debounceMs: 400
                    });
                } else if (sessionStorage.getItem('pawpal_admin_active_module') === 'Bán hàng' && !document.hidden) {
                    clearTimeout(fallbackTimer);
                    fallbackTimer = setTimeout(flush, 400);
                }
            };

            _ordersRealtimeChannel = client.channel('admin-orders-live-sync');
            for (const table of ['sales_order','sales_order_detail','product','product_variant','product_media','product_variant_media','product_category','inventory','inventory_transaction','stock_reservation','voucher','voucher_redemption','payment','refund_transaction','return_request','return_request_detail','review','review_response','review_media','customer','pet_profile','customer_profile','customer_phone','customer_address','customer_membership','membership_tier','variant_color','variant_size','variant_flavor','shipping_provider','paw_point_transaction']) {
                _ordersRealtimeChannel.on('postgres_changes', {event:'*',schema:'public',table}, () => triggerOrderSync(table));
            }
            _ordersRealtimeChannel.subscribe();

            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin-orders-live-sync');

            window.addEventListener('beforeunload', () => {
                if (_ordersRealtimeChannel) {
                    client.removeChannel(_ordersRealtimeChannel);
                    window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin-orders-live-sync');
                }
            });
        } catch (e) {
            console.warn('[Orders] Lỗi mở kênh realtime:', e);
        }
    }

    // Export bridge cho window.PawpalOrdersModule
    window.PawpalOrdersModule = window.PawpalOrdersModule || {};
    window.PawpalOrdersModule.switchSubtab = switchSubtab;
    window.PawpalOrdersModule.syncOrdersAndProductsFromSupabase = syncOrdersAndProductsFromSupabase;
    window.PawpalOrdersModule.loadOrdersData = syncOrdersAndProductsFromSupabase;
    window.PawpalOrdersModule.showOrderConfirmModal = showOrderConfirmModal;
    window.PawpalOrdersModule.escapeHtml = escapeHtml;

    // Tự động khởi tạo sau khi tất cả script subtab nạp xong
    setTimeout(() => {
        initOrdersModule();
    }, 50);
})();

})();
