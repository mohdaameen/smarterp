# SmartERP Frontend Implementation Guide (Backend Contract)

Purpose: this file is the single source of truth for frontend implementation against the current backend.

Status date: 2026-07-04
Backend base URL (local): http://localhost:4000/api/v1

---

## 1. Global Rules You Must Follow

## 1.1 Auth
- Protected APIs require header: Authorization: Bearer <accessToken>
- Login returns accessToken and refreshToken.
- Refresh endpoint returns a new accessToken.

## 1.2 Company Scoping (critical)
- Companies module uses path param companyId.
- Masters, Vouchers, Reports require companyId in query string.
- Example: /masters/customers?companyId=<uuid>

If companyId is missing where required, backend returns 400 (companyId is required).

## 1.3 Response Envelope Patterns
Most endpoints:
- Success: { ok: true, data: ... }
- Error: { ok: false, error: string }

List endpoints in masters and vouchers/reports can return pagination shape:
- { ok: true, data: [...], meta: { total, page, limit, totalPages } }

Some endpoints also include summary:
- reports registers: { ok: true, data: [...], meta: {...}, summary: {...} }

## 1.4 Validation Errors
Zod validation errors return:
- {
  ok: false,
  error: "Validation error",
  details: [{ path: "fieldName", message: "..." }]
}

Frontend should render field-level messages using details[].

## 1.5 Roles (UI gating)
Hierarchy:
- VIEWER < OPERATOR < ACCOUNTANT < ADMIN < OWNER

Use this to hide/disable actions in UI.

---

## 2. Enums for Frontend Selects

UserRole:
- OWNER, ADMIN, ACCOUNTANT, OPERATOR, VIEWER

LedgerType:
- CUSTOMER, SUPPLIER, INCOME, EXPENSE, BANK, CASH, STOCK

VoucherType:
- SALES, PURCHASE, RECEIPT, PAYMENT, JOURNAL, CREDIT_NOTE, DEBIT_NOTE

VoucherStatus:
- DRAFT, POSTED, CANCELLED

GstType:
- CGST, SGST, IGST

InventoryTxnType:
- IN, OUT, ADJUSTMENT, TRANSFER

StockValuationMethod:
- FIFO, AVG

PaymentMode (for receipt/payment vouchers):
- CASH, CHEQUE, BANK_TRANSFER, ONLINE

---

## 3. Authentication Module

## 3.1 Register
POST /auth/register
Body:
- fullName (string, min 2)
- email (email)
- password (string, min 8)
- phone (optional)

Success data shape:
- id, fullName, email, phone, createdAt

## 3.2 Login
POST /auth/login
Body:
- email
- password

Success data shape:
- accessToken
- refreshToken
- user: { id, fullName, email }

## 3.3 Refresh Token
POST /auth/refresh
Body:
- refreshToken

Success data shape:
- accessToken

## 3.4 My Profile
GET /auth/me
Header: Authorization

Success data shape:
- id, fullName, email, phone, isActive, lastLoginAt, createdAt

Frontend implementation notes:
- Persist tokens securely (at least memory + optional localStorage fallback).
- Add request interceptor to inject accessToken.
- On 401, call refresh and retry once.

---

## 4. Company Module

## 4.1 Create Company
POST /companies
Body (important keys):
- name (required)
- gstNumber (optional)
- legalName, panNumber, stateCode, addressLine1, addressLine2, city, postalCode, country, phone, email
- stockValuationMethod (FIFO/AVG)
- allowNegativeStock (boolean)

Notes:
- Max 5 companies per user account.
- Creator becomes OWNER member automatically.

## 4.2 List My Companies
GET /companies
Returns company rows plus role in each row.

## 4.3 Get Company
GET /companies/:companyId
Role required: VIEWER+

## 4.4 Update Company
PATCH /companies/:companyId
Role required: ADMIN+

## 4.5 Financial Years
- GET /companies/:companyId/financial-years (VIEWER+)
- POST /companies/:companyId/financial-years (ADMIN+)

Create FY body:
- label (example: 2026-27)
- startDate (YYYY-MM-DD)
- endDate (YYYY-MM-DD)
- isCurrent (boolean)

Rule:
- endDate must be after startDate.

## 4.6 Members
- GET /companies/:companyId/members (ADMIN+)
- POST /companies/:companyId/members (OWNER)

