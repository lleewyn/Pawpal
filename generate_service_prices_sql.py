import csv
import uuid

sql_statements = [
    "DELETE FROM public.service_price_matrix;",
    ""
]

def parse_price(val):
    if not val:
        return 0
    digits = ''.join(filter(str.isdigit, val))
    return int(digits) if digits else 0

with open('data/dichvu.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter='\t')
    # Print the keys so we can debug if the key is slightly off
    keys = reader.fieldnames
    
    # Try to find the exact key names since sometimes they have hidden spaces
    key_under_5 = next((k for k in keys if '<5kg' in k), 'Giá <5kg (VNĐ)')
    key_5_to_10 = next((k for k in keys if '5-10kg' in k), 'Giá 5-10kg (VNĐ)')
    key_10_to_20 = next((k for k in keys if '10-20kg' in k), 'Giá 10-20kg (VNĐ)')
    key_over_20 = next((k for k in keys if '>20kg' in k), 'Giá >20kg (VNĐ)')

    for row in reader:
        service_id = row.get('Mã dịch vụ (Service ID)')
        if not service_id:
            continue
            
        prices = [
            (0, 4.9, parse_price(row.get(key_under_5))),
            (5, 10, parse_price(row.get(key_5_to_10))),
            (10.1, 20, parse_price(row.get(key_10_to_20))),
            (20.1, 99, parse_price(row.get(key_over_20)))
        ]
        
        pet_type_raw = row.get('Loại thú cưng', '')
        pet_species = 'all'
        if 'Chó' in pet_type_raw and 'Mèo' not in pet_type_raw:
            pet_species = 'dog'
        elif 'Mèo' in pet_type_raw and 'Chó' not in pet_type_raw:
            pet_species = 'cat'
            
        # If all prices are 0, just add a dummy price to avoid missing records
        if all(p[2] == 0 for p in prices):
            prices = [(0, 99, 100000)]
            
        for w_from, w_to, price in prices:
            if price <= 0:
                continue
                
            new_id = str(uuid.uuid4())
            sql = f"""INSERT INTO public.service_price_matrix (id, service_id, pet_species, weight_from, weight_to, unit_price, effective_from, status, created_at, updated_at)
VALUES (
    '{new_id}', 
    (SELECT id FROM public.service WHERE service_code = '{service_id}'),
    '{pet_species}', 
    {w_from}, 
    {w_to}, 
    {price}, 
    now(), 
    'ACTIVE', 
    now(), 
    now()
);"""
            sql_statements.append(sql)

with open('seed_parts/08_1-update_service_prices.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_statements))
    
print("Generated seed_parts/08_1-update_service_prices.sql")
