'use strict';
// One authenticated request; source reads and persistence finish before reply deltas.
function createAdminStream(req,res){
 const enabled=req.method==='POST'&&req.body?.stream===true&&typeof res.write==='function';let started=false;
 function event(type,data){if(!enabled||res.destroyed||res.writableEnded)return;if(!started){res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('Cache-Control','no-store, no-transform');res.setHeader('X-Accel-Buffering','no');res.flushHeaders?.();started=true;}res.write('event: '+type+'\ndata: '+JSON.stringify(data)+'\n\n');}
 return {enabled,get started(){return started;},status(phase){event('status',{phase});},async finish(result){const reply=String(result.reply||'');event('status',{phase:'answering'});const chars=Array.from(reply);for(let i=0;i<chars.length;i+=96){if(res.destroyed||res.writableEnded)return;event('delta',{text:chars.slice(i,i+96).join('')});await new Promise(resolve=>setImmediate(resolve));}event('done',result);res.end();},fail(status,error){event('error',{ok:false,status,error});res.end();}};
}
module.exports={createAdminStream};
