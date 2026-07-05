# TLY Sales Invoice Rule

## Decision

Do not treat every Tally Sales voucher as owner sales.

A voucher is a real owner sales invoice only when voucher number starts with:

- FFT slash pattern
- numeric invoice number such as 01, 33, 1001

Exclude sales-like voucher numbers that start with or indicate:

- proforma
- performa
- PI
- quotation
- estimate
- draft
- test

## Current check

From Tally sales voucher-type rows:

- total sales voucher-type rows: 1514
- owner-valid sales invoices: 953
- excluded sales-like rows: 561

## Rule

Owner Sales must read only from a clean sales source applying the above invoice-number rule.

Proforma, performa, PI, quotation, estimate, draft, and test rows must go to excluded/review and must not be counted as real sales.
