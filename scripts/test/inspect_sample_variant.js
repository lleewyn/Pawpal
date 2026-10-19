require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function inspectSample() {
  const { data: prod, error } = await sb
    .from('product')
    .select('id, product_name, sku, product_variant(*, variant_color(color_name), variant_size(size_name), variant_flavor(flavor_name))')
    .eq('id', 'a0000000-0000-0000-0000-000000000001')
    .single();

  if (error) {
    console.error('Lỗi:', error);
    return;
  }

  console.log('TÊN SẢN PHẨM GỐC:', prod.product_name);
  console.log('MÃ SẢN PHẨM (ID):', prod.id);
  console.log('MÃ SKU GỐC:', prod.sku);
  console.log('TỔNG SỐ PHÂN LOẠI / BIẾN THỂ:', prod.product_variant.length);
  console.log('\nDANH SÁCH CÁC PHÂN LOẠI CỤ THỂ:');
  prod.product_variant.forEach((v, i) => {
    console.log(`[Phân loại ${i + 1}] Mã SKU: ${v.sku_variant}`);
    console.log(`   - Kích thước/Size: ${v.variant_size?.size_name || 'Không'}`);
    console.log(`   - Màu sắc: ${v.variant_color?.color_name || 'Không'}`);
    console.log(`   - Hương vị: ${v.variant_flavor?.flavor_name || 'Không'}`);
    console.log(`   - Giá vốn (cost_price): ${v.cost_price.toLocaleString('vi-VN')} đ`);
    console.log(`   - Giá bán (sale_price): ${v.sale_price.toLocaleString('vi-VN')} đ`);
    console.log(`   - Giá gốc (compare_at_price): ${v.compare_at_price ? v.compare_at_price.toLocaleString('vi-VN') + ' đ' : 'Không có'}`);
    console.log(`   - Trạng thái: ${v.status}\n`);
  });
}
inspectSample();
