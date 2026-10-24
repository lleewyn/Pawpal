// pets.js - Phân hệ Quản lý Thú cưng Pawpal-er (Core Orchestrator)
(function() {
    'use strict';

    // Khởi tạo Namespace đồng bộ chuẩn
    const PawpalPets = window.PawpalPets = window.PawpalPets || {};
    window.PawpalPetsModule = PawpalPets;
    PawpalPets.subtabs = PawpalPets.subtabs || {};

    // Helper: Định dạng ngày giờ
    const formatDateTime = window.formatDateTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    const formatDate = window.formatDate || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    const formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    function isValidPetBirthDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!match) return false;

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date <= new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    }

    function toUnaccent(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
            .toLowerCase()
            .trim();
    }

    function matchSearch(sourceText, searchTerm) {
        if (!searchTerm) return true;
        if (!sourceText) return false;
        const src = String(sourceText).toLowerCase();
        const query = String(searchTerm).toLowerCase().trim();
        if (src.includes(query)) return true;
        return toUnaccent(sourceText).includes(toUnaccent(searchTerm));
    }

    // Helper: Toast Notification — styles live in pets.css.
    function showToast(message, type = 'info') {
        let container = document.getElementById('adminToastContainer');

        if (!container) {
            container = document.createElement('div');
            container.id = 'adminToastContainer';
            container.className = 'pet-toast-container';
            document.body.appendChild(container);
        } else {
            container.classList.add('pet-toast-container');
        }

        const supportedTypes = ['success', 'warning', 'danger', 'info'];
        const toastType = supportedTypes.includes(type) ? type : 'info';
        const toast = document.createElement('div');

        toast.className = `pet-toast pet-toast--${toastType}`;
        toast.textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('is-visible');
        });

        setTimeout(() => {
            toast.classList.remove('is-visible');
            toast.classList.add('is-leaving');
            setTimeout(() => toast.remove(), 200);
        }, 3000);
    }

    // Helper: Confirm Modal Thú cưng
    function showPetConfirmModal({ title = 'Xác nhận thao tác', message, onConfirm, onCancel, confirmText = 'Đồng ý', isDanger = false }) {
        const modal = document.getElementById('modalConfirmPetAction');
        const titleEl = document.getElementById('confirmPetActionTitle');
        const msgEl = document.getElementById('confirmPetActionMessage');
        const btnAccept = document.getElementById('btnAcceptPetConfirm');
        const btnCancel = document.getElementById('btnCancelPetConfirm');
        const btnClose = document.getElementById('btnCloseConfirmPetModal');

        if (!modal) {
            if (window.confirm(message)) {
                if (typeof onConfirm === 'function') onConfirm();
            } else {
                if (typeof onCancel === 'function') onCancel();
            }
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btnAccept) {
            btnAccept.textContent = confirmText;
            if (isDanger) {
                btnAccept.style.backgroundColor = '#DC2626';
                btnAccept.style.color = '#FFFFFF';
            } else {
                btnAccept.style.backgroundColor = '';
                btnAccept.style.color = '';
            }
        }

        const cleanup = () => {
            modal.classList.remove('open');
            modal.classList.remove('show');
            if (btnAccept) btnAccept.onclick = null;
            if (btnCancel) btnCancel.onclick = null;
            if (btnClose) btnClose.onclick = null;
        };

        if (btnAccept) {
            btnAccept.onclick = () => {
                cleanup();
                if (typeof onConfirm === 'function') onConfirm();
            };
        }

        if (btnCancel) {
            btnCancel.onclick = () => {
                cleanup();
                if (typeof onCancel === 'function') onCancel();
            };
        }

        if (btnClose) {
            btnClose.onclick = () => {
                cleanup();
                if (typeof onCancel === 'function') onCancel();
            };
        }

        modal.classList.add('open');
        modal.classList.add('show');
    }

    // Export helpers sang namespace
    PawpalPets.formatDateTime = formatDateTime;
    PawpalPets.formatDate = formatDate;
    PawpalPets.formatTime = formatTime;
    PawpalPets.isValidPetBirthDate = isValidPetBirthDate;
    PawpalPets.toUnaccent = toUnaccent;
    PawpalPets.matchSearch = matchSearch;
    PawpalPets.showToast = showToast;
    PawpalPets.showPetConfirmModal = showPetConfirmModal;

    // State chung
    PawpalPets.state = {
        petsData: {},
        customersData: {},
        isLoaded: false,
        loadError: null,
        appointments: [],
        careLogs: [],
        careLogsLoadStatus: 'idle',
        remindersLoadStatus: 'idle'
    };

    // Catalogs and histories have independent caches and in-flight request deduplication.
    const resourceCache = new Map();
    const resourceRequests = new Map();
    const resourceVersions = new Map();
    const resourceVersion = key => resourceVersions.get(key) || 0;

    function invalidateResources(prefix) {
        for (const key of new Set([...resourceCache.keys(), ...resourceVersions.keys()])) {
            if (!key.startsWith(prefix)) continue;
            resourceCache.delete(key);
            resourceVersions.set(key, resourceVersion(key) + 1);
        }
    }

    async function readResource(key, fetcher, { force = false, ttl = 90000 } = {}) {
        if (force) invalidateResources(key);
        const cached = resourceCache.get(key);
        if (cached && Date.now() - cached.at < ttl) return cached.data;
        const version = resourceVersion(key);
        resourceVersions.set(key, version);
        const requestKey = JSON.stringify([key, version]);
        if (resourceRequests.has(requestKey)) return resourceRequests.get(requestKey);
        const task = (async () => {
            const data = await fetcher();
            if (version === resourceVersion(key)) {
                if (resourceCache.size >= 80) resourceCache.delete(resourceCache.keys().next().value);
                resourceCache.set(key, { at: Date.now(), data });
            }
            return data;
        })().finally(() => resourceRequests.delete(requestKey));
        resourceRequests.set(requestKey, task);
        return task;
    }

    let _petsLastFetchedAt = 0;
    const PETS_CACHE_TTL_MS = 90000;
    let _petsFetchPromise = null;

    PawpalPets.serverPetPaging = true;
    let pageGeneration = 0;
    let catalogLoadedAt = 0;
    const defaultPetRequest = () => ({query:'',species:'ALL',breed:'ALL',weight:'ALL',hotel:false,alert:false,page:1,size:10});
    PawpalPets.petPageKey = request => JSON.stringify(request);

    PawpalPets.readPetPage = async function(request = {}, {force=false} = {}) {
        const key = 'page:' + JSON.stringify(request);
        const catalog = !catalogLoadedAt || Date.now()-catalogLoadedAt>600000;
        const includeCatalog = catalog && request.ownerQuery===undefined && !request.ids && !request.lookup;
        return readResource(key, async () => {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) throw new Error('connection_unavailable');
            const {data,error} = await client.rpc('admin_pet_page', {
                p_query:request.query || '', p_species:request.species || 'ALL', p_breed:request.breed || 'ALL',
                p_weight:request.weight || 'ALL', p_hotel:!!request.hotel, p_alert:!!request.alert,
                p_page:request.page || 1, p_size:request.size || 10,
                p_lookup:request.lookup || '', p_ids:request.ids || null,
                p_catalog:includeCatalog,
                p_owner_query:request.ownerQuery === undefined ? null : request.ownerQuery
            });
            if (error) throw error;
            if(!data || (!Array.isArray(data.pets) && !Array.isArray(data.owners)))throw new Error('invalid_pet_page_response');
            return {...data,_fetchedAt:Date.now(),_catalogIncluded:includeCatalog};
        }, {force,ttl:60000});
    };

    PawpalPets.isPetContextFresh = pet => !!pet && pet._contextGeneration===pageGeneration && Date.now()-(pet._contextAt||0)<60000;

    PawpalPets.loadPetContext = async function(ids, attempt = 0) {
        const unique = [...new Set(ids.filter(Boolean))].filter(id=>{const pet=PawpalPets.getPet(id);return !pet || pet._contextGeneration!==pageGeneration || Date.now()-(pet._contextAt||0)>=60000;}).sort();
        const generation = pageGeneration;
        for (let offset=0;offset<unique.length;offset+=100) {
            const data = await PawpalPets.readPetPage({ids:unique.slice(offset,offset+100),page:1,size:100});
            if (generation !== pageGeneration) {
                if (attempt >= 2) throw new Error('pet_context_changed');
                return PawpalPets.loadPetContext(ids, attempt+1);
            }
            applyPetPage(data,unique.slice(offset,offset+100));
        }
    };

    PawpalPets.lookupOwners = async function(query='', attempt=0) {
        const generation = pageGeneration;
        const data = await PawpalPets.readPetPage({ownerQuery:query.trim(),page:1,size:15});
        if (generation !== pageGeneration) {
            if (attempt>=2) throw new Error('owner_context_changed');
            return PawpalPets.lookupOwners(query,attempt+1);
        }
        const owners = data.owners || [];
        for (const owner of owners) PawpalPets.state.customersData[owner.id] = owner;
        return owners;
    };

    async function loadPetsModuleData({force=false,petIds=[]}={}) {
        if (_petsFetchPromise) return _petsFetchPromise;
        const request = PawpalPets.state.listRequest || defaultPetRequest();
        const requestKey = JSON.stringify(request);
        if (!force && !petIds.length && PawpalPets.state.petPage?.key===requestKey && Date.now()-_petsLastFetchedAt<PETS_CACHE_TTL_MS) return;
        _petsFetchPromise = (async () => {
            const generation = pageGeneration;
            try {
                PawpalPets.state.loadError = null;
                if (petIds.length) {
                    const data = await PawpalPets.readPetPage({ids:[...new Set(petIds)].sort(),page:1,size:100},{force});
                    if (generation !== pageGeneration) return;
                    applyPetPage(data,petIds);
                } else {
                    const data = await PawpalPets.readPetPage(request,{force});
                    if (generation !== pageGeneration || requestKey!==JSON.stringify(PawpalPets.state.listRequest || defaultPetRequest())) return;
                    const rows = applyPetPage(data);
                    const pageIds = new Set(data.pageIds || []);
                    const actualPage=Number(data.page||1);
                    const canonicalRequest={...request,page:actualPage};
                    const canonicalKey=JSON.stringify(canonicalRequest);
                    if(actualPage!==request.page){PawpalPets.state.correctedPage={fromKey:requestKey,page:actualPage};PawpalPets.state.listRequest=canonicalRequest;resourceCache.set('page:'+canonicalKey,{at:data._fetchedAt || Date.now(),data});}
                    PawpalPets.state.petPage = {key:canonicalKey,total:Number(data.total||0),page:actualPage,stats:data.stats,
                        keys:Object.values(rows).filter(pet=>pageIds.has(pet.rawId)).map(pet=>pet.code)};
                    if(data._catalogIncluded)catalogLoadedAt=data._fetchedAt || Date.now();
                    _petsLastFetchedAt = data._fetchedAt || Date.now();
                    // Bound directory navigation memory; context tabs load their own referenced pets.
                    const keep = new Set([...PawpalPets.state.petPage.keys,sessionStorage.getItem('pawpal_admin_pet_id')]);
                    const codes = Object.keys(PawpalPets.state.petsData);
                    for (const code of codes) if (Object.keys(PawpalPets.state.petsData).length>200 && !keep.has(code)) delete PawpalPets.state.petsData[code];
                }
                PawpalPets.state.isLoaded = true;
                PawpalPets.state.failedPageKey = null;
            } catch (error) {
                if (generation !== pageGeneration) return;
                PawpalPets.state.loadError = 'Kh\u00f4ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u th\u00fa c\u01b0ng. Vui l\u00f2ng th\u1eed l\u1ea1i.';
                PawpalPets.state.failedPageKey = requestKey;
                console.warn('[Pets] Directory read failed:',error.code || 'connection');
            } finally {
                window.dispatchEvent(new CustomEvent('pawpal:pets-data-loaded'));
            }
        })().finally(()=>{_petsFetchPromise=null;});
        return _petsFetchPromise;
    }
    PawpalPets.loadPetsModuleData = loadPetsModuleData;
    PawpalPets.mapPetPageForExport = data => Object.values(applyPetPage(data, [], false));

    function applyPetPage(data, replaceIds = [], commit = true) {
        const breeds = new Map((data._catalogIncluded ? [] : PawpalPets.state.breeds || []).map(breed=>[breed.id,breed]));
        (data.breeds || []).forEach(breed=>breeds.set(breed.id,breed));
        data = { ...data, breeds:[...breeds.values()] };
        const custAccData = data.custAcc || [];
        const custProfData = data.custProf || [];
        const speciesCode = name => ({'Chó':'dog','Mèo':'cat','Thỏ':'rabbit','Hamster':'hamster'}[name] || name || 'other');
        if (commit) {
            PawpalPets.state.breeds = (data.breeds||[]).map(b=>({...b,speciesCode:speciesCode(b.species?.species_name)}));
            const speciesOptions=[...new Map(PawpalPets.state.breeds.filter(b=>b.species?.is_active).map(b=>[b.speciesCode,b.species.species_name])).entries()];
            for(const id of ['newPetSpecies','editPetSpecies','petFilterSpecies']){
                const select=document.getElementById(id);if(!select)continue;
                const signature=speciesOptions.map(([code,name])=>code+':'+name).join('|');if(select.dataset.catalog===signature)continue;
                const selected=select.value;select.replaceChildren();
                if(id==='petFilterSpecies')select.add(new Option('Tất cả','ALL'));
                for(const [code,name] of speciesOptions)select.add(new Option(name,code));
                if([...select.options].some(o=>o.value===selected))select.value=selected;
                select.dataset.catalog=signature;
            }
        }
        const petsDataList = (data.pets || []).map(p=>{const breed=data.breeds.find(b=>b.id===p.breed_id);return {...p,species:speciesCode(breed?.species?.species_name),speciesName:breed?.species?.species_name,breed:breed?.breed_name,weight:data.weights.find(w=>w.pet_id===p.id)?.weight};});

        if (commit) {PawpalPets.state.weightTimeout = false;PawpalPets.state.weightLoadError = null;}

        const profiles = new Map(custProfData.map(profile => [profile.customer_id, profile]));
        const custMap = Object.fromEntries(custAccData.map(customer => [customer.id, {
            id: customer.id,
            name: profiles.get(customer.id)?.full_name || 'Chưa cập nhật tên',
            phone: data.phones.find(p=>p.customer_id===customer.id)?.phone_number || '',
            email: customer.contact_email || ''
        }]));

        // Hồ sơ chủ nuôi có thể đọc được dù bảng tài khoản bị giới hạn bởi RLS.
        // Giữ khóa customer_id chuẩn, không bỏ mất tên chỉ vì thiếu hàng customer trong response.
        custProfData.forEach(profile => {
            if (!profile.customer_id || custMap[profile.customer_id]) return;
            custMap[profile.customer_id] = {
                id: profile.customer_id,
                name: profile.full_name || 'Chưa cập nhật tên',
                phone: '',
                email: ''
            };
        });

        // 3. Map hồ sơ pet_profile (chi tiết cân nặng, lịch hẹn, care logs sẽ tải on-demand)
        const petsMap = {};
        if (Array.isArray(petsDataList) && petsDataList.length > 0) {
            const speciesNameMap = { 'dog': 'Chó', 'cat': 'Mèo', 'rabbit': 'Thỏ', 'other': 'Khác' };

            petsDataList.forEach((p, idx) => {
                const code = p.pet_code || (p.id ? `PET-${p.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : `PET-${String(idx + 1).padStart(3, '0')}`);
                const spec = (p.species || 'other').toLowerCase();
                // Không đưa mã số/giá trị placeholder vào tên giống hiển thị.
                const rawBreed = String(p.breed || '').trim();
                const invalidBreed = !rawBreed || /^\d+$/.test(rawBreed) || /^(?:null|undefined|unknown|chưa rõ|chưa cập nhật)$/i.test(rawBreed);
                const br = invalidBreed ? 'Chưa cập nhật' : rawBreed;
                const speciesLabel = p.speciesName || speciesNameMap[spec] || '';
                const speciesKey = toUnaccent(speciesLabel);
                const breedKey = toUnaccent(br);
                const specBreed = speciesKey && (breedKey === speciesKey || breedKey.startsWith(speciesKey + ' '))
                    ? br
                    : `${speciesLabel} ${br}`.trim();
                const wNum = Number(p.weight);
                const allg = p.allergy && !/^(?:không|không có|không ghi nhận|chưa ghi nhận|none|no)$/i.test(p.allergy.trim()) ? p.allergy : '';
                const isArch = p.status === 'archived';

                const ownerObj = custMap[p.customer_id] || PawpalPets.state.customersData[p.customer_id] || {};
                const ownerName = ownerObj.name || (p.customer_id ? 'Chưa tải được thông tin chủ nuôi' : 'Thiếu liên kết chủ nuôi');
                const routine = p.routine || '';
                const allergyText = allg ? `Dị ứng: ${allg}` : '';
                const routineAlert = routine.trim() && !/^(?:Tiếp nhận mới tại quầy\.|Hồ sơ tạo mới\.|Chưa có ghi chú đặc biệt\.|Không ghi nhận)$/i.test(routine.trim())
                    ? (/^(?:lưu ý|cảnh báo|tập tính)\s*:/i.test(routine.trim())
                        ? routine.trim()
                        : `Lưu ý: ${routine.trim()}`)
                    : '';
                const alertParts = [p.safety_note, routineAlert, allergyText].filter(Boolean);

                let statusStr = 'Đang nuôi';
                if (p.status === 'HOTEL') statusStr = 'Lưu trú Hotel';
                else if (isArch) statusStr = 'Lưu trữ';

                const dobFormatted = p.date_of_birth ? formatDate(p.date_of_birth) : 'Chưa cập nhật';

                const vaccinesList = [];

                petsMap[code] = {
                    id: code,
                    rawId: p.id, updatedAt: p.updated_at, breedId: p.breed_id, safetyNote: p.safety_note || '', statusRaw: p.status,
                    code: code,
                    name: p.pet_name || 'Bé cưng',
                    species: spec,
                    speciesBreed: specBreed,
                    breed: br,
                    gender: (p.gender === 'FEMALE' || p.gender === 'female' || p.gender === 'Cái' || p.gender === 'nu') ? 'Cái' : ((p.gender === 'MALE' || p.gender === 'male' || p.gender === 'Đực' || p.gender === 'nam') ? 'Đực' : 'Chưa rõ'),
                    weight: Number.isFinite(wNum) && wNum > 0 ? `${wNum} kg` : 'Chưa cập nhật',
                    weightNum: Number.isFinite(wNum) && wNum>0 ? wNum : null,
                    dob: dobFormatted,
                    dobRaw: p.date_of_birth || '',
                    color: p.color || 'Chưa cập nhật',
                    allergy: allg || 'Không ghi nhận',
                    allergies: allg,
                    notes: routine || '',
                    groomerNotes: routine || '',
                    alert: alertParts.join(' • '),
                    ownerName: ownerName,
                    ownerPhone: ownerObj.phone || '',
                    custId: p.customer_id || '',
                    avatar: p.avatar_url || (spec === 'cat' ? '/assets/images/publics/catcute5.jpg' : '/assets/images/publics/dogcute3.jpg'),
                    status: statusStr,
                    vaccinated: vaccinesList.some(v => /dại|rabies/i.test(v.title) && ['Đã tiêm đủ', 'Đã thực hiện', 'Đạt chuẩn'].includes(v.status)),
                    isHotel: p.status === 'HOTEL',
                    isArchived: isArch,
                    weightHistory: [],
                    vaccines: vaccinesList,
                    carelogs: [],
                    history: [],
                    _detailsLoaded: false
                };
            });
        }
        if (!commit) return petsMap;
        for (const pet of Object.values(petsMap)) {pet._contextAt=data._fetchedAt || Date.now();pet._contextGeneration=pageGeneration;}
        const previous = PawpalPets.state.petsData || {};
        const byId = new Map(Object.values(previous).map(pet => [pet.rawId, pet]));
        for (const [code, fresh] of Object.entries(petsMap)) {
            const existing = byId.get(fresh.rawId);
            if (!existing) continue;
            const details = {};
            for (const [kind, field] of [['weight', 'weightHistory'], ['carelog', 'carelogs'], ['history', 'history']]) {
                if (existing._detailStatus?.[kind] === 'loaded') details[field] = existing[field];
            }
            const metadata = Object.fromEntries(Object.entries(existing).filter(([key]) => key.startsWith('_detail')));
            petsMap[code] = Object.assign(existing, fresh, details, metadata);
        }
        if (replaceIds.length) {
            for (const [code, pet] of Object.entries(previous)) {
                if ((replaceIds.includes(pet.rawId) || replaceIds.includes(code)) && !petsMap[code]) delete previous[code];
            }
        }
        PawpalPets.state.petsData = { ...previous, ...petsMap };
        PawpalPets.state.customersData = { ...PawpalPets.state.customersData, ...custMap };
        return petsMap;
    }



    // Helper lazy-fetch chi tiết hồ sơ 1 thú cưng (Cân nặng, Care log, Lịch hẹn)
    const detailRequests = new Map();
    const detailKinds = ['weight', 'carelog', 'history'];
    PawpalPets.fetchPetProfileDetails = function(pet, options = {}) {
        if (!pet || !pet.rawId) return Promise.resolve(pet);
        const resourceKey = `detail:${pet.rawId}:${options.kind || 'all'}:${options.page || 1}`;
        const key = JSON.stringify([resourceKey, resourceVersion(resourceKey)]);
        if (detailRequests.has(key)) return detailRequests.get(key);
        const task = fetchPetDetails(pet, options).finally(() => detailRequests.delete(key));
        detailRequests.set(key, task);
        return task;
    };

    async function fetchPetDetails(pet, { force = false, kind = 'all', page = 1 } = {}) {
        const kinds = detailKinds.includes(kind) ? [kind] : detailKinds;
        page = Math.max(1, Math.floor(Number(page) || 1));
        const size = kind === 'all' ? 30 : 10;
        const key = `detail:${pet.rawId}:${kind}:${page}`;
        if (force) invalidateResources(key);
        const version = resourceVersion(key);
        pet._detailStatus ||= {};
        pet._detailPages ||= {};
        pet._detailTokens ||= {};
        const token = {};
        for (const item of kinds) {
            pet._detailStatus[item] = 'loading';
            pet._detailTokens[item] = token;
        }
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        try {
            if (!client) throw new Error('connection_unavailable');
            const fetchDetails = async () => {
                const [wRes, cRes, aRes] = await Promise.all([
                    kinds.includes('weight') ? client.from('pet_weight_history')
                        .select('id, pet_id, weight, measured_at, note, staff:recorded_by(full_name), created_at', {count:'exact'})
                        .eq('pet_id', pet.rawId)
                        .order('measured_at', { ascending: false })
                        .order('id').range((page-1)*size, page*size-1) : Promise.resolve({data:[],count:0}),
                    kinds.includes('carelog') ? client.from('care_log')
                        .select('id, appointment_id, description, observed_condition, action_name_snapshot, staff:recorded_by(full_name), recorded_at, created_at, media:care_log_media(media_type,media_url), appointment:appointment_id!inner(pet_id)', {count:'exact'})
                        .eq('appointment.pet_id', pet.rawId)
                        .order('recorded_at', { ascending: false })
                        .order('id').range((page-1)*size, page*size-1) : Promise.resolve({data:[],count:0}),
                    kinds.includes('history') ? client.from('appointment')
                        .select('id, appointment_code, customer_id, pet_id, scheduled_start_at, scheduled_end_at, appointment_status, items:appointment_item(name_snapshot,weight_snapshot,status), staff:staff_id(full_name)', {count:'exact'})
                        .eq('pet_id', pet.rawId)
                        .order('scheduled_start_at', { ascending: false })
                        .order('id').range((page-1)*size, page*size-1) : Promise.resolve({data:[],count:0})
                ]);
                for(const response of [wRes,cRes,aRes])if(response.error)throw response.error;
                const ids=(aRes.data||[]).map(a=>a.id);
                const totals=ids.length?await client.from('appointment_totals').select('appointment_id,total_price').in('appointment_id',ids):{data:[]};
                if(totals.error)throw totals.error;
                const counts = {weight:wRes.count||0,carelog:cRes.count||0,history:aRes.count||0};
                return {
                    counts: Object.fromEntries(kinds.map(item=>[item,counts[item]])),
                    weight: wRes.data || [],
                    careLogs: (cRes.data || []).filter(c=>c.appointment?.pet_id===pet.rawId),
                    appts: (aRes.data || []).map(a=>({...a,total_price:totals.data.find(t=>t.appointment_id===a.id)?.total_price}))
                };
            };

            const details = await readResource(key, fetchDetails);
            if (version !== resourceVersion(key) || kinds.some(item => pet._detailTokens[item] !== token)) return pet;
            pet._detailCounts = { ...pet._detailCounts, ...details.counts };
            for (const item of kinds) pet._detailPages[item] = page;
            if (kinds.includes('weight')) pet.weightHistory = (details.weight || []).map(record => {
                const measuredAt = record.measured_at || record.created_at;
                const measuredWeight = Number(record.weight);
                return {
                    date: formatDate(measuredAt),
                    weight: `${measuredWeight} kg`,
                    tier: measuredWeight < 5 ? 'Dưới 5 kg' : (measuredWeight <= 10 ? 'Từ 5 đến 10 kg' : 'Trên 10 kg'),
                    by: record.staff?.full_name || 'Chưa ghi nhận người cân',
                    measuredAt: new Date(measuredAt).getTime()
                };
            });

            // Map care logs
            if (kinds.includes('carelog')) pet.carelogs = (details.careLogs || []).map(cl => ({
                time: cl.recorded_at ? formatDateTime(cl.recorded_at) : '',
                service: cl.description || 'Chưa có ghi chú',
                ktv: cl.staff?.full_name || 'Chưa ghi nhận nhân viên',
                imgBefore: (cl.media||[]).find(m=>/before|trước/i.test(m.media_type))?.media_url || '',
                imgAfter: (cl.media||[]).find(m=>/after|sau/i.test(m.media_type))?.media_url || '',
                checkText: cl.observed_condition ? `Tình trạng: ${cl.observed_condition}` : 'Chưa ghi nhận',
                appStatus: 'Đã ghi nhận',
                careId: cl.id
            }));

            // Map history appointments
            if (kinds.includes('history')) pet.history = (details.appts || []).map(app => {
                const sName = (app.items||[]).map(i=>i.name_snapshot).join(', ') || 'Chưa ghi nhận dịch vụ';
                const appDate = app.scheduled_start_at ? formatDate(app.scheduled_start_at) : '';
                const appTime = app.scheduled_start_at ? formatTime(app.scheduled_start_at) : '';
                const priceStr = app.total_price!=null?Number(app.total_price).toLocaleString('vi-VN')+'đ':'Chưa có giá trị đối soát';
                const stRaw = (app.appointment_status || '').toUpperCase();
                let stText = 'Chờ xác nhận';
                if (stRaw === 'COMPLETED' || stRaw === 'DA_HOAN_TAT' || stRaw === 'DA_HOAN_THANH') stText = 'Đã hoàn thành';
                else if (stRaw === 'CONFIRMED' || stRaw === 'DA_XAC_NHAN') stText = 'Đã xác nhận';
                else if (stRaw === 'IN_PROGRESS' || stRaw === 'DANG_THUC_HIEN') stText = 'Đang thực hiện';
                else if (stRaw === 'CANCELLED' || stRaw === 'DA_HUY') stText = 'Đã hủy';

                return {
                    id: app.appointment_code || `BK-${app.id.slice(0, 4)}`,
                    rawId: app.id,
                    service: sName,
                    time: `${appDate} ${appTime}`,
                    weight: 'Chưa ghi nhận',
                    price: priceStr,
                    status: stText
                };
            });

            for (const item of kinds) pet._detailStatus[item] = 'loaded';
            pet._detailsError = null; pet._detailsLoaded = detailKinds.every(item=>pet._detailStatus[item]==='loaded');
        } catch (e) {
            if (version !== resourceVersion(key) || kinds.some(item => pet._detailTokens[item] !== token)) return pet;
            for (const item of kinds) pet._detailStatus[item] = 'error';
            pet._detailsError = 'Không thể tải chi tiết hồ sơ. Vui lòng thử lại.'; pet._detailsLoaded=false; console.warn('[PawpalPets] Lỗi tải chi tiết bé cưng:', e);
        }
        return pet;
    };

    // Helper lazy-fetch care logs cho subtab Care Log (GĐ-04 & F-021: Kiểm tra error rõ ràng)
    PawpalPets.fetchCareLogsTab = async function({ force = false, limit = 100 } = {}) {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) { PawpalPets.state.careLogsLoadStatus = 'error'; return []; }
        PawpalPets.state.careLogsLoadStatus = 'loading';

        const fetchLogs = async () => {
            const logsRes=await client.from('care_log')
                .select('id, appointment_id, description, observed_condition, action_name_snapshot, staff:recorded_by(full_name), recorded_at, created_at, appointment:appointment_id!inner(id,customer_id,pet_id)')
                .order('recorded_at',{ascending:false}).order('id').limit(limit);
            if(logsRes.error)throw logsRes.error;
            return {
                logs:(logsRes.data||[]).map(l=>({...l,pet_id:l.appointment?.pet_id,health_status:l.observed_condition})),
                appts:[...new Map((logsRes.data||[]).filter(l=>l.appointment).map(l=>[l.appointment.id,l.appointment])).values()]
            };
        };

        const key = `carelogs:${limit}`;
        if (force) invalidateResources('carelogs:');
        const version = resourceVersion(key);
        try {
            const res = await readResource(key, fetchLogs);
            if (version !== resourceVersion(key)) return [];

            await PawpalPets.loadPetContext((res.logs || []).map(log=>log.pet_id));
            if (version !== resourceVersion(key)) return [];
            PawpalPets.state.careLogs = res.logs || [];
            PawpalPets.state.careLogAppointments = res.appts || [];
            PawpalPets.state.careLogsLoadStatus = 'loaded';
            return PawpalPets.state.careLogs;
        } catch (error) {
            if (version !== resourceVersion(key)) return [];
            PawpalPets.state.careLogsLoadStatus = 'error';
            throw error;
        }
    };

    // Helper lazy-fetch appointments cho subtab Nhắc lịch (GĐ-04 & F-001: Lọc da_hoan_tat chuẩn CSDL)
    PawpalPets.fetchRemindersAppointments = async function({ force = false } = {}) {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) { PawpalPets.state.remindersLoadStatus = 'error'; return []; }
        PawpalPets.state.remindersLoadStatus = 'loading';

        const fetchAppts = async () => {
            const result=await client.rpc('get_admin_pet_reminder_sources');
            if(result.error)throw result.error;
            return result.data||{appointments:[],contacts:[]};
        };

        const key = 'reminders';
        if (force) invalidateResources(key);
        const version = resourceVersion(key);
        try {
            const source = await readResource(key, fetchAppts);
            if (version !== resourceVersion(key)) return [];

            await PawpalPets.loadPetContext((source.appointments || []).map(appointment=>appointment.pet_id));
            if (version !== resourceVersion(key)) return [];
            PawpalPets.state.appointments = source.appointments||[];
            PawpalPets.state.reminderContacts={};
            for(const contact of source.contacts||[]){
                try{const detail=JSON.parse(contact.description),key=`${contact.entity_id}:${detail.type}:${detail.appointment_id}`;
                if(!PawpalPets.state.reminderContacts[key])PawpalPets.state.reminderContacts[key]={sentAt:contact.created_at,channel:detail.channel};}catch{}
            }
            PawpalPets.state.remindersLoadStatus = 'loaded';
            return PawpalPets.state.appointments;
        } catch (error) {
            if (version !== resourceVersion(key)) return [];
            PawpalPets.state.remindersLoadStatus = 'error';
            throw error;
        }
    };

    PawpalPets.saveProfile = async function(pet,changes={},weight=null){
        const db=window.getSupabaseClient();
        const detail={customer_id:pet?.custId,pet_name:pet?.name,breed_id:pet?.breedId,gender:pet?.gender==='Cái'?'female':pet?.gender==='Đực'?'male':'unknown',date_of_birth:pet?.dobRaw||null,color:pet?.color==='Chưa cập nhật'?null:pet?.color,safety_note:pet?.safetyNote||null,allergy:pet?.allergies||null,routine:pet?.notes||null,status:pet?.statusRaw||'active',...changes};
        const id=pet?.rawId||crypto.randomUUID();
        const result=await db.rpc('save_admin_pet',{p_pet_id:id,p_expected_updated_at:pet?.updatedAt||null,p_details:detail,p_weight:weight});
        if(result.error)throw result.error;
        window.PawpalDataStore?.invalidate?.('pets:*');window.PawpalDataStore?.invalidate?.('customers:*');
        return {id:result.data};
    };
    PawpalPets.recordWeight = async function(pet,weight,note=''){
        if(!pet)throw Error('Không tìm thấy hồ sơ.');
        const result=await window.getSupabaseClient().rpc('record_admin_pet_weight',{p_pet_id:pet.rawId,p_expected_updated_at:pet.updatedAt,p_measurement_id:crypto.randomUUID(),p_weight:weight,p_note:note});
        if(result.error)throw result.error;return result.data;
    };
    PawpalPets.resolveBreed = function(species,name){
        const breed=(PawpalPets.state.breeds||[]).find(b=>b.is_active&&b.species?.is_active&&b.speciesCode===species&&b.breed_name.trim().toLowerCase()===String(name||'').trim().toLowerCase());
        if(!breed)throw Error('Vui lòng chọn giống có trong danh mục của đúng loài.');return breed.id;
    };
    PawpalPets.getPet = function(idOrCode) {
        if (!idOrCode) return null;
        const db = PawpalPets.state?.petsData || {};
        if (db[idOrCode]) return db[idOrCode];
        return Object.values(db).find(p => p.rawId === idOrCode || p.code === idOrCode || p.id === idOrCode) || null;
    };

    PawpalPets.escapeHtml = function(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    // Quản lý Header Subtabs & Breadcrumb
    function updateBreadcrumb(petName) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Thú cưng') return;
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (!document.getElementById('subtab-tab-pet-profile')?.classList.contains('active')) petName = null;
        if (petName) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${PawpalPets.escapeHtml(petName)}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }
    PawpalPets.updateBreadcrumb = updateBreadcrumb;

    function switchSubtab(targetSubtab, updateHistory = true) {
        window.scrollTo(0, 0);
        const contentArea = document.querySelector('.admin-preview-content');
        if (contentArea) contentArea.scrollTop = 0;

        const root = document.getElementById('subtab-tab-pet-list')?.closest('.admin-module-wrapper');
        if (!root || sessionStorage.getItem('pawpal_admin_active_module') !== 'Thú cưng') return;
        if (!root.querySelector(`#subtab-${targetSubtab}`)) return;
        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        const subtabPanels = root.querySelectorAll('.subtab-content');

        headerSubtabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
        });

        subtabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `subtab-${targetSubtab}`);
        });

        if (targetSubtab === 'tab-pet-profile') {
            const currentName = sessionStorage.getItem('pawpal_admin_pet_name') ||
                                document.getElementById('drawerPetName')?.textContent?.trim() ||
                                'Milu';
            updateBreadcrumb(currentName);
        } else {
            updateBreadcrumb(null);
        }

        sessionStorage.setItem('pawpal_admin_pet_subtab', targetSubtab);
        if (targetSubtab==='tab-pet-profile') {PawpalPets.subtabs.profile?.openPetProfile(sessionStorage.getItem('pawpal_admin_pet_id'),false);PawpalPets.subtabs.profile?.switchDrawerTab(sessionStorage.getItem('pawpal_admin_pet_drawertab') || 'ptab-traits');}
        if (targetSubtab==='tab-pet-carelog') {PawpalPets.subtabs.carelog?.renderCarelogsTable();if(petsVisible())PawpalPets.fetchCareLogsTab().then(()=>PawpalPets.subtabs.carelog?.renderCarelogsTable()).catch(()=>PawpalPets.subtabs.carelog?.renderCarelogsTable());}
        if (targetSubtab==='tab-pet-reminders') {PawpalPets.subtabs.reminders?.renderRemindersTable();PawpalPets.subtabs.reminders?.updateReminderKPIs();if(petsVisible())PawpalPets.fetchRemindersAppointments().then(()=>{PawpalPets.subtabs.reminders?.renderRemindersTable();PawpalPets.subtabs.reminders?.updateReminderKPIs();}).catch(()=>PawpalPets.subtabs.reminders?.renderRemindersTable());}
        if (pendingAllPets || pendingPetIds.size || pendingDetails || pendingCarelogs || pendingReminders) schedulePetsRefresh();
        if (updateHistory) {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.pushState(null, '', '#' + targetSubtab);
                } catch (e) {
                    window.location.hash = targetSubtab;
                }
            }
        } else {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.replaceState(null, '', '#' + targetSubtab);
                } catch (e) {}
            }
        }

        if (window.lucide) lucide.createIcons();
    }
    PawpalPets.switchSubtab = switchSubtab;

    // Helper mở hồ sơ từ bất kỳ subtab nào
    function openPetProfile(petId) {
        if (PawpalPets.subtabs?.profile?.openPetProfile) {
            PawpalPets.subtabs.profile.openPetProfile(petId);
        } else {
            sessionStorage.setItem('pawpal_admin_pet_id', petId);
            switchSubtab('tab-pet-profile');
        }
    }
    let pendingAllPets = false;
    const pendingPetIds = new Set();
    let pendingDetails = false;
    let pendingCarelogs = false;
    let pendingReminders = false;
    let refreshTimer = null;
    let refreshRunning = null;
    let refreshWaiters = [];

    function petsVisible() {
        return !document.hidden && sessionStorage.getItem('pawpal_admin_active_module') === 'Th\u00fa c\u01b0ng';
    }

    function schedulePetsRefresh() {
        clearTimeout(refreshTimer);
        return new Promise(resolve => {
            refreshWaiters.push(resolve);
            refreshTimer = setTimeout(flushPetsRefresh, 300);
        });
    }

    async function flushPetsRefresh() {
        if (refreshRunning) { await refreshRunning; return flushPetsRefresh(); }
        const waiters = refreshWaiters;
        refreshWaiters = [];
        refreshRunning = (async () => {
            if (!petsVisible()) return;
            if (_petsFetchPromise) await _petsFetchPromise;
            if (!petsVisible()) return;
            const all = pendingAllPets, ids = [...pendingPetIds];
            const details = pendingDetails;
            pendingAllPets = false;
            pendingPetIds.clear();
            pendingDetails = false;
            if (all || ids.length) {
                const listActive = document.getElementById('subtab-tab-pet-list')?.classList.contains('active');
                const selected = PawpalPets.getPet(sessionStorage.getItem('pawpal_admin_pet_id'));
                const refreshIds = listActive ? [] : all ? (selected?[selected.rawId]:ids) : ids;
                await loadPetsModuleData({force:all,petIds:refreshIds});
                if (!petsVisible()) return;
                PawpalPets.subtabs.list?.renderPetsTable();
                PawpalPets.subtabs.list?.updatePetKPIs();
            }
            if (!petsVisible()) return;
            if (document.getElementById('subtab-tab-pet-profile')?.classList.contains('active') && (all || ids.length || details)) {
                PawpalPets.subtabs.profile?.openPetProfile(sessionStorage.getItem('pawpal_admin_pet_id'), false);
            }
            if (document.getElementById('subtab-tab-pet-carelog')?.classList.contains('active') && pendingCarelogs) {
                pendingCarelogs = false;
                await PawpalPets.fetchCareLogsTab();
                PawpalPets.subtabs.carelog?.renderCarelogsTable();
            }
            if (document.getElementById('subtab-tab-pet-reminders')?.classList.contains('active') && pendingReminders) {
                pendingReminders = false;
                await PawpalPets.fetchRemindersAppointments();
                PawpalPets.subtabs.reminders?.renderRemindersTable();
                PawpalPets.subtabs.reminders?.updateReminderKPIs();
            }
        })();
        try { await refreshRunning; }
        catch (error) { console.warn('[Pets] Refresh failed:', error.code || 'connection'); }
        finally { refreshRunning = null; waiters.forEach(resolve=>resolve()); }
    }

    PawpalPets.refreshPetsData = function({petIds=[],base=true,owners=false,breeds=false,kinds=[],carelogs=false,reminders=false}={}) {
        petIds = [...new Set(petIds.filter(Boolean))];
        if (base || owners || breeds) {
            pageGeneration += 1;
            invalidateResources('page:');
            if (PawpalPets.state.petPage) PawpalPets.state.petPage.key = null;
            PawpalPets.state.failedPageKey = null;
        }
        if (owners) invalidateResources('owners');
        if (breeds) {invalidateResources('breeds');catalogLoadedAt=0;}
        if (base) {
            if (petIds.length) petIds.forEach(id=>pendingPetIds.add(id));
            else pendingAllPets = true;
        }
        if (kinds.length) {
            for (const key of resourceVersions.keys()) {
                if (!key.startsWith('detail:')) continue;
                const [,id,kind] = key.split(':');
                if ((!petIds.length || petIds.includes(id)) && (kind==='all' || kinds.includes(kind))) invalidateResources(key);
            }
            for (const pet of Object.values(PawpalPets.state.petsData)) {
                if (petIds.length && !petIds.includes(pet.rawId)) continue;
                for (const kind of kinds) {
                    if (pet._detailStatus) pet._detailStatus[kind] = 'idle';
                    if (pet._detailCounts) delete pet._detailCounts[kind];
                }
                pet._detailsLoaded = false;
            }
            pendingDetails = true;
        }
        if (carelogs) {
            invalidateResources('carelogs:');
            PawpalPets.state.careLogsLoadStatus = 'idle';
            pendingCarelogs = true;
        }
        if (reminders) {
            invalidateResources('reminders');
            PawpalPets.state.remindersLoadStatus = 'idle';
            pendingReminders = true;
        }
        return schedulePetsRefresh();
    };

    function setupPetsRealtime(client) {
        const channel = client.channel('admin-pets-live');
        const tables = ['pet_profile','pet_breed','pet_species','customer','customer_profile','customer_phone','appointment','appointment_item','care_log','care_log_media','pet_weight_history','appointment_totals'];
        for (const table of tables) channel.on('postgres_changes',{event:'*',schema:'public',table},payload=>{
            const rows = [payload?.new,payload?.old].filter(row=>row && Object.keys(row).length);
            const field = table==='pet_profile'?'id':'pet_id';
            let ids = rows.length && rows.every(row=>row[field]) ? rows.map(row=>row[field]) : [];
            const owners = ['customer','customer_profile','customer_phone'].includes(table);
            if (owners) {
                const field = table==='customer'?'id':'customer_id';
                const ownerIds = rows.length && rows.every(row=>row[field]) ? rows.map(row=>row[field]) : [];
                ids = ownerIds.length ? Object.values(PawpalPets.state.petsData).filter(pet=>ownerIds.includes(pet.custId)).map(pet=>pet.rawId) : [];
            }
            const breeds = ['pet_breed','pet_species'].includes(table);
            const appointment = ['appointment','appointment_item','appointment_totals'].includes(table);
            const carelog = ['care_log','care_log_media'].includes(table);
            const kinds = table==='pet_weight_history'?['weight']:appointment?['history']:carelog?['carelog']:[];
            PawpalPets.refreshPetsData({petIds:ids,owners,breeds,kinds,
                base:table==='pet_profile'||table==='pet_weight_history'||owners||breeds,
                carelogs:table==='care_log'||table==='appointment'||table==='appointment_item',
                reminders:table==='appointment'||table==='appointment_item'});
        });
        channel.subscribe();
        window.PawpalDataStore?.recordMetric?.('channel-add','admin-pets-live');
    }

    window.addEventListener('admin:module-show',event=>{
        if (event.detail?.module==='Th\u00fa c\u01b0ng') schedulePetsRefresh();
    });
    document.addEventListener('visibilitychange',()=>{
        if (!document.hidden) schedulePetsRefresh();
    });

    let _isPetsInit = false;

    async function initPetsModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // Tải dữ liệu ban đầu từ Supabase
        await loadPetsModuleData();

        // Khởi tạo các subtab con nếu đã load vào DOM
        if (PawpalPets.subtabs.list?.renderPetsTable) {
            PawpalPets.subtabs.list.renderPetsTable();
            PawpalPets.subtabs.list.updatePetKPIs();
        }
        if (PawpalPets.subtabs.carelog?.renderCarelogsTable) {
            PawpalPets.subtabs.carelog.renderCarelogsTable();
        }
        if (PawpalPets.subtabs.reminders?.renderRemindersTable) {
            PawpalPets.subtabs.reminders.renderRemindersTable();
        }
        const savedPetId = sessionStorage.getItem('pawpal_admin_pet_id');
        const restoredSubtab=window.location.hash.replace('#','') || sessionStorage.getItem('pawpal_admin_pet_subtab');
        const petId=savedPetId || Object.keys(PawpalPets.state.petsData)[0];
        if(!savedPetId || PawpalPets.getPet(savedPetId) || restoredSubtab==='tab-pet-profile')PawpalPets.subtabs.profile?.openPetProfile?.(petId,false);

        if (_isPetsInit) return; // Đã gắn event listeners rồi, không gắn lặp lại
        _isPetsInit = true;
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (client?.channel) {
            setupPetsRealtime(client);
        }

        const savedSubtab = sessionStorage.getItem('pawpal_admin_pet_subtab');
        const hashSubtab = window.location.hash ? window.location.hash.substring(1) : '';
        const validTabs = ['tab-pet-list', 'tab-pet-profile', 'tab-pet-carelog', 'tab-pet-reminders'];

        if (validTabs.includes(hashSubtab)) {
            switchSubtab(hashSubtab, false);
        } else if (savedSubtab && validTabs.includes(savedSubtab)) {
            switchSubtab(savedSubtab, false);
        } else {
            switchSubtab('tab-pet-list', false);
        }

        // Bộ xử lý đóng modal toàn cục cho phân hệ Thú cưng (Hỗ trợ nút Đóng, Hủy, click backdrop và phím Escape)
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-close-modal]');
            if (closeBtn) {
                e.preventDefault();
                const modalId = closeBtn.getAttribute('data-close-modal');
                const targetModal = document.getElementById(modalId);
                if (targetModal) {
                    targetModal.classList.remove('open');
                    targetModal.classList.remove('show');
                }
                return;
            }

            if (e.target.classList.contains('admin-modal-backdrop') && e.target.classList.contains('open')) {
                e.target.classList.remove('open');
                e.target.classList.remove('show');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.admin-modal-backdrop.open');
                if (openModal) {
                    openModal.classList.remove('open');
                    openModal.classList.remove('show');
                }
            }
        });

        // Lắng nghe sự kiện đổi subtab từ router cha
        window.addEventListener('admin:subtab-change', (e) => {
            if (e.detail?.module === 'Thú cưng' && validTabs.includes(e.detail.tabId)) {
                switchSubtab(e.detail.tabId, false);
            }
        });
    }

    PawpalPets.init = initPetsModule;
    window.initPetsModule = initPetsModule;

    // Chỉ tự khởi động nếu module chạy độc lập mà không qua router admin.js
    if (!window._pawpalAdminLoaded && !document.querySelector('.admin-layout')) {
        initPetsModule();
    }
})();

    // Modal accessibility wrapper (merged from pet-modal-v8.js).
