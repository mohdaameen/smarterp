import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            next(err);
        }
    };
}

export function validateQuery(schema: ZodSchema) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            req.query = schema.parse(req.query) as typeof req.query;
            next();
        } catch (err) {
            next(err);
        }
    };
}
