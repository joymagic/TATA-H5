const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "dist-pages");
const H5_DIST = path.join(ROOT, "apps/h5/dist");
const ADMIN_DIST = path.join(ROOT, "apps/admin/dist");

function copyDir(from, to) {
  fs.cpSync(from, to, { recursive: true });
}

function assertDir(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Missing build output: ${path.relative(ROOT, dir)}`);
  }
}

assertDir(H5_DIST);
assertDir(ADMIN_DIST);

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

copyDir(H5_DIST, OUT_DIR);
copyDir(ADMIN_DIST, path.join(OUT_DIR, "admin"));
fs.writeFileSync(path.join(OUT_DIR, ".nojekyll"), "");

console.log("Prepared GitHub Pages output:");
console.log(`- H5: ${path.relative(ROOT, OUT_DIR)}/`);
console.log(`- Admin: ${path.relative(ROOT, path.join(OUT_DIR, "admin"))}/`);
