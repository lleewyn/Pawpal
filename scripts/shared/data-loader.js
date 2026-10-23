
const dataCache = {
    products: null,
    services: null,
    blogs: null,
    blogCategories: null
};

function parseCSV(csvText) {
    const data = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                field += '"';
                i++; 
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === '\t' && !inQuotes) {
            row.push(field.trim());
            field = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++; 
            }
            if (field || row.length > 0) {
                row.push(field.trim());
                data.push(row);
            }
            row = [];
            field = '';
        } else {
            field += char;
        }
    }
    
    if (field || row.length > 0) {
        row.push(field.trim());
        data.push(row);
    }
    
    if (data.length === 0) return [];
    
    const headers = data[0].map(h => {
        let cleaned = h.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
        }
        return cleaned;
    });
    
    const result = [];
    for (let i = 1; i < data.length; i++) {
        const rowData = data[i];
        if (rowData.length === 0 || (rowData.length === 1 && rowData[0] === '')) continue;
        
        const obj = {};
        headers.forEach((header, index) => {
            let val = rowData[index] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            obj[header] = val;
        });
        result.push(obj);
    }
    
    return result;
}

function transformProductData(rawData) {
    return rawData.map((item, index) => {
        const categoryMap = {
            'Thức ăn khô': 'food-dry',
            'Thức ăn ướt': 'food-wet',
            'Xương gặm': 'bones',
            'Sức khỏe': 'health',
            'Đồ chơi': 'toys',
            'Quần áo': 'clothes',
            'Vệ sinh': 'hygiene',
            'Bát ăn': 'bowls',
            'Chăm sóc': 'grooming',
            'Phụ kiện': 'accessories',
            'Nội thất': 'furniture',
            'Khác': 'other'
        };
        
        const category = categoryMap[item['Danh mục (Category)']] || 'other';
        
        const price = parseInt(item['Giá sau tích điểm']?.replace(/\./g, '').replace(/[^\d]/g, '') || item['Giá bán lẻ']?.replace(/\./g, '').replace(/[^\d]/g, '') || '0');
        const originalPrice = parseInt(item['Giá bán lẻ']?.replace(/\./g, '').replace(/[^\d]/g, '') || '0');
        
        const sale = price < originalPrice;
        
        const stock = parseInt(item['Số lượng tồn kho (Inventory)'] || '0');
        const inStock = item['Trạng thái']?.toLowerCase().includes('còn hàng') || item['Trạng thái']?.toLowerCase() === 'available';
        
        let badge = null;
        const label = item['Nhãn sản phẩm']?.toLowerCase() || '';
        if (label.includes('bán chạy')) badge = 'best';
        else if (label.includes('mới')) badge = 'new';
        else if (label.includes('khuyên dùng')) badge = 'hot';
        
        const rating = parseFloat(item['Đánh giá (Rating)'] || '4.5');
        const reviewCount = parseInt(item['Lượt đánh giá (Review Count)'] || '0');
        
            let rawImagesStr = item['Hình ảnh'] || '';
            const rootPath = window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../';
            let parsedImages = rawImagesStr ? rawImagesStr.split(',').map(s => rootPath + s.trim()) : [rootPath + 'assets/images/shop/products/placeholder.webp'];

            return {
                id: index + 1,
                dbId: null,
                sku: item['Mã sản phẩm (SKU)'] || `PROD-${index + 1}`,
                name: item['Tên sản phẩm'] || 'Sản phẩm không tên',
                brand: item['Thương hiệu (Brand)'] || 'Chưa xác định',
                category: category,
                categoryName: item['Danh mục (Category)'] || 'Khác',
                price: price,
                originalPrice: sale ? originalPrice : null,
                oldPrice: sale ? originalPrice : null,
                image: parsedImages[0],
                images: parsedImages,
            inStock: inStock,
            stock: stock,
            sale: sale,
            badge: badge,
            trending: badge === 'hot' || badge === 'best',
            rating: rating,
            reviewCount: reviewCount,
            origin: item['Xuất xứ'] || 'Chưa rõ',
            ingredients: item['Thành phần'] || '',
            benefits: item['Công dụng'] || '',
            usage: item['Hướng dẫn sử dụng'] || '',
            specs: item['Thuộc tính đặc biệt / Quy cách đóng gói'] || '',
            description: item['Công dụng'] || item['Thành phần'] || 'Thông tin sản phẩm đang được cập nhật.'
        };
    });
}

