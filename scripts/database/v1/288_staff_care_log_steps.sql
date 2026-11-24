BEGIN;

CREATE FUNCTION public.get_staff_care_log_steps(p_appointment uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE actor uuid := pawpal_private.work_actor();
BEGIN
    IF actor IS NULL OR NOT pawpal_private.has_permission('work.service.perform')
        OR NOT pawpal_private.work_owns_appointment(p_appointment) THEN
        RAISE EXCEPTION 'work_assignment_required' USING ERRCODE = '42501';
    END IF;

    RETURN (
        SELECT coalesce(jsonb_agg(step.action_name ORDER BY step.is_primary DESC, step.item_id, step.display_order, step.action_name), '[]'::jsonb)
        FROM (
            SELECT DISTINCT ON (lower(btrim(a.action_name)))
                btrim(a.action_name) AS action_name, i.is_primary, i.id AS item_id, sc.display_order
            FROM public.appointment_item i
            JOIN public.service_care_action sc ON sc.service_id = i.service_id
            JOIN public.care_action a ON a.id = sc.care_action_id
            WHERE i.appointment_id = p_appointment
                AND i.status <> 'cancelled'
                AND a.is_active
                AND btrim(a.action_name) <> ''
            ORDER BY lower(btrim(a.action_name)), i.is_primary DESC, i.id, sc.display_order, a.id
        ) step
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_staff_care_log_steps(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_care_log_steps(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
