import {
  COUPON_BATCH,
  COUPON_SUMMARY,
  COUPONS,
  type CouponRecord,
} from "@tata/shared-config/coupons";
import { ACTIVITY_CONFIG } from "@tata/shared-config";

export type AdminRole = "HEADQUARTERS_ADMIN" | "CITY_ADMIN";
export type AdminView = "dashboard" | "users";
export type DataSource = "mock" | "api";
export type RuntimeEnv = "development" | "fat" | "testing" | "production";
export type DateRange = "today" | "last7" | "last30" | "all";
export type Personality = "悦己淡人" | "沉浸领主" | "安睡主宰" | "头号玩家";
export type CityFilter = "all" | string;
export type PersonalityFilter = "all" | Personality;
export type PrizeFilter = "all" | string;

export interface AdminSession {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  city: string;
  lastLoginAt: string;
}

export interface DemoAccount extends AdminSession {
  password: string;
}

export interface DashboardFilters {
  dateRange: DateRange;
  city: CityFilter;
  channel: "all" | string;
  personality: PersonalityFilter;
}

export interface UserFilters {
  keyword: string;
  city: CityFilter;
  personality: PersonalityFilter;
  prize: PrizeFilter;
  dateRange: DateRange;
}

export interface LeadRecord {
  id: string;
  submittedAt: string;
  name: string;
  phone: string;
  city: string;
  personality: Personality;
  level: string;
  score: number;
  prize: string;
  couponCode: string;
  couponIssuedAt?: string;
  channel: string;
}

export interface MetricValue {
  label: string;
  value: number;
  hint: string;
}

export interface DistributionValue {
  label: string;
  value: number;
}

export interface DashboardData {
  metrics: MetricValue[];
  personality: DistributionValue[];
  funnel: DistributionValue[];
  channel: DistributionValue[];
  city: DistributionValue[];
}

export interface IssuedCouponRecord {
  code: string;
  prize: string;
  status: "已发放" | "已停用";
  phone: string;
  city: string;
  issuedAt: string;
}

export interface OperationLog {
  id: string;
  action: string;
  detail: string;
  operator: string;
  createdAt: string;
}

export interface RuntimeConfig {
  env: RuntimeEnv;
  badge: "DEV ENV" | "FAT ENV" | "TEST ENV" | "PROD ENV";
  dataSource: DataSource;
  useMockData: boolean;
  apiBaseUrl: string;
  datasetLabel: string;
  datasetNotice: string;
}

export interface PrizeLevelConfig {
  code: string;
  name: string;
  total: number;
  probability: number;
}

const MOCK_NOW = new Date("2026-07-28T22:00:00+08:00");
const LOCAL_COUPONS = import.meta.env.VITE_ADMIN_DATA_SOURCE === "api" ? [] : COUPONS;

export const CITIES = ["北京", "上海", "广州", "深圳", "杭州", "成都"] as const;
export const CHANNELS = ["门店二维码", "品牌公众号", "微信朋友圈", "微信群", "小红书"] as const;
export const PERSONALITIES: Personality[] = ["悦己淡人", "沉浸领主", "安睡主宰", "头号玩家"];
export const PRIZE_LEVEL_CONFIGS = recalculatePrizeProbabilities(ACTIVITY_CONFIG.lottery.prizeLevels);
export const PRIZES = PRIZE_LEVEL_CONFIGS.map((prize) => prize.name);

const COUPON_PRIZE_NAME_BY_AMOUNT = new Map(
  [...COUPON_SUMMARY]
    .sort((left, right) => right.amount - left.amount)
    .map((tier, index) => [tier.amount, PRIZE_LEVEL_CONFIGS[index]?.name ?? PRIZES[PRIZES.length - 1] ?? "三等奖"])
);

