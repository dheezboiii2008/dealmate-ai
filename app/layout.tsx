import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "DealMate AI", description: "AI-negotiated freelance contracts and payments" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
