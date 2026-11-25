import {showGuestRecoveryCode} from './guest-recovery.mjs';
import {demoActivationLink} from './guest-activation-demo.mjs';
const node=(tag,text,className='')=>{const element=document.createElement(tag);element.className=className;if(text!=null)element.textContent=text;return element;};
export function renderTransactionReceipt(root,{title,status,code,codeLabel,details=[],lines=[],notice,lookupHref,lookupLabel,againLabel,onAgain,activationTarget,recoveryCode,activationMessage,activationCreatedAt}){
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
 const demo=demoActivationLink(activationCreatedAt,activationTarget);
 const link=node('a','Thiết lập mật khẩu','receipt-button receipt-button-activate');link.href=demo?.href||'/login?'+new URLSearchParams({action:'guest-activate',redirect:activationTarget});activate.append(copy,link);content.append(activate);
 if(demo){
  const simulation=node('section',null,'receipt-recovery receipt-activation-demo');
  simulation.append(node('h2','SMS chào mừng giả lập'),node('p','PawPal đã tạo tài khoản tạm cho bạn. Thiết lập mật khẩu để nhận 50 Paw Points chào mừng. Không gửi SMS thật.'));
  simulation.append(node('p','Link có hiệu lực 48 giờ kể từ khi đặt lịch, đến '+new Date(demo.expiresAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+'.'));
  const preview=node('a',demo.expired?'Link giả lập đã hết hạn':'Mở link thiết lập mật khẩu giả lập','receipt-home');preview.href=demo.href;simulation.append(preview);content.append(simulation);
 }
 if(typeof recoveryCode==='string'&&recoveryCode.startsWith('r1.')){const recovery=node('details',null,'receipt-recovery');recovery.append(node('summary','Lưu mã tra cứu riêng'));showGuestRecoveryCode(recovery,recoveryCode);content.append(recovery);}
 const home=node('a','Về trang chủ','receipt-home');home.href='/';content.append(home);card.append(content);root.replaceChildren(card);
 return card;
}
