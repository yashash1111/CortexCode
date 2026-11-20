import type { Metadata } from "next";
import QueryProvider from "../providers/QueryProvider";
import { ToastProvider } from "../providers/ToastProvider";
import { AuthProvider } from "../providers/AuthProvider";
import { ThemeProvider } from "../providers/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CortexCode | AI Developer Workspace",
  description: "Context-aware AI for your codebase. Ask questions, detect bugs, and review pull requests instantly.",
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var mode = localStorage.getItem('cortexcode_theme') || 'system';
    var resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    if (resolved !== 'light' && resolved !== 'dark') resolved = 'dark';
    var root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased bg-[var(--bg-main)] text-[var(--text-primary)] font-sans">
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