export const COUPON_EXPORT_PATH = "./data/coupons.csv";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "admin-hq-demo",
    username: "hq_admin",
    password: "TATA2026",
    displayName: "总部管理员",
    role: "HEADQUARTERS_ADMIN",
    city: "全国",
    lastLoginAt: "2026-07-28 09:18",
  },
  {
    id: "admin-sh-demo",
    username: "sh_admin",
    password: "TATA2026",
    displayName: "上海城市管理员",
    role: "CITY_ADMIN",
    city: "上海",
    lastLoginAt: "2026-07-28 09:35",
  },
];

export const INITIAL_DASHBOARD_FILTERS: DashboardFilters = {
  dateRange: "last7",
  city: "all",
  channel: "all",
  personality: "all",
};

export const INITIAL_USER_FILTERS: UserFilters = {
  keyword: "",
  city: "all",
  personality: "all",
  prize: "all",
  dateRange: "last30",
};

export const MOCK_LEADS: LeadRecord[] = [
  lead("L20260706001", "2026-07-28 10:24", "林若安", "13812345678", "上海", "头号玩家", "IV", 29, "特等奖", 0, "门店二维码"),
  lead("L20260706002", "2026-07-28 10:41", "陈知夏", "13922345678", "北京", "安睡主宰", "III", 23, "一等奖", 6, "品牌公众号"),
  lead("L20260706003", "2026-07-28 11:02", "周念一", "13732345678", "广州", "沉浸领主", "II", 17, "二等奖", 22, "微信朋友圈"),
  lead("L20260706004", "2026-07-28 11:28", "许言", "13642345678", "深圳", "悦己淡人", "I", 12, "三等奖", 31, "微信群"),
  lead("L20260706005", "2026-07-28 12:09", "赵清和", "13552345678", "杭州", "头号玩家", "IV", 31, "一等奖", 41, "小红书"),
  lead("L20260706006", "2026-07-28 13:17", "吴予白", "13462345678", "成都", "安睡主宰", "III", 22, "二等奖", 54, "门店二维码"),
  lead("L20260706007", "2026-07-28 14:36", "郑小满", "13372345678", "上海", "沉浸领主", "II", 18, "三等奖", 69, "品牌公众号"),
  lead("L20260706008", "2026-07-28 15:11", "王岚", "13282345678", "北京", "悦己淡人", "I", 11, "三等奖", 81, "微信朋友圈"),
  lead("L20260705001", "2026-07-27 10:18", "刘沐", "13192345678", "广州", "头号玩家", "IV", 28, "二等奖", 96, "微信群"),
  lead("L20260705002", "2026-07-27 11:43", "何嘉木", "15912345678", "深圳", "安睡主宰", "III", 21, "三等奖", 112, "门店二维码"),
  lead("L20260705003", "2026-07-27 13:27", "马亦宁", "15822345678", "杭州", "沉浸领主", "II", 16, "一等奖", 124, "品牌公众号"),
  lead("L20260705004", "2026-07-27 16:38", "宋可", "15732345678", "成都", "悦己淡人", "I", 10, "三等奖", 139, "小红书"),
  lead("L20260704001", "2026-07-26 09:42", "唐柠", "15642345678", "上海", "安睡主宰", "III", 24, "二等奖", 151, "微信朋友圈"),
  lead("L20260704002", "2026-07-26 11:05", "姜南", "15552345678", "北京", "头号玩家", "IV", 30, "特等奖", 169, "门店二维码"),
  lead("L20260704003", "2026-07-26 14:52", "曹屿", "15462345678", "广州", "沉浸领主", "II", 15, "三等奖", 187, "品牌公众号"),
  lead("L20260703001", "2026-07-25 10:33", "沈知微", "15372345678", "深圳", "悦己淡人", "I", 13, "三等奖", 205, "微信群"),
  lead("L20260703002", "2026-07-25 13:09", "程方舟", "15282345678", "杭州", "安睡主宰", "III", 25, "二等奖", 223, "小红书"),
  lead("L20260702001", "2026-07-24 09:54", "叶初", "15192345678", "成都", "头号玩家", "IV", 32, "一等奖", 241, "品牌公众号"),
  lead("L20260702002", "2026-07-24 15:42", "韩书", "15012345678", "上海", "沉浸领主", "II", 19, "三等奖", 266, "门店二维码"),
  lead("L20260701001", "2026-07-23 10:12", "魏棠", "14922345678", "北京", "悦己淡人", "I", 9, "三等奖", 301, "微信朋友圈"),
  lead("L20260701002", "2026-07-23 17:05", "顾西洲", "14832345678", "广州", "安睡主宰", "III", 20, "二等奖", 318, "门店二维码"),
  lead("L20260630001", "2026-07-23 11:31", "陆眠", "14742345678", "深圳", "头号玩家", "IV", 27, "一等奖", 336, "小红书"),
  lead("L20260629001", "2026-07-24 16:20", "苏晚", "14652345678", "杭州", "沉浸领主", "II", 14, "三等奖", 351, "品牌公众号"),
  lead("L20260628001", "2026-07-25 14:08", "钟予", "14562345678", "成都", "悦己淡人", "I", 8, "三等奖", 372, "微信群"),
];

