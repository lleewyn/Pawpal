import test from 'node:test';
import assert from 'node:assert/strict';
import {watchCustomerTables} from '../shared/customer-realtime.mjs';

test('order children subscribe through RLS without a nonexistent customer_id filter',()=>{
    const subscriptions=[];
    const channel={on(event,filter,callback){subscriptions.push({event,filter,callback});return this;},subscribe(){}};
    let removed=false;
    const client={channel(){return channel;},removeChannel(value){assert.equal(value,channel);removed=true;}};
    const dispose=watchCustomerTables(client,'owner-id',['sales_order','payment','return_request','review','appointment_item','hotel_booking','taxi_trip'],()=>{});
    assert.equal(subscriptions[0].filter.filter,'customer_id=eq.owner-id');
    assert.equal(subscriptions[1].filter.filter,'customer_id=eq.owner-id');
    assert.equal(subscriptions[2].filter.filter,undefined);
    assert.equal(subscriptions[3].filter.filter,undefined);
    assert.equal(subscriptions[4].filter.filter,undefined);
    assert.equal(subscriptions[5].filter.filter,undefined);
    assert.equal(subscriptions[6].filter.filter,undefined);
    dispose();assert.ok(removed);
});

test('review media uses ownership RLS and a disposed view never refreshes',async()=>{
 const handlers=[];let refreshed=0,removed=0;
 const channel={on(event,filter,callback){handlers.push({filter,callback});return this;},subscribe(){}};
 const client={channel:()=>channel,removeChannel:()=>removed++};
 const dispose=watchCustomerTables(client,'owner',['review_media'],()=>refreshed++);
 assert.equal(handlers[0].filter.filter,undefined);
 handlers[0].callback();handlers[0].callback();dispose();
 await new Promise(resolve=>setTimeout(resolve,220));
 assert.equal(refreshed,0);assert.equal(removed,1);
});

test('hidden event bursts defer reads until visible and cleanup cancels queued work',async()=>{
 const doc=new EventTarget();doc.hidden=true;globalThis.document=doc;
 let callback,reads=0,removed=0;
 const channel={on(_type,_filter,fn){callback=fn;return this;},subscribe(){}};
 const stop=watchCustomerTables({channel:()=>channel,removeChannel:()=>removed++},'owner',['sales_order'],()=>reads++);
 try{
  for(let i=0;i<100;i++)callback();
  await new Promise(r=>setTimeout(r,350));assert.equal(reads,0);
  doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));
  await new Promise(r=>setTimeout(r,350));assert.equal(reads,1);
  callback();stop();await new Promise(r=>setTimeout(r,350));assert.equal(reads,1);assert.equal(removed,1);
 }finally{stop();delete globalThis.document;}
});

test('slow reads never overlap; changes arriving mid-read trigger one trailing refresh',async()=>{
 let callback,release,reads=0;
 const channel={on(_type,_filter,fn){callback=fn;return this;},subscribe(){}};
 const stop=watchCustomerTables({channel:()=>channel,removeChannel(){}},'owner',['review'],async()=>{reads++;if(reads===1)await new Promise(r=>release=r);});
 try{
  callback();await new Promise(r=>setTimeout(r,350));assert.equal(reads,1);
  for(let i=0;i<50;i++)callback();await new Promise(r=>setTimeout(r,350));assert.equal(reads,1);
  release();await new Promise(r=>setTimeout(r,350));assert.equal(reads,2);
 }finally{stop();}
});
