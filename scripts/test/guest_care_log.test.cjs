const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('pages/public/return-guest/return-guest.js','utf8');
async function run(user, rows=[]) {
 const timeline={dataset:{},setAttribute(){},innerHTML:''},title={};let queried=false,projection='';
 const query={select(value){projection=value;return this},eq(){return this},async order(){return {data:rows,error:null}}};
 const db={auth:{async getUser(){return {data:{user}}}},from(table){assert.equal(table,'care_log');queried=true;return query}};
 const context={window:{getSupabaseClient:()=>db},document:{getElementById:id=>id==='guestCareLogTimeline'?timeline:title},getOrCreateGuestCareLogModal:()=>({show(){}}),rgLastSearchState:{bookings:[]},esc:v=>String(v??'').replaceAll('<','&lt;').replaceAll('"','&quot;'),fmtDate:()=> '23/10/2026',normalizeImageUrl:v=>v,console};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('let guestCareLogRequestId'),source.indexOf('function getOrCreateGuestCareLogModal')),context);
 await context.window.handleGuestViewCareLog('11111111-1111-1111-1111-111111111111');return {timeline,queried,projection};
}
test('anonymous visitor is prompted to sign in without querying diary',async()=>{const r=await run(null);assert.equal(r.queried,false);assert.match(r.timeline.innerHTML,/href="\/login"/)});
test('owner diary uses current schema and escapes recorded content',async()=>{const r=await run({id:'owner'},[{recorded_at:'2026-10-23T10:00:00Z',action_name_snapshot:'Bath',description:'<script>bad</script>',observed_condition:'Stable',care_log_media:[]}]);assert.doesNotMatch(r.projection,/health_status|care_action \(/);assert.match(r.projection,/observed_condition/);assert.match(r.timeline.innerHTML,/Bath/);assert.match(r.timeline.innerHTML,/&lt;script>/);assert.match(r.timeline.innerHTML,/Stable/)});
