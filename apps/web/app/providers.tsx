"use client";

import { AuthProvider } from "../lib/auth-context";
import { GlobalFeedback } from "../components/global-feedback";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <AuthProvider>
            {children}
            <GlobalFeedback />
        </AuthProvider>
    );
}
