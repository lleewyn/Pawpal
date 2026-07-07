ALTER TABLE public.service ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 1) DEFAULT 4.8;
ALTER TABLE public.service ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE public.service ADD COLUMN IF NOT EXISTS benefits TEXT;
ALTER TABLE public.service ADD COLUMN IF NOT EXISTS checklist TEXT;
ALTER TABLE public.service ADD COLUMN IF NOT EXISTS amenities TEXT;
ALTER TABLE public.service ADD COLUMN IF NOT EXISTS groomer_level VARCHAR(50);
ALTER TABLE public.service ADD COLUMN IF NOT EXISTS pet_type VARCHAR(50);
ALTER TABLE public.service ADD COLUMN IF NOT EXISTS images TEXT[];

UPDATE public.service SET 
    rating = 4.8,
    review_count = 154,
    benefits = 'Làm sạch triệt để bụi bẩn, khử mùi hôi khó chịu trên lông da; Cắt tỉa móng ngăn chặn móng mọc ngược đâm vào thịt; Vệ sinh tai phòng ngừa các bệnh viêm tai giữa và ký sinh trùng tai.',
    checklist = 'Tiếp nhận thú cưng và kiểm tra da lông sơ bộ; Cắt móng và mài mịn các góc sắc nhọn; Vệ sinh tai bằng dung dịch chuyên dụng; Chải lông loại bỏ lông rụng sơ bộ; Tắm lần 1 bằng dầu tắm loại bỏ bụi bẩn; Tắm lần 2 bằng dầu tắm dưỡng da lông; Vắt tuyến hôi khử mùi; Sấy khô lông hoàn toàn; Chải lông tạo kiểu cơ bản; Xịt nước hoa dưỡng lông thiên nhiên; Bàn giao thú cưng và Care-Log',
    amenities = 'Phòng tắm chuyên dụng điều hòa ấm áp, bàn grooming chuyên nghiệp, máy sấy chuyên dụng lực thổi mạnh tiếng ồn thấp, dầu tắm Hypoallergenic dịu nhẹ',
    groomer_level = 'Junior Groomer',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/spa/process/spa01.webp', 'assets/images/services/spa/process/say_long1.jpg', 'assets/images/services/spa/process/chai_long.jpg']
WHERE service_code = 'SPA01';
UPDATE public.service SET 
    rating = 4.9,
    review_count = 92,
    benefits = 'Phục hồi độ ẩm cho da lông khô xơ, hạn chế tối đa rụng lông và xơ rối; Massage thư giãn kích thích lưu thông máu dưới da, giảm stress hiệu quả cho bé.',
    checklist = 'Tiếp nhận thú cưng và phân tích tình trạng da lông; Chải gỡ rối lông xơ; Cắt và mài móng chân; Vệ sinh tai và nhổ lông tai dư thừa; Tắm lần 1 làm sạch sâu; Tắm lần 2 bằng dầu xả dưỡng lông chuyên sâu; Massage thư giãn toàn thân trong 10 phút; Làm sạch tuyến hôi; Sấy tạo phồng lông chuyên nghiệp; Chải lông bằng lược chuyên dụng; Xịt tinh dầu dưỡng lông bóng mượt; Bàn giao thú cưng và Care-Log',
    amenities = 'Bồn tắm sục sủi khí Ozone kháng khuẩn da lông, dầu tắm xả cao cấp Plum Silky nhập khẩu từ Mỹ, tinh chất phục hồi lông hư tổn Collagen, máy massage chuyên dụng',
    groomer_level = 'Senior Groomer',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/spa/process/tam_cho5.jpg', 'assets/images/services/spa/process/massage.jpg', 'assets/images/services/spa/process/nghi_ngoi1.jpg']
