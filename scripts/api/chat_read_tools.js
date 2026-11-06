// Closed registry: question text never supplies an RPC name, column or SQL.
const definitions={
 'appointment.list':{keys:['start_at','end_at','category','status'],permissions:['appointment.read','appointment_item.read','service.read','service_category.read'],date:true,rows:20,target:'#tab-service-bookings'},
 'inventory.low_stock':{keys:['query'],permissions:['inventory.read','product_variant.read','product.read'],rows:20,target:'#tab-order-products'},
 'ticket.open':{keys:['start_at','end_at'],permissions:['support_ticket.read'],rows:20,target:null},
 'customer.lookup':{keys:['query'],permissions:['customer.read','customer_profile.read','customer_phone.read'],query:true,rows:10,target:'#tab-list'},
 'order.lookup':{keys:['query'],permissions:['sales_order.read'],query:true,rows:10,target:'#tab-order-list'},
 'catalog.product':{keys:['query'],permissions:['product.read','product_variant.read'],rows:20,target:'#tab-order-products'},
 'catalog.service':{keys:['query'],permissions:['service.read'],rows:20,target:'#tab-service-catalog'},
 'catalog.service_price':{keys:['query','category'],permissions:['service.read','service_category.read'],extended:true,rows:20,target:'#tab-service-catalog'},
 'revenue.summary':{keys:['start_at','end_at'],permissions:['payment.read','refund_transaction.read'],extended:true,date:true,rows:0,target:null},
 'knowledge.search':{keys:['query'],permissions:['chatbot_knowledge_faq.read'],query:true,extended:true,rows:5,target:'#tab-chatbot-rules'},
 'conversation.context':{keys:['conversationId'],permissions:['chat_conversation.read','chat_message.read'],uuid:'conversationId',rpc:'admin_copilot_chat_context',argument:'p_conversation',rows:12,target:'#tab-live-support'},
 'history.context':{keys:['sessionId'],permissions:['admin_copilot_history.read'],uuid:'sessionId',rpc:'admin_copilot_recent_context',argument:'p_session',rows:6,target:'#tab-ai-copilot'}
};
const pagedLegacy=['appointment.list','inventory.low_stock','ticket.open','customer.lookup','order.lookup','catalog.product','catalog.service','catalog.service_price'];
for(const intent of pagedLegacy){definitions[intent].keys.push('page');definitions[intent].rows=10;definitions[intent].paged=true;}
const stage3={
 'customer.pets':{keys:['query'],permissions:['customer.read','customer_profile.read','customer_phone.read','pet_profile.read','pet_breed.read','pet_species.read'],query:true,target:'#tab-list'},
 'pet.lookup':{keys:['query'],permissions:['pet_profile.read','pet_breed.read','pet_species.read'],query:true,target:'#tab-pet-list'},
 'payment.order':{keys:['query'],permissions:['sales_order.read','payment.read','refund_transaction.read'],query:true,target:'#tab-order-list'},
 'order.refund_pending':{keys:['start_at','end_at'],permissions:['sales_order.read','payment.read','refund_transaction.read'],target:'#tab-order-list'},
 'appointment.search':{keys:['start_at','end_at','category','status','day_part','unassigned','staff_query'],permissions:['appointment.read','appointment_item.read','service.read','service_category.read'],date:true,target:'#tab-service-bookings'},
 'ticket.lookup':{keys:['query'],permissions:['support_ticket.read'],query:true},
 'conversation.list':{keys:['query','start_at','end_at','status'],permissions:['chat_conversation.read','chat_message.read','customer.read','customer_profile.read'],statuses:['bot_handling','waiting_agent','agent_handling','resolved','closed','completed','blocked'],target:'#tab-live-support'},
 'points.lookup':{keys:['query'],permissions:['customer.read','customer_profile.read','customer_phone.read','paw_point_transaction.read'],query:true,target:'#tab-list'},
 'offer.list':{keys:['query'],permissions:['voucher.read','promotion.read'],target:'#tab-order-promos'},
 'staff.lookup':{keys:['query','status'],permissions:['staff.read'],statuses:['active','inactive','terminated'],target:'#tab-staff-list'},
 'staff.schedule':{keys:['query','start_at','end_at'],permissions:['staff.read','staff_schedule.read'],date:true,target:'#tab-staff-schedule'},
 'review.list':{keys:['query','start_at','end_at','rating_min','rating_max'],permissions:['review.read'],date:true},
 'content.list':{keys:['query','status'],permissions:['blog_post.read'],statuses:['draft','pending','published','archived'],target:'#tab-content-management'},
 'report.operations':{keys:['start_at','end_at'],permissions:['sales_order.read','appointment.read','support_ticket.read'],date:true},
 'settings.read':{keys:['query'],permissions:['pawpal_setting.read'],target:'#tab-system-config'}
};
for(const [intent,tool]of Object.entries(stage3))definitions[intent]={...tool,keys:[...tool.keys,'page'],rows:10,stage3:true};
definitions['content.read']={keys:['query','part','revision'],permissions:['blog_post.read'],query:true,rows:1,gateway:'run_admin_chat_detail',detail:true,target:'#tab-content-management'};
definitions['review.read']={keys:['query','part','revision'],permissions:['review.read'],query:true,rows:1,gateway:'run_admin_chat_detail',detail:true};
definitions['catalog.price_rows']={keys:['query','category','weight','distance','page'],permissions:['service.read','service_category.read'],query:true,rows:10,gateway:'run_admin_chat_detail',detail:true,target:'#tab-service-catalog'};
definitions['internal.customer_resolve']={internal:true,keys:['query'],permissions:['customer.read','customer_profile.read','customer_phone.read'],query:true,rows:2,gateway:'run_admin_chat_customer_case',target:'#tab-list'};
definitions['internal.customer_appointment']={internal:true,keys:['customerId','direction'],permissions:['customer.read','appointment.read','appointment_item.read'],uuid:'customerId',arrayResult:false,rows:1,gateway:'run_admin_chat_customer_case',target:'#tab-service-bookings'};
definitions['internal.customer_tickets']={internal:true,keys:['customerId'],permissions:['customer.read','support_ticket.read'],uuid:'customerId',arrayResult:false,rows:10,gateway:'run_admin_chat_customer_case',target:'#tab-list'};
definitions['internal.customer_pets']={internal:true,keys:['customerId'],permissions:['customer.read','pet_profile.read','pet_breed.read','pet_species.read'],uuid:'customerId',arrayResult:false,rows:10,gateway:'run_admin_chat_customer_case',target:'#tab-pet-list'};
definitions['internal.customer_latest_order']={internal:true,keys:['customerId'],permissions:['customer.read','sales_order.read'],uuid:'customerId',arrayResult:false,rows:1,gateway:'run_admin_chat_customer_case',target:'#tab-order-list'};
definitions['hotel.availability']={keys:['start_at','end_at','query','page'],permissions:['hotel_room.read','hotel_room_type.read','hotel_booking.read'],date:true,rows:10,gateway:'run_admin_chat_logistics',target:'#tab-service-bookings'};
definitions['hotel.stays']={keys:['start_at','end_at','query','page'],permissions:['hotel_booking.read','hotel_room.read','hotel_room_type.read','appointment.read','pet_profile.read'],date:true,rows:10,gateway:'run_admin_chat_logistics',target:'#tab-service-bookings'};
definitions['taxi.trips']={keys:['start_at','end_at','query','page'],permissions:['taxi_trip.read','appointment.read','pet_profile.read'],date:true,rows:10,gateway:'run_admin_chat_logistics',target:'#tab-service-bookings'};
for(const value of Object.values(definitions)){Object.freeze(value.keys);Object.freeze(value.permissions);if(value.statuses)Object.freeze(value.statuses);Object.freeze(value);}Object.freeze(definitions);
const fail=(message,code='22023')=>Object.assign(Error(message),{code});
const preparedReads=new WeakSet();
// Separate work-role registry. Never translate work permissions into legacy table permissions.
const staffDefinitions={
 'customer.lookup':{permission:'work.customer.read',keys:['query','page'],query:true,target:'#tab-list'},
 'pet.lookup':{permission:'work.pet.read',keys:['query','page'],query:true,target:'#tab-pet-list'},
 'order.lookup':{permission:'work.sales.create',keys:['query','page'],query:true,target:'#tab-order-list'},
 'payment.order':{permission:'work.cashier.collect',keys:['query','page'],query:true,target:'#tab-order-list'},
 'points.lookup':{permission:'work.customer.read',keys:['query','page'],query:true,target:'#tab-list'},
 'catalog.product':{permission:'work.stock.read',keys:['query','page'],target:'#tab-order-products'},
 'inventory.low_stock':{permission:'work.stock.read',keys:['query','page'],target:'#tab-order-products'},
 'catalog.service':{permission:'work.service.perform',keys:['query','page'],target:'#tab-service-catalog'},
 'appointment.list':{permission:'work.service.perform',keys:['start_at','end_at','category','status','page'],target:'#tab-service-bookings'},
 'appointment.search':{permission:'work.service.perform',keys:['start_at','end_at','category','status','day_part','page'],target:'#tab-service-bookings'},
 'ticket.open':{permission:'work.complaint.handle',keys:['start_at','end_at','page'],target:'#tab-complaint-services'},
 'ticket.lookup':{permission:'work.complaint.handle',keys:['query','page'],query:true,target:'#tab-complaint-services'},
 'conversation.list':{permission:'work.chat.handle',keys:['query','start_at','end_at','status','page'],target:'#tab-live-support'},
 'conversation.context':{permission:'work.chat.handle',keys:['conversationId','page'],uuid:'conversationId',target:'#tab-live-support'},
 'staff.lookup':{permission:'work.self.read',keys:['query','page'],target:'#tab-staff-profile'},
 'staff.schedule':{permission:'work.self.read',keys:['query','start_at','end_at','page'],target:'#tab-staff-schedule'},
 'hotel.stays':{permission:'work.service.perform',keys:['query','start_at','end_at','page'],target:'#tab-service-bookings'},
 'taxi.trips':{permission:'work.service.perform',keys:['query','start_at','end_at','page'],target:'#tab-service-bookings'},
 'knowledge.search':{permission:'work.copilot.use',keys:['query','page'],query:true,target:null},
 'offer.list':{permission:'work.sales.create',keys:['query','page'],target:'#tab-order-promos'},
 'internal.customer_resolve':{permission:'work.customer.read',keys:['query'],query:true,rows:2,gateway:'read_staff_copilot_relations'},
 'internal.customer_appointment':{permission:'work.service.perform',keys:['customerId','direction'],uuid:'customerId',rows:1,gateway:'read_staff_copilot_relations'},
 'internal.customer_tickets':{permission:'work.complaint.handle',keys:['customerId','page'],uuid:'customerId',gateway:'read_staff_copilot_relations'},
 'internal.customer_pets':{permission:'work.pet.read',keys:['customerId','page'],uuid:'customerId',gateway:'read_staff_copilot_relations'},
 'internal.customer_latest_order':{permission:'work.sales.create',keys:['customerId'],uuid:'customerId',rows:1,gateway:'read_staff_copilot_relations'},
 'catalog.service_price':{permission:'work.booking.create',keys:['query','category','weight','distance','page'],query:true,gateway:'read_staff_copilot_booking'},
 'catalog.price_rows':{permission:'work.booking.create',keys:['query','category','weight','distance','page'],query:true,gateway:'read_staff_copilot_booking'},
 'hotel.availability':{permission:'work.booking.create',keys:['query','start_at','end_at','page'],date:true,gateway:'read_staff_copilot_booking'}
};
for(const tool of Object.values(staffDefinitions)){Object.freeze(tool.keys);Object.freeze(tool);}Object.freeze(staffDefinitions);
function prepareStaff(intent,filters={},principal){
 const tool=Object.hasOwn(staffDefinitions,intent)?staffDefinitions[intent]:null;
 if(!tool||principal?.system_role!=='STAFF'||!Array.isArray(principal.permissions)||!principal.permissions.includes('work.copilot.use')||!principal.permissions.includes(tool.permission))throw fail('staff_read_tool_forbidden','42501');
 if(tool.gateway==='read_staff_copilot_relations'&&!principal.permissions.includes('work.customer.read'))throw fail('staff_read_tool_forbidden','42501');
 if(!filters||Object.getPrototypeOf(filters)!==Object.prototype||Object.keys(filters).some(key=>!tool.keys.includes(key)))throw fail('staff_read_scope_filter_forbidden','42501');
 for(const value of Object.values(filters))if(typeof value!=='string'||value.length>120||/[\u0000-\u001f]/.test(value))throw fail('invalid_staff_read_filter');
 if(tool.query&&(!filters.query||filters.query.trim().length<3))throw fail('staff_read_query_required');
 if(tool.uuid&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters[tool.uuid]||''))throw fail('invalid_staff_read_identity');
 if(Object.hasOwn(filters,'page')&&(!/^[1-9]\d{0,3}$/.test(filters.page)||Number(filters.page)>1000))throw fail('invalid_staff_read_page');
 if(Object.hasOwn(filters,'start_at')!==Object.hasOwn(filters,'end_at')||tool.date&&!Object.hasOwn(filters,'start_at'))throw fail('invalid_staff_read_period');
 if(Object.hasOwn(filters,'start_at')){const a=Date.parse(filters.start_at),b=Date.parse(filters.end_at);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||b-a>31*86400000)throw fail('invalid_staff_read_period');}
 if(filters.category&&!['grooming_spa','pet_hotel','pet_taxi'].includes(filters.category)||filters.day_part&&!['morning','afternoon','evening'].includes(filters.day_part))throw fail('invalid_staff_read_category');
 if(Object.hasOwn(filters,'status')&&!(intent==='conversation.list'?['bot_handling','waiting_agent','agent_handling','resolved','closed','completed','blocked']:['pending','confirmed','checked_in','in_progress','completed','cancelled','no_show']).includes(filters.status))throw fail('invalid_staff_read_status');
 if(intent==='internal.customer_appointment'&&!['upcoming','recent'].includes(filters.direction))throw fail('invalid_case_direction');
 for(const key of ['weight','distance'])if(Object.hasOwn(filters,key)&&(!/^\d{1,5}(?:\.\d{1,3})?$/.test(filters[key])||Number(filters[key])>(key==='weight'?1000:10000)))throw fail('invalid_staff_price_condition');
 const gateway=tool.gateway||'read_staff_copilot',frozenFilters=Object.freeze({...filters}),prepared=Object.freeze({intent,staffScoped:true,gateway,rpc:gateway,filters:frozenFilters,
  args:Object.freeze({p_tool:intent,p_filters:frozenFilters,p_max_bytes:32768}),arrayResult:false,permissions:Object.freeze([...new Set(['work.copilot.use',tool.permission,...(tool.gateway==='read_staff_copilot_relations'?['work.customer.read']:[])])]),rowLimit:tool.rows||10,sourceByteLimit:32768,target:tool.target});
 preparedReads.add(prepared);return prepared;
}
function prepare(intent,filters={},permissions=[],audience='staff'){
 if(audience!=='staff')throw fail('read_audience_forbidden','42501');
 const tool=Object.hasOwn(definitions,intent)?definitions[intent]:null;if(!tool)throw fail('unsupported_read_tool');
 if(!filters||Object.getPrototypeOf(filters)!==Object.prototype||Object.keys(filters).some(k=>!tool.keys.includes(k)))throw fail('unsupported_read_filter');
 for(const [k,v]of Object.entries(filters))if(typeof v!=='string'||v.length>120||/[\u0000-\u001f]/.test(v))throw fail('invalid_read_filter');
 if(tool.query&&(!filters.query||filters.query.trim().length<3))throw fail('read_query_required');
 if(tool.uuid&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters[tool.uuid]||''))throw fail('invalid_read_identity');
 if(intent==='internal.customer_appointment'&&!['upcoming','recent'].includes(filters.direction))throw fail('invalid_case_direction');
 if(filters.category&&!['grooming_spa','pet_hotel','pet_taxi'].includes(filters.category))throw fail('invalid_read_category');
 if(filters.status&&!(tool.statuses||['pending','confirmed','checked_in','in_progress','completed','cancelled','no_show']).includes(filters.status))throw fail('invalid_read_status');
 if(filters.day_part&&!['morning','afternoon','evening'].includes(filters.day_part))throw fail('invalid_day_part');
 if(filters.unassigned&&!['true','false'].includes(filters.unassigned))throw fail('invalid_assignment_filter');
 if(Object.hasOwn(filters,'staff_query')&&(filters.staff_query.trim().length<2||filters.unassigned==='true'))throw fail('invalid_staff_filter');
 if(Object.hasOwn(filters,'rating_max')&&!/^[1-5]$/.test(filters.rating_max))throw fail('invalid_review_rating');
 if(Object.hasOwn(filters,'rating_min')&&!/^[1-5]$/.test(filters.rating_min)||filters.rating_min&&filters.rating_max&&Number(filters.rating_min)>Number(filters.rating_max))throw fail('invalid_review_rating');
 if(Object.hasOwn(filters,'page')&&(!/^[1-9]\d{0,4}$/.test(filters.page)||Number(filters.page)>10000))throw fail('invalid_read_page');
 if(Object.hasOwn(filters,'part')&&(!/^[1-9]\d{0,4}$/.test(filters.part)||Number(filters.part)>10000))throw fail('invalid_read_part');
 if(Object.hasOwn(filters,'revision')&&!/^[a-f0-9]{32}$/.test(filters.revision))throw fail('invalid_read_revision');
 if(Number(filters.part)>1&&!filters.revision)throw fail('read_revision_required');
 for(const key of ['weight','distance'])if(Object.hasOwn(filters,key)&&(!/^\d{1,5}(?:\.\d{1,3})?$/.test(filters[key])||Number(filters[key])>(key==='weight'?1000:10000)))throw fail('invalid_price_range');
 if(tool.date||filters.start_at||filters.end_at){const a=Date.parse(filters.start_at),b=Date.parse(filters.end_at);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||b-a>31*86400000)throw fail('invalid_read_period');}
 const needed=[...tool.permissions];if(intent==='appointment.search'&&Object.hasOwn(filters,'staff_query')){needed.push('staff.read');if(filters.category)needed.push('service_addon.read');}
 if(['catalog.service_price','catalog.price_rows'].includes(intent)){
  if(!filters.category||filters.category==='grooming_spa')needed.push('service_price_matrix.read');
  if(!filters.category||filters.category==='pet_taxi')needed.push('taxi_price_rule.read');
  if(!filters.category||filters.category==='pet_hotel')needed.push('hotel_room_type.read');
 }
 if(needed.some(p=>!permissions.includes(p)))throw fail('read_tool_forbidden','42501');
 const frozenFilters=Object.freeze({...filters});
 const prepared=Object.freeze({intent,gateway:tool.gateway||(tool.stage3?'run_admin_stage3_read':'run_admin_chat_read'),rpc:tool.rpc||(tool.extended?'admin_copilot_extended_facts':'admin_copilot_facts'),args:Object.freeze(tool.uuid?{[tool.argument]:filters[tool.uuid]}:{p_intent:intent,p_filters:frozenFilters}),filters:frozenFilters,arrayResult:tool.arrayResult??Boolean(tool.uuid),permissions:Object.freeze(needed),rowLimit:tool.rows,sourceByteLimit:32768,target:tool.target});
 preparedReads.add(prepared);return prepared;
}
function createReadBudget({maxCalls=3,maxConcurrent=2,maxBytes=65536,deadlineMs=8000,lease=null}={}){
 if(lease!==null&&!/^[0-9a-f-]{36}$/i.test(lease))throw fail('invalid_read_lease');
 if(![maxCalls,maxConcurrent,maxBytes,deadlineMs].every(Number.isSafeInteger)||maxCalls<1||maxCalls>3||maxConcurrent<1||maxConcurrent>2||maxBytes<1||maxBytes>65536||deadlineMs<1||deadlineMs>8000)throw fail('invalid_read_budget');
 let calls=0,active=0,bytes=0,reserved=0,staffUsed=false;const deadline=Date.now()+deadlineMs,staffRefs=new Map();
 const refKinds={'customer.lookup':'customer','points.lookup':'customer','pet.lookup':'pet','order.lookup':'order','payment.order':'order','catalog.product':'product','inventory.low_stock':'product','catalog.service':'service','appointment.list':'appointment','appointment.search':'appointment','ticket.open':'ticket','ticket.lookup':'ticket','conversation.list':'conversation','conversation.context':'conversation','staff.lookup':'staff','staff.schedule':'schedule','hotel.stays':'hotel','taxi.trips':'taxi','knowledge.search':'knowledge','offer.list':'offer'};
 return {snapshot:()=>({calls,active,bytes,...(staffUsed?{staff_scope_refs:Object.freeze([...staffRefs.values()].map(ref=>Object.freeze({...ref})))}:{})}),async run(caller,prepared){
  if(!preparedReads.has(prepared))throw fail('unprepared_read_tool');
  if(!prepared.staffScoped&&(prepared.gateway!=='run_admin_chat_read'||prepared.filters.page)&&!lease)throw fail('stage3_lease_required','42501');
  if(calls>=maxCalls||active>=maxConcurrent||Date.now()>=deadline)throw fail('read_budget_exhausted','54000');
  const allocation=Math.min(prepared.sourceByteLimit,maxBytes-bytes-reserved);
  if(allocation<(prepared.staffScoped?512:1))throw fail('read_payload_exceeded','54000');
  calls++;active++;reserved+=allocation;try{
   let query=prepared.staffScoped?caller.rpc(prepared.gateway,{p_tool:prepared.intent,p_filters:prepared.filters,p_max_bytes:allocation}):lease?caller.rpc(prepared.gateway,{p_lease:lease,p_tool:prepared.intent,p_filters:prepared.filters,p_max_bytes:allocation}):caller.rpc(prepared.rpc,prepared.args);
   const controller=new AbortController();let timer;
   // Supabase builders support abortSignal. Custom transports without cancellation
   // are awaited; do not claim Promise.race cancels an underlying SQL transaction.
   if(typeof query?.abortSignal==='function'){query=query.abortSignal(controller.signal);timer=setTimeout(()=>controller.abort(),Math.max(1,deadline-Date.now()));}
   let result;try{result=await query;}finally{if(timer)clearTimeout(timer);}
   if(result.error)throw result.error;if(Date.now()>=deadline)throw fail('read_deadline_exceeded','57014');
   const data=result.data,size=Buffer.byteLength(JSON.stringify(data??null));bytes+=size;
   if(size>allocation||bytes>maxBytes)throw fail('read_payload_exceeded','54000');
   if(prepared.arrayResult){if(!Array.isArray(data)||data.length>prepared.rowLimit)throw fail('invalid_read_result','XX000');}
   else if(!data||data.intent!==prepared.intent||!Array.isArray(data.items)||data.items.length>prepared.rowLimit)throw fail('invalid_read_result','XX000');
   if(prepared.staffScoped&&(data.audience!=='staff'||data.total_is_page!==true||data.page_size!==10||data.total!==data.items.length))throw fail('invalid_staff_read_result','XX000');
   if(prepared.staffScoped){
    const permission=staffDefinitions[prepared.intent].permission,relationKinds={'internal.customer_resolve':'customer','internal.customer_appointment':'appointment','internal.customer_tickets':'ticket','internal.customer_pets':'pet','internal.customer_latest_order':'order'},refs=prepared.permissions.filter(p=>p!=='work.copilot.use'||permission===p).map(permission=>({kind:'permission',permission})),kind=prepared.intent==='conversation.list'&&prepared.filters.status==='waiting_agent'?'queue':refKinds[prepared.intent]||relationKinds[prepared.intent];
    if(prepared.filters.customerId){refs.push({kind:'customer',id:prepared.filters.customerId,permission:'work.customer.read'});if(data.scope?.customerId!==prepared.filters.customerId||data.items.some(row=>row.customer_id!==prepared.filters.customerId))throw fail('invalid_staff_customer_relation','XX000');}
    const uuid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if(prepared.gateway==='read_staff_copilot_booking'){
     const rooms=prepared.intent==='hotel.availability';
     if(rooms){
      if(data.available_is_page!==true||!Number.isSafeInteger(data.available)||!Number.isSafeInteger(data.unavailable)||data.available<0||data.unavailable<0||data.available+data.unavailable!==data.items.length||data.available!==data.items.filter(row=>row.available===true).length)throw fail('invalid_staff_room_result','XX000');
     }else{
      if(!Number.isSafeInteger(data.match_count)||data.match_count<0||data.match_count>2||data.ambiguous!==(data.match_count>1)||data.match_limit!==2||data.match_count===1&&!uuid(data.service_id)||data.match_count!==1&&(data.service_id!==null||data.items.length))throw fail('invalid_staff_price_identity','XX000');
      if(data.service_id)refs.push({kind:'service',id:data.service_id,permission});
     }
     for(const row of data.items){
      if(!uuid(row.id)||!(rooms?['room']:['service_price','taxi_price','room_type']).includes(row.source_kind)||!rooms&&row.service_id!==data.service_id)throw fail('invalid_staff_source_reference','XX000');
      if(rooms&&(typeof row.reserved!=='boolean'||typeof row.occupied!=='boolean'||typeof row.available!=='boolean'||row.available!==(!row.reserved&&!row.occupied)))throw fail('invalid_staff_room_result','XX000');
      refs.push({kind:row.source_kind,id:row.id,permission});
     }
    }else{
     const ids=prepared.intent==='conversation.context'?[prepared.filters.conversationId]:data.items.map(row=>row.id);
     for(const id of ids){if(!uuid(id))throw fail('invalid_staff_source_reference','XX000');refs.push({kind,id,permission});}
    }
    const next=new Map(staffRefs);for(const ref of refs)next.set(JSON.stringify(ref),ref);
    if(next.size>64)throw fail('staff_reference_budget_exceeded','54000');
    staffUsed=true;for(const[key,ref]of next)staffRefs.set(key,ref);
   }
   return data;
  }finally{active--;reserved-=allocation;}
 }};
}
module.exports={definitions,staffDefinitions,prepare,prepareStaff,createReadBudget};
