'use strict';
// Extract only a complete, decodable prefix of the structured customer reply.
// Raw JSON/schema fields never go to the public stream.
function replyPrefix(raw){
 if(typeof raw!=='string'||raw.length>16000)return '';
 const start=raw.match(/^\s*\{\s*(?:"understood"\s*:\s*(?:true|false)\s*,\s*)?"reply"\s*:\s*"/);if(!start)return '';
 let encoded='';for(let i=start[0].length;i<raw.length;i++){
  const c=raw[i];if(c==='"')break;
  if(c==='\\'){const next=raw[i+1];if(next==='u'){if(!/^[0-9a-f]{4}$/i.test(raw.slice(i+2,i+6)))break;encoded+=raw.slice(i,i+6);i+=5;}else if(next&&'"\\/bfnrt'.includes(next)){encoded+=c+next;i++;}else break;}
  else{if(c<' ')return '';encoded+=c;}
 }
 try{const value=JSON.parse('"'+encoded+'"');return /[\uD800-\uDBFF]$/.test(value)?value.slice(0,-1):value;}catch{return '';}
}
function createPublicStream(req,res){
 let started=false,bytes=0;const enabled=req.body?.stream===true&&req.body?.action==='public_send'&&typeof res.write==='function';
 function event(type,data){
  if(!enabled||res.destroyed||res.writableEnded)return;
  if(!started){res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('Cache-Control','no-store, no-transform');res.setHeader('X-Accel-Buffering','no');res.flushHeaders?.();started=true;}
  res.write('event: '+type+'\ndata: '+JSON.stringify(data)+'\n\n');
 }
 return {enabled,get started(){return started;},reset(){event('reset',{});},delta(text){if(typeof text!=='string'||!text)return;const size=Buffer.byteLength(text);if(bytes+size>32768)return;bytes+=size;event('delta',{text});},done(data={}){event('done',{ok:true,...data});res.end();},fail(status,error,extra={}){event('error',{ok:false,status,error,...extra});res.end();}};
}
module.exports={replyPrefix,createPublicStream};
