import re, json, urllib.request, urllib.error
content = open('scripts/api/supabase-client.js', 'r', encoding='utf-8').read()
url = re.search(r'FALLBACK_URL\s*=\s*[\'"`](.*?)[\'"`]', content).group(1)
key = re.search(r'FALLBACK_ANON_KEY\s*=\s*[\'"`](.*?)[\'"`]', content).group(1)

def fetch_schema(table):
    req = urllib.request.Request(f'{url}/rest/v1/{table}?select=id', headers={'apikey': key, 'Authorization': f'Bearer {key}'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"[{table}] Success! Rows:", len(data))
            if data:
                print(f"[{table}] Columns:", list(data[0].keys()))
            else:
                print(f"[{table}] No rows, cannot determine schema from REST API data.")
    except urllib.error.HTTPError as e:
        print(f"[{table}] Error:", e.read().decode('utf-8'))

fetch_schema('blog_post')
fetch_schema('blog_category')
