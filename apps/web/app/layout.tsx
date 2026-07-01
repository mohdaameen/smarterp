import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "SmartERP",
    description: "Tally-inspired billing, inventory and accounting platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
