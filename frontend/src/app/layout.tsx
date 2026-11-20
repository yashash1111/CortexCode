import type { Metadata } from "next";
import QueryProvider from "../providers/QueryProvider";
import { ToastProvider } from "../providers/ToastProvider";
import { AuthProvider } from "../providers/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CortexCode | AI Developer Workspace",
  description: "Context-aware AI for your codebase. Ask questions, detect bugs, and review pull requests instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-zinc-50 font-sans">
        <QueryProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
