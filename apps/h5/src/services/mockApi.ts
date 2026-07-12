import { ACTIVITY_CONFIG } from "@tata/shared-config";
import type { LeadFormState, LotteryPrize, OptionKey, QuizResult, SessionState } from "../types";
import { calculateResult } from "../lib/scoring";

const STORAGE_KEY = "tata-silent-h5-state";
const DEVICE_KEY = "tata-silent-device-id";
const LOTTERY_CLAIMS_KEY = "tata-silent-lottery-claims";

interface PersistedState {
  session?: SessionState;
  answers?: OptionKey[];
  result?: QuizResult;
  lead?: LeadFormState;
  prize?: LotteryPrize;
}

interface LotteryClaim {
  phone: string;
  deviceId: string;
  prize: LotteryPrize;
}

export type LotteryRuleErrorCode = "ACTIVITY_INACTIVE" | "CONFIG_MISSING" | "LEAD_REQUIRED";

export class LotteryRuleError extends Error {
  code: LotteryRuleErrorCode;

  constructor(code: LotteryRuleErrorCode) {
    super(code);
    this.code = code;
  }
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

function getDeviceId() {
  const current = window.localStorage.getItem(DEVICE_KEY);
  if (current) return current;
  const next = createToken("device");
  window.localStorage.setItem(DEVICE_KEY, next);
  return next;
}

function readClaims(): LotteryClaim[] {
  try {
    const claims = JSON.parse(window.localStorage.getItem(LOTTERY_CLAIMS_KEY) ?? "[]");
    return Array.isArray(claims) ? claims : [];
  } catch {
    return [];
  }
}

function writeClaims(claims: LotteryClaim[]) {
  window.localStorage.setItem(LOTTERY_CLAIMS_KEY, JSON.stringify(claims));
}

function delay<T>(value: T, ms = 420) {
  return new Promise<T>((resolve) => window.setTimeout(() => resolve(value), ms));
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function createCouponCode(phone: string, prizeCode: string) {
  const prizePrefix: Record<string, string> = {
    SPECIAL: "TD",
    FIRST: "YD",
    SECOND: "ED",
    THIRD: "SD",
  };
  const seed = `${phone}${Date.now()}${Math.floor(Math.random() * 1000000)}`.replace(/\D/g, "");
  const suffix = (seed + "862609158713").slice(0, 12).padEnd(12, "0");
  return `TATA-${prizePrefix[prizeCode] ?? "JP"}-${suffix.slice(0, 4)}-${suffix.slice(4, 8)}-${suffix.slice(8, 12)}`;
}

function isActivityActive() {
  if (!ACTIVITY_CONFIG.lottery.enforceActivityPeriod) return true;
  const now = Date.now();
  const startsAt = new Date(ACTIVITY_CONFIG.activityPeriod.startAt).getTime();
  const endsAt = new Date(ACTIVITY_CONFIG.activityPeriod.endAt).getTime();
  return now >= startsAt && now <= endsAt;
}

function hashToUnit(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function selectPrizeLevel(seed: string) {
  const prizeLevels = ACTIVITY_CONFIG.lottery.prizeLevels;
  const fallback = prizeLevels[prizeLevels.length - 1];
  if (!fallback) throw new LotteryRuleError("CONFIG_MISSING");

  const totalProbability = prizeLevels.reduce((total, prize) => total + prize.probability, 0);
  const roll = hashToUnit(seed) * totalProbability;
  let cursor = 0;

  for (const prize of prizeLevels) {
    cursor += prize.probability;
    if (roll <= cursor) return prize;
  }
  return fallback;
}

function findExistingClaim(phone: string, deviceId: string) {
  return readClaims().find((claim) => claim.phone === phone || claim.deviceId === deviceId);
}

export const mockApi = {
  readState,
  clearFlow() {
    const { session } = readState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ session }));
  },
  async createSession(channel = "direct") {
    const deviceId = getDeviceId();
    const session: SessionState = {
      sessionToken: createToken("session"),
      anonymousId: deviceId,
      deviceId,
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
    writeState({
      lead: {
        ...lead,
        name: lead.name.trim(),
        phone: normalizePhone(lead.phone),
        province: lead.province.trim(),
        city: lead.city.trim().replace(/市$/, ""),
      },
    });
    return delay({ ok: true }, 520);
  },
  async drawLottery(idempotencyKey: string) {
    const state = readState();
    if (state.prize) return delay(state.prize, 480);
    if (!state.lead) throw new LotteryRuleError("LEAD_REQUIRED");
    if (!isActivityActive()) throw new LotteryRuleError("ACTIVITY_INACTIVE");

    const phone = normalizePhone(state.lead.phone);
    const deviceId = state.session?.deviceId ?? getDeviceId();
    const existingClaim = findExistingClaim(phone, deviceId);
    if (existingClaim) {
      writeState({ prize: existingClaim.prize });
      return delay(existingClaim.prize, 480);
    }

    const issuedAt = new Date().toISOString();
    const prizeLevel = selectPrizeLevel(`${ACTIVITY_CONFIG.activityId}:${phone}:${deviceId}:${idempotencyKey}`);
    const prize: LotteryPrize = {
      prizeLevel: prizeLevel.code,
      prizeName: prizeLevel.name,
      couponCode: createCouponCode(phone, prizeLevel.code),
      resultStatus: "WIN",
      issuedAt,
      expiresAt: ACTIVITY_CONFIG.activityPeriod.endAt,
    };
    writeClaims([...readClaims(), { phone, deviceId, prize }]);
    writeState({ prize });
    return delay(prize, 1500);
  },
};
