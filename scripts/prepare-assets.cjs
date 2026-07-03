const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = process.cwd();

const productSources = [
  {
    key: "level-1-door",
    source: "静音仓产品/1、一级——小白门-羽白色.png",
    maxHeight: 1700,
  },
  {
    key: "level-2-door",
    source: "静音仓产品/2、二级——C001（要调成贝母白）.png",
    maxHeight: 1800,
  },
  {
    key: "level-3-door",
    source: "静音仓产品/3、三级——PB001-美式胡桃（要调成贝母白）.png",
    maxHeight: 1700,
  },
  {
    key: "level-4-door",
    source: "静音仓产品/4、四级——静音大师pro（要调成贝母白）.png",
    maxHeight: 1800,
  },
];

async function resizeProduct({ key, source, maxHeight }) {
  const input = path.join(root, source);
  const output = path.join(root, "apps/h5/public/assets/products", `${key}.webp`);
  await sharp(input)
    .rotate()
    .resize({ height: maxHeight, withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 88, effort: 5 })
    .toFile(output);
  return output;
}

async function main() {
  await fs.mkdir(path.join(root, "apps/h5/public/assets/products"), { recursive: true });
  await fs.mkdir(path.join(root, "apps/h5/public/assets/reference"), { recursive: true });

  const outputs = [];
  for (const product of productSources) {
    outputs.push(await resizeProduct(product));
  }

  await sharp(path.join(root, "最终生成海报图参考.png"))
    .resize({ width: 760, withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toFile(path.join(root, "apps/h5/public/assets/reference/final-poster-reference.webp"));

  console.log(`Prepared ${outputs.length + 1} web assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
