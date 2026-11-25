/**
 * scripts/database/migrate_products_to_variants.js
 * Script đồng bộ dữ liệu: Tạo biến thể mặc định (Default Variant) cho các sản phẩm đơn
 * chưa có bản ghi trong bảng `product_variant`.
 * 
 * Mục tiêu: Chuẩn hóa dữ liệu sang mô hình Parent Product (SPU) - Child Variant (SKU),
 * chuẩn bị cho việc loại bỏ các cột trùng lặp (sku, cost_price, sale_price) ở bảng product.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Lỗi: Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong file .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('========================================================================');
    console.log('=== BẮT ĐẦU MIGRATION: ĐỒNG BỘ SẢN PHẨM SANG PRODUCT_VARIANT ===');
    console.log('========================================================================\n');

    // 1. Lấy toàn bộ sản phẩm
    const { data: products, error: pError } = await supabase
        .from('product')
        .select('id, product_name, sku, cost_price, sale_price, status');

    if (pError) {
        console.error('Lỗi truy vấn bảng product:', pError);
        process.exit(1);
    }

    console.log(`[1] Tổng số sản phẩm trong bảng product: ${products.length}`);

    // 2. Lấy danh sách product_id đã có trong product_variant
    const { data: variants, error: vError } = await supabase
        .from('product_variant')
        .select('id, product_id, sku_variant');

    if (vError) {
        console.error('Lỗi truy vấn bảng product_variant:', vError);
        process.exit(1);
    }

    console.log(`[2] Tổng số biến thể hiện có trong product_variant: ${variants.length}`);

    const existingProductIds = new Set(variants.map(v => v.product_id));
    const productsToMigrate = products.filter(p => !existingProductIds.has(p.id));

    console.log(`[3] Số sản phẩm cần tạo biến thể mặc định: ${productsToMigrate.length}`);

    if (productsToMigrate.length === 0) {
        console.log('\n Tất cả sản phẩm đều đã có biến thể tương ứng trong product_variant!');
        return;
    }

    // 3. Chuẩn bị danh sách bản ghi biến thể mặc định
    const newVariants = productsToMigrate.map(p => {
        const skuVariant = p.sku && p.sku.trim() ? p.sku.trim() : `SKU-${p.id.slice(0, 8).toUpperCase()}`;
        const status = (p.status === 'ACTIVE' || p.status === 'dang_ban') ? 'dang_ban' : 'tam_ngung';

        return {
            product_id: p.id,
            sku_variant: skuVariant,
            cost_price: Number(p.cost_price) || 0,
            sale_price: Number(p.sale_price) || 0,
            status: status
        };
    });

    // 4. Chèn vào bảng product_variant theo batch
    console.log(`\n[4] Đang chèn ${newVariants.length} biến thể mặc định vào product_variant...`);
    const { data: inserted, error: iError } = await supabase
        .from('product_variant')
        .insert(newVariants)
        .select('id, product_id, sku_variant, sale_price');

    if (iError) {
        console.error(' Lỗi khi chèn biến thể mới:', iError);
        process.exit(1);
    }

    console.log(` Đã chèn thành công ${inserted.length} biến thể mặc định vào product_variant!\n`);

    // 5. Kiểm tra và xác nhận lại
    const { data: verifyVars } = await supabase.from('product_variant').select('id, product_id');
    const verifyProductIds = new Set(verifyVars.map(v => v.product_id));
    const stillMissing = products.filter(p => !verifyProductIds.has(p.id));

    console.log('========================================================================');
    console.log(`Tổng số sản phẩm gốc: ${products.length}`);
    console.log(`Tổng số biến thể sau migration: ${verifyVars.length}`);
    console.log(`Số sản phẩm chưa có biến thể: ${stillMissing.length}`);
    if (stillMissing.length === 0) {
        console.log(' KẾT QUẢ: 100% SẢN PHẨM ĐÃ CÓ BIẾN THỂ HỢP LỆ TRONG PRODUCT_VARIANT!');
    }
    console.log('========================================================================');
}

runMigration().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
