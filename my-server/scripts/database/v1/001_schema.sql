-- Generated from reviewed V1 physical model. Fingerprint: 4385e82e3ef3e375f7743fa5232cccbc266cf9ce51045c9d49c0e2d8042685e4
-- Creates exactly 105 application tables / 906 columns in an EMPTY public schema.
-- Auth/Storage are managed by Supabase and are not recreated. Never run on Cloud.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
SET search_path=public,extensions,pg_catalog;
CREATE SCHEMA IF NOT EXISTS pawpal_private;
REVOKE ALL ON SCHEMA pawpal_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
CREATE TABLE public."guest_session" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "token_hash" text NOT NULL UNIQUE,
 "expires_at" timestamptz NOT NULL,
 "revoked_at" timestamptz,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."guest_session" IS 'Định danh phiên khách vãng lai mà không tạo hồ sơ khách giả.';
COMMENT ON COLUMN public."guest_session"."id" IS 'Mã phiên khách vãng lai.';
COMMENT ON COLUMN public."guest_session"."token_hash" IS 'Giá trị băm token truy cập phiên, duy nhất.';
COMMENT ON COLUMN public."guest_session"."expires_at" IS 'Thời điểm hết hạn phiên.';
COMMENT ON COLUMN public."guest_session"."revoked_at" IS 'Thời điểm thu hồi phiên; có thể NULL.';
COMMENT ON COLUMN public."guest_session"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."permission" (
 "code" text NOT NULL,
 "description" text NOT NULL,
 PRIMARY KEY ("code")
);
COMMENT ON TABLE public."permission" IS 'Danh mục các quyền thao tác được máy chủ kiểm tra.';
COMMENT ON COLUMN public."permission"."code" IS 'Mã quyền duy nhất, dùng làm khóa chính.';
COMMENT ON COLUMN public."permission"."description" IS 'Nội dung và phạm vi thao tác được cấp quyền.';
CREATE TABLE public."access_role" (
 "code" text NOT NULL,
 "role_name" text NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("code")
);
COMMENT ON TABLE public."access_role" IS 'Danh mục vai trò truy cập, độc lập chức danh nghề nghiệp.';
COMMENT ON COLUMN public."access_role"."code" IS 'Mã vai trò truy cập, dùng làm khóa chính.';
COMMENT ON COLUMN public."access_role"."role_name" IS 'Tên hiển thị của vai trò.';
COMMENT ON COLUMN public."access_role"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."access_role"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."role_permission" (
 "role_code" text NOT NULL,
 "permission_code" text NOT NULL,
 PRIMARY KEY ("role_code", "permission_code")
);
COMMENT ON TABLE public."role_permission" IS 'Liên kết nhiều quyền với nhiều vai trò truy cập.';
COMMENT ON COLUMN public."role_permission"."role_code" IS 'Vai trò được gán quyền; cùng permission_code tạo khóa chính.';
COMMENT ON COLUMN public."role_permission"."permission_code" IS 'Quyền thuộc vai trò; cùng role_code tạo khóa chính.';
CREATE TABLE public."staff_role" (
 "staff_id" uuid NOT NULL,
 "role_code" text NOT NULL,
 PRIMARY KEY ("staff_id", "role_code")
);
COMMENT ON TABLE public."staff_role" IS 'Gán các vai trò truy cập cho nhân viên.';
COMMENT ON COLUMN public."staff_role"."staff_id" IS 'Nhân viên được gán vai trò; cùng role_code tạo khóa chính.';
COMMENT ON COLUMN public."staff_role"."role_code" IS 'Vai trò truy cập được gán; cùng staff_id tạo khóa chính.';
CREATE TABLE public."staff_permission" (
 "staff_id" uuid NOT NULL,
 "permission_code" text NOT NULL,
 PRIMARY KEY ("staff_id", "permission_code")
);
COMMENT ON TABLE public."staff_permission" IS 'Cấp thêm quyền trực tiếp cho nhân viên, không biểu diễn quyền từ chối.';
COMMENT ON COLUMN public."staff_permission"."staff_id" IS 'Nhân viên nhận quyền; cùng permission_code tạo khóa chính.';
COMMENT ON COLUMN public."staff_permission"."permission_code" IS 'Quyền được cấp thêm; cùng staff_id tạo khóa chính.';
CREATE TABLE public."customer" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "auth_user_id" uuid UNIQUE,
 "customer_code" text NOT NULL UNIQUE,
 "customer_status" text NOT NULL DEFAULT 'active',
 "registered_at" timestamptz NOT NULL DEFAULT now(),
 "note" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "contact_email" text,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."customer" IS 'Hồ sơ nghiệp vụ khách hàng, có thể được tạo tại quầy trước khi có tài khoản.';
COMMENT ON COLUMN public."customer"."id" IS 'Mã định danh khách hàng.';
COMMENT ON COLUMN public."customer"."auth_user_id" IS 'Tài khoản đăng nhập liên kết duy nhất; NULL nếu khách chưa đăng ký.';
COMMENT ON COLUMN public."customer"."customer_code" IS 'Mã khách hàng dùng tra cứu và hiển thị, duy nhất.';
COMMENT ON COLUMN public."customer"."customer_status" IS 'Trạng thái hồ sơ nghiệp vụ, độc lập trạng thái tài khoản đăng nhập.';
COMMENT ON COLUMN public."customer"."registered_at" IS 'Thời điểm khách được ghi nhận vào hệ thống.';
COMMENT ON COLUMN public."customer"."note" IS 'Ghi chú nội bộ về khách hàng.';
COMMENT ON COLUMN public."customer"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."customer"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."customer"."contact_email" IS 'Email nhận liên hệ của khách; có thể NULL và không tự thay đổi email đăng nhập.';
CREATE TABLE public."customer_profile" (
 "customer_id" uuid NOT NULL,
 "full_name" text NOT NULL,
 "date_of_birth" date,
 "gender" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("customer_id")
);
COMMENT ON TABLE public."customer_profile" IS 'Lưu một hồ sơ cá nhân cho mỗi khách hàng.';
COMMENT ON COLUMN public."customer_profile"."customer_id" IS 'Khách sở hữu hồ sơ; đồng thời là khóa chính và khóa ngoại.';
COMMENT ON COLUMN public."customer_profile"."full_name" IS 'Họ tên khách hàng.';
COMMENT ON COLUMN public."customer_profile"."date_of_birth" IS 'Ngày sinh, có thể chưa cung cấp.';
COMMENT ON COLUMN public."customer_profile"."gender" IS 'Giới tính do khách cung cấp, có thể chưa xác định.';
COMMENT ON COLUMN public."customer_profile"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."customer_profile"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."customer_phone" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "customer_id" uuid NOT NULL,
 "phone_number" text NOT NULL,
 "is_primary" boolean NOT NULL DEFAULT false,
 "verified_at" timestamptz,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."customer_phone" IS 'Lưu các số điện thoại liên hệ và số chính dùng xác minh đăng nhập.';
COMMENT ON COLUMN public."customer_phone"."id" IS 'Mã số liên hệ.';
COMMENT ON COLUMN public."customer_phone"."customer_id" IS 'Khách hàng sở hữu số liên hệ.';
COMMENT ON COLUMN public."customer_phone"."phone_number" IS 'Số điện thoại đã chuẩn hóa; không trùng trong cùng khách.';
COMMENT ON COLUMN public."customer_phone"."is_primary" IS 'Đánh dấu số chính; số chính không được dùng cho nhiều khách.';
COMMENT ON COLUMN public."customer_phone"."verified_at" IS 'Thời điểm xác minh số điện thoại thành công; NULL khi chưa xác minh.';
COMMENT ON COLUMN public."customer_phone"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."customer_phone"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."customer_address" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "customer_id" uuid NOT NULL,
 "receiver_name" text NOT NULL,
 "receiver_phone" text NOT NULL,
 "province" text NOT NULL,
 "street_address" text NOT NULL,
 "postal_code" text,
 "is_default" boolean NOT NULL DEFAULT false,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."customer_address" IS 'Lưu nhiều địa chỉ giao hàng, đón trả thú cưng hoặc địa chỉ đặt hộ của khách hàng';
COMMENT ON COLUMN public."customer_address"."id" IS 'Mã định danh địa chỉ';
COMMENT ON COLUMN public."customer_address"."customer_id" IS 'Khách hàng sở hữu địa chỉ';
COMMENT ON COLUMN public."customer_address"."receiver_name" IS 'Tên người nhận tại địa chỉ';
COMMENT ON COLUMN public."customer_address"."receiver_phone" IS 'Số điện thoại người nhận';
COMMENT ON COLUMN public."customer_address"."province" IS 'Tỉnh hoặc thành phố của địa chỉ';
COMMENT ON COLUMN public."customer_address"."street_address" IS 'Địa chỉ chi tiết';
COMMENT ON COLUMN public."customer_address"."postal_code" IS 'Mã bưu chính';
COMMENT ON COLUMN public."customer_address"."is_default" IS 'Cho biết đây có phải địa chỉ mặc định hay không';
COMMENT ON COLUMN public."customer_address"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."customer_address"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."membership_tier" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "tier_name" text NOT NULL UNIQUE,
 "minimum_expenditure" numeric(18,4) NOT NULL DEFAULT 0,
 "discount_percent" numeric(18,4) NOT NULL DEFAULT 0,
 "description" text,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."membership_tier" IS 'Lưu cấu hình các hạng thành viên như Bạc, Vàng, Kim Cương';
COMMENT ON COLUMN public."membership_tier"."id" IS 'Mã định danh hạng thành viên';
COMMENT ON COLUMN public."membership_tier"."tier_name" IS 'Tên hạng thành viên';
COMMENT ON COLUMN public."membership_tier"."minimum_expenditure" IS 'Mức chi tiêu tối thiểu để đạt hạng';
COMMENT ON COLUMN public."membership_tier"."discount_percent" IS 'Tỷ lệ giảm giá của hạng';
COMMENT ON COLUMN public."membership_tier"."description" IS 'Quyền lợi của hạng thành viên';
COMMENT ON COLUMN public."membership_tier"."is_active" IS 'Hạng thành viên có đang áp dụng hay không';
COMMENT ON COLUMN public."membership_tier"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."membership_tier"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."customer_membership" (
 "customer_id" uuid NOT NULL,
 "membership_tier_id" uuid NOT NULL,
 "assigned_at" timestamptz NOT NULL DEFAULT now(),
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("customer_id")
);
COMMENT ON TABLE public."customer_membership" IS 'Lưu hạng thành viên hiện đang được gán; không lưu số dư điểm lặp.';
COMMENT ON COLUMN public."customer_membership"."customer_id" IS 'Khách được gán hạng; đồng thời là khóa chính và khóa ngoại.';
COMMENT ON COLUMN public."customer_membership"."membership_tier_id" IS 'Hạng hiện tại được gán theo chính sách xét hạng.';
COMMENT ON COLUMN public."customer_membership"."assigned_at" IS 'Thời điểm hạng hiện tại bắt đầu được áp dụng.';
COMMENT ON COLUMN public."customer_membership"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."customer_membership"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."reward_rule" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "rule_name" text NOT NULL,
 "reward_type" text NOT NULL,
 "trigger_event" text NOT NULL,
 "reward_value" numeric(18,4) NOT NULL,
 "description" text NOT NULL,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."reward_rule" IS 'Lưu quy tắc cộng hoặc trừ Paw Points theo từng sự kiện như đăng ký, đặt lịch, mua hàng, đánh giá hoặc chương trình khuyến mãi';
COMMENT ON COLUMN public."reward_rule"."id" IS 'Mã định danh quy tắc';
COMMENT ON COLUMN public."reward_rule"."rule_name" IS 'Tên quy tắc thưởng';
COMMENT ON COLUMN public."reward_rule"."reward_type" IS 'Loại phần thưởng';
COMMENT ON COLUMN public."reward_rule"."trigger_event" IS 'Sự kiện làm phát sinh phần thưởng';
COMMENT ON COLUMN public."reward_rule"."reward_value" IS 'Giá trị phần thưởng';
COMMENT ON COLUMN public."reward_rule"."description" IS 'Mô tả cách áp dụng quy tắc';
COMMENT ON COLUMN public."reward_rule"."is_active" IS 'Quy tắc có đang áp dụng hay không';
COMMENT ON COLUMN public."reward_rule"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."reward_rule"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."paw_point_transaction" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "customer_id" uuid NOT NULL,
 "payment_id" uuid,
 "review_id" uuid,
 "reward_rule_id" uuid,
 "points" integer NOT NULL,
 "description" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "refund_transaction_id" uuid,
 "voucher_redemption_id" uuid,
 "customer_voucher_id" uuid,
 "idempotency_key" text NOT NULL UNIQUE,
 "sequence_no" bigint NOT NULL,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."paw_point_transaction" IS 'Lưu toàn bộ lịch sử cộng, trừ và quy đổi Paw Point';
COMMENT ON COLUMN public."paw_point_transaction"."id" IS 'Mã định danh giao dịch điểm';
COMMENT ON COLUMN public."paw_point_transaction"."customer_id" IS 'Khách hàng phát sinh giao dịch điểm';
COMMENT ON COLUMN public."paw_point_transaction"."payment_id" IS 'Giao dịch thanh toán liên quan';
COMMENT ON COLUMN public."paw_point_transaction"."review_id" IS 'Đánh giá làm phát sinh điểm';
COMMENT ON COLUMN public."paw_point_transaction"."reward_rule_id" IS 'Quy tắc tạo giao dịch điểm';
COMMENT ON COLUMN public."paw_point_transaction"."points" IS 'Số điểm cộng hoặc trừ';
COMMENT ON COLUMN public."paw_point_transaction"."description" IS 'Lý do phát sinh giao dịch điểm';
COMMENT ON COLUMN public."paw_point_transaction"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."paw_point_transaction"."refund_transaction_id" IS 'Lần hoàn tiền liên quan khi cần hoàn hoặc thu hồi điểm.';
COMMENT ON COLUMN public."paw_point_transaction"."voucher_redemption_id" IS 'Lượt dùng voucher liên quan nếu làm phát sinh điểm.';
COMMENT ON COLUMN public."paw_point_transaction"."customer_voucher_id" IS 'Lượt phát hành voucher nhận bằng đổi điểm, nếu có.';
COMMENT ON COLUMN public."paw_point_transaction"."idempotency_key" IS 'Khóa duy nhất ngăn một nghiệp vụ cộng hoặc trừ điểm nhiều lần.';
COMMENT ON COLUMN public."paw_point_transaction"."sequence_no" IS 'Thứ tự ghi sổ tăng dần trong phạm vi từng khách.';
CREATE TABLE public."voucher" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "voucher_code" text NOT NULL UNIQUE,
 "voucher_name" text NOT NULL,
 "discount_value" numeric(18,4) NOT NULL,
 "minimum_order_amount" numeric(18,4) NOT NULL DEFAULT 0,
 "required_points" integer NOT NULL DEFAULT 0,
 "start_date" date NOT NULL,
 "end_date" date NOT NULL,
 "is_active" boolean NOT NULL DEFAULT true,
 "type" text NOT NULL,
 "description" text,
 "applicable_for" text NOT NULL,
 "max_usage" integer,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."voucher" IS 'Lưu danh mục voucher có thể phát hành hoặc';
COMMENT ON COLUMN public."voucher"."id" IS 'Mã định danh voucher';
COMMENT ON COLUMN public."voucher"."voucher_code" IS 'Mã voucher khách hàng nhập khi sử dụng';
COMMENT ON COLUMN public."voucher"."voucher_name" IS 'Tên voucher';
COMMENT ON COLUMN public."voucher"."discount_value" IS 'Giá trị giảm giá';
COMMENT ON COLUMN public."voucher"."minimum_order_amount" IS 'Giá trị đơn tối thiểu để dùng voucher';
COMMENT ON COLUMN public."voucher"."required_points" IS 'Số Paw Points cần để đổi voucher';
COMMENT ON COLUMN public."voucher"."start_date" IS 'Ngày bắt đầu áp dụng voucher';
COMMENT ON COLUMN public."voucher"."end_date" IS 'Ngày kết thúc áp dụng voucher';
COMMENT ON COLUMN public."voucher"."is_active" IS 'Voucher có đang được kích hoạt hay không';
COMMENT ON COLUMN public."voucher"."type" IS 'Cách tính mức giảm';
COMMENT ON COLUMN public."voucher"."description" IS 'Điều kiện hoặc nội dung voucher';
COMMENT ON COLUMN public."voucher"."applicable_for" IS 'Đối tượng được áp dụng voucher';
COMMENT ON COLUMN public."voucher"."max_usage" IS 'Số lần voucher được phép sử dụng';
COMMENT ON COLUMN public."voucher"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."voucher"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."customer_voucher" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "customer_id" uuid NOT NULL,
 "voucher_id" uuid NOT NULL,
 "acquired_method" text NOT NULL,
 "voucher_status" text NOT NULL DEFAULT 'available',
 "acquired_at" timestamptz NOT NULL DEFAULT now(),
 "expired_at" timestamptz,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."customer_voucher" IS 'Lưu danh sách voucher mà khách hàng đang sở hữu hoặc đã sử dụng';
COMMENT ON COLUMN public."customer_voucher"."id" IS 'Mã định danh bản ghi';
COMMENT ON COLUMN public."customer_voucher"."customer_id" IS 'Khách hàng sở hữu voucher';
COMMENT ON COLUMN public."customer_voucher"."voucher_id" IS 'Voucher được khách hàng nhận';
COMMENT ON COLUMN public."customer_voucher"."acquired_method" IS 'Cách khách hàng nhận voucher';
COMMENT ON COLUMN public."customer_voucher"."voucher_status" IS 'Tình trạng sử dụng voucher';
COMMENT ON COLUMN public."customer_voucher"."acquired_at" IS 'Thời điểm khách hàng nhận voucher';
COMMENT ON COLUMN public."customer_voucher"."expired_at" IS 'Thời điểm voucher hết hạn';
CREATE TABLE public."voucher_redemption" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "customer_voucher_id" uuid,
 "voucher_id" uuid NOT NULL,
 "order_id" uuid,
 "appointment_id" uuid,
 "discount_amount_snapshot" numeric(18,4) NOT NULL DEFAULT 0,
 "status" text NOT NULL DEFAULT 'applied',
 "redeemed_at" timestamptz NOT NULL DEFAULT now(),
 "reversed_at" timestamptz,
 "idempotency_key" text NOT NULL UNIQUE,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."voucher_redemption" IS 'Lưu từng lượt áp dụng voucher vào đơn hoặc lịch, giữ mức giảm đã chốt.';
COMMENT ON COLUMN public."voucher_redemption"."id" IS 'Mã lượt sử dụng voucher.';
COMMENT ON COLUMN public."voucher_redemption"."customer_voucher_id" IS 'Lượt phát hành cá nhân được sử dụng; có thể NULL cho mã công khai.';
COMMENT ON COLUMN public."voucher_redemption"."voucher_id" IS 'Mẫu voucher áp dụng; với lượt cá nhân phải khớp mẫu đã phát hành.';
COMMENT ON COLUMN public."voucher_redemption"."order_id" IS 'Đơn được giảm; NULL khi áp dụng cho lịch hẹn.';
COMMENT ON COLUMN public."voucher_redemption"."appointment_id" IS 'Lịch được giảm; NULL khi áp dụng cho đơn hàng.';
COMMENT ON COLUMN public."voucher_redemption"."discount_amount_snapshot" IS 'Số tiền thực giảm đã chốt.';
COMMENT ON COLUMN public."voucher_redemption"."status" IS 'Trạng thái áp dụng hoặc đã đảo/hủy lượt dùng.';
COMMENT ON COLUMN public."voucher_redemption"."redeemed_at" IS 'Thời điểm áp dụng.';
COMMENT ON COLUMN public."voucher_redemption"."reversed_at" IS 'Thời điểm đảo lượt dùng khi có.';
COMMENT ON COLUMN public."voucher_redemption"."idempotency_key" IS 'Khóa duy nhất chống áp dụng lặp.';
COMMENT ON COLUMN public."voucher_redemption"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."pet_species" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "species_name" text NOT NULL UNIQUE,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."pet_species" IS 'Danh mục loài thú cưng.';
COMMENT ON COLUMN public."pet_species"."id" IS 'Mã loài thú cưng.';
COMMENT ON COLUMN public."pet_species"."species_name" IS 'Tên loài, duy nhất.';
COMMENT ON COLUMN public."pet_species"."is_active" IS 'Loài còn được sử dụng trong danh mục hay không.';
COMMENT ON COLUMN public."pet_species"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."pet_species"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."pet_breed" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "species_id" uuid NOT NULL,
 "breed_name" text NOT NULL,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."pet_breed" IS 'Danh mục giống thuộc từng loài thú cưng.';
COMMENT ON COLUMN public."pet_breed"."id" IS 'Mã giống thú cưng.';
COMMENT ON COLUMN public."pet_breed"."species_id" IS 'Loài mà giống thuộc về.';
COMMENT ON COLUMN public."pet_breed"."breed_name" IS 'Tên giống, duy nhất trong cùng loài.';
COMMENT ON COLUMN public."pet_breed"."is_active" IS 'Giống còn được dùng trong danh mục hay không.';
COMMENT ON COLUMN public."pet_breed"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."pet_breed"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."pet_profile" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "customer_id" uuid NOT NULL,
 "pet_code" text NOT NULL UNIQUE,
 "pet_name" text NOT NULL,
 "avatar_url" text,
 "gender" text,
 "date_of_birth" date,
 "color" text,
 "routine" text,
 "allergy" text,
 "status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "breed_id" uuid NOT NULL,
 "safety_note" text,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."pet_profile" IS 'Lưu hồ sơ định danh Pet ID, tên thú cưng, giống loài, giới tính, ngày sinh và trạng thái hoạt động';
COMMENT ON COLUMN public."pet_profile"."id" IS 'Mã định danh hồ sơ thú cưng';
COMMENT ON COLUMN public."pet_profile"."customer_id" IS 'Chủ sở hữu thú cưng';
COMMENT ON COLUMN public."pet_profile"."pet_code" IS 'Mã Pet ID của thú cưng';
COMMENT ON COLUMN public."pet_profile"."pet_name" IS 'Tên thú cưng';
COMMENT ON COLUMN public."pet_profile"."avatar_url" IS 'Ảnh đại diện của thú cưng';
COMMENT ON COLUMN public."pet_profile"."gender" IS 'Giới tính thú cưng';
COMMENT ON COLUMN public."pet_profile"."date_of_birth" IS 'Ngày sinh thú cưng';
COMMENT ON COLUMN public."pet_profile"."color" IS 'Màu lông thú cưng';
COMMENT ON COLUMN public."pet_profile"."routine" IS 'Thói quen và sở thích của thú cưng';
COMMENT ON COLUMN public."pet_profile"."allergy" IS 'Thông tin dị ứng cần lưu ý khi chăm sóc';
COMMENT ON COLUMN public."pet_profile"."status" IS 'Trạng thái hồ sơ thú cưng';
COMMENT ON COLUMN public."pet_profile"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."pet_profile"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."pet_profile"."breed_id" IS 'Giống thuộc loài đã chọn; từ giống suy ra loài.';
COMMENT ON COLUMN public."pet_profile"."safety_note" IS 'Ghi chú an toàn tự do khi tiếp xúc và chăm sóc thú cưng.';
CREATE TABLE public."pet_weight_history" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "pet_id" uuid NOT NULL,
 "weight" numeric(18,4) NOT NULL,
 "measured_at" timestamptz NOT NULL DEFAULT now(),
 "recorded_by" uuid,
 "note" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."pet_weight_history" IS 'Lưu lịch sử cân đo trọng lượng định kỳ của thú cưng phục vụ theo dõi sức khỏe và điều chỉnh dịch vụ';
COMMENT ON COLUMN public."pet_weight_history"."id" IS 'Mã định danh duy nhất của lượt cân đo.';
COMMENT ON COLUMN public."pet_weight_history"."pet_id" IS 'Bé cưng được cân đo.';
COMMENT ON COLUMN public."pet_weight_history"."weight" IS 'Trọng lượng ghi nhận (kg).';
COMMENT ON COLUMN public."pet_weight_history"."measured_at" IS 'Thời điểm thực hiện cân đo.';
COMMENT ON COLUMN public."pet_weight_history"."recorded_by" IS 'Nhân viên ghi nhận nếu đã định danh.';
COMMENT ON COLUMN public."pet_weight_history"."note" IS 'Ghi chú của lần cân.';
COMMENT ON COLUMN public."pet_weight_history"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."staff_level" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "level_code" text NOT NULL UNIQUE,
 "level_name" text NOT NULL,
 "rank_order" integer NOT NULL,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."staff_level" IS 'Danh mục cấp độ chuyên môn của kỹ thuật viên.';
COMMENT ON COLUMN public."staff_level"."id" IS 'Mã cấp độ chuyên môn.';
COMMENT ON COLUMN public."staff_level"."level_code" IS 'Mã cấp độ, duy nhất.';
COMMENT ON COLUMN public."staff_level"."level_name" IS 'Tên cấp độ hiển thị.';
COMMENT ON COLUMN public."staff_level"."rank_order" IS 'Thứ tự cấp độ dùng đối chiếu yêu cầu dịch vụ.';
COMMENT ON COLUMN public."staff_level"."is_active" IS 'Cấp độ còn được áp dụng hay không.';
COMMENT ON COLUMN public."staff_level"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."staff_level"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."service_category" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "category_code" text NOT NULL UNIQUE,
 "category_name" text NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."service_category" IS 'Danh mục nhóm dịch vụ chăm sóc, lưu trú và đưa đón.';
COMMENT ON COLUMN public."service_category"."id" IS 'Mã nhóm dịch vụ.';
COMMENT ON COLUMN public."service_category"."category_code" IS 'Mã nhóm nghiệp vụ, duy nhất.';
COMMENT ON COLUMN public."service_category"."category_name" IS 'Tên nhóm dịch vụ.';
COMMENT ON COLUMN public."service_category"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."service_category"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."service" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "service_code" text NOT NULL UNIQUE,
 "service_name" text NOT NULL,
 "description" text,
 "estimated_duration" integer NOT NULL,
 "status" text NOT NULL DEFAULT 'active',
 "commission_rate" numeric(18,4) DEFAULT 0,
 "benefits" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "category_id" uuid NOT NULL,
 "staff_level_required_id" uuid,
 "amenities" text,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."service" IS 'Lưu danh mục các dịch vụ thuộc các nhóm Grooming & Spa, Pet Hotel và Pet Taxi';
COMMENT ON COLUMN public."service"."id" IS 'Mã định danh dịch vụ';
COMMENT ON COLUMN public."service"."service_code" IS 'Mã dịch vụ';
COMMENT ON COLUMN public."service"."service_name" IS 'Tên dịch vụ';
COMMENT ON COLUMN public."service"."description" IS 'Mô tả dịch vụ';
COMMENT ON COLUMN public."service"."estimated_duration" IS 'Thời gian thực hiện dự kiến, tính bằng phút';
COMMENT ON COLUMN public."service"."status" IS 'Trạng thái cung cấp dịch vụ';
COMMENT ON COLUMN public."service"."commission_rate" IS 'Tỷ lệ hoa hồng cấu hình cho dịch vụ; mức áp dụng lịch sử cần chốt theo ca.';
COMMENT ON COLUMN public."service"."benefits" IS 'Lợi ích của dịch vụ';
COMMENT ON COLUMN public."service"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."service"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."service"."category_id" IS 'Nhóm dịch vụ mà gói thuộc về.';
COMMENT ON COLUMN public."service"."staff_level_required_id" IS 'Cấp độ chuyên môn tối thiểu cần để thực hiện gói, nếu có.';
COMMENT ON COLUMN public."service"."amenities" IS 'Đoạn mô tả tiện ích đi kèm dịch vụ; có thể để trống và không tham chiếu danh mục riêng.';
CREATE TABLE public."service_image" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "service_id" uuid NOT NULL,
 "image_url" text NOT NULL,
 "display_order" integer NOT NULL DEFAULT 0,
 "is_thumbnail" boolean NOT NULL DEFAULT false,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."service_image" IS 'Lưu ảnh của dịch vụ và xác định ảnh đại diện từ cùng một nguồn.';