async function loadProducts() {
    if (dataCache.products) {
        return dataCache.products;
    }
    
    try {
        const db = window.SupabaseClient;
        if (!db) {
            throw new Error('Supabase client is not initialized');
        }

        console.log('Loading products from Supabase...');
        const { data: rawProducts, error } = await db.rpc('customer_shop_catalog');
        
        if (error) {
            throw error;
        }

        console.log(` Loaded ${rawProducts.length} products from Supabase`);
        const rootPath = window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../';
        
        const knownBrands = ['Royal Canin', 'Pedigree', 'Me-O', 'Whiskas', "Hill's", 'Purina', 'Kong', 'Taste of the Wild', 'Frontline', 'Furminator', 'Nylabone', 'Hartz', "King's Pet", 'Inaba', 'Nutrience', 'Zenith', 'Orijen', 'Acana', 'GimCat', 'Gimborn', 'TropiClean', 'Bio-Pharmachemie'];

        const products = rawProducts.map(item => {
            // Prices belong to variants; use the lowest available active variant price.
            const variants = Array.isArray(item.product_variant) ? item.product_variant : [];
            const pricedVariants = variants
                .filter(variant => {
                    const st = String(variant.status || '').toLowerCase();
                    return (st === 'dang_ban' || st === 'active') && variant.sale_price != null
                        && Number.isFinite(Number(variant.sale_price)) && Number(variant.sale_price) >= 0;
                })
                .sort((a, b) => Number(a.sale_price) - Number(b.sale_price));
            const baseVariant = pricedVariants[0] || variants[0] || null;
            const price = baseVariant && baseVariant.sale_price != null ? Number(baseVariant.sale_price) : (Number(item.sale_price) || 0);
            const compareAtPrice = baseVariant?.compare_at_price != null
                ? Number(baseVariant.compare_at_price)
                : (baseVariant?.cost_price != null ? Number(baseVariant.cost_price) : (Number(item.cost_price) || null));
            const sale = price !== null && Number.isFinite(compareAtPrice) && compareAtPrice > price;
            const effectiveSku = baseVariant?.sku_variant || item.sku || '';
            let images = [];
            if (Array.isArray(item.image_urls)) {
                images = item.image_urls.map(url => /^https?:\/\//i.test(url) || url.startsWith('/') ? url : rootPath + url);
            }
            if (images.length === 0) images = [rootPath + 'assets/images/shop/products/placeholder.webp'];

            let badgeStr = item.badge ? String(item.badge).toLowerCase() : null;
            
            const stockCount = pricedVariants.reduce((sum,variant)=>sum+Number(variant.available_quantity||0),0);
            // Guess brand from product_name
            let detectedBrand = 'PawPal';
            if (item.product_name) {
                const lowerName = item.product_name.toLowerCase();
                for (const b of knownBrands) {
                    if (lowerName.includes(b.toLowerCase())) {
                        detectedBrand = b;
                        break;
                    }
                }
            }

            const itemStatus = String(item.status || '').toLowerCase();
            const isAvailable = itemStatus === 'active' || itemStatus === 'dang_ban';

            return {
                id: item.id,
                variantId: baseVariant?.id || null,
                sku: effectiveSku,
                name: item.product_name,
                brand: item.brand_name || '',
                brand_name: item.brand_name || '',
                target_pet: item.target_pet || 'Chó và Mèo',
                targetPet: item.target_pet || 'Chó và Mèo',
                category: item.category_id,
                categoryName: item.product_category?.category_name || 'Khác',
                price,
                originalPrice: sale ? compareAtPrice : null,
                oldPrice: sale ? compareAtPrice : null,
                image: images[0],
                images: images,
                inStock: isAvailable && (stockCount > 0 || variants.length === 0),
                stock: stockCount,
                sale: sale,
                badge: badgeStr,
                trending: badgeStr === 'hot' || badgeStr === 'best',
                rating: Number(item.rating) || 0,
                reviewCount: Number(item.review_count) || 0,
                origin: item.origin || 'Chưa rõ',
                ingredients: item.ingredients || '',
                benefits: item.benefits || item.description || '',
                usage: item.usage_instructions || '',
                specs: item.specs || '',
                description: item.description || '',
                variants: variants.map(v => ({
                    id: v.id,
                    sku: v.sku_variant,
                    name: v.sku_variant,
                    price: Number(v.sale_price) || 0,
                    stock: Number(v.available_quantity) || 0,
                    comparePrice: v.compare_at_price ? Number(v.compare_at_price) : null
                }))
            };
        });
        
        dataCache.products = products;
        return products;
    } catch (error) {
        console.error('Error loading products from Supabase:', error);
        return [];
    }
}

async function getProductById(productId) {
    const products = await loadProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        console.error(` Product not found: ID ${productId}`);
        return null;
    }
    
    console.log(` Found product:`, product.name);
    return product;
}

async function getProductsByCategory(category) {
    const products = await loadProducts();
    return products.filter(p => p.category === category);
}

async function getProductsByBrand(brand) {
    const products = await loadProducts();
    return products.filter(p => p.brand === brand);
}

