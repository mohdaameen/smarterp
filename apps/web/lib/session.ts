export const SESSION_KEY = "smarterp_web_session";

export type SessionData = {
    accessToken: string;
    refreshToken: string;
    userName: string;
};

export function readSession(): SessionData | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as SessionData;
        if (!parsed.accessToken || !parsed.refreshToken || !parsed.userName) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function writeSession(data: SessionData): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
}
