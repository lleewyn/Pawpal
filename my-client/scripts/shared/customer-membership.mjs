// Read the signed-in customer's membership through the authenticated server API.
export async function loadCustomerMembership(client, customerId) {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.access_token) return null;
    const response = await fetch('/api/customer/auth/me', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` }
    });
    if (!response.ok) throw new Error('Không thể tải hạng thành viên.');
    const result = await response.json();
    if (!result.success || result.user?.id !== customerId) return null;
    return result.user;
}
