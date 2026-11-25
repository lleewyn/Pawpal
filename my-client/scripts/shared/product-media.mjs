import { mediaSource, loadMediaSource } from './media-source.mjs';

// This editor only stages changes. Existing product references change in the product-save transaction.
export function createProductMediaEditor({ root, db, fetchImpl = fetch, purpose = 'product_image', imageLabel = 'Ảnh sản phẩm',maxFiles=10 }) {
    let sources = [], files = [], releases = [], pending = [], generation = 0, busy = false, productId, variantId, existing, closed = false;
    const el = selector => root.querySelector(selector);
    const token = async () => {
        const { data, error } = await db.auth.getSession();
        if (error || !data.session?.access_token) throw Error('Vui lòng đăng nhập lại để lưu ảnh.');
        return data.session.access_token;
    };
    async function api(action, body, query = '') {
        const multipart = body instanceof FormData;
        const response = await fetchImpl('/api/media?action=' + action + query, {
            method: 'POST', headers: { Authorization: 'Bearer ' + await token(), ...(!multipart ? { 'Content-Type': 'application/json' } : {}) },
            body: multipart ? body : JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw Object.assign(Error(result.code==='MEDIA_INVALID_IMAGE'?'Nội dung ảnh không khớp định dạng hoặc ảnh bị lỗi. Vui lòng chọn lại ảnh.':response.status === 503 ? 'Chức năng tải ảnh chưa được bật. Bạn có thể dùng đường dẫn ảnh.' : 'Không thể lưu ảnh. Kiểm tra quyền, dung lượng và thử lại.'),{status:response.status});
        return result;
    }
    function release() { releases.forEach(fn => fn()); releases = []; }
    async function cancel(items) { await Promise.allSettled(items.map(item => api('cancel', { session_id: item.session_id }))); }
    const mode = () => el('[data-media-mode]:checked').value;
    function values() {
        return mode() === 'url' ? el('[data-media-links]').value.split(',').map(url => url.trim()).filter(Boolean).map(url => ({ url })) : sources;
    }
    function controls() {
        el('[data-media-links]').hidden = mode() !== 'url';
        el('[data-media-upload]').hidden = mode() !== 'upload';
        el('[data-media-pick]').disabled = busy;
        root.querySelectorAll('input').forEach(input => { input.disabled = busy; });
    }
    async function render() {
        const current = ++generation; release(); controls();
        const gallery = el('[data-media-gallery]'); gallery.replaceChildren();
        const list = [...values(), ...(mode()==='upload'?files.map(file => ({ file })):[])];
        if (!list.length) { gallery.textContent = 'Chưa có ảnh.'; return; }
        for (const [index, source] of list.entries()) {
            const figure = document.createElement('div'); figure.style.cssText = 'width:90px;display:flex;flex-direction:column;gap:4px';
            const image = document.createElement('img'); image.alt = imageLabel + ' ' + (index + 1); image.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:9px';
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'admin-btn'; remove.textContent = 'Xóa'; remove.disabled = busy;
            remove.onclick = () => {
                if (busy) return;
                if (mode() === 'url') { const next = values(); next.splice(index, 1); el('[data-media-links]').value = next.map(item => item.url).join(', '); }
                else if (index < sources.length) { const removed = sources.splice(index, 1)[0]; const item = pending.find(item => item.asset_id === removed.asset_id); if (item) { pending = pending.filter(p => p !== item); void cancel([item]); } }
                else files.splice(index - sources.length, 1);
                void render();
            };
            figure.append(image, remove); gallery.append(figure);
            try {
                let loaded;
                if (source.file) { const url = URL.createObjectURL(source.file); loaded = { url, release: () => URL.revokeObjectURL(url) }; }
                else loaded = await loadMediaSource(mediaSource({ media_asset_id: source.asset_id, url: source.url }), source.asset_id ? await token() : null, { fetchImpl });
                if (current !== generation) { loaded.release(); return; }
                releases.push(loaded.release); image.src = loaded.url;
            } catch { image.alt = 'Không tải được ảnh'; }
        }
    }
    root.querySelectorAll('[data-media-mode]').forEach(input => input.addEventListener('change', () => {
        // Changing source only affects the draft. Old attached files remain until Save succeeds.
        void render();
    }));
    el('[data-media-links]').addEventListener('input', () => { void render(); });
    el('[data-media-pick]').addEventListener('click', () => el('[data-media-files]').click());
    el('[data-media-files]').addEventListener('change', event => {
        const selected = [...event.target.files]; event.target.value = '';
        if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 3145728) || sources.length + files.length + selected.length > maxFiles) {
            el('[data-media-status]').textContent = 'Chọn tối đa '+maxFiles+' ảnh JPEG, PNG hoặc WebP, mỗi ảnh không quá 3 MiB.'; return;
        }
        files.push(...selected); el('[data-media-status]').textContent = ''; void render();
    });
    return {
        reset({ id, variant = null, isExisting = false, media = [] }) {
            if (busy) throw Error('Đang lưu ảnh.');
            void cancel(pending); pending = []; files = []; productId = id; variantId = variant; existing = isExisting;
            closed = false;
            const hasAssets = media.some(item => item.media_asset_id);
            sources = hasAssets ? media.map(item => item.media_asset_id ? { asset_id: item.media_asset_id } : { url: item.image_url }) : [];
            el('[data-media-links]').value = media.filter(item => item.image_url).map(item => item.image_url).join(', ');
            // Product editor writes one source mode for its gallery; legacy links remain editable.
            el('[data-media-mode][value="' + (sources.length ? 'upload' : 'url') + '"]').checked = true;
            el('[data-media-status]').textContent = ''; void render();
        },
        async prepare() {
            if (busy) throw Error('Đang lưu ảnh.');
            busy = true; controls();
            try {
                if (mode() === 'url') {
                    const list = values(); if (list.length > maxFiles) throw Error('Chọn tối đa '+maxFiles+' ảnh.');
                    list.forEach(item => mediaSource(item)); return list;
                }
                while (files.length) {
                    const file = files[0];
                    el('[data-media-status]').textContent = 'Đang tải ảnh ' + (sources.length + 1) + '…';
                    let item = pending.find(item => item.file === file);
                    if (!item) {
                        const session = await api('prepare', { request_id: crypto.randomUUID(), purpose, ...(['banner_image','blog_thumbnail'].includes(purpose)?{content_id:productId}:{...(variantId ? {variant_id:variantId} : {}), ...(existing ? { [purpose==='service_image'?'service_id':'product_id']: productId } : { draft_id: productId })}), size_bytes: file.size, mime_type: file.type, name: file.name });
                        item = { session_id: session.session_id, file }; pending.push(item);
                    }
                    const form = new FormData(); form.append('file', file);
                    let uploaded;
                    try{uploaded=await api('upload', form, '&session=' + encodeURIComponent(item.session_id));}
                    catch(error){if([400,409,413].includes(error.status)){pending=pending.filter(p=>p!==item);void cancel([item]);}throw error;}
                    item.asset_id = uploaded.asset_id; sources.push({ asset_id: uploaded.asset_id }); files.shift();
                    if (closed) throw Error('Đã hủy thay đổi ảnh.');
                }
                el('[data-media-status]').textContent = ''; return [...sources];
            } catch(error){el('[data-media-status]').textContent=error.message;throw error;}
            finally { busy = false; if (closed) { void cancel(pending); pending = []; } else void render(); }
        },
        newFileCount() { return mode()==='upload'?files.length+pending.filter(item=>item.asset_id&&sources.some(source=>source.asset_id===item.asset_id)).length:0; },
        saved() { if(mode()==='url')void cancel(pending);pending = []; },
        async close() { closed = true; release(); generation++; if (!busy) { await cancel(pending); pending = []; } }
    };
}
