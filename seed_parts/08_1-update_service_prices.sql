DELETE FROM public.service_price_matrix;

INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'ffe230bc-f739-4c10-9c67-5202539e69d2', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'all', 
    0, 
    4.9, 
    120000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '86eaa638-0225-4396-920e-ab1d5afbb65f', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'all', 
    5, 
    10, 
    150000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '3b7fed62-e8b2-4eaa-acf1-e780757cd1a3', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'all', 
    10.1, 
    20, 
    200000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'd0e17014-b826-4733-a0b3-32f5304bd603', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'all', 
    20.1, 
    99, 
    250000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'ee39bbae-23be-4a6e-bebe-4094112289e4', 
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'all', 
    0, 
    4.9, 
    220000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '95ddcd8c-c662-45b6-baef-d4cd3cdd9200', 
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'all', 
    5, 
    10, 
    270000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '26c8343f-1c85-4f6f-992a-4500f4d29e66', 
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'all', 
    10.1, 
    20, 
    350000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '970360d4-852f-41d4-a4c9-55460bf3dd2f', 
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'all', 
    20.1, 
    99, 
    450000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'ce80df90-8efa-4fb9-95c0-b31370b3fb4a', 
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'dog', 
    0, 
    4.9, 
    320000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '85bcbd4d-4187-4712-99e8-280b6e7e97fd', 
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'dog', 
    5, 
    10, 
    370000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '2e34ee8f-f386-46ae-a4a0-6d2ec1917603', 
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'dog', 
    10.1, 
    20, 
    450000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'a037662d-36f1-4f4c-89f3-2401c8c308be', 
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'dog', 
    20.1, 
    99, 
    550000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '196efefe-ca55-46a1-8a46-6855c4dda7ae', 
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'all', 
    0, 
    4.9, 
    80000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '10c6f0d7-8517-422d-8b27-edb3f20544be', 
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'all', 
    5, 
    10, 
    100000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'a51ff091-92b5-4e56-abf8-6a9af4fc094e', 
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'all', 
    10.1, 
    20, 
    120000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '1df190fc-74a4-4fc5-9779-6ce8bf628660', 
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'all', 
    20.1, 
    99, 
    150000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'a821337f-f029-43f2-b767-9773073946ec', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'all', 
    0, 
    4.9, 
    60000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '9f080703-1433-4421-9115-9b3348aa3bbc', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'all', 
    5, 
    10, 
    80000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '0200ab39-1bc6-49d1-aff0-95ded4b73909', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'all', 
    10.1, 
    20, 
    100000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '0b8c896b-1a16-481e-bab5-0f08c47d7185', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'all', 
    20.1, 
    99, 
    120000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '75445810-d4b5-440a-9fef-7a10ec228cff', 
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'all', 
    0, 
    4.9, 
    90000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'ce0cef0e-9812-4909-9718-7e891ebdbf83', 
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'all', 
    5, 
    10, 
    120000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '2a058aac-36e3-4c23-b224-670defa081c4', 
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'all', 
    10.1, 
    20, 
    150000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'b3964487-d822-45c8-a4a3-06f097da64d6', 
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'all', 
    20.1, 
    99, 
    180000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '81b3e2fd-fedb-43d6-858b-72b492edee48', 
    (SELECT id FROM public.service WHERE service_code = 'SPA07'),
    'dog', 
    0, 
    4.9, 
    350000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '60498de7-c080-47fe-ba81-776fcb35d142', 
    (SELECT id FROM public.service WHERE service_code = 'SPA07'),
    'dog', 
    5, 
    10, 
    400000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'eff6988d-21d2-4253-9126-29726b203709', 
    (SELECT id FROM public.service WHERE service_code = 'SPA07'),
    'dog', 
    10.1, 
    20, 
    500000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'd2af3918-8566-4c0c-979d-a5af56c6d2bd', 
    (SELECT id FROM public.service WHERE service_code = 'SPA07'),
    'dog', 
    20.1, 
    99, 
    650000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '6fe5b11c-4b6e-4c0c-b713-1d6fb7061399', 
    (SELECT id FROM public.service WHERE service_code = 'SPA08'),
    'dog', 
    0, 
    4.9, 
    450000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '5ed9baa5-7ed1-4f96-8a73-3a1e2148f0d6', 
    (SELECT id FROM public.service WHERE service_code = 'SPA08'),
    'dog', 
    5, 
    10, 
    500000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '12acaf92-e174-48fb-b65f-af0755748ff9', 
    (SELECT id FROM public.service WHERE service_code = 'SPA08'),
    'dog', 
    10.1, 
    20, 
    600000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '4bfaaa3a-076f-4651-91ad-da8762f70387', 
    (SELECT id FROM public.service WHERE service_code = 'SPA08'),
    'dog', 
    20.1, 
    99, 
    750000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'b93fbbe8-dba0-4d3a-a04f-189863035838', 
    (SELECT id FROM public.service WHERE service_code = 'SPA09'),
    'cat', 
    0, 
    4.9, 
    380000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '0998ca14-e598-4378-833c-325feda74bd4', 
    (SELECT id FROM public.service WHERE service_code = 'SPA09'),
    'cat', 
    5, 
    10, 
    430000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '0654e188-02ef-4069-b72d-9b6de510d543', 
    (SELECT id FROM public.service WHERE service_code = 'SPA09'),
    'cat', 
    10.1, 
    20, 
    500000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '2351af7d-caa3-4f73-bc77-a0623e0c5dce', 
    (SELECT id FROM public.service WHERE service_code = 'SPA10'),
    'all', 
    0, 
    4.9, 
    280000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '2cf26341-1025-4651-99c6-2c700bd6803e', 
    (SELECT id FROM public.service WHERE service_code = 'SPA10'),
    'all', 
    5, 
    10, 
    320000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'ef503c81-3f80-48a0-a815-afaa66cf344d', 
    (SELECT id FROM public.service WHERE service_code = 'SPA10'),
    'all', 
    10.1, 
    20, 
    400000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '1bfb468e-1df9-47f4-b2e5-3670797d18c8', 
    (SELECT id FROM public.service WHERE service_code = 'SPA10'),
    'all', 
    20.1, 
    99, 
    500000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'ff58be18-227e-4a41-8a6a-4cbe48b1b406', 
    (SELECT id FROM public.service WHERE service_code = 'SPA11'),
    'dog', 
    0, 
    4.9, 
    300000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '58a97ae1-86b2-4bd8-8f29-d77021c563d2', 
    (SELECT id FROM public.service WHERE service_code = 'SPA11'),
    'dog', 
    5, 
    10, 
    350000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '8491d752-f3d2-42d7-946a-14130cf92e6e', 
    (SELECT id FROM public.service WHERE service_code = 'SPA11'),
    'dog', 
    10.1, 
    20, 
    450000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '810a157e-1729-460b-858b-1789281ee593', 
    (SELECT id FROM public.service WHERE service_code = 'SPA11'),
    'dog', 
    20.1, 
    99, 
    550000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '4fc44060-4815-479b-a91a-8c3d3d463954', 
    (SELECT id FROM public.service WHERE service_code = 'SPA12'),
    'all', 
    0, 
    4.9, 
    120000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'ef9a7309-7b90-4471-b298-50416cae1149', 
    (SELECT id FROM public.service WHERE service_code = 'SPA12'),
    'all', 
    5, 
    10, 
    150000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '9db1f5b7-99e8-49c2-9f2c-def9993d453d', 
    (SELECT id FROM public.service WHERE service_code = 'SPA12'),
    'all', 
    10.1, 
    20, 
    180000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'b1bbe7ae-2567-4f71-b0c1-f3b8e9f198d7', 
    (SELECT id FROM public.service WHERE service_code = 'SPA12'),
    'all', 
    20.1, 
    99, 
    220000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'b40f7c64-59d4-42ca-a2b0-7947b3a9e6c1', 
    (SELECT id FROM public.service WHERE service_code = 'SPA13'),
    'all', 
    0, 
    4.9, 
    150000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'b3b355e1-70f4-42f7-9d9f-d0cb81edc4e7', 
    (SELECT id FROM public.service WHERE service_code = 'SPA14'),
    'all', 
    0, 
    4.9, 
    80000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '06e0f853-10ac-4481-80e4-81dd075b30f6', 
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'all', 
    0, 
    4.9, 
    180000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '883cccc4-85bb-42b9-87ab-5eafe7b1a3f1', 
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'all', 
    5, 
    10, 
    200000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'c8729e6c-a46c-4516-9442-d0b30e01dc5b', 
    (SELECT id FROM public.service WHERE service_code = 'HTL02'),
    'all', 
    0, 
    4.9, 
    250000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'b9a5470b-416e-4415-9647-4e6be13c86d4', 
    (SELECT id FROM public.service WHERE service_code = 'HTL02'),
    'all', 
    5, 
    10, 
    250000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'b2b1e6fa-52d8-40f5-a003-c0e098e40bc8', 
    (SELECT id FROM public.service WHERE service_code = 'HTL02'),
    'all', 
    10.1, 
    20, 
    300000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '9851796a-b551-494f-bfa5-4ffc42a25f7a', 
    (SELECT id FROM public.service WHERE service_code = 'HTL03'),
    'all', 
    0, 
    4.9, 
    380000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'd4333544-d22b-4e86-b637-bba43c508dc8', 
    (SELECT id FROM public.service WHERE service_code = 'HTL03'),
    'all', 
    5, 
    10, 
    380000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '978ecb19-3dda-4365-91f3-2a1d31c42d0c', 
    (SELECT id FROM public.service WHERE service_code = 'HTL03'),
    'all', 
    10.1, 
    20, 
    450000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '8e08eb64-8a98-4c9a-9639-5ea5f74d8a02', 
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'cat', 
    0, 
    4.9, 
    290000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'c3b9833c-9af7-4353-b9cc-bc920c7b48f7', 
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'cat', 
    5, 
    10, 
    320000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'f54e4659-153a-4582-b7bc-967618cd2ba6', 
    (SELECT id FROM public.service WHERE service_code = 'HTL05'),
    'all', 
    0, 
    4.9, 
    520000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '5f0d9e7b-b27d-4aef-abb3-3332c89eaacd', 
    (SELECT id FROM public.service WHERE service_code = 'HTL05'),
    'all', 
    5, 
    10, 
    520000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '459f3ede-bff9-41a1-8e8a-35a5395c8036', 
    (SELECT id FROM public.service WHERE service_code = 'HTL05'),
    'all', 
    10.1, 
    20, 
    650000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '3cdef869-913b-4b21-8ff4-421c37438dd0', 
    (SELECT id FROM public.service WHERE service_code = 'HTL05'),
    'all', 
    20.1, 
    99, 
    800000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '38c4e2dd-71df-43f2-b5ac-2e40af3a57ee', 
    (SELECT id FROM public.service WHERE service_code = 'HTL06'),
    'dog', 
    20.1, 
    99, 
    1000000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '3d76a927-9edb-4843-9397-e18e1d88b945', 
    (SELECT id FROM public.service WHERE service_code = 'HTL07'),
    'all', 
    0, 
    4.9, 
    100000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '64396f34-6a85-4669-8776-035a24355a47', 
    (SELECT id FROM public.service WHERE service_code = 'HTL07'),
    'all', 
    5, 
    10, 
    120000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '85d7c680-30dd-4635-82ef-07e4279d9465', 
    (SELECT id FROM public.service WHERE service_code = 'HTL07'),
    'all', 
    10.1, 
    20, 
    150000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '3bc28f86-7d0a-48bd-a3df-59a7aada2582', 
    (SELECT id FROM public.service WHERE service_code = 'HTL07'),
    'all', 
    20.1, 
    99, 
    200000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    'a416012f-f106-423b-9aa8-acbd10ab026d', 
    (SELECT id FROM public.service WHERE service_code = 'HTL08'),
    'all', 
    0, 
    4.9, 
    120000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '7e903c77-7a8b-4f63-888b-0c555f559277', 
    (SELECT id FROM public.service WHERE service_code = 'TXI01'),
    'all', 
    0, 
    4.9, 
    150000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '25b49de3-1933-4a94-821a-05287276ac1b', 
    (SELECT id FROM public.service WHERE service_code = 'TXI01'),
    'all', 
    5, 
    10, 
    150000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '3e314ec9-5778-4ae5-ad78-4d8de952f123', 
    (SELECT id FROM public.service WHERE service_code = 'TXI01'),
    'all', 
    10.1, 
    20, 
    200000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);
INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '9da6dc3b-6b44-4866-8dcc-785362d1d792', 
    (SELECT id FROM public.service WHERE service_code = 'TXI01'),
    'all', 
    20.1, 
    99, 
    250000, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);