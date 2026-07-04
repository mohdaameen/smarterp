import { prisma } from "../../db.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import { AppError } from "../../middlewares/error.js";
import { createAuditLog } from "../../utils/audit.js";
import type { RegisterInput, LoginInput } from "./auth.schema.js";

export async function registerUser(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, "Email already registered");

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
        data: { fullName: input.fullName, email: input.email, passwordHash, phone: input.phone },
        select: { id: true, fullName: true, email: true, phone: true, createdAt: true },
    });

    await createAuditLog({
        userId: user.id,
        module: "auth",
        entityName: "User",
        entityId: user.id,
        action: "CREATE",
    });

    return user;
}

export async function loginUser(input: LoginInput, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.isActive) throw new AppError(401, "Invalid credentials");

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) throw new AppError(401, "Invalid credentials");

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = signAccessToken({ userId: user.id, email: user.email, fullName: user.fullName });
    const refreshToken = signRefreshToken({ userId: user.id });

    await createAuditLog({
        userId: user.id,
        module: "auth",
        entityName: "User",
        entityId: user.id,
        action: "LOGIN",
        ipAddress,
    });

    return {
        accessToken,
        refreshToken,
        user: { id: user.id, fullName: user.fullName, email: user.email },
    };
}

export async function refreshAccessToken(refreshToken: string) {
    let userId: string;
    try {
        const payload = verifyRefreshToken(refreshToken);
        userId = payload.userId;
    } catch {
        throw new AppError(401, "Invalid or expired refresh token");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new AppError(401, "User not found or inactive");

    const accessToken = signAccessToken({ userId: user.id, email: user.email, fullName: user.fullName });
    return { accessToken };
}

export async function getProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, email: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) throw new AppError(404, "User not found");
    return user;
}
