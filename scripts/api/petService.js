import { API } from './api.js';

const DEFAULT_PET_AVATARS = {
    dog: '/assets/images/publics/dogcute3.jpg',
    cat: '/assets/images/publics/catcute5.jpg',
    rabbit: '/assets/images/publics/pet1.jpg',
    hamster: '/assets/images/publics/hamster.jpg',
    other: '/assets/images/publics/pet.png'
};

let cachedSpecies = null;
let cachedBreeds = null;

async function getSpeciesAndBreeds(db) {
    if (cachedSpecies && cachedBreeds) return { species: cachedSpecies, breeds: cachedBreeds };
    try {
        const [{ data: spList }, { data: brList }] = await Promise.all([
            db.from('pet_species').select('id, species_name'),
            db.from('pet_breed').select('id, species_id, breed_name')
        ]);
        if (spList) cachedSpecies = spList;
        if (brList) cachedBreeds = brList;
    } catch (e) {
        console.warn('[petService] Không thể tải danh mục loài/giống:', e);
    }
    return { species: cachedSpecies || [], breeds: cachedBreeds || [] };
}

async function resolveBreedId(db, speciesKey, breedName) {
    const { species, breeds } = await getSpeciesAndBreeds(db);
    const speciesMap = {
        dog: 'Chó',
        cat: 'Mèo',
        rabbit: 'Thỏ',
        hamster: 'Chuột Hamster',
        other: 'Khác'
    };
    const targetSpeciesName = speciesMap[speciesKey] || 'Khác';
    const foundSpecies = species.find(s => s.species_name.toLowerCase() === targetSpeciesName.toLowerCase()) ||
        species.find(s => s.species_name === 'Khác') ||
        species[0];

    if (!foundSpecies) return null;

    const breedsForSpecies = breeds.filter(b => b.species_id === foundSpecies.id);
    if (!breedsForSpecies.length) return breeds[0]?.id || null;

    if (breedName && breedName.trim()) {
        const cleanName = breedName.trim().toLowerCase();
        const matched = breedsForSpecies.find(b => b.breed_name.toLowerCase() === cleanName || b.breed_name.toLowerCase().includes(cleanName));
        if (matched) return matched.id;
    }

    const defaultBreed = breedsForSpecies.find(b => b.breed_name.includes('Chưa xác định') || b.breed_name.includes('Chó cỏ') || b.breed_name.includes('Mèo ta')) || breedsForSpecies[0];
    return defaultBreed?.id || breeds[0]?.id || null;
}

function mapSupabasePet(row, currentUser) {
    const breedObj = row.pet_breed || {};
    const speciesObj = breedObj.pet_species || {};
    const speciesName = speciesObj.species_name || '';

    let speciesKey = 'other';
    if (speciesName.includes('Chó')) speciesKey = 'dog';
    else if (speciesName.includes('Mèo')) speciesKey = 'cat';
    else if (speciesName.includes('Thỏ')) speciesKey = 'rabbit';
    else if (speciesName.includes('Hamster')) speciesKey = 'hamster';

    let latestWeight = 0;
    const history = Array.isArray(row.pet_weight_history) ? [...row.pet_weight_history] : [];
    if (history.length > 0) {
        history.sort((a, b) => new Date(b.measured_at || 0) - new Date(a.measured_at || 0));
        latestWeight = history[0].weight || 0;
    }

    const isFemale = row.gender === 'nu' || row.gender === 'female' || row.gender === 'Cái';

    return {
        id: row.pet_code || row.id,
        _supabaseId: row.id,
        userId: row.customer_id,
        name: row.pet_name || '',
        species: speciesKey,
        otherSpecies: speciesKey === 'other' ? speciesName : '',
        breed: breedObj.breed_name || '',
        gender: isFemale ? 'female' : 'male',
        weight: latestWeight,
        weightNum: latestWeight,
        dob: row.date_of_birth || '',
        color: row.color || '',
        allergies: row.allergy || '',
        notes: row.routine || '',
        alert: row.safety_note || (row.allergy ? `Cảnh báo: ${row.allergy}` : ''),
        vaccinated: !!(row.routine && row.routine.includes('tiêm')),
        avatar: row.avatar_url || getDefaultPetAvatar(speciesKey),
        photo: row.avatar_url || '',
        isArchived: row.status === 'disabled' || row.status === 'INACTIVE',
        status: (row.status === 'disabled' || row.status === 'INACTIVE') ? 'Lưu trữ' : 'Đang nuôi',
        weightHistory: history.map(h => ({
            weight: `${h.weight} kg`,
            date: h.measured_at ? new Date(h.measured_at).toLocaleDateString('vi-VN') : 'Gần nhất',
            by: h.note || 'PawPal'
        })),
        _source: 'supabase',
    };
}

