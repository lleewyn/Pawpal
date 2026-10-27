function normalizeVietnamPhone(value) {
    if (typeof value !== 'string' || value.length > 40) throw Error('invalid_phone');
    let phone = value.trim().replace(/[\s().-]/g, '');
    if (/^(?:\+84|0084|84)\d{9}$/.test(phone)) phone = '0' + phone.slice(-9);
    if (!/^0\d{9}$/.test(phone)) throw Error('invalid_phone');
    return phone;
}
module.exports = { normalizeVietnamPhone };
