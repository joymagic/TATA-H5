export type OptionKey = "A" | "B" | "C" | "D";

export type Screen =
  | "loading"
  | "home"
  | "quiz"
  | "resultLoading"
  | "result"
  | "lead"
  | "lottery"
  | "lotteryResult";

export interface QuizResult {
  score: number;
  id: string;
  level: string;
  levelName: string;
  levelDisplay: string;
  title: string;
  scene: string;
  description: string;
  productKey: string;
}

export interface SessionState {
  sessionToken: string;
  anonymousId: string;
  activityId: string;
  channel: string;
  createdAt: string;
}

export interface LeadFormState {
  name: string;
  phone: string;
  city: string;
  privacyConsent: boolean;
}

export interface LotteryPrize {
  prizeName: string;
  couponCode: string;
  resultStatus: "WIN";
}
