import { prisma } from "../db.js";
import { logger } from "../config/logger.js";

interface AuditParams {
    companyId?: string;
    userId?: string;
    module: string;
    entityName: string;
    entityId?: string;
    action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT";
    changes?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                companyId: params.companyId,
                userId: params.userId,
                module: params.module,
                entityName: params.entityName,
                entityId: params.entityId,
                action: params.action,
                changesJson: params.changes as object | undefined,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
            },
        });
    } catch (err) {
        // Audit log failure must not break the main flow
        logger.error("Audit log write failed", { err });
    }
}
