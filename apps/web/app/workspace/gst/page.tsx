"use client";

import { useMemo, useState } from "react";
import { apiRequestEnvelope } from "../../../lib/api-client";
import { useWorkspaceData } from "../../../lib/use-workspace-data";
import { CompanyFySelector } from "../../../components/company-fy-selector";
import { InlineAlert } from "../../../components/inline-alert";
import { EmptyState } from "../../../components/empty-state";

type RegisterEnvelope = {
    ok: boolean;
    data: unknown[];
    summary?: {
        totalTaxable?: number;
        totalTax?: number;
        grandTotal?: number;
    };
};

export default function WorkspaceGstPage() {
    const {
        token,
        alerts,
        runAction,
        actionState,
        companies,
        financialYears,
        selectedCompanyId,
        selectedFinancialYearId,
        setSelectedCompanyId,
        setSelectedFinancialYearId,
    } = useWorkspaceData();

    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const [fromDate, setFromDate] = useState("2026-04-01");
    const [toDate, setToDate] = useState(today);
    const [salesSummary, setSalesSummary] = useState<RegisterEnvelope["summary"]>();
    const [purchaseSummary, setPurchaseSummary] = useState<RegisterEnvelope["summary"]>();

    function loadRegister(kind: "sales" | "purchase") {
        if (!token || !selectedCompanyId) return;
        const key = kind === "sales" ? "gstSalesRegister" : "gstPurchaseRegister";
        const path = kind === "sales" ? "/reports/sales-register" : "/reports/purchase-register";
        void runAction(key, `${kind} register loaded`, async () => {
            const payload = await apiRequestEnvelope<RegisterEnvelope>(path, {
                token,
                query: {
                    companyId: selectedCompanyId,
                    financialYearId: selectedFinancialYearId || undefined,
                    fromDate,
                    toDate,
                    page: 1,
                    limit: 100,
                },
            });
            if (kind === "sales") setSalesSummary(payload.summary);
            if (kind === "purchase") setPurchaseSummary(payload.summary);
        });
    }

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">Module</p>
                <h1>GST</h1>
                <p className="subtle">Use register summaries as frontend GST view until dedicated GST return APIs are added.</p>
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

            <section className="card">
                <h2>GST Register Filters</h2>
                <div className="inline-form">
                    <label>From</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    <label>To</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    <button disabled={actionState("gstSalesRegister") || !selectedCompanyId} onClick={() => loadRegister("sales")}>Load Sales GST</button>
                    <button disabled={actionState("gstPurchaseRegister") || !selectedCompanyId} onClick={() => loadRegister("purchase")}>Load Purchase GST</button>
                </div>
                <InlineAlert alert={alerts.gstSalesRegister} />
                <InlineAlert alert={alerts.gstPurchaseRegister} />
            </section>

            <section className="card two-col">
                <div className="card-lite">
                    <h3>Sales Register Summary</h3>
                    {salesSummary ? (
                        <>
                            <p className="subtle">Taxable: {salesSummary.totalTaxable ?? 0}</p>
                            <p className="subtle">Tax: {salesSummary.totalTax ?? 0}</p>
                            <p className="subtle">Gross: {salesSummary.grandTotal ?? 0}</p>
                        </>
                    ) : (
                        <EmptyState title="No sales GST summary" description="Load Sales GST to view totals." />
                    )}
                </div>
                <div className="card-lite">
                    <h3>Purchase Register Summary</h3>
                    {purchaseSummary ? (
                        <>
                            <p className="subtle">Taxable: {purchaseSummary.totalTaxable ?? 0}</p>
                            <p className="subtle">Tax: {purchaseSummary.totalTax ?? 0}</p>
                            <p className="subtle">Gross: {purchaseSummary.grandTotal ?? 0}</p>
                        </>
                    ) : (
                        <EmptyState title="No purchase GST summary" description="Load Purchase GST to view totals." />
                    )}
                </div>
            </section>
        </main>
    );
}
