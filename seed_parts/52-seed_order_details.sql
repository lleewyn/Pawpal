-- Chi tiết sản phẩm cho các đơn hàng seed
-- Xoá detail cũ nếu có
DELETE FROM public.sales_order_detail WHERE order_id IN (
  'e023622e-137c-40cd-894b-e192839ed8d6',
  '40678126-c381-42b8-a7ee-7d38caf68a16',
  '9254d6bd-6731-4543-88d8-505dfb46f3fa',
  'c90d903d-112f-4250-a1a8-4fc058d4520c',
  '3a886fb0-a039-45e4-9a69-7040caabbed7',
  'e65cfa46-c359-4c40-a90e-13cf8d6b729b',
  '376663f2-8845-48c8-9ec2-afa4d8aa50da',
  'b78453db-af4e-4f67-9603-84914ae6540f',
  '68a3c6bc-559d-43e9-8f1b-a51b5ba0230a',
  '11aa1aaf-181c-4c3c-93e1-28b1e6b221a0',
  'f7a03a74-0ee1-402a-a711-bceaa09eb90a',
  '25b2c3df-3411-492d-823c-a9e86acb5dde',
  '13dedadd-86da-4dbf-b360-49d01392380e',
  '3c95011d-d553-457e-9c4f-4b0c006cfaf7',
  '79daa762-c3a5-4230-b94f-078c5de462e0',
  '8a2f4274-9ca2-427f-89e1-73200a6811d3',
  '432d7a98-a274-44f7-891a-28a98d7def52',
  'e3673d48-9ab1-4eb9-aab5-2e91c36caa0f',
  '97568345-c1b3-463a-ba6d-516e864620f9',
  '9fa7e446-81ce-4691-a571-040b99621519',
  '3ca58f9c-affc-467b-b2f9-79121cb7cc0a',
  '574c3148-8315-4cbd-9027-21462b7ca385',
  'db77200f-d751-4a4a-820e-cd003abba990',
  '98678df6-3765-498b-b613-57f3bb8f8b7f',
  '3c2a0652-1f87-403e-a338-9d1a1449f056',
  'e00707fe-2ddb-444a-a0fa-2623afc3c494',
  '927ac9a7-5553-4edb-9550-9a277789e973',
  '56ff8f63-876f-498c-8d67-96b14b347e8a',
  'a3804cd7-a9f5-4dec-8467-717850904789',
  '6aa5531f-46b2-477b-9339-a580b026c653',
  '9404f453-ef8b-47a7-955b-e22cd9ce4338',
  '3d21e38b-eb56-49b8-9bd6-ece1044240c1',
  'ccfd39ca-ead7-4634-a7a9-d53d10ca1c2d',
  '345f4ee3-69db-4cd6-aca0-b95ffd960482',
  '32c5b715-208b-45ca-95bb-4834be073a37',
  'a351a14d-63e3-412e-8968-0ad7124d19d4',
  '3a000778-a13a-414f-8aba-44a11eed12d6',
  '2cf4fd5d-60e3-46f1-a12e-3f94847b5d73',
  '1263275f-25a7-4e28-b260-9378e7dc9c56',
  'e9dcf072-a1c4-4646-87ca-81beab451817',
  '29e90d6a-503f-4baf-b1f1-fe004edcf3c9',
  '06e0acc3-061a-437d-ade7-6ff91c2d7f04',
  'fdec6a0e-22a0-44f6-8c43-1cc85334fc22',
  '1619e1fe-59f6-4cb4-92ff-d265bb71a8fb',
  'd5cd57c9-c21c-4e52-a6df-dbdd47e6b75b',
  '6b890c5e-111c-473f-82e1-570479cab07e',
  'ff26ea8c-b715-442a-bf09-62af57ded26d',
  '3258d356-33a6-4199-9cbd-cf0d74191a0c',
  '34084a24-d3d2-4442-808c-caf7b8c697f0',
  'ae3ef90c-3846-4a68-bda6-04f11fcbb64d',
  'e9ad6234-d63c-4331-bd19-966f5bce403c',
  '2ae1d9c8-8825-496d-bbeb-c3281963784b',
  'f5b87e3b-1312-4412-bd42-91ab6c6e21eb',
  'aa6807b8-80dd-4e74-97a7-8f12861d2c5c',
  '7571f070-0b19-446d-ac28-13c192bc0bd3',
  '3baec90d-1af8-4799-b9f4-f88175843fb6'
);

INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('10fff0fa-9d5e-4b09-a577-3dd3d57c3c0d', 'e023622e-137c-40cd-894b-e192839ed8d6', 'a0000000-0000-0000-0000-000000000001', 1, 200000, 0, 200000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('d5ef64a7-8739-4623-8426-3d4a721f6fdb', '40678126-c381-42b8-a7ee-7d38caf68a16', 'a0000000-0000-0000-0000-000000000002', 2, 45000, 0, 90000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('9eb1f797-d25e-4fb3-a7c3-34f20f63a022', '9254d6bd-6731-4543-88d8-505dfb46f3fa', 'a0000000-0000-0000-0000-000000000003', 1, 55000, 0, 55000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('4ede2ecf-f76b-4c1a-991e-0353cf0f7633', 'c90d903d-112f-4250-a1a8-4fc058d4520c', 'a0000000-0000-0000-0000-000000000004', 2, 130000, 0, 260000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('13202c9e-5bf2-4732-8b58-936a7527fc61', '3a886fb0-a039-45e4-9a69-7040caabbed7', 'a0000000-0000-0000-0000-000000000005', 1, 350000, 0, 350000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('8a8eb565-ae46-413a-9e68-78b76912d02d', 'e65cfa46-c359-4c40-a90e-13cf8d6b729b', 'a0000000-0000-0000-0000-000000000006', 2, 280000, 0, 560000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('74197deb-05c0-4718-8e45-eb590897e6d5', '376663f2-8845-48c8-9ec2-afa4d8aa50da', 'a0000000-0000-0000-0000-000000000007', 1, 65000, 0, 65000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('5cefcba6-62a5-4840-a95f-3705f9449a61', 'b78453db-af4e-4f67-9603-84914ae6540f', 'a0000000-0000-0000-0000-000000000008', 2, 60000, 0, 120000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('e6397431-e11e-487a-8fda-1592a7def3d0', '68a3c6bc-559d-43e9-8f1b-a51b5ba0230a', 'a0000000-0000-0000-0000-000000000001', 1, 200000, 0, 200000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('79f5bbd1-a9b5-4cb0-ab3b-423fd51af124', '11aa1aaf-181c-4c3c-93e1-28b1e6b221a0', 'a0000000-0000-0000-0000-000000000002', 2, 45000, 0, 90000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('51cf0182-3aad-44d4-8a34-103d404ca24d', 'f7a03a74-0ee1-402a-a711-bceaa09eb90a', 'a0000000-0000-0000-0000-000000000003', 1, 55000, 0, 55000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('42a6d9a9-db51-4ed5-9230-1101a714b7f3', '25b2c3df-3411-492d-823c-a9e86acb5dde', 'a0000000-0000-0000-0000-000000000004', 2, 130000, 0, 260000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('4e7e112e-7199-41f3-a9af-97376f64da37', '13dedadd-86da-4dbf-b360-49d01392380e', 'a0000000-0000-0000-0000-000000000005', 1, 350000, 0, 350000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('b273c03f-6879-4807-adf0-a104d37cab4b', '3c95011d-d553-457e-9c4f-4b0c006cfaf7', 'a0000000-0000-0000-0000-000000000006', 2, 280000, 0, 560000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('416ca1a1-8f65-435e-8e87-f55253adceeb', '79daa762-c3a5-4230-b94f-078c5de462e0', 'a0000000-0000-0000-0000-000000000007', 1, 65000, 0, 65000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('c5561f37-50ad-4556-96dc-cc6e51e0b8b3', '8a2f4274-9ca2-427f-89e1-73200a6811d3', 'a0000000-0000-0000-0000-000000000008', 2, 60000, 0, 120000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('b5cfa48d-3739-4286-b0b5-49ee3c108b06', '432d7a98-a274-44f7-891a-28a98d7def52', 'a0000000-0000-0000-0000-000000000001', 1, 200000, 0, 200000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('626a29f1-8329-4675-9a95-59a9b912b957', 'e3673d48-9ab1-4eb9-aab5-2e91c36caa0f', 'a0000000-0000-0000-0000-000000000002', 2, 45000, 0, 90000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('718b3da1-544a-42c6-a5df-56e84c257e5d', '97568345-c1b3-463a-ba6d-516e864620f9', 'a0000000-0000-0000-0000-000000000003', 1, 55000, 0, 55000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('2a612dcb-e20c-42ea-a258-252d437100bc', '9fa7e446-81ce-4691-a571-040b99621519', 'a0000000-0000-0000-0000-000000000004', 2, 130000, 0, 260000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('b95a538f-37ba-4c50-b1b1-48d7d864615c', '3ca58f9c-affc-467b-b2f9-79121cb7cc0a', 'a0000000-0000-0000-0000-000000000005', 1, 350000, 0, 350000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('0611d5d5-e324-4b47-90b4-40facb3dffab', '574c3148-8315-4cbd-9027-21462b7ca385', 'a0000000-0000-0000-0000-000000000006', 2, 280000, 0, 560000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('ec3fadba-feb2-49fb-a7af-91f51b19b607', 'db77200f-d751-4a4a-820e-cd003abba990', 'a0000000-0000-0000-0000-000000000007', 1, 65000, 0, 65000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('bc6f53fa-971f-4b89-95a9-7c4ac920eb98', '98678df6-3765-498b-b613-57f3bb8f8b7f', 'a0000000-0000-0000-0000-000000000008', 2, 60000, 0, 120000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('2e1ddc63-9c3f-4128-b193-b932d1accbde', '3c2a0652-1f87-403e-a338-9d1a1449f056', 'a0000000-0000-0000-0000-000000000001', 1, 200000, 0, 200000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('a47f5c9e-f56d-4496-85a5-7c5c5024fa62', 'e00707fe-2ddb-444a-a0fa-2623afc3c494', 'a0000000-0000-0000-0000-000000000002', 2, 45000, 0, 90000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('63af78c6-526f-4501-9a11-4afdccc7722b', '927ac9a7-5553-4edb-9550-9a277789e973', 'a0000000-0000-0000-0000-000000000003', 1, 55000, 0, 55000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('c292489c-6fbf-4571-82c4-e478d3e1e20c', '56ff8f63-876f-498c-8d67-96b14b347e8a', 'a0000000-0000-0000-0000-000000000004', 2, 130000, 0, 260000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('c3d98498-ddb8-45da-832e-775e6d43c413', 'a3804cd7-a9f5-4dec-8467-717850904789', 'a0000000-0000-0000-0000-000000000005', 1, 350000, 0, 350000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('086df0c3-2134-4775-97ba-829a8f2dd267', '6aa5531f-46b2-477b-9339-a580b026c653', 'a0000000-0000-0000-0000-000000000006', 2, 280000, 0, 560000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('78cffe0b-11f0-4c77-9e70-60a37aa03031', '9404f453-ef8b-47a7-955b-e22cd9ce4338', 'a0000000-0000-0000-0000-000000000007', 1, 65000, 0, 65000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('af4eafde-c1a7-4e4d-93a0-60cac7ee337c', '3d21e38b-eb56-49b8-9bd6-ece1044240c1', 'a0000000-0000-0000-0000-000000000008', 2, 60000, 0, 120000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('17ef0421-6e4f-47c4-8295-c749b095063b', 'ccfd39ca-ead7-4634-a7a9-d53d10ca1c2d', 'a0000000-0000-0000-0000-000000000001', 1, 200000, 0, 200000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('0c51877a-0956-45c3-98f6-170aa4870ff2', '345f4ee3-69db-4cd6-aca0-b95ffd960482', 'a0000000-0000-0000-0000-000000000002', 2, 45000, 0, 90000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('8df8b06d-0c0e-49f4-b7ef-cafc2edc36df', '32c5b715-208b-45ca-95bb-4834be073a37', 'a0000000-0000-0000-0000-000000000003', 1, 55000, 0, 55000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('aea365a7-acfd-42dc-8bfa-54dbd5f5084b', 'a351a14d-63e3-412e-8968-0ad7124d19d4', 'a0000000-0000-0000-0000-000000000004', 2, 130000, 0, 260000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('05705592-41c2-4474-803c-0c2a882156f2', '3a000778-a13a-414f-8aba-44a11eed12d6', 'a0000000-0000-0000-0000-000000000005', 1, 350000, 0, 350000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('1ff3955e-a89b-4723-8e50-31a13a6e0b19', '2cf4fd5d-60e3-46f1-a12e-3f94847b5d73', 'a0000000-0000-0000-0000-000000000006', 2, 280000, 0, 560000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('90b95dc0-ba73-4a16-95f5-711a41321bcf', '1263275f-25a7-4e28-b260-9378e7dc9c56', 'a0000000-0000-0000-0000-000000000007', 1, 65000, 0, 65000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('7c8f56e9-406a-48d9-8893-329b108e073b', 'e9dcf072-a1c4-4646-87ca-81beab451817', 'a0000000-0000-0000-0000-000000000008', 2, 60000, 0, 120000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('10876225-6a5a-41b8-8931-7f5f8004f106', '29e90d6a-503f-4baf-b1f1-fe004edcf3c9', 'a0000000-0000-0000-0000-000000000001', 1, 200000, 0, 200000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('4ee3d3b5-a6dc-4209-89b5-1f1ed662083f', '06e0acc3-061a-437d-ade7-6ff91c2d7f04', 'a0000000-0000-0000-0000-000000000002', 2, 45000, 0, 90000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('ed56b92b-4ccd-499e-bc08-410a0bdbf00b', 'fdec6a0e-22a0-44f6-8c43-1cc85334fc22', 'a0000000-0000-0000-0000-000000000003', 1, 55000, 0, 55000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('b0199584-d1be-4f61-ad82-4c90ed9a7f8f', '1619e1fe-59f6-4cb4-92ff-d265bb71a8fb', 'a0000000-0000-0000-0000-000000000004', 2, 130000, 0, 260000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('878311aa-8fa0-460b-b508-399bda99b498', 'd5cd57c9-c21c-4e52-a6df-dbdd47e6b75b', 'a0000000-0000-0000-0000-000000000005', 1, 350000, 0, 350000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('3654ac38-af80-49a5-8f5a-bf2184d8d6ab', '6b890c5e-111c-473f-82e1-570479cab07e', 'a0000000-0000-0000-0000-000000000006', 2, 280000, 0, 560000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('5ee66af6-00ed-4bc3-a3b4-cac7939055a2', 'ff26ea8c-b715-442a-bf09-62af57ded26d', 'a0000000-0000-0000-0000-000000000007', 1, 65000, 0, 65000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('70e5fe32-817e-4b2f-bc1f-22240eea941d', '3258d356-33a6-4199-9cbd-cf0d74191a0c', 'a0000000-0000-0000-0000-000000000008', 2, 60000, 0, 120000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('f39a484a-36ef-43c5-8f71-1e8f7325a5cd', '34084a24-d3d2-4442-808c-caf7b8c697f0', 'a0000000-0000-0000-0000-000000000001', 1, 200000, 0, 200000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('d1c68f29-0721-4d17-a9e2-116ddd9e266f', 'ae3ef90c-3846-4a68-bda6-04f11fcbb64d', 'a0000000-0000-0000-0000-000000000002', 2, 45000, 0, 90000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('542863b4-84cc-455e-9c50-93984ae0e71a', 'e9ad6234-d63c-4331-bd19-966f5bce403c', 'a0000000-0000-0000-0000-000000000003', 1, 55000, 0, 55000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('2b872f83-c05b-4331-9ea1-220d5a9d0cde', '2ae1d9c8-8825-496d-bbeb-c3281963784b', 'a0000000-0000-0000-0000-000000000004', 2, 130000, 0, 260000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('02188cfe-54a2-4c83-b873-127b8851148f', 'f5b87e3b-1312-4412-bd42-91ab6c6e21eb', 'a0000000-0000-0000-0000-000000000005', 1, 350000, 0, 350000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('85d06fe6-0d52-4ba4-bd51-8c1cdb80ab62', 'aa6807b8-80dd-4e74-97a7-8f12861d2c5c', 'a0000000-0000-0000-0000-000000000006', 2, 280000, 0, 560000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('93317af0-ae85-4d4e-82e2-c92b3d25ea95', '7571f070-0b19-446d-ac28-13c192bc0bd3', 'a0000000-0000-0000-0000-000000000007', 1, 65000, 0, 65000) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_order_detail (id, order_id, product_id, quantity, unit_price, discount_amount, subtotal) VALUES ('529bace7-d525-419c-a084-41b2638d2609', '3baec90d-1af8-4799-b9f4-f88175843fb6', 'a0000000-0000-0000-0000-000000000008', 2, 60000, 0, 120000) ON CONFLICT (id) DO NOTHING;
