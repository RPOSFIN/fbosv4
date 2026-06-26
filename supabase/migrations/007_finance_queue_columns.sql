-- FBOS Phase P0-01: finance_import_queue read/write column alignment.
--
-- The dashboard read (app/api/finance/queue) selects voucher_no, voucher_type,
-- ledger_name, party_name, debit, credit, reference, narration and gst_no, but the
-- base table from 004_integration_tables.sql does not define them (they previously
-- existed only in the un-numbered manual RUN_FINANCE_SETUP.sql). On any database
-- provisioned from supabase/migrations/* the read therefore fails with
-- "column finance_import_queue.voucher_no does not exist" even though the Tally
-- voucher rows are inserted. These idempotent adds make the schema SSOT match the
-- read contract. Safe to re-run.

alter table if exists finance_import_queue add column if not exists voucher_no text;
alter table if exists finance_import_queue add column if not exists voucher_type text;
alter table if exists finance_import_queue add column if not exists ledger_name text;
alter table if exists finance_import_queue add column if not exists party_name text;
alter table if exists finance_import_queue add column if not exists debit numeric default 0;
alter table if exists finance_import_queue add column if not exists credit numeric default 0;
alter table if exists finance_import_queue add column if not exists reference text;
alter table if exists finance_import_queue add column if not exists narration text;
alter table if exists finance_import_queue add column if not exists gst_no text;
