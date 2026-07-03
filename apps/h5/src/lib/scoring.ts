import { OPTION_SCORES, QUESTIONS } from "@tata/shared-config";
import { RESULTS } from "@tata/shared-config";
import type { OptionKey, QuizResult } from "../types";

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
  return { ...result, score };
}

export function calculateResult(answers: OptionKey[]) {
  return getResultByScore(calculateScore(answers));
}