Add member body:
- email
- role: ADMIN | ACCOUNTANT | OPERATOR | VIEWER

---

## 5. Masters Module

Important:
- All masters endpoints require ?companyId=<uuid>

## 5.1 Ledger Groups
Routes:
- GET /masters/ledger-groups?companyId=...
- POST /masters/ledger-groups?companyId=...
- GET /masters/ledger-groups/:id?companyId=...
- PATCH /masters/ledger-groups/:id?companyId=...
- DELETE /masters/ledger-groups/:id?companyId=...

Create body:
- name (required)
- nature (required, example: ASSET / LIABILITY / INCOME / EXPENSE)
- parentGroupId (optional)

Role:
- create/update: ACCOUNTANT+
- delete: ADMIN+

## 5.2 Ledgers
Routes:
- GET /masters/ledgers?companyId=...
- POST /masters/ledgers?companyId=...
- GET /masters/ledgers/:id?companyId=...
- PATCH /masters/ledgers/:id?companyId=...
- DELETE /masters/ledgers/:id?companyId=...

Create body:
- ledgerGroupId (required)
- name (required)
- ledgerType (required enum)
- code (optional)
- openingBalance (number, default 0)
- openingBalanceType (DR/CR)
- gstin, pan, email, phone, addressJson

Role:
- create/update: ACCOUNTANT+
- delete: ADMIN+

## 5.3 Units
Routes:
- GET /masters/units?companyId=...
- POST /masters/units?companyId=...
- GET /masters/units/:id?companyId=...
- PATCH /masters/units/:id?companyId=...
- DELETE /masters/units/:id?companyId=...

Create body:
- name, symbol, decimalPlaces

Role:
- create/update: OPERATOR+
- delete: ADMIN+

## 5.4 Stock Groups
Routes:
- GET /masters/stock-groups?companyId=...
- POST /masters/stock-groups?companyId=...
- GET /masters/stock-groups/:id?companyId=...
- PATCH /masters/stock-groups/:id?companyId=...
- DELETE /masters/stock-groups/:id?companyId=...

Create body:
- name
- parentGroupId (optional)

Role:
- create/update: OPERATOR+
- delete: ADMIN+

## 5.5 Stock Items
Routes:
- GET /masters/stock-items?companyId=...
- POST /masters/stock-items?companyId=...
- GET /masters/stock-items/:id?companyId=...
- PATCH /masters/stock-items/:id?companyId=...
- DELETE /masters/stock-items/:id?companyId=...

Create body:
- stockGroupId, unitId, name, sku
- barcode, hsnCode
- purchasePrice, sellingPrice, gstRate, reorderLevel

Role:
- create/update: OPERATOR+
- delete: ADMIN+

## 5.6 Customers
Routes:
- GET /masters/customers?companyId=...
- POST /masters/customers?companyId=...
- GET /masters/customers/:id?companyId=...
- PATCH /masters/customers/:id?companyId=...
- DELETE /masters/customers/:id?companyId=...

Create body:
- name (required)
- ledgerGroupId (required)
- mobile, email, gstin
- addressJson
- creditLimit

Important:
- Backend auto-creates a CUSTOMER ledger and links it.

Role:
- create/update: OPERATOR+
- delete: ADMIN+

## 5.7 Suppliers
Routes:
- GET /masters/suppliers?companyId=...
- POST /masters/suppliers?companyId=...
- GET /masters/suppliers/:id?companyId=...
- PATCH /masters/suppliers/:id?companyId=...
- DELETE /masters/suppliers/:id?companyId=...

Create body:
- name (required)
- ledgerGroupId (required)
- mobile, email, gstin
- addressJson

Important:
- Backend auto-creates a SUPPLIER ledger and links it.

Role:
- create/update: OPERATOR+
- delete: ADMIN+

## 5.8 Pagination/Search Pattern (masters lists)
Typical query params:
- companyId (required)
- page (optional, default 1)
- limit (optional, default 20, max 100)
- search (optional)

List response:
- { ok: true, data: [...], meta: { total, page, limit, totalPages } }

---

## 6. Vouchers Module

Important:
- All voucher endpoints require ?companyId=<uuid>
- Voucher posting requires ACCOUNTANT+
- Cancel requires ADMIN

