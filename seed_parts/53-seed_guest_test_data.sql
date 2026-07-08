-- Tạo tài khoản khách (Guest) cho số 0987654321 nếu chưa có
INSERT INTO public.customer (id, phone_main, account_status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0000-000000000003', '0987654321', 'ACTIVE', now(), now())
ON CONFLICT (phone_main) DO NOTHING;

-- Lấy lại id thực tế nếu bị conflict, nhưng để đơn giản ta dùng id cố định ở trên
-- Tạo địa chỉ giao hàng
INSERT INTO public.customer_address (id, customer_id, receiver_name, receiver_phone, province, street_address, is_default, created_at, updated_at)
VALUES ('f0000000-0000-0000-2222-000000000003', 'd0000000-0000-0000-0000-000000000003', 'Guest Test', '0987654321', 'TP.HCM', '123 Test Street', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 1. Đơn hàng: Đang chuẩn bị & Đã thanh toán Momo (Để test hủy đơn)
INSERT INTO public.sales_order (id, order_code, customer_id, shipping_address_id, order_status, payment_status, subtotal, shipping_fee, discount_amount, total_amount, created_at, updated_at)
VALUES ('471e85eb-3539-4fa3-b792-5fb7ecbb9914', 'ORD-2026-GUEST1', 'd0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-2222-000000000003', 'CONFIRMED', 'PAID', 225000, 30000, 0, 255000, '2026-07-08 10:00:00', '2026-07-08 10:30:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal)
VALUES ('24740a91-51c2-4d69-bbb5-f0f891f12ae7', '471e85eb-3539-4fa3-b792-5fb7ecbb9914', 'a0000000-0000-0000-0000-000000000001', 1, 225000, 0, 225000)
ON CONFLICT (id) DO NOTHING;

-- 2. Đơn hàng: Đã giao hàng (Để test kịch bản Xác nhận -> Hoàn thành -> Trả hàng)
INSERT INTO public.sales_order (id, order_code, customer_id, shipping_address_id, order_status, payment_status, subtotal, shipping_fee, discount_amount, total_amount, created_at, updated_at)
VALUES ('93cf1322-f2be-4828-b0d3-d66e7efc6597', 'ORD-2026-GUEST2', 'd0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-2222-000000000003', 'DELIVERED', 'PAID', 400000, 30000, 0, 430000, '2026-07-01 10:00:00', '2026-07-04 10:30:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal)
VALUES ('126cc6d7-c7ce-4ee9-8189-08aa0c881fca', '93cf1322-f2be-4828-b0d3-d66e7efc6597', 'a0000000-0000-0000-0000-000000000001', 1, 400000, 0, 400000)
ON CONFLICT (id) DO NOTHING;

-- 3. Lịch hẹn: Sắp tới (Để test Hủy lịch)
INSERT INTO public.appointment (id, appointment_code, customer_id, pet_id, service_id, appointment_date, appointment_time, appointment_status, payment_status, change_count, created_at, updated_at)
VALUES ('6b352c8b-393e-4fe7-b6a6-7107dbbc5f77', 'BKG-2026-GUEST1', 'd0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2026-07-15', '14:00:00', 'CONFIRMED', 'UNPAID', 0, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 4. Tạo nhân viên phụ trách (nếu chưa có)
INSERT INTO public.staff (id, full_name, phone_number, role, specialization, created_at, updated_at)
VALUES ('e0000000-5555-5555-5555-555555555555', 'Nguyễn Thị Chăm Sóc', '0999888777', 'PET_CARE', 'Spa/Grooming', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 5. Lịch hẹn: Đã hoàn thành (Gán nhân viên e0000000-5555-5555-5555-555555555555)
INSERT INTO public.appointment (id, appointment_code, customer_id, pet_id, service_id, staff_id, appointment_date, appointment_time, appointment_status, payment_status, change_count, created_at, updated_at)
VALUES ('938d3d31-a622-4d3e-9d34-193fd3e960c8', 'BKG-2026-GUEST2', 'd0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-5555-5555-5555-555555555555', '2026-07-01', '08:00:00', 'COMPLETED', 'PAID', 0, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. Nhật ký chăm sóc (Care Logs) đa dạng cho lịch hẹn BKG-2026-GUEST2
-- Log 1: Tiếp nhận
INSERT INTO public.care_log (id, appointment_id, pet_id, care_action_id, description, health_status, recorded_at, created_at, updated_at)
VALUES ('27907ac8-0465-4c9c-83ed-bd6e9ccca486', '938d3d31-a622-4d3e-9d34-193fd3e960c8', '20000000-0000-0000-0000-000000000001', '90000000-1111-2222-3333-444444444444', 'Tiếp nhận bé tại quầy. Bé hơi nhát nhưng đã làm quen được với nhân viên.', 'Bình thường, hơi căng thẳng.', '2026-07-01 08:10:00', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Log 2: Đang tắm (Kèm ảnh)
INSERT INTO public.care_log (id, appointment_id, pet_id, care_action_id, description, health_status, recorded_at, created_at, updated_at)
VALUES ('38a18bd9-1576-5dad-94fe-ce7faaddb597', '938d3d31-a622-4d3e-9d34-193fd3e960c8', '20000000-0000-0000-0000-000000000001', '90000000-1111-2222-3333-444444444444', 'Đang tắm gội bằng sữa tắm trị liệu. Bé hợp tác rất tốt, không vẫy nước.', 'Khỏe mạnh, da dẻ tốt, không nấm rận.', '2026-07-01 08:45:00', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.care_log_media (id, care_log_id, media_type, media_url, file_name, file_size, staff_id, uploaded_at, created_at)
VALUES ('c0000000-1111-1111-1111-111111111111', '38a18bd9-1576-5dad-94fe-ce7faaddb597', 'IMAGE', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80', 'bathing.jpg', 102400, 'e0000000-5555-5555-5555-555555555555', '2026-07-01 08:45:00', now())
ON CONFLICT (id) DO NOTHING;

-- Log 3: Hoàn thành (Kèm ảnh)
INSERT INTO public.care_log (id, appointment_id, pet_id, care_action_id, description, health_status, recorded_at, created_at, updated_at)
VALUES ('49b29ce0-2687-6ebe-a50f-df80bbeec608', '938d3d31-a622-4d3e-9d34-193fd3e960c8', '20000000-0000-0000-0000-000000000001', '90000000-1111-2222-3333-444444444444', 'Đã sấy khô, chải lông tơi xốp và xịt nước hoa. Bé đã sẵn sàng về với ba mẹ!', 'Rất tốt, sạch sẽ thơm tho.', '2026-07-01 09:30:00', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.care_log_media (id, care_log_id, media_type, media_url, file_name, file_size, staff_id, uploaded_at, created_at)
VALUES ('d0000000-2222-2222-2222-222222222222', '49b29ce0-2687-6ebe-a50f-df80bbeec608', 'IMAGE', 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80', 'finished.jpg', 150000, 'e0000000-5555-5555-5555-555555555555', '2026-07-01 09:30:00', now())
ON CONFLICT (id) DO NOTHING;
