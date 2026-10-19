STT	THỰC THỂ	MÔ TẢ	THUỘC TÍNH	Ý NGHĨA THUỘC TÍNH
1	customer	Lưu thông tin tài khoản đăng nhập và trạng thái sử dụng hệ thống của khách hàng	id	Mã định danh khách hàng
			membership_tier_id	
			auth_user_id	
			email	Email đăng ký hoặc liên hệ
			password_hash	Mật khẩu đã mã hóa
			account_status	Trạng thái tài khoản
			is_temporary	Cho biết tài khoản có phải tài khoản tạm thời hay không
			phone_main	Số điện thoại chính của khách hàng
				
			registered_at	Thời điểm khách hàng đăng ký
			note	Ghi chú nội bộ về khách hàng
			created_at	Thời điểm tạo tài khoản
			updated_at	Thời điểm cập nhật tài khoản gần nhất
			activation_token	
			activation_token_expires_at	
2	customer_profile	Lưu thông tin hồ sơ cá nhân của khách hàng	id	Mã định danh hồ sơ
			customer_id	Khách hàng sở hữu hồ sơ
			full_name	Họ tên khách hàng
			date_of_birth	Ngày sinh khách hàng
			gender	Giới tính khách hàng
			created_at	Thời điểm tạo hồ sơ
			updated_at	Thời điểm cập nhật hồ sơ gần nhất
3	customer_membership	Lưu thông tin hạng thành viên và điểm thưởng của khách hàng	id	Mã định danh bản ghi
			customer_id	Khách hàng sở hữu hạng thành viên
			membership_tier_id	Hạng thành viên hiện tại của khách hàng
			total_paw_points	Số Paw Points khách hàng đang có
			tier_points	
			created_at	Thời điểm tạo hồ sơ thành viên
			updated_at	Thời điểm cập nhật điểm hoặc hạng gần nhất
4	customer_address	Lưu nhiều địa chỉ giao hàng, đón trả thú cưng hoặc địa chỉ đặt hộ của khách hàng	id	Mã định danh địa chỉ
			customer_id	Khách hàng sở hữu địa chỉ
			receiver_name	Tên người nhận tại địa chỉ
			receiver_phone	Số điện thoại người nhận
			province	Tỉnh hoặc thành phố của địa chỉ
			street_address	Địa chỉ chi tiết
			postal_code	Mã bưu chính
			is_default	Cho biết đây có phải địa chỉ mặc định hay không
			created_at	Thời điểm tạo địa chỉ
			updated_at	Thời điểm cập nhật địa chỉ gần nhất
5	customer_phone	Lưu nhiều số điện thoại liên hệ của khách hàng, người thân hoặc người nhận thay	id	Mã định danh số điện thoại
			customer_id	Khách hàng sở hữu số điện thoại
			phone_number	Số điện thoại liên hệ
			is_verified	Cho biết số điện thoại đã xác minh hay chưa
			created_at	Thời điểm thêm số điện thoại
			updated_at	Thời điểm cập nhật số điện thoại gần nhất
6	membership_tier	Lưu cấu hình các hạng thành viên như Bạc, Vàng, Kim Cương	id	Mã định danh hạng thành viên
			tier_name	Tên hạng thành viên
			minimum_expenditure	Mức chi tiêu tối thiểu để đạt hạng
			discount_percent	Tỷ lệ giảm giá của hạng
			description	Quyền lợi của hạng thành viên
			is_active	Hạng thành viên có đang áp dụng hay không
			created_at	Thời điểm tạo hạng
			updated_at	Thời điểm cập nhật hạng gần nhất
7	reward_rule	Lưu quy tắc cộng hoặc trừ Paw Points theo từng sự kiện như đăng ký, đặt lịch, mua hàng, đánh giá hoặc chương trình khuyến mãi	id	Mã định danh quy tắc
			rule_name	Tên quy tắc thưởng
			reward_type	Loại phần thưởng
			trigger_event	Sự kiện làm phát sinh phần thưởng
			reward_value	Giá trị phần thưởng
			description	Mô tả cách áp dụng quy tắc
			is_active	Quy tắc có đang áp dụng hay không
			created_at	Thời điểm tạo quy tắc
			updated_at	Thời điểm cập nhật quy tắc gần nhất
8	paw_point_transaction	Lưu toàn bộ lịch sử cộng, trừ và quy đổi Paw Point	id	Mã định danh giao dịch điểm
			customer_id	Khách hàng phát sinh giao dịch điểm
			payment_id	Giao dịch thanh toán liên quan
			review_id	Đánh giá làm phát sinh điểm
			reward_rule_id	Quy tắc tạo giao dịch điểm
			points	Số điểm cộng hoặc trừ
			balance_after	Số điểm còn lại sau giao dịch
			description	Lý do phát sinh giao dịch điểm
			created_at	Thời điểm phát sinh giao dịch
9	voucher	Lưu danh mục voucher có thể phát hành hoặc	id	Mã định danh voucher
			voucher_code	Mã voucher khách hàng nhập khi sử dụng
			voucher_name	Tên voucher
			discount_value	Giá trị giảm giá
			minimum_order_amount	Giá trị đơn tối thiểu để dùng voucher
			required_points	Số Paw Points cần để đổi voucher
			start_date	Ngày bắt đầu áp dụng voucher
			end_date	Ngày kết thúc áp dụng voucher
			is_active	Voucher có đang được kích hoạt hay không
			type	Cách tính mức giảm
			description	Điều kiện hoặc nội dung voucher
			applicable_for	Đối tượng được áp dụng voucher
			usage_count	Số lần voucher đã được sử dụng
			max_usage	Số lần voucher được phép sử dụng
			created_at	Thời điểm tạo voucher
			updated_at	Thời điểm cập nhật voucher gần nhất
10	customer_voucher	Lưu danh sách voucher mà khách hàng đang sở hữu hoặc đã sử dụng	id	Mã định danh bản ghi
			customer_id	Khách hàng sở hữu voucher
			voucher_id	Voucher được khách hàng nhận
			acquired_method	Cách khách hàng nhận voucher
			voucher_status	Tình trạng sử dụng voucher
			acquired_at	Thời điểm khách hàng nhận voucher
			used_at	Thời điểm voucher được sử dụng
			expired_at	Thời điểm voucher hết hạn
11	pet_profile	Lưu hồ sơ định danh Pet ID, tên thú cưng, giống loài, giới tính, ngày sinh và trạng thái hoạt động	id	Mã định danh hồ sơ thú cưng
			customer_id	Chủ sở hữu thú cưng
			pet_code	Mã Pet ID của thú cưng
			pet_name	Tên thú cưng
			avatar_url	Ảnh đại diện của thú cưng
			species	Loài thú cưng
			breed	Giống thú cưng
			gender	Giới tính thú cưng
			date_of_birth	Ngày sinh thú cưng
			color	Màu lông thú cưng
			routine	Thói quen và sở thích của thú cưng
			weight	Cân nặng hiện tại của thú cưng
			vaccination_history	Lịch sử tiêm phòng của thú cưng
			allergy	Thông tin dị ứng cần lưu ý khi chăm sóc
			status	Trạng thái hồ sơ thú cưng
			created_at	Thời điểm tạo hồ sơ thú cưng
			updated_at	Thời điểm cập nhật hồ sơ gần nhất