WHERE service_code = 'SPA02';
UPDATE public.service SET 
    rating = 4.7,
    review_count = 65,
    benefits = 'Khử triệt để mùi hôi da lông lên đến 10 ngày; Loại bỏ triệt để chất nhờn tích tụ dưới gốc chân lông; Phòng chống các loại nấm da, ký sinh trùng gây mùi.',
    checklist = 'Tiếp nhận thú cưng và kiểm tra các vùng da nhạy cảm; Cắt móng chân và mài mịn; Vệ sinh sạch sâu tai trong và tai ngoài; Tắm khử dầu lần 1 loại bỏ bã nhờn; Vắt sạch hoàn toàn tuyến hôi hậu môn; Tắm khử mùi lần 2 bằng dầu tắm chứa hoạt chất sinh học tự nhiên; Thoa dầu dưỡng xả lông phục hồi; Sấy khô bằng máy thổi công suất lớn; Chải lông loại bỏ lông chết; Xịt khử mùi hôi miệng; Xịt dưỡng thơm hương thảo mộc; Bàn giao thú cưng và Care-Log',
    amenities = 'Bể tắm inox kích thước lớn cho chó vừa, máy vắt tuyến hôi y tế an toàn, dầu tắm khử mùi chuyên dụng Deodorizing Shampoo, xịt thơm kháng khuẩn thiên nhiên',
    groomer_level = 'Senior Groomer',
    pet_type = 'Chó',
    images = ARRAY['assets/images/services/spa/process/tam_cho1.jpg', 'assets/images/services/spa/process/lau_kho.jpg']
WHERE service_code = 'SPA03';
UPDATE public.service SET 
    rating = 4.6,
    review_count = 120,
    benefits = 'Làm sạch tức thì bàn chân, tai và lông; Khử mùi hôi nhanh chóng chỉ trong 30 phút mà không cần tắm nước lạnh gầy cảm lạnh; Tiết kiệm thời gian tối đa.',
    checklist = 'Tiếp nhận thú cưng tại quầy; Lau sạch bụi bẩn 4 bàn chân bằng khăn ướt chuyên dụng; Vệ sinh vành tai ngoài bằng dung dịch sát khuẩn nhẹ; Xịt bọt khô khử mùi lên toàn thân; Massage nhẹ nhàng toàn thân; Chải lông sơ bộ gỡ rối bề mặt; Xịt nước hoa khô hương phấn hoa dịu nhẹ; Bàn giao thú cưng và Care-Log',
    amenities = 'Góc chăm sóc nhanh tại sảnh tiếp đón tiện lợi, bọt tắm khô organic không gây kích ứng da, lược chải silicone lấy lông rụng nhanh',
    groomer_level = 'Junior Groomer',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/spa/process/rua_chan.jpg', 'assets/images/services/spa/process/lau_kho1.jpg']
WHERE service_code = 'SPA04';
UPDATE public.service SET 
    rating = 4.8,
    review_count = 189,
    benefits = 'Ngăn ngừa móng chân mọc quá dài gây đau đớn khó chịu khi di chuyển; Giữ tai luôn khô ráo sạch sẽ, tránh bệnh viêm tai và rận tai gây ngứa ngáy.',
    checklist = 'Tiếp nhận thú cưng; Cắt ngắn móng chân bằng kìm chuyên dụng; Mài dũa mịn các góc móng sắc tránh cào xước; Nhỏ dung dịch vệ sinh tai chuyên dụng; Massage gốc tai trong 1 phút; Lau sạch chất bẩn và ráy tai bằng bông y tế tiệt trùng; Rắc bột nhổ lông tai (nếu cần); Nhổ lông tai thừa; Bàn giao thú cưng và Care-Log',
    amenities = 'Kìm cắt móng lò xo trợ lực sắc bén có đèn LED soi tủy móng, dũa móng mài mịn, nước rửa tai cao cấp Epi-Otic chống viêm tai',
    groomer_level = 'Junior Groomer',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/spa/process/cat_mong.jpg', 'assets/images/services/spa/process/ray_tai.jpg']
