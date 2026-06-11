import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrewLog — 精品咖啡探店日志",
  description: "精品咖啡豆数据库与探店记录平台",
};

function NavLink({
  href,
  testId,
  children,
}: {
  href: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="px-2 sm:px-3 py-2 rounded-lg text-cream/80 hover:text-cream hover:bg-espresso-light transition-colors text-sm font-medium whitespace-nowrap"
    >
      {children}
    </Link>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* App Router root layout applies to every page; the no-page-custom-font rule targets the pages router. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&family=Noto+Sans+SC:wght@300;400;500;600&family=Noto+Serif+SC:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream">
        <nav className="bg-espresso text-cream shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-y-1 py-2 min-h-16 sm:h-16 sm:py-0">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">&#9749;</span>
                <span className="text-xl font-bold font-[Playfair_Display]">
                  BrewLog
                </span>
              </Link>
              <div className="flex items-center gap-1">
                <NavLink href="/beans" testId="nav-beans">咖啡豆</NavLink>
                <NavLink href="/cafes" testId="nav-cafes">咖啡馆</NavLink>
                <NavLink href="/visits" testId="nav-visits">探店记录</NavLink>
                <Link
                  href="/log"
                  data-testid="nav-log"
                  className="ml-2 px-4 py-2 bg-terracotta hover:bg-terracotta-light text-cream rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  + 记录探店
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
