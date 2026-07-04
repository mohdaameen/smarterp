import { Request } from "express";
import type { PaginatedResult } from "../types/index.js";

export function parsePagination(req: Request) {
    const page = Math.max(1, Number(req.query["page"]) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
    const skip = (page - 1) * limit;
    const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
    return { page, limit, skip, search };
}

export function paginate<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
    return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}
