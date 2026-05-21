import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return {
    algorithm: "scrypt-v1",
    salt,
    passwordHash,
  };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(scryptSync(password, salt, KEY_LENGTH).toString("hex"), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
