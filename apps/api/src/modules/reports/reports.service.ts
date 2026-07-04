import { prisma } from "../../db.js";

interface DateRange {
    companyId: string;
    financialYearId?: string;
    fromDate?: string;
    toDate?: string;
}

// ─── Stock Summary ────────────────────────────────────────────────────────────

export async function getStockSummary(params: DateRange & { stockGroupId?: string }) {
    const { companyId, financialYearId, stockGroupId, fromDate, toDate } = params;

    const txnWhere = {
        companyId,
        ...(financialYearId ? { financialYearId } : {}),
        ...(fromDate || toDate
            ? {
                txnDate: {
                    ...(fromDate ? { gte: new Date(fromDate) } : {}),
                    ...(toDate ? { lte: new Date(toDate) } : {}),
                },
            }
            : {}),
    };

    const items = await prisma.stockItem.findMany({
        where: {
            companyId,
            isActive: true,
            ...(stockGroupId ? { stockGroupId } : {}),
        },
        include: { unit: true, stockGroup: true },
    });

    const results = await Promise.all(
        items.map(async (item) => {
            const [inAgg, outAgg] = await Promise.all([
                prisma.inventoryTransaction.aggregate({
                    where: { ...txnWhere, stockItemId: item.id, txnType: "IN" },
                    _sum: { qtyIn: true, totalCost: true },
                }),
                prisma.inventoryTransaction.aggregate({
                    where: { ...txnWhere, stockItemId: item.id, txnType: "OUT" },
                    _sum: { qtyOut: true, totalCost: true },
                }),
            ]);

            const qtyIn = Number(inAgg._sum.qtyIn ?? 0);
            const qtyOut = Number(outAgg._sum.qtyOut ?? 0);
            const balance = qtyIn - qtyOut;
            const totalCostIn = Number(inAgg._sum.totalCost ?? 0);
            const avgCost = qtyIn > 0 ? totalCostIn / qtyIn : 0;

            return {
                stockItemId: item.id,
                name: item.name,
                sku: item.sku,
                stockGroup: item.stockGroup.name,
                unit: item.unit.symbol,
                qtyIn,
                qtyOut,
                balance,
                avgCost: parseFloat(avgCost.toFixed(4)),
                stockValue: parseFloat((balance * avgCost).toFixed(2)),
            };
        })
    );

    return results;
}

// ─── Sales Register ───────────────────────────────────────────────────────────

export async function getSalesRegister(params: DateRange & { page: number; limit: number }) {
    const { companyId, financialYearId, fromDate, toDate, page, limit } = params;
    const skip = (page - 1) * limit;

    const where = {
        companyId,
        voucherType: "SALES" as const,
        status: "POSTED" as const,
        ...(financialYearId ? { financialYearId } : {}),
        ...(fromDate || toDate
            ? { voucherDate: { ...(fromDate ? { gte: new Date(fromDate) } : {}), ...(toDate ? { lte: new Date(toDate) } : {}) } }
            : {}),
    };

    const [data, total] = await Promise.all([
        prisma.voucher.findMany({
            where,
            skip,
            take: limit,
            orderBy: { voucherDate: "asc" },
            include: {
                counterpartyLedger: { select: { id: true, name: true } },
                invoice: { select: { invoiceNumber: true, customer: { select: { name: true, gstin: true } } } },
            },
        }),
        prisma.voucher.count({ where }),
    ]);

    const totals = await prisma.voucher.aggregate({
        where,
        _sum: { totalTaxableAmount: true, totalTaxAmount: true, totalAmount: true },
    });

    return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        summary: {
            totalTaxable: Number(totals._sum.totalTaxableAmount ?? 0),
            totalTax: Number(totals._sum.totalTaxAmount ?? 0),
            grandTotal: Number(totals._sum.totalAmount ?? 0),
        },
    };
}

// ─── Purchase Register ────────────────────────────────────────────────────────

