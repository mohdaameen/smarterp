"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest, apiRequestEnvelope } from "../../../lib/api-client";
import { useWorkspaceData } from "../../../lib/use-workspace-data";
import { CompanyFySelector } from "../../../components/company-fy-selector";
import { InlineAlert } from "../../../components/inline-alert";
import { EmptyState } from "../../../components/empty-state";

type StockItem = { id: string; name: string };
type ListEnvelope<T> = { ok: boolean; data: T[] };
type BillingLine = { stockItemId: string; qty: string; rate: string; gstRate: string };

function lineTotals(line: BillingLine) {
    const qty = Number(line.qty || 0);
    const rate = Number(line.rate || 0);
    const gstRate = Number(line.gstRate || 0);
    const taxable = qty * rate;
    const tax = taxable * (gstRate / 100);
    return {
        taxable,
        tax,
        total: taxable + tax,
    };
}

function createEmptyLine(stockItemId = ""): BillingLine {
    return { stockItemId, qty: "1", rate: "100", gstRate: "18" };
}

export default function WorkspaceBillingPage() {
    const {
        token,
        alerts,
        runAction,
        actionState,
        hasWorkspace,
        companies,
        financialYears,
        selectedCompanyId,
        selectedFinancialYearId,
        setSelectedCompanyId,
        setSelectedFinancialYearId,
        customers,
        suppliers,
        ledgers,
        vouchers,
        refreshContext,
    } = useWorkspaceData();

    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [salesForm, setSalesForm] = useState({ customerId: "", salesLedgerId: "", voucherDate: "2026-07-05", lines: [createEmptyLine()] });
    const [purchaseForm, setPurchaseForm] = useState({ supplierId: "", purchaseLedgerId: "", voucherDate: "2026-07-05", lines: [createEmptyLine()] });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!token || !selectedCompanyId) return;
        async function loadStocks() {
            const resp = await apiRequestEnvelope<ListEnvelope<StockItem>>("/masters/stock-items", { token, query: { companyId: selectedCompanyId } });
            setStockItems(resp.data ?? []);
            const fallbackStockId = resp.data?.[0]?.id || "";
            setSalesForm((prev) => ({
                ...prev,
                lines: prev.lines.map((line) => ({ ...line, stockItemId: line.stockItemId || fallbackStockId })),
            }));
            setPurchaseForm((prev) => ({
                ...prev,
                lines: prev.lines.map((line) => ({ ...line, stockItemId: line.stockItemId || fallbackStockId })),
            }));
        }
        void loadStocks();
    }, [token, selectedCompanyId]);

    const salesTotals = useMemo(() => {
        return salesForm.lines.reduce(
            (acc, line) => {
                const totals = lineTotals(line);
                acc.taxable += totals.taxable;
                acc.tax += totals.tax;
                acc.total += totals.total;
                return acc;
            },
            { taxable: 0, tax: 0, total: 0 }
        );
    }, [salesForm.lines]);

    const purchaseTotals = useMemo(() => {
        return purchaseForm.lines.reduce(
            (acc, line) => {
                const totals = lineTotals(line);
                acc.taxable += totals.taxable;
                acc.tax += totals.tax;
                acc.total += totals.total;
                return acc;
            },
            { taxable: 0, tax: 0, total: 0 }
        );
    }, [purchaseForm.lines]);

    function validateLines(prefix: "sales" | "purchase", lines: BillingLine[]) {
        const next: Record<string, string> = {};
        lines.forEach((line, index) => {
            const qty = Number(line.qty || 0);
            const rate = Number(line.rate || 0);
            const gstRate = Number(line.gstRate || 0);
            if (!line.stockItemId) next[`${prefix}-line-${index}-stock`] = "Select stock item";
            if (qty <= 0) next[`${prefix}-line-${index}-qty`] = "Qty must be greater than 0";
            if (rate <= 0) next[`${prefix}-line-${index}-rate`] = "Rate must be greater than 0";
            if (gstRate < 0 || gstRate > 100) next[`${prefix}-line-${index}-gst`] = "GST must be 0 to 100";
        });
        setFieldErrors((prev) => ({ ...prev, ...next }));
        return Object.keys(next).length === 0;
    }

    function validateSales() {
        const next: Record<string, string> = {};
        if (!salesForm.customerId) next.salesCustomer = "Select customer";
        if (!salesForm.salesLedgerId) next.salesLedger = "Select sales ledger";
        if (salesForm.lines.length === 0) next.salesLines = "At least one line is required";
        setFieldErrors((prev) => ({ ...prev, ...next }));
        return Object.keys(next).length === 0 && validateLines("sales", salesForm.lines);
    }

    function validatePurchase() {
        const next: Record<string, string> = {};
        if (!purchaseForm.supplierId) next.purchaseSupplier = "Select supplier";
        if (!purchaseForm.purchaseLedgerId) next.purchaseLedger = "Select purchase ledger";
        if (purchaseForm.lines.length === 0) next.purchaseLines = "At least one line is required";
        setFieldErrors((prev) => ({ ...prev, ...next }));
        return Object.keys(next).length === 0 && validateLines("purchase", purchaseForm.lines);
    }

    function setSalesLine(index: number, patch: Partial<BillingLine>) {
        setSalesForm((prev) => ({
            ...prev,
            lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
        }));
    }

    function setPurchaseLine(index: number, patch: Partial<BillingLine>) {
        setPurchaseForm((prev) => ({
            ...prev,
            lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
        }));
    }

    function addSalesLine() {
        const fallbackStockId = stockItems[0]?.id || "";
        setSalesForm((prev) => ({ ...prev, lines: [...prev.lines, createEmptyLine(fallbackStockId)] }));
    }

    function addPurchaseLine() {
        const fallbackStockId = stockItems[0]?.id || "";
        setPurchaseForm((prev) => ({ ...prev, lines: [...prev.lines, createEmptyLine(fallbackStockId)] }));
    }

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">Module</p>
                <h1>Billing</h1>
                <p className="subtle">Post sales and purchase vouchers from UI using frontend-api-reference payloads.</p>
            </div>

            <CompanyFySelector
                title="Current Context"
                companies={companies}
                financialYears={financialYears}
                selectedCompanyId={selectedCompanyId}
                selectedFinancialYearId={selectedFinancialYearId}
                onCompanyChange={setSelectedCompanyId}
                onFinancialYearChange={setSelectedFinancialYearId}
            />

            {!stockItems.length ? (
                <EmptyState title="No stock items for billing" description="Create stock items in Inventory module before posting sales or purchase." />
            ) : null}

            <section className="card two-col">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!hasWorkspace()) return;
                        if (!validateSales()) return;
                        void runAction("postSalesModule", "Sales voucher posted", async () => {
                            await apiRequest("/vouchers/sales", {
                                method: "POST",
                                token,
                                query: { companyId: selectedCompanyId },
                                body: {
                                    companyId: selectedCompanyId,
                                    financialYearId: selectedFinancialYearId,
                                    customerId: salesForm.customerId,
                                    salesLedgerId: salesForm.salesLedgerId,
                                    voucherDate: salesForm.voucherDate,
                                    isInterState: false,
                                    items: salesForm.lines.map((line) => ({
                                        stockItemId: line.stockItemId,
                                        qty: Number(line.qty),
                                        rate: Number(line.rate),
                                        gstRate: Number(line.gstRate),
                                    })),
                                },
                            });
                            setSalesForm((prev) => ({ ...prev, lines: [createEmptyLine(stockItems[0]?.id || "")] }));
                            await refreshContext();
                        });
                    }}
                >
                    <h3>Sales Voucher</h3>
                    <select value={salesForm.customerId} onChange={(e) => setSalesForm((p) => ({ ...p, customerId: e.target.value }))} required>
                        <option value="">Customer</option>
                        {customers.map((row) => (
                            <option key={row.id} value={row.id}>{row.name}</option>
                        ))}
                    </select>
                    {fieldErrors.salesCustomer ? <p className="field-error">{fieldErrors.salesCustomer}</p> : null}
                    <select value={salesForm.salesLedgerId} onChange={(e) => setSalesForm((p) => ({ ...p, salesLedgerId: e.target.value }))} required>
                        <option value="">Sales ledger</option>
                        {ledgers.filter((l) => l.ledgerType === "INCOME").map((row) => (
                            <option key={row.id} value={row.id}>{row.name}</option>
                        ))}
                    </select>
                    {fieldErrors.salesLedger ? <p className="field-error">{fieldErrors.salesLedger}</p> : null}
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Stock Item</th>
                                    <th>Qty</th>
                                    <th>Rate</th>
                                    <th>GST %</th>
                                    <th>Line Total</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesForm.lines.map((line, index) => {
                                    const totals = lineTotals(line);
                                    return (
                                        <tr key={`sales-line-${index}`}>
                                            <td>
                                                <select value={line.stockItemId} onChange={(e) => setSalesLine(index, { stockItemId: e.target.value })}>
                                                    <option value="">Stock item</option>
                                                    {stockItems.map((row) => (
                                                        <option key={row.id} value={row.id}>{row.name}</option>
                                                    ))}
                                                </select>
                                                {fieldErrors[`sales-line-${index}-stock`] ? <p className="field-error">{fieldErrors[`sales-line-${index}-stock`]}</p> : null}
                                            </td>
                                            <td>
                                                <input type="number" min={0} step="0.01" value={line.qty} onChange={(e) => setSalesLine(index, { qty: e.target.value })} />
                                                {fieldErrors[`sales-line-${index}-qty`] ? <p className="field-error">{fieldErrors[`sales-line-${index}-qty`]}</p> : null}
                                            </td>
                                            <td>
                                                <input type="number" min={0} step="0.01" value={line.rate} onChange={(e) => setSalesLine(index, { rate: e.target.value })} />
                                                {fieldErrors[`sales-line-${index}-rate`] ? <p className="field-error">{fieldErrors[`sales-line-${index}-rate`]}</p> : null}
                                            </td>
                                            <td>
                                                <input type="number" min={0} max={100} step="0.01" value={line.gstRate} onChange={(e) => setSalesLine(index, { gstRate: e.target.value })} />
                                                {fieldErrors[`sales-line-${index}-gst`] ? <p className="field-error">{fieldErrors[`sales-line-${index}-gst`]}</p> : null}
                                            </td>
                                            <td>{totals.total.toFixed(2)}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="ghost"
                                                    onClick={() => {
                                                        setSalesForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
                                                    }}
                                                    disabled={salesForm.lines.length === 1}
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {fieldErrors.salesLines ? <p className="field-error">{fieldErrors.salesLines}</p> : null}
                    <div className="inline-form">
                        <button type="button" className="ghost" onClick={addSalesLine}>Add Line</button>
                        <p className="subtle">Taxable: {salesTotals.taxable.toFixed(2)}</p>
                        <p className="subtle">Tax: {salesTotals.tax.toFixed(2)}</p>
                        <p className="subtle">Total: {salesTotals.total.toFixed(2)}</p>
                    </div>
                    <InlineAlert alert={alerts.postSalesModule} />
                    <button disabled={actionState("postSalesModule") || !hasWorkspace()}>{actionState("postSalesModule") ? "Posting..." : "Post Sales"}</button>
                </form>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!hasWorkspace()) return;
                        if (!validatePurchase()) return;
                        void runAction("postPurchaseModule", "Purchase voucher posted", async () => {
                            await apiRequest("/vouchers/purchase", {
                                method: "POST",
                                token,
                                query: { companyId: selectedCompanyId },
                                body: {
                                    companyId: selectedCompanyId,
                                    financialYearId: selectedFinancialYearId,
                                    supplierId: purchaseForm.supplierId,
                                    purchaseLedgerId: purchaseForm.purchaseLedgerId,
                                    voucherDate: purchaseForm.voucherDate,
                                    isInterState: false,
                                    items: purchaseForm.lines.map((line) => ({
                                        stockItemId: line.stockItemId,
                                        qty: Number(line.qty),
                                        rate: Number(line.rate),
                                        gstRate: Number(line.gstRate),
                                    })),
                                },
                            });
                            setPurchaseForm((prev) => ({ ...prev, lines: [createEmptyLine(stockItems[0]?.id || "")] }));
                            await refreshContext();
                        });
                    }}
                >
                    <h3>Purchase Voucher</h3>
                    <select value={purchaseForm.supplierId} onChange={(e) => setPurchaseForm((p) => ({ ...p, supplierId: e.target.value }))} required>
                        <option value="">Supplier</option>
                        {suppliers.map((row) => (
                            <option key={row.id} value={row.id}>{row.name}</option>
                        ))}
                    </select>
                    {fieldErrors.purchaseSupplier ? <p className="field-error">{fieldErrors.purchaseSupplier}</p> : null}
                    <select value={purchaseForm.purchaseLedgerId} onChange={(e) => setPurchaseForm((p) => ({ ...p, purchaseLedgerId: e.target.value }))} required>
                        <option value="">Purchase ledger</option>
                        {ledgers.filter((l) => l.ledgerType === "EXPENSE").map((row) => (
                            <option key={row.id} value={row.id}>{row.name}</option>
                        ))}
                    </select>
                    {fieldErrors.purchaseLedger ? <p className="field-error">{fieldErrors.purchaseLedger}</p> : null}
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Stock Item</th>
                                    <th>Qty</th>
                                    <th>Rate</th>
                                    <th>GST %</th>
                                    <th>Line Total</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchaseForm.lines.map((line, index) => {
                                    const totals = lineTotals(line);
                                    return (
                                        <tr key={`purchase-line-${index}`}>
                                            <td>
                                                <select value={line.stockItemId} onChange={(e) => setPurchaseLine(index, { stockItemId: e.target.value })}>
                                                    <option value="">Stock item</option>
                                                    {stockItems.map((row) => (
                                                        <option key={row.id} value={row.id}>{row.name}</option>
                                                    ))}
                                                </select>
                                                {fieldErrors[`purchase-line-${index}-stock`] ? <p className="field-error">{fieldErrors[`purchase-line-${index}-stock`]}</p> : null}
                                            </td>
                                            <td>
                                                <input type="number" min={0} step="0.01" value={line.qty} onChange={(e) => setPurchaseLine(index, { qty: e.target.value })} />
                                                {fieldErrors[`purchase-line-${index}-qty`] ? <p className="field-error">{fieldErrors[`purchase-line-${index}-qty`]}</p> : null}
                                            </td>
                                            <td>
                                                <input type="number" min={0} step="0.01" value={line.rate} onChange={(e) => setPurchaseLine(index, { rate: e.target.value })} />
                                                {fieldErrors[`purchase-line-${index}-rate`] ? <p className="field-error">{fieldErrors[`purchase-line-${index}-rate`]}</p> : null}
                                            </td>
                                            <td>
                                                <input type="number" min={0} max={100} step="0.01" value={line.gstRate} onChange={(e) => setPurchaseLine(index, { gstRate: e.target.value })} />
                                                {fieldErrors[`purchase-line-${index}-gst`] ? <p className="field-error">{fieldErrors[`purchase-line-${index}-gst`]}</p> : null}
                                            </td>
                                            <td>{totals.total.toFixed(2)}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="ghost"
                                                    onClick={() => {
                                                        setPurchaseForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
                                                    }}
                                                    disabled={purchaseForm.lines.length === 1}
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {fieldErrors.purchaseLines ? <p className="field-error">{fieldErrors.purchaseLines}</p> : null}
                    <div className="inline-form">
                        <button type="button" className="ghost" onClick={addPurchaseLine}>Add Line</button>
                        <p className="subtle">Taxable: {purchaseTotals.taxable.toFixed(2)}</p>
                        <p className="subtle">Tax: {purchaseTotals.tax.toFixed(2)}</p>
                        <p className="subtle">Total: {purchaseTotals.total.toFixed(2)}</p>
                    </div>
                    <InlineAlert alert={alerts.postPurchaseModule} />
                    <button disabled={actionState("postPurchaseModule") || !hasWorkspace()}>{actionState("postPurchaseModule") ? "Posting..." : "Post Purchase"}</button>
                </form>
            </section>

            <section className="card">
                <h2>Recent Voucher Stream</h2>
                {vouchers.length === 0 ? (
                    <EmptyState title="No vouchers yet" description="Use this module or Vouchers module to post transactions." />
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>No.</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vouchers.map((voucher) => (
                                    <tr key={voucher.id}>
                                        <td>{voucher.voucherNumber}</td>
                                        <td>{voucher.voucherType}</td>
                                        <td>{voucher.status}</td>
                                        <td>{voucher.totalAmount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}
