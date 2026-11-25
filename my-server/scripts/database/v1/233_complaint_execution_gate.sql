BEGIN;
ALTER TABLE public.support_ticket
 ADD COLUMN IF NOT EXISTS resolution_announced_at timestamptz,
 ADD COLUMN IF NOT EXISTS resolution_started_at timestamptz,
 ADD COLUMN IF NOT EXISTS proposal_rejected_at timestamptz;

CREATE OR REPLACE FUNCTION pawpal_private.customer_complaint_status(t public.support_ticket)
RETURNS text LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
 SELECT CASE WHEN t.status IN ('new','pending','waiting_manager_approval','reprocessing') THEN 'pending'
 WHEN t.status='processing' AND (t.resolution_announced_at IS NULL OR t.resolution_started_at IS NULL) THEN 'pending'
 ELSE t.status END;
$$;
REVOKE ALL ON FUNCTION pawpal_private.customer_complaint_status(public.support_ticket) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION pawpal_private.reset_complaint_execution()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.status IN ('resolved','closed','completed','rejected') AND NEW.status NOT IN ('resolved','closed','completed','rejected') THEN
  NEW.resolution_announced_at:=NULL;NEW.resolution_started_at:=NULL;NEW.proposal_rejected_at:=NULL;
  NEW.resolved_by:=NULL;NEW.approved_amount:=NULL;NEW.resolution_type:=NULL;NEW.resolution_note:=NULL;
 END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reset_complaint_execution ON public.support_ticket;
CREATE TRIGGER reset_complaint_execution BEFORE UPDATE ON public.support_ticket FOR EACH ROW EXECUTE FUNCTION pawpal_private.reset_complaint_execution();

DO $$ DECLARE src text; needle text;
BEGIN
 src:=pg_get_functiondef('public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb)'::regprocedure);
 IF position('complaint_execution_not_started' IN src)=0 THEN
  src:=replace(src,$s$'close','reopen','link_source')$s$,$s$'close','reopen','link_source','start_resolution')$s$);
  needle:=$s$ELSIF p_action='complete' THEN$s$;
  IF position(needle IN src)=0 THEN RAISE EXCEPTION 'unexpected_complaint_complete';END IF;
  src:=replace(src,needle,$s$ELSIF p_action='start_resolution' THEN
  IF ticket.status<>'processing' OR ticket.resolved_by IS NULL OR ticket.approved_amount IS NULL
   OR ticket.resolution_type IN ('explain','reject') OR ticket.resolution_type IS NULL
   OR ticket.proposal_rejected_at IS NOT NULL OR ticket.resolution_started_at IS NOT NULL
  THEN RAISE EXCEPTION 'complaint_approved_plan_required' USING ERRCODE='22023'; END IF;
  internal_value:=false;next_status:='processing';
  note_value:='Phương án đã được duyệt: '||CASE ticket.resolution_type
   WHEN 'refund' THEN 'Hoàn tiền' WHEN 'rma_refund' THEN 'Trả hàng và hoàn tiền'
   WHEN 'rma_exchange' THEN 'Đổi sản phẩm' WHEN 'redo_service' THEN 'Làm lại dịch vụ'
   WHEN 'change_staff' THEN 'Đổi kỹ thuật viên' WHEN 'points' THEN 'Cộng Paw Points'
   WHEN 'voucher' THEN 'Tặng voucher' ELSE ticket.resolution_type END||
   CASE WHEN ticket.approved_amount>0 THEN ' · '||ticket.approved_amount::text||CASE WHEN ticket.resolution_type='points' THEN ' điểm' ELSE ' đ' END ELSE '' END||E'\n'||note_value;
  UPDATE public.support_ticket SET resolution_announced_at=clock_timestamp(),resolution_started_at=clock_timestamp() WHERE id=ticket.id;
 ELSIF p_action='complete' THEN
  IF ticket.resolution_announced_at IS NULL OR ticket.resolution_started_at IS NULL THEN
   RAISE EXCEPTION 'complaint_execution_not_started' USING ERRCODE='22023';END IF;
 $s$);
  needle:=$s$next_status:=CASE WHEN p_action='propose' THEN 'waiting_manager_approval' ELSE 'resolved' END;$s$;
  IF position(needle IN src)=0 THEN RAISE EXCEPTION 'unexpected_complaint_proposal';END IF;
  src:=replace(src,needle,$s$IF ticket.proposal_rejected_at IS NOT NULL AND (p_action<>'resolve' OR option_value<>'reject') THEN
   RAISE EXCEPTION 'complaint_rejected_proposal_requires_reply' USING ERRCODE='22023';END IF;
  IF p_action='resolve' THEN internal_value:=false;
   note_value:=CASE WHEN option_value='reject' THEN 'Từ chối khiếu nại: ' ELSE 'Giải thích và phản hồi: ' END||note_value;
  END IF;
  UPDATE public.support_ticket SET resolution_announced_at=NULL,resolution_started_at=NULL WHERE id=ticket.id;
  next_status:=CASE WHEN p_action='propose' THEN 'waiting_manager_approval' ELSE 'resolved' END;$s$);
  needle:=$s$next_status:='processing';
  UPDATE public.support_ticket SET approved_amount=CASE WHEN p_action='approve'$s$;
  IF position(needle IN src)=0 THEN RAISE EXCEPTION 'unexpected_complaint_approval';END IF;
  src:=replace(src,needle,$s$next_status:=CASE WHEN p_action='approve' THEN 'processing' ELSE 'new' END;
  UPDATE public.support_ticket SET proposal_rejected_at=CASE WHEN p_action='reject_proposal' THEN clock_timestamp() ELSE NULL END,
   resolution_announced_at=NULL,resolution_started_at=NULL,
   approved_amount=CASE WHEN p_action='approve'$s$);
  src:=replace(src,$s$WHEN 'link_source' THEN 'Liên kết giao dịch'$s$,$s$WHEN 'start_resolution' THEN 'Thông báo phương án và bắt đầu xử lý' WHEN 'link_source' THEN 'Liên kết giao dịch'$s$);
  EXECUTE src;
 END IF;
 -- Upgrade an earlier installation of this gate without duplicating transitions.
 src:=pg_get_functiondef('public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb)'::regprocedure);
 IF position('Phương án đã được duyệt:' IN src)=0 THEN
  EXECUTE replace(src,$s$internal_value:=false;next_status:='processing';$s$,$s$internal_value:=false;next_status:='processing';
  note_value:='Phương án đã được duyệt: '||CASE ticket.resolution_type
   WHEN 'refund' THEN 'Hoàn tiền' WHEN 'rma_refund' THEN 'Trả hàng và hoàn tiền'
   WHEN 'rma_exchange' THEN 'Đổi sản phẩm' WHEN 'redo_service' THEN 'Làm lại dịch vụ'
   WHEN 'change_staff' THEN 'Đổi kỹ thuật viên' WHEN 'points' THEN 'Cộng Paw Points'
   WHEN 'voucher' THEN 'Tặng voucher' ELSE ticket.resolution_type END||
   CASE WHEN ticket.approved_amount>0 THEN ' · '||ticket.approved_amount::text||CASE WHEN ticket.resolution_type='points' THEN ' điểm' ELSE ' đ' END ELSE '' END||E'\n'||note_value;$s$);
 END IF;
 src:=pg_get_functiondef('public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb)'::regprocedure);
 IF position('Từ chối khiếu nại:' IN src)=0 THEN
  EXECUTE replace(src,$s$IF p_action='resolve' THEN internal_value:=false;END IF;$s$,$s$IF p_action='resolve' THEN internal_value:=false;
   note_value:=CASE WHEN option_value='reject' THEN 'Từ chối khiếu nại: ' ELSE 'Giải thích và phản hồi: ' END||note_value;END IF;$s$);
 END IF;
 -- Staff may decide the two non-compensatory options and start an approved plan.
 src:=pg_get_functiondef('pawpal_private.work_guard_rpc(text,jsonb)'::regprocedure);
 needle:=$s$IF args->>'p_action' NOT IN ('message','request_info','propose') OR args->>'p_action' IS NULL$s$;
 IF position(needle IN src)>0 THEN
 EXECUTE replace(src,needle,$s$IF (args->>'p_action' NOT IN ('message','request_info','propose','start_resolution','complete') AND NOT (
  args->>'p_action'='resolve' AND args->'p_details'->>'option' IN ('explain','reject')
 )) OR args->>'p_action' IS NULL$s$);
 ELSIF position('start_resolution' IN src)=0 THEN RAISE EXCEPTION 'unexpected_complaint_staff_guard';END IF;
