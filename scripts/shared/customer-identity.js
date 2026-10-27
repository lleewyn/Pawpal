(function(root){
    'use strict';
    // Only server-provided account linkage classifies identity; loyalty tier is independent.
    function classify(customer){
        if(customer?.customer_type==='member'||customer?.customer_type==='guest')return customer.customer_type;
        if(customer && Object.prototype.hasOwnProperty.call(customer,'auth_user_id'))return customer.auth_user_id?'member':'guest';
        return 'unknown';
    }
    function label(type){return type==='member'?'Thành viên':type==='guest'?'Khách vãng lai':'Chưa xác định loại khách';}
    function contact(customer,primary){
        const canonical=String(primary??(customer?.customer_phone||[]).find(p=>p.is_primary)?.phone_number??'').trim();
        const selfReported=String(customer?.unverified_contact_phone||'').trim();
        return {phone:canonical||selfReported,unverified:!canonical&&!!selfReported};
    }
    root.PawpalCustomerIdentity={classify,label,contact};
    if(typeof module!=='undefined'&&module.exports)module.exports=root.PawpalCustomerIdentity;
})(typeof window!=='undefined'?window:globalThis);
