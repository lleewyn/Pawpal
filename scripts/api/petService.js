import { API } from './api.js';

const DEFAULT_PET_AVATARS = {
    dog: '/assets/images/publics/dogcute3.jpg',
    cat: '/assets/images/publics/catcute5.jpg',
    rabbit: '/assets/images/publics/pet1.jpg',
    other: '/assets/images/publics/pet.jpg'
};

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
    return Array.isArray(pets) ? pets.map(normalizePetAvatar) : [];
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

export async function getPets(userId) {
    let pets = [];
    if (!userId) {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (currentUser?.id) {
            pets = normalizePetList(await API.getUserPets(currentUser.id));
        }
    } else {
        pets = normalizePetList(await API.getUserPets(userId));
    }

    localStorage.setItem('pawpal_pets', JSON.stringify(pets));
    return pets;
}

export async function savePets(pets) {
    try {
        const normalizedPets = normalizePetList(pets);
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        const existing = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        const byLegacyId = new Map(existing.map((item) => [String(item.id), item]));

        const results = [];
        for (const pet of normalizedPets) {
            const current = byLegacyId.get(String(pet.id));
            const payload = buildPetPayload(pet, currentUser, current);
            const targetId = pet._id || current?._id;

            if (targetId) {
                const updated = await API.request(`/api/pets/${targetId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                results.push(Boolean(updated));
            } else {
                const created = await API.request('/api/pets', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                results.push(Boolean(created));
            }
        }

        const success = results.every(Boolean);
        if (success) {
            localStorage.setItem('pawpal_pets', JSON.stringify(normalizedPets));
            console.log('Da luu', normalizedPets.length, 'be cung');
        }
        return success;
    } catch (e) {
        console.error('savePets error:', e);
        return false;
    }
}

export async function deletePet(petId) {
    const pets = JSON.parse(localStorage.getItem('pawpal_pets')) || [];
    const pet = pets.find((item) => item.id === petId);
    if (pet?._id) {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        const current = pets.find((item) => String(item.id) === String(petId));
        const payload = buildPetPayload({ ...pet, isArchived: true }, currentUser, current);
        const updated = await API.request(`/api/pets/${pet._id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        if (updated) {
            localStorage.setItem('pawpal_pets', JSON.stringify(pets.map(p => p.id === petId ? { ...p, isArchived: true } : p)));
            return true;
        }
    }
    return await savePets(pets.map(p => p.id === petId ? { ...p, isArchived: true } : p));
}

export async function restorePet(petId) {
    const pets = JSON.parse(localStorage.getItem('pawpal_pets')) || [];
    const pet = pets.find((item) => item.id === petId);
    if (pet?._id) {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        const current = pets.find((item) => String(item.id) === String(petId));
        const payload = buildPetPayload({ ...pet, isArchived: false }, currentUser, current);
        const updated = await API.request(`/api/pets/${pet._id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        if (updated) {
            localStorage.setItem('pawpal_pets', JSON.stringify(pets.map(p => p.id === petId ? { ...p, isArchived: false } : p)));
            return true;
        }
    }
    return await savePets(pets.map(p => p.id === petId ? { ...p, isArchived: false } : p));
}
