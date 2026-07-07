import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace:
    # localStorage.setItem('pawpal_cart', JSON.stringify(VAR))
    # with:
    # if (window.saveCart) window.saveCart(VAR); else localStorage.setItem('pawpal_cart', JSON.stringify(VAR));
    
    def replacer(match):
        var_name = match.group(1)
        # Avoid replacing inside saveCart itself!
        if "window.saveCart = " in content and "localStorage.setItem('pawpal_cart'" in match.group(0):
             # Just a weak check. Let's not modify main.js or api.js or header-auth.js
             pass
        return f"if (window.saveCart) window.saveCart({var_name}); else localStorage.setItem('pawpal_cart', JSON.stringify({var_name}))"

    if 'main.js' in filepath or 'api.js' in filepath or 'header-auth.js' in filepath:
        return

    new_content = re.sub(r"localStorage\.setItem\('pawpal_cart',\s*JSON\.stringify\(([a-zA-Z0-9_]+)\)\)", replacer, content)
    # Also replace with double quotes
    new_content = re.sub(r'localStorage\.setItem\("pawpal_cart",\s*JSON\.stringify\(([a-zA-Z0-9_]+)\)\)', replacer, new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Patched {filepath}")

for root, _, files in os.walk('pages'):
    for file in files:
        if file.endswith('.js'):
            process_file(os.path.join(root, file))
