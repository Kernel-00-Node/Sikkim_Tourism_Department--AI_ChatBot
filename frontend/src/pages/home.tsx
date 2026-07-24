import { useState, useEffect } from "react";
import { DestinationCard } from "@/components/destination-card";
import { DestinationDetailsDialog } from "@/components/destination-details-dialog";
import { Link } from "wouter";
import {
  ArrowRight,
  MountainSnow,
  ShieldCheck,
  Compass,
  Sparkles,
} from "lucide-react";
import { fetchDestinations, type DestinationSummary } from "@/lib/api";
import { heroVideo } from "@/config/hero-media";

const heroTaglines = [
  "Sikkim — Land of Mystic Splendour",
  "Sikkim — Where Every Peak Tells a Story",
  "Sikkim — India's First Fully Organic State",
];

export default function Home() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [popularDestinations, setPopularDestinations] = useState<
    DestinationSummary[]
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [taglineVisible, setTaglineVisible] = useState(true);

  useEffect(() => {
    fetchDestinations()
      .then((all) => setPopularDestinations(all.slice(0, 3)))
      .catch((err: unknown) => {
        console.error("Failed to load popular destinations:", err);
        setLoadError("Could not load destinations. Please refresh the page.");
      });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineVisible(false);
      setTimeout(() => {
        setTaglineIndex((i) => (i + 1) % heroTaglines.length);
        setTaglineVisible(true);
      }, 600);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const pillars = [
    {
      icon: Compass,
      title: "Local, ground-level knowledge",
      body: "Trained on official destination records, permits, and district-level travel advisories.",
    },
    {
      icon: ShieldCheck,
      title: "Permit & route clarity",
      body: "Ask about Nathula, Gurudongmar, or restricted-area passes and get the exact requirements.",
    },
    {
      icon: Sparkles,
      title: "Always at your side",
      body: "Tap the mountain icon in the corner, anytime, on any page — it opens instantly.",
    },
  ];

  const highlights = [
    { value: "India's First", label: "Fully Organic State" },
    { value: "Kanchenjunga", label: "World's 3rd Highest Peak" },
    { value: "200+", label: "Monasteries & Sacred Sites" },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
      <section className="relative flex min-h-[78vh] flex-col overflow-hidden border-b border-white/10 sm:min-h-screen">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <video
            key={heroVideo.src}
            className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={heroVideo.poster}
          >
            <source src={heroVideo.src} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,21,18,0.18)_0%,rgba(5,21,18,0.52)_26%,rgba(5,21,18,0.72)_65%,rgba(244,248,246,0.96)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(233,169,59,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(39,122,107,0.28),transparent_34%)]" />
        </div>

        <div className="relative container mx-auto flex min-h-[78vh] flex-1 flex-col items-center justify-center px-4 py-18 text-center sm:min-h-screen">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur-md animate-rise-fade">
            <MountainSnow className="h-3.5 w-3.5" />
            Government of Sikkim · Tourism &amp; Civil Aviation Dept.
          </div>

          <div className="mt-6 max-w-5xl px-4 sm:px-6">
            <h1
              key={taglineIndex}
              className={`mx-auto max-w-4xl font-serif text-4xl font-bold leading-[1.05] tracking-tight text-white [text-shadow:0_4px_28px_rgba(0,0,0,0.45)] sm:text-6xl ${
                taglineVisible ? "animate-rise-fade" : "animate-fade-out-rise"
              }`}
              style={
                taglineIndex === 0 ? { animationDelay: "100ms" } : undefined
              }
            >
              {heroTaglines[taglineIndex]}
            </h1>

            <p
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/90 [text-shadow:0_2px_16px_rgba(0,0,0,0.4)] animate-rise-fade sm:text-xl"
              style={{ animationDelay: "220ms" }}
            >
              Where snow peaks meet prayer flags, monasteries keep centuries of
              silence, and every valley has a story. Ask our assistant about
              permits, routes, and the best time to visit — anytime.
            </p>

            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-rise-fade"
              style={{ animationDelay: "340ms" }}
            >
              <Link
                href="/destinations"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_16px_40px_rgba(39,122,107,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(39,122,107,0.38)]"
              >
                Explore destinations <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-3 text-sm text-white/90 [text-shadow:0_2px_10px_rgba(0,0,0,0.4)]">
                Or click the chat icon to ask a question
              </span>
            </div>
          </div>

          <div
            className="mt-12 grid w-full max-w-4xl grid-cols-1 gap-3 border-t border-white/12 pt-8 text-white animate-rise-fade sm:grid-cols-3"
            style={{ animationDelay: "440ms" }}
          >
            {highlights.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/8 px-5 py-4 backdrop-blur-sm"
              >
                <span className="block font-serif text-xl font-bold sm:text-2xl">
                  {stat.value}
                </span>
                <span className="mt-1 block text-[0.72rem] uppercase tracking-[0.22em] text-white/65">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 sm:py-20">
        <div className="rounded-[2rem] border border-border/70 bg-white/72 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:bg-card/72 sm:p-8 lg:p-10">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">
                Why this assistant feels official
              </p>
              <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
                Designed for clarity, trust, and discovery
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-right">
              The refreshed interface keeps every existing feature intact, while
              giving the site a cleaner tourism-focused identity with better
              depth, spacing, and color harmony.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {pillars.map((p, i) => (
              <div
                key={p.title}
                className="animate-rise-fade rounded-[1.6rem] border border-border/70 bg-gradient-to-b from-white to-white/70 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(39,122,107,0.12)] dark:from-card dark:to-card/80"
                style={{ animationDelay: `${180 + i * 100}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
                  <p.icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="mb-2 font-serif text-lg font-semibold text-foreground">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="rounded-[2rem] border border-border/70 bg-white/72 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:bg-card/72 sm:p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">
                Curated inspiration
              </p>
              <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
                Popular Places
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Start with a few of Sikkim's most searched destinations, then
                open each place for travel timing, permits, and local guidance.
              </p>
            </div>
            <Link
              href="/destinations"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loadError && (
            <p className="mb-4 text-sm text-destructive">{loadError}</p>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {popularDestinations.map((dest, i) => (
              <div
                key={dest.id}
                className="animate-in slide-in-from-bottom-3 fade-in duration-500 fill-mode-both"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <DestinationCard
                  dest={dest}
                  onClick={() => setSelectedId(dest.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <DestinationDetailsDialog
        id={selectedId}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
