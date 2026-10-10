const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function applyProfileSnapshot(user, snapshot) {
    if (!snapshot || snapshot.id !== user.id || !snapshot.revision || !Array.isArray(snapshot.addresses)) {
        throw new Error('Không thể xác nhận dữ liệu hồ sơ.');
    }
    const addresses = snapshot.addresses.map(a => ({
        id: a.id, rawStreet: a.street_address || '',
        street: [a.street_address, a.ward, a.district, a.province].filter(Boolean).join(', '),
        province: a.province || '', district: a.district || '', ward: a.ward || '',
        isDefault: !!a.is_default, receiverName: a.receiver_name || '', receiverPhone: a.receiver_phone || ''
    }));
    return { ...user, name: snapshot.name || '', fullName: snapshot.name || '', email: snapshot.email || '',
        phone: snapshot.phone, addresses, address: addresses.find(a => a.isDefault)?.street || '', profileRevision: snapshot.revision };
}

export async function saveCustomerProfile(client, user, { name, email, addresses }) {
    if (!client || !user?.profileRevision) throw new Error('Vui lòng tải lại hồ sơ trước khi lưu.');
    const result = await client.rpc('customer_profile_save', {
        p_name: name, p_email: email,
        p_addresses: addresses.map(a => ({ id: uuid.test(a.id || '') ? a.id : null,
            street_address: a.rawStreet ?? a.street ?? a.address ?? '', province: a.province || '',
            district: a.district || '', ward: a.ward || '', is_default: !!a.isDefault })),
        p_revision: user.profileRevision
    });
    if (result.error) throw new Error(result.error.code === '23503'
        ? 'Địa chỉ đang được dùng cho đơn hàng. Vui lòng giữ lại địa chỉ này.'
        : result.error.code === 'PGRST202' ? 'Chức năng lưu hồ sơ chưa được cấu hình trên máy chủ.' : result.error.message);
    return applyProfileSnapshot(user, result.data);
}