12	service	Lưu danh mục các dịch vụ thuộc các nhóm Grooming & Spa, Pet Hotel và Pet Taxi	id	Mã định danh dịch vụ
			service_code	Mã dịch vụ
			service_name	Tên dịch vụ
			service_category	Nhóm dịch vụ
			description	Mô tả dịch vụ
			estimated_duration	Thời gian thực hiện dự kiến, tính bằng phút
			thumbnail_url	Ảnh đại diện của dịch vụ
			status	Trạng thái cung cấp dịch vụ
			rating	Điểm đánh giá trung bình của dịch vụ
			commission_rate	
			staff_level_required	
			review_count	Số lượt đánh giá dịch vụ
			benefits	Lợi ích của dịch vụ
			checklist	Các bước thực hiện dịch vụ
			amenities	Tiện ích đi kèm dịch vụ
			groomer_level	Yêu cầu tay nghề thực hiện dịch vụ
			pet_type	Loại thú cưng dịch vụ hỗ trợ
			images	Danh sách ảnh của dịch vụ
			created_at	Thời điểm tạo dịch vụ
			updated_at	Thời điểm cập nhật dịch vụ gần nhất
13	service_addon	Lưu danh sách các dịch vụ bổ sung đi kèm dịch vụ chính (Spa, Hotel, Taxi), bao gồm giá, thời lượng và trạng thái áp dụng.	id	Mã định danh dịch vụ bổ sung
			service_id	Dịch vụ chính áp dụng addon
			addon_name	Tên dịch vụ bổ sung
			description	Mô tả dịch vụ bổ sung
			price	Giá dịch vụ bổ sung
			estimated_duration	Thời gian thực hiện dự kiến, tính bằng phút
			is_required	Cho biết addon có bắt buộc hay không
			status	Trạng thái cung cấp addon
			created_at	Thời điểm tạo addon
			updated_at	Thời điểm cập nhật addon gần nhất
14	hotel_room	Phòng vật lý thực tế tại cơ sở lưu trú, thuộc một loại phòng cụ thể và được quản lý theo số phòng và trạng thái sử dụng.	id	Mã định danh phòng
			room_number	Số hoặc mã phòng thực tế
			room_type_id	Loại phòng của phòng thực tế
			status	Trạng thái sử dụng của phòng
			description	Ghi chú riêng của phòng
			created_at	Thời điểm tạo phòng
			updated_at	Thời điểm cập nhật phòng gần nhất
15	hotel_room_type	Loại phòng khách sạn dành cho thú cưng, lưu thông tin cấu hình và mức giá dùng chung cho các phòng cùng loại.	id	Mã định danh loại phòng
			room_type	Tên loại phòng
			capacity	Sức chứa tối đa của loại phòng
			daily_price	Giá thuê phòng theo ngày
			description	Mô tả loại phòng
			amenities	Tiện ích của loại phòng
			status	Trạng thái cung cấp loại phòng
			created_at	Thời điểm tạo loại phòng
			updated_at	Thời điểm cập nhật loại phòng gần nhất
16	service_price_matrix	Lưu bảng giá của từng dịch vụ theo loài thú cưng, cân nặng hoặc điều kiện áp dụng	id	Mã định danh bảng giá
			service_id	Dịch vụ áp dụng bảng giá
			weight_from	Mức cân nặng tối thiểu của khoảng giá
			weight_to	Mức cân nặng tối đa của khoảng giá
			unit_price	Giá dịch vụ theo khoảng điều kiện
			effective_from	Thời điểm bắt đầu áp dụng giá
			effective_to	Thời điểm kết thúc áp dụng giá
			status	Trạng thái bảng giá
			created_at	Thời điểm tạo bảng giá
			updated_at	Thời điểm cập nhật bảng giá gần nhất
17	taxi_price_rule	Lưu các quy tắc tính giá dịch vụ Pet Taxi theo khoảng cách, cân nặng và thời gian hiệu lực của bảng giá.	id	Mã định danh quy tắc giá
			distance_from	Mức khoảng cách tối thiểu của quy tắc
			distance_to	Mức khoảng cách tối đa của quy tắc
			weight_from	Mức cân nặng tối thiểu của quy tắc
			weight_to	Mức cân nặng tối đa của quy tắc
			base_price	Giá cơ bản của chuyến taxi
			surcharge	Phụ phí của quy tắc giá
			effective_from	Thời điểm bắt đầu áp dụng quy tắc
			effective_to	Thời điểm kết thúc áp dụng quy tắc
			status	Trạng thái quy tắc giá
			created_at	Thời điểm tạo quy tắc
			updated_at	Thời điểm cập nhật quy tắc gần nhất
18	appointment	Lưu phiếu đặt lịch dịch vụ của khách hàng cho từng thú cưng	id	Mã định danh lịch hẹn
			appointment_code	Mã lịch hẹn hiển thị
			customer_id	Khách hàng đặt lịch
			pet_id	Thú cưng sử dụng dịch vụ
			service_id	Dịch vụ được đặt
			staff_id	Nhân viên được phân công
			support_ticket_id	Yêu cầu hỗ trợ liên quan
			appointment_date	Ngày thực hiện dịch vụ
			appointment_time	Giờ bắt đầu dự kiến
			check_in_time	Thời điểm khách đưa thú cưng đến
			check_out_time	Thời điểm hoàn tất bàn giao thú cưng
			note	Ghi chú của khách hàng khi đặt lịch
			change_count	Số lần khách đổi lịch
			appointment_status	Trạng thái lịch hẹn
			payment_status	Trạng thái thanh toán của lịch hẹn
			total_price	Tổng tiền của lịch hẹn
			created_at	Thời điểm tạo lịch hẹn
			updated_at	Thời điểm cập nhật lịch hẹn gần nhất
19	care_log	Lưu toàn bộ timeline chăm sóc trong quá trình thực hiện dịch vụ	id	Mã định danh Care Log
			appointment_id	Lịch hẹn phát sinh Care Log
			pet_id	Thú cưng được chăm sóc
			care_action_id	Mốc chăm sóc được ghi nhận
			description	Nội dung nhân viên ghi nhận
			health_status	Tình trạng thú cưng khi ghi nhận
			recorded_at	Thời điểm ghi nhận Care Log
			created_at	Thời điểm tạo Care Log
			updated_at	Thời điểm cập nhật Care Log gần nhất
20	care_log_media	Lưu ảnh và video minh chứng được cập nhật vào Care Log	id	Mã định danh media
			care_log_id	Care Log chứa media
			media_type	Loại media
			media_url	Đường dẫn file media
			file_name	Tên file media
			file_size	Dung lượng file tính bằng byte
			staff_id	Nhân viên tải media lên
			uploaded_at	Thời điểm tải media lên
			created_at	Thời điểm tạo bản ghi media
21	care_action	Lưu danh mục các mốc chăm sóc như Tắm,	id	Mã định danh hoạt động chăm sóc
			service_id	Dịch vụ áp dụng hoạt động chăm sóc
			action_name	Tên mốc chăm sóc
			service_category	Nhóm dịch vụ áp dụng
			display_order	Thứ tự hiển thị mốc chăm sóc
			estimated_duration	Thời gian thực hiện dự kiến, tính bằng phút
			is_active	Mốc chăm sóc có đang được sử dụng hay không
			created_at	Thời điểm tạo mốc chăm sóc
			updated_at	Thời điểm cập nhật mốc chăm sóc gần nhất
22	supplier	Lưu thông tin nhà cung cấp sản phẩm	id	Mã định danh nhà cung cấp trong PawPal.
			supplier_name	Tên nhà cung cấp sản phẩm mà PawPal hợp tác.
			contact_person	Người phụ trách liên hệ phía nhà cung cấp.
			phone_number	Số điện thoại liên hệ chính với nhà cung cấp.
			email	Email dùng để liên hệ hoặc nhận chứng từ từ nhà cung cấp.
			address	Địa chỉ giao dịch hoặc nhận hàng của nhà cung cấp.
			status	Trạng thái hợp tác hiện tại với nhà cung cấp.
			created_at	Thời điểm tạo hồ sơ nhà cung cấp.
			updated_at	Thời điểm cập nhật hồ sơ nhà cung cấp gần nhất.
