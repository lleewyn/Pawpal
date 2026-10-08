import { API } from './api.js';

const DEFAULT_PET_AVATARS = {
    dog: '/assets/images/publics/dogcute3.jpg',
    cat: '/assets/images/publics/catcute5.jpg',
    rabbit: '/assets/images/publics/pet1.jpg',
    hamster: '/assets/images/publics/hamster.jpg',
    other: '/assets/images/publics/pet.png'
};


function mapSupabasePet(row, currentUser) {
    return {
        id:          row.pet_code || row.id,
        _supabaseId: row.id,
        userId:      row.customer_id,
        name:        row.pet_name    || '',
        species:     row.species     || 'other',
        breed:       row.breed       || '',
        gender:      row.gender ? String(row.gender).toLowerCase() : '',
        weight:      row.weight      || '',
        dob:         row.date_of_birth || '',
        color:       row.color       || '',
        allergies:   row.allergy     || '',
        notes:       row.routine     || '',
        vaccinated:  !!(row.vaccination_history),
        avatar:      row.avatar_url  || getDefaultPetAvatar(row.species),
        photo:       row.avatar_url  || '',
        isArchived:  row.status === 'INACTIVE',
        _source:     'supabase',
    };
}

function mapToSupabaseRow(pet, customerId) {
    return {
        customer_id:         customerId,
        pet_code:            pet.id || '',
        pet_name:            pet.name || '',
        species:             pet.species || 'other',
        breed:               pet.breed  || null,
        gender:              pet.gender ? String(pet.gender).toUpperCase() : null,
        weight:              pet.weight ? parseFloat(pet.weight) : null,
        date_of_birth:       pet.dob    || null,
        color:               pet.color  || null,
        routine:             pet.notes  || null,
        allergy:             pet.allergies || null,
        vaccination_history: pet.vaccinated ? 'Đã tiêm đầy đủ' : null,
        avatar_url:          pet.avatar && !pet.avatar.includes('/assets/') ? pet.avatar : null,
        status:              pet.isArchived ? 'INACTIVE' : 'ACTIVE',
    };
}

async function getSupabaseCustomerId(db, currentUser) {
    if (!currentUser) return null;

    const currentPhone = currentUser.phone || currentUser.phone_main || null;
    const currentEmail = currentUser.email || null;
    const currentId = currentUser.id || null;

    if (typeof currentId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentId)) {
        return currentId;
    }

    let query = db.from('customer').select('id').limit(1);
    if (currentPhone) {
        query = query.eq('phone_main', currentPhone);
    } else if (currentEmail) {
        query = query.eq('email', currentEmail);
    } else {
        return null;
    }

    const { data, error } = await query;

    if (error || !data?.length) return null;
    return data[0].id;
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

function getPetSignature(pet) {
    const name = String(pet?.name || '').trim().toLowerCase();
    const species = String(pet?.species || '').trim().toLowerCase();
    const breed = String(pet?.breed || '').trim().toLowerCase();
    const dob = String(pet?.dob || '').trim().toLowerCase();
    const weight = String(pet?.weight || '').trim().toLowerCase();
    const userKey = String(pet?.userId || pet?.userLegacyId || pet?.phone || pet?.ownerPhone || '').trim().toLowerCase();
    return [name, species, breed, dob, weight, userKey].join('|');
}

