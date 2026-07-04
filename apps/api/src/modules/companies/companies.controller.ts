import { Request, Response, NextFunction } from "express";
import * as service from "./companies.service.js";

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const company = await service.createCompany(req.user!.userId, req.body);
        res.status(201).json({ ok: true, data: company });
    } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const companies = await service.getUserCompanies(req.user!.userId);
        res.json({ ok: true, data: companies });
    } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const company = await service.getCompany(req.params.companyId as string);
        res.json({ ok: true, data: company });
    } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const company = await service.updateCompany(req.params.companyId as string, req.user!.userId, req.body);
        res.json({ ok: true, data: company });
    } catch (err) { next(err); }
}

export async function createFY(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const fy = await service.createFinancialYear(req.params.companyId as string, req.user!.userId, req.body);
        res.status(201).json({ ok: true, data: fy });
    } catch (err) { next(err); }
}

export async function listFY(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const fys = await service.getFinancialYears(req.params.companyId as string);
        res.json({ ok: true, data: fys });
    } catch (err) { next(err); }
}

export async function addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await service.addCompanyMember(
            req.params.companyId as string,
            req.user!.userId,
            req.body.email as string,
            req.body.role as "ADMIN" | "ACCOUNTANT" | "OPERATOR" | "VIEWER"
        );
        res.status(201).json({ ok: true, data: result });
    } catch (err) { next(err); }
}

export async function listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const members = await service.getCompanyMembers(req.params.companyId as string);
        res.json({ ok: true, data: members });
    } catch (err) { next(err); }
}
