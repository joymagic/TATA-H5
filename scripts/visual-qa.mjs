import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const bundledRequire = createRequire(
  "/Users/welcometomagicworld/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json",
);
const { chromium } = bundledRequire("playwright");

const root = process.cwd();
const outputDir = path.join(root, "docs/qa");
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const url = process.argv[2] ?? "http://127.0.0.1:5173/";
await page.goto(url, { waitUntil: "networkidle" });
await page.getByText("开始测试 →", { exact: true }).waitFor({ timeout: 6000 });
await page.screenshot({ path: path.join(outputDir, "01-home.png"), fullPage: true });

await page.getByText("开始测试 →", { exact: true }).click();
await page.getByText("01", { exact: true }).waitFor();
await page.screenshot({ path: path.join(outputDir, "02-quiz.png"), fullPage: true });

for (let i = 0; i < 5; i += 1) {
  await page.locator(".option-button").nth(3).click();
  await page.waitForTimeout(460);
}

await page.getByText("即刻参与抽奖", { exact: true }).waitFor({ timeout: 8000 });
await page.screenshot({ path: path.join(outputDir, "03-result.png"), fullPage: true });

await page.getByText("即刻参与抽奖", { exact: true }).click();
await page.getByPlaceholder("请填写您的姓名").fill("测试用户");
await page.getByPlaceholder("请填写手机号码").fill("13812345678");
await page.locator("select").selectOption("上海");
await page.locator(".privacy-row input").check();
await page.screenshot({ path: path.join(outputDir, "04-lead.png"), fullPage: true });
await page.getByText("提交并开始抽奖", { exact: true }).click();

await page.getByText("点击抽奖", { exact: true }).waitFor({ timeout: 5000 });
await page.screenshot({ path: path.join(outputDir, "05-lottery.png"), fullPage: true });
await page.getByText("点击抽奖", { exact: true }).click();

await page.getByText("返回首页", { exact: true }).waitFor({ timeout: 8000 });
await page.screenshot({ path: path.join(outputDir, "06-lottery-result.png"), fullPage: true });

const overflow = await page.evaluate(() => {
  const viewportWidth = document.documentElement.clientWidth;
  return Array.from(document.querySelectorAll("*"))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName,
        className: String(element.getAttribute("class") ?? ""),
        text: String(element.textContent ?? "").trim().slice(0, 40),
        left: rect.left,
        right: rect.right,
        width: rect.width,
      };
    })
    .filter((item) => item.width > 0 && (item.left < -1 || item.right > viewportWidth + 1));
});

await browser.close();

if (overflow.length) {
  console.error(JSON.stringify(overflow.slice(0, 12), null, 2));
  process.exit(1);
}

console.log(`Visual QA screenshots saved to ${outputDir}`);
