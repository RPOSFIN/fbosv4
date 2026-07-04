-- Align Tally finance import with transaction storage without deleting existing data.
-- Adds real Tally/queue fields to finance_transactions and fixes the queue trigger
-- so future rows no longer rely on TALLY-AUTO-only references.

alter table public.finance_transactions
  add column if not exists finance_import_queue_id uuid,
  add column if not exists company text,
  add column if not exists voucher_no text,
  add column if not exists voucher_type text,
  add column if not exists voucher_date date,
  add column if not exists ledger_name text,
  add column if not exists party_name text,
  add column if not exists debit numeric default 0,
  add column if not exists credit numeric default 0,
  add column if not exists narration text,
  add column if not exists gst_no text,
  add column if not exists sync_note text;

create index if not exists finance_transactions_import_queue_id_idx
  on public.finance_transactions(finance_import_queue_id);
create index if not exists finance_transactions_voucher_no_idx
  on public.finance_transactions(voucher_no);
create index if not exists finance_transactions_party_name_idx
  on public.finance_transactions(party_name);

create or replace function public.process_finance_import()
returns trigger
language plpgsql
as $function$
declare
  v_reference_no text;
  v_tx_type text;
  v_sync_status text;
  v_sync_note text;
begin
  -- Only real Tally rows become finance transactions. Demo rows remain in queue
  -- for development visibility but do not pollute FinanceOS transactions.
  if coalesce(NEW.source, '') <> 'tally' then
    return NEW;
  end if;

  v_reference_no := coalesce(
    nullif(btrim(NEW.voucher_no), ''),
    nullif(btrim(NEW.reference), ''),
    nullif(btrim(NEW.ledger_name), ''),
    nullif(btrim(NEW.party_name), '')
  );

  v_tx_type := lower(coalesce(nullif(btrim(NEW.record_type), ''), nullif(btrim(NEW.voucher_type), ''), 'ledger'));

  if v_reference_no is null then
    v_sync_status := 'failed';
    v_sync_note := 'missing real Tally reference: voucher_no/reference/ledger_name/party_name unavailable';
  elsif NEW.amount is null then
    v_sync_status := 'failed';
    v_sync_note := 'missing amount from Tally import';
  else
    v_sync_status := 'synced';
    v_sync_note := 'synced from finance_import_queue';
  end if;

  insert into public.finance_transactions (
    source,
    transaction_type,
    amount,
    reference_no,
    sync_status,
    tally_sync_at,
    finance_import_queue_id,
    company,
    voucher_no,
    voucher_type,
    voucher_date,
    ledger_name,
    party_name,
    debit,
    credit,
    narration,
    gst_no,
    sync_note
  ) values (
    NEW.source,
    v_tx_type,
    coalesce(NEW.amount, 0),
    v_reference_no,
    v_sync_status,
    case when v_sync_status = 'synced' then now() else null end,
    NEW.id,
    NEW.company,
    NEW.voucher_no,
    NEW.voucher_type,
    NEW.voucher_date,
    NEW.ledger_name,
    NEW.party_name,
    coalesce(NEW.debit, 0),
    coalesce(NEW.credit, 0),
    NEW.narration,
    NEW.gst_no,
    v_sync_note
  );

  update public.finance_import_queue
  set status = case when v_sync_status = 'synced' then 'processed' else 'failed' end,
      updated_at = now()
  where id = NEW.id;

  return NEW;
end;
$function$;

-- Backfill transaction detail columns for historical TALLY-AUTO rows where the queue ID is encoded.
update public.finance_transactions tx
set
  finance_import_queue_id = q.id,
  company = coalesce(tx.company, q.company),
  voucher_no = coalesce(tx.voucher_no, q.voucher_no),
  voucher_type = coalesce(tx.voucher_type, q.voucher_type),
  voucher_date = coalesce(tx.voucher_date, q.voucher_date),
  ledger_name = coalesce(tx.ledger_name, q.ledger_name),
  party_name = coalesce(tx.party_name, q.party_name),
  debit = coalesce(tx.debit, q.debit, 0),
  credit = coalesce(tx.credit, q.credit, 0),
  narration = coalesce(tx.narration, q.narration),
  gst_no = coalesce(tx.gst_no, q.gst_no),
  reference_no = coalesce(nullif(q.voucher_no, ''), nullif(q.reference, ''), nullif(q.ledger_name, ''), nullif(q.party_name, ''), tx.reference_no),
  sync_note = coalesce(tx.sync_note, 'backfilled from finance_import_queue')
from public.finance_import_queue q
where tx.reference_no = 'TALLY-AUTO-' || q.id::text;
