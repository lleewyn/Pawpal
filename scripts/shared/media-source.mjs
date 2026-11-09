const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// No eager network requests or DOM changes. Existing readers opt in per accepted UI flow.
export function mediaSource({ media_asset_id: asset, url } = {}) {
    if (asset && url) throw Error('media_multiple_sources');
    if (asset) {
        if (!UUID.test(asset)) throw Error('media_invalid_id');
        return { kind: 'asset', url: '/api/media?action=read&id=' + encodeURIComponent(asset) };
    }
    if (!url) return null;
    if (typeof url !== 'string' || /[<>"'`\x00-\x20]/.test(url)) throw Error('media_invalid_url');
    if (/^https?:\/\//i.test(url)) {
        const parsed = new URL(url);
        if (parsed.username || parsed.password) throw Error('media_invalid_url');
        return { kind: 'legacy', url };
    }
    const normalized = new URL(url.startsWith('assets/') ? '/' + url : url, 'https://pawpal.invalid');
    if (normalized.origin !== 'https://pawpal.invalid' || !normalized.pathname.startsWith('/assets/')) throw Error('media_invalid_url');
    return { kind: 'legacy', url: normalized.pathname + normalized.search };
}

export async function loadMediaSource(source, token, { fetchImpl = fetch, urlApi = URL } = {}) {
    if (!source || source.kind === 'legacy') return { url: source?.url || '', release() {} };
    if (source.kind !== 'asset' || !/^\/api\/media\?action=read&id=/.test(source.url)) throw Error('media_invalid_source');
    const response = await fetchImpl(source.url, { headers: token ? { Authorization: 'Bearer ' + token } : {}, cache: 'no-store' });
    if (!response.ok) throw Error('media_read_failed');
    const temporary = urlApi.createObjectURL(await response.blob());
    return { url: temporary, release() { urlApi.revokeObjectURL(temporary); } };
}