export function getRuntimeConfig(): RuntimeConfig {
  const explicitEnv = (import.meta.env.VITE_ADMIN_ENV ?? "").toLowerCase();
  const viteMode = (import.meta.env.MODE ?? "").toLowerCase();
  const env = normalizeRuntimeEnv(explicitEnv || (viteMode === "testing" ? "testing" : "development"));
  const configuredSource = (import.meta.env.VITE_ADMIN_DATA_SOURCE ?? "").toLowerCase();
  const dataSource: DataSource =
    configuredSource === "mock" ? "mock" : configuredSource === "api" ? "api" : env === "development" ? "mock" : "api";
  const useMockData = dataSource === "mock";
  const apiBaseUrl = (import.meta.env.VITE_ADMIN_API_BASE_URL ?? "").replace(/\/$/, "");
  const isTestingPreview = env === "testing" && useMockData;
  const isFatPreview = env === "fat" && useMockData;
  const isFatApi = env === "fat" && !useMockData;
  const isProductionPreview = env === "production" && useMockData;

  return {
    env,
    badge: env === "fat" ? "FAT ENV" : env === "testing" ? "TEST ENV" : env === "production" ? "PROD ENV" : "DEV ENV",
    dataSource,
    useMockData,
    apiBaseUrl,
    datasetLabel: isFatApi
      ? "FAT 1.0 实时测试数据"
      : isFatPreview
      ? "FAT 1.0 测试数据"
      : isTestingPreview
      ? "测试预览数据"
      : isProductionPreview
      ? "真实环境预览数据"
      : useMockData
      ? "开发演示数据"
      : "测试环境 API",
    datasetNotice: isFatApi
      ? "当前 H5 与 Admin 共用独立 FAT API 和测试数据库，数据实时同步。"
      : isFatPreview
      ? "当前为 FAT 1.0 测试环境 Admin，使用独立 mock 数据验收。"
      : isTestingPreview
      ? "当前为测试环境 Admin 预览页，使用 mock 数据便于验收。"
      : isProductionPreview
      ? "当前为真实环境 Admin 预览页，后端接入前使用 mock 数据验收前端流程。"
      : useMockData
      ? "当前数据仅用于本地开发演示，不属于测试环境数据。"
      : "当前页面将从独立测试环境 API 读取数据，不加载本地 mock。配置 VITE_ADMIN_API_BASE_URL 后启用。",
  };
}

export function loginWithMockAccount(username: string, password: string): AdminSession | null {
  const account = DEMO_ACCOUNTS.find((item) => item.username === username.trim());
  if (!account || account.password !== password) return null;
  const { password: _password, ...session } = account;
  return session;
}

export function withRoleDefaults(session: AdminSession, filters: DashboardFilters): DashboardFilters {
  if (session.role === "CITY_ADMIN") return { ...filters, city: session.city };
  return filters;
}

