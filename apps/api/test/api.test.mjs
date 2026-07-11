import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const temp = mkdtempSync(join(tmpdir(), "tata-fat-api-"));
process.env.NODE_ENV = "test";
process.env.FAT_DB_PATH = join(temp, "fat.sqlite");
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
  await request(`/api/v1/h5/sessions/${token}/lead`, { name: "FAT联调", phone: "13800138000", city: "成都", privacyConsent: true });
  const prize = await request(`/api/v1/h5/sessions/${token}/lottery`, { idempotencyKey: "fat-e2e-1" });
  assert.match(prize.data.couponCode, /^TATA/);

  const loginResponse = await fetch(`${base}/api/v1/admin/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "hq_admin", password: "TATA2026" }) });
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];
  const snapshotResponse = await fetch(`${base}/api/v1/admin/snapshot`, { headers: { Cookie: cookie } });
  const snapshot = await snapshotResponse.json();
  assert.equal(snapshot.data.leads.length, 1);
  assert.equal(snapshot.data.leads[0].name, "FAT联调");
  assert.equal(snapshot.data.dashboard.metrics.find((item) => item.label === "提交客资人数").value, 1);
});

async function request(path, body) {
  const response = await fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  assert.equal(response.ok, true, JSON.stringify(payload));
  return payload;
}
