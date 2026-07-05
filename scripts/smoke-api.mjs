#!/usr/bin/env node

const baseUrl = process.env.SMARTERP_API_URL || "http://localhost:4000";
const apiBase = `${baseUrl}/api/v1`;

function step(message) {
    console.log(`\n[SMOKE] ${message}`);
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function request(path, { method = "GET", token, body, expectedStatuses = [200] } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(`${apiBase}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const raw = await response.text();
    let data = null;
    if (raw) {
        try {
            data = JSON.parse(raw);
        } catch {
            data = raw;
        }
    }

    if (!expectedStatuses.includes(response.status)) {
        throw new Error(
            `Request failed: ${method} ${path} -> ${response.status}\nResponse: ${typeof data === "string" ? data : JSON.stringify(data)}`
        );
    }

    return data;
}

function requireId(result, key = "id") {
    assert(result && result.data && result.data[key], `Expected response.data.${key}`);
    return result.data[key];
}

async function main() {
    const nonce = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const email = `smoke.${nonce}@example.com`;
    const password = "Password@123";
    const today = new Date().toISOString().slice(0, 10);

    step("Health check");
    const health = await fetch(`${baseUrl}/health`);
    assert(health.ok, `Health check failed with status ${health.status}`);

    step("Register + login + profile");
    await request("/auth/register", {
        method: "POST",
        body: {
            fullName: `Smoke User ${nonce}`,
            email,
            password,
            phone: "9999999999",
        },
        expectedStatuses: [201],
    });

    const login = await request("/auth/login", {
        method: "POST",
        body: { email, password },
    });
    const accessToken = login?.data?.accessToken;
    assert(accessToken, "Missing access token in login response");

    await request("/auth/me", { token: accessToken });

    step("Create company + financial year");
    const company = await request("/companies", {
        method: "POST",
        token: accessToken,
        body: {
            name: `Smoke Co ${nonce}`,
            stateCode: "KA",
            allowNegativeStock: true,
        },
        expectedStatuses: [201],
    });
    const companyId = requireId(company);

    const fy = await request(`/companies/${companyId}/financial-years`, {
        method: "POST",
        token: accessToken,
        body: {
            label: "2026-27",
            startDate: "2026-04-01",
            endDate: "2027-03-31",
            isCurrent: true,
        },
        expectedStatuses: [201],
    });
    const financialYearId = requireId(fy);

    const q = `?companyId=${encodeURIComponent(companyId)}`;

    step("Create master data (ledger groups, ledgers, unit, stock, customer, supplier)");
    const debtorGroup = await request(`/masters/ledger-groups${q}`, {
        method: "POST",
        token: accessToken,
        body: { name: `Sundry Debtors ${nonce}`, nature: "ASSET" },
        expectedStatuses: [201],
    });
    const creditorGroup = await request(`/masters/ledger-groups${q}`, {
        method: "POST",
        token: accessToken,
        body: { name: `Sundry Creditors ${nonce}`, nature: "LIABILITY" },
        expectedStatuses: [201],
    });
    const incomeGroup = await request(`/masters/ledger-groups${q}`, {
        method: "POST",
        token: accessToken,
        body: { name: `Direct Income ${nonce}`, nature: "INCOME" },
        expectedStatuses: [201],
    });
    const expenseGroup = await request(`/masters/ledger-groups${q}`, {
        method: "POST",
        token: accessToken,
        body: { name: `Direct Expense ${nonce}`, nature: "EXPENSE" },
        expectedStatuses: [201],
    });
    const assetGroup = await request(`/masters/ledger-groups${q}`, {
        method: "POST",
        token: accessToken,
        body: { name: `Cash and Bank ${nonce}`, nature: "ASSET" },
        expectedStatuses: [201],
    });

    const debtorGroupId = requireId(debtorGroup);
    const creditorGroupId = requireId(creditorGroup);
    const incomeGroupId = requireId(incomeGroup);
    const expenseGroupId = requireId(expenseGroup);
    const assetGroupId = requireId(assetGroup);

    async function createLedger(payload) {
        const res = await request(`/masters/ledgers${q}`, {
            method: "POST",
            token: accessToken,
            body: payload,
            expectedStatuses: [201],
        });
        return requireId(res);
    }

    const salesLedgerId = await createLedger({
        ledgerGroupId: incomeGroupId,
        name: `Sales ${nonce}`,
        ledgerType: "INCOME",
    });
    const purchaseLedgerId = await createLedger({
        ledgerGroupId: expenseGroupId,
        name: `Purchases ${nonce}`,
        ledgerType: "EXPENSE",
    });
    const bankLedgerId = await createLedger({
        ledgerGroupId: assetGroupId,
        name: `Bank ${nonce}`,
        ledgerType: "BANK",
    });
    const cashLedgerId = await createLedger({
        ledgerGroupId: assetGroupId,
        name: `Cash ${nonce}`,
        ledgerType: "CASH",
    });
    const salesReturnLedgerId = await createLedger({
        ledgerGroupId: incomeGroupId,
        name: `Sales Return ${nonce}`,
        ledgerType: "INCOME",
    });
    const purchaseReturnLedgerId = await createLedger({
        ledgerGroupId: expenseGroupId,
        name: `Purchase Return ${nonce}`,
        ledgerType: "EXPENSE",
    });

    const unit = await request(`/masters/units${q}`, {
        method: "POST",
        token: accessToken,
        body: { name: "Piece", symbol: `PCS${nonce.slice(-3)}` },
        expectedStatuses: [201],
    });
    const unitId = requireId(unit);

    const stockGroup = await request(`/masters/stock-groups${q}`, {
        method: "POST",
        token: accessToken,
        body: { name: `General ${nonce}` },
        expectedStatuses: [201],
    });
    const stockGroupId = requireId(stockGroup);

    const stockItem = await request(`/masters/stock-items${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            stockGroupId,
            unitId,
            name: `Smoke Item ${nonce}`,
            sku: `SKU-${nonce}`,
            purchasePrice: 100,
            sellingPrice: 120,
            gstRate: 18,
        },
        expectedStatuses: [201],
    });
    const stockItemId = requireId(stockItem);

    const customer = await request(`/masters/customers${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            name: `Smoke Customer ${nonce}`,
            ledgerGroupId: debtorGroupId,
            email: `customer.${nonce}@example.com`,
        },
        expectedStatuses: [201],
    });
    const customerId = requireId(customer);

    const supplier = await request(`/masters/suppliers${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            name: `Smoke Supplier ${nonce}`,
            ledgerGroupId: creditorGroupId,
            email: `supplier.${nonce}@example.com`,
        },
        expectedStatuses: [201],
    });
    const supplierId = requireId(supplier);

    step("Post voucher flows");

    await request(`/vouchers/sales${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            companyId,
            financialYearId,
            customerId,
            salesLedgerId,
            voucherDate: today,
            items: [{ stockItemId, qty: 1, rate: 120, gstRate: 18 }],
            narration: "Smoke sales",
        },
        expectedStatuses: [201],
    });

    await request(`/vouchers/purchase${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            companyId,
            financialYearId,
            supplierId,
            purchaseLedgerId,
            voucherDate: today,
            items: [{ stockItemId, qty: 2, rate: 90, gstRate: 18 }],
            narration: "Smoke purchase",
        },
        expectedStatuses: [201],
    });

    await request(`/vouchers/receipt${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            companyId,
            financialYearId,
            customerId,
            bankCashLedgerId: bankLedgerId,
            voucherDate: today,
            amount: 50,
            paymentMode: "CASH",
        },
        expectedStatuses: [201],
    });

    await request(`/vouchers/payment${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            companyId,
            financialYearId,
            supplierId,
            bankCashLedgerId: bankLedgerId,
            voucherDate: today,
            amount: 40,
            paymentMode: "BANK_TRANSFER",
        },
        expectedStatuses: [201],
    });

    await request(`/vouchers/contra${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            companyId,
            financialYearId,
            fromLedgerId: cashLedgerId,
            toLedgerId: bankLedgerId,
            voucherDate: today,
            amount: 30,
            narration: "Smoke contra",
        },
        expectedStatuses: [201],
    });

    await request(`/vouchers/credit-note${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            companyId,
            financialYearId,
            customerId,
            salesReturnLedgerId,
            voucherDate: today,
            amount: 10,
            narration: "Smoke credit note",
        },
        expectedStatuses: [201],
    });

    await request(`/vouchers/debit-note${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            companyId,
            financialYearId,
            supplierId,
            purchaseReturnLedgerId,
            voucherDate: today,
            amount: 8,
            narration: "Smoke debit note",
        },
        expectedStatuses: [201],
    });

    await request(`/vouchers/journal${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            companyId,
            financialYearId,
            voucherDate: today,
            narration: "Smoke journal",
            lines: [
                { ledgerId: bankLedgerId, debitAmount: 25, creditAmount: 0, description: "DR bank" },
                { ledgerId: cashLedgerId, debitAmount: 0, creditAmount: 25, description: "CR cash" },
            ],
        },
        expectedStatuses: [201],
    });

    await request(`/vouchers/inventory-adjustment${q}`, {
        method: "POST",
        token: accessToken,
        body: {
            companyId,
            financialYearId,
            stockItemId,
            txnDate: today,
            adjustmentType: "IN",
            qty: 3,
            unitCost: 95,
            reason: "Smoke adjustment",
        },
        expectedStatuses: [201],
    });

    step("List voucher and fetch voucher detail");
    const voucherList = await request(`/vouchers${q}&financialYearId=${encodeURIComponent(financialYearId)}`, {
        token: accessToken,
    });
    const anyVoucher = voucherList?.data?.[0];
    assert(anyVoucher?.id, "Expected at least one voucher in voucher list");
    await request(`/vouchers/${anyVoucher.id}${q}`, { token: accessToken });

    step("Run report endpoints");
    await request(`/reports/stock-summary${q}&financialYearId=${encodeURIComponent(financialYearId)}`, { token: accessToken });
    await request(`/reports/sales-register${q}&financialYearId=${encodeURIComponent(financialYearId)}`, { token: accessToken });
    await request(`/reports/purchase-register${q}&financialYearId=${encodeURIComponent(financialYearId)}`, { token: accessToken });
    await request(`/reports/outstanding-customers${q}&financialYearId=${encodeURIComponent(financialYearId)}`, { token: accessToken });
    await request(`/reports/outstanding-suppliers${q}&financialYearId=${encodeURIComponent(financialYearId)}`, { token: accessToken });
    await request(`/reports/trial-balance${q}&financialYearId=${encodeURIComponent(financialYearId)}`, { token: accessToken });
    await request(`/reports/balance-sheet${q}&financialYearId=${encodeURIComponent(financialYearId)}&toDate=${today}`, { token: accessToken });
    await request(`/reports/profit-loss${q}&financialYearId=${encodeURIComponent(financialYearId)}&fromDate=2026-04-01&toDate=${today}`, { token: accessToken });
    await request(`/reports/cash-flow${q}&financialYearId=${encodeURIComponent(financialYearId)}&fromDate=2026-04-01&toDate=${today}`, { token: accessToken });

    console.log("\n[SMOKE] PASS: backend smoke test completed successfully");
}

main().catch((error) => {
    console.error(`\n[SMOKE] FAIL: ${error.message}`);
    process.exitCode = 1;
});
