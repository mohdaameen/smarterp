"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

export default function HomePage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            router.replace("/workspace");
        } else {
            router.replace("/login");
        }
    }, [isAuthenticated, router]);

    return (
        <main className="shell auth-shell">
            <section className="card auth-card">
                <p className="kicker">SmartERP</p>
                <h1>Preparing workspace...</h1>
                <p className="subtle">Redirecting to the correct page.</p>
            </section>
        </main>
    );
}