function mapToSupabaseRow(pet, customerId, breedId) {
    const isFemale = pet.gender === 'female' || pet.gender === 'nu' || pet.gender === 'Cái';
    const isArchived = Boolean(pet.isArchived || pet.status === 'Lưu trữ' || pet.status === 'disabled');

    const row = {
        customer_id: customerId,
        pet_code: pet.id || pet.pet_code || ('PET-' + Date.now()),
        pet_name: pet.name || '',
        gender: isFemale ? 'nu' : 'nam',
        date_of_birth: pet.dob || pet.date_of_birth || null,
        color: pet.color || null,
        routine: pet.notes || null,
        allergy: pet.allergies || pet.allergy || null,
        safety_note: pet.alert || null,
        status: isArchived ? 'disabled' : 'active',
    };

    if (breedId) row.breed_id = breedId;
    if (pet.avatar && !pet.avatar.startsWith('data:') && !pet.avatar.includes('/assets/')) {
        row.avatar_url = pet.avatar;
    }
    return row;
}

async function getSupabaseCustomerId(db, currentUser) {
    if (!currentUser) return null;

    const currentId = currentUser.id || currentUser.custId || null;
    if (typeof currentId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentId)) {
        return currentId;
    }

    const currentPhone = currentUser.phone || currentUser.phone_main || null;
    if (currentPhone) {
        const cleanPhone = String(currentPhone).replace(/\D/g, '');
        const { data: phoneRows } = await db
            .from('customer_phone')
            .select('customer_id')
            .eq('phone_number', cleanPhone)
            .limit(1);
        if (phoneRows?.length) return phoneRows[0].customer_id;
    }

    const currentEmail = currentUser.email || currentUser.contact_email || null;
    if (currentEmail) {
        const { data: custRows } = await db
            .from('customer')
            .select('id')
            .eq('contact_email', currentEmail)
            .limit(1);
        if (custRows?.length) return custRows[0].id;
    }

    return null;
}

function getDefaultPetAvatar(species) {
    return DEFAULT_PET_AVATARS[species] || DEFAULT_PET_AVATARS.other;
}

function normalizePetAvatar(pet) {
    if (!pet || typeof pet !== 'object') return pet;

    const normalizedId = pet.id || pet.legacyId || pet._id;
    const avatar = typeof pet.avatar === 'string' ? pet.avatar : '';
    const shouldReplaceLegacyAvatar = !avatar || avatar.includes('/assets/images/tracker/') || avatar.includes('belu-');

    return {
        ...pet,
        id: normalizedId,
        avatar: shouldReplaceLegacyAvatar ? getDefaultPetAvatar(pet.species) : avatar
    };
}

