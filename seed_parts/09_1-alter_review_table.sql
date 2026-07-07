ALTER TABLE public.review ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.service(id) ON DELETE CASCADE;

GRANT SELECT ON public.review TO anon;
GRANT SELECT ON public.review TO authenticated;
GRANT SELECT ON public.review_response TO anon;
GRANT SELECT ON public.review_response TO authenticated;

DELETE FROM public.review WHERE review_type = 'SERVICE' AND service_id IS NOT NULL;

INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '2f28a108-e9a7-41a2-804a-2fd722be264c', 
    'd0000000-0000-0000-0000-000000000002',
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'SERVICE', 
    1, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-03-27 20:06:05',
    '2026-03-27 20:06:05'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'a10c8a6f-42c1-4a47-bb02-b9d7f1e08b36',
    '2f28a108-e9a7-41a2-804a-2fd722be264c',
    'd0000000-5555-5555-5555-555555555555',
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!',
    '2026-03-27 20:06:05'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '24484057-30f9-4318-9f9d-a2255e9f7480', 
    'd0000000-0000-0000-0000-000000000002',
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'SERVICE', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-03-07 01:34:27',
    '2026-03-07 01:34:27'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'fe9b0bb5-e785-4d02-8736-3b6e759a0d1f',
    '24484057-30f9-4318-9f9d-a2255e9f7480',
    'd0000000-5555-5555-5555-555555555555',
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!',
    '2026-03-07 01:34:27'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'c4a5b251-713e-4d6f-94dd-bb54befd24d8', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'SERVICE', 
    4, 
    'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!', 
    NULL, 
    'APPROVED',
    '2026-04-05 17:00:08',
    '2026-04-05 17:00:08'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    '2b1bf986-7c7a-447f-a94b-7f636e1dd516',
    'c4a5b251-713e-4d6f-94dd-bb54befd24d8',
    'd0000000-5555-5555-5555-555555555555',
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!',
    '2026-04-05 17:00:08'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'b91dec20-1d3a-461e-9f53-852c03227968', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'SERVICE', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    NULL, 
    'APPROVED',
    '2026-05-10 03:05:51',
    '2026-05-10 03:05:51'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'dc4ed2df-61e8-4f0c-809c-605ff763d35d', 
    'd0000000-0000-0000-0000-000000000006',
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'SERVICE', 
    4, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    NULL, 
    'APPROVED',
    '2026-01-13 01:04:09',
    '2026-01-13 01:04:09'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '8e85bfb0-7e5a-4b7e-bc2f-fd133af8e181', 
    'd0000000-0000-0000-0000-000000000002',
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'SERVICE', 
    5, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-04-17 15:12:27',
    '2026-04-17 15:12:27'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '790ac609-948b-4c80-bb0f-0b40df87c7f9', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'SERVICE', 
    5, 
    'Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.', 
    NULL, 
    'APPROVED',
    '2026-01-19 23:21:00',
    '2026-01-19 23:21:00'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'ee36036b-c086-43f5-a6b8-7f286837d280',
    '790ac609-948b-4c80-bb0f-0b40df87c7f9',
    'd0000000-5555-5555-5555-555555555555',
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!',
    '2026-01-19 23:21:00'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'cc4ea2ba-fb75-443f-a603-ea492b9b716c', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'SERVICE', 
    5, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    NULL, 
    'APPROVED',
    '2026-05-27 13:37:52',
    '2026-05-27 13:37:52'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'a7a81dfa-5c9e-413f-be70-f9202c6db91f', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'SERVICE', 
    5, 
    'Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-01-02 22:12:32',
    '2026-01-02 22:12:32'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'a4f70f78-5b56-4bd2-81f1-bd7d3eb48764',
    'a7a81dfa-5c9e-413f-be70-f9202c6db91f',
    'd0000000-5555-5555-5555-555555555555',
    'Cảm ơn anh/chị đã tin tưởng và sử dụng dịch vụ của PawPal. Chúc bé cưng luôn ngoan và khỏe mạnh ạ!',
    '2026-01-02 22:12:32'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'ddc3743f-e0f9-4206-917e-38c5c974b466', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'SERVICE', 
    5, 
    'Dịch vụ khá tốt, nhưng hy vọng có thêm nhiều lựa chọn mùi hương sữa tắm hơn.', 
    NULL, 
    'APPROVED',
    '2026-05-24 12:01:08',
    '2026-05-24 12:01:08'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'fcbb22f7-e109-4bc1-b35b-087af7b2b543',
    'ddc3743f-e0f9-4206-917e-38c5c974b466',
    'd0000000-5555-5555-5555-555555555555',
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!',
    '2026-05-24 12:01:08'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'e007c20b-316b-457d-a99d-dc8cba08c8c1', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'SERVICE', 
    5, 
    'Bé cún nhà mình thơm tho suốt cả tuần luôn, đỉnh thật sự.', 
    NULL, 
    'APPROVED',
    '2026-01-29 03:53:58',
    '2026-01-29 03:53:58'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '3431bc59-5dc5-4488-a2f2-5fbd752897a7', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'SERVICE', 
    2, 
    'Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.', 
    ARRAY['/assets/images/services/hotel.png'], 
    'APPROVED',
    '2026-04-07 15:55:31',
    '2026-04-07 15:55:31'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '69cacd51-e55c-493a-8513-53d11ccb9415', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'SERVICE', 
    4, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    NULL, 
    'APPROVED',
    '2026-02-22 01:46:08',
    '2026-02-22 01:46:08'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'a0168017-92b3-404b-91d4-8538d67b80c1', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'SERVICE', 
    5, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-03-10 13:52:44',
    '2026-03-10 13:52:44'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'bb23dc32-28a5-4ccf-9e05-9fefa6af59a9', 
    'd0000000-0000-0000-0000-000000000006',
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'SERVICE', 
    5, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    NULL, 
    'APPROVED',
    '2026-06-20 02:38:02',
    '2026-06-20 02:38:02'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '94d13cd2-9c67-4377-8e26-6c16898bd975', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'SERVICE', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-02-03 16:19:43',
    '2026-02-03 16:19:43'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '6e64184f-fd61-4c7b-a189-9ca93e4884ea', 
    'd0000000-0000-0000-0000-000000000002',
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'SERVICE', 
    5, 
    'Mình rất hài lòng. Phòng chờ thoải mái, có chỗ uống nước nghỉ ngơi trong lúc chờ bé.', 
    NULL, 
    'APPROVED',
    '2026-06-28 14:26:53',
    '2026-06-28 14:26:53'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    '7cf5e270-e848-44af-95ae-bc25e0cc3808',
    '6e64184f-fd61-4c7b-a189-9ca93e4884ea',
    'd0000000-5555-5555-5555-555555555555',
    'Dạ tụi em ghi nhận góp ý ạ, thời gian tới PawPal sẽ update thêm các line mùi hương thiên nhiên mới phục vụ các bé.',
    '2026-06-28 14:26:53'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '9ab391b1-7e7f-4a08-9839-d61e5efe97db', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'SERVICE', 
    4, 
    'Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-05-03 14:17:31',
    '2026-05-03 14:17:31'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'd89ed21f-6ab6-4fd0-9984-0c4afbce337d', 
    'd0000000-0000-0000-0000-000000000006',
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'SERVICE', 
    5, 
    'Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-05-20 14:04:04',
    '2026-05-20 14:04:04'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '98e95939-13a6-40df-840d-918df4bd0dc4', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'SERVICE', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-04-18 21:14:53',
    '2026-04-18 21:14:53'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '2aa52078-0e98-4338-9839-f535cff5bb29', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'SERVICE', 
    5, 
    'Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.', 
    NULL, 
    'APPROVED',
    '2026-03-22 06:56:38',
    '2026-03-22 06:56:38'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    '96de976c-11d8-4a83-8ee3-ab32993aa085',
    '2aa52078-0e98-4338-9839-f535cff5bb29',
    'd0000000-5555-5555-5555-555555555555',
    'Cảm ơn anh/chị đã tin tưởng và sử dụng dịch vụ của PawPal. Chúc bé cưng luôn ngoan và khỏe mạnh ạ!',
    '2026-03-22 06:56:38'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '93e0237f-01c1-4f14-8dd2-9865a338bab0', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'SERVICE', 
    4, 
    'Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-06-28 18:15:10',
    '2026-06-28 18:15:10'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'a92111e8-eab6-4b41-9724-958fa1fbf05f',
    '93e0237f-01c1-4f14-8dd2-9865a338bab0',
    'd0000000-5555-5555-5555-555555555555',
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!',
    '2026-06-28 18:15:10'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'dafef69e-09d2-4809-a989-9a15512d956e', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'SERVICE', 
    5, 
    'Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.', 
    NULL, 
    'APPROVED',
    '2026-06-28 17:22:56',
    '2026-06-28 17:22:56'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '717edde7-c4cd-4107-b6c1-ee19c4c9d521', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'SERVICE', 
    5, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    ARRAY['/assets/images/services/hotel.png'], 
    'APPROVED',
    '2026-03-29 03:33:33',
    '2026-03-29 03:33:33'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '9ecdae99-bced-4a70-ae1e-c867ceb3f2b9', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'SERVICE', 
    5, 
    'Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.', 
    NULL, 
    'APPROVED',
    '2026-01-27 16:41:10',
    '2026-01-27 16:41:10'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'a4ad7d91-7d48-4c4f-9b64-92ba4d731c0f', 
    'd0000000-0000-0000-0000-000000000006',
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'SERVICE', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    NULL, 
    'APPROVED',
    '2026-02-11 11:03:22',
    '2026-02-11 11:03:22'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'b3287a30-228c-4312-a79e-cb9176c02b66', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'SERVICE', 
    5, 
    'Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.', 
    NULL, 
    'APPROVED',
    '2026-03-12 15:37:19',
    '2026-03-12 15:37:19'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    '8d3f6b13-f074-44fa-b30f-c0f11d4aad11',
    'b3287a30-228c-4312-a79e-cb9176c02b66',
    'd0000000-5555-5555-5555-555555555555',
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!',
    '2026-03-12 15:37:19'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'f10b0cc9-e1e4-4fe6-a4e8-285a79b82881', 
    'd0000000-0000-0000-0000-000000000006',
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'SERVICE', 
    4, 
    'Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.', 
    NULL, 
    'APPROVED',
    '2026-01-12 21:18:22',
    '2026-01-12 21:18:22'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '20777fbc-f81d-4659-b5ee-5ae99302d395', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'SERVICE', 
    5, 
    'Mình rất hài lòng. Phòng chờ thoải mái, có chỗ uống nước nghỉ ngơi trong lúc chờ bé.', 
    NULL, 
    'APPROVED',
    '2026-03-07 16:41:55',
    '2026-03-07 16:41:55'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'e809df56-7a1a-4d71-a6e2-0a249a556a31', 
    'd0000000-0000-0000-0000-000000000006',
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'SERVICE', 
    2, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    NULL, 
    'APPROVED',
    '2026-02-16 09:55:52',
    '2026-02-16 09:55:52'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'b478fa18-8c5e-45cc-8f2a-57133845a35a',
    'e809df56-7a1a-4d71-a6e2-0a249a556a31',
    'd0000000-5555-5555-5555-555555555555',
    'Cảm ơn anh/chị đã tin tưởng và sử dụng dịch vụ của PawPal. Chúc bé cưng luôn ngoan và khỏe mạnh ạ!',
    '2026-02-16 09:55:52'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'a1548075-7e7a-4457-961f-a2945dd6ac52', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'SERVICE', 
    5, 
    'Mình rất hài lòng. Phòng chờ thoải mái, có chỗ uống nước nghỉ ngơi trong lúc chờ bé.', 
    NULL, 
    'APPROVED',
    '2026-01-16 05:27:59',
    '2026-01-16 05:27:59'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '89c53db0-2a48-4fcd-8c81-bc5ae583338f', 
    'd0000000-0000-0000-0000-000000000002',
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'SERVICE', 
    5, 
    'Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.', 
    ARRAY['/assets/images/services/hotel.png'], 
    'APPROVED',
    '2026-03-27 10:53:42',
    '2026-03-27 10:53:42'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '304436fb-0a6f-4e1e-bb68-2e23911e8741', 
    'd0000000-0000-0000-0000-000000000006',
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'SERVICE', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    NULL, 
    'APPROVED',
    '2026-01-26 01:26:40',
    '2026-01-26 01:26:40'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '2f5a70a7-22d5-4e10-8cdd-03454dd2ddb1', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'SERVICE', 
    5, 
    'Mình rất hài lòng. Phòng chờ thoải mái, có chỗ uống nước nghỉ ngơi trong lúc chờ bé.', 
    NULL, 
    'APPROVED',
    '2026-01-21 12:11:02',
    '2026-01-21 12:11:02'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'd82cbeb9-5578-4df4-8a6f-903c030ef548', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'SERVICE', 
    4, 
    'Bé cún nhà mình thơm tho suốt cả tuần luôn, đỉnh thật sự.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-03-05 23:26:56',
    '2026-03-05 23:26:56'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'c529582e-880a-4a75-b3f2-ae10d7cb0988',
    'd82cbeb9-5578-4df4-8a6f-903c030ef548',
    'd0000000-5555-5555-5555-555555555555',
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!',
    '2026-03-05 23:26:56'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '89629f25-8d7c-4b8f-a38c-61a05072a59a', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'SERVICE', 
    5, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    NULL, 
    'APPROVED',
    '2026-03-25 03:54:47',
    '2026-03-25 03:54:47'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '62ea6d2c-556f-47d6-bf4b-0d429b049ab1', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'SERVICE', 
    5, 
    'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!', 
    NULL, 
    'APPROVED',
    '2026-02-22 03:47:15',
    '2026-02-22 03:47:15'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '8434c697-2ac4-42bd-b097-899186d1523c', 
    'd0000000-0000-0000-0000-000000000006',
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'SERVICE', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    NULL, 
    'APPROVED',
    '2026-02-11 09:56:07',
    '2026-02-11 09:56:07'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '6eebbc0b-30eb-4457-a19d-1883938955cd', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'HTL02'),
    'SERVICE', 
    5, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    NULL, 
    'APPROVED',
    '2026-05-18 03:39:43',
    '2026-05-18 03:39:43'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'c3b6c7c1-f7c4-4b1f-989d-55b6c1c9ee08',
    '6eebbc0b-30eb-4457-a19d-1883938955cd',
    'd0000000-5555-5555-5555-555555555555',
    'Cảm ơn anh/chị đã tin tưởng và sử dụng dịch vụ của PawPal. Chúc bé cưng luôn ngoan và khỏe mạnh ạ!',
    '2026-05-18 03:39:43'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '90667aa7-2a9f-478c-88e5-6ad3e570f0f0', 
    'd0000000-0000-0000-0000-000000000006',
    (SELECT id FROM public.service WHERE service_code = 'HTL02'),
    'SERVICE', 
    5, 
    'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!', 
    ARRAY['/assets/images/services/hotel.png'], 
    'APPROVED',
    '2026-04-29 23:05:26',
    '2026-04-29 23:05:26'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'fd5a8358-e89b-4d8c-b7fd-0347ca1a6a49',
    '90667aa7-2a9f-478c-88e5-6ad3e570f0f0',
    'd0000000-5555-5555-5555-555555555555',
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!',
    '2026-04-29 23:05:26'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '73899c3c-99dd-4a93-addc-9970430421dd', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'HTL02'),
    'SERVICE', 
    5, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-01-20 19:27:18',
    '2026-01-20 19:27:18'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'fa6afa0c-e943-4e12-9bc5-bcd05e333d41',
    '73899c3c-99dd-4a93-addc-9970430421dd',
    'd0000000-5555-5555-5555-555555555555',
    'Dạ tụi em ghi nhận góp ý ạ, thời gian tới PawPal sẽ update thêm các line mùi hương thiên nhiên mới phục vụ các bé.',
    '2026-01-20 19:27:18'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'b2faff0a-9274-43fa-867b-abc4a7fe404c', 
    'd0000000-0000-0000-0000-000000000002',
    (SELECT id FROM public.service WHERE service_code = 'HTL02'),
    'SERVICE', 
    5, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    NULL, 
    'APPROVED',
    '2026-01-24 03:39:06',
    '2026-01-24 03:39:06'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '90aed57b-3532-418d-bf96-d4aabc9d9a8e', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'HTL03'),
    'SERVICE', 
    4, 
    'Mình rất hài lòng. Phòng chờ thoải mái, có chỗ uống nước nghỉ ngơi trong lúc chờ bé.', 
    NULL, 
    'APPROVED',
    '2026-03-06 21:37:55',
    '2026-03-06 21:37:55'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '7dc78724-964d-459a-be78-d348f679c50f', 
    'd0000000-0000-0000-0000-000000000002',
    (SELECT id FROM public.service WHERE service_code = 'HTL03'),
    'SERVICE', 
    5, 
    'Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.', 
    NULL, 
    'APPROVED',
    '2026-01-09 06:23:43',
    '2026-01-09 06:23:43'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'cb93629b-04b0-45b6-bb19-9dd657a85042', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'HTL03'),
    'SERVICE', 
    1, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    NULL, 
    'APPROVED',
    '2026-05-27 20:55:21',
    '2026-05-27 20:55:21'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '9a86a1fc-5da6-4d89-ba0a-7942dca835fa', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'HTL03'),
    'SERVICE', 
    5, 
    'Dịch vụ khá tốt, nhưng hy vọng có thêm nhiều lựa chọn mùi hương sữa tắm hơn.', 
    ARRAY['/assets/images/services/hotel.png'], 
    'APPROVED',
    '2026-04-15 02:18:47',
    '2026-04-15 02:18:47'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '39511eea-1da8-4498-8461-2a4b1a2e75f5', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'HTL03'),
    'SERVICE', 
    5, 
    'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!', 
    NULL, 
    'APPROVED',
    '2026-06-09 06:38:08',
    '2026-06-09 06:38:08'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'a38b2ea4-9ff3-489e-92d2-888df9013a6f', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'SERVICE', 
    5, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    NULL, 
    'APPROVED',
    '2026-05-03 22:44:24',
    '2026-05-03 22:44:24'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'ef444c59-509a-4ad8-a8b1-a04acdf42154', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'SERVICE', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    NULL, 
    'APPROVED',
    '2026-02-21 15:38:03',
    '2026-02-21 15:38:03'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '9b25518e-53e7-4b64-ac8e-b69585384018', 
    'd0000000-0000-0000-0000-000000000006',
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'SERVICE', 
    4, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    ARRAY['/assets/images/services/hotel.png'], 
    'APPROVED',
    '2026-04-15 09:21:27',
    '2026-04-15 09:21:27'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'a418bad9-38c3-4d42-abe9-ad36fb7e9399',
    '9b25518e-53e7-4b64-ac8e-b69585384018',
    'd0000000-5555-5555-5555-555555555555',
    'Dạ tụi em ghi nhận góp ý ạ, thời gian tới PawPal sẽ update thêm các line mùi hương thiên nhiên mới phục vụ các bé.',
    '2026-04-15 09:21:27'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'cdb56ddc-82cc-480e-901f-1e1928e9308e', 
    'd0000000-0000-0000-0000-000000000002',
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'SERVICE', 
    5, 
    'Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.', 
    ARRAY['/assets/images/services/hotel.png'], 
    'APPROVED',
    '2026-02-11 08:20:39',
    '2026-02-11 08:20:39'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '8e370beb-4433-48bc-b2d6-ef8cccc9f9bf', 
    'd0000000-0000-0000-0000-000000000002',
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'SERVICE', 
    4, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-04-03 21:15:09',
    '2026-04-03 21:15:09'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    '8d2fe199-759a-4e59-8166-933affb78fcf',
    '8e370beb-4433-48bc-b2d6-ef8cccc9f9bf',
    'd0000000-5555-5555-5555-555555555555',
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!',
    '2026-04-03 21:15:09'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '3f4dbc0a-1cfc-4a73-af12-98a5a4428067', 
    'd0000000-0000-0000-0000-000000000005',
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'SERVICE', 
    4, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    NULL, 
    'APPROVED',
    '2026-06-09 15:30:03',
    '2026-06-09 15:30:03'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    'ba03bc8a-4cf5-494f-a057-346fba9918d3', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'SERVICE', 
    4, 
    'Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.', 
    ARRAY['/assets/images/services/spa.png'], 
    'APPROVED',
    '2026-03-31 03:34:20',
    '2026-03-31 03:34:20'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    '2496f1f7-b0a7-47f0-9a51-7597ed0698c9',
    'ba03bc8a-4cf5-494f-a057-346fba9918d3',
    'd0000000-5555-5555-5555-555555555555',
    'Cảm ơn anh/chị đã tin tưởng và sử dụng dịch vụ của PawPal. Chúc bé cưng luôn ngoan và khỏe mạnh ạ!',
    '2026-03-31 03:34:20'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '5387ddbd-207d-44c9-bff0-ec3893343cd1', 
    'd0000000-0000-0000-0000-000000000006',
    (SELECT id FROM public.service WHERE service_code = 'TXI01'),
    'SERVICE', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    NULL, 
    'APPROVED',
    '2026-06-28 17:29:06',
    '2026-06-28 17:29:06'
);
INSERT INTO public.review_response (id, review_id, staff_id, response_content, created_at)
VALUES (
    'b46faef9-999d-49b2-926b-15e487882f91',
    '5387ddbd-207d-44c9-bff0-ec3893343cd1',
    'd0000000-5555-5555-5555-555555555555',
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!',
    '2026-06-28 17:29:06'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '145ae636-df10-4fea-8069-d283ab4de55c', 
    'd0000000-0000-0000-0000-000000000004',
    (SELECT id FROM public.service WHERE service_code = 'TXI01'),
    'SERVICE', 
    5, 
    'Bé cún nhà mình thơm tho suốt cả tuần luôn, đỉnh thật sự.', 
    ARRAY['/assets/images/services/hotel.png'], 
    'APPROVED',
    '2026-02-01 21:17:29',
    '2026-02-01 21:17:29'
);
INSERT INTO public.review (id, customer_id, service_id, review_type, rating, review_content, image_urls, review_status, created_at, updated_at)
VALUES (
    '0515869c-f5b0-4a16-9f49-750afe741f6c', 
    'd0000000-0000-0000-0000-000000000003',
    (SELECT id FROM public.service WHERE service_code = 'TXI01'),
    'SERVICE', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    NULL, 
    'APPROVED',
    '2026-05-20 00:03:53',
    '2026-05-20 00:03:53'
);