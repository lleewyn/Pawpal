// blog-detail.js
document.addEventListener('DOMContentLoaded', async () => {
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    async function loadBlogData() {
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');

        if (!slug) {
            document.getElementById('blog-title').textContent = 'Bài viết không tồn tại';
            document.getElementById('blog-content').innerHTML = '<p>Không tìm thấy bài viết này. Hãy quay lại danh sách Cẩm nang.</p>';
            return;
        }

        if (!window.DataLoader || !window.DataLoader.loadBlogs) {
            setTimeout(loadBlogData, 100);
            return;
        }

        const blogs = await window.DataLoader.loadBlogs();
        const blog = blogs.find(b => b.slug === slug);

        if (!blog) {
            document.getElementById('blog-title').textContent = 'Bài viết không tồn tại';
            document.getElementById('blog-content').innerHTML = '<p>Không tìm thấy bài viết này. Hãy quay lại danh sách Cẩm nang.</p>';
            return;
        }

        document.title = `${blog.title} - PawPal Blog`;
        document.getElementById('blog-title').textContent = blog.title;
        
        const readingTime = Math.max(2, Math.ceil(blog.content.length / 1000)) + ' phút đọc';

        document.getElementById('blog-author-meta').innerHTML = `
            <img src="../../../assets/images/publics/cat7.jpg" alt="Author Avatar" class="author-avatar">
            <div class="author-info">
                <span class="author-name">Bởi <strong>PawPal Team</strong></span>
                <span class="post-date">${formatDate(blog.date)} &bull; ${readingTime}</span>
            </div>
        `;

        document.getElementById('blog-hero-cover').innerHTML = `
            <img src="${blog.thumbnail}" alt="${blog.title}" class="img-fluid rounded-4 shadow-sm w-100 post-meta-avatar">
        `;

        const contentEl = document.getElementById('blog-content');
        contentEl.innerHTML = blog.content;

        document.getElementById('blog-tags').innerHTML = `
            <strong>Tags:</strong>
            <a href="../blog/blog.html?category=${blog.categorySlug}" class="btn-filter-tag">#${blog.categoryName.replace(/\s+/g, '')}</a>
        `;

        document.getElementById('blog-breadcrumb').innerHTML = `
            <li class="breadcrumb-item"><a href="../landing/landing.html">Trang chủ</a></li>
            <li class="breadcrumb-item"><a href="../blog/blog.html">Cẩm nang</a></li>
            <li class="breadcrumb-item"><a href="../blog/blog.html?category=${blog.categorySlug}">${blog.categoryName}</a></li>
            <li class="breadcrumb-item active" aria-current="page">${blog.title}</li>
        `;

        // Update Supabase view_count implicitly
        if (window.SupabaseClient) {
            window.SupabaseClient.rpc('increment_blog_view', { blog_id: blog.id }).then(() => {}).catch(e => {
                // Ignore errors if rpc doesn't exist
            });
        }

        setupTOC(contentEl);
        setupShareBtns();
    }

    function setupShareBtns() {
        const shareBtns = document.querySelectorAll('.btn-share');
        shareBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const title = btn.getAttribute('title');
                if (title === 'Copy Link') {
                    navigator.clipboard.writeText(window.location.href).then(() => {
                        alert('Đã copy đường dẫn bài viết!');
                    }).catch(err => {
                        console.error('Không thể copy link: ', err);
                    });
                } else {
                    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href), 'facebook-share-dialog', 'width=800,height=600');
                }
            });
        });
    }

    function setupTOC(contentEl) {
        const headings = contentEl.querySelectorAll('h2, h3');
        const tocNav = document.getElementById('toc-nav');
        if (!tocNav) return;

        tocNav.innerHTML = '';
        headings.forEach((heading, index) => {
            if (!heading.id) {
                heading.id = 'section-' + index;
            }
            const a = document.createElement('a');
            a.className = 'nav-link text-muted small py-1';
            a.href = '#' + heading.id;
            a.textContent = heading.textContent;
            tocNav.appendChild(a);
        });

        const tocLinks = document.querySelectorAll('.toc-widget .nav-link');
        const sections = Array.from(tocLinks).map(link => {
            const id = link.getAttribute('href').substring(1);
            return document.getElementById(id);
        }).filter(el => el !== null);

        if (sections.length > 0) {
            window.addEventListener('scroll', () => {
                let currentSection = null;
                const scrollPosition = window.scrollY + 150; 

                sections.forEach(section => {
                    if (section.offsetTop <= scrollPosition) {
                        currentSection = section;
                    }
                });

                if (currentSection) {
                    const activeId = currentSection.getAttribute('id');
                    tocLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${activeId}`) {
                            link.classList.add('active');
                        }
                    });
                } else {
                    tocLinks.forEach(link => link.classList.remove('active'));
                }
            });
        }

        tocLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    loadBlogData();
});
