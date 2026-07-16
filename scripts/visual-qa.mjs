import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const bundledRequire = createRequire(
  "/Users/welcometomagicworld/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json",
);
const { chromium } = bundledRequire("playwright");

const root = process.cwd();
const outputDir = process.env.QA_OUTPUT_DIR ?? "/private/tmp/tata-h5-qa";
const url = process.argv[2] ?? "http://127.0.0.1:5173/";
const weChatUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.58";

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

async function openPage(viewport = { width: 375, height: 812 }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: weChatUserAgent,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".figma-home-screen").waitFor({ timeout: 10000 });
  return { context, page };
}

async function completeQuiz(page, optionIndex, captureLoading = false) {
  await page.locator(".figma-home-cta").click();
  for (let index = 0; index < 5; index += 1) {
    await page.locator(".figma-option-button").nth(optionIndex).click();
    if (index < 4) await page.waitForTimeout(800);
  }
  if (captureLoading) {
    await page.locator(".figma-result-loading-logo").waitFor({ timeout: 4000 });
    await page.screenshot({ path: path.join(outputDir, "03-result-loading.png") });
  }
  await page.getByText("点击保存", { exact: true }).waitFor({ timeout: 10000 });
}

async function assertNoOverflow(page, label) {
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
  if (overflow.length) {
    throw new Error(`${label} overflow:\n${JSON.stringify(overflow.slice(0, 12), null, 2)}`);
  }
}

const home = await openPage();
const audioPressed = await home.page.locator('[aria-label="关闭背景音乐"]').getAttribute("aria-pressed");
if (audioPressed !== "true") throw new Error("Background music is not enabled by default.");
await home.page.screenshot({ path: path.join(outputDir, "01-home-375x812.png") });
await assertNoOverflow(home.page, "home-375x812");
await home.context.close();

const narrowHome = await openPage({ width: 320, height: 700 });
await narrowHome.page.screenshot({ path: path.join(outputDir, "02-home-320x700.png") });
await assertNoOverflow(narrowHome.page, "home-320x700");
await narrowHome.context.close();

for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
  const resultPage = await openPage();
  await completeQuiz(resultPage.page, optionIndex, optionIndex === 3);
  const descriptionLines = await resultPage.page.locator(".figma-result-description-line").allTextContents();
  if (descriptionLines.length !== 4) throw new Error(`Result level ${optionIndex + 1} does not have four lines.`);
  await resultPage.page.screenshot({
    path: path.join(outputDir, `0${optionIndex + 4}-result-level${optionIndex + 1}.png`),
  });
  await assertNoOverflow(resultPage.page, `result-level${optionIndex + 1}`);

  if (optionIndex === 3) {
    await resultPage.page.getByText("点击保存", { exact: true }).click();
    await resultPage.page.locator(".wechat-poster-image img").waitFor({ timeout: 10000 });
    await resultPage.page.screenshot({ path: path.join(outputDir, "08-poster-level4.png") });
    await resultPage.page.getByText("我已保存，开始抽奖", { exact: true }).click();
    await resultPage.page.getByPlaceholder("请填写您的姓名").fill("测试用户");
    await resultPage.page.getByPlaceholder("请填写手机号码").fill("13812345678");
    await resultPage.page.locator("select").nth(0).selectOption("上海");
    await resultPage.page.locator("select").nth(1).selectOption("上海市");
    await resultPage.page.locator('.figma-privacy-row input[type="checkbox"]').check();
    await resultPage.page.getByText("提交并开始抽奖", { exact: true }).click();
    await resultPage.page.locator(".figma-lottery-back-hit img").waitFor({ timeout: 6000 });
    await resultPage.page.screenshot({ path: path.join(outputDir, "09-lottery.png") });
    await resultPage.page.locator(".figma-lottery-draw-hit").click();
    await resultPage.page.getByText("返回首页", { exact: true }).waitFor({ timeout: 10000 });
    await resultPage.page.screenshot({ path: path.join(outputDir, "10-lottery-result.png") });
    await assertNoOverflow(resultPage.page, "lottery-result");
  }

  await resultPage.context.close();
}

await browser.close();
console.log(`Visual QA screenshots saved to ${outputDir}`);
