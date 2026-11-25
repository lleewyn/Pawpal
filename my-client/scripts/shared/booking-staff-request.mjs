// Staff availability is resolved at booking time; legacy request metadata is not an action flow.
export function staffRequestLabel(request,fallback='Chờ xác nhận'){return fallback;}
export function renderBookingStaffRequest(root){root.replaceChildren();}
