import { Prisma, VoucherType } from "@prisma/client";
import { prisma } from "../../db.js";
import { AppError } from "../../middlewares/error.js";
import { createAuditLog } from "../../utils/audit.js";
import { paginate } from "../../utils/pagination.js";
import type { CreateSalesVoucherInput, CreatePurchaseVoucherInput, CreateReceiptVoucherInput, CreatePaymentVoucherInput } from "./vouchers.schema.js";
import type { z } from "zod";
import type { listVouchersQuerySchema } from "./vouchers.schema.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface LineCalc {
    stockItemId: string;
    description?: string;
    qty: number;
    rate: number;
    gstRate: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    lineTotal: number;
}

function calcLine(item: { qty: number; rate: number; gstRate: number }, isInterState: boolean): Omit<LineCalc, "stockItemId" | "description"> {
    const taxableAmount = parseFloat((item.qty * item.rate).toFixed(2));
    const taxTotal = parseFloat(((taxableAmount * item.gstRate) / 100).toFixed(2));
    const cgstAmount = isInterState ? 0 : parseFloat((taxTotal / 2).toFixed(2));
    const sgstAmount = isInterState ? 0 : parseFloat((taxTotal - cgstAmount).toFixed(2));
    const igstAmount = isInterState ? taxTotal : 0;
    const lineTotal = parseFloat((taxableAmount + taxTotal).toFixed(2));
    return { qty: item.qty, rate: item.rate, gstRate: item.gstRate, taxableAmount, cgstAmount, sgstAmount, igstAmount, lineTotal };
}

async function generateVoucherNumber(
    tx: Prisma.TransactionClient,
    companyId: string,
    financialYearId: string,
    voucherType: VoucherType
): Promise<string> {
    const PREFIX: Partial<Record<VoucherType, string>> = {
        SALES: "SAL", PURCHASE: "PUR", RECEIPT: "RCP", PAYMENT: "PAY", JOURNAL: "JNL",
        CREDIT_NOTE: "CRN", DEBIT_NOTE: "DBN",
    };
    const prefix = PREFIX[voucherType] ?? "VCH";
    const count = await tx.voucher.count({ where: { companyId, financialYearId, voucherType } });
    return `${prefix}-${String(count + 1).padStart(6, "0")}`;
}

async function checkIdempotency(companyId: string, key: string, tx: Prisma.TransactionClient) {
    const existing = await tx.idempotencyKey.findUnique({ where: { companyId_key: { companyId, key } } });
    if (existing && existing.expiresAt > new Date()) {
        return existing.responseJson as Record<string, unknown> | null;
    }
    return null;
}

async function saveIdempotency(companyId: string, key: string, response: unknown, tx: Prisma.TransactionClient) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await tx.idempotencyKey.upsert({
        where: { companyId_key: { companyId, key } },
        create: { companyId, key, requestHash: key, responseJson: response as Prisma.InputJsonValue, statusCode: 201, expiresAt },
        update: { responseJson: response as Prisma.InputJsonValue, statusCode: 201, expiresAt },
    });
}

// ─── Sales Voucher Posting ────────────────────────────────────────────────────

