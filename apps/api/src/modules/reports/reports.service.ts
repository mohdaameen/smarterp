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

// ─── Trial Balance ────────────────────────────────────────────────────────────

export async function getTrialBalance(params: DateRange) {
    const { companyId, financialYearId, fromDate, toDate } = params;
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    const ledgers = await prisma.ledger.findMany({
        where: { companyId, isActive: true },
        select: {
            id: true,
            name: true,
            code: true,
            ledgerType: true,
            openingBalance: true,
            openingBalanceType: true,
            ledgerGroup: { select: { name: true, nature: true } },
        },
        orderBy: { name: "asc" },
    });

    const data = await Promise.all(
        ledgers.map(async (ledger) => {
            const openingNative = Number(ledger.openingBalance ?? 0);
            const openingSigned = ledger.openingBalanceType === "CR" ? -openingNative : openingNative;

            const periodEntriesWhere = {
                companyId,
                ledgerId: ledger.id,
                ...(financialYearId ? { financialYearId } : {}),
                ...((from || to)
                    ? {
                        entryDate: {
                            ...(from ? { gte: from } : {}),
                            ...(to ? { lte: to } : {}),
                        },
                    }
                    : {}),
            };

            const [openingAgg, periodAgg] = await Promise.all([
                from
                    ? prisma.ledgerEntry.aggregate({
                        where: {
                            companyId,
                            ledgerId: ledger.id,
                            ...(financialYearId ? { financialYearId } : {}),
                            entryDate: { lt: from },
                        },
                        _sum: { debitAmount: true, creditAmount: true },
                    })
                    : Promise.resolve({ _sum: { debitAmount: 0, creditAmount: 0 } }),
                prisma.ledgerEntry.aggregate({
                    where: periodEntriesWhere,
                    _sum: { debitAmount: true, creditAmount: true },
                }),
            ]);

            const openingFromEntries = Number(openingAgg._sum.debitAmount ?? 0) - Number(openingAgg._sum.creditAmount ?? 0);
            const openingNet = Number.parseFloat((openingSigned + openingFromEntries).toFixed(2));

            const periodDebit = Number.parseFloat(Number(periodAgg._sum.debitAmount ?? 0).toFixed(2));
            const periodCredit = Number.parseFloat(Number(periodAgg._sum.creditAmount ?? 0).toFixed(2));
            const closingNet = Number.parseFloat((openingNet + periodDebit - periodCredit).toFixed(2));

            return {
                ledgerId: ledger.id,
                ledgerName: ledger.name,
                ledgerCode: ledger.code,
                ledgerType: ledger.ledgerType,
                ledgerGroup: ledger.ledgerGroup.name,
                openingDebit: Math.max(openingNet, 0),
                openingCredit: Math.max(-openingNet, 0),
                periodDebit,
                periodCredit,
                closingDebit: Math.max(closingNet, 0),
                closingCredit: Math.max(-closingNet, 0),
            };
        })
    );

    const filtered = data.filter((row) => {
        const totalImpact =
            row.openingDebit +
            row.openingCredit +
            row.periodDebit +
            row.periodCredit +
            row.closingDebit +
            row.closingCredit;
        return totalImpact !== 0;
    });

    const summary = filtered.reduce(
        (acc, row) => {
            acc.openingDebit += row.openingDebit;
            acc.openingCredit += row.openingCredit;
            acc.periodDebit += row.periodDebit;
            acc.periodCredit += row.periodCredit;
            acc.closingDebit += row.closingDebit;
            acc.closingCredit += row.closingCredit;
            return acc;
        },
        {
            openingDebit: 0,
            openingCredit: 0,
            periodDebit: 0,
            periodCredit: 0,
            closingDebit: 0,
            closingCredit: 0,
        }
    );

    return {
        data: filtered,
        summary: {
            openingDebit: Number.parseFloat(summary.openingDebit.toFixed(2)),
            openingCredit: Number.parseFloat(summary.openingCredit.toFixed(2)),
            periodDebit: Number.parseFloat(summary.periodDebit.toFixed(2)),
            periodCredit: Number.parseFloat(summary.periodCredit.toFixed(2)),
            closingDebit: Number.parseFloat(summary.closingDebit.toFixed(2)),
            closingCredit: Number.parseFloat(summary.closingCredit.toFixed(2)),
        },
    };
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

function normalizeNature(nature: string | null | undefined): string {
    return (nature ?? "").trim().toUpperCase();
}

type BalanceBucket = "ASSET" | "LIABILITY" | "EQUITY";

function inferBucket(nature: string, ledgerType: string): BalanceBucket {
    if (nature.includes("ASSET") || nature.includes("CURRENT ASSET") || nature.includes("FIXED ASSET")) {
        return "ASSET";
    }
    if (nature.includes("LIABILITY") || nature.includes("PAYABLE")) {
        return "LIABILITY";
    }
    if (nature.includes("EQUITY") || nature.includes("CAPITAL") || nature.includes("RESERVE")) {
        return "EQUITY";
    }
    if (nature.includes("INCOME") || nature.includes("REVENUE")) {
        return "EQUITY";
    }
    if (nature.includes("EXPENSE")) {
        return "ASSET";
    }

    if (["CUSTOMER", "BANK", "CASH", "STOCK"].includes(ledgerType)) {
        return "ASSET";
    }
    if (["SUPPLIER"].includes(ledgerType)) {
        return "LIABILITY";
    }
    if (["INCOME"].includes(ledgerType)) {
        return "EQUITY";
    }
    return "ASSET";
}

export async function getBalanceSheet(params: DateRange) {
    const { companyId, financialYearId, toDate } = params;
    const asOnDate = toDate ? new Date(toDate) : undefined;

    const ledgers = await prisma.ledger.findMany({
        where: { companyId, isActive: true },
        select: {
            id: true,
            name: true,
            code: true,
            ledgerType: true,
            openingBalance: true,
            openingBalanceType: true,
            ledgerGroup: { select: { name: true, nature: true } },
        },
        orderBy: { name: "asc" },
    });

    const rows = await Promise.all(
        ledgers.map(async (ledger) => {
            const entryAgg = await prisma.ledgerEntry.aggregate({
                where: {
                    companyId,
                    ledgerId: ledger.id,
                    ...(financialYearId ? { financialYearId } : {}),
                    ...(asOnDate ? { entryDate: { lte: asOnDate } } : {}),
                },
                _sum: { debitAmount: true, creditAmount: true },
            });

            const openingNative = Number(ledger.openingBalance ?? 0);
            const openingSigned = ledger.openingBalanceType === "CR" ? -openingNative : openingNative;
            const periodSigned = Number(entryAgg._sum.debitAmount ?? 0) - Number(entryAgg._sum.creditAmount ?? 0);
            const closingSigned = Number.parseFloat((openingSigned + periodSigned).toFixed(2));

            return {
                ledgerId: ledger.id,
                ledgerName: ledger.name,
                ledgerCode: ledger.code,
                ledgerType: ledger.ledgerType,
                ledgerGroup: ledger.ledgerGroup.name,
                nature: normalizeNature(ledger.ledgerGroup.nature),
                closingSigned,
            };
        })
    );

    const assets: Array<Record<string, unknown>> = [];
    const liabilities: Array<Record<string, unknown>> = [];
    const equity: Array<Record<string, unknown>> = [];

    for (const row of rows) {
        if (row.closingSigned === 0) continue;

        const bucket = inferBucket(row.nature, row.ledgerType);
        const absolute = Number.parseFloat(Math.abs(row.closingSigned).toFixed(2));
        const common = {
            ledgerId: row.ledgerId,
            ledgerName: row.ledgerName,
            ledgerCode: row.ledgerCode,
            ledgerType: row.ledgerType,
            ledgerGroup: row.ledgerGroup,
            amount: absolute,
        };

        if (bucket === "ASSET") {
            if (row.closingSigned >= 0) assets.push(common);
            else liabilities.push(common);
            continue;
        }

        if (bucket === "LIABILITY") {
            if (row.closingSigned <= 0) liabilities.push(common);
            else assets.push(common);
            continue;
        }

        if (row.closingSigned <= 0) equity.push(common);
        else assets.push(common);
    }

    const totalAssets = Number.parseFloat(assets.reduce((sum, row) => sum + Number(row.amount ?? 0), 0).toFixed(2));
    const totalLiabilities = Number.parseFloat(liabilities.reduce((sum, row) => sum + Number(row.amount ?? 0), 0).toFixed(2));
    const totalEquity = Number.parseFloat(equity.reduce((sum, row) => sum + Number(row.amount ?? 0), 0).toFixed(2));
    const liabilitiesAndEquity = Number.parseFloat((totalLiabilities + totalEquity).toFixed(2));

    return {
        asOnDate: toDate ?? null,
        data: {
            assets,
            liabilities,
            equity,
        },
        summary: {
            totalAssets,
            totalLiabilities,
            totalEquity,
            liabilitiesAndEquity,
            isBalanced: Math.abs(totalAssets - liabilitiesAndEquity) < 0.01,
            difference: Number.parseFloat((totalAssets - liabilitiesAndEquity).toFixed(2)),
        },
    };
}

// ─── Profit & Loss ───────────────────────────────────────────────────────────

function isIncomeLedger(ledgerType: string, nature: string): boolean {
    return ledgerType === "INCOME" || nature.includes("INCOME") || nature.includes("REVENUE");
}

function isExpenseLedger(ledgerType: string, nature: string): boolean {
    return ledgerType === "EXPENSE" || nature.includes("EXPENSE") || nature.includes("DIRECT COST");
}

export async function getProfitLoss(params: DateRange) {
    const { companyId, financialYearId, fromDate, toDate } = params;
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    const ledgers = await prisma.ledger.findMany({
        where: { companyId, isActive: true },
        select: {
            id: true,
            name: true,
            code: true,
            ledgerType: true,
            ledgerGroup: { select: { name: true, nature: true } },
        },
        orderBy: { name: "asc" },
    });

    const incomeRows: Array<Record<string, unknown>> = [];
    const expenseRows: Array<Record<string, unknown>> = [];

    await Promise.all(
        ledgers.map(async (ledger) => {
            const nature = normalizeNature(ledger.ledgerGroup.nature);
            const income = isIncomeLedger(ledger.ledgerType, nature);
            const expense = isExpenseLedger(ledger.ledgerType, nature);

            if (!income && !expense) return;

            const agg = await prisma.ledgerEntry.aggregate({
                where: {
                    companyId,
                    ledgerId: ledger.id,
                    ...(financialYearId ? { financialYearId } : {}),
                    ...((from || to)
                        ? {
                            entryDate: {
                                ...(from ? { gte: from } : {}),
                                ...(to ? { lte: to } : {}),
                            },
                        }
                        : {}),
                },
                _sum: { debitAmount: true, creditAmount: true },
            });

            const debit = Number(agg._sum.debitAmount ?? 0);
            const credit = Number(agg._sum.creditAmount ?? 0);

            if (income) {
                const amount = Number.parseFloat((credit - debit).toFixed(2));
                if (amount !== 0) {
                    incomeRows.push({
                        ledgerId: ledger.id,
                        ledgerName: ledger.name,
                        ledgerCode: ledger.code,
                        ledgerGroup: ledger.ledgerGroup.name,
                        amount,
                    });
                }
            }

            if (expense) {
                const amount = Number.parseFloat((debit - credit).toFixed(2));
                if (amount !== 0) {
                    expenseRows.push({
                        ledgerId: ledger.id,
                        ledgerName: ledger.name,
                        ledgerCode: ledger.code,
                        ledgerGroup: ledger.ledgerGroup.name,
                        amount,
                    });
                }
            }
        })
    );

    const totalIncome = Number.parseFloat(incomeRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0).toFixed(2));
    const totalExpense = Number.parseFloat(expenseRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0).toFixed(2));
    const netProfit = Number.parseFloat((totalIncome - totalExpense).toFixed(2));

    return {
        period: {
            fromDate: fromDate ?? null,
            toDate: toDate ?? null,
        },
        data: {
            income: incomeRows,
            expenses: expenseRows,
        },
        summary: {
            totalIncome,
            totalExpense,
            netProfit,
            netLoss: netProfit < 0 ? Number.parseFloat(Math.abs(netProfit).toFixed(2)) : 0,
            isProfit: netProfit >= 0,
        },
    };
}

