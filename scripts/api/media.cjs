'use strict';
const { createClient } = require('@supabase/supabase-js');
const { createGridfsStore } = require('./media_gridfs.cjs');
const { MIME, mediaError, readJson, readImageUpload, verifyImage } = require('./media_files.cjs');
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const optionalId = value => value === undefined || value === null || uuid(value);

function createMediaHandler({ env = process.env, clientFactory = createClient, store = createGridfsStore(), inspectImage = verifyImage, chat = false } = {}) {
    function clients(token) {
        const url = env.PAWPAL_MEDIA_SUPABASE_URL || env.SUPABASE_URL;
        const anon = env.PAWPAL_MEDIA_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
        const service = env.PAWPAL_MEDIA_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
        if (!/^https:\/\/[^/]+\/?$/.test(url || '') || !anon || !service) throw mediaError('MEDIA_NOT_CONFIGURED', 503);
        const auth = { persistSession: false, autoRefreshToken: false };
        return {
            caller: clientFactory(url, anon, { auth, global: { headers: token ? { Authorization: 'Bearer ' + token } : {} } }),
            server: clientFactory(url, service, { auth })
        };
    }
    async function rpc(client, name, args) {
        const result = await client.rpc(name, args);
        if (!result.error) return result.data;
        const status = ({ '42501': 403, PT409: 409, '22023': 400, '22P02': 400, '23514': 400, '54000': 429, '55000': 503 })[result.error.code] || 503;
        throw mediaError('MEDIA_REQUEST_FAILED', status);
    }
    return async function handle(req, res) {
        let claim = null, actor = null, server = null, committed = false, guestHash = null;
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        try {
            const url = new URL(req.url, 'https://pawpal.invalid');
            const action = url.searchParams.get('action') || 'read';
            const allowedQuery = new Set(['action', 'id', 'session']);
            if ([...url.searchParams.keys()].some(key => !allowedQuery.has(key) || url.searchParams.getAll(key).length !== 1)) throw mediaError('MEDIA_INVALID_REQUEST');
            if (!['read', 'prepare', 'upload', 'cancel'].includes(action)) throw mediaError('MEDIA_NOT_FOUND', 404);
            if (req.method !== (action === 'read' ? 'GET' : 'POST')) {
                res.setHeader('Allow', action === 'read' ? 'GET' : 'POST'); throw mediaError('MEDIA_METHOD_NOT_ALLOWED', 405);
            }
            if (action !== 'read' && env.MEDIA_UPLOAD_ENABLED !== 'true') throw mediaError('MEDIA_DISABLED', 503);
            if (action !== 'read' && req.headers.origin) {
                const origin = new URL(req.headers.origin);
                const allowed = (env.MEDIA_ALLOWED_ORIGINS || '').split(',').filter(Boolean);
                if (origin.host !== req.headers.host && !allowed.includes(origin.origin)) throw mediaError('MEDIA_FORBIDDEN', 403);
            }
            const authorization = req.headers.authorization;
            if (authorization !== undefined && (typeof authorization !== 'string' || authorization.length > 8192 || !/^Bearer \S+$/i.test(authorization))) throw mediaError('MEDIA_UNAUTHORIZED', 401);
            const token = authorization?.slice(7);
            const guestToken = req.headers['x-pawpal-chat-session'];
            if(chat && !token){
                if(typeof guestToken!=='string'||guestToken.length<32||guestToken.length>512) throw mediaError('MEDIA_UNAUTHORIZED',401);
                guestHash=require('node:crypto').createHash('sha256').update(guestToken).digest('hex');
            }
            if (action !== 'read' && !token && !guestHash) throw mediaError('MEDIA_UNAUTHORIZED', 401);
            const connected = clients(token); server = connected.server;
            const caller = connected.caller;
            if (token) {
                const user = await caller.auth.getUser(token);
                if (user.error || !uuid(user.data?.user?.id)) throw mediaError('MEDIA_UNAUTHORIZED', 401);
                actor = user.data.user.id;
            }
            const chatArgs=()=>({p_actor:actor,p_guest_hash:guestHash});
            if (action === 'prepare') {
                const body = await readJson(req);
                if (!chat && ['customer_pet_avatar','customer_pet_vaccine','customer_avatar'].includes(body.purpose)) {
                    if (Object.keys(body).some(key=>!['request_id','purpose','pet_id','size_bytes','mime_type','name'].includes(key))
                        || !uuid(body.request_id) || !uuid(body.pet_id) || !Number.isSafeInteger(body.size_bytes)
                        || body.size_bytes<1 || body.size_bytes>3145728 || !Object.values(MIME).includes(body.mime_type)
                        || typeof body.name!=='string' || !body.name.trim() || body.name.length>200 || /[\x00-\x1f]/.test(body.name)) throw mediaError('MEDIA_INVALID_REQUEST');
                    const result=await rpc(caller,body.purpose==='customer_avatar'?'prepare_customer_avatar_upload':'prepare_customer_pet_media_upload',{p_request:body.request_id,p_pet:body.pet_id,p_kind:body.purpose,p_size:body.size_bytes,p_mime:body.mime_type,p_name:body.name});
                    return res.status(200).json({ok:true,...result});
                }
                if(chat){
                    const fields=['request_id','conversation_id','message_id','size_bytes','mime_type','name'];
                    if(Object.keys(body).some(k=>!fields.includes(k))||![body.request_id,body.conversation_id,body.message_id].every(uuid)||!Number.isSafeInteger(body.size_bytes)||body.size_bytes<1||body.size_bytes>3145728||!Object.values(MIME).includes(body.mime_type)||typeof body.name!=='string'||!body.name.trim()||body.name.length>200||/[\x00-\x1f]/.test(body.name))throw mediaError('MEDIA_INVALID_REQUEST');
                    const result=await rpc(server,'prepare_chat_media_upload',{...chatArgs(),p_request:body.request_id,p_conversation:body.conversation_id,p_message:body.message_id,p_size:body.size_bytes,p_mime:body.mime_type,p_name:body.name});
                    return res.status(200).json({ok:true,...result});
                }
                const allowed = ['request_id', 'purpose', 'product_id', 'appointment_id', 'draft_id', 'variant_id', 'service_id', 'record_id', 'adjustment_id', 'pet_id', 'target_id', 'context_id', 'review_kind', 'content_id', 'size_bytes', 'mime_type', 'name'];
                const evidence = ['ticket_image','return_image'].includes(body.purpose);
                const review=body.purpose==='review_image';
                const content=['banner_image','blog_thumbnail'].includes(body.purpose);
                if (Object.keys(body).some(key => !allowed.includes(key)) || !uuid(body.request_id) ||
                    !['product_image', 'care_log_image', 'product_variant_image','service_image','intake_image','handover_image','adjustment_image','pet_avatar','ticket_image','return_image','review_image','banner_image','blog_thumbnail'].includes(body.purpose) || ![body.product_id, body.appointment_id, body.draft_id, body.variant_id,body.service_id,body.record_id,body.adjustment_id,body.pet_id,body.target_id,body.context_id,body.content_id].every(optionalId) ||
                    (content ? !uuid(body.content_id)||[body.product_id,body.appointment_id,body.draft_id,body.variant_id,body.service_id,body.record_id,body.adjustment_id,body.pet_id,body.target_id,body.context_id].some(x=>x!=null) : body.content_id!=null) ||
                    (evidence||review ? !uuid(body.target_id)||!uuid(body.context_id)||[body.product_id,body.appointment_id,body.draft_id,body.variant_id,body.service_id,body.record_id,body.adjustment_id,body.pet_id].some(x=>x!=null) : body.target_id!=null||body.context_id!=null) ||
                    (review ? !['sales','service'].includes(body.review_kind) : body.review_kind!=null) ||
                    (body.purpose==='pet_avatar' ? !uuid(body.pet_id)||!!body.appointment_id||!!body.product_id||!!body.draft_id||!!body.variant_id||!!body.service_id||!!body.record_id||!!body.adjustment_id : body.pet_id!=null) ||
                    (body.purpose==='adjustment_image' ? !uuid(body.adjustment_id)||!uuid(body.appointment_id)||!!body.product_id||!!body.draft_id||!!body.variant_id||!!body.service_id||!!body.record_id : body.adjustment_id!=null) ||
                    (['intake_image','handover_image'].includes(body.purpose) ? !uuid(body.record_id)||!uuid(body.appointment_id)||!!body.product_id||!!body.draft_id||!!body.variant_id||!!body.service_id : body.record_id!=null) ||
                    (body.purpose==='service_image' ? !!body.product_id||!!body.appointment_id||!!body.variant_id||!!body.service_id===!!body.draft_id : body.service_id!=null) ||
                    (body.purpose==='product_variant_image' ? !uuid(body.variant_id)||!!body.appointment_id : body.variant_id!=null) ||
                    !Number.isSafeInteger(body.size_bytes) || body.size_bytes < 1 || body.size_bytes > 3145728 || !Object.values(MIME).includes(body.mime_type) ||
                    typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200 || /[\x00-\x1f]/.test(body.name)) throw mediaError('MEDIA_INVALID_REQUEST');
                const args = { p_request: body.request_id, p_purpose: body.purpose,
                    p_product: body.product_id || null, p_appointment: body.appointment_id || null, p_draft: body.draft_id || null,
                    p_size: body.size_bytes, p_mime: body.mime_type, p_name: body.name };
                if(body.purpose==='product_variant_image'){delete args.p_purpose;delete args.p_appointment;args.p_variant=body.variant_id;}
                if(body.purpose==='service_image'){delete args.p_purpose;delete args.p_product;delete args.p_appointment;args.p_service=body.service_id||null;}
                if(['intake_image','handover_image'].includes(body.purpose)){delete args.p_purpose;delete args.p_product;delete args.p_draft;args.p_record=body.record_id;}
                if(body.purpose==='adjustment_image'){delete args.p_purpose;delete args.p_product;delete args.p_draft;args.p_adjustment=body.adjustment_id;}
                if(body.purpose==='pet_avatar'){delete args.p_purpose;delete args.p_product;delete args.p_draft;delete args.p_appointment;args.p_pet=body.pet_id;}
                if(evidence||review){delete args.p_product;delete args.p_draft;delete args.p_appointment;args.p_target=body.target_id;args.p_context=body.context_id;}
                if(review){delete args.p_purpose;args.p_kind=body.review_kind;}
                if(content){delete args.p_product;delete args.p_draft;delete args.p_appointment;args.p_content=body.content_id;}
                const result = await rpc(caller,content?'prepare_content_media_upload':review?'prepare_review_media_upload':evidence?'prepare_evidence_media_upload':body.purpose==='pet_avatar'?'prepare_pet_media_upload':body.purpose==='adjustment_image'?'prepare_adjustment_media_upload':body.purpose==='handover_image'?'prepare_handover_media_upload':body.purpose==='intake_image'?'prepare_intake_media_upload':body.purpose==='service_image'?'prepare_service_media_upload':body.purpose==='product_variant_image'?'prepare_variant_media_upload':'prepare_media_upload',args);
                return res.status(200).json({ ok: true, ...result });
            }
            if (action === 'cancel') {
                const body = await readJson(req);
                if (Object.keys(body).length !== 1 || !uuid(body.session_id)) throw mediaError('MEDIA_INVALID_REQUEST');
                await rpc(chat?server:caller, chat?'cancel_chat_media_upload':'cancel_media_upload', { ...(chat?chatArgs():{}),p_session: body.session_id });
                return res.status(200).json({ ok: true });
            }
            if (action === 'upload') {
                const session = url.searchParams.get('session');
                if (!uuid(session)) throw mediaError('MEDIA_INVALID_REQUEST');
                claim = await rpc(chat?server:caller, chat?'claim_chat_media_upload':'claim_media_upload', { ...(chat?chatArgs():{}),p_session: session });
                if (claim?.state === 'verified' || claim?.state === 'attached') {
                    req.resume?.(); return res.status(200).json({ ok: true, asset_id: claim.asset_id });
                }
                if (claim?.state !== 'uploading' || !uuid(claim.lease) || claim.session_id !== session) throw mediaError('MEDIA_REQUEST_FAILED', 503);
                const file = await readImageUpload(req);
                if (file.bytes.length !== claim.size_bytes || file.mime !== claim.mime_type) throw mediaError('MEDIA_FILE_MISMATCH');
                const proof = await inspectImage(file.bytes, file.mime);
                await store.put(claim, file.bytes, proof);
                const id = await rpc(server, chat?'finish_chat_media_upload':'finish_media_upload', { ...(chat?chatArgs():{}),p_session: session, p_lease: claim.lease, p_actor: actor,
                    p_sha256: proof.sha256, p_width: proof.width, p_height: proof.height });
                committed = true;
                return res.status(201).json({ ok: true, asset_id: id });
            }
            const id = url.searchParams.get('id');
            if (!uuid(id)) throw mediaError('MEDIA_INVALID_REQUEST');
            const asset = await rpc(chat?server:caller, chat?'resolve_chat_media':'resolve_media_asset', { ...(chat?chatArgs():{}),p_asset: id });
            if (!asset) throw mediaError('MEDIA_NOT_FOUND', 404);
            if (!Object.values(MIME).includes(asset.mime_type) || !/^[a-f0-9]{64}$/.test(asset.sha256 || '')) throw mediaError('MEDIA_FILE_UNAVAILABLE', 503);
            const etag = '"' + asset.sha256 + '"';
            if (asset.public === true && asset.cache_public !== false) {
                res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60'); res.setHeader('ETag', etag);
                if (req.headers['if-none-match'] === etag) return res.status(304).end();
            }
            const bytes = await store.read(asset);
            res.setHeader('Content-Type', asset.mime_type); res.setHeader('Content-Length', bytes.length);
            return res.status(200).end(bytes);
        } catch (error) {
            if (claim?.state === 'uploading' && uuid(claim.lease) && (actor||guestHash) && server && !committed) {
                // Keep quota reserved and schedule reconciliation; never free quota before physical cleanup.
                try { await server.rpc(chat?'fail_chat_media_upload':'fail_media_upload', { ...(chat?{p_guest_hash:guestHash}:{}),p_session: claim.session_id, p_lease: claim.lease, p_actor: actor }); } catch {}
            }
            const known = typeof error.code === 'string' && /^MEDIA_[A-Z_]+$/.test(error.code) && Number.isInteger(error.status);
            res.setHeader('Cache-Control', 'private, no-store');
            return res.status(known ? error.status : 503).json({ ok: false, code: known ? error.code : 'MEDIA_UNAVAILABLE', message: 'Không thể xử lý ảnh. Kiểm tra quyền, dung lượng hoặc thử lại.' });
        }
    };
}
module.exports = { createMediaHandler, handle: createMediaHandler() };
