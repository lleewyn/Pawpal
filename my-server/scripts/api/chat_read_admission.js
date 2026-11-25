const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
async function acquire(caller,request){
 const {data,error}=await caller.rpc('acquire_admin_chat_read',{p_request:request});if(error)throw error;
 if(!uuid(data))throw Object.assign(Error('chat_read_admission_unavailable'),{code:'58000'});return data;
}
async function release(caller,lease){
 let query=caller.rpc('release_admin_chat_read',{p_lease:lease});const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2000);
 if(typeof query.abortSignal==='function')query=query.abortSignal(controller.signal);
 try{const {error}=await query;if(error)throw error;}finally{clearTimeout(timer);}
}
module.exports={acquire,release};
async function acquireStaff(caller,{requestId,sessionId,question}){
 const {data,error}=await caller.rpc('acquire_staff_copilot_request',{p_request:requestId,p_session:sessionId,p_question:question});if(error)throw error;
 if(!uuid(data?.lease)||data.scope_version!==1||!/^[a-f0-9]{32}$/.test(data.scope_token||''))throw Object.assign(Error('staff_admission_unavailable'),{code:'58000'});
 return Object.freeze({...data});
}
async function releaseStaff(caller,lease){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2000);
 try{let query=caller.rpc('release_staff_copilot_request',{p_lease:lease});if(typeof query?.abortSignal==='function')query=query.abortSignal(controller.signal);const{error}=await query;if(error)throw error;}finally{clearTimeout(timer);}
}
async function readStaffContext(caller,lease){
 const{data,error}=await caller.rpc('read_staff_copilot_request_context',{p_lease:lease});if(error)throw error;
 if(!Array.isArray(data)||data.length>6||Buffer.byteLength(JSON.stringify(data))>32768||data.some(row=>!['user','assistant'].includes(row?.role)||typeof row.content!=='string'||[...row.content].length>1200||row.metadata?.scope_version!==1||!Array.isArray(row.metadata?.scope_refs)))throw Object.assign(Error('invalid_staff_request_context'),{code:'XX000'});
 return data;
}
module.exports.acquireStaff=acquireStaff;module.exports.releaseStaff=releaseStaff;module.exports.readStaffContext=readStaffContext;
