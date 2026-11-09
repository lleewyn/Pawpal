'use strict';
const fs=require('node:fs'),s=fs.readFileSync('scripts/database/v1/199_review_media.sql','utf8'),old=s.match(/CREATE OR REPLACE FUNCTION public.resolve_media_asset[\s\S]*?END \$function\$/)[0];
const needle="'sha256',a.sha256,'public',public_read)";
if(old.split(needle).length!==2)throw Error('RESOLVE_SOURCE_DRIFT');
const updated=old.replace(needle,"'sha256',a.sha256,'public',public_read,'cache_public',public_read AND s.purpose<>'review_image')");
fs.writeFileSync('scripts/database/v1/200_review_media_cache.sql',"BEGIN;\nSET LOCAL lock_timeout='3s';\n"+updated+";\nCOMMIT;\n");
fs.writeFileSync('scripts/database/v1/200_review_media_cache.rollback.sql','BEGIN;\n'+old+';\nCOMMIT;\n');
console.log('REVIEW_CACHE_POLICY_GENERATED');
