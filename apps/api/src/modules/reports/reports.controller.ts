import { Request, Response, NextFunction } from "express";
import * as svc from "./reports.service.js";

function commonParams(req: Request) {
    return {
        companyId: req.query["companyId"] as string,
        financialYearId: req.query["financialYearId"] as string | undefined,
        fromDate: req.query["fromDate"] as string | undefined,
        toDate: req.query["toDate"] as string | undefined,
    };
}

function pagingParams(req: Request) {
    const page = Math.max(1, Number(req.query["page"]) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
    return { page, limit };
}

export async function stockSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await svc.getStockSummary({
            ...commonParams(req),
            stockGroupId: req.query["stockGroupId"] as string | undefined,
        });
        res.json({ ok: true, data });
    } catch (err) { next(err); }
}

export async function salesRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.getSalesRegister({ ...commonParams(req), ...pagingParams(req) });
        res.json({ ok: true, ...result });
    } catch (err) { next(err); }
}

export async function purchaseRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.getPurchaseRegister({ ...commonParams(req), ...pagingParams(req) });
        res.json({ ok: true, ...result });
    } catch (err) { next(err); }
}

export async function outstandingCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await svc.getOutstandingCustomers(commonParams(req));
        res.json({ ok: true, data });
    } catch (err) { next(err); }
}

export async function outstandingSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await svc.getOutstandingSuppliers(commonParams(req));
        res.json({ ok: true, data });
    } catch (err) { next(err); }
}

export async function trialBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.getTrialBalance(commonParams(req));
        res.json({ ok: true, ...result });
    } catch (err) { next(err); }
}

export async function balanceSheet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.getBalanceSheet(commonParams(req));
        res.json({ ok: true, ...result });
    } catch (err) { next(err); }
}

export async function profitLoss(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.getProfitLoss(commonParams(req));
        res.json({ ok: true, ...result });
    } catch (err) { next(err); }
}

export async function cashFlow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.getCashFlow(commonParams(req));
        res.json({ ok: true, ...result });
    } catch (err) { next(err); }
}
