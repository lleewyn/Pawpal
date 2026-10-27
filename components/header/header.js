/**
 * header-auth.js — Cập nhật header dựa trên trạng thái đăng nhập
 */

(function() {
    function getCurrentUser() {
        try {
            const user = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
            if (user && (user.system_role === 'ADMIN' || user.system_role === 'STAFF' || user.system_role === 'MANAGER' || user.role === 'admin' || user.role === 'staff')) {
                return null;
            }
            return user;
        } catch {
            return null;
        }
    }

    function getRootPath() {
        const pathname = window.location.pathname;
        const searchTerms = ['/pages/', '/assets/'];
        for (const term of searchTerms) {
            const idx = pathname.toLowerCase().indexOf(term);
            if (idx !== -1) {
                const subPath = pathname.substring(idx + 1); // "pages/public/landing/landing.html"
                const depth = subPath.split('/').length - 1;
                return '../'.repeat(depth) || './';
            }
        }
        return './';
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeHref(url) {
        if (!url || typeof url !== 'string') return '#';
        const trimmed = url.trim();
        if (/^(javascript|data):/i.test(trimmed)) {
            return '#';
        }
        return trimmed;
    }

    const noticeState={owner:null,rows:[],cutoff:null,loaded:false,pending:null,channel:null,error:null,page:1,total:0,unread:0,onlyUnread:false};
    // Migration 103 is installed; allow an explicit rollback switch.
    const noticePagingEnabled=window.PAWPAL_NOTIFICATION_PAGING_ENABLED!==false;
    let noticeEpoch=0,noticeTimer=null,noticeDirty=false;
    function stopNoticeChannel(){
        noticeEpoch++;clearTimeout(noticeTimer);noticeTimer=null;noticeDirty=false;
        if(noticeState.channel)(window.getSupabaseClient?.() || window.SupabaseClient)?.removeChannel(noticeState.channel);
        noticeState.channel=null;noticeState.pending=null;
    }
    function scheduleNoticeRefresh(){
        noticeDirty=true;
        if(document.visibilityState==='hidden' || noticeTimer!==null)return;
        const epoch=noticeEpoch;
        noticeTimer=setTimeout(async()=>{
            noticeTimer=null;
            if(epoch!==noticeEpoch || document.visibilityState==='hidden')return;
            const pending=noticeState.pending;
            if(pending){await pending;if(epoch===noticeEpoch && noticeDirty)scheduleNoticeRefresh();return;}
            noticeDirty=false;await refreshNotices();
        },200);
    }
    function getSharedNotifications(){return noticeState.rows;}
    function renderNotifications(){return '<p>Đang tải thông báo.</p>';}
    function noticeLink(row){
        if(row.sales_order_id)return '/user#order-detail?id='+encodeURIComponent(row.sales_order_id);
        if(row.appointment_id)return '/user#booking-detail?id='+encodeURIComponent(row.appointment_id);
        if(row.support_ticket_id)return '/user#support?id='+encodeURIComponent(row.support_ticket_id);
        return '/user';
    }
    function noticeError(message){const target=document.getElementById('noticeCloudError') || document.getElementById('headerNotificationList');if(target){if(target.id==='noticeCloudError'){target.textContent=message;return;}const text=document.createElement('p');text.setAttribute('role','alert');text.style.color='#DC2626';text.textContent=message;target.prepend(text);}}
    function paintNotices(){
        const unread=noticeState.unread,badge=document.getElementById('notificationBadge');
        if(badge){badge.textContent=unread>9?'9+':String(unread);badge.style.display=unread?'flex':'none';}
        const list=document.getElementById('headerNotificationList');
        if(list){list.innerHTML=noticeState.error?'<p role="alert">Không thể tải thông báo. Vui lòng mở lại để thử.</p>':noticeState.rows.slice(0,10).map(n=>`<button type="button" style="width:100%;text-align:left;background:transparent;border:0;padding:12px;display:grid;gap:4px;border-radius:9px" class="notification-item-dropdown ${n.read_at?'':'unread'}" data-id="${escapeHtml(n.id)}"><span class="item-content"><span class="item-title">${escapeHtml(n.title)}</span><span class="item-text">${escapeHtml(n.content)}</span><span class="item-time">${escapeHtml(new Date(n.sent_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}))}</span></button>`).join('') || '<p>Chưa có thông báo.</p>';
            list.querySelectorAll('[data-id]').forEach(button=>button.onclick=()=>openAllNotificationsModal(noticeState.rows.find(n=>n.id===button.dataset.id)));
        }
        document.dispatchEvent(new CustomEvent('header_notifications_rendered'));
    }
    async function refreshNotices(){
        const user=getCurrentUser(),client=window.getSupabaseClient?.() || window.SupabaseClient;
        if(noticeState.owner!==(user?.id || null)){stopNoticeChannel();document.querySelector('#notificationsCloudModal [data-close-modal]')?.click();noticeState.owner=user?.id || null;noticeState.rows=[];noticeState.page=1;noticeState.total=0;noticeState.unread=0;noticeState.onlyUnread=false;noticeState.cutoff=null;noticeState.loaded=false;noticeState.error=null;paintNotices();}
        if(!user?.id || !client)return;
        if(noticeState.pending)return noticeState.pending;
        const owner=user.id,epoch=noticeEpoch;
        const work=(async()=>{try{
            const result=await client.rpc('own_notifications_snapshot',...(noticePagingEnabled?[{p_page:noticeState.page,p_size:10,p_unread:noticeState.onlyUnread}]:[]));if(getCurrentUser()?.id!==owner || epoch!==noticeEpoch)return;
            if(result.error || result.data?.customer_id!==owner)throw Error('Không thể tải thông báo.');
            noticeState.rows=result.data.rows || [];noticeState.cutoff=result.data.snapshot_at;noticeState.error=null;
            noticeState.page=result.data.page || 1;noticeState.total=Number(result.data.total ?? noticeState.rows.length);noticeState.unread=Number(result.data.unread_count ?? noticeState.rows.filter(n=>!n.read_at).length);
            if(!noticeState.channel){let subscribed=false;noticeState.channel=client.channel('notices-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'notification',filter:'customer_id=eq.'+owner},()=>{if(epoch===noticeEpoch)scheduleNoticeRefresh();}).subscribe(status=>{if(status==='SUBSCRIBED'){if(subscribed && epoch===noticeEpoch)scheduleNoticeRefresh();subscribed=true;}});}
        }catch(error){if(getCurrentUser()?.id===owner && epoch===noticeEpoch){noticeState.rows=[];noticeState.error=error.message;}}
        finally{if(getCurrentUser()?.id===owner && epoch===noticeEpoch){noticeState.loaded=true;paintNotices();renderNoticeModal();}}})();
        noticeState.pending=work;try{await work;}finally{if(noticeState.pending===work)noticeState.pending=null;}
    }
    const noticeWrites=new Map();
    async function markNoticeRead(id){
        const client=window.getSupabaseClient?.() || window.SupabaseClient,owner=noticeState.owner,epoch=noticeEpoch;
        if(!owner || getCurrentUser()?.id!==owner)throw Error('Vui lòng đăng nhập lại.');
        const cutoff=id?null:noticeState.cutoff;
        if(!id && !cutoff)throw Error('Vui lòng tải lại thông báo trước khi đánh dấu tất cả.');
        const key=JSON.stringify([epoch,owner,id,cutoff]);
        if(noticeWrites.has(key))return noticeWrites.get(key);
        const work=(async()=>{
            const result=await client.rpc('mark_own_notifications_read',{p_id:id,p_before:cutoff,p_expected_owner:owner});
            if(epoch!==noticeEpoch || getCurrentUser()?.id!==owner)return;
            if(result.error || !Number.isInteger(result.data) || result.data<0)throw Error('Chưa đánh dấu được thông báo. Vui lòng thử lại.');
            // A read started before this write may contain the old unread state.
            if(noticeState.pending)await noticeState.pending;
            if(epoch!==noticeEpoch || getCurrentUser()?.id!==owner)return;
            await refreshNotices();renderNoticeModal();
        })();
        noticeWrites.set(key,work);
        try{return await work;}finally{if(noticeWrites.get(key)===work)noticeWrites.delete(key);}
    }
    window.updateNotificationBadge=()=>{paintNotices();if(!noticeState.loaded || noticeState.owner!==getCurrentUser()?.id)refreshNotices();};
    document.addEventListener('notifications_updated',scheduleNoticeRefresh);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden' && noticeDirty)scheduleNoticeRefresh();});
    document.addEventListener('auth_state_changed',()=>{stopNoticeChannel();noticeState.loaded=false;refreshNotices();});
    window.addEventListener('storage',event=>{if(event.key==='pawpal_current_user'){stopNoticeChannel();noticeState.loaded=false;refreshNotices();}});
    window.addEventListener('pagehide',stopNoticeChannel);
    window.addEventListener('pageshow',event=>{if(event.persisted){noticeState.loaded=false;refreshNotices();}});

    let cartBadgeRevision=0;
    window.updateCartBadge = async function() {
        const revision = ++cartBadgeRevision;
        const currentUser = (typeof window.getCurrentUser === 'function')
            ? window.getCurrentUser()
            : (function() { try { return JSON.parse(localStorage.getItem('pawpal_current_user')) || null; } catch { return null; }})();

        // Guest cart is separate from all member cart caches.
        if (!currentUser || currentUser.is_temporary) {
            try {
                const {guestCart}=await import('/scripts/shared/guest-cart.mjs');
                const count=guestCart().read().reduce((sum,line)=>sum+line.quantity,0);
                if(revision!==cartBadgeRevision)return;
                let link=document.getElementById('headerGuestCart');
                if(!link){
                    link=document.createElement('a');link.id='headerGuestCart';link.href='/cart';link.className='cart-btn guest-cart-button';link.title='Giỏ hàng';
                    link.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><span class="guest-cart-badge" aria-hidden="true" hidden></span>';
                    const actions=document.querySelector('.main-header .header-actions');
                    const lookup=actions?.querySelector('.lookup-btn');
                    if(lookup)lookup.after(link);else actions?.prepend(link);
                }
                link.setAttribute('aria-label',count?'Giỏ hàng, '+count+' sản phẩm':'Giỏ hàng');
                const badge=link.querySelector('.guest-cart-badge');badge.textContent=count>99?'99+':String(count);badge.hidden=count===0;
            } catch { /* Keep damaged/blocked browser storage intact. */ }
            const cartBadges = document.querySelectorAll('.cart-badge');
            cartBadges.forEach(badge => {
                badge.textContent = '0';
                badge.style.display = 'none';
                badge.classList.add('d-none');
                badge.classList.remove('d-flex');
            });
            const cartBadgeMobile = document.querySelector('.cart-badge-mobile');
            if (cartBadgeMobile) {
                cartBadgeMobile.textContent = '';
            }
            return;
        }
        document.getElementById('headerGuestCart')?.remove();

        let totalItems = 0;
        let hasLocalCart = false;
        try {
            const rawCart = localStorage.getItem('pawpal_cart');
            if (rawCart !== null && localStorage.getItem('pawpal_cart_owner') === String(currentUser.id)) {
                hasLocalCart = true;
                const cartList = JSON.parse(rawCart);
                if (Array.isArray(cartList)) {
                    totalItems = cartList.reduce((sum, item) => sum + Number(item.quantity ?? item.qty ?? 1), 0);
                }
            }
        } catch(e) {}
            
        if (!hasLocalCart && currentUser && currentUser.id && window.API && window.API.getUserCart) {
            try {
                const cart = await window.API.getUserCart(currentUser.id);
                if (Array.isArray(cart)) {
                    totalItems = cart.reduce((sum, item) => sum + Number(item.quantity ?? item.qty ?? 1), 0);
                }
            } catch (e) {
                console.error("Failed to update cart badge", e);
            }
        }
        
        if (revision !== cartBadgeRevision || getCurrentUser()?.id !== currentUser.id) return;
        // Badge trên desktop header
        const cartBadges = document.querySelectorAll('.cart-badge');
        cartBadges.forEach(badge => {
            if (totalItems > 0) {
                badge.textContent = totalItems > 99 ? '99+' : totalItems;
                badge.style.display = 'flex';
                badge.classList.add('d-flex');
                badge.classList.remove('d-none');
            } else {
                badge.textContent = '0';
                badge.style.display = 'none';
                badge.classList.add('d-none');
                badge.classList.remove('d-flex');
            }
        });
        
        // Badge trên mobile nav drawer
        const cartBadgeMobile = document.querySelector('.cart-badge-mobile');
        if (cartBadgeMobile) {
            cartBadgeMobile.textContent = totalItems > 0 ? `(${totalItems})` : '';
        }
    };

    function setMobileGroupVisibility(elements, isVisible) {
        elements.forEach(el => {
            const item = el.closest('.nav-item') || el;
            if (isVisible) {
                item.classList.remove('d-none');
            } else {
                item.classList.add('d-none');
            }
        });
    }

    function syncMobileAuthLinks(state) {
        const nav = document.getElementById('primaryNavigation');
        if (!nav) return;

        const loginLinks = nav.querySelectorAll(
            'a[href*="/login"], a[href*="login.html"], a[href*="#register"], a[href*="action=register"]'
        );
        const guestLoginItems = nav.querySelectorAll(
            '.mobile-guest-only, .mobile-auth-login'
        );
        const userOnlyItems = nav.querySelectorAll('.mobile-user-only');
        const tempOnlyItems = nav.querySelectorAll('.mobile-temp-only');

        const isUser = state === 'user';
        const isTemp = state === 'temp';

        loginLinks.forEach((link) => {
            const label = (link.textContent || '').trim().toLowerCase();
            if (label.includes('đăng nhập') || label.includes('đăng ký') || label.includes('login') || label.includes('register')) {
                const item = link.closest('.nav-item') || link;
                if (isUser) {
                    item.classList.add('d-none');
                } else if (!isTemp) {
                    item.classList.remove('d-none');
                }
            }
        });

        setMobileGroupVisibility(guestLoginItems, !isUser && !isTemp);
        setMobileGroupVisibility(userOnlyItems, isUser);
        setMobileGroupVisibility(tempOnlyItems, isTemp);
    }

    async function resolveUserDisplayName(user){
        try{const client=window.getSupabaseClient?.() || window.SupabaseClient;if(!client)return user;const result=await client.rpc('customer_profile_snapshot');if(result.error || result.data?.id!==user.id)return user;const updatedUser={...user,name:result.data.name,phone:result.data.phone,email:result.data.email};const current=getCurrentUser();if(current?.id!==user.id)return current;localStorage.setItem('pawpal_current_user',JSON.stringify(updatedUser));return updatedUser;}catch{return user;}
    }

    function updateHeaderAuth() {
        const isGuestLookupPage = window.location.pathname.includes('return-guest');
        const user = isGuestLookupPage ? null : getCurrentUser();
        const authActions = document.querySelector('.auth-actions');
        const lookupBtn = document.querySelector('.lookup-btn');
        const lookupDivider = document.querySelector('.lookup-divider');
        const primaryNavigation = document.getElementById('primaryNavigation');
        
        const mobileGuestOnly = document.querySelectorAll('.mobile-guest-only');
        const mobileUserOnly = document.querySelectorAll('.mobile-user-only');
        const mobileTempOnly = document.querySelectorAll('.mobile-temp-only');
        document
            .querySelectorAll('#primaryNavigation .mobile-guest-only, #primaryNavigation .mobile-user-only, #primaryNavigation .mobile-temp-only, #primaryNavigation .nav-link-cta-mobile')
            .forEach(el => {
                const item = el.closest('.nav-item');
                if (!item) return;
                item.classList.remove('d-lg-none');
                item.classList.add('mobile-drawer-only');
            });
        
        if (!authActions) return; // Header chưa load
        
        const root = getRootPath();
        if (primaryNavigation) {
            primaryNavigation.classList.remove('nav-auth-user', 'nav-auth-temp', 'nav-auth-guest');
        }
        
        if (user && !user.is_temporary) {
            if (primaryNavigation) primaryNavigation.classList.add('nav-auth-user');
            // User đã đăng nhập chính thức
            // Ẩn: Tra cứu, Đăng nhập, Đăng ký và divider
            if (lookupBtn) lookupBtn.classList.add('d-none');
            if (lookupDivider) lookupDivider.classList.add('d-none');
            
            // Thay bằng: Giỏ hàng + Avatar + Tên + Dropdown
            const userName = String(user.name || user.full_name || '').trim() || user.phone || 'Khách hàng';
            const userInitial = userName.charAt(0).toUpperCase();

            // Cập nhật tên nền từ Supabase nếu cần
            resolveUserDisplayName(user).then((resolved) => {
                if (resolved && resolved.name && resolved.name !== userName) {
                    const nameEl = document.querySelector('.user-name');
                    if (nameEl) nameEl.textContent = resolved.name;
                    const infoNameEl = document.querySelector('.user-info-name');
                    if (infoNameEl) infoNameEl.textContent = resolved.name;
                }
            }).catch(() => {});
            
            const existingDropdown = authActions.querySelector('#userDropdown');
            if (!existingDropdown) {
                authActions.innerHTML = `
                    <div class="notification-menu-wrapper me-3">
                        <button class="notification-btn position-relative" id="headerNotificationBtn" title="Thông báo" type="button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            <span class="notification-badge" id="notificationBadge">0</span>
                        </button>
                        <div class="notification-dropdown" id="notificationDropdown">
                            <div class="notification-dropdown-header">
                                <span>Thông báo</span>
                                <button class="btn-mark-all-read" id="btnMarkAllRead" type="button">Đọc tất cả</button>
                            </div>
                            <div class="notification-list" id="headerNotificationList">
                                ${renderNotifications()}
                            </div>
                            <div class="notification-dropdown-footer">
                                <a href="/pages/user/#notifications" id="btnSeeAllNotis">Xem tất cả</a>
                            </div>
                        </div>
                    </div>
                    <a href="/cart" class="cart-btn position-relative me-3" id="headerCartBtn" title="Giỏ hàng của tôi">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <span class="cart-badge">0</span>
                    </a>
                    <div class="user-menu-wrapper">
                        <button class="user-menu-toggle" id="userMenuToggle">
                            <div class="user-avatar">${userInitial}</div>
                            <span class="user-name">${userName}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        <div class="user-dropdown" id="userDropdown">
                            <div class="dropdown-header">
                                <div class="user-avatar-large">${userInitial}</div>
                                <div class="user-info">
                                    <div class="user-info-name">${userName}</div>
                                    <div class="user-info-phone">${user.phone || ''}</div>
                                    <div class="user-info-points">${user.points || 0} Paw Points</div>
                                </div>
                            </div>
                            <div class="dropdown-divider"></div>
                            <a href="/pages/user/#profile" class="dropdown-item">Tài khoản của tôi</a>
                            <a href="/pages/user/#pets" class="dropdown-item">Hồ sơ bé cưng</a>
                            <a href="/pages/user/#bookings" class="dropdown-item">Lịch hẹn của bé</a>
                            <a href="/pages/user/#orders" class="dropdown-item">Đơn hàng của bé</a>
                            <a href="/pages/user/#wishlist" class="dropdown-item">Yêu thích</a>
                            <a href="/pages/user/#diary" class="dropdown-item">Nhật ký chăm sóc</a>
                            <a href="/pages/user/#loyalty" class="dropdown-item">Paw Points</a>
                            <a href="/pages/user/#settings" class="dropdown-item">Cài đặt</a>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item dropdown-item-danger" id="btnLogout">Đăng xuất</button>
                        </div>
                    </div>
                `;
            } else {
                const nameEl = authActions.querySelector('.user-name');
                if (nameEl && nameEl.textContent !== userName) nameEl.textContent = userName;
                const avatarEl = authActions.querySelector('.user-avatar');
                if (avatarEl && avatarEl.textContent !== userInitial) avatarEl.textContent = userInitial;
            }
            
            // Cập nhật Mobile Nav
            setMobileGroupVisibility(mobileGuestOnly, false);
            setMobileGroupVisibility(mobileUserOnly, true);
            setMobileGroupVisibility(mobileTempOnly, false);
            syncMobileAuthLinks('user');
            setupMobileAccountToggle();
            
            // Gắn sự kiện đóng mở dropdown
            setupUserDropdown();
            
        } else if (user && user.is_temporary) {
            if (primaryNavigation) primaryNavigation.classList.add('nav-auth-temp');
            if (lookupBtn) lookupBtn.classList.remove('d-none');
            if (lookupDivider) lookupDivider.classList.remove('d-none');

            // Lựa chọn A: Ẩn giỏ hàng khi là tài khoản tạm thời
            authActions.innerHTML = `
                <a href="/login" class="login-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Đăng nhập</span>
                </a>
                <a href="/login?action=setup-password" class="btn-signup">Kích hoạt</a>
            `;

            // Mobile Nav
            setMobileGroupVisibility(mobileGuestOnly, false);
            setMobileGroupVisibility(mobileUserOnly, false);
            setMobileGroupVisibility(mobileTempOnly, true);
            syncMobileAuthLinks('temp');
            setupMobileAccountToggle();
            setupUserDropdown();
            
        } else {
            if (primaryNavigation) primaryNavigation.classList.add('nav-auth-guest');
            if (lookupBtn) lookupBtn.classList.remove('d-none');
            if (lookupDivider) lookupDivider.classList.remove('d-none');
            
            // Lựa chọn A: Ẩn giỏ hàng khi chưa đăng nhập (Khách vãng lai), hiện rõ ràng Đăng nhập / Đăng ký
            authActions.innerHTML = `
                <a href="/login" class="login-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Đăng nhập</span>
                </a>
                <a href="/login#register" class="btn-signup">Đăng ký</a>
            `;
            
            // Cập nhật Mobile Nav
            setMobileGroupVisibility(mobileGuestOnly, true);
            setMobileGroupVisibility(mobileUserOnly, false);
            setMobileGroupVisibility(mobileTempOnly, false);
            syncMobileAuthLinks('guest');
            setupMobileAccountToggle();
            setupUserDropdown();
        }

        // Thực thi cập nhật số lượng badge tức thì
        if (typeof window.updateNotificationBadge === 'function') {
            window.updateNotificationBadge();
        }
        window.updateCartBadge(true);
    }
    
    function setupUserDropdown() {
        const toggle = document.getElementById('userMenuToggle');
        const dropdown = document.getElementById('userDropdown');
        const notiToggle = document.getElementById('headerNotificationBtn');
        const notiDropdown = document.getElementById('notificationDropdown');
        
        if (toggle && dropdown && toggle.dataset.dropdownBound !== 'true') {
            toggle.dataset.dropdownBound = 'true';
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
                if (notiDropdown) notiDropdown.classList.remove('show');
            });
        }

        if (notiToggle && notiDropdown && notiToggle.dataset.dropdownBound !== 'true') {
            notiToggle.dataset.dropdownBound = 'true';
            notiToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                notiDropdown.classList.toggle('show');
                if (dropdown) dropdown.classList.remove('show');
            });

            const btnMarkAll=notiDropdown.querySelector('#btnMarkAllRead');
            if(btnMarkAll && btnMarkAll.dataset.bound!=='true'){btnMarkAll.dataset.bound='true';btnMarkAll.onclick=async event=>{event.preventDefault();event.stopPropagation();btnMarkAll.disabled=true;try{await markNoticeRead(null);}catch(error){noticeError(error.message);}finally{btnMarkAll.disabled=false;}};}
            const btnSeeAll = notiDropdown.querySelector('#btnSeeAllNotis');
            if (btnSeeAll && btnSeeAll.dataset.bound !== 'true') {
                btnSeeAll.dataset.bound = 'true';
                btnSeeAll.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    notiDropdown.classList.remove('show');
                    openAllNotificationsModal();
                });
            }
        }
        
        setupLogoutButtons();
    }

    // Đóng dropdown khi click ra ngoài (đăng ký 1 lần duy nhất)
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('userDropdown');
        const notiDropdown = document.getElementById('notificationDropdown');
        if (dropdown && !e.target.closest('.user-menu-wrapper')) {
            dropdown.classList.remove('show');
        }
        if (notiDropdown && !e.target.closest('.notification-menu-wrapper')) {
            notiDropdown.classList.remove('show');
        }
    });

    async function handleGlobalLogout(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const client = window.getSupabaseClient?.() || window.SupabaseClient;
        if (client) {
            const { error } = await client.auth.signOut();
            if (error) { console.error('[Header] Không thể đăng xuất:', error.message); return; }
        }
        try {
            localStorage.removeItem('pawpal_current_user');
            sessionStorage.removeItem('pawpal_current_user');
            localStorage.removeItem('pawpal_cart');
            sessionStorage.removeItem('pawpal_cart');
            localStorage.removeItem('pawpal_notifications');
            sessionStorage.removeItem('pawpal_component_site-header');
            localStorage.removeItem('pawpal_component_site-header');
        } catch(err) {}
        
        document.dispatchEvent(new CustomEvent('auth_state_changed', { detail: null }));
        window.location.href = '/';
    }

    window.pawpalLogout = handleGlobalLogout;

    function setupLogoutButtons() {
        document.querySelectorAll('#btnLogout, #logoutBtn, #tempLogoutBtn, #sidebarLogoutBtn, #nav-logout, .mobile-logout-btn, .sidebar-logout-btn, .dropdown-item-danger, a[href*="logout"]').forEach(btn => {
            if (btn.dataset.logoutBound === 'true') return;
            btn.addEventListener('click', handleGlobalLogout);
            btn.dataset.logoutBound = 'true';
        });
    }

    // Global event delegation for logout buttons anywhere in DOM
    document.addEventListener('click', (e) => {
        const logoutTarget = e.target.closest('#btnLogout, #logoutBtn, #tempLogoutBtn, #sidebarLogoutBtn, #nav-logout, .mobile-logout-btn, .sidebar-logout-btn, .dropdown-item-danger, a[href="#logout"]');
        if (logoutTarget) {
            handleGlobalLogout(e);
        }
    });

    // -------------------------------------------------------------
    // POPUP MODAL TRUNG TÂM THÔNG BÁO (MODAL THEO CHUẨN AGENTS.MD)
    // -------------------------------------------------------------
    let selectedNotice=null,noticeFilter='all';
    function renderNoticeModal(){
        const modal=document.getElementById('notificationsCloudModal');if(!modal)return;
        if(noticeState.owner!==getCurrentUser()?.id){modal.querySelector('[data-close-modal]')?.click();return;}
        if(noticeState.error){modal.querySelector('#noticeCloudError').textContent='Không thể tải thông báo. Vui lòng mở lại để thử.';modal.querySelector('#noticeCloudRows').replaceChildren();modal.querySelector('#noticeCloudDetail').replaceChildren();return;}
        modal.querySelector('#noticeCloudError').textContent='';
        let navigation=modal.querySelector('#noticePages');
        if(!navigation){navigation=document.createElement('nav');navigation.id='noticePages';navigation.style.cssText='display:flex;justify-content:center;gap:12px';modal.querySelector('#noticeCloudRows').after(navigation);}
        const pages=noticePagingEnabled?Math.max(1,Math.ceil(noticeState.total/10)):1;
        navigation.innerHTML=pages<=1?'':`<button type="button" data-page-back ${noticeState.page===1?'disabled':''}>&lt;</button><span>${noticeState.page} / ${pages}</span><button type="button" data-page-next ${noticeState.page===pages?'disabled':''}>&gt;</button>`;
        const move=async delta=>{if(noticeState.pending)return;noticeState.page+=delta;selectedNotice=null;await refreshNotices();};
        navigation.querySelector('[data-page-back]')?.addEventListener('click',()=>move(-1));navigation.querySelector('[data-page-next]')?.addEventListener('click',()=>move(1));
        const rows=noticeState.rows.filter(n=>noticeFilter!=='unread'||!n.read_at);
        modal.querySelector('#noticeCloudRows').innerHTML=rows.map(n=>`<button type="button" style="width:100%;text-align:left;background:transparent;border:0;padding:12px;display:grid;gap:4px;border-radius:9px" class="notification-item-dropdown ${n.read_at?'':'unread'}" data-notice="${escapeHtml(n.id)}"><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(new Date(n.sent_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}))}</span></button>`).join('') || '<p>Chưa có thông báo phù hợp.</p>';
        modal.querySelectorAll('[data-notice]').forEach(button=>button.onclick=async()=>{selectedNotice=button.dataset.notice;try{await markNoticeRead(selectedNotice);}catch(error){noticeError(error.message);}renderNoticeModal();});
        const row=noticeState.rows.find(n=>n.id===selectedNotice),detail=modal.querySelector('#noticeCloudDetail');
        detail.innerHTML=row?`<h4>${escapeHtml(row.title)}</h4><p style="white-space:pre-wrap">${escapeHtml(row.content)}</p><a href="${noticeLink(row)}">Mở nội dung liên quan</a>`:'<p>Chọn thông báo để xem nội dung.</p>';
    }
    async function openAllNotificationsModal(initialNoti=null){
        if(noticeState.pending)await noticeState.pending;
        noticeState.page=1;noticeState.onlyUnread=false;
        const owner=getCurrentUser()?.id;
        await refreshNotices();
        if(!owner || owner!==getCurrentUser()?.id)return;
        document.getElementById('notificationsCloudModal')?.querySelector('[data-close-modal]')?.click();
        const modal=document.createElement('div');modal.id='notificationsCloudModal';modal.style.cssText='position:fixed;inset:0;background:rgba(20,40,30,.4);display:flex;align-items:center;justify-content:center;z-index:10000;padding:16px;';
        modal.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="noticeCloudTitle" style="background:white;border-radius:9px;width:760px;max-width:95vw;max-height:90vh;overflow:auto;padding:26px 30px"><div style="display:flex;justify-content:space-between"><h3 id="noticeCloudTitle">Thông báo</h3><button type="button" data-close-modal="notificationsCloudModal">Đóng</button></div><p id="noticeCloudError" role="alert" style="color:#DC2626"></p><div style="display:flex;gap:12px;flex-wrap:wrap"><button type="button" data-notice-filter="all">Tất cả</button><button type="button" data-notice-filter="unread">Chưa đọc</button><button type="button" id="noticeCloudMarkAll">Đọc tất cả</button></div><div id="noticeCloudRows"></div><div id="noticeCloudDetail"></div><button type="button" data-close-modal="notificationsCloudModal">Để sau</button></section>';
        const previous=document.activeElement,overflow=document.body.style.overflow,close=()=>{modal.remove();document.body.style.overflow=overflow;document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus();},key=event=>{if(event.key==='Escape')close();};
        modal.onclick=event=>{if(event.target===modal || event.target.closest('[data-close-modal]') || event.target.closest('#noticeCloudDetail a'))close();};document.addEventListener('keydown',key);document.body.append(modal);document.body.style.overflow='hidden';modal.querySelectorAll('button').forEach(button=>{button.classList.add('btn','btn-sm','btn-outline-success');button.style.borderRadius='9px';});modal.querySelector('button').focus();
        selectedNotice=initialNoti?.id || null;noticeFilter='all';
        modal.querySelectorAll('[data-notice-filter]').forEach(button=>button.onclick=async()=>{if(noticeState.pending)return;noticeFilter=button.dataset.noticeFilter;noticeState.onlyUnread=noticeFilter==='unread';noticeState.page=1;selectedNotice=null;await refreshNotices();});
        modal.querySelector('#noticeCloudMarkAll').onclick=async event=>{const button=event.target;button.disabled=true;try{await markNoticeRead(null);}catch(error){noticeError(error.message);}finally{button.disabled=false;}};
        if(!modal.isConnected)return;renderNoticeModal();
        if(selectedNotice)try{await markNoticeRead(selectedNotice);}catch(error){noticeError(error.message);}
    }
    window.openAllNotificationsModal=openAllNotificationsModal;

    function setupMobileAccountToggle() {
        const accountGroup = document.querySelector('.mobile-account-group');
        const toggle = document.querySelector('.mobile-account-toggle');
        if (!accountGroup || !toggle) return;

        if (toggle.dataset.bound === '1') return;
        toggle.dataset.bound = '1';

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = accountGroup.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(isOpen));
            console.log('Toggle clicked, isOpen:', isOpen);
        });
    }


    
    // -------------------------------------------------------------
    // TÍCH HỢP DẢI THÔNG BÁO TOP-BAR TỪ PHÂN HỆ CẤU HÌNH ADMIN (GIAI ĐOẠN 2)
    // -------------------------------------------------------------
    let noticeLoading=false,noticeAttempts=0;
    async function renderDynamicTopBarNotice() {
        if(noticeLoading)return;
        noticeLoading=true;
        try {
            const client=window.getSupabaseClient?.();
            if(!client){if(noticeAttempts++<10)setTimeout(renderDynamicTopBarNotice,500);return;}
            noticeAttempts=0;
            const {data:notices,error}=await client.rpc('get_public_site_notices');
            if(error)throw error;
            if(!Array.isArray(notices))throw new Error('Invalid public notice response');
            const activePopup=notices.find(n=>String(n.type).toLowerCase()==='popup');
            if(activePopup&&!sessionStorage.getItem('pawpal_notice_dismissed_'+activePopup.id)&&!document.getElementById('pawpal-site-popup')){
                const overlay=document.createElement('div');overlay.id='pawpal-site-popup';overlay.style.cssText='position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,.3);display:grid;place-items:center;padding:20px';
                const card=document.createElement('div');card.style.cssText='background:white;border-radius:9px;padding:26px 30px;max-width:540px;width:100%;color:#203A2C';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','Thông báo');
                const text=document.createElement('p');text.textContent=activePopup.content;
                const close=document.createElement('button');close.type='button';close.textContent='Đóng';
                const dismiss=()=>{sessionStorage.setItem('pawpal_notice_dismissed_'+activePopup.id,'1');overlay.remove();document.removeEventListener('keydown',key);};
                const key=event=>{if(event.key==='Escape')dismiss();};close.onclick=dismiss;overlay.onclick=event=>{if(event.target===overlay)dismiss();};document.addEventListener('keydown',key);
                card.append(text,close);overlay.append(card);document.body.append(overlay);close.focus();
            }
            const activeTopNotice = notices.find(n => String(n.type).toLowerCase().replace('-','')==='topbar');
            
            // Tìm hoặc tạo container Topbar
            let topBarEl = document.getElementById('pawpal-public-topbar-notice');
            if (!activeTopNotice) {
                if (topBarEl) topBarEl.remove();
                return;
            }

            if (!topBarEl) {
                topBarEl = document.createElement('div');
                topBarEl.id = 'pawpal-public-topbar-notice';
                topBarEl.style.cssText = `
                    background-color: #236B48;
                    color: #FFFFFF;
                    font-size: 13px;
                    font-weight: 500;
                    text-align: center;
                    padding: 8px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    z-index: 1050;
                    position: relative;
                    letter-spacing: 0.1px;
                `;
                const siteHeader = document.getElementById('mainHeader') || document.querySelector('.main-header') || document.getElementById('site-header') || document.body;
                if (siteHeader === document.body) {
                    document.body.insertBefore(topBarEl, document.body.firstChild);
                } else {
                    siteHeader.parentNode.insertBefore(topBarEl, siteHeader);
                }
            }

            const safeContent = escapeHtml(activeTopNotice.content || '');
            const rawNoticeLink = activeTopNotice.link;
            const safeNoticeLink = rawNoticeLink && rawNoticeLink !== '#' ? sanitizeHref(rawNoticeLink) : '';
            const noticeBodyHtml = safeNoticeLink && safeNoticeLink !== '#'
                ? `<a href="${safeNoticeLink}" style="color: #FFFFFF; text-decoration: underline; font-weight: 600;">${safeContent}</a>`
                : `<span>${safeContent}</span>`;

            topBarEl.innerHTML = `
                ${noticeBodyHtml}
                <button type="button" id="btnCloseTopBarNotice" style="background: none; border: none; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 14px; padding: 0 4px; line-height: 1;" title="Đóng">✕</button>
            `;

            document.getElementById('btnCloseTopBarNotice')?.addEventListener('click', () => {
                topBarEl.style.display = 'none';
            });
        } catch (e) {
            document.getElementById('pawpal-public-topbar-notice')?.remove();
            console.warn('Lỗi hiển thị topbar notice:', e);
        } finally {
            noticeLoading=false;
        }
    }

    // -------------------------------------------------------------
    // TÌM KIẾM TRÊN HEADER (DỊCH VỤ HOẶC SẢN PHẨM)
    // -------------------------------------------------------------
    function setupHeaderSearch() {
        document.querySelectorAll('.search-bar').forEach(bar => {
            if (bar.dataset.searchBound === 'true') return;

            const input = bar.querySelector('input');
            const icon = bar.querySelector('.search-icon');
            if (!input) return;
            bar.dataset.searchBound = 'true';

            const executeSearch = (event) => {
                event?.preventDefault?.();
                event?.stopPropagation?.();
                const query = input.value.trim();
                if (!query) return;
                const keyword = query.normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
                const serviceKeywords = new Set([
                    'taxi', 'pet taxi', 'dua ruoc',
                    'spa', 'pet spa',
                    'hotel', 'pet hotel', 'khach san', 'luu tru'
                ]);
                const destination = serviceKeywords.has(keyword) ? '/services' : '/shop';
                window.location.href = `${destination}?search=${encodeURIComponent(query)}`;
            };

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    executeSearch(e);
                }
            });
            const form = input.closest('form');
            if (form) form.addEventListener('submit', executeSearch);

            if (icon) {
                icon.style.cursor = 'pointer';
                icon.style.pointerEvents = 'auto';
                icon.addEventListener('click', executeSearch);
            }
        });
    }

    // -------------------------------------------------------------
    // ĐIỀU KHIỂN MENU MOBILE DRAWER (HAMBURGER BUTTON)
    // -------------------------------------------------------------
    function initMobileNavigation() {
        const toggleBtn = document.getElementById('mobileNavToggle');
        const nav = document.getElementById('primaryNavigation');
        if (!toggleBtn || !nav) return;

        if (toggleBtn.dataset.mobileNavReady === 'true' && nav.dataset.mobileNavReady === 'true') {
            return;
        }

        let mobileOverlay = null;
        let previousOverflow = null;
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'mobile-nav-close';
        closeBtn.setAttribute('aria-label', 'Đóng menu');
        closeBtn.textContent = 'Đóng';
        closeBtn.addEventListener('click', closeDrawer);
        nav.prepend(closeBtn);
        nav.setAttribute('data-lenis-prevent', '');
        function createOverlay() {
            if (mobileOverlay) return;
            mobileOverlay = document.createElement('div');
            mobileOverlay.className = 'mobile-nav-overlay';
            mobileOverlay.style.position = 'fixed';
            mobileOverlay.style.inset = '0';
            mobileOverlay.style.background = 'rgba(0,0,0,0.45)';
            mobileOverlay.style.zIndex = '9995';
            mobileOverlay.style.opacity = '0';
            mobileOverlay.style.transition = 'opacity 220ms ease';
            document.body.appendChild(mobileOverlay);
            mobileOverlay.addEventListener('click', closeDrawer);
            requestAnimationFrame(() => {
                if (mobileOverlay) mobileOverlay.style.opacity = '1';
            });
        }

        function removeOverlay() {
            if (!mobileOverlay) return;
            const closingOverlay = mobileOverlay;
            mobileOverlay = null;
            closingOverlay.style.opacity = '0';
            closingOverlay.style.pointerEvents = 'none';
            setTimeout(() => {
                closingOverlay.remove();
            }, 240);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDrawer();
        });

        // Đóng menu khi click ra ngoài drawer
        document.addEventListener('click', (e) => {
            if (!nav.classList.contains('show')) return;
            if (nav.contains(e.target) || toggleBtn.contains(e.target)) return;
            closeDrawer();
        });

        let wasMobile = window.innerWidth < 1250;
        window.addEventListener('resize', () => {
            const isMobile = window.innerWidth < 1250;
            if (isMobile !== wasMobile) {
                closeDrawer();
            }
            wasMobile = isMobile;
        });

        nav.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        nav.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
        nav.querySelectorAll('.dropdown-toggle').forEach(dt => {
            dt.setAttribute('aria-expanded', 'false');
            const svg = dt.querySelector('svg');
            if (svg) svg.style.transform = 'rotate(0deg)';
        });

        function openDrawer() {
            if (nav.classList.contains('show')) return;
            previousOverflow = document.body.style.overflow;
            nav.classList.add('show');
            const header = document.querySelector('.main-header');
            if (header) header.classList.add('nav-open');
            toggleBtn.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            createOverlay();
            if (typeof setupMobileAccountToggle === 'function') setupMobileAccountToggle();
            if (typeof setupLogoutButtons === 'function') setupLogoutButtons();
        }

        function closeDrawer() {
            if (!nav.classList.contains('show')) return;
            nav.classList.remove('show');
            const header = document.querySelector('.main-header');
            if (header) header.classList.remove('nav-open');
            toggleBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = previousOverflow ?? '';
            previousOverflow = null;
            removeOverlay();
            nav.querySelectorAll('.dropdown-toggle svg').forEach(svg => svg.style.transform = 'rotate(0deg)');
            nav.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
            nav.querySelectorAll('.dropdown-toggle').forEach(dt => {
                dt.classList.remove('show');
                dt.setAttribute('aria-expanded', 'false');
            });
        }

        toggleBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = nav.classList.contains('show');
            if (isOpen) {
                closeDrawer();
            } else {
                openDrawer();
            }
        };

        nav.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (window.innerWidth < 1250 && link && nav.contains(link) && !link.classList.contains('dropdown-toggle')) {
                closeDrawer();
            }
        });

        const dropdownToggles = nav.querySelectorAll('.dropdown-toggle');
        dropdownToggles.forEach(dt => {
            if (dt.dataset.mobileDropdownBound === 'true') return;
            
            dt.addEventListener('click', (e) => {
                if (window.innerWidth < 1250) {
                    e.preventDefault();
                    e.stopPropagation();
                    const parentItem = dt.closest('.nav-item.dropdown') || dt.parentElement;
                    const menu = parentItem ? parentItem.querySelector('.dropdown-menu') : dt.nextElementSibling;
                    if (menu) {
                        const isCurrentlyOpen = menu.classList.contains('show');
                        // Đóng các dropdown khác để tránh tràn màn hình mobile
                        nav.querySelectorAll('.dropdown-menu.show').forEach(m => {
                            if (m !== menu) m.classList.remove('show');
                        });
                        nav.querySelectorAll('.dropdown-toggle').forEach(t => {
                            if (t !== dt) {
                                t.classList.remove('show');
                                t.setAttribute('aria-expanded', 'false');
                                const s = t.querySelector('svg');
                                if (s) s.style.transform = 'rotate(0deg)';
                            }
                        });

                        menu.classList.toggle('show', !isCurrentlyOpen);
                        dt.classList.toggle('show', !isCurrentlyOpen);
                        dt.setAttribute('aria-expanded', String(!isCurrentlyOpen));
                        const svg = dt.querySelector('svg');
                        if (svg) svg.style.transform = !isCurrentlyOpen ? 'rotate(180deg)' : 'rotate(0deg)';
                    }
                }
            });
            
            dt.dataset.mobileDropdownBound = 'true';
        });

        if (typeof setupMobileAccountToggle === 'function') setupMobileAccountToggle();
        if (typeof setupLogoutButtons === 'function') setupLogoutButtons();

        toggleBtn.dataset.mobileNavReady = 'true';
        nav.dataset.mobileNavReady = 'true';
    }

    window.initMobileNavigation = initMobileNavigation;
    window.initHeaderMobileNavigation = initMobileNavigation;

    // Chạy khi header được chèn vào HTML
    document.addEventListener('headerInjected', () => {
        updateHeaderAuth();
        setupHeaderSearch();
        renderDynamicTopBarNotice();
        initMobileNavigation();
    });
    
    // Also run if header already exists (for pages that don't use components.js)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            updateHeaderAuth();
            setupHeaderSearch();
            renderDynamicTopBarNotice();
            initMobileNavigation();
        });
    } else {
        updateHeaderAuth();
        setupHeaderSearch();
        renderDynamicTopBarNotice();
        initMobileNavigation();
    }
    
    // Lắng nghe thay đổi trạng thái đăng nhập, giỏ hàng và cấu hình cập nhật
    document.addEventListener('auth_state_changed', updateHeaderAuth);
    document.addEventListener('cart_updated', () => {
        if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
    });
    window.addEventListener('pawpal_settings_updated', renderDynamicTopBarNotice);
    window.addEventListener('storage', (e) => {
        if (e.key === 'pawpal_notifications' || e.key === 'pawpal_current_user' || e.key === null) {
            window.updateNotificationBadge();
        }
        if (e.key === 'pawpal_settings_notices') {
            renderDynamicTopBarNotice();
        }
        if (e.key === 'pawpal_cart' || e.key === 'pawpal_guest_cart_v1') {
            if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
        }
    });
    document.addEventListener('guest_cart_updated',()=>window.updateCartBadge?.());
    window.addEventListener('focus', () => {
        window.updateNotificationBadge();
        if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
    });
})();
