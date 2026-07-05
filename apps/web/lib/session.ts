export const SESSION_KEY = "smarterp_web_session";

export type SessionData = {
    accessToken: string;
    refreshToken: string;
    userName: string;
    accessTokenExpiresAt: number;
};

type JwtPayload = {
    exp?: number;
};

function parseJwtPayload(token: string): JwtPayload | null {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    try {
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
        const raw = atob(normalized);
        return JSON.parse(raw) as JwtPayload;
    } catch {
        return null;
    }
}

function deriveExpiry(token: string): number {
    const payload = parseJwtPayload(token);
    if (!payload?.exp) {
        // fallback to 15 minutes if token payload cannot be decoded
        return Date.now() + 15 * 60 * 1000;
    }
    return payload.exp * 1000;
}

export function isSessionExpired(session: SessionData): boolean {
    return session.accessTokenExpiresAt <= Date.now();
}

export function getSessionTtlMs(session: SessionData): number {
    return Math.max(0, session.accessTokenExpiresAt - Date.now());
}

export function readSession(): SessionData | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as SessionData;
        if (!parsed.accessToken || !parsed.refreshToken || !parsed.userName) {
            return null;
        }

        const normalized: SessionData = {
            ...parsed,
            accessTokenExpiresAt: typeof parsed.accessTokenExpiresAt === "number"
                ? parsed.accessTokenExpiresAt
                : deriveExpiry(parsed.accessToken),
        };

        if (isSessionExpired(normalized)) {
            clearSession();
            return null;
        }

        return normalized;
    } catch {
        return null;
    }
}

export function writeSession(data: Omit<SessionData, "accessTokenExpiresAt">): SessionData {
    const payload: SessionData = {
        ...data,
        accessTokenExpiresAt: deriveExpiry(data.accessToken),
    };

    if (typeof window === "undefined") return payload;

    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    return payload;
}

export function clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
}
