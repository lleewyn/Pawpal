import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paymentResult} from '../shared/payment-result.mjs';
test('a created unpaid order is never presented as paid',()=>{const r=paymentResult({status:'pending',paymentStatus:'pending_payment'});assert.equal(r.title,'Đặt hàng thành công');assert.equal(r.paymentLabel,'Chưa thanh toán')});
test('confirmed payment shows payment success',()=>assert.equal(paymentResult({status:'preparing',paymentStatus:'paid'}).title,'Thanh toán thành công'));
test('partial payment remains explicit',()=>assert.equal(paymentResult({status:'pending',paymentStatus:'partial'}).paymentLabel,'Đã thanh toán một phần'));
test('cancelled order takes precedence over payment success',()=>assert.equal(paymentResult({status:'cancelled',paymentStatus:'paid'}).state,'failed'));
