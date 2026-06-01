import crypto from "node:crypto";

// Unambiguous alphabet (no 0/O/1/I) for human-readable ticket codes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTicketCode(): string {
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `WSC-${out.slice(0, 4)}-${out.slice(4)}`;
}

export function newId(): string {
  return crypto.randomUUID();
}
