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

    const avatar = typeof pet.avatar === 'string' ? pet.avatar : '';
    const shouldReplaceLegacyAvatar = !avatar || avatar.includes('/assets/images/tracker/') || avatar.includes('belu-');

    if (!shouldReplaceLegacyAvatar) {
        return pet;
    }

    return {
        ...pet,
        avatar: getDefaultPetAvatar(pet.species)
    };
}

function normalizePetList(pets) {
    return Array.isArray(pets) ? pets.map(normalizePetAvatar) : [];
}

/**
 * Lấy danh sách thú cưng của user hiện tại.
 * Đọc từ localStorage do hàm initData() của api.js đã nạp vào.
 */
export async function getPets(userId) {
    if (!userId) {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (currentUser?.id) {
            const pets = normalizePetList(await API.getUserPets(currentUser.id));
            if (pets.length > 0) return pets;

            // fallback: lọc theo userId để không trả về pet của user khác
            try {
                const fallbackPets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
                return normalizePetList(
                    Array.isArray(fallbackPets)
                        ? fallbackPets.filter(p => String(p.userId) === String(currentUser.id))
                        : []
                );
            } catch {
                return [];
            }
        }

        return [];
    }

    const pets = normalizePetList(await API.getUserPets(userId));
    if (pets.length > 0) return pets;

    try {
        const fallbackPets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        return normalizePetList(
            Array.isArray(fallbackPets) ? fallbackPets.filter((pet) => String(pet.userId) === String(userId)) : []
        );
    } catch {
        return [];
    }
}

/**
 * Lưu danh sách thú cưng
 */
export async function savePets(pets) {
    try {
        const normalizedPets = normalizePetList(pets);
        localStorage.setItem('pawpal_pets', JSON.stringify(normalizedPets));
        console.log(' Đã lưu', normalizedPets.length, 'bé cưng');
        return true;
    } catch (e) {
        console.error('savePets error:', e);
        return false;
    }
}

/**
 * Xóa (lưu trữ) thú cưng
 */
export async function deletePet(petId) {
    let pets = JSON.parse(localStorage.getItem('pawpal_pets')) || [];
    pets = pets.map(p => p.id === petId ? { ...p, isArchived: true } : p);
    return await savePets(pets);
}

/**
 * Khôi phục thú cưng
 */
export async function restorePet(petId) {
    let pets = JSON.parse(localStorage.getItem('pawpal_pets')) || [];
    pets = pets.map(p => p.id === petId ? { ...p, isArchived: false } : p);
    return await savePets(pets);
}