export function getScopedLeads(
  session: AdminSession,
  filters: UserFilters | DashboardFilters,
  sourceLeads: LeadRecord[] = MOCK_LEADS
): LeadRecord[] {
  const referenceNow = sourceLeads === MOCK_LEADS ? MOCK_NOW : new Date();
  return sourceLeads.filter((leadItem) => {
    if (session.role === "CITY_ADMIN" && leadItem.city !== session.city) return false;
    if ("city" in filters && filters.city !== "all" && leadItem.city !== filters.city) return false;
    if ("personality" in filters && filters.personality !== "all" && leadItem.personality !== filters.personality) return false;
    if ("channel" in filters && filters.channel !== "all" && leadItem.channel !== filters.channel) return false;
    if ("prize" in filters && filters.prize !== "all" && leadItem.prize !== filters.prize) return false;
    if (!isWithinDateRange(leadItem.submittedAt, filters.dateRange, referenceNow)) return false;
    if ("keyword" in filters) {
      const keyword = filters.keyword.trim().toLowerCase();
      if (!keyword) return true;
      return (
        leadItem.name.toLowerCase().includes(keyword) ||
        leadItem.phone.includes(keyword) ||
        leadItem.couponCode.toLowerCase().includes(keyword)
      );
    }
    return true;
  });
}

export function getDashboardData(session: AdminSession, filters: DashboardFilters, sourceLeads: LeadRecord[] = MOCK_LEADS): DashboardData {
  const scopedLeads = getScopedLeads(session, withRoleDefaults(session, filters), sourceLeads);
  const leadCount = scopedLeads.length;
  const visits = Math.max(leadCount * 7 + 128, leadCount);
  const starts = Math.max(leadCount * 5 + 36, leadCount);
  const completed = Math.max(leadCount * 3 + 24, leadCount);
  const resultViews = Math.max(completed - Math.floor(leadCount / 2), leadCount);
  const lotteryUsers = leadCount;

  return {
    metrics: [
      metric("活动访问人数", visits, "去重 anonymousId"),
      metric("开始测试人数", starts, "至少选择过一道题"),
      metric("完成测试人数", completed, "完成五题并产生结果"),
      metric("进入结果页人数", resultViews, "触发 result_view"),
      metric("提交客资人数", leadCount, "成功提交客资"),
      metric("抽奖人数", lotteryUsers, "成功创建抽奖记录"),
    ],
    personality: countBy(scopedLeads, (item) => item.personality, PERSONALITIES),
    funnel: [
      { label: "访问", value: visits },
      { label: "开始", value: starts },
      { label: "完成", value: completed },
      { label: "结果页", value: resultViews },
      { label: "客资", value: leadCount },
      { label: "抽奖", value: lotteryUsers },
    ],
    channel: countBy(scopedLeads, (item) => item.channel, [...CHANNELS]),
    city: countBy(scopedLeads, (item) => item.city),
  };
}

export function getIssuedCoupons(session: AdminSession, filters: UserFilters, sourceLeads: LeadRecord[] = MOCK_LEADS): IssuedCouponRecord[] {
  return getScopedLeads(session, filters, sourceLeads).filter((item) => item.couponCode && item.couponCode !== "—").map((item) => ({
    code: item.couponCode,
    prize: item.prize,
    status: "已发放",
    phone: maskPhone(item.phone),
    city: item.city,
    issuedAt: item.couponIssuedAt || item.submittedAt,
  }));
}

export function getCouponInventoryRows(session: AdminSession, disabledCodes: Set<string>): CouponRecord[] {
  if (session.role === "CITY_ADMIN") return [];
  return LOCAL_COUPONS.slice(0, 80).map((coupon) =>
    disabledCodes.has(coupon.code) ? { ...coupon, status: "redeemed" } : coupon
  );
}

export function maskPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function formatAmount(value: number) {
  return `￥${formatNumber(value)}`;
}

export function formatPrizeProbability(value: number) {
  const normalized = value < 1 ? value.toFixed(2) : value < 10 ? value.toFixed(1) : value.toFixed(2);
  return `${normalized.replace(/\.?0+$/, "")}%`;
}

