-- Chay TOAN BO file trong SQL Editor cua Supabase Cloud cu.
-- Chi doc danh muc; tao ham TAM pg_temp cho phien SQL, khong sua bang nghiep vu.
-- Khong doc auth.users, mat khau, OTP, phien, API key, khach, don hoac lich su chat.
-- rows_json la ket qua trao doi du lieu, khong phai file JSON mock cua ung dung.
CREATE OR REPLACE FUNCTION pg_temp.pawpal_export_reference_data(
    row_limit integer DEFAULT 100,
    row_offset integer DEFAULT 0
) RETURNS TABLE (
    dataset text,
    source_table text,
    status text,
    total_rows bigint,
    exported_rows integer,
    exported_columns text[],
    rows_json jsonb
) LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE
    spec text;
    source_name text;
    allowed_names text[];
    selected_names text[];
    projection text;
    payload jsonb;
    full_count bigint;
    specs text[] := ARRAY[
      'membership_tier|id,tier_name,minimum_expenditure,discount_percent,description,is_active,created_at,updated_at',
      'reward_rule|id,rule_name,reward_type,trigger_event,reward_value,description,is_active,created_at,updated_at',
      'pet_species|id,species_name,is_active',
      'pet_breed|id,species_id,breed_name,is_active',
      'pet_profile|species,breed',
      'staff_level|id,level_code,level_name,rank_order,is_active',
      'service_category|id,category_code,category_name',
      'service|id,service_code,service_name,description,estimated_duration,status,commission_rate,benefits,category_id,staff_level_required_id,amenities,service_category,service_type,groomer_level,staff_level_required,base_price,price',
      'service_addon|id,service_id,addon_name,description,price,estimated_duration,is_required,status',
      'care_action|id,action_name,is_active,service_category,service_id',
      'service_care_action|service_id,care_action_id,display_order,estimated_duration',
      'service_supported_species|service_id,species_id',
      'service_supported_pet_type|id,service_id,pet_type,species,species_id',
      'service_price_matrix|id,service_id,weight_from,weight_to,unit_price,effective_from,effective_to,status',
      'taxi_price_rule|id,distance_from,distance_to,weight_from,weight_to,base_price,surcharge,effective_from,effective_to,status',
      'hotel_room_type|id,room_type,capacity,daily_price,description,amenities,status',
      'hotel_room|id,room_number,room_type_id,status,description',
      'product_category|id,category_name,description,status',
      'category|id,category_name,name,description,status',
      'brand|id,brand_name,name,status',
      'variant_color|id,color_name,hex_code,display_order,is_active',
      'variant_size|id,size_name,display_order,is_active',
      'variant_flavor|id,flavor_name,display_order,is_active',
      'product|id,category_id,product_name,unit,target_pet,description,slug,status,origin,ingredients,benefits,usage_instructions,specs,badge,brand_name,brand_id',
      'product_variant|id,product_id,color_id,size_id,flavor_id,sku_variant,cost_price,sale_price,compare_at_price,weight,barcode,status',
      'supplier|id,supplier_name,status',
      'voucher|id,voucher_code,voucher_name,discount_value,minimum_order_amount,required_points,start_date,end_date,is_active,type,description,applicable_for,max_usage',
      'promotion|id,promotion_name,description,discount_type,discount_value,start_date,end_date,minimum_order_value,status',
      'promotion_product|id,promotion_id,product_variant_id,product_id',
      'promotion_service|id,promotion_id,service_id',
      'payment_method_config|id,name,short_name,description,fee,available,requires_info',
      'delivery_option_config|id,name,description,fee,estimated_days,available',
      'shipping_provider|id,provider_name,provider_code,status'
    ];
BEGIN
    IF row_limit NOT BETWEEN 1 AND 500 OR row_offset < 0 OR row_limit IS NULL OR row_offset IS NULL THEN
        RAISE EXCEPTION 'row_limit must be 1..500; row_offset must be >= 0';
    END IF;
    FOREACH spec IN ARRAY specs LOOP
        source_name := split_part(spec,'|',1);
        allowed_names := string_to_array(split_part(spec,'|',2),',');
        dataset := CASE WHEN source_name='pet_profile' THEN 'legacy_pet_taxonomy'
                        WHEN source_name IN ('brand','category','service_supported_pet_type') THEN 'legacy_'||source_name
                        ELSE source_name END;
        source_table := 'public.'||source_name;
        total_rows := 0;
        exported_rows := 0;
        exported_columns := '{}'::text[];
        rows_json := '[]'::jsonb;
        IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                      WHERE n.nspname='public' AND c.relname=source_name AND c.relkind IN ('r','p','v','m')) THEN
            status := 'missing_table';
            RETURN NEXT;
            CONTINUE;
        END IF;
        SELECT array_agg(names.name ORDER BY names.position)
        INTO selected_names
        FROM unnest(allowed_names) WITH ORDINALITY names(name,position)
        WHERE EXISTS(SELECT 1 FROM information_schema.columns cols
                     WHERE cols.table_schema='public' AND cols.table_name=source_name AND cols.column_name=names.name);
        IF selected_names IS NULL THEN
            status := 'no_matching_columns';
            RETURN NEXT;
            CONTINUE;
        END IF;
        exported_columns := selected_names;
        SELECT string_agg(format('%I',name),', ') INTO projection FROM unnest(selected_names) AS names(name);
        BEGIN
            -- Pet rows are reduced to distinct species/breed only; no customer or pet ID.
            EXECUTE format('SELECT count(*) FROM (SELECT DISTINCT to_jsonb(x) FROM (SELECT %s FROM public.%I) x) unique_rows',projection,source_name) INTO full_count;
            EXECUTE format(
                'SELECT coalesce(jsonb_agg(row_data ORDER BY row_data),''[]''::jsonb) '
                ||'FROM (SELECT DISTINCT to_jsonb(x) AS row_data FROM (SELECT %s FROM public.%I) x ORDER BY row_data OFFSET $1 LIMIT $2) batch',
                projection,source_name
            ) INTO payload USING row_offset,row_limit;
            total_rows := full_count;
            rows_json := payload;
            exported_rows := jsonb_array_length(payload);
            status := CASE WHEN full_count=0 THEN 'empty'
                           WHEN row_offset+exported_rows<full_count THEN 'more_rows'
                           WHEN row_offset>=full_count THEN 'offset_past_end'
                           ELSE 'complete' END;
        EXCEPTION
            WHEN insufficient_privilege THEN status := 'access_denied';
            WHEN OTHERS THEN status := 'query_error_'||SQLSTATE;
        END;
        RETURN NEXT;
    END LOOP;
END $$;

-- Ket qua 33 dong: moi dong la mot danh muc, khong phai 100 dong tong cho tat ca bang.
-- Neu status=more_rows: chay lai SELECT voi offset 100, 200... de lay phan con lai.
SELECT * FROM pg_temp.pawpal_export_reference_data(100,0)
ORDER BY dataset;
