import re

# 1. Update main.js
with open('scripts/shared/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''    function getCart() { return JSON.parse(localStorage.getItem('pawpal_cart') || '[]'); }
    function saveCart(cart) { 
        localStorage.setItem('pawpal_cart', JSON.stringify(cart)); 
        const currentUser = getCurrentWishlistUser();
        if (window.API && window.API.saveUserCart) {
            window.API.saveUserCart(currentUser?.id || currentUser?.phone || null, cart);
        }
        if (window.updateCartBadge) window.updateCartBadge();
    }'''

content = content.replace("    function getCart() { return JSON.parse(localStorage.getItem('pawpal_cart') || '[]'); }\n    function saveCart(cart) { localStorage.setItem('pawpal_cart', JSON.stringify(cart)); }", replacement)

with open('scripts/shared/main.js', 'w', encoding='utf-8') as f:
    f.write(content)


# 2. Update header-auth.js
with open('scripts/shared/header-auth.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacement_badge = '''    window.updateCartBadge = async function() {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        let cart = [];
        if (currentUser && window.API && window.API.getUserCart) {
            cart = await window.API.getUserCart(currentUser.id);
        } else {
            cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
        }
        const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);'''

content = re.sub(r'    window\.updateCartBadge = function\(\) \{\s*const cart = JSON\.parse\(localStorage\.getItem\(\'pawpal_cart\'\) \|\| \'\[\]\'\);\s*const totalItems = cart\.reduce\(\(sum, item\) =>', replacement_badge, content)

with open('scripts/shared/header-auth.js', 'w', encoding='utf-8') as f:
    f.write(content)
