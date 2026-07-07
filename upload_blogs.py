import re, json, urllib.request, urllib.error, uuid, datetime

# Get Supabase Credentials
content = open('scripts/api/supabase-client.js', 'r', encoding='utf-8').read()
url = re.search(r'FALLBACK_URL\s*=\s*[\'"`](.*?)[\'"`]', content).group(1)
key = re.search(r'FALLBACK_ANON_KEY\s*=\s*[\'"`](.*?)[\'"`]', content).group(1)

def req_supabase(method, table, data=None, params=''):
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    req_url = f'{url}/rest/v1/{table}{params}'
    req_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(req_url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8')) if response.length else None
    except urllib.error.HTTPError as e:
        print(f"Error {method} {table}: {e.read().decode('utf-8')}")
        return None

# Delete existing rows
req_supabase('DELETE', 'blog_post', params='?id=not.is.null')
req_supabase('DELETE', 'blog_category', params='?id=not.is.null')

# Insert Categories
categories = [
    {'id': str(uuid.uuid4()), 'category_name': 'Tips', 'description': 'Mẹo chăm sóc', 'display_order': 1, 'status': 'PUBLISHED'},
    {'id': str(uuid.uuid4()), 'category_name': 'News', 'description': 'Tin tức', 'display_order': 2, 'status': 'PUBLISHED'},
    {'id': str(uuid.uuid4()), 'category_name': 'Promo', 'description': 'Khuyến mãi', 'display_order': 3, 'status': 'PUBLISHED'}
]
cat_map = {'tips': categories[0]['id'], 'news': categories[1]['id'], 'promo': categories[2]['id']}
req_supabase('POST', 'blog_category', categories)

# Extract from HTML
html = open('pages/public/blog/blog.html', 'r', encoding='utf-8').read()
articles = re.findall(r'<article class="[^"]*blog-entry"[^>]*data-main="([^"]*)"[^>]*data-tags="([^"]*)"[^>]*>.*?<img src="([^"]*)"[^>]*>.*?<span class="card-date">([^<]*)</span>.*?<h3 class="card-title">.*?<a[^>]*>([^<]*)</a>', html, re.DOTALL)

posts = []
author_id = 'd0000000-5555-5555-5555-555555555555' # Dummy admin
for i, art in enumerate(articles):
    main_cat, tags, img_src, date_str, title = art
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    cat_id = cat_map.get(main_cat, categories[0]['id'])
    
    posts.append({
        'id': str(uuid.uuid4()),
        'category_id': cat_id,
        'title': title.strip(),
        'slug': slug,
        'summary': f"Tóm tắt cho bài viết {title.strip()}",
        'content': f"<p>Đây là nội dung chi tiết cho bài viết <strong>{title.strip()}</strong>.</p><p>Các thẻ: {tags}</p>",
        'thumbnail_url': img_src.replace('../../../', '/'),
        'author_id': author_id,
        'status': 'PUBLISHED',
        'view_count': 100 + i * 50
    })

if posts:
    res = req_supabase('POST', 'blog_post', posts)
    print(f"Inserted {len(posts)} posts!")
else:
    print("No posts found in HTML!")
