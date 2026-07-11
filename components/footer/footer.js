(function(){
    const form = document.getElementById('footerSignupForm');
    const input = document.getElementById('footerSignupPhone');
    if (!form || !input) return;

    form.addEventListener('submit', function(e){
        e.preventDefault();
        const phone = (input.value || '').trim();
        if (!/^0[0-9]{9}$/.test(phone)) {
            alert('Vui lòng nhập số điện thoại hợp lệ (10 chữ số, bắt đầu bằng 0)');
            input.focus();
            return;
        }
        // Chuyển hướng tới trang đăng ký và điền sẵn SĐT
        const origin = window.location.origin || '';
        window.location.href = origin + '/pages/public/login/login.html?action=register&phone=' + encodeURIComponent(phone);
    });
})();
