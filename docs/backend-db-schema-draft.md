# SmartERP Backend DB Schema Draft (PostgreSQL)

## 1. Notes and Conventions
- All business tables are company-scoped using `company_id` unless explicitly global.
- Use `UUID` primary keys (`gen_random_uuid()`).
- Timestamps: `created_at`, `updated_at` (`timestamptz`).
- Soft delete where needed via `is_active` or `deleted_at`.
- Use `numeric(18,2)` for monetary values (or higher precision where needed).
- Use DB transactions for voucher posting.

## 2. Core Enums (Suggested)
- `ledger_type`: `CUSTOMER`, `SUPPLIER`, `INCOME`, `EXPENSE`, `BANK`, `CASH`, `STOCK`
- `voucher_type`: `SALES`, `PURCHASE`, `RECEIPT`, `PAYMENT`, `JOURNAL`, `CREDIT_NOTE`, `DEBIT_NOTE`
- `voucher_status`: `DRAFT`, `POSTED`, `CANCELLED`
- `gst_type`: `CGST`, `SGST`, `IGST`
- `inventory_txn_type`: `IN`, `OUT`, `ADJUSTMENT`, `TRANSFER`
- `stock_valuation_method`: `FIFO`, `AVG`
- `user_role`: `OWNER`, `ADMIN`, `ACCOUNTANT`, `OPERATOR`, `VIEWER`

## 3. Identity and Access

## Table: users
- `id` UUID PK
- `full_name` varchar(120) not null
- `email` varchar(255) unique not null
- `password_hash` text not null
- `phone` varchar(20)
- `is_active` boolean default true
- `last_login_at` timestamptz
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Indexes:
- unique(`email`)

## Table: companies
- `id` UUID PK
- `owner_user_id` UUID FK -> users(id)
- `name` varchar(180) not null
- `legal_name` varchar(220)
- `gst_number` varchar(20)
- `pan_number` varchar(20)
- `state_code` varchar(10)
- `address_line1` varchar(255)
- `address_line2` varchar(255)
- `city` varchar(100)
- `postal_code` varchar(20)
- `country` varchar(80) default 'India'
- `phone` varchar(20)
- `email` varchar(255)
- `is_active` boolean default true
- `stock_valuation_method` stock_valuation_method default 'FIFO'
- `allow_negative_stock` boolean default false
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Indexes:
- index(`owner_user_id`)
- unique optional on (`gst_number`) if required by business

## Table: user_companies
- `id` UUID PK
- `user_id` UUID FK -> users(id)
- `company_id` UUID FK -> companies(id)
- `role` user_role not null
- `is_active` boolean default true
- `created_at` timestamptz default now()

Constraints:
- unique(`user_id`, `company_id`)

Indexes:
- index(`company_id`, `role`)

## Table: financial_years
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `label` varchar(30) not null (example: `2026-27`)
- `start_date` date not null
- `end_date` date not null
- `is_current` boolean default false
- `is_locked` boolean default false
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Constraints:
- unique(`company_id`, `label`)

Indexes:
- index(`company_id`, `is_current`)

## 4. Masters

## Table: ledger_groups
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `name` varchar(120) not null
- `parent_group_id` UUID FK -> ledger_groups(id) nullable
- `nature` varchar(30) not null (ASSET/LIABILITY/INCOME/EXPENSE)
- `is_system` boolean default false
- `is_active` boolean default true
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Constraints:
- unique(`company_id`, `name`)

## Table: ledgers
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `ledger_group_id` UUID FK -> ledger_groups(id)
- `name` varchar(140) not null
- `code` varchar(40)
- `ledger_type` ledger_type not null
- `opening_balance` numeric(18,2) default 0
- `opening_balance_type` varchar(2) default 'DR' (DR/CR)
- `gstin` varchar(20)
- `pan` varchar(20)
- `email` varchar(255)
- `phone` varchar(20)
- `address_json` jsonb
- `is_active` boolean default true
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Constraints:
- unique(`company_id`, `name`)

Indexes:
- index(`company_id`, `ledger_type`)
- index(`company_id`, `code`)

## Table: units
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `name` varchar(60) not null
- `symbol` varchar(20) not null (PCS/KG/BOX/LTR)
- `decimal_places` int default 2
- `is_active` boolean default true
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Constraints:
- unique(`company_id`, `symbol`)

## Table: stock_groups
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `name` varchar(120) not null
- `parent_group_id` UUID FK -> stock_groups(id) nullable
- `is_active` boolean default true
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Constraints:
- unique(`company_id`, `name`)

