import { z } from "zod";

export const playerNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(20, "Name must be 20 characters or less")
  .regex(/^[a-zA-Z0-9 _-]+$/, "Use letters, numbers, space, _ or -");

export function sanitizePlayerName(input: unknown): string {
  return playerNameSchema.parse(input);
}
