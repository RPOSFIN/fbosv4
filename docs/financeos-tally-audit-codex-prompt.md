# FinanceOS Tally Audit - Codex Implementation Prompt

You are the Lead Full-Stack Engineer for FBOS V1 FinanceOS.

Repo: RPOSFIN/fbosv4
Branch: fbosv4-recovery
Local path: D:\all in one fbos files\FBOSV01\FBOS_V01\fbos-v1
Current module: FinanceOS / Finance Dashboard / Tally V2 integration

## Objective

Audit and fix FinanceOS so it uses real Tally V2 data only. Detect and remove hardcoded/demo/static FinanceOS values. Detect missing Tally entries, malformed ledger/group data, duplicate vouchers, orphan voucher lines, and dashboard-vs-source mismatches.

Do not redesign the app. Do not add Balance Sheet UI unless explicitly requested. This sprint is audit + diagnostics + data reliability only.

## Mandatory Rules

- Supabase is source of truth.
- Tally V2 tables are the FinanceOS accounting source.
- Do not hardcode finance numbers anywhere.
- Do not hide malformed data.
- Do not silently coerce bad Tally data into OK status.
- Keep existing UI working.
- Use TypeScript, React, Tailwind.
- Use existing auth/api helpers.
- Production-ready code only.
- No placeholder code.
- No TODO comments.
- If a dashboard number cannot be verified, show it as `needs_review`, not as final.

## Current Known Tables / Views

Audit these if present:

- tally_vouchers_v2
- tally_voucher_lines_v2
- tally_ledgers_v2
- tally_parties_v2
- finance_heads_v2
- expense_heads_v2
- owner_finance_snapshot_v2
- reconciliation_issues_v2

Also inspect existing FinanceOS APIs/components before changing:

- app/finance-dashboard
- app/api/finance
- app/api/finance/tally
- components/finance
- components/finance/tally
- lib/finance
- lib/tally
- any dashboard cards that show Sales / Purchase / Receipts / Payments / Receivables / Payables / Bank Cash / Ledger Balances

## Problem Statement

The owner reports:

- FinanceOS entries are missing.
- Some dashboard values look hardcoded/demo.
- Malformed Tally data exists.
- FinanceOS should not show fake final numbers.
- Need a Tally audit inside FinanceOS to explain what is missing and why.

## Implementation Scope

### 1. Hardcoded Finance Data Audit

Search the repo for static FinanceOS amounts and demo arrays.

Search keywords:

- `55616278`
- `5.56`
- `43021461`
- `4.30`
- `56261307`
- `56565399`
- `8161061`
- `2393638`
- `679159`
- `Ledger Balances`
- `Sales ₹`
- `Receivables ₹`
- `Bank Cash`
- `financeHeads`
- `mockFinance`
- `demo`
- `fallback`
- `static`
- `hardcoded`

Required fix:

- Remove hardcoded finance amounts from production UI/API.
- If fallback is needed, fallback must be empty/null with warning, not fake amount.
- Add a visible warning in FinanceOS when data source is fallback/unverified.

### 2. Create FinanceOS Tally Audit API

Create or improve:

`GET /api/finance/tally/audit`

Response shape:

```ts
type FinanceTallyAuditResponse = {
  generatedAt: string;
  ok: boolean;
  summary: {
    vouchers: number;
    voucherLines: number;
    ledgers: number;
    parties: number;
    financeHeads: number;
    issues: number;
    hardcodedSuspected: number;
    needsReviewHeads: number;
  };
  heads: Array<{
    headKey: string;
    headLabel: string;
    amount: number | null;
    rowCount: number | null;
    sourceTable: string | null;
    qcStatus: "ok" | "needs_review" | "missing" | "error";
    issueCount: number;
    remarks: string[];
  }>;
  issues: Array<{
    severity: "critical" | "warning" | "info";
    code: string;
    title: string;
    detail: string;
    sample?: unknown[];
  }>;
};
```

The API must never crash if a table/view is missing. Return an issue with `TABLE_MISSING`.

### 3. Audit Queries To Run In API

Implement safe Supabase queries or SQL RPC/direct SQL equivalent through server admin client.

Audit checks:

#### A. Table existence / row counts

Check row counts for:

- tally_vouchers_v2
- tally_voucher_lines_v2
- tally_ledgers_v2
- tally_parties_v2
- finance_heads_v2
- expense_heads_v2
- owner_finance_snapshot_v2
- reconciliation_issues_v2

#### B. Voucher lines without voucher

Detect orphan voucher lines:

