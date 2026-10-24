# Review, services and chat read optimization - 2026-10-24

## Mapping and changes
| Source | Change |
| --- | --- |
| order product review modal | Read RPC 094 supplies filtered IDs (maximum ten), page/count and global score; hydrate only those IDs. Cache pages, invalidate after reply/Realtime/conflict. Preserve existing reply RPC and optimistic version checks. |
| services fetchBookingsRaw | Cache shared customer/pet/weight-history/room inputs separately for two minutes, restoring directory state on cache hits. Booking-only Realtime reads reuse those inputs and staff cache. Explicit local/manual force refresh still refreshes them. |
| services Realtime | Retain all dirty resource groups across a burst and serialize refreshes. Narrow booking/catalog/review events; directory changes invalidate shared inputs. No background prefetch on operational Realtime refresh. |
| chatbot conversation Realtime | Mark transcript data stale only for the conversation ID in the event; conservatively invalidate all when event identity is absent. |

## Verification
- Migration 094 applied to Cloud. Authenticated rollback test passed for review limit/count/average, media/star filtering and unauthorized rejection; temporary identity rolled back.
- admin_orders_review_page_ui.cjs: mocked ten-row hydration, paging, star/media filtering, global score/count, reply validation/reload, empty/error states.
- admin_services_egress_ui.cjs: directory reuse on booking-only refresh, explicit directory refresh, mixed booking/review event retention, dependency invalidation and inactive module no-fetch.
- admin_chat_realtime_egress_ui.cjs: existing inbox server paging/cache/search plus isolation of unrelated transcripts and invalidation of changed transcripts.
- Existing service bookings UI check passed. Syntax and whitespace checks passed.

## Service booking server paging follow-up
- Applied migration 095: get_admin_service_booking_page(filters, page, export=false), read-only SECURITY INVOKER with existing read permissions and RLS.
- Ordinary reads return at most ten appointment IDs, global daily KPI counts, filtered count, staff filter options and a bounded upcoming summary. Search covers booking code, customer/phone, pet/breed, service and assigned staff; category/status/staff/upcoming/pet-note/SLA filters execute on the server.
- Appointment detail hydration scopes appointment, total and payment reads to those IDs. Shared directory inputs remain cached independently. Empty pages skip appointment/detail queries.
- Reused the existing appointment adapter for paged rows and single-record lookups. Deep links, review escalation and post-write refreshes can load a booking outside the current list page. Workspace retention is current page plus selected detail.
- Staff schedule now requests complete narrow appointment rows for its selected time range, rather than inferring availability/conflicts from the list page. Existing authoritative booking/staff write RPCs were not changed.
- CSV export explicitly requests complete filtered results as eleven compact columns from the read RPC. Export does not silently limit itself to the current page or download care records and attachments.
- Added the missing created_at adapter field and parsed numeric duration from the formatted duration string so frontend SLA indicators agree with server filtering. These are display/filter fixes, not pricing or lifecycle changes.
- Authenticated Cloud rollback test passed: page/count/clamp, complete filtered export, bounded upcoming summary/count/search, invalid page and unauthorized denial.
- admin_services_server_paging_ui.cjs passed with real frontend orchestrator/subtabs and mocked transport: ten-row paging/cache, global KPI totals, staff options, search/status filters, actual off-page detail navigation, filtered full export, complete schedule-range reads, empty/error and late-response behavior. Scoped appointment queries were checked before the explicit schedule read.

## Boundaries
Service catalog/review tables and shared customer/pet/weight histories still use complete datasets on cache miss. Chat inbox and message reads were already bounded; full production Realtime delivery or concurrent business writes were not exercised. UI checks mock transport; read API authorization was tested on Cloud with rolled-back verification identities. No production business writes or cloud logs were used. No measured egress saving percentage is claimed. Read migrations 094/095 are applied; frontend code remains local.
