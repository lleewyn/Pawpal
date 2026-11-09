const pending=new WeakMap();
const invalidSession=error=>error?.name==='AuthSessionMissingError'||['session_not_found','refresh_token_not_found','refresh_token_already_used','bad_jwt','user_not_found','user_banned'].includes(error?.code)||[400,401,403].includes(error?.status);

// A cached customer profile is display data, never proof of an authenticated session.
export function verifyCustomerSession(client,{storage=globalThis.localStorage,tabStorage=globalThis.sessionStorage}={}){
 if(!client?.auth) return Promise.reject(Error('customer_auth_unavailable'));
 if(pending.has(client))return pending.get(client);
 const captured=storage?.getItem('pawpal_current_user');
 const clearStaleProfile=()=>{
  if(storage?.getItem('pawpal_current_user')!==captured)return;
  try{if(JSON.parse(captured||'null')?.is_temporary)return;}catch{}
  storage?.removeItem('pawpal_current_user');tabStorage?.removeItem('pawpal_current_user');
 };
 const operation=(async()=>{
  const session=await client.auth.getSession();
  if(session.error){if(invalidSession(session.error)){clearStaleProfile();return null;}throw session.error;}
  if(!session.data?.session){clearStaleProfile();return null;}
  const result=await client.auth.getUser();
  if(result.error){if(invalidSession(result.error)){clearStaleProfile();return null;}throw result.error;}
  if(!result.data?.user){clearStaleProfile();return null;}
  return result.data.user;
 })();
 pending.set(client,operation);
 operation.finally(()=>{if(pending.get(client)===operation)pending.delete(client);}).catch(()=>{});
 return operation;
}
