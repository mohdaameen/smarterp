"use client";

import { Alert } from "../lib/use-workspace-data";

export function InlineAlert({ alert }: { alert?: Alert }) {
    if (!alert) return null;
    return <p className={alert.type === "ok" ? "inline-ok" : "inline-error"}>{alert.message}</p>;
}
