import { API } from './api.js';

const DEFAULT_PET_AVATARS = {
    dog: '/assets/images/publics/dogcute3.jpg',
    cat: '/assets/images/publics/catcute5.jpg',
    rabbit: '/assets/images/publics/pet1.jpg',
    other: '/assets/images/publics/pet.jpg'
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

    const map = new Map();
    const findExisting = (pet, sig) => {
        if (pet._supabaseId && map.has(`db:${pet._supabaseId}`)) return map.get(`db:${pet._supabaseId}`);
        if (pet.id && map.has(`id:${pet.id}`)) return map.get(`id:${pet.id}`);
        if (map.has(`sig:${sig}`)) return map.get(`sig:${sig}`);
        return null;
    };

    pets.map(normalizePetAvatar).forEach((pet) => {
        if (!pet) return;
        const signature = getPetSignature(pet);
        const existing = findExisting(pet, signature);
        
        let mergedPet = { ...pet, __signature: signature };
        if (existing) {
            mergedPet = {
                ...existing,
                ...pet, // later pet overrides earlier
                __signature: signature,
                _supabaseId: pet._supabaseId || existing._supabaseId || null,
            };
            if (existing._supabaseId) map.delete(`db:${existing._supabaseId}`);
            if (existing.id) map.delete(`id:${existing.id}`);
            map.delete(`sig:${existing.__signature}`);
        }
        
        if (mergedPet._supabaseId) map.set(`db:${mergedPet._supabaseId}`, mergedPet);
        else if (mergedPet.id) map.set(`id:${mergedPet.id}`, mergedPet);
        else map.set(`sig:${signature}`, mergedPet);
    });

    return Array.from(map.values()).map(({ __signature, ...pet }) => pet);
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
    const dbUsers = JSON.parse('[]' || '[]');
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

export async function getPets(targetUserId) {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const db = window['SupabaseClient'];
    
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
                const supabasePets = data.map((row) => mapSupabasePet(row, currentUser));
                const appointmentRows = await db
                    .from('appointment')
                    .select(`
                        id,
                        customer_id,
                        pet_profile (
                            id,
                            pet_code,
                            pet_name,
                            species,
                            breed,
                            gender,
                            date_of_birth,
                            color,
                            weight,
                            avatar_url,
                            allergy,
                            routine,
                            vaccination_history,
                            status
                        )
                    `)
                    .eq('customer_id', customerId || currentUser.id || null)
                    .order('appointment_date', { ascending: false })
                    .limit(50);

                const appointmentPets = Array.isArray(appointmentRows?.data)
                    ? appointmentRows.data
                        .map((row) => mapAppointmentPet(row, currentUser))
                        .filter(Boolean)
                    : [];

                const deduped = normalizePetList([...supabasePets, ...appointmentPets]);
                return deduped;
            }
        } catch (err) {
            console.warn('[petService] Supabase getPets error:', err.message);
        }
    }
    
    return [];
}

export async function savePets(pets) {
    try {
        const normalizedPets = normalizePetList(pets);
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');

        const db = window['SupabaseClient'];
        if (db && currentUser) {
            try {
                const customerId = await getSupabaseCustomerId(db, currentUser);
                if (customerId) {
                    for (const pet of normalizedPets) {
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
    const db = window['SupabaseClient'];
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (db && currentUser) {
        try {
            const { data: found } = await db.from('pet_profile').select('id, customer_id').eq('pet_code', petId).limit(1);
            if (found && found.length > 0) {
                await db.from('pet_profile').update({ status: 'INACTIVE' }).eq('id', found[0].id);
            }
            console.log('[petService] deletePet → Supabase OK');
        } catch (err) {
            console.warn('[petService] Supabase deletePet error:', err.message);
        }
    }
    return true;
}

export async function restorePet(petId) {
    const db = window['SupabaseClient'];
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (db && currentUser) {
        try {
            const { data: found } = await db.from('pet_profile').select('id, customer_id').eq('pet_code', petId).limit(1);
            if (found && found.length > 0) {
                await db.from('pet_profile').update({ status: 'ACTIVE' }).eq('id', found[0].id);
            }
            console.log('[petService] restorePet → Supabase OK');
        } catch (err) {
            console.warn('[petService] Supabase restorePet error:', err.message);
        }
    }
    return true;
}
