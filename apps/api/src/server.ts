import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { prisma, checkDatabaseConnection, getLastDatabaseError } from "./db.js";
import { env } from "./env.js";

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
        origin: env.FRONTEND_URL,
        credentials: true
    })
);
app.use(express.json());
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
    console.log(`API listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
    console.log(`${signal} received. Shutting down...`);
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
