import { z } from "zod";

export const registerSchema = z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100),
    phone: z.string().max(20).optional(),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const refreshSchema = z.object({
    refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
