import { describe, it, expect } from "vitest";
import { extractBearer } from "./validate";

describe("extractBearer", () => {
  it("returns token from a valid Bearer header", () => {
    expect(extractBearer("Bearer sk_live_abc")).toBe("sk_live_abc");
  });
  it("returns null for missing header", () => {
    expect(extractBearer(null)).toBeNull();
  });
  it("returns null for malformed header", () => {
    expect(extractBearer("Token sk_live_abc")).toBeNull();
    expect(extractBearer("Bearer")).toBeNull();
  });
});
