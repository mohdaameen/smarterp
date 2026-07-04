import { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import { AppError } from "../../middlewares/error.js";
import { createAuditLog } from "../../utils/audit.js";
import { parsePagination, paginate } from "../../utils/pagination.js";
import type { Request } from "express";
import type {
    CreateLedgerGroupInput,
    CreateLedgerInput,
    CreateUnitInput,
    CreateStockGroupInput,
    CreateStockItemInput,
    CreateCustomerInput,
    CreateSupplierInput,
} from "./masters.schema.js";

// ─── Ledger Groups ────────────────────────────────────────────────────────────

export async function createLedgerGroup(companyId: string, userId: string, input: CreateLedgerGroupInput) {
    const group = await prisma.ledgerGroup.create({
        data: { companyId, ...input },
    });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "LedgerGroup", entityId: group.id, action: "CREATE" });
    return group;
}

export async function listLedgerGroups(companyId: string, req: Request) {
    const { page, limit, skip, search } = parsePagination(req);
    const where: Prisma.LedgerGroupWhereInput = {
        companyId,
        isActive: true,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const [data, total] = await Promise.all([
        prisma.ledgerGroup.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
        prisma.ledgerGroup.count({ where }),
    ]);
    return paginate(data, total, page, limit);
}

export async function getLedgerGroup(companyId: string, id: string) {
    const group = await prisma.ledgerGroup.findFirst({ where: { id, companyId } });
    if (!group) throw new AppError(404, "Ledger group not found");
    return group;
}

export async function updateLedgerGroup(companyId: string, id: string, userId: string, input: Partial<CreateLedgerGroupInput>) {
    const existing = await prisma.ledgerGroup.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Ledger group not found");
    if (existing.isSystem) throw new AppError(400, "Cannot modify a system ledger group");
    const group = await prisma.ledgerGroup.update({ where: { id }, data: input });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "LedgerGroup", entityId: id, action: "UPDATE", changes: input as Record<string, unknown> });
    return group;
}

export async function deleteLedgerGroup(companyId: string, id: string, userId: string) {
    const existing = await prisma.ledgerGroup.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Ledger group not found");
    if (existing.isSystem) throw new AppError(400, "Cannot delete a system ledger group");
    await prisma.ledgerGroup.update({ where: { id }, data: { isActive: false } });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "LedgerGroup", entityId: id, action: "DELETE" });
}

// ─── Ledgers ──────────────────────────────────────────────────────────────────

export async function createLedger(companyId: string, userId: string, input: CreateLedgerInput) {
    const ledger = await prisma.ledger.create({
        data: {
            companyId,
            ledgerGroupId: input.ledgerGroupId,
            name: input.name,
            code: input.code,
            ledgerType: input.ledgerType,
            openingBalance: input.openingBalance,
            openingBalanceType: input.openingBalanceType ?? "DR",
            gstin: input.gstin,
            pan: input.pan,
            email: input.email,
            phone: input.phone,
            addressJson: input.addressJson as Prisma.InputJsonValue | undefined,
        },
    });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Ledger", entityId: ledger.id, action: "CREATE" });
    return ledger;
}

export async function listLedgers(companyId: string, req: Request) {
    const { page, limit, skip, search } = parsePagination(req);
    const ledgerType = req.query["ledgerType"] as string | undefined;
    const where: Prisma.LedgerWhereInput = {
        companyId,
        isActive: true,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(ledgerType ? { ledgerType: ledgerType as Prisma.EnumLedgerTypeFilter } : {}),
    };
    const [data, total] = await Promise.all([
        prisma.ledger.findMany({ where, skip, take: limit, orderBy: { name: "asc" }, include: { ledgerGroup: true } }),
        prisma.ledger.count({ where }),
    ]);
    return paginate(data, total, page, limit);
}

export async function getLedger(companyId: string, id: string) {
    const ledger = await prisma.ledger.findFirst({ where: { id, companyId }, include: { ledgerGroup: true } });
    if (!ledger) throw new AppError(404, "Ledger not found");
    return ledger;
}

