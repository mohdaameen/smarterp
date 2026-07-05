"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest } from "../../lib/api-client";
import { LoginResponse } from "../../lib/contracts";
import { useAuth } from "../../lib/auth-context";

export default function LoginPage() {
    const router = useRouter();
    const { isAuthenticated, login } = useAuth();
    const [form, setForm] = useState({ email: "", password: "" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isAuthenticated) {
            router.replace("/workspace");
            return;
        }

        const reason = new URLSearchParams(window.location.search).get("reason");
        if (reason === "expired") {
            setError("Your session expired. Please login again.");
        } else if (reason === "unauthorized") {
            setError("Your session is no longer valid. Please login again.");
        }
    }, [isAuthenticated, router]);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            const data = await apiRequest<LoginResponse>("/auth/login", {
                method: "POST",
                body: form
            });
            login({
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                userName: data.user.fullName
            });
            router.replace("/workspace");
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.details?.[0]?.message ?? err.message);
            } else {
                setError("Unable to login right now.");
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="shell auth-shell">
            <section className="card auth-card">
                <p className="kicker">SmartERP</p>
                <h1>Login</h1>
                <p className="subtle">Sign in to access your modules and entries workspace.</p>
                <form onSubmit={onSubmit}>
                    <label>Email</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        required
                    />
                    <label>Password</label>
                    <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        required
                    />
                    {error ? <p className="inline-error">{error}</p> : null}
                    <button disabled={busy}>{busy ? "Signing in..." : "Login"}</button>
                </form>
                <p className="subtle">New user? <Link href="/register">Register here</Link></p>
            </section>
        </main>
    );
}
