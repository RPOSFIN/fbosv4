-- Classify legacy FinanceOS transaction statuses without deleting production data.
-- Rows with generated auto references and no source queue mapping cannot be treated as verified live data.

update public.finance_transactions
set
  sync_status = 'failed',
  sync_note = coalesce(sync_note, 'legacy generated reference without queue mapping'),
  tally_sync_at = null
where source = 'tally'
  and left(reference_no, 11) = 'TALLY-AUTO-'
  and finance_import_queue_id is null;

update public.finance_transactions
set
  sync_status = 'synced',
  sync_note = coalesce(sync_note, 'legacy real Tally row ready for verification'),
  tally_sync_at = coalesce(tally_sync_at, now())
where source = 'tally'
  and sync_status in ('pending_tally', 'processed')
  and amount is not null
  and reference_no is not null
  and left(reference_no, 11) <> 'TALLY-AUTO-'
  and finance_import_queue_id is not null;

update public.finance_transactions
set
  sync_status = 'failed',
  sync_note = coalesce(sync_note, 'legacy pending row missing real Tally amount/reference'),
  tally_sync_at = null
where source = 'tally'
  and sync_status = 'pending_tally'
  and (
    amount is null
    or amount = 0
    or reference_no is null
    or left(reference_no, 11) = 'TALLY-AUTO-'
  );