export async function updateLedger(companyId: string, id: string, userId: string, input: Partial<CreateLedgerInput>) {
    const existing = await prisma.ledger.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Ledger not found");
    const { ledgerGroupId, ledgerType, openingBalance, openingBalanceType, ...rest } = input;
    const ledger = await prisma.ledger.update({
        where: { id },
        data: {
            ...rest,
            ...(ledgerGroupId ? { ledgerGroupId } : {}),
            ...(ledgerType ? { ledgerType } : {}),
            ...(openingBalance !== undefined ? { openingBalance } : {}),
            ...(openingBalanceType ? { openingBalanceType } : {}),
            addressJson: rest.addressJson as Prisma.InputJsonValue | undefined,
        },
    });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Ledger", entityId: id, action: "UPDATE", changes: input as Record<string, unknown> });
    return ledger;
}

export async function deleteLedger(companyId: string, id: string, userId: string) {
    const existing = await prisma.ledger.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Ledger not found");
    await prisma.ledger.update({ where: { id }, data: { isActive: false } });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Ledger", entityId: id, action: "DELETE" });
}

// ─── Units ────────────────────────────────────────────────────────────────────

export async function createUnit(companyId: string, userId: string, input: CreateUnitInput) {
    const unit = await prisma.unit.create({ data: { companyId, ...input } });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Unit", entityId: unit.id, action: "CREATE" });
    return unit;
}

export async function listUnits(companyId: string, req: Request) {
    const { page, limit, skip, search } = parsePagination(req);
    const where: Prisma.UnitWhereInput = {
        companyId,
        isActive: true,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const [data, total] = await Promise.all([
        prisma.unit.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
        prisma.unit.count({ where }),
    ]);
    return paginate(data, total, page, limit);
}

export async function getUnit(companyId: string, id: string) {
    const unit = await prisma.unit.findFirst({ where: { id, companyId } });
    if (!unit) throw new AppError(404, "Unit not found");
    return unit;
}

export async function updateUnit(companyId: string, id: string, userId: string, input: Partial<CreateUnitInput>) {
    const existing = await prisma.unit.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Unit not found");
    const unit = await prisma.unit.update({ where: { id }, data: input });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Unit", entityId: id, action: "UPDATE", changes: input as Record<string, unknown> });
    return unit;
}

export async function deleteUnit(companyId: string, id: string, userId: string) {
    const existing = await prisma.unit.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Unit not found");
    await prisma.unit.update({ where: { id }, data: { isActive: false } });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Unit", entityId: id, action: "DELETE" });
}

// ─── Stock Groups ─────────────────────────────────────────────────────────────

export async function createStockGroup(companyId: string, userId: string, input: CreateStockGroupInput) {
    const group = await prisma.stockGroup.create({ data: { companyId, ...input } });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "StockGroup", entityId: group.id, action: "CREATE" });
    return group;
}

export async function listStockGroups(companyId: string, req: Request) {
    const { page, limit, skip, search } = parsePagination(req);
    const where: Prisma.StockGroupWhereInput = {
        companyId,
        isActive: true,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const [data, total] = await Promise.all([
        prisma.stockGroup.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
        prisma.stockGroup.count({ where }),
    ]);
    return paginate(data, total, page, limit);
}

export async function getStockGroup(companyId: string, id: string) {
    const group = await prisma.stockGroup.findFirst({ where: { id, companyId } });
    if (!group) throw new AppError(404, "Stock group not found");
    return group;
}

export async function updateStockGroup(companyId: string, id: string, userId: string, input: Partial<CreateStockGroupInput>) {
    const existing = await prisma.stockGroup.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Stock group not found");
    const group = await prisma.stockGroup.update({ where: { id }, data: input });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "StockGroup", entityId: id, action: "UPDATE", changes: input as Record<string, unknown> });
    return group;
}

export async function deleteStockGroup(companyId: string, id: string, userId: string) {
    const existing = await prisma.stockGroup.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Stock group not found");
    await prisma.stockGroup.update({ where: { id }, data: { isActive: false } });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "StockGroup", entityId: id, action: "DELETE" });
}

// ─── Stock Items ──────────────────────────────────────────────────────────────

