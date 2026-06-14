import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrewLog — 精品咖啡探店日志",
  description: "精品咖啡豆数据库与探店记录平台",
};

function NavLink({
  href,
  testId,
  children,
  prefetch,
}: {
  href: string;
  testId: string;
  children: React.ReactNode;
  // Protected destinations pass prefetch={false}: their RSC prefetch runs the
  // auth() proxy and would rotate (re-issue) the session cookie, which can
  // resurrect a just-cleared session during logout. See src/proxy.ts.
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      prefetch={prefetch}
      className="px-2 sm:px-3 py-2 rounded-lg text-cream/80 hover:text-cream hover:bg-espresso-light transition-colors text-sm font-medium whitespace-nowrap"
    >
      {children}
    </Link>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // DB row (not the JWT) so a renamed name or changed avatar shows immediately
  // after router.refresh(). Logged-out (or pre-Phase-3 id-less tokens) → null.
  const user = await getCurrentUser();
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
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <span className="text-2xl">&#9749;</span>
                <span className="text-xl font-bold font-[Playfair_Display]">
                  BrewLog
                </span>
              </Link>
              <div className="flex flex-nowrap items-center gap-1 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] min-w-0 flex-1 justify-end sm:flex-initial">
                <NavLink href="/beans" testId="nav-beans">咖啡豆</NavLink>
                <NavLink href="/cafes" testId="nav-cafes">咖啡馆</NavLink>
                <NavLink href="/visits" testId="nav-visits">探店记录</NavLink>
                <NavLink href="/crawls" testId="nav-crawls">咖啡之旅</NavLink>
                <NavLink href="/leaderboard" testId="nav-leaderboard">排行榜</NavLink>
                {user && (
                  <NavLink href="/feed" testId="nav-feed" prefetch={false}>动态</NavLink>
                )}
                <Link
                  href="/log"
                  data-testid="nav-log"
                  prefetch={false}
                  className="ml-2 px-4 py-2 bg-terracotta hover:bg-terracotta-light text-cream rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  + 记录探店
                </Link>
                {user ? (
                  <>
                    <Link
                      href={`/users/${user.id}`}
                      data-testid="nav-profile"
                      className="ml-2 flex items-center gap-2 px-2 py-1.5 rounded-lg text-cream/90 hover:text-cream hover:bg-espresso-light transition-colors text-sm font-medium"
                    >
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.image}
                          alt={user.name ?? "头像"}
                          className="h-7 w-7 rounded-full"
                        />
                      ) : (
                        <span className="h-7 w-7 rounded-full bg-terracotta text-cream flex items-center justify-center text-xs font-semibold">
                          {(user.name ?? "?").charAt(0)}
                        </span>
                      )}
                      <span className="hidden sm:inline whitespace-nowrap">
                        {user.name}
                      </span>
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await signOut({ redirectTo: "/login" });
                      }}
                    >
                      <button
                        type="submit"
                        data-testid="nav-logout"
                        className="px-2 py-2 text-cream/70 hover:text-cream text-sm whitespace-nowrap transition-colors"
                      >
                        退出登录
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/login"
                    data-testid="nav-login"
                    className="ml-2 px-3 py-2 rounded-lg text-cream/80 hover:text-cream hover:bg-espresso-light transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    登录
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
