import re

# Fix product-detail.js
with open('pages/shop/product-detail/product-detail.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''    // Save to localStorage
    localStorage.setItem('pawpal_cart', JSON.stringify(cart));
    
    // Sync to Supabase if logged in
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (window.API && window.API.saveUserCart) {
        window.API.saveUserCart(currentUser?.id || currentUser?.phone || null, cart);
    }
'''

content = content.replace("    // Save to localStorage\n    localStorage.setItem('pawpal_cart', JSON.stringify(cart));", replacement)
with open('pages/shop/product-detail/product-detail.js', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix wishlist.js
try:
    with open('pages/user/wishlist/wishlist.js', 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("    // Save cart\n    localStorage.setItem('pawpal_cart', JSON.stringify(cart));", "    // Save cart\n    localStorage.setItem('pawpal_cart', JSON.stringify(cart));\n    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');\n    if (window.API && window.API.saveUserCart) {\n        window.API.saveUserCart(currentUser?.id || currentUser?.phone || null, cart);\n    }")
    with open('pages/user/wishlist/wishlist.js', 'w', encoding='utf-8') as f:
        f.write(content)
except Exception as e:
    print(e)
