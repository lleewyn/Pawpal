/**
 * PawPal Journal — trang đọc bài viết.
 * Không dựng phản hồi/bình luận giả, không tự gán học vị hoặc chứng chỉ.
 */
(function () {
    'use strict';

    const BLOG_PATH = '/blog';

    function byId(id) {
        return document.getElementById(id);
    }

    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[character]));
    }

    function safeUrl(raw) {
        const str = String(raw || '').trim();
        if (!str) return '';
        try {
            const parsed = new URL(str, window.location.origin);
            if (!['https:', 'http:'].includes(parsed.protocol)) return '';
            return parsed.href;
        } catch {
            return '';
        }
    }

    function dateVN(dateValue) {
        if (!dateValue) return '';
        const date = new Date(dateValue);
        if (!Number.isFinite(date.valueOf())) return '';
        return new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric'
        }).format(date);
    }

    function articleUrl(blog) {
        return '/pages/public/blog-detail/blog-detail.html?slug=' + encodeURIComponent(blog.slug || '');
    }

    function createElement(tag, className, textValue) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textValue != null) el.textContent = String(textValue);
        return el;
    }

    /** Sanitize rich article HTML while retaining editorial markup and images. */
    function sanitizeArticleContent(rawHtml) {
        const parsed = new DOMParser().parseFromString(String(rawHtml ?? ''), 'text/html');
        const allowed = new Set([
            'P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'EM', 'STRONG', 'B', 'I',
            'BLOCKQUOTE', 'BR', 'HR', 'A', 'IMG', 'FIGURE', 'FIGCAPTION',
            'DIV', 'SPAN', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'SUP', 'SUB'
        ]);
        const dropEntirely = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'SVG', 'MATH']);

        function cleanse(node) {
            for (const child of Array.from(node.childNodes)) {
                if (child.nodeType === Node.COMMENT_NODE) {
                    child.remove();
                    continue;
                }
                if (child.nodeType !== Node.ELEMENT_NODE) continue;
                const tag = child.tagName.toUpperCase();
                if (dropEntirely.has(tag)) {
                    child.remove();
                    continue;
                }
                if (!allowed.has(tag)) {
                    child.replaceWith(...Array.from(child.childNodes));
                    cleanse(node);
                    continue;
                }
                const originalHref = child.getAttribute('href');
                const originalSrc = child.getAttribute('src');
                const originalAlt = child.getAttribute('alt');
                const originalClass = child.getAttribute('class');
                for (const attribute of Array.from(child.attributes)) child.removeAttribute(attribute.name);
                if (tag === 'A') {
                    const href = safeUrl(originalHref);
                    if (href) {
                        child.setAttribute('href', href);
                        if (new URL(href).origin !== window.location.origin) {
                            child.setAttribute('target', '_blank');
                            child.setAttribute('rel', 'noopener noreferrer');
                        }
                    }
                }
                if (tag === 'IMG') {
                    const src = safeUrl(originalSrc);
                    if (!src) {
                        child.remove();
                        continue;
                    }
                    child.setAttribute('src', src);
                    child.setAttribute('alt', originalAlt || 'Hình minh họa bài viết');
                    child.setAttribute('loading', 'lazy');
                    child.setAttribute('decoding', 'async');
                }
                if (tag === 'P' && originalClass?.split(/\s+/).includes('lead')) child.classList.add('lead');
                if (tag === 'DIV' && originalClass?.split(/\s+/).includes('expert-tip-box')) child.classList.add('expert-tip-box');
                cleanse(child);
            }
        }

        cleanse(parsed.body);
        return parsed.body.innerHTML;
    }

    async function getArticle(slug, id) {
        let blogs = [];
        if (window.DataLoader && typeof window.DataLoader.loadBlogs === 'function') {
            try {
                blogs = await window.DataLoader.loadBlogs();
            } catch (error) {
                console.warn('Không thể tải danh sách bài viết, sẽ thử tra cứu bài hiện tại:', error);
            }
        }
        blogs = Array.isArray(blogs) ? blogs : [];
        const found = slug ? blogs.find((item) => item.slug === slug) : blogs.find((item) => String(item.id) === id);
        if (found) return { blog: found, others: blogs };

        // Truy vấn đúng bài viết đã yêu cầu khi danh sách được cache chưa chứa bài.
        const client = (typeof window.getSupabaseClient === 'function' && window.getSupabaseClient()) || window.SupabaseClient;
        if (client && (slug || id)) {
            let request = client.from('blog_post').select('*, blog_category(category_name)')
                .in('status', ['published', 'PUBLISHED', 'dang_hien_thi']);
            request = slug ? request.eq('slug', slug) : request.eq('id', id);
            const { data, error } = await request.maybeSingle();
            if (error) throw error;
            if (data) {
                const root = window.pawpalGetRootPath ? window.pawpalGetRootPath() : '/';
                const image = data.thumbnail_url || '';
                return {
                    blog: {
                        id: data.id,
                        title: data.title,
                        slug: data.slug,
                        summary: data.summary,
                        content: data.content,
                        thumbnail: image && !image.startsWith('http') ? root + image.replace(/^\/+/, '') : image,
                        author: data.author || 'PawPal',
                        date: data.publish_at || data.created_at,
                        viewCount: data.view_count,
                        categoryName: data.blog_category?.category_name || 'Cẩm nang',
                        categorySlug: data.blog_category?.category_slug || ''
                    },
                    others: blogs
                };
            }
        }
        return { blog: null, others: blogs };
    }

    function showToast(message, error = false) {
        const container = byId('toastContainer') || document.body;
        const toast = createElement('div', `journal-toast ${error ? 'is-error' : ''}`, message);
        toast.setAttribute('role', error ? 'alert' : 'status');
        container.append(toast);
        window.setTimeout(() => toast.remove(), 3300);
    }

    function setupShare() {
        byId('btnCopyLink')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                showToast('Đã sao chép liên kết bài viết.');
            } catch {
                showToast('Không thể sao chép liên kết trên trình duyệt này.', true);
            }
        });
        byId('btnShareFB')?.addEventListener('click', () => {
            const link = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
            window.open(link, '_blank', 'noopener,noreferrer,width=700,height=580');
        });
        byId('sidebarSearchForm')?.addEventListener('submit', (event) => {
            event.preventDefault();
            const value = byId('sidebarSearchInput')?.value.trim();
            if (value) window.location.assign(`${BLOG_PATH}?search=${encodeURIComponent(value)}`);
        });
    }

    function setupReadProgress() {
        const bar = byId('readingProgressBar');
        if (!bar) return;
        let pending = false;
        function updateProgress() {
            pending = false;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            bar.value = maxScroll > 0 ? Math.min(100, Math.max(0, window.scrollY / maxScroll * 100)) : 0;
        }
        window.addEventListener('scroll', () => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(updateProgress);
        }, { passive: true });
        window.addEventListener('resize', updateProgress);
        updateProgress();
    }

    function setupTOC(articleElement) {
        const nav = byId('toc-nav');
        const card = byId('tocSidebarCard');
        if (!nav || !articleElement) return;
        nav.replaceChildren();
        const headings = Array.from(articleElement.querySelectorAll('h2, h3'));
        card.hidden = headings.length === 0;
        headings.forEach((heading, index) => {
            heading.id = heading.id || `section-${index + 1}`;
            const anchor = createElement('a', `toc-nav-link ${heading.tagName === 'H3' ? 'is-child' : ''}`, heading.textContent);
            anchor.href = `#${heading.id}`;
            anchor.addEventListener('click', (event) => {
                event.preventDefault();
                heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', `#${encodeURIComponent(heading.id)}`);
            });
            nav.append(anchor);
        });
        if (typeof IntersectionObserver === 'undefined' || !headings.length) return;
        const links = Array.from(nav.querySelectorAll('a'));
        const observer = new IntersectionObserver((entries) => {
            const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            if (!visible.length) return;
            links.forEach((anchor) => anchor.classList.toggle('active', anchor.getAttribute('href') === '#' + visible[0].target.id));
        }, { rootMargin: '-115px 0px -58% 0px', threshold: 0 });
        headings.forEach((heading) => observer.observe(heading));
    }

    function renderArticle(blog) {
        byId('blog-title').textContent = blog.title || 'Bài viết PawPal';
        byId('breadcrumbCurrentTitle').textContent = blog.title || 'Bài viết';
        byId('blogCategoryBadge').textContent = blog.categoryName || 'Cẩm nang';
        byId('blogAuthorName').textContent = blog.author || 'PawPal';
        document.title = `${blog.title || 'Cẩm nang'} | PawPal Journal`;
        const words = String(blog.content || '').replace(/<[^>]*>/g, '').trim().length;
        const duration = blog.readingTime || (words ? `${Math.max(1, Math.ceil(words / 1000))} phút đọc ước tính` : 'Bài viết');
        const views = Number(blog.viewCount ?? blog.view_count);
        const parts = [dateVN(blog.date), duration];
        if (Number.isFinite(views)) parts.push(`${Math.max(0, views).toLocaleString('vi-VN')} lượt xem`);
        byId('blogMetaStats').textContent = parts.filter(Boolean).join(' · ');

        const cover = byId('blog-hero-cover');
        cover.replaceChildren();
        const coverSrc = safeUrl(blog.thumbnail || blog.thumbnail_url);
        if (coverSrc) {
            const image = createElement('img', 'blog-hero-cover-img');
            image.src = coverSrc;
            image.alt = blog.title || 'Hình ảnh bài viết';
            image.loading = 'eager';
            image.decoding = 'async';
            image.addEventListener('error', () => {
                cover.classList.add('missing-cover');
                image.remove();
            }, { once: true });
            cover.append(image);
        } else {
            cover.hidden = true;
        }

        const article = byId('blog-content');
        const content = String(blog.content || '').trim();
        article.innerHTML = content ? sanitizeArticleContent(content) : '<p>Nội dung bài viết đang được cập nhật.</p>';
        setupTOC(article);

        const tags = byId('tagsList');
        tags.replaceChildren();
        const category = String(blog.categoryName || '').trim();
        if (category) {
            const tag = createElement('a', 'btn-tag-chip', category);
            tag.href = BLOG_PATH + '?search=' + encodeURIComponent(category);
            tags.append(tag);
        } else {
            byId('blog-tags').hidden = true;
        }
    }

    function renderTrending(articles, currentId) {
        const box = byId('sidebarTrendingList');
        if (!box) return;
        const pool = articles.filter((item) => item.id !== currentId && Number.isFinite(Number(item.viewCount ?? item.view_count)));
        pool.sort((a, b) => Number(b.viewCount ?? b.view_count) - Number(a.viewCount ?? a.view_count));
        if (!pool.length) {
            box.innerHTML = '<p class="sidebar-note">Bạn có thể tìm thêm các bài viết trong Cẩm nang PawPal.</p>';
            return;
        }
        box.innerHTML = pool.slice(0, 4).map((item, index) => `
            <a class="trending-item-row" href="${esc(articleUrl(item))}">
                <span class="trending-num-badge">${String(index + 1).padStart(2, '0')}</span>
                <span class="trending-row-info"><span class="trending-row-title">${esc(item.title)}</span>
                <span class="trending-row-meta">${Number(item.viewCount ?? item.view_count).toLocaleString('vi-VN')} lượt xem</span></span>
            </a>`).join('');
    }

    function renderRelated(articles, currentBlog) {
        const box = byId('related-posts-container');
        if (!box) return;
        const candidates = articles.filter((item) => item.id !== currentBlog.id);
        const ordered = [
            ...candidates.filter((a) => a.categorySlug && a.categorySlug === currentBlog.categorySlug),
            ...candidates.filter((a) => !a.categorySlug || a.categorySlug !== currentBlog.categorySlug)
        ].slice(0, 3);
        if (!ordered.length) {
            box.innerHTML = '<p class="related-empty">Chưa có bài viết liên quan. Hãy khám phá thêm trong Cẩm nang PawPal.</p>';
            return;
        }
        box.innerHTML = ordered.map((item) => {
            const imgSrc = safeUrl(item.thumbnail || item.thumbnail_url);
            const picture = imgSrc ? `<img src="${esc(imgSrc)}" alt="${esc(item.title)}" loading="lazy" decoding="async">` : '<span class="related-img-fallback">PawPal Journal</span>';
            return `<div class="col-md-4"><a class="related-article-card" href="${esc(articleUrl(item))}">
                <div class="related-card-media">${picture}</div>
                <div class="related-card-body">
                    <p class="related-card-meta">${esc(item.categoryName || 'Cẩm nang')} · ${esc(dateVN(item.date))}</p>
                    <h3 class="related-card-title">${esc(item.title)}</h3>
                    <p class="related-card-excerpt">${esc(item.summary || '')}</p>
                </div>
            </a></div>`;
        }).join('');
    }

    async function initBlogDetail() {
        const query = new URLSearchParams(window.location.search);
        const slug = query.get('slug');
        const id = query.get('id');
        setupShare();
        setupReadProgress();
        byId('commentSubmitForm')?.addEventListener('submit', (event) => event.preventDefault());
        try {
            if (!slug && !id) {
                throw new Error('Không có mã bài viết');
            }
            const { blog, others } = await getArticle(slug, id);
            if (!blog) {
                byId('blog-title').textContent = 'Không tìm thấy bài viết';
                byId('breadcrumbCurrentTitle').textContent = 'Không tìm thấy bài viết';
                byId('blog-content').innerHTML = '<p>Bài viết này không có sẵn. <a href="/blog">Quay về Cẩm nang</a>.</p>';
                byId('blogHeroCatWrap').hidden = true;
                byId('blog-hero-cover').hidden = true;
                byId('blogCommentsSection').hidden = true;
            } else {
                renderArticle(blog);
                renderTrending(others, blog.id);
                renderRelated(others, blog);
            }
        } catch (error) {
            console.error('Lỗi tải bài viết:', error);
            byId('blog-title').textContent = 'Chưa thể tải bài viết';
            byId('breadcrumbCurrentTitle').textContent = 'Không thể tải nội dung';
            byId('blog-content').innerHTML = '<p>Dữ liệu Cẩm nang chưa khả dụng. Bạn có thể <a href="/blog">quay lại danh sách bài viết</a> và thử lại sau.</p>';
            byId('blog-hero-cover').hidden = true;
            byId('blogCommentsSection').hidden = true;
        } finally {
            const main = document.querySelector('.blog-detail-main');
            main?.classList.remove('blog-loading');
            main?.setAttribute('aria-busy', 'false');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBlogDetail, { once: true });
    } else {
        initBlogDetail();
    }
})();
