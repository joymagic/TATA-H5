import { OPTION_SCORES, QUESTIONS } from "@tata/shared-config";
import { RESULTS } from "@tata/shared-config";
import type { OptionKey, ProductKey, QuizResult } from "../types";

const PRODUCT_KEYS = new Set<ProductKey>(["level1", "level2", "level3", "level4"]);

function toProductKey(value: string): ProductKey {
  if (PRODUCT_KEYS.has(value as ProductKey)) return value as ProductKey;
  throw new Error(`Unknown product key: ${value}`);
}

export function calculateScore(answers: OptionKey[]) {
  return answers.reduce((total, answer, index) => {
    const score = OPTION_SCORES[answer] ?? 0;
    const weight = QUESTIONS[index]?.weight ?? 1;
    return total + score * weight;
  }, 0);
}

export function getResultByScore(score: number): QuizResult {
  const result = RESULTS.find((item) => score >= item.minScore && score <= item.maxScore);
  if (!result) {
    throw new Error(`Score out of result ranges: ${score}`);
  }
  return { ...result, productKey: toProductKey(result.productKey), score };
}

export function calculateResult(answers: OptionKey[]) {
  return getResultByScore(calculateScore(answers));
}
