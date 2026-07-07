import csv
import json

sql_statements = [
    "ALTER TABLE public.service ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 1) DEFAULT 4.8;",
    "ALTER TABLE public.service ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;",
    "ALTER TABLE public.service ADD COLUMN IF NOT EXISTS benefits TEXT;",
    "ALTER TABLE public.service ADD COLUMN IF NOT EXISTS checklist TEXT;",
    "ALTER TABLE public.service ADD COLUMN IF NOT EXISTS amenities TEXT;",
    "ALTER TABLE public.service ADD COLUMN IF NOT EXISTS groomer_level VARCHAR(50);",
    "ALTER TABLE public.service ADD COLUMN IF NOT EXISTS pet_type VARCHAR(50);",
    "ALTER TABLE public.service ADD COLUMN IF NOT EXISTS images TEXT[];",
    ""
]

def escape_sql_string(s):
    if not s:
        return 'NULL'
    return "'" + s.replace("'", "''") + "'"

with open('data/dichvu.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter='\t')
    for row in reader:
        service_id = row.get('Mã dịch vụ (Service ID)')
        if not service_id:
            continue
            
        rating = row.get('Đánh giá (Rating)', '4.8')
        review_count = row.get('Lượt đánh giá (Review Count)', '0')
        benefits = row.get('Lợi ích chính (Key Benefits)', '')
        checklist = row.get('Quy trình thực hiện (Checklist)', '')
        amenities = row.get('Tiện ích / Cơ sở vật chất (Amenities)', '')
        groomer_level = row.get('Cấp độ nhân viên thực hiện (Groomer Level)', '')
        pet_type = row.get('Loại thú cưng', '')
        
        # Parse images
        images_raw = row.get('Hình ảnh', '')
        if images_raw:
            # e.g. assets/images/services/spa.png, ...
            images_list = [f"'{img.strip()}'" for img in images_raw.split(',')]
            images_sql = "ARRAY[" + ", ".join(images_list) + "]"
        else:
            images_sql = "NULL"

        sql = f"""UPDATE public.service SET 
    rating = {rating},
    review_count = {review_count},
    benefits = {escape_sql_string(benefits)},
    checklist = {escape_sql_string(checklist)},
    amenities = {escape_sql_string(amenities)},
    groomer_level = {escape_sql_string(groomer_level)},
    pet_type = {escape_sql_string(pet_type)},
    images = {images_sql}
WHERE service_code = '{service_id}';"""
        sql_statements.append(sql)

with open('seed_parts/07_1-update_service_details.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_statements))
    
print("Generated seed_parts/07_1-update_service_details.sql")
