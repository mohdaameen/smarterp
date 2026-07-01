import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: env.DATABASE_URL
        }
    }
});

let lastDatabaseError: string | null = null;

export function getLastDatabaseError(): string | null {
    return lastDatabaseError;
}

export async function checkDatabaseConnection(): Promise<boolean> {
    try {
        await prisma.$queryRawUnsafe("SELECT 1");
        lastDatabaseError = null;
        return true;
    } catch (error) {
        lastDatabaseError = error instanceof Error ? error.message : "Unknown database error";
        return false;
    }
}
