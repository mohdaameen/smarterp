"use client";

import { FormEvent, useState } from "react";
import { apiRequest } from "../../../lib/api-client";
import { useWorkspaceData } from "../../../lib/use-workspace-data";
import { CompanyFySelector } from "../../../components/company-fy-selector";
import { InlineAlert } from "../../../components/inline-alert";
import { EmptyState } from "../../../components/empty-state";

export default function WorkspaceBankingPage() {
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
        ledgers,
        refreshContext,
    } = useWorkspaceData();

    const [contraForm, setContraForm] = useState({ fromLedgerId: "", toLedgerId: "", amount: "2500", voucherDate: "2026-07-05", narration: "Cash to bank" });

    const bankCashLedgers = ledgers.filter((row) => row.ledgerType === "BANK" || row.ledgerType === "CASH");

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">Module</p>
                <h1>Banking</h1>
                <p className="subtle">Use contra postings for cash-bank movement and monitor available bank/cash ledgers.</p>
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

            <section className="card two-col">
                <form
                    onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (!hasWorkspace()) return;
                        void runAction("postContraModule", "Contra voucher posted", async () => {
                            await apiRequest("/vouchers/contra", {
                                method: "POST",
                                token,
                                query: { companyId: selectedCompanyId },
                                body: {
                                    companyId: selectedCompanyId,
                                    financialYearId: selectedFinancialYearId,
                                    fromLedgerId: contraForm.fromLedgerId,
                                    toLedgerId: contraForm.toLedgerId,
                                    amount: Number(contraForm.amount),
                                    voucherDate: contraForm.voucherDate,
                                    narration: contraForm.narration,
                                },
                            });
                            await refreshContext();
                        });
                    }}
                >
                    <h3>Post Contra</h3>
                    <select value={contraForm.fromLedgerId} onChange={(e) => setContraForm((p) => ({ ...p, fromLedgerId: e.target.value }))} required>
                        <option value="">From ledger</option>
                        {bankCashLedgers.map((row) => (
                            <option key={row.id} value={row.id}>{row.name}</option>
                        ))}
                    </select>
                    <select value={contraForm.toLedgerId} onChange={(e) => setContraForm((p) => ({ ...p, toLedgerId: e.target.value }))} required>
                        <option value="">To ledger</option>
                        {bankCashLedgers.map((row) => (
                            <option key={row.id} value={row.id}>{row.name}</option>
                        ))}
                    </select>
                    <input type="number" value={contraForm.amount} onChange={(e) => setContraForm((p) => ({ ...p, amount: e.target.value }))} required />
                    <InlineAlert alert={alerts.postContraModule} />
                    <button disabled={actionState("postContraModule") || !hasWorkspace()}>
                        {actionState("postContraModule") ? "Posting..." : "Post Contra"}
                    </button>
                </form>

                <section>
                    <h3>Bank/Cash Ledgers</h3>
                    {!bankCashLedgers.length ? (
                        <EmptyState title="No bank/cash ledger" description="Create BANK or CASH ledgers in Masters before posting contra." />
                    ) : (
                        <ul className="entries">
                            {bankCashLedgers.map((row) => (
                                <li key={row.id}>
                                    <span>{row.name}</span>
                                    <span>{row.ledgerType}</span>
                                    <span>{row.id.slice(0, 8)}...</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </section>
        </main>
    );
}
