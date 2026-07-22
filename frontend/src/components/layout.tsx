import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Map, MessageSquare, Sun, Moon } from "lucide-react";
import { ChatWidget } from "@/components/chat-widget";
import { GOVT_LOGO_SRC } from "@/config/brand";

function SikkimLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src={GOVT_LOGO_SRC}
      alt="Government of Sikkim emblem"
      className={className}
      draggable={false}
    />
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isHome = location === "/";
  const isTransparent = isHome && !scrolled;

  const headerBg = isTransparent
    ? "bg-transparent border-b border-transparent"
    : isHome
      ? "bg-black/30 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.18)]"
      : "bg-background/95 backdrop-blur-xl border-b border-border shadow-sm";

  const txtMain = isHome ? "text-white" : "text-foreground";
  const txtMuted = isHome ? "text-white/60" : "text-muted-foreground";
  const badgeCls = isHome
    ? "bg-white/10 border-white/15 text-white/70"
    : "bg-muted border-transparent text-muted-foreground";
  const linkActive = isHome ? "text-white" : "text-foreground";
  const linkInactive = isHome
    ? "text-white/60 hover:text-white/90"
    : "text-muted-foreground hover:text-foreground";
  const linkActiveBg = isHome
    ? "bg-white/15 border-white/20"
    : "bg-primary/10 border-primary/20";
  const linkHoverBg = isHome
    ? "group-hover:bg-white/8 group-hover:border-white/10"
    : "group-hover:bg-muted group-hover:border-border";

  const navLinks = [
    { href: "/", label: "Home", icon: MessageSquare },
    { href: "/destinations", label: "Destinations", icon: Map },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 ${headerBg}`}
      >
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative w-11 h-11 shrink-0">
              <span className="absolute inset-0 rounded-full bg-primary/25 animate-glow-breathe" />
              <div className="relative w-11 h-11 rounded-full bg-white ring-1 ring-black/5 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 p-1.5 overflow-hidden">
                <SikkimLogo className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span
                className={`font-serif text-[1.05rem] font-bold tracking-tight drop-shadow-sm transition-colors duration-300 ${txtMain}`}
              >
                Sikkim Tourism
              </span>
              <span
                className={`text-[0.58rem] font-semibold tracking-[0.18em] uppercase mt-0.5 transition-colors duration-300 ${txtMuted}`}
              >
                &amp; Civil Aviation Dept.
              </span>
            </div>
          </Link>

          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-sm transition-all duration-300 ${badgeCls}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[0.65rem] font-semibold tracking-widest uppercase">
              Government of Sikkim · Official
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${active ? linkActive : linkInactive}`}
                >
                  <span
                    className={`absolute inset-0 rounded-lg transition-all duration-200 border ${active ? linkActiveBg : `bg-transparent border-transparent ${linkHoverBg}`}`}
                  />
                  <Icon className="w-3.5 h-3.5 relative" />
                  <span className="relative hidden sm:inline">{label}</span>
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}

            {/* Dark / light toggle */}
            <button
              type="button"
              onClick={() => setIsDark((v) => !v)}
              aria-label={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
              className={`relative w-9 h-9 ml-1 rounded-lg flex items-center justify-center transition-all duration-200 group ${
                isHome
                  ? "text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border"
              }`}
            >
              <span className="absolute inset-0 rounded-lg" />
              {isDark ? (
                <Sun className="w-4 h-4 relative transition-transform duration-300 rotate-0 group-hover:rotate-12" />
              ) : (
                <Moon className="w-4 h-4 relative transition-transform duration-300 rotate-0 group-hover:-rotate-12" />
              )}
            </button>
          </nav>
        </div>
      </header>

      <main
        className={`flex-1 flex flex-col relative ${isHome ? "" : "pt-16"}`}
      >
        {children}
      </main>

      <footer className="border-t border-border bg-card/60 backdrop-blur-sm py-5">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.68rem] text-muted-foreground tracking-wide">
          <span>
            © {new Date().getFullYear()} Department of Tourism &amp; Civil
            Aviation, Government of Sikkim
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70 animate-pulse" />
            All services operational
          </span>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}
