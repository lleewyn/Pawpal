export const guestCheckoutSelectionKey = 'pawpal_guest_checkout_selection_v1';
export const guestOrderJournalKey = 'pawpal_guest_order_request_v1';

export function getGuestCheckoutKeys(search) {
    const attempt = new URLSearchParams(search).get('cartAttempt');
    const suffix = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(attempt || '') ? ':' + attempt : '';
    return {
        selectionKey: guestCheckoutSelectionKey + suffix,
        journalKey: guestOrderJournalKey + suffix
    };
}