export async function postSalesVoucher(userId: string, input: CreateSalesVoucherInput) {
    const { companyId, financialYearId, customerId, salesLedgerId, isInterState } = input;

    // Idempotency guard
    if (input.idempotencyKey) {
        const cached = await prisma.$transaction(async (tx) => checkIdempotency(companyId, input.idempotencyKey!, tx));
        if (cached) return cached;
    }

    // Fetch customer with ledger
    const customer = await prisma.customer.findFirst({
        where: { id: customerId, companyId },
        include: { ledger: true },
    });
    if (!customer) throw new AppError(404, "Customer not found");

    const salesLedger = await prisma.ledger.findFirst({ where: { id: salesLedgerId, companyId } });
    if (!salesLedger) throw new AppError(404, "Sales ledger not found");

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new AppError(404, "Company not found");

    // Calculate line amounts
    const lines: LineCalc[] = input.items.map((item) => ({
        stockItemId: item.stockItemId,
        description: item.description,
        ...calcLine(item, isInterState),
    }));

    const subTotal = lines.reduce((s, l) => s + l.taxableAmount, 0);
    const taxTotal = lines.reduce((s, l) => s + l.cgstAmount + l.sgstAmount + l.igstAmount, 0);
    const grandTotal = parseFloat((subTotal + taxTotal).toFixed(2));

    // Validate stock availability
    if (!company.allowNegativeStock) {
        for (const item of input.items) {
            const stockIn = await prisma.inventoryTransaction.aggregate({
                where: { companyId, stockItemId: item.stockItemId, txnType: "IN" },
                _sum: { qtyIn: true },
            });
            const stockOut = await prisma.inventoryTransaction.aggregate({
                where: { companyId, stockItemId: item.stockItemId, txnType: "OUT" },
                _sum: { qtyOut: true },
            });
            const balance = Number(stockIn._sum.qtyIn ?? 0) - Number(stockOut._sum.qtyOut ?? 0);
            if (balance < item.qty) {
                const stockItem = await prisma.stockItem.findUnique({ where: { id: item.stockItemId } });
                throw new AppError(400, `Insufficient stock for ${stockItem?.name ?? item.stockItemId}. Available: ${balance.toFixed(3)}`);
            }
        }
    }

    const result = await prisma.$transaction(async (tx) => {
        const voucherNumber = await generateVoucherNumber(tx, companyId, financialYearId, "SALES");
        const voucherDate = new Date(input.voucherDate);

        // 1. Create Voucher
        const voucher = await tx.voucher.create({
            data: {
                companyId,
                financialYearId,
                voucherType: "SALES",
                voucherNumber,
                voucherDate,
                referenceNumber: input.referenceNumber,
                narration: input.narration,
                status: "POSTED",
                counterpartyLedgerId: customer.ledgerId,
                totalTaxableAmount: subTotal,
                totalTaxAmount: taxTotal,
                totalAmount: grandTotal,
                createdById: userId,
            },
        });

        // 2. Create Voucher Lines
        await tx.voucherLine.createMany({
            data: lines.map((l, idx) => ({
                voucherId: voucher.id,
                lineNo: idx + 1,
                stockItemId: l.stockItemId,
                ledgerId: salesLedgerId,
                description: l.description,
                qty: l.qty,
                rate: l.rate,
                taxableAmount: l.taxableAmount,
                gstRate: l.gstRate,
                cgstAmount: l.cgstAmount,
                sgstAmount: l.sgstAmount,
                igstAmount: l.igstAmount,
                lineTotal: l.lineTotal,
            })),
        });

        // 3. Create Invoice + Items
        const invoice = await tx.invoice.create({
            data: {
                companyId,
                voucherId: voucher.id,
                invoiceNumber: voucherNumber,
                invoiceDate: voucherDate,
                customerId,
                billingAddressJson: input.billingAddressJson as Prisma.InputJsonValue | undefined,
                shippingAddressJson: input.shippingAddressJson as Prisma.InputJsonValue | undefined,
                subTotal,
                taxTotal,
                grandTotal,
                notes: input.notes,
            },
        });

        await tx.invoiceItem.createMany({
            data: lines.map((l, idx) => ({
                invoiceId: invoice.id,
                lineNo: idx + 1,
                stockItemId: l.stockItemId,
                description: l.description,
                qty: l.qty,
                rate: l.rate,
                taxableAmount: l.taxableAmount,
                gstRate: l.gstRate,
                cgstAmount: l.cgstAmount,
                sgstAmount: l.sgstAmount,
                igstAmount: l.igstAmount,
                lineTotal: l.lineTotal,
            })),
        });

        // 4. Inventory Transactions (OUT)
        await tx.inventoryTransaction.createMany({
            data: lines.map((l) => ({
                companyId,
                financialYearId,
                stockItemId: l.stockItemId,
                txnType: "OUT" as const,
                txnDate: voucherDate,
                qtyIn: 0,
                qtyOut: l.qty,
                unitCost: l.rate,
                totalCost: l.taxableAmount,
                voucherId: voucher.id,
                reference: voucherNumber,
            })),
        });

        // 5. Ledger Entries (DR customer / CR sales)
        await tx.ledgerEntry.createMany({
            data: [
                {
                    companyId, financialYearId, voucherId: voucher.id,
                    entryDate: voucherDate, ledgerId: customer.ledgerId,
                    debitAmount: grandTotal, creditAmount: 0, lineNo: 1,
                    remarks: `Sales - ${voucherNumber}`,
                },
                {
                    companyId, financialYearId, voucherId: voucher.id,
                    entryDate: voucherDate, ledgerId: salesLedgerId,
                    debitAmount: 0, creditAmount: grandTotal, lineNo: 2,
                    remarks: `Sales - ${voucherNumber}`,
                },
            ],
        });

        // 6. GST Records
        if (taxTotal > 0) {
            const byRate = lines.reduce<Record<number, { taxable: number; cgst: number; sgst: number; igst: number }>>((acc, l) => {
                const key = l.gstRate;
                if (!acc[key]) acc[key] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
                acc[key]!.taxable += l.taxableAmount;
                acc[key]!.cgst += l.cgstAmount;
                acc[key]!.sgst += l.sgstAmount;
                acc[key]!.igst += l.igstAmount;
                return acc;
            }, {});

            for (const [rate, amounts] of Object.entries(byRate)) {
                if (isInterState) {
                    await tx.gstRecord.create({
                        data: { companyId, voucherId: voucher.id, invoiceId: invoice.id, gstType: "IGST", gstRate: Number(rate), taxableAmount: amounts.taxable, taxAmount: amounts.igst },
                    });
                } else {
                    if (amounts.cgst > 0) {
                        await tx.gstRecord.create({
                            data: { companyId, voucherId: voucher.id, invoiceId: invoice.id, gstType: "CGST", gstRate: Number(rate) / 2, taxableAmount: amounts.taxable, taxAmount: amounts.cgst },
                        });
                    }
                    if (amounts.sgst > 0) {
                        await tx.gstRecord.create({
                            data: { companyId, voucherId: voucher.id, invoiceId: invoice.id, gstType: "SGST", gstRate: Number(rate) / 2, taxableAmount: amounts.taxable, taxAmount: amounts.sgst },
                        });
                    }
                }
            }
        }

        if (input.idempotencyKey) {
            await saveIdempotency(companyId, input.idempotencyKey, { voucherId: voucher.id, invoiceId: invoice.id, voucherNumber }, tx);
        }

        return { voucher, invoice };
    });

    await createAuditLog({ userId, companyId, module: "vouchers", entityName: "Voucher", entityId: result.voucher.id, action: "CREATE" });
    return result;
}

