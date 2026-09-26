import { hash, verify, Algorithm } from '@node-rs/argon2';

// OWASP baseline for Argon2id
const OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(hashString: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashString, plain, OPTIONS);
  } catch {
    // Malformed hash in DB → treat as non-match, never throw into the auth path
    return false;
  }
}