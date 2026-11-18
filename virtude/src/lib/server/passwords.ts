import "server-only";
import { compare, hash } from "bcryptjs";

export function passwordRounds() {
  return process.env.NODE_ENV === "test" ? 4 : 12;
}

export function hashPassword(password: string) {
  return hash(password, passwordRounds());
}

export function checkPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}
