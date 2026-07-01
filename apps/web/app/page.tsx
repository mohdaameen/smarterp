"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
    ok: boolean;
    service: string;
    timestamp: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function HomePage() {
    const [status, setStatus] = useState<"loading" | "up" | "down">("loading");
    const [payload, setPayload] = useState<HealthResponse | null>(null);

    useEffect(() => {
        async function checkApi() {
            try {
                const response = await fetch(`${apiBaseUrl}/health`);
                if (!response.ok) {
                    throw new Error("API returned non-200 response");
                }
                const data = (await response.json()) as HealthResponse;
                setPayload(data);
                setStatus("up");
            } catch {
                setStatus("down");
            }
        }

        void checkApi();
    }, []);

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10">
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">SmartERP</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Frontend Setup Complete</h1>
                <p className="mt-3 text-slate-600">
                    Next.js + Tailwind is running. Backend connectivity test:
                </p>

                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-700">
                        API Base URL: <span className="font-mono">{apiBaseUrl}</span>
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                        Status:{" "}
                        <span className={status === "up" ? "font-semibold text-emerald-600" : status === "down" ? "font-semibold text-rose-600" : "font-semibold text-amber-600"}>
                            {status === "loading" ? "Checking..." : status === "up" ? "Connected" : "Unavailable"}
                        </span>
                    </p>
                    {payload ? (
                        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                            {JSON.stringify(payload, null, 2)}
                        </pre>
                    ) : null}
                </div>
            </section>
        </main>
    );
}
