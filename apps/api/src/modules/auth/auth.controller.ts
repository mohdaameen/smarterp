import { Request, Response, NextFunction } from "express";
import * as service from "./auth.service.js";

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await service.registerUser(req.body);
        res.status(201).json({ ok: true, data: user });
    } catch (err) {
        next(err);
    }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await service.loginUser(req.body, req.ip);
        res.json({ ok: true, data: result });
    } catch (err) {
        next(err);
    }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await service.refreshAccessToken(req.body.refreshToken as string);
        res.json({ ok: true, data: result });
    } catch (err) {
        next(err);
    }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await service.getProfile(req.user!.userId);
        res.json({ ok: true, data: user });
    } catch (err) {
        next(err);
    }
}
