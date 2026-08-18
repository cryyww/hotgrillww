import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/hotgrill-logo.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso da equipe — Hot Grill" },
      {
        name: "description",
        content: "Área restrita: entre com o e-mail e a senha da equipe Hot Grill para acessar o sistema.",
      },
      { property: "og:title", content: "Acesso da equipe — Hot Grill" },
      {
        property: "og:description",
        content: "Login interno do sistema de vendas, estoque e finanças da barraca Hot Grill.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setCarregando(false);
    if (error) {
      setErro(
        error.message.toLowerCase().includes("invalid")
          ? "E-mail ou senha incorretos. Fale com o responsável pelo sistema."
          : error.message,
      );
      return;
    }
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img
            src={logo.url}
            alt="Logo Hot Grill — cachorro quente em chamas"
            className="size-28 rounded-2xl object-cover ring-1 ring-primary/40 ember-glow"
          />
          <h1 className="mt-4 font-display text-4xl ember-text">HOT GRILL</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Acesso da equipe</p>
        </div>

        <form onSubmit={entrar} className="panel mt-6 space-y-4 p-5">
          <div>
            <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-12"
              placeholder="equipe@hotgrill.com"
            />
          </div>
          <div>
            <Label htmlFor="senha" className="text-xs uppercase tracking-widest text-muted-foreground">
              Senha
            </Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 h-12"
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          <Button type="submit" size="lg" disabled={carregando} className="h-13 w-full font-display text-xl ember-glow">
            {carregando ? <Loader2 className="size-5 animate-spin" /> : <Flame className="size-5" />}
            Entrar
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Área restrita. Não há cadastro aberto — os acessos são criados pelo responsável do sistema.
          </p>
        </form>
      </div>
    </main>
  );
}
