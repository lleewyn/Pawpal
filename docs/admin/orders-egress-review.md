# Sales egress reduction - 2026-10-24

## Source to change mapping
| Source | Existing behavior | Change |
| --- | --- | --- |
| orders.js fetchProductsData | Catalog plus entire inventory ledger every refresh | Cached catalog; ledger loaded separately for selected product variants |
| orders.js fetchOrdersData | Order reads followed by full customer directory | Cached orders; directory requested only by POS |
| orders.js initial hydration | Orders, catalog, promotions together | Hydrate restored subtab only |
| orders.js Realtime | Every tracked table refreshes all datasets | Dirty resource set, debounce, invalidate related caches; refresh hydrated datasets only |
| tab-order-list.js POS | Customer directory fetched repeatedly | Actor-scoped two-minute single-flight cache; force after quick create; load catalog/promotions on opening POS |
| tab-order-products.js history | Filter global ledger in browser | Fetch selected variants on opening; loading/error state and late-response protection |
| orders.js order adapter | Full nested payment/refund/return/media rows | Explicit fields used by display/calculation; cashier still loads authoritative transaction context through its existing RPC |

## Validation
- admin_orders_egress_ui.cjs uses real frontend cache/orchestrator with mocked database transport, not production data.
- Concurrent/repeated order and catalog loads each execute one underlying fetch within TTL.
- Order/catalog loads issue zero customer-directory or ledger reads.
- Customer directory shares concurrent requests and force reload bypasses cache.
- Stock history includes a variant-ID filter and normalized cache key.
- Realtime product/review/inventory burst triggers one catalog refresh and zero order refreshes.
- Mixed payment/inventory burst retains both resource groups.
- Inactive module changes invalidate without requesting data; actor changes get separate cache entries.
- Stock modal checks preserve before/after values, clear stale rows on errors, and do not reopen after close.
- Existing order list and promotion tests passed; syntax and diff whitespace checks passed.

## Server-side order paging follow-up
- Added/applied migration 091: get_admin_sales_order_page returns at most ten order IDs, filtered totals, clamped page number and six global KPI counts. Read-only SECURITY INVOKER, RLS and existing permission checks remain in effect; no business write permissions were granted.
- Search matches codes, customer name/primary phone with snapshot fallback, tracking, product names and SKU; Vietnamese accent normalization matches frontend behavior.
- Status, payment method, reconciliation, return/complaint, urgent and overdue filters execute on the server.
- The order adapter scopes orders, totals, returns and voucher redemptions to those IDs. Empty pages do not hydrate detail queries.
- Page/filter caches use scoped keys; Realtime and explicit writes invalidate all list pages. Response version guards prevent older searches replacing newer results.
- Retain only current-page rows, selected bulk rows (maximum 100) and selected detail in workspace state.
- Deep links load the requested order; newly created orders are explicitly loaded before navigation. Bulk print/dispatch refresh selected rows before use. Excel export keeps its existing all-order scope and reads the full list only on explicit export; export is disabled during loading and skips reads if the export library is unavailable.
- admin_sales_order_page.cjs passed on Cloud under authenticated role: counts/10-row limit, last-page clamp, accent/code search, overdue filter, invalid page and unauthorized rejection. Temporary verification identity was rolled back.
- admin_orders_server_paging_ui.cjs passed with mocked transport: ten rows, global counts, cache, cross-page selection, filters/search, missing/error states, late responses, off-page detail, bulk print, manifest and full Excel export.
- admin_orders_adapter.cjs passed for scoped queries, empty-page zero reads, code lookup, collection/refund balances. Existing UI and egress regression tests passed.

## Customer search and catalog follow-up
- Applied migration 092 with four SECURITY INVOKER read functions: limited active customer search, limited active variant search, server product paging/metrics/ratings, and slim inventory choices for explicit receipt/stocktake workflows.
- POS customer/variant input debounces 300ms and returns at most ten matches. Customer details, default address and point balance are fetched for the selected customer ID only. Quick-created customers are selected directly by returned ID.
- POS no longer hydrates full product/customer directories when opened. The existing server pricing/checkout contract still validates prices, eligibility and stock.
- Product pages contain at most ten products, slim variant stock/price fields and one thumbnail each. Description, specs, full images and attributes are loaded only when editing the selected product.
- Review count/average are aggregated in the database for the current product page; individual review rows are no longer downloaded for the list.
- Global catalog counts and stock value remain server-calculated. Product search/category/stock filters and paging are server-side with cache and late-response guards.
- Inventory receipt/stocktake requests a slim full variant snapshot only on explicit opening; it does not accidentally operate on only the visible catalog page. Stocktake retains expected balance/version checks. Explicit Excel export retains all-product scope.
- admin_sales_catalog_reads.cjs passed on Cloud for search limits, active entities, product totals/page limit/search, full inventory-choice count and unauthorized denial; temporary identity rolled back.
- admin_orders_pos_search_ui.cjs passed mocked UI debounce, text escaping, selected customer/address/points autofill, variant cart selection and empty search.
- admin_orders_catalog_ui.cjs passed mocked product pages/cache/global counts, single-product detail, complete stocktake snapshot, full export, search/empty/error.
- admin_orders_catalog_adapter.cjs passed scoped product/reservation queries, single thumbnail, no review downloads, aggregated ratings and selected-customer-only detail/points queries.

## Stock history paging and image audit
- Applied read-only SECURITY INVOKER migration 093: get_admin_sales_stock_history_page(product_id, page), at most ten ledger rows with clamped page and total.
- Full per-variant balances are calculated by a window sum over chronological (created_at, id) history before pagination. No balances are inferred from current inventory or the visible page.
- Removed the full-history browser adapter. Cache keys include product and page; existing stock mutation/Realtime invalidations clear all related pages.
- Stock modal supports bounded five-number pagination, server-provided before/after values, loading/error/retry and late-response protection on product changes or modal close.
- Cloud rollback verification covered 32 ledger records across two variants/four pages, full balances for every returned row, page clamp, empty product scope, invalid page and unauthorized denial. All fixtures rolled back.
- admin_orders_stock_history_ui.cjs passed mocked lazy reads, ten-row pages, bounded pager, page cache, error/retry and switched-product response guard. Egress, catalog and order-paging regression tests passed.
- Added native lazy loading and asynchronous decoding to product thumbnails in catalog and order detail; no source image or remote cache headers were changed.
- Read-only catalog URL metadata audit found five product/product-variant media URLs, all outside this project's Supabase Storage URL prefix. No production Storage upload handler was found in the application JS search (legacy migration/vendor/test code excluded). This is a catalog-source audit, not a claim about all buckets or all modules.

## Remaining boundaries
No production business transaction or cloud log access was performed. Read migrations 091/092/093 have been applied to Cloud. No percentage saving is claimed without before/after Usage measurements. Explicit exports and inventory operations still load their required complete dataset. Storage compression/cache policy and remaining modules have not been changed in this pass. Business write contracts and authorization were not changed. Code changes remain local.
