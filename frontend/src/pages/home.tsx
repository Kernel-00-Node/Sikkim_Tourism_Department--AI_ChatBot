import { useState, useEffect } from "react";
import { DestinationCard } from "@/components/destination-card";
import { DestinationDetailsDialog } from "@/components/destination-details-dialog";
import { Link } from "wouter";
import { ArrowRight, MountainSnow, ShieldCheck, Compass, Sparkles } from "lucide-react";
import { fetchDestinations, type DestinationSummary } from "@/lib/api";
import { heroVideo } from "@/config/hero-media";

const heroTaglines = [
  "Sikkim — Land of Mystic Splendour",
  "Sikkim — Where Every Peak Tells a Story",
  "Sikkim — India's First Fully Organic State",
];

export default function Home() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [popularDestinations, setPopularDestinations] = useState<DestinationSummary[]>([]);
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

  // Every 10s, fade the headline out, swap to the next tagline, then fade back in.
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

  return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b min-h-[72vh] sm:min-h-screen flex flex-col">
          {/* Ambient background: video (local file or URL, see src/config/hero-media.ts) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <video
                key={heroVideo.src}
                className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster={heroVideo.poster}
            >
              <source src={heroVideo.src} type="video/mp4" />
            </video>
            {/* Dark/tint overlay so white text stays readable over any footage */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
          </div>

          <div className="relative container mx-auto px-4 flex flex-col items-center justify-center text-center flex-1 py-16 min-h-[72vh] sm:min-h-screen">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white backdrop-blur-sm text-xs font-semibold tracking-wide uppercase mb-6 animate-rise-fade">
              <MountainSnow className="w-3.5 h-3.5" />
              Government of Sikkim · Tourism &amp; Civil Aviation Dept.
            </div>
            <h1
                key={taglineIndex}
                className={`font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.1] ${
                    taglineVisible ? "animate-rise-fade" : "animate-fade-out-rise"
                }`}
                style={taglineIndex === 0 ? { animationDelay: "100ms" } : undefined}
            >
              {heroTaglines[taglineIndex]}
            </h1>
            <p
                className="text-white/80 text-lg sm:text-xl mt-6 max-w-xl mx-auto leading-relaxed animate-rise-fade"
                style={{ animationDelay: "220ms" }}
            >
              Where snow peaks meet prayer flags, monasteries keep centuries of silence, and every valley
              has a story. Ask our assistant about permits, routes, and the best time to visit — anytime.
            </p>

            <div
                className="flex flex-wrap items-center justify-center gap-3 mt-8 animate-rise-fade"
                style={{ animationDelay: "340ms" }}
            >
              <Link
                  href="/destinations"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                Explore destinations <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-sm text-white/70">or click the chat icon to ask a question</span>
            </div>

            <div
                className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 pt-8 border-t border-white/15 max-w-2xl animate-rise-fade"
                style={{ animationDelay: "440ms" }}
            >
              {[
                { value: "India's First", label: "Fully Organic State" },
                { value: "Kanchenjunga", label: "World's 3rd Highest Peak" },
                { value: "200+", label: "Monasteries & Sacred Sites" },
              ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center">
                    <span className="font-serif text-lg sm:text-xl font-bold text-white">{stat.value}</span>
                    <span className="text-[0.68rem] sm:text-xs uppercase tracking-wider text-white/60 mt-0.5">{stat.label}</span>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pillars ──────────────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 py-14 sm:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {pillars.map((p, i) => (
                <div
                    key={p.title}
                    className="animate-rise-fade rounded-2xl border bg-card p-6 hover:shadow-md hover:border-primary/20 transition-all duration-300"
                    style={{ animationDelay: `${180 + i * 100}ms` }}
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <p.icon className="w-5.5 h-5.5" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-1.5">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
            ))}
          </div>
        </section>

        {/* ── Popular destinations ─────────────────────────────────────────── */}
        <section className="container mx-auto px-4 pb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">Popular Places</h2>
            <Link href="/destinations" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {/* Show a user-visible message if the API call failed */}
          {loadError && (
            <p className="text-sm text-destructive mb-4">{loadError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {popularDestinations.map((dest, i) => (
                <div
                    key={dest.id}
                    className="animate-in slide-in-from-bottom-3 fade-in duration-500 fill-mode-both"
                    style={{ animationDelay: `${i * 100}ms` }}
                >
                  <DestinationCard dest={dest} onClick={() => setSelectedId(dest.id)} />
                </div>
            ))}
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