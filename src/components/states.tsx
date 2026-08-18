import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LoadingState({ label = "Carregando dados..." }: { label?: string }) {
  return (
    <div className="panel flex flex-col items-center gap-3 p-8 text-center">
      <Loader2 className="size-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/80 px-4 py-8 text-center">
      <Icon className="size-7 text-muted-foreground" />
      <p className="font-display text-xl">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const mensagem = error instanceof Error ? error.message : "Erro inesperado ao falar com o servidor.";
  return (
    <div className="panel flex flex-col items-center gap-3 border-destructive/40 p-8 text-center">
      <AlertTriangle className="size-7 text-destructive" />
      <p className="font-display text-xl">Não foi possível carregar</p>
      <p className="max-w-sm text-sm text-muted-foreground">{mensagem}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
