"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

const modules = [
    { href: "/workspace/entries", label: "Entries" },
    { href: "/workspace/companies", label: "Companies" },
    { href: "/workspace/masters", label: "Masters" },
    { href: "/workspace/customers", label: "Customers" },
    { href: "/workspace/suppliers", label: "Suppliers" },
    { href: "/workspace/inventory", label: "Inventory" },
    { href: "/workspace/billing", label: "Billing" },
    { href: "/workspace/vouchers", label: "Vouchers" },
    { href: "/workspace/banking", label: "Banking" },
    { href: "/workspace/gst", label: "GST" },
    { href: "/workspace/reports", label: "Reports" },
];

export function WorkspaceShell({ children }: Readonly<{ children: React.ReactNode }>) {
    const pathname = usePathname();
    const router = useRouter();
    const { session, logout } = useAuth();

    useEffect(() => {
        function submitActiveForm() {
            const activeEl = document.activeElement as HTMLElement | null;
            const nearestForm = activeEl?.closest("form");
            if (nearestForm) {
                nearestForm.requestSubmit();
                return;
            }
            const firstForm = document.querySelector("main form") as HTMLFormElement | null;
            if (firstForm) {
                firstForm.requestSubmit();
            }
        }

        function cancelEdit() {
            const cancelBtn = Array.from(document.querySelectorAll("button.ghost"))
                .find((node) => (node.textContent || "").toLowerCase().includes("cancel")) as HTMLButtonElement | undefined;
            if (cancelBtn) cancelBtn.click();
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
                const key = event.key.toLowerCase();
                const routeMap: Record<string, string> = {
                    c: "/workspace/companies",
                    m: "/workspace/masters",
                    i: "/workspace/inventory",
                    b: "/workspace/billing",
                    v: "/workspace/vouchers",
                    r: "/workspace/reports",
                };

                if (key in routeMap) {
                    event.preventDefault();
                    router.push(routeMap[key]);
                    return;
                }

                if (key === "l") {
                    event.preventDefault();
                    logout("manual");
                    return;
                }

                if (key === "s") {
                    event.preventDefault();
                    submitActiveForm();
                    return;
                }
            }

            if (event.key === "Escape") {
                cancelEdit();
            }
        }

        globalThis.window.addEventListener("keydown", onKeyDown);
        return () => globalThis.window.removeEventListener("keydown", onKeyDown);
    }, [logout, router]);

    return (
        <div className="workspace-layout">
            <aside className="workspace-sidebar card">
                <p className="kicker">SmartERP</p>
                <h2 className="workspace-title">Workspace</h2>
                <p className="subtle">{session?.userName ?? "User"}</p>
                <p className="subtle">Shortcuts: Alt+C/M/I/B/V/R, Alt+S, Esc, Alt+L</p>
                <nav className="workspace-nav" aria-label="Workspace modules">
                    {modules.map((item) => {
                        const active = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={active ? "workspace-nav-link active" : "workspace-nav-link"}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <button className="danger" onClick={() => logout("manual")}>Logout</button>
            </aside>
            <section className="workspace-content">{children}</section>
        </div>
    );
}
