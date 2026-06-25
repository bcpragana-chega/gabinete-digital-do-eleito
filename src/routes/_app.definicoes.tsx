import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { TopBar } from "@/components/layout/TopBar";

export const Route = createFileRoute("/_app/definicoes")({
  head: () => ({
    meta: [
      { title: "Definições — Tribuno" },
      {
        name: "description",
        content: "Configure o seu perfil, autarquia e preferências do gabinete.",
      },
    ],
  }),
  component: DefinicoesPage,
});

function DefinicoesPage() {
  return (
    <>
      <TopBar breadcrumb="Definições" />
      <main className="px-8 py-10 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Definições
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure o seu perfil e preferências do gabinete digital.
          </p>
        </div>

        <div className="space-y-6">
          <Section titulo="Perfil do eleito">
            <Field label="Nome" value="João Martins" />
            <Field label="Cargo" value="Vereador" />
            <Field label="Email institucional" value="joao.martins@cm-aveiro.pt" />
          </Section>

          <Section titulo="Autarquia">
            <Field label="Município" value="Câmara Municipal de Aveiro" />
            <Field label="Mandato" value="2025 — 2029" />
            <Field label="Grupo municipal" value="Independente" />
          </Section>

          <Section titulo="Preferências">
            <Toggle
              label="Notificações por email"
              hint="Receber alertas sobre novos documentos"
              defaultOn
            />
            <Toggle
              label="Resumo semanal"
              hint="Receber um resumo das assembleias toda a segunda-feira"
              defaultOn
            />
            <Toggle label="Modo compacto" hint="Reduzir o espaçamento da interface" />
          </Section>
        </div>
      </main>
    </>
  );
}

function Section({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-card">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
          {titulo}
        </h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function Toggle({
  label,
  hint,
  defaultOn = false,
}: {
  label: string;
  hint?: string;
  defaultOn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div
        className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
          defaultOn ? "bg-primary" : "bg-muted"
        }`}
        aria-hidden
      >
        <div
          className={`h-4 w-4 rounded-full bg-card shadow transition-transform ${
            defaultOn ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}