export async function createStockItem(companyId: string, userId: string, input: CreateStockItemInput) {
    const item = await prisma.stockItem.create({
        data: { companyId, ...input },
        include: { unit: true, stockGroup: true },
    });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "StockItem", entityId: item.id, action: "CREATE" });
    return item;
}

export async function listStockItems(companyId: string, req: Request) {
    const { page, limit, skip, search } = parsePagination(req);
    const stockGroupId = req.query["stockGroupId"] as string | undefined;
    const where: Prisma.StockItemWhereInput = {
        companyId,
        isActive: true,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(stockGroupId ? { stockGroupId } : {}),
    };
    const [data, total] = await Promise.all([
        prisma.stockItem.findMany({ where, skip, take: limit, orderBy: { name: "asc" }, include: { unit: true, stockGroup: true } }),
        prisma.stockItem.count({ where }),
    ]);
    return paginate(data, total, page, limit);
}

export async function getStockItem(companyId: string, id: string) {
    const item = await prisma.stockItem.findFirst({ where: { id, companyId }, include: { unit: true, stockGroup: true } });
    if (!item) throw new AppError(404, "Stock item not found");
    return item;
}

export async function updateStockItem(companyId: string, id: string, userId: string, input: Partial<CreateStockItemInput>) {
    const existing = await prisma.stockItem.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Stock item not found");
    const item = await prisma.stockItem.update({ where: { id }, data: input, include: { unit: true, stockGroup: true } });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "StockItem", entityId: id, action: "UPDATE", changes: input as Record<string, unknown> });
    return item;
}

export async function deleteStockItem(companyId: string, id: string, userId: string) {
    const existing = await prisma.stockItem.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Stock item not found");
    await prisma.stockItem.update({ where: { id }, data: { isActive: false } });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "StockItem", entityId: id, action: "DELETE" });
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function createCustomer(companyId: string, userId: string, input: CreateCustomerInput) {
    const customer = await prisma.$transaction(async (tx) => {
        const ledger = await tx.ledger.create({
            data: {
                companyId,
                ledgerGroupId: input.ledgerGroupId,
                name: input.name,
                ledgerType: "CUSTOMER",
                gstin: input.gstin,
                email: input.email,
                phone: input.mobile,
                addressJson: input.addressJson as Prisma.InputJsonValue | undefined,
            },
        });
        return tx.customer.create({
            data: {
                companyId,
                ledgerId: ledger.id,
                name: input.name,
                mobile: input.mobile,
                email: input.email,
                gstin: input.gstin,
                addressJson: input.addressJson as Prisma.InputJsonValue | undefined,
                creditLimit: input.creditLimit,
            },
            include: { ledger: true },
        });
    });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Customer", entityId: customer.id, action: "CREATE" });
    return customer;
}

