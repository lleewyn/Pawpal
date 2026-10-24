# Sales presentation review - 2026-10-24

## Changes
- Scoped orders-v8.css and order-modal-v8.js retain production IDs, business handlers and APIs.
- Four subtabs: order list, order detail, products and promotions.
- Translucent surfaces, transparent table interiors, Forest palette, 9px controls/status badges and clean form labels follow current Admin standards.
- Removed initial sample order/customer/stock values; actual selection handlers still populate these fields.
- Cashier modal moved inside the orders module so it receives scoped styles and keyboard handling.
- Order pagination remains 10 rows, now shows at most five page numbers with native disabled previous/next buttons.

## Validation
- Four static subtab layouts passed at 1440px and 390px without horizontal viewport overflow.
- All 19 modal harness checks passed for dialog title, Tab containment, Escape, opener focus restoration and mobile bounds. Cashier initially failed because it was outside the module; corrected and rerun successfully.
- Representative screenshots inspected, including create order and cashier after final changes.
- Syntax checked for order list script.
- These isolated browser checks do not call Supabase or prove production CRUD/payment/stock/Realtime behavior. Existing APIs and data loading were retained; no database migration or extra query was added.
- Changes remain local.

## Functional UI follow-up
- Fixed select-all to affect only visible page rows, preserving selections on other pages; partial selection now uses the native indeterminate state.
- Order load errors hide stale pagination, bulk toolbar and COD summary.
- Product pagination now has a maximum of five page numbers, native disabled boundary buttons, and hides on load errors.
- Product category options use DOM text rather than HTML interpolation.
- Promotion table escapes database text and binds action buttons without embedding voucher codes into inline JavaScript.
- admin_orders_list_ui.cjs passed: 10-row paging, bounded page buttons, status/search filters, page-only bulk selection, empty and error states.
- admin_orders_promos_ui.cjs passed: markup remains plain text, quoted codes reach the correct action, search and error states.
- These tests use browser-only fixtures and perform no Supabase calls or persisted mutations.
