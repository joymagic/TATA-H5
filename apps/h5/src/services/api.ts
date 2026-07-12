import { ACTIVITY_CONFIG } from "@tata/shared-config";
import type { LeadFormState, LotteryPrize, OptionKey, QuizResult, SessionState } from "../types";
import { LotteryRuleError, mockApi } from "./mockApi";

const DATA_SOURCE = (import.meta.env.VITE_H5_DATA_SOURCE || "mock").toLowerCase();
const API_BASE_URL = (import.meta.env.VITE_H5_API_BASE_URL || "").replace(/\/$/, "");
const DEVICE_KEY = "tata-silent-fat-device-id";
let activeSession: SessionState | null = null;

const remoteApi = {
  clearFlow() {},
  async createSession(channel = "direct"): Promise<SessionState> {
    const deviceId = getDeviceId();
    const session = await request<SessionState>("/api/v1/h5/sessions", {
      method: "POST",
      body: JSON.stringify({ activityId: ACTIVITY_CONFIG.activityId, anonymousId: deviceId, deviceId, channel }),
    });
    activeSession = session;
    return session;
  },
  async submitQuiz(answers: OptionKey[]): Promise<QuizResult> {
    return request<QuizResult>(sessionPath("quiz"), { method: "POST", body: JSON.stringify({ answers }) });
  },
  async submitLead(lead: LeadFormState) {
    return request<{ ok: boolean }>(sessionPath("lead"), { method: "POST", body: JSON.stringify(normalizeLeadForApi(lead)) });
  },
  async drawLottery(idempotencyKey: string): Promise<LotteryPrize> {
    try {
      return await request<LotteryPrize>(sessionPath("lottery"), { method: "POST", body: JSON.stringify({ idempotencyKey }) });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "";
      if (code === "LEAD_REQUIRED") throw new LotteryRuleError("LEAD_REQUIRED");
      if (code === "ACTIVITY_INACTIVE") throw new LotteryRuleError("ACTIVITY_INACTIVE");
      throw error;
    }
  },
};

export const activityApi = DATA_SOURCE === "api" ? remoteApi : mockApi;
export { LotteryRuleError };

function sessionPath(action: string) {
  if (!activeSession) throw new ApiError("SESSION_NOT_FOUND", "测试会话不存在");
  return `/api/v1/h5/sessions/${encodeURIComponent(activeSession.sessionToken)}/${action}`;
}

function getDeviceId() {
  const current = window.localStorage.getItem(DEVICE_KEY);
  if (current) return current;
  const next = `device_${crypto.randomUUID()}`;
  window.localStorage.setItem(DEVICE_KEY, next);
  return next;
}

function normalizeLeadForApi(lead: LeadFormState): LeadFormState {
  return {
    ...lead,
    province: lead.province.trim(),
    city: lead.city.trim().replace(/市$/, ""),
  };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload?.error?.code || "REQUEST_FAILED", payload?.error?.message || "请求失败");
  return payload.data as T;
}

class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
