-- Compatible baseline for the first local milestone, not the complete 3NF design.
-- Apply only to the separate self-host database. Do not run on Supabase Cloud.
BEGIN;
CREATE SCHEMA IF NOT EXISTS pawpal_private;
REVOKE ALL ON SCHEMA pawpal_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS pawpal_private.bootstrap_version(version text PRIMARY KEY, applied_at timestamptz DEFAULT now());
DO $$ BEGIN
  IF to_regclass('public.customer') IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM pawpal_private.bootstrap_version WHERE version='001_local_core') THEN
    RAISE EXCEPTION 'Existing customer schema requires manual review; refusing bootstrap';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.membership_tier (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tier_name text NOT NULL UNIQUE,
 minimum_expenditure numeric(14,2) NOT NULL DEFAULT 0 CHECK(minimum_expenditure>=0),
 discount_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK(discount_percent BETWEEN 0 AND 100),
 description text, is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.staff (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
 full_name text NOT NULL CHECK(length(trim(full_name)) BETWEEN 1 AND 150), email text UNIQUE,
 phone_number text, role text, specialization text, hire_date date, address text, dob date, shift text,
 status text NOT NULL DEFAULT 'dang_lam_viec', service_locked boolean NOT NULL DEFAULT false,
 skill_score numeric, account_status text NOT NULL DEFAULT 'ACTIVE' CHECK(account_status IN ('ACTIVE','LOCKED','PENDING_INVITE')),
 system_role text NOT NULL DEFAULT 'STAFF' CHECK(system_role IN ('ADMIN','RECEPTIONIST','GROOMER','CAREGIVER','CSKH','DRIVER','STAFF')),
 permissions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(permissions)='array'),
 must_change_password boolean NOT NULL DEFAULT false, last_login_at timestamptz,
 account_created_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.customer (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
 membership_tier_id uuid REFERENCES public.membership_tier(id), email text UNIQUE,
 phone_main text UNIQUE CHECK(phone_main IS NULL OR phone_main ~ '^[0-9]{10}$'),
 account_status text NOT NULL DEFAULT 'dang_hoat_dong' CHECK(account_status IN ('ACTIVE','LOCKED','INACTIVE','dang_hoat_dong','bi_khoa','ngung_hoat_dong','tam_khoa','da_khoa')),
 is_temporary boolean NOT NULL DEFAULT true, note text, activation_token text UNIQUE,
 activation_token_expires_at timestamptz, registered_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.customer_profile (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL UNIQUE REFERENCES public.customer(id) ON DELETE CASCADE,
 full_name text NOT NULL CHECK(length(trim(full_name)) BETWEEN 1 AND 150), date_of_birth date, gender text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.customer_membership (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL UNIQUE REFERENCES public.customer(id) ON DELETE CASCADE,
 membership_tier_id uuid REFERENCES public.membership_tier(id),
 total_paw_points integer NOT NULL DEFAULT 0 CHECK(total_paw_points>=0), tier_points numeric(14,2) NOT NULL DEFAULT 0 CHECK(tier_points>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.customer_address (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES public.customer(id) ON DELETE CASCADE,
 receiver_name text, receiver_phone text, province text, district text NOT NULL DEFAULT '', ward text NOT NULL DEFAULT '',
 street_address text NOT NULL, postal_code text, is_default boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_one_default_address ON public.customer_address(customer_id) WHERE is_default;
CREATE INDEX IF NOT EXISTS customer_address_customer_idx ON public.customer_address(customer_id);
CREATE TABLE IF NOT EXISTS public.customer_activation_sms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES public.customer(id) ON DELETE CASCADE,
 phone text NOT NULL, activation_url text NOT NULL, status text NOT NULL DEFAULT 'pending',
 sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.pet_profile (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES public.customer(id) ON DELETE CASCADE,
 pet_code text NOT NULL UNIQUE, pet_name text NOT NULL CHECK(length(trim(pet_name)) BETWEEN 1 AND 150),
 avatar_url text, species text NOT NULL, breed text, gender text, date_of_birth date CHECK(date_of_birth<=CURRENT_DATE),
 color text, routine text, weight numeric(6,2) CHECK(weight>0), vaccination_history text, allergy text,
 status text NOT NULL DEFAULT 'dang_hoat_dong', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pet_owner_name_unique ON public.pet_profile(customer_id, lower(trim(pet_name)));
CREATE TABLE IF NOT EXISTS public.pet_weight_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pet_id uuid NOT NULL REFERENCES public.pet_profile(id) ON DELETE CASCADE,
 weight numeric(6,2) NOT NULL CHECK(weight>0), measured_at timestamptz NOT NULL DEFAULT now(),
 recorded_by_name text NOT NULL DEFAULT 'Nhân viên PawPal', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pet_weight_pet_time_idx ON public.pet_weight_history(pet_id, measured_at DESC);

-- Profile history dependencies. No sample orders or appointments are inserted.
CREATE TABLE IF NOT EXISTS public.service (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_code text UNIQUE, service_name text NOT NULL,
 service_category text, description text, estimated_duration integer CHECK(estimated_duration>0),
 thumbnail_url text, status text NOT NULL DEFAULT 'dang_hoat_dong', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.appointment (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), appointment_code text UNIQUE,
 customer_id uuid NOT NULL REFERENCES public.customer(id), pet_id uuid REFERENCES public.pet_profile(id),
 service_id uuid REFERENCES public.service(id), staff_id uuid REFERENCES public.staff(id),
 appointment_date date NOT NULL, appointment_time time, check_in_time timestamptz, check_out_time timestamptz,
 note text, change_count integer NOT NULL DEFAULT 0, appointment_status text NOT NULL DEFAULT 'cho_xac_nhan',
 payment_status text NOT NULL DEFAULT 'chua_thanh_toan', total_price numeric(14,2) NOT NULL DEFAULT 0 CHECK(total_price>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointment_customer_idx ON public.appointment(customer_id);
CREATE INDEX IF NOT EXISTS appointment_pet_idx ON public.appointment(pet_id);
CREATE TABLE IF NOT EXISTS public.care_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), appointment_id uuid REFERENCES public.appointment(id),
 pet_id uuid NOT NULL REFERENCES public.pet_profile(id), description text, health_status text,
 recorded_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.sales_order (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_code text UNIQUE,
 customer_id uuid NOT NULL REFERENCES public.customer(id), shipping_address_id uuid REFERENCES public.customer_address(id),
 order_status text NOT NULL DEFAULT 'cho_xac_nhan', payment_status text NOT NULL DEFAULT 'chua_thanh_toan',
 total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK(total_amount>=0), note text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.support_ticket (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_code text UNIQUE,
 customer_id uuid REFERENCES public.customer(id), user_id uuid REFERENCES public.customer(id),
 order_id uuid REFERENCES public.sales_order(id), appointment_id uuid REFERENCES public.appointment(id),
 title text NOT NULL, type text, status text NOT NULL DEFAULT 'cho_xu_ly', priority text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.paw_point_transaction (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES public.customer(id),
 points integer NOT NULL, balance_after integer CHECK(balance_after>=0), description text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.audit_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), staff_id uuid REFERENCES public.staff(id),
 action text NOT NULL, entity_name text, entity_id uuid, description text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notification (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid REFERENCES public.customer(id),
 notification_type text, title text NOT NULL, content text,
 sales_order_id uuid REFERENCES public.sales_order(id), appointment_id uuid REFERENCES public.appointment(id),
 support_ticket_id uuid REFERENCES public.support_ticket(id), related_entity_type text,
 is_read boolean NOT NULL DEFAULT false, sent_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.pawpal_is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid() AND account_status='ACTIVE') $$;
REVOKE ALL ON FUNCTION public.pawpal_is_staff() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pawpal_is_staff() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.pawpal_owns_customer(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT EXISTS(SELECT 1 FROM public.customer WHERE id=target AND auth_user_id=auth.uid()
 AND account_status IN ('ACTIVE','dang_hoat_dong') AND NOT is_temporary) $$;
REVOKE ALL ON FUNCTION public.pawpal_owns_customer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pawpal_owns_customer(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.check_user_account_type(check_auth_id uuid)
RETURNS TABLE(user_type varchar(20),is_active boolean,role_name varchar(30),profile_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF check_auth_id IS DISTINCT FROM auth.uid() AND coalesce(auth.role(),'')<>'service_role' THEN
  RAISE EXCEPTION 'Cannot inspect another account' USING ERRCODE='42501';
 END IF;
 RETURN QUERY SELECT 'STAFF'::varchar(20),s.account_status='ACTIVE',s.system_role::varchar(30),s.id
 FROM public.staff s WHERE s.auth_user_id=check_auth_id;
 IF FOUND THEN RETURN; END IF;
 RETURN QUERY SELECT 'CUSTOMER'::varchar(20),c.account_status IN ('ACTIVE','dang_hoat_dong'),
 'CUSTOMER'::varchar(30),c.id FROM public.customer c WHERE c.auth_user_id=check_auth_id;
 IF FOUND THEN RETURN; END IF;
 RETURN QUERY SELECT 'UNKNOWN'::varchar(20),false,'NONE'::varchar(30),NULL::uuid;
END $$;
REVOKE ALL ON FUNCTION public.check_user_account_type(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.check_user_account_type(uuid) TO authenticated,service_role;

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.staff TO authenticated;
GRANT UPDATE(last_login_at,updated_at,must_change_password) ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
DROP POLICY IF EXISTS staff_read ON public.staff;
CREATE POLICY staff_read ON public.staff FOR SELECT TO authenticated
 USING(public.pawpal_is_staff() OR (auth_user_id=auth.uid() AND account_status='ACTIVE'));
DROP POLICY IF EXISTS staff_self_session_update ON public.staff;
CREATE POLICY staff_self_session_update ON public.staff FOR UPDATE TO authenticated
 USING(auth_user_id=auth.uid() AND account_status='ACTIVE') WITH CHECK(auth_user_id=auth.uid() AND account_status='ACTIVE');

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['membership_tier','customer','customer_profile','customer_membership','customer_address',
 'customer_activation_sms','pet_profile','pet_weight_history','service','appointment','care_log','sales_order',
 'support_ticket','paw_point_transaction','audit_log','notification'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  EXECUTE format('DROP POLICY IF EXISTS staff_manage ON public.%I',t);
  EXECUTE format('CREATE POLICY staff_manage ON public.%I FOR ALL TO authenticated USING(public.pawpal_is_staff()) WITH CHECK(public.pawpal_is_staff())',t);
 END LOOP;
END $$;
DROP POLICY IF EXISTS customer_own_read ON public.customer;
REVOKE UPDATE,DELETE ON public.audit_log FROM authenticated;
CREATE POLICY customer_own_read ON public.customer FOR SELECT TO authenticated USING(public.pawpal_owns_customer(id));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['customer_profile','customer_membership','customer_address','pet_profile','appointment','sales_order','paw_point_transaction','notification'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS customer_own_read ON public.%I',t);
  EXECUTE format('CREATE POLICY customer_own_read ON public.%I FOR SELECT TO authenticated USING(public.pawpal_owns_customer(customer_id))',t);
 END LOOP;
END $$;
DROP POLICY IF EXISTS customer_pet_weight_read ON public.pet_weight_history;
CREATE POLICY customer_pet_weight_read ON public.pet_weight_history FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.pet_profile p WHERE p.id=pet_id AND public.pawpal_owns_customer(p.customer_id)));

-- Customers cannot edit their own access role or turn themselves into staff.
-- Staff provisioning is server-only. Privileged users must not belong to both portals.
CREATE OR REPLACE FUNCTION pawpal_private.enforce_portal_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.auth_user_id IS NULL THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.auth_user_id::text,0));
 IF TG_TABLE_NAME='staff' THEN
  IF EXISTS(SELECT 1 FROM public.customer WHERE auth_user_id=NEW.auth_user_id) THEN
   RAISE EXCEPTION 'Auth identity already belongs to customer portal'; END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=NEW.auth_user_id) THEN
   RAISE EXCEPTION 'Auth identity already belongs to staff portal'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.enforce_portal_identity() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS enforce_portal_identity ON public.customer;
CREATE TRIGGER enforce_portal_identity BEFORE INSERT OR UPDATE OF auth_user_id ON public.customer
 FOR EACH ROW EXECUTE FUNCTION pawpal_private.enforce_portal_identity();
DROP TRIGGER IF EXISTS enforce_portal_identity ON public.staff;
CREATE TRIGGER enforce_portal_identity BEFORE INSERT OR UPDATE OF auth_user_id ON public.staff
 FOR EACH ROW EXECUTE FUNCTION pawpal_private.enforce_portal_identity();

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['customer','customer_profile','customer_membership','customer_address','pet_profile','pet_weight_history'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
   EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
  END IF;
 END LOOP;
END $$;
INSERT INTO pawpal_private.bootstrap_version(version) VALUES('001_local_core') ON CONFLICT DO NOTHING;
NOTIFY pgrst,'reload schema';
COMMIT;