COMMENT ON COLUMN public."service_image"."id" IS 'Mã ảnh dịch vụ.';
COMMENT ON COLUMN public."service_image"."service_id" IS 'Dịch vụ sở hữu ảnh.';
COMMENT ON COLUMN public."service_image"."image_url" IS 'Đường dẫn hoặc khóa lưu ảnh.';
COMMENT ON COLUMN public."service_image"."display_order" IS 'Thứ tự hiển thị ảnh.';
COMMENT ON COLUMN public."service_image"."is_thumbnail" IS 'Đánh dấu ảnh đại diện, tối đa một ảnh cho mỗi dịch vụ.';
COMMENT ON COLUMN public."service_image"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."service_image"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."service_supported_species" (
 "service_id" uuid NOT NULL,
 "species_id" uuid NOT NULL,
 PRIMARY KEY ("service_id", "species_id")
);
COMMENT ON TABLE public."service_supported_species" IS 'Liên kết dịch vụ với các loài được phục vụ.';
COMMENT ON COLUMN public."service_supported_species"."service_id" IS 'Dịch vụ hỗ trợ loài; cùng species_id tạo khóa chính.';
COMMENT ON COLUMN public."service_supported_species"."species_id" IS 'Loài được phục vụ; cùng service_id tạo khóa chính.';
CREATE TABLE public."service_addon" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "service_id" uuid NOT NULL,
 "addon_name" text NOT NULL,
 "description" text,
 "price" numeric(18,4) NOT NULL,
 "estimated_duration" integer NOT NULL,
 "is_required" boolean NOT NULL DEFAULT false,
 "status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."service_addon" IS 'Lưu danh sách các dịch vụ bổ sung đi kèm dịch vụ chính (Spa, Hotel, Taxi), bao gồm giá, thời lượng và trạng thái áp dụng.';
COMMENT ON COLUMN public."service_addon"."id" IS 'Mã định danh dịch vụ bổ sung';
COMMENT ON COLUMN public."service_addon"."service_id" IS 'Dịch vụ chính áp dụng addon';
COMMENT ON COLUMN public."service_addon"."addon_name" IS 'Tên dịch vụ bổ sung';
COMMENT ON COLUMN public."service_addon"."description" IS 'Mô tả dịch vụ bổ sung';
COMMENT ON COLUMN public."service_addon"."price" IS 'Giá dịch vụ bổ sung';
COMMENT ON COLUMN public."service_addon"."estimated_duration" IS 'Thời gian thực hiện dự kiến, tính bằng phút';
COMMENT ON COLUMN public."service_addon"."is_required" IS 'Cho biết addon có bắt buộc hay không';
COMMENT ON COLUMN public."service_addon"."status" IS 'Trạng thái cung cấp addon';
COMMENT ON COLUMN public."service_addon"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."service_addon"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."care_action" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "action_name" text NOT NULL,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."care_action" IS 'Lưu danh mục các mốc chăm sóc như Tắm,';
COMMENT ON COLUMN public."care_action"."id" IS 'Mã định danh hoạt động chăm sóc';
COMMENT ON COLUMN public."care_action"."action_name" IS 'Tên mốc chăm sóc';
COMMENT ON COLUMN public."care_action"."is_active" IS 'Mốc chăm sóc có đang được sử dụng hay không';
COMMENT ON COLUMN public."care_action"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."care_action"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."service_care_action" (
 "service_id" uuid NOT NULL,
 "care_action_id" uuid NOT NULL,
 "display_order" integer NOT NULL DEFAULT 0,
 "estimated_duration" integer NOT NULL,
 PRIMARY KEY ("service_id", "care_action_id")
);
COMMENT ON TABLE public."service_care_action" IS 'Checklist mẫu của từng dịch vụ, độc lập nhật ký thực hiện.';
COMMENT ON COLUMN public."service_care_action"."service_id" IS 'Dịch vụ có bước chăm sóc; cùng care_action_id tạo khóa chính.';
COMMENT ON COLUMN public."service_care_action"."care_action_id" IS 'Loại thao tác trong checklist; cùng service_id tạo khóa chính.';
COMMENT ON COLUMN public."service_care_action"."display_order" IS 'Thứ tự thực hiện thao tác trong dịch vụ.';
COMMENT ON COLUMN public."service_care_action"."estimated_duration" IS 'Thời lượng dự kiến của bước, tính bằng phút.';
CREATE TABLE public."service_price_matrix" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "service_id" uuid NOT NULL,
 "weight_from" numeric(18,4) NOT NULL,
 "weight_to" numeric(18,4),
 "unit_price" numeric(18,4) NOT NULL,
 "effective_from" timestamptz NOT NULL,
 "effective_to" timestamptz,
 "status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."service_price_matrix" IS 'Lưu bảng giá của từng dịch vụ theo loài thú cưng, cân nặng hoặc điều kiện áp dụng';
COMMENT ON COLUMN public."service_price_matrix"."id" IS 'Mã định danh bảng giá';
COMMENT ON COLUMN public."service_price_matrix"."service_id" IS 'Dịch vụ áp dụng bảng giá';
COMMENT ON COLUMN public."service_price_matrix"."weight_from" IS 'Mức cân nặng tối thiểu của khoảng giá';
COMMENT ON COLUMN public."service_price_matrix"."weight_to" IS 'Mức cân nặng tối đa của khoảng giá';
COMMENT ON COLUMN public."service_price_matrix"."unit_price" IS 'Giá dịch vụ theo khoảng điều kiện';
COMMENT ON COLUMN public."service_price_matrix"."effective_from" IS 'Thời điểm bắt đầu áp dụng giá';
COMMENT ON COLUMN public."service_price_matrix"."effective_to" IS 'Thời điểm kết thúc áp dụng giá';
COMMENT ON COLUMN public."service_price_matrix"."status" IS 'Trạng thái bảng giá';
COMMENT ON COLUMN public."service_price_matrix"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."service_price_matrix"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."taxi_price_rule" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "distance_from" numeric(18,4) NOT NULL,
 "distance_to" numeric(18,4),
 "weight_from" numeric(18,4) NOT NULL,
 "weight_to" numeric(18,4),
 "base_price" numeric(18,4) NOT NULL,
 "surcharge" numeric(18,4) NOT NULL DEFAULT 0,
 "effective_from" timestamptz NOT NULL,
 "effective_to" timestamptz,
 "status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."taxi_price_rule" IS 'Lưu các quy tắc tính giá dịch vụ Pet Taxi theo khoảng cách, cân nặng và thời gian hiệu lực của bảng giá.';
COMMENT ON COLUMN public."taxi_price_rule"."id" IS 'Mã định danh quy tắc giá';
COMMENT ON COLUMN public."taxi_price_rule"."distance_from" IS 'Mức khoảng cách tối thiểu của quy tắc';
COMMENT ON COLUMN public."taxi_price_rule"."distance_to" IS 'Mức khoảng cách tối đa của quy tắc';
COMMENT ON COLUMN public."taxi_price_rule"."weight_from" IS 'Mức cân nặng tối thiểu của quy tắc';
COMMENT ON COLUMN public."taxi_price_rule"."weight_to" IS 'Mức cân nặng tối đa của quy tắc';
COMMENT ON COLUMN public."taxi_price_rule"."base_price" IS 'Giá cơ bản của chuyến taxi';
COMMENT ON COLUMN public."taxi_price_rule"."surcharge" IS 'Phụ phí của quy tắc giá';
COMMENT ON COLUMN public."taxi_price_rule"."effective_from" IS 'Thời điểm bắt đầu áp dụng quy tắc';
COMMENT ON COLUMN public."taxi_price_rule"."effective_to" IS 'Thời điểm kết thúc áp dụng quy tắc';
COMMENT ON COLUMN public."taxi_price_rule"."status" IS 'Trạng thái quy tắc giá';
COMMENT ON COLUMN public."taxi_price_rule"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."taxi_price_rule"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."hotel_room_type" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "room_type" text NOT NULL,
 "capacity" integer NOT NULL,
 "daily_price" numeric(18,4) NOT NULL,
 "description" text,
 "amenities" text,
 "status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."hotel_room_type" IS 'Loại phòng khách sạn dành cho thú cưng, lưu thông tin cấu hình và mức giá dùng chung cho các phòng cùng loại.';
COMMENT ON COLUMN public."hotel_room_type"."id" IS 'Mã định danh loại phòng';
COMMENT ON COLUMN public."hotel_room_type"."room_type" IS 'Tên loại phòng';
COMMENT ON COLUMN public."hotel_room_type"."capacity" IS 'Sức chứa tối đa của loại phòng';
COMMENT ON COLUMN public."hotel_room_type"."daily_price" IS 'Giá thuê phòng theo ngày';
COMMENT ON COLUMN public."hotel_room_type"."description" IS 'Mô tả loại phòng';
COMMENT ON COLUMN public."hotel_room_type"."amenities" IS 'Đoạn mô tả tiện ích của loại phòng, chỉ dùng giới thiệu và hiển thị.';
COMMENT ON COLUMN public."hotel_room_type"."status" IS 'Trạng thái cung cấp loại phòng';
COMMENT ON COLUMN public."hotel_room_type"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."hotel_room_type"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."hotel_room" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "room_number" text NOT NULL UNIQUE,
 "room_type_id" uuid NOT NULL,
 "status" text NOT NULL DEFAULT 'active',
 "description" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."hotel_room" IS 'Phòng vật lý thực tế tại cơ sở lưu trú, thuộc một loại phòng cụ thể và được quản lý theo số phòng và trạng thái sử dụng.';
COMMENT ON COLUMN public."hotel_room"."id" IS 'Mã định danh phòng';
COMMENT ON COLUMN public."hotel_room"."room_number" IS 'Số hoặc mã phòng thực tế';
COMMENT ON COLUMN public."hotel_room"."room_type_id" IS 'Loại phòng của phòng thực tế';
COMMENT ON COLUMN public."hotel_room"."status" IS 'Trạng thái sử dụng của phòng';
COMMENT ON COLUMN public."hotel_room"."description" IS 'Ghi chú riêng của phòng';
COMMENT ON COLUMN public."hotel_room"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."hotel_room"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."appointment" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "appointment_code" text NOT NULL UNIQUE,
 "customer_id" uuid NOT NULL,
 "pet_id" uuid NOT NULL,
 "staff_id" uuid,
 "check_in_time" timestamptz,
 "check_out_time" timestamptz,
 "note" text,
 "change_count" integer NOT NULL DEFAULT 0,
 "appointment_status" text NOT NULL DEFAULT 'pending',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "scheduled_start_at" timestamptz NOT NULL,
 "scheduled_end_at" timestamptz NOT NULL,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."appointment" IS 'Lưu phiếu đặt lịch dịch vụ của khách hàng cho từng thú cưng';
COMMENT ON COLUMN public."appointment"."id" IS 'Mã định danh lịch hẹn';
COMMENT ON COLUMN public."appointment"."appointment_code" IS 'Mã lịch hẹn hiển thị';
COMMENT ON COLUMN public."appointment"."customer_id" IS 'Khách hàng đặt lịch';
COMMENT ON COLUMN public."appointment"."pet_id" IS 'Thú cưng sử dụng dịch vụ';
COMMENT ON COLUMN public."appointment"."staff_id" IS 'Nhân viên được phân công';
COMMENT ON COLUMN public."appointment"."check_in_time" IS 'Thời điểm khách đưa thú cưng đến';
COMMENT ON COLUMN public."appointment"."check_out_time" IS 'Thời điểm hoàn tất bàn giao thú cưng';
COMMENT ON COLUMN public."appointment"."note" IS 'Ghi chú của khách hàng khi đặt lịch';
COMMENT ON COLUMN public."appointment"."change_count" IS 'Số lần khách đổi lịch';
COMMENT ON COLUMN public."appointment"."appointment_status" IS 'Trạng thái lịch hẹn';
COMMENT ON COLUMN public."appointment"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."appointment"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."appointment"."scheduled_start_at" IS 'Thời điểm dự kiến bắt đầu có múi giờ.';
COMMENT ON COLUMN public."appointment"."scheduled_end_at" IS 'Thời điểm dự kiến kết thúc có múi giờ.';
CREATE TABLE public."appointment_item" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "appointment_id" uuid NOT NULL,
 "service_id" uuid,
 "service_addon_id" uuid,
 "is_primary" boolean NOT NULL DEFAULT false,
 "name_snapshot" text NOT NULL,
 "quantity" integer NOT NULL,
 "unit_price" numeric(18,4) NOT NULL,
 "discount_amount" numeric(18,4) NOT NULL DEFAULT 0,
 "duration_minutes" integer NOT NULL,
 "weight_snapshot" numeric(18,4),
 "staff_id" uuid,
 "status" text NOT NULL DEFAULT 'pending',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."appointment_item" IS 'Dòng dịch vụ hoặc addon thực tế của một ca, giữ nội dung giá đã chốt.';
COMMENT ON COLUMN public."appointment_item"."id" IS 'Mã dòng dịch vụ.';
COMMENT ON COLUMN public."appointment_item"."appointment_id" IS 'Ca dịch vụ chứa dòng.';
COMMENT ON COLUMN public."appointment_item"."service_id" IS 'Gói dịch vụ được chọn; NULL nếu dòng là addon.';
COMMENT ON COLUMN public."appointment_item"."service_addon_id" IS 'Addon được chọn; NULL nếu dòng là gói dịch vụ.';
COMMENT ON COLUMN public."appointment_item"."is_primary" IS 'Đánh dấu gói chính của ca, tối đa một dòng chính.';
COMMENT ON COLUMN public."appointment_item"."name_snapshot" IS 'Tên gói hoặc addon tại thời điểm ghi nhận.';
COMMENT ON COLUMN public."appointment_item"."quantity" IS 'Số lượng áp dụng, lớn hơn 0.';
COMMENT ON COLUMN public."appointment_item"."unit_price" IS 'Đơn giá tại thời điểm chốt.';
COMMENT ON COLUMN public."appointment_item"."discount_amount" IS 'Tổng giảm giá phân bổ cho dòng tại thời điểm chốt.';
COMMENT ON COLUMN public."appointment_item"."duration_minutes" IS 'Thời lượng đã chốt cho dòng dịch vụ.';
COMMENT ON COLUMN public."appointment_item"."weight_snapshot" IS 'Cân nặng dùng tính giá tại thời điểm chốt, nếu áp dụng.';
COMMENT ON COLUMN public."appointment_item"."staff_id" IS 'Kỹ thuật viên thực hiện dòng; có thể khác người phụ trách ca.';
COMMENT ON COLUMN public."appointment_item"."status" IS 'Trạng thái áp dụng, hoàn tất hoặc hủy dòng.';
COMMENT ON COLUMN public."appointment_item"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."appointment_item"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."appointment_record" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "appointment_id" uuid NOT NULL,
 "record_type" text NOT NULL,
 "schema_version" integer NOT NULL,
 "revision_no" integer NOT NULL DEFAULT 1,
 "recorded_by" uuid NOT NULL,
 "recorded_at" timestamptz NOT NULL DEFAULT now(),
 "condition_note" text NOT NULL,
 "safety_note_snapshot" text,
 "allergy_note_snapshot" text,
 "customer_confirmation_status" text NOT NULL DEFAULT 'pending',
 "confirmed_at" timestamptz,
 "note" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."appointment_record" IS 'Biên bản tiếp nhận hoặc bàn giao có phiên bản, giữ thông tin tại thời điểm lập.';
COMMENT ON COLUMN public."appointment_record"."id" IS 'Mã biên bản.';
COMMENT ON COLUMN public."appointment_record"."appointment_id" IS 'Ca được lập biên bản.';
COMMENT ON COLUMN public."appointment_record"."record_type" IS 'Loại tiếp nhận hoặc bàn giao.';
COMMENT ON COLUMN public."appointment_record"."schema_version" IS 'Phiên bản cấu trúc biểu mẫu.';
COMMENT ON COLUMN public."appointment_record"."revision_no" IS 'Số lần sửa biên bản; bản đã ký không bị ghi đè.';
COMMENT ON COLUMN public."appointment_record"."recorded_by" IS 'Nhân viên lập biên bản.';
COMMENT ON COLUMN public."appointment_record"."recorded_at" IS 'Thời điểm lập biên bản.';
COMMENT ON COLUMN public."appointment_record"."condition_note" IS 'Mô tả tình trạng khi tiếp nhận hoặc bàn giao.';
COMMENT ON COLUMN public."appointment_record"."safety_note_snapshot" IS 'Cảnh báo an toàn được ghi nhận lúc lập.';
COMMENT ON COLUMN public."appointment_record"."allergy_note_snapshot" IS 'Thông tin dị ứng được ghi nhận lúc lập.';
COMMENT ON COLUMN public."appointment_record"."customer_confirmation_status" IS 'Trạng thái xác nhận nội dung của khách.';
COMMENT ON COLUMN public."appointment_record"."confirmed_at" IS 'Thời điểm khách xác nhận, nếu có.';
COMMENT ON COLUMN public."appointment_record"."note" IS 'Nội dung bổ sung của biên bản.';
COMMENT ON COLUMN public."appointment_record"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."appointment_adjustment" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "appointment_id" uuid NOT NULL,
 "adjustment_type" text NOT NULL,
 "duration_delta_minutes" integer NOT NULL DEFAULT 0,
 "amount_delta" numeric(18,4) NOT NULL DEFAULT 0,
 "reason" text NOT NULL,
 "proposed_by" uuid NOT NULL,
 "approved_by" uuid,
 "approval_status" text NOT NULL DEFAULT 'pending',
 "customer_consent_status" text NOT NULL DEFAULT 'pending',
 "approved_at" timestamptz,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."appointment_adjustment" IS 'Ghi nhận phụ phí, giảm trừ, gia hạn hoặc sự cố cần duyệt.';
COMMENT ON COLUMN public."appointment_adjustment"."id" IS 'Mã điều chỉnh ca.';
COMMENT ON COLUMN public."appointment_adjustment"."appointment_id" IS 'Ca chịu điều chỉnh.';
COMMENT ON COLUMN public."appointment_adjustment"."adjustment_type" IS 'Loại gia hạn, phụ phí, giảm trừ hoặc sự cố.';
COMMENT ON COLUMN public."appointment_adjustment"."duration_delta_minutes" IS 'Số phút tăng hoặc giảm có dấu.';
COMMENT ON COLUMN public."appointment_adjustment"."amount_delta" IS 'Số tiền tăng hoặc giảm có dấu.';
COMMENT ON COLUMN public."appointment_adjustment"."reason" IS 'Lý do điều chỉnh.';
COMMENT ON COLUMN public."appointment_adjustment"."proposed_by" IS 'Nhân viên đề xuất.';
COMMENT ON COLUMN public."appointment_adjustment"."approved_by" IS 'Nhân viên phê duyệt; có thể NULL khi chưa duyệt.';
COMMENT ON COLUMN public."appointment_adjustment"."approval_status" IS 'Trạng thái xét duyệt điều chỉnh.';
COMMENT ON COLUMN public."appointment_adjustment"."customer_consent_status" IS 'Trạng thái đồng ý của khách khi nghiệp vụ yêu cầu.';
COMMENT ON COLUMN public."appointment_adjustment"."approved_at" IS 'Thời điểm duyệt, có thể NULL.';
COMMENT ON COLUMN public."appointment_adjustment"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."hotel_booking" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "booking_code" text NOT NULL UNIQUE,
 "room_id" uuid NOT NULL,
 "appointment_id" uuid NOT NULL UNIQUE,
 "check_in_at" timestamptz NOT NULL,
 "check_out_at" timestamptz NOT NULL,
 "status" text NOT NULL DEFAULT 'pending',
 "special_diet_notes" text,
 "care_notes" text,
 "daily_price" numeric(18,4) NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."hotel_booking" IS 'Quản lý lịch đặt phòng lưu trú khách sạn thú cưng Pet Hotel';
COMMENT ON COLUMN public."hotel_booking"."id" IS 'Mã định danh duy nhất của đơn lưu trú khách sạn.';
COMMENT ON COLUMN public."hotel_booking"."booking_code" IS 'Mã đặt phòng hiển thị cho khách hàng.';
COMMENT ON COLUMN public."hotel_booking"."room_id" IS 'Phòng hoặc chuồng lưu trú được chỉ định.';
COMMENT ON COLUMN public."hotel_booking"."appointment_id" IS 'Lịch hẹn dịch vụ liên kết với đơn lưu trú.';
COMMENT ON COLUMN public."hotel_booking"."check_in_at" IS 'Thời điểm bắt đầu lưu trú có múi giờ.';
COMMENT ON COLUMN public."hotel_booking"."check_out_at" IS 'Thời điểm kết thúc lưu trú dự kiến có múi giờ.';
COMMENT ON COLUMN public."hotel_booking"."status" IS 'Trạng thái lưu trú (chờ nhận, đang ở, đã trả, đã hủy).';
COMMENT ON COLUMN public."hotel_booking"."special_diet_notes" IS 'Ghi chú chế độ dinh dưỡng đặc biệt cho bé.';
COMMENT ON COLUMN public."hotel_booking"."care_notes" IS 'Lưu ý sinh hoạt, nghỉ ngơi và chăm sóc trong thời gian lưu trú.';
COMMENT ON COLUMN public."hotel_booking"."daily_price" IS 'Đơn giá lưu trú mỗi ngày đêm.';
COMMENT ON COLUMN public."hotel_booking"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."hotel_booking"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."taxi_trip" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "appointment_id" uuid NOT NULL UNIQUE,
 "driver_staff_id" uuid,
 "pickup_address" text NOT NULL,
 "dropoff_address" text NOT NULL,
 "distance_km" numeric(18,4) NOT NULL,
 "trip_type" text NOT NULL,
 "outbound_at" timestamptz,
 "return_at" timestamptz,
 "taxi_price_rule_id" uuid,
 "quoted_amount" numeric(18,4) NOT NULL,
 "status" text NOT NULL DEFAULT 'pending',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."taxi_trip" IS 'Thông tin chuyến đưa đón gắn duy nhất với một lịch dịch vụ.';
COMMENT ON COLUMN public."taxi_trip"."id" IS 'Mã chuyến đưa đón.';
COMMENT ON COLUMN public."taxi_trip"."appointment_id" IS 'Lịch dịch vụ liên quan, duy nhất cho mỗi chuyến theo bản 1.';
COMMENT ON COLUMN public."taxi_trip"."driver_staff_id" IS 'Nhân viên phụ trách đưa đón.';
COMMENT ON COLUMN public."taxi_trip"."pickup_address" IS 'Địa chỉ đón được chốt khi đặt.';
COMMENT ON COLUMN public."taxi_trip"."dropoff_address" IS 'Địa chỉ trả được chốt khi đặt.';
COMMENT ON COLUMN public."taxi_trip"."distance_km" IS 'Quãng đường dùng tính giá, lớn hơn 0.';
COMMENT ON COLUMN public."taxi_trip"."trip_type" IS 'Loại một chiều hoặc khứ hồi.';
COMMENT ON COLUMN public."taxi_trip"."outbound_at" IS 'Thời điểm dự kiến đi.';
COMMENT ON COLUMN public."taxi_trip"."return_at" IS 'Thời điểm dự kiến về khi là chuyến khứ hồi.';
COMMENT ON COLUMN public."taxi_trip"."taxi_price_rule_id" IS 'Quy tắc giá dùng tham chiếu khi báo giá.';
COMMENT ON COLUMN public."taxi_trip"."quoted_amount" IS 'Giá chuyến đã báo và chốt.';
COMMENT ON COLUMN public."taxi_trip"."status" IS 'Trạng thái điều phối và thực hiện chuyến.';
COMMENT ON COLUMN public."taxi_trip"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."taxi_trip"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."care_log" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "appointment_id" uuid NOT NULL,
 "care_action_id" uuid,
 "description" text,
 "observed_condition" text,
 "recorded_at" timestamptz NOT NULL DEFAULT now(),
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "recorded_by" uuid,
 "action_name_snapshot" text NOT NULL,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."care_log" IS 'Lưu toàn bộ timeline chăm sóc trong quá trình thực hiện dịch vụ';
COMMENT ON COLUMN public."care_log"."id" IS 'Mã định danh Care Log';
COMMENT ON COLUMN public."care_log"."appointment_id" IS 'Lịch hẹn phát sinh Care Log';
COMMENT ON COLUMN public."care_log"."care_action_id" IS 'Mốc chăm sóc được ghi nhận';
COMMENT ON COLUMN public."care_log"."description" IS 'Nội dung nhân viên ghi nhận';
COMMENT ON COLUMN public."care_log"."observed_condition" IS 'Tình trạng da, lông và hành vi quan sát được khi chăm sóc; không phải chẩn đoán y khoa.';
COMMENT ON COLUMN public."care_log"."recorded_at" IS 'Thời điểm ghi nhận Care Log';
COMMENT ON COLUMN public."care_log"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."care_log"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."care_log"."recorded_by" IS 'Nhân viên ghi nhận thao tác thực tế.';
COMMENT ON COLUMN public."care_log"."action_name_snapshot" IS 'Tên thao tác tại thời điểm thực hiện, không đổi theo checklist mẫu.';
CREATE TABLE public."care_log_media" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "care_log_id" uuid NOT NULL,
 "media_type" text NOT NULL,
 "media_url" text NOT NULL,
 "file_name" text NOT NULL,
 "file_size" bigint NOT NULL,
 "staff_id" uuid,
 "uploaded_at" timestamptz NOT NULL DEFAULT now(),
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."care_log_media" IS 'Lưu ảnh và video minh chứng được cập nhật vào Care Log';
COMMENT ON COLUMN public."care_log_media"."id" IS 'Mã định danh media';
COMMENT ON COLUMN public."care_log_media"."care_log_id" IS 'Care Log chứa media';
COMMENT ON COLUMN public."care_log_media"."media_type" IS 'Loại media';
COMMENT ON COLUMN public."care_log_media"."media_url" IS 'Đường dẫn file media';
COMMENT ON COLUMN public."care_log_media"."file_name" IS 'Tên file media';
COMMENT ON COLUMN public."care_log_media"."file_size" IS 'Dung lượng file tính bằng byte';
COMMENT ON COLUMN public."care_log_media"."staff_id" IS 'Nhân viên tải media lên';
COMMENT ON COLUMN public."care_log_media"."uploaded_at" IS 'Thời điểm tải media lên';
COMMENT ON COLUMN public."care_log_media"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."supplier" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "supplier_name" text NOT NULL,
 "contact_person" text,
 "phone_number" text,
 "email" text,
 "address" text,
 "status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."supplier" IS 'Lưu thông tin nhà cung cấp sản phẩm';
COMMENT ON COLUMN public."supplier"."id" IS 'Mã định danh nhà cung cấp trong PawPal.';
COMMENT ON COLUMN public."supplier"."supplier_name" IS 'Tên nhà cung cấp sản phẩm mà PawPal hợp tác.';
COMMENT ON COLUMN public."supplier"."contact_person" IS 'Người phụ trách liên hệ phía nhà cung cấp.';
COMMENT ON COLUMN public."supplier"."phone_number" IS 'Số điện thoại liên hệ chính với nhà cung cấp.';
COMMENT ON COLUMN public."supplier"."email" IS 'Email dùng để liên hệ hoặc nhận chứng từ từ nhà cung cấp.';
COMMENT ON COLUMN public."supplier"."address" IS 'Địa chỉ giao dịch hoặc nhận hàng của nhà cung cấp.';
COMMENT ON COLUMN public."supplier"."status" IS 'Trạng thái hợp tác hiện tại với nhà cung cấp.';
COMMENT ON COLUMN public."supplier"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."supplier"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."product_category" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "category_name" text NOT NULL,
 "description" text,
 "status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."product_category" IS 'Lưu danh mục nhóm sản phẩm';
