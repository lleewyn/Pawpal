async(page)=>{
 const groups={
  A:[
   {id:'G01',name:'Cửa hàng',steps:[['PawPal ở đâu?',['120','Minh Khai','1900']],['Mo cua may gio?',['08:00','20:00','21:00']]]},
   {id:'G02',name:'Dịch vụ và hỏi tiếp',steps:[['Có tắm cho mèo không?',['đ']],['Bé 7kg',['kg']],['Giá bao nhiêu?',['kg','đã lọc']]]},
   {id:'G03',name:'Hotel và giới hạn VIP',steps:[['So sánh Hotel thường và VIP',['Standard','VIP']],['Bé 7kg',['Standard','VIP']]]},
   {id:'G04',name:'Taxi',steps:[['Taxi bé 7kg đi 3km',['km','kg','phụ phí']]]},
   {id:'G05',name:'Giá tắm/cắt tỉa',steps:[['Gia tam be 7kg',['kg','đ']],['Giá cắt tỉa bé 7kg',['kg','đ']]]},
   {id:'G06',name:'Sản phẩm và hàng công khai',steps:[['Sản phẩm TP-HAT-01-V1',['TP-HAT-01-V1','hàng']],['Còn hàng không?',['TP-HAT-01-V1','hàng']],['So sánh sản phẩm TP-HAT-01-V1 và TP-HAT-01-V2',['TP-HAT-01-V1','TP-HAT-01-V2']]]},
   {id:'G07',name:'Không bịa lịch/phòng trống',steps:[['Hotel còn phòng mai không?',['chưa xác nhận','bước đặt']],['Mai còn giờ tắm nào?',['chưa xác nhận','bước đặt']]]}
  ],
  B:[
   {id:'G08',name:'Đặt lịch guest',steps:[['Không đăng nhập đặt lịch được không?',['không bắt buộc','đặt']],['Đặt cho hai bé thế nào?',['từng bé']]]},
   {id:'G09',name:'Mua hàng guest',steps:[['Không có tài khoản mua hàng được không?',['không phải tạo tài khoản']],['Thanh toán bằng cách nào?',['thanh toán']]]},
   {id:'G10',name:'Giao nhận/đổi trả/hủy',steps:[['Phí giao hàng bao nhiêu?',['phí']],['Tôi muốn đổi trả hàng',['đổi trả']],['Hủy lịch thế nào?',['hủy']]]},
   {id:'G11',name:'Điểm và ưu đãi công khai',steps:[['Paw Points là gì?',['điểm']],['Cần bao nhiêu điểm để lên hạng?',['chưa có bảng ngưỡng']],['Có khuyến mãi không?',['chương trình']]]},
   {id:'G12',name:'Chuẩn bị/an toàn',steps:[['Bé bị dị ứng cần chuẩn bị gì?',['dị ứng','nhân viên']]]},
   {id:'G13',name:'Tra cứu/khôi phục',steps:[['Cách tra cứu đơn guest',['xác minh']],['Không nhận được mã đơn thì làm sao?',['khôi phục']]]}
  ]
 };
 groups.C=[groups.A.find(g=>g.id==='G05'),groups.B.find(g=>g.id==='G13'),{id:'G15',name:'Phân biệt loại mã',steps:[['Không nhận được OTP thì sao?',['OTP','không gửi']],['Chưa nhận được mã xác thực',['OTP']],['Không nhận được mã thì sao?',['loại mã']]]}];
 if(!page)return groups;
 const batch=new URL(page.url()).searchParams.get('phase2Batch')||'A';
 if(!groups[batch])throw Error('Unknown phase2 batch');
 const context=await page.context().browser().newContext({viewport:{width:1280,height:900}}),p=await context.newPage();
 const checks=[],networkErrors=[],jsErrors=[],calls=[];
 p.on('pageerror',e=>jsErrors.push(e.message));
 p.on('response',r=>{if(new URL(r.url()).pathname==='/api/admin-chat'&&r.status()>=400)networkErrors.push({status:r.status()});});
 p.on('request',r=>{if(new URL(r.url()).pathname==='/api/admin-chat')try{calls.push(JSON.parse(r.postData()||'{}').action);}catch{}});
 try{
  await p.goto('http://localhost:4000/',{waitUntil:'domcontentloaded'});
  await p.locator('#fabAiBtn').click();await p.locator('.fab-chat-welcome').waitFor({state:'visible',timeout:15000});
  for(const group of groups[batch]){
   await p.locator('#fabChatNewBtn').click();
   for(const [question,needles]of group.steps){
    try{
     const before=await p.locator('.fab-message-content').count();await p.locator('#fabChatInput').fill(question);
     const [response]=await Promise.all([
      p.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin-chat'&&r.request().method()==='POST'&&JSON.parse(r.request().postData()||'{}').action==='public_send',{timeout:35000}),
      question==='Mo cua may gio?'?p.locator('#fabChatInput').press('Enter'):p.locator('#fabChatSend').click()
     ]);
     const data=await response.json();if(!response.ok()||!data.ok)throw Error('Send HTTP '+response.status()+': '+data.error);
     await p.waitForFunction(n=>document.querySelectorAll('.fab-message-content').length>n+1,before,{timeout:20000});
     await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled,null,{timeout:10000});
     for(let i=0;i<4;i++){
      const more=p.locator('.fab-chat-bubble--bot').last().getByRole('button',{name:'Đọc tiếp tin nhắn',exact:true});if(!await more.isVisible())break;
      await more.click();await p.waitForFunction(()=>![...document.querySelectorAll('.fab-chat-bubble--bot button')].some(b=>b.textContent==='Đọc tiếp tin nhắn'&&b.disabled),null,{timeout:10000});
     }
     const reply=await p.locator('.fab-message-content').last().innerText();
     const missing=needles.filter(s=>!reply.toLocaleLowerCase('vi').includes(s.toLocaleLowerCase('vi')));
     const technical=/vượt phần chat|giới hạn đoạn trích|search_public_chat|invalid_guest|SECURITY INVOKER/.test(reply);
     const links=await p.locator('.fab-chat-bubble--bot').last().locator('a').evaluateAll(as=>as.map(a=>({text:a.textContent,path:a.getAttribute('href'),origin:new URL(a.href).origin})));
     const safe=links.every(a=>a.origin==='http://localhost:4000'&&/^\/(booking|shop|services|return-guest|contact|product-detail)/.test(a.path));
     checks.push({group:group.id,name:group.name,question,status:response.status(),pass:missing.length===0&&!technical&&safe,missing,reply,links,sendEnabled:await p.locator('#fabChatSend').isEnabled(),handoverEnabled:await p.locator('#fabHandoverBtn').isEnabled()});
    }catch(e){checks.push({group:group.id,name:group.name,question,pass:false,error:e.message});}
    // Sequential pacing keeps the real public endpoint under its shared IP limit.
    await p.waitForTimeout(1400);
   }
  }
  const dimensions=[];for(const width of [1280,768,390]){await p.setViewportSize({width,height:900});dimensions.push(await p.locator('#fabChatPanel').evaluate(e=>{const r=e.getBoundingClientRect();return {viewport:innerWidth,left:r.left,right:r.right,width:r.width,pass:r.left>=-1&&r.right<=innerWidth+1}}));}
  return {batch,checks,dimensions,networkErrors,jsErrors,apiCalls:calls.length,actions:calls.reduce((o,a)=>(o[a]=(o[a]||0)+1,o),{})};
 }finally{await context.close();}
}