function normalizePetList(pets) {
    if (!Array.isArray(pets)) return [];

    const mapById = new Map();
    const mapByNameSpecies = new Map();
    const result = [];

    const normalizedList = pets.map(normalizePetAvatar).filter(Boolean);

    for (const pet of normalizedList) {
        const id = String(pet.id || pet.code || '').trim().toLowerCase();
        const name = String(pet.name || '').trim();
        const species = String(pet.species || 'other').trim().toLowerCase();

        if (!name) continue;

        const cleanName = name.toLowerCase();
        const nameKey = `${cleanName}|${species}`;

        if (id && mapById.has(id)) {
            const existing = mapById.get(id);
            Object.assign(existing, pet, {
                avatar: pet.avatar || existing.avatar,
                breed: pet.breed || existing.breed,
                dob: pet.dob || existing.dob,
                weight: pet.weight || existing.weight
            });
            continue;
        }

        if (!id && mapByNameSpecies.has(nameKey)) {
            const existing = mapByNameSpecies.get(nameKey);
            Object.assign(existing, {
                avatar: pet.avatar || existing.avatar,
                breed: pet.breed || existing.breed,
                dob: pet.dob || existing.dob,
                weight: pet.weight || existing.weight,
                notes: pet.notes || existing.notes,
                allergies: pet.allergies || existing.allergies
            });
            continue;
        }

        const cleanPet = { ...pet };
        if (id) mapById.set(id, cleanPet);
        mapByNameSpecies.set(nameKey, cleanPet);
        result.push(cleanPet);
    }

    return result;
}

function syncToAdminPets(pets, currentUser) {
    if (!Array.isArray(pets)) return;
    try {
        let adminPets = {};
        const rawAdmin = sessionStorage.getItem('pawpal_admin_pets_data') || localStorage.getItem('pawpal_admin_pets_data');
        if (rawAdmin) {
            try { adminPets = JSON.parse(rawAdmin); } catch (e) {}
        }
        
        const speciesNameMap = { 'dog': 'Chó', 'cat': 'Mèo', 'rabbit': 'Thỏ', 'other': 'Khác' };
        
        pets.forEach(pet => {
            const code = pet.id || pet.code;
            if (!code) return;
            const existing = adminPets[code] || {};
            const spec = pet.species || existing.species || 'dog';
            const br = pet.breed || existing.breed || '';
            const specBreed = `${speciesNameMap[spec] || 'Chó'} ${br}`.trim();
            const wNum = typeof pet.weight === 'number' ? pet.weight : (parseFloat(pet.weight) || pet.weightNum || existing.weightNum || 0);
            const genderStr = (pet.gender === 'female' || pet.gender === 'Cái' || pet.gender === 'nu') ? 'Cái' : 'Đực';
            const dobVal = pet.dobRaw || pet.dob || existing.dobRaw || '';
            const allg = pet.allergies || pet.allergy || existing.allergy || '';
            const isArch = Boolean(pet.isArchived || pet.status === 'Lưu trữ' || pet.status === 'disabled');
            
            adminPets[code] = {
                ...existing,
                id: code,
                code: code,
                name: pet.name || existing.name || '',
                species: spec,
                speciesBreed: specBreed,
                breed: br || 'Chưa cập nhật',
                gender: genderStr,
                weight: `${wNum} kg`,
                weightNum: wNum,
                dob: dobVal ? `${dobVal}` : (existing.dob || 'Chưa cập nhật'),
                dobRaw: dobVal,
                color: pet.color || existing.color || 'Chưa cập nhật',
                allergy: allg || 'Không',
                allergies: allg,
                notes: pet.notes || existing.notes || '',
                alert: allg && allg !== 'Không' ? `Cảnh báo dị ứng: ${allg}` : (existing.alert || ''),
                ownerName: pet.ownerName || existing.ownerName || currentUser?.name || 'Khách hàng',
                ownerPhone: pet.ownerPhone || existing.ownerPhone || currentUser?.phone || '',
                custId: pet.custId || existing.custId || currentUser?.custId || currentUser?.id || 'CUST-001',
                avatar: pet.avatar || existing.avatar || getDefaultPetAvatar(spec),
                status: isArch ? 'Lưu trữ' : (existing.status || 'Đang nuôi'),
                vaccinated: pet.vaccinated != null ? pet.vaccinated : (existing.vaccinated || false),
                isHotel: existing.isHotel || false,
                isArchived: isArch,
                weightHistory: existing.weightHistory || [],
                vaccines: existing.vaccines || (pet.vaccinated ? [{ title: 'Tiêm phòng định kỳ', status: 'Đã tiêm đủ', date: new Date().toLocaleDateString('vi-VN') }] : []),
                carelogs: existing.carelogs || [],
                history: existing.history || []
            };
        });
        
        sessionStorage.setItem('pawpal_admin_pets_data', JSON.stringify(adminPets));
        localStorage.setItem('pawpal_admin_pets_data', JSON.stringify(adminPets));
    } catch (e) {
        console.warn('[petService] syncToAdminPets error:', e);
    }
}