// ─── Purchase Voucher Posting ─────────────────────────────────────────────────

export async function postPurchaseVoucher(userId: string, input: CreatePurchaseVoucherInput) {
    const { companyId, financialYearId, supplierId, purchaseLedgerId, isInterState } = input;

    if (input.idempotencyKey) {
        const cached = await prisma.$transaction(async (tx) => checkIdempotency(companyId, input.idempotencyKey!, tx));
        if (cached) return cached;
    }

    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, companyId }, include: { ledger: true } });
    if (!supplier) throw new AppError(404, "Supplier not found");

    const purchaseLedger = await prisma.ledger.findFirst({ where: { id: purchaseLedgerId, companyId } });
    if (!purchaseLedger) throw new AppError(404, "Purchase ledger not found");

    const lines: LineCalc[] = input.items.map((item) => ({
        stockItemId: item.stockItemId,
        description: item.description,
        ...calcLine(item, isInterState),
    }));

    const subTotal = lines.reduce((s, l) => s + l.taxableAmount, 0);
    const taxTotal = lines.reduce((s, l) => s + l.cgstAmount + l.sgstAmount + l.igstAmount, 0);
    const grandTotal = parseFloat((subTotal + taxTotal).toFixed(2));

    const result = await prisma.$transaction(async (tx) => {
        const voucherNumber = await generateVoucherNumber(tx, companyId, financialYearId, "PURCHASE");
        const voucherDate = new Date(input.voucherDate);

        const voucher = await tx.voucher.create({
            data: {
                companyId,
                financialYearId,
                voucherType: "PURCHASE",
                voucherNumber,
                voucherDate,
                referenceNumber: input.referenceNumber,
                narration: input.narration,
                status: "POSTED",
                counterpartyLedgerId: supplier.ledgerId,
                totalTaxableAmount: subTotal,
                totalTaxAmount: taxTotal,
                totalAmount: grandTotal,
                createdById: userId,
            },
        });

        await tx.voucherLine.createMany({
            data: lines.map((l, idx) => ({
                voucherId: voucher.id,
                lineNo: idx + 1,
                stockItemId: l.stockItemId,
                ledgerId: purchaseLedgerId,
                description: l.description,
                qty: l.qty,
                rate: l.rate,
                taxableAmount: l.taxableAmount,
                gstRate: l.gstRate,
                cgstAmount: l.cgstAmount,
                sgstAmount: l.sgstAmount,
                igstAmount: l.igstAmount,
                lineTotal: l.lineTotal,
            })),
        });

        // Inventory IN
        await tx.inventoryTransaction.createMany({
            data: lines.map((l) => ({
                companyId,
                financialYearId,
                stockItemId: l.stockItemId,
                txnType: "IN" as const,
                txnDate: voucherDate,
                qtyIn: l.qty,
                qtyOut: 0,
                unitCost: l.rate,
                totalCost: l.taxableAmount,
                voucherId: voucher.id,
                reference: voucherNumber,
            })),
        });

        // Ledger Entries (DR purchase / CR supplier)
        await tx.ledgerEntry.createMany({
            data: [
                {
                    companyId, financialYearId, voucherId: voucher.id,
                    entryDate: voucherDate, ledgerId: purchaseLedgerId,
                    debitAmount: grandTotal, creditAmount: 0, lineNo: 1,
                    remarks: `Purchase - ${voucherNumber}`,
                },
                {
                    companyId, financialYearId, voucherId: voucher.id,
                    entryDate: voucherDate, ledgerId: supplier.ledgerId,
                    debitAmount: 0, creditAmount: grandTotal, lineNo: 2,
                    remarks: `Purchase - ${voucherNumber}`,
                },
            ],
        });

        // GST Records (input credit)
        if (taxTotal > 0) {
            const byRate = lines.reduce<Record<number, { taxable: number; cgst: number; sgst: number; igst: number }>>((acc, l) => {
                const key = l.gstRate;
                if (!acc[key]) acc[key] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
                acc[key]!.taxable += l.taxableAmount;
                acc[key]!.cgst += l.cgstAmount;
                acc[key]!.sgst += l.sgstAmount;
                acc[key]!.igst += l.igstAmount;
                return acc;
            }, {});

            for (const [rate, amounts] of Object.entries(byRate)) {
                if (isInterState) {
                    await tx.gstRecord.create({
                        data: { companyId, voucherId: voucher.id, gstType: "IGST", gstRate: Number(rate), taxableAmount: amounts.taxable, taxAmount: amounts.igst },
                    });
                } else {
                    if (amounts.cgst > 0) {
                        await tx.gstRecord.create({
                            data: { companyId, voucherId: voucher.id, gstType: "CGST", gstRate: Number(rate) / 2, taxableAmount: amounts.taxable, taxAmount: amounts.cgst },
                        });
                    }
                    if (amounts.sgst > 0) {
                        await tx.gstRecord.create({
                            data: { companyId, voucherId: voucher.id, gstType: "SGST", gstRate: Number(rate) / 2, taxableAmount: amounts.taxable, taxAmount: amounts.sgst },
                        });
                    }
                }
            }
        }

        if (input.idempotencyKey) {
            await saveIdempotency(companyId, input.idempotencyKey, { voucherId: voucher.id, voucherNumber }, tx);
        }

        return { voucher };
    });

    await createAuditLog({ userId, companyId, module: "vouchers", entityName: "Voucher", entityId: result.voucher.id, action: "CREATE" });
    return result;
}