function mapAppointmentPet(row, currentUser) {
    const pet = row?.pet_profile;
    if (!pet) return null;

    const name = String(pet.pet_name || '').trim();
    if (!name) return null;

    return {
        id: pet.pet_code || pet.id || `APPT-PET-${row.id}`,
        _supabaseId: pet.id || null,
        userId: row.customer_id || currentUser?.id || null,
        name,
        species: pet.species || 'other',
        breed: pet.breed || '',
        gender: pet.gender || '',
        weight: pet.weight || '',
        dob: pet.date_of_birth || '',
        color: pet.color || '',
        allergies: pet.allergy || '',
        notes: pet.routine || '',
        vaccinated: !!pet.vaccination_history,
        avatar: pet.avatar_url || getDefaultPetAvatar(pet.species),
        photo: pet.avatar_url || '',
        isArchived: pet.status === 'INACTIVE',
        _source: 'supabase-booking',
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

        // 1. Kiểm tra trùng theo ID
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

        // 2. Kiểm tra trùng theo Tên + Giống loài
        if (mapByNameSpecies.has(nameKey)) {
            const existing = mapByNameSpecies.get(nameKey);
            // Gộp thông tin pet trùng lặp thành 1 bé duy nhất
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

function buildPetPayload(pet, currentUser, current) {
    const payload = { ...pet };

    delete payload._id;
    delete payload.id;

    const rawUserId = pet.userId || current?.userId || null;
    const rawUserLegacyId = pet.userLegacyId || currentUser?.id || current?.userLegacyId || null;

    if (typeof rawUserId === 'string' && /^[a-f\d]{24}$/i.test(rawUserId)) {
        payload.userId = rawUserId;
    } else {
        delete payload.userId;
    }

    payload.userLegacyId = rawUserLegacyId ? String(rawUserLegacyId) : null;

    if (typeof payload.weight === 'string') {
        const parsedWeight = Number(payload.weight);
        payload.weight = Number.isFinite(parsedWeight) ? parsedWeight : 0;
    }

    return payload;
}

function sameUserId(left, right) {
    if (left == null || right == null) return false;
    return String(left) === String(right);
}

function mergePetLists(serverPets, localPets, targetUserId) {
    const map = new Map();

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const dbUsers = JSON.parse(localStorage.getItem('pawpal_users') || '[]');
    const dbUser = dbUsers.find(u =>
        String(u.id) === String(targetUserId) ||
        (currentUser?.phone && String(u.phone) === String(currentUser.phone))
    );
    const knownIds = new Set(
        [targetUserId, dbUser?.id, currentUser?.id]
            .filter(Boolean)
            .map(String)
    );
    const currentPhone = currentUser?.phone ? String(currentUser.phone) : null;
    const signatureOf = (pet) => {
        const name = String(pet?.name || '').trim().toLowerCase();
        const species = String(pet?.species || '').trim().toLowerCase();
        const breed = String(pet?.breed || '').trim().toLowerCase();
        const dob = String(pet?.dob || '').trim().toLowerCase();
        const weight = String(pet?.weight || '').trim().toLowerCase();
        const userKey = String(pet?.userId || pet?.userLegacyId || pet?.phone || pet?.ownerPhone || '').trim().toLowerCase();
        return [name, species, breed, dob, weight, userKey].join('|');
    };

    const shouldKeep = (pet) => {
        if (!targetUserId) return true;
        const petUserId = pet.userId?._id || pet.userId;
        if (petUserId && knownIds.has(String(petUserId))) return true;
        if (pet.userLegacyId && knownIds.has(String(pet.userLegacyId))) return true;
        if (!currentPhone) return false;
        if (pet.ownerPhone && String(pet.ownerPhone) === currentPhone) return true;
        if (pet.phone && String(pet.phone) === currentPhone) return true;
        return false;
    };

    const findExisting = (pet, sig) => {
        if (pet._supabaseId && map.has(`db:${pet._supabaseId}`)) return map.get(`db:${pet._supabaseId}`);
        if (pet.id && map.has(`id:${pet.id}`)) return map.get(`id:${pet.id}`);
        if (map.has(`sig:${sig}`)) return map.get(`sig:${sig}`);
        return null;
    };

    const upsert = (pet, priority) => {
        if (!pet || !shouldKeep(pet)) return;
        const sig = signatureOf(pet);
        const existing = findExisting(pet, sig);
        
        let mergedPet = { ...pet, __priority: priority, __signature: sig };
        
        if (existing) {
            if (priority >= (existing.__priority || 0)) {
                mergedPet = {
                    ...existing,
                    ...pet,
                    __priority: priority,
                    __signature: sig,
                    _supabaseId: pet._supabaseId || existing._supabaseId || null
                };
            } else {
                mergedPet = existing;
            }
            if (existing._supabaseId) map.delete(`db:${existing._supabaseId}`);
            if (existing.id) map.delete(`id:${existing.id}`);
            map.delete(`sig:${existing.__signature}`);
        }
        
        if (mergedPet._supabaseId) map.set(`db:${mergedPet._supabaseId}`, mergedPet);
        else if (mergedPet.id) map.set(`id:${mergedPet.id}`, mergedPet);
        else map.set(`sig:${sig}`, mergedPet);
    };

    serverPets.forEach(pet => upsert(pet, 1));
    localPets.forEach(pet => upsert(pet, 2));

    return Array.from(map.values()).map(({ __priority, __signature, ...pet }) => pet);
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
            const genderStr = (pet.gender === 'female' || pet.gender === 'Cái') ? 'Cái' : 'Đực';
            const dobVal = pet.dobRaw || pet.dob || existing.dobRaw || '';
            const allg = pet.allergies || pet.allergy || existing.allergy || '';
            const isArch = Boolean(pet.isArchived);
            
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
        
        // Đồng bộ với Admin Customer 360° nếu có trong sessionStorage
        const rawCust = sessionStorage.getItem('pawpal_admin_customers_data');
        if (rawCust) {
            try {
                const custData = JSON.parse(rawCust);
                pets.forEach(pet => {
                    const targetCustId = pet.custId || currentUser?.custId || currentUser?.id;
                    const targetPhone = pet.ownerPhone || currentUser?.phone;
                    const custKey = Object.keys(custData).find(k => 
                        k === targetCustId || (targetPhone && custData[k]?.phone === targetPhone)
                    );
                    if (custKey && custData[custKey]) {
                        const customer = custData[custKey];
                        if (!Array.isArray(customer.pets)) customer.pets = [];
                        const petIdx = customer.pets.findIndex(p => p.id === pet.id);
                        const specName = speciesNameMap[pet.species] || 'Chó';
                        const petSummary = {
                            id: pet.id,
                            name: pet.name,
                            species: specName,
                            breed: pet.breed || '',
                            weight: String(parseFloat(pet.weight) || 0),
                            vaccine: pet.vaccinated ? 'Sổ theo dõi tiêm phòng định kỳ đầy đủ' : 'Chưa cập nhật sổ tiêm',
                            alertNote: (pet.allergies || pet.allergy) ? `Cảnh báo: ${pet.allergies || pet.allergy}` : 'Bình thường'
                        };
                        if (petIdx >= 0) {
                            if (pet.isArchived) {
                                customer.pets.splice(petIdx, 1);
                            } else {
                                customer.pets[petIdx] = { ...customer.pets[petIdx], ...petSummary };
                            }
                        } else if (!pet.isArchived) {
                            customer.pets.push(petSummary);
                        }
                    }
                });
                sessionStorage.setItem('pawpal_admin_customers_data', JSON.stringify(custData));
            } catch (e) {}
        }
    } catch (e) {
        console.warn('[petService] syncToAdminPets error:', e);
    }
}


export async function getPets(targetUserId) {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const db = window['SupabaseClient'];
    let supabasePets = [];
    
    if (db && currentUser) {
        try {
            const customerId = await getSupabaseCustomerId(db, currentUser);
            const phone = currentUser.phone || currentUser.phone_main || null;

            let query = db
                .from('pet_profile')
                .select('id, pet_code, pet_name, species, breed, gender, date_of_birth, color, weight, avatar_url, vaccination_history, allergy, routine, status, customer_id');

            if (customerId) {
                query = query.eq('customer_id', customerId);
            } else if (phone) {
                const { data: customerRows } = await db
                    .from('customer')
                    .select('id')
                    .eq('phone_main', phone)
                    .limit(1);
                if (customerRows?.length) {
                    query = query.eq('customer_id', customerRows[0].id);
                }
            }

            const { data, error } = await query;
            if (!error && Array.isArray(data)) {
                supabasePets = data.map((row) => mapSupabasePet(row, currentUser));
            }
        } catch (err) {
            console.warn('[petService] Supabase getPets error:', err.message);
        }
    }
    
    // Đọc từ localStorage
    let localPets = [];
    try {
        const rawLocal = localStorage.getItem('pawpal_pets');
        if (rawLocal) localPets = JSON.parse(rawLocal);
    } catch (e) {}
    
    // Nếu cả 2 đều trống, kiểm tra admin pets hoặc seed data /data/pets.json
    if (supabasePets.length === 0 && localPets.length === 0) {
        try {
            const rawAdmin = sessionStorage.getItem('pawpal_admin_pets_data') || localStorage.getItem('pawpal_admin_pets_data');
            if (rawAdmin) {
                const adminPetsObj = JSON.parse(rawAdmin);
                localPets = Object.values(adminPetsObj).map(p => ({
                    id: p.code || p.id,
                    userId: p.custId || 'USER-001',
                    custId: p.custId || 'CUST-001',
                    name: p.name,
                    species: p.species || 'dog',
                    breed: p.breed || '',
                    gender: (p.gender === 'Cái' || p.gender === 'female') ? 'female' : 'male',
                    weight: p.weightNum || parseFloat(p.weight) || 0,
                    dob: p.dobRaw || p.dob || '',
                    dobRaw: p.dobRaw || p.dob || '',
                    color: p.color || '',
                    vaccinated: !!p.vaccinated,
                    allergies: p.allergies || (p.allergy !== 'Không' ? p.allergy : ''),
                    allergy: p.allergy || '',
                    notes: p.notes || '',
                    ownerName: p.ownerName || '',
                    ownerPhone: p.ownerPhone || '',
                    avatar: p.avatar || getDefaultPetAvatar(p.species),
                    status: p.status || 'Đang nuôi',
                    isArchived: p.status === 'Lưu trữ' || !!p.isArchived
                }));
            }
        } catch (e) {}
        
        if (localPets.length > 0) {
            localStorage.setItem('pawpal_pets', JSON.stringify(localPets));
            syncToAdminPets(localPets, currentUser);
        }
    }
    
    const allMerged = normalizePetList([...supabasePets, ...localPets]);
    
    // Làm sạch và khử trùng lặp toàn diện
    const cleanedPets = sanitizeUserPetsStorage(allMerged);

    // Cập nhật lại localStorage để loại bỏ vĩnh viễn dữ liệu rác/trùng lặp
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

function isGuestOrTestPet(pet) {
    if (!pet || !pet.name) return true;
    const id = String(pet.id || pet.code || '').toLowerCase();
    if (id === 'pet-new') return true;
    return false;
}

function sanitizeUserPetsStorage(allPets) {
    if (!Array.isArray(allPets)) return [];

    const seenSignatures = new Set();
    const cleanList = [];

    for (const pet of allPets) {
        if (!pet || !pet.name) continue;
        const lowerName = String(pet.name).trim().toLowerCase();
        const lowerSpecies = String(pet.species || 'other').trim().toLowerCase();
        const signature = `${lowerName}|${lowerSpecies}`;

        if (!seenSignatures.has(signature)) {
            seenSignatures.add(signature);
            cleanList.push({
                ...pet,
                isArchived: Boolean(pet.isArchived || pet.status === 'INACTIVE' || pet.status === 'Lưu trữ')
            });
        }
    }

    return cleanList;
}

export async function savePets(pets) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        
        // 1. Cập nhật vào danh sách tổng trong localStorage
        let existingAll = [];
        try {
            existingAll = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        } catch (e) {}
        
        const map = new Map();
        existingAll.forEach(p => { if (p && p.id) map.set(p.id, p); });
        pets.forEach(p => { if (p && p.id) map.set(p.id, p); });
        const updatedAll = Array.from(map.values());
        
        // Luôn làm sạch dữ liệu trước khi lưu trữ
        const cleanedAll = sanitizeUserPetsStorage(updatedAll);
        localStorage.setItem('pawpal_pets', JSON.stringify(cleanedAll));
        
        // 2. Đồng bộ tức thì sang Admin (Admin Pets & Admin Customer 360°)
        syncToAdminPets(pets, currentUser);
        
        // 3. Đẩy lên Supabase nếu có kết nối
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window['SupabaseClient'];
        if (db && currentUser) {
            try {
                const customerId = await getSupabaseCustomerId(db, currentUser);
                if (customerId) {
                    for (const pet of pets) {
                        const row = mapToSupabaseRow(pet, customerId);
                        if (pet._supabaseId) {
                            await db.from('pet_profile').update(row).eq('id', pet._supabaseId);
                        } else {
                            const { data: existing } = await db
                                .from('pet_profile')
                                .select('id')
                                .eq('customer_id', customerId)
                                .eq('pet_code', pet.id)
                                .limit(1);

                            if (existing?.length) {
                                await db.from('pet_profile').update(row).eq('id', existing[0].id);
                            } else {
                                const { data: inserted } = await db
                                    .from('pet_profile')
                                    .insert(row)
                                    .select('id')
                                    .limit(1);
                                if (inserted?.[0]) {
                                    pet._supabaseId = inserted[0].id;
                                }
                            }
                        }
                    }
                    console.log('[petService] savePets → Supabase OK');
                }
            } catch (err) {
                console.warn('[petService] Supabase savePets error:', err.message);
            }
        }
        
        return true;
    } catch (e) {
        console.error('savePets error:', e);
        return false;
    }
}

export async function deletePet(petId) {
    try {
        let pets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        const target = pets.find(p => p.id === petId || p.code === petId);
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
            const { data: found } = await db.from('pet_profile').select('id, customer_id').eq('pet_code', petId).limit(1);
            if (found && found.length > 0) {
                await db.from('pet_profile').update({ status: 'INACTIVE' }).eq('id', found[0].id);
            }
        } catch (err) {
            console.warn('[petService] Supabase deletePet error:', err.message);
        }
    }
    return true;
}

export async function restorePet(petId) {
    try {
        let pets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        const target = pets.find(p => p.id === petId || p.code === petId);
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
            const { data: found } = await db.from('pet_profile').select('id, customer_id').eq('pet_code', petId).limit(1);
            if (found && found.length > 0) {
                await db.from('pet_profile').update({ status: 'ACTIVE' }).eq('id', found[0].id);
            }
        } catch (err) {
            console.warn('[petService] Supabase restorePet error:', err.message);
        }
    }
    return true;
}
