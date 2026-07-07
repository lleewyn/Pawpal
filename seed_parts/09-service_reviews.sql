CREATE TABLE IF NOT EXISTS public.service_review (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES public.service(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(100) NOT NULL,
    member_tier VARCHAR(50) DEFAULT 'member',
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    images TEXT[],
    seller_reply TEXT,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Drop existing reviews if any
DELETE FROM public.service_review;

INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'cb781c97-8755-4c34-9a02-ea560eea2923', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'Trần Bảo', 
    'silver', 
    4, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    NULL, 
    'Dạ tụi em ghi nhận góp ý ạ, thời gian tới PawPal sẽ update thêm các line mùi hương thiên nhiên mới phục vụ các bé.', 
    '2026-06-23 08:56:39'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '8a691df0-ddaf-410b-bfa0-bba924bb289c', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'Hoàng Anh', 
    'diamond', 
    5, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    NULL, 
    NULL, 
    '2026-02-14 13:02:57'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '5e91f00c-0569-4574-88fe-f0d62aa32224', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'Hoàng Anh', 
    'member', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    NULL, 
    NULL, 
    '2026-03-05 20:30:05'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '2d96c08a-874d-4725-849a-d8d5a8a6617b', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'Lan Phương', 
    'member', 
    5, 
    'Mình rất hài lòng. Phòng chờ thoải mái, có chỗ uống nước nghỉ ngơi trong lúc chờ bé.', 
    NULL, 
    NULL, 
    '2026-03-18 07:28:21'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '263ccec3-0e0e-4635-a35c-9519b9d7aeb5', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'Đức Huy', 
    'gold', 
    5, 
    'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!', 
    NULL, 
    NULL, 
    '2026-03-19 03:14:29'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '207788ca-572b-492c-b97d-f03a8eb07ce5', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'Hoàng Anh', 
    'gold', 
    5, 
    'Bé cún nhà mình thơm tho suốt cả tuần luôn, đỉnh thật sự.', 
    NULL, 
    'Dạ tụi em ghi nhận góp ý ạ, thời gian tới PawPal sẽ update thêm các line mùi hương thiên nhiên mới phục vụ các bé.', 
    '2026-03-14 07:50:08'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '9db0ad27-0b69-4862-93bc-156838ec54ac', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'Mai Hoa', 
    'diamond', 
    3, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    NULL, 
    'Dạ tụi em ghi nhận góp ý ạ, thời gian tới PawPal sẽ update thêm các line mùi hương thiên nhiên mới phục vụ các bé.', 
    '2026-02-21 09:02:54'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '71d60ee6-8d20-4705-afda-f0a5fed3be6f', 
    (SELECT id FROM public.service WHERE service_code = 'SPA01'),
    'Đức Huy', 
    'member', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    NULL, 
    'Cảm ơn anh/chị đã tin tưởng và sử dụng dịch vụ của PawPal. Chúc bé cưng luôn ngoan và khỏe mạnh ạ!', 
    '2026-06-02 00:46:33'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'cc2f2994-b6d8-4e45-be9c-2d5fa7d6aaa6', 
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'Hoàng Anh', 
    'diamond', 
    5, 
    'Dịch vụ khá tốt, nhưng hy vọng có thêm nhiều lựa chọn mùi hương sữa tắm hơn.', 
    ARRAY['/assets/images/services/hotel.png'], 
    NULL, 
    '2026-06-11 05:39:24'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '7538ec57-60a4-4f3b-b6b3-464fea9fb533', 
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'Thu Hiền', 
    'silver', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    NULL, 
    NULL, 
    '2026-02-20 06:51:19'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'eb3040a6-fd1b-4f37-ad4a-5b943a6b38e1', 
    (SELECT id FROM public.service WHERE service_code = 'SPA02'),
    'Thanh Tùng', 
    'silver', 
    4, 
    'Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.', 
    NULL, 
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!', 
    '2026-01-08 04:51:36'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'fc7325b6-024c-4403-aa50-84a022a1e191', 
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'Lan Phương', 
    'member', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    NULL, 
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!', 
    '2026-01-15 02:12:42'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'd46ede03-c435-4914-b335-447460f5c5c5', 
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'Ngọc Hân', 
    'diamond', 
    4, 
    'Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.', 
    ARRAY['/assets/images/services/spa.png'], 
    'Cảm ơn anh/chị đã tin tưởng và sử dụng dịch vụ của PawPal. Chúc bé cưng luôn ngoan và khỏe mạnh ạ!', 
    '2026-06-25 18:33:00'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '1cf2ff3b-ebe6-41eb-8dcf-4ca5558022e5', 
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'Trần Bảo', 
    'diamond', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    ARRAY['/assets/images/services/hotel.png'], 
    NULL, 
    '2026-06-20 15:11:12'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '89ac01cd-8d0d-47f9-9275-2774bd95af74', 
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'Mai Hoa', 
    'diamond', 
    2, 
    'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!', 
    ARRAY['/assets/images/services/spa.png'], 
    NULL, 
    '2026-03-02 20:16:44'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '0969b7ea-b2d5-4a9e-8baf-d33b76be7fa4', 
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'Lan Phương', 
    'diamond', 
    5, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    ARRAY['/assets/images/services/spa.png'], 
    NULL, 
    '2026-01-28 12:28:48'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '0e26b725-ff3e-4dd8-bfa8-720115bad641', 
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'Thảo Nguyễn', 
    'member', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    NULL, 
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!', 
    '2026-05-18 15:32:35'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'a1c36a19-45fd-45bf-8a3f-ccdcfa6d1fb5', 
    (SELECT id FROM public.service WHERE service_code = 'SPA03'),
    'Hoàng Anh', 
    'gold', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    NULL, 
    NULL, 
    '2026-06-17 21:06:52'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '60bdf6f3-3f9d-4af8-9b9b-a8613cd53331', 
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'Ngọc Hân', 
    'diamond', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    ARRAY['/assets/images/services/spa.png'], 
    NULL, 
    '2026-01-07 19:48:50'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'f55ca267-3874-4e29-be75-4fde665495b4', 
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'Thu Hiền', 
    'diamond', 
    5, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    NULL, 
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!', 
    '2026-06-27 18:59:48'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '5081d901-ec7f-4531-a711-6d68be12b94c', 
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'Thanh Tùng', 
    'member', 
    5, 
    'Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.', 
    ARRAY['/assets/images/services/hotel.png'], 
    NULL, 
    '2026-03-12 22:54:26'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '1a06b168-af02-4151-aa83-7401ba6cafe8', 
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'Thanh Tùng', 
    'silver', 
    4, 
    'Mình rất hài lòng. Phòng chờ thoải mái, có chỗ uống nước nghỉ ngơi trong lúc chờ bé.', 
    NULL, 
    NULL, 
    '2026-01-04 05:15:07'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '0caec9eb-ecfa-44a0-b793-21e579f74682', 
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'Thanh Tùng', 
    'diamond', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    NULL, 
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!', 
    '2026-02-12 15:31:46'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'cb172d9e-f5f8-4109-a7b7-162b518cfdd4', 
    (SELECT id FROM public.service WHERE service_code = 'SPA04'),
    'Thanh Tùng', 
    'diamond', 
    5, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    NULL, 
    'Dạ tụi em ghi nhận góp ý ạ, thời gian tới PawPal sẽ update thêm các line mùi hương thiên nhiên mới phục vụ các bé.', 
    '2026-01-29 11:12:05'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'eb89efec-a950-492c-a430-deac431da7e5', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'Hoàng Anh', 
    'diamond', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    ARRAY['/assets/images/services/hotel.png'], 
    NULL, 
    '2026-06-25 10:37:15'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '99f0300d-933d-47c9-aae5-7e7ad8988323', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'Đức Huy', 
    'diamond', 
    4, 
    'Bé cún nhà mình thơm tho suốt cả tuần luôn, đỉnh thật sự.', 
    NULL, 
    NULL, 
    '2026-01-22 20:48:01'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'd5dae148-6f7d-45d7-b148-345d57593d00', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'Đức Huy', 
    'gold', 
    4, 
    'Dịch vụ khá tốt, nhưng hy vọng có thêm nhiều lựa chọn mùi hương sữa tắm hơn.', 
    NULL, 
    NULL, 
    '2026-04-08 13:28:40'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '716dbf85-beb4-462b-b1d9-6179da1c4a31', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'Thanh Tùng', 
    'diamond', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    NULL, 
    NULL, 
    '2026-02-02 20:29:10'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '02095cbb-aaa3-424e-b62b-2c3fc9644c4b', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'Trần Bảo', 
    'gold', 
    4, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    NULL, 
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!', 
    '2026-03-31 04:27:12'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'e6f9aa37-4f1e-460d-91fc-bca22b59cae6', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'Trần Bảo', 
    'silver', 
    5, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    NULL, 
    NULL, 
    '2026-04-27 23:39:21'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '2112a0bb-3282-45ef-9f38-535664900e9f', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'Đức Huy', 
    'gold', 
    3, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    NULL, 
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!', 
    '2026-05-11 16:56:47'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '17017f81-feea-4117-bb06-7a8d5c0f61ab', 
    (SELECT id FROM public.service WHERE service_code = 'SPA05'),
    'Ngọc Hân', 
    'silver', 
    5, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    ARRAY['/assets/images/services/hotel.png'], 
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!', 
    '2026-03-09 21:15:21'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '5301845b-52fc-4ac6-b3f8-575aebe1d858', 
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'Thảo Nguyễn', 
    'gold', 
    4, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    NULL, 
    NULL, 
    '2026-06-07 09:49:07'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '9e37aa60-33b9-44e9-9c2f-9fa8fa64d442', 
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'Thu Hiền', 
    'diamond', 
    5, 
    'Dịch vụ khá tốt, nhưng hy vọng có thêm nhiều lựa chọn mùi hương sữa tắm hơn.', 
    NULL, 
    NULL, 
    '2026-01-13 22:09:39'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'fcf81cc0-7771-499e-807e-c487cf832fb4', 
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'Trần Bảo', 
    'silver', 
    3, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    NULL, 
    NULL, 
    '2026-02-12 04:43:58'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '6013797f-79e9-438f-80d8-80bc61ef89ca', 
    (SELECT id FROM public.service WHERE service_code = 'SPA06'),
    'Thu Hiền', 
    'gold', 
    4, 
    'Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.', 
    NULL, 
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!', 
    '2026-01-21 05:54:44'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '880c86f3-1e8f-48ec-8e3e-d45a534ec44f', 
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'Đức Huy', 
    'gold', 
    5, 
    'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!', 
    ARRAY['/assets/images/services/hotel.png'], 
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!', 
    '2026-04-18 07:04:18'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'c494404a-d7f6-418e-a6ce-92217d15dfc9', 
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'Thảo Nguyễn', 
    'diamond', 
    5, 
    'Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.', 
    ARRAY['/assets/images/services/spa.png'], 
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!', 
    '2026-04-15 12:58:20'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '65bd0a44-3909-4214-bac8-5cb7a9df331a', 
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'Minh Tuấn', 
    'diamond', 
    4, 
    'Mình rất hài lòng. Phòng chờ thoải mái, có chỗ uống nước nghỉ ngơi trong lúc chờ bé.', 
    NULL, 
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!', 
    '2026-04-19 14:08:37'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '353f94a9-cc33-4879-a1c3-771c1d6e7026', 
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'Trần Bảo', 
    'gold', 
    5, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    NULL, 
    NULL, 
    '2026-03-06 02:36:10'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '4eae9b27-bd7a-4d0d-a29e-6fdb02abf254', 
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'Lan Phương', 
    'member', 
    5, 
    'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!', 
    NULL, 
    NULL, 
    '2026-01-29 06:21:08'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'f705c420-8af9-47d2-b14e-c56da6f76775', 
    (SELECT id FROM public.service WHERE service_code = 'HTL01'),
    'Ngọc Hân', 
    'silver', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    NULL, 
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!', 
    '2026-05-30 16:28:49'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'd95e3993-ddbe-436d-b9c4-1aae548ac065', 
    (SELECT id FROM public.service WHERE service_code = 'HTL02'),
    'Ngọc Hân', 
    'diamond', 
    5, 
    'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.', 
    ARRAY['/assets/images/services/hotel.png'], 
    NULL, 
    '2026-02-23 05:31:30'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '9520370f-4762-4b6b-8e56-59b247b5d05a', 
    (SELECT id FROM public.service WHERE service_code = 'HTL02'),
    'Ngọc Hân', 
    'silver', 
    5, 
    'Bé cún nhà mình thơm tho suốt cả tuần luôn, đỉnh thật sự.', 
    ARRAY['/assets/images/services/spa.png'], 
    'Dạ tụi em ghi nhận góp ý ạ, thời gian tới PawPal sẽ update thêm các line mùi hương thiên nhiên mới phục vụ các bé.', 
    '2026-03-10 21:43:23'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'b567be49-17e1-4a8e-bfb1-72201fba324f', 
    (SELECT id FROM public.service WHERE service_code = 'HTL02'),
    'Minh Tuấn', 
    'silver', 
    5, 
    'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!', 
    NULL, 
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!', 
    '2026-06-26 05:21:53'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '3ab53a0b-eff2-41d7-8c88-7de86b6f8615', 
    (SELECT id FROM public.service WHERE service_code = 'HTL03'),
    'Minh Tuấn', 
    'silver', 
    5, 
    'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!', 
    NULL, 
    NULL, 
    '2026-01-05 14:20:33'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '1aa35807-8b98-4cef-88b7-ff3f06d183e5', 
    (SELECT id FROM public.service WHERE service_code = 'HTL03'),
    'Mai Hoa', 
    'diamond', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    NULL, 
    'Dạ tụi em ghi nhận góp ý ạ, thời gian tới PawPal sẽ update thêm các line mùi hương thiên nhiên mới phục vụ các bé.', 
    '2026-05-16 05:51:22'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '3a5af385-c905-48f6-8fc2-05e46935fdc8', 
    (SELECT id FROM public.service WHERE service_code = 'HTL03'),
    'Thanh Tùng', 
    'diamond', 
    5, 
    'Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.', 
    NULL, 
    NULL, 
    '2026-03-13 12:29:16'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '771f02c6-d51a-48ac-a3a9-04352cbe02b9', 
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'Lan Phương', 
    'gold', 
    5, 
    'Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.', 
    NULL, 
    'Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!', 
    '2026-05-11 02:05:11'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '4b1482d1-c2f9-4af0-9b6b-f205a92f747c', 
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'Đức Huy', 
    'member', 
    5, 
    'Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.', 
    NULL, 
    NULL, 
    '2026-06-11 14:01:23'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '0950b1b3-68d9-45d2-b3e4-111ccf18058f', 
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'Hoàng Anh', 
    'gold', 
    5, 
    'Dịch vụ khá tốt, nhưng hy vọng có thêm nhiều lựa chọn mùi hương sữa tắm hơn.', 
    NULL, 
    NULL, 
    '2026-05-05 13:35:38'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'abde67b1-4203-4dca-94b4-88cbe28ab7cf', 
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'Đức Huy', 
    'member', 
    5, 
    'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!', 
    NULL, 
    NULL, 
    '2026-02-19 05:26:48'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'b2c00f43-86a6-4574-8b96-5d96900c9317', 
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'Thảo Nguyễn', 
    'member', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    NULL, 
    NULL, 
    '2026-05-18 06:07:18'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '96aee522-c90a-42b7-9772-6a38996374b4', 
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'Ngọc Hân', 
    'diamond', 
    5, 
    'Mình rất hài lòng. Phòng chờ thoải mái, có chỗ uống nước nghỉ ngơi trong lúc chờ bé.', 
    NULL, 
    NULL, 
    '2026-01-31 21:59:02'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'ea6686b2-8613-4860-84da-c94e04e59d77', 
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'Đức Huy', 
    'member', 
    5, 
    'Bé cún nhà mình thơm tho suốt cả tuần luôn, đỉnh thật sự.', 
    NULL, 
    'PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!', 
    '2026-04-29 08:59:13'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'a87af346-a374-45ec-bd2f-0be139612e85', 
    (SELECT id FROM public.service WHERE service_code = 'HTL04'),
    'Hoàng Anh', 
    'gold', 
    5, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    NULL, 
    NULL, 
    '2026-02-13 12:16:22'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'c178b30d-c822-4bf1-91bf-c42d8f516b05', 
    (SELECT id FROM public.service WHERE service_code = 'TXI01'),
    'Thảo Nguyễn', 
    'silver', 
    3, 
    'Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo.', 
    ARRAY['/assets/images/services/spa.png'], 
    'Cảm ơn anh/chị đã tin tưởng và sử dụng dịch vụ của PawPal. Chúc bé cưng luôn ngoan và khỏe mạnh ạ!', 
    '2026-02-02 06:28:30'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '00467a9d-d664-49f1-8f44-a3c4498027a9', 
    (SELECT id FROM public.service WHERE service_code = 'TXI01'),
    'Lan Phương', 
    'member', 
    5, 
    'Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.', 
    ARRAY['/assets/images/services/spa.png'], 
    NULL, 
    '2026-06-19 07:06:50'
);
INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    'd8c2dc4e-571e-4791-acfd-59afe283e8f5', 
    (SELECT id FROM public.service WHERE service_code = 'TXI01'),
    'Đức Huy', 
    'diamond', 
    5, 
    'Mình rất hài lòng. Phòng chờ thoải mái, có chỗ uống nước nghỉ ngơi trong lúc chờ bé.', 
    NULL, 
    'Cảm ơn anh/chị đã tin tưởng và sử dụng dịch vụ của PawPal. Chúc bé cưng luôn ngoan và khỏe mạnh ạ!', 
    '2026-06-29 01:25:10'
);
GRANT SELECT ON public.service_review TO anon;
GRANT SELECT ON public.service_review TO authenticated;