function sanitizeUserPetsStorage(allPets) {
    if (!Array.isArray(allPets)) return [];

    const seenSignatures = new Set();
    const cleanList = [];

    for (const pet of allPets) {
        if (!pet || !pet.name) continue;
        const lowerName = String(pet.name).trim().toLowerCase();
        const lowerSpecies = String(pet.species || 'other').trim().toLowerCase();
        const signature = pet._supabaseId || pet.id || `${pet.userId || pet.custId || ''}|${lowerName}|${lowerSpecies}`;

        if (!seenSignatures.has(signature)) {
            seenSignatures.add(signature);
            cleanList.push({
                ...pet,
                isArchived: Boolean(pet.isArchived || pet.status === 'INACTIVE' || pet.status === 'Lưu trữ' || pet.status === 'disabled')
            });
        }
    }

    return cleanList;
}

export async function getPets(targetUserId) {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window['SupabaseClient'];
    let supabasePets = [];
    
    if (db && currentUser) {
        try {
            const customerId = await getSupabaseCustomerId(db, currentUser);
            if (customerId) {
                const { data, error } = await db
                    .from('pet_profile')
                    .select('id, pet_code, pet_name, avatar_url, gender, date_of_birth, color, routine, allergy, safety_note, status, customer_id, breed_id, pet_breed(id, breed_name, species_id, pet_species(id, species_name)), pet_weight_history(weight, measured_at)')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false });

                if (!error && Array.isArray(data)) {
                    supabasePets = data.map((row) => mapSupabasePet(row, currentUser));
                }
            }
        } catch (err) {
            console.warn('[petService] Supabase getPets error:', err.message);
        }
    }
    
    let localPets = [];
    try {
        const rawLocal = localStorage.getItem('pawpal_pets');
        if (rawLocal) localPets = JSON.parse(rawLocal);
    } catch (e) {}
    
    const serverIds = new Set(supabasePets.flatMap(p => [p.id, p._supabaseId]).filter(Boolean));
    const allMerged = normalizePetList([...supabasePets, ...localPets.filter(p =>
        !serverIds.has(p.id) && !serverIds.has(p._supabaseId)
    )]);
    
    const cleanedPets = sanitizeUserPetsStorage(allMerged);

    try {
        localStorage.setItem('pawpal_pets', JSON.stringify(cleanedPets));
        syncToAdminPets(cleanedPets, currentUser);
    } catch (e) {}

    if (currentUser || targetUserId) {
        const uId = targetUserId || currentUser?.id;
        const uPhone = currentUser?.phone ? String(currentUser.phone).replace(/\s+/g, '') : null;

        const userPets = cleanedPets.filter(pet => {
            if (uId && (String(pet.userId) === String(uId) || String(pet.custId) === String(uId))) return true;
            if (uPhone) {
                const petPhone = String(pet.ownerPhone || pet.phone || '').replace(/\s+/g, '');
                if (petPhone && petPhone === uPhone) return true;
            }
            return false;
        });

        if (userPets.length > 0) return userPets;
        if (uId || uPhone) return [];
    }

    return cleanedPets;
}