23	purchase_order	Lưu phiếu nhập hàng từ nhà cung cấp	id	Mã định danh phiếu nhập hàng.
			supplier_id	Nhà cung cấp thực hiện giao lô hàng này.
			order_number	Mã phiếu nhập dùng để tra cứu và đối soát.
			order_date	Ngày PawPal tạo hoặc ghi nhận phiếu nhập.
			expected_date	Ngày dự kiến nhận hàng từ nhà cung cấp.
			total_amount	Tổng giá trị hàng hóa của phiếu nhập.
			order_status	Trạng thái xử lý phiếu nhập.
			note	Ghi chú thêm về phiếu nhập hoặc lô hàng.
			created_at	Thời điểm tạo phiếu nhập.
			updated_at	Thời điểm cập nhật phiếu nhập gần nhất.
24	purchase_order_detail	Lưu chi tiết từng sản phẩm trong phiếu nhập hàng	id	Mã định danh dòng chi tiết phiếu nhập.
			purchase_order_id	Phiếu nhập chứa sản phẩm này.
			product_variant_id	Biến thể sản phẩm thực tế được nhập vào kho.
			quantity	Số lượng sản phẩm được đặt nhập theo phiếu.
			unit_price	Giá nhập trên mỗi đơn vị sản phẩm.
			subtotal	Thành tiền của dòng nhập = quantity × unit_price.
			received_quantity	Số lượng thực tế đã nhận vào kho.
25	product	Lưu danh mục sản phẩm kinh	id	Mã định danh sản phẩm gốc, dùng để gom các biến thể cùng một sản phẩm.
			category_id	Nhóm sản phẩm mà sản phẩm thuộc về.
			product_name	Tên sản phẩm hiển thị cho khách hàng.
			brand_name	Tên thương hiệu của sản phẩm.
			unit	Đơn vị bán cơ bản của sản phẩm.
			target_pet	Loài thú cưng mà sản phẩm hướng đến.
			min_price	Giá thấp nhất trong các biến thể của sản phẩm.
			description	Mô tả sản phẩm, thành phần hoặc thông tin sử dụng.
			slug	Đường dẫn định danh trang chi tiết sản phẩm.
			status	Trạng thái kinh doanh của sản phẩm.
			created_at	Thời điểm tạo sản phẩm.
			updated_at	Thời điểm cập nhật sản phẩm gần nhất.
			image_urls	
			origin	
			ingredients	
			benefits	
			usage_instructions	
			specs	
			badge	
			rating	
			review_count	
26	product_category	Lưu danh mục nhóm sản phẩm	id	Mã định danh danh mục sản phẩm.
			category_name	Tên danh mục sản phẩm hiển thị trong quản trị và website.
			description	Mô tả phạm vi hoặc nội dung của danh mục.
			status	Trạng thái sử dụng của danh mục.
			created_at	Thời điểm tạo danh mục.
			updated_at	Thời điểm cập nhật danh mục gần nhất.
27	product_variant	Lưu từng phiên bản cụ thể của một sản phẩm theo màu sắc, kích thước, kiểu dáng, SKU và giá bán riêng.	id	Mã định danh biến thể sản phẩm.
			product_id	Sản phẩm gốc chứa biến thể này.
			color_id	Màu sắc của biến thể nếu sản phẩm có phân loại màu.
			size_id	Kích thước hoặc quy cách của biến thể.
			flavor_id	Hương vị của biến thể nếu sản phẩm có phân loại hương vị.
			sku_variant	Mã SKU duy nhất dùng để bán hàng và quản lý tồn kho cho đúng biến thể.
			cost_price	Giá vốn của biến thể tại thời điểm quản lý sản phẩm.
			sale_price	Giá bán hiện tại của biến thể.
			compare_at_price	Giá niêm yết dùng để so sánh với sale_price khi hiển thị khuyến mãi.
			weight	Khối lượng/quy cách của biến thể phục vụ hiển thị và nghiệp vụ bán hàng.
			barcode	Mã vạch của biến thể dùng cho bán hàng và kiểm kho.
			status	Trạng thái kinh doanh của biến thể.
			created_at	Thời điểm tạo biến thể.
			updated_at	Thời điểm cập nhật biến thể gần nhất.
28	product_variant_media		id	Mã định danh bản ghi hình ảnh biến thể.
			product_variant_id	Biến thể sản phẩm sở hữu hình ảnh này.
			image_url	Đường dẫn đến file hình ảnh biến thể được lưu trữ.
			display_order	Thứ tự hình ảnh khi hiển thị trên trang sản phẩm.
			is_thumbnail	Xác định hình ảnh đại diện của biến thể.
			created_at	Thời điểm tạo bản ghi hình ảnh.
			updated_at	Thời điểm cập nhật bản ghi hình ảnh gần nhất.
29	variant_flavor	Lưu danh mục hương vị hoặc mùi hương dùng chung cho các biến thể sản phẩm.	id	Mã định danh hương vị.
			flavor_name	Tên hương vị sản phẩm như gà, bò, cá hồi.
			display_order	Thứ tự hiển thị hương vị trên giao diện chọn biến thể.
			is_active	Cho biết hương vị còn được phép sử dụng cho biến thể mới hay không.
			created_at	Thời điểm tạo hương vị.
			updated_at	Thời điểm cập nhật hương vị gần nhất.
30	variant_size	Lưu định dạng kích thước sản phẩm	id	Mã định danh kích thước/quy cách.
			size_name	Tên kích thước hoặc quy cách như S, M, L, 200g, 500g.
			display_order	Thứ tự hiển thị kích thước/quy cách trên giao diện.
			is_active	Cho biết kích thước/quy cách còn được phép sử dụng cho biến thể mới hay không.
			created_at	Thời điểm tạo kích thước/quy cách.
			updated_at	Thời điểm cập nhật kích thước/quy cách gần nhất.
31	variant_color	Lưu định dạng màu sắc sản phẩm	id	Mã định danh màu sắc.
			color_name	Tên màu hiển thị cho khách hàng.
			hex_code	Mã màu dùng để hiển thị swatch màu trên website.
			display_order	Thứ tự hiển thị màu trên giao diện.
			is_active	Cho biết màu còn được phép sử dụng cho biến thể mới hay không.
			created_at	Thời điểm tạo màu.
			updated_at	Thời điểm cập nhật màu gần nhất.
32	cart	Lưu giỏ hàng hiện tại của khách trước khi tạo đơn hàng	id	Mã định danh giỏ hàng.
			customer_id	Khách hàng sở hữu giỏ hàng.
			cart_status	Trạng thái vòng đời của giỏ hàng.
			total_quantity	Tổng số lượng sản phẩm trong giỏ hàng.
			total_amount	Tổng tiền hiện tại của các sản phẩm trong giỏ.
			created_at	Thời điểm tạo giỏ hàng.
			updated_at	Thời điểm cập nhật giỏ hàng gần nhất.
33	cart_item	Lưu danh sách sản phẩm được thêm vào giỏ hàng	id	Mã định danh dòng sản phẩm trong giỏ.
			cart_id	Giỏ hàng chứa sản phẩm này.
			product_variant_id	Biến thể sản phẩm khách đang mua.
			quantity	Số lượng biến thể được chọn trong giỏ.
			unit_price	Giá bán của biến thể tại thời điểm được thêm/cập nhật vào giỏ.
			subtotal	Thành tiền của dòng sản phẩm = quantity × unit_price.
			created_at	Thời điểm thêm sản phẩm vào giỏ.
			updated_at	Thời điểm cập nhật dòng sản phẩm trong giỏ.
34	wishlist	Lưu danh sách sản phẩm yêu thích của khách hàng	id	Mã định danh danh sách yêu thích.
			customer_id	Khách hàng sở hữu danh sách yêu thích.
			created_at	Thời điểm tạo danh sách yêu thích.
			updated_at	Thời điểm cập nhật danh sách yêu thích gần nhất.
