import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface AccessTokenPayload {
    userId: string;
    email: string;
    fullName: string;
}

export interface RefreshTokenPayload {
    userId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL } as jwt.SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
