function filterResults(type, btnElement) {
    // Update active tab
    if (btnElement) {
        document.querySelectorAll('.lookup-tab-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    } else {
        document.querySelectorAll('.lookup-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.lookup-tab-btn').classList.add('active'); // Default first
    }

    // Filter items
    const items = document.querySelectorAll('.result-item');
    items.forEach(item => {
        if (type === 'all') {
            item.style.display = 'block';
        } else if (type === 'service' && item.classList.contains('item-service')) {
            item.style.display = 'block';
        } else if (type === 'order' && item.classList.contains('item-order')) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

let currentLookupPhone = '';

function handleLookup(event) {
    event.preventDefault();
    const phoneInput = document.getElementById('phone-number').value.trim();
    const errorBox = document.getElementById('error-box');
    const resultBox = document.getElementById('result-box');

    errorBox.style.display = 'none';
    resultBox.style.display = 'none';
    currentLookupPhone = '';

    // Chấp nhận mọi số điện thoại hợp lệ (>= 8 số)
    if (phoneInput.length >= 8) {
        // Thêm số điện thoại vào Mock DB để trang Login nhận diện được khách vãng lai (Tài khoản tạm)
        const usersDb = JSON.parse(localStorage.getItem('pawpal_users_db')) || [];
        if (!usersDb.find(u => u.phone === phoneInput)) {
            usersDb.push({
                name: "Khách Vãng Lai",
                phone: phoneInput,
                role: "customer",
                is_temporary: true,
                points: 0
            });
            localStorage.setItem('pawpal_users_db', JSON.stringify(usersDb));
        }

        // Sinh mã random ảo cho lịch hẹn và đơn hàng
        const randomBk = document.querySelector('.random-bk');
        if (randomBk) randomBk.textContent = 'Lịch hẹn: BK-' + (Math.floor(Math.random() * 9000) + 1000);
        
        const randomOrd = document.querySelector('.random-ord');
        if (randomOrd) randomOrd.textContent = 'Đơn hàng: ORD-' + (Math.floor(Math.random() * 9000) + 1000);

        currentLookupPhone = phoneInput;
        updateGuestLookupActions(phoneInput);

        resultBox.style.display = 'block';
        filterResults('all', null);
    } else {
        // Hiển thị thông báo lỗi
        errorBox.style.display = 'block';
    }
}

function updateGuestLookupActions(phone) {
    const actionButtons = document.querySelectorAll('.guest-lookup-action');
    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            window.location.href = `/pages/public/login.html?action=guest-activate&phone=${encodeURIComponent(phone)}`;
        });
    });
}
