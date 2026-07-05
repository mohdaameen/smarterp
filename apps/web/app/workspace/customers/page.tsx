"use client";

import { useState } from "react";
import { apiRequest } from "../../../lib/api-client";
import { useWorkspaceData } from "../../../lib/use-workspace-data";
import { CompanyFySelector } from "../../../components/company-fy-selector";
import { InlineAlert } from "../../../components/inline-alert";
import { EmptyState } from "../../../components/empty-state";

export default function WorkspaceCustomersPage() {
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
        ledgerGroups,
        customers,
        refreshContext,
    } = useWorkspaceData();

    const [form, setForm] = useState({ name: "", mobile: "", email: "", ledgerGroupId: "", creditLimit: "0" });
    const [editingId, setEditingId] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    function validateForm() {
        const next: Record<string, string> = {};
        if (!form.name.trim()) next.name = "Name is required";
        if (!editingId && !form.ledgerGroupId) next.ledgerGroupId = "Select a ledger group";
        if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
        if (Number(form.creditLimit) < 0) next.creditLimit = "Credit limit cannot be negative";
        setFieldErrors(next);
        return Object.keys(next).length === 0;
    }

    function resetForm() {
        setForm({ name: "", mobile: "", email: "", ledgerGroupId: "", creditLimit: "0" });
        setEditingId("");
        setFieldErrors({});
    }

    const isSaving = actionState("createCustomerModule") || actionState("updateCustomerModule");
    let submitLabel = "Create Customer";
    if (editingId) {
        submitLabel = actionState("updateCustomerModule") ? "Saving..." : "Save Customer";
    } else if (actionState("createCustomerModule")) {
        submitLabel = "Creating...";
    }

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">Module</p>
                <h1>Customers</h1>
                <p className="subtle">Create and review customer master records using the API contract in one page.</p>
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
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!token || !selectedCompanyId) return;
                        if (!validateForm()) return;
                        const actionKey = editingId ? "updateCustomerModule" : "createCustomerModule";
                        const successLabel = editingId ? "Customer updated" : "Customer created";
                        void runAction(actionKey, successLabel, async () => {
                            const path = editingId ? `/masters/customers/${editingId}` : "/masters/customers";
                            const payload = {
                                name: form.name,
                                mobile: form.mobile,
                                email: form.email,
                                ...(form.ledgerGroupId ? { ledgerGroupId: form.ledgerGroupId } : {}),
                                creditLimit: Number(form.creditLimit || 0),
                            };
                            await apiRequest(path, {
                                method: editingId ? "PATCH" : "POST",
                                token,
                                query: { companyId: selectedCompanyId },
                                body: payload,
                            });
                            resetForm();
                            await refreshContext();
                        });
                    }}
                >
                    <h3>{editingId ? "Edit Customer" : "Create Customer"}</h3>
                    <input
                        placeholder="Customer name"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        required
                    />
                    {fieldErrors.name ? <p className="field-error">{fieldErrors.name}</p> : null}
                    <input
                        placeholder="Mobile"
                        value={form.mobile}
                        onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                    />
                    <input
                        placeholder="Email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    />
                    {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}
                    <input
                        placeholder="Credit limit"
                        type="number"
                        value={form.creditLimit}
                        onChange={(e) => setForm((p) => ({ ...p, creditLimit: e.target.value }))}
                    />
                    {fieldErrors.creditLimit ? <p className="field-error">{fieldErrors.creditLimit}</p> : null}
                    <select
                        value={form.ledgerGroupId}
                        onChange={(e) => setForm((p) => ({ ...p, ledgerGroupId: e.target.value }))}
                        required
                    >
                        <option value="">Ledger group</option>
                        {ledgerGroups.map((group) => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                    </select>
                    {fieldErrors.ledgerGroupId ? <p className="field-error">{fieldErrors.ledgerGroupId}</p> : null}
                    <InlineAlert alert={alerts.createCustomerModule} />
                    <InlineAlert alert={alerts.updateCustomerModule} />
                    <div className="inline-form">
                        <button disabled={isSaving || !selectedCompanyId}>{submitLabel}</button>
                        {editingId ? <button type="button" className="ghost" onClick={resetForm}>Cancel Edit</button> : null}
                    </div>
                </form>

                <section>
                    <h3>Customer List</h3>
                    {customers.length === 0 ? (
                        <EmptyState title="No customers" description="Create your first customer to use receipt and sales flows." />
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Ledger</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map((customer) => (
                                        <tr key={customer.id}>
                                            <td>{customer.name}</td>
                                            <td>{customer.ledgerId.slice(0, 8)}...</td>
                                            <td>
                                                <div className="inline-form">
                                                    <button
                                                        type="button"
                                                        className="ghost"
                                                        onClick={() => {
                                                            if (!token || !selectedCompanyId) return;
                                                            void runAction("loadCustomerModule", "Customer loaded", async () => {
                                                                const data = await apiRequest<{ name: string; mobile?: string; email?: string; ledgerGroupId?: string; creditLimit?: number }>(`/masters/customers/${customer.id}`, {
                                                                    token,
                                                                    query: { companyId: selectedCompanyId },
                                                                });
                                                                setEditingId(customer.id);
                                                                setForm({
                                                                    name: data.name || "",
                                                                    mobile: data.mobile || "",
                                                                    email: data.email || "",
                                                                    ledgerGroupId: data.ledgerGroupId || "",
                                                                    creditLimit: String(data.creditLimit ?? 0),
                                                                });
                                                            });
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="danger"
                                                        disabled={actionState("deleteCustomerModule")}
                                                        onClick={() => {
                                                            if (!token || !selectedCompanyId) return;
                                                            void runAction("deleteCustomerModule", "Customer deleted", async () => {
                                                                await apiRequest(`/masters/customers/${customer.id}`, {
                                                                    method: "DELETE",
                                                                    token,
                                                                    query: { companyId: selectedCompanyId },
                                                                });
                                                                if (editingId === customer.id) resetForm();
                                                                await refreshContext();
                                                            });
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <InlineAlert alert={alerts.loadCustomerModule} />
                    <InlineAlert alert={alerts.deleteCustomerModule} />
                </section>
            </section>
        </main>
    );
}
