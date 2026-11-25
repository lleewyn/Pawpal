BEGIN;

DO $migration$
DECLARE
    definition text := pg_get_functiondef('public.get_admin_sales_order_page(jsonb,integer)'::regprocedure);
    change text[];
    changes text[][] := ARRAY[
        ARRAY[
            $old$WHERE p.order_id IS NOT NULL AND p.transaction_status='succeeded' GROUP BY p.order_id$old$,
            $new$WHERE coalesce(p_filters->>'payStatus','ALL') <> 'ALL' AND p.order_id IS NOT NULL AND p.transaction_status='succeeded' GROUP BY p.order_id$new$
        ],
        ARRAY[
            $old$JOIN public.sales_order_totals t ON t.order_id=o.id$old$,
            $new$LEFT JOIN public.sales_order_totals t ON t.order_id=o.id AND coalesce(p_filters->>'payStatus','ALL') <> 'ALL'$new$
        ],
        ARRAY[
            $old$WHERE entry.order_id=o.id AND entry.transaction_status='succeeded'$old$,
            $new$WHERE coalesce(p_filters->>'payment','ALL') <> 'ALL' AND entry.order_id=o.id AND entry.transaction_status='succeeded'$new$
        ],
        ARRAY[
            $old$EXISTS(SELECT 1 FROM public.return_request r WHERE r.sales_order_id=o.id) has_return$old$,
            $new$CASE WHEN coalesce((p_filters->>'complaint')::boolean,false) THEN EXISTS(SELECT 1 FROM public.return_request r WHERE r.sales_order_id=o.id) ELSE false END has_return$new$
        ],
        ARRAY[
            $old$EXISTS(SELECT 1 FROM public.return_request r WHERE r.sales_order_id=o.id AND r.request_status IN ('pending','approved')) open_return$old$,
            $new$CASE WHEN coalesce((p_filters->>'urgent')::boolean,false) THEN EXISTS(SELECT 1 FROM public.return_request r WHERE r.sales_order_id=o.id AND r.request_status IN ('pending','approved')) ELSE false END open_return$new$
        ]
    ];
BEGIN
    -- Payment and return data affect the page only when their filters are applied.
    FOREACH change SLICE 1 IN ARRAY changes LOOP
        IF position(change[2] in definition) = 0 THEN
            IF position(change[1] in definition) = 0 THEN
                RAISE EXCEPTION 'Unexpected get_admin_sales_order_page definition';
            END IF;
            definition := replace(definition, change[1], change[2]);
        END IF;
    END LOOP;
    EXECUTE definition;
END;
$migration$;

DO $migration$
DECLARE
    definition text := pg_get_functiondef('public.get_admin_service_booking_page(jsonb,integer,boolean)'::regprocedure);
    change text[];
    changes text[][] := ARRAY[
        ARRAY[
            $old$LEFT JOIN public.customer_profile profile ON profile.customer_id=a.customer_id$old$,
            $new$LEFT JOIN public.customer_profile profile ON profile.customer_id=a.customer_id AND (q<>'' OR p_export OR (a.appointment_status IN ('pending','confirmed') AND date_trunc('minute',a.scheduled_start_at) BETWEEN now() AND now()+interval '1 hour'))$new$
        ],
        ARRAY[
            $old$LEFT JOIN public.customer_phone phone ON phone.customer_id=a.customer_id AND phone.is_primary$old$,
            $new$LEFT JOIN public.customer_phone phone ON phone.customer_id=a.customer_id AND phone.is_primary AND (q<>'' OR p_export)$new$
        ],
        ARRAY[
            $old$LEFT JOIN public.pet_profile pet ON pet.id=a.pet_id$old$,
            $new$LEFT JOIN public.pet_profile pet ON pet.id=a.pet_id AND (q<>'' OR p_export OR coalesce((p_filters->>'allergy')::boolean,false) OR (a.appointment_status IN ('pending','confirmed') AND date_trunc('minute',a.scheduled_start_at) BETWEEN now() AND now()+interval '1 hour'))$new$
        ],
        ARRAY[
            $old$LEFT JOIN public.pet_breed breed ON breed.id=pet.breed_id$old$,
            $new$LEFT JOIN public.pet_breed breed ON breed.id=pet.breed_id AND q<>''$new$
        ],
        ARRAY[
            $old$WHERE i.appointment_id=a.id AND i.is_primary$old$,
            $new$WHERE i.appointment_id=a.id AND i.is_primary AND (q<>'' OR p_export OR coalesce(p_filters->>'category','ALL')<>'ALL' OR coalesce((p_filters->>'sla')::boolean,false))$new$
        ],
        ARRAY[
            $old$LEFT JOIN public.service s ON s.id=item.service_id$old$,
            $new$LEFT JOIN public.service s ON s.id=item.service_id AND coalesce(p_filters->>'category','ALL')<>'ALL'$new$
        ]
    ];
BEGIN
    -- Preserve the upcoming strip, search, filters and export while avoiding unused joins.
    FOREACH change SLICE 1 IN ARRAY changes LOOP
        IF position(change[2] in definition) = 0 THEN
            IF position(change[1] in definition) = 0 THEN
                RAISE EXCEPTION 'Unexpected get_admin_service_booking_page definition';
            END IF;
            definition := replace(definition, change[1], change[2]);
        END IF;
    END LOOP;
    EXECUTE definition;
END;
$migration$;

NOTIFY pgrst, 'reload schema';
COMMIT;