WHERE service_code = 'SPA05';
UPDATE public.service SET 
    rating = 4.5,
    review_count = 48,
    benefits = 'Làm sạch nhẹ nhàng bụi bẩn và dầu nhờn bám trên lông; Khử mùi hiệu quả mà không cần làm ướt cơ thể; Tránh nguy cơ bị cảm lạnh cho pet yếu.',
    checklist = 'Tiếp nhận thú cưng; Chải chải lông gỡ các búi rối; Xịt lượng bọt tắm khô vừa đủ lên toàn thân thú cưng (tránh vùng mắt, mũi); Massage đều khắp cơ thể trong 5-10 phút để bọt tự hòa tan vết bẩn; Dùng khăn bông khô lau sạch bọt và bụi bẩn bám theo; Sấy gió nhẹ tạo độ phồng lông; Chải lông mượt mà; Bàn giao thú cưng và Care-Log',
    amenities = 'Bọt tắm khô thảo dược nhập khẩu Hàn Quốc lành tính, máy sấy thổi luồng gió mát ấm dịu nhẹ, khăn tắm microfiber siêu thấm hút',
    groomer_level = 'Junior Groomer',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/spa/process/VS-XIT-07_2.jpg', 'assets/images/services/spa/process/spa06.webp']
WHERE service_code = 'SPA06';
UPDATE public.service SET 
    rating = 4.9,
    review_count = 210,
    benefits = 'Thay đổi diện mạo xinh xắn đáng yêu cho bé cưng; Giúp lông gọn gàng sạch sẽ, hạn chế bám bẩn thức ăn; Giúp chủ dễ dàng chăm sóc chải chuốt tại nhà.',
    checklist = 'Tiếp nhận thú cưng và tư vấn kiểu cắt phù hợp; Cắt móng chân và dũa móng; Vệ sinh tai sạch sẽ; Tắm sạch sâu lần 1; Tắm dưỡng xả mềm lông lần 2; Sấy khô kết hợp đánh tơi lông; Chải lông gỡ rối triệt để; Cắt tỉa lông tạo kiểu body bằng tông đơ và kéo chuyên dụng; Cắt tỉa tạo hình mặt và tai xinh xắn; Vệ sinh tuyến hôi; Chụp ảnh hoàn thiện diện mạo mới; Bàn giao thú cưng và Care-Log',
    amenities = 'Bàn cắt tỉa nâng hạ thủy lực chống rung lắc, bộ kéo cắt tỉa cao cấp Nhật Bản sắc bén, tông đơ Oster êm ái, máy ảnh chụp studio lấy hình lưu niệm',
    groomer_level = 'Senior Groomer',
    pet_type = 'Chó',
    images = ARRAY['assets/images/services/spa/process/cat_long1.jpg', 'assets/images/services/spa/process/chai_long2.jpg']
WHERE service_code = 'SPA07';
UPDATE public.service SET 
    rating = 4.9,
    review_count = 74,
    benefits = 'Diện mạo độc đáo, cá tính nổi bật theo ý muốn riêng của chủ nuôi; Tối ưu hóa vẻ đẹp đặc trưng của từng giống chó (Poodle, Pomeranian, Bichon Frise).',
    checklist = 'Tiếp nhận thú cưng và thảo luận chi tiết với chủ qua hình ảnh mẫu; Cắt tỉa móng và vệ sinh tai; Tắm dưỡng lông 2 bước bằng dầu tắm cao cấp giữ nếp lông; Sấy khô tạo phồng tối đa; Cắt tỉa tạo hình chi tiết toàn thân bằng kéo nghệ thuật thủ công; Tỉa mỏng đều lớp lông bao ngoài; Kiểm tra và hiệu chỉnh đường cắt dưới ánh sáng studio; Xịt gôm giữ nếp lông tự nhiên hương thơm sang trọng; Chụp ảnh trước/sau làm quà tặng cho khách; Bàn giao thú cưng và Care-Log',
    amenities = 'Kéo nghệ thuật chuyên nghiệp đủ kích cỡ và độ cong, phòng grooming yên tĩnh riêng tư cách âm, dầu tắm xả tạo phồng giữ nếp cao cấp Chris Christensen',
    groomer_level = 'Master Groomer',
    pet_type = 'Chó',
    images = ARRAY['assets/images/services/spa/process/cao_long.jpg', 'assets/images/services/spa/process/chai_long3.jpg']
