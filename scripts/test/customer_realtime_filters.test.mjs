import test from 'node:test';
import assert from 'node:assert/strict';
import {watchCustomerTables} from '../shared/customer-realtime.mjs';

test('order children subscribe through RLS without a nonexistent customer_id filter',()=>{
    const subscriptions=[];
    const channel={on(event,filter,callback){subscriptions.push({event,filter,callback});return this;},subscribe(){}};
    let removed=false;
    const client={channel(){return channel;},removeChannel(value){assert.equal(value,channel);removed=true;}};
    const dispose=watchCustomerTables(client,'owner-id',['sales_order','payment','return_request','review','appointment_item'],()=>{});
    assert.equal(subscriptions[0].filter.filter,'customer_id=eq.owner-id');
    assert.equal(subscriptions[1].filter.filter,'customer_id=eq.owner-id');
    assert.equal(subscriptions[2].filter.filter,undefined);
    assert.equal(subscriptions[3].filter.filter,undefined);
    assert.equal(subscriptions[4].filter.filter,undefined);
    dispose();assert.ok(removed);
});
