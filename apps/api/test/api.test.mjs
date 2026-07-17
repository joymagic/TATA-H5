import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const temp = mkdtempSync(join(tmpdir(), "tata-fat-api-"));
const dbPath = join(temp, "fat.sqlite");
const accountsPath = join(temp, "admin-accounts.json");
const legacyDb = new DatabaseSync(dbPath);
legacyDb.exec("CREATE TABLE lottery_draws (id TEXT PRIMARY KEY, session_id TEXT UNIQUE NOT NULL, lead_id TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, device_id TEXT UNIQUE NOT NULL, coupon_id TEXT UNIQUE NOT NULL, prize_code TEXT NOT NULL, prize_name TEXT NOT NULL, idempotency_key TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL)");
legacyDb.close();
process.env.NODE_ENV = "test";
process.env.APP_ENV = "production";
process.env.DB_PATH = dbPath;
process.env.ACTIVITY_ID = "tata-silent-personality-2026";
process.env.ADMIN_ACCOUNTS_PATH = accountsPath;
writeFileSync(accountsPath, JSON.stringify({ accounts: [
  account("tata2026", "tatadoor2026", "HEADQUARTERS_ADMIN", "全国"),
  account("tatasc", "tatadoor1234", "PROVINCE_ADMIN", "四川"),
  account("tatash", "tatadoor5678", "PROVINCE_ADMIN", "上海"),
] }));
const { server } = await import(`../src/server.mjs?test=${Date.now()}`);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

test.after(() => {
  server.close();
  rmSync(temp, { recursive: true, force: true });
});

