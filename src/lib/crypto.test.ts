import { describe, it, expect } from "vitest";
import { generateApiKey, hashKey, encryptKey, decryptKey, maskKey, keyPrefix, lastFour } from "./crypto";

describe("crypto", () => {
  it("generates a live key with correct format", () => {
    const k = generateApiKey("live");
    expect(k).toMatch(/^sk_live_[0-9A-Za-z]{40}$/);
  });
  it("generates unique keys", () => {
    expect(generateApiKey("test")).not.toBe(generateApiKey("test"));
  });
  it("hashes deterministically to 64 hex chars", () => {
    const k = generateApiKey("live");
    expect(hashKey(k)).toBe(hashKey(k));
    expect(hashKey(k)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("encrypts and decrypts round-trip", () => {
    const k = generateApiKey("live");
    const enc = encryptKey(k);
    expect(enc.ciphertext).not.toContain(k);
    expect(decryptKey(enc)).toBe(k);
  });
  it("fails to decrypt tampered ciphertext", () => {
    const enc = encryptKey(generateApiKey("live"));
    const bad = { ...enc, authTag: "0".repeat(enc.authTag.length) };
    expect(() => decryptKey(bad)).toThrow();
  });
  it("masks key for display", () => {
    expect(maskKey("sk_live_51H8", "e2c1")).toBe("sk_live_51H8...e2c1");
  });
  it("extracts prefix and last four", () => {
    const k = "sk_live_51H8abcdEFGH";
    expect(keyPrefix(k)).toBe("sk_live_51H8");
    expect(lastFour(k)).toBe("EFGH");
  });
});
