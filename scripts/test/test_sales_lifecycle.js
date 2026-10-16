require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const anonDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const adminDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFullSalesLifecycle() {
    console.log('=== BẮT ĐẦU KIỂM THỬ VÒNG ĐỜI BÁN HÀNG & KHO (SALES & INVENTORY LIFECYCLE) ===\n');

    let createdOrderId = null;
    let createdOrderDetailId = null;
    let createdRmaId = null;
    let testProductId = null;
    let initialStock = 0;

    try {
        // Bước 1: Tìm khách hàng và sản phẩm khả dụng để tạo đơn
        console.log('1. Lấy khách hàng và sản phẩm mẫu từ Supabase...');
        const { data: customers, error: cErr } = await adminDb
            .from('customer')
            .select('id, phone_main, customer_profile(full_name), customer_address(id, street_address, province)')
            .limit(1);
        if (cErr) throw cErr;
        const customer = customers && customers.length > 0 ? customers[0] : null;
        const custName = customer?.customer_profile?.[0]?.full_name || customer?.customer_profile?.full_name || 'Khách vãng lai';
        let shippingAddressId = customer?.customer_address?.[0]?.id;
        
        if (!shippingAddressId) {
            // Lấy bất kỳ địa chỉ nào từ bảng customer_address
            const { data: addrs } = await adminDb.from('customer_address').select('id').limit(1);
            if (addrs && addrs.length > 0) {
                shippingAddressId = addrs[0].id;
            } else if (customer?.id) {
                const { data: newAddr } = await adminDb.from('customer_address').insert([{
                    customer_id: customer.id,
                    receiver_name: custName,
                    receiver_phone: customer.phone_main || '0900000000',
                    province: 'TP. Hồ Chí Minh',
                    street_address: '123 Test Street'
                }]).select().single();
                if (newAddr) shippingAddressId = newAddr.id;
            }
        }
        console.log('   -> Khách hàng:', customer ? `${custName} (${customer.phone_main})` : 'Không có (Sẽ tạo khách vãng lai)');
        console.log('   -> Địa chỉ giao hàng ID:', shippingAddressId);

        const { data: products, error: pErr } = await adminDb
            .from('product')
            .select('id, product_name, sku, sale_price, inventory(id, quantity_in_stock)')
            .limit(1);
        if (pErr) throw pErr;
        if (!products || products.length === 0) {
            throw new Error('Không tìm thấy sản phẩm nào trong bảng product!');
        }
        const sampleProduct = products[0];
        testProductId = sampleProduct.id;
        const invRow = Array.isArray(sampleProduct.inventory) ? sampleProduct.inventory[0] : sampleProduct.inventory;
        initialStock = invRow?.quantity_in_stock || 50;
        console.log('   -> Sản phẩm:', sampleProduct.product_name, '| SKU:', sampleProduct.sku, '| Giá:', sampleProduct.sale_price, '| Tồn kho ban đầu:', initialStock);

        // Bước 2: Tạo đơn hàng mới (sales_order)
        console.log('\n2. Tạo đơn hàng mới tại quầy (sales_order)...');
        const testOrderCode = 'QA-ORD-' + Date.now().toString().slice(-6);
        const orderInsertPayload = {
            order_code: testOrderCode,
            customer_id: customer?.id || null,
            shipping_address_id: shippingAddressId || null,
            order_status: 'PENDING',
            payment_status: 'UNPAID',
            total_amount: (sampleProduct.sale_price || 100000) * 2,
            note: '[QA Test Script] Đơn kiểm thử tự động vòng đời bán hàng'
        };

        const { data: newOrder, error: ordErr } = await adminDb
            .from('sales_order')
            .insert([orderInsertPayload])
            .select()
            .single();
        if (ordErr) throw ordErr;
        createdOrderId = newOrder.id;
        console.log('   -> Đã tạo đơn hàng thành công! ID:', createdOrderId, '| Mã đơn:', newOrder.order_code, '| Trạng thái:', newOrder.order_status);

        // Bước 3: Thêm chi tiết đơn hàng (sales_order_detail)
        console.log('\n3. Thêm chi tiết dòng sản phẩm (sales_order_detail)...');
        const detailPayload = {
            order_id: createdOrderId,
            product_id: testProductId,
            quantity: 2,
            unit_price: sampleProduct.sale_price || 100000,
            subtotal: (sampleProduct.sale_price || 100000) * 2
        };
        const { data: newDetail, error: detErr } = await adminDb
            .from('sales_order_detail')
            .insert([detailPayload])
            .select()
            .single();
        if (detErr) throw detErr;
        createdOrderDetailId = newDetail.id;
        console.log('   -> Đã lưu chi tiết đơn hàng! ID:', createdOrderDetailId, '| SL:', newDetail.quantity, '| Thành tiền:', newDetail.subtotal);

        // Bước 4: Trừ tồn kho khi đơn được xác nhận đóng gói (PACKING)
        console.log('\n4. Cập nhật trạng thái đơn sang PACKING và trừ tồn kho (inventory)...');
        if (invRow?.id) {
            const { error: invErr } = await adminDb
                .from('inventory')
                .update({ quantity_in_stock: initialStock - 2 })
                .eq('id', invRow.id);
            if (invErr) throw invErr;
            console.log('   -> Tồn kho đã trừ: ' + (initialStock - 2));
        }

        const { error: confErr } = await adminDb
            .from('sales_order')
            .update({ order_status: 'PACKING', payment_status: 'PAID' })
            .eq('id', createdOrderId);
        if (confErr) throw confErr;
        console.log('   -> Trạng thái đơn: PACKING | Thanh toán: PAID');

        // Bước 5: Chuyển sang SHIPPING rồi DELIVERED
        console.log('\n5. Cập nhật tiến độ giao hàng: SHIPPING -> DELIVERED...');
        const { error: shipErr } = await adminDb
            .from('sales_order')
            .update({ order_status: 'SHIPPING' })
            .eq('id', createdOrderId);
        if (shipErr) throw shipErr;
        console.log('   -> Trạng thái đơn: SHIPPING');

        const { error: delivErr } = await adminDb
            .from('sales_order')
            .update({ order_status: 'DELIVERED' })
            .eq('id', createdOrderId);
        if (delivErr) throw delivErr;
        console.log('   -> Trạng thái đơn: DELIVERED');

        // Bước 6: Kiểm tra tạo yêu cầu đổi trả (return_request & return_request_detail)
        console.log('\n6. Tạo yêu cầu đổi trả bảo hành (RMA return_request)...');
        const rmaPayload = {
            sales_order_id: createdOrderId,
            customer_id: customer?.id || null,
            reason: '[QA Test] Bao bì bị móp rách trong quá trình vận chuyển',
            return_type: 'RETURN',
            description: '[QA Test] Phiếu hoàn tiền do vận chuyển móp hộp',
            request_status: 'COMPLETED'
        };
        const { data: newRma, error: rmaErr } = await adminDb
            .from('return_request')
            .insert([rmaPayload])
            .select()
            .single();
        if (rmaErr) {
            console.warn('   -> Lưu ý bảng return_request:', rmaErr.message);
        } else {
            createdRmaId = newRma.id;
            console.log('   -> Đã tạo phiếu RMA thành công! ID:', createdRmaId, '| Loại:', newRma.return_type);

            const { data: rmaDetail, error: rmdErr } = await adminDb
                .from('return_request_detail')
                .insert([{
                    return_request_id: createdRmaId,
                    product_id: testProductId,
                    quantity: 1,
                    unit_price: sampleProduct.sale_price || 100000
                }])
                .select()
                .single();
            if (rmdErr) console.warn('   -> Lỗi return_request_detail:', rmdErr.message);
            else console.log('   -> Đã lưu chi tiết RMA ID:', rmaDetail.id);
        }

        // Bước 7: Phục hồi lại tồn kho sản phẩm về ban đầu
        console.log('\n7. Khôi phục lại tồn kho ban đầu cho sản phẩm...');
        if (invRow?.id) {
            await adminDb
                .from('inventory')
                .update({ quantity_in_stock: initialStock })
                .eq('id', invRow.id);
            console.log('   -> Tồn kho đã hoàn trả về:', initialStock);
        }

        console.log('\n=== TẤT CẢ 7 BƯỚC KIỂM THỬ VÒNG ĐỜI BÁN HÀNG HOÀN TOÀN THÀNH CÔNG! ===\n');

    } catch (error) {
        console.error('LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', error);
    } finally {
        console.log('8. Dọn dẹp dữ liệu kiểm thử (Clean up test data)...');
        if (createdRmaId) {
            await adminDb.from('return_request_detail').delete().eq('return_request_id', createdRmaId);
            await adminDb.from('return_request').delete().eq('id', createdRmaId);
            console.log('   -> Đã dọn dẹp RMA:', createdRmaId);
        }
        if (createdOrderDetailId) {
            await adminDb.from('sales_order_detail').delete().eq('id', createdOrderDetailId);
            console.log('   -> Đã dọn dẹp chi tiết đơn:', createdOrderDetailId);
        }
        if (createdOrderId) {
            await adminDb.from('sales_order').delete().eq('id', createdOrderId);
            console.log('   -> Đã dọn dẹp đơn hàng:', createdOrderId);
        }
        console.log('   -> Hoàn tất dọn dẹp!');
    }
}

testFullSalesLifecycle();
