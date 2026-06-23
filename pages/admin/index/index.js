// Hàm cập nhật danh sách hiển thị khách hàng trong Admin Dashboard từ localStorage
        function renderAdminUsersList() {
            const tableBody = document.getElementById('adminUsersTableBody');
            if (!tableBody) return;

            const users = JSON.parse(localStorage.getItem('pawpal_users_db')) || [];
            tableBody.innerHTML = '';

            users.forEach(user => {
                if (user.role === 'admin') return; // Ẩn tài khoản admin ra khỏi danh sách

                const petInfo = user.pet ? `${user.pet.name} (${user.pet.species}, ${user.pet.weight}kg)` : 'Chưa cập nhật';
                const accountBadge = user.is_temporary 
                    ? `<span class="badge bg-warning text-dark">Tạm thời (Vãng lai)</span>`
                    : `<span class="badge bg-success">Thành viên chính thức</span>`;

                const row = `
                    <tr>
                        <td class="fw-bold">${user.name}</td>
                        <td>${user.phone}</td>
                        <td>${petInfo}</td>
                        <td>${accountBadge}</td>
                        <td class="fw-bold text-success">+${user.points}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-secondary" onclick="alert('Xem chi tiết lịch sử chăm sóc của khách: ${user.phone}')">Xem lịch sử</button>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', row);
            });
        }

        document.addEventListener('DOMContentLoaded', () => {
            renderAdminUsersList();
        });