// ─── Receipt Voucher Posting ──────────────────────────────────────────────────
// Cash/cheque received from customers (no inventory impact)

export async function postReceiptVoucher(userId: string, input: CreateReceiptVoucherInput) {
    const { companyId, financialYearId, customerId, bankCashLedgerId } = input;

    // Idempotency guard
    if (input.idempotencyKey) {
        const cached = await prisma.$transaction(async (tx) => checkIdempotency(companyId, input.idempotencyKey!, tx));
        if (cached) return cached;
    }

    // Fetch customer with ledger
    const customer = await prisma.customer.findFirst({
        where: { id: customerId, companyId },
        include: { ledger: true },
    });
    if (!customer) throw new AppError(404, "Customer not found");

    const bankCashLedger = await prisma.ledger.findFirst({ where: { id: bankCashLedgerId, companyId } });
    if (!bankCashLedger) throw new AppError(404, "Bank/Cash ledger not found");

    const result = await prisma.$transaction(async (tx) => {
        const voucherNumber = await generateVoucherNumber(tx, companyId, financialYearId, "RECEIPT");
        const voucherDate = new Date(input.voucherDate);

        // 1. Create Voucher
        const voucher = await tx.voucher.create({
            data: {
                companyId,
                financialYearId,
                voucherType: "RECEIPT",
                voucherNumber,
                voucherDate,
                referenceNumber: input.referenceNumber,
                narration: input.narration || `${input.paymentMode} received from ${customer.name}`,
                status: "POSTED",
                counterpartyLedgerId: customer.ledgerId,
                totalTaxableAmount: input.amount,
                totalTaxAmount: 0,
                totalAmount: input.amount,
                createdById: userId,
            },
        });

        // 2. Ledger Entries (DR bank/cash / CR customer)
        await tx.ledgerEntry.createMany({
            data: [
                {
                    companyId, financialYearId, voucherId: voucher.id,
                    entryDate: voucherDate, ledgerId: bankCashLedgerId,
                    debitAmount: input.amount, creditAmount: 0, lineNo: 1,
                    remarks: `Receipt from ${customer.name} - ${voucherNumber}`,
                },
                {
                    companyId, financialYearId, voucherId: voucher.id,
                    entryDate: voucherDate, ledgerId: customer.ledgerId,
                    debitAmount: 0, creditAmount: input.amount, lineNo: 2,
                    remarks: `Receipt - ${voucherNumber}`,
                },
            ],
        });

        if (input.idempotencyKey) {
            await saveIdempotency(companyId, input.idempotencyKey, { voucherId: voucher.id, voucherNumber }, tx);
        }

        return { voucher };
    });

    await createAuditLog({ userId, companyId, module: "vouchers", entityName: "Voucher", entityId: result.voucher.id, action: "CREATE" });
    return result;
}

