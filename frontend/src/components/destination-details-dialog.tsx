import { useState, useEffect } from "react";
import { fetchDestination, type Destination } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Clock,
  Ticket,
  IndianRupee,
  Mountain,
  Loader2,
  X,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DestinationDetailsDialog({
  id,
  open,
  onOpenChange,
}: {
  id: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dest, setDest] = useState<Destination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !open) return;
    setIsLoading(true);
    setDest(null);
    setImgError(false);
    setFetchError(null);
    fetchDestination(id)
      .then(setDest)
      .catch((err: unknown) => {
        console.error("Failed to load destination details:", err);
        setFetchError("Could not load destination details. Please try again.");
      })
      .finally(() => setIsLoading(false));
  }, [id, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden rounded-[var(--radius-panel)] border border-border/60 bg-white/92 p-0 shadow-[0_36px_100px_rgba(15,23,42,0.24)] backdrop-blur-2xl dark:bg-card/95">
        <DialogHeader className="sr-only">
          <DialogTitle>{dest?.name ?? "Destination details"}</DialogTitle>
        </DialogHeader>

        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {fetchError ? (
          <div className="flex h-96 flex-col items-center justify-center px-6 text-center">
            <p className="mb-2 font-medium text-destructive">
              Something went wrong
            </p>
            <p className="text-sm text-muted-foreground">{fetchError}</p>
          </div>
        ) : isLoading || !dest ? (
          <div className="flex h-96 flex-col items-center justify-center">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="font-medium text-muted-foreground">
              Loading details...
            </p>
          </div>
        ) : (
          <div className="flex max-h-[88vh] flex-col">
            <div className="relative h-72 shrink-0 overflow-hidden sm:h-80">
              {dest.imageUrl && !imgError ? (
                <img
                  src={dest.imageUrl}
                  alt={dest.name}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-white/25"
                  style={{
                    backgroundColor: dest.imagePlaceholder || "#6b7280",
                  }}
                >
                  <Mountain className="h-20 w-20" />
                </div>
              )}

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,21,18,0.06),rgba(5,21,18,0.16),rgba(5,21,18,0.82))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(233,169,59,0.20),transparent_28%)]" />

              <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="rounded-full border-0 bg-white/92 px-3 py-1 text-[0.72rem] font-semibold capitalize text-slate-900 shadow-sm backdrop-blur"
                  >
                    {dest.category}
                  </Badge>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/12 px-3 py-1 text-sm font-medium text-white/88 backdrop-blur-sm">
                    <MapPin className="h-4 w-4" />
                    {dest.district} District
                  </div>
                </div>
                <h2 className="max-w-3xl font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
                  {dest.name}
                </h2>
              </div>
            </div>

            <ScrollArea className="min-h-0 shrink p-6 sm:p-8">
              <div className="space-y-8">
                <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[var(--radius-card)] border border-border/70 bg-background/72 p-6 dark:bg-muted/20">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
                      About this place
                    </p>
                    <h3 className="mb-3 font-serif text-xl font-semibold text-foreground">
                      Travel snapshot
                    </h3>
                    <p className="leading-relaxed text-muted-foreground">
                      {dest.description}
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-card)] border border-border/70 bg-gradient-to-br from-primary/[0.06] via-white to-secondary/[0.08] p-6 dark:from-primary/10 dark:via-card dark:to-secondary/10">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
                      Quick planning info
                    </p>
                    <div className="mt-4 grid gap-4 text-sm">
                      <div className="rounded-2xl border border-border/60 bg-white/80 p-4 dark:bg-card/70">
                        <div className="mb-1.5 flex items-center gap-2 font-medium text-primary">
                          <Clock className="h-4 w-4" /> Best Time to Visit
                        </div>
                        <p className="leading-relaxed text-muted-foreground">
                          {dest.bestTimeToVisit}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-white/80 p-4 dark:bg-card/70">
                        <div className="mb-1.5 flex items-center gap-2 font-medium text-primary">
                          <Ticket className="h-4 w-4" /> Permits Required
                        </div>
                        <p className="leading-relaxed text-muted-foreground">
                          {dest.permitsRequired}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {dest.entryFee && (
                    <div className="rounded-[var(--radius-card)] border border-border/70 bg-white/75 p-5 shadow-sm dark:bg-card/70">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                        <IndianRupee className="h-4 w-4" /> Entry Fee
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {dest.entryFee}
                      </p>
                    </div>
                  )}
                  <div className="rounded-[var(--radius-card)] border border-border/70 bg-white/75 p-5 shadow-sm dark:bg-card/70">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                      <MapPin className="h-4 w-4" /> How to Reach
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {dest.howToReach}
                    </p>
                  </div>
                </div>

                {dest.highlights && dest.highlights.length > 0 && (
                  <div className="rounded-[var(--radius-card)] border border-border/70 bg-background/72 p-6 dark:bg-muted/20">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
                      Highlights
                    </p>
                    <h3 className="mb-4 font-serif text-xl font-semibold text-foreground">
                      What makes this place special
                    </h3>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {dest.highlights.map((h, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 rounded-2xl border border-border/60 bg-white/78 px-4 py-3 text-sm text-muted-foreground shadow-sm dark:bg-card/70"
                        >
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
