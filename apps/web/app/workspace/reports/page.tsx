"use client";

import { useMemo, useState } from "react";
import { apiRequestEnvelope } from "../../../lib/api-client";
import { useWorkspaceData } from "../../../lib/use-workspace-data";
import { CompanyFySelector } from "../../../components/company-fy-selector";
import { InlineAlert } from "../../../components/inline-alert";
import { EmptyState } from "../../../components/empty-state";
import { ReportResultView } from "../../../components/report-result-view";

type ExportableReport = "stock-summary" | "sales-register" | "purchase-register";

function stringifyCsvValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return JSON.stringify(value);
}

function toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return "";
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const header = columns.join(",");
    const body = rows.map((row) => columns
        .map((column) => {
            const value = stringifyCsvValue(row[column]).replaceAll('"', '""');
            return `"${value}"`;
        })
        .join(","));
    return [header, ...body].join("\n");
}

export default function WorkspaceReportsPage() {
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
        contextLoading,
    } = useWorkspaceData();

    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const [fromDate, setFromDate] = useState("2026-04-01");
    const [toDate, setToDate] = useState(today);
    const [result, setResult] = useState<unknown>(null);
    const [activeReport, setActiveReport] = useState<string>("");

    function runReport(key: string, path: string) {
        if (!token || !selectedCompanyId) return;
        void runAction(key, `${key} loaded`, async () => {
            const data = await apiRequestEnvelope(path, {
                token,
                query: {
                    companyId: selectedCompanyId,
                    financialYearId: selectedFinancialYearId || undefined,
                    fromDate,
                    toDate,
                },
            });
            setResult(data);
            setActiveReport(path.replace("/reports/", ""));
        });
    }

    function canExport() {
        if (!["stock-summary", "sales-register", "purchase-register"].includes(activeReport)) return false;
        const payload = result as { data?: unknown } | null;
        return Array.isArray(payload?.data) && payload.data.length > 0;
    }

    function exportCsv() {
        if (!canExport()) return;
        const payload = result as { data?: unknown[] };
        const rows = (payload.data ?? []).filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null && !Array.isArray(row));
        if (rows.length === 0) return;

        const csv = toCsv(rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = globalThis.URL.createObjectURL(blob);
        const link = globalThis.document.createElement("a");
        link.href = url;
        link.download = `${activeReport}-${fromDate}-to-${toDate}.csv`;
        globalThis.document.body.appendChild(link);
        link.click();
        link.remove();
        globalThis.URL.revokeObjectURL(url);
    }

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">Module</p>
                <h1>Reports</h1>
                <p className="subtle">Run operational and financial report endpoints with selected filters.</p>
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
                <h2>Filters</h2>
                <div className="inline-form">
                    <label htmlFor="fromDate">From</label>
                    <input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    <label htmlFor="toDate">To</label>
                    <input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <div className="inline-form" style={{ marginTop: "0.75rem" }}>
                    <button disabled={actionState("stockSummary") || !selectedCompanyId} onClick={() => runReport("stockSummary", "/reports/stock-summary")}>Stock Summary</button>
                    <button disabled={actionState("salesRegister") || !selectedCompanyId} onClick={() => runReport("salesRegister", "/reports/sales-register")}>Sales Register</button>
                    <button disabled={actionState("purchaseRegister") || !selectedCompanyId} onClick={() => runReport("purchaseRegister", "/reports/purchase-register")}>Purchase Register</button>
                    <button disabled={actionState("trialBalance") || !selectedCompanyId} onClick={() => runReport("trialBalance", "/reports/trial-balance")}>Trial Balance</button>
                    <button disabled={actionState("balanceSheet") || !selectedCompanyId} onClick={() => runReport("balanceSheet", "/reports/balance-sheet")}>Balance Sheet</button>
                    <button disabled={actionState("profitLoss") || !selectedCompanyId} onClick={() => runReport("profitLoss", "/reports/profit-loss")}>Profit & Loss</button>
                    <button disabled={actionState("cashFlow") || !selectedCompanyId} onClick={() => runReport("cashFlow", "/reports/cash-flow")}>Cash Flow</button>
                    <button type="button" className="ghost" disabled={!canExport()} onClick={exportCsv}>Export CSV</button>
                </div>
                {contextLoading ? <p className="subtle">Refreshing company context...</p> : null}
                {Object.entries(alerts)
                    .filter(([key]) => ["stockSummary", "salesRegister", "purchaseRegister", "trialBalance", "balanceSheet", "profitLoss", "cashFlow"].includes(key))
                    .map(([key, value]) => value ? <InlineAlert key={key} alert={value} /> : null)}
            </section>

            <section className="card">
                <h2>Response Preview</h2>
                {result ? (
                    <ReportResultView result={result} />
                ) : (
                    <EmptyState
                        title="No report loaded"
                        description="Pick a report action above to preview payload and verify filters."
                    />
                )}
            </section>
        </main>
    );
}