END $$;

DO $$ DECLARE src text; sig text;
BEGIN
 -- Keep pagination, counts and row labels on the same customer-facing status.
 src:=pg_get_functiondef('public.own_support_tickets(integer,text,uuid,integer)'::regprocedure);
 src:=replace(src,$s$FILTER(WHERE status='pending')$s$,$s$FILTER(WHERE pawpal_private.customer_complaint_status(support_ticket) IN ('pending','waiting_customer'))$s$);
 src:=replace(src,$s$FILTER(WHERE status IN ('processing','waiting_customer','waiting_manager_approval','reprocessing'))$s$,$s$FILTER(WHERE pawpal_private.customer_complaint_status(support_ticket)='processing')$s$);
 src:=replace(src,$s$t.category,t.status,t.priority$s$,$s$t.category,pawpal_private.customer_complaint_status(t) AS status,t.priority$s$);
 src:=replace(src,$s$p_filter='pending' AND status='pending'$s$,$s$p_filter='pending' AND pawpal_private.customer_complaint_status(support_ticket) IN ('pending','waiting_customer')$s$);
 src:=replace(src,$s$p_filter='processing' AND status IN ('processing','waiting_customer','waiting_manager_approval','reprocessing')$s$,$s$p_filter='processing' AND pawpal_private.customer_complaint_status(support_ticket)='processing'$s$);
 EXECUTE src;
 src:=pg_get_functiondef('public.own_support_tickets()'::regprocedure);
 EXECUTE replace(src,$s$t.category,t.status,t.priority$s$,$s$t.category,pawpal_private.customer_complaint_status(t) AS status,t.priority$s$);
 src:=pg_get_functiondef('public.get_staff_workspace(text,text,uuid,integer)'::regprocedure);
 IF position('st.resolution_started_at' IN src)=0 THEN
  IF position('st.approved_amount,' IN src)=0 THEN RAISE EXCEPTION 'unexpected_staff_complaint_projection';END IF;
  EXECUTE replace(src,'st.approved_amount,','st.approved_amount,st.resolved_by,st.resolution_announced_at,st.resolution_started_at,st.proposal_rejected_at,');
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
