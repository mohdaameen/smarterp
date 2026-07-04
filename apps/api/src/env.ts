import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { z } from "zod";

const candidateEnvPaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env")
];

const resolvedEnvPath = candidateEnvPaths.find((candidatePath) => fs.existsSync(candidatePath));

if (resolvedEnvPath) {
    dotenv.config({ path: resolvedEnvPath });
}

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_ACCESS_SECRET: z.string().default("dev_access_secret_change_me_in_production"),
    JWT_REFRESH_SECRET: z.string().default("dev_refresh_secret_change_me_in_production"),
    JWT_ACCESS_TTL: z.string().default("15m"),
    JWT_REFRESH_TTL: z.string().default("7d"),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV === "production") {
    if (parsedEnv.JWT_ACCESS_SECRET.startsWith("dev_")) {
        throw new Error("JWT_ACCESS_SECRET must be set in production");
    }
    if (parsedEnv.JWT_REFRESH_SECRET.startsWith("dev_")) {
        throw new Error("JWT_REFRESH_SECRET must be set in production");
    }
}

export const env = parsedEnv;
