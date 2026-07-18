import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

// 备案 / 许可证编号为：沪 ICP 备 2026033411 号
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const APP_ENV = process.env.APP_ENV || "fat";
const DB_PATH = process.env.DB_PATH || process.env.FAT_DB_PATH || resolve(ROOT, ".data/tata-fat.sqlite");
const LEGACY_ADMIN_PASSWORD = process.env.FAT_ADMIN_PASSWORD || "TATA2026";
const ADMIN_ACCOUNTS_PATH = process.env.ADMIN_ACCOUNTS_PATH || "";
const ADMIN_COOKIE_NAME = APP_ENV === "production" ? "tata_prod_admin_session" : "tata_fat_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const ACTIVITY_ID = process.env.ACTIVITY_ID || (APP_ENV === "production" ? "tata-silent-personality-2026" : "tata-silent-personality-2026-fat-1.0");
const PROVINCES = new Set([
  "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江", "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州", "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆", "香港", "澳门", "台湾",
]);
const PRIZE_BY_AMOUNT = new Map([
  [100, { code: "SPECIAL", name: "特等奖", probability: 1.5151515152 }],
  [50, { code: "FIRST", name: "一等奖", probability: 7.5757575758 }],
  [20, { code: "SECOND", name: "二等奖", probability: 15.1515151515 }],
  [10, { code: "THIRD", name: "三等奖", probability: 75.7575757576 }],
]);
const RESULT_RANGES = [
  { id: "level1", level: "I", levelName: "柔静级", levelDisplay: "I 级柔静级", title: "悦己淡人", scene: "茶室品茗", minScore: 8, maxScore: 13, description: "家就是我的充电站\n日常喜欢客厅闲坐、茶室品茗\n我需要柔静级 Ⅰ级静音\n满足我的基础隔音需求", productKey: "level1" },
  { id: "level2", level: "II", levelName: "沉静级", levelDisplay: "II 级沉静级", title: "沉浸领主", scene: "书房阅读", minScore: 14, maxScore: 19, description: "我是独处至上星人\n在家喜欢看书、娱乐、学习\n我需要沉静级 Ⅱ级静音\n让我独享沉浸小世界", productKey: "level2" },
  { id: "level3", level: "III", levelName: "宁静级", levelDisplay: "III 级宁静级", title: "安睡主宰", scene: "卧室深睡", minScore: 20, maxScore: 25, description: "我是睡眠刚需人\n一点噪音直接失眠\n我需要宁静级 Ⅲ 级静音\n给我整夜深睡守护", productKey: "level3" },
  { id: "level4", level: "IV", levelName: "臻静级", levelDisplay: "IV 级臻静级", title: "头号玩家", scene: "电竞开黑", minScore: 26, maxScore: 32, description: "宅家也能当头号玩家\n热衷激情上分和观影\n我需要臻静级 Ⅳ 级静音\n尽情释放自己的热爱", productKey: "level4" },
];
const ADMIN_ACCOUNTS = loadAdminAccounts();

const db = new DatabaseSync(DB_PATH);
initializeDatabase();

export const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    const status = Number(error?.status) || 500;
    const code = error?.code || "INTERNAL_ERROR";
    if (status >= 500) console.error(error);
    json(response, status, { error: { code, message: status >= 500 ? "服务暂时不可用" : error.message } });
  }
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, HOST, () => console.log(`TATA ${APP_ENV} API listening on http://${HOST}:${PORT}`));
}

