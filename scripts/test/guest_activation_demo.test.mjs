import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoActivationLink,expiredDemoActivation,ACTIVATION_DEMO_TTL} from '../shared/guest-activation-demo.mjs';
test('demo invitation expires exactly 48 hours after the persisted booking date',()=>{
 const created='2026-11-09T10:00:00Z',issued=Date.parse(created),target='/user#bookings';
 const first=demoActivationLink(created,target,issued),later=demoActivationLink(created,target,issued+86400000);
 assert.equal(first.expiresAt,issued+48*3600000);assert.equal(ACTIVATION_DEMO_TTL,48*3600000);
 assert.equal(first.href,later.href);assert.equal(first.expired,false);
 assert.equal(new URL(first.href,'http://localhost').searchParams.get('redirect'),target);
 const search=new URL(first.href,'http://localhost').search;
 assert.equal(expiredDemoActivation(search,first.expiresAt-1),false);
 assert.equal(expiredDemoActivation(search,first.expiresAt),true);
 assert.equal(demoActivationLink(created,target,first.expiresAt).expired,true);
});
test('malformed demo dates fail closed without affecting ordinary activation links',()=>{
 assert.equal(demoActivationLink(undefined,'/user'),null);
 assert.equal(expiredDemoActivation('?action=guest-activate'),false);
 assert.equal(expiredDemoActivation('?demo_activation=1'),true);
 assert.equal(expiredDemoActivation('?demo_activation=1&expires=bad'),true);
});