// ─── Payment Voucher Posting ──────────────────────────────────────────────────
// Cash/cheque paid to suppliers (no inventory impact)

export async function postPaymentVoucher(userId: string, input: CreatePaymentVoucherInput) {
    const { companyId, financialYearId, supplierId, bankCashLedgerId } = input;

    // Idempotency guard
    if (input.idempotencyKey) {
        const cached = await prisma.$transaction(async (tx) => checkIdempotency(companyId, input.idempotencyKey!, tx));
        if (cached) return cached;
    }

    // Fetch supplier with ledger
    const supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, companyId },
        include: { ledger: true },
    });
    if (!supplier) throw new AppError(404, "Supplier not found");

    const bankCashLedger = await prisma.ledger.findFirst({ where: { id: bankCashLedgerId, companyId } });
    if (!bankCashLedger) throw new AppError(404, "Bank/Cash ledger not found");

    const result = await prisma.$transaction(async (tx) => {
        const voucherNumber = await generateVoucherNumber(tx, companyId, financialYearId, "PAYMENT");
        const voucherDate = new Date(input.voucherDate);

        // 1. Create Voucher
        const voucher = await tx.voucher.create({
            data: {
                companyId,
                financialYearId,
                voucherType: "PAYMENT",
                voucherNumber,
                voucherDate,
                referenceNumber: input.referenceNumber,
                narration: input.narration || `${input.paymentMode} paid to ${supplier.name}`,
                status: "POSTED",
                counterpartyLedgerId: supplier.ledgerId,
                totalTaxableAmount: input.amount,
                totalTaxAmount: 0,
                totalAmount: input.amount,
                createdById: userId,
            },
        });

        // 2. Ledger Entries (DR supplier / CR bank/cash)
        await tx.ledgerEntry.createMany({
            data: [
                {
                    companyId, financialYearId, voucherId: voucher.id,
                    entryDate: voucherDate, ledgerId: supplier.ledgerId,
                    debitAmount: input.amount, creditAmount: 0, lineNo: 1,
                    remarks: `Payment to ${supplier.name} - ${voucherNumber}`,
                },
                {
                    companyId, financialYearId, voucherId: voucher.id,
                    entryDate: voucherDate, ledgerId: bankCashLedgerId,
                    debitAmount: 0, creditAmount: input.amount, lineNo: 2,
                    remarks: `Payment - ${voucherNumber}`,
                },
            ],
        });

        if (input.idempotencyKey) {
            await saveIdempotency(companyId, input.idempotencyKey, { voucherId: voucher.id, voucherNumber }, tx);
        }

        return { voucher };
    });

    await createAuditLog({ userId, companyId, module: "vouchers", entityName: "Voucher", entityId: result.voucher.id, action: "CREATE" });
    return result;
}

