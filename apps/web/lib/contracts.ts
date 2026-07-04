export type UserRole = "OWNER" | "ADMIN" | "ACCOUNTANT" | "OPERATOR" | "VIEWER";

export type AuthUser = {
    id: string;
    fullName: string;
    email: string;
};

export type LoginResponse = {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
};

export type Company = {
    id: string;
    name: string;
    gstNumber?: string | null;
    role: UserRole;
};

export type FinancialYear = {
    id: string;
    label: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
};

export type LedgerGroup = {
    id: string;
    name: string;
    nature: string;
};

export type LedgerType = "CUSTOMER" | "SUPPLIER" | "INCOME" | "EXPENSE" | "BANK" | "CASH" | "STOCK";

export type Ledger = {
    id: string;
    name: string;
    ledgerType: LedgerType;
};

export type Customer = {
    id: string;
    name: string;
    ledgerId: string;
};

export type Supplier = {
    id: string;
    name: string;
    ledgerId: string;
};

export type VoucherType = "SALES" | "PURCHASE" | "RECEIPT" | "PAYMENT" | "JOURNAL" | "CREDIT_NOTE" | "DEBIT_NOTE";

export type VoucherListItem = {
    id: string;
    voucherNumber: string;
    voucherType: VoucherType;
    totalAmount: string;
    status: "DRAFT" | "POSTED" | "CANCELLED";
    voucherDate: string;
};

export type LedgerEntry = {
    id: string;
    ledgerId: string;
    debitAmount: string;
    creditAmount: string;
    remarks: string;
    ledger: {
        id: string;
        name: string;
    };
};

export type VoucherDetail = {
    id: string;
    voucherNumber: string;
    voucherType: VoucherType;
    totalAmount: string;
    status: "DRAFT" | "POSTED" | "CANCELLED";
    narration?: string | null;
    voucherDate: string;
    ledgerEntries: LedgerEntry[];
};

export type PaymentMode = "CASH" | "CHEQUE" | "BANK_TRANSFER" | "ONLINE";
