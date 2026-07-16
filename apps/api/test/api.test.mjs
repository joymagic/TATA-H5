import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const temp = mkdtempSync(join(tmpdir(), "tata-fat-api-"));
const dbPath = join(temp, "fat.sqlite");
const legacyDb = new DatabaseSync(dbPath);
legacyDb.exec("CREATE TABLE lottery_draws (id TEXT PRIMARY KEY, session_id TEXT UNIQUE NOT NULL, lead_id TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, device_id TEXT UNIQUE NOT NULL, coupon_id TEXT UNIQUE NOT NULL, prize_code TEXT NOT NULL, prize_name TEXT NOT NULL, idempotency_key TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL)");
legacyDb.close();
process.env.NODE_ENV = "test";
process.env.FAT_DB_PATH = dbPath;
process.env.FAT_ADMIN_PASSWORD = "TATA2026";
const { server } = await import(`../src/server.mjs?test=${Date.now()}`);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

test.after(() => {
  server.close();
  rmSync(temp, { recursive: true, force: true });
});

test("H5 records a real lead and Admin reads the same database", async () => {
  const health = await fetch(`${base}/api/v1/health`).then((response) => response.json());
  assert.equal(health.data.database, "sqlite");

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
  await request(`/api/v1/h5/sessions/${token}/lead`, { name: "FAT联调", phone: "13800138000", city: "成都", privacyConsent: true });
  const prize = await request(`/api/v1/h5/sessions/${token}/lottery`, { idempotencyKey: "fat-e2e-1" });
  assert.match(prize.data.couponCode, /^TATA/);
  const idempotentPrize = await request(`/api/v1/h5/sessions/${token}/lottery`, { idempotencyKey: "fat-e2e-retry" });
  assert.equal(idempotentPrize.data.couponCode, prize.data.couponCode);

  const duplicateSession = await request("/api/v1/h5/sessions", { deviceId: "fat-duplicate-phone-device", channel: "automated-fat" });
  const duplicateToken = duplicateSession.data.sessionToken;
  await request(`/api/v1/h5/sessions/${duplicateToken}/quiz`, { answers: ["A", "A", "A", "A", "A"] });
  await request(`/api/v1/h5/sessions/${duplicateToken}/lead`, { name: "重复手机号", phone: "13800138000", city: "成都", privacyConsent: true });
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
  await request(`/api/v1/h5/sessions/${newPhoneToken}/lead`, { name: "同设备新手机号", phone: "13900139000", city: "成都", privacyConsent: true });
  const newPhonePrize = await request(`/api/v1/h5/sessions/${newPhoneToken}/lottery`, { idempotencyKey: "fat-same-device-new-phone" });
  assert.match(newPhonePrize.data.couponCode, /^TATA/);

  const loginResponse = await fetch(`${base}/api/v1/admin/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "hq_admin", password: "TATA2026" }) });
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];
  const snapshotResponse = await fetch(`${base}/api/v1/admin/snapshot`, { headers: { Cookie: cookie } });
  const snapshot = await snapshotResponse.json();
  assert.equal(snapshot.data.leads.length, 3);
  assert.equal(snapshot.data.leads.find((item) => item.name === "FAT联调").couponCode, prize.data.couponCode);
  assert.equal(snapshot.data.leads.find((item) => item.name === "重复手机号").couponCode, "—");
  assert.notEqual(snapshot.data.leads.find((item) => item.name === "同设备新手机号").couponCode, "—");
  assert.equal(snapshot.data.dashboard.metrics.find((item) => item.label === "提交客资人数").value, 3);
  assert.equal(snapshot.data.dashboard.metrics.find((item) => item.label === "抽奖人数").value, 2);
  assert.deepEqual(snapshot.data.dashboard.city, [{ label: "成都", value: 3 }]);
});

async function request(path, body) {
  const response = await fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  assert.equal(response.ok, true, JSON.stringify(payload));
  return payload;
}