## Table: stock_items
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `stock_group_id` UUID FK -> stock_groups(id)
- `unit_id` UUID FK -> units(id)
- `name` varchar(180) not null
- `sku` varchar(80) not null
- `barcode` varchar(80)
- `hsn_code` varchar(20)
- `purchase_price` numeric(18,2) default 0
- `selling_price` numeric(18,2) default 0
- `gst_rate` numeric(5,2) default 0
- `reorder_level` numeric(18,3) default 0
- `is_active` boolean default true
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Constraints:
- unique(`company_id`, `sku`)
- unique(`company_id`, `name`)

Indexes:
- index(`company_id`, `stock_group_id`)

## Table: customers
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `ledger_id` UUID FK -> ledgers(id) unique
- `name` varchar(180) not null
- `mobile` varchar(20)
- `email` varchar(255)
- `gstin` varchar(20)
- `address_json` jsonb
- `credit_limit` numeric(18,2) default 0
- `is_active` boolean default true
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Indexes:
- index(`company_id`, `name`)

## Table: suppliers
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `ledger_id` UUID FK -> ledgers(id) unique
- `name` varchar(180) not null
- `mobile` varchar(20)
- `email` varchar(255)
- `gstin` varchar(20)
- `address_json` jsonb
- `is_active` boolean default true
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Indexes:
- index(`company_id`, `name`)

## 5. Transactions and Posting

## Table: vouchers
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `financial_year_id` UUID FK -> financial_years(id)
- `voucher_type` voucher_type not null
- `voucher_number` varchar(40) not null
- `voucher_date` date not null
- `reference_number` varchar(60)
- `narration` text
- `status` voucher_status default 'POSTED'
- `counterparty_ledger_id` UUID FK -> ledgers(id) nullable
- `total_taxable_amount` numeric(18,2) default 0
- `total_tax_amount` numeric(18,2) default 0
- `total_amount` numeric(18,2) default 0
- `created_by` UUID FK -> users(id)
- `updated_by` UUID FK -> users(id)
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Constraints:
- unique(`company_id`, `financial_year_id`, `voucher_type`, `voucher_number`)

Indexes:
- index(`company_id`, `voucher_date`)
- index(`company_id`, `voucher_type`, `status`)

## Table: voucher_lines
- `id` UUID PK
- `voucher_id` UUID FK -> vouchers(id)
- `line_no` int not null
- `ledger_id` UUID FK -> ledgers(id) nullable
- `stock_item_id` UUID FK -> stock_items(id) nullable
- `description` varchar(255)
- `qty` numeric(18,3)
- `rate` numeric(18,4)
- `taxable_amount` numeric(18,2) default 0
- `gst_rate` numeric(5,2) default 0
- `cgst_amount` numeric(18,2) default 0
- `sgst_amount` numeric(18,2) default 0
- `igst_amount` numeric(18,2) default 0
- `line_total` numeric(18,2) default 0

Constraints:
- unique(`voucher_id`, `line_no`)

Indexes:
- index(`voucher_id`)
- index(`stock_item_id`)

## Table: invoices
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `voucher_id` UUID FK -> vouchers(id) unique
- `invoice_number` varchar(40) not null
- `invoice_date` date not null
- `customer_id` UUID FK -> customers(id)
- `billing_address_json` jsonb
- `shipping_address_json` jsonb
- `sub_total` numeric(18,2) default 0
- `tax_total` numeric(18,2) default 0
- `grand_total` numeric(18,2) default 0
- `round_off` numeric(18,2) default 0
- `notes` text
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

Constraints:
- unique(`company_id`, `invoice_number`)

Indexes:
- index(`company_id`, `invoice_date`)

## Table: invoice_items
- `id` UUID PK
- `invoice_id` UUID FK -> invoices(id)
- `line_no` int not null
- `stock_item_id` UUID FK -> stock_items(id)
- `description` varchar(255)
- `hsn_code` varchar(20)
- `qty` numeric(18,3) not null
- `rate` numeric(18,4) not null
- `taxable_amount` numeric(18,2) default 0
- `gst_rate` numeric(5,2) default 0
- `cgst_amount` numeric(18,2) default 0
- `sgst_amount` numeric(18,2) default 0
- `igst_amount` numeric(18,2) default 0
- `line_total` numeric(18,2) default 0

Constraints:
- unique(`invoice_id`, `line_no`)

