import { randomBytes, createHash, createCipheriv, createDecipheriv } from "crypto";
import { env } from "./env";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function base62(bytes: Buffer): string {
  let out = "";
  for (const b of bytes) out += BASE62[b % 62];
  return out;
}

export function generateApiKey(environment: "live" | "test"): string {
  return `sk_${environment}_${base62(randomBytes(40))}`;
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// 32-byte AES key derived from the env secret (secret may be any string).
function encKey(): Buffer {
  return createHash("sha256").update(env.API_KEY_ENC_SECRET).digest();
}

export function encryptKey(key: string): { ciphertext: string; iv: string; authTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("hex"), iv: iv.toString("hex"), authTag: cipher.getAuthTag().toString("hex") };
}

export function decryptKey(parts: { ciphertext: string; iv: string; authTag: string }): string {
  const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(parts.iv, "hex"));
  decipher.setAuthTag(Buffer.from(parts.authTag, "hex"));
  const out = Buffer.concat([decipher.update(Buffer.from(parts.ciphertext, "hex")), decipher.final()]);
  return out.toString("utf8");
}

export function keyPrefix(key: string): string {
  return key.slice(0, 12);
}

export function lastFour(key: string): string {
  return key.slice(-4);
}

export function maskKey(prefix: string, last4: string): string {
  return `${prefix}...${last4}`;
}
