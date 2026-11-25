-- Migration 045: Cấp quyền SELECT công khai cho vai trò anon và authenticated trên các bảng Catalog & Content
-- Giúp website Khách hàng (Trang chủ, Cửa hàng, Dịch vụ, Blog, Đánh giá, FAQ) đọc dữ liệu từ Cloud Supabase

BEGIN;

-- 1. Cấp quyền truy cập schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Cấp quyền SELECT cho các bảng Catalog & Public Content
DO $$
DECLARE
    tbl text;
    public_tables text[] := ARRAY[
        'product',
        'product_category',
        'product_variant',
        'product_media',
        'product_variant_media',
        'variant_color',
        'variant_size',
        'variant_flavor',
        'inventory',
        'service',
        'service_category',
        'service_price_matrix',
        'service_addon',
        'service_image',
        'service_care_action',
        'service_supported_species',
        'banner',
        'blog_category',
        'blog_post',
        'review',
        'review_media',
        'review_response',
        'pet_species',
        'pet_breed',
        'hotel_room_type',
        'hotel_room',
        'taxi_price_rule',
        'delivery_option_config',
        'payment_method_config',
        'shipping_provider',
        'membership_tier',
        'promotion',
        'promotion_product',
        'promotion_service',
        'chatbot_knowledge_faq',
        'chatbot_canned_response'
    ];
BEGIN
    FOREACH tbl IN ARRAY public_tables LOOP
        -- Cấp quyền SELECT cho anon
        EXECUTE format('GRANT SELECT ON public.%I TO anon', tbl);
        
        -- Tạo hoặc thay thế RLS policy cho phép anon đọc
        EXECUTE format('DROP POLICY IF EXISTS anon_read ON public.%I', tbl);
        EXECUTE format('CREATE POLICY anon_read ON public.%I FOR SELECT TO anon USING (true)', tbl);

        -- Đồng thời đảm bảo authenticated (khách hàng đã đăng nhập) cũng có policy đọc công khai nếu chưa có
        EXECUTE format('DROP POLICY IF EXISTS public_read ON public.%I', tbl);
        EXECUTE format('CREATE POLICY public_read ON public.%I FOR SELECT TO authenticated USING (true)', tbl);
    END LOOP;
END $$;

-- 3. Cấp quyền SELECT cho các view công khai
GRANT SELECT ON public.staff_public_view TO anon, authenticated;
GRANT SELECT ON public.pet_current_weight TO anon, authenticated;

-- 4. Báo cho PostgREST tải lại schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
