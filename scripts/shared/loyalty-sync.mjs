// One owner and one in-flight snapshot per mounted loyalty screen.
export function createLoyaltySync({load,owner,apply,fail,hidden=()=>false,setTimer=setTimeout,clearTimer=clearTimeout}){
 const initialOwner=owner();let active=true,pending=null,dirty=false,timer=null;
 const valid=()=>active && Boolean(initialOwner) && owner()===initialOwner;
 function schedule(){
  if(!valid())return;dirty=true;if(hidden() || timer!==null)return;
  timer=setTimer(async()=>{
   timer=null;if(!valid() || hidden())return;
   if(pending){await pending;if(valid() && dirty)schedule();return;}
   dirty=false;await refresh();
  },200);
 }
 async function refresh(){
  if(!valid())return;
  if(pending)return pending;
  const work=(async()=>{try{const data=await load();if(valid()){if(data?.customer_id!==initialOwner)throw Error('Phiên tài khoản đã thay đổi.');apply(data);}}catch(error){if(valid())fail(error);}})();
  pending=work;try{await work;}finally{if(pending===work)pending=null;}
 }
 return {refresh,schedule,visible(){if(dirty)schedule();},valid,owner:initialOwner,dispose(){active=false;dirty=false;clearTimer(timer);timer=null;}};
}
