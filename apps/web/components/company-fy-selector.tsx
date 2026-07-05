"use client";

import { Company, FinancialYear } from "../lib/contracts";

type Props = {
    title?: string;
    companies: Company[];
    financialYears: FinancialYear[];
    selectedCompanyId: string;
    selectedFinancialYearId: string;
    onCompanyChange: (companyId: string) => void;
    onFinancialYearChange: (financialYearId: string) => void;
};

export function CompanyFySelector({
    title = "Context",
    companies,
    financialYears,
    selectedCompanyId,
    selectedFinancialYearId,
    onCompanyChange,
    onFinancialYearChange,
}: Props) {
    return (
        <section className="card">
            <h2>{title}</h2>
            <label>Active company</label>
            <select value={selectedCompanyId} onChange={(e) => onCompanyChange(e.target.value)}>
                <option value="">Select company</option>
                {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name} ({c.role})
                    </option>
                ))}
            </select>
            <label>Active financial year</label>
            <select value={selectedFinancialYearId} onChange={(e) => onFinancialYearChange(e.target.value)}>
                <option value="">Select year</option>
                {financialYears.map((fy) => (
                    <option key={fy.id} value={fy.id}>
                        {fy.label}
                        {fy.isCurrent ? " (Current)" : ""}
                    </option>
                ))}
            </select>
        </section>
    );
}
