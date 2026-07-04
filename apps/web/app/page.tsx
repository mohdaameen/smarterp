"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readSession } from "../lib/session";

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        const session = readSession();
        if (session) {
            router.replace("/workspace");
        } else {
            router.replace("/login");
        }
    }, [router]);

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
