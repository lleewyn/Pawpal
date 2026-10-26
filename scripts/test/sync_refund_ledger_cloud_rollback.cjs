// Compatibility entry point: migration 107 replaces the former blanket ledger guard.
// Historical 8-check evidence is retained in docs; current regression tests reversals.
require('./sync_refund_rewards_sales_cloud_rollback.cjs');
