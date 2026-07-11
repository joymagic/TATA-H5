const runtimeEnv = import.meta.env ?? {};

export const ACTIVITY_CONFIG = {
  activityId: runtimeEnv.VITE_ACTIVITY_ID || "tata-silent-personality-2026-dev",
  environmentLabel: runtimeEnv.VITE_ENV_LABEL || "DEV ENV",
  allowRepeatQuiz: true,
  allowRepeatLead: false,
  allowRepeatLottery: false,
  activityPeriod: {
    startAt: "2026-07-23T00:00:00+08:00",
    endAt: "2026-08-31T23:59:59+08:00",
    label: "2026.07.23-2026.08.31",
  },
  privacyPolicyUrl: "#todo-privacy-policy",
  shareUrl: runtimeEnv.VITE_SHARE_URL || "https://example.com/tata-silent-personality",
  mockCities: ["北京", "上海", "广州", "深圳", "杭州", "成都"],
  lottery: {
    drawChancePerUser: 1,
    enforceActivityPeriod: false,
    identityScopes: ["phone", "device"],
    prizeLevels: [
      { code: "SPECIAL", name: "特等奖", total: 100, probability: 1.5151515152 },
      { code: "FIRST", name: "一等奖", total: 500, probability: 7.5757575758 },
      { code: "SECOND", name: "二等奖", total: 1000, probability: 15.1515151515 },
      { code: "THIRD", name: "三等奖", total: 5000, probability: 75.7575757576 },
    ],
  },
};
