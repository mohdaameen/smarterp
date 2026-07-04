import { Request, Response, NextFunction } from "express";
import * as svc from "./masters.service.js";

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function cid(req: Request) {
    return (req.query.companyId ?? req.params.companyId) as string;
}
function pid(req: Request) {
    return req.params.id as string;
}

// ─── Ledger Groups ────────────────────────────────────────────────────────────
export const createLedgerGroup: Handler = async (req, res, next) => {
    try { res.status(201).json({ ok: true, data: await svc.createLedgerGroup(cid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const listLedgerGroups: Handler = async (req, res, next) => {
    try { res.json({ ok: true, ...await svc.listLedgerGroups(cid(req), req) }); } catch (e) { next(e); }
};
export const getLedgerGroup: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.getLedgerGroup(cid(req), pid(req)) }); } catch (e) { next(e); }
};
export const updateLedgerGroup: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.updateLedgerGroup(cid(req), pid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const deleteLedgerGroup: Handler = async (req, res, next) => {
    try { await svc.deleteLedgerGroup(cid(req), pid(req), req.user!.userId); res.json({ ok: true }); } catch (e) { next(e); }
};

// ─── Ledgers ──────────────────────────────────────────────────────────────────
export const createLedger: Handler = async (req, res, next) => {
    try { res.status(201).json({ ok: true, data: await svc.createLedger(cid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const listLedgers: Handler = async (req, res, next) => {
    try { res.json({ ok: true, ...await svc.listLedgers(cid(req), req) }); } catch (e) { next(e); }
};
export const getLedger: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.getLedger(cid(req), pid(req)) }); } catch (e) { next(e); }
};
export const updateLedger: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.updateLedger(cid(req), pid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const deleteLedger: Handler = async (req, res, next) => {
    try { await svc.deleteLedger(cid(req), pid(req), req.user!.userId); res.json({ ok: true }); } catch (e) { next(e); }
};

// ─── Units ────────────────────────────────────────────────────────────────────
export const createUnit: Handler = async (req, res, next) => {
    try { res.status(201).json({ ok: true, data: await svc.createUnit(cid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const listUnits: Handler = async (req, res, next) => {
    try { res.json({ ok: true, ...await svc.listUnits(cid(req), req) }); } catch (e) { next(e); }
};
export const getUnit: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.getUnit(cid(req), pid(req)) }); } catch (e) { next(e); }
};
export const updateUnit: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.updateUnit(cid(req), pid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const deleteUnit: Handler = async (req, res, next) => {
    try { await svc.deleteUnit(cid(req), pid(req), req.user!.userId); res.json({ ok: true }); } catch (e) { next(e); }
};

// ─── Stock Groups ─────────────────────────────────────────────────────────────
export const createStockGroup: Handler = async (req, res, next) => {
    try { res.status(201).json({ ok: true, data: await svc.createStockGroup(cid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const listStockGroups: Handler = async (req, res, next) => {
    try { res.json({ ok: true, ...await svc.listStockGroups(cid(req), req) }); } catch (e) { next(e); }
};
export const getStockGroup: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.getStockGroup(cid(req), pid(req)) }); } catch (e) { next(e); }
};
export const updateStockGroup: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.updateStockGroup(cid(req), pid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const deleteStockGroup: Handler = async (req, res, next) => {
    try { await svc.deleteStockGroup(cid(req), pid(req), req.user!.userId); res.json({ ok: true }); } catch (e) { next(e); }
};

// ─── Stock Items ──────────────────────────────────────────────────────────────
export const createStockItem: Handler = async (req, res, next) => {
    try { res.status(201).json({ ok: true, data: await svc.createStockItem(cid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const listStockItems: Handler = async (req, res, next) => {
    try { res.json({ ok: true, ...await svc.listStockItems(cid(req), req) }); } catch (e) { next(e); }
};
export const getStockItem: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.getStockItem(cid(req), pid(req)) }); } catch (e) { next(e); }
};
export const updateStockItem: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.updateStockItem(cid(req), pid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const deleteStockItem: Handler = async (req, res, next) => {
    try { await svc.deleteStockItem(cid(req), pid(req), req.user!.userId); res.json({ ok: true }); } catch (e) { next(e); }
};

// ─── Customers ────────────────────────────────────────────────────────────────
export const createCustomer: Handler = async (req, res, next) => {
    try { res.status(201).json({ ok: true, data: await svc.createCustomer(cid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const listCustomers: Handler = async (req, res, next) => {
    try { res.json({ ok: true, ...await svc.listCustomers(cid(req), req) }); } catch (e) { next(e); }
};
export const getCustomer: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.getCustomer(cid(req), pid(req)) }); } catch (e) { next(e); }
};
export const updateCustomer: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.updateCustomer(cid(req), pid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const deleteCustomer: Handler = async (req, res, next) => {
    try { await svc.deleteCustomer(cid(req), pid(req), req.user!.userId); res.json({ ok: true }); } catch (e) { next(e); }
};

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const createSupplier: Handler = async (req, res, next) => {
    try { res.status(201).json({ ok: true, data: await svc.createSupplier(cid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const listSuppliers: Handler = async (req, res, next) => {
    try { res.json({ ok: true, ...await svc.listSuppliers(cid(req), req) }); } catch (e) { next(e); }
};
export const getSupplier: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.getSupplier(cid(req), pid(req)) }); } catch (e) { next(e); }
};
export const updateSupplier: Handler = async (req, res, next) => {
    try { res.json({ ok: true, data: await svc.updateSupplier(cid(req), pid(req), req.user!.userId, req.body) }); } catch (e) { next(e); }
};
export const deleteSupplier: Handler = async (req, res, next) => {
    try { await svc.deleteSupplier(cid(req), pid(req), req.user!.userId); res.json({ ok: true }); } catch (e) { next(e); }
};
