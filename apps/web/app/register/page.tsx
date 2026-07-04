"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest } from "../../lib/api-client";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ fullName: "", email: "", password: "" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState("");

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError("");
        setOk("");
        try {
            await apiRequest("/auth/register", { method: "POST", body: form });
            setOk("Registration successful. Please login.");
            setTimeout(() => router.push("/login"), 800);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.details?.[0]?.message ?? err.message);
            } else {
                setError("Unable to register right now.");
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="shell auth-shell">
            <section className="card auth-card">
                <p className="kicker">SmartERP</p>
                <h1>Create Account</h1>
                <p className="subtle">Use this once, then login and continue to workspace setup.</p>
                <form onSubmit={onSubmit}>
                    <label>Full Name</label>
                    <input
                        value={form.fullName}
                        onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                        required
                        minLength={2}
                    />
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
                        minLength={8}
                    />
                    {error ? <p className="inline-error">{error}</p> : null}
                    {ok ? <p className="inline-ok">{ok}</p> : null}
                    <button disabled={busy}>{busy ? "Creating..." : "Register"}</button>
                </form>
                <p className="subtle">Already have an account? <Link href="/login">Go to login</Link></p>
            </section>
        </main>
    );
}
