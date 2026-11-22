import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadBookingRead} from '../../pages/services/booking/booking-loading.mjs';

test('startup reads recover once from transient auth, transport and gateway failures', async () => {
 for (const error of [{name:'AbortError'}, {message:'AbortError: signal is aborted without reason'}, {name:'NavigatorLockAcquireTimeoutError'}, {message:'TypeError: Failed to fetch'}, {status:503}]) {
  let calls=0;
  const result=await loadBookingRead(async()=>{if(++calls===1)throw error;return 'live result';},{wait:async()=>{}});
  assert.equal(result,'live result');assert.equal(calls,2);
 }
});
test('persistent failures stop after one retry; permanent and uncertain errors are not replayed', async () => {
 for (const [error,expected] of [[{status:503},2],[{status:403,message:'customer_session_required'},1],[{code:'PGRST202',message:'missing function'},1],[{status:503,uncertain:true},1],[new TypeError('Cannot read properties of null'),1]]) {
  let calls=0;
  await assert.rejects(loadBookingRead(async()=>{calls++;throw error;},{wait:async()=>{}}),value=>value===error);
  assert.equal(calls,expected);
 }
});
test('an account change while waiting prevents the old read from retrying', async () => {
 let disposed=false,calls=0;const error={name:'AbortError'};
 await assert.rejects(loadBookingRead(async()=>{calls++;throw error;},{isDisposed:()=>disposed,wait:async()=>{disposed=true;}}),value=>value===error);
 assert.equal(calls,1);
});
