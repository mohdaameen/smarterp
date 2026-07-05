"use client";

import Link from "next/link";
import { CompanyFySelector } from "../../../components/company-fy-selector";
import { useWorkspaceData } from "../../../lib/use-workspace-data";

export default function WorkspaceEntriesPage() {
    const {
        companies,
        selectedCompany,
        selectedCompanyId,
        setSelectedCompanyId,
        financialYears,
        selectedFinancialYearId,
        setSelectedFinancialYearId,
        ledgers,
        customers,
        suppliers,
        vouchers,
    } = useWorkspaceData();

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">Workspace Home</p>
                <h1>Entries Dashboard</h1>
                <p className="subtle">Use this page for quick context setup, then move into dedicated modules.</p>
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
                    <h2>Current Snapshot</h2>
                    <p className="subtle">Company: {selectedCompany?.name ?? "Not selected"}</p>
                    <p className="subtle">Ledgers: {ledgers.length}</p>
                    <p className="subtle">Customers: {customers.length}</p>
                    <p className="subtle">Suppliers: {suppliers.length}</p>
                    <p className="subtle">Recent vouchers: {vouchers.length}</p>
                </section>
            </section>

            <section className="card">
                <h2>Module Actions</h2>
                <div className="inline-form">
                    <Link href="/workspace/companies">Open Companies</Link>
                    <Link href="/workspace/masters">Open Masters</Link>
                    <Link href="/workspace/customers">Open Customers</Link>
                    <Link href="/workspace/suppliers">Open Suppliers</Link>
                    <Link href="/workspace/inventory">Open Inventory</Link>
                    <Link href="/workspace/billing">Open Billing</Link>
                    <Link href="/workspace/vouchers">Open Vouchers</Link>
                    <Link href="/workspace/banking">Open Banking</Link>
                    <Link href="/workspace/gst">Open GST</Link>
                    <Link href="/workspace/reports">Open Reports</Link>
                </div>
                <p className="subtle" style={{ marginTop: "0.75rem" }}>
                    Tip: Use this order for demos: Companies -&gt; Masters -&gt; Inventory -&gt; Billing -&gt; Vouchers -&gt; Reports.
                </p>
            </section>

            <section className="card">
                <h2>Shortcut Keys</h2>
                <ul className="entries">
                    <li><span>Alt + C</span><span>Open</span><span>Companies</span></li>
                    <li><span>Alt + M</span><span>Open</span><span>Masters</span></li>
                    <li><span>Alt + I</span><span>Open</span><span>Inventory</span></li>
                    <li><span>Alt + B</span><span>Open</span><span>Billing</span></li>
                    <li><span>Alt + V</span><span>Open</span><span>Vouchers</span></li>
                    <li><span>Alt + R</span><span>Open</span><span>Reports</span></li>
                    <li><span>Alt + S</span><span>Action</span><span>Submit active form</span></li>
                    <li><span>Esc</span><span>Action</span><span>Cancel edit</span></li>
                    <li><span>Alt + L</span><span>Action</span><span>Logout</span></li>
                </ul>
            </section>
        </main>
    );
}
