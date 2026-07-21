import { useState, useEffect, useCallback } from "react";
import { DestinationCard } from "@/components/destination-card";
import { DestinationDetailsDialog } from "@/components/destination-details-dialog";
import { Input } from "@/components/ui/input";
import { Search, Filter, MapPin, MountainSnow } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchDestinations, fetchCategories, type DestinationSummary } from "@/lib/api";

function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function Destinations() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err: unknown) => console.error("Failed to load categories:", err));
  }, []);

  useEffect(() => {
    // AbortController cancels the in-flight request when the user types again
    // before the previous fetch resolves, preventing stale results from
    // overwriting newer state (classic React race condition).
    const controller = new AbortController();

    setIsLoading(true);
    fetchDestinations(
      debouncedSearch || undefined,
      category !== "all" ? category : undefined,
      controller.signal,
    )
      .then(setDestinations)
      .catch((err: unknown) => {
        // Ignore intentional cancellations — they are not real errors.
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Failed to load destinations:", err);
      })
      .finally(() => setIsLoading(false));

    // Cancel the previous request on the next render cycle.
    return () => controller.abort();
  }, [debouncedSearch, category]);

  const isFiltered = debouncedSearch || category !== "all";

  return (
    <div className="flex-1 bg-background flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-background pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-primary/8 blur-2xl pointer-events-none" />

        <div className="relative container mx-auto px-4 py-14 md:py-20 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-widest uppercase mb-6 animate-rise-fade">
            <MountainSnow className="w-3.5 h-3.5" />
            Official Destination Guide
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4 animate-rise-fade" style={{ animationDelay: "80ms" }}>
            Explore Destinations
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed animate-rise-fade" style={{ animationDelay: "160ms" }}>
            From the serene waters of Tsomgo Lake to the ancient walls of Rumtek Monastery,
            discover the beauty of the Himalayas.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-1">

        {/* ── Search & Filter ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search places, districts, or experiences..."
              className="pl-10 h-12 bg-card border-border/60 shadow-sm text-base rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[200px] h-12 bg-card rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Result count ─────────────────────────────────────────────── */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground mb-6">
            {isFiltered
              ? `${destinations.length} result${destinations.length !== 1 ? "s" : ""} found`
              : `${destinations.length} destination${destinations.length !== 1 ? "s" : ""} in Sikkim`}
          </p>
        )}

        {/* ── Grid ─────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-muted rounded-2xl h-[400px] animate-pulse" />
            ))}
          </div>
        ) : destinations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {destinations.map((dest, i) => (
              <div
                key={dest.id}
                className="animate-in slide-in-from-bottom-4 fade-in duration-500 fill-mode-both"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <DestinationCard dest={dest} onClick={() => setSelectedId(dest.id)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 px-4 border rounded-2xl bg-card border-dashed">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No destinations found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            {isFiltered && (
              <button
                onClick={() => { setSearch(""); setCategory("all"); }}
                className="mt-4 text-sm text-primary hover:underline font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <DestinationDetailsDialog
        id={selectedId}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}