async function searchProducts(keyword) {
    const products = await loadProducts();
    const lowerKeyword = keyword.toLowerCase();
    
    return products.filter(p => 
        p.name.toLowerCase().includes(lowerKeyword) ||
        p.brand.toLowerCase().includes(lowerKeyword) ||
        p.description.toLowerCase().includes(lowerKeyword)
    );
}

async function loadComponent(placeholderId, componentPath) {
    const el = document.getElementById(placeholderId);
    if (!el) {
        console.warn(`[loadComponent] Target not found: #${placeholderId}`);
        return;
    }
    try {
        const response = await fetch(componentPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        el.innerHTML = html;
        el.querySelectorAll('script').forEach(function(oldScript) {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(function(attr) {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
        (function tryLucide() {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            } else {
                setTimeout(tryLucide, 100);
            }
        })();
        console.log(`[loadComponent] Injected: #${placeholderId}`);
    } catch (err) {
        console.error(`[loadComponent] Failed to load ${componentPath}:`, err);
    }
}

async function loadServices() {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db) throw new Error('Chưa kết nối được dữ liệu dịch vụ.');
    const {data, error} = await db.rpc('public_service_directory');
    if (error) throw error;
    return (data || []).map(svc => {
        const category = ({grooming_spa:'spa',pet_hotel:'hotel',pet_taxi:'taxi'})[svc.category_code] || '';
        const prices = {};
        for (const p of (category === 'spa' ? svc.prices || [] : [])) {
            const label = p.weight_to == null ? `Từ ${Number(p.weight_from)} kg` : `${Number(p.weight_from)} – ${Number(p.weight_to)} kg`;
            prices[label] = Number(p.unit_price);
        }
        const amounts = Object.values(prices).filter(value => Number.isFinite(value) && value >= 0);
        // Existing presentation assets; service identities, availability and prices remain database-owned.
        const artwork = {
            SPA01:'spa/process/spa01.webp',SPA02:'spa/process/spa01.webp',SPA03:'spa/process/spa03.webp',
            SPA04:'spa/process/spa04.webp',SPA05:'spa/process/spa05.webp',SPA06:'spa/process/spa06.webp',
            SPA07:'spa/process/spa07.webp',SPA08:'spa/process/spa08.webp',SPA09:'spa/process/spa09.webp',
            SPA11:'spa/process/spa11.webp',SPA12:'spa/process/spa10.webp',SPA13:'spa/process/spa13.webp',SPA14:'spa/process/spa14.webp',
            HTL01:'htl01.webp',HTL02:'htl02.jpg',HTL03:'htl03.jpg',HTL04:'htl04.jfif',HTL05:'htl05.webp',HTL06:'htl06.jpg',HTL07:'htl07.jfif',HTL08:'htl08.jfif',TXI01:'txi01.webp'
        };
        const image = '/assets/images/services/' + (artwork[svc.service_code] || (category === 'taxi' ? 'txi01.webp' : category === 'hotel' ? 'hotel.png' : 'spa.png'));
        return {
            id:svc.id,dbId:svc.id,serviceId:svc.service_code,name:svc.service_name,description:svc.description || '',
            category,rawCategory:svc.category_code,petType:(svc.species || []).join(', ') || 'Chưa cấu hình loài',
            weightClass:amounts.length ? 'Theo cân nặng' : 'Theo thông tin đặt lịch',
            price:amounts.length ? Math.min(...amounts) : 0,hasPrice:amounts.length > 0,prices,priceDisplay:'',memberPrice:'',
            duration:svc.estimated_duration ? `${svc.estimated_duration} phút` : '',
            rating:Number(svc.rating),reviewCount:Number(svc.review_count),
            benefits:'',checklist:(svc.care_actions || []).join(';'),amenities:'',groomerLevel:'',image,images:[image],status:'Đang phục vụ'
        };
    });
}

async function getServiceById(serviceId) {
    if (!serviceId) return null;
    const services = await loadServices();
    if (!services || services.length === 0) return null;

    const rawQuery = String(serviceId).trim();
    const cleanQuery = rawQuery.toLowerCase().replace(/[-_\s]/g, '');

    // 1. Exact match by serviceId
    let service = services.find(s => s.serviceId === rawQuery);

    // 2. Case-insensitive match by serviceId
    if (!service) {
        service = services.find(s => String(s.serviceId || '').toLowerCase() === rawQuery.toLowerCase());
    }

    // 3. Normalized match (e.g., HTL01 matches HTL-01 or HTL01)
    if (!service) {
        service = services.find(s => {
            const sCode = String(s.serviceId || '').toLowerCase().replace(/[-_\s]/g, '');
            return sCode === cleanQuery;
        });
    }

    // 4. Match by dbId or numeric id
    if (!service) {
        service = services.find(s => String(s.dbId) === rawQuery || String(s.id) === rawQuery);
    }

    if (!service) {
        console.error(` Service not found: ID ${serviceId}`);
        return null;
    }
    
    console.log(` Found service:`, service.name);
    return service;
}

async function getProductReviews(productId) {
    if (!window.SupabaseClient) {
        console.warn('Supabase not available for fetching reviews.');
        return [];
    }
    const db = window.SupabaseClient;
    if (!db) return [];

    try {
        const { data, error } = await db.rpc('customer_product_reviews',{p_product:productId});

        if (error) throw error;
        
        return data.map(r => ({
            id: r.id,
            rating: r.rating,
            content: r.review_content,
            createdAt: r.created_at,
            customerName: 'Khách đã mua hàng',
            variantName: r.variant_name || '',
            hasMedia: false,
            media: [],
            hasReply: !!r.shop_reply,
            shopReply: r.shop_reply || ''
        }));
    } catch (err) {
        console.error('Error fetching product reviews:', err);
        throw err;
    }
}

async function getServiceReviews(serviceId) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db) throw new Error('Chưa kết nối được đánh giá dịch vụ.');
    const {data, error} = await db.rpc('public_service_reviews', {p_service:serviceId});
    if (error) throw error;
    return (data || []).map(r => ({
        id:r.id,name:'Khách đã sử dụng dịch vụ',rating:Number(r.rating),date:r.created_at,
        text:r.review_content || '',images:[],sellerReply:r.shop_reply || '',helpfulCount:0
    }));
}

async function loadBlogCategories() {
    if (dataCache.blogCategories) return dataCache.blogCategories;

    try {
        const db = window.SupabaseClient;
        if (!db) throw new Error('Supabase client is not initialized');

        const { data, error } = await db.from('blog_category').select('*').order('display_order', { ascending: true });
        if (error) throw error;

        dataCache.blogCategories = data;
        return data;
    } catch (error) {
        console.error('Error fetching blog categories:', error);
        return [];
    }
}

async function loadBlogs(forceRefresh = false) {
    if (!forceRefresh && dataCache.blogs?.length) return dataCache.blogs;

    try {
        const db = window.getSupabaseClient?.() || window.SupabaseClient;
        if (!db) throw new Error('Supabase client is not initialized');

        const { data, error } = await db.from('blog_post').select('*, blog_category(category_name)').in('status', ['published', 'PUBLISHED', 'dang_hien_thi']).order('publish_at', { ascending: false });
        if (error) throw error;

        const rootPath = window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../';
        const formatted = data.map(item => {
            return {
                id: item.id,
                title: item.title,
                slug: item.slug,
                summary: item.summary,
                content: item.content,
                thumbnail: item.thumbnail_url ? (item.thumbnail_url.startsWith('http') ? item.thumbnail_url : rootPath + item.thumbnail_url.replace(/^[\/\\]+/, '')) : rootPath + 'assets/images/shop/products/placeholder.webp',
                authorId: item.author_id,
                date: item.publish_at || item.created_at,
                viewCount: item.view_count || 0,
                categoryId: item.category_id,
                categoryName: item.blog_category?.category_name || 'Uncategorized',
                categorySlug: item.blog_category?.category_name ? item.blog_category.category_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'uncategorized'
            };
        });

        dataCache.blogs = formatted;
        return formatted;
    } catch (error) {
        console.error('Error fetching blogs:', error);
        throw error;
    }
}

async function loadBanners() {
    if (dataCache.banners) return dataCache.banners;

    try {
        const db = window.SupabaseClient || (window.getSupabaseClient ? window.getSupabaseClient() : null);
        if (!db) throw new Error('Supabase client is not initialized');

        const { data, error } = await db.from('banner')
            .select('*')
            .or('status.eq.dang_hien_thi,status.eq.ACTIVE')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const rootPath = window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../';
        const banners = (data || []).map(b => {
            let imgUrl = b.image_url || b.image_desktop_url || '';
            if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
                imgUrl = rootPath + imgUrl;
            }
            return {
                id: b.id,
                title: b.title || 'Ưu đãi PawPal',
                image: imgUrl || '/assets/images/banners/spa_animation.png',
                link: b.link || b.target_url || '/pages/services/services.html',
                buttonText: b.button_text || b.cta_text || 'Xem ngay',
                status: b.status || (b.is_active ? 'active' : 'paused')
            };
        });

        dataCache.banners = banners;
        return banners;
    } catch (error) {
        console.warn('Error fetching banners from Supabase:', error);
        return [];
    }
}

window.DataLoader = {
    loadProducts,
    getProductById,
    getProductsByCategory,
    getProductsByBrand,
    searchProducts,
    loadServices,
    getServiceById,
    getProductReviews,
    getServiceReviews,
    loadBlogs,
    loadBlogCategories,
    loadBanners
};

console.log(' DataLoader module initialized');

