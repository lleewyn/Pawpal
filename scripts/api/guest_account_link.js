const {createGuestCommerce}=require('./guest_commerce');
function createGuestAccountLink({admin,...configuration}){
    const cookies=createGuestCommerce({admin,...configuration});
    return {
        prepare(req){
            try{return cookies.prepareAccountLink(req);}
            catch(error){if(error.message==='invalid_session')throw Error('Phiên khách vãng lai đã hết hiệu lực. Vui lòng bắt đầu lại.');throw error;}
        },
        async validate(proof,phone){
            const result=await admin.rpc('guest_commerce_context',{p_hash:proof.hash,p_page:1});
            if(result.error||result.data?.initialized!==true||result.data?.contact?.phone!==phone)throw Error('Phiên khách vãng lai không khớp số điện thoại cần xác minh.');
        },
        async complete(proof,{authId,phone,name}){
            const result=await admin.rpc('complete_guest_customer_auth',{p_hash:proof.hash,p_auth_id:authId,p_phone:phone,p_name:name||null});
            if(result.error){
                if(result.error.code==='PT409')throw Error('Hồ sơ hoặc số điện thoại đã liên kết ở nơi khác. Vui lòng liên hệ cửa hàng để đối soát.');
                throw Error('Không thể liên kết hồ sơ khách vãng lai. Dữ liệu cũ được giữ nguyên.');
            }
            return result.data;
        },
        clear(res){cookies.clearAccountCookie(res);}
    };
}
module.exports={createGuestAccountLink};
