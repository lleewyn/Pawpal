BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE INDEX IF NOT EXISTS member_booking_hold_expires_idx ON pawpal_private.member_booking_hold(expires_at);
CREATE OR REPLACE FUNCTION pawpal_private.expire_booking_holds()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE removed integer;
BEGIN
 PERFORM pg_advisory_xact_lock(820068);
 DELETE FROM pawpal_private.member_booking_hold WHERE expires_at<=clock_timestamp();
 GET DIAGNOSTICS removed=ROW_COUNT;
 RETURN removed;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.expire_booking_holds() FROM PUBLIC,anon,authenticated,service_role;
-- Availability ignores expired leases immediately; cron removes their stored rows within a minute.
SELECT cron.schedule('pawpal-expire-booking-holds','* * * * *','SELECT pawpal_private.expire_booking_holds()');

CREATE OR REPLACE FUNCTION public.admin_active_booking_holds(p_start timestamptz,p_end timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT pawpal_private.has_permission('staff_schedule.read') THEN RAISE EXCEPTION 'staff_schedule_forbidden' USING ERRCODE='42501';END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_end<=p_start OR p_end-p_start>interval '31 days' THEN RAISE EXCEPTION 'invalid_hold_range' USING ERRCODE='22023';END IF;
 RETURN jsonb_build_object('server_now',clock_timestamp(),'holds',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'staff_id',staff_id,'scheduled_start_at',starts,'scheduled_end_at',ends,'expires_at',expires_at) ORDER BY starts,id)
  FROM pawpal_private.member_booking_hold WHERE expires_at>clock_timestamp() AND starts<p_end AND ends>p_start
  AND (pawpal_private.work_is_admin() OR staff_id=pawpal_private.work_actor())),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.admin_active_booking_holds(timestamptz,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_active_booking_holds(timestamptz,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
