import { z } from "zod";
import { VoucherType, VoucherStatus } from "@prisma/client";

const lineItemSchema = z.object({
    stockItemId: z.string().uuid(),
    description: z.string().max(255).optional(),
    qty: z.coerce.number().positive("Quantity must be positive"),
    rate: z.coerce.number().positive("Rate must be positive"),
    gstRate: z.coerce.number().min(0).max(100),
});

const journalLineSchema = z.object({
    ledgerId: z.string().uuid(),
    description: z.string().max(255).optional(),
    debitAmount: z.coerce.number().min(0).default(0),
    creditAmount: z.coerce.number().min(0).default(0),
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

export const createContraVoucherSchema = z.object({
    companyId: z.string().uuid(),
    financialYearId: z.string().uuid(),
    fromLedgerId: z.string().uuid(), // bank/cash ledger to credit
    toLedgerId: z.string().uuid(), // bank/cash ledger to debit
    voucherDate: z.string().date(),
    amount: z.coerce.number().positive("Amount must be positive"),
    narration: z.string().optional(),
    referenceNumber: z.string().max(60).optional(),
    idempotencyKey: z.string().max(120).optional(),
}).superRefine((data, ctx) => {
    if (data.fromLedgerId === data.toLedgerId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["toLedgerId"],
            message: "fromLedgerId and toLedgerId must be different",
        });
    }
});

export const createCreditNoteVoucherSchema = z.object({
    companyId: z.string().uuid(),
    financialYearId: z.string().uuid(),
    customerId: z.string().uuid(),
    salesReturnLedgerId: z.string().uuid(),
    voucherDate: z.string().date(),
    amount: z.coerce.number().positive("Amount must be positive"),
    narration: z.string().optional(),
    referenceNumber: z.string().max(60).optional(),
    idempotencyKey: z.string().max(120).optional(),
});

export const createDebitNoteVoucherSchema = z.object({
    companyId: z.string().uuid(),
    financialYearId: z.string().uuid(),
    supplierId: z.string().uuid(),
    purchaseReturnLedgerId: z.string().uuid(),
    voucherDate: z.string().date(),
    amount: z.coerce.number().positive("Amount must be positive"),
    narration: z.string().optional(),
    referenceNumber: z.string().max(60).optional(),
    idempotencyKey: z.string().max(120).optional(),
});

export const createJournalVoucherSchema = z.object({
    companyId: z.string().uuid(),
    financialYearId: z.string().uuid(),
    voucherDate: z.string().date(),
    narration: z.string().optional(),
    referenceNumber: z.string().max(60).optional(),
    lines: z.array(journalLineSchema).min(2, "At least 2 journal lines are required"),
    idempotencyKey: z.string().max(120).optional(),
}).superRefine((data, ctx) => {
    const debitTotal = data.lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
    const creditTotal = data.lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0);

    data.lines.forEach((line, index) => {
        const debit = Number(line.debitAmount || 0);
        const credit = Number(line.creditAmount || 0);

        if (debit > 0 && credit > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["lines", index],
                message: "Each line can be either debit or credit, not both",
            });
        }

        if (debit === 0 && credit === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["lines", index],
                message: "Each line must have debitAmount or creditAmount",
            });
        }
    });

    if (Math.abs(debitTotal - creditTotal) > 0.0001) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["lines"],
            message: "Total debit must equal total credit",
        });
    }
});

export const createInventoryAdjustmentSchema = z.object({
    companyId: z.string().uuid(),
    financialYearId: z.string().uuid(),
    stockItemId: z.string().uuid(),
    txnDate: z.string().date(),
    adjustmentType: z.enum(["IN", "OUT"]),
    qty: z.coerce.number().positive("Quantity must be positive"),
    unitCost: z.coerce.number().min(0).default(0),
    reason: z.string().max(255).optional(),
    referenceNumber: z.string().max(60).optional(),
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
export type CreateContraVoucherInput = z.infer<typeof createContraVoucherSchema>;
export type CreateCreditNoteVoucherInput = z.infer<typeof createCreditNoteVoucherSchema>;
export type CreateDebitNoteVoucherInput = z.infer<typeof createDebitNoteVoucherSchema>;
export type CreateJournalVoucherInput = z.infer<typeof createJournalVoucherSchema>;
export type CreateInventoryAdjustmentInput = z.infer<typeof createInventoryAdjustmentSchema>;