export async function savePets(pets) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !currentUser) throw new Error('Vui lòng đăng nhập lại để lưu hồ sơ.');
        
        const customerId = await getSupabaseCustomerId(db, currentUser);
        if (!customerId) throw new Error('Không xác định được chủ nuôi.');
        
        for (const pet of pets) {
            const breedId = await resolveBreedId(db, pet.species, pet.breed);
            const row = mapToSupabaseRow(pet, customerId, breedId);
            
            let petRecordId = pet._supabaseId;
            if (petRecordId) {
                const { error: updErr } = await db.from('pet_profile').update(row).eq('id', petRecordId).eq('customer_id', customerId);
                if (updErr) throw updErr;
            } else {
                const { data: existingRows } = await db.from('pet_profile').select('id').eq('pet_code', row.pet_code).limit(1);
                if (existingRows?.length) {
                    petRecordId = existingRows[0].id;
                    const { error: updErr } = await db.from('pet_profile').update(row).eq('id', petRecordId);
                    if (updErr) throw updErr;
                } else {
                    const { data: insData, error: insErr } = await db.from('pet_profile').insert(row).select('id').single();
                    if (insErr) throw insErr;
                    petRecordId = insData.id;
                }
                pet._supabaseId = petRecordId;
            }

            const weightVal = parseFloat(pet.weight || pet.weightNum);
            if (!isNaN(weightVal) && weightVal > 0 && petRecordId) {
                try {
                    await db.from('pet_weight_history').insert({
                        pet_id: petRecordId,
                        weight: weightVal,
                        measured_at: new Date().toISOString(),
                        note: 'Cập nhật từ hồ sơ chủ nuôi'
                    });
                } catch (wErr) {
                    console.warn('[petService] Không thể ghi lịch sử cân nặng:', wErr);
                }
            }
        }
        
        let existing = [];
        try { existing = JSON.parse(localStorage.getItem('pawpal_pets') || '[]'); } catch {}
        const byId = new Map(existing.map(p => [p._supabaseId || p.id, p]));
        pets.forEach(p => byId.set(p._supabaseId || p.id, p));
        localStorage.setItem('pawpal_pets', JSON.stringify([...byId.values()]));
        syncToAdminPets(pets, currentUser);
        return true;
    } catch (error) {
        console.error('[petService] Không thể lưu hồ sơ:', error.message);
        throw error;
    }
}

export async function deletePet(petId) {
    try {
        let pets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        const target = pets.find(p => p.id === petId || p.code === petId || p._supabaseId === petId);
        if (target) {
            target.isArchived = true;
            target.status = 'Lưu trữ';
            localStorage.setItem('pawpal_pets', JSON.stringify(pets));
            const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            syncToAdminPets([target], currentUser);
        }
    } catch (e) {}

    const db = window.getSupabaseClient ? window.getSupabaseClient() : window['SupabaseClient'];
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (db && currentUser) {
        try {
            const customerId = await getSupabaseCustomerId(db, currentUser);
            let query = db.from('pet_profile').update({ status: 'disabled' });
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(petId)) {
                query = query.eq('id', petId);
            } else {
                query = query.eq('pet_code', petId);
            }
            if (customerId) query = query.eq('customer_id', customerId);
            await query;
        } catch (err) {
            console.warn('[petService] Supabase deletePet error:', err.message);
        }
    }
    return true;
}

export async function restorePet(petId) {
    try {
        let pets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        const target = pets.find(p => p.id === petId || p.code === petId || p._supabaseId === petId);
        if (target) {
            target.isArchived = false;
            target.status = 'Đang nuôi';
            localStorage.setItem('pawpal_pets', JSON.stringify(pets));
            const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            syncToAdminPets([target], currentUser);
        }
    } catch (e) {}

    const db = window.getSupabaseClient ? window.getSupabaseClient() : window['SupabaseClient'];
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (db && currentUser) {
        try {
            const customerId = await getSupabaseCustomerId(db, currentUser);
            let query = db.from('pet_profile').update({ status: 'active' });
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(petId)) {
                query = query.eq('id', petId);
            } else {
                query = query.eq('pet_code', petId);
            }
            if (customerId) query = query.eq('customer_id', customerId);
            await query;
        } catch (err) {
            console.warn('[petService] Supabase restorePet error:', err.message);
        }
    }
    return true;
}
