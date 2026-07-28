/**
 * "Live-site preview" demo page.
 *
 * Purpose: instead of maintaining a second project just to show what the
 * chat widget looks like sitting on the actual Tourism & Civil Aviation
 * Department homepage, we recreate that homepage's chrome (header, nav,
 * hero) here as a static mock — and let the *real* <ChatWidget /> (already
 * mounted globally in Layout, same backend, same conversation logic) float
 * on top of it. One project, one backend, zero duplication.
 *
 * This is a visual mock only — the nav links, dropdowns, and "Quick Links"
 * carousel are non-functional placeholders that mirror the real site's
 * layout so reviewers can picture the widget in context.
 */
import { Link } from "wouter";
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Landmark, FileText, ScrollText, ArrowLeft, Menu, Building2, Bike } from "lucide-react";
import { GOVT_LOGO_SRC } from "@/config/brand";
import { heroVideo } from "@/config/hero-media";

const NAV_ITEMS: { label: string; hasDropdown?: boolean; external?: boolean; active?: boolean }[] = [
    { label: "Home", active: true },
    { label: "About", hasDropdown: true },
    { label: "Permit Services", hasDropdown: true },
    { label: "Registered Establishments", hasDropdown: true },
    { label: "Updates", hasDropdown: true },
    { label: "RTI" },
    { label: "Contact Us" },
    { label: "Payment", external: true },
    { label: "Important Links", hasDropdown: true },
];

const QUICK_LINKS = [
    { label: "Nathula Permit", icon: Landmark, tint: "bg-emerald-50 text-emerald-600" },
    { label: "Notices", icon: ScrollText, tint: "bg-amber-50 text-amber-600" },
    { label: "Atithi Gis", icon: Building2, tint: "bg-sky-50 text-sky-600" },
    { label: "RAP Permit", icon: FileText, tint: "bg-sky-50 text-sky-600" },
    { label: "Biker Permit", icon: Bike, tint: "bg-violet-50 text-violet-600" },
];

export default function Demo() {
    return (
        <div className="min-h-screen bg-white">
            {/* Small honest label so nobody mistakes this for the live gov site */}
            <div className="flex items-center justify-center gap-2 bg-slate-900 py-1.5 text-center text-[0.7rem] font-medium text-white/80">
                <span>Preview — recreated site chrome, widget only. Not the live Department site.</span>
                <Link href="/" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-white">
                    <ArrowLeft className="h-3 w-3" /> Back to assistant home
                </Link>
            </div>

            {/* ── Recreated top identity bar ─────────────────────────────── */}
            <div className="border-b border-slate-100 bg-white px-6 py-3">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                    <img
                        src={GOVT_LOGO_SRC}
                        alt="Government of Sikkim emblem"
                        className="h-14 w-14 shrink-0 object-contain"
                    />
                    <div className="flex flex-1 flex-col items-center text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-[#12365e] sm:text-3xl">
                            Tourism &amp; Civil Aviation Department
                        </h1>
                        <div className="mt-1 flex items-center gap-3 text-emerald-700">
                            <span className="h-1 w-6 rounded-full bg-amber-400/70" />
                            <span className="font-serif text-base italic">
                Sikkim — Where Nature Smiles
              </span>
                            <span className="h-1 w-6 rounded-full bg-amber-400/70" />
                        </div>
                    </div>
                    <div className="hidden shrink-0 items-center gap-3 sm:flex">
                        <img src="/images/gos.webp" alt="Government of Sikkim emblem" className="h-10 w-10 object-contain" />
                        <img src="/images/statehood.png" alt="Statehood seal" className="h-10 w-10 object-contain" />
                        <img src="/images/sikkim-inspires.png" alt="Sikkim Inspires" className="h-10 w-10 object-contain" />
                        <img src="/images/digital-india.png" alt="Digital India" className="h-10 w-10 object-contain" />
                    </div>

                    {/* Mobile-only hamburger, replacing the full nav row below 640px
              — matches the collapsed mobile header on the real site */}
                    <button
                        type="button"
                        aria-label="Open menu"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-white sm:hidden"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* ── Recreated nav bar (desktop/tablet only — mobile uses the hamburger above) ── */}
            <nav className="hidden border-b border-slate-100 bg-sky-50/60 sm:block">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center">
                    {NAV_ITEMS.map(({ label, hasDropdown, external, active }) => (
                        <button
                            key={label}
                            type="button"
                            className={`flex items-center gap-1 px-4 py-3.5 text-sm font-semibold transition-colors ${
                                active
                                    ? "bg-emerald-800 text-white"
                                    : external
                                        ? "text-amber-700 hover:bg-white/70"
                                        : "text-[#12365e] hover:bg-white/70"
                            }`}
                        >
                            {label}
                            {hasDropdown && <ChevronDown className="h-3.5 w-3.5 opacity-70" />}
                            {external && <ExternalLink className="h-3.5 w-3.5" />}
                        </button>
                    ))}
                </div>
            </nav>

            {/* ── Recreated hero ─────────────────────────────────────────── */}
            <section className="relative min-h-[640px] overflow-hidden">
                <video
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    poster={heroVideo.poster}
                >
                    <source src={heroVideo.src} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/55" />

                <div className="relative mx-auto flex min-h-[640px] max-w-7xl flex-col justify-center px-6 py-16 sm:px-10">
                    <div className="flex items-center gap-3 text-emerald-200">
                        <span className="h-px w-10 bg-emerald-200/70" />
                        <span className="font-serif text-sm italic tracking-wide">Incredible Sikkim</span>
                        <span className="h-px w-10 bg-emerald-200/70" />
                    </div>
                    <h2 className="mt-4 font-serif text-6xl font-medium text-white sm:text-7xl">
                        Explore Sikkim
                    </h2>
                    <p className="mt-4 text-2xl font-semibold text-white">
                        Land of Serenity, Adventure &amp; Culture
                    </p>
                    <p className="mt-4 max-w-md text-white/85">
                        From breathtaking landscapes to rich heritage, embark on a
                        journey of a lifetime.
                    </p>

                    {/* Floating Quick Links card */}
                    <div className="static mt-8 w-full rounded-2xl border border-white/40 bg-white/95 p-5 shadow-2xl backdrop-blur sm:absolute sm:bottom-16 sm:right-10 sm:mt-0 sm:w-[420px] lg:right-16">
                        <p className="mb-3 text-base font-bold text-[#12365e]">Quick Links</p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                aria-label="Previous"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="grid flex-1 grid-cols-3 gap-3">
                                {QUICK_LINKS.map(({ label, icon: Icon, tint }) => (
                                    <div
                                        key={label}
                                        className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 py-3 text-center"
                                    >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                                        <span className="text-xs font-semibold text-[#12365e]">{label}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                aria-label="Next"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom wave, matching the real site's footer curve into the page */}
                <svg
                    className="absolute -bottom-1 left-0 w-full text-white"
                    viewBox="0 0 1440 60"
                    fill="currentColor"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <path d="M0,32 C240,60 480,0 720,10 C960,20 1200,55 1440,28 L1440,60 L0,60 Z" />
                </svg>
            </section>

            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <p className="max-w-lg text-sm text-slate-500">
                    This is where the assistant launcher sits on the real site — bottom
                    right, same as here. Click it to try the live chat.
                </p>
            </div>
        </div>
    );
}