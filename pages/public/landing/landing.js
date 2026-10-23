/* V2.18 presentation uses published Cloud data; no mock prices or identities. */
(() => {
    'use strict';
    if (window.pawpalHomeV218Ready) return;
    window.pawpalHomeV218Ready = true;
    function init() {
        const root = document.querySelector('body.landing-v218 main');
        if (!root) return;
        const grid = root.querySelector('#home-services');
        if (!grid || grid.dataset.homeReady) return;
        grid.dataset.homeReady = 'true';
        const $ = selector => root.querySelector(selector);
        const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const money = n => Number(n).toLocaleString('vi-VN') + 'đ';
        let services = [], category = 'all';
        let savedServices = new Set(), wishlistEpoch = 0;
        const notice = document.createElement('p');
        notice.className='home-wishlist-notice';notice.setAttribute('role','status');grid.after(notice);
        const currentUser = () => {try{return JSON.parse(localStorage.getItem('pawpal_current_user'))||null;}catch(_){return null;}};
        const syncSavedButtons = () => grid.querySelectorAll('[data-save-service]').forEach(button=>{
            const saved=savedServices.has(button.dataset.saveService);button.setAttribute('aria-pressed',String(saved));button.textContent=saved?'Đã lưu':'Lưu yêu thích';
        });
        async function refreshSaved() {
            const epoch=++wishlistEpoch;
            const user=currentUser();savedServices=new Set();syncSavedButtons();
            if (!user?.id) return;
            try {
                const {API}=await import('/scripts/api/api.js');const result=await API.getUserWishlist(user.id);
                if (!grid.isConnected || currentUser()?.id!==user.id || epoch!==wishlistEpoch) return;
                savedServices=new Set((result.serviceIds||[]).map(String));syncSavedButtons();
            }catch(_){/* Never replace a member's remote list with browser data. */}
        }
        window.pawpalHomeRefreshWishlist=()=>{if(grid.isConnected)refreshSaved();};
        grid.addEventListener('click',async event=>{
            const button=event.target.closest('[data-save-service]');if(!button||button.disabled)return;
            const user=currentUser();
            if(!user?.id){notice.textContent='Vui lòng đăng nhập để lưu dịch vụ yêu thích.';return;}
            ++wishlistEpoch;button.disabled=true;notice.textContent='';
            try {
                const {API}=await import('/scripts/api/api.js');
                const snapshot=await API.getUserWishlist(user.id),id=button.dataset.saveService;
                if(currentUser()?.id!==user.id)throw Error('Tài khoản đã thay đổi. Vui lòng thử lại.');
                const saved=!(snapshot.serviceIds||[]).map(String).includes(id);
                const result=await API.setWishlistItem(user.id,id,true,saved);
                if(!result.success)throw Error('Chưa lưu được yêu thích.');
                if(!grid.isConnected||currentUser()?.id!==user.id)return;
                if(saved)savedServices.add(id);else savedServices.delete(id);
                syncSavedButtons();notice.textContent=saved?'Đã lưu dịch vụ yêu thích.':'Đã bỏ dịch vụ khỏi yêu thích.';
            }catch(_){if(grid.isConnected)notice.textContent='Chưa cập nhật được yêu thích. Vui lòng thử lại.';}
            finally{button.disabled=false;}
        });
        function renderServices() {
            const rows = services.filter(s => category === 'all' || s.category === category).slice(0, 5);
            grid.innerHTML = rows.length ? rows.map(s => `<article class="catalog-item" data-service-id="${esc(s.id)}">
                <a class="catalog-photo-link" href="/pages/services/service-detail/service-detail.html?id=${encodeURIComponent(s.serviceId)}"><img src="${esc(s.image)}" alt="${esc(s.name)}" loading="lazy" width="640" height="480"></a>
                <div class="catalog-body"><div class="catalog-topline"><span class="catalog-id">${esc(s.serviceId)}</span><span class="catalog-rating">${s.reviewCount > 0 ? `★ ${s.rating.toFixed(1)} (${s.reviewCount})` : 'Chưa có đánh giá'}</span></div>
                <h3><a href="/pages/services/service-detail/service-detail.html?id=${encodeURIComponent(s.serviceId)}">${esc(s.name)}</a></h3>
                <p class="catalog-desc">${esc(s.description)}</p><p class="catalog-duration">${esc([s.petType,s.duration].filter(Boolean).join(' · '))}</p>
                <div class="catalog-purchase"><span class="catalog-price">${s.hasPrice ? 'Từ '+money(s.price) : 'Xem giá khi đặt lịch'}</span><a class="catalog-book" href="/booking?service=${encodeURIComponent(s.serviceId)}">Đặt lịch</a></div><button class="home-save-service" type="button" data-save-service="${esc(s.id)}" aria-pressed="false">Lưu yêu thích</button></div></article>`).join('') : '<p class="home-state">Chưa có dịch vụ trong nhóm này.</p>';
            syncSavedButtons();
        }
        root.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
            category = button.dataset.category;
            root.querySelectorAll('[data-category]').forEach(b => {b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button));});
            renderServices();
        }));
        async function loadServices() {
            grid.textContent = 'Đang tải dịch vụ…';
            try {
                services = (await window.DataLoader.loadServices()).sort((a,b) => ({spa:0,hotel:1,taxi:2}[a.category] ?? 3)-({spa:0,hotel:1,taxi:2}[b.category] ?? 3) || a.serviceId.localeCompare(b.serviceId));
                if (!grid.isConnected) return;
                renderServices();refreshSaved();await loadReviews();
            } catch (_) {
                if (!grid.isConnected) return;
                grid.innerHTML = '<p class="home-state">Chưa tải được dịch vụ. <button type="button" id="home-retry">Thử lại</button></p>';
                $('#home-retry').addEventListener('click', loadServices, {once:true});
                $('#v4-quote').textContent = 'Chưa tải được đánh giá dịch vụ.';
            }
        }
        async function loadReviews() {
            const service = services.find(s => s.reviewCount > 0);
            let reviews = [], index = 0;
            const buttons = root.querySelectorAll('[data-v4-review]');
            buttons.forEach(b => b.disabled = true);
            if (service) {
                try { reviews = (await window.DataLoader.getServiceReviews(service.id)).filter(r => r.text.trim()); }
                catch (_) { if (grid.isConnected) $('#v4-quote').textContent = 'Chưa tải được đánh giá dịch vụ.'; return; }
            }
            if (!grid.isConnected) return;
            function show() {
                const row = reviews[index];
                $('#v4-quote').textContent = row ? row.text : 'Chưa có đánh giá dịch vụ được công bố.';
                $('#v4-by').textContent = row ? `${row.name} · ${row.rating}/5 · ${service.name}` : '';
                $('#v4-review-index').textContent = row ? `${index+1} / ${reviews.length}` : '—';
                buttons.forEach(b => b.disabled = reviews.length < 2);
            }
            buttons.forEach(b => b.addEventListener('click', () => {index=(index+(b.dataset.v4Review==='next'?1:-1)+reviews.length)%reviews.length;show();}));show();
        }
        async function loadTiers() {
            const host = $('#home-tiers');
            try {
                const {data,error} = await window.getSupabaseClient().from('membership_tier').select('id,tier_name,discount_percent,description,is_active').eq('is_active',true).order('minimum_expenditure').limit(12);
                if (error) throw error;
                if (!grid.isConnected) return;
                const tone = name => ({bac:'silver',vang:'gold',kimcuong:'diamond'})[String(name).normalize('NFD').replace(/[\u0300-\u036f\s]/g,'').toLowerCase().replace(/^hang/,'')];
                const tiers=data.filter(t=>tone(t.tier_name));
                host.classList.add('home-pass-showcase');
                host.innerHTML = tiers.length ? `<div class="home-pass-preview" aria-live="polite"></div><div class="home-pass-options" role="group" aria-label="Xem thẻ hạng thành viên">${tiers.map((tier,i)=>`<button type="button" class="home-pass-option" data-tier-index="${i}" aria-pressed="false"><span class="home-pass-option-top"><strong>${esc(tier.tier_name)}</strong><span>${esc(Number(tier.discount_percent)||0)}% mức giảm theo hạng</span></span><span class="home-pass-option-note">${esc(tier.description||'Áp dụng theo điều kiện giao dịch.')}</span></button>`).join('')}</div>` : '<p>Chưa có hạng thành viên được công bố.</p>';
                function selectTier(index) {
                    const tier=tiers[index];
                    host.querySelector('.home-pass-preview').innerHTML=`<div class="home-member-card home-member-${tone(tier.tier_name)}"><div class="home-member-brand"><span>PawPal <b>PawPass</b></span><span class="home-member-chip" aria-hidden="true"></span></div><div><span class="home-member-label">THẺ THÀNH VIÊN</span><h3>${esc(tier.tier_name)}</h3></div><div class="home-member-bottom"><span>Mức giảm theo hạng</span><strong>${esc(Number(tier.discount_percent)||0)}<small>%</small></strong></div></div><p class="home-pass-caption">Thẻ giới thiệu quyền lợi · Hạng thực tế xem trong tài khoản</p>`;
                    host.querySelectorAll('[data-tier-index]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.tierIndex)===index)));
                }
                host.querySelectorAll('[data-tier-index]').forEach(button=>button.addEventListener('click',()=>selectTier(Number(button.dataset.tierIndex))));
                if(tiers.length)selectTier(Math.max(0,tiers.findIndex(t=>tone(t.tier_name)==='gold')));
            } catch (_) { host.textContent = 'Chưa tải được quyền lợi thành viên. Bạn có thể xem lại trong tài khoản.'; }
        }
        async function loadBanners() {
            const slides = [{src:$('#campaignImg').getAttribute('src'),name:'Pet Taxi — Đồng hành cùng bé',link:'/booking?service=TXI01'}];
            let current = 0;
            try {
                const {data,error} = await window.getSupabaseClient().from('banner').select('id,title,image_url,link,start_date,end_date,status').eq('status','dang_hien_thi').order('display_order').limit(8);
                if (error) throw error;
                const now = Date.now();
                for (const b of data || []) {
                    let url,link;
                    try {url=new URL(b.image_url, location.origin);link=new URL(b.link || '/services',location.origin);}catch(_){continue;}
                    if (!['https:','http:'].includes(url.protocol) || /(^|\.)example\.(com|org|net)$/.test(url.hostname) || link.origin !== location.origin) continue;
                    if ((b.start_date && Date.parse(b.start_date)>now) || (b.end_date && Date.parse(b.end_date)<now)) continue;
                    const ok = await new Promise(resolve => {const image=new Image();const timer=setTimeout(()=>resolve(false),4000);image.onload=()=>{clearTimeout(timer);resolve(true);};image.onerror=()=>{clearTimeout(timer);resolve(false);};image.src=url.href;});
                    if (ok) slides.push({src:url.href,name:b.title||'PawPal',link:link.pathname+link.search});
                }
            } catch (_) { /* Approved brand artwork remains available if the catalogue is unavailable. */ }
            if (!grid.isConnected) return;
            const prev=$('#prevSlide'), next=$('#nextSlide');
            function show() {
                const row=slides[current];$('#campaignImg').src=row.src;$('#campaignImg').alt=row.name;
                $('#slideName').textContent=row.name;$('#slideNum').textContent=String(current+1).padStart(2,'0');
                $('#slidePager').textContent=`${String(current+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
                $('.book-inline').href=row.link;
                $('.book-inline').textContent=row.link.startsWith('/booking')?'Đặt lịch ngay ↗':'Khám phá dịch vụ ↗';
            }
            [prev,next].forEach(b=>{b.hidden=slides.length<2;b.disabled=slides.length<2;});
            prev.addEventListener('click',()=>{current=(current-1+slides.length)%slides.length;show();});
            next.addEventListener('click',()=>{current=(current+1)%slides.length;show();});show();
        }
        const entries = [...root.querySelectorAll('.pj-entry')];
        const photo = $('#pj-active-photo'), original = photo.src;
        const art = [...root.querySelectorAll('.v4-step img')].map(i => i.src);
        entries.forEach((entry,i) => entry.addEventListener('click', () => {
            entries.forEach(e => {e.classList.toggle('is-current', e===entry);e.setAttribute('aria-pressed',String(e===entry));});
            photo.src = i===0 ? original : art[i-1];photo.alt=entry.querySelector('strong').textContent+' — minh họa';
            $('#pj-photo-caption').textContent = `${String(i+1).padStart(2,'0')} / 03 · ${entry.querySelector('.pj-time').textContent} — ${entry.querySelector('strong').textContent}`;
        }));
        loadServices();loadTiers();loadBanners();
    }
    document.addEventListener('DOMContentLoaded',init);
    document.addEventListener('page_navigated',init);
    document.addEventListener('auth_state_changed',()=>window.pawpalHomeRefreshWishlist?.());
    if (document.readyState !== 'loading') init();
})();
