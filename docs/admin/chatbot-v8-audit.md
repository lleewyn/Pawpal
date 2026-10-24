# Chatbot V8 audit ? 2026-10-24

## Scope and evidence
- Production HTML, core JS, live/copy/rules subtab scripts, existing CSS and V8 CSS reviewed.
- Three top-level tabs: Live support, AI assistant, Rules.
- Six rule groups: FAQ, language filter, canned replies, compensation/transfer, test matrix, support guidelines.
- Twelve overlays checked at 1440px and 390px; no modal bounds or page width overflow detected in static layout.
- JavaScript syntax checks passed for all four module scripts.
- No messages sent, points adjusted, tickets created, rules saved or records deleted during this audit.

## Findings
1. V8 CSS is scoped to live support. AI assistant and Rules still use previous typography/surfaces/badges. V8 migration incomplete.
2. Rule counters 91, 11 and 54 and the model label are hardcoded initial HTML values. Replace initial numbers with loading placeholders and derive model label from actual configuration/response when available.
3. Core modal controller handles close buttons/backdrop/Escape and first input autofocus, but lacks role/labelled dialog, Tab focus trapping and opener focus restoration. Escape closes all matching overlays rather than a single topmost dialog.
4. Inbox summary currently loops through all 100-row RPC pages before rendering. Messages use cursor pagination. Existing cache/dedup/debounce and Realtime should be retained when adding bounded inbox pagination.
5. Realtime fallback polling is gated by active Chatbot module, document visibility and unhealthy channel, every 45 seconds. SLA one-second timer updates DOM; it is not a database poll.
6. No duplicate HTML IDs, default submit buttons or non-sidebar Lucide elements found in module HTML. Seven forms prevent default submit in markup.

## Business boundaries
- Read: get_admin_chat_inbox, get_admin_chat_messages.
- Live actions: act_admin_chat, transfer_admin_chat, resolve_admin_chat, create_chat_complaint, adjust_customer_points, get_admin_chat_handlers, read_admin_chat_raw.
- Rules: save_admin_chat_rule.
- AI assistant: authenticated /api/admin-chat endpoint.
- Frontend syntax/static layout checks do not prove authorization, writes, message delivery, concurrency or Realtime correctness. Those require separate controlled account tests.

## Follow-up order
1. Shared modal accessibility, one overlay at a time.
2. AI assistant presentation and loading/error/empty states.
3. Six Rules groups, action menus, editors and initial counters.
4. Inbox paging optimization, keeping existing RPCs and business action parameters.
5. Controlled permission/Realtime/mutation verification with rollback or isolated fixtures where possible.

## Implemented after audit
- Removed hardcoded initial Rules counters and hidden the unverified model label.
- Applied V8 presentation to AI assistant and Rules without changing business control IDs.
- Added dialog names/roles, Tab containment, opener focus restoration and topmost Escape handling.
- Added read-only get_admin_chat_inbox_page with explicit existing column reads, SECURITY INVOKER and permission checks; original inbox/message/mutation RPCs retained.
- Inbox now receives 10 rows per page, server-side query/filter, global counts, 30-second cache (20 entries), duplicate request sharing and stale result guards. Realtime/refresh invalidate page cache.
- Verified authenticated RPC paging/search/denial inside rollback transaction; no persistent test records.
- UI tests cover cached return, last page, server query, 3 tab bounds and all 12 modal roles/Tab/Escape/focus restoration.
- Actual sending, AI responses, transfers, rule writes and live Realtime delivery were not exercised in these tests.
