/**
 * data-loader.js — Load and parse CSV data
 * Centralized data loading for products and services
 */

// Cache for loaded data
const dataCache = {
    products: null,
    services: null,
    blogs: null,
    blogCategories: null
};

/**
 * Parse CSV text to array of objects
 * @param {string} csvText - Raw CSV text
 * @returns {Array<Object>} - Array of objects
 */
function parseCSV(csvText) {
    const data = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    
    // Duyệt qua từng ký tự để phân tích trạng thái ngoặc kép và dấu phân tách hàng/cột
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Xử lý ký tự ngoặc kép lồng nhau bên trong ô dữ liệu ("" -> ")
                field += '"';
                i++; // Bỏ qua ký tự nháy tiếp theo
            } else {
                // Đổi trạng thái (đang ở trong hoặc ngoài cặp dấu ngoặc kép)
                inQuotes = !inQuotes;
            }
        } else if (char === '\t' && !inQuotes) {
            // Hết một cột (dấu tab phân tách ngoài ngoặc kép)
            row.push(field.trim());
            field = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            // Hết một dòng dữ liệu (ngoài ngoặc kép)
            if (char === '\r' && nextChar === '\n') {
                i++; // Bỏ qua ký tự \n đi kèm sau \r
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
    
    // Nạp nốt trường cuối cùng nếu dòng cuối không có ký tự xuống dòng
    if (field || row.length > 0) {
        row.push(field.trim());
        data.push(row);
    }
    
    if (data.length === 0) return [];
    
    // Lấy tiêu đề cột từ hàng đầu tiên và loại bỏ dấu ngoặc kép bao quanh nếu có
    const headers = data[0].map(h => {
        let cleaned = h.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
        }
        return cleaned;
    });
    
    // Áp các hàng dữ liệu tương ứng vào tiêu đề cột tương ứng
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

/**
 * Transform raw CSV product data to app format
 * @param {Array<Object>} rawData - Parsed CSV data
 * @returns {Array<Object>} - Transformed product objects
 */
function transformProductData(rawData) {
    return rawData.map((item, index) => {
        // Map from Vietnamese category name in CSV to category slug
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
        
        // Parse prices
        const price = parseInt(item['Giá sau tích điểm']?.replace(/\./g, '').replace(/[^\d]/g, '') || item['Giá bán lẻ']?.replace(/\./g, '').replace(/[^\d]/g, '') || '0');
        const originalPrice = parseInt(item['Giá bán lẻ']?.replace(/\./g, '').replace(/[^\d]/g, '') || '0');
        
        // Determine if on sale
        const sale = price < originalPrice;
        
        // Parse stock
        const stock = parseInt(item['Số lượng tồn kho (Inventory)'] || '0');
        const inStock = item['Trạng thái']?.toLowerCase().includes('còn hàng') || item['Trạng thái']?.toLowerCase() === 'available';
        
        // Determine badge
        let badge = null;
        const label = item['Nhãn sản phẩm']?.toLowerCase() || '';
        if (label.includes('bán chạy')) badge = 'best';
        else if (label.includes('mới')) badge = 'new';
        else if (label.includes('khuyên dùng')) badge = 'hot';
        
        // Parse rating
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

/**
 * Load products from CSV file
 * @returns {Promise<Array<Object>>} - Promise resolving to products array
 */
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
        const { data: rawProducts, error } = await db.from('product').select('*, product_category!inner(category_name)');
        
        if (error) {
            throw error;
        }

        console.log(` Loaded ${rawProducts.length} products from Supabase`);
        const rootPath = window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../';
        
        const products = rawProducts.map(item => {
            const sale = Number(item.sale_price) < Number(item.cost_price);
            let images = [];
            if (Array.isArray(item.image_urls)) {
                images = item.image_urls.map(url => rootPath + url);
            }
            if (images.length === 0) images = [rootPath + 'assets/images/shop/products/placeholder.webp'];

            let badgeStr = item.badge ? String(item.badge).toLowerCase() : null;

            return {
                id: item.id,
                sku: item.sku,
                name: item.product_name,
                brand: 'PawPal', // Simplified
                category: item.category_id,
                categoryName: item.product_category?.category_name || 'Khác',
                price: Number(item.sale_price),
                originalPrice: sale ? Number(item.cost_price) : null,
                oldPrice: sale ? Number(item.cost_price) : null,
                image: images[0],
                images: images,
                inStock: item.status === 'ACTIVE' && Number(item.stock) > 0,
                stock: Number(item.stock),
                sale: sale,
                badge: badgeStr,
                trending: badgeStr === 'hot' || badgeStr === 'best',
                rating: Number(item.rating) || 4.5,
                reviewCount: Number(item.review_count) || 0,
                origin: item.origin || 'Chưa rõ',
                ingredients: item.ingredients || '',
                benefits: item.benefits || item.description || '',
                usage: item.usage_instructions || '',
                specs: item.specs || '',
                description: item.description || ''
            };
        });
        
        // Cache the data
        dataCache.products = products;
        return products;
    } catch (error) {
        console.error('Error loading products from Supabase:', error);
        return [];
    }
}

/**
 * Get a single product by ID
 * @param {number} productId - Product ID
 * @returns {Promise<Object|null>} - Promise resolving to product object or null
 */
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

/**
 * Get products by category
 * @param {string} category - Category slug
 * @returns {Promise<Array<Object>>} - Promise resolving to products array
 */
async function getProductsByCategory(category) {
    const products = await loadProducts();
    return products.filter(p => p.category === category);
}

/**
 * Get products by brand
 * @param {string} brand - Brand name
 * @returns {Promise<Array<Object>>} - Promise resolving to products array
 */
async function getProductsByBrand(brand) {
    const products = await loadProducts();
    return products.filter(p => p.brand === brand);
}

/**
 * Search products by keyword
 * @param {string} keyword - Search keyword
 * @returns {Promise<Array<Object>>} - Promise resolving to products array
 */
async function searchProducts(keyword) {
    const products = await loadProducts();
    const lowerKeyword = keyword.toLowerCase();
    
    return products.filter(p => 
        p.name.toLowerCase().includes(lowerKeyword) ||
        p.brand.toLowerCase().includes(lowerKeyword) ||
        p.description.toLowerCase().includes(lowerKeyword)
    );
}

/**
 * Load an HTML component into a placeholder element.
 * Re-executes any <script> tags found inside the injected HTML.
 * @param {string} placeholderId - ID of the element to inject content into
 * @param {string} componentPath - URL path to the component HTML file
 */
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
        // Use innerHTML so the element itself stays in the DOM (avoids outerHTML ID loss)
        el.innerHTML = html;
        // Re-execute <script> tags — innerHTML parsing skips script execution
        el.querySelectorAll('script').forEach(function(oldScript) {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(function(attr) {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
        // Re-render Lucide icons — retry until library is loaded
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

/**
 * Transform raw CSV service data to app format
 * @param {Array<Object>} rawData - Parsed CSV data
 * @returns {Array<Object>} - Transformed service objects
 */
function transformServiceData(rawData) {
    return rawData.map((item, index) => {
        const rawCategory = item['Phân loại'] || '';
        let category = 'other';
        if (rawCategory.includes('Spa và Grooming') || rawCategory.includes('Spa & Grooming')) {
            category = 'spa';
        } else if (rawCategory.includes('Pet Hotel')) {
            category = 'hotel';
        } else if (rawCategory.includes('Pet Taxi')) {
            category = 'taxi';
        }

        const priceSub5 = parseInt(item['Giá <5kg (VNĐ)']?.replace(/[^\d]/g, '') || '0', 10);
        const price5to10 = parseInt(item['Giá 5-10kg (VNĐ)']?.replace(/[^\d]/g, '') || '0', 10);
        const price10to20 = parseInt(item['Giá 10-20kg (VNĐ)']?.replace(/[^\d]/g, '') || '0', 10);
        const priceOver20 = parseInt(item['Giá >20kg (VNĐ)']?.replace(/[^\d]/g, '') || '0', 10);

        const prices = {
            '< 5kg': priceSub5,
            '5 - 10kg': price5to10,
            '10 - 20kg': price10to20,
            '> 20kg': priceOver20
        };

        const validPrices = Object.values(prices).filter(p => p > 0);
        const basePrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

        const rating = parseFloat(item['Đánh giá (Rating)'] || '4.8');
        const reviewCount = parseInt(item['Lượt đánh giá (Review Count)'] || '0', 10);

        const rootPath = window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../';
        const cleanImagePath = (rawPath) => {
            const trimmed = rawPath.trim();
            return trimmed.replace(/^\/*/, '');
        };
        const serviceImages = item['Hình ảnh'] ? item['Hình ảnh'].split(',').map(s => rootPath + cleanImagePath(s)) : [rootPath + 'assets/images/services/spa.png'];

        return {
            id: index + 1,
            dbId: null,
            serviceId: item['Mã dịch vụ (Service ID)'] || `SVC-${index + 1}`,
            name: item['Tên dịch vụ'] || 'Dịch vụ',
            category: category,
            rawCategory: rawCategory,
            petType: item['Loại thú cưng'] || 'Tất cả',
            weightClass: validPrices.length > 0 ? 'Tùy chọn cân nặng' : 'Tất cả',
            price: basePrice,
            prices: prices,
            priceDisplay: category === 'hotel' ? 'đêm' : '',
            memberPrice: item['Giá ưu đãi thành viên (VNĐ)'] || '',
            duration: item['Thời gian thực hiện (Duration)'] || '',
            rating: rating,
            reviewCount: reviewCount,
            description: item['Mô tả chi tiết (Description)'] || '',
            benefits: item['Lợi ích chính (Key Benefits)'] || '',
            checklist: item['Quy trình thực hiện (Checklist)'] || '',
            amenities: item['Tiện ích / Cơ sở vật chất (Amenities)'] || '',
            groomerLevel: item['Cấp độ nhân viên thực hiện (Groomer Level)'] || '',
            image: serviceImages[0],
            images: serviceImages,
            status: item['Trạng thái kinh doanh'] || 'Đang phục vụ'
        };
    });
}

/**
 * Load services from CSV file
 * @returns {Promise<Array<Object>>} - Promise resolving to services array
 */
async function loadServices() {
    if (dataCache.services) {
        console.log(' Using cached services data');
        return dataCache.services;
    }
    
    try {
        const supabase = window.SupabaseClient;
        if (!supabase) throw new Error("Supabase client not found");

        console.log('Loading services from Supabase...');
        // 1. Fetch services
        const { data: servicesData, error: servicesError } = await supabase
            .from('service')
            .select('*')
            .order('service_code');

        if (servicesError) throw servicesError;

        // 2. Fetch prices
        const { data: pricesData, error: pricesError } = await supabase
            .from('service_price_matrix')
            .select('*');

        if (pricesError) throw pricesError;

        // 3. Transform to match frontend expectations
        const rootPath = window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../';
        const cleanImagePath = (rawPath) => {
            if (!rawPath) return '';
            const trimmed = rawPath.trim();
            return rootPath + trimmed.replace(/^\/*/, '');
        };

        const services = servicesData.map((svc, index) => {
            // Determine category
            let category = 'spa';
            if (svc.service_category === 'PET_HOTEL') category = 'hotel';
            else if (svc.service_category === 'PET_TAXI') category = 'taxi';

            // Find prices for this service
            const svcPrices = pricesData.filter(p => p.service_id === svc.id);
            const prices = {};
            let basePrice = 0;
            
            // Format prices for UI
            if (svcPrices.length > 0) {
                // Group by weight range
                svcPrices.forEach(p => {
                    let label = '';
                    if (p.weight_to < 5) label = '< 5kg';
                    else if (p.weight_from >= 5 && p.weight_to <= 10) label = '5 - 10kg';
                    else if (p.weight_from >= 10 && p.weight_to <= 20) label = '10 - 20kg';
                    else if (p.weight_from >= 20) label = '> 20kg';
                    else label = 'Khác';
                    
                    if (label) prices[label] = p.unit_price;
                });
                const validPrices = Object.values(prices).filter(p => p > 0);
                if (validPrices.length > 0) {
                    basePrice = Math.min(...validPrices);
                }
            }

            // Images
            let imageList = [cleanImagePath(svc.thumbnail_url)];
            if (svc.images && Array.isArray(svc.images) && svc.images.length > 0) {
                imageList = svc.images.map(img => cleanImagePath(img));
            }

            return {
                id: index + 1,
                dbId: svc.id,
                serviceId: svc.service_code,
                name: svc.service_name,
                category: category,
                rawCategory: svc.service_category,
                petType: svc.pet_type || 'Tất cả',
                weightClass: basePrice > 0 ? 'Tùy chọn cân nặng' : 'Tất cả',
                price: basePrice,
                prices: prices,
                priceDisplay: category === 'hotel' ? 'đêm' : '',
                memberPrice: '', // We don't have this in DB yet
                duration: svc.estimated_duration ? `${svc.estimated_duration} phút` : '',
                rating: parseFloat(svc.rating || 4.8),
                reviewCount: parseInt(svc.review_count || 0),
                description: svc.description || '',
                benefits: svc.benefits || '',
                checklist: svc.checklist || '',
                amenities: svc.amenities || '',
                groomerLevel: svc.groomer_level || '',
                image: imageList[0],
                images: imageList,
                status: svc.status === 'ACTIVE' ? 'Đang phục vụ' : 'Ngưng phục vụ'
            };
        });
        
        console.log(` Transformed ${services.length} services from DB`);
        dataCache.services = services;
        return services;
    } catch (error) {
        console.error(' Error loading services from DB:', error);
        return [];
    }
}

/**
 * Get a single service by Service ID
 * @param {string} serviceId - Service ID (e.g. SPA01)
 * @returns {Promise<Object|null>} - Promise resolving to service object or null
 */
async function getServiceById(serviceId) {
    const services = await loadServices();
    const service = services.find(s => s.serviceId === serviceId);
    
    if (!service) {
        console.error(` Service not found: ID ${serviceId}`);
        return null;
    }
    
    console.log(` Found service:`, service.name);
    return service;
}

/**
 * Fetch product reviews by product ID
 * @param {string} productId - The product UUID
 * @returns {Promise<Array>} - List of reviews with customer names
 */
async function getProductReviews(productId) {
    if (!window.SupabaseClient) {
        console.warn('Supabase not available for fetching reviews.');
        return [];
    }
    const db = window.SupabaseClient;
    if (!db) return [];

    try {
        const { data, error } = await db
            .from('review')
            .select(`
                *,
                customer:customer_id (
                    customer_profile (full_name)
                )
            `)
            .eq('product_id', productId)
            .eq('review_status', 'APPROVED')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        return data.map(r => ({
            id: r.id,
            rating: r.rating,
            content: r.review_content,
            createdAt: r.created_at,
            customerName: Array.isArray(r.customer?.customer_profile)
                ? (r.customer.customer_profile[0]?.full_name || 'Khách hàng')
                : (r.customer?.customer_profile?.full_name || 'Khách hàng'),
            hasMedia: false,
            hasReply: false
        }));
    } catch (err) {
        console.error('Error fetching product reviews:', err);
        return [];
    }
}

async function getServiceReviews(serviceId) {
    const supabase = window.SupabaseClient;
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('review')
            .select(`
                id,
                rating,
                review_content,
                image_urls,
                created_at,
                customer (
                    customer_profile (
                        full_name
                    )
                ),
                review_response (
                    response_content
                )
            `)
            .eq('review_type', 'SERVICE')
            .eq('service_id', serviceId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        const getTierName = (tierStr) => {
            if (!tierStr) return 'Thành viên';
            const t = tierStr.toLowerCase();
            switch(t) {
                case 'diamond': return 'Hội viên Kim Cương';
                case 'gold': return 'Hội viên Vàng';
                case 'silver': return 'Hội viên Bạc';
                default: return 'Thành viên';
            }
        };

        return data.map(r => {
            const rawTier = r.customer?.membership_tier?.name ? r.customer.membership_tier.name.toLowerCase() : 'member';
            const sellerReply = (r.review_response && r.review_response.length > 0) ? r.review_response[0].response_content : null;
            
            return {
                id: r.id,
                name: Array.isArray(r.customer?.customer_profile)
                    ? (r.customer.customer_profile[0]?.full_name || 'Khách hàng')
                    : (r.customer?.customer_profile?.full_name || 'Khách hàng'),
                tier: rawTier,
                tierName: getTierName(rawTier),
                rating: r.rating,
                date: r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '',
                text: r.review_content,
                images: r.image_urls || [],
                sellerReply: sellerReply,
                helpfulCount: Math.floor(Math.random() * 10) + 1
            };
        });
    } catch (error) {
        console.error('Error fetching service reviews:', error);
        return [];
    }
}

/**
 * Load blog categories from Supabase
 * @returns {Promise<Array<Object>>}
 */
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

/**
 * Load blog posts from Supabase
 * @returns {Promise<Array<Object>>}
 */
async function loadBlogs() {
    if (dataCache.blogs) return dataCache.blogs;

    try {
        const db = window.SupabaseClient;
        if (!db) throw new Error('Supabase client is not initialized');

        const { data, error } = await db.from('blog_post').select('*, blog_category(category_name)').eq('status', 'PUBLISHED').order('publish_at', { ascending: false });
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
        return [];
    }
}

// Export functions for use in other modules
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
    loadBlogCategories
};

console.log(' DataLoader module initialized');
