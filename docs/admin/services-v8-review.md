# Services V8 presentation ? 2026-10-24

## Scope
- Four production tabs: bookings, appointment detail, service catalog, reviews.
- Existing cashier and support helpers remain attached to their production dialogs.
- Added scoped services-v8.css and service-modal-v8.js; existing IDs, business handlers, validation and RPC signatures retained.
- Unified KPI strip, filter/table typography, flat status labels, detail surfaces, modal spacing, 9px controls and keyboard focus styling.
- Removed suggestion chips from free-text personal health/booking note fields in Create Booking. Inputs and submitted values remain unchanged.
- Cleaned trailing colons on form labels and normalized a heading's sentence case.

## Checks performed
- admin_services_layout_ui.cjs: four static tab layouts at 1440px/390px, no horizontal viewport overflow.
- admin_services_modal_ui.cjs: titles, Tab containment, Escape, opener focus restoration and modal width at mobile.
- All 18 modal checks passed: Create Booking, Service Form, Cancel Booking, Reply Review, Add Surcharge, Carelog Photo, Edit Carelog Step, Accompanying Service, Edit Intake, Change Staff, Complete Booking, SOP Details, Intake Waiver, Pickup Notification, Staff Schedule, Cashier, Service Ticket, Confirm.
- Syntax checks for core, six subtabs and modal wrapper passed.
- No Supabase queries/writes, actual message sending, printing or uploads were performed by these UI tests.

## Verification boundaries
- Tests use isolated modal open/close harnesses; they do not prove production CRUD, pricing, staff availability, payment posting or Realtime correctness.
- Existing loading/data architecture was not changed by this presentation pass.
- Generated screenshots are kept in the private verification folder outside the webroot.
- Changes remain local; no push.

## Follow-up functional verification
- Authenticated rollback SQL passed: booking request idempotence, 4.5/5 kg price boundary, staff assignment and overlapping booking rejection, explicit confirmation required for collection, collection idempotence, over-collection rejection, partial refund balance and unauthorized booking denial.
- Test fixtures, payment and refund entries were all rolled back; no production payment or notification persisted.
- Browser mocked-booking test passed for 10-row pages, final page and search. Error state now clears pagination and stale export rows; page button range bounded around current page.
- Hotel/Taxi-specific creation, actual notification delivery, printing, uploads and end-to-end Realtime remain separate integration checks; no claim of exhaustive live verification.

## Logistics and notification follow-up
- Hotel rollback test passed: 25-hour stay billed as two days, request idempotence, room overlap, invalid stay and authorization guards.
- Taxi rollback test passed using an existing active price rule without modifying it: quote, idempotence, missing round-trip return, invalid distance and authorization guards.
- Pickup notification UI mock passed: confirmation and content required, one valid save, closes on success. This records internally and does not deliver Zalo/SMS/email.
- Realtime callbacks for booking/catalog/review-specific changes now refresh the corresponding datasets instead of all three, and rerender the corresponding tables. Broad dependency events retain full refresh. Actual event delivery not exercised.
- Photo attachments remain an integration limitation: local surcharge evidence is explicitly blocked from saving until server upload support exists. No claim of finished upload/printing integration.
