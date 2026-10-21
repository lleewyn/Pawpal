-- Read models required by the existing Dashboard. No sample business data.
BEGIN;
CREATE TABLE IF NOT EXISTS public.product (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_name text NOT NULL CHECK(length(trim(product_name))>0),
 status text NOT NULL DEFAULT 'dang_ban', brand_name text, description text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.product_variant (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.product(id) ON DELETE CASCADE,
 sku_variant text NOT NULL UNIQUE, cost_price numeric(12,2) NOT NULL DEFAULT 0 CHECK(cost_price>=0),
 sale_price numeric(12,2) NOT NULL DEFAULT 0 CHECK(sale_price>=0),
 compare_at_price numeric(12,2) CHECK(compare_at_price>=0), weight numeric(10,2) CHECK(weight>=0),
 barcode text UNIQUE, status text NOT NULL DEFAULT 'dang_ban',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_variant_product_idx ON public.product_variant(product_id);
CREATE TABLE IF NOT EXISTS public.inventory (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_variant_id uuid NOT NULL UNIQUE REFERENCES public.product_variant(id) ON DELETE CASCADE,
 quantity_in_stock integer NOT NULL DEFAULT 0 CHECK(quantity_in_stock>=0),
 minimum_stock integer NOT NULL DEFAULT 5 CHECK(minimum_stock>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.chat_conversation (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid REFERENCES public.customer(id) ON DELETE SET NULL,
 session_token varchar(100), status varchar(20) NOT NULL DEFAULT 'bot_handling'
 CHECK(status IN ('bot_handling','waiting_agent','agent_handling','resolved','closed')),
 sentiment_level integer NOT NULL DEFAULT 2 CHECK(sentiment_level BETWEEN 1 AND 5),
 sentiment_trend varchar(20) NOT NULL DEFAULT 'stable' CHECK(sentiment_trend IN ('escalating','stable','de_escalating')),
 is_urgent boolean NOT NULL DEFAULT false, assigned_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
 ai_summary text, internal_note text, sla_deadline timestamptz,
 violation_count integer NOT NULL DEFAULT 0 CHECK(violation_count>=0), blocked_until timestamptz,
 channel varchar(20) NOT NULL DEFAULT 'web' CHECK(channel IN ('web','mobile','zalo','facebook')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_conversation_customer_idx ON public.chat_conversation(customer_id);
CREATE INDEX IF NOT EXISTS chat_conversation_status_idx ON public.chat_conversation(status,created_at DESC);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['product','product_variant','inventory','chat_conversation'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  EXECUTE format('DROP POLICY IF EXISTS dashboard_staff_read ON public.%I',t);
  EXECUTE format('CREATE POLICY dashboard_staff_read ON public.%I FOR SELECT TO authenticated USING(public.pawpal_is_staff())',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['sales_order','appointment','support_ticket','product','product_variant','inventory','staff','service','chat_conversation'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
   EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
  END IF;
 END LOOP;
END $$;
INSERT INTO pawpal_private.bootstrap_version(version) VALUES('004_dashboard_dependencies') ON CONFLICT DO NOTHING;
NOTIFY pgrst,'reload schema';
COMMIT;