test("H5 records leads and Admin enforces province data isolation", async () => {
  const health = await fetch(`${base}/api/v1/health`).then((response) => response.json());
  assert.equal(health.data.database, "sqlite");
  assert.equal(health.data.environment, "production");

  const session = await request("/api/v1/h5/sessions", { deviceId: "fat-test-device", channel: "automated-fat" });
  const token = session.data.sessionToken;
  const result = await request(`/api/v1/h5/sessions/${token}/quiz`, { answers: ["A", "A", "A", "A", "A"] });
  assert.equal(result.data.title, "悦己淡人");
  assert.equal(result.data.levelName, "柔静级");
  assert.equal(result.data.description, "家就是我的充电站\n日常喜欢客厅闲坐、茶室品茗\n我需要柔静级 Ⅰ级静音\n满足我的基础隔音需求");

  const remainingResults = [
    ["B", "沉浸领主", "沉静级", "我是独处至上星人\n在家喜欢看书、娱乐、学习\n我需要沉静级 Ⅱ级静音\n让我独享沉浸小世界"],
    ["C", "安睡主宰", "宁静级", "我是睡眠刚需人\n一点噪音直接失眠\n我需要宁静级 Ⅲ 级静音\n给我整夜深睡守护"],
    ["D", "头号玩家", "臻静级", "宅家也能当头号玩家\n热衷激情上分和观影\n我需要臻静级 Ⅳ 级静音\n尽情释放自己的热爱"],
  ];
  for (const [answer, title, levelName, description] of remainingResults) {
    const extraSession = await request("/api/v1/h5/sessions", { deviceId: `fat-test-${answer}`, channel: "automated-fat" });
    const extraResult = await request(`/api/v1/h5/sessions/${extraSession.data.sessionToken}/quiz`, { answers: Array(5).fill(answer) });
    assert.equal(extraResult.data.title, title);
    assert.equal(extraResult.data.levelName, levelName);
    assert.equal(extraResult.data.description, description);
  }
  await request(`/api/v1/h5/sessions/${token}/lead`, { name: "正式联调", phone: "13800138000", province: "四川", city: "成都", privacyConsent: true });
  const prize = await request(`/api/v1/h5/sessions/${token}/lottery`, { idempotencyKey: "fat-e2e-1" });
  assert.match(prize.data.couponCode, /^TATA/);
  const idempotentPrize = await request(`/api/v1/h5/sessions/${token}/lottery`, { idempotencyKey: "fat-e2e-retry" });
  assert.equal(idempotentPrize.data.couponCode, prize.data.couponCode);

  const duplicateSession = await request("/api/v1/h5/sessions", { deviceId: "fat-duplicate-phone-device", channel: "automated-fat" });
  const duplicateToken = duplicateSession.data.sessionToken;
  await request(`/api/v1/h5/sessions/${duplicateToken}/quiz`, { answers: ["A", "A", "A", "A", "A"] });
  await request(`/api/v1/h5/sessions/${duplicateToken}/lead`, { name: "重复手机号", phone: "13800138000", province: "上海", city: "上海", privacyConsent: true });
  const duplicateResponse = await fetch(`${base}/api/v1/h5/sessions/${duplicateToken}/lottery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idempotencyKey: "fat-duplicate-phone" }),
  });
  const duplicatePayload = await duplicateResponse.json();
  assert.equal(duplicateResponse.status, 409);
  assert.equal(duplicatePayload.error.code, "PHONE_ALREADY_DRAWN");

  const newPhoneSession = await request("/api/v1/h5/sessions", { deviceId: "fat-test-device", channel: "automated-fat" });
  const newPhoneToken = newPhoneSession.data.sessionToken;
  await request(`/api/v1/h5/sessions/${newPhoneToken}/quiz`, { answers: ["A", "A", "A", "A", "A"] });
  await request(`/api/v1/h5/sessions/${newPhoneToken}/lead`, { name: "同设备新手机号", phone: "13900139000", province: "四川", city: "成都", privacyConsent: true });
  const newPhonePrize = await request(`/api/v1/h5/sessions/${newPhoneToken}/lottery`, { idempotencyKey: "fat-same-device-new-phone" });
  assert.match(newPhonePrize.data.couponCode, /^TATA/);

  const loginResponse = await fetch(`${base}/api/v1/admin/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "tata2026", password: "tatadoor2026" }) });
  assert.equal(loginResponse.status, 200);
  const loginPayload = await loginResponse.clone().json();
  assert.equal(loginPayload.data.province, "全国");
  assert.equal("password" in loginPayload.data, false);
  assert.equal("passwordHash" in loginPayload.data, false);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];
  const snapshotResponse = await fetch(`${base}/api/v1/admin/snapshot`, { headers: { Cookie: cookie } });
  const snapshot = await snapshotResponse.json();
  assert.equal(snapshot.data.leads.length, 3);
  assert.equal(snapshot.data.leads.find((item) => item.name === "正式联调").couponCode, prize.data.couponCode);
  assert.equal(snapshot.data.leads.find((item) => item.name === "重复手机号").couponCode, "—");
  assert.notEqual(snapshot.data.leads.find((item) => item.name === "同设备新手机号").couponCode, "—");
  assert.equal(snapshot.data.dashboard.metrics.find((item) => item.label === "提交客资人数").value, 3);
  assert.equal(snapshot.data.dashboard.metrics.find((item) => item.label === "抽奖人数").value, 2);
  assert.equal("channel" in snapshot.data.dashboard, false);
  assert.deepEqual(snapshot.data.dashboard.city, [{ label: "成都", value: 2 }, { label: "上海", value: 1 }]);

  const sichuan = await loginAndSnapshot("tatasc", "tatadoor1234");
  assert.equal(sichuan.login.data.role, "PROVINCE_ADMIN");
  assert.equal(sichuan.login.data.province, "四川");
  assert.deepEqual(sichuan.snapshot.data.leads.map((item) => item.province), ["四川", "四川"]);
  assert.equal(sichuan.snapshot.data.couponInventory.length, 0);

  const shanghai = await loginAndSnapshot("tatash", "tatadoor5678");
  assert.deepEqual(shanghai.snapshot.data.leads.map((item) => item.province), ["上海"]);
  assert.equal(shanghai.snapshot.data.leads[0].name, "重复手机号");

  const invalidLogin = await fetch(`${base}/api/v1/admin/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "tatasc", password: "tatadoor0000" }) });
  assert.equal(invalidLogin.status, 401);
});

function account(username, password, role, province) {
  const salt = Buffer.from(`test-${username}`);
  const digest = scryptSync(password, salt, 64);
  return { username, role, province, passwordHash: `scrypt$${salt.toString("base64url")}$${digest.toString("base64url")}` };
}

async function loginAndSnapshot(username, password) {
  const loginResponse = await fetch(`${base}/api/v1/admin/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  assert.equal(loginResponse.status, 200);
  const login = await loginResponse.json();
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];
  const snapshotResponse = await fetch(`${base}/api/v1/admin/snapshot`, { headers: { Cookie: cookie } });
  assert.equal(snapshotResponse.status, 200);
  return { login, snapshot: await snapshotResponse.json() };
}

async function request(path, body) {
  const response = await fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  assert.equal(response.ok, true, JSON.stringify(payload));
  return payload;
}
