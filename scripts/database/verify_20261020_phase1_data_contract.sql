-- Chạy sau migration 20261020_phase1_data_contract_extensions.sql.
-- Chỉ đọc catalog và thống kê cấu trúc; không đọc nội dung nghiệp vụ.

BEGIN TRANSACTION READ ONLY;

WITH expected(table_name) AS (
    VALUES
      ('staff_assessment'), ('admin_copilot_history'), ('chat_feedback'),
      ('appointment_item'), ('taxi_trip'), ('appointment_record'),
      ('appointment_adjustment'), ('payment_allocation'), ('refund_allocation'),
      ('pet_vaccination')
)
SELECT e.table_name,
       to_regclass('public.' || e.table_name) IS NOT NULL AS exists
FROM expected e
ORDER BY e.table_name;

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'staff_assessment', 'admin_copilot_history', 'chat_conversation', 'chat_feedback',
      'appointment_item', 'taxi_trip', 'appointment_record', 'appointment_adjustment',
      'payment', 'payment_allocation', 'refund_allocation', 'pet_weight_history',
      'pet_vaccination'
  )
ORDER BY table_name, ordinal_position;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       count(p.policyname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relname IN (
      'staff_assessment', 'admin_copilot_history', 'chat_feedback', 'appointment_item',
      'taxi_trip', 'appointment_record', 'appointment_adjustment', 'payment_allocation',
      'refund_allocation', 'pet_vaccination'
  )
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

SELECT conrelid::regclass AS table_name, conname, contype,
       pg_get_constraintdef(oid, true) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conrelid::regclass::text IN (
      'staff_assessment', 'admin_copilot_history', 'chat_feedback', 'appointment_item',
      'taxi_trip', 'appointment_record', 'appointment_adjustment', 'payment_allocation',
      'refund_allocation', 'pet_vaccination'
  )
ORDER BY conrelid::regclass::text, conname;

ROLLBACK;