COMMENT ON COLUMN public."product_category"."id" IS 'Mã định danh danh mục sản phẩm.';
COMMENT ON COLUMN public."product_category"."category_name" IS 'Tên danh mục sản phẩm hiển thị trong quản trị và website.';
COMMENT ON COLUMN public."product_category"."description" IS 'Mô tả phạm vi hoặc nội dung của danh mục.';
COMMENT ON COLUMN public."product_category"."status" IS 'Trạng thái sử dụng của danh mục.';
COMMENT ON COLUMN public."product_category"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."product_category"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."product" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "category_id" uuid NOT NULL,
 "product_name" text NOT NULL,
 "unit" text NOT NULL,
 "target_pet" text,
 "description" text,
 "slug" text NOT NULL UNIQUE,
 "status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "origin" text,
 "ingredients" text,
 "benefits" text,
 "usage_instructions" text,
 "specs" jsonb,
 "badge" text,
 "brand_name" text,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."product" IS 'Lưu danh mục sản phẩm kinh';
COMMENT ON COLUMN public."product"."id" IS 'Mã định danh sản phẩm gốc, dùng để gom các biến thể cùng một sản phẩm.';
COMMENT ON COLUMN public."product"."category_id" IS 'Nhóm sản phẩm mà sản phẩm thuộc về.';
COMMENT ON COLUMN public."product"."product_name" IS 'Tên sản phẩm hiển thị cho khách hàng.';
COMMENT ON COLUMN public."product"."unit" IS 'Đơn vị bán cơ bản của sản phẩm.';
COMMENT ON COLUMN public."product"."target_pet" IS 'Loài thú cưng mà sản phẩm hướng đến.';
COMMENT ON COLUMN public."product"."description" IS 'Mô tả sản phẩm, thành phần hoặc thông tin sử dụng.';
COMMENT ON COLUMN public."product"."slug" IS 'Đường dẫn định danh trang chi tiết sản phẩm.';
COMMENT ON COLUMN public."product"."status" IS 'Trạng thái kinh doanh của sản phẩm.';
COMMENT ON COLUMN public."product"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."product"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."product"."origin" IS 'Xuất xứ hoặc nơi sản xuất được công bố.';
COMMENT ON COLUMN public."product"."ingredients" IS 'Nội dung thành phần sản phẩm dạng mô tả.';
COMMENT ON COLUMN public."product"."benefits" IS 'Đoạn văn mô tả lợi ích sản phẩm.';
COMMENT ON COLUMN public."product"."usage_instructions" IS 'Hướng dẫn sử dụng sản phẩm.';
COMMENT ON COLUMN public."product"."specs" IS 'Thông số giới thiệu; thuộc tính biến thể phải lưu tại bảng biến thể.';
COMMENT ON COLUMN public."product"."badge" IS 'Nhãn giới thiệu sản phẩm, không thay thế trạng thái nghiệp vụ.';
COMMENT ON COLUMN public."product"."brand_name" IS 'Tên thương hiệu dạng text; không quản lý danh mục thương hiệu riêng.';
CREATE TABLE public."product_media" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "product_id" uuid NOT NULL,
 "image_url" text NOT NULL,
 "display_order" integer NOT NULL DEFAULT 0,
 "is_thumbnail" boolean NOT NULL DEFAULT false,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."product_media" IS 'Ảnh dùng chung của sản phẩm, độc lập ảnh riêng từng biến thể.';
COMMENT ON COLUMN public."product_media"."id" IS 'Mã ảnh sản phẩm.';
COMMENT ON COLUMN public."product_media"."product_id" IS 'Sản phẩm sở hữu ảnh.';
COMMENT ON COLUMN public."product_media"."image_url" IS 'Đường dẫn hoặc khóa lưu ảnh.';
COMMENT ON COLUMN public."product_media"."display_order" IS 'Thứ tự hiển thị.';
COMMENT ON COLUMN public."product_media"."is_thumbnail" IS 'Đánh dấu ảnh đại diện, tối đa một ảnh mỗi sản phẩm.';
COMMENT ON COLUMN public."product_media"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."product_media"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."variant_color" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "color_name" text NOT NULL,
 "hex_code" text NOT NULL,
 "display_order" integer NOT NULL DEFAULT 0,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."variant_color" IS 'Lưu định dạng màu sắc sản phẩm';
COMMENT ON COLUMN public."variant_color"."id" IS 'Mã định danh màu sắc.';
COMMENT ON COLUMN public."variant_color"."color_name" IS 'Tên màu hiển thị cho khách hàng.';
COMMENT ON COLUMN public."variant_color"."hex_code" IS 'Mã màu dùng để hiển thị swatch màu trên website.';
COMMENT ON COLUMN public."variant_color"."display_order" IS 'Thứ tự hiển thị màu trên giao diện.';
COMMENT ON COLUMN public."variant_color"."is_active" IS 'Cho biết màu còn được phép sử dụng cho biến thể mới hay không.';
COMMENT ON COLUMN public."variant_color"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."variant_color"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."variant_size" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "size_name" text NOT NULL,
 "display_order" integer NOT NULL DEFAULT 0,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."variant_size" IS 'Lưu định dạng kích thước sản phẩm';
COMMENT ON COLUMN public."variant_size"."id" IS 'Mã định danh kích thước/quy cách.';
COMMENT ON COLUMN public."variant_size"."size_name" IS 'Tên kích thước hoặc quy cách như S, M, L, 200g, 500g.';
COMMENT ON COLUMN public."variant_size"."display_order" IS 'Thứ tự hiển thị kích thước/quy cách trên giao diện.';
COMMENT ON COLUMN public."variant_size"."is_active" IS 'Cho biết kích thước/quy cách còn được phép sử dụng cho biến thể mới hay không.';
COMMENT ON COLUMN public."variant_size"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."variant_size"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."variant_flavor" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "flavor_name" text NOT NULL,
 "display_order" integer NOT NULL DEFAULT 0,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."variant_flavor" IS 'Lưu danh mục hương vị hoặc mùi hương dùng chung cho các biến thể sản phẩm.';
COMMENT ON COLUMN public."variant_flavor"."id" IS 'Mã định danh hương vị.';
COMMENT ON COLUMN public."variant_flavor"."flavor_name" IS 'Tên hương vị sản phẩm như gà, bò, cá hồi.';
COMMENT ON COLUMN public."variant_flavor"."display_order" IS 'Thứ tự hiển thị hương vị trên giao diện chọn biến thể.';
COMMENT ON COLUMN public."variant_flavor"."is_active" IS 'Cho biết hương vị còn được phép sử dụng cho biến thể mới hay không.';
COMMENT ON COLUMN public."variant_flavor"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."variant_flavor"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."product_variant" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "product_id" uuid NOT NULL,
 "color_id" uuid,
 "size_id" uuid,
 "flavor_id" uuid,
 "sku_variant" text NOT NULL UNIQUE,
 "cost_price" numeric(18,4) NOT NULL,
 "sale_price" numeric(18,4) NOT NULL,
 "compare_at_price" numeric(18,4),
 "weight" numeric(18,4),
 "barcode" text UNIQUE,
 "status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."product_variant" IS 'Lưu từng phiên bản cụ thể của một sản phẩm theo màu sắc, kích thước, kiểu dáng, SKU và giá bán riêng.';
COMMENT ON COLUMN public."product_variant"."id" IS 'Mã định danh biến thể sản phẩm.';
COMMENT ON COLUMN public."product_variant"."product_id" IS 'Sản phẩm gốc chứa biến thể này.';
COMMENT ON COLUMN public."product_variant"."color_id" IS 'Màu sắc của biến thể nếu sản phẩm có phân loại màu.';
COMMENT ON COLUMN public."product_variant"."size_id" IS 'Kích thước hoặc quy cách của biến thể.';
COMMENT ON COLUMN public."product_variant"."flavor_id" IS 'Hương vị của biến thể nếu sản phẩm có phân loại hương vị.';
COMMENT ON COLUMN public."product_variant"."sku_variant" IS 'Mã SKU duy nhất dùng để bán hàng và quản lý tồn kho cho đúng biến thể.';
COMMENT ON COLUMN public."product_variant"."cost_price" IS 'Giá vốn của biến thể tại thời điểm quản lý sản phẩm.';
COMMENT ON COLUMN public."product_variant"."sale_price" IS 'Giá bán hiện tại của biến thể.';
COMMENT ON COLUMN public."product_variant"."compare_at_price" IS 'Giá niêm yết dùng để so sánh với sale_price khi hiển thị khuyến mãi.';
COMMENT ON COLUMN public."product_variant"."weight" IS 'Khối lượng/quy cách của biến thể phục vụ hiển thị và nghiệp vụ bán hàng.';
COMMENT ON COLUMN public."product_variant"."barcode" IS 'Mã vạch của biến thể dùng cho bán hàng và kiểm kho.';
COMMENT ON COLUMN public."product_variant"."status" IS 'Trạng thái kinh doanh của biến thể.';
COMMENT ON COLUMN public."product_variant"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."product_variant"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."product_variant_media" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "product_variant_id" uuid NOT NULL,
 "image_url" text NOT NULL,
 "display_order" integer NOT NULL DEFAULT 0,
 "is_thumbnail" boolean NOT NULL DEFAULT false,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."product_variant_media" IS 'Lưu ảnh riêng của từng biến thể sản phẩm, độc lập ảnh dùng chung của sản phẩm.';
COMMENT ON COLUMN public."product_variant_media"."id" IS 'Mã định danh bản ghi hình ảnh biến thể.';
COMMENT ON COLUMN public."product_variant_media"."product_variant_id" IS 'Biến thể sản phẩm sở hữu hình ảnh này.';
COMMENT ON COLUMN public."product_variant_media"."image_url" IS 'Đường dẫn đến file hình ảnh biến thể được lưu trữ.';
COMMENT ON COLUMN public."product_variant_media"."display_order" IS 'Thứ tự hình ảnh khi hiển thị trên trang sản phẩm.';
COMMENT ON COLUMN public."product_variant_media"."is_thumbnail" IS 'Xác định hình ảnh đại diện của biến thể.';
COMMENT ON COLUMN public."product_variant_media"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."product_variant_media"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."purchase_order" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "supplier_id" uuid NOT NULL,
 "order_number" text NOT NULL UNIQUE,
 "order_date" date NOT NULL,
 "expected_date" date,
 "order_status" text NOT NULL DEFAULT 'draft',
 "note" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."purchase_order" IS 'Lưu phiếu nhập hàng từ nhà cung cấp';
COMMENT ON COLUMN public."purchase_order"."id" IS 'Mã định danh phiếu nhập hàng.';
COMMENT ON COLUMN public."purchase_order"."supplier_id" IS 'Nhà cung cấp thực hiện giao lô hàng này.';
COMMENT ON COLUMN public."purchase_order"."order_number" IS 'Mã phiếu nhập dùng để tra cứu và đối soát.';
COMMENT ON COLUMN public."purchase_order"."order_date" IS 'Ngày PawPal tạo hoặc ghi nhận phiếu nhập.';
COMMENT ON COLUMN public."purchase_order"."expected_date" IS 'Ngày dự kiến nhận hàng từ nhà cung cấp.';
COMMENT ON COLUMN public."purchase_order"."order_status" IS 'Trạng thái xử lý phiếu nhập.';
COMMENT ON COLUMN public."purchase_order"."note" IS 'Ghi chú thêm về phiếu nhập hoặc lô hàng.';
COMMENT ON COLUMN public."purchase_order"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."purchase_order"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."purchase_order_detail" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "purchase_order_id" uuid NOT NULL,
 "product_variant_id" uuid NOT NULL,
 "quantity" integer NOT NULL,
 "unit_price" numeric(18,4) NOT NULL,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."purchase_order_detail" IS 'Lưu chi tiết từng sản phẩm trong phiếu nhập hàng';
COMMENT ON COLUMN public."purchase_order_detail"."id" IS 'Mã định danh dòng chi tiết phiếu nhập.';
COMMENT ON COLUMN public."purchase_order_detail"."purchase_order_id" IS 'Phiếu nhập chứa sản phẩm này.';
COMMENT ON COLUMN public."purchase_order_detail"."product_variant_id" IS 'Biến thể sản phẩm thực tế được nhập vào kho.';
COMMENT ON COLUMN public."purchase_order_detail"."quantity" IS 'Số lượng sản phẩm được đặt nhập theo phiếu.';
COMMENT ON COLUMN public."purchase_order_detail"."unit_price" IS 'Giá nhập trên mỗi đơn vị sản phẩm.';
CREATE TABLE public."cart" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "customer_id" uuid NOT NULL,
 "cart_status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."cart" IS 'Lưu giỏ hàng hiện tại của khách trước khi tạo đơn hàng';
COMMENT ON COLUMN public."cart"."id" IS 'Mã định danh giỏ hàng.';
COMMENT ON COLUMN public."cart"."customer_id" IS 'Khách hàng sở hữu giỏ hàng.';
COMMENT ON COLUMN public."cart"."cart_status" IS 'Trạng thái vòng đời của giỏ hàng.';
COMMENT ON COLUMN public."cart"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."cart"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."cart_item" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "cart_id" uuid NOT NULL,
 "product_variant_id" uuid NOT NULL,
 "quantity" integer NOT NULL,
 "unit_price" numeric(18,4) NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."cart_item" IS 'Lưu danh sách sản phẩm được thêm vào giỏ hàng';
COMMENT ON COLUMN public."cart_item"."id" IS 'Mã định danh dòng sản phẩm trong giỏ.';
COMMENT ON COLUMN public."cart_item"."cart_id" IS 'Giỏ hàng chứa sản phẩm này.';
COMMENT ON COLUMN public."cart_item"."product_variant_id" IS 'Biến thể sản phẩm khách đang mua.';
COMMENT ON COLUMN public."cart_item"."quantity" IS 'Số lượng biến thể được chọn trong giỏ.';
COMMENT ON COLUMN public."cart_item"."unit_price" IS 'Giá bán của biến thể tại thời điểm được thêm/cập nhật vào giỏ.';
COMMENT ON COLUMN public."cart_item"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."cart_item"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."wishlist" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "customer_id" uuid NOT NULL UNIQUE,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."wishlist" IS 'Lưu danh sách sản phẩm yêu thích của khách hàng';
COMMENT ON COLUMN public."wishlist"."id" IS 'Mã định danh danh sách yêu thích.';
COMMENT ON COLUMN public."wishlist"."customer_id" IS 'Khách hàng sở hữu danh sách yêu thích.';
COMMENT ON COLUMN public."wishlist"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."wishlist"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."wishlist_product" (
 "wishlist_id" uuid NOT NULL,
 "product_id" uuid NOT NULL,
 "added_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("wishlist_id", "product_id")
);
COMMENT ON TABLE public."wishlist_product" IS 'Sản phẩm yêu thích của khách thông qua wishlist.';
COMMENT ON COLUMN public."wishlist_product"."wishlist_id" IS 'Danh sách yêu thích; cùng product_id tạo khóa chính.';
COMMENT ON COLUMN public."wishlist_product"."product_id" IS 'Sản phẩm được yêu thích; cùng wishlist_id tạo khóa chính.';
COMMENT ON COLUMN public."wishlist_product"."added_at" IS 'Thời điểm thêm sản phẩm.';
CREATE TABLE public."wishlist_service" (
 "wishlist_id" uuid NOT NULL,
 "service_id" uuid NOT NULL,
 "added_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("wishlist_id", "service_id")
);
COMMENT ON TABLE public."wishlist_service" IS 'Dịch vụ yêu thích của khách thông qua wishlist.';
COMMENT ON COLUMN public."wishlist_service"."wishlist_id" IS 'Danh sách yêu thích; cùng service_id tạo khóa chính.';
COMMENT ON COLUMN public."wishlist_service"."service_id" IS 'Dịch vụ được yêu thích; cùng wishlist_id tạo khóa chính.';
COMMENT ON COLUMN public."wishlist_service"."added_at" IS 'Thời điểm thêm dịch vụ.';
CREATE TABLE public."sales_order" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "order_code" text NOT NULL UNIQUE,
 "customer_id" uuid NOT NULL,
 "order_status" text NOT NULL DEFAULT 'draft',
 "note" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "shipping_fee_snapshot" numeric(18,4) NOT NULL DEFAULT 0,
 "receiver_name_snapshot" text,
 "receiver_phone_snapshot" text,
 "province_snapshot" text,
 "street_address_snapshot" text,
 "postal_code_snapshot" text,
 "delivery_option_id" uuid,
 "shipping_provider_id" uuid,
 "tracking_code" text,
 "shipped_at" timestamptz,
 "delivered_at" timestamptz,
 "shipping_status" text,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."sales_order" IS 'Lưu đơn hàng mua sắm trên website hoặc tại cửa hàng';
COMMENT ON COLUMN public."sales_order"."id" IS 'Mã định danh đơn hàng.';
COMMENT ON COLUMN public."sales_order"."order_code" IS 'Mã đơn hàng hiển thị cho khách và Admin.';
COMMENT ON COLUMN public."sales_order"."customer_id" IS 'Khách hàng sở hữu đơn hàng.';
COMMENT ON COLUMN public."sales_order"."order_status" IS 'Trạng thái xử lý đơn hàng.';
COMMENT ON COLUMN public."sales_order"."note" IS 'Ghi chú khách hàng gửi khi đặt đơn.';
COMMENT ON COLUMN public."sales_order"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."sales_order"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."sales_order"."shipping_fee_snapshot" IS 'Phí giao hàng được chốt khi đặt, không đổi theo cấu hình sau này.';
COMMENT ON COLUMN public."sales_order"."receiver_name_snapshot" IS 'Tên người nhận được chốt khi đặt đơn; không đổi theo sổ địa chỉ.';
COMMENT ON COLUMN public."sales_order"."receiver_phone_snapshot" IS 'Số điện thoại người nhận được chốt khi đặt đơn.';
COMMENT ON COLUMN public."sales_order"."province_snapshot" IS 'Tỉnh hoặc thành phố nhận hàng tại thời điểm đặt.';
COMMENT ON COLUMN public."sales_order"."street_address_snapshot" IS 'Địa chỉ giao hàng chi tiết tại thời điểm đặt.';
COMMENT ON COLUMN public."sales_order"."postal_code_snapshot" IS 'Mã bưu chính tại thời điểm đặt, nếu có.';
COMMENT ON COLUMN public."sales_order"."delivery_option_id" IS 'Hình thức giao hoặc nhận hàng được chọn cho đơn.';
COMMENT ON COLUMN public."sales_order"."shipping_provider_id" IS 'Đơn vị vận chuyển; có thể NULL khi khách nhận tại cửa hàng.';
COMMENT ON COLUMN public."sales_order"."tracking_code" IS 'Mã vận đơn của đơn hàng, khi có.';
COMMENT ON COLUMN public."sales_order"."shipped_at" IS 'Thời điểm bàn giao đơn cho đơn vị vận chuyển.';
COMMENT ON COLUMN public."sales_order"."delivered_at" IS 'Thời điểm giao hoặc nhận hàng thành công.';
COMMENT ON COLUMN public."sales_order"."shipping_status" IS 'Trạng thái giao nhận của đơn, độc lập trạng thái xử lý đơn.';
CREATE TABLE public."sales_order_detail" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "order_id" uuid NOT NULL,
 "product_variant_id" uuid NOT NULL,
 "quantity" integer NOT NULL,
 "unit_price" numeric(18,4) NOT NULL,
 "discount_amount" numeric(18,4) NOT NULL DEFAULT 0,
 "product_name_snapshot" text NOT NULL,
 "sku_snapshot" text NOT NULL,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."sales_order_detail" IS 'Lưu chi tiết sản phẩm, số lượng và đơn giá trong từng đơn hàng';
COMMENT ON COLUMN public."sales_order_detail"."id" IS 'Mã định danh dòng chi tiết đơn hàng.';
COMMENT ON COLUMN public."sales_order_detail"."order_id" IS 'Đơn hàng chứa dòng sản phẩm này.';
COMMENT ON COLUMN public."sales_order_detail"."product_variant_id" IS 'Biến thể SKU thực tế khách mua.';
COMMENT ON COLUMN public."sales_order_detail"."quantity" IS 'Số lượng SKU được mua trong dòng đơn.';
COMMENT ON COLUMN public."sales_order_detail"."unit_price" IS 'Đơn giá SKU tại thời điểm chốt đơn.';
COMMENT ON COLUMN public."sales_order_detail"."discount_amount" IS 'Số tiền giảm trực tiếp trên dòng sản phẩm.';
COMMENT ON COLUMN public."sales_order_detail"."product_name_snapshot" IS 'Tên hàng tại thời điểm bán.';
COMMENT ON COLUMN public."sales_order_detail"."sku_snapshot" IS 'SKU tại thời điểm bán, không đổi theo danh mục sau này.';
CREATE TABLE public."stock_reservation" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "product_variant_id" uuid NOT NULL,
 "cart_id" uuid,
 "quantity" integer NOT NULL,
 "reserved_at" timestamptz NOT NULL DEFAULT now(),
 "expires_at" timestamptz NOT NULL,
 "status" text NOT NULL DEFAULT 'pending',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "order_id" uuid,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."stock_reservation" IS 'Lưu thông tin giữ trước số lượng tồn kho của từng biến thể sản phẩm';
COMMENT ON COLUMN public."stock_reservation"."id" IS 'Mã định danh lượt giữ hàng.';
COMMENT ON COLUMN public."stock_reservation"."product_variant_id" IS 'Biến thể SKU đang được giữ tồn kho.';
COMMENT ON COLUMN public."stock_reservation"."cart_id" IS 'Giỏ hàng tạo ra lượt giữ tồn kho.';
COMMENT ON COLUMN public."stock_reservation"."quantity" IS 'Số lượng SKU được giữ tạm.';
COMMENT ON COLUMN public."stock_reservation"."reserved_at" IS 'Thời điểm hệ thống bắt đầu giữ hàng.';
COMMENT ON COLUMN public."stock_reservation"."expires_at" IS 'Thời điểm reservation hết hiệu lực nếu khách không hoàn tất giao dịch.';
COMMENT ON COLUMN public."stock_reservation"."status" IS 'Trạng thái của lượt giữ hàng.';
COMMENT ON COLUMN public."stock_reservation"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."stock_reservation"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."stock_reservation"."order_id" IS 'Đơn hàng sở hữu lượt giữ sau khi chuyển từ giỏ; NULL khi còn giữ cho giỏ.';
CREATE TABLE public."inventory" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "product_variant_id" uuid NOT NULL UNIQUE,
 "quantity_in_stock" integer NOT NULL DEFAULT 0,
 "minimum_stock" integer NOT NULL DEFAULT 0,
 "last_updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."inventory" IS 'Bảng số dư tồn tổng hợp của kho chung theo từng biến thể; có thể dựng lại từ sổ kho, không thuộc lõi chuẩn hóa độc lập.';
COMMENT ON COLUMN public."inventory"."id" IS 'Mã định danh bản ghi tồn kho.';
COMMENT ON COLUMN public."inventory"."product_variant_id" IS 'Biến thể SKU được quản lý tồn kho.';
COMMENT ON COLUMN public."inventory"."quantity_in_stock" IS 'Số lượng thực tế đang có trong kho.';
COMMENT ON COLUMN public."inventory"."minimum_stock" IS 'Mức tồn kho tối thiểu để phát cảnh báo sắp hết hàng.';
COMMENT ON COLUMN public."inventory"."last_updated_at" IS 'Thời điểm số liệu tồn kho được cập nhật gần nhất.';
CREATE TABLE public."inventory_transaction" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "product_variant_id" uuid NOT NULL,
 "transaction_type" text NOT NULL,
 "quantity" integer NOT NULL,
 "note" text,
 "staff_id" uuid,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "purchase_order_detail_id" uuid,
 "sales_order_detail_id" uuid,
 "return_request_detail_id" uuid,
 "idempotency_key" text NOT NULL UNIQUE,
 "recorded_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."inventory_transaction" IS 'Lưu lịch sử nhập kho, xuất kho và điều chỉnh tồn kho';
COMMENT ON COLUMN public."inventory_transaction"."id" IS 'Mã định danh giao dịch kho.';
COMMENT ON COLUMN public."inventory_transaction"."product_variant_id" IS 'Biến thể SKU phát sinh thay đổi tồn kho.';
COMMENT ON COLUMN public."inventory_transaction"."transaction_type" IS 'Loại thay đổi tồn kho.';
COMMENT ON COLUMN public."inventory_transaction"."quantity" IS 'Lượng tồn thay đổi có dấu: dương khi nhập và âm khi xuất hoặc đảo nhập.';
COMMENT ON COLUMN public."inventory_transaction"."note" IS 'Lý do hoặc ghi chú về giao dịch điều chỉnh kho.';
COMMENT ON COLUMN public."inventory_transaction"."staff_id" IS 'Nhân viên thực hiện hoặc xác nhận giao dịch kho.';
COMMENT ON COLUMN public."inventory_transaction"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."inventory_transaction"."purchase_order_detail_id" IS 'Dòng mua hàng là nguồn nhập hoặc đảo nhập; NULL nếu giao dịch không phải nhập mua.';
COMMENT ON COLUMN public."inventory_transaction"."sales_order_detail_id" IS 'Dòng bán hàng là nguồn xuất hoặc đảo xuất, nếu có.';
COMMENT ON COLUMN public."inventory_transaction"."return_request_detail_id" IS 'Dòng hàng trả là nguồn nhập lại, nếu đủ điều kiện.';
COMMENT ON COLUMN public."inventory_transaction"."idempotency_key" IS 'Khóa duy nhất ngăn ghi biến động kho trùng.';
COMMENT ON COLUMN public."inventory_transaction"."recorded_at" IS 'Thời điểm nghiệp vụ kho thực tế phát sinh.';
CREATE TABLE public."payment_method_config" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "name" text NOT NULL,
 "short_name" text,
 "description" text,
 "icon" text,
 "fee" numeric(18,4) NOT NULL DEFAULT 0,
 "available" boolean NOT NULL DEFAULT true,
 "requires_info" boolean NOT NULL DEFAULT false,
 "redirect_url" text,
 "bank_info" jsonb,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."payment_method_config" IS 'Lưu thông tin các loại phương thức thanh toán khả dụng';
COMMENT ON COLUMN public."payment_method_config"."id" IS 'Mã định danh phương thức thanh toán.';
COMMENT ON COLUMN public."payment_method_config"."name" IS 'Tên phương thức thanh toán hiển thị cho khách.';
COMMENT ON COLUMN public."payment_method_config"."short_name" IS 'Tên viết tắt dùng trong giao diện/quản trị.';
COMMENT ON COLUMN public."payment_method_config"."description" IS 'Mô tả cách thức hoặc điều kiện sử dụng phương thức.';
COMMENT ON COLUMN public."payment_method_config"."icon" IS 'Thông tin nhận diện icon hiển thị cho phương thức thanh toán.';
COMMENT ON COLUMN public."payment_method_config"."fee" IS 'Phí cố định áp dụng cho phương thức thanh toán nếu có.';
COMMENT ON COLUMN public."payment_method_config"."available" IS 'Cho biết phương thức hiện có được phép sử dụng hay không.';
COMMENT ON COLUMN public."payment_method_config"."requires_info" IS 'Thông tin bổ sung cần thu thập khi khách chọn phương thức.';
COMMENT ON COLUMN public."payment_method_config"."redirect_url" IS 'URL chuyển khách sang cổng thanh toán nếu phương thức yêu cầu.';
COMMENT ON COLUMN public."payment_method_config"."bank_info" IS 'Thông tin tài khoản ngân hàng dùng cho chuyển khoản.';
COMMENT ON COLUMN public."payment_method_config"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."delivery_option_config" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "name" text NOT NULL,
 "description" text,
 "fee" numeric(18,4) NOT NULL DEFAULT 0,
 "estimated_days" integer,
 "icon" text,
 "available" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."delivery_option_config" IS 'Lưu thông tin các hình thức giao hàng';
