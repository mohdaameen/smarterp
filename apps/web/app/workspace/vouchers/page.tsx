"use client";

import { FormEvent } from "react";
import { apiRequest } from "../../../lib/api-client";
import { VoucherDetail } from "../../../lib/contracts";
import { useWorkspaceData } from "../../../lib/use-workspace-data";
import { CompanyFySelector } from "../../../components/company-fy-selector";
import { InlineAlert } from "../../../components/inline-alert";
import { EmptyState } from "../../../components/empty-state";

export default function WorkspaceVouchersPage() {
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
        receiptForm,
        setReceiptForm,
        paymentForm,
        setPaymentForm,
        vouchers,
        contextLoading,
        voucherDetail,
        setVoucherDetail,
        refreshContext,
    } = useWorkspaceData();

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">Module</p>
                <h1>Vouchers</h1>
                <p className="subtle">Post receipt/payment vouchers and inspect ledger entry impact quickly.</p>
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

            {!vouchers.length && !contextLoading ? (
                <EmptyState
                    title="No vouchers posted"
                    description="Post receipt or payment vouchers to populate this module and ledger impact view."
                />
            ) : null}

            <section className="card two-col">
                <div className="stack-block">
                    <form
                        onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            if (!hasWorkspace()) return;
                            void runAction("postReceipt", "Receipt voucher posted", async () => {
                                await apiRequest("/vouchers/receipt", {
                                    method: "POST",
                                    token,
                                    query: { companyId: selectedCompanyId },
                                    body: {
                                        companyId: selectedCompanyId,
                                        financialYearId: selectedFinancialYearId,
                                        customerId: receiptForm.customerId,
                                        bankCashLedgerId: receiptForm.bankCashLedgerId,
                                        voucherDate: receiptForm.voucherDate,
                                        amount: Number(receiptForm.amount),
                                        paymentMode: receiptForm.paymentMode,
                                        narration: receiptForm.narration,
                                    },
                                });
                                await refreshContext();
                            });
                        }}
                    >
                        <h3>Post Receipt</h3>
                        <select value={receiptForm.customerId} onChange={(e) => setReceiptForm((p) => ({ ...p, customerId: e.target.value }))} required>
                            <option value="">Customer</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <select value={receiptForm.bankCashLedgerId} onChange={(e) => setReceiptForm((p) => ({ ...p, bankCashLedgerId: e.target.value }))} required>
                            <option value="">Bank/Cash Ledger</option>
                            {ledgers
                                .filter((l) => l.ledgerType === "BANK" || l.ledgerType === "CASH")
                                .map((l) => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                        </select>
                        <input type="number" value={receiptForm.amount} onChange={(e) => setReceiptForm((p) => ({ ...p, amount: e.target.value }))} required />
                        <InlineAlert alert={alerts.postReceipt} />
                        <button disabled={actionState("postReceipt") || !hasWorkspace()}>{actionState("postReceipt") ? "Posting..." : "Post Receipt"}</button>
                    </form>

                    <form
                        onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            if (!hasWorkspace()) return;
                            void runAction("postPayment", "Payment voucher posted", async () => {
                                await apiRequest("/vouchers/payment", {
                                    method: "POST",
                                    token,
                                    query: { companyId: selectedCompanyId },
                                    body: {
                                        companyId: selectedCompanyId,
                                        financialYearId: selectedFinancialYearId,
                                        supplierId: paymentForm.supplierId,
                                        bankCashLedgerId: paymentForm.bankCashLedgerId,
                                        voucherDate: paymentForm.voucherDate,
                                        amount: Number(paymentForm.amount),
                                        paymentMode: paymentForm.paymentMode,
                                        chequeNumber: paymentForm.chequeNumber || undefined,
                                        narration: paymentForm.narration,
                                    },
                                });
                                await refreshContext();
                            });
                        }}
                    >
                        <h3>Post Payment</h3>
                        <select value={paymentForm.supplierId} onChange={(e) => setPaymentForm((p) => ({ ...p, supplierId: e.target.value }))} required>
                            <option value="">Supplier</option>
                            {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <select value={paymentForm.bankCashLedgerId} onChange={(e) => setPaymentForm((p) => ({ ...p, bankCashLedgerId: e.target.value }))} required>
                            <option value="">Bank/Cash Ledger</option>
                            {ledgers
                                .filter((l) => l.ledgerType === "BANK" || l.ledgerType === "CASH")
                                .map((l) => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                        </select>
                        <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} required />
                        <InlineAlert alert={alerts.postPayment} />
                        <button disabled={actionState("postPayment") || !hasWorkspace()}>{actionState("postPayment") ? "Posting..." : "Post Payment"}</button>
                    </form>
                </div>

                <div>
                    <h3>Voucher List</h3>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>No.</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vouchers.map((v) => (
                                    <tr
                                        key={v.id}
                                        onClick={() => {
                                            if (!token || !selectedCompanyId) return;
                                            void runAction("voucherDetail", "Voucher detail loaded", async () => {
                                                const data = await apiRequest<VoucherDetail>(`/vouchers/${v.id}`, { token, query: { companyId: selectedCompanyId } });
                                                setVoucherDetail(data);
                                            });
                                        }}
                                    >
                                        <td>{v.voucherNumber}</td>
                                        <td>{v.voucherType}</td>
                                        <td>{v.totalAmount}</td>
                                        <td>{v.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <InlineAlert alert={alerts.voucherDetail} />

                    {voucherDetail ? (
                        <div className="card-lite">
                            <p><strong>{voucherDetail.voucherNumber}</strong> ({voucherDetail.voucherType})</p>
                            <p className="subtle">Amount: {voucherDetail.totalAmount}</p>
                            <ul className="entries">
                                {voucherDetail.ledgerEntries.map((e) => (
                                    <li key={e.id}><span>{e.ledger.name}</span><span>DR {e.debitAmount}</span><span>CR {e.creditAmount}</span></li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>
            </section>
        </main>
    );
}