35	wishlist_item	Lưu các sản phẩm cụ thể nằm trong Wishlist	id	Mã định danh dòng yêu thích.
			wishlist_id	Danh sách yêu thích chứa mục này.
			product_id	Sản phẩm được khách hàng yêu thích.
			service_id	Dịch vụ được khách hàng yêu thích.
			added_at	Thời điểm khách hàng thêm sản phẩm/dịch vụ vào Wishlist.
36	sales_order	Lưu đơn hàng mua sắm trên website hoặc tại cửa hàng	id	Mã định danh đơn hàng.
			order_code	Mã đơn hàng hiển thị cho khách và Admin.
			customer_id	Khách hàng sở hữu đơn hàng.
			shipping_address_id	Địa chỉ nhận hàng được sử dụng cho đơn.
			delivery_id	Hình thức giao hàng được áp dụng cho đơn.
			shipping_provider_id	Đơn vị vận chuyển thực tế phụ trách đơn.
			tracking_code	Mã vận đơn do đơn vị vận chuyển cung cấp.
			shipped_at	Thời điểm đơn được bàn giao cho đơn vị vận chuyển.
			delivered_at	Thời điểm đơn được xác nhận giao thành công.
			order_status	Trạng thái xử lý đơn hàng.
			payment_status	Trạng thái thanh toán hiện tại của đơn hàng.
			total_amount	Tổng giá trị phải thu của đơn hàng sau khi áp dụng giảm giá theo nghiệp vụ.
			note	Ghi chú khách hàng gửi khi đặt đơn.
			created_at	Thời điểm tạo đơn hàng.
			updated_at	Thời điểm cập nhật đơn hàng gần nhất.
37	sales_order_detail	Lưu chi tiết sản phẩm, số lượng và đơn giá trong từng đơn hàng	id	Mã định danh dòng chi tiết đơn hàng.
			order_id	Đơn hàng chứa dòng sản phẩm này.
			product_variant_id	Biến thể SKU thực tế khách mua.
			quantity	Số lượng SKU được mua trong dòng đơn.
			unit_price	Đơn giá SKU tại thời điểm chốt đơn.
			discount_amount	Số tiền giảm trực tiếp trên dòng sản phẩm.
			subtotal	Thành tiền của dòng sản phẩm sau khi áp dụng giảm giá.
38	stock_reservation	Lưu thông tin giữ trước số lượng tồn kho của từng biến thể sản phẩm	id	Mã định danh lượt giữ hàng.
			product_variant_id	Biến thể SKU đang được giữ tồn kho.
			customer_id	Khách hàng yêu cầu giữ tồn kho.
			cart_id	Giỏ hàng tạo ra lượt giữ tồn kho.
			quantity	Số lượng SKU được giữ tạm.
			reserved_at	Thời điểm hệ thống bắt đầu giữ hàng.
			expires_at	Thời điểm reservation hết hiệu lực nếu khách không hoàn tất giao dịch.
			status	Trạng thái của lượt giữ hàng.
			created_at	Thời điểm tạo reservation.
			updated_at	Thời điểm cập nhật reservation gần nhất.
39	inventory	Lưu số lượng tồn kho hiện tại của từng sản phẩm	id	Mã định danh bản ghi tồn kho.
			product_variant_id	Biến thể SKU được quản lý tồn kho.
			quantity_in_stock	Số lượng thực tế đang có trong kho.
			minimum_stock	Mức tồn kho tối thiểu để phát cảnh báo sắp hết hàng.
			quantity_reserved	Số lượng đang được giữ cho các giỏ/đơn chưa hoàn tất.
			last_updated_at	Thời điểm số liệu tồn kho được cập nhật gần nhất.
40	inventory_transaction	Lưu lịch sử nhập kho, xuất kho và điều chỉnh tồn kho	id	Mã định danh giao dịch kho.
			purchase_order_id	Phiếu nhập hàng liên quan nếu giao dịch phát sinh từ nhập hàng.
			product_variant_id	Biến thể SKU phát sinh thay đổi tồn kho.
			transaction_type	Loại thay đổi tồn kho.
			quantity	Số lượng tồn kho thay đổi trong giao dịch.
			stock_before	Số lượng tồn kho trước giao dịch.
			stock_after	Số lượng tồn kho sau giao dịch.
			note	Lý do hoặc ghi chú về giao dịch điều chỉnh kho.
			staff_id	Nhân viên thực hiện hoặc xác nhận giao dịch kho.
			created_at	Thời điểm phát sinh giao dịch kho.
41	payment	Lưu lịch sử thanh toán, phương thức thanh toán và trạng thái giao dịch	id	Mã định danh giao dịch thanh toán.
			payment_code	Mã giao dịch thanh toán dùng để đối soát.
			customer_id	Khách hàng thực hiện thanh toán.
			appointment_id	Lịch hẹn được thanh toán nếu payment_type là dat_lich.
			order_id	Đơn hàng được thanh toán nếu payment_type là mua_hang.
			voucher_id	Voucher được áp dụng cho giao dịch nếu có.
			payment_method_config_id	Phương thức thanh toán được sử dụng.
			payment_type	Loại giao dịch thanh toán.
			amount	Số tiền thực tế của giao dịch thanh toán.
			paw_points_used	Số Paw Points khách sử dụng để thanh toán/giảm giá.
			paw_points_earned	Số Paw Points khách được cộng từ giao dịch.
			transaction_status	Trạng thái xử lý giao dịch thanh toán.
			created_at	Thời điểm tạo giao dịch thanh toán.
			updated_at	Thời điểm cập nhật giao dịch thanh toán gần nhất.
42	payment_method_config	Lưu thông tin các loại phương thức thanh toán khả dụng	id	Mã định danh phương thức thanh toán.
			name	Tên phương thức thanh toán hiển thị cho khách.
			short_name	Tên viết tắt dùng trong giao diện/quản trị.
			description	Mô tả cách thức hoặc điều kiện sử dụng phương thức.
			icon	Thông tin nhận diện icon hiển thị cho phương thức thanh toán.
			fee	Phí cố định áp dụng cho phương thức thanh toán nếu có.
			available	Cho biết phương thức hiện có được phép sử dụng hay không.
			requires_info	Thông tin bổ sung cần thu thập khi khách chọn phương thức.
			redirect_url	URL chuyển khách sang cổng thanh toán nếu phương thức yêu cầu.
			bank_info	Thông tin tài khoản ngân hàng dùng cho chuyển khoản.
			created_at	Thời điểm tạo cấu hình phương thức.
43	delivery_option_config	Lưu thông tin các hình thức giao hàng	id	Mã định danh hình thức giao hàng.
			name	Tên hình thức giao hàng hiển thị cho khách.
			description	Mô tả phạm vi hoặc điều kiện của hình thức giao hàng.
			fee	Phí giao hàng cơ bản của hình thức.
			estimated_days	Số ngày dự kiến giao hàng.
			icon	Thông tin nhận diện icon của hình thức giao hàng.
			available	Cho biết hình thức giao hàng có đang được phép chọn hay không.
			created_at	Thời điểm tạo cấu hình giao hàng.
44	shipping_provider	Lưu danh sách các đơn vị vận chuyển mà PawPal sử dụng để giao đơn hàng, giúp Admin quản lý đối tác giao hàng và liên	id	Mã định danh đơn vị vận chuyển.
			provider_name	Tên đơn vị vận chuyển mà PawPal hợp tác.
			provider_code	Mã định danh ngắn của đơn vị vận chuyển trong hệ thống.
			logo_url	Đường dẫn logo của đơn vị vận chuyển.
			contact_phone	Số điện thoại liên hệ của đơn vị vận chuyển.
			tracking_url	Mẫu URL dùng để tra cứu vận đơn.
			status	Trạng thái hợp tác/sử dụng đơn vị vận chuyển.
			created_at	Thời điểm tạo đơn vị vận chuyển.
			updated_at	Thời điểm cập nhật thông tin đơn vị vận chuyển gần nhất.
