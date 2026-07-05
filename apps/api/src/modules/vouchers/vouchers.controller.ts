import { Request, Response, NextFunction } from "express";
import * as svc from "./vouchers.service.js";

export async function postSales(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.postSalesVoucher(req.user!.userId, req.body);
        res.status(201).json({ ok: true, data: result });
    } catch (err) { next(err); }
}

export async function postPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.postPurchaseVoucher(req.user!.userId, req.body);
        res.status(201).json({ ok: true, data: result });
    } catch (err) { next(err); }
}

export async function postReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.postReceiptVoucher(req.user!.userId, req.body);
        res.status(201).json({ ok: true, data: result });
    } catch (err) { next(err); }
}

export async function postPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.postPaymentVoucher(req.user!.userId, req.body);
        res.status(201).json({ ok: true, data: result });
    } catch (err) { next(err); }
}

export async function postContra(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.postContraVoucher(req.user!.userId, req.body);
        res.status(201).json({ ok: true, data: result });
    } catch (err) { next(err); }
}

export async function postCreditNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.postCreditNoteVoucher(req.user!.userId, req.body);
        res.status(201).json({ ok: true, data: result });
    } catch (err) { next(err); }
}

export async function postDebitNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.postDebitNoteVoucher(req.user!.userId, req.body);
        res.status(201).json({ ok: true, data: result });
    } catch (err) { next(err); }
}

export async function postJournal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.postJournalVoucher(req.user!.userId, req.body);
        res.status(201).json({ ok: true, data: result });
    } catch (err) { next(err); }
}

export async function postInventoryAdjustment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.postInventoryAdjustment(req.user!.userId, req.body);
        res.status(201).json({ ok: true, data: result });
    } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await svc.listVouchers(req.query as unknown as Parameters<typeof svc.listVouchers>[0]);
        res.json({ ok: true, ...result });
    } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const companyId = req.query["companyId"] as string;
        const voucher = await svc.getVoucher(companyId, req.params.id as string);
        res.json({ ok: true, data: voucher });
    } catch (err) { next(err); }
}

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const companyId = req.query["companyId"] as string;
        await svc.cancelVoucher(companyId, req.params.id as string, req.user!.userId, req.body.reason as string);
        res.json({ ok: true, message: "Voucher cancelled" });
    } catch (err) { next(err); }
}
