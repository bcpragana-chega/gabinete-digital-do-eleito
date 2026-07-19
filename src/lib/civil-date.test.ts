import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatarDataCivilPt, validarDataCivilIso } from "./civil-date";

describe("data civil canónica", () => {
  it("preserva ISO e apresenta 2026 corretamente em pt-PT", () => {
    assert.deepEqual(validarDataCivilIso("2026-06-30"), {
      ok: true,
      valor: "2026-06-30",
      ano: 2026,
      mes: 6,
      dia: 30,
    });
    assert.equal(formatarDataCivilPt("2026-06-30"), "30/06/2026");
  });

  it("rejeita datas inexistentes sem conversões UTC ou de locale", () => {
    assert.deepEqual(validarDataCivilIso("2026-02-30"), { ok: false, erro: "inexistente" });
    assert.deepEqual(validarDataCivilIso("30/06/2026"), { ok: false, erro: "formato" });
  });

  it("bloqueia apenas anos futuros implausíveis e permite datas históricas", () => {
    const agora = new Date("2026-07-19T12:00:00Z");
    assert.deepEqual(validarDataCivilIso("3066-06-30", { agora, validarAnoPlausivel: true }), {
      ok: false,
      erro: "ano_implausivel",
      anoMaximo: 2046,
    });
    assert.equal(validarDataCivilIso("1974-04-25", { agora, validarAnoPlausivel: true }).ok, true);
  });
});
