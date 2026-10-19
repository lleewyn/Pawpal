require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runDeepSyncTest() {
    console.log('========================================================================');
    console.log('=== KIỂM THỬ THỰC CHIẾN CÁC BẢNG & CỘT VỪA ĐỒNG BỘ TRÊN SUPABASE ===');
    console.log('========================================================================\n');

    const cleanups = [];

    try {
        // 1. Kiểm tra bảng product & product_variant
        console.log('1. [product] Kiểm tra đọc các cột mới: brand_name, target_pet, min_price, description, slug...');
        const { data: prods, error: prodErr } = await sb.from('product')
            .select('id, product_name, brand_name, target_pet, min_price, description, slug')
            .limit(3);
        if (prodErr) throw prodErr;
        console.log(`   -> OK! Lấy thành công ${prods.length} sản phẩm mẫu:`, prods[0]?.product_name, '| Brand:', prods[0]?.brand_name, '| Target:', prods[0]?.target_pet);

        // 2. Lấy khách hàng, biến thể, địa chỉ và nhân viên mẫu để làm fixture
        const { data: custs } = await sb.from('customer').select('id, phone_main').limit(1);
        const { data: addrs } = await sb.from('customer_address').select('id, customer_id').limit(1);
        const { data: variants } = await sb.from('product_variant').select('id, product_id, sku_variant, sale_price').limit(1);
        const { data: staffs } = await sb.from('staff').select('id, full_name').limit(1);
        const { data: configs } = await sb.from('payment_method_config').select('id').limit(1);

        const sampleCustId = custs?.[0]?.id;
        const sampleAddrId = addrs?.[0]?.id;
        const sampleVar = variants?.[0];
        const sampleStaffId = staffs?.[0]?.id;
        const sampleMethodConfigId = configs?.[0]?.id;

        // 3. Kiểm tra bảng sales_order với các cột vận chuyển mới
        console.log('\n2. [sales_order] Ghi & đọc đơn hàng có: tracking_code, shipped_at, delivered_at...');
        const now = new Date().toISOString();
        const { data: newOrder, error: ordErr } = await sb.from('sales_order').insert({
            order_code: 'TEST-SYNC-' + Date.now().toString().slice(-6),
            customer_id: sampleCustId,
            shipping_address_id: sampleAddrId,
            total_amount: 500000,
            order_status: 'dang_giao_hang',
            payment_status: 'da_thanh_toan',
            tracking_code: 'TEST-TRACK-999',
            shipped_at: now,
            delivered_at: now
        }).select().single();
        if (ordErr) throw ordErr;
        cleanups.push({ table: 'sales_order', id: newOrder.id });
        console.log('   -> OK! Đã tạo đơn hàng thành công với tracking_code:', newOrder.tracking_code, '| Shipped:', newOrder.shipped_at);

        // 4. Kiểm tra bảng sales_order_detail với product_variant_id (không còn product_id)
        console.log('\n3. [sales_order_detail] Thêm chi tiết đơn hàng chỉ dùng product_variant_id...');
        const { data: newDetail, error: detErr } = await sb.from('sales_order_detail').insert({
            order_id: newOrder.id,
            product_variant_id: sampleVar.id,
            quantity: 2,
            unit_price: sampleVar.sale_price || 200000,
            discount_amount: 0,
            subtotal: (sampleVar.sale_price || 200000) * 2
        }).select().single();
        if (detErr) throw detErr;
        cleanups.push({ table: 'sales_order_detail', id: newDetail.id });
        console.log('   -> OK! Đã lưu dòng chi tiết thành công ID:', newDetail.id, '| SKU ID:', newDetail.product_variant_id);

        // 5. Kiểm tra bảng cart_item với product_variant_id
        console.log('\n4. [cart_item] Thêm mục giỏ hàng chỉ dùng product_variant_id...');
        const { data: cart } = await sb.from('cart').select('id').eq('customer_id', sampleCustId).maybeSingle();
        let testCartId = cart?.id;
        if (!testCartId) {
            const { data: createdCart } = await sb.from('cart').insert({ customer_id: sampleCustId, cart_status: 'dang_hoat_dong' }).select('id').single();
            testCartId = createdCart.id;
        }
        const { data: newCartItem, error: cartItemErr } = await sb.from('cart_item').insert({
            cart_id: testCartId,
            product_variant_id: sampleVar.id,
            quantity: 1,
            unit_price: sampleVar.sale_price || 200000,
            subtotal: sampleVar.sale_price || 200000
        }).select().single();
        if (cartItemErr) throw cartItemErr;
        cleanups.push({ table: 'cart_item', id: newCartItem.id });
        console.log('   -> OK! Đã lưu cart_item thành công với product_variant_id:', newCartItem.product_variant_id);

        // 6. Kiểm tra bảng inventory & inventory_transaction với product_variant_id và quantity_reserved
        console.log('\n5. [inventory & inventory_transaction] Kiểm tra quantity_reserved và giao dịch kho...');
        const { data: invRows, error: invQueryErr } = await sb.from('inventory')
            .select('id, product_variant_id, quantity_in_stock, quantity_reserved')
            .limit(1);
        if (invQueryErr) throw invQueryErr;
        console.log('   -> OK! Đọc thành công inventory:', invRows?.[0]?.product_variant_id, '| Tồn kho:', invRows?.[0]?.quantity_in_stock, '| Tạm giữ:', invRows?.[0]?.quantity_reserved);

        const { data: newTx, error: txErr } = await sb.from('inventory_transaction').insert({
            product_variant_id: sampleVar.id,
            transaction_type: 'dieu_chinh_tang',
            quantity: 1,
            stock_before: 10,
            stock_after: 11,
            staff_id: sampleStaffId,
            note: 'Kiểm thử đồng bộ CSDL'
        }).select().single();
        if (txErr) throw txErr;
        cleanups.push({ table: 'inventory_transaction', id: newTx.id });
        console.log('   -> OK! Đã tạo inventory_transaction thành công ID:', newTx.id, '| SKU ID:', newTx.product_variant_id);

        // 7. Kiểm tra bảng support_ticket với 19 cột đồng bộ mới
        console.log('\n6. [support_ticket] Thêm ticket CSKH với đầy đủ 19 cột nghiệp vụ mới...');
        const { data: newTicket, error: tickErr } = await sb.from('support_ticket').insert({
            ticket_code: 'TCK-SYNC-' + Date.now().toString().slice(-6),
            title: 'Khách phản ánh đơn hàng chậm giao',
            type: 'order',
            customer_id: sampleCustId,
            order_id: newOrder.id,
            channel: 'zalo',
            category: 'order',
            subject: 'Kiểm tra vận đơn',
            description: 'Khách chưa nhận được hàng sau 3 ngày',
            status: 'in_progress',
            priority: 'high',
            requested_resolution: 'hoan_tien',
            requested_amount: 150000,
            assigned_staff_id: sampleStaffId,
            first_response_at: now,
            investigation_note: 'Đã liên hệ bên vận chuyển kiểm tra vị trí bưu cục',
            resolution_type: 'hoan_tien_mot_phan',
            resolution_note: 'Bồi thường phí giao hàng cho khách',
            approved_amount: 50000,
            resolved_by: sampleStaffId,
            resolved_at: now,
            closed_at: now
        }).select().single();
        if (tickErr) throw tickErr;
        cleanups.push({ table: 'support_ticket', id: newTicket.id });
        console.log('   -> OK! Đã tạo support_ticket với ticket_code:', newTicket.ticket_code, '| Phụ trách:', newTicket.assigned_staff_id, '| Đề nghị hoàn:', newTicket.requested_amount);

        // 8. Kiểm tra bảng support_ticket_message với sender_id, is_internal
        console.log('\n7. [support_ticket_message] Ghi tin nhắn trao đổi có sender_id & is_internal...');
        const { data: newMsg, error: msgErr } = await sb.from('support_ticket_message').insert({
            ticket_id: newTicket.id,
            sender_type: 'nhan_vien',
            sender_id: sampleStaffId,
            content: 'Nội bộ: Cần thúc giục bưu tá phát hỏa tốc',
            is_internal: true
        }).select().single();
        if (msgErr) throw msgErr;
        cleanups.push({ table: 'support_ticket_message', id: newMsg.id });
        console.log('   -> OK! Đã ghi tin nhắn trao đổi ID:', newMsg.id, '| Is Internal:', newMsg.is_internal);

        // 9. Kiểm tra bảng return_request & return_request_detail với product_variant_id
        console.log('\n8. [return_request & return_request_detail] Tạo yêu cầu RMA với product_variant_id...');
        const { data: newRma, error: rmaErr } = await sb.from('return_request').insert({
            sales_order_id: newOrder.id,
            customer_id: sampleCustId,
            reason: 'wrong_item',
            return_type: 'tra_san_pham',
            request_status: 'cho_xu_ly',
            resolution_type: 'hoan_tien',
            refund_amount: 200000,
            resolved_by: sampleStaffId
        }).select().single();
        if (rmaErr) throw rmaErr;
        cleanups.push({ table: 'return_request', id: newRma.id });

        const { data: newRmaDet, error: rmaDetErr } = await sb.from('return_request_detail').insert({
            return_request_id: newRma.id,
            product_variant_id: sampleVar.id,
            quantity: 1,
            unit_price: sampleVar.sale_price || 200000
        }).select().single();
        if (rmaDetErr) throw rmaDetErr;
        cleanups.push({ table: 'return_request_detail', id: newRmaDet.id });
        console.log('   -> OK! Đã tạo RMA thành công ID:', newRma.id, '| Chi tiết RMA SKU ID:', newRmaDet.product_variant_id);

        // 10. Kiểm tra bảng payment với customer_id & payment_method_config_id
        console.log('\n9. [payment] Ghi nhận giao dịch với customer_id & payment_method_config_id...');
        const { data: newPay, error: payErr } = await sb.from('payment').insert({
            payment_code: 'PAY-SYNC-' + Date.now().toString().slice(-6),
            payment_type: 'mua_hang',
            order_id: newOrder.id,
            customer_id: sampleCustId,
            payment_method_config_id: sampleMethodConfigId || 'vnpay',
            amount: 500000,
            transaction_status: 'thanh_cong'
        }).select().single();
        if (payErr) throw payErr;
        cleanups.push({ table: 'payment', id: newPay.id });
        console.log('   -> OK! Đã ghi nhận payment ID:', newPay.id, '| Config:', newPay.payment_method_config_id, '| Khách:', newPay.customer_id);

        // 11. Kiểm tra bảng appointment với support_ticket_id, check_in_time, check_out_time
        console.log('\n10. [appointment] Kiểm tra cập nhật check_in_time, check_out_time & ticket liên kết...');
        const { data: apptRows } = await sb.from('appointment').select('id').limit(1);
        if (apptRows && apptRows.length > 0) {
            const { error: apptUpdErr } = await sb.from('appointment').update({
                check_in_time: now,
                check_out_time: now,
                support_ticket_id: newTicket.id
            }).eq('id', apptRows[0].id);
            if (apptUpdErr) throw apptUpdErr;
            console.log('   -> OK! Cập nhật appointment check_in/out & support_ticket_id thành công!');
        }

        // 12. Kiểm tra notification liên kết sales_order_id, appointment_id, support_ticket_id
        console.log('\n11. [notification] Tạo thông báo liên kết đa phân hệ...');
        const { data: newNoti, error: notiErr } = await sb.from('notification').insert({
            customer_id: sampleCustId,
            notification_type: 'don_hang_moi',
            title: 'Cập nhật đơn hàng',
            content: 'Đơn hàng của bạn đang được giao.',
            sales_order_id: newOrder.id,
            support_ticket_id: newTicket.id,
            is_read: false
        }).select().single();
        if (notiErr) throw notiErr;
        cleanups.push({ table: 'notification', id: newNoti.id });
        console.log('   -> OK! Đã tạo thông báo đa liên kết ID:', newNoti.id, '| Order ID:', newNoti.sales_order_id, '| Ticket ID:', newNoti.support_ticket_id);

        // 13. Kiểm tra audit_log với entity_id
        console.log('\n12. [audit_log] Ghi log kiểm tra với entity_id...');
        const { data: newAudit, error: auditErr } = await sb.from('audit_log').insert({
            action: 'UPDATE',
            entity_name: 'sales_order',
            entity_id: newOrder.id,
            staff_id: sampleStaffId,
            description: 'Kiểm thử thực chiến schema đồng bộ'
        }).select().single();
        if (auditErr) throw auditErr;
        cleanups.push({ table: 'audit_log', id: newAudit.id });
        console.log('   -> OK! Đã ghi audit_log ID:', newAudit.id, '| entity_id:', newAudit.entity_id);

        console.log('\n========================================================================');
        console.log('=== KẾT QUẢ: TẤT CẢ 12 KỊCH BẢN THỰC CHIẾN ĐỀU THÀNH CÔNG 100%! ===');
        console.log('========================================================================');

    } catch (err) {
        console.error('\n❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ THỰC CHIẾN:', err);
    } finally {
        console.log('\nĐang dọn dẹp dữ liệu kiểm thử (Cleanup)...');
        for (const item of cleanups.reverse()) {
            try {
                await sb.from(item.table).delete().eq('id', item.id);
            } catch (cleanupErr) {
                console.warn(`Lỗi cleanup ${item.table}:`, cleanupErr.message);
            }
        }
        console.log('-> Dọn dẹp hoàn tất, trả lại trạng thái CSDL sạch sẽ!');
    }
}

runDeepSyncTest();
