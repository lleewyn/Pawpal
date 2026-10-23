ENUM	MÔ TẢ	"GIÁ TRỊ ENUM
(cột này dùng cho supabase)"
account_status	Trạng thái tài khoản khách hàng.	dang_hoat_dong, tam_khoa, da_khoa
gender	Giới tính.	nam, nu, khac
reward_type	Loại phần thưởng.	paw_points, voucher
trigger_event	Sự kiện kích hoạt quy tắc thưởng.	dang_ky, mua_hang, dat_lich, danh_gia, khuyen_mai, dieu_chinh_thu_cong
voucher_type	Loại ưu đãi của voucher.	giam_gia_theo_phan_tram, giam_gia_co_dinh
applicable_for	Đối tượng áp dụng.	san_pham, dich_vu, san_pham_va_dich_vu
acquired_method	Nguồn phát hành voucher cho khách hàng.	doi_diem, khuyen_mai, tang
voucher_status	Trạng thái voucher của khách hàng.	chua_su_dung, da_su_dung, da_het_han, da_huy
species	Loài thú cưng; chỉ dùng ENUM nếu phạm vi hệ thống cố định.	cho, meo, tho, hamster, thu_nho, khac
pet_status	Trạng thái hồ sơ thú cưng.	dang_hoat_dong, tam_ngung, da_an
service_category	Nhóm dịch vụ.	grooming_spa, pet_hotel, pet_taxi
service_status	Trạng thái dịch vụ.	dang_hoat_dong, tam_ngung, ngung_cung_cap
groomer_level	Mức độ tay nghề.	co_ban, trung_cap, nang_cao, chuyen_gia
pet_type	Loại thú cưng đáp ứng.	cho, meo, tho, hamster, thu_nho, khac
room_type	Loại phòng; nên quản trị bằng danh mục nếu thường xuyên thay đổi.	standard, deluxe, vip
room_status	Trạng thái phòng.	trong, da_dat, dang_su_dung, bao_tri, khoa_hoat_dong
price_status	Trạng thái bảng giá.	dang_ap_dung, het_han, tam_ngung
taxi_rule_status	Trạng thái quy tắc giá taxi.	dang_ap_dung, het_han, tam_ngung
appointment_status	Trạng thái lịch hẹn.	cho_xac_nhan, da_xac_nhan, da_check_in, dang_thuc_hien, da_hoan_tat, da_huy, vang_mat
payment_status	Trạng thái thanh toán.	chua_thanh_toan, da_thanh_toan, thanh_toan_that_bai, da_hoan_tien
media_type	Loại tệp media.	hinh_anh, video
supplier_status	Trạng thái hợp tác với nhà cung cấp.	dang_hop_tac, tam_ngung, ngung_hop_tac
purchase_order_status	Trạng thái phiếu nhập.	nhap, da_xac_nhan, dang_nhan_hang, da_nhan_du, da_huy
product_status	Trạng thái kinh doanh sản phẩm.	dang_ban, tam_ngung, ngung_ban
cart_status	Trạng thái giỏ hàng.	dang_hoat_dong, da_chuyen_thanh_don, da_huy, da_het_han
reservation_status	Trạng thái giữ tồn kho.	dang_giu, da_hoan_tat, da_het_han, da_huy
transaction_type	Loại giao dịch kho.	nhap_kho, xuat_kho, dieu_chinh_tang, dieu_chinh_giam, hoan_kho
payment_type	Loại nghiệp vụ thanh toán.	mua_hang, dat_lich
transaction_status	Trạng thái giao dịch thanh toán.	cho_xu_ly, dang_xu_ly, thanh_cong, that_bai, da_huy, da_hoan_tien
available_status	Trạng thái khả dụng.	dang_kha_dung, tam_ngung
review_type	Loại đối tượng được đánh giá.	san_pham, dich_vu
review_status	Trạng thái kiểm duyệt đánh giá.	cho_duyet, da_duyet, an, tu_choi
sender_type	Loại người gửi.	khach_hang, nhan_vien, he_thong
channel	Kênh tiếp nhận yêu cầu.	chatbot, web, dien_thoai, facebook, zalo, email
category_ticket	Phân loại yêu cầu hỗ trợ.	don_hang, lich_hen, thanh_toan, san_pham, chat_luong_dich_vu, hoan_tien, boi_thuong, cham_soc_thu_cung, khac
priority	Mức độ ưu tiên.	thap, trung_binh, cao, khan_cap
ticket_status	Trạng thái yêu cầu hỗ trợ.	mo, dang_xu_ly, cho_khach_hang, da_giai_quyet, da_dong, tu_choi
resolution_type	Hình thức hoặc kết quả xử lý.	hoan_tien, hoan_tien_mot_phan, doi_san_pham, thuc_hien_lai_dich_vu, boi_thuong, tu_choi, khac
return_type	Hình thức đổi trả.	doi_san_pham, tra_san_pham, hoan_tien
request_status	Trạng thái yêu cầu đổi trả.	cho_xu_ly, dang_xu_ly, da_duyet, da_hoan_tat, da_tu_choi, da_huy
refund_type	Loại giao dịch hoàn tiền.	hoan_tien_toan_bo, hoan_tien_mot_phan, boi_thuong
refund_method	Phương thức hoàn tiền.	phuong_thuc_thanh_toan_ban_dau, chuyen_khoan_ngan_hang, paw_points, khac
refund_status	Trạng thái hoàn tiền.	cho_xu_ly, dang_xu_ly, da_hoan_tat, that_bai, da_huy
staff_role	Vai trò nhân viên.	chu_he_thong, quan_tri_vien, le_tan, cham_soc_thu_cung, cham_soc_khach_hang, quan_ly
availability_status	Trạng thái khả dụng của ca.	co_san, nghi_phep, nghi_om, vang_mat, khong_duoc_xep_ca
promotion_status	Trạng thái chương trình khuyến mãi.	nhap, dang_ap_dung, het_han, tam_dung, da_huy
discount_type	Loại giảm giá.	phan_tram, so_tien_co_dinh
banner_status	Trạng thái hiển thị banner.	dang_hien_thi, tam_an, het_han
blog_status	Trạng thái bài viết.	nhap, da_len_lich, da_xuat_ban, da_an
notification_type	Loại thông báo.	don_hang_moi, don_hang_da_xac_nhan, don_hang_da_giao_van, don_hang_da_giao, don_hang_da_duoc_huy, lich_hen_da_xac_nhan, lich_hen_da_thay_doi, cap_nhat_yeu_cau_ho_tro, hoan_tien_thanh_cong, hoan_tien_that_bai
setting_type	Kiểu dữ liệu logic của cấu hình.	chuoi, so, boolean, json
order_status	Trạng thái đơn hàng bán (sales_order) [THÊM MỚI].	cho_xac_nhan, da_xac_nhan, dang_dong_goi, dang_giao_hang, da_giao_hang, da_huy, da_tra_hang
shift	Ca làm việc nhân viên (staff_schedule) [THÊM MỚI].	ca_sang, ca_chieu, ca_toi
schedule_status	Trạng thái ca làm việc trong lịch trực (staff_schedule) [THÊM MỚI].	da_len_lich, dang_lam_viec, da_hoan_thanh, nghi
category_status	Trạng thái danh mục sản phẩm và bài viết (product_category, blog_category) [THÊM MỚI].	dang_hoat_dong, tam_ngung
hotel_booking_status	Trạng thái đặt phòng lưu trú Pet Hotel (hotel_booking) [THÊM MỚI].	cho_nhan_phong, dang_o, da_tra_phong, da_huy
shift_request_type	Loại yêu cầu ca trực nhân viên (staff_shift_request) [THÊM MỚI].	xin_nghi, doi_ca, tang_ca
shift_request_status	Trạng thái duyệt yêu cầu ca trực (staff_shift_request) [THÊM MỚI].	cho_duyet, da_duyet, tu_choi