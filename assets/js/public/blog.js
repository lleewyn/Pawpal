document.addEventListener('DOMContentLoaded', () => {
    // Xử lý bộ lọc chính (Main filters - Kiến thức chăm sóc, Khuyến mãi, Tin tức)
    const mainFilters = document.querySelectorAll('.main-filters .btn-filter-pill');
    mainFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            // Xóa class active của tất cả các nút cùng nhóm
            mainFilters.forEach(f => f.classList.remove('active'));
            // Thêm class active cho nút vừa click
            btn.classList.add('active');
            
            // TODO: Call API or filter posts logic here
        });
    });

    // Xử lý bộ lọc phụ (Sub filters - Chó, Mèo, Dinh dưỡng...)
    const subFilters = document.querySelectorAll('.sub-filters .btn-filter-tag');
    subFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            // Xóa class active của tất cả các thẻ tag cùng nhóm
            subFilters.forEach(f => f.classList.remove('active'));
            // Thêm class active cho thẻ tag vừa click
            btn.classList.add('active');
            
            // TODO: Call API or filter posts logic here
        });
    });

    // --- Parse URL parameters ---
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        const filterMap = {
            'dog': 'Chó',
            'cat': 'Mèo',
            'tips': 'Kiến thức chăm sóc',
            'events': 'Khuyến mãi'
        };
        const targetFilterText = filterMap[categoryParam];
        if (targetFilterText) {
            [...mainFilters, ...subFilters].forEach(btn => {
                if (btn.textContent.trim() === targetFilterText) {
                    btn.click();
                }
            });
        }
    }
});
