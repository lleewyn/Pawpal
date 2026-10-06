/**
 * blog-detail.js - Logic chi tiết bài viết Cẩm nang PawPal
 */

async function initBlogDetail() {
    function formatDateVN(dateStr) {
        if (!dateStr) return '24/07/2026';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function showCustomToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-custom toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: ${type === 'error' ? '#DC2626' : '#236B48'};
            color: #FFFFFF;
            padding: 12px 20px;
            border-radius: 9px;
            font-size: 13.5px;
            font-weight: 600;
            box-shadow: 0 8px 24px rgba(0,0,0,0.18);
            z-index: 999999;
            transition: all 0.3s ease;
            transform: translateY(20px);
            opacity: 0;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });

        setTimeout(() => {
            toast.style.transform = 'translateY(20px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    }

    // 1. Reading Progress Bar
    function setupReadingProgress() {
        const progressBar = document.getElementById('readingProgressBar');
        if (!progressBar) return;

        window.addEventListener('scroll', () => {
            const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
            progressBar.style.width = `${Math.min(100, Math.max(0, scrolled))}%`;
        });
    }

    // 2. Load Blog Data
    async function loadBlogData() {
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');

        let blogs = [];
        if (window.DataLoader && typeof window.DataLoader.loadBlogs === 'function') {
            try {
                blogs = await window.DataLoader.loadBlogs();
            } catch (err) {
                console.warn('Error loading blogs from DataLoader:', err);
            }
        }

        if (!blogs || blogs.length === 0) {
            // Fallback mock blogs if DataLoader fails
            blogs = [
                {
                    id: 1,
                    title: 'Có nên tắm cho chó vào mùa mưa? Bí quyết giữ Boss luôn thơm tho và sạch sẽ',
                    slug: 'co-nen-tam-cho-cho-vao-mua-mua',
                    categorySlug: 'tips',
                    categoryName: 'Chăm sóc và Tắm sấy',
                    date: '2026-07-24',
                    readingTime: '5 phút đọc',
                    viewCount: 2450,
                    author: 'BS. Lê Minh Hoàng (PawPal Care)',
                    thumbnail: '/assets/images/publics/dog1.png',
                    summary: 'Mùa mưa ẩm ướt là thời điểm vi khuẩn và nấm da trên thú cưng phát triển mạnh mẽ nhất.',
                    content: `
                        <p class="lead">Mùa mưa với độ ẩm không khí tăng cao kèm thời tiết ẩm ướt thất thường là môi trường lý tưởng để các loại vi khuẩn, nấm mốc và ký sinh trùng trên da lông chó phát triển mạnh mẽ.</p>
                        
                        <h2>1. Chó có thực sự cần tắm vào mùa mưa không?</h2>
                        <p>Nhiều phụ huynh nuôi thú cưng thường có tâm lý ngại tắm cho Boss vào những ngày mưa gió vì sợ bé bị cảm lạnh hoặc lông lâu khô gây mùi hôi khó chịu. Tuy nhiên, theo các chuyên gia da liễu thú y tại PawPal, việc giữ vệ sinh sạch sẽ cho bé trong mùa mưa lại càng quan trọng gấp bội.</p>
                        <p>Khi các bé ra ngoài đi dạo hoặc sinh hoạt, nước mưa chứa hàm lượng axit nhẹ kèm bùn đất bám vào kẽ chân, bụng và lớp lông tơ. Nếu không được làm sạch kịp thời, đây sẽ là nguyên nhân hàng đầu gây nên các bệnh viêm da tiếp xúc, nấm móng và viêm da mủ.</p>

                        <div class="expert-tip-box">
                            <div class="expert-tip-box-title">Lời khuyên từ Bác sĩ Thú y PawPal:</div>
                            Vào mùa mưa, bạn không nhất thiết phải tắm ướt toàn thân mỗi ngày, nhưng bắt buộc phải rửa sạch và sấy khô 4 bàn chân kèm phần lông bụng của bé ngay sau mỗi lần ra ngoài trời mưa về.
                        </div>

                        <h2>2. Bao lâu thì nên tắm cho chó một lần trong mùa ẩm?</h2>
                        <p>Tần suất tắm lý tưởng cho chó trong mùa mưa phụ thuộc vào môi trường sống và giống loài của bé:</p>
                        <ul>
                            <li><strong>Chó nuôi trong nhà điều hòa:</strong> Nên tắm định kỳ 7 - 10 ngày/lần bằng dầu tắm dưỡng ẩm dịu nhẹ.</li>
                            <li><strong>Chó vận động ngoài trời nhiều:</strong> Khoảng 5 - 7 ngày/lần. Nếu bé bị dính bùn đất bẩn, có thể tắm sớm hơn nhưng cần sấy khô tuyệt đối.</li>
                            <li><strong>Chó có làn da nhạy cảm hoặc đang điều trị nấm:</strong> Tuân thủ phác đồ dầu tắm trị liệu chuyên dụng 2 lần/tuần theo chỉ định của bác sĩ.</li>
                        </ul>

                        <h2>3. Những lưu ý "sống còn" khi tắm và sấy lông mùa mưa</h2>
                        <p>Để đảm bảo an toàn tối đa cho sức khỏe đường hô hấp của bé, phụ huynh cần đặc biệt ghi nhớ 4 nguyên tắc sau:</p>
                        <ol>
                            <li><strong>Dùng nước ấm vừa phải (36 - 38°C):</strong> Tuyệt đối không dùng nước lạnh vì có thể gây sốc nhiệt và hạ thân nhiệt đột ngột.</li>
                            <li><strong>Sấy khô 100% tận chân lông:</strong> Không để lông ẩm tự khô trong không khí mùa mưa. Sử dụng máy sấy chuyên dụng chế độ gió ấm vừa phải, kết hợp chải tơi lông từ lớp trong ra ngoài.</li>
                            <li><strong>Vệ sinh và nhỏ dung dịch lau tai:</strong> Nước đọng trong ống tai kết hợp độ ẩm cao rất dễ gây viêm tai giữa và tích tụ rận tai.</li>
                            <li><strong>Vắt tuyến hôi đúng kỹ thuật:</strong> Giúp loại bỏ triệt để mùi hôi khó chịu và ngăn ngừa áp-xe tuyến hậu môn.</li>
                        </ol>

                        <h2>4. Giải pháp thay thế tiện lợi: Bọt tắm khô và Dịch vụ Spa chuyên nghiệp</h2>
                        <p>Trong những ngày mưa dầm liên tục hoặc khi bé đang trong thời gian tiêm phòng, bọt tắm khô organic là giải pháp "cứu cánh" tuyệt vời giúp khử mùi, làm sạch bụi bẩn mà không cần xả lại với nước.</p>
                        <p>Ngoài ra, nếu gia đình không có đủ trang thiết bị sấy công suất lớn hoặc dụng cụ khử khuẩn chuyên dụng, bạn có thể đưa bé đến các cơ sở Spa của PawPal để được đội ngũ Groomer chuyên nghiệp chăm sóc trọn gói với phòng sấy ion ấm bảo vệ sức khỏe tối đa.</p>
                    `
                },
                {
                    id: 2,
                    title: 'Chế độ dinh dưỡng khoa học giúp mèo cưng giảm rụng lông và mượt mà',
                    slug: 'che-do-dinh-duong-giup-meo-giam-rung-long',
                    categorySlug: 'dinh-duong',
                    categoryName: 'Dinh dưỡng chuẩn y khoa',
                    date: '2026-07-20',
                    readingTime: '4 phút đọc',
                    viewCount: 1980,
                    author: 'ThS. Nguyễn Thị Mai',
                    thumbnail: '/assets/images/publics/cat2.png',
                    summary: 'Tìm hiểu các nhóm chất dinh dưỡng thiết yếu như Omega 3-6, Biotin và Kẽm giúp phục hồi nang lông cho mèo.',
                    content: '<p>Lông mèo rụng nhiều là nỗi lo thường trực của nhiều gia đình. Cùng PawPal khám phá bí quyết bổ sung dinh dưỡng chuẩn khoa học...</p>'
                }
            ];
        }

        // Find target blog
        let blog = null;
        const idParam = urlParams.get('id');

        if (slug) {
            const decSlug = decodeURIComponent(slug);
            blog = blogs.find(b => b.slug === slug || b.slug === decSlug);
        } else if (idParam) {
            blog = blogs.find(b => String(b.id) === String(idParam));
        }

        // Direct Supabase Live lookup if not found in cache
        if (!blog && (slug || idParam)) {
            try {
                const db = window.SupabaseClient || (window.getSupabaseClient ? window.getSupabaseClient() : null);
                if (db) {
                    let q = db.from('blog_post').select('*, blog_category(category_name)');
                    if (slug) q = q.eq('slug', decodeURIComponent(slug));
                    else if (idParam) q = q.eq('id', idParam);
                    const { data: dbItem, error: dbErr } = await q.maybeSingle();
                    if (dbItem && !dbErr) {
                        const rootPath = window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../';
                        blog = {
                            id: dbItem.id,
                            title: dbItem.title,
                            slug: dbItem.slug,
                            summary: dbItem.summary,
                            content: dbItem.content,
                            thumbnail: dbItem.thumbnail_url ? (dbItem.thumbnail_url.startsWith('http') ? dbItem.thumbnail_url : rootPath + dbItem.thumbnail_url.replace(/^[\/\\]+/, '')) : rootPath + 'assets/images/publics/dog1.png',
                            authorId: dbItem.author_id,
                            date: dbItem.publish_at || dbItem.created_at,
                            viewCount: dbItem.view_count || 0,
                            categoryName: dbItem.blog_category?.category_name || 'Cẩm nang chăm sóc',
                            categorySlug: dbItem.blog_category?.category_name ? dbItem.blog_category.category_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'tips'
                        };
                    }
                }
            } catch (e) {
                console.warn('Error fetching single blog from DB:', e);
            }
        }

        if (!blog && blogs.length > 0) {
            blog = blogs[0];
        }

        if (!blog) {
            document.getElementById('blog-title').textContent = 'Bài viết không tồn tại';
            document.getElementById('blog-content').innerHTML = '<p class="text-center py-5">Không tìm thấy bài viết này. Hãy quay lại danh sách Cẩm nang.</p>';
            return;
        }

        // Render Page Title & Breadcrumbs
        document.title = `${blog.title} - PawPal Blog`;
        
        const breadcrumbTitle = document.getElementById('breadcrumbCurrentTitle');
        if (breadcrumbTitle) {
            breadcrumbTitle.textContent = blog.title;
        }

        // Category Badge
        const catBadge = document.getElementById('blogCategoryBadge');
        if (catBadge) {
            catBadge.textContent = blog.categoryName || 'Cẩm nang';
        }

        // Title
        const titleEl = document.getElementById('blog-title');
        if (titleEl) {
            titleEl.textContent = blog.title;
        }

        // Meta Info
        const authorNameEl = document.getElementById('blogAuthorName');
        if (authorNameEl) {
            authorNameEl.textContent = blog.author || 'Đội ngũ Bác sĩ Thú y PawPal';
        }

        const metaStatsEl = document.getElementById('blogMetaStats');
        if (metaStatsEl) {
            const readingTime = blog.readingTime || (Math.max(2, Math.ceil((blog.content || '').length / 1000)) + ' phút đọc');
            const views = (blog.viewCount || 1280).toLocaleString('vi-VN');
            metaStatsEl.textContent = `${formatDateVN(blog.date)} • ${readingTime} • ${views} lượt xem`;
        }

        // Cover Image
        const coverContainer = document.getElementById('blog-hero-cover');
        if (coverContainer) {
            coverContainer.innerHTML = `
                <img src="${blog.thumbnail || '/assets/images/publics/dog1.png'}" alt="${blog.title}" class="blog-hero-cover-img" loading="eager">
            `;
        }

        // Content
        const contentEl = document.getElementById('blog-content');
        if (contentEl) {
            contentEl.innerHTML = blog.content || '<p>Nội dung bài viết đang được cập nhật...</p>';
        }

        // Tags List
        const tagsList = document.getElementById('tagsList');
        if (tagsList) {
            const tagNames = [
                blog.categoryName || 'Cẩm nang',
                'Chăm sóc Boss',
                'Bác sĩ thú y khuyên dùng',
                'Kinh nghiệm thực tế'
            ];
            tagsList.innerHTML = tagNames.map(tag => `
                <a href="/pages/public/blog/blog.html?search=${encodeURIComponent(tag)}" class="btn-tag-chip">#${tag.replace(/\s+/g, '')}</a>
            `).join('');
        }

        // Setup TOC
        setupTOC(contentEl);

        // Render Trending Sidebar Articles
        renderSidebarTrending(blogs, blog.id);

        // Render Related Articles
        renderRelatedArticles(blogs, blog);

        // Setup Share Buttons
        setupShareBtns(blog);
    }

    // 3. Table of Contents (TOC) with ScrollSpy
    function setupTOC(contentEl) {
        if (!contentEl) return;
        const headings = contentEl.querySelectorAll('h2, h3');
        const tocNav = document.getElementById('toc-nav');
        const tocCard = document.getElementById('tocSidebarCard');
        if (!tocNav) return;

        if (headings.length === 0) {
            if (tocCard) tocCard.style.display = 'none';
            return;
        }

        if (tocCard) tocCard.style.display = 'block';
        tocNav.innerHTML = '';

        headings.forEach((heading, index) => {
            if (!heading.id) {
                heading.id = 'toc-section-' + (index + 1);
            }
            const a = document.createElement('a');
            a.className = `toc-nav-link ${index === 0 ? 'active' : ''}`;
            a.href = '#' + heading.id;
            a.textContent = heading.textContent;
            
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(heading.id);
                if (target) {
                    const topPos = target.getBoundingClientRect().top + window.scrollY - 100;
                    window.scrollTo({ top: topPos, behavior: 'smooth' });
                }
            });

            tocNav.appendChild(a);
        });

        // ScrollSpy observer
        const tocLinks = tocNav.querySelectorAll('.toc-nav-link');
        window.addEventListener('scroll', () => {
            const scrollPos = window.scrollY + 140;
            let currentId = '';

            headings.forEach(h => {
                if (h.offsetTop <= scrollPos) {
                    currentId = h.id;
                }
            });

            if (currentId) {
                tocLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
                });
            }
        });
    }

    // 4. Trending / Most Read Articles in Sidebar
    function renderSidebarTrending(blogs, currentBlogId) {
        const trendingContainer = document.getElementById('sidebarTrendingList');
        if (!trendingContainer || !blogs.length) return;

        const otherBlogs = blogs.filter(b => b.id !== currentBlogId);
        const topTrending = [...otherBlogs].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 4);

        trendingContainer.innerHTML = topTrending.map((b, i) => {
            const num = (i + 1).toString().padStart(2, '0');
            const url = `/pages/public/blog-detail/blog-detail.html?slug=${encodeURIComponent(b.slug)}`;
            const views = (b.viewCount || 1000).toLocaleString('vi-VN');
            return `
                <a href="${url}" class="trending-item-row">
                    <span class="trending-num-badge">${num}</span>
                    <img src="${b.thumbnail || '/assets/images/publics/cat11.jpg'}" alt="${b.title}" class="trending-row-thumb" loading="lazy">
                    <div class="trending-row-info">
                        <h5 class="trending-row-title">${b.title}</h5>
                        <div class="trending-row-meta">${views} lượt đọc</div>
                    </div>
                </a>
            `;
        }).join('');
    }

    // 5. Related Articles Grid
    function renderRelatedArticles(blogs, currentBlog) {
        const relatedContainer = document.getElementById('related-posts-container');
        if (!relatedContainer || !blogs.length) return;

        let related = blogs.filter(b => b.id !== currentBlog.id && b.categorySlug === currentBlog.categorySlug);
        if (related.length < 3) {
            const remaining = blogs.filter(b => b.id !== currentBlog.id && b.categorySlug !== currentBlog.categorySlug);
            related = [...related, ...remaining];
        }
        related = related.slice(0, 3);

        relatedContainer.innerHTML = related.map(b => {
            const url = `/pages/public/blog-detail/blog-detail.html?slug=${encodeURIComponent(b.slug)}`;
            const readingTime = b.readingTime || '4 phút đọc';
            return `
                <div class="col-md-4">
                    <a href="${url}" class="related-article-card">
                        <div class="related-card-media">
                            <img src="${b.thumbnail || '/assets/images/publics/cat2.png'}" alt="${b.title}" loading="lazy">
                            <span class="related-cat-chip">${b.categoryName || 'Cẩm nang'}</span>
                        </div>
                        <div class="related-card-body">
                            <div class="related-card-meta">${formatDateVN(b.date)} • ${readingTime}</div>
                            <h4 class="related-card-title">${b.title}</h4>
                            <p class="related-card-excerpt">${b.summary || ''}</p>
                        </div>
                    </a>
                </div>
            `;
        }).join('');
    }

    // 6. Share Buttons
    function setupShareBtns(blog) {
        const copyBtn = document.getElementById('btnCopyLink');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    showCustomToast('Đã sao chép đường dẫn bài viết vào bộ nhớ tạm!');
                }).catch(() => {
                    showCustomToast('Không thể sao chép liên kết.', 'error');
                });
            });
        }

        const fbBtn = document.getElementById('btnShareFB');
        if (fbBtn) {
            fbBtn.addEventListener('click', () => {
                const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
                window.open(shareUrl, '_blank', 'width=640,height=480');
            });
        }
    }

    // 7. Sidebar Quick Search Form
    function setupSidebarSearch() {
        const searchForm = document.getElementById('sidebarSearchForm');
        const searchInput = document.getElementById('sidebarSearchInput');
        if (!searchForm || !searchInput) return;

        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = searchInput.value.trim();
            if (q) {
                window.location.href = `/pages/public/blog/blog.html?search=${encodeURIComponent(q)}`;
            }
        });
    }

    // 8. Comments Feed & Submission
    function setupComments() {
        const feedList = document.getElementById('commentsFeedList');
        const form = document.getElementById('commentSubmitForm');
        const countSpan = document.getElementById('commentsCount');
        if (!feedList) return;

        const initialComments = [
            {
                name: 'Minh Châu',
                initial: 'M',
                time: '24/07/2026 - 10:30',
                text: 'Bài viết rất thiết thực và đúng lúc! Bé Corgi nhà mình lông dày đợt này mưa gió hay bị hôi kẽ chân, mình sẽ áp dụng sấy ấm và xịt dưỡng ngay.',
                isAdmin: false
            },
            {
                name: 'BS. Lê Minh Hoàng',
                initial: 'P',
                time: '24/07/2026 - 11:15',
                text: 'Cảm ơn bạn Minh Châu đã quan tâm! Bạn nhớ chú ý lau khô và kiểm tra kẽ đệm chân bé sau mỗi lần đi dạo về để phòng ngừa viêm kẽ móng nhé ạ.',
                isAdmin: true
            },
            {
                name: 'Thanh Tùng',
                initial: 'T',
                time: '25/07/2026 - 08:20',
                text: 'Cho mình hỏi có nên dùng máy sấy tóc của người sấy cho chó không ạ?',
                isAdmin: false
            }
        ];

        let comments = [...initialComments];

        function renderCommentItems() {
            if (countSpan) countSpan.textContent = comments.length;
            feedList.innerHTML = comments.map(c => `
                <div class="comment-item-card ${c.isAdmin ? 'is-reply' : ''}">
                    <div class="comment-card-header">
                        <div class="comment-user-wrap">
                            <div class="comment-user-avatar" style="${c.isAdmin ? 'background:#236B48;color:#fff;' : ''}">${c.initial}</div>
                            <div>
                                <div class="d-flex align-items-center gap-2">
                                    <span class="comment-user-name">${c.name}</span>
                                    ${c.isAdmin ? '<span class="comment-admin-badge">PawPal Care</span>' : ''}
                                </div>
                                <span class="comment-time">${c.time}</span>
                            </div>
                        </div>
                    </div>
                    <p class="comment-text">${c.text}</p>
                </div>
            `).join('');
        }

        renderCommentItems();

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('commentAuthorInput');
                const contentInput = document.getElementById('commentContentInput');
                if (!nameInput || !contentInput) return;

                const authorName = nameInput.value.trim();
                const content = contentInput.value.trim();

                if (!authorName || !content) {
                    showCustomToast('Vui lòng điền đầy đủ tên và nội dung bình luận.', 'error');
                    return;
                }

                const now = new Date();
                const timeStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} - ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

                comments.unshift({
                    name: authorName,
                    initial: authorName.charAt(0).toUpperCase(),
                    time: timeStr,
                    text: content,
                    isAdmin: false
                });

                renderCommentItems();
                form.reset();
                showCustomToast('Bình luận của bạn đã được đăng thành công!');
            });
        }
    }

    // Initialize all sub-modules
    setupReadingProgress();
    setupSidebarSearch();
    setupComments();
    await loadBlogData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlogDetail);
} else {
    initBlogDetail();
}
