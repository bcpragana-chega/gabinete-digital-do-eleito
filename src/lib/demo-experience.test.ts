import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260726000000_demo_experience.sql", import.meta.url),
  "utf8",
);
const supabaseSource = readFileSync(new URL("./supabase.ts", import.meta.url), "utf8");
const authSource = readFileSync(new URL("./auth-store.ts", import.meta.url), "utf8");
const loginSource = readFileSync(new URL("../routes/login.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../routes/_app.tsx", import.meta.url), "utf8");

test("a RPC de demonstração deriva o dono da sessão e só aceita utilizadores anónimos", () => {
  assert.match(migration, /create or replace function public\.criar_demonstracao_tribuno\(\)/);
  assert.doesNotMatch(migration, /criar_demonstracao_tribuno\s*\(\s*p_user/i);
  assert.match(migration, /v_user uuid := auth\.uid\(\)/);
  assert.match(migration, /auth\.jwt\(\) ->> 'is_anonymous'/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(
    migration,
    /revoke all on function public\.criar_demonstracao_tribuno\(\) from public/,
  );
  assert.match(
    migration,
    /grant execute on function public\.criar_demonstracao_tribuno\(\) to authenticated/,
  );
});

test("o seed é idempotente, transacional e mantém IDs isolados por utilizador", () => {
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /'status', 'already_created'/);
  assert.match(migration, /v_prefix := 'demo-' \|\| v_user::text/);
  assert.match(migration, /onboarding_version,[\s\S]*\n\s*1,/);
  assert.match(migration, /'sessions', 3/);
  assert.match(migration, /'subjects', 6/);
  assert.match(migration, /'documents', 6/);
  assert.match(migration, /'follow_ups', 4/);
});

test("o cliente usa autenticação anónima, a RPC segura e identificação persistente", () => {
  assert.match(supabaseSource, /supabase\.auth\.signInAnonymously\(\)/);
  assert.match(supabaseSource, /supabase\.rpc\("criar_demonstracao_tribuno"\)/);
  assert.match(authSource, /provider: "google" \| "anonymous" \| "local-dev"/);
  assert.match(authSource, /user\.is_anonymous === true/);
  assert.match(loginSource, /Experimentar o Tribuno/);
  assert.match(loginSource, /A preparar a sua demonstração…/);
  assert.match(appSource, /Está a utilizar uma demonstração com dados fictícios\./);
  assert.match(appSource, /Sair da demonstração/);
});