async function route(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const path = url.pathname;

  if (request.method === "GET" && path === "/api/v1/health") {
    return json(response, 200, { data: { ok: true, environment: APP_ENV, database: "sqlite", activityId: ACTIVITY_ID } });
  }

  if (request.method === "POST" && path === "/api/v1/h5/sessions") {
    const body = await readJson(request);
    const token = tokenValue("h5");
    const id = randomUUID();
    const now = new Date().toISOString();
    const deviceId = cleanText(body.deviceId, 100) || tokenValue("device");
    const channel = cleanText(body.channel, 60) || "direct";
    db.prepare(`INSERT INTO sessions (id, token, anonymous_id, device_id, activity_id, channel, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, token, cleanText(body.anonymousId, 100) || deviceId, deviceId, ACTIVITY_ID, channel, now);
    return json(response, 201, { data: { sessionToken: token, anonymousId: deviceId, deviceId, activityId: ACTIVITY_ID, channel, createdAt: now } });
  }

  const quizMatch = path.match(/^\/api\/v1\/h5\/sessions\/([^/]+)\/quiz$/);
  if (request.method === "POST" && quizMatch) {
    const session = requireH5Session(quizMatch[1]);
    const body = await readJson(request);
    const answers = Array.isArray(body.answers) ? body.answers : [];
    if (answers.length !== 5 || answers.some((answer) => !["A", "B", "C", "D"].includes(answer))) {
      throw httpError(400, "INVALID_ANSWERS", "请完成全部五道题");
    }
    const score = answers.reduce((total, answer, index) => total + ({ A: 1, B: 2, C: 3, D: 4 }[answer] * [1, 2, 2, 2, 1][index]), 0);
    const result = RESULT_RANGES.find((item) => score >= item.minScore && score <= item.maxScore);
    if (!result) throw httpError(500, "RESULT_CONFIG_ERROR", "结果配置异常");
    const now = new Date().toISOString();
    db.prepare(`UPDATE sessions SET answers_json = ?, score = ?, result_id = ?, result_title = ?, result_level = ?, started_at = COALESCE(started_at, ?), completed_at = ?, result_view_at = ? WHERE id = ?`)
      .run(JSON.stringify(answers), score, result.id, result.title, result.level, now, now, now, session.id);
    return json(response, 200, { data: { ...result, score } });
  }

  const leadMatch = path.match(/^\/api\/v1\/h5\/sessions\/([^/]+)\/lead$/);
  if (request.method === "POST" && leadMatch) {
    const session = requireH5Session(leadMatch[1]);
    if (!session.completed_at) throw httpError(409, "QUIZ_REQUIRED", "请先完成测试");
    const body = await readJson(request);
    const name = cleanText(body.name, 40);
    const phone = String(body.phone || "").replace(/\D/g, "");
    const province = cleanText(body.province, 20);
    const city = cleanText(body.city, 40);
    if (!name || !/^1[3-9]\d{9}$/.test(phone) || !PROVINCES.has(province) || !city || body.privacyConsent !== true) {
      throw httpError(400, "INVALID_LEAD", "请完整填写并同意隐私政策");
    }
    const existing = db.prepare("SELECT id FROM leads WHERE session_id = ?").get(session.id);
    const now = new Date().toISOString();
    if (existing) {
      db.prepare("UPDATE leads SET name = ?, phone = ?, province = ?, city = ?, privacy_consent = 1, submitted_at = ? WHERE id = ?").run(name, phone, province, city, now, existing.id);
    } else {
      db.prepare("INSERT INTO leads (id, session_id, name, phone, province, city, privacy_consent, submitted_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)").run(randomUUID(), session.id, name, phone, province, city, now);
    }
    return json(response, 200, { data: { ok: true } });
  }

  const drawMatch = path.match(/^\/api\/v1\/h5\/sessions\/([^/]+)\/lottery$/);
  if (request.method === "POST" && drawMatch) {
    const session = requireH5Session(drawMatch[1]);
    const body = await readJson(request);
    const idempotencyKey = cleanText(body.idempotencyKey, 160);
    if (!idempotencyKey) throw httpError(400, "IDEMPOTENCY_REQUIRED", "缺少幂等标识");
    const lead = db.prepare("SELECT * FROM leads WHERE session_id = ?").get(session.id);
    if (!lead) throw httpError(409, "LEAD_REQUIRED", "请先提交信息");
    const idempotentPrior = db.prepare(`SELECT d.*, c.code AS coupon_code FROM lottery_draws d JOIN coupons c ON c.id = d.coupon_id
      WHERE d.session_id = ? OR d.idempotency_key = ? LIMIT 1`)
      .get(session.id, idempotencyKey);
    if (idempotentPrior) return json(response, 200, { data: toPrize(idempotentPrior) });
    if (db.prepare("SELECT 1 FROM lottery_draws WHERE phone = ? LIMIT 1").get(lead.phone)) {
      throw httpError(409, "PHONE_ALREADY_DRAWN", "该手机号已参与过抽奖");
    }
    db.exec("BEGIN IMMEDIATE");
    try {
      if (db.prepare("SELECT 1 FROM lottery_draws WHERE phone = ? LIMIT 1").get(lead.phone)) {
        throw httpError(409, "PHONE_ALREADY_DRAWN", "该手机号已参与过抽奖");
      }
      const chosen = choosePrize(`${session.id}:${lead.phone}:${session.device_id}:${idempotencyKey}`);
      let coupon = db.prepare("SELECT * FROM coupons WHERE prize_code = ? AND status = 'AVAILABLE' ORDER BY id LIMIT 1").get(chosen.code);
      if (!coupon) coupon = db.prepare("SELECT * FROM coupons WHERE status = 'AVAILABLE' ORDER BY amount DESC, id LIMIT 1").get();
      if (!coupon) throw httpError(409, "OUT_OF_STOCK", "奖券已发完");
      const now = new Date().toISOString();
      const drawId = randomUUID();
      db.prepare("UPDATE coupons SET status = 'ISSUED', issued_at = ?, session_id = ?, lead_id = ? WHERE id = ? AND status = 'AVAILABLE'").run(now, session.id, lead.id, coupon.id);
      db.prepare(`INSERT INTO lottery_draws (id, session_id, lead_id, phone, device_id, coupon_id, prize_code, prize_name, idempotency_key, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(drawId, session.id, lead.id, lead.phone, session.device_id, coupon.id, coupon.prize_code, coupon.prize_name, idempotencyKey, now);
      db.exec("COMMIT");
      return json(response, 200, { data: { prizeLevel: coupon.prize_code, prizeName: coupon.prize_name, couponCode: coupon.code, resultStatus: "WIN", issuedAt: now, expiresAt: "2026-08-31T23:59:59+08:00" } });
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  if (request.method === "POST" && path === "/api/v1/admin/auth/login") {
    const body = await readJson(request);
    const account = adminAccount(cleanText(body.username, 80));
    if (!account || !verifyAdminPassword(String(body.password || ""), account)) throw httpError(401, "INVALID_CREDENTIALS", "账号或密码错误");
    const token = tokenValue("admin");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    db.prepare("INSERT INTO admin_sessions (token, username, role, city, province, expires_at) VALUES (?, ?, ?, ?, ?, ?)").run(token, account.username, account.role, account.province, account.province, expiresAt);
    response.setHeader("Set-Cookie", `${ADMIN_COOKIE_NAME}=${token}; Path=/api/v1/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`);
    return json(response, 200, { data: { username: account.username, role: account.role, province: account.province, id: `admin-${account.username}`, displayName: account.role === "HEADQUARTERS_ADMIN" ? "总部管理员" : `${account.province}管理员`, lastLoginAt: formatAdminDate(new Date()) } });
  }

  if (request.method === "POST" && path === "/api/v1/admin/auth/logout") {
    const token = cookieValue(request, ADMIN_COOKIE_NAME);
    if (token) db.prepare("DELETE FROM admin_sessions WHERE token = ?").run(token);
    response.setHeader("Set-Cookie", `${ADMIN_COOKIE_NAME}=; Path=/api/v1/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return json(response, 200, { data: { ok: true } });
  }

  if (request.method === "GET" && path === "/api/v1/admin/snapshot") {
    const admin = requireAdmin(request);
    const leads = getAdminLeads(admin);
    const dashboard = getDashboard(admin, leads);
    const issuedCoupons = leads.filter((item) => item.couponCode && item.couponCode !== "—").map((item) => ({ code: item.couponCode, prize: item.prize, status: "已发放", phone: maskPhone(item.phone), city: item.city, issuedAt: item.couponIssuedAt || item.submittedAt }));
    const couponInventory = admin.role === "HEADQUARTERS_ADMIN" ? db.prepare("SELECT id, code, amount, status, batch_id, created_at FROM coupons ORDER BY status DESC, id LIMIT 80").all().map(toCouponRecord) : [];
    const prizeConfigs = [...PRIZE_BY_AMOUNT.entries()].map(([amount, prize]) => ({ ...prize, total: Number(db.prepare("SELECT COUNT(*) count FROM coupons WHERE amount = ?").get(amount).count) }));
    return json(response, 200, { data: { dashboard, leads, issuedCoupons, couponInventory, prizeConfigs } });
  }

  throw httpError(404, "NOT_FOUND", "接口不存在");
}

function initializeDatabase() {
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, anonymous_id TEXT NOT NULL, device_id TEXT NOT NULL, activity_id TEXT NOT NULL, channel TEXT NOT NULL, created_at TEXT NOT NULL, started_at TEXT, completed_at TEXT, result_view_at TEXT, answers_json TEXT, score INTEGER, result_id TEXT, result_title TEXT, result_level TEXT);
    CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, session_id TEXT UNIQUE NOT NULL REFERENCES sessions(id), name TEXT NOT NULL, phone TEXT NOT NULL, province TEXT NOT NULL, city TEXT NOT NULL, privacy_consent INTEGER NOT NULL, submitted_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
    CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, amount INTEGER NOT NULL, prize_code TEXT NOT NULL, prize_name TEXT NOT NULL, status TEXT NOT NULL, batch_id TEXT NOT NULL, created_at TEXT NOT NULL, issued_at TEXT, session_id TEXT, lead_id TEXT);
    CREATE INDEX IF NOT EXISTS idx_coupons_available ON coupons(status, prize_code);
    CREATE TABLE IF NOT EXISTS lottery_draws (id TEXT PRIMARY KEY, session_id TEXT UNIQUE NOT NULL REFERENCES sessions(id), lead_id TEXT NOT NULL REFERENCES leads(id), phone TEXT UNIQUE NOT NULL, device_id TEXT NOT NULL, coupon_id TEXT UNIQUE NOT NULL REFERENCES coupons(id), prize_code TEXT NOT NULL, prize_name TEXT NOT NULL, idempotency_key TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_sessions (token TEXT PRIMARY KEY, username TEXT NOT NULL, role TEXT NOT NULL, city TEXT NOT NULL DEFAULT '', province TEXT NOT NULL, expires_at TEXT NOT NULL);
  `);
  addColumnIfMissing("leads", "province", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing("admin_sessions", "province", "TEXT NOT NULL DEFAULT ''");
  migrateLotteryDrawsPhoneOnlyConstraint();
  db.prepare("UPDATE sessions SET result_title = ? WHERE result_title = ?").run("安睡主宰", "觉主殿下");
  const count = Number(db.prepare("SELECT COUNT(*) count FROM coupons").get().count);
  if (count > 0) return;
  const source = JSON.parse(readFileSync(resolve(ROOT, "data/coupons/coupons.json"), "utf8"));
  const insert = db.prepare("INSERT INTO coupons (id, code, amount, prize_code, prize_name, status, batch_id, created_at) VALUES (?, ?, ?, ?, ?, 'AVAILABLE', ?, ?)");
  db.exec("BEGIN");
  try {
    for (const coupon of source.coupons) {
      const prize = PRIZE_BY_AMOUNT.get(Number(coupon.amount)) || PRIZE_BY_AMOUNT.get(10);
      insert.run(coupon.id, coupon.code, Number(coupon.amount), prize.code, prize.name, coupon.batchId, coupon.createdAt);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function migrateLotteryDrawsPhoneOnlyConstraint() {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'lottery_draws'").get();
  if (!/device_id\s+TEXT\s+UNIQUE/i.test(table?.sql || "")) return;

  db.exec("PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE;");
  try {
    db.exec(`
      DROP TABLE IF EXISTS lottery_draws_next;
      CREATE TABLE lottery_draws_next (id TEXT PRIMARY KEY, session_id TEXT UNIQUE NOT NULL REFERENCES sessions(id), lead_id TEXT NOT NULL REFERENCES leads(id), phone TEXT UNIQUE NOT NULL, device_id TEXT NOT NULL, coupon_id TEXT UNIQUE NOT NULL REFERENCES coupons(id), prize_code TEXT NOT NULL, prize_name TEXT NOT NULL, idempotency_key TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
      INSERT INTO lottery_draws_next (id, session_id, lead_id, phone, device_id, coupon_id, prize_code, prize_name, idempotency_key, created_at)
        SELECT id, session_id, lead_id, phone, device_id, coupon_id, prize_code, prize_name, idempotency_key, created_at FROM lottery_draws;
      DROP TABLE lottery_draws;
      ALTER TABLE lottery_draws_next RENAME TO lottery_draws;
      COMMIT;
    `);
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  } finally {
    db.exec("PRAGMA foreign_keys = ON;");
  }
}

function requireH5Session(token) {
  const session = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  if (!session) throw httpError(404, "SESSION_NOT_FOUND", "测试会话不存在");
  return session;
}

function requireAdmin(request) {
  const token = cookieValue(request, ADMIN_COOKIE_NAME);
  const session = token ? db.prepare("SELECT * FROM admin_sessions WHERE token = ? AND expires_at > ?").get(token, new Date().toISOString()) : null;
  if (!session) throw httpError(401, "UNAUTHORIZED", "请重新登录");
  return session;
}

function getAdminLeads(admin) {
  const rows = db.prepare(`SELECT l.id, l.submitted_at, l.name, l.phone, l.province, l.city, s.result_title, s.result_level, s.score,
    d.prize_name, d.created_at draw_created_at, c.code coupon_code FROM leads l JOIN sessions s ON s.id = l.session_id
    LEFT JOIN lottery_draws d ON d.session_id = s.id LEFT JOIN coupons c ON c.id = d.coupon_id
    ORDER BY l.submitted_at DESC`).all();
  return rows.filter((row) => admin.role !== "PROVINCE_ADMIN" || row.province === admin.province).map((row) => ({ id: row.id, submittedAt: formatAdminDate(new Date(row.submitted_at)), name: row.name, phone: row.phone, province: row.province, city: row.city, personality: row.result_title || "悦己淡人", level: row.result_level || "I", score: Number(row.score || 0), prize: row.prize_name || "待抽奖", couponCode: row.coupon_code || "—", couponIssuedAt: row.draw_created_at ? formatAdminDate(new Date(row.draw_created_at)) : "" }));
}

function getDashboard(admin, leads) {
  const sessionRows = admin.role === "PROVINCE_ADMIN"
    ? db.prepare("SELECT s.* FROM sessions s JOIN leads l ON l.session_id = s.id WHERE l.province = ? ORDER BY s.created_at DESC").all(admin.province)
    : db.prepare("SELECT * FROM sessions ORDER BY created_at DESC").all();
  const metrics = [
    ["活动访问人数", sessionRows.length, "真实测试会话"],
    ["开始测试人数", sessionRows.filter((row) => row.answers_json).length, "已提交答题"],
    ["完成测试人数", sessionRows.filter((row) => row.completed_at).length, "完成五题并产生结果"],
    ["进入结果页人数", sessionRows.filter((row) => row.result_view_at).length, "真实结果页记录"],
    ["提交客资人数", leads.length, "正式数据库客资"],
    ["抽奖人数", leads.filter((row) => row.couponCode !== "—").length, "已发放券码"],
  ].map(([label, value, hint]) => ({ label, value, hint }));
  return {
    metrics,
    personality: countBy(leads, "personality", ["悦己淡人", "沉浸领主", "安睡主宰", "头号玩家"]),
    funnel: metrics.map((item, index) => ({ label: ["访问", "开始", "完成", "结果页", "客资", "抽奖"][index], value: item.value })),
    city: countBy(leads, "city"),
  };
}

function countBy(rows, key, order) {
  const counts = new Map();
  for (const row of rows) {
    const label = cleanText(row[key], 100);
    if (label) counts.set(label, (counts.get(label) || 0) + 1);
  }
  const labels = order || [...counts.keys()].sort((left, right) => (counts.get(right) - counts.get(left)) || left.localeCompare(right, "zh-CN"));
  return labels.map((label) => ({ label, value: counts.get(label) || 0 }));
}

function choosePrize(seed) {
  const roll = Number.parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) / 0xffffffff * 100;
  let cursor = 0;
  for (const prize of PRIZE_BY_AMOUNT.values()) {
    cursor += prize.probability;
    if (roll <= cursor) return prize;
  }
  return PRIZE_BY_AMOUNT.get(10);
}

function toPrize(row) {
  return { prizeLevel: row.prize_code, prizeName: row.prize_name, couponCode: row.coupon_code, resultStatus: "WIN", issuedAt: row.created_at, expiresAt: "2026-08-31T23:59:59+08:00" };
}

function toCouponRecord(row) {
  return { id: row.id, code: row.code, amount: Number(row.amount), status: row.status === "AVAILABLE" ? "available" : "redeemed", batchId: row.batch_id, createdAt: row.created_at };
}

function adminAccount(username) {
  return ADMIN_ACCOUNTS.get(username) || null;
}

function loadAdminAccounts() {
  if (!ADMIN_ACCOUNTS_PATH) {
    return new Map([
      ["hq_admin", { username: "hq_admin", password: LEGACY_ADMIN_PASSWORD, role: "HEADQUARTERS_ADMIN", province: "全国" }],
      ["sh_admin", { username: "sh_admin", password: LEGACY_ADMIN_PASSWORD, role: "PROVINCE_ADMIN", province: "上海" }],
    ]);
  }
  const source = JSON.parse(readFileSync(ADMIN_ACCOUNTS_PATH, "utf8"));
  const accounts = Array.isArray(source.accounts) ? source.accounts : [];
  const normalized = accounts.map((account) => {
    const username = cleanText(account.username, 80);
    const role = account.role === "HEADQUARTERS_ADMIN" ? "HEADQUARTERS_ADMIN" : "PROVINCE_ADMIN";
    const province = role === "HEADQUARTERS_ADMIN" ? "全国" : cleanText(account.province, 20);
    if (!username || (role === "PROVINCE_ADMIN" && !PROVINCES.has(province)) || !String(account.passwordHash || "").startsWith("scrypt$")) {
      throw new Error(`Invalid admin account configuration: ${username || "<empty>"}`);
    }
    return [username, { username, role, province, passwordHash: String(account.passwordHash) }];
  });
  if (!normalized.some(([, account]) => account.role === "HEADQUARTERS_ADMIN")) throw new Error("Headquarters admin account is required");
  return new Map(normalized);
}

function verifyAdminPassword(password, account) {
  if (account.passwordHash) {
    const [algorithm, saltValue, digestValue] = account.passwordHash.split("$");
    if (algorithm !== "scrypt" || !saltValue || !digestValue) return false;
    const expected = Buffer.from(digestValue, "base64url");
    const actual = scryptSync(password, Buffer.from(saltValue, "base64url"), expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  return safeEqual(password, account.password || "");
}

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieValue(request, name) {
  const cookies = String(request.headers.cookie || "").split(";").map((item) => item.trim());
  const match = cookies.find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function tokenValue(prefix) {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function maskPhone(phone) {
  return String(phone).replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

function formatAdminDate(date) {
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replaceAll("/", "-");
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw httpError(413, "PAYLOAD_TOO_LARGE", "请求内容过大");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw httpError(400, "INVALID_JSON", "请求格式错误"); }
}

function json(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  response.end(body);
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
