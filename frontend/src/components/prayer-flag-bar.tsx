import { PRAYER_FLAGS } from "@/config/chat-theme";

type PrayerFlagBarProps = {
  className?: string;
  thicknessClassName?: string;
};

export function PrayerFlagBar({
  className = "",
  thicknessClassName = "h-[2px]",
}: PrayerFlagBarProps) {
  return (
    <div className={`flex w-full ${thicknessClassName} ${className}`} aria-hidden="true">
      {PRAYER_FLAGS.map((color) => (
        <div key={color} className="flex-1" style={{ background: color }} />
      ))}
    </div>
  );
}
