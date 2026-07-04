import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { prisma, checkDatabaseConnection, getLastDatabaseError } from "./db.js";
import { env } from "./env.js";
import { errorHandler } from "./middlewares/error.js";
import { logger } from "./config/logger.js";
import authRoutes from "./modules/auth/auth.routes.js";
import companiesRoutes from "./modules/companies/companies.routes.js";
import mastersRoutes from "./modules/masters/masters.routes.js";
import vouchersRoutes from "./modules/vouchers/vouchers.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import "./types/index.js";

const app = express();
app.disable("x-powered-by");

const openApiSpec = {
    openapi: "3.0.3",
    info: {
        title: "SmartERP API",
        version: "0.1.0",
        description: "Core backend API for SmartERP"
    },
    servers: [{ url: `http://localhost:${env.PORT}` }],
    paths: {
        "/": {
            get: {
                summary: "API welcome",
                responses: {
                    "200": {
                        description: "API running message"
                    }
                }
            }
        },
        "/health": {
            get: {
                summary: "Service health check",
                responses: {
                    "200": {
                        description: "Current API and DB status"
                    }
                }
            }
        }
    }
};

app.use(
    cors({
        origin: env.CORS_ORIGIN,
        credentials: true
    })
);
app.use(express.json());

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/companies", companiesRoutes);
app.use("/api/v1/masters", mastersRoutes);
app.use("/api/v1/vouchers", vouchersRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.get("/openapi.json", (_req, res) => {
    res.json(openApiSpec);
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.get("/health", async (_req, res) => {
    const isDbUp = await checkDatabaseConnection();
    const db = isDbUp ? "up" : "down";

    res.json({
        ok: true,
        service: "smarterp-api",
        db,
        ...(isDbUp || env.NODE_ENV === "production" ? {} : { dbError: getLastDatabaseError() }),
        timestamp: new Date().toISOString()
    });
});

app.get("/", (_req, res) => {
    res.json({ message: "SmartERP API is running" });
});

const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
});

// ─── Central error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

async function shutdown(signal: string) {
    logger.info(`${signal} received. Shutting down...`);
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});
