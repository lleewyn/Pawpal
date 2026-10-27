const {test}=require('node:test'),assert=require('node:assert/strict');
const {classify,label}=require('../shared/customer-identity.js');
test('Admin contact uses canonical primary first and marks only self-reported fallback',()=>{
 const {contact}=require('../shared/customer-identity.js');
 assert.deepEqual(contact({unverified_contact_phone:'0950000001',customer_phone:[]}),{phone:'0950000001',unverified:true});
 assert.deepEqual(contact({unverified_contact_phone:'0950000001',customer_phone:[{phone_number:'0950000002',is_primary:true}]}),{phone:'0950000002',unverified:false});
 assert.deepEqual(contact({unverified_contact_phone:'0950000001'},'0950000003'),{phone:'0950000003',unverified:false});
 assert.deepEqual(contact({}),{phone:'',unverified:false});
});
test('loyalty membership never grants member identity without an account',()=>{
 assert.equal(classify({auth_user_id:null,customer_membership:{membership_tier_id:'gold'}}),'guest');
 assert.equal(classify({auth_user_id:'linked-account',customer_membership:null}),'member');
});
test('locked status, names and contact fields do not change identity',()=>{
 assert.equal(classify({auth_user_id:null,customer_status:'locked',full_name:'Member',phone:'0901234567'}),'guest');
 assert.equal(classify({auth_user_id:'linked-account',customer_status:'locked',full_name:'Khách vãng lai'}),'member');
});
test('missing linkage in an older RPC stays unknown instead of guessing',()=>{
 assert.equal(classify({id:'customer',customer_membership:{}}),'unknown');
 assert.equal(classify(null),'unknown');
 assert.equal(label('unknown'),'Chưa xác định loại khách');
});
test('server classification works without exposing Auth UUID in the paged result',()=>{
 assert.equal(classify({customer_type:'guest'}),'guest');
 assert.equal(classify({customer_type:'member'}),'member');
 assert.equal(label('guest'),'Khách vãng lai');
});