45	review	Lưu đánh giá của khách hàng cho sản phẩm hoặc dịch vụ	id	Mã định danh đánh giá.
			customer_id	Khách hàng thực hiện đánh giá.
			appointment_id	Lịch hẹn làm cơ sở cho đánh giá dịch vụ.
			sales_order_id	Đơn hàng làm cơ sở cho đánh giá sản phẩm.
			product_id	Sản phẩm được đánh giá.
			service_id	Dịch vụ được đánh giá.
			review_type	Loại đối tượng được khách hàng đánh giá.
			rating	Số sao khách hàng chấm cho sản phẩm/dịch vụ.
			review_content	Nội dung nhận xét của khách hàng.
			image_urls	Danh sách URL hình ảnh khách gửi kèm đánh giá.
			review_status	Trạng thái kiểm duyệt và hiển thị đánh giá.
			shop_reply	
			created_at	Thời điểm khách tạo đánh giá.
			updated_at	Thời điểm cập nhật đánh giá gần nhất.
46	review_response	Lưu phản hồi của Admin đối với đánh giá của khách hàng	id	Mã định danh phản hồi đánh giá.
			review_id	Đánh giá được Admin phản hồi.
			staff_id	Nhân viên/Admin thực hiện phản hồi.
			response_content	Nội dung phản hồi của Admin đối với khách hàng.
			created_at	Thời điểm tạo phản hồi.
			updated_at	Thời điểm cập nhật phản hồi gần nhất.
47	support_ticket	Lưu các yêu cầu hỗ trợ, khiếu nại, tranh chấp và yêu cầu xử lý phát sinh từ khách hàng trong quá trình sử dụng dịch vụ/mua hàng. Đây là thực thể trung tâm để theo dõi toàn bộ vụ việc từ lúc tiếp nhận đến khi giải quyết và đóng yêu cầu.	id	Mã định danh yêu cầu hỗ trợ.
			ticket_code	Mã yêu cầu hỗ trợ/khiếu nại dùng để khách hàng và Admin tra cứu.
			customer_id	Khách hàng tạo yêu cầu hỗ trợ.
			user_id	
			order_id	Đơn hàng liên quan đến yêu cầu nếu có.
			appointment_id	Lịch hẹn liên quan đến yêu cầu nếu có.
			channel	Kênh khách hàng sử dụng để gửi yêu cầu.
			category	Loại vấn đề hoặc yêu cầu cần xử lý.
			title	
			subject	Tiêu đề ngắn giúp Admin nhận diện nội dung ticket.
			description	Nội dung ban đầu khách hàng cung cấp về vấn đề cần hỗ trợ.
			priority	Mức độ ưu tiên xử lý ticket.
			type	
			status	Trạng thái xử lý hiện tại của ticket.
			requested_resolution	Phương án xử lý mà khách hàng đề nghị.
			requested_amount	Số tiền khách hàng đề nghị hoàn/bồi thường nếu có.
			assigned_staff_id	Nhân viên đang được phân công xử lý ticket.
			first_response_at	Thời điểm PawPal gửi phản hồi đầu tiên cho khách hàng.
			investigation_note	Ghi chú nội bộ về quá trình xác minh vụ việc và bằng chứng.
			resolution_type	Kết quả xử lý cuối cùng của ticket.
			resolution_note	Ghi chú giải thích phương án xử lý cuối cùng.
			approved_amount	Số tiền được PawPal phê duyệt hoàn/bồi thường.
			resolved_by	Nhân viên thực hiện hoặc phê duyệt kết quả xử lý.
			resolved_at	Thời điểm ticket được xác định là đã giải quyết.
			closed_at	Thời điểm ticket chính thức đóng.
			rating	Điểm khách hàng đánh giá chất lượng xử lý ticket.
			rating_comment	Nhận xét của khách hàng về quá trình hỗ trợ.
			created_at	Thời điểm tạo ticket.
			updated_at	Thời điểm cập nhật ticket gần nhất.
48	support_ticket_message	Lưu toàn bộ nội dung trao đổi, phản hồi, bằng chứng và ghi chú trong quá trình xử lý một support ticket.	id	Mã định danh tin nhắn/ghi nhận trao đổi.
			ticket_id	Ticket chứa nội dung trao đổi này.
			sender_type	Loại người gửi nội dung.
			sender_id	Định danh người gửi tương ứng với sender_type.
			content	Nội dung tin nhắn, phản hồi hoặc ghi chú được lưu trong ticket.
			agent_name	
			attachment_urls	Danh sách đường dẫn file/hình ảnh bằng chứng đính kèm.
			is_internal	Xác định nội dung chỉ dành cho nội bộ hay được hiển thị cho khách.
			created_at	Thời điểm ghi nhận nội dung trao đổi.
49	return_request	Lưu yêu cầu đổi trả sản phẩm và thông tin hậu mãi	id	Mã định danh yêu cầu đổi trả.
			sales_order_id	Đơn hàng phát sinh yêu cầu đổi trả.
			customer_id	Khách hàng gửi yêu cầu đổi trả.
			refund_transaction_id	Giao dịch hoàn tiền thực tế liên quan đến yêu cầu nếu có.
			resolution_type	Kết quả xử lý cuối cùng của yêu cầu đổi trả.
			refund_amount	Số tiền dự kiến/được hoàn cho yêu cầu đổi trả.
			resolved_by	Nhân viên/Admin chốt kết quả yêu cầu đổi trả.
			reason	Lý do khách hàng yêu cầu đổi/trả.
			return_type	Loại yêu cầu đổi/trả của khách hàng.
			description	Thông tin chi tiết bổ sung về tình trạng hoặc yêu cầu đổi trả.
			evidence_images	Danh sách hình ảnh minh chứng cho yêu cầu đổi/trả.
			request_status	Trạng thái xử lý yêu cầu đổi trả.
			created_at	Thời điểm tạo yêu cầu đổi trả.
			updated_at	Thời điểm cập nhật yêu cầu gần nhất.
50	return_request_detail	Lưu chi tiết sản phẩm được đổi trả	id	Mã định danh dòng chi tiết đổi trả.
			return_request_id	Yêu cầu đổi trả chứa sản phẩm này.
			product_variant_id	Biến thể SKU được đổi/trả.
			quantity	Số lượng SKU được yêu cầu đổi/trả.
			unit_price	Đơn giá SKU được snapshot tại thời điểm phát sinh yêu cầu đổi/trả.
51	refund_transaction	Lưu giao dịch hoàn tiền hoặc bồi thường thực tế phát sinh từ một support ticket đã được phê duyệt xử lý. Đây là thực thể ghi nhận dòng tiền, tách biệt với quá trình tiếp nhận và xử lý khiếu nại.	id	Mã định danh giao dịch hoàn tiền/bồi thường.
			refund_code	Mã giao dịch hoàn tiền dùng để tra cứu và đối soát.
			ticket_id	Ticket làm cơ sở phát sinh giao dịch hoàn/bồi thường.
			payment_id	Giao dịch thanh toán ban đầu liên quan đến khoản hoàn tiền.
			refund_type	Loại hoàn tiền hoặc bồi thường.
			requested_amount	Số tiền khách yêu cầu hoàn/bồi thường.
			approved_amount	Số tiền được PawPal phê duyệt.
			refunded_amount	Số tiền thực tế đã hoàn/bồi thường thành công.
			refund_method	Phương thức hoàn tiền/bồi thường.
			refund_status	Trạng thái xử lý giao dịch hoàn tiền.
			gateway_transaction_id	Mã giao dịch từ cổng thanh toán liên quan đến hoàn tiền.
			note	Ghi chú bổ sung về giao dịch hoàn tiền/bồi thường.
			processed_by	Nhân viên thực hiện giao dịch hoàn tiền/bồi thường.
			processed_at	Thời điểm nhân viên/hệ thống bắt đầu xử lý hoàn tiền.
			completed_at	Thời điểm giao dịch hoàn tiền hoàn tất thành công.
			created_at	Thời điểm tạo giao dịch hoàn tiền.
			updated_at	Thời điểm cập nhật giao dịch hoàn tiền gần nhất.
