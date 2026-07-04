import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { verifyAccessToken } from "../utils/jwt.js";
import { prisma } from "../db.js";
import { AppError } from "./error.js";

const ROLE_HIERARCHY: UserRole[] = ["VIEWER", "OPERATOR", "ACCOUNTANT", "ADMIN", "OWNER"];

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
        next(new AppError(401, "Missing or invalid Authorization header"));
        return;
    }
    const token = authHeader.slice(7);
    try {
        const payload = verifyAccessToken(token);
        req.user = { userId: payload.userId, email: payload.email, fullName: payload.fullName };
        next();
    } catch {
        next(new AppError(401, "Invalid or expired access token"));
    }
}

/**
 * Middleware factory: verifies the authenticated user is a member of the target company
 * with at least `minRole`. Reads companyId from req.params.companyId or req.query.companyId.
 */
export function requireCompanyMember(minRole: UserRole = "VIEWER") {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        const companyId =
            (req.params["companyId"] as string | undefined) ??
            (req.query["companyId"] as string | undefined);

        if (!companyId) {
            next(new AppError(400, "companyId is required"));
            return;
        }

        const userId = req.user!.userId;
        try {
            const membership = await prisma.userCompany.findUnique({
                where: { userId_companyId: { userId, companyId } },
            });

            if (!membership || !membership.isActive) {
                next(new AppError(403, "Access denied to this company"));
                return;
            }

            const userRoleIdx = ROLE_HIERARCHY.indexOf(membership.role);
            const minRoleIdx = ROLE_HIERARCHY.indexOf(minRole);
            if (userRoleIdx < minRoleIdx) {
                next(new AppError(403, "Insufficient role for this action"));
                return;
            }

            next();
        } catch {
            next(new AppError(500, "Failed to verify company access"));
        }
    };
}
