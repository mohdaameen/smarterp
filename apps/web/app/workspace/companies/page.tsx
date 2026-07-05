"use client";

import { FormEvent } from "react";
import { apiRequest } from "../../../lib/api-client";
import { useWorkspaceData } from "../../../lib/use-workspace-data";
import { CompanyFySelector } from "../../../components/company-fy-selector";
import { InlineAlert } from "../../../components/inline-alert";
import { KpiGrid } from "../../../components/kpi-grid";
import { EmptyState } from "../../../components/empty-state";

export default function WorkspaceCompaniesPage() {
    const {
        token,
        contextLoading,
        alerts,
        runAction,
        actionState,
        companies,
        selectedCompany,
        selectedCompanyId,
        setSelectedCompanyId,
        createCompanyForm,
        setCreateCompanyForm,
        financialYears,
        selectedFinancialYearId,
        setSelectedFinancialYearId,
        fyForm,
        setFyForm,
        loadCompanies,
        refreshContext,
    } = useWorkspaceData();

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">Module</p>
                <h1>Companies</h1>
                <p className="subtle">Create company, configure financial years, and choose active context.</p>
            </div>

            <section className="two-col">
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
                    <h2>Summary</h2>
                    <KpiGrid
                        items={[
                            { label: "Companies", value: companies.length },
                            { label: "Financial Years", value: financialYears.length },
                            { label: "Active", value: selectedCompany?.name ?? "None" },
                        ]}
                    />
                    {contextLoading ? <p className="subtle">Refreshing context...</p> : null}
                </section>
            </section>

            {!companies.length && !contextLoading ? (
                <EmptyState
                    title="No companies yet"
                    description="Create your first company to unlock module actions and posting flows."
                />
            ) : null}

            <section className="card two-col">
                <form
                    onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (!token) return;
                        void runAction("createCompany", "Company created", async () => {
                            await apiRequest("/companies", { method: "POST", token, body: createCompanyForm });
                            setCreateCompanyForm({ name: "", gstNumber: "" });
                            await loadCompanies(token);
                        });
                    }}
                >
                    <h3>Create Company</h3>
                    <input
                        placeholder="Company name"
                        value={createCompanyForm.name}
                        onChange={(e) => setCreateCompanyForm((p) => ({ ...p, name: e.target.value }))}
                        required
                    />
                    <input
                        placeholder="GST Number (optional)"
                        value={createCompanyForm.gstNumber}
                        onChange={(e) => setCreateCompanyForm((p) => ({ ...p, gstNumber: e.target.value }))}
                    />
                    <InlineAlert alert={alerts.createCompany} />
                    <button disabled={actionState("createCompany")}>{actionState("createCompany") ? "Creating..." : "Create Company"}</button>
                </form>

                <form
                    onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (!token || !selectedCompanyId) return;
                        void runAction("createFY", "Financial year created", async () => {
                            await apiRequest(`/companies/${selectedCompanyId}/financial-years`, { method: "POST", token, body: fyForm });
                            await refreshContext();
                        });
                    }}
                >
                    <h3>Create Financial Year</h3>
                    <input value={fyForm.label} onChange={(e) => setFyForm((p) => ({ ...p, label: e.target.value }))} required />
                    <input type="date" value={fyForm.startDate} onChange={(e) => setFyForm((p) => ({ ...p, startDate: e.target.value }))} required />
                    <input type="date" value={fyForm.endDate} onChange={(e) => setFyForm((p) => ({ ...p, endDate: e.target.value }))} required />
                    <label className="checkbox">
                        <input type="checkbox" checked={fyForm.isCurrent} onChange={(e) => setFyForm((p) => ({ ...p, isCurrent: e.target.checked }))} />
                        Current
                    </label>
                    <InlineAlert alert={alerts.createFY} />
                    <button disabled={actionState("createFY") || !selectedCompanyId}>{actionState("createFY") ? "Creating..." : "Create Financial Year"}</button>
                </form>
            </section>
        </main>
    );
}
