import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatarDataSessaoMobile, sessaoJaPassou } from "./session-list-presentation";

const agora = new Date(2026, 6, 20, 12);

describe("apresentação temporal da lista de Sessões", () => {
  it("destaca hoje e amanhã sem mudar a data civil", () => {
    assert.equal(formatarDataSessaoMobile("2026-07-20", "21:30", agora), "Hoje, 21:30");
    assert.equal(formatarDataSessaoMobile("2026-07-21", "18:00", agora), "Amanhã, 18:00");
  });

  it("usa data curta pt-PT e só inclui hora quando existe", () => {
    assert.equal(formatarDataSessaoMobile("2026-07-24", "21:00", agora), "24 jul., 21:00");
    assert.equal(formatarDataSessaoMobile("2026-07-24", "", agora), "24 jul.");
  });

  it("tolera sessões sem data ou com data inválida", () => {
    assert.equal(formatarDataSessaoMobile("", "18:00", agora), "Sem data");
    assert.equal(formatarDataSessaoMobile("2026-02-30", "18:00", agora), "Sem data");
  });

  it("preserva a distinção temporal civil já usada pela lista", () => {
    assert.equal(sessaoJaPassou("2026-07-19", agora), true);
    assert.equal(sessaoJaPassou("2026-07-20", agora), false);
    assert.equal(sessaoJaPassou("2026-07-21", agora), false);
    assert.equal(sessaoJaPassou("", agora), false);
  });
});