export async function getPurchaseRegister(params: DateRange & { page: number; limit: number }) {
    const { companyId, financialYearId, fromDate, toDate, page, limit } = params;
    const skip = (page - 1) * limit;

    const where = {
        companyId,
        voucherType: "PURCHASE" as const,
        status: "POSTED" as const,
        ...(financialYearId ? { financialYearId } : {}),
        ...(fromDate || toDate
            ? { voucherDate: { ...(fromDate ? { gte: new Date(fromDate) } : {}), ...(toDate ? { lte: new Date(toDate) } : {}) } }
            : {}),
    };

    const [data, total] = await Promise.all([
        prisma.voucher.findMany({
            where,
            skip,
            take: limit,
            orderBy: { voucherDate: "asc" },
            include: { counterpartyLedger: { select: { id: true, name: true } } },
        }),
        prisma.voucher.count({ where }),
    ]);

    const totals = await prisma.voucher.aggregate({
        where,
        _sum: { totalTaxableAmount: true, totalTaxAmount: true, totalAmount: true },
    });

    return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        summary: {
            totalTaxable: Number(totals._sum.totalTaxableAmount ?? 0),
            totalTax: Number(totals._sum.totalTaxAmount ?? 0),
            grandTotal: Number(totals._sum.totalAmount ?? 0),
        },
    };
}

// ─── Outstanding Customers ────────────────────────────────────────────────────

export async function getOutstandingCustomers(params: DateRange) {
    const { companyId } = params;

    const customers = await prisma.customer.findMany({
        where: { companyId, isActive: true },
        include: { ledger: true },
    });

    const results = await Promise.all(
        customers.map(async (customer) => {
            const [debitAgg, creditAgg] = await Promise.all([
                prisma.ledgerEntry.aggregate({
                    where: { companyId, ledgerId: customer.ledgerId },
                    _sum: { debitAmount: true },
                }),
                prisma.ledgerEntry.aggregate({
                    where: { companyId, ledgerId: customer.ledgerId },
                    _sum: { creditAmount: true },
                }),
            ]);

            const totalDebit = Number(debitAgg._sum.debitAmount ?? 0);
            const totalCredit = Number(creditAgg._sum.creditAmount ?? 0);
            const outstanding = parseFloat((totalDebit - totalCredit).toFixed(2));

            return {
                customerId: customer.id,
                name: customer.name,
                mobile: customer.mobile,
                gstin: customer.gstin,
                creditLimit: Number(customer.creditLimit),
                outstanding,
            };
        })
    );

    return results.filter((r) => r.outstanding !== 0);
}

// ─── Outstanding Suppliers ────────────────────────────────────────────────────

export async function getOutstandingSuppliers(params: DateRange) {
    const { companyId } = params;

    const suppliers = await prisma.supplier.findMany({
        where: { companyId, isActive: true },
        include: { ledger: true },
    });

    const results = await Promise.all(
        suppliers.map(async (supplier) => {
            const [debitAgg, creditAgg] = await Promise.all([
                prisma.ledgerEntry.aggregate({
                    where: { companyId, ledgerId: supplier.ledgerId },
                    _sum: { debitAmount: true },
                }),
                prisma.ledgerEntry.aggregate({
                    where: { companyId, ledgerId: supplier.ledgerId },
                    _sum: { creditAmount: true },
                }),
            ]);

            const totalDebit = Number(debitAgg._sum.debitAmount ?? 0);
            const totalCredit = Number(creditAgg._sum.creditAmount ?? 0);
            const outstanding = parseFloat((totalCredit - totalDebit).toFixed(2)); // CR > DR for suppliers

            return {
                supplierId: supplier.id,
                name: supplier.name,
                mobile: supplier.mobile,
                gstin: supplier.gstin,
                outstanding,
            };
        })
    );

    return results.filter((r) => r.outstanding !== 0);
}
