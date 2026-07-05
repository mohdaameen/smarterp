"use client";

import { useState } from "react";
import { apiRequest } from "../../../lib/api-client";
import { useWorkspaceData } from "../../../lib/use-workspace-data";
import { CompanyFySelector } from "../../../components/company-fy-selector";
import { InlineAlert } from "../../../components/inline-alert";
import { EmptyState } from "../../../components/empty-state";

export default function WorkspaceSuppliersPage() {
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
        suppliers,
        refreshContext,
    } = useWorkspaceData();

    const [form, setForm] = useState({ name: "", mobile: "", email: "", ledgerGroupId: "" });
    const [editingId, setEditingId] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    function validateForm() {
        const next: Record<string, string> = {};
        if (!form.name.trim()) next.name = "Name is required";
        if (!editingId && !form.ledgerGroupId) next.ledgerGroupId = "Select a ledger group";
        if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
        setFieldErrors(next);
        return Object.keys(next).length === 0;
    }

    function resetForm() {
        setForm({ name: "", mobile: "", email: "", ledgerGroupId: "" });
        setEditingId("");
        setFieldErrors({});
    }

    const isSaving = actionState("createSupplierModule") || actionState("updateSupplierModule");
    let submitLabel = "Create Supplier";
    if (editingId) {
        submitLabel = actionState("updateSupplierModule") ? "Saving..." : "Save Supplier";
    } else if (actionState("createSupplierModule")) {
        submitLabel = "Creating...";
    }

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">Module</p>
                <h1>Suppliers</h1>
                <p className="subtle">Create suppliers from frontend using the shared master API contract.</p>
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
                        const actionKey = editingId ? "updateSupplierModule" : "createSupplierModule";
                        const successLabel = editingId ? "Supplier updated" : "Supplier created";
                        void runAction(actionKey, successLabel, async () => {
                            const path = editingId ? `/masters/suppliers/${editingId}` : "/masters/suppliers";
                            const payload = {
                                name: form.name,
                                mobile: form.mobile,
                                email: form.email,
                                ...(form.ledgerGroupId ? { ledgerGroupId: form.ledgerGroupId } : {}),
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
                    <h3>{editingId ? "Edit Supplier" : "Create Supplier"}</h3>
                    <input
                        placeholder="Supplier name"
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
                    <InlineAlert alert={alerts.createSupplierModule} />
                    <InlineAlert alert={alerts.updateSupplierModule} />
                    <div className="inline-form">
                        <button disabled={isSaving || !selectedCompanyId}>{submitLabel}</button>
                        {editingId ? <button type="button" className="ghost" onClick={resetForm}>Cancel Edit</button> : null}
                    </div>
                </form>

                <section>
                    <h3>Supplier List</h3>
                    {suppliers.length === 0 ? (
                        <EmptyState title="No suppliers" description="Create suppliers to use purchase and payment flows." />
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
                                    {suppliers.map((supplier) => (
                                        <tr key={supplier.id}>
                                            <td>{supplier.name}</td>
                                            <td>{supplier.ledgerId.slice(0, 8)}...</td>
                                            <td>
                                                <div className="inline-form">
                                                    <button
                                                        type="button"
                                                        className="ghost"
                                                        onClick={() => {
                                                            if (!token || !selectedCompanyId) return;
                                                            void runAction("loadSupplierModule", "Supplier loaded", async () => {
                                                                const data = await apiRequest<{ name: string; mobile?: string; email?: string; ledgerGroupId?: string }>(`/masters/suppliers/${supplier.id}`, {
                                                                    token,
                                                                    query: { companyId: selectedCompanyId },
                                                                });
                                                                setEditingId(supplier.id);
                                                                setForm({
                                                                    name: data.name || "",
                                                                    mobile: data.mobile || "",
                                                                    email: data.email || "",
                                                                    ledgerGroupId: data.ledgerGroupId || "",
                                                                });
                                                            });
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="danger"
                                                        disabled={actionState("deleteSupplierModule")}
                                                        onClick={() => {
                                                            if (!token || !selectedCompanyId) return;
                                                            void runAction("deleteSupplierModule", "Supplier deleted", async () => {
                                                                await apiRequest(`/masters/suppliers/${supplier.id}`, {
                                                                    method: "DELETE",
                                                                    token,
                                                                    query: { companyId: selectedCompanyId },
                                                                });
                                                                if (editingId === supplier.id) resetForm();
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
                    <InlineAlert alert={alerts.loadSupplierModule} />
                    <InlineAlert alert={alerts.deleteSupplierModule} />
                </section>
            </section>
        </main>
    );
}
