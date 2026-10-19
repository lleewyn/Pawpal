require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testAll() {
  console.log('Testing queries with SUPABASE_ANON_KEY...');

  // 1. Orders: products query
  const qProd = await sb.from('product').select(`
    id, product_name, unit,
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
  `).limit(5);
  console.log('1. Orders - fetchProductsData:', qProd.error ? qProd.error.message : `OK (${qProd.data.length} prods)`);

  // 2. Orders: sales_order query
  const qOrd = await sb.from('sales_order').select(`
    id, order_code, order_status, payment_status, total_amount, note, created_at,
    customer (
        id, phone_main,
        customer_profile (full_name)
    ),
    shipping_address:customer_address!shipping_address_id (
        receiver_name, receiver_phone, province, street_address
    ),
    sales_order_detail (
        id, quantity, unit_price, discount_amount, subtotal,
        product (id, product_name, image_urls, specs, product_variant (sku_variant, sale_price))
    ),
    payment (payment_method_id, amount, transaction_status)
  `).order('created_at', { ascending: false }).limit(5);
  console.log('2. Orders - fetchOrdersData:', qOrd.error ? qOrd.error.message : `OK (${qOrd.data.length} orders)`);

  // 3. Orders: return_request query
  const qRma = await sb.from('return_request').select('id, sales_order_id, reason, return_type, description, request_status, created_at, return_request_detail (*, product (id, product_name, product_variant (sku_variant, sale_price)))').order('created_at', { ascending: false }).limit(5);
  console.log('3. Orders - rma query:', qRma.error ? qRma.error.message : `OK (${qRma.data.length} rma)`);

  // 4. Dashboard product query
  const qDash = await sb.from('product').select('id, product_name, status, inventory(quantity_in_stock, minimum_stock), product_variant(sku_variant)').limit(5);
  console.log('4. Dashboard - product query:', qDash.error ? qDash.error.message : `OK (${qDash.data.length} prods)`);

  // 5. Complaints product query
  const qComp = await sb.from('product').select('id, product_name, status, product_variant(sku_variant, sale_price)').limit(5);
  console.log('5. Complaints - product query:', qComp.error ? qComp.error.message : `OK (${qComp.data.length} prods)`);

  // 6. Settings product query
  const qSet = await sb.from('product').select('id, product_name, product_variant(sku_variant, sale_price)').order('product_name').limit(5);
  console.log('6. Settings - product query:', qSet.error ? qSet.error.message : `OK (${qSet.data.length} prods)`);
}
testAll();
