import { useState, useEffect } from "react";
import { fetchDestination, type Destination } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Ticket, IndianRupee, Mountain, Loader2, X } from "lucide-react";
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
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-none rounded-3xl shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{dest?.name ?? "Destination details"}</DialogTitle>
        </DialogHeader>

        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {fetchError ? (
          // Show a user-visible error rather than silently failing
          <div className="h-96 flex flex-col items-center justify-center px-6 text-center">
            <p className="text-destructive font-medium mb-2">Something went wrong</p>
            <p className="text-muted-foreground text-sm">{fetchError}</p>
          </div>
        ) : isLoading || !dest ? (
          <div className="h-96 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium">Loading details...</p>
          </div>
        ) : (
          <div className="flex flex-col max-h-[88vh]">
            <div className="h-64 sm:h-72 relative shrink-0 overflow-hidden">
              {dest.imageUrl && !imgError ? (
                <img
                  src={dest.imageUrl}
                  alt={dest.name}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white/20"
                  style={{ backgroundColor: dest.imagePlaceholder || "#6b7280" }}
                >
                  <Mountain className="w-20 h-20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/10 backdrop-blur capitalize">
                    {dest.category}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-white/80">
                    <MapPin className="w-4 h-4" />
                    {dest.district} District
                  </div>
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white leading-tight">{dest.name}</h2>
              </div>
            </div>

            <ScrollArea className="p-6 sm:p-8 shrink min-h-0">
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-serif font-semibold text-foreground mb-3 border-b pb-2">About this place</h3>
                  <p className="text-muted-foreground leading-relaxed">{dest.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-muted/30 p-6 rounded-2xl border">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      <Clock className="w-4 h-4" /> Best Time to Visit
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">{dest.bestTimeToVisit}</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      <Ticket className="w-4 h-4" /> Permits Required
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">{dest.permitsRequired}</p>
                  </div>
                  {dest.entryFee && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-primary font-medium text-sm">
                        <IndianRupee className="w-4 h-4" /> Entry Fee
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">{dest.entryFee}</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary font-medium text-sm">
                      <MapPin className="w-4 h-4" /> How to Reach
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">{dest.howToReach}</p>
                  </div>
                </div>

                {dest.highlights && dest.highlights.length > 0 && (
                  <div>
                    <h3 className="text-lg font-serif font-semibold text-foreground mb-3 border-b pb-2">Highlights</h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {dest.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-muted-foreground text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          {h}
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