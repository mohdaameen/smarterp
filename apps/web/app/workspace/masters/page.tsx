"use client";

import { FormEvent } from "react";
import { apiRequest } from "../../../lib/api-client";
import { Ledger } from "../../../lib/contracts";
import { useWorkspaceData } from "../../../lib/use-workspace-data";
import { CompanyFySelector } from "../../../components/company-fy-selector";
import { InlineAlert } from "../../../components/inline-alert";
import { EmptyState } from "../../../components/empty-state";

export default function WorkspaceMastersPage() {
    const {
        token,
        alerts,
        runAction,
        actionState,
        companies,
        financialYears,
        customers,
        suppliers,
        contextLoading,
        selectedCompanyId,
        selectedFinancialYearId,
        setSelectedCompanyId,
        setSelectedFinancialYearId,
        ledgerGroups,
        groupForm,
        setGroupForm,
        ledgerForm,
        setLedgerForm,
        customerForm,
        setCustomerForm,
        supplierForm,
        setSupplierForm,
        refreshContext,
    } = useWorkspaceData();

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">Module</p>
                <h1>Masters</h1>
                <p className="subtle">Manage ledger groups, ledgers, customers, and suppliers from one focused page.</p>
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

            {!ledgerGroups.length && !contextLoading ? (
                <EmptyState
                    title="No master groups yet"
                    description="Create a ledger group first, then proceed with ledgers, customers, and suppliers."
                />
            ) : null}

            <section className="card two-col">
                <div className="stack-block">
                    <form
                        onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            if (!token || !selectedCompanyId) return;
                            void runAction("createGroup", "Ledger group created", async () => {
                                await apiRequest("/masters/ledger-groups", {
                                    method: "POST",
                                    token,
                                    query: { companyId: selectedCompanyId },
                                    body: {
                                        name: groupForm.name,
                                        nature: groupForm.nature,
                                        ...(groupForm.parentGroupId ? { parentGroupId: groupForm.parentGroupId } : {}),
                                    },
                                });
                                setGroupForm({ name: "", nature: "ASSET", parentGroupId: "" });
                                await refreshContext();
                            });
                        }}
                    >
                        <h3>Create Ledger Group</h3>
                        <input placeholder="Name" value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))} required />
                        <select value={groupForm.nature} onChange={(e) => setGroupForm((p) => ({ ...p, nature: e.target.value }))}>
                            <option>ASSET</option>
                            <option>LIABILITY</option>
                            <option>INCOME</option>
                            <option>EXPENSE</option>
                        </select>
                        <select value={groupForm.parentGroupId} onChange={(e) => setGroupForm((p) => ({ ...p, parentGroupId: e.target.value }))}>
                            <option value="">No parent</option>
                            {ledgerGroups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <InlineAlert alert={alerts.createGroup} />
                        <button disabled={actionState("createGroup") || !selectedCompanyId}>{actionState("createGroup") ? "Creating..." : "Create Group"}</button>
                    </form>

                    <form
                        onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            if (!token || !selectedCompanyId) return;
                            void runAction("createLedger", "Ledger created", async () => {
                                await apiRequest("/masters/ledgers", { method: "POST", token, query: { companyId: selectedCompanyId }, body: ledgerForm });
                                setLedgerForm((p) => ({ ...p, name: "" }));
                                await refreshContext();
                            });
                        }}
                    >
                        <h3>Create Ledger</h3>
                        <select value={ledgerForm.ledgerGroupId} onChange={(e) => setLedgerForm((p) => ({ ...p, ledgerGroupId: e.target.value }))} required>
                            <option value="">Ledger group</option>
                            {ledgerGroups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <input placeholder="Ledger name" value={ledgerForm.name} onChange={(e) => setLedgerForm((p) => ({ ...p, name: e.target.value }))} required />
                        <select value={ledgerForm.ledgerType} onChange={(e) => setLedgerForm((p) => ({ ...p, ledgerType: e.target.value as Ledger["ledgerType"] }))}>
                            <option>BANK</option>
                            <option>CASH</option>
                            <option>INCOME</option>
                            <option>EXPENSE</option>
                        </select>
                        <InlineAlert alert={alerts.createLedger} />
                        <button disabled={actionState("createLedger") || !selectedCompanyId}>{actionState("createLedger") ? "Creating..." : "Create Ledger"}</button>
                    </form>
                </div>

                <div className="stack-block">
                    <form
                        onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            if (!token || !selectedCompanyId) return;
                            void runAction("createCustomer", "Customer created", async () => {
                                await apiRequest("/masters/customers", {
                                    method: "POST",
                                    token,
                                    query: { companyId: selectedCompanyId },
                                    body: { ...customerForm, creditLimit: Number(customerForm.creditLimit) },
                                });
                                setCustomerForm((p) => ({ ...p, name: "", mobile: "", email: "" }));
                                await refreshContext();
                            });
                        }}
                    >
                        <h3>Create Customer</h3>
                        <input placeholder="Customer name" value={customerForm.name} onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))} required />
                        <input placeholder="Mobile" value={customerForm.mobile} onChange={(e) => setCustomerForm((p) => ({ ...p, mobile: e.target.value }))} />
                        <input placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} />
                        <select value={customerForm.ledgerGroupId} onChange={(e) => setCustomerForm((p) => ({ ...p, ledgerGroupId: e.target.value }))} required>
                            <option value="">Ledger group</option>
                            {ledgerGroups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <InlineAlert alert={alerts.createCustomer} />
                        <button disabled={actionState("createCustomer") || !selectedCompanyId}>{actionState("createCustomer") ? "Creating..." : "Create Customer"}</button>
                    </form>

                    <form
                        onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            if (!token || !selectedCompanyId) return;
                            void runAction("createSupplier", "Supplier created", async () => {
                                await apiRequest("/masters/suppliers", {
                                    method: "POST",
                                    token,
                                    query: { companyId: selectedCompanyId },
                                    body: supplierForm,
                                });
                                setSupplierForm((p) => ({ ...p, name: "", mobile: "", email: "" }));
                                await refreshContext();
                            });
                        }}
                    >
                        <h3>Create Supplier</h3>
                        <input placeholder="Supplier name" value={supplierForm.name} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} required />
                        <input placeholder="Mobile" value={supplierForm.mobile} onChange={(e) => setSupplierForm((p) => ({ ...p, mobile: e.target.value }))} />
                        <input placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))} />
                        <select value={supplierForm.ledgerGroupId} onChange={(e) => setSupplierForm((p) => ({ ...p, ledgerGroupId: e.target.value }))} required>
                            <option value="">Ledger group</option>
                            {ledgerGroups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <InlineAlert alert={alerts.createSupplier} />
                        <button disabled={actionState("createSupplier") || !selectedCompanyId}>{actionState("createSupplier") ? "Creating..." : "Create Supplier"}</button>
                    </form>
                </div>
            </section>

            <section className="card">
                <h2>Current Master Snapshot</h2>
                <p className="subtle">Ledger groups: {ledgerGroups.length}</p>
                <p className="subtle">Customers: {customers.length}</p>
                <p className="subtle">Suppliers: {suppliers.length}</p>
            </section>
        </main>
    );
}
