const fs=require('node:fs'),assert=require('node:assert/strict');const {createClient}=require('@supabase/supabase-js');const {settings}=require('../database/v1/cloud_connection.cjs');
(async()=>{const {config}=settings(),credentials=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');let requests=0,bytes=0;
 const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(...args)=>{if(++requests>7)throw Error('Request cap');const response=await fetch(...args);bytes+=(await response.clone().arrayBuffer()).byteLength;return response;}}};
 const client=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
 try{const login=await client.auth.signInWithPassword({email:credentials.match(/^Email: (.+)$/m)[1].trim(),password:credentials.match(/^Password: (.+)$/m)[1].trim()});assert.equal(login.error,null);
 for(const filter of ['all','urgent','active']){const result=await client.rpc('get_admin_chat_inbox_view',{p_query:'',p_filter:filter,p_page:1});assert.equal(result.error,null,JSON.stringify(result.error));assert.ok(result.data.rows.length<=10);assert.ok(result.data.rows.every(c=>typeof c.customer_profile.can_handoff==='boolean'));if(filter!=='all')assert.ok(result.data.rows.every(c=>c.can_handoff===true));}
 const anonymous=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);assert.ok((await anonymous.rpc('claim_public_chat',{p_auth:login.data.user.id,p_guest_hash:'0'.repeat(64),p_conversation:'db25d445-d136-4bf8-bde7-42baa36615ed'})).error);
 console.log('PASS live bounded admin filters, membership flags, guest exclusion from human filters, anonymous claim denied.');
 }finally{await client.auth.signOut({scope:'local'});console.log(JSON.stringify({requests,responsePayloadBytes:bytes,imagesDownloaded:0,logsQueried:0,aiCalls:0}));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
