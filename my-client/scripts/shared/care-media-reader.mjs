import { mediaSource, loadMediaSource } from './media-source.mjs';

// Each screen owns its temporary URLs; no private URLs are persisted into business records.
export function createCareMediaReader(db, { fetchImpl = fetch, urlApi = URL } = {}) {
    let releases = [], epoch = 0;
    const clear = () => { epoch++; releases.forEach(fn => fn()); releases = []; };
    return {
        clear,
        async read(rows) {
            const generation = ++epoch, next = [], result = [];
            const assets = rows.some(row => row.media_asset_id);
            let token;
            if (assets) {
                const session = await db.auth.getSession();
                if (session.error || !session.data.session?.access_token) { clear(); throw Error('care_media_auth_required'); }
                token = session.data.session.access_token;
            }
            try {
                // Bounded reads to avoid bursting connections on the Free tier.
                for (let offset = 0; offset < rows.length; offset += 3) {
                    const batch = await Promise.all(rows.slice(offset, offset + 3).map(async row => {
                        try {
                            const source = mediaSource({ media_asset_id: row.media_asset_id, url: row.media_url });
                            const loaded = await loadMediaSource(source, token, { fetchImpl, urlApi });
                            next.push(loaded.release); return { ...row, resolved_url: loaded.url };
                        } catch { return { ...row, resolved_url: '' }; }
                    }));
                    result.push(...batch);
                    if (generation !== epoch) return [];
                }
                releases.forEach(fn => fn()); releases = next.splice(0);
                return result;
            } finally { next.forEach(fn => fn()); }
        }
    };
}