COMMENT ON COLUMN public."delivery_option_config"."id" IS 'Mã định danh hình thức giao hàng.';
COMMENT ON COLUMN public."delivery_option_config"."name" IS 'Tên hình thức giao hàng hiển thị cho khách.';
COMMENT ON COLUMN public."delivery_option_config"."description" IS 'Mô tả phạm vi hoặc điều kiện của hình thức giao hàng.';
COMMENT ON COLUMN public."delivery_option_config"."fee" IS 'Phí giao hàng cơ bản của hình thức.';
COMMENT ON COLUMN public."delivery_option_config"."estimated_days" IS 'Số ngày dự kiến giao hàng.';
COMMENT ON COLUMN public."delivery_option_config"."icon" IS 'Thông tin nhận diện icon của hình thức giao hàng.';
COMMENT ON COLUMN public."delivery_option_config"."available" IS 'Cho biết hình thức giao hàng có đang được phép chọn hay không.';
COMMENT ON COLUMN public."delivery_option_config"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."shipping_provider" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "provider_name" text NOT NULL,
 "provider_code" text NOT NULL,
 "logo_url" text,
 "contact_phone" text,
 "tracking_url" text,
 "status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."shipping_provider" IS 'Lưu danh sách các đơn vị vận chuyển mà PawPal sử dụng để giao đơn hàng, giúp Admin quản lý đối tác giao hàng và liên';
COMMENT ON COLUMN public."shipping_provider"."id" IS 'Mã định danh đơn vị vận chuyển.';
COMMENT ON COLUMN public."shipping_provider"."provider_name" IS 'Tên đơn vị vận chuyển mà PawPal hợp tác.';
COMMENT ON COLUMN public."shipping_provider"."provider_code" IS 'Mã định danh ngắn của đơn vị vận chuyển trong hệ thống.';
COMMENT ON COLUMN public."shipping_provider"."logo_url" IS 'Đường dẫn logo của đơn vị vận chuyển.';
COMMENT ON COLUMN public."shipping_provider"."contact_phone" IS 'Số điện thoại liên hệ của đơn vị vận chuyển.';
COMMENT ON COLUMN public."shipping_provider"."tracking_url" IS 'Mẫu URL dùng để tra cứu vận đơn.';
COMMENT ON COLUMN public."shipping_provider"."status" IS 'Trạng thái hợp tác/sử dụng đơn vị vận chuyển.';
COMMENT ON COLUMN public."shipping_provider"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."shipping_provider"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."payment" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "payment_code" text NOT NULL UNIQUE,
 "customer_id" uuid NOT NULL,
 "payment_method_config_id" uuid NOT NULL,
 "payment_type" text NOT NULL,
 "amount" numeric(18,4) NOT NULL,
 "transaction_status" text NOT NULL DEFAULT 'pending',
 "succeeded_at" timestamptz,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "gateway_transaction_id" text,
 "idempotency_key" text NOT NULL UNIQUE,
 "order_id" uuid,
 "appointment_id" uuid,
 "eligible_spend_amount" numeric(18,4) NOT NULL DEFAULT 0,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."payment" IS 'Lưu lịch sử thanh toán, phương thức thanh toán và trạng thái giao dịch';
COMMENT ON COLUMN public."payment"."id" IS 'Mã định danh giao dịch thanh toán.';
COMMENT ON COLUMN public."payment"."payment_code" IS 'Mã giao dịch thanh toán dùng để đối soát.';
COMMENT ON COLUMN public."payment"."customer_id" IS 'Khách hàng thực hiện thanh toán.';
COMMENT ON COLUMN public."payment"."payment_method_config_id" IS 'Phương thức thanh toán được sử dụng.';
COMMENT ON COLUMN public."payment"."payment_type" IS 'Loại giao dịch thanh toán.';
COMMENT ON COLUMN public."payment"."amount" IS 'Số tiền thực tế của giao dịch thanh toán.';
COMMENT ON COLUMN public."payment"."transaction_status" IS 'Trạng thái xử lý giao dịch thanh toán.';
COMMENT ON COLUMN public."payment"."succeeded_at" IS 'Thời điểm khoản thanh toán được xác nhận thu thành công.';
COMMENT ON COLUMN public."payment"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."payment"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."payment"."gateway_transaction_id" IS 'Mã thu tiền bên cổng thanh toán, khi có.';
COMMENT ON COLUMN public."payment"."idempotency_key" IS 'Khóa duy nhất chống thu hoặc ghi nhận lặp một yêu cầu.';
COMMENT ON COLUMN public."payment"."order_id" IS 'Đơn hàng được thanh toán; NULL khi lần thu thuộc một lịch hẹn.';
COMMENT ON COLUMN public."payment"."appointment_id" IS 'Lịch được thanh toán; NULL khi lần thu thuộc một đơn hàng.';
COMMENT ON COLUMN public."payment"."eligible_spend_amount" IS 'Phần tiền đủ điều kiện xét hạng đã được ghi nhận, từ 0 đến amount; tiền cọc chưa đủ điều kiện có giá trị 0.';
CREATE TABLE public."refund_transaction" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "refund_code" text NOT NULL UNIQUE,
 "ticket_id" uuid,
 "payment_id" uuid NOT NULL,
 "refund_type" text NOT NULL,
 "requested_amount" numeric(18,4) NOT NULL,
 "approved_amount" numeric(18,4) NOT NULL,
 "refunded_amount" numeric(18,4) NOT NULL,
 "refund_method" text NOT NULL,
 "refund_status" text NOT NULL DEFAULT 'pending',
 "gateway_transaction_id" text,
 "note" text,
 "processed_by" uuid,
 "processed_at" timestamptz,
 "completed_at" timestamptz,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "return_request_id" uuid,
 "eligible_refund_amount" numeric(18,4) NOT NULL DEFAULT 0,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."refund_transaction" IS 'Lưu giao dịch hoàn tiền hoặc bồi thường thực tế phát sinh từ một support ticket đã được phê duyệt xử lý. Đây là thực thể ghi nhận dòng tiền, tách biệt với quá trình tiếp nhận và xử lý khiếu nại.';
COMMENT ON COLUMN public."refund_transaction"."id" IS 'Mã định danh giao dịch hoàn tiền/bồi thường.';
COMMENT ON COLUMN public."refund_transaction"."refund_code" IS 'Mã giao dịch hoàn tiền dùng để tra cứu và đối soát.';
COMMENT ON COLUMN public."refund_transaction"."ticket_id" IS 'Ticket làm cơ sở phát sinh giao dịch hoàn/bồi thường.';
COMMENT ON COLUMN public."refund_transaction"."payment_id" IS 'Giao dịch thanh toán ban đầu liên quan đến khoản hoàn tiền.';
COMMENT ON COLUMN public."refund_transaction"."refund_type" IS 'Loại hoàn tiền hoặc bồi thường.';
COMMENT ON COLUMN public."refund_transaction"."requested_amount" IS 'Số tiền khách yêu cầu hoàn/bồi thường.';
COMMENT ON COLUMN public."refund_transaction"."approved_amount" IS 'Số tiền được PawPal phê duyệt.';
COMMENT ON COLUMN public."refund_transaction"."refunded_amount" IS 'Số tiền thực tế đã hoàn/bồi thường thành công.';
COMMENT ON COLUMN public."refund_transaction"."refund_method" IS 'Phương thức hoàn tiền/bồi thường.';
COMMENT ON COLUMN public."refund_transaction"."refund_status" IS 'Trạng thái xử lý giao dịch hoàn tiền.';
COMMENT ON COLUMN public."refund_transaction"."gateway_transaction_id" IS 'Mã giao dịch từ cổng thanh toán liên quan đến hoàn tiền.';
COMMENT ON COLUMN public."refund_transaction"."note" IS 'Ghi chú bổ sung về giao dịch hoàn tiền/bồi thường.';
COMMENT ON COLUMN public."refund_transaction"."processed_by" IS 'Nhân viên thực hiện giao dịch hoàn tiền/bồi thường.';
COMMENT ON COLUMN public."refund_transaction"."processed_at" IS 'Thời điểm nhân viên/hệ thống bắt đầu xử lý hoàn tiền.';
COMMENT ON COLUMN public."refund_transaction"."completed_at" IS 'Thời điểm giao dịch hoàn tiền hoàn tất thành công.';
COMMENT ON COLUMN public."refund_transaction"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."refund_transaction"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."refund_transaction"."return_request_id" IS 'Yêu cầu trả hàng liên quan; có thể NULL khi hoàn không thuộc yêu cầu trả hàng.';
COMMENT ON COLUMN public."refund_transaction"."eligible_refund_amount" IS 'Phần hoàn làm giảm chi tiêu xét hạng; không vượt số tiền thực hoàn và phần đủ điều kiện còn lại của lần thu gốc.';
CREATE TABLE public."return_request" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "sales_order_id" uuid NOT NULL,
 "resolution_type" text,
 "resolved_by" uuid,
 "reason" text NOT NULL,
 "return_type" text NOT NULL,
 "description" text,
 "request_status" text NOT NULL DEFAULT 'pending',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."return_request" IS 'Lưu yêu cầu đổi trả sản phẩm và thông tin hậu mãi';
COMMENT ON COLUMN public."return_request"."id" IS 'Mã định danh yêu cầu đổi trả.';
COMMENT ON COLUMN public."return_request"."sales_order_id" IS 'Đơn hàng phát sinh yêu cầu đổi trả.';
COMMENT ON COLUMN public."return_request"."resolution_type" IS 'Kết quả xử lý cuối cùng của yêu cầu đổi trả.';
COMMENT ON COLUMN public."return_request"."resolved_by" IS 'Nhân viên/Admin chốt kết quả yêu cầu đổi trả.';
COMMENT ON COLUMN public."return_request"."reason" IS 'Lý do khách hàng yêu cầu đổi/trả.';
COMMENT ON COLUMN public."return_request"."return_type" IS 'Loại yêu cầu đổi/trả của khách hàng.';
COMMENT ON COLUMN public."return_request"."description" IS 'Thông tin chi tiết bổ sung về tình trạng hoặc yêu cầu đổi trả.';
COMMENT ON COLUMN public."return_request"."request_status" IS 'Trạng thái xử lý yêu cầu đổi trả.';
COMMENT ON COLUMN public."return_request"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."return_request"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."return_request_detail" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "return_request_id" uuid NOT NULL,
 "quantity" integer NOT NULL,
 "sales_order_detail_id" uuid NOT NULL,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."return_request_detail" IS 'Lưu chi tiết sản phẩm được đổi trả';
COMMENT ON COLUMN public."return_request_detail"."id" IS 'Mã định danh dòng chi tiết đổi trả.';
COMMENT ON COLUMN public."return_request_detail"."return_request_id" IS 'Yêu cầu đổi trả chứa sản phẩm này.';
COMMENT ON COLUMN public."return_request_detail"."quantity" IS 'Số lượng SKU được yêu cầu đổi/trả.';
COMMENT ON COLUMN public."return_request_detail"."sales_order_detail_id" IS 'Dòng hàng đã mua được yêu cầu trả, từ đó suy ra biến thể và giá gốc.';
CREATE TABLE public."return_request_evidence" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "return_request_id" uuid NOT NULL,
 "image_url" text NOT NULL,
 "display_order" integer NOT NULL DEFAULT 0,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."return_request_evidence" IS 'Ảnh bằng chứng của yêu cầu trả hàng.';
COMMENT ON COLUMN public."return_request_evidence"."id" IS 'Mã ảnh bằng chứng.';
COMMENT ON COLUMN public."return_request_evidence"."return_request_id" IS 'Yêu cầu trả hàng sở hữu ảnh.';
COMMENT ON COLUMN public."return_request_evidence"."image_url" IS 'Đường dẫn hoặc khóa lưu ảnh.';
COMMENT ON COLUMN public."return_request_evidence"."display_order" IS 'Thứ tự ảnh.';
COMMENT ON COLUMN public."return_request_evidence"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."review" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "rating" integer NOT NULL,
 "review_content" text,
 "review_status" text NOT NULL DEFAULT 'pending',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "sales_order_detail_id" uuid,
 "appointment_item_id" uuid,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."review" IS 'Lưu đánh giá của khách hàng cho sản phẩm hoặc dịch vụ';
COMMENT ON COLUMN public."review"."id" IS 'Mã định danh đánh giá.';
COMMENT ON COLUMN public."review"."rating" IS 'Số sao khách hàng chấm cho sản phẩm/dịch vụ.';
COMMENT ON COLUMN public."review"."review_content" IS 'Nội dung nhận xét của khách hàng.';
COMMENT ON COLUMN public."review"."review_status" IS 'Trạng thái kiểm duyệt và hiển thị đánh giá.';
COMMENT ON COLUMN public."review"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."review"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."review"."sales_order_detail_id" IS 'Dòng mua được đánh giá; NULL nếu đánh giá dòng dịch vụ.';
COMMENT ON COLUMN public."review"."appointment_item_id" IS 'Dòng dịch vụ được đánh giá; NULL nếu đánh giá dòng mua.';
CREATE TABLE public."review_response" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "review_id" uuid NOT NULL,
 "staff_id" uuid NOT NULL,
 "response_content" text NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."review_response" IS 'Lưu phản hồi của Admin đối với đánh giá của khách hàng';
COMMENT ON COLUMN public."review_response"."id" IS 'Mã định danh phản hồi đánh giá.';
COMMENT ON COLUMN public."review_response"."review_id" IS 'Đánh giá được Admin phản hồi.';
COMMENT ON COLUMN public."review_response"."staff_id" IS 'Nhân viên/Admin thực hiện phản hồi.';
COMMENT ON COLUMN public."review_response"."response_content" IS 'Nội dung phản hồi của Admin đối với khách hàng.';
COMMENT ON COLUMN public."review_response"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."review_response"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."review_media" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "review_id" uuid NOT NULL,
 "image_url" text NOT NULL,
 "display_order" integer NOT NULL DEFAULT 0,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."review_media" IS 'Ảnh minh chứng đính kèm đánh giá.';
COMMENT ON COLUMN public."review_media"."id" IS 'Mã ảnh đánh giá.';
COMMENT ON COLUMN public."review_media"."review_id" IS 'Đánh giá sở hữu ảnh.';
COMMENT ON COLUMN public."review_media"."image_url" IS 'Đường dẫn hoặc khóa lưu ảnh.';
COMMENT ON COLUMN public."review_media"."display_order" IS 'Thứ tự ảnh trong đánh giá.';
COMMENT ON COLUMN public."review_media"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."support_ticket" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "ticket_code" text NOT NULL UNIQUE,
 "customer_id" uuid,
 "order_id" uuid,
 "appointment_id" uuid,
 "channel" text NOT NULL,
 "category" text NOT NULL,
 "subject" text NOT NULL,
 "description" text,
 "priority" text NOT NULL,
 "type" text NOT NULL,
 "status" text NOT NULL DEFAULT 'pending',
 "requested_resolution" text,
 "requested_amount" numeric(18,4),
 "assigned_staff_id" uuid,
 "first_response_at" timestamptz,
 "investigation_note" text,
 "resolution_type" text,
 "resolution_note" text,
 "approved_amount" numeric(18,4),
 "resolved_by" uuid,
 "resolved_at" timestamptz,
 "closed_at" timestamptz,
 "rating" integer,
 "rating_comment" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "created_by_account_id" uuid,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."support_ticket" IS 'Lưu các yêu cầu hỗ trợ, khiếu nại, tranh chấp và yêu cầu xử lý phát sinh từ khách hàng trong quá trình sử dụng dịch vụ/mua hàng. Đây là thực thể trung tâm để theo dõi toàn bộ vụ việc từ lúc tiếp nhận đến khi giải quyết và đóng yêu cầu.';
COMMENT ON COLUMN public."support_ticket"."id" IS 'Mã định danh yêu cầu hỗ trợ.';
COMMENT ON COLUMN public."support_ticket"."ticket_code" IS 'Mã yêu cầu hỗ trợ/khiếu nại dùng để khách hàng và Admin tra cứu.';
COMMENT ON COLUMN public."support_ticket"."customer_id" IS 'Khách hàng tạo yêu cầu hỗ trợ.';
COMMENT ON COLUMN public."support_ticket"."order_id" IS 'Đơn hàng liên quan đến yêu cầu nếu có.';
COMMENT ON COLUMN public."support_ticket"."appointment_id" IS 'Lịch hẹn liên quan đến yêu cầu nếu có.';
COMMENT ON COLUMN public."support_ticket"."channel" IS 'Kênh khách hàng sử dụng để gửi yêu cầu.';
COMMENT ON COLUMN public."support_ticket"."category" IS 'Loại vấn đề hoặc yêu cầu cần xử lý.';
COMMENT ON COLUMN public."support_ticket"."subject" IS 'Tiêu đề ngắn giúp Admin nhận diện nội dung ticket.';
COMMENT ON COLUMN public."support_ticket"."description" IS 'Nội dung ban đầu khách hàng cung cấp về vấn đề cần hỗ trợ.';
COMMENT ON COLUMN public."support_ticket"."priority" IS 'Mức độ ưu tiên xử lý ticket.';
COMMENT ON COLUMN public."support_ticket"."type" IS 'Loại yêu cầu nghiệp vụ như khiếu nại, hỗ trợ hoặc yêu cầu khác.';
COMMENT ON COLUMN public."support_ticket"."status" IS 'Trạng thái xử lý hiện tại của ticket.';
COMMENT ON COLUMN public."support_ticket"."requested_resolution" IS 'Phương án xử lý mà khách hàng đề nghị.';
COMMENT ON COLUMN public."support_ticket"."requested_amount" IS 'Số tiền khách hàng đề nghị hoàn/bồi thường nếu có.';
COMMENT ON COLUMN public."support_ticket"."assigned_staff_id" IS 'Nhân viên đang được phân công xử lý ticket.';
COMMENT ON COLUMN public."support_ticket"."first_response_at" IS 'Thời điểm PawPal gửi phản hồi đầu tiên cho khách hàng.';
COMMENT ON COLUMN public."support_ticket"."investigation_note" IS 'Ghi chú nội bộ về quá trình xác minh vụ việc và bằng chứng.';
COMMENT ON COLUMN public."support_ticket"."resolution_type" IS 'Kết quả xử lý cuối cùng của ticket.';
COMMENT ON COLUMN public."support_ticket"."resolution_note" IS 'Ghi chú giải thích phương án xử lý cuối cùng.';
COMMENT ON COLUMN public."support_ticket"."approved_amount" IS 'Số tiền được PawPal phê duyệt hoàn/bồi thường.';
COMMENT ON COLUMN public."support_ticket"."resolved_by" IS 'Nhân viên thực hiện hoặc phê duyệt kết quả xử lý.';
COMMENT ON COLUMN public."support_ticket"."resolved_at" IS 'Thời điểm ticket được xác định là đã giải quyết.';
COMMENT ON COLUMN public."support_ticket"."closed_at" IS 'Thời điểm ticket chính thức đóng.';
COMMENT ON COLUMN public."support_ticket"."rating" IS 'Điểm khách hàng đánh giá chất lượng xử lý ticket.';
COMMENT ON COLUMN public."support_ticket"."rating_comment" IS 'Nhận xét của khách hàng về quá trình hỗ trợ.';
COMMENT ON COLUMN public."support_ticket"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."support_ticket"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."support_ticket"."created_by_account_id" IS 'Tài khoản lập ticket, khác khách liên quan nếu nhân viên lập hộ.';
CREATE TABLE public."support_ticket_message" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "ticket_id" uuid NOT NULL,
 "sender_type" text NOT NULL,
 "content" text NOT NULL,
 "is_internal" boolean NOT NULL DEFAULT false,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "sender_account_id" uuid,
 "sender_guest_session_id" uuid,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."support_ticket_message" IS 'Lưu toàn bộ nội dung trao đổi, phản hồi, bằng chứng và ghi chú trong quá trình xử lý một support ticket.';
COMMENT ON COLUMN public."support_ticket_message"."id" IS 'Mã định danh tin nhắn/ghi nhận trao đổi.';
COMMENT ON COLUMN public."support_ticket_message"."ticket_id" IS 'Ticket chứa nội dung trao đổi này.';
COMMENT ON COLUMN public."support_ticket_message"."sender_type" IS 'Loại người gửi nội dung.';
COMMENT ON COLUMN public."support_ticket_message"."content" IS 'Nội dung tin nhắn, phản hồi hoặc ghi chú được lưu trong ticket.';
COMMENT ON COLUMN public."support_ticket_message"."is_internal" IS 'Xác định nội dung chỉ dành cho nội bộ hay được hiển thị cho khách.';
COMMENT ON COLUMN public."support_ticket_message"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."support_ticket_message"."sender_account_id" IS 'Tài khoản gửi tin, NULL khi người gửi là khách vãng lai hoặc hệ thống.';
COMMENT ON COLUMN public."support_ticket_message"."sender_guest_session_id" IS 'Phiên khách vãng lai gửi tin, NULL với người gửi khác.';
CREATE TABLE public."support_ticket_message_attachment" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "message_id" uuid NOT NULL,
 "file_url" text NOT NULL,
 "file_name" text NOT NULL,
 "file_size" bigint NOT NULL,
 "media_type" text NOT NULL,
 "display_order" integer NOT NULL DEFAULT 0,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."support_ticket_message_attachment" IS 'Tệp đính kèm của từng tin nhắn hỗ trợ.';
COMMENT ON COLUMN public."support_ticket_message_attachment"."id" IS 'Mã tệp đính kèm.';
COMMENT ON COLUMN public."support_ticket_message_attachment"."message_id" IS 'Tin nhắn hỗ trợ sở hữu tệp.';
COMMENT ON COLUMN public."support_ticket_message_attachment"."file_url" IS 'Đường dẫn hoặc khóa lưu tệp.';
COMMENT ON COLUMN public."support_ticket_message_attachment"."file_name" IS 'Tên gốc của tệp.';
COMMENT ON COLUMN public."support_ticket_message_attachment"."file_size" IS 'Kích thước tệp tính bằng byte.';
COMMENT ON COLUMN public."support_ticket_message_attachment"."media_type" IS 'Loại nội dung tệp.';
COMMENT ON COLUMN public."support_ticket_message_attachment"."display_order" IS 'Thứ tự tệp trong tin nhắn.';
COMMENT ON COLUMN public."support_ticket_message_attachment"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."staff" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "full_name" text NOT NULL,
 "phone_number" text,
 "job_title" text NOT NULL,
 "specialization" text,
 "hire_date" date,
 "email" text,
 "address" text,
 "dob" date,
 "service_locked" boolean NOT NULL DEFAULT false,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "auth_user_id" uuid NOT NULL UNIQUE,
 "staff_level_id" uuid,
 "employment_status" text NOT NULL DEFAULT 'active',
 "must_change_password" boolean NOT NULL DEFAULT false,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."staff" IS 'Lưu thông tin tài khoản nhân viên, lễ tân, chuyên môn, CSKH và quản lý';
COMMENT ON COLUMN public."staff"."id" IS 'Mã định danh nhân viên.';
COMMENT ON COLUMN public."staff"."full_name" IS 'Họ tên nhân viên hiển thị trong hệ thống quản trị.';
COMMENT ON COLUMN public."staff"."phone_number" IS 'Số điện thoại liên hệ của nhân viên.';
COMMENT ON COLUMN public."staff"."job_title" IS 'Chức danh công việc, không phải vai trò cấp quyền truy cập.';
COMMENT ON COLUMN public."staff"."specialization" IS 'Chuyên môn hoặc lĩnh vực phụ trách của nhân viên.';
COMMENT ON COLUMN public."staff"."hire_date" IS 'Ngày nhân viên bắt đầu làm việc tại PawPal.';
COMMENT ON COLUMN public."staff"."email" IS 'Email liên hệ công việc, không tự thay email đăng nhập.';
COMMENT ON COLUMN public."staff"."address" IS 'Địa chỉ liên hệ nhân viên.';
COMMENT ON COLUMN public."staff"."dob" IS 'Ngày sinh nhân viên.';
COMMENT ON COLUMN public."staff"."service_locked" IS 'Cờ tạm ngừng phân công dịch vụ; độc lập quyền đăng nhập.';
COMMENT ON COLUMN public."staff"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."staff"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."staff"."auth_user_id" IS 'Tài khoản công vụ liên kết duy nhất của nhân viên.';
COMMENT ON COLUMN public."staff"."staff_level_id" IS 'Cấp độ chuyên môn hiện được công nhận.';
COMMENT ON COLUMN public."staff"."employment_status" IS 'Trạng thái việc làm như đang làm, nghỉ phép dài hạn hoặc nghỉ việc.';
COMMENT ON COLUMN public."staff"."must_change_password" IS 'Yêu cầu nhân viên đổi mật khẩu sau cấp hoặc reset; phải được kiểm tra phía máy chủ.';
CREATE TABLE public."staff_schedule" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "staff_id" uuid NOT NULL,
 "availability_status" text NOT NULL DEFAULT 'available',
 "reason" text,
 "schedule_status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "start_at" timestamptz NOT NULL,
 "end_at" timestamptz NOT NULL,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."staff_schedule" IS 'Lưu lịch làm việc, ca trực và thời gian hoạt động của nhân viên';
COMMENT ON COLUMN public."staff_schedule"."id" IS 'Mã định danh lịch làm việc.';
COMMENT ON COLUMN public."staff_schedule"."staff_id" IS 'Nhân viên được xếp lịch.';
COMMENT ON COLUMN public."staff_schedule"."availability_status" IS 'Trạng thái đi làm hoặc khả dụng của nhân viên trong ca.';
COMMENT ON COLUMN public."staff_schedule"."reason" IS 'Lý do nghỉ/vắng hoặc không được xếp ca.';
COMMENT ON COLUMN public."staff_schedule"."schedule_status" IS 'Trạng thái phân ca và hiệu lực ca làm.';
COMMENT ON COLUMN public."staff_schedule"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."staff_schedule"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."staff_schedule"."start_at" IS 'Thời điểm bắt đầu ca có múi giờ.';
COMMENT ON COLUMN public."staff_schedule"."end_at" IS 'Thời điểm kết thúc ca có múi giờ.';
CREATE TABLE public."staff_assessment" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "staff_id" uuid NOT NULL,
 "assessment_date" date NOT NULL,
 "assessment_type" text NOT NULL,
 "score" numeric(5,2) NOT NULL,
 "result" text NOT NULL,
 "note" text,
 "assessed_by" uuid NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."staff_assessment" IS 'Lưu các lần sát hạch hoặc đánh giá kỹ năng thực tế của nhân viên.';
COMMENT ON COLUMN public."staff_assessment"."id" IS 'Mã lần đánh giá.';
COMMENT ON COLUMN public."staff_assessment"."staff_id" IS 'Nhân viên được đánh giá.';
COMMENT ON COLUMN public."staff_assessment"."assessment_date" IS 'Ngày thực hiện đánh giá.';
COMMENT ON COLUMN public."staff_assessment"."assessment_type" IS 'Loại nội dung được đánh giá.';
COMMENT ON COLUMN public."staff_assessment"."score" IS 'Điểm đánh giá theo thang 0–100.';
COMMENT ON COLUMN public."staff_assessment"."result" IS 'Kết quả đạt, không đạt hoặc cần đào tạo lại.';
COMMENT ON COLUMN public."staff_assessment"."note" IS 'Nhận xét và căn cứ đánh giá.';
COMMENT ON COLUMN public."staff_assessment"."assessed_by" IS 'Nhân viên có thẩm quyền thực hiện đánh giá.';
COMMENT ON COLUMN public."staff_assessment"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."staff_assessment"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."staff_shift_request" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "request_type" text NOT NULL,
 "staff_id" uuid NOT NULL,
 "target_staff_id" uuid,
 "replacement_staff_id" uuid,
 "leave_type" text,
 "start_date" date NOT NULL,
 "end_date" date NOT NULL,
 "shift" text NOT NULL,
 "target_date" date,
 "target_shift" text,
 "reason" text NOT NULL,
 "status" text NOT NULL DEFAULT 'pending',
 "created_by" uuid NOT NULL,
 "reviewed_by" uuid,
 "reviewed_at" timestamptz,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."staff_shift_request" IS 'Lưu yêu cầu xin đổi ca, xin nghỉ phép hoặc vắng mặt của nhân viên';
