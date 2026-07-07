import uuid
import random
from datetime import datetime, timedelta

def get_random_date(start, end):
    return start + timedelta(seconds=random.randint(0, int((end - start).total_seconds())))

start_date = datetime.strptime("2026-01-01", "%Y-%m-%d")
end_date = datetime.strptime("2026-06-30", "%Y-%m-%d")

sql_statements = [
    "CREATE TABLE IF NOT EXISTS public.service_review (",
    "    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),",
    "    service_id UUID REFERENCES public.service(id) ON DELETE CASCADE,",
    "    reviewer_name VARCHAR(100) NOT NULL,",
    "    member_tier VARCHAR(50) DEFAULT 'member',",
    "    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),",
    "    review_text TEXT,",
    "    images TEXT[],",
    "    seller_reply TEXT,",
    "    helpful_count INT DEFAULT 0,",
    "    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())",
    ");",
    "",
    "-- Drop existing reviews if any",
    "DELETE FROM public.service_review;",
    ""
]

names = ['Minh Tuấn', 'Ngọc Hân', 'Hoàng Anh', 'Lan Phương', 'Trần Bảo', 'Thu Hiền', 'Thanh Tùng', 'Thảo Nguyễn', 'Mai Hoa', 'Đức Huy']
tiers = ['member', 'silver', 'gold', 'diamond']
reviews = [
    "Dịch vụ rất chu đáo! Bé nhà mình bình thường rất nhát nhưng đến đây được các bạn nhân viên dỗ dành rất khéo. Sẽ tiếp tục ủng hộ PawPal.",
    "Không gian sạch sẽ, thơm tho. Tuy nhiên cuối tuần hơi đông nên phải đợi khoảng 15 phút mới tới lượt. Mọi người nên đặt lịch trước nhé.",
    "Giá cả hợp lý so với chất lượng dịch vụ. Các bước làm rất kỹ và chuyên nghiệp.",
    "Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.",
    "Dịch vụ khá tốt, nhưng hy vọng có thêm nhiều lựa chọn mùi hương sữa tắm hơn.",
    "Mình rất hài lòng. Phòng chờ thoải mái, có chỗ uống nước nghỉ ngơi trong lúc chờ bé.",
    "Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!",
    "Bé cún nhà mình thơm tho suốt cả tuần luôn, đỉnh thật sự.",
    "Đưa đón tận nhà rất tiện lợi cho người đi làm bận rộn như mình. Xe sạch sẽ và có rọ mõm/chuồng an toàn.",
    "Lần đầu gửi bé ở đây rất yên tâm, các bạn update video hàng ngày qua Zalo."
]
replies = [
    "Cảm ơn anh/chị đã tin tưởng và sử dụng dịch vụ của PawPal. Chúc bé cưng luôn ngoan và khỏe mạnh ạ!",
    "PawPal xin lỗi vì sự bất tiện này ạ. Nhận được góp ý của anh/chị, tụi em sẽ cải thiện để phục vụ tốt hơn. Hẹn gặp lại anh/chị và bé ạ!",
    None, None,
    "Dạ tụi em ghi nhận góp ý ạ, thời gian tới PawPal sẽ update thêm các line mùi hương thiên nhiên mới phục vụ các bé.",
    None, None,
    "Cảm ơn bạn nhiều, hẹn gặp lại bé ở lần spa tiếp theo nhé!",
    None, None
]
images_pool = ['/assets/images/services/spa.png', '/assets/images/services/hotel.png']

services = ['SPA01', 'SPA02', 'SPA03', 'SPA04', 'SPA05', 'SPA06', 'HTL01', 'HTL02', 'HTL03', 'HTL04', 'TXI01']

for svc_code in services:
    num_reviews = random.randint(3, 8)
    for _ in range(num_reviews):
        rev_id = str(uuid.uuid4())
        name = random.choice(names)
        tier = random.choice(tiers)
        rating = random.choices([5, 4, 3, 2, 1], weights=[70, 20, 5, 3, 2])[0]
        text = random.choice(reviews)
        reply = random.choice(replies)
        created_at = get_random_date(start_date, end_date).strftime('%Y-%m-%d %H:%M:%S')
        
        has_image = random.random() < 0.3
        imgs = f"ARRAY['{random.choice(images_pool)}']" if has_image else "NULL"
        
        sql_reply = f"'{reply}'" if reply else "NULL"
        
        sql = f"""INSERT INTO public.service_review (id, service_id, reviewer_name, member_tier, rating, review_text, images, seller_reply, created_at)
VALUES (
    '{rev_id}', 
    (SELECT id FROM public.service WHERE service_code = '{svc_code}'),
    '{name}', 
    '{tier}', 
    {rating}, 
    '{text}', 
    {imgs}, 
    {sql_reply}, 
    '{created_at}'
);"""
        sql_statements.append(sql)

with open('seed_parts/09-service_reviews.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_statements))
    
print("Generated seed_parts/09-service_reviews.sql")
