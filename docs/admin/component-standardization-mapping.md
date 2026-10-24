# Admin component standardization - 2026-10-24

Source of requirements: html-css-coding-standards.md, supplied by the user. New rules take precedence over older conflicting presentation instructions, notably flat text status instead of colored status boxes. Customer UI is the approved reference and is not modified.

## Source mapping before implementation
| Current reference | Existing Orders component | Shared mapping / intended change |
| --- | --- | --- |
| Customer computed table header/body styles | .admin-table, .table-responsive-wrapper | Shared font/line height/padding/header colors and keyboard-scroll wrapper; business column widths remain Orders-specific |
| Customer flat .admin-badge | Colored .admin-badge overrides in orders-v8.css | Remove contradictory pastel override block; shared flat status styles for opted-in tables |
| Customer 38px controls, 12px text, 9px radius | .admin-input, .admin-select, .admin-btn, filter rows | Token-driven shared styles, retain existing selectors and event IDs |
| Customer primary/secondary information | .user-name-link, .sub-meta-text, voucher code | Role aliases in shared stylesheet; constrain long primary text inside the cell |
| Existing table and filter semantics | Static thead cells / search placeholders / filter labels | Column scopes, real hidden search labels, explicit label-for associations and focusable named scroll regions |
| Customer profile/modal reference | Orders detail, 19 modals and dynamic templates | Pending dedicated pass; retain business content and existing handlers |

## Delivered foundation
- New admin-components.css is opt-in via admin-ui-standard. The three Orders list/product/promotion sections opt in; Customer sections do not.
- Existing folder architecture, IDs and business event classes retained. No framework or data/API/schema changes in this presentation step.
- Shared tokens/rules are kept in the shared stylesheet. Column minimum widths remain in orders-v8.css (1240/1350/1100px), because business column counts differ.
- Removed the contradictory colored Orders status block instead of appending another background patch.
- No new static inline styles or !important rules were introduced by this foundation.
- Source attachment is preserved in docs/admin/html-css-coding-standards.md.

## Verification
- admin_component_standards_ui.cjs checks 1280/1440/1680px using the real Admin stylesheet stack and static browser fixtures.
- Customer computed styles remain unchanged with shared CSS loaded.
- Orders header/body font family, size, line height and vertical cell padding match the Customer reference. Flat status metrics/background match.
- Unique IDs, header scopes, search labels, long primary text containment and table viewport bounds checked. Horizontal overflow stays in the named keyboard-scrollable table region.
- Screenshots captured outside the webroot. Representative Orders list/product/promotion screenshots inspected; long primary text overflow found and corrected.
- UI tests do not issue Supabase requests and do not establish production CRUD correctness.

## Pending before declaring Orders UI complete
- Consolidate remaining legacy component declarations as detail/modal workspaces migrate; do not broaden new rules over unverified modules.
- Audit every modal separately: layout, individual field labels/errors, busy-state handling, focus/Escape and keyboard behavior against real handlers.
- Audit order profile/detail and all dynamic JS markup, including static inline layout styles, safe user text and numeric alignment.
- Review compact mode, shared empty/loading/error presentation, menu actions and all permission-dependent states.
- Customer CSS remains the reference, including its existing technical debt; do not refactor it as part of another module without a concrete technical reason.

This is a component foundation, not completion of the Orders subsystem or all Admin UI. No push performed.

## POS modal follow-up
`modalCreateOrder` reviewed separately; see [POS review](orders-pos-modal-standard-review.md). Shared modal rules remain opt-in. Remaining modals and detail workspaces are pending.

## Receipt preview follow-up
`modalPosReceipt` now opts into shared modal spacing and accessibility. Receipt-specific CSS controls table scrolling and numeric alignment. Existing print API and source business values retained; duplicate preview heading removed, print heading retained. Production generator exercised with escaped long fixture text; desktop 1440 and mobile 390 screenshots inspected, Escape/focus restoration/backdrop and table header scopes checked. No Supabase request added. Other modals remain pending.