COMMENT ON COLUMN public."staff_shift_request"."id" IS 'Mã định danh duy nhất của yêu cầu đổi ca/nghỉ phép.';
COMMENT ON COLUMN public."staff_shift_request"."request_type" IS 'Loại yêu cầu (xin nghỉ, đổi ca, tăng ca).';
COMMENT ON COLUMN public."staff_shift_request"."staff_id" IS 'Nhân viên gửi yêu cầu.';
COMMENT ON COLUMN public."staff_shift_request"."target_staff_id" IS 'Nhân viên liên quan trong yêu cầu đổi ca.';
COMMENT ON COLUMN public."staff_shift_request"."replacement_staff_id" IS 'Nhân viên nhận ca làm thay thế.';
COMMENT ON COLUMN public."staff_shift_request"."leave_type" IS 'Loại nghỉ phép (nghỉ ốm, nghỉ phép năm, việc riêng).';
COMMENT ON COLUMN public."staff_shift_request"."start_date" IS 'Ngày bắt đầu nghỉ hoặc đổi ca.';
COMMENT ON COLUMN public."staff_shift_request"."end_date" IS 'Ngày kết thúc nghỉ.';
COMMENT ON COLUMN public."staff_shift_request"."shift" IS 'Ca làm việc liên quan (sáng, chiều, tối).';
COMMENT ON COLUMN public."staff_shift_request"."target_date" IS 'Ngày chuyển đến trong ca làm việc mới.';
COMMENT ON COLUMN public."staff_shift_request"."target_shift" IS 'Ca làm việc mới sau khi chuyển đổi.';
COMMENT ON COLUMN public."staff_shift_request"."reason" IS 'Lý do gửi yêu cầu của nhân viên.';
COMMENT ON COLUMN public."staff_shift_request"."status" IS 'Trạng thái phê duyệt (chờ duyệt, đã duyệt, từ chối).';
COMMENT ON COLUMN public."staff_shift_request"."created_by" IS 'Người khởi tạo yêu cầu.';
COMMENT ON COLUMN public."staff_shift_request"."reviewed_by" IS 'Quản lý thực hiện xét duyệt yêu cầu.';
COMMENT ON COLUMN public."staff_shift_request"."reviewed_at" IS 'Thời điểm xét duyệt yêu cầu.';
COMMENT ON COLUMN public."staff_shift_request"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."promotion" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "promotion_name" text NOT NULL,
 "description" text,
 "discount_type" text NOT NULL,
 "discount_value" numeric(18,4) NOT NULL,
 "start_date" date NOT NULL,
 "end_date" date NOT NULL,
 "minimum_order_value" numeric(18,4) NOT NULL DEFAULT 0,
 "status" text NOT NULL DEFAULT 'pending',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."promotion" IS 'Lưu các chương trình khuyến mãi đang áp dụng';
COMMENT ON COLUMN public."promotion"."id" IS 'Mã định danh duy nhất của chương trình.';
COMMENT ON COLUMN public."promotion"."promotion_name" IS 'Tên chương trình khuyến mãi hiển thị trên hệ thống.';
COMMENT ON COLUMN public."promotion"."description" IS 'Mô tả nội dung và điều kiện của chương trình.';
COMMENT ON COLUMN public."promotion"."discount_type" IS 'Cách tính mức giảm giá của chương trình.';
COMMENT ON COLUMN public."promotion"."discount_value" IS 'Mức giảm theo phần trăm hoặc số tiền cố định.';
COMMENT ON COLUMN public."promotion"."start_date" IS 'Ngày bắt đầu chương trình khuyến mãi.';
COMMENT ON COLUMN public."promotion"."end_date" IS 'Ngày kết thúc chương trình khuyến mãi.';
COMMENT ON COLUMN public."promotion"."minimum_order_value" IS 'Giá trị đơn hàng tối thiểu để được hưởng khuyến mãi.';
COMMENT ON COLUMN public."promotion"."status" IS 'Trạng thái vận hành của chương trình.';
COMMENT ON COLUMN public."promotion"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."promotion"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."promotion_product" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "promotion_id" uuid NOT NULL,
 "product_variant_id" uuid NOT NULL,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."promotion_product" IS 'Lưu danh sách sản phẩm được áp dụng trong chương trình khuyến mãi';
COMMENT ON COLUMN public."promotion_product"."id" IS 'Mã định danh bản ghi áp dụng khuyến mãi cho sản phẩm.';
COMMENT ON COLUMN public."promotion_product"."promotion_id" IS 'Chương trình khuyến mãi được áp dụng.';
COMMENT ON COLUMN public."promotion_product"."product_variant_id" IS 'Biến thể sản phẩm cụ thể được hưởng khuyến mãi.';
CREATE TABLE public."promotion_service" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "promotion_id" uuid NOT NULL,
 "service_id" uuid NOT NULL,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."promotion_service" IS 'Lưu danh sách dịch vụ được áp dụng trong chương trình khuyến mãi';
COMMENT ON COLUMN public."promotion_service"."id" IS 'Mã định danh bản ghi áp dụng khuyến mãi cho dịch vụ.';
COMMENT ON COLUMN public."promotion_service"."promotion_id" IS 'Chương trình khuyến mãi được áp dụng.';
COMMENT ON COLUMN public."promotion_service"."service_id" IS 'Dịch vụ được hưởng khuyến mãi.';
CREATE TABLE public."banner" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "image_url" text NOT NULL,
 "title" text NOT NULL,
 "description" text,
 "link" text,
 "button_text" text,
 "display_order" integer NOT NULL DEFAULT 0,
 "start_date" date,
 "end_date" date,
 "status" text NOT NULL DEFAULT 'pending',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."banner" IS 'Lưu thông tin Banner quảng bá hiển thị trên website, gồm hình ảnh, tiêu đề, liên kết và thời gian hiển thị.';
COMMENT ON COLUMN public."banner"."id" IS 'Mã định danh duy nhất của banner.';
COMMENT ON COLUMN public."banner"."image_url" IS 'Hình ảnh banner được hiển thị trên website.';
COMMENT ON COLUMN public."banner"."title" IS 'Tiêu đề chính hiển thị trên banner.';
COMMENT ON COLUMN public."banner"."description" IS 'Mô tả hoặc thông điệp khuyến mãi trên banner.';
COMMENT ON COLUMN public."banner"."link" IS 'Đường dẫn đến trang đích khi khách hàng bấm banner.';
COMMENT ON COLUMN public."banner"."button_text" IS 'Nội dung nút kêu gọi hành động trên banner.';
COMMENT ON COLUMN public."banner"."display_order" IS 'Thứ tự banner trong khu vực hiển thị.';
COMMENT ON COLUMN public."banner"."start_date" IS 'Ngày bắt đầu hiển thị banner.';
COMMENT ON COLUMN public."banner"."end_date" IS 'Ngày kết thúc hiển thị banner.';
COMMENT ON COLUMN public."banner"."status" IS 'Trạng thái hiển thị của banner.';
COMMENT ON COLUMN public."banner"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."banner"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."blog_category" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "category_name" text NOT NULL,
 "description" text,
 "display_order" integer NOT NULL DEFAULT 0,
 "status" text NOT NULL DEFAULT 'active',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."blog_category" IS 'Lưu danh mục bài viết';
COMMENT ON COLUMN public."blog_category"."id" IS 'Mã định danh duy nhất của danh mục.';
COMMENT ON COLUMN public."blog_category"."category_name" IS 'Tên danh mục bài viết.';
COMMENT ON COLUMN public."blog_category"."description" IS 'Mô tả phạm vi nội dung của danh mục.';
COMMENT ON COLUMN public."blog_category"."display_order" IS 'Thứ tự hiển thị danh mục trên website.';
COMMENT ON COLUMN public."blog_category"."status" IS 'Trạng thái sử dụng của danh mục.';
COMMENT ON COLUMN public."blog_category"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."blog_category"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."blog_post" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "category_id" uuid NOT NULL,
 "title" text NOT NULL,
 "slug" text NOT NULL UNIQUE,
 "summary" text,
 "content" text NOT NULL,
 "thumbnail_url" text,
 "author_id" uuid NOT NULL,
 "publish_at" timestamptz,
 "status" text NOT NULL DEFAULT 'pending',
 "view_count" integer NOT NULL DEFAULT 0,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."blog_post" IS 'Lưu bài viết chia sẻ kiến thức và tin tức trên website';
COMMENT ON COLUMN public."blog_post"."id" IS 'Mã định danh duy nhất của bài viết.';
COMMENT ON COLUMN public."blog_post"."category_id" IS 'Danh mục bài viết mà bài viết thuộc về.';
COMMENT ON COLUMN public."blog_post"."title" IS 'Tiêu đề bài viết hiển thị trên website.';
COMMENT ON COLUMN public."blog_post"."slug" IS 'Đường dẫn thân thiện dùng để truy cập bài viết.';
COMMENT ON COLUMN public."blog_post"."summary" IS 'Phần tóm tắt ngắn dùng ở danh sách bài viết.';
COMMENT ON COLUMN public."blog_post"."content" IS 'Nội dung đầy đủ của bài viết.';
COMMENT ON COLUMN public."blog_post"."thumbnail_url" IS 'Hình ảnh đại diện của bài viết.';
COMMENT ON COLUMN public."blog_post"."author_id" IS 'Nhân viên chịu trách nhiệm biên soạn hoặc đăng bài.';
COMMENT ON COLUMN public."blog_post"."publish_at" IS 'Thời điểm bài viết được công khai trên website.';
COMMENT ON COLUMN public."blog_post"."status" IS 'Trạng thái xuất bản của bài viết.';
COMMENT ON COLUMN public."blog_post"."view_count" IS 'Số lượt xem bài viết.';
COMMENT ON COLUMN public."blog_post"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."blog_post"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."notification" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "customer_id" uuid NOT NULL,
 "notification_type" text NOT NULL,
 "title" text NOT NULL,
 "content" text NOT NULL,
 "sales_order_id" uuid,
 "appointment_id" uuid,
 "support_ticket_id" uuid,
 "refund_transaction_id" uuid,
 "sent_at" timestamptz NOT NULL DEFAULT now(),
 "read_at" timestamptz,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."notification" IS 'Lưu các thông báo gửi đến khách hàng về trạng thái đơn hàng, lịch hẹn, yêu cầu hỗ trợ và giao dịch hoàn tiền; các FK liên quan giúp xác định chính xác đối tượng mà thông báo dẫn đến.';
COMMENT ON COLUMN public."notification"."id" IS 'Mã định danh duy nhất của thông báo.';
COMMENT ON COLUMN public."notification"."customer_id" IS 'Khách hàng nhận thông báo.';
COMMENT ON COLUMN public."notification"."notification_type" IS 'Loại sự kiện tạo ra thông báo.';
COMMENT ON COLUMN public."notification"."title" IS 'Tiêu đề ngắn hiển thị trong danh sách thông báo.';
COMMENT ON COLUMN public."notification"."content" IS 'Nội dung chi tiết giúp khách hàng hiểu sự kiện đã xảy ra.';
COMMENT ON COLUMN public."notification"."sales_order_id" IS 'Đơn hàng liên quan đến thông báo.';
COMMENT ON COLUMN public."notification"."appointment_id" IS 'Lịch hẹn liên quan đến thông báo.';
COMMENT ON COLUMN public."notification"."support_ticket_id" IS 'Yêu cầu hỗ trợ liên quan đến thông báo.';
COMMENT ON COLUMN public."notification"."refund_transaction_id" IS 'Giao dịch hoàn tiền liên quan đến thông báo.';
COMMENT ON COLUMN public."notification"."sent_at" IS 'Thời điểm thông báo được gửi/ghi nhận thành công.';
COMMENT ON COLUMN public."notification"."read_at" IS 'Thời điểm khách hàng đọc thông báo.';
CREATE TABLE public."pawpal_setting" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "setting_key" text NOT NULL UNIQUE,
 "setting_value" text NOT NULL,
 "setting_type" text NOT NULL,
 "description" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."pawpal_setting" IS 'Lưu các cấu hình chung của website như hotline, popup, top-bar và các thiết lập hệ thống khác.';
COMMENT ON COLUMN public."pawpal_setting"."id" IS 'Mã định danh duy nhất của cấu hình.';
COMMENT ON COLUMN public."pawpal_setting"."setting_key" IS 'Mã khóa duy nhất dùng để truy xuất cấu hình trong hệ thống.';
COMMENT ON COLUMN public."pawpal_setting"."setting_value" IS 'Giá trị cấu hình được lưu theo kiểu dữ liệu đã khai báo.';
COMMENT ON COLUMN public."pawpal_setting"."setting_type" IS 'Kiểu dữ liệu thực tế của setting_value.';
COMMENT ON COLUMN public."pawpal_setting"."description" IS 'Giải thích mục đích và phạm vi sử dụng của cấu hình.';
COMMENT ON COLUMN public."pawpal_setting"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."pawpal_setting"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."audit_log" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "staff_id" uuid,
 "action" text NOT NULL,
 "entity_name" text,
 "entity_id" uuid,
 "description" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."audit_log" IS 'Lưu lịch sử thao tác quan trọng của nhân viên nhằm phục vụ kiểm tra và truy vết hệ thống';
COMMENT ON COLUMN public."audit_log"."id" IS 'Mã định danh duy nhất của bản ghi audit.';
COMMENT ON COLUMN public."audit_log"."staff_id" IS 'Nhân viên thực hiện thao tác.';
COMMENT ON COLUMN public."audit_log"."action" IS 'Loại hành động đã thực hiện, ví dụ tạo, cập nhật, xóa hoặc duyệt.';
COMMENT ON COLUMN public."audit_log"."entity_name" IS 'Tên thực thể bị tác động.';
COMMENT ON COLUMN public."audit_log"."entity_id" IS 'Mã bản ghi cụ thể bị tác động.';
COMMENT ON COLUMN public."audit_log"."description" IS 'Mô tả chi tiết thao tác và thay đổi quan trọng.';
COMMENT ON COLUMN public."audit_log"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."chat_conversation" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "customer_id" uuid,
 "status" text NOT NULL DEFAULT 'pending',
 "sentiment_level" integer NOT NULL,
 "sentiment_trend" text NOT NULL,
 "is_urgent" boolean NOT NULL DEFAULT false,
 "assigned_staff_id" uuid,
 "ai_summary" text,
 "internal_note" text,
 "sla_deadline" timestamptz,
 "resolved_at" timestamptz,
 "resolved_reason" text,
 "resolved_by" uuid,
 "violation_count" integer NOT NULL DEFAULT 0,
 "blocked_until" timestamptz,
 "channel" text NOT NULL,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "guest_session_id" uuid,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chat_conversation" IS 'Quản lý các phiên hội thoại trực tuyến giữa khách hàng và AI Chatbot hoặc nhân viên tư vấn';
COMMENT ON COLUMN public."chat_conversation"."id" IS 'Mã định danh duy nhất của phiên hội thoại.';
COMMENT ON COLUMN public."chat_conversation"."customer_id" IS 'Khách hàng tham gia hội thoại.';
COMMENT ON COLUMN public."chat_conversation"."status" IS 'Trạng thái phiên (đang mở, chờ xử lý, đã đóng).';
COMMENT ON COLUMN public."chat_conversation"."sentiment_level" IS 'Cấp độ cảm xúc hiện tại của khách hàng.';
COMMENT ON COLUMN public."chat_conversation"."sentiment_trend" IS 'Xu hướng cảm xúc (tích cực, tiêu cực, leo thang).';
COMMENT ON COLUMN public."chat_conversation"."is_urgent" IS 'Đánh dấu phiên hội thoại khẩn cấp cần can thiệp.';
COMMENT ON COLUMN public."chat_conversation"."assigned_staff_id" IS 'Nhân viên CSKH tiếp nhận xử lý phiên.';
COMMENT ON COLUMN public."chat_conversation"."ai_summary" IS 'Tóm tắt nội dung hội thoại tự động bởi AI.';
COMMENT ON COLUMN public."chat_conversation"."internal_note" IS 'Ghi chú nội bộ giữa các nhân viên hỗ trợ.';
COMMENT ON COLUMN public."chat_conversation"."sla_deadline" IS 'Hạn chót thời gian cam kết phản hồi (SLA).';
COMMENT ON COLUMN public."chat_conversation"."resolved_at" IS 'Thời điểm hội thoại được đóng thực tế.';
COMMENT ON COLUMN public."chat_conversation"."resolved_reason" IS 'Lý do đóng hội thoại.';
COMMENT ON COLUMN public."chat_conversation"."resolved_by" IS 'Nhân viên đóng hội thoại.';
COMMENT ON COLUMN public."chat_conversation"."violation_count" IS 'Số lần vi phạm quy tắc ngôn từ của phiên.';
COMMENT ON COLUMN public."chat_conversation"."blocked_until" IS 'Thời gian tạm khóa người dùng nếu vi phạm nặng.';
COMMENT ON COLUMN public."chat_conversation"."channel" IS 'Kênh tiếp nhận hội thoại (web, zalo, facebook).';
COMMENT ON COLUMN public."chat_conversation"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."chat_conversation"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
COMMENT ON COLUMN public."chat_conversation"."guest_session_id" IS 'Phiên của khách vãng lai; có thể được giữ để truy vết sau khi khách đăng nhập.';
CREATE TABLE public."chat_message" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "conversation_id" uuid NOT NULL,
 "sender_type" text NOT NULL,
 "content" text NOT NULL,
 "raw_content" text,
 "is_toxic" boolean NOT NULL DEFAULT false,
 "sentiment_score" numeric(18,4) NOT NULL,
 "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "sender_account_id" uuid,
 "sender_guest_session_id" uuid,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chat_message" IS 'Lưu từng tin nhắn chi tiết trong các phiên hội thoại chat';
COMMENT ON COLUMN public."chat_message"."id" IS 'Mã định danh duy nhất của tin nhắn.';
COMMENT ON COLUMN public."chat_message"."conversation_id" IS 'Phiên hội thoại chứa tin nhắn.';
COMMENT ON COLUMN public."chat_message"."sender_type" IS 'Đối tượng gửi (khách hàng, bot, nhân viên).';
COMMENT ON COLUMN public."chat_message"."content" IS 'Nội dung tin nhắn sau khi đã lọc kiểm duyệt.';
COMMENT ON COLUMN public."chat_message"."raw_content" IS 'Nội dung gốc trước khi xử lý lọc từ khóa.';
COMMENT ON COLUMN public."chat_message"."is_toxic" IS 'Đánh dấu tin nhắn chứa từ ngữ công kích hoặc tiêu cực.';
COMMENT ON COLUMN public."chat_message"."sentiment_score" IS 'Điểm số đánh giá cảm xúc của tin nhắn.';
COMMENT ON COLUMN public."chat_message"."metadata" IS 'Dữ liệu đính kèm dạng JSON (nút gợi ý, thẻ sản phẩm).';
COMMENT ON COLUMN public."chat_message"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."chat_message"."sender_account_id" IS 'Tài khoản gửi tin; NULL với phiên vãng lai hoặc bot/hệ thống.';
COMMENT ON COLUMN public."chat_message"."sender_guest_session_id" IS 'Phiên vãng lai gửi tin; NULL với tài khoản hoặc bot/hệ thống.';
CREATE TABLE public."chat_moderation_log" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "conversation_id" uuid NOT NULL,
 "customer_id" uuid,
 "detected_keywords" text[] NOT NULL DEFAULT '{}'::text[],
 "violation_count" integer NOT NULL DEFAULT 0,
 "action_taken" text NOT NULL,
 "notes" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chat_moderation_log" IS 'Nhật ký kiểm duyệt nội dung tin nhắn và ghi nhận các vi phạm quy chuẩn giao tiếp';
COMMENT ON COLUMN public."chat_moderation_log"."id" IS 'Mã định danh duy nhất của bản ghi kiểm duyệt.';
COMMENT ON COLUMN public."chat_moderation_log"."conversation_id" IS 'Phiên hội thoại xảy ra vi phạm.';
COMMENT ON COLUMN public."chat_moderation_log"."customer_id" IS 'Khách hàng có tin nhắn vi phạm.';
COMMENT ON COLUMN public."chat_moderation_log"."detected_keywords" IS 'Danh sách từ khóa vi phạm được phát hiện.';
COMMENT ON COLUMN public."chat_moderation_log"."violation_count" IS 'Số lần vi phạm cộng dồn của khách hàng.';
COMMENT ON COLUMN public."chat_moderation_log"."action_taken" IS 'Biện pháp đã xử lý (cảnh báo, che từ, chặn tạm thời).';
COMMENT ON COLUMN public."chat_moderation_log"."notes" IS 'Ghi chú thêm về bối cảnh vi phạm.';
COMMENT ON COLUMN public."chat_moderation_log"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."chat_feedback" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "conversation_id" uuid NOT NULL UNIQUE,
 "score" smallint NOT NULL,
 "comment" text,
 "submitted_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chat_feedback" IS 'Ghi nhận một đánh giá hài lòng cho mỗi hội thoại.';
COMMENT ON COLUMN public."chat_feedback"."id" IS 'Mã đánh giá hội thoại.';
COMMENT ON COLUMN public."chat_feedback"."conversation_id" IS 'Hội thoại được đánh giá, duy nhất.';
COMMENT ON COLUMN public."chat_feedback"."score" IS 'Mức hài lòng từ 1 đến 5.';
COMMENT ON COLUMN public."chat_feedback"."comment" IS 'Nhận xét bổ sung của người tham gia.';
COMMENT ON COLUMN public."chat_feedback"."submitted_at" IS 'Thời điểm gửi đánh giá.';
CREATE TABLE public."admin_copilot_history" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "session_id" uuid NOT NULL,
 "staff_id" uuid NOT NULL,
 "role" text NOT NULL,
 "content" text NOT NULL,
 "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."admin_copilot_history" IS 'Lưu tin nhắn trợ lý nội bộ theo phiên của từng nhân viên.';
COMMENT ON COLUMN public."admin_copilot_history"."id" IS 'Mã tin nhắn trợ lý.';
COMMENT ON COLUMN public."admin_copilot_history"."session_id" IS 'Mã nhóm phiên trao đổi của nhân viên, không phải token đăng nhập.';
COMMENT ON COLUMN public."admin_copilot_history"."staff_id" IS 'Nhân viên sở hữu phiên trao đổi.';
COMMENT ON COLUMN public."admin_copilot_history"."role" IS 'Vai trò tin nhắn người dùng, trợ lý hoặc hệ thống.';
COMMENT ON COLUMN public."admin_copilot_history"."content" IS 'Nội dung tin nhắn.';
COMMENT ON COLUMN public."admin_copilot_history"."metadata" IS 'Thông tin ngữ cảnh bổ trợ; không thay các quan hệ nghiệp vụ.';
COMMENT ON COLUMN public."admin_copilot_history"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."chatbot_sentiment_tier" (
 "level" integer NOT NULL,
 "name" text NOT NULL,
 "color_badge" text NOT NULL,
 "sla_seconds" integer NOT NULL,
 "description" text,
 PRIMARY KEY ("level")
);
COMMENT ON TABLE public."chatbot_sentiment_tier" IS 'Bảng phân tầng các cấp độ cảm xúc của khách hàng (Bình thường, Bức xúc, Khẩn cấp) kèm cam kết phản hồi SLA';
COMMENT ON COLUMN public."chatbot_sentiment_tier"."level" IS 'Cấp độ cảm xúc (mã số hoặc định danh tầng).';
COMMENT ON COLUMN public."chatbot_sentiment_tier"."name" IS 'Tên hiển thị của tầng cảm xúc.';
COMMENT ON COLUMN public."chatbot_sentiment_tier"."color_badge" IS 'Mã màu hiển thị thẻ nhãn cảm xúc.';
COMMENT ON COLUMN public."chatbot_sentiment_tier"."sla_seconds" IS 'Thời hạn cam kết phản hồi tối đa tính bằng giây.';
COMMENT ON COLUMN public."chatbot_sentiment_tier"."description" IS 'Mô tả tiêu chuẩn và dấu hiệu nhận biết cấp độ.';
CREATE TABLE public."chatbot_sentiment_trigger" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "tier_level" integer NOT NULL,
 "trigger_pattern" text NOT NULL,
 "weight" numeric(10,4) NOT NULL,
 "context_domain" text NOT NULL,
 "is_active" boolean NOT NULL DEFAULT true,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chatbot_sentiment_trigger" IS 'Danh sách các mẫu từ khóa và biểu thức nhận diện cảm xúc khách hàng của hệ thống AI Chatbot';
COMMENT ON COLUMN public."chatbot_sentiment_trigger"."id" IS 'Mã định danh quy tắc kích hoạt.';
COMMENT ON COLUMN public."chatbot_sentiment_trigger"."tier_level" IS 'Cấp độ cảm xúc tương ứng khi kích hoạt.';
COMMENT ON COLUMN public."chatbot_sentiment_trigger"."trigger_pattern" IS 'Mẫu từ khóa hoặc cụm từ nhận diện.';
COMMENT ON COLUMN public."chatbot_sentiment_trigger"."weight" IS 'Trọng số đánh giá mức độ ảnh hưởng.';
COMMENT ON COLUMN public."chatbot_sentiment_trigger"."context_domain" IS 'Ngữ cảnh áp dụng (giá cả, chất lượng, giao hàng, thái độ).';
COMMENT ON COLUMN public."chatbot_sentiment_trigger"."is_active" IS 'Trạng thái kích hoạt sử dụng quy tắc.';
CREATE TABLE public."chatbot_sentiment_action" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "tier_level" integer NOT NULL,
 "bot_behavior" text NOT NULL,
 "notify_admin" boolean NOT NULL DEFAULT false,
 "suggested_canned_id" uuid,
 "instructions" text,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chatbot_sentiment_action" IS 'Quy định các hành vi phản ứng tự động của chatbot tương ứng với từng cấp độ cảm xúc';
COMMENT ON COLUMN public."chatbot_sentiment_action"."id" IS 'Mã định danh hành vi ứng phó.';
COMMENT ON COLUMN public."chatbot_sentiment_action"."tier_level" IS 'Cấp độ cảm xúc kích hoạt hành động.';
COMMENT ON COLUMN public."chatbot_sentiment_action"."bot_behavior" IS 'Hành vi của bot (xoa dịu, xin lỗi, đề xuất đền bù).';
COMMENT ON COLUMN public."chatbot_sentiment_action"."notify_admin" IS 'Cờ bật thông báo khẩn cho quản trị viên.';
COMMENT ON COLUMN public."chatbot_sentiment_action"."suggested_canned_id" IS 'Mã câu trả lời mẫu gợi ý cho nhân viên.';
COMMENT ON COLUMN public."chatbot_sentiment_action"."instructions" IS 'Hướng dẫn xử lý nghiệp vụ cho nhân viên CSKH.';
CREATE TABLE public."chatbot_compensation_policy" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "issue_type" text NOT NULL,
 "max_points" integer NOT NULL,
 "max_discount_vnd" numeric(18,4) NOT NULL,
 "approval_required" boolean NOT NULL DEFAULT false,
 "description" text,
 "is_active" boolean NOT NULL DEFAULT true,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chatbot_compensation_policy" IS 'Chính sách đền bù và tặng điểm Pawpoint tự động khi khách hàng gặp sự cố dịch vụ';
