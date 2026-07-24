import type { DestinationSummary } from "@/lib/api";
import { MapPin, Clock, Ticket, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DestinationCard({
  dest,
  onClick,
}: {
  dest: DestinationSummary;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`group focus-ring flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-gradient-to-b from-white to-white/82 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-[0_24px_52px_rgba(39,122,107,0.14)] dark:from-card dark:to-card/92 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {dest.imageUrl ? (
          <img
            src={dest.imageUrl}
            alt={dest.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-white/35 transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundColor: dest.imagePlaceholder || "#6b7280" }}
          >
            <MapPin className="h-12 w-12" />
          </div>
        )}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,18,16,0.06),rgba(6,18,16,0.10),rgba(6,18,16,0.68))]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/18 to-transparent" />

        <div className="absolute left-4 top-4 flex items-center gap-2">
          <Badge
            variant="secondary"
            className="rounded-full border-0 bg-white/92 px-3 py-1 text-[0.7rem] font-semibold capitalize text-foreground shadow-sm backdrop-blur"
          >
            {dest.category}
          </Badge>
        </div>

        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm">
              <MapPin className="h-3 w-3" />
              {dest.district} District
            </div>
            <h3 className="font-serif text-xl font-bold text-white drop-shadow-sm transition-colors duration-200">
              {dest.name}
            </h3>
          </div>

          <div className="inline-flex translate-y-2 items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            View <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 grid gap-2 rounded-[var(--radius-card)] border border-border/60 bg-background/70 p-3 text-sm dark:bg-muted/30">
          <div className="flex items-start gap-2 text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
            <span className="line-clamp-2">
              <strong className="font-semibold text-foreground">
                Best time:
              </strong>{" "}
              {dest.bestTimeToVisit}
            </span>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
            <span className="line-clamp-2">
              <strong className="font-semibold text-foreground">
                Permits:
              </strong>{" "}
              {dest.permitsRequired}
            </span>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {dest.description}
        </p>
      </div>
    </div>
  );
}
