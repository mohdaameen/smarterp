import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";

export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string
    ) {
        super(message);
        this.name = "AppError";
    }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof ZodError) {
        res.status(400).json({
            ok: false,
            error: "Validation error",
            details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
        });
        return;
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({ ok: false, error: err.message });
        return;
    }

    logger.error("Unhandled error", { err, path: req.path, method: req.method });
    res.status(500).json({ ok: false, error: "Internal server error" });
}
