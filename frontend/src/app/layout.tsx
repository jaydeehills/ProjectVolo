import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Volo — Prediction Market Research",
  description: "Prediction market research and analysis",
};

// Injected before React hydrates to prevent flash of wrong theme.
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark' || stored === 'auto'
      ? stored : 'auto';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme === 'auto' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
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
        {/* Anti-FOUC: sets correct theme class before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
