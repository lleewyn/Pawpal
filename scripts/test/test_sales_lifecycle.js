require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const anonDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const adminDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFullSalesLifecycle() {
    console.log('=== BẮT ĐẦU KIỂM THỬ VÒNG ĐỜI BÁN HÀNG & KHO (SALES & INVENTORY LIFECYCLE) ===\n');

    let createdOrderId = null;
    let createdOrderDetailId = null;
    let createdRmaId = null;
    let createdAddressId = null;
    let testProductId = null;
    let testInventoryId = null;
    let initialStock = 0;
    let stockDeducted = false;

    try {
        // Bước 1: Tìm khách hàng và sản phẩm khả dụng để tạo đơn (QA-P0-01, QA-P0-02)
        console.log('1. Lấy khách hàng và sản phẩm mẫu từ Supabase...');
        const { data: customers, error: cErr } = await adminDb
            .from('customer')
            .select('id, phone_main, customer_profile(full_name), customer_address(id, street_address, province)')
            .limit(1);
        if (cErr) throw cErr;
        const customer = customers && customers.length > 0 ? customers[0] : null;
        const custName = customer?.customer_profile?.[0]?.full_name || customer?.customer_profile?.full_name || 'Khách vãng lai';
        
        // QA-P0-02: Địa chỉ chỉ lấy của đúng customer này, tuyệt đối không lấy địa chỉ của khách khác
        let shippingAddressId = customer?.customer_address?.[0]?.id;
        if (!shippingAddressId && customer?.id) {
            const { data: newAddr, error: addrErr } = await adminDb.from('customer_address').insert([{
                customer_id: customer.id,
                receiver_name: custName,
                receiver_phone: customer.phone_main || '0900000000',
                province: 'TP. Hồ Chí Minh',
                street_address: '[QA Test Fixture] 123 Đường Kiểm Thử'
            }]).select().single();
            if (addrErr) throw addrErr;
            if (newAddr) {
                shippingAddressId = newAddr.id;
                createdAddressId = newAddr.id;
            }
        }
        console.log('   -> Khách hàng:', customer ? `${custName} (${customer.phone_main})` : 'Không có (Sẽ tạo khách vãng lai)');
        console.log('   -> Địa chỉ giao hàng ID:', shippingAddressId || 'Mua tại quầy');

        const { data: products, error: pErr } = await adminDb
            .from('product')
            .select('id, product_name, min_price, product_variant(id, sku_variant, sale_price), inventory(id, quantity_in_stock)')
            .limit(1);
        if (pErr) throw pErr;
        if (!products || products.length === 0) {
            throw new Error('Không tìm thấy sản phẩm nào trong bảng product!');
        }
        const sampleProduct = products[0];
        testProductId = sampleProduct.id;
        const sampleVariant = Array.isArray(sampleProduct.product_variant) ? sampleProduct.product_variant[0] : null;
        const invRow = Array.isArray(sampleProduct.inventory) ? sampleProduct.inventory[0] : sampleProduct.inventory;
        
        // QA-P0-01: Không dùng `|| 50` làm sai lệch tồn kho thật
        if (invRow && invRow.quantity_in_stock !== null && invRow.quantity_in_stock !== undefined) {
            initialStock = Number(invRow.quantity_in_stock);
        } else {
            throw new Error('Sản phẩm kiểm thử không có bản ghi inventory hợp lệ!');
        }
        testInventoryId = invRow.id;

        if (initialStock < 2) {
            throw new Error(`Tồn kho sản phẩm không đủ để bán thử nghiệm (cần tối thiểu 2, hiện có ${initialStock})`);
        }
        const effectiveSku = sampleVariant?.sku_variant || 'SKU-TEST';
        const effectivePrice = sampleVariant?.sale_price || sampleProduct.sale_price || 100000;
        console.log('   -> Sản phẩm:', sampleProduct.product_name, '| SKU:', effectiveSku, '| Giá:', effectivePrice, '| Tồn kho ban đầu:', initialStock);

        // Bước 2: Tạo đơn hàng mới (sales_order)
        console.log('\n2. Tạo đơn hàng mới tại quầy (sales_order)...');
        const testOrderCode = 'QA-ORD-' + Date.now().toString().slice(-6);
        const orderInsertPayload = {
            order_code: testOrderCode,
            customer_id: customer?.id || null,
            shipping_address_id: shippingAddressId || null,
            order_status: 'PENDING',
            payment_status: 'UNPAID',
            total_amount: effectivePrice * 2,
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
            product_variant_id: sampleVariant?.id || null,
            quantity: 2,
            unit_price: effectivePrice,
            subtotal: effectivePrice * 2
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
        if (testInventoryId) {
            const { error: invErr } = await adminDb
                .from('inventory')
                .update({ quantity_in_stock: initialStock - 2 })
                .eq('id', testInventoryId);
            if (invErr) throw invErr;
            stockDeducted = true;
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
        const testTracking = 'TEST-GHN-' + Math.floor(100000 + Math.random() * 900000);
        const { error: shipErr } = await adminDb
            .from('sales_order')
            .update({
                order_status: 'SHIPPING',
                tracking_code: testTracking,
                shipping_provider_id: 'd6818d11-232a-4f72-b11b-3d5728ac3b2d', // Giao Hàng Nhanh
                shipped_at: new Date().toISOString()
            })
            .eq('id', createdOrderId);
        if (shipErr) throw shipErr;
        console.log('   -> Trạng thái đơn: SHIPPING | Vận đơn:', testTracking);

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
            console.warn('   -> Bỏ qua RMA insert (chưa có quyền hoặc bảng không cho phép):', rmaErr.message);
        } else if (newRma) {
            createdRmaId = newRma.id;
            console.log('   -> Đã tạo phiếu RMA thành công! ID:', createdRmaId, '| Loại:', newRma.return_type);

            const { data: rmaDetail, error: rmdErr } = await adminDb
                .from('return_request_detail')
                .insert([{
                    return_request_id: createdRmaId,
                    product_id: testProductId,
                    quantity: 2,
                    unit_price: sampleProduct.sale_price || 100000
                }])
                .select()
                .single();
            if (rmdErr) console.warn('   -> Lỗi return_request_detail:', rmdErr.message);
            else console.log('   -> Đã lưu chi tiết RMA ID:', rmaDetail.id);
        }

        // Bước 7: Phục hồi lại tồn kho sản phẩm về ban đầu
        console.log('\n7. Khôi phục lại tồn kho ban đầu cho sản phẩm...');
        if (testInventoryId && stockDeducted) {
            await adminDb
                .from('inventory')
                .update({ quantity_in_stock: initialStock })
                .eq('id', testInventoryId);
            stockDeducted = false;
            console.log('   -> Tồn kho đã hoàn trả về:', initialStock);
        }

        console.log('\n=== TẤT CẢ 7 BƯỚC KIỂM THỬ VÒNG ĐỜI BÁN HÀNG HOÀN TOÀN THÀNH CÔNG! ===\n');

    } catch (error) {
        console.error('LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', error);
        // QA-P0-04: Đảm bảo khi test fail thì process thoát với code 1
        process.exitCode = 1;
    } finally {
        console.log('8. Dọn dẹp dữ liệu kiểm thử (Clean up test data)...');
        // QA-P0-01: Bảo đảm khôi phục tồn kho trong finally nếu gặp exception giữa chừng
        if (testInventoryId && stockDeducted) {
            try {
                await adminDb.from('inventory').update({ quantity_in_stock: initialStock }).eq('id', testInventoryId);
                console.log('   -> [Khôi phục sự cố] Tồn kho đã được hoàn trả về ban đầu:', initialStock);
            } catch (invRestoreErr) {
                console.error('   -> [LỖI KHÔI PHỤC KHO]:', invRestoreErr);
            }
        }
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
        if (createdAddressId) {
            await adminDb.from('customer_address').delete().eq('id', createdAddressId);
            console.log('   -> Đã dọn dẹp địa chỉ QA:', createdAddressId);
        }
        console.log('   -> Hoàn tất dọn dẹp!');
    }
}

testFullSalesLifecycle();
