-- Allow an item to reference either a product or a service.
-- Existing product favorites are preserved. Invalid existing rows abort the
-- transaction rather than being silently deleted or rewritten.
BEGIN;

ALTER TABLE public.wishlist_item
    ALTER COLUMN product_id DROP NOT NULL,
    ALTER COLUMN service_id DROP NOT NULL;

ALTER TABLE public.wishlist_item
    DROP CONSTRAINT IF EXISTS wishlist_item_exactly_one_target;

ALTER TABLE public.wishlist_item
    ADD CONSTRAINT wishlist_item_exactly_one_target
    CHECK (num_nonnulls(product_id, service_id) = 1);

COMMIT;

-- Read-only verification after applying this migration.
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'wishlist_item'
  AND column_name IN ('product_id', 'service_id');
