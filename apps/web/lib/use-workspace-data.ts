"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest, apiRequestEnvelope } from "./api-client";
import {
    Company,
    Customer,
    FinancialYear,
    Ledger,
    LedgerGroup,
    PaymentMode,
    Supplier,
    VoucherDetail,
    VoucherListItem,
} from "./contracts";
import { useAuth } from "./auth-context";

export type Alert = { type: "ok" | "error"; message: string };

type EnvelopeList<T> = {
    ok: boolean;
    data: T[];
    meta: { total: number; page: number; limit: number; totalPages: number };
};

export function useWorkspaceData() {
    const router = useRouter();
    const { session } = useAuth();

    const [token, setToken] = useState("");
    const [bootstrapping, setBootstrapping] = useState(true);
    const [contextLoading, setContextLoading] = useState(false);
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

    const [receiptForm, setReceiptForm] = useState({
        customerId: "",
        bankCashLedgerId: "",
        amount: "10000",
        voucherDate: "2026-07-04",
        paymentMode: "BANK_TRANSFER" as PaymentMode,
        narration: "Advance received",
    });
    const [paymentForm, setPaymentForm] = useState({
        supplierId: "",
        bankCashLedgerId: "",
        amount: "5000",
        voucherDate: "2026-07-04",
        paymentMode: "CHEQUE" as PaymentMode,
        chequeNumber: "",
        narration: "Supplier payment",
    });

    const [vouchers, setVouchers] = useState<VoucherListItem[]>([]);
    const [voucherDetail, setVoucherDetail] = useState<VoucherDetail | null>(null);

    const selectedCompany = useMemo(
        () => companies.find((c) => c.id === selectedCompanyId) ?? null,
        [companies, selectedCompanyId]
    );

    function showAlert(key: string, type: "ok" | "error", message: string) {
        setAlerts((prev) => ({ ...prev, [key]: { type, message } }));
    }

    async function runAction(key: string, successLabel: string, action: () => Promise<void>) {
        setBusyKey(key);
        showAlert(key, "ok", "Working...");
        try {
            await action();
            showAlert(key, "ok", successLabel);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("smarterp:toast", { detail: { type: "ok", message: successLabel } }));
            }
        } catch (err) {
            const message =
                err instanceof ApiError
                    ? err.details?.[0]?.message ?? err.message
                    : "Unexpected error";
            showAlert(key, "error", message);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("smarterp:toast", { detail: { type: "error", message } }));
            }
        } finally {
            setBusyKey("");
        }
    }

    async function loadCompanies(authToken: string) {
        setContextLoading(true);
        try {
            const rows = await apiRequest<Company[]>("/companies", { token: authToken });
            setCompanies(rows);
            setSelectedCompanyId((prev) => prev || rows[0]?.id || "");
        } finally {
            setContextLoading(false);
        }
    }

    async function loadContext(companyId: string, authToken: string) {
        setContextLoading(true);
        try {
            const [fyRows, groupRows, ledgerRows, customerRows, supplierRows, voucherRows] = await Promise.all([
                apiRequest<FinancialYear[]>(`/companies/${companyId}/financial-years`, { token: authToken }),
                apiRequestEnvelope<EnvelopeList<LedgerGroup>>("/masters/ledger-groups", { token: authToken, query: { companyId, page: 1, limit: 100 } }),
                apiRequestEnvelope<EnvelopeList<Ledger>>("/masters/ledgers", { token: authToken, query: { companyId, page: 1, limit: 100 } }),
                apiRequestEnvelope<EnvelopeList<Customer>>("/masters/customers", { token: authToken, query: { companyId, page: 1, limit: 100 } }),
                apiRequestEnvelope<EnvelopeList<Supplier>>("/masters/suppliers", { token: authToken, query: { companyId, page: 1, limit: 100 } }),
                apiRequestEnvelope<EnvelopeList<VoucherListItem>>("/vouchers", { token: authToken, query: { companyId, page: 1, limit: 50 } }),
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
        } finally {
            setContextLoading(false);
        }
    }

    async function refreshContext() {
        if (!token || !selectedCompanyId) return;
        await loadContext(selectedCompanyId, token);
    }

    useEffect(() => {
        if (!session) {
            router.replace("/login");
            return;
        }
        setToken(session.accessToken);
        void loadCompanies(session.accessToken).finally(() => setBootstrapping(false));
    }, [router, session]);

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

    return {
        token,
        bootstrapping,
        contextLoading,
        alerts,
        showAlert,
        runAction,
        actionState,
        hasWorkspace,
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
        ledgerGroups,
        ledgers,
        customers,
        suppliers,
        groupForm,
        setGroupForm,
        ledgerForm,
        setLedgerForm,
        customerForm,
        setCustomerForm,
        supplierForm,
        setSupplierForm,
        receiptForm,
        setReceiptForm,
        paymentForm,
        setPaymentForm,
        vouchers,
        voucherDetail,
        setVoucherDetail,
        loadCompanies,
        loadContext,
        refreshContext,
    };
}
