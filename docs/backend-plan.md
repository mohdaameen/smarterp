# SmartERP Backend Plan (PDF-Aligned Status + Next Plan)

Last updated: 2026-07-04

## 1. Purpose

This document maps the backend implementation against the assignment PDF and clearly shows:

1. What is implemented
2. What is tested
3. What is pending (todo)
4. How to finish the remaining work in a practical order

## 2. Current Summary

Backend is strong for MVP accounting + inventory core.

High-level status:

- Foundation/API architecture: implemented and tested
- Core masters + core vouchers: implemented and tested
- Core operational reports: implemented and tested
- Advanced ERP modules from PDF: partially pending by design

## 3. Feature-Wise Status Table (Based on PDF)

Legend:

- Implemented: Yes/Partial/No
- Tested: Yes/Partial/No
- Todo: immediate next backend action

| PDF Module / Feature | Implemented | Tested | Notes (Current Backend) | Todo |
|---|---|---|---|---|
| Authentication (Register/Login/Refresh/Profile) | Yes | Yes | JWT auth routes live under `/api/v1/auth` | Add token revocation strategy |
| Company Selection + Multi-company basics | Yes | Yes | Company CRUD + membership + roles + FY routes available | Enforce max-5 companies validation if not strict yet |
| Company Alter/Delete flows | Partial | Partial | Create/list/get/update confirmed; delete behavior not treated as core in current docs | Finalize delete policy (soft/hard) and tests |
| Role-based access control | Yes | Yes | Role checks used across companies/masters/vouchers/reports | Add role matrix doc in API docs |
| Masters: Ledger Groups | Yes | Yes | CRUD implemented | Add bulk import endpoint (optional) |
| Masters: Ledgers | Yes | Yes | CRUD implemented with role checks | Add stronger duplicate-code/name guards |
| Masters: Units | Yes | Yes | CRUD implemented | Add unit conversion rules (optional) |
| Masters: Stock Groups | Yes | Yes | CRUD implemented | Add hierarchy report endpoint (optional) |
| Masters: Stock Items | Yes | Yes | CRUD implemented | Add low-stock threshold endpoint |
| Masters: Customers | Yes | Yes | CRUD implemented, ledger linkage in service flow | Add customer statement endpoint |
| Masters: Suppliers | Yes | Yes | CRUD implemented, ledger linkage in service flow | Add supplier statement endpoint |
| Voucher: Sales | Yes | Yes | Posting + inventory impact + GST + list/detail/cancel flow | Add print/invoice payload enrichment |
| Voucher: Purchase | Yes | Yes | Posting + inventory impact + GST + list/detail/cancel flow | Add supplier bill attachment metadata |
| Voucher: Receipt | Yes | Yes | Implemented and tested in previous integration checks | Add optional bank reference validation |
| Voucher: Payment | Yes | Yes | Implemented and tested in previous integration checks | Add optional approval workflow |
| Voucher: Journal | Yes | Yes | Minimal posting endpoint implemented (`/vouchers/journal`) with balanced DR/CR validation and live post/list/detail smoke test passed | Keep in regression smoke suite |
| Voucher: Contra | Yes | No | Endpoint implemented (`POST /vouchers/contra`) with bank/cash transfer validation and balanced ledger entries (journal-backed) | Add smoke test + dedicated `CONTRA` enum/migration if needed |
| Voucher: Credit Note | Yes | No | Endpoint implemented (`POST /vouchers/credit-note`) with customer + sales-return ledger posting | Add smoke test with customer return scenario |
| Voucher: Debit Note | Yes | No | Endpoint implemented (`POST /vouchers/debit-note`) with supplier + purchase-return ledger posting | Add smoke test with supplier return scenario |
| Inventory: Stock In/Out (via vouchers) | Yes | Yes | Purchase/sales generate inventory transactions | Maintain regression coverage |
| Inventory: Transfer/Adjustment module | Partial | Yes | Inventory adjustment endpoint implemented (`POST /vouchers/inventory-adjustment`) and smoke-tested with negative-stock guard | Add stock transfer API and include ADJUSTMENT in stock summary report |
| Billing/Invoice numbering for sales | Yes | Yes | Sales voucher creates invoice-related flow | Add proforma/quotation support (optional) |
| GST calculations (CGST/SGST/IGST) | Yes | Yes | Calculation logic active in voucher posting | Add GST summary report endpoint set |
| Reports: Stock Summary | Yes | Yes | Route exists and tested | Add low-stock report |
| Reports: Sales Register | Yes | Yes | Route exists and tested | Add daily/monthly grouped variants |
| Reports: Purchase Register | Yes | Yes | Route exists and tested | Add supplier summary variant |
| Reports: Outstanding Customers | Yes | Yes | Route exists and tested | Add aging buckets |
| Reports: Outstanding Suppliers | Yes | Yes | Route exists and tested | Add aging buckets |
| Reports: Balance Sheet | Yes | Yes | Endpoint implemented (`GET /reports/balance-sheet`) with assets/liabilities/equity sections and balancing summary; added to automated smoke run | Add section grouping refinements if evaluator expects strict schedule format |
| Reports: Profit and Loss | Yes | Yes | Endpoint implemented (`GET /reports/profit-loss`) with period income/expense rollup and net profit/loss summary; covered by smoke test | Add grouped presentation by ledger groups if needed |
| Reports: Trial Balance | Yes | Yes | Endpoint implemented (`GET /reports/trial-balance`) with opening/period/closing balances and summary totals; live smoke tested | Keep in regression smoke suite |
| Reports: Cash Flow | Yes | Yes | Endpoint implemented (`GET /reports/cash-flow`) over cash/bank ledgers with opening/inflow/outflow/net/closing summary; covered by smoke test | Add operating/investing/financing classification if needed |
| Banking module (reconciliation/cheque mgmt) | No | No | Not implemented | Defer beyond MVP unless required |
| Keyboard-shortcut backend support | Partial | Partial | Backend endpoints available for core actions | Frontend keyboard layer needed for full PDF goal |
| OpenAPI / Swagger full coverage | Yes | Partial | Swagger expanded with active auth/companies/masters/vouchers/reports routes including contra/credit-note/debit-note | Add response envelope examples and keep in sync with future routes |
| Automated backend test suite | Yes | Yes | Automated smoke command (`npm run smoke:api`) covers auth/company/masters/vouchers/reports including balance-sheet, profit-loss, and cash-flow | CI intentionally skipped for college project scope |