## 6.1 Sales Voucher
POST /vouchers/sales?companyId=...
Body:
- companyId
- financialYearId
- customerId
- salesLedgerId
- voucherDate (YYYY-MM-DD)
- isInterState (boolean)
- items: [{ stockItemId, qty, rate, gstRate, description? }]
- narration, referenceNumber, billingAddressJson, shippingAddressJson, notes
- idempotencyKey (optional)

Success data:
- voucher object
- invoice object

## 6.2 Purchase Voucher
POST /vouchers/purchase?companyId=...
Body:
- companyId
- financialYearId
- supplierId
- purchaseLedgerId
- voucherDate
- isInterState
- items[]
- narration, referenceNumber
- idempotencyKey (optional)

Success data:
- voucher object

## 6.3 Receipt Voucher
POST /vouchers/receipt?companyId=...
Body:
- companyId
- financialYearId
- customerId
- bankCashLedgerId
- voucherDate
- amount
- paymentMode (CASH/CHEQUE/BANK_TRANSFER/ONLINE)
- chequeNumber (optional)
- narration, referenceNumber
- idempotencyKey (optional)

Success data:
- voucher object

## 6.4 Payment Voucher
POST /vouchers/payment?companyId=...
Body:
- companyId
- financialYearId
- supplierId
- bankCashLedgerId
- voucherDate
- amount
- paymentMode
- chequeNumber (optional)
- narration, referenceNumber
- idempotencyKey (optional)

Success data:
- voucher object

## 6.5 List Vouchers
GET /vouchers?companyId=...&financialYearId=...&voucherType=...&status=...&fromDate=...&toDate=...&page=1&limit=20

Response:
- { ok: true, data: [...], meta: { total, page, limit, totalPages } }

## 6.6 Voucher Detail
GET /vouchers/:id?companyId=...

Response includes:
- voucher base fields
- voucherLines with stockItem and ledger
- invoice with items and customer (if sales)
- ledgerEntries with ledger
- gstRecords
- counterpartyLedger

## 6.7 Cancel Voucher
PATCH /vouchers/:id/cancel?companyId=...
Body:
- reason

Response:
- { ok: true, message: "Voucher cancelled" }

---

## 7. Reports Module

Important:
- All report endpoints require ?companyId=<uuid>
- Auth + company membership required

## 7.1 Stock Summary
GET /reports/stock-summary?companyId=...&financialYearId=...&fromDate=...&toDate=...&stockGroupId=...

Response data item fields:
- stockItemId, name, sku, stockGroup, unit
- qtyIn, qtyOut, balance
- avgCost, stockValue

## 7.2 Sales Register
GET /reports/sales-register?companyId=...&financialYearId=...&fromDate=...&toDate=...&page=1&limit=20

Response:
- data: vouchers (SALES POSTED)
- meta: pagination
- summary: totalTaxable, totalTax, grandTotal

## 7.3 Purchase Register
GET /reports/purchase-register?companyId=...&financialYearId=...&fromDate=...&toDate=...&page=1&limit=20

Response:
- data: vouchers (PURCHASE POSTED)
- meta
- summary

## 7.4 Outstanding Customers
GET /reports/outstanding-customers?companyId=...&financialYearId=...&fromDate=...&toDate=...

Response data item fields:
- customerId, name, mobile, gstin, creditLimit, outstanding

## 7.5 Outstanding Suppliers
GET /reports/outstanding-suppliers?companyId=...&financialYearId=...&fromDate=...&toDate=...

Response data item fields:
- supplierId, name, mobile, gstin, outstanding

---

## 8. Frontend App State Blueprint

Global state you should keep:
- auth: accessToken, refreshToken, user
- workspace: selectedCompanyId, selectedFinancialYearId, role
- ui: loading/error/toast, keyboard shortcut scope

Recommended persisted keys:
- selectedCompanyId
- selectedFinancialYearId
- lastVisitedModule

---

## 9. Screen-by-Screen Frontend Checklist

## 9.1 Auth Screens
- Register form
- Login form
- Session restore on app load
- Token refresh path
- Logout

## 9.2 Company Selection
- List companies
- Create company
- Open company dashboard
- Financial year list/create/switch
- Members list/add (role-gated)

## 9.3 Masters
- Ledger Groups CRUD
- Ledgers CRUD
- Units CRUD
- Stock Groups CRUD
- Stock Items CRUD
- Customers CRUD
- Suppliers CRUD
- Shared table with pagination and search

