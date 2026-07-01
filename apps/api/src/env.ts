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
    JWT_SECRET: z.string().optional()
});

const parsedEnv = envSchema.parse(process.env);

if (!parsedEnv.JWT_SECRET || parsedEnv.JWT_SECRET.trim() === "") {
    if (parsedEnv.NODE_ENV === "production") {
        throw new Error("JWT_SECRET is required in production");
    }
    parsedEnv.JWT_SECRET = "dev_jwt_secret_change_me";
}

export const env = parsedEnv;
