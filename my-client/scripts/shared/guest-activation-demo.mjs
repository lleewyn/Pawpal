export const ACTIVATION_DEMO_TTL=48*60*60*1000;
export function demoActivationLink(createdAt,target,now=Date.now()){
 const issued=Date.parse(createdAt);
 if(!Number.isFinite(issued))return null;
 const expiresAt=issued+ACTIVATION_DEMO_TTL;
 return {href:'/login?'+new URLSearchParams({action:'guest-activate',redirect:target,demo_activation:'1',expires:String(expiresAt)}),expiresAt,expired:now>=expiresAt};
}
// This deadline demonstrates the link lifecycle only; cookie ownership and OTP
// still authorize account activation, independently of these URL parameters.
export function expiredDemoActivation(search,now=Date.now()){
 const params=new URLSearchParams(search);
 if(params.get('demo_activation')!=='1')return false;
 const raw=params.get('expires');
 return !/^\d{13}$/.test(raw||'')||now>=Number(raw);
}