## 9.4 Transactions
- Sales voucher form
- Purchase voucher form
- Receipt voucher form
- Payment voucher form
- Voucher list with filters
- Voucher detail drawer/page
- Cancel action for ADMIN

## 9.5 Reports
- Stock summary table
- Sales register table + summary cards
- Purchase register table + summary cards
- Outstanding customers table
- Outstanding suppliers table

---

## 10. Keyboard-first UX Mapping (MVP)

Implement these first:
- F1: company selector
- Ctrl+H: home
- Ctrl+K: command search
- F8: sales voucher
- F9: purchase voucher
- F6: receipt voucher
- Ctrl+B: new invoice/sales form
- Ctrl+C: new customer
- Ctrl+S: new supplier
- Esc: close modal/go back

Use a central shortcut manager and disable shortcuts while typing in input/textarea unless explicitly required.

---

## 11. Suggested Frontend API Client Contract

Every request helper should accept:
- path
- method
- query object
- body object
- requireAuth flag

Central behaviors:
- auto-append companyId query for masters, vouchers, reports
- attach Authorization header
- parse envelope and throw normalized error object
- retry once on refresh for 401

Normalized frontend error object suggested:
- status
- message
- fieldErrors: [{ path, message }]

---

## 12. Known Working Payloads (Verified)

These are verified live in integration testing:

Create Financial Year:
- { label: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", isCurrent: true }

Create Ledger Group:
- { name: "Assets", nature: "ASSET" }

Create Bank Ledger:
- { ledgerGroupId: "<assetsGroupId>", name: "State Bank of India", code: "BNK-001", ledgerType: "BANK" }

Create Customer:
- { name: "Acme Corp", mobile: "9876543210", email: "acme@example.com", ledgerGroupId: "<debtorsGroupId>", addressJson: { billingAddress: "123 Main St" }, creditLimit: 100000 }

Create Supplier:
- { name: "XYZ Traders", mobile: "9988776655", email: "xyz@example.com", ledgerGroupId: "<creditorsGroupId>", addressJson: { billingAddress: "456 Industrial Ave" } }

Post Receipt:
- { companyId, financialYearId, customerId, bankCashLedgerId, voucherDate: "2026-07-04", amount: 10000, paymentMode: "BANK_TRANSFER", narration: "Advance from Acme Corp" }

Post Payment:
- { companyId, financialYearId, supplierId, bankCashLedgerId, voucherDate: "2026-07-04", amount: 5000, paymentMode: "CHEQUE", chequeNumber: "CHQ-2025-456", narration: "Payment to XYZ Traders" }

---

## 13. Frontend Delivery Order (Fastest Path)

1. Auth + API client + token refresh
2. Company select + FY select context
3. Masters: ledger groups, ledgers, customers, suppliers
4. Receipt/payment vouchers (already validated backend flow)
5. Voucher list + voucher detail
6. Reports pages
7. Sales/purchase voucher advanced flows
8. Keyboard shortcut layer

---

## 14. What Is Not Fully Ready Yet (Backend scope)

Planned/pending in backend roadmap:
- Journal voucher routes
- Contra, credit note, debit note flows
- Full financial statements (balance sheet, P&L, trial balance, cash flow)
- Some advanced banking/GST modules
- Full automated test suite

Frontend should keep these menu items behind a Coming Soon flag for now.

---

## 15. File References Used For This Contract

- apps/api/src/server.ts
- apps/api/src/middlewares/auth.ts
- apps/api/src/middlewares/error.ts
- apps/api/src/middlewares/validate.ts
- apps/api/src/modules/auth/auth.routes.ts
- apps/api/src/modules/auth/auth.schema.ts
- apps/api/src/modules/auth/auth.service.ts
- apps/api/src/modules/companies/companies.routes.ts
- apps/api/src/modules/companies/companies.schema.ts
- apps/api/src/modules/companies/companies.service.ts
- apps/api/src/modules/masters/masters.routes.ts
- apps/api/src/modules/masters/masters.schema.ts
- apps/api/src/modules/vouchers/vouchers.routes.ts
- apps/api/src/modules/vouchers/vouchers.schema.ts
- apps/api/src/modules/reports/reports.routes.ts
- apps/api/src/modules/reports/reports.service.ts
- apps/api/prisma/schema.prisma
