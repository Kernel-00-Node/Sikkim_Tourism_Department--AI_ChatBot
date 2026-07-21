import type { DestinationSummary } from "@/lib/api";
import { MapPin, Clock, Ticket, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DestinationCard({ dest, onClick }: { dest: DestinationSummary; onClick?: () => void }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      // Keyboard accessibility: activate with Enter or Space, matching
      // the native behaviour expected of a role="button" element.
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
      className={`group flex flex-col bg-card rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/25 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        {dest.imageUrl ? (
          <img
            src={dest.imageUrl}
            alt={dest.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white/30 transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundColor: dest.imagePlaceholder || "#6b7280" }}
          >
            <MapPin className="w-12 h-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur text-foreground hover:bg-white shadow-sm font-medium capitalize">
            {dest.category}
          </Badge>
        </div>
        {/* View details CTA — slides up on hover */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1.5 py-3 text-white text-sm font-semibold translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/60 to-transparent">
          View details <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-2 uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5" />
          {dest.district} District
        </div>
        <h3 className="font-serif text-xl font-bold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors duration-200">
          {dest.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{dest.description}</p>
        <div className="space-y-2 pt-4 border-t border-border/50 text-sm">
          <div className="flex items-start gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 mt-0.5 shrink-0 text-foreground/50" />
            <span className="line-clamp-1">
              <strong className="text-foreground/80 font-medium">Best time:</strong> {dest.bestTimeToVisit}
            </span>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <Ticket className="w-4 h-4 mt-0.5 shrink-0 text-foreground/50" />
            <span className="line-clamp-1">
              <strong className="text-foreground/80 font-medium">Permits:</strong> {dest.permitsRequired}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}