/* Accessibility wrapper for existing pet modals; does not handle submit or persistence. */
(()=>{
 if(window.__petModalV8)return;window.__petModalV8=true;
 const entries=new Map();let scheduled=false;
 const visible=modal=>modal.isConnected&&getComputedStyle(modal).display!=='none'&&modal.getClientRects().length>0;
 const focusable=modal=>[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(e=>e.getClientRects().length);
 const busy=modal=>modal.dataset.saving==='true';
 const close=modal=>{if(busy(modal))return;const button=modal.querySelector('[data-close-modal]');if(button)button.click();else modal.style.display='none';};
 const sync=()=>{
  scheduled=false;
  document.querySelectorAll('.pets-module .admin-modal-backdrop').forEach(modal=>{
   if(visible(modal)&&!entries.has(modal)){
    entries.set(modal,document.activeElement);
    if(modal.id==='modalPreviewAppDiary'){
        const body=document.getElementById('petDiaryPreviewContent'),pet=window.PawpalPets?.state?.petsData?.[sessionStorage.getItem('pawpal_admin_pet_id')];
        if(body){body.replaceChildren();const title=document.createElement('strong');title.textContent=pet?.name||'Ch\u01b0a ch\u1ecdn b\u00e9 c\u01b0ng';body.append(title);
        const logs=pet?.carelogs||[];
        if(!logs.length){const empty=document.createElement('p');empty.textContent='Ch\u01b0a c\u00f3 nh\u1eadt k\u00fd \u0111\u01b0\u1ee3c t\u1ea3i cho b\u00e9.';body.append(empty);}
        logs.forEach(log=>{const row=document.createElement('p');row.textContent=[log.time,log.ktv,log.service,log.checkText].filter(Boolean).join(' ? ');body.append(row);});}
    }

    const card=modal.querySelector('.admin-modal-card');if(!card)return;card.tabIndex=-1;card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
    const title=modal.querySelector('.admin-modal-title');if(title){title.id||=modal.id+'Title';card.setAttribute('aria-labelledby',title.id);}
    modal.querySelectorAll('.form-group').forEach(group=>{const label=group.querySelector('label'),input=group.querySelector('input:not([type=hidden]),select,textarea');if(label&&input?.id)label.htmlFor=input.id;});
    (focusable(modal).find(e=>e.matches('input:not([readonly]),select,textarea'))||focusable(modal)[0])?.focus();
   }
  });
  for(const [modal,previous]of entries)if(!visible(modal)){entries.delete(modal);if(previous?.isConnected)previous.focus();}
 };
 new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(sync);}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
 document.addEventListener('keydown',event=>{
  const modal=[...entries.keys()].filter(visible).at(-1);if(!modal)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(modal);}
  if(event.key==='Tab'){const items=focusable(modal),first=items[0],last=items.at(-1);if(!items.length){event.preventDefault();modal.querySelector('.admin-modal-card')?.focus();return;}if(event.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){event.preventDefault();first.focus();}}
 },true);
 document.addEventListener('click',event=>{
  const modal=event.target.closest('.pets-module .admin-modal-backdrop');if(!modal)return;
  const closing=event.target===modal||event.target.closest('[data-close-modal]');
  if(closing&&busy(modal)){event.preventDefault();event.stopImmediatePropagation();return;}
  if(event.target===modal)close(modal);
 },true);
})();