export function recalculatePrizeProbabilities(configs: PrizeLevelConfig[]): PrizeLevelConfig[] {
  const totalCount = configs.reduce((total, prize) => total + Math.max(0, prize.total), 0);
  return configs.map((prize) => ({
    ...prize,
    total: Math.max(0, prize.total),
    probability: totalCount > 0 ? (Math.max(0, prize.total) / totalCount) * 100 : 0,
  }));
}

export function prizeNameForCouponAmount(amount: number) {
  return COUPON_PRIZE_NAME_BY_AMOUNT.get(amount) ?? PRIZES[PRIZES.length - 1] ?? "三等奖";
}

export function roleLabel(role: AdminRole) {
  return role === "HEADQUARTERS_ADMIN" ? "总部 ADMIN" : "城市 ADMIN";
}

export function createLeadCsv(rows: LeadRecord[], includeRawPhone: boolean) {
  return toCsv(
    ["提交时间", "姓名", "手机号", "城市", "人格", "测试得分", "奖项", "奖券码", "渠道"],
    rows.map((row) => [
      row.submittedAt,
      row.name,
      includeRawPhone ? row.phone : maskPhone(row.phone),
      row.city,
      row.personality,
      String(row.score),
      row.prize,
      row.couponCode,
      row.channel,
    ])
  );
}

export function createIssuedCouponCsv(rows: IssuedCouponRecord[]) {
  return toCsv(
    ["券码", "奖项", "状态", "绑定手机号", "所属城市", "发放时间"],
    rows.map((row) => [row.code, row.prize, row.status, row.phone, row.city, row.issuedAt])
  );
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function createOperationLog(action: string, detail: string, operator: string): OperationLog {
  return {
    id: `LOG-${Date.now()}`,
    action,
    detail,
    operator,
    createdAt: new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date()),
  };
}

export { COUPON_BATCH, COUPON_SUMMARY };

function lead(
  id: string,
  submittedAt: string,
  name: string,
  phone: string,
  city: string,
  personality: Personality,
  level: string,
  score: number,
  prize: string,
  couponIndex: number,
  channel: string
): LeadRecord {
  return {
    id,
    submittedAt,
    name,
    phone,
    city,
    personality,
    level,
    score,
    prize,
    couponCode: LOCAL_COUPONS[couponIndex]?.code ?? `TATA-DEMO-${couponIndex}`,
    channel,
  };
}

function normalizeRuntimeEnv(value: string): RuntimeEnv {
  if (value.includes("fat")) return "fat";
  if (value.includes("test")) return "testing";
  if (value.includes("prod")) return "production";
  return "development";
}

function metric(label: string, value: number, hint: string): MetricValue {
  return { label, value, hint };
}

function isWithinDateRange(value: string, range: DateRange, referenceNow = MOCK_NOW) {
  if (range === "all") return true;
  const date = parseAdminDate(value);
  const diffDays = (referenceNow.getTime() - date.getTime()) / 86400000;
  if (range === "today") return diffDays >= 0 && diffDays < 1;
  if (range === "last7") return diffDays >= 0 && diffDays < 7;
  return diffDays >= 0 && diffDays < 30;
}

export function getAvailableCities(sourceLeads: LeadRecord[] = MOCK_LEADS) {
  return [...new Set(sourceLeads.map((item) => item.city).filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function countBy<T>(rows: T[], pick: (row: T) => string, order?: string[]): DistributionValue[] {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = pick(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const labels = order ?? [...counts.keys()].sort((left, right) => (counts.get(right)! - counts.get(left)!) || left.localeCompare(right, "zh-CN"));
  return labels.map((label) => ({ label, value: counts.get(label) ?? 0 }));
}

function parseAdminDate(value: string) {
  return new Date(`${value.replace(" ", "T")}:00+08:00`);
}

function toCsv(headers: string[], rows: string[][]) {
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapeCsvCell(value: string) {
  const normalized = value.replace(/"/g, '""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
}
