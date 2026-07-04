"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest, apiRequestEnvelope } from "../../lib/api-client";
import { Company, Customer, FinancialYear, Ledger, LedgerGroup, PaymentMode, Supplier, VoucherDetail, VoucherListItem } from "../../lib/contracts";
import { clearSession, readSession } from "../../lib/session";

type Alert = { type: "ok" | "error"; message: string };

type EnvelopeList<T> = {
    ok: boolean;
    data: T[];
    meta: { total: number; page: number; limit: number; totalPages: number };
};

export default function WorkspacePage() {
    const router = useRouter();
    const [token, setToken] = useState("");
    const [userName, setUserName] = useState("");
    const [busyKey, setBusyKey] = useState("");
    const [alerts, setAlerts] = useState<Record<string, Alert | undefined>>({});

    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [createCompanyForm, setCreateCompanyForm] = useState({ name: "", gstNumber: "" });

    const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
    const [selectedFinancialYearId, setSelectedFinancialYearId] = useState("");
    const [fyForm, setFyForm] = useState({ label: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", isCurrent: true });

    const [ledgerGroups, setLedgerGroups] = useState<LedgerGroup[]>([]);
    const [ledgers, setLedgers] = useState<Ledger[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const [groupForm, setGroupForm] = useState({ name: "", nature: "ASSET", parentGroupId: "" });
    const [ledgerForm, setLedgerForm] = useState({ ledgerGroupId: "", name: "", ledgerType: "BANK" as Ledger["ledgerType"] });
    const [customerForm, setCustomerForm] = useState({ name: "", mobile: "", email: "", ledgerGroupId: "", creditLimit: "0" });
    const [supplierForm, setSupplierForm] = useState({ name: "", mobile: "", email: "", ledgerGroupId: "" });

    const [receiptForm, setReceiptForm] = useState({ customerId: "", bankCashLedgerId: "", amount: "10000", voucherDate: "2026-07-04", paymentMode: "BANK_TRANSFER" as PaymentMode, narration: "Advance received" });
    const [paymentForm, setPaymentForm] = useState({ supplierId: "", bankCashLedgerId: "", amount: "5000", voucherDate: "2026-07-04", paymentMode: "CHEQUE" as PaymentMode, chequeNumber: "", narration: "Supplier payment" });

    const [vouchers, setVouchers] = useState<VoucherListItem[]>([]);
    const [voucherDetail, setVoucherDetail] = useState<VoucherDetail | null>(null);

    const selectedCompany = useMemo(() => companies.find((c) => c.id === selectedCompanyId) ?? null, [companies, selectedCompanyId]);

    function showAlert(key: string, type: "ok" | "error", message: string) {
        setAlerts((prev) => ({ ...prev, [key]: { type, message } }));
    }

    async function runAction(key: string, successLabel: string, action: () => Promise<void>) {
        setBusyKey(key);
        showAlert(key, "ok", "Working...");
        try {
            await action();
            showAlert(key, "ok", successLabel);
        } catch (err) {
            const message =
                err instanceof ApiError
                    ? err.details?.[0]?.message ?? err.message
                    : "Unexpected error";
            showAlert(key, "error", message);
        } finally {
            setBusyKey("");
        }
    }

    async function loadCompanies(authToken: string) {
        const rows = await apiRequest<Company[]>("/companies", { token: authToken });
        setCompanies(rows);
        setSelectedCompanyId((prev) => prev || rows[0]?.id || "");
    }

    async function loadContext(companyId: string, authToken: string) {
        const [fyRows, groupRows, ledgerRows, customerRows, supplierRows, voucherRows] = await Promise.all([
            apiRequest<FinancialYear[]>(`/companies/${companyId}/financial-years`, { token: authToken }),
            apiRequestEnvelope<EnvelopeList<LedgerGroup>>("/masters/ledger-groups", { token: authToken, query: { companyId, page: 1, limit: 100 } }),
            apiRequestEnvelope<EnvelopeList<Ledger>>("/masters/ledgers", { token: authToken, query: { companyId, page: 1, limit: 100 } }),
            apiRequestEnvelope<EnvelopeList<Customer>>("/masters/customers", { token: authToken, query: { companyId, page: 1, limit: 100 } }),
            apiRequestEnvelope<EnvelopeList<Supplier>>("/masters/suppliers", { token: authToken, query: { companyId, page: 1, limit: 100 } }),
            apiRequestEnvelope<EnvelopeList<VoucherListItem>>("/vouchers", { token: authToken, query: { companyId, page: 1, limit: 50 } })
        ]);

        setFinancialYears(fyRows);
        const currentFy = fyRows.find((row) => row.isCurrent);
        setSelectedFinancialYearId((prev) => prev || currentFy?.id || fyRows[0]?.id || "");

        setLedgerGroups(groupRows.data);
        setLedgers(ledgerRows.data);
        setCustomers(customerRows.data);
        setSuppliers(supplierRows.data);
        setVouchers(voucherRows.data);

        if (groupRows.data.length > 0) {
            const groupId = groupRows.data[0].id;
            setLedgerForm((prev) => ({ ...prev, ledgerGroupId: prev.ledgerGroupId || groupId }));
            setCustomerForm((prev) => ({ ...prev, ledgerGroupId: prev.ledgerGroupId || groupId }));
            setSupplierForm((prev) => ({ ...prev, ledgerGroupId: prev.ledgerGroupId || groupId }));
        }
    }

    useEffect(() => {
        const session = readSession();
        if (!session) {
            router.replace("/login");
            return;
        }
        setToken(session.accessToken);
        setUserName(session.userName);
        void loadCompanies(session.accessToken);
    }, [router]);

    useEffect(() => {
        if (!token || !selectedCompanyId) return;
        void loadContext(selectedCompanyId, token);
    }, [token, selectedCompanyId]);

    function hasWorkspace() {
        return Boolean(token && selectedCompanyId && selectedFinancialYearId);
    }

    function actionState(key: string) {
        return busyKey === key;
    }

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">SmartERP Workspace</p>
                <h1>Step-by-step backend testing UI</h1>
                <p>Welcome {userName}. Follow steps in order so each section has all required data.</p>
                <div className="row">
                    <Link href="/login">Switch Account</Link>
                    <button className="danger" onClick={() => { clearSession(); router.replace("/login"); }}>Logout</button>
                </div>
            </div>

            <section className="card two-col">
                <div>
                    <h2>Step 1: Company & Financial Year</h2>
                    <label>Active company</label>
                    <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}>
                        <option value="">Select company</option>
                        {companies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
                    </select>
                    <label>Active financial year</label>
                    <select value={selectedFinancialYearId} onChange={(e) => setSelectedFinancialYearId(e.target.value)}>
                        <option value="">Select year</option>
                        {financialYears.map((fy) => <option key={fy.id} value={fy.id}>{fy.label}{fy.isCurrent ? " (Current)" : ""}</option>)}
                    </select>
                    {selectedCompany ? <p className="subtle">Current company: {selectedCompany.name}</p> : null}
                </div>

                <div className="stack-block">
                    <form onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (!token) return;
                        void runAction("createCompany", "Company created", async () => {
                            await apiRequest("/companies", { method: "POST", token, body: createCompanyForm });
                            setCreateCompanyForm({ name: "", gstNumber: "" });
                            await loadCompanies(token);
                        });
                    }}>
                        <h3>Create Company</h3>
                        <input placeholder="Company name" value={createCompanyForm.name} onChange={(e) => setCreateCompanyForm((p) => ({ ...p, name: e.target.value }))} required />
                        <input placeholder="GST Number (optional)" value={createCompanyForm.gstNumber} onChange={(e) => setCreateCompanyForm((p) => ({ ...p, gstNumber: e.target.value }))} />
                        {alerts.createCompany ? <p className={alerts.createCompany.type === "ok" ? "inline-ok" : "inline-error"}>{alerts.createCompany.message}</p> : null}
                        <button disabled={actionState("createCompany")}>{actionState("createCompany") ? "Creating..." : "Create Company"}</button>
                    </form>

                    <form onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (!token || !selectedCompanyId) return;
                        void runAction("createFY", "Financial year created", async () => {
                            await apiRequest(`/companies/${selectedCompanyId}/financial-years`, { method: "POST", token, body: fyForm });
                            const rows = await apiRequest<FinancialYear[]>(`/companies/${selectedCompanyId}/financial-years`, { token });
                            setFinancialYears(rows);
                        });
                    }}>
                        <h3>Create Financial Year</h3>
                        <input value={fyForm.label} onChange={(e) => setFyForm((p) => ({ ...p, label: e.target.value }))} required />
                        <input type="date" value={fyForm.startDate} onChange={(e) => setFyForm((p) => ({ ...p, startDate: e.target.value }))} required />
                        <input type="date" value={fyForm.endDate} onChange={(e) => setFyForm((p) => ({ ...p, endDate: e.target.value }))} required />
                        <label className="checkbox"><input type="checkbox" checked={fyForm.isCurrent} onChange={(e) => setFyForm((p) => ({ ...p, isCurrent: e.target.checked }))} />Current</label>
                        {alerts.createFY ? <p className={alerts.createFY.type === "ok" ? "inline-ok" : "inline-error"}>{alerts.createFY.message}</p> : null}
                        <button disabled={actionState("createFY") || !selectedCompanyId}>{actionState("createFY") ? "Creating..." : "Create Financial Year"}</button>
                    </form>
                </div>
            </section>

            <section className="card two-col">
                <div className="stack-block">
                    <h2>Step 2: Masters</h2>

                    <form onSubmit={(e: FormEvent) => {
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
                                    ...(groupForm.parentGroupId ? { parentGroupId: groupForm.parentGroupId } : {})
                                }
                            });
                            setGroupForm({ name: "", nature: "ASSET", parentGroupId: "" });
                            await loadContext(selectedCompanyId, token);
                        });
                    }}>
                        <h3>Create Ledger Group</h3>
                        <input placeholder="Name" value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))} required />
                        <select value={groupForm.nature} onChange={(e) => setGroupForm((p) => ({ ...p, nature: e.target.value }))}>
                            <option>ASSET</option><option>LIABILITY</option><option>INCOME</option><option>EXPENSE</option>
                        </select>
                        <select value={groupForm.parentGroupId} onChange={(e) => setGroupForm((p) => ({ ...p, parentGroupId: e.target.value }))}>
                            <option value="">No parent</option>
                            {ledgerGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        {alerts.createGroup ? <p className={alerts.createGroup.type === "ok" ? "inline-ok" : "inline-error"}>{alerts.createGroup.message}</p> : null}
                        <button disabled={actionState("createGroup") || !selectedCompanyId}>{actionState("createGroup") ? "Creating..." : "Create Group"}</button>
                    </form>

                    <form onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (!token || !selectedCompanyId) return;
                        void runAction("createLedger", "Ledger created", async () => {
                            await apiRequest("/masters/ledgers", { method: "POST", token, query: { companyId: selectedCompanyId }, body: ledgerForm });
                            setLedgerForm((p) => ({ ...p, name: "" }));
                            await loadContext(selectedCompanyId, token);
                        });
                    }}>
                        <h3>Create Ledger (Bank/Cash)</h3>
                        <select value={ledgerForm.ledgerGroupId} onChange={(e) => setLedgerForm((p) => ({ ...p, ledgerGroupId: e.target.value }))} required>
                            <option value="">Ledger group</option>
                            {ledgerGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <input placeholder="Ledger name" value={ledgerForm.name} onChange={(e) => setLedgerForm((p) => ({ ...p, name: e.target.value }))} required />
                        <select value={ledgerForm.ledgerType} onChange={(e) => setLedgerForm((p) => ({ ...p, ledgerType: e.target.value as Ledger["ledgerType"] }))}>
                            <option>BANK</option><option>CASH</option><option>INCOME</option><option>EXPENSE</option>
                        </select>
                        {alerts.createLedger ? <p className={alerts.createLedger.type === "ok" ? "inline-ok" : "inline-error"}>{alerts.createLedger.message}</p> : null}
                        <button disabled={actionState("createLedger") || !selectedCompanyId}>{actionState("createLedger") ? "Creating..." : "Create Ledger"}</button>
                    </form>
                </div>

                <div className="stack-block">
                    <form onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (!token || !selectedCompanyId) return;
                        void runAction("createCustomer", "Customer created", async () => {
                            await apiRequest("/masters/customers", {
                                method: "POST",
                                token,
                                query: { companyId: selectedCompanyId },
                                body: { ...customerForm, creditLimit: Number(customerForm.creditLimit) }
                            });
                            setCustomerForm((p) => ({ ...p, name: "", mobile: "", email: "" }));
                            await loadContext(selectedCompanyId, token);
                        });
                    }}>
                        <h3>Create Customer</h3>
                        <input placeholder="Customer name" value={customerForm.name} onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))} required />
                        <input placeholder="Mobile" value={customerForm.mobile} onChange={(e) => setCustomerForm((p) => ({ ...p, mobile: e.target.value }))} />
                        <input placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} />
                        <select value={customerForm.ledgerGroupId} onChange={(e) => setCustomerForm((p) => ({ ...p, ledgerGroupId: e.target.value }))} required>
                            <option value="">Ledger group</option>
                            {ledgerGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        {alerts.createCustomer ? <p className={alerts.createCustomer.type === "ok" ? "inline-ok" : "inline-error"}>{alerts.createCustomer.message}</p> : null}
                        <button disabled={actionState("createCustomer") || !selectedCompanyId}>{actionState("createCustomer") ? "Creating..." : "Create Customer"}</button>
                    </form>

                    <form onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        if (!token || !selectedCompanyId) return;
                        void runAction("createSupplier", "Supplier created", async () => {
                            await apiRequest("/masters/suppliers", {
                                method: "POST",
                                token,
                                query: { companyId: selectedCompanyId },
                                body: supplierForm
                            });
                            setSupplierForm((p) => ({ ...p, name: "", mobile: "", email: "" }));
                            await loadContext(selectedCompanyId, token);
                        });
                    }}>
                        <h3>Create Supplier</h3>
                        <input placeholder="Supplier name" value={supplierForm.name} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} required />
                        <input placeholder="Mobile" value={supplierForm.mobile} onChange={(e) => setSupplierForm((p) => ({ ...p, mobile: e.target.value }))} />
                        <input placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))} />
                        <select value={supplierForm.ledgerGroupId} onChange={(e) => setSupplierForm((p) => ({ ...p, ledgerGroupId: e.target.value }))} required>
                            <option value="">Ledger group</option>
                            {ledgerGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        {alerts.createSupplier ? <p className={alerts.createSupplier.type === "ok" ? "inline-ok" : "inline-error"}>{alerts.createSupplier.message}</p> : null}
                        <button disabled={actionState("createSupplier") || !selectedCompanyId}>{actionState("createSupplier") ? "Creating..." : "Create Supplier"}</button>
                    </form>
                </div>
            </section>

            <section className="card two-col">
                <div className="stack-block">
                    <h2>Step 3: Vouchers</h2>
                    <form onSubmit={(e: FormEvent) => {
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
                                    narration: receiptForm.narration
                                }
                            });
                            await loadContext(selectedCompanyId, token);
                        });
                    }}>
                        <h3>Post Receipt</h3>
                        <select value={receiptForm.customerId} onChange={(e) => setReceiptForm((p) => ({ ...p, customerId: e.target.value }))} required>
                            <option value="">Customer</option>
                            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={receiptForm.bankCashLedgerId} onChange={(e) => setReceiptForm((p) => ({ ...p, bankCashLedgerId: e.target.value }))} required>
                            <option value="">Bank/Cash Ledger</option>
                            {ledgers.filter((l) => l.ledgerType === "BANK" || l.ledgerType === "CASH").map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <input type="number" value={receiptForm.amount} onChange={(e) => setReceiptForm((p) => ({ ...p, amount: e.target.value }))} required />
                        {alerts.postReceipt ? <p className={alerts.postReceipt.type === "ok" ? "inline-ok" : "inline-error"}>{alerts.postReceipt.message}</p> : null}
                        <button disabled={actionState("postReceipt") || !hasWorkspace()}>{actionState("postReceipt") ? "Posting..." : "Post Receipt"}</button>
                    </form>

                    <form onSubmit={(e: FormEvent) => {
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
                                    narration: paymentForm.narration
                                }
                            });
                            await loadContext(selectedCompanyId, token);
                        });
                    }}>
                        <h3>Post Payment</h3>
                        <select value={paymentForm.supplierId} onChange={(e) => setPaymentForm((p) => ({ ...p, supplierId: e.target.value }))} required>
                            <option value="">Supplier</option>
                            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select value={paymentForm.bankCashLedgerId} onChange={(e) => setPaymentForm((p) => ({ ...p, bankCashLedgerId: e.target.value }))} required>
                            <option value="">Bank/Cash Ledger</option>
                            {ledgers.filter((l) => l.ledgerType === "BANK" || l.ledgerType === "CASH").map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} required />
                        {alerts.postPayment ? <p className={alerts.postPayment.type === "ok" ? "inline-ok" : "inline-error"}>{alerts.postPayment.message}</p> : null}
                        <button disabled={actionState("postPayment") || !hasWorkspace()}>{actionState("postPayment") ? "Posting..." : "Post Payment"}</button>
                    </form>
                </div>

                <div>
                    <h3>Voucher List (click row for detail)</h3>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr><th>No.</th><th>Type</th><th>Amount</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {vouchers.map((v) => (
                                    <tr key={v.id} onClick={() => {
                                        if (!token || !selectedCompanyId) return;
                                        void runAction("voucherDetail", "Voucher detail loaded", async () => {
                                            const data = await apiRequest<VoucherDetail>(`/vouchers/${v.id}`, { token, query: { companyId: selectedCompanyId } });
                                            setVoucherDetail(data);
                                        });
                                    }}>
                                        <td>{v.voucherNumber}</td>
                                        <td>{v.voucherType}</td>
                                        <td>{v.totalAmount}</td>
                                        <td>{v.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {alerts.voucherDetail ? <p className={alerts.voucherDetail.type === "ok" ? "inline-ok" : "inline-error"}>{alerts.voucherDetail.message}</p> : null}

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

            <section className="card">
                <h3>Need API details while building?</h3>
                <p className="subtle">Reference: <code>docs/frontend-backend-implementation-guide.md</code></p>
                <p className="subtle">Quick routes: <Link href="/register">Register</Link> | <Link href="/login">Login</Link> | <Link href="/workspace">Workspace</Link></p>
            </section>
        </main>
    );
}
