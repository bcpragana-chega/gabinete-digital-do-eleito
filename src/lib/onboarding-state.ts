import { readJSON, removeItem, userScopedKey, writeJSON } from "@/lib/storage-provider";

export const ONBOARDING_VERSION = 1;

export type OnboardingPasso = "identidade" | "confirmacao" | "convocatoria";

export function resolverInterrupcaoOnboarding(input: {
  passo: OnboardingPasso | "analise" | "revisao" | "duplicado";
  temFicheiro?: boolean;
}) {
  if (input.passo === "identidade" || input.passo === "confirmacao") {
    return { passo: input.passo, processoInterrompido: false } as const;
  }
  return {
    passo: "convocatoria",
    processoInterrompido: input.passo !== "convocatoria" || Boolean(input.temFicheiro),
  } as const;
}

type OnboardingLocal = {
  version: number;
  passo: OnboardingPasso;
  concluido: boolean;
  sincronizacaoPendente?: boolean;
  semConvocatoria?: boolean;
  processoInterrompido?: boolean;
  sessaoId?: string;
};

function key(userId?: string) {
  return userScopedKey("tribuno:onboarding-beta", userId);
}

export function carregarOnboardingLocal(userId?: string): OnboardingLocal | undefined {
  const storageKey = key(userId);
  return storageKey ? readJSON<OnboardingLocal | undefined>(storageKey, undefined) : undefined;
}

export function guardarOnboardingLocal(userId: string, patch: Partial<OnboardingLocal>) {
  const storageKey = key(userId);
  if (!storageKey) return;
  const atual = carregarOnboardingLocal(userId);
  writeJSON(storageKey, {
    version: ONBOARDING_VERSION,
    passo: "identidade",
    concluido: false,
    ...atual,
    ...patch,
  });
}

export function marcarProximaAcaoConvocatoria(userId: string, ativa: boolean) {
  guardarOnboardingLocal(userId, { semConvocatoria: ativa });
}

export function temProximaAcaoConvocatoria(userId?: string) {
  return Boolean(carregarOnboardingLocal(userId)?.semConvocatoria);
}

export function resolverVersaoOnboarding(input: {
  versaoRemota?: number;
  local?: Pick<OnboardingLocal, "concluido" | "version">;
  remotoObrigatorio?: boolean;
}) {
  if (input.remotoObrigatorio) return input.versaoRemota ?? 0;
  return Math.max(input.versaoRemota ?? 0, input.local?.concluido ? input.local.version : 0);
}

export function limparOnboardingLocal(userId?: string) {
  const storageKey = key(userId);
  if (storageKey) removeItem(storageKey);
}
