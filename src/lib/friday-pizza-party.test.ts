import { describe, expect, it } from "vitest";
import { isFridayPizzaPartyPromo } from "./friday-pizza-party";

describe("isFridayPizzaPartyPromo", () => {
  it("accepts only the named Friday pizza-party preset", () => {
    expect(isFridayPizzaPartyPromo("friday-pizza-party")).toBe(true);
    expect(isFridayPizzaPartyPromo("pickup")).toBe(false);
  });
});
