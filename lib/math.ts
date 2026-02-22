import { z } from "zod";
import type { MathProblem, Operator } from "@/types/game";

const opPool: Operator[] = ["+", "-", "*"];

export function generateMathProblem(): MathProblem {
  const op = opPool[Math.floor(Math.random() * opPool.length)];

  let a: number;
  let b: number;

  if (op === "*") {
    a = randInt(2, 12);
    b = randInt(2, 12);
  } else if (op === "-") {
    a = randInt(10, 99);
    b = randInt(0, a);
  } else {
    a = randInt(1, 99);
    b = randInt(1, 99);
  }

  return {
    a,
    b,
    op,
    text: `${a} ${op} ${b}`,
    nonce: crypto.randomUUID().replace(/-/g, "").slice(0, 16)
  };
}

export function evaluateProblem(problem: MathProblem): number {
  switch (problem.op) {
    case "+":
      return problem.a + problem.b;
    case "-":
      return problem.a - problem.b;
    case "*":
      return problem.a * problem.b;
    default:
      throw new Error("Unsupported operator");
  }
}

const answerSchema = z.coerce.number().int().min(-1000000).max(1000000);

export function sanitizeAnswer(value: unknown): number {
  return answerSchema.parse(value);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
