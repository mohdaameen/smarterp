"use client";

import { useEffect, useState } from "react";
import { apiRequest, apiRequestEnvelope } from "../../../lib/api-client";
import { useWorkspaceData } from "../../../lib/use-workspace-data";
import { CompanyFySelector } from "../../../components/company-fy-selector";
import { InlineAlert } from "../../../components/inline-alert";
import { EmptyState } from "../../../components/empty-state";

type Unit = { id: string; name: string; symbol: string; decimalPlaces?: number };
type StockGroup = { id: string; name: string; parentGroupId?: string | null };
type StockItem = {
    id: string;
    name: string;
    sku: string;
    stockGroupId?: string;
    unitId?: string;
    purchasePrice?: number;
    sellingPrice?: number;
    gstRate?: number;
    reorderLevel?: number;
};

type ListEnvelope<T> = { ok: boolean; data: T[] };

export default function WorkspaceInventoryPage() { // NOSONAR
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
    } = useWorkspaceData();

    const [units, setUnits] = useState<Unit[]>([]);
    const [stockGroups, setStockGroups] = useState<StockGroup[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);

    const [unitForm, setUnitForm] = useState({ name: "Piece", symbol: "PCS", decimalPlaces: 2 });
    const [groupForm, setGroupForm] = useState({ name: "General", parentGroupId: "" });
    const [itemForm, setItemForm] = useState({
        stockGroupId: "",
        unitId: "",
        name: "",
        sku: "",
        purchasePrice: "0",
        sellingPrice: "0",
        gstRate: "18",
        reorderLevel: "0",
    });
    const [editingUnitId, setEditingUnitId] = useState("");
    const [editingGroupId, setEditingGroupId] = useState("");
    const [editingItemId, setEditingItemId] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    async function loadInventoryContext() {
        if (!token || !selectedCompanyId) return;
        const [unitResp, groupResp, itemResp] = await Promise.all([
            apiRequestEnvelope<ListEnvelope<Unit>>("/masters/units", { token, query: { companyId: selectedCompanyId } }),
            apiRequestEnvelope<ListEnvelope<StockGroup>>("/masters/stock-groups", { token, query: { companyId: selectedCompanyId } }),
            apiRequestEnvelope<ListEnvelope<StockItem>>("/masters/stock-items", { token, query: { companyId: selectedCompanyId } }),
        ]);
        setUnits(unitResp.data ?? []);
        setStockGroups(groupResp.data ?? []);
        setStockItems(itemResp.data ?? []);
        setItemForm((prev) => ({
            ...prev,
            unitId: prev.unitId || unitResp.data?.[0]?.id || "",
            stockGroupId: prev.stockGroupId || groupResp.data?.[0]?.id || "",
        }));
    }

    function resetUnitForm() {
        setUnitForm({ name: "Piece", symbol: "PCS", decimalPlaces: 2 });
        setEditingUnitId("");
    }

    function resetGroupForm() {
        setGroupForm({ name: "General", parentGroupId: "" });
        setEditingGroupId("");
    }

    function resetItemForm() {
        setItemForm((prev) => ({
            ...prev,
            name: "",
            sku: "",
            purchasePrice: "0",
            sellingPrice: "0",
            gstRate: "18",
            reorderLevel: "0",
        }));
        setEditingItemId("");
    }

    function validateUnit() {
        const next: Record<string, string> = {};
        if (!unitForm.name.trim()) next.unitName = "Unit name is required";
        if (!unitForm.symbol.trim()) next.unitSymbol = "Unit symbol is required";
        if (Number(unitForm.decimalPlaces) < 0 || Number(unitForm.decimalPlaces) > 6) next.unitDecimalPlaces = "Decimal places must be between 0 and 6";
        setFieldErrors((prev) => ({ ...prev, ...next }));
        return Object.keys(next).length === 0;
    }

    function validateGroup() {
        const next: Record<string, string> = {};
        if (!groupForm.name.trim()) next.groupName = "Group name is required";
        setFieldErrors((prev) => ({ ...prev, ...next }));
        return Object.keys(next).length === 0;
    }

    function validateItem() {
        const next: Record<string, string> = {};
        if (!itemForm.name.trim()) next.itemName = "Item name is required";
        if (!itemForm.sku.trim()) next.itemSku = "SKU is required";
        if (!itemForm.stockGroupId) next.itemStockGroupId = "Select a stock group";
        if (!itemForm.unitId) next.itemUnitId = "Select a unit";
        if (Number(itemForm.purchasePrice) < 0) next.itemPurchasePrice = "Purchase price cannot be negative";
        if (Number(itemForm.sellingPrice) < 0) next.itemSellingPrice = "Selling price cannot be negative";
        if (Number(itemForm.gstRate) < 0 || Number(itemForm.gstRate) > 100) next.itemGstRate = "GST rate must be between 0 and 100";
        if (Number(itemForm.reorderLevel) < 0) next.itemReorderLevel = "Reorder level cannot be negative";
        setFieldErrors((prev) => ({ ...prev, ...next }));
        return Object.keys(next).length === 0;
    }

    useEffect(() => {
        if (!token || !selectedCompanyId) return;
        void loadInventoryContext();
    }, [token, selectedCompanyId]);

    const hasUnits = units.length > 0;
    const hasGroups = stockGroups.length > 0;
    const isSavingUnit = actionState("createUnitModule") || actionState("updateUnitModule");
    const isSavingGroup = actionState("createStockGroupModule") || actionState("updateStockGroupModule");
    const isSavingItem = actionState("createStockItemModule") || actionState("updateStockItemModule");

    let unitSubmitLabel = "Create Unit";
    if (editingUnitId) {
        unitSubmitLabel = actionState("updateUnitModule") ? "Saving..." : "Save Unit";
    } else if (actionState("createUnitModule")) {
        unitSubmitLabel = "Creating...";
    }

    let groupSubmitLabel = "Create Stock Group";
    if (editingGroupId) {
        groupSubmitLabel = actionState("updateStockGroupModule") ? "Saving..." : "Save Stock Group";
    } else if (actionState("createStockGroupModule")) {
        groupSubmitLabel = "Creating...";
    }

    let itemSubmitLabel = "Create Stock Item";
    if (editingItemId) {
        itemSubmitLabel = actionState("updateStockItemModule") ? "Saving..." : "Save Stock Item";
    } else if (actionState("createStockItemModule")) {
        itemSubmitLabel = "Creating...";
    }

    return (
        <main className="shell">
            <div className="hero">
                <p className="kicker">Module</p>
                <h1>Inventory</h1>
                <p className="subtle">Manage units, stock groups, and stock items from frontend using the documented APIs.</p>
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
                <div className="stack-block">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!token || !selectedCompanyId) return;
                            if (!validateUnit()) return;
                            const actionKey = editingUnitId ? "updateUnitModule" : "createUnitModule";
                            const successLabel = editingUnitId ? "Unit updated" : "Unit created";
                            void runAction(actionKey, successLabel, async () => {
                                const path = editingUnitId ? `/masters/units/${editingUnitId}` : "/masters/units";
                                await apiRequest(path, {
                                    method: editingUnitId ? "PATCH" : "POST",
                                    token,
                                    query: { companyId: selectedCompanyId },
                                    body: unitForm,
                                });
                                resetUnitForm();
                                await loadInventoryContext();
                            });
                        }}
                    >
                        <h3>{editingUnitId ? "Edit Unit" : "Create Unit"}</h3>
                        <input value={unitForm.name} onChange={(e) => setUnitForm((p) => ({ ...p, name: e.target.value }))} required />
                        {fieldErrors.unitName ? <p className="field-error">{fieldErrors.unitName}</p> : null}
                        <input value={unitForm.symbol} onChange={(e) => setUnitForm((p) => ({ ...p, symbol: e.target.value }))} required />
                        {fieldErrors.unitSymbol ? <p className="field-error">{fieldErrors.unitSymbol}</p> : null}
                        <input type="number" min={0} max={6} value={unitForm.decimalPlaces} onChange={(e) => setUnitForm((p) => ({ ...p, decimalPlaces: Number(e.target.value) }))} />
                        {fieldErrors.unitDecimalPlaces ? <p className="field-error">{fieldErrors.unitDecimalPlaces}</p> : null}
                        <InlineAlert alert={alerts.createUnitModule} />
                        <InlineAlert alert={alerts.updateUnitModule} />
                        <div className="inline-form">
                            <button disabled={isSavingUnit || !selectedCompanyId}>{unitSubmitLabel}</button>
                            {editingUnitId ? <button type="button" className="ghost" onClick={resetUnitForm}>Cancel Edit</button> : null}
                        </div>
                    </form>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!token || !selectedCompanyId) return;
                            if (!validateGroup()) return;
                            const actionKey = editingGroupId ? "updateStockGroupModule" : "createStockGroupModule";
                            const successLabel = editingGroupId ? "Stock group updated" : "Stock group created";
                            void runAction(actionKey, successLabel, async () => {
                                const path = editingGroupId ? `/masters/stock-groups/${editingGroupId}` : "/masters/stock-groups";
                                await apiRequest(path, {
                                    method: editingGroupId ? "PATCH" : "POST",
                                    token,
                                    query: { companyId: selectedCompanyId },
                                    body: {
                                        name: groupForm.name,
                                        ...(groupForm.parentGroupId ? { parentGroupId: groupForm.parentGroupId } : {}),
                                    },
                                });
                                resetGroupForm();
                                await loadInventoryContext();
                            });
                        }}
                    >
                        <h3>{editingGroupId ? "Edit Stock Group" : "Create Stock Group"}</h3>
                        <input value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))} required />
                        {fieldErrors.groupName ? <p className="field-error">{fieldErrors.groupName}</p> : null}
                        <select value={groupForm.parentGroupId} onChange={(e) => setGroupForm((p) => ({ ...p, parentGroupId: e.target.value }))}>
                            <option value="">No parent</option>
                            {stockGroups
                                .filter((group) => group.id !== editingGroupId)
                                .map((group) => (
                                    <option key={group.id} value={group.id}>{group.name}</option>
                                ))}
                        </select>
                        <InlineAlert alert={alerts.createStockGroupModule} />
                        <InlineAlert alert={alerts.updateStockGroupModule} />
                        <div className="inline-form">
                            <button disabled={isSavingGroup || !selectedCompanyId}>{groupSubmitLabel}</button>
                            {editingGroupId ? <button type="button" className="ghost" onClick={resetGroupForm}>Cancel Edit</button> : null}
                        </div>
                    </form>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!token || !selectedCompanyId) return;
                        if (!validateItem()) return;
                        const actionKey = editingItemId ? "updateStockItemModule" : "createStockItemModule";
                        const successLabel = editingItemId ? "Stock item updated" : "Stock item created";
                        void runAction(actionKey, successLabel, async () => {
                            const path = editingItemId ? `/masters/stock-items/${editingItemId}` : "/masters/stock-items";
                            await apiRequest(path, {
                                method: editingItemId ? "PATCH" : "POST",
                                token,
                                query: { companyId: selectedCompanyId },
                                body: {
                                    stockGroupId: itemForm.stockGroupId,
                                    unitId: itemForm.unitId,
                                    name: itemForm.name,
                                    sku: itemForm.sku,
                                    purchasePrice: Number(itemForm.purchasePrice),
                                    sellingPrice: Number(itemForm.sellingPrice),
                                    gstRate: Number(itemForm.gstRate),
                                    reorderLevel: Number(itemForm.reorderLevel),
                                },
                            });
                            resetItemForm();
                            await loadInventoryContext();
                        });
                    }}
                >
                    <h3>{editingItemId ? "Edit Stock Item" : "Create Stock Item"}</h3>
                    <select value={itemForm.stockGroupId} onChange={(e) => setItemForm((p) => ({ ...p, stockGroupId: e.target.value }))} required>
                        <option value="">Stock group</option>
                        {stockGroups.map((group) => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                    </select>
                    {fieldErrors.itemStockGroupId ? <p className="field-error">{fieldErrors.itemStockGroupId}</p> : null}
                    <select value={itemForm.unitId} onChange={(e) => setItemForm((p) => ({ ...p, unitId: e.target.value }))} required>
                        <option value="">Unit</option>
                        {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>
                        ))}
                    </select>
                    {fieldErrors.itemUnitId ? <p className="field-error">{fieldErrors.itemUnitId}</p> : null}
                    <input placeholder="Item name" value={itemForm.name} onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))} required />
                    {fieldErrors.itemName ? <p className="field-error">{fieldErrors.itemName}</p> : null}
                    <input placeholder="SKU" value={itemForm.sku} onChange={(e) => setItemForm((p) => ({ ...p, sku: e.target.value }))} required />
                    {fieldErrors.itemSku ? <p className="field-error">{fieldErrors.itemSku}</p> : null}
                    <input type="number" min={0} placeholder="Purchase price" value={itemForm.purchasePrice} onChange={(e) => setItemForm((p) => ({ ...p, purchasePrice: e.target.value }))} />
                    {fieldErrors.itemPurchasePrice ? <p className="field-error">{fieldErrors.itemPurchasePrice}</p> : null}
                    <input type="number" min={0} placeholder="Selling price" value={itemForm.sellingPrice} onChange={(e) => setItemForm((p) => ({ ...p, sellingPrice: e.target.value }))} />
                    {fieldErrors.itemSellingPrice ? <p className="field-error">{fieldErrors.itemSellingPrice}</p> : null}
                    <input type="number" min={0} max={100} placeholder="GST rate" value={itemForm.gstRate} onChange={(e) => setItemForm((p) => ({ ...p, gstRate: e.target.value }))} />
                    {fieldErrors.itemGstRate ? <p className="field-error">{fieldErrors.itemGstRate}</p> : null}
                    <input type="number" min={0} placeholder="Reorder level" value={itemForm.reorderLevel} onChange={(e) => setItemForm((p) => ({ ...p, reorderLevel: e.target.value }))} />
                    {fieldErrors.itemReorderLevel ? <p className="field-error">{fieldErrors.itemReorderLevel}</p> : null}
                    <InlineAlert alert={alerts.createStockItemModule} />
                    <InlineAlert alert={alerts.updateStockItemModule} />
                    <div className="inline-form">
                        <button disabled={isSavingItem || !selectedCompanyId}>{itemSubmitLabel}</button>
                        {editingItemId ? <button type="button" className="ghost" onClick={resetItemForm}>Cancel Edit</button> : null}
                    </div>
                </form>
            </section>

            <section className="card two-col">
                <div>
                    <h2>Units</h2>
                    {hasUnits ? (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Symbol</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {units.map((unit) => (
                                        <tr key={unit.id}>
                                            <td>{unit.name}</td>
                                            <td>{unit.symbol}</td>
                                            <td>
                                                <div className="inline-form">
                                                    <button
                                                        type="button"
                                                        className="ghost"
                                                        onClick={() => {
                                                            if (!token || !selectedCompanyId) return;
                                                            void runAction("loadUnitModule", "Unit loaded", async () => {
                                                                const data = await apiRequest<Unit>(`/masters/units/${unit.id}`, { token, query: { companyId: selectedCompanyId } });
                                                                setEditingUnitId(unit.id);
                                                                setUnitForm({ name: data.name || "", symbol: data.symbol || "", decimalPlaces: Number(data.decimalPlaces ?? 2) });
                                                            });
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="danger"
                                                        disabled={actionState("deleteUnitModule")}
                                                        onClick={() => {
                                                            if (!token || !selectedCompanyId) return;
                                                            void runAction("deleteUnitModule", "Unit deleted", async () => {
                                                                await apiRequest(`/masters/units/${unit.id}`, { method: "DELETE", token, query: { companyId: selectedCompanyId } });
                                                                if (editingUnitId === unit.id) resetUnitForm();
                                                                await loadInventoryContext();
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
                    ) : (
                        <EmptyState title="No units" description="Create at least one unit before adding stock items." />
                    )}
                    <InlineAlert alert={alerts.loadUnitModule} />
                    <InlineAlert alert={alerts.deleteUnitModule} />
                </div>

                <div>
                    <h2>Stock Groups</h2>
                    {hasGroups ? (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockGroups.map((group) => (
                                        <tr key={group.id}>
                                            <td>{group.name}</td>
                                            <td>
                                                <div className="inline-form">
                                                    <button
                                                        type="button"
                                                        className="ghost"
                                                        onClick={() => {
                                                            if (!token || !selectedCompanyId) return;
                                                            void runAction("loadStockGroupModule", "Stock group loaded", async () => {
                                                                const data = await apiRequest<StockGroup>(`/masters/stock-groups/${group.id}`, { token, query: { companyId: selectedCompanyId } });
                                                                setEditingGroupId(group.id);
                                                                setGroupForm({ name: data.name || "", parentGroupId: data.parentGroupId || "" });
                                                            });
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="danger"
                                                        disabled={actionState("deleteStockGroupModule")}
                                                        onClick={() => {
                                                            if (!token || !selectedCompanyId) return;
                                                            void runAction("deleteStockGroupModule", "Stock group deleted", async () => {
                                                                await apiRequest(`/masters/stock-groups/${group.id}`, { method: "DELETE", token, query: { companyId: selectedCompanyId } });
                                                                if (editingGroupId === group.id) resetGroupForm();
                                                                await loadInventoryContext();
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
                    ) : (
                        <EmptyState title="No stock groups" description="Create stock groups before creating stock items." />
                    )}
                    <InlineAlert alert={alerts.loadStockGroupModule} />
                    <InlineAlert alert={alerts.deleteStockGroupModule} />
                </div>
            </section>

            <section className="card">
                <h2>Stock Item List</h2>
                {stockItems.length === 0 ? (
                    <EmptyState title="No stock items" description="Create units and stock groups, then add stock items." />
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>SKU</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stockItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.sku}</td>
                                        <td>
                                            <div className="inline-form">
                                                <button
                                                    type="button"
                                                    className="ghost"
                                                    onClick={() => {
                                                        if (!token || !selectedCompanyId) return;
                                                        void runAction("loadStockItemModule", "Stock item loaded", async () => {
                                                            const data = await apiRequest<StockItem>(`/masters/stock-items/${item.id}`, { token, query: { companyId: selectedCompanyId } });
                                                            setEditingItemId(item.id);
                                                            setItemForm({
                                                                stockGroupId: data.stockGroupId || "",
                                                                unitId: data.unitId || "",
                                                                name: data.name || "",
                                                                sku: data.sku || "",
                                                                purchasePrice: String(data.purchasePrice ?? 0),
                                                                sellingPrice: String(data.sellingPrice ?? 0),
                                                                gstRate: String(data.gstRate ?? 0),
                                                                reorderLevel: String(data.reorderLevel ?? 0),
                                                            });
                                                        });
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="danger"
                                                    disabled={actionState("deleteStockItemModule")}
                                                    onClick={() => {
                                                        if (!token || !selectedCompanyId) return;
                                                        void runAction("deleteStockItemModule", "Stock item deleted", async () => {
                                                            await apiRequest(`/masters/stock-items/${item.id}`, { method: "DELETE", token, query: { companyId: selectedCompanyId } });
                                                            if (editingItemId === item.id) resetItemForm();
                                                            await loadInventoryContext();
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
                <InlineAlert alert={alerts.loadStockItemModule} />
                <InlineAlert alert={alerts.deleteStockItemModule} />
            </section>
        </main>
    );
}
