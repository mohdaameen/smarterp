"use client";

import { useEffect, useState } from "react";

type ToastType = "ok" | "error";

type Toast = {
    id: number;
    type: ToastType;
    message: string;
};

export function GlobalFeedback() {
    const [banner, setBanner] = useState<string>("");
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        let idSeq = 0;

        function onApiError(evt: Event) {
            const customEvt = evt as CustomEvent<{ message?: string }>;
            const message = customEvt.detail?.message || "API request failed";
            setBanner(message);
            setTimeout(() => setBanner(""), 6000);
        }

        function onToast(evt: Event) {
            const customEvt = evt as CustomEvent<{ type?: ToastType; message?: string }>;
            const message = customEvt.detail?.message;
            if (!message) return;
            const type = customEvt.detail?.type === "error" ? "error" : "ok";
            const next: Toast = { id: ++idSeq, type, message };
            setToasts((prev) => [...prev, next]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((item) => item.id !== next.id));
            }, 3200);
        }

        window.addEventListener("smarterp:api-error", onApiError as EventListener);
        window.addEventListener("smarterp:toast", onToast as EventListener);

        return () => {
            window.removeEventListener("smarterp:api-error", onApiError as EventListener);
            window.removeEventListener("smarterp:toast", onToast as EventListener);
        };
    }, []);

    return (
        <>
            {banner ? <div className="global-banner error">{banner}</div> : null}
            {toasts.length ? (
                <div className="toast-stack" aria-live="polite">
                    {toasts.map((toast) => (
                        <div key={toast.id} className={toast.type === "ok" ? "toast ok" : "toast error"}>{toast.message}</div>
                    ))}
                </div>
            ) : null}
        </>
    );
}
