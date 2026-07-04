import { z } from "zod";
import { StockValuationMethod } from "@prisma/client";

export const createCompanySchema = z.object({
    name: z.string().min(2).max(180),
    legalName: z.string().max(220).optional(),
    gstNumber: z.string().max(20).optional(),
    panNumber: z.string().max(20).optional(),
    stateCode: z.string().max(10).optional(),
    addressLine1: z.string().max(255).optional(),
    addressLine2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(80).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().optional(),
    stockValuationMethod: z.nativeEnum(StockValuationMethod).optional(),
    allowNegativeStock: z.boolean().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const createFinancialYearSchema = z.object({
    label: z.string().min(1).max(30),
    startDate: z.string().date(),
    endDate: z.string().date(),
    isCurrent: z.boolean().default(false),
});

export const addMemberSchema = z.object({
    email: z.string().email(),
    role: z.enum(["ADMIN", "ACCOUNTANT", "OPERATOR", "VIEWER"]),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreateFinancialYearInput = z.infer<typeof createFinancialYearSchema>;
