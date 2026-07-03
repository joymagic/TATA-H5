import { ACTIVITY_CONFIG } from "@tata/shared-config";
import type { LeadFormState, LotteryPrize, OptionKey, QuizResult, SessionState } from "../types";
import { calculateResult } from "../lib/scoring";

const STORAGE_KEY = "tata-silent-h5-state";

interface PersistedState {
  session?: SessionState;
  answers?: OptionKey[];
  result?: QuizResult;
  lead?: LeadFormState;
  prize?: LotteryPrize;
}

function readState(): PersistedState {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeState(next: PersistedState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), ...next }));
}

function createToken(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function delay<T>(value: T, ms = 420) {
  return new Promise<T>((resolve) => window.setTimeout(() => resolve(value), ms));
}

function createCouponCode(phone: string) {
  const seed = `${phone}${Date.now()}`.replace(/\D/g, "");
  const suffix = (seed + "8626091587").slice(0, 10).padEnd(10, "0");
  return `TATA${suffix}`;
}

export const mockApi = {
  readState,
  clearFlow() {
    const { session } = readState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ session }));
  },
  async createSession(channel = "direct") {
    const session: SessionState = {
      sessionToken: createToken("session"),
      anonymousId: createToken("anonymous"),
      activityId: ACTIVITY_CONFIG.activityId,
      channel,
      createdAt: new Date().toISOString(),
    };
    writeState({ session, answers: [], result: undefined, lead: undefined, prize: undefined });
    return delay(session, 220);
  },
  async submitQuiz(answers: OptionKey[]) {
    const result = calculateResult(answers);
    writeState({ answers, result });
    return delay(result, 680);
  },
  async submitLead(lead: LeadFormState) {
    writeState({ lead });
    return delay({ ok: true }, 520);
  },
  async drawLottery(idempotencyKey: string) {
    const state = readState();
    if (state.prize) return delay(state.prize, 480);
    const prize: LotteryPrize = {
      prizeName: ACTIVITY_CONFIG.lottery.defaultPrizeName,
      couponCode: createCouponCode(state.lead?.phone ?? idempotencyKey),
      resultStatus: "WIN",
    };
    writeState({ prize });
    return delay(prize, 1500);
  },
};
