# Cloud-only script cleanup ? 2026-10-25

Removed 92 obsolete scripts for local database provisioning, restored stage databases, local API/Auth, local-to-Cloud initial migration, and tests that transitively require the retired local helpers. Existing business migrations and Cloud-specific tests remain.

Cloud SQL transport now invokes native psql/pg_dump. Passwords are passed through the private process environment, not command arguments or SQL input. PAWPAL_PG_BIN optionally selects a native client directory. The website and CSV importers keep using the existing Supabase Cloud project.

No database queries, migrations, container operations or data deletion were executed for this cleanup. Infrastructure, database volumes and backups outside this repository were not removed. Historical document references are retained as history; current README instructions take precedence. The private configuration directory name supabase-local is retained because other Cloud verification tools still read credentials/evidence there.

The old localhost URL in test_bandwidth_regression.js is an offline rejection test for stale browser configuration, not a local database connection.

## Removed files

- `scripts/database/v1/apply_customer_intake_local.cjs`
- `scripts/database/v1/apply_customer_profile_local.cjs`
- `scripts/database/v1/audit_cloud_all.cjs`
- `scripts/database/v1/cloud_restore_v1.cjs`
- `scripts/database/v1/customer_completion_local.cjs`
- `scripts/database/v1/import_cloud_business.cjs`
- `scripts/database/v1/import_cloud_catalogs.cjs`
- `scripts/database/v1/staff_auth_stage.cjs`
- `scripts/database/v1/verify_api_local.cjs`
- `scripts/database/v1/verify_concurrency.cjs`
- `scripts/database/v1/verify_restore_local.cjs`
- `scripts/test/chat_complaint_v1.cjs`
- `scripts/test/chat_copilot_v1.cjs`
- `scripts/test/chat_inbox_v1.cjs`
- `scripts/test/chat_key_rotation_v1.cjs`
- `scripts/test/chat_operations_v1.cjs`
- `scripts/test/chat_public_v1.cjs`
- `scripts/test/chat_remaining_v1.cjs`
- `scripts/test/chat_resolution_v1.cjs`
- `scripts/test/chat_rules_v1.cjs`
- `scripts/test/chat_security_v1.cjs`
- `scripts/test/chat_sql_invariants.cjs`
- `scripts/test/complaints_v1_create.cjs`
- `scripts/test/complaints_v1_read.cjs`
- `scripts/test/complaints_v1_refund.cjs`
- `scripts/test/complaints_v1_results.cjs`
- `scripts/test/complaints_v1_workflow.cjs`
- `scripts/test/customer_booking_cancel_v1.cjs`
- `scripts/test/customer_booking_create_v1.cjs`
- `scripts/test/customer_booking_move_v1.cjs`
- `scripts/test/customer_booking_summary_v1.cjs`
- `scripts/test/customer_cart_atomic_v1.cjs`
- `scripts/test/customer_completion_helpers.cjs`
- `scripts/test/customer_history_export_stage.cjs`
- `scripts/test/customer_loyalty_v1.cjs`
- `scripts/test/customer_notifications_v1.cjs`
- `scripts/test/customer_permissions_rollback_stage.cjs`
- `scripts/test/customer_pet_add_stage.cjs`
- `scripts/test/customer_pet_atomic_v1.cjs`
- `scripts/test/customer_pet_edit_stage.cjs`
- `scripts/test/customer_points_stage.cjs`
- `scripts/test/customer_portal_profile_v1.cjs`
- `scripts/test/customer_realtime_live.cjs`
- `scripts/test/customer_service_reviews_v1.cjs`
- `scripts/test/customer_status_note_stage.cjs`
- `scripts/test/customer_support_v1.cjs`
- `scripts/test/customer_wishlist_v1.cjs`
- `scripts/test/dashboard_v1_browser.cjs`
- `scripts/test/dashboard_v1_cashflow.cjs`
- `scripts/test/logistics_v1_stage.cjs`
- `scripts/test/pets_v1_integrity_stage.cjs`
- `scripts/test/pets_v1_stage.cjs`
- `scripts/test/pickup_notification_v1_stage.cjs`
- `scripts/test/sales_cashier_v1.cjs`
- `scripts/test/sales_catalog_browser_v1.cjs`
- `scripts/test/sales_catalog_v1.cjs`
- `scripts/test/sales_checkout_v1.cjs`
- `scripts/test/sales_dispatch_browser_v1.cjs`
- `scripts/test/sales_fulfillment_v1.cjs`
- `scripts/test/sales_inventory_batch_v1.cjs`
- `scripts/test/sales_pos_browser_v1.cjs`
- `scripts/test/sales_read_browser_v1.cjs`
- `scripts/test/sales_returns_v1.cjs`
- `scripts/test/sales_reviews_v1.cjs`
- `scripts/test/sales_stock_v1.cjs`
- `scripts/test/sales_vouchers_v1.cjs`
- `scripts/test/service_cashier_v1_stage.cjs`
- `scripts/test/service_records_v1_stage.cjs`
- `scripts/test/service_ticket_v1_stage.cjs`
- `scripts/test/services_v1_completion_stage.cjs`
- `scripts/test/services_v1_stage.cjs`
- `scripts/test/settings_article_v1.cjs`
- `scripts/test/settings_audit_v1.cjs`
- `scripts/test/settings_banner_v1.cjs`
- `scripts/test/settings_notices_v1.cjs`
- `scripts/test/settings_policies_v1.cjs`
- `scripts/test/settings_rpc_v1.cjs`
- `scripts/test/settings_store_v1.cjs`
- `scripts/test/settings_voucher_v1.cjs`
- `scripts/test/staff_assessment_v1.cjs`
- `scripts/test/staff_auth_browser_v1.cjs`
- `scripts/test/staff_auth_v1_stage.cjs`
- `scripts/test/staff_directory_v1.cjs`
- `scripts/test/staff_handover_browser_v1.cjs`
- `scripts/test/staff_handover_v1.cjs`
- `scripts/test/staff_incident_v1.cjs`
- `scripts/test/staff_profile_browser_v1.cjs`
- `scripts/test/staff_profile_history_v1.cjs`
- `scripts/test/staff_profile_v1.cjs`
- `scripts/test/staff_schedule_browser_v1.cjs`
- `scripts/test/staff_schedule_v1.cjs`
- `scripts/test/staff_shift_requests_v1.cjs`

## Verification

- Native Cloud transport offline contract: PASS.
- 213 remaining JavaScript/CommonJS scripts: no missing relative require targets.
- Executable scripts contain no Docker/container commands.
- cloud_connection.cjs syntax and changed-file whitespace checks: PASS.
- No psql/pg_dump executable was found in PATH on this machine; native CLI scripts require PostgreSQL client tools. Website runtime and pg-based CSV importers do not require these executables.
- Existing test_bandwidth_regression.js: REST checks passed; unchanged Dashboard test failed because it expects 11 calls and observes 3. Neither the Dashboard source nor that test was changed in this cleanup.
