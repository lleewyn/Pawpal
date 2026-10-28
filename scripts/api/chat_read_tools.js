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
for(const value of Object.values(definitions)){Object.freeze(value.keys);Object.freeze(value.permissions);Object.freeze(value);}Object.freeze(definitions);
const fail=(message,code='22023')=>Object.assign(Error(message),{code});
const preparedReads=new WeakSet();
function prepare(intent,filters={},permissions=[],audience='staff'){
 if(audience!=='staff')throw fail('read_audience_forbidden','42501');
 const tool=Object.hasOwn(definitions,intent)?definitions[intent]:null;if(!tool)throw fail('unsupported_read_tool');
 if(!filters||Object.getPrototypeOf(filters)!==Object.prototype||Object.keys(filters).some(k=>!tool.keys.includes(k)))throw fail('unsupported_read_filter');
 for(const [k,v]of Object.entries(filters))if(typeof v!=='string'||v.length>120||/[\u0000-\u001f]/.test(v))throw fail('invalid_read_filter');
 if(tool.query&&(!filters.query||filters.query.trim().length<3))throw fail('read_query_required');
 if(tool.uuid&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters[tool.uuid]||''))throw fail('invalid_read_identity');
 if(filters.category&&!['grooming_spa','pet_hotel','pet_taxi'].includes(filters.category))throw fail('invalid_read_category');
 if(filters.status&&!['pending','confirmed','checked_in','in_progress','completed','cancelled','no_show'].includes(filters.status))throw fail('invalid_read_status');
 if(tool.date||filters.start_at||filters.end_at){const a=Date.parse(filters.start_at),b=Date.parse(filters.end_at);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||b-a>31*86400000)throw fail('invalid_read_period');}
 const needed=[...tool.permissions];if(intent==='catalog.service_price'){
  if(!filters.category||filters.category==='grooming_spa')needed.push('service_price_matrix.read');
  if(!filters.category||filters.category==='pet_taxi')needed.push('taxi_price_rule.read');
  if(!filters.category||filters.category==='pet_hotel')needed.push('hotel_room_type.read');
 }
 if(needed.some(p=>!permissions.includes(p)))throw fail('read_tool_forbidden','42501');
 const frozenFilters=Object.freeze({...filters});
 const prepared=Object.freeze({intent,rpc:tool.rpc||(tool.extended?'admin_copilot_extended_facts':'admin_copilot_facts'),args:Object.freeze(tool.uuid?{[tool.argument]:filters[tool.uuid]}:{p_intent:intent,p_filters:frozenFilters}),filters:frozenFilters,arrayResult:Boolean(tool.uuid),permissions:Object.freeze(needed),rowLimit:tool.rows,sourceByteLimit:32768,target:tool.target});
 preparedReads.add(prepared);return prepared;
}
function createReadBudget({maxCalls=3,maxConcurrent=2,maxBytes=65536,deadlineMs=8000,lease=null}={}){
 if(lease!==null&&!/^[0-9a-f-]{36}$/i.test(lease))throw fail('invalid_read_lease');
 if(![maxCalls,maxConcurrent,maxBytes,deadlineMs].every(Number.isSafeInteger)||maxCalls<1||maxCalls>3||maxConcurrent<1||maxConcurrent>2||maxBytes<1||maxBytes>65536||deadlineMs<1||deadlineMs>8000)throw fail('invalid_read_budget');
 let calls=0,active=0,bytes=0,reserved=0;const deadline=Date.now()+deadlineMs;
 return {snapshot:()=>({calls,active,bytes}),async run(caller,prepared){
  if(!preparedReads.has(prepared))throw fail('unprepared_read_tool');
  if(calls>=maxCalls||active>=maxConcurrent||Date.now()>=deadline)throw fail('read_budget_exhausted','54000');
  const allocation=Math.min(prepared.sourceByteLimit,maxBytes-bytes-reserved);
  if(allocation<1)throw fail('read_payload_exceeded','54000');
  calls++;active++;reserved+=allocation;try{
   let query=lease?caller.rpc('run_admin_chat_read',{p_lease:lease,p_tool:prepared.intent,p_filters:prepared.filters,p_max_bytes:allocation}):caller.rpc(prepared.rpc,prepared.args);
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
   return data;
  }finally{active--;reserved-=allocation;}
 }};
}
module.exports={definitions,prepare,createReadBudget};
