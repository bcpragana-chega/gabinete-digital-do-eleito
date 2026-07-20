import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatarDataBibliotecaMobile } from "./library-list-presentation";

const agora = new Date(2026, 6, 20, 12);

describe("data mobile da Biblioteca", () => {
  it("identifica hoje e ontem pela data civil", () => {
    assert.equal(formatarDataBibliotecaMobile("2026-07-20", agora), "Hoje");
    assert.equal(formatarDataBibliotecaMobile("2026-07-19", agora), "Ontem");
  });

  it("usa uma data curta em português", () => {
    assert.equal(formatarDataBibliotecaMobile("2026-07-24", agora), "24 jul.");
  });

  it("tolera ausência, timestamp e data inválida", () => {
    assert.equal(formatarDataBibliotecaMobile(undefined, agora), "Sem data");
    assert.equal(formatarDataBibliotecaMobile("", agora), "Sem data");
    assert.equal(formatarDataBibliotecaMobile("2026-02-30", agora), "Sem data");
    assert.equal(formatarDataBibliotecaMobile("2026-07-20T23:30:00.000Z", agora), "Hoje");
  });
});