## 4. What Is Considered Tested "For Now"

The following are treated as tested based on current implementation work and runtime verification done during this phase:

1. API boot + DB connectivity
2. Auth flows (register/login/refresh/me)
3. Companies + financial year + members flow
4. Masters CRUD set (groups/ledgers/units/stock groups/stock items/customers/suppliers)
5. Vouchers (sales/purchase/receipt/payment)
6. Report endpoints currently implemented (stock summary, sales register, purchase register, outstanding)

## 5. Practical Plan To Reach "Backend Done for Submission"

Goal: Complete the minimum high-impact pending scope without attempting full enterprise ERP.

### Phase A (Day 1)

1. Complete OpenAPI docs for all currently implemented routes
2. Add examples for request/response payloads and validation errors
3. Freeze and publish API contract for frontend/demo

### Phase B (Day 2)

1. Add backend smoke tests for critical happy paths:
  - auth
  - company + FY
  - masters creation
  - voucher posting (sales/purchase/receipt/payment)
  - report fetch checks
2. Add one command to run smoke suite in local/CI

### Phase C (Day 3)

1. Implement Journal voucher (minimal)
2. Implement one inventory adjustment endpoint
3. Add low-stock report endpoint

### Phase D (Day 4)

1. Security hardening:
  - auth rate limiting
  - refresh token revocation table/strategy
2. Final stabilization and regression pass

## 6. Deferred Scope (Explicit)

These remain intentionally out-of-scope for current submission unless evaluator strictly demands them:

1. Contra, credit note, debit note full workflows
2. Balance sheet, P&L, trial balance, cash flow full accounting statements
3. Banking reconciliation and cheque lifecycle management
4. Advanced GST exports/filing formats
5. Payroll, multi-branch, OCR/AI features

## 7. Submission-Ready Statement

Backend is currently strong enough to present as MVP-complete for core SmartERP operations (auth, company scoping, masters, sales/purchase/receipt/payment vouchers, inventory impacts, GST-ready posting, and operational reports), with advanced accounting statements and banking workflows clearly marked as phase-2 enhancements.