// ─── List & Get ───────────────────────────────────────────────────────────────

export async function listVouchers(query: z.infer<typeof listVouchersQuerySchema>) {
    const { companyId, financialYearId, voucherType, status, fromDate, toDate, page, limit } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.VoucherWhereInput = {
        companyId,
        ...(financialYearId ? { financialYearId } : {}),
        ...(voucherType ? { voucherType } : {}),
        ...(status ? { status } : {}),
        ...(fromDate || toDate
            ? { voucherDate: { ...(fromDate ? { gte: new Date(fromDate) } : {}), ...(toDate ? { lte: new Date(toDate) } : {}) } }
            : {}),
    };
    const [data, total] = await Promise.all([
        prisma.voucher.findMany({
            where, skip, take: limit,
            orderBy: { voucherDate: "desc" },
            include: { counterpartyLedger: { select: { id: true, name: true } } },
        }),
        prisma.voucher.count({ where }),
    ]);
    return paginate(data, total, page, limit);
}

export async function getVoucher(companyId: string, id: string) {
    const voucher = await prisma.voucher.findFirst({
        where: { id, companyId },
        include: {
            voucherLines: { include: { stockItem: true, ledger: true } },
            invoice: { include: { items: { include: { stockItem: true } }, customer: true } },
            ledgerEntries: { include: { ledger: true } },
            gstRecords: true,
            counterpartyLedger: true,
        },
    });
    if (!voucher) throw new AppError(404, "Voucher not found");
    return voucher;
}

export async function cancelVoucher(companyId: string, id: string, userId: string, reason: string) {
    const voucher = await prisma.voucher.findFirst({ where: { id, companyId } });
    if (!voucher) throw new AppError(404, "Voucher not found");
    if (voucher.status === "CANCELLED") throw new AppError(400, "Voucher is already cancelled");

    await prisma.voucher.update({
        where: { id },
        data: { status: "CANCELLED", narration: `${voucher.narration ?? ""} [CANCELLED: ${reason}]`.trim(), updatedById: userId },
    });

    await createAuditLog({ userId, companyId, module: "vouchers", entityName: "Voucher", entityId: id, action: "UPDATE", changes: { status: "CANCELLED", reason } });
}
