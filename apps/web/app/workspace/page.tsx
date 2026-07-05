"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WorkspacePage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/workspace/entries");
    }, [router]);

    return (
        <main className="shell">
            <section className="card">
                <p className="kicker">Workspace</p>
                <h1>Opening entries module...</h1>
                <p className="subtle">Redirecting to your default module page.</p>
            </section>
        </main>
    );
}
