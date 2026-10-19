require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function testOrdersMapping() {
  const { data: p, error } = await sb.from('product').select(`
    id, sku, product_name, unit, cost_price, sale_price,
    status, specs, badge, origin, ingredients, benefits, usage_instructions,
    rating, review_count, image_urls,
    category_id,
    product_category (id, category_name),
    inventory (quantity_in_stock, minimum_stock),
    product_variant (
        id, sku_variant, cost_price, sale_price, compare_at_price, status,
        variant_size (id, size_name),
        variant_color (id, color_name),
        variant_flavor (id, flavor_name)
    )
  `).eq('id', 'a0000000-0000-0000-0000-000000000001').single();

  if (error) {
    console.error('Lỗi truy vấn:', error);
    return;
  }

  const variants = p.product_variant || [];
  const hasFlavor = variants.some(v => v.variant_flavor?.flavor_name);
  const hasSize = variants.some(v => v.variant_size?.size_name);
  const hasColor = variants.some(v => v.variant_color?.color_name);

  let detectedAttr1Name = 'Hương vị';
  let detectedAttr2Name = 'Quy cách';
  if (hasFlavor) {
      detectedAttr1Name = 'Hương vị';
      if (hasSize) detectedAttr2Name = 'Kích thước';
      else if (hasColor) detectedAttr2Name = 'Màu sắc';
  }

  const mappedVariants = variants.map(v => {
      let a1 = v.variant_flavor?.flavor_name || '';
      let a2 = v.variant_size?.size_name || v.variant_color?.color_name || '';
      return {
          id: v.id,
          sku: v.sku_variant,
          attr1: a1,
          attr2: a2,
          name: a2 ? `${a1} - ${a2}` : a1,
          costPrice: Number(v.cost_price) || 0,
          price: Number(v.sale_price) || 0,
          originalPrice: v.compare_at_price ? Number(v.compare_at_price) : Number(v.sale_price),
          stock: 30,
          status: v.status
      };
  });

  console.log('=== KẾT QUẢ ÁNH XẠ BIẾN THỂ TRONG ORDERS.JS ===');
  console.log('Tên thuộc tính 1:', detectedAttr1Name);
  console.log('Tên thuộc tính 2:', detectedAttr2Name);
  console.log('Các Tag giá trị thuộc tính 1 (Hương vị):', [...new Set(mappedVariants.map(v => v.attr1))]);
  console.log('Các Tag giá trị thuộc tính 2 (Kích thước):', [...new Set(mappedVariants.map(v => v.attr2))]);
  console.log('\nDanh sách 5 biến thể sẽ render vào bảng Modal:');
  mappedVariants.forEach((v, idx) => {
    console.log(`[${idx+1}] SKU: ${v.sku} | ${v.name} | Vốn: ${v.costPrice.toLocaleString('vi-VN')} đ | Bán: ${v.price.toLocaleString('vi-VN')} đ | Niêm yết: ${v.originalPrice.toLocaleString('vi-VN')} đ | Tồn: ${v.stock}`);
  });
}
testOrdersMapping();