export async function listCustomers(companyId: string, req: Request) {
    const { page, limit, skip, search } = parsePagination(req);
    const where: Prisma.CustomerWhereInput = {
        companyId,
        isActive: true,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const [data, total] = await Promise.all([
        prisma.customer.findMany({ where, skip, take: limit, orderBy: { name: "asc" }, include: { ledger: true } }),
        prisma.customer.count({ where }),
    ]);
    return paginate(data, total, page, limit);
}

export async function getCustomer(companyId: string, id: string) {
    const customer = await prisma.customer.findFirst({ where: { id, companyId }, include: { ledger: true } });
    if (!customer) throw new AppError(404, "Customer not found");
    return customer;
}

export async function updateCustomer(companyId: string, id: string, userId: string, input: Partial<Omit<CreateCustomerInput, "ledgerGroupId">>) {
    const existing = await prisma.customer.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Customer not found");
    const customer = await prisma.$transaction(async (tx) => {
        const c = await tx.customer.update({
            where: { id },
            data: {
                name: input.name,
                mobile: input.mobile,
                email: input.email,
                gstin: input.gstin,
                addressJson: input.addressJson as Prisma.InputJsonValue | undefined,
                creditLimit: input.creditLimit,
            },
            include: { ledger: true },
        });
        if (input.name || input.email || input.mobile || input.gstin || input.addressJson) {
            await tx.ledger.update({
                where: { id: existing.ledgerId },
                data: {
                    name: input.name,
                    email: input.email,
                    phone: input.mobile,
                    gstin: input.gstin,
                    addressJson: input.addressJson as Prisma.InputJsonValue | undefined,
                },
            });
        }
        return c;
    });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Customer", entityId: id, action: "UPDATE", changes: input as Record<string, unknown> });
    return customer;
}

export async function deleteCustomer(companyId: string, id: string, userId: string) {
    const existing = await prisma.customer.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Customer not found");
    await prisma.$transaction([
        prisma.customer.update({ where: { id }, data: { isActive: false } }),
        prisma.ledger.update({ where: { id: existing.ledgerId }, data: { isActive: false } }),
    ]);
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Customer", entityId: id, action: "DELETE" });
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function createSupplier(companyId: string, userId: string, input: CreateSupplierInput) {
    const supplier = await prisma.$transaction(async (tx) => {
        const ledger = await tx.ledger.create({
            data: {
                companyId,
                ledgerGroupId: input.ledgerGroupId,
                name: input.name,
                ledgerType: "SUPPLIER",
                gstin: input.gstin,
                email: input.email,
                phone: input.mobile,
                addressJson: input.addressJson as Prisma.InputJsonValue | undefined,
            },
        });
        return tx.supplier.create({
            data: {
                companyId,
                ledgerId: ledger.id,
                name: input.name,
                mobile: input.mobile,
                email: input.email,
                gstin: input.gstin,
                addressJson: input.addressJson as Prisma.InputJsonValue | undefined,
            },
            include: { ledger: true },
        });
    });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Supplier", entityId: supplier.id, action: "CREATE" });
    return supplier;
}

export async function listSuppliers(companyId: string, req: Request) {
    const { page, limit, skip, search } = parsePagination(req);
    const where: Prisma.SupplierWhereInput = {
        companyId,
        isActive: true,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const [data, total] = await Promise.all([
        prisma.supplier.findMany({ where, skip, take: limit, orderBy: { name: "asc" }, include: { ledger: true } }),
        prisma.supplier.count({ where }),
    ]);
    return paginate(data, total, page, limit);
}

export async function getSupplier(companyId: string, id: string) {
    const supplier = await prisma.supplier.findFirst({ where: { id, companyId }, include: { ledger: true } });
    if (!supplier) throw new AppError(404, "Supplier not found");
    return supplier;
}

export async function updateSupplier(companyId: string, id: string, userId: string, input: Partial<Omit<CreateSupplierInput, "ledgerGroupId">>) {
    const existing = await prisma.supplier.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Supplier not found");
    const supplier = await prisma.$transaction(async (tx) => {
        const s = await tx.supplier.update({
            where: { id },
            data: {
                name: input.name,
                mobile: input.mobile,
                email: input.email,
                gstin: input.gstin,
                addressJson: input.addressJson as Prisma.InputJsonValue | undefined,
            },
            include: { ledger: true },
        });
        if (input.name || input.email || input.mobile || input.gstin || input.addressJson) {
            await tx.ledger.update({
                where: { id: existing.ledgerId },
                data: {
                    name: input.name,
                    email: input.email,
                    phone: input.mobile,
                    gstin: input.gstin,
                    addressJson: input.addressJson as Prisma.InputJsonValue | undefined,
                },
            });
        }
        return s;
    });
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Supplier", entityId: id, action: "UPDATE", changes: input as Record<string, unknown> });
    return supplier;
}

export async function deleteSupplier(companyId: string, id: string, userId: string) {
    const existing = await prisma.supplier.findFirst({ where: { id, companyId } });
    if (!existing) throw new AppError(404, "Supplier not found");
    await prisma.$transaction([
        prisma.supplier.update({ where: { id }, data: { isActive: false } }),
        prisma.ledger.update({ where: { id: existing.ledgerId }, data: { isActive: false } }),
    ]);
    await createAuditLog({ userId, companyId, module: "masters", entityName: "Supplier", entityId: id, action: "DELETE" });
}
