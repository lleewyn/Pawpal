// Reviewed chat DDL only; verification fixtures never leave the restored DB.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {infra,cloud,sql}=require('./cloud_connection.cjs');
if(!['apply','apply-security','apply-keys','apply-settings','apply-portal-profile','apply-portal-pet','apply-portal-diary','apply-portal-sales','apply-portal-bookings','apply-portal-loyalty','apply-portal-wishlist'].includes(process.argv[2]))throw Error('Use apply after isolated API/browser verification');
const files=process.argv[2]==='apply-portal-wishlist'?['075_customer_wishlist.sql']:process.argv[2]==='apply-portal-loyalty'?['074_customer_loyalty.sql']:process.argv[2]==='apply-portal-bookings'?['065_customer_booking_summary.sql','066_customer_booking_cancel.sql','067_customer_booking_reschedule.sql','068_customer_booking_create.sql']:process.argv[2]==='apply-portal-sales'?['061_customer_cart.sql','062_customer_sales_gateway.sql','063_customer_sales_reviews.sql','064_customer_checkout_address.sql']:process.argv[2]==='apply-portal-diary'?['060_customer_pet_diary_access.sql']:process.argv[2]==='apply-portal-pet'?['059_customer_portal_pet.sql']:process.argv[2]==='apply-portal-profile'?['058_customer_portal_profile.sql']:process.argv[2]==='apply-settings'?['057_admin_settings.sql']:process.argv[2]==='apply-security'?['050_admin_chat_security.sql']:process.argv[2]==='apply-keys'?['056_private_ai_key_rotation.sql']:['045_admin_chat_inbox.sql','046_admin_chat_operations.sql','047_admin_chat_resolution.sql','048_admin_chat_complaint.sql','049_admin_chat_transfer.sql','050_admin_chat_security.sql','051_admin_chat_rules.sql','052_admin_chat_benchmark.sql','053_admin_chat_history.sql','054_chat_feedback.sql','055_public_chat_gateway.sql','056_private_ai_key_rotation.sql'];
if(process.argv[2]==='apply-portal-bookings')files.push('070_customer_service_reviews.sql','071_customer_booking_logistics.sql','072_public_service_directory.sql','073_customer_support.sql');
if(files.some(f=>!fs.existsSync(path.join(__dirname,f))))throw Error('Missing reviewed chat migration');
const shapeQuery="SELECT md5(string_agg(table_name||'.'||column_name||':'||data_type||':'||is_nullable,',' ORDER BY table_name,ordinal_position)) FROM information_schema.columns WHERE table_schema='public'";
const shape=sql(shapeQuery);
const release=process.argv[2]==='apply-portal-wishlist'?'portal-wishlist':process.argv[2]==='apply-portal-loyalty'?'portal-loyalty':process.argv[2]==='apply-portal-bookings'?'portal-bookings':process.argv[2]==='apply-portal-sales'?'portal-sales':process.argv[2]==='apply-portal-diary'?'portal-diary':process.argv[2]==='apply-portal-pet'?'portal-pet':process.argv[2]==='apply-portal-profile'?'portal-profile':process.argv[2]==='apply-settings'?'settings':'chats';
const folder=path.join(infra,'backups',release+'-cloud-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(folder,{recursive:true});
const dump=cloud('pg_dump',['--schema=public','--schema=pawpal_private','--schema=auth','--no-owner'],'',{folder,timeout:180000});
fs.writeFileSync(path.join(folder,'before-chats.private.sql'),dump);fs.writeFileSync(path.join(folder,'before-SHA256.txt'),crypto.createHash('sha256').update(dump).digest('hex')+'\n');
// Snapshot every public row and Auth credentials/ban state inside one transaction.
// All migrations and comparison roll back together on any error.
const snapshot=`CREATE FUNCTION pg_temp.chats_release_snapshot() RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE t record; digest text; result jsonb:='{}'; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text,chr(10) ORDER BY to_jsonb(r)::text),'''')) FROM public.%I r',t.tablename) INTO digest;
  result:=result||jsonb_build_object(t.tablename,digest);
 END LOOP;
 SELECT md5(coalesce(string_agg(jsonb_build_array(id,email,encrypted_password,banned_until)::text,chr(10) ORDER BY id),'')) INTO digest FROM auth.users;
 RETURN result||jsonb_build_object('auth_identity_password_ban',digest);END $$;
CREATE TEMP TABLE chats_release_before ON COMMIT DROP AS SELECT pg_temp.chats_release_snapshot() AS snapshot;`;
const source=files.map(f=>fs.readFileSync(path.join(__dirname,f),'utf8').replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,'')).join('\n');
const transaction=`BEGIN; SET LOCAL lock_timeout='15s';\n${snapshot}\n${source}\nDO $$ BEGIN
 IF (SELECT snapshot FROM chats_release_before) IS DISTINCT FROM pg_temp.chats_release_snapshot() THEN RAISE EXCEPTION 'Chat release changed source data; rollback'; END IF;
 IF (SELECT count(*) FROM pg_tables WHERE schemaname='public')<>105 THEN RAISE EXCEPTION 'Unexpected schema shape'; END IF;
 END $$; COMMIT;`;
sql(transaction,{folder,timeout:180000});
const after=sql(shapeQuery);if(shape!==after)throw Error('Physical schema changed');
const staffCount=Number(sql('SELECT count(*) FROM public.staff'));
fs.writeFileSync(path.join(folder,'verification.txt'),JSON.stringify({verifiedAt:new Date().toISOString(),shape:after,staffCount,allPublicRowsAndAuthCredentialsAndBansUnchanged:true,atomic:true,migrations:files},null,2));
console.log('PASS Cloud '+release+' migrations applied atomically; all public rows/Auth credentials/ban states unchanged; '+staffCount+' source staff. Backup: '+folder);
