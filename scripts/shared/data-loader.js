/**
 * data-loader.js — Load and parse CSV data
 * Centralized data loading for products and services
 */

// Cache for loaded data
const dataCache = {
    products: null,
    services: null
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
        console.log('Loading services from CSV...');
        const rootPath = window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../';
        const response = await fetch(rootPath + 'data/dichvu.csv');
        
        if (!response.ok) {
            throw new Error(`Failed to load services: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log(` Services CSV loaded: ${csvText.length} characters`);
        
        const rawData = parseCSV(csvText);
        console.log(` Parsed ${rawData.length} raw services`);
        
        const services = transformServiceData(rawData);
        console.log(` Transformed ${services.length} services`);
        
        dataCache.services = services;
        return services;
    } catch (error) {
        console.error(' Error loading services:', error);
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
            customerName: r.customer?.customer_profile?.[0]?.full_name || 'Khách hàng',
            hasMedia: false, // Update if media is supported
            hasReply: false  // Update if seller reply is supported
        }));
    } catch (err) {
        console.error('Error fetching product reviews:', err);
        alert('Lỗi Supabase khi tải đánh giá: ' + (err.message || JSON.stringify(err)));
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
    getProductReviews
};

console.log(' DataLoader module initialized');

