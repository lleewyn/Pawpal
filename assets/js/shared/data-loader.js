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
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    // Get headers from first line
    const headers = lines[0].split('\t').map(h => h.trim());
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // Skip empty lines
        
        // Split by tab, handle quoted fields
        const values = line.split('\t').map(v => {
            // Remove surrounding quotes if present
            v = v.trim();
            if (v.startsWith('"') && v.endsWith('"')) {
                v = v.slice(1, -1);
            }
            return v;
        });
        
        // Create object from headers and values
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        
        data.push(obj);
    }
    
    return data;
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
            let parsedImages = rawImagesStr ? rawImagesStr.split(',').map(s => `/${s.trim()}`) : ['/assets/images/shop/products/placeholder.webp'];

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
    // Return cached data if available
    if (dataCache.products) {
        console.log('✓ Using cached products data');
        return dataCache.products;
    }
    
    try {
        console.log('Loading products from CSV...');
        const response = await fetch('/data/sanpham.csv');
        
        if (!response.ok) {
            throw new Error(`Failed to load products: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log(`✓ CSV loaded: ${csvText.length} characters`);
        
        const rawData = parseCSV(csvText);
        console.log(`✓ Parsed ${rawData.length} raw products`);
        
        const products = transformProductData(rawData);
        console.log(`✓ Transformed ${products.length} products`);
        
        // Cache the data
        dataCache.products = products;
        
        return products;
    } catch (error) {
        console.error('❌ Error loading products:', error);
        
        // Return empty array as fallback
        console.warn('⚠️ Using fallback: empty products array');
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
        console.error(`❌ Product not found: ID ${productId}`);
        return null;
    }
    
    console.log(`✓ Found product:`, product.name);
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
        if (rawCategory.includes('Spa & Grooming')) {
            category = 'spa';
        } else if (rawCategory.includes('Pet Hotel')) {
            category = 'hotel';
        } else if (rawCategory.includes('Pet Taxi')) {
            category = 'taxi';
        }

        const price = parseInt(item['Giá niêm yết (VNĐ)']?.replace(/[^\d]/g, '') || '0', 10);
        const rating = parseFloat(item['Đánh giá (Rating)'] || '4.8');
        const reviewCount = parseInt(item['Lượt đánh giá (Review Count)'] || '0', 10);

        return {
            id: index + 1,
            serviceId: item['Mã dịch vụ (Service ID)'] || `SVC-${index + 1}`,
            name: item['Tên dịch vụ'] || 'Dịch vụ',
            category: category,
            rawCategory: rawCategory,
            petType: item['Loại thú cưng'] || 'Tất cả',
            weightClass: item['Phân khúc cân nặng'] || 'Tất cả',
            price: price,
            priceDisplay: item['Giá niêm yết (VNĐ)'] || 'Liên hệ',
            memberPrice: item['Giá ưu đãi thành viên (VNĐ)'] || '',
            duration: item['Thời gian thực hiện (Duration)'] || '',
            rating: rating,
            reviewCount: reviewCount,
            description: item['Mô tả chi tiết (Description)'] || '',
            benefits: item['Lợi ích chính (Key Benefits)'] || '',
            checklist: item['Quy trình thực hiện (Checklist)'] || '',
            amenities: item['Tiện ích / Cơ sở vật chất (Amenities)'] || '',
            groomerLevel: item['Cấp độ nhân viên thực hiện (Groomer Level)'] || '',
            image: item['Hình ảnh'] ? `/${item['Hình ảnh'].split(',')[0].trim()}` : '/assets/images/services/spa.png',
            images: item['Hình ảnh'] ? item['Hình ảnh'].split(',').map(s => `/${s.trim()}`) : ['/assets/images/services/spa.png'],
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
        console.log('✓ Using cached services data');
        return dataCache.services;
    }
    
    try {
        console.log('Loading services from CSV...');
        const response = await fetch('/data/dichvu.csv');
        
        if (!response.ok) {
            throw new Error(`Failed to load services: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log(`✓ Services CSV loaded: ${csvText.length} characters`);
        
        const rawData = parseCSV(csvText);
        console.log(`✓ Parsed ${rawData.length} raw services`);
        
        const services = transformServiceData(rawData);
        console.log(`✓ Transformed ${services.length} services`);
        
        dataCache.services = services;
        return services;
    } catch (error) {
        console.error('❌ Error loading services:', error);
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
        console.error(`❌ Service not found: ID ${serviceId}`);
        return null;
    }
    
    console.log(`✓ Found service:`, service.name);
    return service;
}

// Export functions for use in other modules
window.DataLoader = {
    loadProducts,
    getProductById,
    getProductsByCategory,
    getProductsByBrand,
    searchProducts,
    loadServices,
    getServiceById
};

console.log('✓ DataLoader module initialized');

