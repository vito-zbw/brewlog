import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrewLog",
  description: "Specialty Coffee Discovery & Review Platform",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-lg text-cream/80 hover:text-cream hover:bg-espresso-light transition-colors text-sm font-medium"
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream">
        <nav className="bg-espresso text-cream shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">&#9749;</span>
                <span className="text-xl font-bold font-[Playfair_Display]">
                  BrewLog
                </span>
              </Link>
              <div className="flex items-center gap-1">
                <NavLink href="/beans">Beans</NavLink>
                <NavLink href="/map">Map</NavLink>
                <NavLink href="/visits">Visits</NavLink>
                <Link
                  href="/visits/new"
                  className="ml-2 px-4 py-2 bg-terracotta hover:bg-terracotta-light text-cream rounded-lg text-sm font-medium transition-colors"
                >
                  + Log Visit
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
