import { prisma } from "../../db.js";
import { AppError } from "../../middlewares/error.js";
import { createAuditLog } from "../../utils/audit.js";
import type { CreateCompanyInput, CreateFinancialYearInput } from "./companies.schema.js";
import type { UserRole } from "@prisma/client";

const MAX_COMPANIES_PER_USER = 5;

export async function createCompany(userId: string, input: CreateCompanyInput) {
    const count = await prisma.company.count({ where: { ownerUserId: userId } });
    if (count >= MAX_COMPANIES_PER_USER) {
        throw new AppError(400, `Maximum of ${MAX_COMPANIES_PER_USER} companies allowed per account`);
    }

    const company = await prisma.$transaction(async (tx) => {
        const c = await tx.company.create({ data: { ...input, ownerUserId: userId } });
        await tx.userCompany.create({ data: { userId, companyId: c.id, role: "OWNER" } });
        return c;
    });

    await createAuditLog({ userId, companyId: company.id, module: "companies", entityName: "Company", entityId: company.id, action: "CREATE" });
    return company;
}

export async function getUserCompanies(userId: string) {
    const memberships = await prisma.userCompany.findMany({
        where: { userId, isActive: true },
        include: { company: true },
        orderBy: { company: { name: "asc" } },
    });
    return memberships.map((m) => ({ ...m.company, role: m.role }));
}

export async function getCompany(companyId: string) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new AppError(404, "Company not found");
    return company;
}

export async function updateCompany(companyId: string, userId: string, input: Partial<CreateCompanyInput>) {
    const company = await prisma.company.update({ where: { id: companyId }, data: input });
    await createAuditLog({ userId, companyId, module: "companies", entityName: "Company", entityId: companyId, action: "UPDATE", changes: input as Record<string, unknown> });
    return company;
}

export async function createFinancialYear(companyId: string, userId: string, input: CreateFinancialYearInput) {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (end <= start) throw new AppError(400, "endDate must be after startDate");

    const fy = await prisma.$transaction(async (tx) => {
        if (input.isCurrent) {
            await tx.financialYear.updateMany({ where: { companyId }, data: { isCurrent: false } });
        }
        return tx.financialYear.create({
            data: { companyId, label: input.label, startDate: start, endDate: end, isCurrent: input.isCurrent },
        });
    });

    await createAuditLog({ userId, companyId, module: "companies", entityName: "FinancialYear", entityId: fy.id, action: "CREATE" });
    return fy;
}

export async function getFinancialYears(companyId: string) {
    return prisma.financialYear.findMany({ where: { companyId }, orderBy: { startDate: "desc" } });
}

export async function addCompanyMember(companyId: string, actorId: string, email: string, role: Exclude<UserRole, "OWNER">) {
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) throw new AppError(404, "User not found");

    const existing = await prisma.userCompany.findUnique({
        where: { userId_companyId: { userId: targetUser.id, companyId } },
    });
    if (existing) {
        if (existing.isActive) throw new AppError(409, "User is already a member of this company");
        await prisma.userCompany.update({ where: { id: existing.id }, data: { isActive: true, role } });
    } else {
        await prisma.userCompany.create({ data: { userId: targetUser.id, companyId, role } });
    }

    await createAuditLog({ userId: actorId, companyId, module: "companies", entityName: "UserCompany", action: "CREATE" });
    return { message: "Member added successfully" };
}

export async function getCompanyMembers(companyId: string) {
    return prisma.userCompany.findMany({
        where: { companyId, isActive: true },
        include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
        orderBy: { user: { fullName: "asc" } },
    });
}
