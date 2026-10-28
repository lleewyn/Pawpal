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
