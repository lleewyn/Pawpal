
document.addEventListener('DOMContentLoaded', function() {

        window._pageLoadStart = Date.now();
        var _loaderThreshold = 300; // ms
        var _loaderTimeout = setTimeout(function () {
            var loader = document.getElementById('cute-loader');
            if (loader) loader.style.display = 'flex';
        }, _loaderThreshold);
    
});
\n\n
document.addEventListener('DOMContentLoaded', function() {

        // Smart Loader: hide as soon as DOM is ready, cancel show-timer if fast enough
        (function () {
            function hideLoader() {
                clearTimeout(window._loaderTimeout);
                var loader = document.getElementById('cute-loader');
                if (!loader) return;
                if (loader.style.display === 'none') return; // Never shown, do nothing
                loader.style.opacity = '0';
                loader.style.transition = 'opacity 0.3s ease';
                setTimeout(function () { loader.style.display = 'none'; }, 300);
            }
            if (document.readyState === 'complete') {
                hideLoader();
            } else {
                window.addEventListener('load', hideLoader);
            }
        })();
    
});
\n\n
document.addEventListener('DOMContentLoaded', function() {

        (function () {
            // Update Hero Availability
            function updateHeroAvailability() {
                const el = document.getElementById('heroAvailability');
                if (!el) return;

                const spaSlots = Math.floor(Math.random() * 5) + 1;
                const hotelRooms = Math.floor(Math.random() * 4) + 1;
                const now = new Date();
                const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                el.innerHTML = `Hôm nay còn trống: <strong style="color:#ffffff; font-weight:700;">${spaSlots} slot Spa</strong> | <strong style="color:#ffffff; font-weight:700;">${hotelRooms} phòng Hotel</strong> <span style="opacity:0.6">(Cập nhật ${timeStr})</span>`;
            }

            // Update Footer CTA Urgency
            function updateCtaUrgency() {
                const el = document.getElementById('ctaUrgency');
                if (!el) return;

                const totalSlots = Math.floor(Math.random() * 8) + 3; // 3-10 slots
                el.innerHTML = `<span class="urgency-dot"></span><span>Hôm nay còn <strong>${totalSlots} slot</strong> trống — Đặt ngay!</span>`;
            }

            // Init và auto-update
            updateHeroAvailability();
            updateCtaUrgency();
            setInterval(updateHeroAvailability, 300000); // 5 phút
            setInterval(updateCtaUrgency, 180000); // 3 phút

            // ── Service Featured Swap ──────────────────────────────────────
            (function initSvcSwap() {
                const featured   = document.getElementById('svcFeatured');
                const miniItems  = document.querySelectorAll('.svc-mini-item');
                if (!featured || !miniItems.length) return;

                function swapFeatured(el) {
                    const d = el.dataset;
                    if (!d.id || d.id === featured.dataset.id) return;

                    // Animate out
                    featured.style.transition = 'opacity 0.2s ease';
                    featured.style.opacity = '0';

                    setTimeout(function () {
                        // Update featured content
                        document.getElementById('svcFeaturedImgEl').src = d.img;
                        document.getElementById('svcFeaturedImgEl').alt = d.title;
                        document.getElementById('svcFeaturedTitle').innerHTML = d.title;
                        document.getElementById('svcFeaturedDesc').textContent = d.desc;
                        document.getElementById('svcFeaturedPrice').textContent = d.price;
                        document.getElementById('svcFeaturedCta').textContent = d.cta;

                        var badge = document.getElementById('svcFeaturedBadge');
                        if (d.badge) {
                            badge.textContent = d.badge;
                            badge.style.display = '';
                        } else {
                            badge.style.display = 'none';
                        }

                        // Update href
                        featured.href = d.href || '#';
                        featured.dataset.id = d.id;

                        // Active state on mini cards — highlight the one now in stack that matches featured
                        miniItems.forEach(function(m) {
                            m.classList.remove('svc-active');
                            // Show all mini cards
                            m.style.display = '';
                        });
                        el.classList.add('svc-active');

                        // Animate in
                        featured.style.opacity = '1';
                    }, 200);
                }

                miniItems.forEach(function(item) {
                    item.style.cursor = 'pointer';
                    item.addEventListener('click', function(e) {
                        // Only swap, don't navigate (navigation handled by featured card)
                        e.preventDefault();
                        swapFeatured(item);
                    });
                });
            })();
            // ─────────────────────────────────────────────────────────────────

        })();
    
});
\n\n
        document.addEventListener('DOMContentLoaded', function () {
            console.log('--- DIAGNOSTICS START ---');
            console.log('Bootstrap available:', typeof bootstrap !== 'undefined');

            const carousel = document.getElementById('heroCarousel');
            if (carousel) {
                console.log('Found #heroCarousel element');

                // Track transition events
                carousel.addEventListener('slide.bs.carousel', function (e) {
                    console.log('Carousel slide event triggered. Moving to index:', e.to);
                });

                // Check images inside carousel
                const images = carousel.querySelectorAll('img');
                console.log('Number of images in carousel:', images.length);
                images.forEach((img, i) => {
                    console.log(`Image ${i + 1} src:`, img.src);

                    // Check if already loaded
                    if (img.complete) {
                        if (img.naturalWidth === 0) {
                            console.error(`Image ${i + 1} (${img.src}) failed to load (naturalWidth is 0)`);
                        } else {
                            console.log(`Image ${i + 1} loaded successfully`);
                        }
                    }

                    // Error listener
                    img.addEventListener('error', function () {
                        console.error(`Image ${i + 1} (${img.src}) failed to load`);
                    });
                    img.addEventListener('load', function () {
                        console.log(`Image ${i + 1} loaded successfully`);
                    });
                });
            } else {
                console.error('Could not find #heroCarousel element');
            }
            console.log('--- DIAGNOSTICS END ---');
        });
    \n\n