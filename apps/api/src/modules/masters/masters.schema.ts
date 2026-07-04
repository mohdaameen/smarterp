import { z } from "zod";
import { LedgerType } from "@prisma/client";

// ─── Ledger Groups ────────────────────────────────────────────────────────────

export const createLedgerGroupSchema = z.object({
    name: z.string().min(1).max(120),
    nature: z.string().min(1).max(30),
    parentGroupId: z.string().uuid().optional(),
});

export const updateLedgerGroupSchema = createLedgerGroupSchema.partial();

// ─── Ledgers ──────────────────────────────────────────────────────────────────

export const createLedgerSchema = z.object({
    ledgerGroupId: z.string().uuid(),
    name: z.string().min(1).max(140),
    code: z.string().max(40).optional(),
    ledgerType: z.nativeEnum(LedgerType),
    openingBalance: z.coerce.number().default(0),
    openingBalanceType: z.enum(["DR", "CR"]).default("DR"),
    gstin: z.string().max(20).optional(),
    pan: z.string().max(20).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    addressJson: z.record(z.unknown()).optional(),
});

export const updateLedgerSchema = createLedgerSchema.partial();

// ─── Units ────────────────────────────────────────────────────────────────────

export const createUnitSchema = z.object({
    name: z.string().min(1).max(60),
    symbol: z.string().min(1).max(20),
    decimalPlaces: z.coerce.number().int().min(0).max(6).default(2),
});

export const updateUnitSchema = createUnitSchema.partial();

// ─── Stock Groups ─────────────────────────────────────────────────────────────

export const createStockGroupSchema = z.object({
    name: z.string().min(1).max(120),
    parentGroupId: z.string().uuid().optional(),
});

export const updateStockGroupSchema = createStockGroupSchema.partial();

// ─── Stock Items ──────────────────────────────────────────────────────────────

export const createStockItemSchema = z.object({
    stockGroupId: z.string().uuid(),
    unitId: z.string().uuid(),
    name: z.string().min(1).max(180),
    sku: z.string().min(1).max(80),
    barcode: z.string().max(80).optional(),
    hsnCode: z.string().max(20).optional(),
    purchasePrice: z.coerce.number().min(0).default(0),
    sellingPrice: z.coerce.number().min(0).default(0),
    gstRate: z.coerce.number().min(0).max(100).default(0),
    reorderLevel: z.coerce.number().min(0).default(0),
});

export const updateStockItemSchema = createStockItemSchema.partial();

// ─── Customers ────────────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
    name: z.string().min(1).max(180),
    mobile: z.string().max(20).optional(),
    email: z.string().email().optional(),
    gstin: z.string().max(20).optional(),
    addressJson: z.record(z.unknown()).optional(),
    creditLimit: z.coerce.number().min(0).default(0),
    // Ledger fields (auto-created)
    ledgerGroupId: z.string().uuid(),
});

export const updateCustomerSchema = createCustomerSchema.omit({ ledgerGroupId: true }).partial();

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const createSupplierSchema = z.object({
    name: z.string().min(1).max(180),
    mobile: z.string().max(20).optional(),
    email: z.string().email().optional(),
    gstin: z.string().max(20).optional(),
    addressJson: z.record(z.unknown()).optional(),
    ledgerGroupId: z.string().uuid(),
});

export const updateSupplierSchema = createSupplierSchema.omit({ ledgerGroupId: true }).partial();

export type CreateLedgerGroupInput = z.infer<typeof createLedgerGroupSchema>;
export type CreateLedgerInput = z.infer<typeof createLedgerSchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type CreateStockGroupInput = z.infer<typeof createStockGroupSchema>;
export type CreateStockItemInput = z.infer<typeof createStockItemSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