52	staff	Lưu thông tin tài khoản nhân viên, lễ tân, chuyên môn, CSKH và quản lý	id	Mã định danh nhân viên.
			full_name	Họ tên nhân viên hiển thị trong hệ thống quản trị.
			phone_number	Số điện thoại liên hệ của nhân viên.
			role	Vai trò và quyền nghiệp vụ của nhân viên.
			specialization	Chuyên môn hoặc lĩnh vực phụ trách của nhân viên.
			hire_date	Ngày nhân viên bắt đầu làm việc tại PawPal.
			auth_user_id	
			account_status	
			system_role	
			permissions	
			must_change_password	
			last_login_at	
			account_created_at	
			email	
			address	
			dob	
			shift	
			status	
			service_locked	
			skill_score	
			created_at	Thời điểm tạo hồ sơ nhân viên.
			updated_at	Thời điểm cập nhật hồ sơ nhân viên gần nhất.
53	staff_schedule	Lưu lịch làm việc, ca trực và thời gian hoạt động của nhân viên	id	Mã định danh lịch làm việc.
			staff_id	Nhân viên được xếp lịch.
			work_date	Ngày nhân viên được xếp lịch.
			shift	Tên/mã ca làm việc của nhân viên.
			start_time	Thời điểm bắt đầu ca làm việc.
			end_time	Thời điểm kết thúc ca làm việc.
			availability_status	Trạng thái đi làm hoặc khả dụng của nhân viên trong ca.
			reason	Lý do nghỉ/vắng hoặc không được xếp ca.
			work_location	
			schedule_status	
			created_at	Thời điểm tạo lịch làm việc.
			updated_at	Thời điểm cập nhật lịch làm việc gần nhất.
54	promotion	Lưu các chương trình khuyến mãi đang áp dụng	id	Mã định danh duy nhất của chương trình.
			promotion_name	Tên chương trình khuyến mãi hiển thị trên hệ thống.
			description	Mô tả nội dung và điều kiện của chương trình.
			discount_type	Cách tính mức giảm giá của chương trình.
			discount_value	Mức giảm theo phần trăm hoặc số tiền cố định.
			start_date	Ngày bắt đầu chương trình khuyến mãi.
			end_date	Ngày kết thúc chương trình khuyến mãi.
			minimum_order_value	Giá trị đơn hàng tối thiểu để được hưởng khuyến mãi.
			status	Trạng thái vận hành của chương trình.
			created_at	Thời điểm tạo chương trình.
			updated_at	Thời điểm cập nhật chương trình gần nhất.
55	promotion_product	Lưu danh sách sản phẩm được áp dụng trong chương trình khuyến mãi	id	Mã định danh bản ghi áp dụng khuyến mãi cho sản phẩm.
			promotion_id	Chương trình khuyến mãi được áp dụng.
			product_variant_id	Biến thể sản phẩm cụ thể được hưởng khuyến mãi.
56	promotion_service	Lưu danh sách dịch vụ được áp dụng trong chương trình khuyến mãi	id	Mã định danh bản ghi áp dụng khuyến mãi cho dịch vụ.
			promotion_id	Chương trình khuyến mãi được áp dụng.
			service_id	Dịch vụ được hưởng khuyến mãi.
57	banner	Lưu thông tin Banner quảng bá hiển thị trên website, gồm hình ảnh, tiêu đề, liên kết và thời gian hiển thị.	id	Mã định danh duy nhất của banner.
			image_url	Hình ảnh banner được hiển thị trên website.
			title	Tiêu đề chính hiển thị trên banner.
			description	Mô tả hoặc thông điệp khuyến mãi trên banner.
			link	Đường dẫn đến trang đích khi khách hàng bấm banner.
			button_text	Nội dung nút kêu gọi hành động trên banner.
			display_order	Thứ tự banner trong khu vực hiển thị.
			start_date	Ngày bắt đầu hiển thị banner.
			end_date	Ngày kết thúc hiển thị banner.
			status	Trạng thái hiển thị của banner.
			created_at	Thời điểm tạo banner.
			updated_at	Thời điểm cập nhật banner gần nhất.
58	blog_post	Lưu bài viết chia sẻ kiến thức và tin tức trên website	id	Mã định danh duy nhất của bài viết.
			category_id	Danh mục bài viết mà bài viết thuộc về.
			title	Tiêu đề bài viết hiển thị trên website.
			slug	Đường dẫn thân thiện dùng để truy cập bài viết.
			summary	Phần tóm tắt ngắn dùng ở danh sách bài viết.
			content	Nội dung đầy đủ của bài viết.
			thumbnail_url	Hình ảnh đại diện của bài viết.
			author_id	Nhân viên chịu trách nhiệm biên soạn hoặc đăng bài.
			publish_at	Thời điểm bài viết được công khai trên website.
			status	Trạng thái xuất bản của bài viết.
			view_count	Số lượt xem bài viết.
			created_at	Thời điểm tạo bài viết.
			updated_at	Thời điểm cập nhật bài viết gần nhất.
59	blog_category	Lưu danh mục bài viết	id	Mã định danh duy nhất của danh mục.
			category_name	Tên danh mục bài viết.
			description	Mô tả phạm vi nội dung của danh mục.
			display_order	Thứ tự hiển thị danh mục trên website.
			status	Trạng thái sử dụng của danh mục.
			created_at	Thời điểm tạo danh mục.
			updated_at	Thời điểm cập nhật danh mục gần nhất.
60	notification	Lưu các thông báo gửi đến khách hàng về trạng thái đơn hàng, lịch hẹn, yêu cầu hỗ trợ và giao dịch hoàn tiền; các FK liên quan giúp xác định chính xác đối tượng mà thông báo dẫn đến.	id	Mã định danh duy nhất của thông báo.
			customer_id	Khách hàng nhận thông báo.
			notification_type	Loại sự kiện tạo ra thông báo.
			title	Tiêu đề ngắn hiển thị trong danh sách thông báo.
			content	Nội dung chi tiết giúp khách hàng hiểu sự kiện đã xảy ra.
			sales_order_id	Đơn hàng liên quan đến thông báo.
			appointment_id	Lịch hẹn liên quan đến thông báo.
			support_ticket_id	Yêu cầu hỗ trợ liên quan đến thông báo.
			refund_transaction_id	Giao dịch hoàn tiền liên quan đến thông báo.
			related_entity_type	
			is_read	Cho biết khách hàng đã đọc thông báo hay chưa.
			sent_at	Thời điểm thông báo được gửi/ghi nhận thành công.
			read_at	Thời điểm khách hàng đọc thông báo.
61	pawpal_setting	Lưu các cấu hình chung của website như hotline, popup, top-bar và các thiết lập hệ thống khác.	id	Mã định danh duy nhất của cấu hình.
			setting_key	Mã khóa duy nhất dùng để truy xuất cấu hình trong hệ thống.
			setting_value	Giá trị cấu hình được lưu theo kiểu dữ liệu đã khai báo.
			setting_type	Kiểu dữ liệu thực tế của setting_value.
			description	Giải thích mục đích và phạm vi sử dụng của cấu hình.
			created_at	Thời điểm tạo cấu hình.
			updated_at	Thời điểm cập nhật cấu hình gần nhất.