COMMENT ON COLUMN public."chatbot_compensation_policy"."id" IS 'Mã định danh chính sách đền bù.';
COMMENT ON COLUMN public."chatbot_compensation_policy"."issue_type" IS 'Loại sự cố (trễ hẹn, sản phẩm lỗi, dịch vụ chưa đạt).';
COMMENT ON COLUMN public."chatbot_compensation_policy"."max_points" IS 'Số điểm Pawpoint tối đa được phép đền bù tự động.';
COMMENT ON COLUMN public."chatbot_compensation_policy"."max_discount_vnd" IS 'Số tiền giảm giá tối đa được áp dụng.';
COMMENT ON COLUMN public."chatbot_compensation_policy"."approval_required" IS 'Cờ yêu cầu quản trị viên duyệt trước khi cấp.';
COMMENT ON COLUMN public."chatbot_compensation_policy"."description" IS 'Mô tả chi tiết điều kiện và hạn mức áp dụng.';
COMMENT ON COLUMN public."chatbot_compensation_policy"."is_active" IS 'Trạng thái hiệu lực của chính sách.';
CREATE TABLE public."chatbot_handover_rule" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "condition_name" text NOT NULL,
 "trigger_type" text NOT NULL,
 "threshold_value" numeric(18,4) NOT NULL,
 "auto_assign_role" text,
 "sla_seconds" integer NOT NULL,
 "is_active" boolean NOT NULL DEFAULT true,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chatbot_handover_rule" IS 'Quy tắc tự động bàn giao cuộc trò chuyện từ Bot sang nhân viên chuyên môn như KTV Grooming hoặc CSKH; không có thú y.';
COMMENT ON COLUMN public."chatbot_handover_rule"."id" IS 'Mã định danh quy tắc chuyển tiếp.';
COMMENT ON COLUMN public."chatbot_handover_rule"."condition_name" IS 'Tên điều kiện chuyển tiếp.';
COMMENT ON COLUMN public."chatbot_handover_rule"."trigger_type" IS 'Loại kích hoạt (cảm xúc tiêu cực, từ khóa chuyên sâu, yêu cầu trực tiếp).';
COMMENT ON COLUMN public."chatbot_handover_rule"."threshold_value" IS 'Ngưỡng kích hoạt.';
COMMENT ON COLUMN public."chatbot_handover_rule"."auto_assign_role" IS 'Vai trò nhân viên tiếp nhận (CSKH, KTV, Quản lý).';
COMMENT ON COLUMN public."chatbot_handover_rule"."sla_seconds" IS 'Thời gian cam kết tiếp nhận ca sau khi bàn giao.';
COMMENT ON COLUMN public."chatbot_handover_rule"."is_active" IS 'Trạng thái kích hoạt quy tắc.';
CREATE TABLE public."chatbot_knowledge_faq" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "category" text NOT NULL,
 "question" text NOT NULL,
 "answer" text NOT NULL,
 "keywords" text[] NOT NULL DEFAULT '{}'::text[],
 "priority" integer NOT NULL,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chatbot_knowledge_faq" IS 'Kho tri thức các câu hỏi thường gặp FAQ phục vụ giải đáp tự động cho khách hàng';
COMMENT ON COLUMN public."chatbot_knowledge_faq"."id" IS 'Mã định danh câu hỏi tri thức.';
COMMENT ON COLUMN public."chatbot_knowledge_faq"."category" IS 'Chuyên mục (dịch vụ, sản phẩm, chính sách đổi trả, bảng giá).';
COMMENT ON COLUMN public."chatbot_knowledge_faq"."question" IS 'Nội dung câu hỏi thường gặp.';
COMMENT ON COLUMN public."chatbot_knowledge_faq"."answer" IS 'Câu trả lời chuẩn mực đã được kiểm duyệt.';
COMMENT ON COLUMN public."chatbot_knowledge_faq"."keywords" IS 'Từ khóa liên quan hỗ trợ tìm kiếm nhanh.';
COMMENT ON COLUMN public."chatbot_knowledge_faq"."priority" IS 'Thứ tự ưu tiên hiển thị và đối soát.';
COMMENT ON COLUMN public."chatbot_knowledge_faq"."is_active" IS 'Trạng thái sử dụng câu hỏi tri thức.';
COMMENT ON COLUMN public."chatbot_knowledge_faq"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."chatbot_knowledge_faq"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."chatbot_system_prompt" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "prompt_key" text NOT NULL UNIQUE,
 "channel" text NOT NULL,
 "persona_name" text NOT NULL,
 "tone_of_voice" text NOT NULL,
 "content" text NOT NULL,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chatbot_system_prompt" IS 'Quản lý các System Prompt cấu hình nhân cách (Persona), phong cách giao tiếp và hướng dẫn hành vi của AI Chatbot';
COMMENT ON COLUMN public."chatbot_system_prompt"."id" IS 'Mã định danh cấu hình Prompt.';
COMMENT ON COLUMN public."chatbot_system_prompt"."prompt_key" IS 'Mã khóa định danh prompt trong hệ thống.';
COMMENT ON COLUMN public."chatbot_system_prompt"."channel" IS 'Kênh ứng dụng áp dụng prompt.';
COMMENT ON COLUMN public."chatbot_system_prompt"."persona_name" IS 'Tên nhân cách của trợ lý ảo (Pawpal Assistant).';
COMMENT ON COLUMN public."chatbot_system_prompt"."tone_of_voice" IS 'Tông giọng giao tiếp (thân thiện, chuyên nghiệp, ân cần).';
COMMENT ON COLUMN public."chatbot_system_prompt"."content" IS 'Toàn văn nội dung Prompt hệ thống.';
COMMENT ON COLUMN public."chatbot_system_prompt"."is_active" IS 'Trạng thái hiệu lực của prompt.';
COMMENT ON COLUMN public."chatbot_system_prompt"."created_at" IS 'Thời điểm tạo bản ghi.';
COMMENT ON COLUMN public."chatbot_system_prompt"."updated_at" IS 'Thời điểm cập nhật gần nhất.';
CREATE TABLE public."chatbot_canned_response" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "shortcut" text NOT NULL,
 "title" text NOT NULL,
 "content" text NOT NULL,
 "category" text NOT NULL,
 "usage_count" integer NOT NULL DEFAULT 0,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chatbot_canned_response" IS 'Danh mục các câu trả lời nhanh soạn sẵn cho nhân viên CSKH và Chatbot';
COMMENT ON COLUMN public."chatbot_canned_response"."id" IS 'Mã định danh câu trả lời nhanh.';
COMMENT ON COLUMN public."chatbot_canned_response"."shortcut" IS 'Phím tắt gõ nhanh.';
COMMENT ON COLUMN public."chatbot_canned_response"."title" IS 'Tiêu đề gợi nhớ.';
COMMENT ON COLUMN public."chatbot_canned_response"."content" IS 'Nội dung mẫu phản hồi đầy đủ.';
COMMENT ON COLUMN public."chatbot_canned_response"."category" IS 'Chuyên mục phân loại tin nhắn.';
COMMENT ON COLUMN public."chatbot_canned_response"."usage_count" IS 'Số lượt sử dụng thực tế.';
COMMENT ON COLUMN public."chatbot_canned_response"."is_active" IS 'Trạng thái khả dụng.';
COMMENT ON COLUMN public."chatbot_canned_response"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."chatbot_profanity_filter" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "keyword" text NOT NULL,
 "severity" text NOT NULL,
 "action" text NOT NULL,
 "replacement_text" text,
 "is_active" boolean NOT NULL DEFAULT true,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chatbot_profanity_filter" IS 'Danh mục các từ ngữ nhạy cảm, thô tục cần tự động che hoặc chặn trong phiên chat';
COMMENT ON COLUMN public."chatbot_profanity_filter"."id" IS 'Mã định danh từ khóa lọc.';
COMMENT ON COLUMN public."chatbot_profanity_filter"."keyword" IS 'Từ hoặc cụm từ nhạy cảm.';
COMMENT ON COLUMN public."chatbot_profanity_filter"."severity" IS 'Mức độ nghiêm trọng của vi phạm.';
COMMENT ON COLUMN public."chatbot_profanity_filter"."action" IS 'Hành động xử lý (thay thế ký tự sao, chặn gửi tin, cảnh báo).';
COMMENT ON COLUMN public."chatbot_profanity_filter"."replacement_text" IS 'Chuỗi ký tự dùng để thay thế.';
COMMENT ON COLUMN public."chatbot_profanity_filter"."is_active" IS 'Trạng thái kích hoạt bộ lọc.';
COMMENT ON COLUMN public."chatbot_profanity_filter"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."chatbot_scenario_matrix" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "scenario_name" text NOT NULL,
 "sample_user_input" text NOT NULL,
 "expected_sentiment" integer NOT NULL,
 "expected_tool_call" text,
 "expected_handover" boolean NOT NULL DEFAULT false,
 "benchmark_status" text NOT NULL DEFAULT 'pending',
 "created_at" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."chatbot_scenario_matrix" IS 'Ma trận các kịch bản kiểm thử (benchmark) đánh giá chất lượng phản hồi và độ chính xác của AI Chatbot';