```sql
select count(*)
from tally_voucher_lines_v2 l
left join tally_vouchers_v2 v on v.id = l.voucher_id
where v.id is null;
```

Also return sample rows.

#### C. Vouchers without lines

```sql
select count(*)
from tally_vouchers_v2 v
left join tally_voucher_lines_v2 l on l.voucher_id = v.id
where l.voucher_id is null;
```

#### D. Duplicate vouchers

Use available voucher number/date/type/company columns. If exact columns differ, inspect schema and adapt.

Target logic:

- Same company
- Same voucher number
- Same voucher date
- Same voucher type
- Count > 1

Return count + sample.

#### E. Malformed ledger groups

Detect malformed ledger group / primary group values in `tally_ledgers_v2`.

Examples to detect:

- HTML entities like `&#4; Primary`
- null group fields
- empty group fields
- strings containing replacement chars
- control characters
- suspicious values like `undefined`, `null`, `NaN`

Return count + sample ledger names.

#### F. Missing ledger references in voucher lines

Detect voucher lines where ledger name/id is missing or blank.

#### G. Party mapping audit

Detect party records missing:

- party name
- ledger link
- GSTIN if available
- mobile/contact if available

Do not fail if columns do not exist. Use schema inspection first.

#### H. Finance head source validation

For every row in `finance_heads_v2`:

- head_key
- head_label
- amount
- row_count
- source_table
- qc_status

Check:

- source_table exists, if it is a table/view.
- source_table row count approximately matches row_count when possible.
- qc_status is not `ok` if source_table is missing.
- amount is not null.

#### I. Dashboard-vs-finance_heads mismatch

Find the API/UI source used by Finance Dashboard cards. Ensure the UI reads from live API/finance_heads_v2, not static values.

Add diagnostics in API response:

- source used by dashboard
- generated_at
- source_table per head
- qc_status per head

#### J. Negative cash / bank warning

If bank_cash amount < 0, create warning:

`NEGATIVE_BANK_CASH`

Do not mark fatal by default. It needs review.

### 4. Store Audit Issues

If `reconciliation_issues_v2` exists, upsert current audit issues into it.

Required fields should be adapted to actual schema. Do not break if schema differs. If schema cannot support upsert, skip persistence and return issues in API.

Issue codes to use:

- TABLE_MISSING
- ZERO_ROWS
- ORPHAN_VOUCHER_LINES
- VOUCHERS_WITHOUT_LINES
- DUPLICATE_VOUCHERS
- MALFORMED_LEDGER_GROUP
- MISSING_LEDGER_REFERENCE
- PARTY_MAPPING_MISSING
- FINANCE_HEAD_SOURCE_MISSING
- FINANCE_HEAD_ROWCOUNT_MISMATCH
- FINANCE_HEAD_NEEDS_REVIEW
- NEGATIVE_BANK_CASH
- HARDCODED_FINANCE_VALUE_SUSPECTED

### 5. FinanceOS Audit UI

Add a non-invasive audit panel to Finance Dashboard or existing Tally diagnostics page.

Suggested UI:

- Tally Audit Health card
- Counts: vouchers, lines, ledgers, parties, issues
- Red critical issue count
- Yellow warning count
- Finance heads table:
  - Head
  - Amount
  - Source Table
  - Row Count
  - QC Status
  - Issues
- Issue list with severity, code, detail, sample expandable if possible

Do not add Balance Sheet page. Do not add statutory reports.

### 6. FinanceOS Card Safety

Where dashboard cards show finance values:

- Show value only if `qc_status === 'ok'` or show badge if `needs_review`.
- Show source/generation timestamp somewhere visible.
- If API returns missing/null amount, show `—` and warning, not `0` unless true zero is verified.

### 7. Tests / Local Checks

After code changes run:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

Also test routes locally:

```text
/finance-dashboard
/api/finance/tally/audit
/api/finance/tally/diagnostics
```

## Expected Output

When done, provide:

1. Files modified
2. APIs added/changed
3. UI changed
4. Supabase tables touched
5. Hardcoded values found and removed
6. Audit issue codes implemented
7. Testing checklist
8. Known issues
9. Recommended next sprint

## Acceptance Criteria

- FinanceOS no longer relies on hardcoded visible finance amounts.
- `/api/finance/tally/audit` returns useful audit result even with malformed data.
- Missing Tally entries are visible as audit issues.
- Malformed ledger/group values are visible as audit issues.
- Finance cards expose source/QC context.
- `needs_review` values are not presented as final.
- Existing FinanceOS pages still load.
