const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const GENERATED_DIR = path.join(ROOT, "packages/shared-config/src/generated");
const DATA_DIR = path.join(ROOT, "data/coupons");
const ADMIN_PUBLIC_DIR = path.join(ROOT, "apps/admin/public/data");

const BATCH_ID = "tata-silent-2026-preview";
const CREATED_AT = "2026-07-06T00:00:00+08:00";
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const TIERS = [
  { amount: 100, count: 10 },
  { amount: 50, count: 100 },
  { amount: 20, count: 1000 },
  { amount: 10, count: 10000 },
];

function randomPart(length) {
  let value = "";
  while (value.length < length) {
    const byte = crypto.randomBytes(1)[0];
    if (byte < ALPHABET.length * 7) {
      value += ALPHABET[byte % ALPHABET.length];
    }
  }
  return value;
}

function createCode(amount) {
  return `TATA${amount}-${randomPart(4)}-${randomPart(4)}-${randomPart(4)}`;
}

function csvEscape(value) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function shuffle(records) {
  for (let i = records.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [records[i], records[j]] = [records[j], records[i]];
  }
  return records;
}

function buildCoupons() {
  const seen = new Set();
  const coupons = [];

  for (const tier of TIERS) {
    let serial = 1;
    while (serial <= tier.count) {
      const code = createCode(tier.amount);
      if (seen.has(code)) continue;
      seen.add(code);
      coupons.push({
        id: `${tier.amount}-${String(serial).padStart(5, "0")}`,
        code,
        amount: tier.amount,
        status: "available",
        batchId: BATCH_ID,
        createdAt: CREATED_AT,
      });
      serial += 1;
    }
  }

  return shuffle(coupons);
}

function writeCouponFiles(coupons) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(ADMIN_PUBLIC_DIR, { recursive: true });

  const summary = TIERS.map((tier) => ({
    amount: tier.amount,
    count: tier.count,
  }));

  const payload = {
    batchId: BATCH_ID,
    createdAt: CREATED_AT,
    total: coupons.length,
    summary,
    coupons,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  fs.writeFileSync(path.join(DATA_DIR, "coupons.json"), json);

  const header = ["id", "code", "amount", "status", "batch_id", "created_at"];
  const rows = coupons.map((coupon) => [
    coupon.id,
    coupon.code,
    coupon.amount,
    coupon.status,
    coupon.batchId,
    coupon.createdAt,
  ]);
  const csv = `${[header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;

  fs.writeFileSync(path.join(DATA_DIR, "coupons.csv"), csv);
  fs.writeFileSync(path.join(ADMIN_PUBLIC_DIR, "coupons.csv"), csv);

  const moduleSource = `export const COUPON_BATCH = ${JSON.stringify(
    { batchId: BATCH_ID, createdAt: CREATED_AT, total: coupons.length },
    null,
    2
  )};

export const COUPON_SUMMARY = ${JSON.stringify(summary, null, 2)};

export const COUPONS = ${JSON.stringify(coupons, null, 2)};
`;
  fs.writeFileSync(path.join(GENERATED_DIR, "coupons.js"), moduleSource);
}

const coupons = buildCoupons();
writeCouponFiles(coupons);

console.log(`Generated ${coupons.length} coupon codes.`);
for (const tier of TIERS) {
  console.log(`- ${tier.amount} CNY: ${tier.count}`);
}
