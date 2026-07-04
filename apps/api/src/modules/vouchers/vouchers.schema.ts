import { z } from "zod";
import { VoucherType, VoucherStatus } from "@prisma/client";

const lineItemSchema = z.object({
    stockItemId: z.string().uuid(),
    description: z.string().max(255).optional(),
    qty: z.coerce.number().positive("Quantity must be positive"),
    rate: z.coerce.number().positive("Rate must be positive"),
    gstRate: z.coerce.number().min(0).max(100),
});

export const createSalesVoucherSchema = z.object({
    companyId: z.string().uuid(),
    financialYearId: z.string().uuid(),
    customerId: z.string().uuid(),
    salesLedgerId: z.string().uuid(), // income/sales ledger to credit
    voucherDate: z.string().date(),
    isInterState: z.boolean().default(false),
    items: z.array(lineItemSchema).min(1, "At least one item is required"),
    narration: z.string().optional(),
    referenceNumber: z.string().max(60).optional(),
    billingAddressJson: z.record(z.unknown()).optional(),
    shippingAddressJson: z.record(z.unknown()).optional(),
    notes: z.string().optional(),
    idempotencyKey: z.string().max(120).optional(),
});

export const createPurchaseVoucherSchema = z.object({
    companyId: z.string().uuid(),
    financialYearId: z.string().uuid(),
    supplierId: z.string().uuid(),
    purchaseLedgerId: z.string().uuid(), // expense/purchase ledger to debit
    voucherDate: z.string().date(),
    isInterState: z.boolean().default(false),
    items: z.array(lineItemSchema).min(1, "At least one item is required"),
    narration: z.string().optional(),
    referenceNumber: z.string().max(60).optional(),
    idempotencyKey: z.string().max(120).optional(),
});

export const createReceiptVoucherSchema = z.object({
    companyId: z.string().uuid(),
    financialYearId: z.string().uuid(),
    customerId: z.string().uuid(), // who paid
    bankCashLedgerId: z.string().uuid(), // bank/cash ledger to debit
    voucherDate: z.string().date(),
    amount: z.coerce.number().positive("Amount must be positive"),
    narration: z.string().optional(),
    referenceNumber: z.string().max(60).optional(),
    paymentMode: z.enum(["CASH", "CHEQUE", "BANK_TRANSFER", "ONLINE"]).default("CASH"),
    chequeNumber: z.string().max(20).optional(),
    idempotencyKey: z.string().max(120).optional(),
});

export const createPaymentVoucherSchema = z.object({
    companyId: z.string().uuid(),
    financialYearId: z.string().uuid(),
    supplierId: z.string().uuid(), // who received
    bankCashLedgerId: z.string().uuid(), // bank/cash ledger to credit
    voucherDate: z.string().date(),
    amount: z.coerce.number().positive("Amount must be positive"),
    narration: z.string().optional(),
    referenceNumber: z.string().max(60).optional(),
    paymentMode: z.enum(["CASH", "CHEQUE", "BANK_TRANSFER", "ONLINE"]).default("CASH"),
    chequeNumber: z.string().max(20).optional(),
    idempotencyKey: z.string().max(120).optional(),
});

export const cancelVoucherSchema = z.object({
    reason: z.string().min(1).max(255),
});

export const listVouchersQuerySchema = z.object({
    companyId: z.string().uuid(),
    financialYearId: z.string().uuid().optional(),
    voucherType: z.nativeEnum(VoucherType).optional(),
    status: z.nativeEnum(VoucherStatus).optional(),
    fromDate: z.string().date().optional(),
    toDate: z.string().date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSalesVoucherInput = z.infer<typeof createSalesVoucherSchema>;
export type CreatePurchaseVoucherInput = z.infer<typeof createPurchaseVoucherSchema>;
export type CreateReceiptVoucherInput = z.infer<typeof createReceiptVoucherSchema>;
export type CreatePaymentVoucherInput = z.infer<typeof createPaymentVoucherSchema>;
