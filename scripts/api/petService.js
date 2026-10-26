
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
        const [spResult, brResult] = await Promise.all([
            db.from('pet_species').select('id, species_name, is_active'),
            db.from('pet_breed').select('id, species_id, breed_name, is_active')
        ]);
        if (spResult.error || brResult.error) throw spResult.error || brResult.error;
        const spList = spResult.data, brList = brResult.data;
        if (spList) cachedSpecies = spList;
        if (brList) cachedBreeds = brList;
    } catch (e) {
        throw e;
    }
    return { species: cachedSpecies || [], breeds: cachedBreeds || [] };
}

async function resolveBreedId(db, speciesKey, breedName, otherSpecies) {
    const { species, breeds } = await getSpeciesAndBreeds(db);
    const speciesMap = {
        dog: 'Chó',
        cat: 'Mèo',
        rabbit: 'Thỏ',
        hamster: 'Chuột Hamster',
        other: 'Khác'
    };
    const targetSpeciesName = speciesKey === 'other' ? String(otherSpecies || 'Khác').trim() : speciesMap[speciesKey] || 'Khác';
    const foundSpecies = species.find(s => s.is_active !== false && s.species_name.toLowerCase() === targetSpeciesName.toLowerCase());
    const match = foundSpecies && breeds.find(b => b.is_active !== false && b.species_id === foundSpecies.id && b.breed_name.trim().toLowerCase() === String(breedName || '').trim().toLowerCase());
    if (!match) throw new Error('Vui lòng chọn đúng giống thuộc loài trong danh mục.');
    return match.id;
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
        _updatedAt: row.updated_at,
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
        safetyNote: row.safety_note || '',
        alert: row.safety_note || (row.allergy ? `Cảnh báo: ${row.allergy}` : ''),
        vaccinated: !!(row.routine && row.routine.includes('tiêm')),
        avatar: row.avatar_url || getDefaultPetAvatar(speciesKey),
        photo: row.avatar_url || '',
        isArchived: ['disabled', 'inactive', 'archived'].includes(String(row.status).toLowerCase()),
        status: ['disabled', 'inactive', 'archived'].includes(String(row.status).toLowerCase()) ? 'Lưu trữ' : 'Đang nuôi',
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
        safety_note: pet.safetyNote ?? pet.alert ?? null,
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

export async function getPets(targetUserId) {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !currentUser) throw new Error('Vui lòng đăng nhập lại để xem hồ sơ.');
    const customerId = await getSupabaseCustomerId(db, currentUser);
    if (JSON.parse(localStorage.getItem('pawpal_current_user') || 'null')?.id !== currentUser.id) throw new Error('Phiên đăng nhập đã thay đổi.');
    if (!customerId || (targetUserId && String(targetUserId) !== String(customerId))) throw new Error('Không xác định được chủ nuôi.');
    const { data, error } = await db.from('pet_profile')
        .select('id, updated_at, pet_code, pet_name, avatar_url, gender, date_of_birth, color, routine, allergy, safety_note, status, customer_id, breed_id, pet_breed(id, breed_name, species_id, pet_species(id, species_name)), pet_weight_history(weight, measured_at)')
        .eq('customer_id', customerId).order('created_at', { ascending: false })
        .order('measured_at', {referencedTable: 'pet_weight_history', ascending: false})
        .order('created_at', {referencedTable: 'pet_weight_history', ascending: false})
        .order('id', {referencedTable: 'pet_weight_history', ascending: false})
        .limit(3, {referencedTable: 'pet_weight_history'});
    if (error) throw error;
    if (JSON.parse(localStorage.getItem('pawpal_current_user') || 'null')?.id !== currentUser.id) throw new Error('Phiên đăng nhập đã thay đổi.');
    return (data || []).map(row => mapSupabasePet(row, currentUser));
}

export async function savePets(pets) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (!db || !user || pets.length !== 1) throw new Error('Phiên lưu hồ sơ không hợp lệ.');
    const pet = pets[0];
    const breedId = await resolveBreedId(db, pet.species, pet.breed, pet.otherSpecies);
    if (JSON.parse(localStorage.getItem('pawpal_current_user') || 'null')?.id !== user.id) throw new Error('Phiên đăng nhập đã thay đổi.');
    const values = mapToSupabaseRow(pet, user.id, breedId);
    const id = pet._supabaseId || (pet._pendingId ||= crypto.randomUUID());
    const rawWeight = pet.weight ?? pet.weightNum;
    const weight = rawWeight === '' || rawWeight == null ? null : Number(rawWeight);
    if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) throw new Error('Cân nặng không hợp lệ.');
    const {error} = await db.rpc('save_own_pet', {p_id:id,p_expected:pet._updatedAt || null,p_values:values,p_weight:weight});
    if (error) throw error;
    pet._supabaseId = id;
    return true;
}

async function changePetStatus(petId, status) {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !currentUser) throw new Error('Vui lòng đăng nhập lại.');
    const customerId = await getSupabaseCustomerId(db, currentUser);
    if (!customerId || !petId) throw new Error('Hồ sơ không hợp lệ.');
    const field = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(petId) ? 'id' : 'pet_code';
    const { data: pet, error: readError } = await db.from('pet_profile').select('id,updated_at')
        .eq(field, petId).eq('customer_id', customerId).single();
    if (readError || !pet) throw readError || new Error('Không tìm thấy hồ sơ.');
    const {error} = await db.rpc('change_own_pet_status',{p_id:pet.id,p_expected:pet.updated_at,p_restore:status==='active'});
    if (error) throw error;
    return true;
}
export async function deletePet(petId) { return changePetStatus(petId, 'disabled'); }
export async function restorePet(petId) { return changePetStatus(petId, 'active'); }
