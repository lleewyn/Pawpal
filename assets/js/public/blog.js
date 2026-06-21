document.addEventListener('DOMContentLoaded', () => {
    // Xử lý bộ lọc chính (Main filters - Kiến thức chăm sóc, Khuyến mãi, Tin tức)
    const mainFilters = document.querySelectorAll('.main-filters .btn-filter-pill');
    mainFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            mainFilters.forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            
            const text = btn.textContent.trim();
            if (text === 'Kiến thức chăm sóc') {
                document.querySelector('.blog-latest-section')?.scrollIntoView({ behavior: 'smooth' });
            } else if (text === 'Khuyến mãi') {
                document.querySelector('.blog-news-promo-section')?.scrollIntoView({ behavior: 'smooth' });
            } else if (text === 'Tin tức') {
                document.querySelector('.blog-news-promo-section')?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Xử lý bộ lọc phụ (Sub filters - Chó, Mèo, Dinh dưỡng...)
    const subFilters = document.querySelectorAll('.sub-filters .btn-filter-tag');
    subFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            subFilters.forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            
            const filterKeyword = btn.textContent.trim().toLowerCase();
            const allArticles = document.querySelectorAll('.blog-latest-section article');
            
            allArticles.forEach(article => {
                const titleElement = article.querySelector('.card-title');
                if (!titleElement) return;
                
                const title = titleElement.textContent.toLowerCase();
                if (filterKeyword === 'tất cả') {
                    article.style.display = '';
                } else {
                    // Filter based on keyword match
                    if (title.includes(filterKeyword) || 
                       (filterKeyword === 'chó' && title.includes('chó')) || 
                       (filterKeyword === 'mèo' && (title.includes('mèo') || title.includes('pate'))) ||
                       (filterKeyword === 'sức khỏe' && (title.includes('thuốc') || title.includes('tắm'))) ||
                       (filterKeyword === 'dinh dưỡng' && (title.includes('thức ăn') || title.includes('pate')))
                    ) {
                        article.style.display = '';
                    } else {
                        article.style.display = 'none';
                    }
                }
            });
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