62	audit_log	Lưu lịch sử thao tác quan trọng của nhân viên nhằm phục vụ kiểm tra và truy vết hệ thống	id	Mã định danh duy nhất của bản ghi audit.
			staff_id	Nhân viên thực hiện thao tác.
			action	Loại hành động đã thực hiện, ví dụ tạo, cập nhật, xóa hoặc duyệt.
			entity_name	Tên thực thể bị tác động.
			entity_id	Mã bản ghi cụ thể bị tác động.
			description	Mô tả chi tiết thao tác và thay đổi quan trọng.
			created_at	Thời điểm thao tác được ghi nhận vào audit log.
63	staff_shift_request	Lưu yêu cầu xin đổi ca, xin nghỉ phép hoặc vắng mặt của nhân viên	id	Mã định danh duy nhất của yêu cầu đổi ca/nghỉ phép.
			request_type	Loại yêu cầu (xin nghỉ, đổi ca, tăng ca).
			staff_id	Nhân viên gửi yêu cầu.
			target_staff_id	Nhân viên liên quan trong yêu cầu đổi ca.
			replacement_staff_id	Nhân viên nhận ca làm thay thế.
			leave_type	Loại nghỉ phép (nghỉ ốm, nghỉ phép năm, việc riêng).
			start_date	Ngày bắt đầu nghỉ hoặc đổi ca.
			end_date	Ngày kết thúc nghỉ.
			shift	Ca làm việc liên quan (sáng, chiều, tối).
			target_date	Ngày chuyển đến trong ca làm việc mới.
			target_shift	Ca làm việc mới sau khi chuyển đổi.
			reason	Lý do gửi yêu cầu của nhân viên.
			status	Trạng thái phê duyệt (chờ duyệt, đã duyệt, từ chối).
			created_by	Người khởi tạo yêu cầu.
			reviewed_by	Quản lý thực hiện xét duyệt yêu cầu.
			reviewed_at	Thời điểm xét duyệt yêu cầu.
			created_at	Thời điểm tạo yêu cầu.
64	hotel_booking	Quản lý lịch đặt phòng lưu trú khách sạn thú cưng Pet Hotel	id	Mã định danh duy nhất của đơn lưu trú khách sạn.
			booking_code	Mã đặt phòng hiển thị cho khách hàng.
			customer_id	Chủ nuôi đặt dịch vụ lưu trú.
			pet_id	Bé cưng được gửi lưu trú tại khách sạn.
			room_id	Phòng hoặc chuồng lưu trú được chỉ định.
			appointment_id	Lịch hẹn dịch vụ liên kết với đơn lưu trú.
			check_in_date	Thời gian nhận phòng lưu trú.
			check_out_date	Thời gian trả phòng dự kiến.
			status	Trạng thái lưu trú (chờ nhận, đang ở, đã trả, đã hủy).
			special_diet_notes	Ghi chú chế độ dinh dưỡng đặc biệt cho bé.
			medication_notes	Ghi chú cho uống thuốc hoặc theo dõi y tế.
			daily_price	Đơn giá lưu trú mỗi ngày đêm.
			total_amount	Tổng chi phí lưu trú trọn gói.
			deposit_amount	Số tiền đặt cọc trước.
			payment_status	Trạng thái thanh toán phí khách sạn.
			created_at	Thời điểm đặt dịch vụ lưu trú.
			updated_at	Thời điểm cập nhật trạng thái lưu trú.
65	pet_weight_history	Lưu lịch sử cân đo trọng lượng định kỳ của thú cưng phục vụ theo dõi sức khỏe và điều chỉnh dịch vụ	id	Mã định danh duy nhất của lượt cân đo.
			pet_id	Bé cưng được cân đo.
			weight	Trọng lượng ghi nhận (kg).
			measured_at	Thời điểm thực hiện cân đo.
			recorded_by_name	Tên kỹ thuật viên hoặc nhân viên ghi nhận.
			created_at	Thời điểm tạo bản ghi.
66	chat_conversation	Quản lý các phiên hội thoại trực tuyến giữa khách hàng và AI Chatbot hoặc nhân viên tư vấn	id	Mã định danh duy nhất của phiên hội thoại.
			customer_id	Khách hàng tham gia hội thoại.
			session_token	Mã phiên truy cập dành cho khách vãng lai.
			status	Trạng thái phiên (đang mở, chờ xử lý, đã đóng).
			sentiment_level	Cấp độ cảm xúc hiện tại của khách hàng.
			sentiment_trend	Xu hướng cảm xúc (tích cực, tiêu cực, leo thang).
			is_urgent	Đánh dấu phiên hội thoại khẩn cấp cần can thiệp.
			assigned_staff_id	Nhân viên CSKH tiếp nhận xử lý phiên.
			ai_summary	Tóm tắt nội dung hội thoại tự động bởi AI.
			internal_note	Ghi chú nội bộ giữa các nhân viên hỗ trợ.
			sla_deadline	Hạn chót thời gian cam kết phản hồi (SLA).
			violation_count	Số lần vi phạm quy tắc ngôn từ của phiên.
			blocked_until	Thời gian tạm khóa người dùng nếu vi phạm nặng.
			channel	Kênh tiếp nhận hội thoại (web, zalo, facebook).
			created_at	Thời điểm bắt đầu phiên hội thoại.
			updated_at	Thời điểm cập nhật phiên hội thoại gần nhất.
67	chat_message	Lưu từng tin nhắn chi tiết trong các phiên hội thoại chat	id	Mã định danh duy nhất của tin nhắn.
			conversation_id	Phiên hội thoại chứa tin nhắn.
			sender_type	Đối tượng gửi (khách hàng, bot, nhân viên).
			sender_id	Mã người gửi tin nhắn.
			sender_name	Tên hiển thị của người gửi.
			content	Nội dung tin nhắn sau khi đã lọc kiểm duyệt.
			raw_content	Nội dung gốc trước khi xử lý lọc từ khóa.
			is_toxic	Đánh dấu tin nhắn chứa từ ngữ công kích hoặc tiêu cực.
			sentiment_score	Điểm số đánh giá cảm xúc của tin nhắn.
			metadata	Dữ liệu đính kèm dạng JSON (nút gợi ý, thẻ sản phẩm).
			created_at	Thời điểm gửi tin nhắn.
68	chat_moderation_log	Nhật ký kiểm duyệt nội dung tin nhắn và ghi nhận các vi phạm quy chuẩn giao tiếp	id	Mã định danh duy nhất của bản ghi kiểm duyệt.
			conversation_id	Phiên hội thoại xảy ra vi phạm.
			customer_id	Khách hàng có tin nhắn vi phạm.
			detected_keywords	Danh sách từ khóa vi phạm được phát hiện.
			violation_count	Số lần vi phạm cộng dồn của khách hàng.
			action_taken	Biện pháp đã xử lý (cảnh báo, che từ, chặn tạm thời).
			notes	Ghi chú thêm về bối cảnh vi phạm.
			created_at	Thời điểm ghi nhận vi phạm.
69	chatbot_sentiment_tier	Bảng phân tầng các cấp độ cảm xúc của khách hàng (Bình thường, Bức xúc, Khẩn cấp) kèm cam kết phản hồi SLA	level	Cấp độ cảm xúc (mã số hoặc định danh tầng).
			name	Tên hiển thị của tầng cảm xúc.
			color_badge	Mã màu hiển thị thẻ nhãn cảm xúc.
			sla_seconds	Thời hạn cam kết phản hồi tối đa tính bằng giây.
			description	Mô tả tiêu chuẩn và dấu hiệu nhận biết cấp độ.
