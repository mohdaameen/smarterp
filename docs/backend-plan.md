# SmartERP Backend Plan (MVP First)

## 1. Goal
Build a reliable, keyboard-friendly, Tally-inspired backend for SmartERP that supports:
- Company-scoped accounting and inventory
- Core masters (ledger, customer, supplier, item/stock)
- Core vouchers (sales and purchase)
- GST-ready calculations and reporting foundations
- Strong auditability and correctness over feature volume

## 2. MVP Scope (Backend Only)
### In Scope
- Authentication and authorization (JWT, role-based basics)
- Multi-company support (up to 5 companies per account)
- Masters:
  - Ledgers (customer/supplier/income/expense/bank/cash)
  - Stock groups
  - Stock items
  - Units
  - Customers
  - Suppliers
- Transactions:
  - Sales voucher (invoice)
  - Purchase voucher
  - Journal/receipt/payment (minimal structure, optional in phase 2)
- Inventory movement tracking
- GST calculation fields and persistence
- Basic reports API:
  - Stock summary
  - Sales register
  - Purchase register
  - Outstanding customers/suppliers
- Audit logs for create/update/delete on critical modules

### Out of Scope (for initial MVP)
- Payroll
- Advanced banking reconciliation
- Mobile app
- OCR/AI insights
- WhatsApp/email invoice integration
- Complex multi-branch

## 3. Proposed Backend Architecture
- Runtime: Node.js + TypeScript
- Framework: Express
- DB: PostgreSQL
- Data access: Prisma ORM (recommended) or Drizzle
- Auth: JWT (access + refresh)
- Validation: Zod
- API style: REST (versioned `/api/v1`)
- Logging: Pino
- Testing: Vitest + Supertest
- Docs: OpenAPI/Swagger

### High-Level Modules
- `auth`
- `users`
- `companies`
- `masters` (ledgers, groups, units, stock items, customers, suppliers)
- `vouchers` (sales, purchase, payment, receipt, journal)
- `inventory`
- `reports`
- `gst`
- `audit`

## 4. Data Model Plan (Core Entities)
### Identity & Access
- `users`
- `roles`
- `user_companies` (many-to-many membership)

### Organization
- `companies`
- `financial_years`

### Masters
- `ledger_groups`
- `ledgers`
- `units`
- `stock_groups`
- `stock_items`
- `customers`
- `suppliers`

### Transactions
- `vouchers`
- `voucher_lines`
- `invoices`
- `invoice_items`
- `inventory_transactions`
- `ledger_entries` (double-entry-ready foundation)

### Compliance & Tracking
- `gst_records`
- `audit_logs`

## 5. API Design Principles
- Every business record is company-scoped using `companyId`
- Financial-year-aware filters on transactional endpoints
- Soft delete on masters where needed, hard delete only when safe
- Idempotency key support for invoice/voucher creation
- Pagination + search + sort on listing APIs
- Uniform response envelope and error schema

### Example Route Groups
- `POST /api/v1/auth/login`
- `POST /api/v1/companies`
- `GET /api/v1/companies/:id`
- `POST /api/v1/masters/ledgers`
- `POST /api/v1/masters/stock-items`
- `POST /api/v1/vouchers/sales`
- `POST /api/v1/vouchers/purchase`
- `GET /api/v1/reports/stock-summary`
- `GET /api/v1/reports/sales-register`

## 6. Accounting and Inventory Rules (MVP)
- Sales voucher:
  - Decrease stock from `inventory_transactions`
  - Create receivable/customer ledger impact
  - Persist GST breakup (CGST/SGST/IGST)
- Purchase voucher:
  - Increase stock
  - Create payable/supplier ledger impact
  - Persist GST breakup
- Voucher posting should be transactional (single DB transaction)
- Prevent negative stock based on company setting (default: block)
- Preserve immutable voucher number once posted (allow cancel/reverse flow later)

## 7. Security, Quality, and Reliability
- Password hashing with bcrypt/argon2
- JWT with short-lived access token + refresh token rotation
- Role checks at route and company-membership level
- Input validation via Zod at boundaries
- SQL injection protection through ORM
- Rate limiting on auth and sensitive endpoints
- Central error handler + structured logs
- Audit log for critical mutations

## 8. Suggested Folder Structure (`apps/api/src`)
- `config/` (env, logger, constants)
- `middlewares/` (auth, role, validation, error)
- `modules/`
  - `auth/`
  - `companies/`
  - `masters/`
  - `vouchers/`
  - `inventory/`
  - `reports/`
  - `audit/`
- `db/` (client, migrations, seed)
- `utils/`
- `types/`
- `server.ts`

## 9. 4-Phase Backend Delivery Plan
### Phase 1 - Foundation (2-3 days)
- Setup Express + TypeScript conventions
- Add env validation, logger, error middleware
- Configure PostgreSQL + ORM + migration pipeline
- Implement auth basics and company membership model

### Phase 2 - Masters (3-4 days)
- CRUD for ledgers, units, stock groups, stock items
- CRUD for customers and suppliers
- Search/filter/pagination for all lists
- Audit logging for all mutations

### Phase 3 - Core Vouchers (4-5 days)
- Sales voucher posting with invoice + item lines
- Purchase voucher posting
- Inventory transaction creation
- Ledger entry creation and GST storage
- Transaction-safe posting and rollback handling

### Phase 4 - Reports + Hardening (2-3 days)
- Stock summary, sales register, purchase register, outstanding APIs
- RBAC refinements
- Test coverage for posting workflows
- OpenAPI docs and production readiness checks

## 10. Testing Strategy
- Unit tests:
  - Tax calculation
  - Voucher numbering
  - Inventory balance logic
- Integration tests:
  - Sales posting end-to-end
  - Purchase posting end-to-end
  - Company isolation and RBAC
- Contract tests:
  - Critical API response schema for frontend stability

## 11. Environment Variables (Initial)
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_TTL`
- `CORS_ORIGIN`

## 12. Definition of Done (MVP Backend)
- Auth + company scoping enforced across APIs
- Masters and core voucher APIs functional
- Inventory and ledger impacts persist correctly
- Basic reports available and validated
- Minimum test coverage on core posting flows
- API docs generated and shared with frontend
- Error handling and audit logs enabled

## 13. Immediate Next Tasks
1. Finalize DB schema for core entities and relations.
2. Setup ORM migrations and seed script for one demo company.
3. Implement auth + company middleware.
4. Build masters module endpoints.
5. Implement sales and purchase voucher posting with DB transactions.
6. Add report endpoints and integration tests.