// ─── Cash Flow ────────────────────────────────────────────────────────────────

export async function getCashFlow(params: DateRange) {
    const { companyId, financialYearId, fromDate, toDate } = params;
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    const cashLedgers = await prisma.ledger.findMany({
        where: {
            companyId,
            isActive: true,
            ledgerType: { in: ["CASH", "BANK"] },
        },
        select: {
            id: true,
            name: true,
            code: true,
            ledgerType: true,
            openingBalance: true,
            openingBalanceType: true,
        },
        orderBy: { name: "asc" },
    });

    const rows = await Promise.all(
        cashLedgers.map(async (ledger) => {
            const [openingAgg, periodAgg] = await Promise.all([
                from
                    ? prisma.ledgerEntry.aggregate({
                        where: {
                            companyId,
                            ledgerId: ledger.id,
                            ...(financialYearId ? { financialYearId } : {}),
                            entryDate: { lt: from },
                        },
                        _sum: { debitAmount: true, creditAmount: true },
                    })
                    : Promise.resolve({ _sum: { debitAmount: 0, creditAmount: 0 } }),
                prisma.ledgerEntry.aggregate({
                    where: {
                        companyId,
                        ledgerId: ledger.id,
                        ...(financialYearId ? { financialYearId } : {}),
                        ...((from || to)
                            ? {
                                entryDate: {
                                    ...(from ? { gte: from } : {}),
                                    ...(to ? { lte: to } : {}),
                                },
                            }
                            : {}),
                    },
                    _sum: { debitAmount: true, creditAmount: true },
                }),
            ]);

            const openingNative = Number(ledger.openingBalance ?? 0);
            const openingSigned = ledger.openingBalanceType === "CR" ? -openingNative : openingNative;
            const openingFromEntries = Number(openingAgg._sum.debitAmount ?? 0) - Number(openingAgg._sum.creditAmount ?? 0);
            const opening = Number.parseFloat((openingSigned + openingFromEntries).toFixed(2));

            const cashIn = Number.parseFloat(Number(periodAgg._sum.debitAmount ?? 0).toFixed(2));
            const cashOut = Number.parseFloat(Number(periodAgg._sum.creditAmount ?? 0).toFixed(2));
            const net = Number.parseFloat((cashIn - cashOut).toFixed(2));
            const closing = Number.parseFloat((opening + net).toFixed(2));

            return {
                ledgerId: ledger.id,
                ledgerName: ledger.name,
                ledgerCode: ledger.code,
                ledgerType: ledger.ledgerType,
                opening,
                cashIn,
                cashOut,
                net,
                closing,
            };
        })
    );

    const summary = rows.reduce(
        (acc, row) => {
            acc.opening += row.opening;
            acc.cashIn += row.cashIn;
            acc.cashOut += row.cashOut;
            acc.net += row.net;
            acc.closing += row.closing;
            return acc;
        },
        { opening: 0, cashIn: 0, cashOut: 0, net: 0, closing: 0 }
    );

    return {
        period: {
            fromDate: fromDate ?? null,
            toDate: toDate ?? null,
        },
        data: rows,
        summary: {
            opening: Number.parseFloat(summary.opening.toFixed(2)),
            cashIn: Number.parseFloat(summary.cashIn.toFixed(2)),
            cashOut: Number.parseFloat(summary.cashOut.toFixed(2)),
            net: Number.parseFloat(summary.net.toFixed(2)),
            closing: Number.parseFloat(summary.closing.toFixed(2)),
        },
    };
}