## Table: inventory_transactions
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `financial_year_id` UUID FK -> financial_years(id)
- `stock_item_id` UUID FK -> stock_items(id)
- `txn_type` inventory_txn_type not null
- `txn_date` date not null
- `qty_in` numeric(18,3) default 0
- `qty_out` numeric(18,3) default 0
- `unit_cost` numeric(18,4) default 0
- `total_cost` numeric(18,2) default 0
- `voucher_id` UUID FK -> vouchers(id) nullable
- `reference` varchar(60)
- `remarks` text
- `created_at` timestamptz default now()

Indexes:
- index(`company_id`, `stock_item_id`, `txn_date`)
- index(`voucher_id`)

## Table: ledger_entries
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `financial_year_id` UUID FK -> financial_years(id)
- `voucher_id` UUID FK -> vouchers(id)
- `entry_date` date not null
- `ledger_id` UUID FK -> ledgers(id)
- `debit_amount` numeric(18,2) default 0
- `credit_amount` numeric(18,2) default 0
- `line_no` int not null
- `remarks` varchar(255)
- `created_at` timestamptz default now()

Constraints:
- check(`debit_amount` >= 0 and `credit_amount` >= 0)
- check(not (`debit_amount` > 0 and `credit_amount` > 0))
- check((`debit_amount` > 0) or (`credit_amount` > 0))

Indexes:
- index(`company_id`, `ledger_id`, `entry_date`)
- index(`voucher_id`)

## 6. GST and Compliance

## Table: gst_records
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `voucher_id` UUID FK -> vouchers(id)
- `invoice_id` UUID FK -> invoices(id) nullable
- `gst_type` gst_type not null
- `gst_rate` numeric(5,2) not null
- `taxable_amount` numeric(18,2) default 0
- `tax_amount` numeric(18,2) default 0
- `place_of_supply` varchar(60)
- `created_at` timestamptz default now()

Indexes:
- index(`company_id`, `gst_type`)
- index(`voucher_id`)

## 7. Audit and Utility

## Table: audit_logs
- `id` UUID PK
- `company_id` UUID FK -> companies(id) nullable
- `user_id` UUID FK -> users(id) nullable
- `module` varchar(80) not null
- `entity_name` varchar(80) not null
- `entity_id` UUID
- `action` varchar(20) not null (CREATE/UPDATE/DELETE/POST/CANCEL/LOGIN)
- `changes_json` jsonb
- `ip_address` varchar(64)
- `user_agent` text
- `created_at` timestamptz default now()

Indexes:
- index(`company_id`, `module`, `created_at`)
- index(`entity_name`, `entity_id`)

## Table: idempotency_keys
- `id` UUID PK
- `company_id` UUID FK -> companies(id)
- `key` varchar(120) not null
- `request_hash` varchar(128) not null
- `response_json` jsonb
- `status_code` int
- `expires_at` timestamptz not null
- `created_at` timestamptz default now()

Constraints:
- unique(`company_id`, `key`)

Indexes:
- index(`expires_at`)

## 8. Relationship Summary
- One `user` can belong to many `companies` through `user_companies`.
- One `company` has many masters (`ledgers`, `stock_items`, `customers`, `suppliers`, etc.).
- One `voucher` has many `voucher_lines`, many `ledger_entries`, and optional inventory/gst rows.
- One sales `voucher` maps to one `invoice`, which has many `invoice_items`.
- `inventory_transactions` and `ledger_entries` are source-of-truth movement tables.

## 9. Migration Order (Recommended)
1. Enums
2. users, companies, user_companies, financial_years
3. ledger_groups, ledgers
4. units, stock_groups, stock_items
5. customers, suppliers
6. vouchers, voucher_lines
7. invoices, invoice_items
8. inventory_transactions, ledger_entries, gst_records
9. audit_logs, idempotency_keys

## 10. MVP Guardrails
- Enforce company scoping in every query by default.
- Enforce per-company voucher number uniqueness by type and FY.
- Post voucher inside one DB transaction:
  - write voucher/voucher lines
  - write inventory txns
  - write ledger entries
  - write gst records
- If any step fails, rollback everything.
- Keep `POSTED` vouchers immutable; future changes via cancellation/reversal entries only.

## 11. Suggested Next File
After schema approval, create ORM schema file:
- Prisma: `apps/api/prisma/schema.prisma`
- Or Drizzle: `apps/api/src/db/schema/*.ts`
