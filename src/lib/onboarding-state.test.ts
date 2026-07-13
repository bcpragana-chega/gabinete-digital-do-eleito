import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { userScopedKey } from "./storage-provider";

describe("estado local do onboarding beta", () => {
  it("isola sempre o estado por utilizador", () => {
    assert.notEqual(
      userScopedKey("tribuno:onboarding-beta", "conta-a"),
      userScopedKey("tribuno:onboarding-beta", "conta-b"),
    );
  });
});