WHERE service_code = 'SPA08';
UPDATE public.service SET 
    rating = 4.8,
    review_count = 96,
    benefits = 'Grooming sạch sẽ cho mèo mà không làm bé bị stress hay hoảng sợ; Hạn chế hiện tượng búi lông trong dạ dày do mèo tự liếm lông rụng quá nhiều.',
    checklist = 'Tiếp nhận mèo và đánh giá mức độ căng thẳng ban đầu; Xịt tinh chất xoa dịu Feliway thư giãn; Chải gỡ rối lông xơ bằng lược chuyên dụng; Cắt móng chân mèo nhẹ nhàng; Vệ sinh tai dịu nhẹ; Tắm bằng nước ấm vừa phải với sữa tắm chuyên biệt cho mèo da nhạy cảm; Vắt tuyến hôi (nếu cần); Sấy khô bằng máy sấy chuyên dụng siêu êm tránh hoảng sợ; Cắt tỉa gọn gàng vùng bụng, hậu môn và bàn chân; Chải dưỡng mượt lông toàn thân; Bàn giao mèo và Care-Log',
    amenities = 'Hệ thống máy sấy lồng chuyên dụng yên tĩnh ấm áp, tinh chất xoa dịu pheromone Feliway cao cấp, bàn tắm đệm cao su êm ái chống trơn trượt',
    groomer_level = 'Master Groomer',
    pet_type = 'Mèo',
    images = ARRAY['assets/images/services/spa/process/tam_meo.jpg', 'assets/images/services/spa/process/chai_long_meo1.jpeg']
WHERE service_code = 'SPA09';
UPDATE public.service SET 
    rating = 4.7,
    review_count = 53,
    benefits = 'Diệt trừ nấm, bào tử nấm và ký sinh trùng trên da; Làm dịu cơn ngứa ngáy, giảm mẩn đỏ và mùi hôi do viêm nhiễm; Kích thích hồi phục các mảng da tổn thương bong tróc.',
    checklist = 'Tiếp nhận thú cưng và xác định vùng da bị tổn thương nấm; Vệ sinh tai mắt nhẹ nhàng; Xả nước ấm làm ướt lông; Thoa dầu tắm y tế trị nấm ghẻ lên da; Massage nhẹ nhàng toàn thân đặc biệt vùng da viêm trong 10-15 phút để ngấm thuốc; Xả sạch bằng nước ấm; Ngâm bồn thảo dược đông y làm dịu da; Sấy khô nhẹ hoàn toàn bằng luồng gió mát ấm; Bôi thuốc mỡ làm dịu da (nếu cần); Bàn giao thú cưng và Care-Log',
    amenities = 'Bồn ngâm thảo mộc riêng biệt, dầu tắm y khoa đặc trị nấm ghẻ (như Dermaseb), nước lá trà xanh tắm tràm trà hữu cơ cô đặc',
    groomer_level = 'Senior Groomer',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/spa/process/tam_cho4.jpg', 'assets/images/services/spa/process/say_long2.jpg']
WHERE service_code = 'SPA10';
UPDATE public.service SET 
    rating = 4.6,
    review_count = 32,
    benefits = 'Tạo điểm nhấn diện mạo thời trang cực bắt mắt nổi bật cho bé; Màu nhuộm an toàn tuyệt đối ngay cả khi thú cưng liếm lông.',
    checklist = 'Tiếp nhận và tư vấn màu nhuộm, vùng nhuộm phù hợp với cún; Tắm vệ sinh và sấy lông khô ráo; Phân tách vùng lông cần nhuộm; Thoa thuốc nhuộm thảo mộc nghệ thuật tỉ mỉ; Quấn giấy bạc cố định và ủ màu trong 25-30 phút; Xả sạch thuốc nhuộm bằng nước ấm; Thoa dầu xả khóa màu dưỡng mượt lông; Sấy khô hoàn toàn lông; Chụp ảnh lưu niệm; Bàn giao cún và Care-Log',
    amenities = 'Thuốc nhuộm lông thảo mộc tự nhiên Opawz nhập khẩu Canada không chứa hóa chất độc hại amoniac, chổi nhuộm chuyên dụng, giấy bạc giữ màu',
    groomer_level = 'Senior Groomer',
    pet_type = 'Chó',
    images = ARRAY['assets/images/services/spa/process/spa11.webp']