COMMENT ON COLUMN public."chatbot_scenario_matrix"."id" IS 'Mã định danh kịch bản kiểm định.';
COMMENT ON COLUMN public."chatbot_scenario_matrix"."scenario_name" IS 'Tên kịch bản thử nghiệm.';
COMMENT ON COLUMN public."chatbot_scenario_matrix"."sample_user_input" IS 'Câu nói mẫu của khách hàng thử nghiệm.';
COMMENT ON COLUMN public."chatbot_scenario_matrix"."expected_sentiment" IS 'Cảm xúc mong đợi hệ thống nhận diện.';
COMMENT ON COLUMN public."chatbot_scenario_matrix"."expected_tool_call" IS 'Công cụ/hàm nghiệp vụ mong đợi bot gọi.';
COMMENT ON COLUMN public."chatbot_scenario_matrix"."expected_handover" IS 'Kỳ vọng có chuyển giao cho người thật hay không.';
COMMENT ON COLUMN public."chatbot_scenario_matrix"."benchmark_status" IS 'Kết quả đánh giá kiểm thử (đạt, chưa đạt).';
COMMENT ON COLUMN public."chatbot_scenario_matrix"."created_at" IS 'Thời điểm tạo bản ghi.';
CREATE TABLE public."document_embeddings" (
 "id" uuid NOT NULL DEFAULT gen_random_uuid(),
 "content" text NOT NULL,
 "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "embedding" extensions.vector NOT NULL,
 PRIMARY KEY ("id")
);
COMMENT ON TABLE public."document_embeddings" IS 'Bảng lưu trữ vector embedding các đoạn tài liệu chính sách, cẩm nang chăm sóc thú cưng phục vụ tra cứu ngữ nghĩa RAG cho AI';
COMMENT ON COLUMN public."document_embeddings"."id" IS 'Mã định danh duy nhất của vector tài liệu.';
COMMENT ON COLUMN public."document_embeddings"."content" IS 'Nội dung văn bản được chia đoạn.';
COMMENT ON COLUMN public."document_embeddings"."metadata" IS 'Thông tin ngữ cảnh và nguồn tài liệu.';
COMMENT ON COLUMN public."document_embeddings"."embedding" IS 'Vector số học đại diện ngữ nghĩa của đoạn văn bản.';
ALTER TABLE public."guest_session" ADD CHECK (length(btrim("token_hash"))>0);
ALTER TABLE public."permission" ADD CHECK (length(btrim("code"))>0);
ALTER TABLE public."access_role" ADD CHECK (length(btrim("code"))>0);
ALTER TABLE public."access_role" ADD CHECK (length(btrim("role_name"))>0);
ALTER TABLE public."role_permission" ADD FOREIGN KEY ("role_code") REFERENCES public.access_role(code) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_4eb610d5883f3e6752 ON public."role_permission" ("role_code");
ALTER TABLE public."role_permission" ADD CHECK (length(btrim("role_code"))>0);
ALTER TABLE public."role_permission" ADD FOREIGN KEY ("permission_code") REFERENCES public.permission(code) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_d690a1fb46a350475a ON public."role_permission" ("permission_code");
ALTER TABLE public."role_permission" ADD CHECK (length(btrim("permission_code"))>0);
ALTER TABLE public."staff_role" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_ae6aa412d5b1ebc784 ON public."staff_role" ("staff_id");
ALTER TABLE public."staff_role" ADD FOREIGN KEY ("role_code") REFERENCES public.access_role(code) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_6dfe5a2bfd64887d13 ON public."staff_role" ("role_code");
ALTER TABLE public."staff_role" ADD CHECK (length(btrim("role_code"))>0);
ALTER TABLE public."staff_permission" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_5a443ef9800b9cf8c3 ON public."staff_permission" ("staff_id");
ALTER TABLE public."staff_permission" ADD FOREIGN KEY ("permission_code") REFERENCES public.permission(code) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_4e2b43760345ff33a7 ON public."staff_permission" ("permission_code");
ALTER TABLE public."staff_permission" ADD CHECK (length(btrim("permission_code"))>0);
ALTER TABLE public."customer" ADD FOREIGN KEY ("auth_user_id") REFERENCES auth.users(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_35a91f2ed61eb91e09 ON public."customer" ("auth_user_id");
ALTER TABLE public."customer" ADD CHECK (length(btrim("customer_code"))>0);
ALTER TABLE public."customer" ADD CHECK (length(btrim("customer_status"))>0);
ALTER TABLE public."customer_profile" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_475e2047db570cb186 ON public."customer_profile" ("customer_id");
ALTER TABLE public."customer_profile" ADD CHECK (length(btrim("full_name"))>0);
ALTER TABLE public."customer_phone" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_6891e6c20f9d89aa19 ON public."customer_phone" ("customer_id");
ALTER TABLE public."customer_phone" ADD CHECK (length(btrim("phone_number"))>0);
ALTER TABLE public."customer_address" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_c4747e7d7a3c1dcb54 ON public."customer_address" ("customer_id");
ALTER TABLE public."customer_address" ADD CHECK (length(btrim("receiver_name"))>0);
ALTER TABLE public."customer_address" ADD CHECK (length(btrim("receiver_phone"))>0);
ALTER TABLE public."customer_address" ADD CHECK (length(btrim("province"))>0);
ALTER TABLE public."customer_address" ADD CHECK (length(btrim("street_address"))>0);
ALTER TABLE public."membership_tier" ADD CHECK (length(btrim("tier_name"))>0);
ALTER TABLE public."membership_tier" ADD CHECK ("minimum_expenditure">=0);
ALTER TABLE public."membership_tier" ADD CHECK ("discount_percent">=0);
ALTER TABLE public."customer_membership" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_39675f2efc5b35fa1e ON public."customer_membership" ("customer_id");
ALTER TABLE public."customer_membership" ADD FOREIGN KEY ("membership_tier_id") REFERENCES public.membership_tier(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_4f9c9ac4666e7ae85f ON public."customer_membership" ("membership_tier_id");
ALTER TABLE public."reward_rule" ADD CHECK (length(btrim("rule_name"))>0);
ALTER TABLE public."reward_rule" ADD CHECK (length(btrim("reward_type"))>0);
ALTER TABLE public."reward_rule" ADD CHECK (length(btrim("trigger_event"))>0);
ALTER TABLE public."reward_rule" ADD CHECK ("reward_value">=0);
ALTER TABLE public."paw_point_transaction" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_852db3927afc56322f ON public."paw_point_transaction" ("customer_id");
ALTER TABLE public."paw_point_transaction" ADD FOREIGN KEY ("payment_id") REFERENCES public.payment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_347d934e0d972b4114 ON public."paw_point_transaction" ("payment_id");
ALTER TABLE public."paw_point_transaction" ADD FOREIGN KEY ("review_id") REFERENCES public.review(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_af273a8969f8a0bcb8 ON public."paw_point_transaction" ("review_id");
ALTER TABLE public."paw_point_transaction" ADD FOREIGN KEY ("reward_rule_id") REFERENCES public.reward_rule(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_e28e44706bd1276a10 ON public."paw_point_transaction" ("reward_rule_id");
ALTER TABLE public."paw_point_transaction" ADD FOREIGN KEY ("refund_transaction_id") REFERENCES public.refund_transaction(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_464c6773db186e4299 ON public."paw_point_transaction" ("refund_transaction_id");
ALTER TABLE public."paw_point_transaction" ADD FOREIGN KEY ("voucher_redemption_id") REFERENCES public.voucher_redemption(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_12ffe73197c4691238 ON public."paw_point_transaction" ("voucher_redemption_id");
ALTER TABLE public."paw_point_transaction" ADD FOREIGN KEY ("customer_voucher_id") REFERENCES public.customer_voucher(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_64f7026b29777a0560 ON public."paw_point_transaction" ("customer_voucher_id");
ALTER TABLE public."paw_point_transaction" ADD CHECK (length(btrim("idempotency_key"))>0);
ALTER TABLE public."paw_point_transaction" ADD CHECK ("sequence_no">=0);
ALTER TABLE public."voucher" ADD CHECK (length(btrim("voucher_code"))>0);
ALTER TABLE public."voucher" ADD CHECK (length(btrim("voucher_name"))>0);
ALTER TABLE public."voucher" ADD CHECK ("discount_value">=0);
ALTER TABLE public."voucher" ADD CHECK ("minimum_order_amount">=0);
ALTER TABLE public."voucher" ADD CHECK ("required_points">=0);
ALTER TABLE public."voucher" ADD CHECK (length(btrim("type"))>0);
ALTER TABLE public."voucher" ADD CHECK (length(btrim("applicable_for"))>0);
ALTER TABLE public."voucher" ADD CHECK ("max_usage">=0);
ALTER TABLE public."customer_voucher" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_9cd21cbd63c9a2d02c ON public."customer_voucher" ("customer_id");
ALTER TABLE public."customer_voucher" ADD FOREIGN KEY ("voucher_id") REFERENCES public.voucher(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_84cbfd6632cddfc3c3 ON public."customer_voucher" ("voucher_id");
ALTER TABLE public."customer_voucher" ADD CHECK (length(btrim("acquired_method"))>0);
ALTER TABLE public."customer_voucher" ADD CHECK (length(btrim("voucher_status"))>0);
ALTER TABLE public."voucher_redemption" ADD FOREIGN KEY ("customer_voucher_id") REFERENCES public.customer_voucher(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_d412156aadc3904002 ON public."voucher_redemption" ("customer_voucher_id");
ALTER TABLE public."voucher_redemption" ADD FOREIGN KEY ("voucher_id") REFERENCES public.voucher(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_206a8079fa8e2ad70d ON public."voucher_redemption" ("voucher_id");
ALTER TABLE public."voucher_redemption" ADD FOREIGN KEY ("order_id") REFERENCES public.sales_order(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_e27e6c6c6213373775 ON public."voucher_redemption" ("order_id");
ALTER TABLE public."voucher_redemption" ADD FOREIGN KEY ("appointment_id") REFERENCES public.appointment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_6af7c0c4a067a5608d ON public."voucher_redemption" ("appointment_id");
ALTER TABLE public."voucher_redemption" ADD CHECK ("discount_amount_snapshot">=0);
ALTER TABLE public."voucher_redemption" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."voucher_redemption" ADD CHECK (length(btrim("idempotency_key"))>0);
ALTER TABLE public."pet_species" ADD CHECK (length(btrim("species_name"))>0);
ALTER TABLE public."pet_breed" ADD FOREIGN KEY ("species_id") REFERENCES public.pet_species(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_7c6c36d32dbb90c1f4 ON public."pet_breed" ("species_id");
ALTER TABLE public."pet_breed" ADD CHECK (length(btrim("breed_name"))>0);
ALTER TABLE public."pet_profile" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_a70f7522e469f44638 ON public."pet_profile" ("customer_id");
ALTER TABLE public."pet_profile" ADD CHECK (length(btrim("pet_code"))>0);
ALTER TABLE public."pet_profile" ADD CHECK (length(btrim("pet_name"))>0);
ALTER TABLE public."pet_profile" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."pet_profile" ADD FOREIGN KEY ("breed_id") REFERENCES public.pet_breed(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_a15c7ef67018e5cdb2 ON public."pet_profile" ("breed_id");
ALTER TABLE public."pet_weight_history" ADD FOREIGN KEY ("pet_id") REFERENCES public.pet_profile(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_d6a357a42230a04608 ON public."pet_weight_history" ("pet_id");
ALTER TABLE public."pet_weight_history" ADD CHECK (weight>0);
ALTER TABLE public."pet_weight_history" ADD FOREIGN KEY ("recorded_by") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_5c91a90cb7bc15dc68 ON public."pet_weight_history" ("recorded_by");
ALTER TABLE public."staff_level" ADD CHECK (length(btrim("level_code"))>0);
ALTER TABLE public."staff_level" ADD CHECK (length(btrim("level_name"))>0);
ALTER TABLE public."staff_level" ADD CHECK ("rank_order">=0);
ALTER TABLE public."service_category" ADD CHECK (length(btrim("category_code"))>0);
ALTER TABLE public."service_category" ADD CHECK (length(btrim("category_name"))>0);
ALTER TABLE public."service" ADD CHECK (length(btrim("service_code"))>0);
ALTER TABLE public."service" ADD CHECK (length(btrim("service_name"))>0);
ALTER TABLE public."service" ADD CHECK ("estimated_duration">=0);
ALTER TABLE public."service" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."service" ADD CHECK ("commission_rate">=0);
ALTER TABLE public."service" ADD FOREIGN KEY ("category_id") REFERENCES public.service_category(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_1d8ddd71b815c5de86 ON public."service" ("category_id");
ALTER TABLE public."service" ADD FOREIGN KEY ("staff_level_required_id") REFERENCES public.staff_level(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_6460ca94ed523fa831 ON public."service" ("staff_level_required_id");
ALTER TABLE public."service_image" ADD FOREIGN KEY ("service_id") REFERENCES public.service(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_f69928edb3fdf4a2a0 ON public."service_image" ("service_id");
ALTER TABLE public."service_image" ADD CHECK (length(btrim("image_url"))>0);
ALTER TABLE public."service_image" ADD CHECK ("display_order">=0);
ALTER TABLE public."service_supported_species" ADD FOREIGN KEY ("service_id") REFERENCES public.service(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_acb03b48933a45e933 ON public."service_supported_species" ("service_id");
ALTER TABLE public."service_supported_species" ADD FOREIGN KEY ("species_id") REFERENCES public.pet_species(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_f019a05d6fd12c40d2 ON public."service_supported_species" ("species_id");
ALTER TABLE public."service_addon" ADD FOREIGN KEY ("service_id") REFERENCES public.service(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_5774c693bba6971ec5 ON public."service_addon" ("service_id");
ALTER TABLE public."service_addon" ADD CHECK (length(btrim("addon_name"))>0);
ALTER TABLE public."service_addon" ADD CHECK ("price">=0);
ALTER TABLE public."service_addon" ADD CHECK ("estimated_duration">=0);
ALTER TABLE public."service_addon" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."care_action" ADD CHECK (length(btrim("action_name"))>0);
ALTER TABLE public."service_care_action" ADD FOREIGN KEY ("service_id") REFERENCES public.service(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_c6e1286a5417c829f4 ON public."service_care_action" ("service_id");
ALTER TABLE public."service_care_action" ADD FOREIGN KEY ("care_action_id") REFERENCES public.care_action(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_6849d8fd752755dc0a ON public."service_care_action" ("care_action_id");
ALTER TABLE public."service_care_action" ADD CHECK ("display_order">=0);
ALTER TABLE public."service_care_action" ADD CHECK ("estimated_duration">=0);
ALTER TABLE public."service_price_matrix" ADD FOREIGN KEY ("service_id") REFERENCES public.service(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_ab7bce1c7cd3b1949a ON public."service_price_matrix" ("service_id");
ALTER TABLE public."service_price_matrix" ADD CHECK ("weight_from">=0);
ALTER TABLE public."service_price_matrix" ADD CHECK ("weight_to">=0);
ALTER TABLE public."service_price_matrix" ADD CHECK ("unit_price">=0);
ALTER TABLE public."service_price_matrix" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."taxi_price_rule" ADD CHECK ("distance_from">=0);
ALTER TABLE public."taxi_price_rule" ADD CHECK ("distance_to">=0);
ALTER TABLE public."taxi_price_rule" ADD CHECK ("weight_from">=0);
ALTER TABLE public."taxi_price_rule" ADD CHECK ("weight_to">=0);
ALTER TABLE public."taxi_price_rule" ADD CHECK ("base_price">=0);
ALTER TABLE public."taxi_price_rule" ADD CHECK ("surcharge">=0);
ALTER TABLE public."taxi_price_rule" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."hotel_room_type" ADD CHECK (length(btrim("room_type"))>0);
ALTER TABLE public."hotel_room_type" ADD CHECK ("capacity">=0);
ALTER TABLE public."hotel_room_type" ADD CHECK ("daily_price">=0);
ALTER TABLE public."hotel_room_type" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."hotel_room" ADD CHECK (length(btrim("room_number"))>0);
ALTER TABLE public."hotel_room" ADD FOREIGN KEY ("room_type_id") REFERENCES public.hotel_room_type(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_ecdd1483f022b0e857 ON public."hotel_room" ("room_type_id");
ALTER TABLE public."hotel_room" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."appointment" ADD CHECK (length(btrim("appointment_code"))>0);
ALTER TABLE public."appointment" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_b715937196a06007e5 ON public."appointment" ("customer_id");
ALTER TABLE public."appointment" ADD FOREIGN KEY ("pet_id") REFERENCES public.pet_profile(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_e0c33cff566dadf471 ON public."appointment" ("pet_id");
ALTER TABLE public."appointment" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_adc9c3114f37fa9622 ON public."appointment" ("staff_id");
ALTER TABLE public."appointment" ADD CHECK ("change_count">=0);
ALTER TABLE public."appointment" ADD CHECK (length(btrim("appointment_status"))>0);
ALTER TABLE public."appointment_item" ADD FOREIGN KEY ("appointment_id") REFERENCES public.appointment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_ba6faca544ee9bcc94 ON public."appointment_item" ("appointment_id");
ALTER TABLE public."appointment_item" ADD FOREIGN KEY ("service_id") REFERENCES public.service(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_b13b31a4a40dfe904a ON public."appointment_item" ("service_id");
ALTER TABLE public."appointment_item" ADD FOREIGN KEY ("service_addon_id") REFERENCES public.service_addon(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_c3133fdd7568d79c60 ON public."appointment_item" ("service_addon_id");
ALTER TABLE public."appointment_item" ADD CHECK (length(btrim("name_snapshot"))>0);
ALTER TABLE public."appointment_item" ADD CHECK (quantity>0);
ALTER TABLE public."appointment_item" ADD CHECK ("unit_price">=0);
ALTER TABLE public."appointment_item" ADD CHECK ("discount_amount">=0);
ALTER TABLE public."appointment_item" ADD CHECK ("duration_minutes">=0);
ALTER TABLE public."appointment_item" ADD CHECK ("weight_snapshot">=0);
ALTER TABLE public."appointment_item" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_c278c1198a36eb3714 ON public."appointment_item" ("staff_id");
ALTER TABLE public."appointment_item" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."appointment_record" ADD FOREIGN KEY ("appointment_id") REFERENCES public.appointment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_70bd44016760f5ba50 ON public."appointment_record" ("appointment_id");
ALTER TABLE public."appointment_record" ADD CHECK (length(btrim("record_type"))>0);
ALTER TABLE public."appointment_record" ADD CHECK ("schema_version">=0);
ALTER TABLE public."appointment_record" ADD CHECK ("revision_no">=0);
ALTER TABLE public."appointment_record" ADD FOREIGN KEY ("recorded_by") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_291c6008ca6e11042b ON public."appointment_record" ("recorded_by");
ALTER TABLE public."appointment_record" ADD CHECK (length(btrim("condition_note"))>0);
ALTER TABLE public."appointment_record" ADD CHECK (length(btrim("customer_confirmation_status"))>0);
ALTER TABLE public."appointment_adjustment" ADD FOREIGN KEY ("appointment_id") REFERENCES public.appointment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_233a96aeb573c36e54 ON public."appointment_adjustment" ("appointment_id");
ALTER TABLE public."appointment_adjustment" ADD CHECK (length(btrim("adjustment_type"))>0);
ALTER TABLE public."appointment_adjustment" ADD CHECK (length(btrim("reason"))>0);
ALTER TABLE public."appointment_adjustment" ADD FOREIGN KEY ("proposed_by") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_478b6b772db7869342 ON public."appointment_adjustment" ("proposed_by");
ALTER TABLE public."appointment_adjustment" ADD FOREIGN KEY ("approved_by") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_c2cafdcc3779897a61 ON public."appointment_adjustment" ("approved_by");
ALTER TABLE public."appointment_adjustment" ADD CHECK (length(btrim("approval_status"))>0);
ALTER TABLE public."appointment_adjustment" ADD CHECK (length(btrim("customer_consent_status"))>0);
ALTER TABLE public."hotel_booking" ADD CHECK (length(btrim("booking_code"))>0);
ALTER TABLE public."hotel_booking" ADD FOREIGN KEY ("room_id") REFERENCES public.hotel_room(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_471da749ef5db83029 ON public."hotel_booking" ("room_id");
ALTER TABLE public."hotel_booking" ADD FOREIGN KEY ("appointment_id") REFERENCES public.appointment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_e3feff5a49107506c0 ON public."hotel_booking" ("appointment_id");
ALTER TABLE public."hotel_booking" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."hotel_booking" ADD CHECK ("daily_price">=0);
ALTER TABLE public."taxi_trip" ADD FOREIGN KEY ("appointment_id") REFERENCES public.appointment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_3126a2182ee255a68e ON public."taxi_trip" ("appointment_id");
ALTER TABLE public."taxi_trip" ADD FOREIGN KEY ("driver_staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_69b7a8874faac802bd ON public."taxi_trip" ("driver_staff_id");
ALTER TABLE public."taxi_trip" ADD CHECK (length(btrim("pickup_address"))>0);
ALTER TABLE public."taxi_trip" ADD CHECK (length(btrim("dropoff_address"))>0);
ALTER TABLE public."taxi_trip" ADD CHECK ("distance_km">=0);
ALTER TABLE public."taxi_trip" ADD CHECK (length(btrim("trip_type"))>0);
ALTER TABLE public."taxi_trip" ADD FOREIGN KEY ("taxi_price_rule_id") REFERENCES public.taxi_price_rule(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_ac6c8f40746a3ace9f ON public."taxi_trip" ("taxi_price_rule_id");
ALTER TABLE public."taxi_trip" ADD CHECK ("quoted_amount">=0);
ALTER TABLE public."taxi_trip" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."care_log" ADD FOREIGN KEY ("appointment_id") REFERENCES public.appointment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_5b84e3ddb2dd49d065 ON public."care_log" ("appointment_id");
ALTER TABLE public."care_log" ADD FOREIGN KEY ("care_action_id") REFERENCES public.care_action(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_910aaecda903ae0acd ON public."care_log" ("care_action_id");
ALTER TABLE public."care_log" ADD FOREIGN KEY ("recorded_by") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_2325064dfb69a2b702 ON public."care_log" ("recorded_by");
ALTER TABLE public."care_log" ADD CHECK (length(btrim("action_name_snapshot"))>0);
ALTER TABLE public."care_log_media" ADD FOREIGN KEY ("care_log_id") REFERENCES public.care_log(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_c21911852fc63bfeea ON public."care_log_media" ("care_log_id");
ALTER TABLE public."care_log_media" ADD CHECK (length(btrim("media_type"))>0);
ALTER TABLE public."care_log_media" ADD CHECK (length(btrim("media_url"))>0);
ALTER TABLE public."care_log_media" ADD CHECK (length(btrim("file_name"))>0);
ALTER TABLE public."care_log_media" ADD CHECK ("file_size">=0);
ALTER TABLE public."care_log_media" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_9861137bbfebe58a34 ON public."care_log_media" ("staff_id");
ALTER TABLE public."supplier" ADD CHECK (length(btrim("supplier_name"))>0);
ALTER TABLE public."supplier" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."product_category" ADD CHECK (length(btrim("category_name"))>0);
ALTER TABLE public."product_category" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."product" ADD FOREIGN KEY ("category_id") REFERENCES public.product_category(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_41a15750e43fed493c ON public."product" ("category_id");
ALTER TABLE public."product" ADD CHECK (length(btrim("product_name"))>0);
ALTER TABLE public."product" ADD CHECK (length(btrim("unit"))>0);
ALTER TABLE public."product" ADD CHECK (length(btrim("slug"))>0);
ALTER TABLE public."product" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."product_media" ADD FOREIGN KEY ("product_id") REFERENCES public.product(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_1580ee60104548952c ON public."product_media" ("product_id");
ALTER TABLE public."product_media" ADD CHECK (length(btrim("image_url"))>0);
ALTER TABLE public."product_media" ADD CHECK ("display_order">=0);
ALTER TABLE public."variant_color" ADD CHECK (length(btrim("color_name"))>0);
ALTER TABLE public."variant_color" ADD CHECK (length(btrim("hex_code"))>0);
ALTER TABLE public."variant_color" ADD CHECK ("display_order">=0);
ALTER TABLE public."variant_size" ADD CHECK (length(btrim("size_name"))>0);
ALTER TABLE public."variant_size" ADD CHECK ("display_order">=0);
ALTER TABLE public."variant_flavor" ADD CHECK (length(btrim("flavor_name"))>0);
ALTER TABLE public."variant_flavor" ADD CHECK ("display_order">=0);
ALTER TABLE public."product_variant" ADD FOREIGN KEY ("product_id") REFERENCES public.product(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_1bc0c31a53f5aefc0d ON public."product_variant" ("product_id");
ALTER TABLE public."product_variant" ADD FOREIGN KEY ("color_id") REFERENCES public.variant_color(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_3f89dd40a5a8f789ab ON public."product_variant" ("color_id");
ALTER TABLE public."product_variant" ADD FOREIGN KEY ("size_id") REFERENCES public.variant_size(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_be21c5b05474ed23d0 ON public."product_variant" ("size_id");
ALTER TABLE public."product_variant" ADD FOREIGN KEY ("flavor_id") REFERENCES public.variant_flavor(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_72b3e74a7bb953700b ON public."product_variant" ("flavor_id");
ALTER TABLE public."product_variant" ADD CHECK (length(btrim("sku_variant"))>0);
ALTER TABLE public."product_variant" ADD CHECK ("cost_price">=0);
ALTER TABLE public."product_variant" ADD CHECK ("sale_price">=0);
ALTER TABLE public."product_variant" ADD CHECK ("compare_at_price">=0);
ALTER TABLE public."product_variant" ADD CHECK (weight>=0);
ALTER TABLE public."product_variant" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."product_variant_media" ADD FOREIGN KEY ("product_variant_id") REFERENCES public.product_variant(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_f9ce17cc95fb61e2dd ON public."product_variant_media" ("product_variant_id");
ALTER TABLE public."product_variant_media" ADD CHECK (length(btrim("image_url"))>0);
ALTER TABLE public."product_variant_media" ADD CHECK ("display_order">=0);
ALTER TABLE public."purchase_order" ADD FOREIGN KEY ("supplier_id") REFERENCES public.supplier(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_84199f41f3a3978770 ON public."purchase_order" ("supplier_id");
ALTER TABLE public."purchase_order" ADD CHECK (length(btrim("order_number"))>0);
ALTER TABLE public."purchase_order" ADD CHECK (length(btrim("order_status"))>0);
ALTER TABLE public."purchase_order_detail" ADD FOREIGN KEY ("purchase_order_id") REFERENCES public.purchase_order(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_e6aff8dab00029a711 ON public."purchase_order_detail" ("purchase_order_id");
ALTER TABLE public."purchase_order_detail" ADD FOREIGN KEY ("product_variant_id") REFERENCES public.product_variant(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_f3a6f2a1a0135e8680 ON public."purchase_order_detail" ("product_variant_id");
ALTER TABLE public."purchase_order_detail" ADD CHECK (quantity>0);
ALTER TABLE public."purchase_order_detail" ADD CHECK ("unit_price">=0);
ALTER TABLE public."cart" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_92f992202ce797fad9 ON public."cart" ("customer_id");
ALTER TABLE public."cart" ADD CHECK (length(btrim("cart_status"))>0);
ALTER TABLE public."cart_item" ADD FOREIGN KEY ("cart_id") REFERENCES public.cart(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_90b1bf9bd9fb1077cb ON public."cart_item" ("cart_id");
ALTER TABLE public."cart_item" ADD FOREIGN KEY ("product_variant_id") REFERENCES public.product_variant(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_7877a33fb94b22dc23 ON public."cart_item" ("product_variant_id");
ALTER TABLE public."cart_item" ADD CHECK (quantity>0);
ALTER TABLE public."cart_item" ADD CHECK ("unit_price">=0);
ALTER TABLE public."wishlist" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_5519264e22a72d6ac9 ON public."wishlist" ("customer_id");
ALTER TABLE public."wishlist_product" ADD FOREIGN KEY ("wishlist_id") REFERENCES public.wishlist(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_e0996b420f27473b17 ON public."wishlist_product" ("wishlist_id");
ALTER TABLE public."wishlist_product" ADD FOREIGN KEY ("product_id") REFERENCES public.product(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_94b4dc9c2698e5cbcc ON public."wishlist_product" ("product_id");
ALTER TABLE public."wishlist_service" ADD FOREIGN KEY ("wishlist_id") REFERENCES public.wishlist(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_5fc517fbff2feb2fa4 ON public."wishlist_service" ("wishlist_id");
ALTER TABLE public."wishlist_service" ADD FOREIGN KEY ("service_id") REFERENCES public.service(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_0f6b79b846f30a397f ON public."wishlist_service" ("service_id");
ALTER TABLE public."sales_order" ADD CHECK (length(btrim("order_code"))>0);
ALTER TABLE public."sales_order" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_e7f5af1fdbf76553ac ON public."sales_order" ("customer_id");
ALTER TABLE public."sales_order" ADD CHECK (length(btrim("order_status"))>0);
ALTER TABLE public."sales_order" ADD CHECK ("shipping_fee_snapshot">=0);
ALTER TABLE public."sales_order" ADD FOREIGN KEY ("delivery_option_id") REFERENCES public.delivery_option_config(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_97e6f5e8ae76df6e14 ON public."sales_order" ("delivery_option_id");
ALTER TABLE public."sales_order" ADD FOREIGN KEY ("shipping_provider_id") REFERENCES public.shipping_provider(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_d338ae97d3866ee692 ON public."sales_order" ("shipping_provider_id");
ALTER TABLE public."sales_order_detail" ADD FOREIGN KEY ("order_id") REFERENCES public.sales_order(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_8fde45639cdde521c2 ON public."sales_order_detail" ("order_id");
ALTER TABLE public."sales_order_detail" ADD FOREIGN KEY ("product_variant_id") REFERENCES public.product_variant(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_c9cf6e848e1cccdd5f ON public."sales_order_detail" ("product_variant_id");
ALTER TABLE public."sales_order_detail" ADD CHECK (quantity>0);
ALTER TABLE public."sales_order_detail" ADD CHECK ("unit_price">=0);
ALTER TABLE public."sales_order_detail" ADD CHECK ("discount_amount">=0);
ALTER TABLE public."sales_order_detail" ADD CHECK (length(btrim("product_name_snapshot"))>0);
ALTER TABLE public."sales_order_detail" ADD CHECK (length(btrim("sku_snapshot"))>0);
ALTER TABLE public."stock_reservation" ADD FOREIGN KEY ("product_variant_id") REFERENCES public.product_variant(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_bc1407d2738ca56c0d ON public."stock_reservation" ("product_variant_id");
ALTER TABLE public."stock_reservation" ADD FOREIGN KEY ("cart_id") REFERENCES public.cart(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_28e93158063c169f74 ON public."stock_reservation" ("cart_id");
ALTER TABLE public."stock_reservation" ADD CHECK (quantity>0);
ALTER TABLE public."stock_reservation" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."stock_reservation" ADD FOREIGN KEY ("order_id") REFERENCES public.sales_order(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_63500d7d647e6d7c12 ON public."stock_reservation" ("order_id");
ALTER TABLE public."inventory" ADD FOREIGN KEY ("product_variant_id") REFERENCES public.product_variant(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_d08008431c5e4bacd3 ON public."inventory" ("product_variant_id");
ALTER TABLE public."inventory" ADD CHECK ("quantity_in_stock">=0);
ALTER TABLE public."inventory" ADD CHECK ("minimum_stock">=0);
ALTER TABLE public."inventory_transaction" ADD FOREIGN KEY ("product_variant_id") REFERENCES public.product_variant(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_dce2adf55fe5957d03 ON public."inventory_transaction" ("product_variant_id");
ALTER TABLE public."inventory_transaction" ADD CHECK (length(btrim("transaction_type"))>0);
ALTER TABLE public."inventory_transaction" ADD CHECK (quantity<>0);
ALTER TABLE public."inventory_transaction" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_686cf19daae68e3af0 ON public."inventory_transaction" ("staff_id");
ALTER TABLE public."inventory_transaction" ADD FOREIGN KEY ("purchase_order_detail_id") REFERENCES public.purchase_order_detail(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_18c9e4896a2aa34412 ON public."inventory_transaction" ("purchase_order_detail_id");
ALTER TABLE public."inventory_transaction" ADD FOREIGN KEY ("sales_order_detail_id") REFERENCES public.sales_order_detail(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_16c2e67ddcdce27494 ON public."inventory_transaction" ("sales_order_detail_id");
ALTER TABLE public."inventory_transaction" ADD FOREIGN KEY ("return_request_detail_id") REFERENCES public.return_request_detail(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_1cc8d047b6b53075e9 ON public."inventory_transaction" ("return_request_detail_id");
ALTER TABLE public."inventory_transaction" ADD CHECK (length(btrim("idempotency_key"))>0);
ALTER TABLE public."payment_method_config" ADD CHECK (length(btrim("name"))>0);
ALTER TABLE public."payment_method_config" ADD CHECK ("fee">=0);
ALTER TABLE public."delivery_option_config" ADD CHECK (length(btrim("name"))>0);
ALTER TABLE public."delivery_option_config" ADD CHECK ("fee">=0);
ALTER TABLE public."delivery_option_config" ADD CHECK ("estimated_days">=0);
ALTER TABLE public."shipping_provider" ADD CHECK (length(btrim("provider_name"))>0);
ALTER TABLE public."shipping_provider" ADD CHECK (length(btrim("provider_code"))>0);
ALTER TABLE public."shipping_provider" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."payment" ADD CHECK (length(btrim("payment_code"))>0);
ALTER TABLE public."payment" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_2494d3ddf9ba98b38a ON public."payment" ("customer_id");
ALTER TABLE public."payment" ADD FOREIGN KEY ("payment_method_config_id") REFERENCES public.payment_method_config(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_0831f9316c3bc262c6 ON public."payment" ("payment_method_config_id");
ALTER TABLE public."payment" ADD CHECK (length(btrim("payment_type"))>0);
ALTER TABLE public."payment" ADD CHECK ("amount">=0);
ALTER TABLE public."payment" ADD CHECK (length(btrim("transaction_status"))>0);
ALTER TABLE public."payment" ADD CHECK (length(btrim("idempotency_key"))>0);
ALTER TABLE public."payment" ADD FOREIGN KEY ("order_id") REFERENCES public.sales_order(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_e3f445a136d7d059a9 ON public."payment" ("order_id");
ALTER TABLE public."payment" ADD FOREIGN KEY ("appointment_id") REFERENCES public.appointment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_cffd5f257141f1c185 ON public."payment" ("appointment_id");
ALTER TABLE public."payment" ADD CHECK ("eligible_spend_amount">=0);
ALTER TABLE public."refund_transaction" ADD CHECK (length(btrim("refund_code"))>0);
ALTER TABLE public."refund_transaction" ADD FOREIGN KEY ("ticket_id") REFERENCES public.support_ticket(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_0bf022973af3a548f5 ON public."refund_transaction" ("ticket_id");
ALTER TABLE public."refund_transaction" ADD FOREIGN KEY ("payment_id") REFERENCES public.payment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_0a2228678d7254814c ON public."refund_transaction" ("payment_id");
ALTER TABLE public."refund_transaction" ADD CHECK (length(btrim("refund_type"))>0);
ALTER TABLE public."refund_transaction" ADD CHECK ("requested_amount">=0);
ALTER TABLE public."refund_transaction" ADD CHECK ("approved_amount">=0);
ALTER TABLE public."refund_transaction" ADD CHECK ("refunded_amount">=0);
ALTER TABLE public."refund_transaction" ADD CHECK (length(btrim("refund_method"))>0);
ALTER TABLE public."refund_transaction" ADD CHECK (length(btrim("refund_status"))>0);
ALTER TABLE public."refund_transaction" ADD FOREIGN KEY ("processed_by") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_70a3f93a8827800e6f ON public."refund_transaction" ("processed_by");
ALTER TABLE public."refund_transaction" ADD FOREIGN KEY ("return_request_id") REFERENCES public.return_request(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_ec02684b6b657449d7 ON public."refund_transaction" ("return_request_id");
ALTER TABLE public."refund_transaction" ADD CHECK ("eligible_refund_amount">=0);
ALTER TABLE public."return_request" ADD FOREIGN KEY ("sales_order_id") REFERENCES public.sales_order(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_96849320a7f02d4831 ON public."return_request" ("sales_order_id");
ALTER TABLE public."return_request" ADD FOREIGN KEY ("resolved_by") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_b2c805b6b927e88f08 ON public."return_request" ("resolved_by");
ALTER TABLE public."return_request" ADD CHECK (length(btrim("reason"))>0);
ALTER TABLE public."return_request" ADD CHECK (length(btrim("return_type"))>0);
ALTER TABLE public."return_request" ADD CHECK (length(btrim("request_status"))>0);
ALTER TABLE public."return_request_detail" ADD FOREIGN KEY ("return_request_id") REFERENCES public.return_request(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_c5166b91c76acb5024 ON public."return_request_detail" ("return_request_id");
ALTER TABLE public."return_request_detail" ADD CHECK (quantity>0);
ALTER TABLE public."return_request_detail" ADD FOREIGN KEY ("sales_order_detail_id") REFERENCES public.sales_order_detail(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_80aa9314f6749a86c3 ON public."return_request_detail" ("sales_order_detail_id");
ALTER TABLE public."return_request_evidence" ADD FOREIGN KEY ("return_request_id") REFERENCES public.return_request(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_4bed72250c832d325e ON public."return_request_evidence" ("return_request_id");
ALTER TABLE public."return_request_evidence" ADD CHECK (length(btrim("image_url"))>0);
ALTER TABLE public."return_request_evidence" ADD CHECK ("display_order">=0);
ALTER TABLE public."review" ADD CHECK ("rating">=0);
ALTER TABLE public."review" ADD CHECK (length(btrim("review_status"))>0);
ALTER TABLE public."review" ADD FOREIGN KEY ("sales_order_detail_id") REFERENCES public.sales_order_detail(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_a994737d34c246f947 ON public."review" ("sales_order_detail_id");
ALTER TABLE public."review" ADD FOREIGN KEY ("appointment_item_id") REFERENCES public.appointment_item(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_0765069b7e4ddce382 ON public."review" ("appointment_item_id");
ALTER TABLE public."review_response" ADD FOREIGN KEY ("review_id") REFERENCES public.review(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_dd7ef40045a1a9fae4 ON public."review_response" ("review_id");
ALTER TABLE public."review_response" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_79eeb049483f304ff3 ON public."review_response" ("staff_id");
ALTER TABLE public."review_media" ADD FOREIGN KEY ("review_id") REFERENCES public.review(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_ca08e4bce4c06cb5a9 ON public."review_media" ("review_id");
ALTER TABLE public."review_media" ADD CHECK (length(btrim("image_url"))>0);
ALTER TABLE public."review_media" ADD CHECK ("display_order">=0);
ALTER TABLE public."support_ticket" ADD CHECK (length(btrim("ticket_code"))>0);
ALTER TABLE public."support_ticket" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_c51443875d97a94dd5 ON public."support_ticket" ("customer_id");
ALTER TABLE public."support_ticket" ADD FOREIGN KEY ("order_id") REFERENCES public.sales_order(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_ad3c27db096527198e ON public."support_ticket" ("order_id");
ALTER TABLE public."support_ticket" ADD FOREIGN KEY ("appointment_id") REFERENCES public.appointment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_47ff9a4fc819fb2250 ON public."support_ticket" ("appointment_id");
ALTER TABLE public."support_ticket" ADD CHECK (length(btrim("channel"))>0);
ALTER TABLE public."support_ticket" ADD CHECK (length(btrim("category"))>0);
ALTER TABLE public."support_ticket" ADD CHECK (length(btrim("subject"))>0);
ALTER TABLE public."support_ticket" ADD CHECK (length(btrim("priority"))>0);
ALTER TABLE public."support_ticket" ADD CHECK (length(btrim("type"))>0);
ALTER TABLE public."support_ticket" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."support_ticket" ADD CHECK ("requested_amount">=0);
ALTER TABLE public."support_ticket" ADD FOREIGN KEY ("assigned_staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_0ae7228bebb7961350 ON public."support_ticket" ("assigned_staff_id");
ALTER TABLE public."support_ticket" ADD CHECK ("approved_amount">=0);
ALTER TABLE public."support_ticket" ADD FOREIGN KEY ("resolved_by") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_4792694786442871f4 ON public."support_ticket" ("resolved_by");
ALTER TABLE public."support_ticket" ADD CHECK ("rating">=0);
ALTER TABLE public."support_ticket" ADD FOREIGN KEY ("created_by_account_id") REFERENCES auth.users(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_fc2771b48691360de7 ON public."support_ticket" ("created_by_account_id");
ALTER TABLE public."support_ticket_message" ADD FOREIGN KEY ("ticket_id") REFERENCES public.support_ticket(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_a8508da4af292262d5 ON public."support_ticket_message" ("ticket_id");
ALTER TABLE public."support_ticket_message" ADD CHECK (length(btrim("sender_type"))>0);
ALTER TABLE public."support_ticket_message" ADD FOREIGN KEY ("sender_account_id") REFERENCES auth.users(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_1792849c16a4e28737 ON public."support_ticket_message" ("sender_account_id");
ALTER TABLE public."support_ticket_message" ADD FOREIGN KEY ("sender_guest_session_id") REFERENCES public.guest_session(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_6d4b3dc2a6d2ec878c ON public."support_ticket_message" ("sender_guest_session_id");
ALTER TABLE public."support_ticket_message_attachment" ADD FOREIGN KEY ("message_id") REFERENCES public.support_ticket_message(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_77cb0196b72c9d68ea ON public."support_ticket_message_attachment" ("message_id");
ALTER TABLE public."support_ticket_message_attachment" ADD CHECK (length(btrim("file_url"))>0);
ALTER TABLE public."support_ticket_message_attachment" ADD CHECK (length(btrim("file_name"))>0);
ALTER TABLE public."support_ticket_message_attachment" ADD CHECK ("file_size">=0);
ALTER TABLE public."support_ticket_message_attachment" ADD CHECK (length(btrim("media_type"))>0);
ALTER TABLE public."support_ticket_message_attachment" ADD CHECK ("display_order">=0);
ALTER TABLE public."staff" ADD CHECK (length(btrim("full_name"))>0);
ALTER TABLE public."staff" ADD CHECK (length(btrim("job_title"))>0);
ALTER TABLE public."staff" ADD FOREIGN KEY ("auth_user_id") REFERENCES auth.users(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_af22b52ac1bd9f7792 ON public."staff" ("auth_user_id");
ALTER TABLE public."staff" ADD FOREIGN KEY ("staff_level_id") REFERENCES public.staff_level(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_6ae727249cfbcd200e ON public."staff" ("staff_level_id");
ALTER TABLE public."staff" ADD CHECK (length(btrim("employment_status"))>0);
ALTER TABLE public."staff_schedule" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_7328e05396b87a458b ON public."staff_schedule" ("staff_id");
ALTER TABLE public."staff_schedule" ADD CHECK (length(btrim("availability_status"))>0);
ALTER TABLE public."staff_schedule" ADD CHECK (length(btrim("schedule_status"))>0);
ALTER TABLE public."staff_assessment" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_044c8ab5172e269a03 ON public."staff_assessment" ("staff_id");
ALTER TABLE public."staff_assessment" ADD CHECK (length(btrim("assessment_type"))>0);
ALTER TABLE public."staff_assessment" ADD CHECK (length(btrim("result"))>0);
ALTER TABLE public."staff_assessment" ADD FOREIGN KEY ("assessed_by") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_ffadddc893d23bcc1c ON public."staff_assessment" ("assessed_by");
ALTER TABLE public."staff_shift_request" ADD CHECK (length(btrim("request_type"))>0);
ALTER TABLE public."staff_shift_request" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_18d4787692d65362bc ON public."staff_shift_request" ("staff_id");
ALTER TABLE public."staff_shift_request" ADD FOREIGN KEY ("target_staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_b5019cdc4dd9508abe ON public."staff_shift_request" ("target_staff_id");
ALTER TABLE public."staff_shift_request" ADD FOREIGN KEY ("replacement_staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_1e183d93f629b58d49 ON public."staff_shift_request" ("replacement_staff_id");
ALTER TABLE public."staff_shift_request" ADD CHECK (length(btrim("shift"))>0);
ALTER TABLE public."staff_shift_request" ADD CHECK (length(btrim("reason"))>0);
ALTER TABLE public."staff_shift_request" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."staff_shift_request" ADD FOREIGN KEY ("created_by") REFERENCES auth.users(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_862b2e0396991fe143 ON public."staff_shift_request" ("created_by");
ALTER TABLE public."staff_shift_request" ADD FOREIGN KEY ("reviewed_by") REFERENCES auth.users(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_a71688f71f76c1c348 ON public."staff_shift_request" ("reviewed_by");
ALTER TABLE public."promotion" ADD CHECK (length(btrim("promotion_name"))>0);
ALTER TABLE public."promotion" ADD CHECK (length(btrim("discount_type"))>0);
ALTER TABLE public."promotion" ADD CHECK ("discount_value">=0);
ALTER TABLE public."promotion" ADD CHECK ("minimum_order_value">=0);
ALTER TABLE public."promotion" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."promotion_product" ADD FOREIGN KEY ("promotion_id") REFERENCES public.promotion(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_f20439c3df0cc92809 ON public."promotion_product" ("promotion_id");
ALTER TABLE public."promotion_product" ADD FOREIGN KEY ("product_variant_id") REFERENCES public.product_variant(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_d2022f8d35b796f485 ON public."promotion_product" ("product_variant_id");
ALTER TABLE public."promotion_service" ADD FOREIGN KEY ("promotion_id") REFERENCES public.promotion(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_f7847c811b92d40a9a ON public."promotion_service" ("promotion_id");
ALTER TABLE public."promotion_service" ADD FOREIGN KEY ("service_id") REFERENCES public.service(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_38002640128445f0be ON public."promotion_service" ("service_id");
ALTER TABLE public."banner" ADD CHECK (length(btrim("image_url"))>0);
ALTER TABLE public."banner" ADD CHECK (length(btrim("title"))>0);
ALTER TABLE public."banner" ADD CHECK ("display_order">=0);
ALTER TABLE public."banner" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."blog_category" ADD CHECK (length(btrim("category_name"))>0);
ALTER TABLE public."blog_category" ADD CHECK ("display_order">=0);
ALTER TABLE public."blog_category" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."blog_post" ADD FOREIGN KEY ("category_id") REFERENCES public.blog_category(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_d5f02b01afc303fc17 ON public."blog_post" ("category_id");
ALTER TABLE public."blog_post" ADD CHECK (length(btrim("title"))>0);
ALTER TABLE public."blog_post" ADD CHECK (length(btrim("slug"))>0);
ALTER TABLE public."blog_post" ADD FOREIGN KEY ("author_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_3cbcb5f797c7a2a0fb ON public."blog_post" ("author_id");
ALTER TABLE public."blog_post" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."blog_post" ADD CHECK ("view_count">=0);
ALTER TABLE public."notification" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_9f7eece0ba38084ea7 ON public."notification" ("customer_id");
ALTER TABLE public."notification" ADD CHECK (length(btrim("notification_type"))>0);
ALTER TABLE public."notification" ADD CHECK (length(btrim("title"))>0);
ALTER TABLE public."notification" ADD FOREIGN KEY ("sales_order_id") REFERENCES public.sales_order(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_74a8da5499aae51e5a ON public."notification" ("sales_order_id");
ALTER TABLE public."notification" ADD FOREIGN KEY ("appointment_id") REFERENCES public.appointment(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_fdf682c71e4152a7d7 ON public."notification" ("appointment_id");
ALTER TABLE public."notification" ADD FOREIGN KEY ("support_ticket_id") REFERENCES public.support_ticket(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_a4d2325c3bfe033486 ON public."notification" ("support_ticket_id");
ALTER TABLE public."notification" ADD FOREIGN KEY ("refund_transaction_id") REFERENCES public.refund_transaction(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_322ccd86430d20d6da ON public."notification" ("refund_transaction_id");
ALTER TABLE public."pawpal_setting" ADD CHECK (length(btrim("setting_key"))>0);
ALTER TABLE public."pawpal_setting" ADD CHECK (length(btrim("setting_value"))>0);
ALTER TABLE public."pawpal_setting" ADD CHECK (length(btrim("setting_type"))>0);
ALTER TABLE public."audit_log" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_3464a5d1b5eb8fd829 ON public."audit_log" ("staff_id");
ALTER TABLE public."audit_log" ADD CHECK (length(btrim("action"))>0);
ALTER TABLE public."chat_conversation" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_d9f0aa51b34b12cd0c ON public."chat_conversation" ("customer_id");
ALTER TABLE public."chat_conversation" ADD CHECK (length(btrim("status"))>0);
ALTER TABLE public."chat_conversation" ADD FOREIGN KEY ("sentiment_level") REFERENCES public.chatbot_sentiment_tier(level) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_82c3c876f2213f3897 ON public."chat_conversation" ("sentiment_level");
ALTER TABLE public."chat_conversation" ADD CHECK ("sentiment_level">=0);
ALTER TABLE public."chat_conversation" ADD CHECK (length(btrim("sentiment_trend"))>0);
ALTER TABLE public."chat_conversation" ADD FOREIGN KEY ("assigned_staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_604b07e2e3ab398a3a ON public."chat_conversation" ("assigned_staff_id");
ALTER TABLE public."chat_conversation" ADD FOREIGN KEY ("resolved_by") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_20901e2a7a8f421969 ON public."chat_conversation" ("resolved_by");
ALTER TABLE public."chat_conversation" ADD CHECK ("violation_count">=0);
ALTER TABLE public."chat_conversation" ADD CHECK (length(btrim("channel"))>0);
ALTER TABLE public."chat_conversation" ADD FOREIGN KEY ("guest_session_id") REFERENCES public.guest_session(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_6e602ced96b9ab712c ON public."chat_conversation" ("guest_session_id");
ALTER TABLE public."chat_message" ADD FOREIGN KEY ("conversation_id") REFERENCES public.chat_conversation(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_74a4d5fe047cf368f2 ON public."chat_message" ("conversation_id");
ALTER TABLE public."chat_message" ADD CHECK (length(btrim("sender_type"))>0);
ALTER TABLE public."chat_message" ADD FOREIGN KEY ("sender_account_id") REFERENCES auth.users(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_1ffccc7587eea4916c ON public."chat_message" ("sender_account_id");
ALTER TABLE public."chat_message" ADD FOREIGN KEY ("sender_guest_session_id") REFERENCES public.guest_session(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_57761cab3ad47dc3a3 ON public."chat_message" ("sender_guest_session_id");
ALTER TABLE public."chat_moderation_log" ADD FOREIGN KEY ("conversation_id") REFERENCES public.chat_conversation(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_7091809622bd524fed ON public."chat_moderation_log" ("conversation_id");
ALTER TABLE public."chat_moderation_log" ADD FOREIGN KEY ("customer_id") REFERENCES public.customer(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_c0445f9f660a307062 ON public."chat_moderation_log" ("customer_id");
ALTER TABLE public."chat_moderation_log" ADD CHECK ("violation_count">=0);
ALTER TABLE public."chat_moderation_log" ADD CHECK (length(btrim("action_taken"))>0);
ALTER TABLE public."chat_feedback" ADD FOREIGN KEY ("conversation_id") REFERENCES public.chat_conversation(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_3e10fd445647bd286d ON public."chat_feedback" ("conversation_id");
ALTER TABLE public."admin_copilot_history" ADD FOREIGN KEY ("staff_id") REFERENCES public.staff(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_ef34fe0cda0d462f6c ON public."admin_copilot_history" ("staff_id");
ALTER TABLE public."admin_copilot_history" ADD CHECK (length(btrim("role"))>0);
ALTER TABLE public."chatbot_sentiment_tier" ADD CHECK ("level">=0);
ALTER TABLE public."chatbot_sentiment_tier" ADD CHECK (length(btrim("name"))>0);
ALTER TABLE public."chatbot_sentiment_tier" ADD CHECK (length(btrim("color_badge"))>0);
ALTER TABLE public."chatbot_sentiment_tier" ADD CHECK ("sla_seconds">=0);
ALTER TABLE public."chatbot_sentiment_trigger" ADD FOREIGN KEY ("tier_level") REFERENCES public.chatbot_sentiment_tier(level) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_14920782a8aac601b5 ON public."chatbot_sentiment_trigger" ("tier_level");
ALTER TABLE public."chatbot_sentiment_trigger" ADD CHECK ("tier_level">=0);
ALTER TABLE public."chatbot_sentiment_trigger" ADD CHECK (length(btrim("trigger_pattern"))>0);
ALTER TABLE public."chatbot_sentiment_trigger" ADD CHECK (weight>=0);
ALTER TABLE public."chatbot_sentiment_trigger" ADD CHECK (length(btrim("context_domain"))>0);
ALTER TABLE public."chatbot_sentiment_action" ADD FOREIGN KEY ("tier_level") REFERENCES public.chatbot_sentiment_tier(level) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_b8ea51e05dcf9366ac ON public."chatbot_sentiment_action" ("tier_level");
ALTER TABLE public."chatbot_sentiment_action" ADD CHECK ("tier_level">=0);
ALTER TABLE public."chatbot_sentiment_action" ADD CHECK (length(btrim("bot_behavior"))>0);
ALTER TABLE public."chatbot_sentiment_action" ADD FOREIGN KEY ("suggested_canned_id") REFERENCES public.chatbot_canned_response(id) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_dbbeaa83f567806030 ON public."chatbot_sentiment_action" ("suggested_canned_id");
ALTER TABLE public."chatbot_compensation_policy" ADD CHECK (length(btrim("issue_type"))>0);
ALTER TABLE public."chatbot_compensation_policy" ADD CHECK ("max_points">=0);
ALTER TABLE public."chatbot_compensation_policy" ADD CHECK ("max_discount_vnd">=0);
ALTER TABLE public."chatbot_handover_rule" ADD CHECK (length(btrim("condition_name"))>0);
ALTER TABLE public."chatbot_handover_rule" ADD CHECK (length(btrim("trigger_type"))>0);
ALTER TABLE public."chatbot_handover_rule" ADD CHECK ("threshold_value">=0);
ALTER TABLE public."chatbot_handover_rule" ADD FOREIGN KEY ("auto_assign_role") REFERENCES public.access_role(code) ON DELETE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX v1fk_7041ed7c87d89851dd ON public."chatbot_handover_rule" ("auto_assign_role");
ALTER TABLE public."chatbot_handover_rule" ADD CHECK ("sla_seconds">=0);
ALTER TABLE public."chatbot_knowledge_faq" ADD CHECK (length(btrim("category"))>0);
ALTER TABLE public."chatbot_knowledge_faq" ADD CHECK (length(btrim("question"))>0);
ALTER TABLE public."chatbot_knowledge_faq" ADD CHECK (length(btrim("answer"))>0);
ALTER TABLE public."chatbot_knowledge_faq" ADD CHECK ("priority">=0);
ALTER TABLE public."chatbot_system_prompt" ADD CHECK (length(btrim("prompt_key"))>0);
ALTER TABLE public."chatbot_system_prompt" ADD CHECK (length(btrim("channel"))>0);
ALTER TABLE public."chatbot_system_prompt" ADD CHECK (length(btrim("persona_name"))>0);
ALTER TABLE public."chatbot_system_prompt" ADD CHECK (length(btrim("tone_of_voice"))>0);
ALTER TABLE public."chatbot_canned_response" ADD CHECK (length(btrim("shortcut"))>0);
ALTER TABLE public."chatbot_canned_response" ADD CHECK (length(btrim("title"))>0);
ALTER TABLE public."chatbot_canned_response" ADD CHECK (length(btrim("category"))>0);
ALTER TABLE public."chatbot_canned_response" ADD CHECK ("usage_count">=0);
ALTER TABLE public."chatbot_profanity_filter" ADD CHECK (length(btrim("keyword"))>0);
ALTER TABLE public."chatbot_profanity_filter" ADD CHECK (length(btrim("severity"))>0);
ALTER TABLE public."chatbot_profanity_filter" ADD CHECK (length(btrim("action"))>0);
ALTER TABLE public."chatbot_scenario_matrix" ADD CHECK (length(btrim("scenario_name"))>0);
ALTER TABLE public."chatbot_scenario_matrix" ADD CHECK (length(btrim("sample_user_input"))>0);
ALTER TABLE public."chatbot_scenario_matrix" ADD CHECK (length(btrim("benchmark_status"))>0);
ALTER TABLE public."customer_phone" ADD CHECK (phone_number ~ '^\+?[0-9]{8,15}$');
ALTER TABLE public."guest_session" ADD CHECK (expires_at>created_at);
ALTER TABLE public."guest_session" ADD CHECK (token_hash ~ '^[a-f0-9]{64}$');
ALTER TABLE public."membership_tier" ADD CHECK (discount_percent<=100);
ALTER TABLE public."service" ADD CHECK (commission_rate<=100);
ALTER TABLE public."service" ADD CHECK (estimated_duration>0);
ALTER TABLE public."customer_profile" ADD CHECK (date_of_birth<=CURRENT_DATE);
ALTER TABLE public."pet_profile" ADD CHECK (date_of_birth<=CURRENT_DATE);
ALTER TABLE public."pet_weight_history" ADD CHECK (measured_at<=now());
ALTER TABLE public."appointment" ADD CHECK (scheduled_end_at>scheduled_start_at);
ALTER TABLE public."appointment" ADD CHECK (check_out_time IS NULL OR check_out_time>=check_in_time);
ALTER TABLE public."appointment_item" ADD CHECK (num_nonnulls(service_id,service_addon_id)=1);
ALTER TABLE public."appointment_item" ADD CHECK (discount_amount<=quantity*unit_price);
ALTER TABLE public."appointment_item" ADD CHECK (NOT is_primary OR service_id IS NOT NULL);
ALTER TABLE public."appointment_record" ADD CHECK (revision_no>0);
ALTER TABLE public."appointment_record" ADD CHECK (schema_version>0);
ALTER TABLE public."appointment_record" ADD CHECK (customer_confirmation_status IN ('pending','confirmed','declined'));
ALTER TABLE public."appointment_record" ADD CHECK ((customer_confirmation_status='confirmed')=(confirmed_at IS NOT NULL));
ALTER TABLE public."service_price_matrix" ADD CHECK (weight_to IS NULL OR weight_to>weight_from);
ALTER TABLE public."service_price_matrix" ADD CHECK (effective_to IS NULL OR effective_to>effective_from);
ALTER TABLE public."taxi_price_rule" ADD CHECK (weight_to IS NULL OR weight_to>weight_from);
ALTER TABLE public."taxi_price_rule" ADD CHECK (distance_to IS NULL OR distance_to>distance_from);
ALTER TABLE public."taxi_price_rule" ADD CHECK (effective_to IS NULL OR effective_to>effective_from);
ALTER TABLE public."hotel_booking" ADD CHECK (check_out_at>check_in_at);
ALTER TABLE public."hotel_room_type" ADD CHECK (capacity>0);
ALTER TABLE public."staff_schedule" ADD CHECK (end_at>start_at);
ALTER TABLE public."staff_assessment" ADD CHECK (score BETWEEN 0 AND 100);
ALTER TABLE public."staff_shift_request" ADD CHECK (end_date>=start_date);
ALTER TABLE public."sales_order_detail" ADD CHECK (discount_amount<=quantity*unit_price);
ALTER TABLE public."stock_reservation" ADD CHECK (num_nonnulls(cart_id,order_id)=1);
ALTER TABLE public."stock_reservation" ADD CHECK (expires_at>reserved_at);
ALTER TABLE public."payment" ADD CHECK (num_nonnulls(order_id,appointment_id)=1);
ALTER TABLE public."payment" ADD CHECK (amount>0);
ALTER TABLE public."payment" ADD CHECK (eligible_spend_amount<=amount);
ALTER TABLE public."payment" ADD CHECK (transaction_status IN ('pending','succeeded','failed','cancelled'));
ALTER TABLE public."payment" ADD CHECK ((transaction_status='succeeded')=(succeeded_at IS NOT NULL));
ALTER TABLE public."payment" ADD CHECK (transaction_status='succeeded' OR eligible_spend_amount=0);
ALTER TABLE public."refund_transaction" ADD CHECK (eligible_refund_amount<=refunded_amount);
ALTER TABLE public."refund_transaction" ADD CHECK (refunded_amount<=approved_amount);
ALTER TABLE public."refund_transaction" ADD CHECK (approved_amount<=requested_amount);
ALTER TABLE public."refund_transaction" ADD CHECK (refund_status IN ('pending','approved','succeeded','failed','cancelled'));
ALTER TABLE public."refund_transaction" ADD CHECK ((refund_status='succeeded')=(completed_at IS NOT NULL));
ALTER TABLE public."refund_transaction" ADD CHECK (refund_status='succeeded' OR eligible_refund_amount=0);
ALTER TABLE public."voucher" ADD CHECK (end_date>=start_date);
ALTER TABLE public."voucher" ADD CHECK (type<>'percent' OR discount_value<=100);
ALTER TABLE public."promotion" ADD CHECK (end_date>=start_date);
ALTER TABLE public."promotion" ADD CHECK (discount_type<>'percent' OR discount_value<=100);
ALTER TABLE public."voucher_redemption" ADD CHECK (num_nonnulls(order_id,appointment_id)=1);
ALTER TABLE public."voucher_redemption" ADD CHECK (status IN ('applied','reversed','cancelled'));
ALTER TABLE public."voucher_redemption" ADD CHECK ((status='reversed')=(reversed_at IS NOT NULL));
ALTER TABLE public."review" ADD CHECK (num_nonnulls(sales_order_detail_id,appointment_item_id)=1);
ALTER TABLE public."review" ADD CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE public."support_ticket" ADD CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE public."chat_feedback" ADD CHECK (score BETWEEN 1 AND 5);
ALTER TABLE public."chat_conversation" ADD CHECK (num_nonnulls(customer_id,guest_session_id)>=1);
ALTER TABLE public.pet_breed ADD UNIQUE (species_id,breed_name);
ALTER TABLE public.customer_phone ADD UNIQUE (customer_id,phone_number);
ALTER TABLE public.cart_item ADD UNIQUE (cart_id,product_variant_id);
ALTER TABLE public.promotion_product ADD UNIQUE (promotion_id,product_variant_id);
ALTER TABLE public.promotion_service ADD UNIQUE (promotion_id,service_id);
ALTER TABLE public.appointment_record ADD UNIQUE (appointment_id,record_type,revision_no);
ALTER TABLE public.paw_point_transaction ADD UNIQUE (customer_id,sequence_no);
ALTER TABLE public.product_variant ADD UNIQUE NULLS NOT DISTINCT (product_id,color_id,size_id,flavor_id);
CREATE UNIQUE INDEX ON public.customer_phone (customer_id) WHERE is_primary;
CREATE UNIQUE INDEX ON public.customer_phone (phone_number) WHERE is_primary;
CREATE UNIQUE INDEX ON public.customer_address (customer_id) WHERE is_default;
CREATE UNIQUE INDEX ON public.appointment_item (appointment_id) WHERE is_primary;
CREATE UNIQUE INDEX ON public.service_image (service_id) WHERE is_thumbnail;
CREATE UNIQUE INDEX ON public.product_media (product_id) WHERE is_thumbnail;
CREATE UNIQUE INDEX ON public.product_variant_media (product_variant_id) WHERE is_thumbnail;
CREATE UNIQUE INDEX ON public.review (sales_order_detail_id) WHERE sales_order_detail_id IS NOT NULL;
CREATE UNIQUE INDEX ON public.review (appointment_item_id) WHERE appointment_item_id IS NOT NULL;
CREATE UNIQUE INDEX ON public.voucher_redemption (customer_voucher_id) WHERE customer_voucher_id IS NOT NULL AND status='applied';
ALTER TABLE public.service_price_matrix ADD CONSTRAINT service_price_no_overlap EXCLUDE USING gist (service_id WITH =,numrange(weight_from,weight_to,'[)') WITH &&,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE (status='active');
ALTER TABLE public.taxi_price_rule ADD CONSTRAINT taxi_price_no_overlap EXCLUDE USING gist (numrange(distance_from,distance_to,'[)') WITH &&,numrange(weight_from,weight_to,'[)') WITH &&,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE (status='active');
ALTER TABLE public.hotel_booking ADD CONSTRAINT hotel_no_overlap EXCLUDE USING gist (room_id WITH =,tstzrange(check_in_at,check_out_at,'[)') WITH &&) WHERE (status NOT IN ('cancelled','closed'));
ALTER TABLE public.staff_schedule ADD CONSTRAINT staff_no_overlap EXCLUDE USING gist (staff_id WITH =,tstzrange(start_at,end_at,'[)') WITH &&) WHERE (schedule_status='active');
ALTER TABLE public."guest_session" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."guest_session" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."guest_session" TO service_role;
ALTER TABLE public."permission" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."permission" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."permission" TO service_role;
ALTER TABLE public."access_role" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."access_role" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."access_role" TO service_role;
ALTER TABLE public."role_permission" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."role_permission" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."role_permission" TO service_role;
ALTER TABLE public."staff_role" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."staff_role" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."staff_role" TO service_role;
ALTER TABLE public."staff_permission" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."staff_permission" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."staff_permission" TO service_role;
ALTER TABLE public."customer" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."customer" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."customer" TO service_role;
ALTER TABLE public."customer_profile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."customer_profile" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."customer_profile" TO service_role;
ALTER TABLE public."customer_phone" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."customer_phone" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."customer_phone" TO service_role;
ALTER TABLE public."customer_address" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."customer_address" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."customer_address" TO service_role;
ALTER TABLE public."membership_tier" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."membership_tier" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."membership_tier" TO service_role;
ALTER TABLE public."customer_membership" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."customer_membership" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."customer_membership" TO service_role;
ALTER TABLE public."reward_rule" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."reward_rule" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."reward_rule" TO service_role;
ALTER TABLE public."paw_point_transaction" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."paw_point_transaction" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."paw_point_transaction" TO service_role;
ALTER TABLE public."voucher" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."voucher" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."voucher" TO service_role;
ALTER TABLE public."customer_voucher" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."customer_voucher" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."customer_voucher" TO service_role;
ALTER TABLE public."voucher_redemption" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."voucher_redemption" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."voucher_redemption" TO service_role;
ALTER TABLE public."pet_species" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."pet_species" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."pet_species" TO service_role;
ALTER TABLE public."pet_breed" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."pet_breed" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."pet_breed" TO service_role;
ALTER TABLE public."pet_profile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."pet_profile" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."pet_profile" TO service_role;
ALTER TABLE public."pet_weight_history" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."pet_weight_history" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."pet_weight_history" TO service_role;
ALTER TABLE public."staff_level" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."staff_level" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."staff_level" TO service_role;
ALTER TABLE public."service_category" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."service_category" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."service_category" TO service_role;
ALTER TABLE public."service" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."service" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."service" TO service_role;
ALTER TABLE public."service_image" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."service_image" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."service_image" TO service_role;
ALTER TABLE public."service_supported_species" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."service_supported_species" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."service_supported_species" TO service_role;
ALTER TABLE public."service_addon" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."service_addon" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."service_addon" TO service_role;
ALTER TABLE public."care_action" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."care_action" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."care_action" TO service_role;
ALTER TABLE public."service_care_action" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."service_care_action" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."service_care_action" TO service_role;
ALTER TABLE public."service_price_matrix" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."service_price_matrix" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."service_price_matrix" TO service_role;
ALTER TABLE public."taxi_price_rule" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."taxi_price_rule" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."taxi_price_rule" TO service_role;
ALTER TABLE public."hotel_room_type" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."hotel_room_type" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."hotel_room_type" TO service_role;
ALTER TABLE public."hotel_room" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."hotel_room" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."hotel_room" TO service_role;
ALTER TABLE public."appointment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."appointment" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."appointment" TO service_role;
ALTER TABLE public."appointment_item" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."appointment_item" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."appointment_item" TO service_role;
ALTER TABLE public."appointment_record" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."appointment_record" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."appointment_record" TO service_role;
ALTER TABLE public."appointment_adjustment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."appointment_adjustment" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."appointment_adjustment" TO service_role;
ALTER TABLE public."hotel_booking" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."hotel_booking" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."hotel_booking" TO service_role;
ALTER TABLE public."taxi_trip" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."taxi_trip" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."taxi_trip" TO service_role;
ALTER TABLE public."care_log" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."care_log" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."care_log" TO service_role;
ALTER TABLE public."care_log_media" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."care_log_media" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."care_log_media" TO service_role;
ALTER TABLE public."supplier" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."supplier" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."supplier" TO service_role;
ALTER TABLE public."product_category" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."product_category" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."product_category" TO service_role;
ALTER TABLE public."product" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."product" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."product" TO service_role;
ALTER TABLE public."product_media" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."product_media" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."product_media" TO service_role;
ALTER TABLE public."variant_color" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."variant_color" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."variant_color" TO service_role;
ALTER TABLE public."variant_size" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."variant_size" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."variant_size" TO service_role;
ALTER TABLE public."variant_flavor" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."variant_flavor" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."variant_flavor" TO service_role;
ALTER TABLE public."product_variant" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."product_variant" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."product_variant" TO service_role;
ALTER TABLE public."product_variant_media" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."product_variant_media" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."product_variant_media" TO service_role;
ALTER TABLE public."purchase_order" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."purchase_order" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."purchase_order" TO service_role;
ALTER TABLE public."purchase_order_detail" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."purchase_order_detail" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."purchase_order_detail" TO service_role;
ALTER TABLE public."cart" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."cart" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."cart" TO service_role;
ALTER TABLE public."cart_item" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."cart_item" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."cart_item" TO service_role;
ALTER TABLE public."wishlist" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."wishlist" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."wishlist" TO service_role;
ALTER TABLE public."wishlist_product" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."wishlist_product" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."wishlist_product" TO service_role;
ALTER TABLE public."wishlist_service" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."wishlist_service" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."wishlist_service" TO service_role;
ALTER TABLE public."sales_order" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."sales_order" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."sales_order" TO service_role;
ALTER TABLE public."sales_order_detail" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."sales_order_detail" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."sales_order_detail" TO service_role;
ALTER TABLE public."stock_reservation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."stock_reservation" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."stock_reservation" TO service_role;
ALTER TABLE public."inventory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."inventory" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."inventory" TO service_role;
ALTER TABLE public."inventory_transaction" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."inventory_transaction" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."inventory_transaction" TO service_role;
ALTER TABLE public."payment_method_config" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."payment_method_config" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."payment_method_config" TO service_role;
ALTER TABLE public."delivery_option_config" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."delivery_option_config" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."delivery_option_config" TO service_role;
ALTER TABLE public."shipping_provider" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."shipping_provider" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."shipping_provider" TO service_role;
ALTER TABLE public."payment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."payment" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."payment" TO service_role;
ALTER TABLE public."refund_transaction" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."refund_transaction" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."refund_transaction" TO service_role;
ALTER TABLE public."return_request" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."return_request" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."return_request" TO service_role;
ALTER TABLE public."return_request_detail" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."return_request_detail" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."return_request_detail" TO service_role;
ALTER TABLE public."return_request_evidence" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."return_request_evidence" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."return_request_evidence" TO service_role;
ALTER TABLE public."review" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."review" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."review" TO service_role;
ALTER TABLE public."review_response" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."review_response" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."review_response" TO service_role;
ALTER TABLE public."review_media" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."review_media" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."review_media" TO service_role;
ALTER TABLE public."support_ticket" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."support_ticket" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."support_ticket" TO service_role;
ALTER TABLE public."support_ticket_message" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."support_ticket_message" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."support_ticket_message" TO service_role;
ALTER TABLE public."support_ticket_message_attachment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."support_ticket_message_attachment" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."support_ticket_message_attachment" TO service_role;
ALTER TABLE public."staff" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."staff" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."staff" TO service_role;
ALTER TABLE public."staff_schedule" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."staff_schedule" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."staff_schedule" TO service_role;
ALTER TABLE public."staff_assessment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."staff_assessment" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."staff_assessment" TO service_role;
ALTER TABLE public."staff_shift_request" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."staff_shift_request" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."staff_shift_request" TO service_role;
ALTER TABLE public."promotion" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."promotion" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."promotion" TO service_role;
ALTER TABLE public."promotion_product" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."promotion_product" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."promotion_product" TO service_role;
ALTER TABLE public."promotion_service" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."promotion_service" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."promotion_service" TO service_role;
ALTER TABLE public."banner" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."banner" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."banner" TO service_role;
ALTER TABLE public."blog_category" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."blog_category" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."blog_category" TO service_role;
ALTER TABLE public."blog_post" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."blog_post" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."blog_post" TO service_role;
ALTER TABLE public."notification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."notification" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."notification" TO service_role;
ALTER TABLE public."pawpal_setting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."pawpal_setting" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."pawpal_setting" TO service_role;
ALTER TABLE public."audit_log" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."audit_log" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."audit_log" TO service_role;
ALTER TABLE public."chat_conversation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chat_conversation" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chat_conversation" TO service_role;
ALTER TABLE public."chat_message" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chat_message" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chat_message" TO service_role;
ALTER TABLE public."chat_moderation_log" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chat_moderation_log" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chat_moderation_log" TO service_role;
ALTER TABLE public."chat_feedback" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chat_feedback" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chat_feedback" TO service_role;
ALTER TABLE public."admin_copilot_history" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."admin_copilot_history" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."admin_copilot_history" TO service_role;
ALTER TABLE public."chatbot_sentiment_tier" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chatbot_sentiment_tier" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chatbot_sentiment_tier" TO service_role;
ALTER TABLE public."chatbot_sentiment_trigger" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chatbot_sentiment_trigger" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chatbot_sentiment_trigger" TO service_role;
ALTER TABLE public."chatbot_sentiment_action" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chatbot_sentiment_action" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chatbot_sentiment_action" TO service_role;
ALTER TABLE public."chatbot_compensation_policy" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chatbot_compensation_policy" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chatbot_compensation_policy" TO service_role;
ALTER TABLE public."chatbot_handover_rule" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chatbot_handover_rule" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chatbot_handover_rule" TO service_role;
ALTER TABLE public."chatbot_knowledge_faq" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chatbot_knowledge_faq" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chatbot_knowledge_faq" TO service_role;
ALTER TABLE public."chatbot_system_prompt" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chatbot_system_prompt" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chatbot_system_prompt" TO service_role;
ALTER TABLE public."chatbot_canned_response" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chatbot_canned_response" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chatbot_canned_response" TO service_role;
ALTER TABLE public."chatbot_profanity_filter" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chatbot_profanity_filter" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chatbot_profanity_filter" TO service_role;
ALTER TABLE public."chatbot_scenario_matrix" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."chatbot_scenario_matrix" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."chatbot_scenario_matrix" TO service_role;
ALTER TABLE public."document_embeddings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."document_embeddings" FROM PUBLIC,anon,authenticated;
GRANT ALL ON public."document_embeddings" TO service_role;
-- Application access policies and rules follow in 002_rules.sql.
