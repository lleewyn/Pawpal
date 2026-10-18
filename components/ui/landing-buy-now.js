(function () {
    let modal, product, trigger;
    let hadScrollLock = false;
    const get = name => modal.querySelector(`[data-buy-now="${name}"]`);
    const notify = message => {
        if (window.showGlobalToast) window.showGlobalToast('warning', message);
        else window.alert(message);
    };
    function close() {
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        if (!hadScrollLock) document.body.classList.remove('buy-now-modal-open');
        trigger?.focus({ preventScroll: true });
    }
    function confirm() {
        const input = get('quantity');
        if (!input.reportValidity()) return;
        const quantity = Number(input.value);
        if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > Number(product.stock)) return;
        try {
            sessionStorage.setItem('pawpal_buynow_cart', JSON.stringify([{ ...product, quantity, qty: quantity }]));
            sessionStorage.setItem('pawpal_is_buynow', 'true');
        } catch {
            notify('Không thể lưu giỏ Mua ngay. Vui lòng thử lại.');
            return;
        }
        close();
        window.location.href = '/pages/shop/checkout/checkout.html?buynow=true';
    }
    function ensureModal() {
        if (modal?.isConnected) return;
        modal = document.createElement('div');
        modal.id = 'landingBuyNowQuantityModal';
        modal.className = 'buy-now-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <div class="buy-now-modal__backdrop" data-close-buy-now></div>
            <div class="buy-now-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="landingBuyNowTitle">
                <button type="button" class="buy-now-modal__close" aria-label="Đóng" data-close-buy-now>×</button>
                <p class="buy-now-modal__eyebrow">Mua ngay</p>
                <h3 id="landingBuyNowTitle" class="buy-now-modal__title">Chọn số lượng</h3>
                <div class="buy-now-modal__product">
                    <img class="buy-now-modal__image" data-buy-now="image" alt="">
                    <div class="buy-now-modal__product-info">
                        <strong data-buy-now="name"></strong>
                        <span data-buy-now="price"></span>
                        <small data-buy-now="stock"></small>
                    </div>
                </div>
                <div class="buy-now-modal__quantity">
                    <label class="buy-now-modal__label" for="landingBuyNowQty">Số lượng</label>
                    <div class="buy-now-modal__quantity-control">
                        <button type="button" class="buy-now-modal__qty-btn" data-step="-1" aria-label="Giảm số lượng">-</button>
                        <input id="landingBuyNowQty" data-buy-now="quantity" class="buy-now-modal__qty-input" type="number" min="1" step="1" required value="1">
                        <button type="button" class="buy-now-modal__qty-btn" data-step="1" aria-label="Tăng số lượng">+</button>
                    </div>
                </div>
                <button type="button" class="buy-now-modal__confirm" data-buy-now="confirm">Tiếp tục thanh toán</button>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelectorAll('[data-close-buy-now]').forEach(button => button.addEventListener('click', close));
        modal.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
            const input = get('quantity');
            const current = Number(input.value) || 1;
            input.value = String(Math.max(1, Math.min(Number(input.max), Math.floor(current) + Number(button.dataset.step))));
        }));
        get('confirm').addEventListener('click', confirm);
        modal.addEventListener('keydown', event => {
            if (event.key === 'Escape') { event.preventDefault(); close(); }
            if (event.key === 'Enter' && event.target === get('quantity')) { event.preventDefault(); confirm(); }
            if (event.key === 'Tab') {
                const controls = [...modal.querySelectorAll('button, input')];
                const first = controls[0], last = controls.at(-1);
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        });
    }
    window.openLandingBuyNowModal = (selectedProduct, source) => {
        if (!selectedProduct || !Number.isFinite(Number(selectedProduct.stock)) || Number(selectedProduct.stock) < 1) {
            notify('Sản phẩm hiện đã hết hàng.');
            return;
        }
        ensureModal();
        product = selectedProduct;
        trigger = source || document.activeElement;
        get('image').src = product.image || '/assets/images/shop/products/placeholder.webp';
        get('image').alt = product.name || 'Sản phẩm';
        get('name').textContent = product.name || 'Sản phẩm';
        get('price').textContent = `${Number(product.price).toLocaleString('vi-VN')}đ`;
        get('stock').textContent = `Còn ${product.stock} sản phẩm trong kho`;
        get('quantity').max = String(Math.floor(Number(product.stock)));
        get('quantity').value = '1';
        hadScrollLock = document.body.classList.contains('buy-now-modal-open');
        document.body.classList.add('buy-now-modal-open');
        modal.hidden = false;
        get('quantity').focus({ preventScroll: true });
    };
})();
