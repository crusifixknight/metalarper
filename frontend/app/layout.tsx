import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";

import AuthStatus, {
  AuthStatusSkeleton,
} from "@/components/auth/AuthStatus";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Metalarper — каталог игр",
  description: "Каталог видеоигр: жанры, студии и годы выпуска.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-gray-200 dark:border-gray-800">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 p-4">
            <Link
              href="/"
              className="text-lg font-bold text-foreground hover:text-blue-600 dark:hover:text-blue-400"
            >
              Metalarper
            </Link>
            <Suspense fallback={<AuthStatusSkeleton />}>
              <AuthStatus />
            </Suspense>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
