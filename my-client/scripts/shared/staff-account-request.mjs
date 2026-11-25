// Retry only authentication failures, before the staff endpoint performs business writes.
export async function requestStaffAccount(client,path,body,{fetchImpl=fetch}={}) {
    const requestBody=JSON.stringify(body);
    const failure=(message,field)=>{
        const error=Error(message+(body.requestId?' Mã yêu cầu '+body.requestId:''));
        error.staffAccountError=true;error.field=field;return error;
    };
    const {data,error}=await client.auth.getSession();
    const session=data?.session;
    if(error||!session?.access_token)throw failure('Vui lòng đăng nhập lại. Thông tin đang nhập vẫn được giữ.');
    const send=token=>fetchImpl('/api/admin/staff/'+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:requestBody});
    let response=await send(session.access_token);
    if(response.status===401){
        let refreshed;
        try{refreshed=await client.auth.refreshSession();}catch{throw failure('Không thể làm mới phiên đăng nhập. Vui lòng đăng nhập lại; thông tin đang nhập vẫn được giữ.');}
        const next=refreshed?.data?.session;
        if(refreshed?.error||!next?.access_token)throw failure('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại; thông tin đang nhập vẫn được giữ.');
        if(!session.user?.id||next.user?.id!==session.user.id)throw failure('Tài khoản đăng nhập đã thay đổi. Vui lòng tải lại trước khi lưu.');
        response=await send(next.access_token);
    }
    let result;try{result=await response.json();}catch{throw failure('Không thể đọc kết quả quản lý tài khoản.');}
    if(response.status===401)throw failure('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại; thông tin đang nhập vẫn được giữ.');
    if(!response.ok||!result.success)throw failure(result.message||'Không thể hoàn tất yêu cầu.',result.field);
    return result;
}
