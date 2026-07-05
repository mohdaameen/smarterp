"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { clearSession, getSessionTtlMs, readSession, SessionData, writeSession } from "./session";

type LoginPayload = {
    accessToken: string;
    refreshToken: string;
    userName: string;
};

type AuthContextValue = {
    session: SessionData | null;
    isAuthenticated: boolean;
    login: (payload: LoginPayload) => void;
    logout: (reason?: "manual" | "expired" | "unauthorized") => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<SessionData | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        setSession(readSession());
    }, []);

    useEffect(() => {
        const onStorage = () => {
            setSession(readSession());
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    useEffect(() => {
        const onForceLogout = (event: Event) => {
            const detail = (event as CustomEvent<{ reason?: "expired" | "unauthorized" }>).detail;
            clearSession();
            setSession(null);
            const reason = detail?.reason;
            if (window.location.pathname !== "/login") {
                const query = reason ? `?reason=${reason}` : "";
                window.location.href = `/login${query}`;
            }
        };

        window.addEventListener("smarterp:logout", onForceLogout as EventListener);
        return () => window.removeEventListener("smarterp:logout", onForceLogout as EventListener);
    }, []);

    useEffect(() => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (!session) return;

        const ttl = getSessionTtlMs(session);
        timerRef.current = window.setTimeout(() => {
            clearSession();
            setSession(null);
            if (window.location.pathname !== "/login") {
                window.location.href = "/login?reason=expired";
            }
        }, Math.max(0, ttl));

        return () => {
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [session]);

    const value = useMemo<AuthContextValue>(() => ({
        session,
        isAuthenticated: Boolean(session),
        login(payload) {
            const nextSession = writeSession(payload);
            setSession(nextSession);
        },
        logout(reason = "manual") {
            clearSession();
            setSession(null);
            if (window.location.pathname !== "/login") {
                const query = reason === "manual" ? "" : `?reason=${reason}`;
                window.location.href = `/login${query}`;
            }
        },
    }), [session]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
}