WHERE service_code = 'SPA11';
UPDATE public.service SET 
    rating = 4.9,
    review_count = 47,
    benefits = 'Phòng ngừa viêm kẽ chân, viêm móng; Loại bỏ lông kẽ dài gây trơn trượt khi chạy nhảy trên nền gạch; Giữ đệm chân mềm mại không bị nứt nẻ sần sùi.',
    checklist = 'Tiếp nhận thú cưng; Cắt móng chân chân sát khuẩn; Mài dũa góc móng chân; Dùng tông đơ chuyên dụng cạo lông kẽ chân sạch sẽ; Rửa sạch bàn chân bằng dung dịch sát khuẩn dịu nhẹ; Lau khô bàn chân; Thoa kem massage đệm chân chiết xuất sáp ong mật; Bàn giao thú cưng và Care-Log',
    amenities = 'Tông đơ cạo lông kẽ chân lưỡi sứ siêu nhỏ siêu êm, kem dưỡng đệm chân sáp ong hữu cơ hữu cơ Mỹ Organic Paw Balm',
    groomer_level = 'Junior Groomer',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/spa/process/rua_chan.jpg', 'assets/images/services/spa/process/lau_chan.jpg', 'assets/images/services/spa/process/spa13.webp']
WHERE service_code = 'SPA12';
UPDATE public.service SET 
    rating = 4.8,
    review_count = 39,
    benefits = 'Khử mùi hôi phân nước tiểu bám lông đít; Làm sạch da lông dịu nhẹ; Quy trình sấy chuyên biệt bảo vệ hệ hô hấp và tránh cảm lạnh cho bé.',
    checklist = 'Tiếp nhận bé và kiểm tra tình trạng sức khỏe nhịp tim; Chải gỡ rối lông xơ bằng lược gỗ nhỏ; Tắm bằng nước ấm tiêu chuẩn 38 độ C trong chậu tắm nhỏ chuyên dụng; Sử dụng sữa tắm chiết xuất yến mạch hữu cơ dịu nhẹ; Xả sạch nước ấm nhanh chóng; Quấn khăn tắm microfiber siêu thấm hút ôm ấp xoa dịu bé; Sấy khô lông 100% bằng máy sấy sưởi hồng ngoại siêu êm; Cắt móng chân thỏ nhẹ nhàng; Bàn giao bé và Care-Log',
    amenities = 'Bể tắm cạn ấm áp cho thú nhỏ, máy sấy nhiệt hồng ngoại không tiếng ồn, dầu tắm yến mạch dịu nhẹ lành tính Oat Milk Shampoo, khăn quấn ủ ấm',
    groomer_level = 'Senior Groomer',
    pet_type = 'Thỏ / Bọ ú',
    images = ARRAY['assets/images/services/spa/process/spa01.webp', 'assets/images/services/spa/process/spa14.webp']
WHERE service_code = 'SPA13';
UPDATE public.service SET 
    rating = 4.7,
    review_count = 25,
    benefits = 'Giúp thỏ hamster di chuyển dễ chịu không bị vướng móng vào nan chuồng; Phát hiện sớm các vấn đề về răng miệng mọc dài lệch khớp cắn nguy hiểm.',
    checklist = 'Tiếp nhận bé thú nhỏ; Giữ bé cố định bằng khăn quấn chuyên dụng; Cắt móng chân bằng kềm siêu mini sắc bén; Mài mịn móng chân; Dùng dụng cụ y tế kiểm tra độ dài răng cửa; Làm sạch kẽ răng và khoang miệng bằng tăm bông sinh lý; Thoa gel dưỡng nướu thảo mộc; Bàn giao bé và Care-Log',
    amenities = 'Khăn quấn quấn giữ bé chống cựa quậy, kềm cắt móng mini chuyên dụng cho hamster thỏ, gel vệ sinh răng miệng thảo dược ngọt mát',
    groomer_level = 'Junior Groomer',
    pet_type = 'Thỏ / Hamster / Bọ ú',
    images = ARRAY['assets/images/services/spa/process/cat_mong.jpg']
