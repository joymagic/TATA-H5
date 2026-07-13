import assert from "node:assert/strict";
import { OPTION_SCORES, QUESTIONS, RESULTS } from "../packages/shared-config/src/index.js";

function calculateScore(answers) {
  return answers.reduce((total, answer, index) => {
    return total + OPTION_SCORES[answer] * QUESTIONS[index].weight;
  }, 0);
}

function resultFor(score) {
  return RESULTS.find((item) => score >= item.minScore && score <= item.maxScore);
}

const boundaryCases = [
  { score: 8, title: "悦己淡人" },
  { score: 13, title: "悦己淡人" },
  { score: 14, title: "沉浸领主" },
  { score: 19, title: "沉浸领主" },
  { score: 20, title: "安睡主宰" },
  { score: 25, title: "安睡主宰" },
  { score: 26, title: "头号玩家" },
  { score: 32, title: "头号玩家" },
];

assert.equal(calculateScore(["A", "A", "A", "A", "A"]), 8);
assert.equal(calculateScore(["D", "D", "D", "D", "D"]), 32);

for (const testCase of boundaryCases) {
  assert.equal(resultFor(testCase.score)?.title, testCase.title);
}

assert.equal(calculateScore(["A", "B", "C", "D", "A"]), 20);
assert.equal(resultFor(calculateScore(["A", "B", "C", "D", "A"]))?.title, "安睡主宰");

console.log("Score boundary tests passed.");
