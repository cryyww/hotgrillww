import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

type Tendencia = "up" | "down" | "neutral";

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  trend = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  tone?: "default" | "accent" | "primary" | "destructive";
  trend?: Tendencia;
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "primary"
        ? "text-primary"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";

  return (
    <div className="panel ember-surface flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
        {Icon && <Icon className={`size-4 shrink-0 ${toneClass}`} />}
      </div>
      <p className={`font-display text-2xl leading-none sm:text-3xl ${toneClass}`}>{value}</p>
      {(sub || trend !== "neutral") && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {trend === "up" && <TrendingUp className="size-3.5 text-success" />}
          {trend === "down" && <TrendingDown className="size-3.5 text-destructive" />}
          {sub}
        </p>
      )}
    </div>
  );
}