WHERE service_code = 'SPA14';
UPDATE public.service SET 
    rating = 4.7,
    review_count = 115,
    benefits = 'Đảm bảo an toàn tuyệt đối và vệ sinh sạch sẽ trong suốt thời gian lưu trú; Chế độ dinh dưỡng khoa học đúng giờ; Không gian nghỉ ngơi ấm cúng.',
    checklist = 'Check-in tiếp nhận bé và ghi chú thói quen ăn uống; Chuẩn bị phòng lưu trú (sát trùng và trải đệm ấm sạch); Cho ăn bữa sáng (8h) và bữa tối (18h) theo thực đơn tiêu chuẩn; Dọn vệ sinh khay cát/bãi tiểu 3 lần/ngày; Kiểm tra sức khỏe, đo nhiệt độ hàng ngày; Chơi tương tác nhẹ nhàng tại phòng; Check-out bàn giao bé và Care-Log tổng hợp lưu trú',
    amenities = 'Phòng 60x60x60cm độc lập bằng gỗ thông tự nhiên kháng khuẩn, đệm bông cotton ấm áp, khay cát hạt đậu nành sạch sẽ, điều hòa trung tâm 26 độ C',
    groomer_level = 'Nhân viên chăm sóc lưu trú',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/hotel/htl01.webp']
WHERE service_code = 'HTL01';
UPDATE public.service SET 
    rating = 4.8,
    review_count = 84,
    benefits = 'Không gian rộng rãi tự do xoay người thoải mái; Có khu vực vận động nhẹ tại phòng; Chế độ chăm sóc chu đáo, dọn dẹp vệ sinh liên tục.',
    checklist = 'Check-in tiếp nhận bé và kiểm tra cân nặng thực tế; Setup phòng ở rộng rãi sạch sẽ; Cho ăn bữa sáng và bữa tối với pate tươi King''s Pet trộn hạt Royal Canin; Thay nước uống sạch tại bình tự động liên tục; Dọn vệ sinh phòng ở 4 lần/ngày; Cho bé ra sân chơi chung vận động nhẹ trong 30 phút dưới sự giám sát; Cập nhật ảnh hàng ngày gửi chủ nuôi; Check-out bàn giao bé',
    amenities = 'Phòng gỗ thông 80x80x80cm, đệm ngủ êm ái chống thấm nước, bát ăn bát uống bằng inox kháng khuẩn, sân chơi trải thảm cỏ nhân tạo sạch sẽ',
    groomer_level = 'Nhân viên chăm sóc lưu trú',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/hotel/htl02.jpg']
WHERE service_code = 'HTL02';
UPDATE public.service SET 
    rating = 4.9,
    review_count = 102,
    benefits = 'Chủ nuôi an tâm tuyệt đối nhờ camera livestream thời gian thực 24/7; Không gian nghỉ dưỡng sang trọng có máy lạnh mát mẻ ổn định; Đồ chơi đa dạng giải trí.',
    checklist = 'Check-in VIP tiếp nhận bé và hướng dẫn chủ cài link xem camera; Setup phòng Deluxe với máy lạnh riêng biệt; Cho ăn 3 bữa/ngày với chế độ hạt pate organic cao cấp; Thay nước sạch tinh khiết từ đài phun nước thông minh; Dọn vệ sinh khay cát ngay lập tức sau khi bé đi vệ sinh; Cho bé ra sân chơi tương tác 1 tiếng/ngày; Cập nhật Care-Log kèm ảnh/video 2 lần/ngày; Check-out bàn giao bé',
    amenities = 'Phòng kính cường lực cách âm 100x100x100cm sang trọng sạch sẽ, Camera IP HD góc rộng có hồng ngoại ban đêm xem qua App, đài phun nước Petkit, máy điều hòa Daikin',
    groomer_level = 'Nhân viên chăm sóc lưu trú',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/hotel/htl03.jpg']
