// blog-detail.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Share Buttons Logic
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
                // Mockup for facebook share
                window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href), 'facebook-share-dialog', 'width=800,height=600');
            }
        });
    });

    // 2. TOC Scroll Spy (Highlight current section)
    const tocLinks = document.querySelectorAll('.toc-widget .nav-link');
    const sections = Array.from(tocLinks).map(link => {
        const id = link.getAttribute('href').substring(1);
        return document.getElementById(id);
    }).filter(el => el !== null);

    if (sections.length > 0) {
        window.addEventListener('scroll', () => {
            let currentSection = null;
            const scrollPosition = window.scrollY + 150; // offset for sticky header

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
                // If scroll is at the very top before any section
                tocLinks.forEach(link => link.classList.remove('active'));
            }
        });
    }

    // 3. Smooth scroll for TOC links
    tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100, // Offset for header
                    behavior: 'smooth'
                });
            }
        });
    });
});
