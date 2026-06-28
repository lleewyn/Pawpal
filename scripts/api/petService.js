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

    // Ensure frontend `id` field exists from MongoDB `_id` or `legacyId`
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

export async function getPets(userId) {
    if (!userId) {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (currentUser?.id) {
            const pets = normalizePetList(await API.getUserPets(currentUser.id));
            if (pets.length > 0) return pets;
        }
        return [];
    }

    const pets = normalizePetList(await API.getUserPets(userId));
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
            const payload = {
                ...pet,
                userLegacyId: pet.userId || currentUser?.id || current?.userId || null
            };

            if (current?._id) {
                const updated = await API.request(`/api/pets/${current._id}`, {
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
            console.log('Đã lưu', normalizedPets.length, 'bé cưng');
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
        const updated = await API.request(`/api/pets/${pet._id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...pet, isArchived: true })
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
        const updated = await API.request(`/api/pets/${pet._id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...pet, isArchived: false })
        });
        if (updated) {
            localStorage.setItem('pawpal_pets', JSON.stringify(pets.map(p => p.id === petId ? { ...p, isArchived: false } : p)));
            return true;
        }
    }
    return await savePets(pets.map(p => p.id === petId ? { ...p, isArchived: false } : p));
}
