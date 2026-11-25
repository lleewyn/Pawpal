export function normalizeAddress(address) {
    const clean = value => String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ');
    return { ...address, street_address: clean(address.street_address),
        district: clean(address.district), province: clean(address.province), ward: clean(address.ward) };
}
export function addressKey(address) {
    const normalized = normalizeAddress(address);
    return JSON.stringify([normalized.street_address, normalized.ward, normalized.district, normalized.province]
        .map(value => value.toLocaleLowerCase('vi')));
}
export function validateAddress(address) {
    const errors = {};
    for (const [field, label, max] of [['street_address', 'Số nhà và tên đường', 1000], ['district', 'Quận/huyện', 100], ['province', 'Tỉnh/thành phố', 100]]) {
        if (!address[field]) errors[field] = `Vui lòng nhập ${label.toLowerCase()}.`;
        else if (address[field].length > max) errors[field] = `${label} không được vượt quá ${max} ký tự.`;
    }
    return errors;
}
