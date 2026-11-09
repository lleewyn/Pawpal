'use strict';
const fs=require('node:fs'),source=fs.readFileSync('scripts/database/v1/199_review_media.sql','utf8'),original=source.match(/CREATE OR REPLACE FUNCTION pawpal_private.media_session_manage[\s\S]*?END \$function\$/)[0];
const needle=" IF s.purpose IN ('ticket_image','return_image')";if(original.split(needle).length!==2)throw Error('DRAFT_HELPER_SOURCE_DRIFT');
const changed=original.replace(needle,()=>` IF s.purpose='ticket_image' AND NOT EXISTS(SELECT 1 FROM public.support_ticket WHERE id=s.ticket_id) THEN
  RETURN coalesce(s.created_by=p_user AND (pawpal_private.evidence_admin(p_user) OR pawpal_private.evidence_customer(p_user) IS NOT NULL),false);
 END IF;
`+needle);
fs.writeFileSync('scripts/database/v1/202_ticket_draft_media_access.sql','BEGIN;\n'+changed+';\nCOMMIT;\n');
fs.writeFileSync('scripts/database/v1/202_ticket_draft_media_access.rollback.sql','BEGIN;\n'+original+';\nCOMMIT;\n');
console.log('TICKET_DRAFT_ACCESS_GENERATED');