WHERE service_code = 'HTL03';
UPDATE public.service SET 
    rating = 4.9,
    review_count = 58,
    benefits = 'Đáp ứng thói quen leo trèo vận động trên cao của loài mèo; Giảm căng thẳng hoảng sợ nhờ không gian tách biệt hoàn toàn tiếng sủa của chó; Trụ cào móng giải trí.',
    checklist = 'Check-in mèo cưng và ghi chú thói quen dùng cát; Chuẩn bị buồng Cat Condo sạch sẽ; Cấp nước sạch qua vòi tự động; Cho mèo ăn ngày 3 bữa (pate tươi và hạt mèo); Dọn khay vệ sinh 4 lần/ngày; Dùng chổi cọ lông dọn bụi phòng ở; Chơi đùa tương tác bằng cần câu mèo lông vũ 20 phút/ngày; Gửi ảnh báo cáo cho chủ; Check-out',
    amenities = 'Buồng gỗ thiết kế 3 tầng leo trèo dọc kích thước 120x80x80cm, võng treo mềm mại cho mèo nằm cuộn tròn, trụ cào móng cuốn dây thừng sisal tự nhiên, khay vệ sinh bán khép kín khử mùi',
    groomer_level = 'Nhân viên chăm sóc lưu trú',
    pet_type = 'Mèo',
    images = ARRAY['assets/images/services/hotel/htl04.jfif']
WHERE service_code = 'HTL04';
UPDATE public.service SET 
    rating = 4.9,
    review_count = 89,
    benefits = 'Trải nghiệm nghỉ dưỡng đẳng cấp thượng lưu không gò bó; Chế độ dinh dưỡng đặc biệt thiết kế riêng theo thói quen/dị ứng của bé; Camera giám sát trực tiếp chất lượng cao.',
    checklist = 'Check-in sảnh VIP nhanh chóng; Thiết lập hồ sơ chăm sóc y tế và dinh dưỡng cá nhân hóa 1:1; Setup phòng Luxury Suite rộng lớn có tiểu cảnh leo trèo cho mèo hoặc khu chạy cho chó; Cho ăn theo menu riêng yêu cầu (Ví dụ: thịt bò áp chảo, ức gà luộc); Vệ sinh dọn phòng 6 lần/ngày; Dắt bé đi dạo công viên trong 45 phút/ngày; Cập nhật Care-Log thời gian thực kèm video livestream; Check-out bàn giao bé',
    amenities = 'Căn hộ kính rộng 150x150x150cm decor tiểu cảnh leo trèo gỗ cao cấp, Camera giám sát thông minh xoay 360 độ, máy lọc không khí khử mùi chuyên dụng, đệm sưởi ấm điện tử',
    groomer_level = 'Chuyên gia chăm sóc thú cưng',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/hotel/htl05.webp', 'assets/images/services/hotel/htl-htl05.jpg']
WHERE service_code = 'HTL05';
UPDATE public.service SET 
    rating = 5.0,
    review_count = 43,
    benefits = 'Không gian siêu rộng lớn giúp bé vận động tự do thoải mái; Dịch vụ dắt đi dạo và spa tắm chải thư giãn miễn phí trong suốt đợt lưu trú; Nhật ký Care-Log cập nhật liên tục.',
    checklist = 'Check-in tiếp nhận đặc biệt bởi Chuyên gia chăm sóc; Thiết lập khẩu phần ăn tươi giàu protein (bò, gà, cá hồi tươi); Bố trí phòng Presidential Suite rộng 3m2 có sân vườn mini riêng biệt; Dọn vệ sinh phòng liên tục mỗi giờ; Dắt đi dạo công viên rộng rãi 2 lần/ngày (sáng/chiều); Tắm chải vệ sinh miễn phí trước ngày check-out; Care-Log cập nhật realtime theo mỗi hoạt động của bé; Check-out và tặng quà lưu niệm lưu trú',
    amenities = 'Phòng biệt thự mini 200x150x200cm có sân cỏ mini ngoài trời riêng tư, máy điều hòa không khí inverter lọc bụi mịn, camera xoay 360 độ điều khiển từ xa, đồ chơi thể thao chuyên dụng',
    groomer_level = 'Chuyên gia chăm sóc thú cưng',
    pet_type = 'Chó',
    images = ARRAY['assets/images/services/hotel/htl06.jpg']
