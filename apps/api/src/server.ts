import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { prisma, checkDatabaseConnection, getLastDatabaseError } from "./db.js";
import { env } from "./env.js";
import { errorHandler } from "./middlewares/error.js";
import { logger } from "./config/logger.js";
import authRoutes from "./modules/auth/auth.routes.js";
import companiesRoutes from "./modules/companies/companies.routes.js";
import mastersRoutes from "./modules/masters/masters.routes.js";
import vouchersRoutes from "./modules/vouchers/vouchers.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import "./types/index.js";

const app = express();
app.disable("x-powered-by");

const openApiSpec = {
    openapi: "3.0.3",
    info: {
        title: "SmartERP API",
        version: "0.1.0",
        description: "Core backend API for SmartERP"
    },
    servers: [{ url: `http://localhost:${env.PORT}` }],
    tags: [
        { name: "System" },
        { name: "Auth" },
        { name: "Companies" },
        { name: "Masters" },
        { name: "Vouchers" },
        { name: "Reports" },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
        schemas: {
            ErrorResponse: {
                type: "object",
                properties: {
                    ok: { type: "boolean", example: false },
                    error: { type: "string", example: "Validation error" },
                },
            },
            RegisterRequest: {
                type: "object",
                required: ["fullName", "email", "password"],
                properties: {
                    fullName: { type: "string", example: "Ameen Khan" },
                    email: { type: "string", format: "email", example: "ameen@example.com" },
                    password: { type: "string", example: "Password@123" },
                    phone: { type: "string", example: "9876543210" },
                },
            },
            LoginRequest: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: { type: "string", format: "email", example: "ameen@example.com" },
                    password: { type: "string", example: "Password@123" },
                },
            },
            RefreshRequest: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                    refreshToken: { type: "string" },
                },
            },
            CreateCompanyRequest: {
                type: "object",
                required: ["name"],
                properties: {
                    name: { type: "string", example: "SmartERP Demo Co" },
                    stateCode: { type: "string", example: "KA" },
                    gstNumber: { type: "string", example: "29ABCDE1234F1Z5" },
                    stockValuationMethod: { type: "string", enum: ["FIFO", "AVG"], example: "FIFO" },
                    allowNegativeStock: { type: "boolean", example: false },
                },
            },
            CreateFinancialYearRequest: {
                type: "object",
                required: ["label", "startDate", "endDate"],
                properties: {
                    label: { type: "string", example: "2026-27" },
                    startDate: { type: "string", format: "date", example: "2026-04-01" },
                    endDate: { type: "string", format: "date", example: "2027-03-31" },
                    isCurrent: { type: "boolean", example: true },
                },
            },
            AddMemberRequest: {
                type: "object",
                required: ["email", "role"],
                properties: {
                    email: { type: "string", format: "email", example: "operator@example.com" },
                    role: { type: "string", enum: ["ADMIN", "ACCOUNTANT", "OPERATOR", "VIEWER"] },
                },
            },
            CreateLedgerGroupRequest: {
                type: "object",
                required: ["name", "nature"],
                properties: {
                    name: { type: "string", example: "Sundry Debtors" },
                    nature: { type: "string", example: "ASSET" },
                    parentGroupId: { type: "string", format: "uuid" },
                },
            },
            CreateLedgerRequest: {
                type: "object",
                required: ["ledgerGroupId", "name", "ledgerType"],
                properties: {
                    ledgerGroupId: { type: "string", format: "uuid" },
                    name: { type: "string", example: "Cash" },
                    code: { type: "string", example: "LED-001" },
                    ledgerType: { type: "string", enum: ["CUSTOMER", "SUPPLIER", "INCOME", "EXPENSE", "BANK", "CASH", "STOCK"] },
                    openingBalance: { type: "number", example: 0 },
                    openingBalanceType: { type: "string", example: "DR" },
                },
            },
            CreateUnitRequest: {
                type: "object",
                required: ["name", "symbol"],
                properties: {
                    name: { type: "string", example: "Piece" },
                    symbol: { type: "string", example: "PCS" },
                    decimalPlaces: { type: "integer", example: 2 },
                },
            },
            CreateStockGroupRequest: {
                type: "object",
                required: ["name"],
                properties: {
                    name: { type: "string", example: "Electronics" },
                    parentGroupId: { type: "string", format: "uuid" },
                },
            },
            CreateStockItemRequest: {
                type: "object",
                required: ["stockGroupId", "unitId", "name", "sku"],
                properties: {
                    stockGroupId: { type: "string", format: "uuid" },
                    unitId: { type: "string", format: "uuid" },
                    name: { type: "string", example: "USB Cable" },
                    sku: { type: "string", example: "USB-001" },
                    purchasePrice: { type: "number", example: 100 },
                    sellingPrice: { type: "number", example: 150 },
                    gstRate: { type: "number", example: 18 },
                    reorderLevel: { type: "number", example: 5 },
                },
            },
            CreateCustomerRequest: {
                type: "object",
                required: ["name", "ledgerGroupId"],
                properties: {
                    name: { type: "string", example: "Acme Corp" },
                    ledgerGroupId: { type: "string", format: "uuid" },
                    mobile: { type: "string", example: "9988776655" },
                    email: { type: "string", format: "email", example: "acme@example.com" },
                },
            },
            CreateSupplierRequest: {
                type: "object",
                required: ["name", "ledgerGroupId"],
                properties: {
                    name: { type: "string", example: "XYZ Traders" },
                    ledgerGroupId: { type: "string", format: "uuid" },
                    mobile: { type: "string", example: "9900112233" },
                    email: { type: "string", format: "email", example: "xyz@example.com" },
                },
            },
            VoucherLineItem: {
                type: "object",
                required: ["stockItemId", "qty", "rate", "gstRate"],
                properties: {
                    stockItemId: { type: "string", format: "uuid" },
                    qty: { type: "number", example: 2 },
                    rate: { type: "number", example: 120 },
                    gstRate: { type: "number", example: 18 },
                    description: { type: "string", example: "Line item" },
                },
            },
            SalesVoucherRequest: {
                type: "object",
                required: ["companyId", "financialYearId", "customerId", "salesLedgerId", "voucherDate", "items"],
                properties: {
                    companyId: { type: "string", format: "uuid" },
                    financialYearId: { type: "string", format: "uuid" },
                    customerId: { type: "string", format: "uuid" },
                    salesLedgerId: { type: "string", format: "uuid" },
                    voucherDate: { type: "string", format: "date" },
                    isInterState: { type: "boolean", example: false },
                    items: { type: "array", items: { $ref: "#/components/schemas/VoucherLineItem" } },
                    narration: { type: "string" },
                    referenceNumber: { type: "string" },
                    idempotencyKey: { type: "string" },
                },
            },
            PurchaseVoucherRequest: {
                type: "object",
                required: ["companyId", "financialYearId", "supplierId", "purchaseLedgerId", "voucherDate", "items"],
                properties: {
                    companyId: { type: "string", format: "uuid" },
                    financialYearId: { type: "string", format: "uuid" },
                    supplierId: { type: "string", format: "uuid" },
                    purchaseLedgerId: { type: "string", format: "uuid" },
                    voucherDate: { type: "string", format: "date" },
                    isInterState: { type: "boolean", example: false },
                    items: { type: "array", items: { $ref: "#/components/schemas/VoucherLineItem" } },
                    narration: { type: "string" },
                    referenceNumber: { type: "string" },
                    idempotencyKey: { type: "string" },
                },
            },
            ReceiptVoucherRequest: {
                type: "object",
                required: ["companyId", "financialYearId", "customerId", "bankCashLedgerId", "voucherDate", "amount"],
                properties: {
                    companyId: { type: "string", format: "uuid" },
                    financialYearId: { type: "string", format: "uuid" },
                    customerId: { type: "string", format: "uuid" },
                    bankCashLedgerId: { type: "string", format: "uuid" },
                    voucherDate: { type: "string", format: "date" },
                    amount: { type: "number", example: 1000 },
                    paymentMode: { type: "string", enum: ["CASH", "CHEQUE", "BANK_TRANSFER", "ONLINE"] },
                    chequeNumber: { type: "string" },
                    narration: { type: "string" },
                    referenceNumber: { type: "string" },
                    idempotencyKey: { type: "string" },
                },
            },
            PaymentVoucherRequest: {
                type: "object",
                required: ["companyId", "financialYearId", "supplierId", "bankCashLedgerId", "voucherDate", "amount"],
                properties: {
                    companyId: { type: "string", format: "uuid" },
                    financialYearId: { type: "string", format: "uuid" },
                    supplierId: { type: "string", format: "uuid" },
                    bankCashLedgerId: { type: "string", format: "uuid" },
                    voucherDate: { type: "string", format: "date" },
                    amount: { type: "number", example: 1000 },
                    paymentMode: { type: "string", enum: ["CASH", "CHEQUE", "BANK_TRANSFER", "ONLINE"] },
                    chequeNumber: { type: "string" },
                    narration: { type: "string" },
                    referenceNumber: { type: "string" },
                    idempotencyKey: { type: "string" },
                },
            },
            ContraVoucherRequest: {
                type: "object",
                required: ["companyId", "financialYearId", "fromLedgerId", "toLedgerId", "voucherDate", "amount"],
                properties: {
                    companyId: { type: "string", format: "uuid" },
                    financialYearId: { type: "string", format: "uuid" },
                    fromLedgerId: { type: "string", format: "uuid" },
                    toLedgerId: { type: "string", format: "uuid" },
                    voucherDate: { type: "string", format: "date" },
                    amount: { type: "number", example: 2500 },
                    narration: { type: "string", example: "Cash deposited to bank" },
                    referenceNumber: { type: "string" },
                    idempotencyKey: { type: "string" },
                },
            },
            CreditNoteVoucherRequest: {
                type: "object",
                required: ["companyId", "financialYearId", "customerId", "salesReturnLedgerId", "voucherDate", "amount"],
                properties: {
                    companyId: { type: "string", format: "uuid" },
                    financialYearId: { type: "string", format: "uuid" },
                    customerId: { type: "string", format: "uuid" },
                    salesReturnLedgerId: { type: "string", format: "uuid" },
                    voucherDate: { type: "string", format: "date" },
                    amount: { type: "number", example: 1200 },
                    narration: { type: "string", example: "Sales return adjustment" },
                    referenceNumber: { type: "string" },
                    idempotencyKey: { type: "string" },
                },
            },
            DebitNoteVoucherRequest: {
                type: "object",
                required: ["companyId", "financialYearId", "supplierId", "purchaseReturnLedgerId", "voucherDate", "amount"],
                properties: {
                    companyId: { type: "string", format: "uuid" },
                    financialYearId: { type: "string", format: "uuid" },
                    supplierId: { type: "string", format: "uuid" },
                    purchaseReturnLedgerId: { type: "string", format: "uuid" },
                    voucherDate: { type: "string", format: "date" },
                    amount: { type: "number", example: 800 },
                    narration: { type: "string", example: "Purchase return adjustment" },
                    referenceNumber: { type: "string" },
                    idempotencyKey: { type: "string" },
                },
            },
            JournalVoucherLine: {
                type: "object",
                required: ["ledgerId"],
                properties: {
                    ledgerId: { type: "string", format: "uuid" },
                    debitAmount: { type: "number", example: 1500 },
                    creditAmount: { type: "number", example: 0 },
                    description: { type: "string", example: "Entry line" },
                },
            },
            JournalVoucherRequest: {
                type: "object",
                required: ["companyId", "financialYearId", "voucherDate", "lines"],
                properties: {
                    companyId: { type: "string", format: "uuid" },
                    financialYearId: { type: "string", format: "uuid" },
                    voucherDate: { type: "string", format: "date" },
                    narration: { type: "string" },
                    referenceNumber: { type: "string" },
                    lines: { type: "array", items: { $ref: "#/components/schemas/JournalVoucherLine" } },
                    idempotencyKey: { type: "string" },
                },
            },
            InventoryAdjustmentRequest: {
                type: "object",
                required: ["companyId", "financialYearId", "stockItemId", "txnDate", "adjustmentType", "qty"],
                properties: {
                    companyId: { type: "string", format: "uuid" },
                    financialYearId: { type: "string", format: "uuid" },
                    stockItemId: { type: "string", format: "uuid" },
                    txnDate: { type: "string", format: "date" },
                    adjustmentType: { type: "string", enum: ["IN", "OUT"] },
                    qty: { type: "number", example: 5 },
                    unitCost: { type: "number", example: 100 },
                    reason: { type: "string", example: "Stock correction" },
                    referenceNumber: { type: "string", example: "ADJ-001" },
                    idempotencyKey: { type: "string" },
                },
            },
        },
    },
    paths: {
        "/": {
            get: {
                tags: ["System"],
                summary: "API welcome",
                responses: {
                    "200": {
                        description: "API running message"
                    }
                }
            }
        },
        "/health": {
            get: {
                tags: ["System"],
                summary: "Service health check",
                responses: {
                    "200": {
                        description: "Current API and DB status"
                    }
                }
            }
        },
        "/api/v1/auth/register": {
            post: {
                tags: ["Auth"],
                summary: "Register user",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/RegisterRequest" },
                        },
                    },
                },
                responses: {
                    "201": { description: "User registered" },
                    "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/v1/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Login",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/LoginRequest" },
                        },
                    },
                },
                responses: {
                    "200": { description: "Authenticated with access and refresh token" },
                    "401": { description: "Invalid credentials" },
                },
            },
        },
        "/api/v1/auth/refresh": {
            post: {
                tags: ["Auth"],
                summary: "Refresh access token",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/RefreshRequest" },
                        },
                    },
                },
                responses: {
                    "200": { description: "Token refreshed" },
                },
            },
        },
        "/api/v1/auth/me": {
            get: {
                tags: ["Auth"],
                summary: "Get current user profile",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "Profile data" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/v1/companies": {
            get: {
                tags: ["Companies"],
                summary: "List user companies",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "Company list" },
                },
            },
            post: {
                tags: ["Companies"],
                summary: "Create company",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateCompanyRequest" },
                        },
                    },
                },
                responses: {
                    "201": { description: "Company created" },
                },
            },
        },
        "/api/v1/companies/{companyId}": {
            get: {
                tags: ["Companies"],
                summary: "Get company",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
                responses: {
                    "200": { description: "Company details" },
                },
            },
            patch: {
                tags: ["Companies"],
                summary: "Update company",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateCompanyRequest" },
                        },
                    },
                },
                responses: {
                    "200": { description: "Company updated" },
                },
            },
        },
        "/api/v1/companies/{companyId}/financial-years": {
            get: {
                tags: ["Companies"],
                summary: "List financial years",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
                responses: { "200": { description: "Financial year list" } },
            },
            post: {
                tags: ["Companies"],
                summary: "Create financial year",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateFinancialYearRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Financial year created" } },
            },
        },
        "/api/v1/companies/{companyId}/members": {
            get: {
                tags: ["Companies"],
                summary: "List company members",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
                responses: { "200": { description: "Member list" } },
            },
            post: {
                tags: ["Companies"],
                summary: "Add company member",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/AddMemberRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Member added" } },
            },
        },
        "/api/v1/masters/ledger-groups": {
            get: {
                tags: ["Masters"],
                summary: "List ledger groups",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                responses: { "200": { description: "Ledger groups" } },
            },
            post: {
                tags: ["Masters"],
                summary: "Create ledger group",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateLedgerGroupRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Ledger group created" } },
            },
        },
        "/api/v1/masters/ledgers": {
            get: {
                tags: ["Masters"],
                summary: "List ledgers",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                responses: { "200": { description: "Ledgers" } },
            },
            post: {
                tags: ["Masters"],
                summary: "Create ledger",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateLedgerRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Ledger created" } },
            },
        },
        "/api/v1/masters/units": {
            get: {
                tags: ["Masters"],
                summary: "List units",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                responses: { "200": { description: "Units" } },
            },
            post: {
                tags: ["Masters"],
                summary: "Create unit",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateUnitRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Unit created" } },
            },
        },
        "/api/v1/masters/stock-groups": {
            get: {
                tags: ["Masters"],
                summary: "List stock groups",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                responses: { "200": { description: "Stock groups" } },
            },
            post: {
                tags: ["Masters"],
                summary: "Create stock group",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateStockGroupRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Stock group created" } },
            },
        },
        "/api/v1/masters/stock-items": {
            get: {
                tags: ["Masters"],
                summary: "List stock items",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                responses: { "200": { description: "Stock items" } },
            },
            post: {
                tags: ["Masters"],
                summary: "Create stock item",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateStockItemRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Stock item created" } },
            },
        },
        "/api/v1/masters/customers": {
            get: {
                tags: ["Masters"],
                summary: "List customers",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                responses: { "200": { description: "Customers" } },
            },
            post: {
                tags: ["Masters"],
                summary: "Create customer",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateCustomerRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Customer created" } },
            },
        },
        "/api/v1/masters/suppliers": {
            get: {
                tags: ["Masters"],
                summary: "List suppliers",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                responses: { "200": { description: "Suppliers" } },
            },
            post: {
                tags: ["Masters"],
                summary: "Create supplier",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateSupplierRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Supplier created" } },
            },
        },
        "/api/v1/vouchers": {
            get: {
                tags: ["Vouchers"],
                summary: "List vouchers",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
                    { name: "financialYearId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
                    { name: "voucherType", in: "query", required: false, schema: { type: "string" } },
                    { name: "status", in: "query", required: false, schema: { type: "string" } },
                    { name: "fromDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "toDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "Voucher list" } },
            },
        },
        "/api/v1/vouchers/{id}": {
            get: {
                tags: ["Vouchers"],
                summary: "Get voucher detail",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
                    { name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
                ],
                responses: { "200": { description: "Voucher detail" } },
            },
        },
        "/api/v1/vouchers/{id}/cancel": {
            patch: {
                tags: ["Vouchers"],
                summary: "Cancel voucher",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
                    { name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["reason"],
                                properties: { reason: { type: "string", example: "Wrong entry" } },
                            },
                        },
                    },
                },
                responses: { "200": { description: "Voucher cancelled" } },
            },
        },
        "/api/v1/vouchers/sales": {
            post: {
                tags: ["Vouchers"],
                summary: "Post sales voucher",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/SalesVoucherRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Sales voucher posted" } },
            },
        },
        "/api/v1/vouchers/purchase": {
            post: {
                tags: ["Vouchers"],
                summary: "Post purchase voucher",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/PurchaseVoucherRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Purchase voucher posted" } },
            },
        },
        "/api/v1/vouchers/receipt": {
            post: {
                tags: ["Vouchers"],
                summary: "Post receipt voucher",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ReceiptVoucherRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Receipt voucher posted" } },
            },
        },
        "/api/v1/vouchers/payment": {
            post: {
                tags: ["Vouchers"],
                summary: "Post payment voucher",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/PaymentVoucherRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Payment voucher posted" } },
            },
        },
        "/api/v1/vouchers/contra": {
            post: {
                tags: ["Vouchers"],
                summary: "Post contra voucher",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ContraVoucherRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Contra voucher posted" } },
            },
        },
        "/api/v1/vouchers/credit-note": {
            post: {
                tags: ["Vouchers"],
                summary: "Post credit note voucher",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreditNoteVoucherRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Credit note voucher posted" } },
            },
        },
        "/api/v1/vouchers/debit-note": {
            post: {
                tags: ["Vouchers"],
                summary: "Post debit note voucher",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/DebitNoteVoucherRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Debit note voucher posted" } },
            },
        },
        "/api/v1/vouchers/journal": {
            post: {
                tags: ["Vouchers"],
                summary: "Post journal voucher",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/JournalVoucherRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Journal voucher posted" } },
            },
        },
        "/api/v1/vouchers/inventory-adjustment": {
            post: {
                tags: ["Vouchers"],
                summary: "Post inventory adjustment",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/InventoryAdjustmentRequest" },
                        },
                    },
                },
                responses: { "201": { description: "Inventory adjusted" } },
            },
        },
        "/api/v1/reports/stock-summary": {
            get: {
                tags: ["Reports"],
                summary: "Stock summary",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
                    { name: "financialYearId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
                    { name: "fromDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "toDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "stockGroupId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
                ],
                responses: { "200": { description: "Stock summary data" } },
            },
        },
        "/api/v1/reports/sales-register": {
            get: {
                tags: ["Reports"],
                summary: "Sales register",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
                    { name: "financialYearId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
                    { name: "fromDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "toDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "page", in: "query", required: false, schema: { type: "integer" } },
                    { name: "limit", in: "query", required: false, schema: { type: "integer" } },
                ],
                responses: { "200": { description: "Sales register data" } },
            },
        },
        "/api/v1/reports/purchase-register": {
            get: {
                tags: ["Reports"],
                summary: "Purchase register",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
                    { name: "financialYearId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
                    { name: "fromDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "toDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "page", in: "query", required: false, schema: { type: "integer" } },
                    { name: "limit", in: "query", required: false, schema: { type: "integer" } },
                ],
                responses: { "200": { description: "Purchase register data" } },
            },
        },
        "/api/v1/reports/outstanding-customers": {
            get: {
                tags: ["Reports"],
                summary: "Outstanding customers",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                responses: { "200": { description: "Outstanding customers data" } },
            },
        },
        "/api/v1/reports/outstanding-suppliers": {
            get: {
                tags: ["Reports"],
                summary: "Outstanding suppliers",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
                responses: { "200": { description: "Outstanding suppliers data" } },
            },
        },
        "/api/v1/reports/trial-balance": {
            get: {
                tags: ["Reports"],
                summary: "Trial balance",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
                    { name: "financialYearId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
                    { name: "fromDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "toDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "Trial balance data" } },
            },
        },
        "/api/v1/reports/balance-sheet": {
            get: {
                tags: ["Reports"],
                summary: "Balance sheet",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
                    { name: "financialYearId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
                    { name: "toDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "Balance sheet data" } },
            },
        },
        "/api/v1/reports/profit-loss": {
            get: {
                tags: ["Reports"],
                summary: "Profit and loss",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
                    { name: "financialYearId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
                    { name: "fromDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "toDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "Profit and loss data" } },
            },
        },
        "/api/v1/reports/cash-flow": {
            get: {
                tags: ["Reports"],
                summary: "Cash flow",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "companyId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
                    { name: "financialYearId", in: "query", required: false, schema: { type: "string", format: "uuid" } },
                    { name: "fromDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "toDate", in: "query", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: { "200": { description: "Cash flow data" } },
            },
        },
    }
};

app.use(
    cors({
        origin: env.CORS_ORIGIN,
        credentials: true
    })
);
app.use(express.json());

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/companies", companiesRoutes);
app.use("/api/v1/masters", mastersRoutes);
app.use("/api/v1/vouchers", vouchersRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.get("/openapi.json", (_req, res) => {
    res.json(openApiSpec);
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.get("/health", async (_req, res) => {
    const isDbUp = await checkDatabaseConnection();
    const db = isDbUp ? "up" : "down";

    res.json({
        ok: true,
        service: "smarterp-api",
        db,
        ...(isDbUp || env.NODE_ENV === "production" ? {} : { dbError: getLastDatabaseError() }),
        timestamp: new Date().toISOString()
    });
});

app.get("/", (_req, res) => {
    res.json({ message: "SmartERP API is running" });
});

const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
});

// ─── Central error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

async function shutdown(signal: string) {
    logger.info(`${signal} received. Shutting down...`);
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});