70	chatbot_sentiment_trigger	Danh sách các mẫu từ khóa và biểu thức nhận diện cảm xúc khách hàng của hệ thống AI Chatbot	id	Mã định danh quy tắc kích hoạt.
			tier_level	Cấp độ cảm xúc tương ứng khi kích hoạt.
			trigger_pattern	Mẫu từ khóa hoặc cụm từ nhận diện.
			weight	Trọng số đánh giá mức độ ảnh hưởng.
			context_domain	Ngữ cảnh áp dụng (giá cả, chất lượng, giao hàng, thái độ).
			is_active	Trạng thái kích hoạt sử dụng quy tắc.
71	chatbot_sentiment_action	Quy định các hành vi phản ứng tự động của chatbot tương ứng với từng cấp độ cảm xúc	id	Mã định danh hành vi ứng phó.
			tier_level	Cấp độ cảm xúc kích hoạt hành động.
			bot_behavior	Hành vi của bot (xoa dịu, xin lỗi, đề xuất đền bù).
			notify_admin	Cờ bật thông báo khẩn cho quản trị viên.
			suggested_canned_id	Mã câu trả lời mẫu gợi ý cho nhân viên.
			instructions	Hướng dẫn xử lý nghiệp vụ cho nhân viên CSKH.
72	chatbot_compensation_policy	Chính sách đền bù và tặng điểm Pawpoint tự động khi khách hàng gặp sự cố dịch vụ	id	Mã định danh chính sách đền bù.
			issue_type	Loại sự cố (trễ hẹn, sản phẩm lỗi, dịch vụ chưa đạt).
			max_points	Số điểm Pawpoint tối đa được phép đền bù tự động.
			max_discount_vnd	Số tiền giảm giá tối đa được áp dụng.
			approval_required	Cờ yêu cầu quản trị viên duyệt trước khi cấp.
			description	Mô tả chi tiết điều kiện và hạn mức áp dụng.
			is_active	Trạng thái hiệu lực của chính sách.
73	chatbot_handover_rule	Quy tắc tự động bàn giao cuộc trò chuyện từ Bot sang nhân viên chuyên môn (KTV Grooming, Bác sĩ, CSKH)	id	Mã định danh quy tắc chuyển tiếp.
			condition_name	Tên điều kiện chuyển tiếp.
			trigger_type	Loại kích hoạt (cảm xúc tiêu cực, từ khóa chuyên sâu, yêu cầu trực tiếp).
			threshold_value	Ngưỡng kích hoạt.
			auto_assign_role	Vai trò nhân viên tiếp nhận (CSKH, KTV, Quản lý).
			sla_seconds	Thời gian cam kết tiếp nhận ca sau khi bàn giao.
			is_active	Trạng thái kích hoạt quy tắc.
74	chatbot_knowledge_faq	Kho tri thức các câu hỏi thường gặp FAQ phục vụ giải đáp tự động cho khách hàng	id	Mã định danh câu hỏi tri thức.
			category	Chuyên mục (dịch vụ, sản phẩm, chính sách đổi trả, bảng giá).
			question	Nội dung câu hỏi thường gặp.
			answer	Câu trả lời chuẩn mực đã được kiểm duyệt.
			keywords	Từ khóa liên quan hỗ trợ tìm kiếm nhanh.
			priority	Thứ tự ưu tiên hiển thị và đối soát.
			is_active	Trạng thái sử dụng câu hỏi tri thức.
			created_at	Thời điểm tạo.
			updated_at	Thời điểm cập nhật.
75	chatbot_system_prompt	Quản lý các System Prompt cấu hình nhân cách (Persona), phong cách giao tiếp và hướng dẫn hành vi của AI Chatbot	id	Mã định danh cấu hình Prompt.
			prompt_key	Mã khóa định danh prompt trong hệ thống.
			channel	Kênh ứng dụng áp dụng prompt.
			persona_name	Tên nhân cách của trợ lý ảo (Pawpal Assistant).
			tone_of_voice	Tông giọng giao tiếp (thân thiện, chuyên nghiệp, ân cần).
			content	Toàn văn nội dung Prompt hệ thống.
			is_active	Trạng thái hiệu lực của prompt.
			created_at	Thời điểm tạo.
			updated_at	Thời điểm cập nhật.
76	chatbot_canned_response	Danh mục các câu trả lời nhanh soạn sẵn cho nhân viên CSKH và Chatbot	id	Mã định danh câu trả lời nhanh.
			shortcut	Phím tắt gõ nhanh.
			title	Tiêu đề gợi nhớ.
			content	Nội dung mẫu phản hồi đầy đủ.
			category	Chuyên mục phân loại tin nhắn.
			usage_count	Số lượt sử dụng thực tế.
			is_active	Trạng thái khả dụng.
			created_at	Thời điểm tạo mẫu trả lời.
77	chatbot_profanity_filter	Danh mục các từ ngữ nhạy cảm, thô tục cần tự động che hoặc chặn trong phiên chat	id	Mã định danh từ khóa lọc.
			keyword	Từ hoặc cụm từ nhạy cảm.
			severity	Mức độ nghiêm trọng của vi phạm.
			action	Hành động xử lý (thay thế ký tự sao, chặn gửi tin, cảnh báo).
			replacement_text	Chuỗi ký tự dùng để thay thế.
			is_active	Trạng thái kích hoạt bộ lọc.
			created_at	Thời điểm thêm từ khóa.
78	chatbot_scenario_matrix	Ma trận các kịch bản kiểm thử (benchmark) đánh giá chất lượng phản hồi và độ chính xác của AI Chatbot	id	Mã định danh kịch bản kiểm định.
			scenario_name	Tên kịch bản thử nghiệm.
			sample_user_input	Câu nói mẫu của khách hàng thử nghiệm.
			expected_sentiment	Cảm xúc mong đợi hệ thống nhận diện.
			expected_tool_call	Công cụ/hàm nghiệp vụ mong đợi bot gọi.
			expected_handover	Kỳ vọng có chuyển giao cho người thật hay không.
			benchmark_status	Kết quả đánh giá kiểm thử (đạt, chưa đạt).
			created_at	Thời điểm ghi nhận kịch bản.
79	document_embeddings	Bảng lưu trữ vector embedding các đoạn tài liệu chính sách, cẩm nang chăm sóc thú cưng phục vụ tra cứu ngữ nghĩa RAG cho AI	id	Mã định danh duy nhất của vector tài liệu.
			content	Nội dung văn bản được chia đoạn.
			metadata	Thông tin ngữ cảnh và nguồn tài liệu.
			embedding	Vector số học đại diện ngữ nghĩa của đoạn văn bản.
80	api_keys	Lưu trữ và quản lý các khóa xác thực API dịch vụ ngoài của hệ thống	id	Mã định danh bản ghi khóa API.
			provider	Đơn vị cung cấp dịch vụ (Google, Zalo, VNPay, GHN).
			key_value	Giá trị khóa API đã được bảo vệ.
			is_active	Trạng thái hiệu lực của khóa.
			created_at	Thời điểm khởi tạo khóa.
81	staff_public_view	View dữ liệu trích xuất thông tin hồ sơ nhân viên công khai phục vụ tra cứu lịch làm việc và hiển thị cho khách hàng	id	Mã định danh nhân viên.
			auth_user_id	Mã tài khoản xác thực hệ thống.
			full_name	Họ và tên nhân viên.
			phone_number	Số điện thoại liên hệ công việc.
			role	Chức danh công việc chuyên môn.
			specialization	Chuyên môn hoặc kỹ năng thế mạnh.
			hire_date	Ngày bắt đầu công tác.
			account_status	Trạng thái hoạt động tài khoản.
			system_role	Vai trò phân quyền trên hệ thống.
			created_at	Thời điểm tạo hồ sơ.
			updated_at	Thời điểm cập nhật hồ sơ.
