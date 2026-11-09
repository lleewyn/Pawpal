import {showGuestRecoveryCode} from './guest-recovery.mjs';
const node=(tag,text,className='')=>{const element=document.createElement(tag);element.className=className;if(text!=null)element.textContent=text;return element;};
export function renderTransactionReceipt(root,{title,status,code,codeLabel,details=[],lines=[],notice,lookupHref,lookupLabel,againLabel,onAgain,activationTarget,recoveryCode,activationMessage}){
 const card=node('article',null,'transaction-receipt');
 const intro=node('header',null,'receipt-intro');
 intro.append(node('span',status,'receipt-status'),node('p','Cảm ơn bạn đã chọn PawPal','receipt-eyebrow'));
 const heading=node('h1',title);heading.id='bookingReceiptTitle';heading.tabIndex=-1;intro.append(heading);
 intro.append(node('p',notice,'receipt-message'));card.append(intro);
 const content=node('div',null,'receipt-content'),reference=node('div',null,'receipt-reference');
 reference.append(node('span',codeLabel),node('strong',code));content.append(reference);
 const summary=node('dl',null,'receipt-summary');
 for(const [label,value] of details){const row=node('div');row.append(node('dt',label),node('dd',value));summary.append(row);}content.append(summary);
 if(lines.length){const products=node('div',null,'receipt-products');products.append(node('h2','Sản phẩm trong đơn'));for(const line of lines){const row=node('div',null,'receipt-product');row.append(node('span',line.name),node('span','× '+line.quantity));products.append(row);}content.append(products);}
 const actions=node('div',null,'receipt-actions');
 const lookup=node('a',lookupLabel,'receipt-button receipt-button-primary');lookup.href=lookupHref;
 const again=node('button',againLabel,'receipt-button receipt-button-secondary');again.type='button';again.onclick=onAgain;
 actions.append(lookup,again);content.append(actions);
 const activate=node('section',null,'receipt-activate'),copy=node('div');
 copy.append(node('h2','Thiết lập tài khoản của bạn'),node('p',activationMessage||'Thiết lập mật khẩu để lưu hồ sơ bé, theo dõi giao dịch và sử dụng điểm thưởng.'));
 const link=node('a','Thiết lập mật khẩu','receipt-button receipt-button-activate');link.href='/login?'+new URLSearchParams({action:'guest-activate',redirect:activationTarget});activate.append(copy,link);content.append(activate);
 if(typeof recoveryCode==='string'&&recoveryCode.startsWith('r1.')){const recovery=node('details',null,'receipt-recovery');recovery.append(node('summary','Lưu mã tra cứu riêng'));showGuestRecoveryCode(recovery,recoveryCode);content.append(recovery);}
 const home=node('a','Về trang chủ','receipt-home');home.href='/';content.append(home);card.append(content);root.replaceChildren(card);
 return card;
}
