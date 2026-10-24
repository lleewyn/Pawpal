# POS modal standards review

Scope: only `modalCreateOrder` (T?o ??n t?i qu?y). Customer presentation remains unchanged.

| Source | Component | Change |
| --- | --- | --- |
| orders.html | POS dialog | Semantic dialog, fieldset, labels, errors and neutral placeholders; existing business IDs preserved |
| admin-components.css | Opt-in modal foundation | Shared spacing, controls, tables and autocomplete presentation |
| orders-pos.css | POS layout | Product picker, receipt choices, monetary summary and internal cart scrolling |
| tab-order-list.js | Existing handlers | Local field feedback, pending lock and failed-save preservation; existing RPC contracts retained |
| order-modal-v8.js | Modal keyboard behavior | Respect explicit labels, handle busy focus and close autocomplete before dialog |

Validation: POS UI test passed at 1280/1440/1680 and 390 pixels, including quick creation validation/selection, delivery feedback, cart/quote, duplicate suppression, pending close lock, stale quote protection, failed-save preservation, focus restoration and all close controls. Search regression and shared component tests passed. Customer metrics unchanged. JavaScript syntax and git diff whitespace checks passed. Screenshots inspected, including corrected mobile horizontal containment.

Transport is mocked in UI tests; no live order/customer created and no new database query/schema added by this presentation pass. Existing config supplies point conversion text. Other Orders modals and detailed workspaces still require separate review. No push performed.