WHERE service_code = 'HTL06';
UPDATE public.service SET 
    rating = 4.8,
    review_count = 145,
    benefits = 'Bé được ăn uống vui chơi thoải mái lành mạnh tránh stress hoảng loạn khi ở nhà một mình cắn phá đồ; Giám sát y tế kịp thời nếu có biểu hiện bệnh.',
    checklist = 'Tiếp nhận thú cưng vào buổi sáng từ 7h30-9h; Ghi chép thông tin ăn uống buổi trưa; Setup chuồng nghỉ tạm thời sạch sẽ; Cho ăn trưa (11h30) theo định lượng yêu cầu; Dọn dẹp vệ sinh ngay lập tức; Đưa bé tham gia khu vực vui chơi cộng đồng có đồ chơi giải trí lúc 14h-16h; Cho bé ăn nhẹ bữa xế chiều; Kiểm tra và bàn giao lại cho chủ trước 19h30; Care-Log cập nhật',
    amenities = 'Sân chơi vui chơi chung trong nhà rộng rãi lót thảm chống trơn, điều hòa mát mẻ, đồ chơi đa dạng (bóng, đường hầm), khu vực ngủ trưa yên tĩnh riêng biệt',
    groomer_level = 'Nhân viên chăm sóc lưu trú',
    pet_type = 'Chó / Mèo',
    images = ARRAY['assets/images/services/hotel/htl07.jfif']
WHERE service_code = 'HTL07';
UPDATE public.service SET 
    rating = 4.8,
    review_count = 43,
    benefits = 'Đảm bảo an toàn không bị tấn công bởi chó mèo; Môi trường yên tĩnh sạch sẽ khô ráo; Chế độ ăn uống hạt ngũ cốc, rau củ tươi sấy khô sạch sẽ.',
    checklist = 'Check-in tiếp nhận bé thú nhỏ (ghi chú thói quen ăn uống); Setup buồng Small Pet Condo (sát trùng và rải mùn cưa lót chuồng mới); Cho ăn bữa sáng và bữa tối (hạt Jolly, cỏ Timothy khô); Thay nước bình bi lăn sạch sẽ; Dọn dẹp chất thải 2 lần/ngày; Theo dõi sức khỏe; Check-out bàn giao bé',
    amenities = 'Buồng gỗ thông cách âm 50x50x50cm độc lập mát mẻ 25 độ C, mùn cưa gỗ thông nén không bụi, đệm nằm nỉ mini, bánh chạy tập thể dục',
    groomer_level = 'Nhân viên chăm sóc lưu trú',
    pet_type = 'Thỏ / Hamster / Bọ ú',
    images = ARRAY['assets/images/services/hotel/htl08.jfif']
WHERE service_code = 'HTL08';
UPDATE public.service SET 
    rating = 4.7,
    review_count = 64,
    benefits = 'Tiết kiệm tối đa thời gian di chuyển của chủ nuôi; Đảm bảo an toàn tuyệt đối và sự thoải mái cho thú cưng không bị say xe hoảng sợ khi đi đường dài.',
    checklist = 'Tiếp nhận yêu cầu địa điểm đưa đón và khung giờ; Admin điều phối xe ô tô chuyên chở đến tận nhà chủ nuôi; Kiểm tra và đưa bé cưng vào lồng vận chuyển trên xe cố định thắt dây bảo hiểm xe; Bật điều hòa mát mẻ và nhạc nhẹ xoa dịu stress; Di chuyển an toàn theo đúng lộ trình; Tiếp đón bé tại cửa hàng PawPal hoặc đưa bé về tận nhà bàn giao đúng hẹn; Ký nhận bàn giao',
    amenities = 'Xe ô tô chuyên dụng có vách ngăn y tế an toàn, lồng vận chuyển kim loại lót thảm êm ái tiệt trùng sạch sẽ sau mỗi lượt đi, điều hòa riêng khu cabin thú cưng',
    groomer_level = 'Tài xế kiêm nhân viên cứu hộ thú cưng',
    pet_type = 'Chó / Mèo / Thú nhỏ',
    images = ARRAY['assets/images/services/txi01.webp']
WHERE service_code = 'TXI01';